import iconoClaro from '../assets/ICONO_LIGHT.png'
import iconoOscuro from '../assets/ICONO_DARK.png'
import { useTema } from '../hooks/useTema'

export function BotonTema() {
  const { oscuro, alternar } = useTema()

  return (
    <button
      type="button"
      onClick={alternar}
      className="fixed bottom-16 right-4 z-50 inline-flex items-center gap-2 rounded-full border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-lg hover:border-green-600 hover:bg-green-200 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 dark:hover:border-green-400 dark:hover:bg-slate-600"
    >
      <img src={oscuro ? iconoOscuro : iconoClaro} alt="" className="h-5 w-5" />
      Cambiar Modo
    </button>
  )
}