// dev/seed_admin.mjs
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

// --- CONFIGURACIÓN ---
// REEMPLAZA ESTO CON EL MACHINE_ID QUE OBTIENES DE LA CONSOLA DEL NAVEGADOR
const ADMIN_MACHINE_ID = 'M-4O85WSTW93'; 
const ADMIN_EMAIL = 'multiversagroup@gmail.com';
const ADMIN_FULL_NAME = 'Admin'; // Puedes cambiar esto si quieres

// -------------------

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ Error: VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY deben estar en tu archivo .env.local');
  process.exit(1);
}

if (ADMIN_MACHINE_ID === 'M-PLACEHOLDER' || !ADMIN_MACHINE_ID) {
  console.error('❌ Error: Por favor, edita este script y reemplaza "M-PLACEHOLDER" con tu Machine ID real.');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function seedAdmin() {
  console.log(`⚪ Intentando crear o actualizar el perfil para Machine ID: ${ADMIN_MACHINE_ID}`);

  try {
    const { data, error } = await supabase
      .from('profiles')
      .upsert({ 
        machine_id: ADMIN_MACHINE_ID, 
        full_name: ADMIN_FULL_NAME,
        email: ADMIN_EMAIL 
      }, {
        onConflict: 'machine_id'
      })
      .select()
      .single();

    if (error) {
      console.error('❌ Error al insertar el perfil de administrador:', error.message);
      return;
    }

    console.log('✅ ¡Éxito! Perfil de administrador creado/actualizado en la tabla "profiles".');
    console.log('📄 Datos:', data);

  } catch (e) {
    console.error('❌ Falló la operación de seeding:', e);
  }
}

seedAdmin();
