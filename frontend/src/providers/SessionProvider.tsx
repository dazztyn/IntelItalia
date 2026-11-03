import { useEffect, useMemo, useState, type ReactNode } from 'react'
import * as api from '../api/autenticacion'
import type { Usuario } from '../api/types'
import { SesionContexto, type ValorSesion } from '../contexts/SessionContext'

export function SessionProvider({ children }: { children: ReactNode }) {
  const [usuario, setUsuario] = useState<Usuario | null>(null)
  const [cargando, setCargando] = useState(true)

  useEffect(() => {
    let vigente = true
    api
      .obtenerPerfil()
      .then((perfil) => {
        if (vigente) setUsuario(perfil)
      })
      .catch(() => {
        if (vigente) setUsuario(null)
      })
      .finally(() => {
        if (vigente) setCargando(false)
      })
    return () => {
      vigente = false
    }
  }, [])

  const valor = useMemo<ValorSesion>(
    () => ({
      usuario,
      cargando,
      iniciarSesion: async (idToken) => {
        setUsuario(await api.iniciarSesionGoogle(idToken))
      },
      cerrarSesion: async () => {
        try {
          await api.cerrarSesion()
        } finally {
          setUsuario(null)
        }
      },
      tienePermiso: (permiso) => usuario?.permisos.includes(permiso) ?? false,
    }),
    [usuario, cargando],
  )

  return <SesionContexto value={valor}>{children}</SesionContexto>
}