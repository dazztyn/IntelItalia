import { Navigate } from 'react-router'
import { ToggleTema } from '.././components/BotonTema'
import LogoGoogle from '.././assets/GOOGLEICON.svg'
import LogoIntalia from '.././assets/PLACEHOLDER_LOGO.png'
import { iniciarConGoogle } from '../auth/GoogleLogin'
import { useSesion } from '../hooks/useSession'

export function Login() {
  const { usuario, iniciarSesion } = useSesion()

  if (usuario) {
    return <Navigate to="/cursos" replace />
  }
return (
    // Gradiente con los colores de Italia. En oscuro se apagan para no deslumbrar.
    <div className="relative grid min-h-svh place-items-center bg-linear-to-br from-[#009246] via-white to-[#ce2b37] p-4 dark:from-green-900 dark:via-neutral-900 dark:to-red-900">
      <div className="absolute right-4 top-4">
        <ToggleTema />
      </div>

      <div className="w-full max-w-sm rounded-xl border border-slate-200 bg-white p-8 text-center shadow-2xl dark:border-slate-700 dark:bg-slate-900">
        {/* Colocar el archivo en frontend/public/logo_placeholder.png (720 x 240). */}
         <img
          src={LogoIntalia}
          width={240}
          height={80}
          alt="IntelItalia"
          className="mx-auto mb-4 block aspect-[3/1] h-auto w-60 max-w-full"
        />
        <p className="mb-6 text-sm text-slate-500 dark:text-slate-400">
          Seguimiento estudiantil · Escuela Básica República de Italia
        </p>

        <button
          type="button"
          onClick={iniciarConGoogle}
          className="inline-flex w-full items-center justify-center gap-2.5 rounded-md border border-slate-300 bg-white px-4 py-2.5 font-semibold text-slate-800 hover:border-blue-600 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 dark:hover:border-blue-400"
        >
          <span className="h-[18px] w-[18px]">
            <img
          src={LogoGoogle}
          width={240}
          height={80}
          alt="IntelItalia"
          className="mx-auto mb-4 block aspect-[3/1] h-auto w-60 max-w-full"
        />
          </span>
          Ingresar con Google
        </button>

        {/* Solo en desarrollo: permite recorrer la app mientras no existe el login real. */}
        {import.meta.env.DEV && (
          <button
            type="button"
            onClick={iniciarSesion}
            className="mt-5 text-xs text-slate-500 underline dark:text-slate-400"
          >
            Entrar como usuario de prueba (solo desarrollo)
          </button>
        )}
      </div>
    </div>
  )
}
