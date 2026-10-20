import { createContext } from 'react'
import type { Usuario } from '.././api/types'

export interface ValorSesion {
  usuario: Usuario | null
  iniciarSesion: () => void
  cerrarSesion: () => void
  tienePermiso: (permiso: string) => boolean
}

export const SesionContexto = createContext<ValorSesion | null>(null)