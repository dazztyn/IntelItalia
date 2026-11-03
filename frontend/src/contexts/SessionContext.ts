import { createContext } from 'react'
import type { Permiso, Usuario } from '../api/types'

export interface ValorSesion {
  usuario: Usuario | null
  cargando: boolean
  iniciarSesion: (idToken: string) => Promise<void>
  cerrarSesion: () => Promise<void>
  tienePermiso: (permiso: Permiso) => boolean
}

export const SesionContexto = createContext<ValorSesion | null>(null)