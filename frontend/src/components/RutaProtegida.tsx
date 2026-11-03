import { Navigate, Outlet, useLocation } from 'react-router'
import type { Permiso } from '../api/types'
import { useSesion } from '../hooks/useSession'

interface Props {
  permiso?: Permiso
}

export function RutaProtegida({ permiso }: Props) {
  const { usuario, cargando, tienePermiso } = useSesion()
  const location = useLocation()

  if (cargando) {
    return (
      <div className="flex min-h-svh items-center justify-center text-slate-500">
        Cargando…
      </div>
    )
  }
  if (!usuario) {
    return <Navigate to="/ingresar" replace state={{ desde: location.pathname }} />
  }
  if (permiso && !tienePermiso(permiso)) {
    return <Navigate to="/" replace />
  }
  return <Outlet />
}