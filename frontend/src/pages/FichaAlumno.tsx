import { useNavigate, useParams } from 'react-router'
import { ErrorApi } from '../api/cliente'
import { useFicha } from '../hooks/consultas'
import { formatoPorcentaje, formatoRut } from '../utils/format'

function mensajeDeError(error: unknown): string {
  if (error instanceof ErrorApi && error.estado === 403) return 'Este alumno no está en tus cursos.'
  if (error instanceof ErrorApi && error.estado === 404) return 'El alumno no existe.'
  return 'No pudimos cargar la ficha. Intenta de nuevo.'
}

export function FichaAlumno() {
  const { id = '' } = useParams()
  const navegar = useNavigate()
  const ficha = useFicha(id)

  const volver = (
    <button
      type="button"
      onClick={() => navegar(-1)}
      className="mb-4 text-sm font-medium text-italia-verde hover:underline dark:text-emerald-400"
    >
      ← Volver
    </button>
  )

  if (ficha.isPending) {
    return <p className="text-center text-tinta/60 dark:text-italia-blanco/60">Cargando ficha…</p>
  }
  if (ficha.isError) {
    return (
      <div className="mx-auto max-w-4xl">
        {volver}
        <p role="alert">{mensajeDeError(ficha.error)}</p>
      </div>
    )
  }

  const alumno = ficha.data
  const matriculaActual = alumno.matriculas[0]

  return (
    <div className="mx-auto max-w-4xl">
      {volver}
      <h1 className="text-2xl font-semibold">
        {alumno.nombres} {alumno.apellidoPaterno} {alumno.apellidoMaterno ?? ''}
      </h1>
      <p className="mt-1 text-sm text-tinta/60 dark:text-italia-blanco/60">
        {matriculaActual?.curso.nombre ?? 'Sin curso'} · {matriculaActual?.anio}
        {alumno.rut && ` · RUT ${formatoRut(alumno.rut)}`}
      </p>

      <h2 className="mt-8 font-semibold">Evaluaciones externas</h2>
      {alumno.evaluaciones.length === 0 ? (
        <p className="mt-2 text-sm text-tinta/60 dark:text-italia-blanco/60">
          Todavía no hay resultados cargados.
        </p>
      ) : (
        <ul className="mt-2 space-y-1 text-sm">
          {alumno.evaluaciones.map((evaluacion) => {
            const logro = evaluacion.resultados.porcentajeLogro
            return (
              <li key={`${evaluacion.tipo}-${evaluacion.anio}-${evaluacion.momento}-${evaluacion.area}`}>
                {evaluacion.tipo} {evaluacion.anio} · {evaluacion.momento} · {evaluacion.area}:{' '}
                <strong>{typeof logro === 'number' ? formatoPorcentaje(logro) : '—'}</strong>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}