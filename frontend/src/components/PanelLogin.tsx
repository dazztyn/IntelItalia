import { useState } from 'react'
import logo from '../assets/INTELITALIA_LOGO_WH.png'
import { ErrorApi } from '../api/cliente'
import { useSesion } from '../hooks/useSession'
import { BotonGoogle } from './BotonLogin'

function mensajeDeError(error: unknown): string {
  if (error instanceof ErrorApi && error.estado === 403) {
    return 'Tu correo no está autorizado para ingresar. Pide acceso a la Dirección.'
  }
  if (error instanceof ErrorApi && error.estado === 401) {
    return 'No pudimos verificar tu cuenta de Google. Intenta de nuevo.'
  }
  return 'No pudimos conectar con el servidor. Intenta más tarde.'
}

export function PanelLogin() {
  const { iniciarSesion } = useSesion()
  const [error, setError] = useState<string | null>(null)
  const [enviando, setEnviando] = useState(false)

  async function alRecibirToken(idToken: string) {
    setError(null)
    setEnviando(true)
    try {
      await iniciarSesion(idToken)
    } catch (e) {
      setError(mensajeDeError(e))
    } finally {
      setEnviando(false)
    }
  }

  return (
    <div className="flex flex-col items-center justify-center gap-6 bg-linear-to-br from-[#008C45] to-green-900 p-4 text-center text-white">
      <p className="text-5xl font-light">Bienvenid@ a</p>
      <img src={logo} alt="IntelItalia" className="w-97 max-w-full" />
      <BotonGoogle
        onToken={alRecibirToken}
        onError={() => setError('Google no pudo completar el inicio de sesión.')}
      />
      {enviando && <p className="text-sm text-green-100">Verificando…</p>}
      {error && (
        <p role="alert" className="max-w-xs rounded-md bg-white/15 px-3 py-2 text-sm">
          {error}
        </p>
      )}
    </div>
  )
}