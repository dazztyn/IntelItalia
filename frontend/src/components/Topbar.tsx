import { useState } from 'react'
import { useLocation } from 'react-router'
import { useVista, type Vista } from '../hooks/useVista'
import { Logo } from './Logo'
import { ModalCerrarSesion } from './ModalCerrarSesion'
import { Sidebar } from './Sidebar'

const PESTANAS: { vista: Vista; texto: string }[] = [
  { vista: 'alumnos', texto: 'Listado de alumnos' },
  { vista: 'dashboard', texto: 'Dashboard de desempeño' },
]

export function Topbar() {
  const [menuAbierto, setMenuAbierto] = useState(false)
  const [confirmandoSalida, setConfirmandoSalida] = useState(false)
  const { pathname } = useLocation()
  const { vista, cambiarVista } = useVista()

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center gap-4 border-b border-tinta bg-italia-blanco px-4 dark:border-emerald-800 dark:bg-noche">
      <Sidebar abierto={menuAbierto} alCerrar={() => setMenuAbierto(false)} />
      <div className="relative z-30 flex items-center gap-3">
        <button
          type="button"
          onClick={() => setMenuAbierto((abierto) => !abierto)}
          aria-label={menuAbierto ? 'Cerrar menú' : 'Abrir menú'}
          aria-expanded={menuAbierto}
          aria-controls="menu-lateral"
          className={`flex h-10 w-10 flex-col items-center justify-center gap-1.5 rounded-md transition-colors ${
            menuAbierto
              ? 'text-white hover:bg-white/10'
              : 'text-tinta hover:bg-tinta/5 dark:text-italia-blanco dark:hover:bg-white/10'
          }`}
        >
          <span
            className={`h-0.5 w-6 rounded bg-current transition-transform duration-300 ${
              menuAbierto ? 'translate-y-2 rotate-45' : ''
            }`}
          />
          <span
            className={`h-0.5 w-6 rounded bg-current transition-opacity duration-300 ${
              menuAbierto ? 'opacity-0' : ''
            }`}
          />
          <span
            className={`h-0.5 w-6 rounded bg-current transition-transform duration-300 ${
              menuAbierto ? '-translate-y-2 -rotate-45' : ''
            }`}
          />
        </button>

        <Logo className={menuAbierto ? 'bg-white' : 'bg-tinta dark:bg-italia-blanco'} />
      </div>

      <nav aria-label="Secciones de la vista general" className="flex flex-1 justify-center gap-2">
        {pathname === '/' &&
          PESTANAS.map((pestana) => {
            const activa = vista === pestana.vista
            return (
              <button
                key={pestana.vista}
                type="button"
                onClick={() => cambiarVista(pestana.vista)}
                aria-pressed={activa}
                className={`relative whitespace-nowrap px-3 py-2 text-sm font-medium transition-colors after:absolute after:inset-x-3 after:-bottom-0.5 after:h-0.5 after:rounded after:bg-italia-verde after:transition-transform after:duration-300 ${
                  activa
                    ? 'text-italia-verde after:scale-x-100 dark:text-emerald-400'
                    : 'text-tinta/70 after:scale-x-0 hover:text-tinta dark:text-italia-blanco/70 dark:hover:text-italia-blanco'
                }`}
              >
                {pestana.texto}
              </button>
            )
          })}
      </nav>

      <button
        type="button"
        onClick={() => setConfirmandoSalida(true)}
        className="rounded-md px-3 py-2 text-sm font-semibold text-italia-rojo transition-colors hover:bg-italia-rojo/10 dark:text-red-400 dark:hover:bg-red-400/10"
      >
        Cerrar sesión
      </button>
      <ModalCerrarSesion abierto={confirmandoSalida} alCerrar={() => setConfirmandoSalida(false)} />
    </header>
  )
}