import { ALUMNOS_EJEMPLO } from '../../datos/ejemplo'
import { formatoNota, formatoPorcentaje } from '../../utils/format'
import { SEMAFOROS } from '../../utils/semaforo'
import { EncabezadoSeccion } from './EncabezadoSeccion'

const COLUMNAS = [
  { texto: 'Alumno', numero: false },
  { texto: 'Curso', numero: false },
  { texto: 'Asistencia', numero: true },
  { texto: 'Lenguaje', numero: true },
  { texto: 'Matemática', numero: true },
  { texto: 'Estado', numero: false },
]

export function TablaAlumnos() {
  return (
    <div className="mx-auto max-w-4xl">
      <EncabezadoSeccion
        titulo="Listado de alumnos"
        subtitulo="Resumen por alumno del semestre en curso"
      />

      <div className="overflow-x-auto rounded-xl border border-tinta/10 bg-white shadow-sm dark:border-white/10 dark:bg-white/5">
        <table className="w-full text-left text-sm">
          <thead className="bg-linear-to-br from-italia-verde to-green-900 text-white">
            <tr>
              {COLUMNAS.map((columna) => (
                <th
                  key={columna.texto}
                  scope="col"
                  className={`px-4 py-3 font-semibold ${columna.numero ? 'text-right' : ''}`}
                >
                  {columna.texto}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-tinta/10 dark:divide-white/10">
            {ALUMNOS_EJEMPLO.map((alumno) => {
              const estado = SEMAFOROS[alumno.semaforo]
              return (
                <tr key={alumno.id} className="transition-colors hover:bg-italia-verde/5">
                  <td className="px-4 py-3 font-medium">{alumno.nombre}</td>
                  <td className="px-4 py-3 text-tinta/70 dark:text-italia-blanco/70">
                    {alumno.curso}
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums">
                    {formatoPorcentaje(alumno.asistencia)}
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums">
                    {formatoNota(alumno.lenguaje)}
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums">
                    {formatoNota(alumno.matematica)}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold ${estado.insignia}`}
                    >
                      {estado.etiqueta}
                    </span>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}