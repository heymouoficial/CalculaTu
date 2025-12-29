#!/usr/bin/env node
/**
 * Script de Ingestión de Conocimiento para Savara RAG
 * 
 * Este script lee los archivos markdown de la carpeta RAG/
 * y los vectoriza usando Gemini text-embedding-004,
 * almacenándolos en Supabase knowledge_base.
 * 
 * Uso: npx ts-node scripts/ingest-knowledge.ts
 */

import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

// ESM compatibility
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuration
const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || '';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_KEY || '';
const GEMINI_API_KEY = process.env.VITE_GEMINI_API_KEY || process.env.GEMINI_API_KEY || '';

const RAG_FOLDER = path.join(__dirname, '..', 'RAG');

interface KnowledgeChunk {
    content: string;
    embedding: number[];
    metadata: {
        fileName: string;
        section: string;
        scope: 'global';
    };
}

async function getEmbedding(text: string): Promise<number[]> {
    const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/text-embedding-004:embedContent?key=${GEMINI_API_KEY}`,
        {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                model: 'models/text-embedding-004',
                content: { parts: [{ text }] }
            })
        }
    );

    const data = await response.json();

    if (!data.embedding?.values) {
        console.error('❌ Error generando embedding:', data);
        throw new Error('Failed to generate embedding');
    }

    return data.embedding.values;
}

function chunkText(text: string, maxChunkSize = 1000): string[] {
    // Split by sections (##) and keep reasonable chunk sizes
    const sections = text.split(/(?=## )/);
    const chunks: string[] = [];

    for (const section of sections) {
        if (section.trim().length === 0) continue;

        if (section.length <= maxChunkSize) {
            chunks.push(section.trim());
        } else {
            // Split large sections by paragraphs
            const paragraphs = section.split('\n\n');
            let currentChunk = '';

            for (const para of paragraphs) {
                if ((currentChunk + para).length > maxChunkSize && currentChunk) {
                    chunks.push(currentChunk.trim());
                    currentChunk = '';
                }
                currentChunk += para + '\n\n';
            }

            if (currentChunk.trim()) {
                chunks.push(currentChunk.trim());
            }
        }
    }

    return chunks;
}

async function ingestFile(filePath: string, supabase: any): Promise<number> {
    const fileName = path.basename(filePath);
    console.log(`\n📄 Procesando: ${fileName}`);

    const content = fs.readFileSync(filePath, 'utf-8');
    const chunks = chunkText(content);

    console.log(`   📦 ${chunks.length} chunks generados`);

    let inserted = 0;

    for (let i = 0; i < chunks.length; i++) {
        const chunk = chunks[i];
        console.log(`   🔄 Vectorizando chunk ${i + 1}/${chunks.length}...`);

        try {
            const embedding = await getEmbedding(chunk);

            const { error } = await supabase.from('knowledge_base').insert({
                content: chunk,
                embedding,
                metadata: {
                    fileName,
                    section: `chunk_${i + 1}`,
                    scope: 'global'
                }
            });

            if (error) {
                console.error(`   ❌ Error insertando chunk ${i + 1}:`, error.message);
            } else {
                console.log(`   ✅ Chunk ${i + 1} insertado`);
                inserted++;
            }

            // Small delay to avoid rate limiting
            await new Promise(r => setTimeout(r, 200));

        } catch (err: any) {
            console.error(`   ❌ Error en chunk ${i + 1}:`, err.message);
        }
    }

    return inserted;
}

async function main() {
    console.log('🚀 Iniciando ingestión de conocimiento para Savara RAG\n');

    // Validate config
    if (!SUPABASE_URL || !SUPABASE_KEY) {
        console.error('❌ Falta SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY');
        console.log('   Configura las variables de entorno:');
        console.log('   export SUPABASE_URL=https://xxx.supabase.co');
        console.log('   export SUPABASE_SERVICE_ROLE_KEY=xxx');
        process.exit(1);
    }

    if (!GEMINI_API_KEY) {
        console.error('❌ Falta GEMINI_API_KEY');
        process.exit(1);
    }

    console.log('✅ Configuración válida');
    console.log(`   Supabase: ${SUPABASE_URL.substring(0, 30)}...`);
    console.log(`   Gemini: ${GEMINI_API_KEY.substring(0, 15)}...`);

    // Initialize Supabase
    const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

    // Get all markdown files in RAG folder
    if (!fs.existsSync(RAG_FOLDER)) {
        console.error(`❌ Carpeta RAG no encontrada: ${RAG_FOLDER}`);
        process.exit(1);
    }

    const files = fs.readdirSync(RAG_FOLDER).filter(f => f.endsWith('.md'));
    console.log(`\n📁 Encontrados ${files.length} archivos en RAG/`);

    let totalInserted = 0;

    for (const file of files) {
        const filePath = path.join(RAG_FOLDER, file);
        const inserted = await ingestFile(filePath, supabase);
        totalInserted += inserted;
    }

    console.log(`\n✅ Ingestión completada: ${totalInserted} chunks vectorizados`);
    console.log('🧠 Savara ahora tiene memoria de elefante!\n');
}

main().catch(console.error);
