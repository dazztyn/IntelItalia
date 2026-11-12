import { RESUMEN_EJEMPLO as resumen } from '../../datos/ejemplo'
import { formatoNota, formatoPorcentaje } from '../../utils/format'
import { ORDEN_SEMAFORO, SEMAFOROS } from '../../utils/semaforo'
import { EncabezadoSeccion } from './EncabezadoSeccion'

interface PropsTarjeta {
  titulo: string
  valor: string
  detalle: string
}

function Tarjeta({ titulo, valor, detalle }: PropsTarjeta) {
  return (
    <div className="rounded-xl bg-linear-to-br from-verde-fondo to-green-900 p-5 text-white shadow-sm">
      <p className="text-sm text-white/90">{titulo}</p>
      <p className="mt-1 text-3xl font-semibold tabular-nums">{valor}</p>
      <p className="mt-1 text-xs text-white/90">{detalle}</p>
    </div>
  )
}

export function DashboardDesempeno() {
  const conAlerta = resumen.totalAlumnos - resumen.semaforo.verde

  return (
    <div className="mx-auto max-w-4xl">
      <EncabezadoSeccion
        titulo="Dashboard de desempeño"
        subtitulo="Indicadores de la escuela en el semestre en curso"
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Tarjeta
          titulo="Promedio general"
          valor={formatoNota(resumen.promedioGeneral)}
          detalle="Escala de 1,0 a 7,0"
        />
        <Tarjeta
          titulo="Asistencia promedio"
          valor={formatoPorcentaje(resumen.asistenciaPromedio)}
          detalle="Semestre en curso"
        />
        <Tarjeta
          titulo="Alumnos con alertas"
          valor={String(conAlerta)}
          detalle={`de ${resumen.totalAlumnos} alumnos`}
        />
        <Tarjeta
          titulo="Lenguaje · Matemática"
          valor={`${formatoNota(resumen.promedioLenguaje)} · ${formatoNota(resumen.promedioMatematica)}`}
          detalle="Promedio por área"
        />
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <section className="rounded-xl border border-tinta/10 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-white/5">
          <h2 className="font-semibold">Distribución del semáforo</h2>
          <ul className="mt-4 space-y-3">
            {ORDEN_SEMAFORO.map((color) => {
              const cantidad = resumen.semaforo[color]
              const porcentaje = (cantidad / resumen.totalAlumnos) * 100
              return (
                <li key={color}>
                  <div className="flex justify-between text-sm">
                    <span>{SEMAFOROS[color].etiqueta}</span>
                    <span className="tabular-nums text-secundario">
                      {cantidad}
                    </span>
                  </div>
                  <div className="mt-1 h-2 rounded-full bg-tinta/10 dark:bg-white/10">
                    <div
                      className={`h-full rounded-full ${SEMAFOROS[color].barra}`}
                      style={{ width: `${porcentaje}%` }}
                    />
                  </div>
                </li>
              )
            })}
          </ul>
        </section>

        <section className="flex min-h-48 flex-col items-center justify-center rounded-xl border-2 border-dashed border-tinta/20 p-5 text-center text-secundario dark:border-white/20 dark:text-italia-blanco/60">
          <p className="font-semibold">Evolución por semestre</p>
          <p className="mt-1 text-sm">Próximamente: promedios y asistencia en el tiempo.</p>
        </section>
      </div>
    </div>
  )
}