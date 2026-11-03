import { Navigate, useLocation } from 'react-router'
import { Footer } from '../components/Footer'
import { PanelFoto } from '../components/PanelFoto'
import { PanelLogin } from '../components/PanelLogin'
import { useSesion } from '../hooks/useSession'

export function Login() {
  const { usuario, cargando } = useSesion()
  const location = useLocation()
  const destino = (location.state as { desde?: string } | null)?.desde ?? '/'

  if (cargando) return null
  if (usuario) return <Navigate to={destino} replace />

  return (
    <div className="flex min-h-svh flex-col">
      <div className="grid flex-1 grid-cols-3">
        <PanelLogin />
        <div className="relative col-span-2">
          <PanelFoto />
        </div>
      </div>
      <Footer />
    </div>
  )
}