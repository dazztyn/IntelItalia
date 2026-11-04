import { useSearchParams } from 'react-router'

export type Vista = 'alumnos' | 'dashboard'

export function useVista() {
  const [parametros, setParametros] = useSearchParams()
  const vista: Vista = parametros.get('vista') === 'dashboard' ? 'dashboard' : 'alumnos'

  function cambiarVista(nueva: Vista) {
    setParametros(nueva === 'alumnos' ? {} : { vista: nueva }, { replace: true })
  }

  return { vista, cambiarVista }
}