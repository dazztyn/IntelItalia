import { pedir } from './cliente'
import type { Usuario } from './types'

export function loginConGoogle(idToken: string) {
  return pedir<Usuario>('/autenticacion/google', {
    method: 'POST',
    body: JSON.stringify({ idToken }),
  })
}

export function obtenerPerfil() {
  return pedir<Usuario>('/autenticacion/perfil')
}

export function salir() {
  return pedir<void>('/autenticacion/salir', { method: 'POST' })
}