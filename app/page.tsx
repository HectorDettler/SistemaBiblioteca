'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { 
  Library, Layers, BarChart3, Users, BookMarked, 
  Loader2, UserCheck, UserX, ArrowRightLeft, 
  BookUp, History 
} from 'lucide-react'
import Link from 'next/link'

export default function Dashboard() {
  const [cargando, setCargando] = useState(true)
  const [stats, setStats] = useState({
    titulos: 0,
    ejemplares: 0,
    disponibles: 0,
    totalSocios: 0,
    sociosActivos: 0,
    sociosInactivos: 0,
    prestamosActivos: 0,
    prestamosHistoricos: 0
  })

  useEffect(() => {
    async function cargarEstadisticas() {
      try {
        // 1. Consultar Libros
        const { data: libros, error: errLibros } = await supabase
          .from('libros')
          .select('cant_total, cant_disponible')
        
        // 2. Consultar Socios
        const { data: socios, error: errSocios } = await supabase
          .from('socios')
          .select('estado_socio')

        // 3. Consultar Préstamos (asumiendo columna 'estado_prestamo')
        const { data: prestamos, error: errPrestamos } = await supabase
          .from('prestamos')
          .select('estado')

        let librosStats = { titulos: 0, ejemplares: 0, disponibles: 0 }
        let sociosStats = { totalSocios: 0, sociosActivos: 0, sociosInactivos: 0 }
        let prestamosStats = { prestamosActivos: 0, prestamosHistoricos: 0 }

        if (!errLibros && libros) {
          librosStats = {
            titulos: libros.length,
            ejemplares: libros.reduce((acc, curr) => acc + (curr.cant_total || 0), 0),
            disponibles: libros.reduce((acc, curr) => acc + (curr.cant_disponible || 0), 0)
          }
        }

        if (!errSocios && socios) {
          sociosStats = {
            totalSocios: socios.length,
            sociosActivos: socios.filter(s => s.estado_socio === 'Activo').length,
            sociosInactivos: socios.filter(s => s.estado_socio === 'Inactivo').length
          }
        }

        if (!errPrestamos && prestamos) {
          prestamosStats = {
            prestamosHistoricos: prestamos.length,
            // Ajustá 'Activo' o 'Pendiente' según cómo lo guardes en tu base de datos
            prestamosActivos: prestamos.filter(p => p.estado === 'Prestado').length
          }
        }

        setStats({
          ...librosStats,
          ...sociosStats,
          ...prestamosStats
        })

      } catch (err) {
        console.error("Error cargando estadísticas del Dashboard:", err)
      }
      setCargando(false)
    }

    cargarEstadisticas()
  }, [])

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-12">
      {/* Saludo Inicial */}
      <div className="bg-white p-8 rounded-xl border border-slate-200 shadow-sm relative overflow-hidden">
        <div className="relative z-10">
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">Panel de Control Municipal</h1>
          <p className="text-slate-500 mt-2 text-lg">Bienvenido al sistema de gestión de la Biblioteca. Aquí tienes el resumen en tiempo real.</p>
        </div>
        <div className="absolute -right-8 -bottom-8 bg-indigo-50 w-64 h-64 rounded-full opacity-50 blur-3xl"></div>
        <BookMarked className="absolute -right-8 -bottom-8 w-48 h-48 text-indigo-100/50 rotate-12" />
      </div>

      {cargando ? (
        <div className="flex justify-center items-center h-32">
          <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
        </div>
      ) : (
        <div className="space-y-8">
          
          {/* SECCIÓN: MOVIMIENTOS Y PRÉSTAMOS */}
          <div>
            <h2 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">Movimientos de Biblioteca</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Card 1: Préstamos Activos */}
              <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4 hover:border-violet-200 transition-colors">
                <div className="p-4 bg-violet-50 text-violet-600 rounded-xl">
                  <BookUp className="w-8 h-8" />
                </div>
                <div>
                  <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Préstamos Activos</p>
                  <h4 className="text-3xl font-black text-slate-800 mt-1">{stats.prestamosActivos}</h4>
                </div>
              </div>

              {/* Card 2: Histórico */}
              <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4 hover:border-slate-300 transition-colors">
                <div className="p-4 bg-slate-100 text-slate-600 rounded-xl">
                  <History className="w-8 h-8" />
                </div>
                <div>
                  <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Préstamos Totales</p>
                  <h4 className="text-3xl font-black text-slate-800 mt-1">{stats.prestamosHistoricos}</h4>
                </div>
              </div>

              {/* Card 3: Acceso Directo */}
              <Link href="/prestamos" className="bg-slate-900 p-6 rounded-xl border border-slate-800 shadow-md flex items-center justify-between gap-4 hover:bg-slate-800 transition-all cursor-pointer group active:scale-95">
                <div className="flex items-center gap-4">
                  <div className="p-4 bg-violet-500/10 text-violet-400 rounded-xl group-hover:bg-violet-500/20 transition-colors">
                    <ArrowRightLeft className="w-8 h-8" />
                  </div>
                  <div>
                    <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Préstamos</p>
                    <h4 className="text-lg font-black text-white mt-0.5">Gestionar</h4>
                  </div>
                </div>
                <div className="text-violet-400 text-2xl font-black transform group-hover:translate-x-1.5 transition-transform pr-2">
                  →
                </div>
              </Link>
            </div>
          </div>

          {/* SECCIÓN: CONTROL DE INVENTARIO (LIBROS) */}
          <div>
            <h2 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">Inventario de Libros</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4 hover:border-indigo-200 transition-colors">
                <div className="p-4 bg-indigo-50 text-indigo-600 rounded-xl">
                  <Library className="w-8 h-8" />
                </div>
                <div>
                  <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Títulos Únicos</p>
                  <h4 className="text-3xl font-black text-slate-800 mt-1">{stats.titulos}</h4>
                </div>
              </div>

              <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4 hover:border-emerald-200 transition-colors">
                <div className="p-4 bg-emerald-50 text-emerald-600 rounded-xl">
                  <Layers className="w-8 h-8" />
                </div>
                <div>
                  <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Ejemplares Totales</p>
                  <h4 className="text-3xl font-black text-slate-800 mt-1">{stats.ejemplares}</h4>
                </div>
              </div>

              <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4 hover:border-amber-200 transition-colors">
                <div className="p-4 bg-amber-50 text-amber-600 rounded-xl">
                  <BarChart3 className="w-8 h-8" />
                </div>
                <div>
                  <p className="text-xs font-bold uppercase tracking-wider text-slate-500">En Estante</p>
                  <h4 className="text-3xl font-black text-slate-800 mt-1">{stats.disponibles}</h4>
                </div>
              </div>
            </div>
          </div>

          {/* SECCIÓN: ESTADÍSTICAS DEL PADRÓN (SOCIOS) */}
          <div>
            <h2 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">Estado del Padrón</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4 hover:border-blue-200 transition-colors">
                <div className="p-4 bg-blue-50 text-blue-600 rounded-xl">
                  <Users className="w-8 h-8" />
                </div>
                <div>
                  <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Total Socios</p>
                  <h4 className="text-3xl font-black text-slate-800 mt-1">{stats.totalSocios}</h4>
                </div>
              </div>

              <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4 hover:border-emerald-200 transition-colors">
                <div className="p-4 bg-emerald-50 text-emerald-600 rounded-xl">
                  <UserCheck className="w-8 h-8" />
                </div>
                <div>
                  <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Socios Activos</p>
                  <h4 className="text-3xl font-black text-emerald-600 mt-1">{stats.sociosActivos}</h4>
                </div>
              </div>

              <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4 hover:border-rose-200 transition-colors">
                <div className="p-4 bg-rose-50 text-rose-600 rounded-xl">
                  <UserX className="w-8 h-8" />
                </div>
                <div>
                  <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Socios Inactivos</p>
                  <h4 className="text-3xl font-black text-rose-600 mt-1">{stats.sociosInactivos}</h4>
                </div>
              </div>

              <Link href="/socios" className="bg-slate-900 p-6 rounded-xl border border-slate-800 shadow-md flex items-center justify-between gap-4 hover:bg-slate-800 transition-all cursor-pointer group active:scale-95">
                <div className="flex items-center gap-4">
                  <div className="p-4 bg-blue-500/10 text-blue-400 rounded-xl group-hover:bg-blue-500/20 transition-colors">
                    <Users className="w-8 h-8" />
                  </div>
                  <div>
                    <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Padrón</p>
                    <h4 className="text-lg font-black text-white mt-0.5">Administrar</h4>
                  </div>
                </div>
                <div className="text-blue-400 text-2xl font-black transform group-hover:translate-x-1.5 transition-transform pr-2">
                  →
                </div>
              </Link>
            </div>
          </div>

        </div>
      )}
    </div>
  )
}