'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { 
  Plus, UserX, Loader2, X, User, Shield, 
  Phone, MapPin, Search, Trash2, ChevronLeft, ChevronRight,
  ArrowUpDown, ChevronUp, ChevronDown, CheckCircle2, AlertCircle, Edit2, AlertTriangle
} from 'lucide-react'

// Tipados
interface Socio {
  id_socio: number
  created_at?: string
  nombre: string
  apellido: string
  dni: number | string
  celular: string | null
  direccion: string | null
  estado_socio: string
}

// Interfaz para el sistema de Toasts
interface Toast {
  id: number
  mensaje: string
  tipo: 'success' | 'error' | 'warning'
}

export default function SociosPage() {
  const [socios, setSocios] = useState<Socio[]>([])
  const [cargando, setCargando] = useState(true)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [guardando, setGuardando] = useState(false)
  const [socioEnEdicion, setSocioEnEdicion] = useState<Socio | null>(null)

  // Estado para las Alertas Flotantes (Toasts)
  const [toasts, setToasts] = useState<Toast[]>([])

  // Estados del Formulario
  const [nombre, setNombre] = useState('')
  const [apellido, setApellido] = useState('')
  const [dni, setDni] = useState('')
  const [celular, setCelular] = useState('')
  const [direccion, setDireccion] = useState('')
  const [estado, setEstado] = useState('Activo')

  // Estados de Filtros, Orden y Paginación
  const [busqueda, setBusqueda] = useState('')
  const [ordenarPor, setOrdenarPor] = useState<'apellido' | 'dni'>('apellido')
  const [ordenDireccion, setOrdenDireccion] = useState<'asc' | 'desc'>('asc')
  const [paginaActual, setPaginaActual] = useState(1)
  const sociosPorPagina = 10

  // Función para lanzar notificaciones flotantes (con z-100 para sobreponer al modal)
  function lanzarToast(mensaje: string, tipo: 'success' | 'error' | 'warning') {
    const id = Date.now()
    setToasts(prev => [...prev, { id, mensaje, tipo }])
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id))
    }, 4000)
  }

  async function obtenerSocios() {
    setCargando(true)
    try {
      const { data, error } = await supabase
        .from('socios')
        .select('*')
        .order('id_socio', { ascending: false })
      
      if (!error && data) {
        setSocios(data)
      } else if (error) {
        console.error("Error de Supabase:", error.message)
        lanzarToast("No se pudo cargar el padrón de socios.", "error")
      }
    } catch (err) {
      console.error("Error de conexión:", err)
      lanzarToast("Error de conexión con el servidor.", "error")
    }
    setCargando(false)
  }

  useEffect(() => {
    obtenerSocios()
  }, [])

  const abrirModalNuevo = () => {
    setSocioEnEdicion(null)
    setNombre('')
    setApellido('')
    setDni('')
    setCelular('')
    setDireccion('')
    setEstado('Activo')
    setIsModalOpen(true)
  }

  const abrirModalEditar = (socio: Socio) => {
    setSocioEnEdicion(socio)
    setNombre(socio.nombre)
    setApellido(socio.apellido)
    setDni(socio.dni.toString())
    setCelular(socio.celular || '')
    setDireccion(socio.direccion || '')
    setEstado(socio.estado_socio)
    setIsModalOpen(true)
  }

  async function manejarGuardarSocio(e: React.FormEvent) {
    e.preventDefault()
    
    // Validaciones con Toasts en lugar de alerts
    if (!nombre.trim()) return lanzarToast('El nombre es obligatorio.', 'warning')
    if (!apellido.trim()) return lanzarToast('El apellido es obligatorio.', 'warning')
    if (!dni.trim()) return lanzarToast('El DNI es obligatorio.', 'warning')

    setGuardando(true)

    const datosSocio = {
      nombre: nombre.trim(),
      apellido: apellido.trim(),
      dni: parseInt(dni.trim(), 10),
      celular: celular.trim() || null,
      direccion: direccion.trim() || null,
      estado_socio: estado
    }

    if (socioEnEdicion) {
      // MODO EDICIÓN
      const { error } = await supabase
        .from('socios')
        .update(datosSocio)
        .eq('id_socio', socioEnEdicion.id_socio)

      if (error) {
        if (error.code === '23505') {
          lanzarToast('¡Error! Ya existe otro socio registrado con este número de DNI.', 'error')
        } else {
          lanzarToast(`Error al actualizar: ${error.message}`, 'error')
        }
      } else {
        lanzarToast('Socio actualizado exitosamente.', 'success')
        setIsModalOpen(false)
        obtenerSocios()
      }
    } else {
      // MODO NUEVO REGISTRO
      const { error } = await supabase
        .from('socios')
        .insert([datosSocio])

      if (error) {
        if (error.code === '23505') {
          lanzarToast('¡Atención! Este número de DNI ya se encuentra registrado en el sistema.', 'error')
        } else {
          lanzarToast(`Error al guardar: ${error.message}`, 'error')
        }
      } else {
        lanzarToast('Socio registrado con éxito.', 'success')
        setIsModalOpen(false)
        obtenerSocios()
      }
    }
    setGuardando(false)
  }

  async function alternarEstadoSocio(id: number, estadoActual: string) {
    const nuevoEstado = estadoActual === 'Activo' ? 'Inactivo' : 'Activo'
    
    const { error } = await supabase
      .from('socios')
      .update({ estado_socio: nuevoEstado })
      .eq('id_socio', id)

    if (error) {
      lanzarToast("Error al cambiar estado: " + error.message, 'error')
    } else {
      lanzarToast(`Estado actualizado a ${nuevoEstado}.`, 'success')
      obtenerSocios()
    }
  }

  async function manejarEliminarSocio(id: number, nombreSocio: string, apellidoSocio: string) {
    const confirmar = window.confirm(`¿Estás seguro de que querés eliminar al socio "${nombreSocio} ${apellidoSocio}" del sistema? Esta acción no se puede deshacer.`)
    if (!confirmar) return

    try {
      const { error } = await supabase
        .from('socios')
        .delete()
        .eq('id_socio', id)

      if (error) {
        lanzarToast(`No se pudo eliminar: ${error.message}`, 'error')
      } else {
        lanzarToast("Socio eliminado correctamente.", 'success')
        obtenerSocios()
      }
    } catch (err) {
      console.error(err)
      lanzarToast("Error de conexión al intentar eliminar.", 'error')
    }
  }

  const alternarOrden = (columna: 'apellido' | 'dni') => {
    if (ordenarPor === columna) {
      setOrdenDireccion(ordenDireccion === 'asc' ? 'desc' : 'asc')
    } else {
      setOrdenarPor(columna)
      setOrdenDireccion('asc')
    }
    setPaginaActual(1)
  }

  const sociosFiltrados = socios.filter(socio => {
    const termino = busqueda.toLowerCase()
    const dniTexto = socio.dni ? socio.dni.toString() : ''
    return (
      socio.nombre.toLowerCase().includes(termino) ||
      socio.apellido.toLowerCase().includes(termino) ||
      dniTexto.includes(termino) ||
      (socio.celular && socio.celular.toLowerCase().includes(termino)) ||
      (socio.direccion && socio.direccion.toLowerCase().includes(termino))
    )
  })

  const sociosOrdenados = [...sociosFiltrados].sort((a, b) => {
    let campoA = (ordenarPor === 'apellido' ? a.apellido : a.dni.toString()).toLowerCase()
    let campoB = (ordenarPor === 'apellido' ? b.apellido : b.dni.toString()).toLowerCase()

    if (campoA < campoB) return ordenDireccion === 'asc' ? -1 : 1
    if (campoA > campoB) return ordenDireccion === 'asc' ? 1 : -1
    return 0
  })

  const totalPaginas = Math.ceil(sociosOrdenados.length / sociosPorPagina)
  const indiceUltimoSocio = paginaActual * sociosPorPagina
  const indicePrimerSocio = indiceUltimoSocio - sociosPorPagina
  const sociosPaginados = sociosOrdenados.slice(indicePrimerSocio, indiceUltimoSocio)

  return (
    <div className="space-y-6 animate-in fade-in duration-500 text-slate-900 min-h-screen pb-12 relative">
      
      {/* SISTEMA DE TOASTS SUPER-Z-INDEX */}
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

      {/* HEADER DE SECCIÓN */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Control de Socios</h1>
          <p className="text-sm text-slate-500 mt-0.5">Administración del padrón de lectores y datos de contacto de la biblioteca.</p>
        </div>
        <button 
          onClick={abrirModalNuevo}
          className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-2.5 px-5 rounded-lg transition-all shadow-sm active:scale-95"
        >
          <Plus className="w-5 h-5" />
          Nuevo Socio
        </button>
      </div>

      {/* BARRA DE HERRAMIENTAS */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col sm:flex-row gap-4 items-center justify-between">
        <div className="relative w-full sm:max-w-xl">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3.5" />
          <input 
            type="text"
            value={busqueda}
            onChange={(e) => { setBusqueda(e.target.value); setPaginaActual(1); }}
            placeholder="Buscar por Nombre, Apellido, DNI, Celular o Dirección..."
            className="w-full pl-9 pr-4 py-2.5 border border-slate-300 rounded-lg text-sm bg-slate-50 focus:bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-slate-900 outline-none transition-all placeholder:text-slate-400 font-medium"
          />
        </div>
        {sociosFiltrados.length !== socios.length && (
          <span className="text-xs font-bold bg-slate-100 text-slate-600 px-3 py-1.5 rounded-full">
            Resultados: {sociosFiltrados.length}
          </span>
        )}
      </div>

      {/* CONTENEDOR PRINCIPAL O TABLA */}
      {cargando ? (
        <div className="flex justify-center items-center h-48 bg-white rounded-xl border border-slate-200 shadow-sm">
          <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
        </div>
      ) : socios.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 border-dashed p-12 flex flex-col items-center justify-center text-center">
          <div className="bg-indigo-50 p-4 rounded-full mb-4">
            <UserX className="w-8 h-8 text-indigo-500" />
          </div>
          <h3 className="text-lg font-bold text-slate-900 mb-1">Padrón vacío</h3>
          <p className="text-slate-500 max-w-sm mb-6">Aún no hay socios registrados en el sistema municipal.</p>
        </div>
      ) : sociosFiltrados.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-12 text-center text-slate-500 font-medium">
          Ningún socio coincide con la búsqueda "{busqueda}"
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-800 border-b border-slate-700 text-xs font-bold text-slate-200 uppercase tracking-wider select-none">
                  <th 
                    onClick={() => alternarOrden('apellido')}
                    className="p-4 cursor-pointer hover:bg-slate-700 transition-colors"
                  >
                    <div className="flex items-center gap-1">
                      Apellido y Nombre
                      {ordenarPor === 'apellido' ? (
                        ordenDireccion === 'asc' ? <ChevronUp className="w-4 h-4 text-indigo-400" /> : <ChevronDown className="w-4 h-4 text-indigo-400" />
                      ) : <ArrowUpDown className="w-3.5 h-3.5 text-slate-400" />}
                    </div>
                  </th>
                  <th 
                    onClick={() => alternarOrden('dni')}
                    className="p-4 cursor-pointer hover:bg-slate-700 transition-colors"
                  >
                    <div className="flex items-center gap-1">
                      DNI
                      {ordenarPor === 'dni' ? (
                        ordenDireccion === 'asc' ? <ChevronUp className="w-4 h-4 text-indigo-400" /> : <ChevronDown className="w-4 h-4 text-indigo-400" />
                      ) : <ArrowUpDown className="w-3.5 h-3.5 text-slate-400" />}
                    </div>
                  </th>
                  <th className="p-4">Celular</th>
                  <th className="p-4">Dirección</th>
                  <th className="p-4 text-center">Estado (Clic p/ cambiar)</th>
                  <th className="p-4 text-center">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 text-sm">
                {sociosPaginados.map((socio) => (
                  <tr key={socio.id_socio} className="hover:bg-slate-50 transition-colors odd:bg-white even:bg-slate-50/40">
                    <td className="p-4 font-bold text-slate-900 text-base">
                      {socio.apellido}, {socio.nombre}
                    </td>
                    <td className="p-4 text-slate-700 font-mono font-semibold">
                      {socio.dni}
                    </td>
                    <td className="p-4 text-slate-600 font-medium">
                      {socio.celular || <span className="italic text-slate-400 font-normal">No registrado</span>}
                    </td>
                    <td className="p-4 text-slate-600 max-w-xs truncate font-medium">
                      {socio.direccion || <span className="italic text-slate-400 font-normal">Sin dirección</span>}
                    </td>
                    <td className="p-4 text-center">
                      <button 
                        onClick={() => alternarEstadoSocio(socio.id_socio, socio.estado_socio)}
                        title="Hacé clic para cambiar estado"
                        className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold transition-all active:scale-95 ${
                          socio.estado_socio === 'Activo' 
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100' 
                            : 'bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100'
                        }`}
                      >
                        {socio.estado_socio === 'Activo' ? <CheckCircle2 className="w-3.5 h-3.5" /> : <AlertCircle className="w-3.5 h-3.5" />}
                        {socio.estado_socio}
                      </button>
                    </td>
                    <td className="p-4 text-center space-x-1">
                      <button
                        onClick={() => abrirModalEditar(socio)}
                        className="text-blue-500 hover:text-blue-700 p-2 rounded-lg hover:bg-blue-50 transition-colors inline-flex active:scale-90"
                        title="Editar socio"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => manejarEliminarSocio(socio.id_socio, socio.nombre, socio.apellido)}
                        className="text-red-500 hover:text-red-700 p-2 rounded-lg hover:bg-red-50 transition-colors inline-flex active:scale-90"
                        title="Eliminar socio"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {totalPaginas > 1 && (
            <div className="bg-slate-50 px-4 py-3.5 border-t border-slate-200 flex items-center justify-between select-none">
              <div className="text-xs font-bold text-slate-500">
                Mostrando socios {indicePrimerSocio + 1} al {Math.min(indiceUltimoSocio, sociosOrdenados.length)} de un total de {sociosOrdenados.length}
              </div>
              <div className="flex items-center gap-1">
                <button
                  disabled={paginaActual === 1}
                  onClick={() => setPaginaActual(p => p - 1)}
                  className="p-1.5 border border-slate-300 rounded-lg bg-white text-slate-600 hover:bg-slate-100 disabled:opacity-40 transition-colors"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <div className="text-xs font-bold px-3 text-slate-700">
                  Página {paginaActual} de {totalPaginas}
                </div>
                <button
                  disabled={paginaActual === totalPaginas}
                  onClick={() => setPaginaActual(p => p + 1)}
                  className="p-1.5 border border-slate-300 rounded-lg bg-white text-slate-600 hover:bg-slate-100 disabled:opacity-40 transition-colors"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* MODAL MULTIPROPÓSITO */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
          <div className="bg-white rounded-xl shadow-xl border border-slate-300 w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between bg-slate-100 p-4 border-b border-slate-300">
              <h2 className="text-lg font-black text-slate-900">
                {socioEnEdicion ? 'Modificar Datos del Socio' : 'Registrar Nuevo Socio'}
              </h2>
              <button 
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-200 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={manejarGuardarSocio} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Nombre *</label>
                  <div className="relative">
                    <User className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
                    <input 
                      type="text" 
                      required
                      value={nombre}
                      onChange={(e) => setNombre(e.target.value)}
                      placeholder="Ej: Juan" 
                      className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-lg text-sm text-slate-900 font-semibold bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all placeholder:text-slate-400"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Apellido *</label>
                  <div className="relative">
                    <input 
                      type="text" 
                      required
                      value={apellido}
                      onChange={(e) => setApellido(e.target.value)}
                      placeholder="Ej: Pérez" 
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm text-slate-900 font-semibold bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all placeholder:text-slate-400"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">DNI *</label>
                <div className="relative">
                  <Shield className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
                  <input 
                    type="text" 
                    required
                    value={dni}
                    onChange={(e) => setDni(e.target.value)}
                    placeholder="Ej: 35123456" 
                    className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-lg text-sm text-slate-900 font-semibold bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all placeholder:text-slate-400"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Celular (Opcional)</label>
                <div className="relative">
                  <Phone className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
                  <input 
                    type="text" 
                    value={celular}
                    onChange={(e) => setCelular(e.target.value)}
                    placeholder="Ej: 3458412345" 
                    className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-lg text-sm text-slate-900 font-semibold bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all placeholder:text-slate-400"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Dirección (Opcional)</label>
                <div className="relative">
                  <MapPin className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
                  <input 
                    type="text" 
                    value={direccion}
                    onChange={(e) => setDireccion(e.target.value)}
                    placeholder="Ej: Calle Belgrano 450" 
                    className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-lg text-sm text-slate-900 font-semibold bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all placeholder:text-slate-400"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Estado</label>
                <select
                  value={estado}
                  onChange={(e) => setEstado(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm text-slate-900 font-bold bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all"
                >
                  <option value="Activo">Activo</option>
                  <option value="Inactivo">Inactivo</option>
                </select>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200 mt-6">
                <button 
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 border border-slate-300 rounded-lg text-sm font-bold text-slate-700 hover:bg-slate-100 transition-colors"
                >
                  Cancelar
                </button>
                <button 
                  type="submit"
                  disabled={guardando}
                  className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white font-bold py-2 px-4 rounded-lg shadow-sm active:scale-95"
                >
                  {guardando ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" /> Procesando...
                    </>
                  ) : (
                    socioEnEdicion ? 'Guardar Cambios' : 'Guardar Socio'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}