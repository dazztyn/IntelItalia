import { useSearchParams } from 'react-router'

export type Vista = 'alumnos' | 'dashboard'

export function useVista() {
  const [parametros, setParametros] = useSearchParams()
  const vista: Vista = parametros.get('vista') === 'dashboard' ? 'dashboard' : 'alumnos'

  function cambiarVista(nueva: Vista) {
    setParametros(
      (actuales) => {
        const siguientes = new URLSearchParams(actuales)
        if (nueva === 'alumnos') {
          siguientes.delete('vista')
        } else {
          siguientes.set('vista', nueva)
        }
        return siguientes
      },
      { replace: true },
    )
  }

  return { vista, cambiarVista }
}