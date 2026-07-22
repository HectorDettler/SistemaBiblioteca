'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { 
  ArrowLeftRight, Calendar, User, BookOpen, Search, 
  CheckCircle2, Clock, Plus, X, Loader2, AlertCircle, RefreshCw,
  Filter, AlertTriangle, Printer, CalendarPlus, ChevronLeft, ChevronRight
} from 'lucide-react'

// Tipados para TypeScript y Supabase
interface Prestamo {
  id_prestamo: number
  created_at: string
  libro_id: number
  socio_id: number
  fecha_prestamo: string
  fecha_devol_esp: string
  fecha_devol_real: string | null
  estado: string
  libros: { titulo: string; autor: string } | null
  socios: { nombre: string; apellido: string; dni: number } | null
}

interface Libro {
  id_libro: number
  titulo: string
  autor: string
  cant_disponible: number
}

interface Socio {
  id_socio: number
  nombre: string
  apellido: string
  dni: number
  estado_socio: string
}

// Interfaz para nuestro sistema de Toasts personalizados
interface Toast {
  id: number
  mensaje: string
  tipo: 'success' | 'error' | 'warning'
}

export default function PrestamosPage() {
  const [prestamos, setPrestamos] = useState<Prestamo[]>([])
  const [libros, setLibros] = useState<Libro[]>([])
  const [socios, setSocios] = useState<Socio[]>([])
  const [cargando, setCargando] = useState(true)
  const [procesandoAccion, setProcesandoAccion] = useState(false)
  
  // Estados para Filtros Avanzados y Buscador Global
  const [busquedaGlobal, setBusquedaGlobal] = useState('')
  const [filtroEstado, setFiltroEstado] = useState<'Todos' | 'Prestado' | 'Vencidos' | 'Devuelto'>('Todos')

  // NUEVOS ESTADOS: Paginación
  const [paginaActual, setPaginaActual] = useState(1)
  const prestamosPorPagina = 10

  // Estado para las Alertas Estéticas (Toasts)
  const [toasts, setToasts] = useState<Toast[]>([])

  // Estados para el Modal de Nuevo Préstamo
  const [modalAbierto, setModalAbierto] = useState(false)
  const [filtroSocio, setFiltroSocio] = useState('')
  const [filtroLibro, setFiltroLibro] = useState('')
  const [socioSeleccionado, setSocioSeleccionado] = useState<Socio | null>(null)
  const [libroSeleccionado, setLibroSeleccionado] = useState<Libro | null>(null)
  
  // Manejo de fechas por defecto
  const hoyStr = new Date().toISOString().split('T')[0]
  const unaSemanaDespues = new Date()
  unaSemanaDespues.setDate(unaSemanaDespues.getDate() + 7)
  const defectoDevolEsp = unaSemanaDespues.toISOString().split('T')[0]
  const [fechaDevolEsp, setFechaDevolEsp] = useState(defectoDevolEsp)

  // Función para lanzar notificaciones premium flotantes
  function lanzarToast(mensaje: string, tipo: 'success' | 'error' | 'warning') {
    const id = Date.now()
    setToasts(prev => [...prev, { id, mensaje, tipo }])
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id))
    }, 4000)
  }

  // Cargar datos iniciales de Supabase
  async function cargarDatos() {
    setCargando(true)
    try {
      const { data: dataPrestamos, error: errP } = await supabase
        .from('prestamos')
        .select(`
          id_prestamo, created_at, libro_id, socio_id, fecha_prestamo, fecha_devol_esp, fecha_devol_real, estado,
          libros (titulo, autor),
          socios (nombre, apellido, dni)
        `)
        .order('id_prestamo', { ascending: false })

      if (errP) throw errP
      setPrestamos((dataPrestamos as any) || [])

      const { data: dataLibros } = await supabase.from('libros').select('id_libro, titulo, autor, cant_disponible')
      setLibros((dataLibros as any) || [])

      const { data: dataSocios } = await supabase.from('socios').select('id_socio, nombre, apellido, dni, estado_socio')
      setSocios((dataSocios as any) || [])

    } catch (error) {
      console.error(error)
      lanzarToast('Error al sincronizar datos con Supabase.', 'error')
    } finally {
      setCargando(false)
    }
  }

  useEffect(() => {
    cargarDatos()
  }, [])

  // Guardar nuevo préstamo
  async function handleCrearPrestamo(e: React.FormEvent) {
    e.preventDefault()
    if (!socioSeleccionado || !libroSeleccionado) {
      lanzarToast('Por favor, selecciona un socio y un libro válido.', 'warning')
      return
    }

    if (socioSeleccionado.estado_socio !== 'Activo') {
      lanzarToast('Operación denegada. El socio se encuentra Inactivo.', 'error')
      return
    }

    if (libroSeleccionado.cant_disponible <= 0) {
      lanzarToast('¡Sin stock! No quedan ejemplares disponibles en estante.', 'error')
      return
    }

    setProcesandoAccion(true)
    try {
      const { error: errInsert } = await supabase.from('prestamos').insert([
        {
          libro_id: libroSeleccionado.id_libro,
          socio_id: socioSeleccionado.id_socio,
          fecha_prestamo: hoyStr,
          fecha_devol_esp: fechaDevolEsp,
          fecha_devol_real: null,
          estado: 'Prestado'
        }
      ])
      if (errInsert) throw errInsert

      const { error: errUpdateStock } = await supabase
        .from('libros')
        .update({ cant_disponible: libroSeleccionado.cant_disponible - 1 })
        .eq('id_libro', libroSeleccionado.id_libro)
      
      if (errUpdateStock) throw errUpdateStock

      lanzarToast('¡Préstamo registrado con éxito!', 'success')
      cerrarModal()
      await cargarDatos()
    } catch (error) {
      console.error(error)
      lanzarToast('No se pudo procesar el préstamo.', 'error')
    } finally {
      setProcesandoAccion(false)
    }
  }

  // Registrar devolución
  async function handleDevolucion(prestamo: Prestamo) {
    setProcesandoAccion(true)
    try {
      const { error: errPrestamo } = await supabase
        .from('prestamos')
        .update({
          estado: 'Devuelto',
          fecha_devol_real: hoyStr
        })
        .eq('id_prestamo', prestamo.id_prestamo)

      if (errPrestamo) throw errPrestamo

      const { data: libroActual } = await supabase
        .from('libros')
        .select('cant_disponible')
        .eq('id_libro', prestamo.libro_id)
        .single()

      const stockActual = libroActual?.cant_disponible || 0

      const { error: errStock } = await supabase
        .from('libros')
        .update({ cant_disponible: stockActual + 1 })
        .eq('id_libro', prestamo.libro_id)

      if (errStock) throw errStock

      lanzarToast(`Libro "${prestamo.libros?.titulo}" recibido correctamente.`, 'success')
      await cargarDatos()
    } catch (error) {
      console.error(error)
      lanzarToast('Error al registrar el retorno físico.', 'error')
    } finally {
      setProcesandoAccion(false)
    }
  }

  // NUEVA FUNCIÓN: Extender plazo del préstamo (Suma 7 días)
  async function handleExtenderPlazo(prestamo: Prestamo) {
    if (!window.confirm(`¿Querés extender el plazo de devolución por 7 días más para el libro "${prestamo.libros?.titulo}"?`)) return
    
    setProcesandoAccion(true)
    try {
      // Sumamos 7 días a la fecha esperada actual
      const fechaActual = new Date(prestamo.fecha_devol_esp + 'T00:00:00')
      fechaActual.setDate(fechaActual.getDate() + 7)
      const nuevaFecha = fechaActual.toISOString().split('T')[0]

      const { error } = await supabase
        .from('prestamos')
        .update({ fecha_devol_esp: nuevaFecha })
        .eq('id_prestamo', prestamo.id_prestamo)

      if (error) throw error

      lanzarToast(`Plazo extendido exitosamente hasta el ${nuevaFecha.split('-').reverse().join('/')}.`, 'success')
      await cargarDatos()
    } catch (error) {
      console.error(error)
      lanzarToast('Error al intentar extender el plazo.', 'error')
    } finally {
      setProcesandoAccion(false)
    }
  }

  // Genera y dispara la impresión del ticket
  function handleImprimirTicket(prestamo: Prestamo) {
    const ventana = window.open('', '_blank', 'width=400,height=600')
    if (!ventana) {
      lanzarToast('El navegador bloqueó la ventana de impresión. Habilita las ventanas emergentes.', 'warning')
      return
    }

    const htmlTicket = `
      <!DOCTYPE html>
      <html lang="es">
      <head>
        <meta charset="UTF-8">
        <title>Ticket de Préstamo #${prestamo.id_prestamo}</title>
        <style>
          @page { margin: 0; }
          body { 
            font-family: 'Courier New', Courier, monospace; 
            padding: 20px; 
            color: #000; 
            text-align: center; 
            background: #fff;
          }
          .ticket { 
            border: 1px dashed #000; 
            padding: 20px; 
            max-width: 300px; 
            margin: 0 auto; 
          }
          .header { font-size: 18px; font-weight: bold; margin-bottom: 5px; }
          .subheader { font-size: 14px; margin-bottom: 15px; }
          .divider { border-top: 1px dashed #000; margin: 15px 0; }
          .info { text-align: left; font-size: 13px; margin-bottom: 6px; line-height: 1.4; }
          .footer { font-size: 12px; margin-top: 20px; font-weight: bold; }
        </style>
      </head>
      <body>
        <div class="ticket">
          <div class="header">BIBLIOTECA MUNICIPAL</div>
          <div class="subheader">Comprobante de Préstamo</div>
          
          <div class="divider"></div>
          
          <div class="info"><b>Socio:</b> ${prestamo.socios?.apellido}, ${prestamo.socios?.nombre}</div>
          <div class="info"><b>DNI:</b> ${prestamo.socios?.dni}</div>
          
          <div class="divider"></div>
          
          <div class="info"><b>Libro:</b> ${prestamo.libros?.titulo}</div>
          <div class="info"><b>Autor:</b> ${prestamo.libros?.autor || 'N/A'}</div>
          
          <div class="divider"></div>
          
          <div class="info"><b>Fecha de Retiro:</b><br>${prestamo.fecha_prestamo.split('-').reverse().join('/')}</div>
          <div class="info"><b>Fecha Límite Devolución:</b><br>${prestamo.fecha_devol_esp.split('-').reverse().join('/')}</div>
          
          <div class="divider"></div>
          
          <div class="footer">
            ¡Disfrute su lectura!<br>
            Por favor devuelva el ejemplar a tiempo para evitar sanciones.
          </div>
        </div>
        <script>
          window.onload = function() { window.print(); }
        </script>
      </body>
      </html>
    `
    
    ventana.document.write(htmlTicket)
    ventana.document.close()
  }

  function cerrarModal() {
    setModalAbierto(false)
    setSocioSeleccionado(null)
    setLibroSeleccionado(null)
    setFiltroSocio('')
    setFiltroLibro('')
    setFechaDevolEsp(defectoDevolEsp)
  }

  // === FILTRADO DEL BUSCADOR INTERACTIVO DEL MODAL ===
  const sociosFiltradosModal = socios.filter(s => 
    s.nombre.toLowerCase().includes(filtroSocio.toLowerCase()) ||
    s.apellido.toLowerCase().includes(filtroSocio.toLowerCase()) ||
    s.dni.toString().includes(filtroSocio)
  ).slice(0, 5)

  const librosFiltradosModal = libros.filter(l => 
    (l.titulo && l.titulo.toLowerCase().includes(filtroLibro.toLowerCase())) ||
    (l.autor && l.autor.toLowerCase().includes(filtroLibro.toLowerCase()))
  ).slice(0, 5)

  // === FILTRADO Y BUSCADOR DE LA TABLA PRINCIPAL ===
  const prestamosProcesados = prestamos.filter(p => {
    const matchesBusqueda = 
      (p.libros?.titulo && p.libros.titulo.toLowerCase().includes(busquedaGlobal.toLowerCase())) ||
      (p.socios?.apellido && p.socios.apellido.toLowerCase().includes(busquedaGlobal.toLowerCase())) ||
      (p.socios?.nombre && p.socios.nombre.toLowerCase().includes(busquedaGlobal.toLowerCase()))

    if (!matchesBusqueda) return false

    const estaVencido = p.estado === 'Prestado' && new Date(p.fecha_devol_esp) < new Date(hoyStr)
    
    if (filtroEstado === 'Todos') return true
    if (filtroEstado === 'Vencidos') return estaVencido
    if (filtroEstado === 'Prestado') return p.estado === 'Prestado' && !estaVencido
    return p.estado === filtroEstado
  })

  // === LÓGICA DE PAGINACIÓN ===
  const totalPaginas = Math.ceil(prestamosProcesados.length / prestamosPorPagina)
  const indiceUltimoPrestamo = paginaActual * prestamosPorPagina
  const indicePrimerPrestamo = indiceUltimoPrestamo - prestamosPorPagina
  const prestamosPaginados = prestamosProcesados.slice(indicePrimerPrestamo, indiceUltimoPrestamo)

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-12 relative">
      
      {/* ESPACIO CONTENEDOR DE NOTIFICACIONES (TOASTS SYSTEM) */}
      <div className="fixed bottom-5 right-5 z-[100] space-y-3 max-w-sm w-full">
        {toasts.map(t => (
          <div 
            key={t.id} 
            className={`p-4 rounded-xl shadow-2xl border flex items-start gap-3 animate-in slide-in-from-bottom-5 duration-300 text-sm ${
              t.tipo === 'success' ? 'bg-emerald-50 border-emerald-200 text-emerald-800' :
              t.tipo === 'error' ? 'bg-rose-50 border-rose-200 text-rose-800' :
              'bg-amber-50 border-amber-200 text-amber-800'
            }`}
          >
            {t.tipo === 'success' && <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" />}
            {t.tipo === 'error' && <AlertCircle className="w-5 h-5 text-rose-600 flex-shrink-0 mt-0.5" />}
            {t.tipo === 'warning' && <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />}
            <div className="flex-1 font-semibold">{t.mensaje}</div>
            <button onClick={() => setToasts(prev => prev.filter(item => item.id !== t.id))} className="text-slate-400 hover:text-slate-600">
              <X className="w-4 h-4" />
            </button>
          </div>
        ))}
      </div>

      {/* Encabezado Principal */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-8 rounded-xl border border-slate-200 shadow-sm">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <ArrowLeftRight className="w-8 h-8 text-indigo-600" />
            Gestión de Préstamos
          </h1>
          <p className="text-slate-500 mt-1">Control de salidas, retornos, alertas de vencimientos e historial relacional.</p>
        </div>
        <button
          onClick={() => setModalAbierto(true)}
          className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-5 py-3 rounded-xl shadow-md transition-all flex items-center justify-center gap-2 active:scale-95 text-sm self-start sm:self-center"
        >
          <Plus className="w-5 h-5" /> Nuevo Préstamo
        </button>
      </div>

      {/* SECCIÓN BARRA DE BÚSQUEDA Y BOTONERA DE FILTROS RÁPIDOS */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="w-5 h-5 absolute left-3 top-3 text-slate-400" />
          <input
            type="text"
            placeholder="Buscar por Apellido de Socio o Título de Libro..."
            value={busquedaGlobal}
            onChange={(e) => { setBusquedaGlobal(e.target.value); setPaginaActual(1); }}
            className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:outline-none focus:border-indigo-500 text-sm"
          />
          {busquedaGlobal && (
            <button onClick={() => { setBusquedaGlobal(''); setPaginaActual(1); }} className="absolute right-3 top-3 text-slate-400 hover:text-slate-600">
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0 text-xs font-bold uppercase tracking-wider">
          <span className="text-slate-400 flex items-center gap-1 mr-1 text-[11px]"><Filter className="w-3.5 h-3.5" /> Filtrar:</span>
          {[
            { id: 'Todos', label: 'Todos' },
            { id: 'Prestado', label: 'En posesión' },
            { id: 'Vencidos', label: 'Vencidos ⚠️' },
            { id: 'Devuelto', label: 'Devueltos' }
          ].map((item) => (
            <button
              key={item.id}
              onClick={() => { setFiltroEstado(item.id as any); setPaginaActual(1); }}
              className={`px-3 py-2 rounded-lg transition-all ${
                filtroEstado === item.id 
                  ? 'bg-indigo-600 text-white shadow-sm' 
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      {/* Contenido de la Tabla Principal */}
      {cargando ? (
        <div className="flex flex-col justify-center items-center h-48 gap-2">
          <Loader2 className="w-9 h-9 text-indigo-600 animate-spin" />
          <p className="text-slate-400 text-sm font-medium">Consultando registros relacionales en vivo...</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-xs font-bold uppercase tracking-wider text-slate-500">
                  <th className="p-4 pl-6">Libro / Título</th>
                  <th className="p-4">Socio / Lector</th>
                  <th className="p-4">Fecha Salida</th>
                  <th className="p-4">Devolución Pactada</th>
                  <th className="p-4">Estado</th>
                  <th className="p-4 pr-6 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {prestamosPaginados.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="text-center p-12 text-slate-400 font-medium">
                      <AlertCircle className="w-8 h-8 mx-auto mb-2 opacity-50" />
                      No se encontraron préstamos que coincidan con el criterio seleccionado.
                    </td>
                  </tr>
                ) : (
                  prestamosPaginados.map((p) => {
                    const estaVencido = p.estado === 'Prestado' && new Date(p.fecha_devol_esp) < new Date(hoyStr)
                    return (
                      <tr key={p.id_prestamo} className="hover:bg-slate-50/50 transition-colors">
                        <td className="p-4 pl-6">
                          <div className="flex items-center gap-3">
                            <div className="p-2 bg-slate-100 text-slate-600 rounded-lg">
                              <BookOpen className="w-5 h-5" />
                            </div>
                            <div>
                              <p className="font-bold text-slate-800">{p.libros?.titulo || 'Libro eliminado'}</p>
                              <p className="text-xs text-slate-400">{p.libros?.autor || 'Desconocido'}</p>
                            </div>
                          </div>
                        </td>
                        <td className="p-4">
                          <div>
                            <p className="font-semibold text-slate-700">{p.socios ? `${p.socios.apellido}, ${p.socios.nombre}` : 'Socio eliminado'}</p>
                            <p className="text-xs text-slate-400">DNI: {p.socios?.dni}</p>
                          </div>
                        </td>
                        <td className="p-4 text-slate-600 font-medium">
                          {p.fecha_prestamo.split('-').reverse().join('/')}
                        </td>
                        <td className="p-4">
                          <div className="font-medium">
                            {p.fecha_devol_real ? (
                              <span className="text-slate-400 line-through">
                                {p.fecha_devol_esp.split('-').reverse().join('/')}
                              </span>
                            ) : (
                              <span className={estaVencido ? 'text-rose-600 font-bold' : 'text-slate-700'}>
                                {p.fecha_devol_esp.split('-').reverse().join('/')}
                              </span>
                            )}
                            {p.fecha_devol_real && (
                              <p className="text-xs text-emerald-600 font-bold mt-0.5">
                                Devuelto el: {p.fecha_devol_real.split('-').reverse().join('/')}
                              </p>
                            )}
                          </div>
                        </td>
                        <td className="p-4">
                          {p.estado === 'Devuelto' ? (
                            <span className="inline-flex items-center gap-1 bg-emerald-50 text-emerald-700 text-xs font-bold px-2.5 py-1 rounded-full border border-emerald-200">
                              <CheckCircle2 className="w-3.5 h-3.5" /> Devuelto
                            </span>
                          ) : estaVencido ? (
                            <span className="inline-flex items-center gap-1 bg-rose-50 text-rose-700 text-xs font-bold px-2.5 py-1 rounded-full border border-rose-200 animate-pulse">
                              <AlertCircle className="w-3.5 h-3.5" /> Vencido
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 bg-amber-50 text-amber-700 text-xs font-bold px-2.5 py-1 rounded-full border border-amber-200">
                              <Clock className="w-3.5 h-3.5" /> En posesión
                            </span>
                          )}
                        </td>
                        <td className="p-4 pr-6 text-right">
                          <div className="flex items-center justify-end gap-1">
                            {/* BOTÓN: Imprimir Ticket */}
                            <button
                              onClick={() => handleImprimirTicket(p)}
                              title="Imprimir comprobante"
                              className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors border border-transparent hover:border-indigo-100"
                            >
                              <Printer className="w-4 h-4" />
                            </button>

                            {/* BOTÓN: Extender Plazo (+7 días) */}
                            {p.estado === 'Prestado' && (
                              <button
                                disabled={procesandoAccion}
                                onClick={() => handleExtenderPlazo(p)}
                                title="Extender plazo (+7 días)"
                                className="p-2 text-slate-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors border border-transparent hover:border-amber-100 mr-1"
                              >
                                <CalendarPlus className="w-4 h-4" />
                              </button>
                            )}

                            {p.estado === 'Prestado' ? (
                              <button
                                disabled={procesandoAccion}
                                onClick={() => handleDevolucion(p)}
                                className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs px-3 py-2 rounded-lg shadow-sm transition-all inline-flex items-center gap-1.5 active:scale-95 disabled:opacity-50"
                              >
                                <RefreshCw className="w-3.5 h-3.5" /> Recibir
                              </button>
                            ) : (
                              <span className="text-xs text-slate-400 italic bg-slate-100 px-3 py-2 rounded-lg border border-slate-200">Cerrado</span>
                            )}
                          </div>
                        </td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>
          
          {/* BARRA DE PAGINACIÓN */}
          {totalPaginas > 1 && (
            <div className="bg-slate-50 px-4 py-3.5 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between select-none gap-4">
              <div className="text-xs font-bold text-slate-500">
                Mostrando préstamos {indicePrimerPrestamo + 1} al {Math.min(indiceUltimoPrestamo, prestamosProcesados.length)} de un total de {prestamosProcesados.length}
              </div>
              <div className="flex items-center gap-1 bg-white border border-slate-300 rounded-lg p-1 shadow-sm">
                <button 
                  disabled={paginaActual === 1} 
                  onClick={() => setPaginaActual(p => p - 1)} 
                  className="p-1.5 rounded-md text-slate-600 hover:bg-slate-100 disabled:opacity-40 disabled:hover:bg-transparent transition-colors"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <div className="text-xs font-bold px-3 text-slate-700">Página {paginaActual} de {totalPaginas}</div>
                <button 
                  disabled={paginaActual === totalPaginas} 
                  onClick={() => setPaginaActual(p => p + 1)} 
                  className="p-1.5 rounded-md text-slate-600 hover:bg-slate-100 disabled:opacity-40 disabled:hover:bg-transparent transition-colors"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* MODAL REGISTRAR NUEVO PRESTAMO */}
      {modalAbierto && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex justify-center items-center p-4 z-50 animate-in fade-in duration-200">
          <div className="bg-white rounded-xl shadow-xl border border-slate-200 w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-6 bg-slate-50 border-b border-slate-200 flex justify-between items-center">
              <h3 className="font-black text-xl text-slate-800">Registrar Salida de Libro</h3>
              <button onClick={cerrarModal} className="text-slate-400 hover:text-slate-600 p-1 rounded-lg">
                <X className="w-6 h-6" />
              </button>
            </div>

            <form onSubmit={handleCrearPrestamo} className="p-6 space-y-5">
              {/* 1. SELECCIONAR SOCIO */}
              <div className="space-y-1.5 relative">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block">1. Seleccionar Socio Lector *</label>
                {!socioSeleccionado ? (
                  <>
                    <div className="relative">
                      <Search className="w-5 h-5 absolute left-3 top-3 text-slate-400" />
                      <input
                        type="text"
                        placeholder="Buscar por Apellido, Nombre o DNI..."
                        value={filtroSocio}
                        onChange={(e) => setFiltroSocio(e.target.value)}
                        className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:border-indigo-500 text-sm"
                        autoFocus
                      />
                    </div>
                    {filtroSocio && (
                      <div className="absolute left-0 right-0 mt-1 bg-white border border-slate-200 rounded-lg shadow-lg max-h-48 overflow-y-auto z-10 divide-y divide-slate-100">
                        {sociosFiltradosModal.length === 0 ? (
                          <p className="p-3 text-xs text-slate-400 italic">No se encontraron socios activos.</p>
                        ) : (
                          sociosFiltradosModal.map(s => (
                            <button
                              key={s.id_socio}
                              type="button"
                              onClick={() => setSocioSeleccionado(s)}
                              className="w-full text-left p-3 hover:bg-indigo-50 text-sm flex items-center justify-between"
                            >
                              <div>
                                <span className="font-bold text-slate-700">{s.apellido}, {s.nombre}</span>
                                <span className="text-xs text-slate-400 block">DNI: {s.dni}</span>
                              </div>
                              <span className={`text-xs px-2 py-0.5 rounded font-bold ${s.estado_socio === 'Activo' ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}>
                                {s.estado_socio}
                              </span>
                            </button>
                          ))
                        )}
                      </div>
                    )}
                  </>
                ) : (
                  <div className="bg-indigo-50 border border-indigo-200 p-3 rounded-lg flex justify-between items-center">
                    <div className="flex items-center gap-2">
                      <User className="w-5 h-5 text-indigo-600" />
                      <div>
                        <p className="text-sm font-bold text-indigo-900">{socioSeleccionado.apellido}, {socioSeleccionado.nombre}</p>
                        <p className="text-xs text-indigo-600">DNI: {socioSeleccionado.dni} • Estado: {socioSeleccionado.estado_socio}</p>
                      </div>
                    </div>
                    <button type="button" onClick={() => setSocioSeleccionado(null)} className="text-indigo-400 hover:text-indigo-700 p-1">
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>

              {/* 2. SELECCIONAR LIBRO */}
              <div className="space-y-1.5 relative">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block">2. Seleccionar Libro Ejemplar *</label>
                {!libroSeleccionado ? (
                  <>
                    <div className="relative">
                      <Search className="w-5 h-5 absolute left-3 top-3 text-slate-400" />
                      <input
                        type="text"
                        placeholder="Buscar por Título o Autor..."
                        value={filtroLibro}
                        onChange={(e) => setFiltroLibro(e.target.value)}
                        className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:border-indigo-500 text-sm"
                      />
                    </div>
                    {filtroLibro && (
                      <div className="absolute left-0 right-0 mt-1 bg-white border border-slate-200 rounded-lg shadow-lg max-h-48 overflow-y-auto z-10 divide-y divide-slate-100">
                        {librosFiltradosModal.length === 0 ? (
                          <p className="p-3 text-xs text-slate-400 italic">No se encontraron libros con ese título.</p>
                        ) : (
                          librosFiltradosModal.map(l => (
                            <button
                              key={l.id_libro}
                              type="button"
                              onClick={() => setLibroSeleccionado(l)}
                              className="w-full text-left p-3 hover:bg-indigo-50 text-sm flex items-center justify-between"
                            >
                              <div>
                                <span className="font-bold text-slate-700 block">{l.titulo}</span>
                                <span className="text-xs text-slate-400">Autor: {l.autor || 'Sin autor asignado'}</span>
                              </div>
                              <span className={`text-xs font-bold px-2 py-0.5 rounded ${l.cant_disponible > 0 ? 'bg-amber-100 text-amber-700' : 'bg-rose-100 text-rose-700'}`}>
                                Disp: {l.cant_disponible}
                              </span>
                            </button>
                          ))
                        )}
                      </div>
                    )}
                  </>
                ) : (
                  <div className="bg-emerald-50 border border-emerald-200 p-3 rounded-lg flex justify-between items-center">
                    <div className="flex items-center gap-2">
                      <BookOpen className="w-5 h-5 text-emerald-600" />
                      <div>
                        <p className="text-sm font-bold text-emerald-900">{libroSeleccionado.titulo}</p>
                        <p className="text-xs text-emerald-600">Autor: {libroSeleccionado.autor || 'Sin autor asignado'} • Disponibles: {libroSeleccionado.cant_disponible}</p>
                      </div>
                    </div>
                    <button type="button" onClick={() => setLibroSeleccionado(null)} className="text-emerald-400 hover:text-emerald-700 p-1">
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>

              {/* 3. FECHA DE DEVOLUCIÓN */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block flex items-center gap-1">
                  <Calendar className="w-4 h-4 text-slate-400" /> 3. Fecha Límite de Devolución *
                </label>
                <input
                  type="date"
                  min={hoyStr}
                  value={fechaDevolEsp}
                  onChange={(e) => setFechaDevolEsp(e.target.value)}
                  required
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:border-indigo-500 text-sm"
                />
              </div>

              {/* BOTONES DE ACCIÓN */}
              <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={cerrarModal}
                  className="px-4 py-2.5 border border-slate-200 text-slate-600 rounded-lg hover:bg-slate-50 font-bold text-sm transition-all"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={procesandoAccion || !socioSeleccionado || !libroSeleccionado}
                  className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-bold text-sm shadow-md transition-all active:scale-95 disabled:opacity-50 disabled:pointer-events-none flex items-center gap-2"
                >
                  {procesandoAccion && <Loader2 className="w-4 h-4 animate-spin" />}
                  Concretar Préstamo
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}