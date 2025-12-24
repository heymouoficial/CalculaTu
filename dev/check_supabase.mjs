// dev/check_supabase.mjs
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

// Cargar variables de entorno desde .env.local
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ Error: VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY deben estar en tu archivo .env.local');
  process.exit(1);
}

console.log('⚪ Conectando a Supabase en:', supabaseUrl);

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function checkConnection() {
  try {
    // Una consulta simple para verificar la conexión y los permisos de lectura básicos
    const { data, error } = await supabase
      .from('profiles')
      .select('machine_id')
      .limit(1);

    if (error) {
      console.error('❌ Error al consultar la tabla "profiles":', error.message);
      if (error.code === '42P01') {
        console.error('👉 Sugerencia: La tabla "profiles" no parece existir. ¿Ejecutaste las migraciones?');
      }
      if (error.code === '404' || error.message.includes('404')) {
         console.error('👉 Sugerencia: Error 404. Verifica que el "project-id" en la URL de Supabase sea correcto.');
      }
      return;
    }

    console.log('✅ Conexión con Supabase exitosa.');
    console.log('🔍 Se encontró la tabla "profiles".');
    if (data && data.length > 0) {
      console.log('👍 La tabla "profiles" tiene datos. Ejemplo de machine_id:', data[0].machine_id);
    } else {
      console.log('🟡 La tabla "profiles" está vacía.');
    }

  } catch (e) {
    console.error('❌ Falló la conexión general con Supabase:', e);
  }
}

checkConnection();
