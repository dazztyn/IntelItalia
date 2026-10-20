import { useMemo, useState, type ReactNode } from 'react'
import type { Usuario } from '.././api/types'
import { SesionContexto, type ValorSesion } from '.././contexts/SessionContext'

// Usuario simulado 
const usuarioSimulado: Usuario = {
  correo: 'docente@ejemplo.cl',
  nombre: 'Docente de prueba',
  rol: 'docente',
  permisos: ['alumnos.ver', 'alertas.ver'],
}

export function SessionProvider({ children }: { children: ReactNode }) {
  const [usuario, setUsuario] = useState<Usuario | null>(null)

  const valor = useMemo<ValorSesion>(
    () => ({
      usuario,
      iniciarSesion: () => setUsuario(usuarioSimulado),
      cerrarSesion: () => setUsuario(null),
      tienePermiso: (permiso) => usuario?.permisos.includes(permiso) ?? false,
    }),
    [usuario],
  )

  return <SesionContexto value={valor}>{children}</SesionContexto>
}
