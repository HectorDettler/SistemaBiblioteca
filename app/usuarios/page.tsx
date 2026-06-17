import { cookies } from 'next/headers'
import { createServerClient } from '@supabase/ssr'
import { redirect } from 'next/navigation'
import UserForm from './UserForm'
import { Users, Shield, User, CheckCircle, XCircle, UserCheck, UserX } from 'lucide-react'
import { alternarEstadoUsuario } from './actions'

export const revalidate = 0

export default async function UsuariosPage() {
  // 1. Obtenemos las cookies de Next.js
  const cookieStore = await cookies()
  
  // 2. Creamos el cliente de Supabase específico para Servidor (SSR)
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value
        },
      },
    }
  )

  // 3. Obtenemos la sesión del usuario
  const { data: { user } } = await supabase.auth.getUser()
  const miUsuarioId = user?.id

  // --- BLOQUE DE SEGURIDAD ESTRICTA ---
  // Si no está logueado, lo mandamos al login
  if (!user) {
    redirect('/login')
  }

  // Buscamos su rol en la tabla profiles
  const { data: miPerfil } = await supabase
    .from('profiles')
    .select('rol')
    .eq('id', user.id)
    .single()

  // Si no es admin, lo rebotamos al inicio
  if (miPerfil?.rol !== 'admin') {
    redirect('/') 
  }
  // ------------------------------------

  // 4. Traemos todos los perfiles de la base de datos
  const { data: usuarios, error } = await supabase
    .from('profiles')
    .select('*')
    .order('nombre', { ascending: true })

  return (
    <div className="container mx-auto px-4 py-8 max-w-5xl">
      
      {/* Encabezado de la Sección */}
      <div className="flex items-center gap-3 mb-8">
        <div className="bg-indigo-600/10 p-2 rounded-xl text-indigo-400">
          <Users className="w-6 h-6" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-white">Gestión de Usuarios</h1>
          <p className="text-sm text-slate-400">Administrá el personal autorizado para acceder al sistema de la Biblioteca.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
        
        {/* Columna Izquierda: Formulario de Registro */}
        <div className="lg:col-span-1">
          <UserForm />
        </div>

        {/* Columna Derecha: Tabla/Lista de Usuarios */}
        <div className="lg:col-span-2 bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-xl">
          <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
            Personal Registrado
            <span className="text-xs bg-slate-800 text-slate-400 px-2 py-0.5 rounded-full font-normal">
              {usuarios?.length || 0}
            </span>
          </h2>

          {error && (
            <p className="text-sm text-red-400 bg-red-500/10 p-3 rounded-lg border border-red-500/20">
              Error al cargar los usuarios: {error.message}
            </p>
          )}

          {!error && (!usuarios || usuarios.length === 0) ? (
            <p className="text-sm text-slate-500 text-center py-8">No hay usuarios registrados todavía.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-800 text-xs font-bold text-slate-400 uppercase tracking-wider">
                    <th className="pb-3 pl-2">Usuario</th>
                    <th className="pb-3">Rol</th>
                    <th className="pb-3 text-right pr-2">Estado</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/50 text-sm">
                  {usuarios?.map((userTable) => {
                    const actionBindeada = alternarEstadoUsuario.bind(null, userTable.id, userTable.activo)

                    return (
                      <tr key={userTable.id} className="hover:bg-slate-800/20 transition-colors">
                        
                        <td className="py-3 pl-2">
                          <div className="font-semibold text-white">{userTable.nombre}</div>
                          <div className="text-xs text-slate-500">{userTable.email}</div>
                        </td>
                        
                        <td className="py-3">
                          {userTable.rol === 'admin' ? (
                            <span className="inline-flex items-center gap-1 text-xs font-semibold bg-amber-500/10 text-amber-400 px-2 py-0.5 rounded-md border border-amber-500/20">
                              <Shield className="w-3 h-3" /> Admin
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-xs font-semibold bg-blue-500/10 text-blue-400 px-2 py-0.5 rounded-md border border-blue-500/20">
                              <User className="w-3 h-3" /> Bibliotecario
                            </span>
                          )}
                        </td>

                        <td className="py-3 text-right pr-2">
                          <div className="flex items-center justify-end gap-3">
                            
                            {userTable.activo ? (
                              <span className="inline-flex items-center gap-1 text-xs text-emerald-400 font-medium bg-emerald-500/5 px-2 py-1 rounded-full">
                                <CheckCircle className="w-3.5 h-3.5" /> Activo
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-xs text-red-400 font-medium bg-red-500/5 px-2 py-1 rounded-full">
                                <XCircle className="w-3.5 h-3.5" /> Inactivo
                              </span>
                            )}

                            {/* Si el ID de la fila no es igual a tu ID logueado, muestra el botón */}
                            {userTable.id !== miUsuarioId && (
                              <form action={actionBindeada as any}>
                                <button
                                  type="submit"
                                  title={userTable.activo ? "Dar de baja usuario" : "Activar usuario"}
                                  className={`p-1.5 rounded-lg border transition-all cursor-pointer ${
                                    userTable.activo 
                                      ? "border-red-500/20 bg-red-500/5 text-red-400 hover:bg-red-500/20" 
                                      : "border-emerald-500/20 bg-emerald-500/5 text-emerald-400 hover:bg-emerald-500/20"
                                  }`}
                                >
                                  {userTable.activo ? <UserX className="w-4 h-4" /> : <UserCheck className="w-4 h-4" />}
                                </button>
                              </form>
                            )}
                            
                          </div>
                        </td>

                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

      </div>
    </div>
  )
}