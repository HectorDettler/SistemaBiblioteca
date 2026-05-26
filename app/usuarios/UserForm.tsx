'use client'

import { useState, useRef } from 'react'
import { crearUsuario } from './actions'
import { UserPlus, Mail, Lock, User, Shield, AlertCircle, CheckCircle2, Loader2 } from 'lucide-react'

export default function UserForm() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  
  // Usamos una referencia al formulario para poder limpiarlo después de un alta exitosa
  const formRef = useRef<HTMLFormElement>(null)

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    setSuccess(false)

    const formData = new FormData(e.currentTarget)
    
    // Llamamos directamente a nuestra Server Action
    const resultado = await crearUsuario(formData)

    setLoading(false)

    if (!resultado.success) {
      setError(resultado.error || 'Ocurrió un error inesperado.')
    } else {
      setSuccess(true)
      // Si todo salió bien, reseteamos los campos del formulario
      formRef.current?.reset()
    }
  }

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-xl max-w-xl mx-auto">
      <div className="flex items-center gap-3 mb-6 border-b border-slate-800 pb-4">
        <div className="bg-amber-500/10 p-2 rounded-lg text-amber-400">
          <UserPlus className="w-5 h-5" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-white">Registrar Personal</h2>
          <p className="text-xs text-slate-400">Crea cuentas de acceso para bibliotecarios o administradores.</p>
        </div>
      </div>

      {/* Mensaje de Error */}
      {error && (
        <div className="mb-4 flex items-start gap-2 bg-red-500/10 border border-red-500/20 text-red-400 p-3 rounded-lg text-sm animate-in fade-in-50">
          <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      {/* Mensaje de Éxito */}
      {success && (
        <div className="mb-4 flex items-start gap-2 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 p-3 rounded-lg text-sm animate-in fade-in-50">
          <CheckCircle2 className="w-5 h-5 flex-shrink-0 mt-0.5" />
          <span>¡Usuario creado con éxito! Ya puede iniciar sesión con sus credenciales.</span>
        </div>
      )}

      <form ref={formRef} onSubmit={handleSubmit} className="space-y-4">
        
        {/* Campo: Nombre Completo */}
        <div>
          <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">Nombre Completo</label>
          <div className="relative">
            <User className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
            <input
              type="text"
              name="nombre"
              required
              placeholder="Ej. María Juárez"
              className="w-full bg-slate-950 border border-slate-800 rounded-lg py-2 pl-10 pr-4 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500 transition-colors"
            />
          </div>
        </div>

        {/* Campo: Email */}
        <div>
          <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">Correo Electrónico</label>
          <div className="relative">
            <Mail className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
            <input
              type="email"
              name="email"
              required
              placeholder="ejemplo@municipio.gob.ar"
              className="w-full bg-slate-950 border border-slate-800 rounded-lg py-2 pl-10 pr-4 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500 transition-colors"
            />
          </div>
        </div>

        {/* Campo: Contraseña */}
        <div>
          <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">Contraseña Inicial</label>
          <div className="relative">
            <Lock className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
            <input
              type="password"
              name="password"
              required
              minLength={6}
              placeholder="Mínimo 6 caracteres"
              className="w-full bg-slate-950 border border-slate-800 rounded-lg py-2 pl-10 pr-4 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500 transition-colors"
            />
          </div>
        </div>

        {/* Campo: Selección de Rol */}
        <div>
          <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">Rol asignado</label>
          <div className="relative">
            <Shield className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
            <select
              name="rol"
              required
              defaultValue="bibliotecario"
              className="w-full bg-slate-950 border border-slate-800 rounded-lg py-2 pl-10 pr-4 text-sm text-white focus:outline-none focus:border-indigo-500 transition-colors cursor-pointer appearance-none"
            >
              <option value="bibliotecario" className="bg-slate-900">Bibliotecario (Acceso limitado)</option>
              <option value="admin" className="bg-slate-900">Administrador (Acceso total)</option>
            </select>
          </div>
        </div>

        {/* Botón de Envío */}
        <button
          type="submit"
          disabled={loading}
          className="w-full bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-800 disabled:text-slate-500 text-white font-bold text-sm py-2.5 px-4 rounded-lg shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer mt-2 disabled:cursor-not-allowed"
        >
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Creando cuenta...
            </>
          ) : (
            'Crear Usuario'
          )}
        </button>

      </form>
    </div>
  )
}