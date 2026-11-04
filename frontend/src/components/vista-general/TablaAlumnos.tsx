import type { ReactNode } from 'react'
import { Link, useSearchParams } from 'react-router'
import type { AlumnoListado } from '../../api/types'
import { useAlumnosDeCurso, useCursos } from '../../hooks/consultas'
import { useSesion } from '../../hooks/useSession'
import { formatoRut } from '../../utils/format'

function Aviso({ children }: { children: ReactNode }) {
  return (
    <p className="px-4 py-10 text-center text-sm text-tinta/60 dark:text-italia-blanco/60">
      {children}
    </p>
  )
}

function nombreCompleto(alumno: AlumnoListado): string {
  const apellidos = [alumno.apellidoPaterno, alumno.apellidoMaterno].filter(Boolean).join(' ')
  return `${apellidos}, ${alumno.nombres}`
}

function identificacion(alumno: AlumnoListado): string {
  if (alumno.rut) return formatoRut(alumno.rut)
  if (alumno.ipe) return `IPE ${alumno.ipe}`
  return '—'
}

export function TablaAlumnos() {
  const { usuario } = useSesion()
  const [parametros, setParametros] = useSearchParams()
  const cursos = useCursos()
  const cursoId = parametros.get('curso') ?? cursos.data?.[0]?.id ?? null
  const alumnos = useAlumnosDeCurso(cursoId)

  function elegirCurso(id: string) {
    setParametros(
      (actuales) => {
        const siguientes = new URLSearchParams(actuales)
        siguientes.set('curso', id)
        return siguientes
      },
      { replace: true },
    )
  }

  function contenido() {
    if (cursos.isPending) return <Aviso>Cargando cursos…</Aviso>
    if (cursos.isError) return <Aviso>No pudimos cargar los cursos. Intenta recargar la página.</Aviso>
    if (cursos.data.length === 0) {
      return (
        <Aviso>
          {usuario?.alcance === 'cursosAsignados'
            ? 'Todavía no tienes cursos asignados. Pide a la Dirección que te los asigne.'
            : 'No hay cursos creados para este año.'}
        </Aviso>
      )
    }
    if (alumnos.isPending) return <Aviso>Cargando alumnos…</Aviso>
    if (alumnos.isError) return <Aviso>No pudimos cargar los alumnos de este curso.</Aviso>
    if (alumnos.data.length === 0) return <Aviso>Este curso no tiene alumnos matriculados.</Aviso>

    return (
      <table className="w-full text-left text-sm">
        <thead className="bg-linear-to-br from-italia-verde to-green-900 text-white">
          <tr>
            <th scope="col" className="w-14 px-4 py-3 text-right font-semibold">N°</th>
            <th scope="col" className="px-4 py-3 font-semibold">Alumno</th>
            <th scope="col" className="px-4 py-3 font-semibold">RUT / IPE</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-tinta/10 dark:divide-white/10">
          {alumnos.data.map((alumno, indice) => (
            <tr key={alumno.id} className="transition-colors hover:bg-italia-verde/5">
              <td className="px-4 py-3 text-right tabular-nums text-tinta/60 dark:text-italia-blanco/60">
                {indice + 1}
              </td>
              <td className="px-4 py-3">
                <Link
                  to={`/alumnos/${alumno.id}`}
                  className="font-medium text-italia-verde hover:underline dark:text-emerald-400"
                >
                  {nombreCompleto(alumno)}
                </Link>
              </td>
              <td className="px-4 py-3 tabular-nums text-tinta/70 dark:text-italia-blanco/70">
                {identificacion(alumno)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    )
  }

  return (
    <div className="mx-auto max-w-4xl">
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Listado de alumnos</h1>
          <p className="text-sm text-tinta/60 dark:text-italia-blanco/60">
            Alumnos con matrícula activa en el curso
          </p>
        </div>

        <label className="flex flex-col gap-1 text-sm font-medium">
          Curso
          <select
            value={cursoId ?? ''}
            onChange={(evento) => elegirCurso(evento.target.value)}
            disabled={!cursos.data?.length}
            className="min-w-44 rounded-md border border-tinta/20 bg-white px-3 py-2 dark:border-white/20 dark:bg-noche"
          >
            {cursos.data?.map((curso) => (
              <option key={curso.id} value={curso.id}>
                {curso.nombre}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="overflow-x-auto rounded-xl border border-tinta/10 bg-white shadow-sm dark:border-white/10 dark:bg-white/5">
        {contenido()}
      </div>
    </div>
  )
}