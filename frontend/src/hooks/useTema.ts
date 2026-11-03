import { useSyncExternalStore } from 'react'

const CLAVE_TEMA = 'tema'

function suscribir(aviso: () => void) {
  const observador = new MutationObserver(aviso)
  observador.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ['class'],
  })
  return () => observador.disconnect()
}

function esOscuro(): boolean {
  return document.documentElement.classList.contains('dark')
}
function guardarTema(oscuro: boolean): boolean {
  try {
    localStorage.setItem(CLAVE_TEMA, oscuro ? 'oscuro' : 'claro')
    return true
  } catch {
    return false
  }
}

export function useTema() {
  const oscuro = useSyncExternalStore(suscribir, esOscuro, () => false)

  function alternar() {
    const siguiente = !esOscuro()
    document.documentElement.classList.toggle('dark', siguiente)
    guardarTema(siguiente)
  }

  return { oscuro, alternar }
}