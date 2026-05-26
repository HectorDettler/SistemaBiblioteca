'use server'

import { createClient } from '@supabase/supabase-js'
import { revalidatePath } from 'next/cache'

// Inicializamos el cliente de administración con la Service Role Key
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function crearUsuario(formData: FormData) {
  const nombre = formData.get('nombre') as string
  const email = formData.get('email') as string
  const password = formData.get('password') as string
  const rol = formData.get('rol') as string

  if (!email || !password || !nombre || !rol) {
    return { success: false, error: 'Todos los campos son obligatorios.' }
  }

  try {
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true // Se crea confirmado automáticamente
    })

    if (authError) {
      return { success: false, error: authError.message }
    }

    if (authData?.user) {
      const { error: profileError } = await supabaseAdmin
        .from('profiles')
        .insert([{
          id: authData.user.id,
          email,
          nombre,
          rol,
          activo: true
        }])

      if (profileError) {
        await supabaseAdmin.auth.admin.deleteUser(authData.user.id)
        return { success: false, error: `Error en perfil: ${profileError.message}` }
      }
    }

    revalidatePath('/usuarios')
    return { success: true }

  } catch (err: any) {
    return { success: false, error: err.message || 'Ocurrió un error inesperado.' }
  }
}

export async function alternarEstadoUsuario(id: string, estadoActual: boolean) {
  if (!id) {
    return { success: false, error: 'ID de usuario no válida.' }
  }

  try {
    // 1. Cambiamos el estado en la tabla 'profiles'
    const { error: profileError } = await supabaseAdmin
      .from('profiles')
      .update({ activo: !estadoActual })
      .eq('id', id)

    if (profileError) {
      console.error("❌ Error actualizando tabla profiles:", profileError.message)
      return { success: false, error: profileError.message }
    }

    // 2. Modificamos el estado en Supabase Auth.
    // Usamos '876600h' (100 años) en vez de 'infinite' para que Go lo procese de manera correcta
    const { error: authError } = await supabaseAdmin.auth.admin.updateUserById(
      id,
      { ban_duration: !estadoActual ? 'none' : '876600h' }
    )

    if (authError) {
      console.error("❌ Error aplicando Ban en Supabase Auth:", authError.message)
      // Rollback si falla Auth para mantener consistencia
      await supabaseAdmin.from('profiles').update({ activo: estadoActual }).eq('id', id)
      return { success: false, error: authError.message }
    }

    revalidatePath('/usuarios')
    return { success: true }

  } catch (err: any) {
    console.error("❌ Excepción en alternarEstadoUsuario:", err)
    return { success: false, error: err.message || 'Ocurrió un error inesperado.' }
  }
}