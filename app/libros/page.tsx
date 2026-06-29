'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { 
  Plus, BookX, Loader2, X, BookOpen, User, Hash, 
  Folder, Layers, Search, Trash2, ChevronLeft, ChevronRight,
  ArrowUpDown, ChevronUp, ChevronDown, PlusCircle
} from 'lucide-react'

interface Libro {
  id_libro: number
  created_at?: string
  titulo: string
  autor: string | null
  isbn: string | null
  categoria: string | null
  cant_total: number
  cant_disponible: number
}

export default function LibrosPage() {
  const [libros, setLibros] = useState<Libro[]>([])
  const [cargando, setCargando] = useState(true)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [guardando, setGuardando] = useState(false)

  const [titulo, setTitulo] = useState('')
  const [autor, setAutor] = useState('')
  const [isbn, setIsbn] = useState('')
  const [categoria, setCategoria] = useState('')
  const [cantidadTotal, setCantidadTotal] = useState(1)

  const [busqueda, setBusqueda] = useState('')
  const [ordenarPor, setOrdenarPor] = useState<'titulo' | 'categoria'>('titulo')
  const [ordenDireccion, setOrdenDireccion] = useState<'asc' | 'desc'>('asc')
  const [paginaActual, setPaginaActual] = useState(1)
  const librosPorPagina = 10

  async function obtenerLibros() {
    setCargando(true)
    try {
      const { data, error } = await supabase.from('libros').select('*').order('id_libro', { ascending: false })
      if (!error && data) setLibros(data)
    } catch (err) {
      console.error(err)
    }
    setCargando(false)
  }

  useEffect(() => { obtenerLibros() }, [])

  async function manejarGuardarLibro(e: React.FormEvent) {
    e.preventDefault()
    if (!titulo.trim()) return alert('El título es obligatorio.')
    setGuardando(true)

    const nuevoLibro = {
      titulo: titulo.trim(),
      autor: autor.trim() || null,
      isbn: isbn.trim() || null,
      categoria: categoria.trim() || null,
      cant_total: Number(cantidadTotal),
      cant_disponible: Number(cantidadTotal),
    }

    const { error } = await supabase.from('libros').insert([nuevoLibro])
    if (error) {
      alert(`Error: ${error.message}`)
    } else {
      setTitulo(''); setAutor(''); setIsbn(''); setCategoria(''); setCantidadTotal(1); setIsModalOpen(false)
      obtenerLibros()
    }
    setGuardando(false)
  }

  async function manejarEliminarLibro(id: number, tituloLibro: string) {
    if (!window.confirm(`¿Seguro que querés eliminar "${tituloLibro}"?`)) return
    const { error } = await supabase.from('libros').delete().eq('id_libro', id)
    if (!error) obtenerLibros()
  }

  // NUEVA FUNCIÓN: Sumar 1 ejemplar al stock
  async function manejarSumarStock(libro: Libro) {
    if (!window.confirm(`¿Querés sumar 1 ejemplar al stock de "${libro.titulo}"?`)) return
    
    // Le sumamos 1 al stock total, y 1 a la cantidad disponible en estante
    const { error } = await supabase
      .from('libros')
      .update({
        cant_total: libro.cant_total + 1,
        cant_disponible: libro.cant_disponible + 1
      })
      .eq('id_libro', libro.id_libro)
      
    if (error) {
      alert(`Error al actualizar el stock: ${error.message}`)
    } else {
      obtenerLibros() // Refresca la tabla automáticamente
    }
  }

  const alternarOrden = (columna: 'titulo' | 'categoria') => {
    if (ordenarPor === columna) setOrdenDireccion(ordenDireccion === 'asc' ? 'desc' : 'asc')
    else { setOrdenarPor(columna); setOrdenDireccion('asc') }
    setPaginaActual(1)
  }

  // --- BUSCADOR VITAMINADO ---
  const librosFiltrados = libros.filter(libro => {
    const termino = busqueda.toLowerCase();
    return (
      libro.titulo.toLowerCase().includes(termino) ||
      (libro.autor && libro.autor.toLowerCase().includes(termino)) ||
      (libro.categoria && libro.categoria.toLowerCase().includes(termino)) ||
      (libro.isbn && libro.isbn.toLowerCase().includes(termino))
    );
  })

  const librosOrdenados = [...librosFiltrados].sort((a, b) => {
    const campoA = (ordenarPor === 'titulo' ? a.titulo : (a.categoria || 'zzz')).toLowerCase()
    const campoB = (ordenarPor === 'titulo' ? b.titulo : (b.categoria || 'zzz')).toLowerCase()
    if (campoA < campoB) return ordenDireccion === 'asc' ? -1 : 1
    if (campoA > campoB) return ordenDireccion === 'asc' ? 1 : -1
    return 0
  })

  const totalPaginas = Math.ceil(librosOrdenados.length / librosPorPagina)
  const indiceUltimoLibro = paginaActual * librosPorPagina
  const indicePrimerLibro = indiceUltimoLibro - librosPorPagina
  const librosPaginados = librosOrdenados.slice(indicePrimerLibro, indiceUltimoLibro)

  return (
    <div className="space-y-6 animate-in fade-in duration-500 text-slate-900 min-h-screen pb-12">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Catálogo de Libros</h1>
          <p className="text-sm text-slate-500 mt-0.5">Control de inventario, stock y clasificación.</p>
        </div>
        <button onClick={() => setIsModalOpen(true)} className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-2.5 px-5 rounded-lg transition-all shadow-sm active:scale-95">
          <Plus className="w-5 h-5" /> Nuevo Libro
        </button>
      </div>

      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col sm:flex-row gap-4 items-center justify-between">
        <div className="relative w-full sm:max-w-xl">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3.5" />
          <input 
            type="text" value={busqueda} onChange={(e) => { setBusqueda(e.target.value); setPaginaActual(1); }}
            placeholder="Buscar por Título, Autor, Categoría o ISBN..."
            className="w-full pl-9 pr-4 py-2.5 border border-slate-300 rounded-lg text-sm bg-slate-50 focus:bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-slate-900 outline-none transition-all placeholder:text-slate-400 font-medium"
          />
        </div>
        {librosFiltrados.length !== libros.length && (
          <span className="text-xs font-bold bg-slate-100 text-slate-600 px-3 py-1.5 rounded-full">
            Resultados: {librosFiltrados.length}
          </span>
        )}
      </div>

      {cargando ? (
        <div className="flex justify-center items-center h-48 bg-white rounded-xl border border-slate-200 shadow-sm">
          <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
        </div>
      ) : libros.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 border-dashed p-12 flex flex-col items-center justify-center text-center">
          <div className="bg-indigo-50 p-4 rounded-full mb-4"><BookX className="w-8 h-8 text-indigo-500" /></div>
          <h3 className="text-lg font-bold text-slate-900 mb-1">No hay libros registrados</h3>
        </div>
      ) : librosFiltrados.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-12 text-center text-slate-500 font-medium">
          Ningún libro coincide con la búsqueda "{busqueda}"
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-800 border-b border-slate-700 text-xs font-bold text-slate-200 uppercase tracking-wider select-none">
                  <th onClick={() => alternarOrden('titulo')} className="p-4 cursor-pointer hover:bg-slate-700 transition-colors">
                    <div className="flex items-center gap-1">Título / Autor {ordenarPor === 'titulo' ? (ordenDireccion === 'asc' ? <ChevronUp className="w-4 h-4 text-indigo-400" /> : <ChevronDown className="w-4 h-4 text-indigo-400" />) : <ArrowUpDown className="w-3.5 h-3.5 text-slate-400" />}</div>
                  </th>
                  <th onClick={() => alternarOrden('categoria')} className="p-4 cursor-pointer hover:bg-slate-700 transition-colors">
                    <div className="flex items-center gap-1">Categoría {ordenarPor === 'categoria' ? (ordenDireccion === 'asc' ? <ChevronUp className="w-4 h-4 text-indigo-400" /> : <ChevronDown className="w-4 h-4 text-indigo-400" />) : <ArrowUpDown className="w-3.5 h-3.5 text-slate-400" />}</div>
                  </th>
                  <th className="p-4">ISBN</th>
                  <th className="p-4 text-center">Stock</th>
                  <th className="p-4 text-center">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 text-sm">
                {librosPaginados.map((libro) => (
                  <tr key={libro.id_libro} className="hover:bg-slate-50 transition-colors odd:bg-white even:bg-slate-50/40">
                    <td className="p-4">
                      <div className="font-bold text-slate-900 text-base">{libro.titulo}</div>
                      <div className="text-xs text-slate-500 font-medium mt-0.5">{libro.autor || <span className="italic font-normal">Sin autor</span>}</div>
                    </td>
                    <td className="p-4 text-slate-700 font-semibold">
                      {libro.categoria ? <span className="bg-slate-100 px-2.5 py-1 rounded-md text-xs border border-slate-200">{libro.categoria}</span> : <span className="text-xs italic text-slate-400 font-normal">S/C</span>}
                    </td>
                    <td className="p-4 text-slate-600 font-mono text-xs font-semibold">{libro.isbn || <span className="font-sans italic text-slate-400 font-normal">Sin código</span>}</td>
                    <td className="p-4 text-center"><span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-indigo-50 text-indigo-700 border border-indigo-100">{libro.cant_disponible} / {libro.cant_total}</span></td>
                    <td className="p-4 text-center">
                      <div className="flex items-center justify-center gap-2">
                        {/* BOTÓN PARA SUMAR STOCK */}
                        <button 
                          onClick={() => manejarSumarStock(libro)} 
                          title="Aumentar cantidad de ejemplares"
                          className="text-emerald-500 hover:text-emerald-700 p-2 rounded-lg hover:bg-emerald-50 transition-colors"
                        >
                          <PlusCircle className="w-4 h-4" />
                        </button>
                        
                        {/* BOTÓN ORIGINAL PARA ELIMINAR */}
                        <button 
                          onClick={() => manejarEliminarLibro(libro.id_libro, libro.titulo)} 
                          title="Eliminar libro"
                          className="text-red-500 hover:text-red-700 p-2 rounded-lg hover:bg-red-50 transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {totalPaginas > 1 && (
            <div className="bg-slate-50 px-4 py-3.5 border-t border-slate-200 flex items-center justify-between select-none">
              <div className="text-xs font-bold text-slate-500">Mostrando {indicePrimerLibro + 1} al {Math.min(indiceUltimoLibro, librosOrdenados.length)} de {librosOrdenados.length}</div>
              <div className="flex items-center gap-1">
                <button disabled={paginaActual === 1} onClick={() => setPaginaActual(p => p - 1)} className="p-1.5 border border-slate-300 rounded-lg bg-white text-slate-600 hover:bg-slate-100 disabled:opacity-40"><ChevronLeft className="w-4 h-4" /></button>
                <div className="text-xs font-bold px-3 text-slate-700">Pág {paginaActual} de {totalPaginas}</div>
                <button disabled={paginaActual === totalPaginas} onClick={() => setPaginaActual(p => p + 1)} className="p-1.5 border border-slate-300 rounded-lg bg-white text-slate-600 hover:bg-slate-100 disabled:opacity-40"><ChevronRight className="w-4 h-4" /></button>
              </div>
            </div>
          )}
        </div>
      )}

      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-xl border border-slate-300 w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between bg-slate-100 p-4 border-b border-slate-300">
              <h2 className="text-lg font-black text-slate-900">Registrar Nuevo Libro</h2>
              <button type="button" onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-200"><X className="w-5 h-5" /></button>
            </div>
            <form onSubmit={manejarGuardarLibro} className="p-6 space-y-4">
              <div><label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Título *</label><div className="relative"><BookOpen className="w-4 h-4 text-slate-500 absolute left-3 top-3" /><input type="text" required placeholder="Ej: Martin Fierro" value={titulo} onChange={(e) => setTitulo(e.target.value)} className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-lg text-sm text-slate-900 font-semibold bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none placeholder:text-slate-400" /></div></div>
              <div><label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Autor (Opcional)</label><div className="relative"><User className="w-4 h-4 text-slate-500 absolute left-3 top-3" /><input type="text" placeholder="Ej: Jose Hernandez" value={autor} onChange={(e) => setAutor(e.target.value)} className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-lg text-sm text-slate-900 font-semibold bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none placeholder:text-slate-400" /></div></div>
              <div><label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">ISBN (Opcional)</label><div className="relative"><Hash className="w-4 h-4 text-slate-500 absolute left-3 top-3" /><input type="text" placeholder="Ej: 9785741236548" value={isbn} onChange={(e) => setIsbn(e.target.value)} className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-lg text-sm text-slate-900 font-semibold bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none placeholder:text-slate-400" /></div></div>
              <div><label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Categoría (Opcional)</label><div className="relative"><Folder className="w-4 h-4 text-slate-500 absolute left-3 top-3" /><input type="text" placeholder="Ej: Poesia" value={categoria} onChange={(e) => setCategoria(e.target.value)} className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-lg text-sm text-slate-900 font-semibold bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none placeholder:text-slate-400" /></div></div>
              <div><label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Cantidad de Ejemplares</label><div className="relative"><Layers className="w-4 h-4 text-slate-500 absolute left-3 top-3" /><input type="number" min="1" required value={cantidadTotal} onChange={(e) => setCantidadTotal(parseInt(e.target.value) || 1)} className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-lg text-sm text-slate-900 font-black bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none" /></div></div>
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200 mt-6">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 border border-slate-300 rounded-lg text-sm font-bold text-slate-700 hover:bg-slate-100 transition-colors">Cancelar</button>
                <button type="submit" disabled={guardando} className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white font-bold py-2 px-4 rounded-lg shadow-sm active:scale-95">{guardando ? <><Loader2 className="w-4 h-4 animate-spin" /> Guardando...</> : 'Guardar Libro'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}