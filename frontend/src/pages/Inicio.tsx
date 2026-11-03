import { useSesion } from '../hooks/useSession'

export function Inicio() {
  const { usuario, cerrarSesion } = useSesion()

  return (
    <main className="mx-auto max-w-3xl p-8">
      <h1 className="text-2xl font-semibold">Hola, {usuario?.nombre}</h1>
      <p className="mt-1 text-slate-600 dark:text-slate-400">
        {usuario?.correo} · rol {usuario?.rol}
      </p>
      <button
        type="button"
        onClick={() => void cerrarSesion()}
        className="mt-6 rounded-md bg-[#CD212A] px-4 py-2 font-semibold text-white hover:bg-red-500"
      >
        Cerrar sesión
      </button>
    </main>
  )
}