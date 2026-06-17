import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// Inicializamos el cliente de Supabase
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

// Esta es la función que se ejecuta cuando el robot visita la URL
export async function GET() {
  try {
    // Hacemos una consulta hiper liviana: solo pedimos 1 ID de la tabla profiles.
    // Esto es suficiente para que Supabase registre que la base está en uso.
    const { error } = await supabase.from('profiles').select('id').limit(1)

    if (error) {
      console.error("Error en el ping a Supabase:", error.message)
      return NextResponse.json({ status: 'Error', message: error.message }, { status: 500 })
    }

    return NextResponse.json({ status: 'OK', message: '¡Supabase está despierto y activo!' }, { status: 200 })
    
  } catch (err) {
    return NextResponse.json({ status: 'Error', message: 'Falla de conexión' }, { status: 500 })
  }
}