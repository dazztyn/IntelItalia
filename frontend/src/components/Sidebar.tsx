import { NavLink } from 'react-router'
import type { Permiso } from '../api/types'
import { useSesion } from '../hooks/useSession'
import { useTeclaEscape } from '../hooks/useEscape'
import { CapaDifusa } from './CapaDifusa'

interface OpcionMenu {
  texto: string
  ruta: string | null
  permisos?: Permiso[]
}

const OPCIONES: OpcionMenu[] = [
  { texto: 'Vista general', ruta: '/' },
  // ⏳ Confirmar con el equipo qué permiso corresponde a la carga de cursos.
  { texto: 'Carga de cursos', ruta: null, permisos: ['cargas.notas'] },
  { texto: 'Carga de evaluaciones y asistencia', ruta: '/cargas', permisos: ['cargas.evaluaciones'] },
  { texto: 'Vista de alertas', ruta: null, permisos: ['alertas.ver'] },
  { texto: 'Administrar usuarios', ruta: null, permisos: ['usuarios.gestionar'] },
]

interface Props {
  abierto: boolean
  alCerrar: () => void
}

export function Sidebar({ abierto, alCerrar }: Props) {
  const { tienePermiso } = useSesion()
  useTeclaEscape(abierto, alCerrar)

  const visibles = OPCIONES.filter(
    (opcion) => !opcion.permisos || opcion.permisos.some((permiso) => tienePermiso(permiso)),
  )

  return (
    <>
      <CapaDifusa visible={abierto} alClic={alCerrar} className="z-10" />

      <aside
        id="menu-lateral"
        aria-label="Menú principal"
        inert={!abierto}
        className={`fixed inset-y-0 left-0 z-20 flex w-72 max-w-[85vw] flex-col bg-linear-to-br from-italia-verde to-green-900 pt-20 text-white shadow-2xl transition-transform duration-300 ease-out motion-reduce:transition-none ${
          abierto ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <nav>
          <ul className="flex flex-col gap-1 px-3">
            {visibles.map((opcion) => (
              <li key={opcion.texto}>
                {opcion.ruta ? (
                  <NavLink
                    to={opcion.ruta}
                    end
                    onClick={alCerrar}
                    className={({ isActive }) =>
                      `block rounded-md px-3 py-2.5 font-medium transition-colors ${
                        isActive ? 'bg-white/20' : 'hover:bg-white/10'
                      }`
                    }
                  >
                    {opcion.texto}
                  </NavLink>
                ) : (
                  <span className="flex items-center justify-between gap-2 rounded-md px-3 py-2.5 text-white/60">
                    {opcion.texto}
                    <span className="shrink-0 rounded-full bg-white/15 px-2 py-0.5 text-xs">
                      Pronto
                    </span>
                  </span>
                )}
              </li>
            ))}
          </ul>
        </nav>
      </aside>
    </>
  )
}