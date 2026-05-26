'use client'

import { useEffect, useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import Link from "next/link";
import { createBrowserClient } from '@supabase/ssr'
import { BookMarked, Library, Users, ArrowRightLeft, LogOut, User, ShieldAlert } from "lucide-react";

export default function NavbarWrapper() {
  const pathname = usePathname()
  const router = useRouter()
  const [userEmail, setUserEmail] = useState<string | null>(null)
  const [userRole, setUserRole] = useState<string | null>(null) // Nuevo estado para el Rol

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  useEffect(() => {
    const getUserData = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      
      if (session?.user) {
        setUserEmail(session.user.email ?? null)
        
        // Buscamos el rol del usuario en la tabla profiles que creamos
        const { data: profile, error } = await supabase
          .from('profiles')
          .select('rol')
          .eq('id', session.user.id)
          .single()

        if (!error && profile) {
          setUserRole(profile.rol)
        }
      }
    }
    
    if (pathname !== '/login') {
      getUserData()
    }
  }, [pathname, supabase])

  const handleLogout = async () => {
    await supabase.auth.signOut()
    setUserEmail(null)
    setUserRole(null) // Limpiamos el rol al salir
    router.push('/login')
    router.refresh()
  }

  if (pathname === '/login') return null

  return (
    <header className="bg-slate-900 border-b border-slate-800 sticky top-0 z-40 shadow-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          
          {/* LADO IZQUIERDO: Logo */}
          <Link href="/" className="flex-shrink-0 flex items-center gap-2 hover:opacity-80 transition-opacity cursor-pointer">
            <div className="bg-indigo-500 p-2 rounded-lg shadow-sm">
              <BookMarked className="w-5 h-5 text-white" />
            </div>
            <span className="font-black text-xl text-white tracking-tight">
              Biblioteca<span className="text-indigo-400">Muni</span>
            </span>
          </Link>

          {/* CENTRO: Enlaces de navegación */}
          <nav className="hidden md:flex space-x-2">
            <Link href="/libros" className="flex items-center gap-2 px-3 py-2 rounded-md text-sm font-bold text-slate-300 hover:text-white hover:bg-slate-800 transition-colors">
              <Library className="w-4 h-4" /> Libros
            </Link>
            <Link href="/socios" className="flex items-center gap-2 px-3 py-2 rounded-md text-sm font-bold text-slate-300 hover:text-white hover:bg-slate-800 transition-colors">
              <Users className="w-4 h-4" /> Socios
            </Link>
            <Link href="/prestamos" className="flex items-center gap-2 px-3 py-2 rounded-md text-sm font-bold text-slate-300 hover:text-white hover:bg-slate-800 transition-colors">
              <ArrowRightLeft className="w-4 h-4" /> Préstamos
            </Link>

            {/* ¡BOTÓN CONDICIONAL!: Solo se muestra si el rol es 'admin' */}
            {userRole === 'admin' && (
              <Link href="/usuarios" className="flex items-center gap-2 px-3 py-2 rounded-md text-sm font-bold text-amber-400 hover:text-amber-300 hover:bg-slate-800 transition-colors border border-amber-500/20 bg-amber-500/5">
                <ShieldAlert className="w-4 h-4" /> Usuarios
              </Link>
            )}
          </nav>

          {/* LADO DERECHO: Info de Usuario y Botón Salir */}
          <div className="flex items-center gap-4">
            {userEmail && (
              <div className="hidden sm:flex items-center gap-2 bg-slate-800/50 px-3 py-1.5 rounded-lg border border-slate-800">
                <User className="w-4 h-4 text-indigo-400" />
                <span className="text-xs font-medium text-slate-300 select-none">
                  {userEmail} {userRole === 'admin' && <span className="text-amber-400 font-bold ml-1">(Admin)</span>}
                </span>
              </div>
            )}

            <button
              onClick={handleLogout}
              className="flex items-center gap-2 px-3 py-2 rounded-md text-sm font-bold text-red-400 hover:text-red-300 hover:bg-red-500/10 transition-all cursor-pointer"
              title="Cerrar Sesión"
            >
              <LogOut className="w-4 h-4" />
              <span className="hidden md:inline">Salir</span>
            </button>
          </div>

        </div>
      </div>
    </header>
  )
}