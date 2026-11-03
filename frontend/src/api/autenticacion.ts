import { pedir } from './cliente'
import type { Usuario } from './types'

export function iniciarSesionGoogle(idToken: string): Promise<Usuario> {
  return pedir<Usuario>('/autenticacion/google', {
    method: 'POST',
    body: JSON.stringify({ idToken }),
  })
}

export function obtenerPerfil(): Promise<Usuario> {
  return pedir<Usuario>('/autenticacion/perfil')
}

export function cerrarSesion(): Promise<void> {
  return pedir<void>('/autenticacion/salir', { method: 'POST' })
}