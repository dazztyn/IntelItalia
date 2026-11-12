import type { FilaVistaPrevia } from '../../api/cargas'
import type { AlumnoListado, Curso } from '../../api/types'
import { useAlumnosDeCurso } from '../../hooks/consultas'
import { filasPorResolver, type EstadoArchivo } from './tipos'

interface Props {
  curso: Curso
  estado: EstadoArchivo
  deshabilitada: boolean
  alElegirArchivo: (archivo: File) => void
  alResolver: (fila: number, alumnoId: string | null) => void
}

const DESCARTAR = 'descartar'

function nombreAlumno({ nombres, apellidoPaterno, apellidoMaterno }: AlumnoListado): string {
  return [nombres, apellidoPaterno, apellidoMaterno].filter(Boolean).join(' ')
}

interface Apariencia {
  etiqueta: string
  barra: string
  insignia: string
  flecha: string
  detalle: string
}

function apariencia(estado: EstadoArchivo): Apariencia {
  switch (estado.tipo) {
    case 'pendiente':
      return {
        etiqueta: 'Pendiente',
        barra: 'border-t-amber-400',
        insignia: 'bg-amber-300 text-amber-950',
        flecha: 'text-amber-500',
        detalle: 'Sin archivo',
      }
    case 'verificando':
      return {
        etiqueta: 'Revisando…',
        barra: 'border-t-slate-300',
        insignia: 'bg-slate-200 text-slate-800',
        flecha: 'text-slate-400',
        detalle: estado.archivo.name,
      }
    case 'listo': {
      const porResolver = filasPorResolver(estado)
      const detalle = [
        `${estado.filas} filas`,
        porResolver > 0 && `${porResolver} por resolver`,
        estado.errores > 0 && `${estado.errores} con error (no se guardarán)`,
      ]
        .filter(Boolean)
        .join(' · ')
      return porResolver > 0
        ? {
            etiqueta: 'Por resolver',
            barra: 'border-t-amber-400',
            insignia: 'bg-amber-300 text-amber-950',
            flecha: 'text-amber-500',
            detalle,
          }
        : {
            etiqueta: 'Listo',
            barra: 'border-t-emerald-500',
            insignia: 'bg-emerald-700 text-white',
            flecha: 'text-emerald-600',
            detalle,
          }
    }
    case 'invalido':
      return {
        etiqueta: 'Revisar archivo',
        barra: 'border-t-red-500',
        insignia: 'bg-red-700 text-white',
        flecha: 'text-red-600',
        detalle: estado.mensaje,
      }
    case 'guardado': {
      const { estado: resultado, filasOk, filasTotales } = estado.resultado
      const detalle = `${filasOk} de ${filasTotales} filas guardadas`
      if (resultado === 'completada') {
        return { etiqueta: 'Guardado', barra: 'border-t-emerald-500', insignia: 'bg-emerald-700 text-white', flecha: 'text-emerald-600', detalle }
      }
      if (resultado === 'completadaConErrores') {
        return { etiqueta: 'Guardado con errores', barra: 'border-t-amber-400', insignia: 'bg-amber-300 text-amber-950', flecha: 'text-amber-500', detalle }
      }
      return { etiqueta: 'No se guardó', barra: 'border-t-red-500', insignia: 'bg-red-700 text-white', flecha: 'text-red-600', detalle }
    }
        case 'previo': {
      const fecha = new Date(estado.carga.finalizadaEn).toLocaleDateString('es-CL')
      return {
        etiqueta: 'Cargado',
        barra: 'border-t-emerald-500',
        insignia: 'bg-emerald-700 text-white',
        flecha: 'text-emerald-600',
        detalle: `${estado.carga.filasOk} de ${estado.carga.filasTotales} filas · ${fecha}`,
      }
    }
  }
}

interface PropsFilasDudosas {
  cursoId: string
  dudosas: FilaVistaPrevia[]
  ocupados: string[]
  resoluciones: Record<string, string | null>
  deshabilitada: boolean
  alResolver: Props['alResolver']
}

function FilasDudosas({ cursoId, dudosas, ocupados, resoluciones, deshabilitada, alResolver }: PropsFilasDudosas) {
  const hayNoEncontrados = dudosas.some((fila) => fila.estado === 'noEncontrado')
  const alumnos = useAlumnosDeCurso(hayNoEncontrados ? cursoId : null)
  const libres = (alumnos.data ?? [])
    .filter((alumno) => !ocupados.includes(alumno.id))
    .map((alumno) => ({ id: alumno.id, nombreCompleto: nombreAlumno(alumno) }))

  return (
    <ul className="space-y-2 rounded-md bg-amber-50 p-3 text-sm dark:bg-amber-400/10">
      {dudosas.map((fila) => {
        const clave = String(fila.fila)
        const valor = !(clave in resoluciones) ? '' : (resoluciones[clave] ?? DESCARTAR)
        const opciones = fila.estado === 'ambiguo' ? fila.candidatos : libres
        return (
          <li key={fila.fila} className="flex flex-col gap-1">
            <span className="font-medium">
              {fila.nombre}{' '}
              <span className="font-normal text-secundario">
                ({fila.estado === 'ambiguo' ? 'varios coinciden' : 'no está en el curso'})
              </span>
            </span>
            <select
              value={valor}
              disabled={deshabilitada}
              aria-label={`Alumno para la fila ${fila.fila}: ${fila.nombre}`}
              onChange={(evento) => {
                const elegido = evento.target.value
                if (elegido) alResolver(fila.fila, elegido === DESCARTAR ? null : elegido)
              }}
              className="rounded-md border border-tinta/20 bg-white px-2 py-1.5 dark:border-white/20 dark:bg-noche"
            >
              <option value="" disabled>
                Elegir alumno…
              </option>
              <option value={DESCARTAR}>Descartar esta fila</option>
              {opciones.map((opcion) => (
                <option key={opcion.id} value={opcion.id}>
                  {opcion.nombreCompleto}
                </option>
              ))}
            </select>
          </li>
        )
      })}
    </ul>
  )
}

export function TarjetaCurso({ curso, estado, deshabilitada, alElegirArchivo, alResolver }: Props) {
  const vista = apariencia(estado)
  const bloqueada = deshabilitada || estado.tipo === 'verificando'

  return (
    <div
      className={`flex flex-col gap-3 rounded-lg border border-t-4 border-tinta/10 bg-italia-blanco p-4 transition-colors dark:border-white/10 dark:bg-white/5 ${vista.barra}`}
    >
      <div className="flex items-start justify-between gap-2">
        <h3 className="font-semibold">{curso.nombre}</h3>
        <span className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-semibold ${vista.insignia}`}>
          {vista.etiqueta}
        </span>
      </div>

      <p className="min-h-10 text-sm text-secundario">{vista.detalle}</p>

      {estado.tipo === 'listo' && estado.dudosas.length > 0 && (
        <FilasDudosas
          cursoId={curso.id}
          dudosas={estado.dudosas}
          ocupados={estado.ocupados}
          resoluciones={estado.resoluciones}
          deshabilitada={deshabilitada}
          alResolver={alResolver}
        />
      )}

      <label
        className={`inline-flex items-center justify-center gap-2 self-end rounded-md border border-tinta/10 bg-white px-4 py-2 text-sm font-semibold text-tinta shadow-sm transition has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-italia-verde dark:bg-noche dark:text-italia-blanco ${
          bloqueada ? 'pointer-events-none opacity-50' : 'cursor-pointer hover:shadow-md'
        }`}
      >
        <svg viewBox="0 0 20 20" fill="currentColor" aria-hidden="true" className={`h-4 w-4 ${vista.flecha}`}>
          <path
            fillRule="evenodd"
            d="M10 3a1 1 0 0 1 .7.3l4 4a1 1 0 0 1-1.4 1.4L11 6.4V16a1 1 0 1 1-2 0V6.4L6.7 8.7a1 1 0 0 1-1.4-1.4l4-4A1 1 0 0 1 10 3Z"
            clipRule="evenodd"
          />
        </svg>
        {estado.tipo === 'pendiente' ? 'Subir' : 'Cambiar'}
        <input
          type="file"
          accept=".xlsx"
          className="sr-only"
          disabled={bloqueada}
          aria-label={`Archivo de ${curso.nombre}`}
          onChange={(evento) => {
            const archivo = evento.target.files?.[0]
            if (archivo) alElegirArchivo(archivo)
            // Permite volver a elegir el mismo archivo después de corregirlo.
            evento.target.value = ''
          }}
        />
      </label>
    </div>
  )
}