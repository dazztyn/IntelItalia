import { DashboardDesempeno } from '../components/vista-general/Dashboard'
import { TablaAlumnos } from '../components/vista-general/TablaAlumnos'
import { useVista } from '../hooks/useVista'

const TRANSICION = '[grid-area:1/1] transition-transform duration-500 ease-in-out motion-reduce:transition-none'

export function VistaGeneral() {
  const { vista } = useVista()
  const enDashboard = vista === 'dashboard'

  return (
    <div className="grid overflow-x-hidden">
      <section
        aria-label="Listado de alumnos"
        inert={enDashboard}
        className={`${TRANSICION} ${enDashboard ? '-translate-x-full' : 'translate-x-0'}`}
      >
        <TablaAlumnos />
      </section>

      <section
        aria-label="Dashboard de desempeño"
        inert={!enDashboard}
        className={`${TRANSICION} ${enDashboard ? 'translate-x-0' : 'translate-x-full'}`}
      >
        <DashboardDesempeno />
      </section>
    </div>
  )
}