import { useEffect } from 'react'

export function useTeclaEscape(activo: boolean, alPresionar: () => void) {
  useEffect(() => {
    if (!activo) return

    function manejar(evento: KeyboardEvent) {
      if (evento.key === 'Escape') alPresionar()
    }

    window.addEventListener('keydown', manejar)
    return () => window.removeEventListener('keydown', manejar)
  }, [activo, alPresionar])
}