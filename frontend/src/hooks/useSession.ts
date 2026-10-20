import { use } from 'react'
import { SesionContexto, type ValorSesion } from '../contexts/SessionContext'

export function useSesion(): ValorSesion {
  const sesion = use(SesionContexto)
  if (!sesion) {
    throw new Error('useSession se usa dentro de <SessionProvider>.')
  }
  return sesion
}
