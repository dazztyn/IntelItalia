import { useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { confirmarCarga, previsualizarCarga, type EstadoFila } from '../api/cargas'
import { ErrorApi } from '../api/cliente'
import type { Curso } from '../api/types'
import { ModalResultadoCarga } from '../components/carga/modalResultadoCarga'
import { PestanasCarga } from '../components/carga/pestanasCarga'
import { TarjetaCurso } from '../components/carga/tarjetasCurso'
import type { EstadoArchivo, ResumenCurso } from '../components/carga/tipos'
import { NOMBRE_AREA, TIPOS_CARGA } from '../datos/tiposCarga'
import { useCursos } from '../hooks/consultas'

const PENDIENTE: EstadoArchivo = { tipo: 'pendiente' }
const TAMANO_MAXIMO = 5 * 1024 * 1024 // el mismo límite que el backend
const NECESITAN_REVISION: EstadoFila[] = ['ambiguo', 'noEncontrado', 'error']

function mensajeDeError(error: unknown, porDefecto: string): string {
  // El backend responde en español ("No existe el curso…", "Solo se aceptan archivos .xlsx").
  return error instanceof ErrorApi ? error.message : porDefecto
}

export function CargaEvaluaciones() {
  const clienteConsultas = useQueryClient()
  const cursos = useCursos()
  const [tipoId, setTipoId] = useState(TIPOS_CARGA[0].id)
  const [momento, setMomento] = useState('diagnostico')
  const [archivos, setArchivos] = useState<Record<string, Record<string, EstadoArchivo>>>({})
  const [guardando, setGuardando] = useState(false)
  const [resumen, setResumen] = useState<ResumenCurso[] | null>(null)

  const tipo = TIPOS_CARGA.find((t) => t.id === tipoId) ?? TIPOS_CARGA[0]
  const clave = `${tipo.id}-${momento}`
  const cursosDelTipo = (cursos.data ?? []).filter((curso) => tipo.niveles.includes(curso.nivel))
  const estadoDe = (cursoId: string) => archivos[clave]?.[cursoId] ?? PENDIENTE

  function fijar(claveTab: string, cursoId: string, estado: EstadoArchivo) {
    setArchivos((previos) => ({
      ...previos,
      [claveTab]: { ...previos[claveTab], [cursoId]: estado },
    }))
  }

  async function elegirArchivo(curso: Curso, archivo: File) {
    if (!tipo.fuente) return
    const claveTab = clave

    if (!/\.xlsx$/i.test(archivo.name)) {
      fijar(claveTab, curso.id, { tipo: 'invalido', archivo, mensaje: 'Solo se aceptan archivos .xlsx' })
      return
    }
    if (archivo.size > TAMANO_MAXIMO) {
      fijar(claveTab, curso.id, { tipo: 'invalido', archivo, mensaje: 'El archivo supera los 5 MB' })
      return
    }

    fijar(claveTab, curso.id, { tipo: 'verificando', archivo })

    let siguiente: EstadoArchivo
    try {
      const vista = await previsualizarCarga(archivo, tipo.fuente, momento)
      if (vista.curso.id !== curso.id) {
        siguiente = { tipo: 'invalido', archivo, mensaje: `Este archivo es de ${vista.curso.nombre}` }
      } else if (tipo.area && vista.area !== tipo.area) {
        siguiente = {
          tipo: 'invalido',
          archivo,
          mensaje: `Este archivo es de ${NOMBRE_AREA[vista.area]}, no de ${NOMBRE_AREA[tipo.area]}`,
        }
      } else {
        siguiente = {
          tipo: 'listo',
          archivo,
          filas: vista.filas.length,
          porRevisar: vista.filas.filter((fila) => NECESITAN_REVISION.includes(fila.estado)).length,
        }
      }
    } catch (error) {
      siguiente = { tipo: 'invalido', archivo, mensaje: mensajeDeError(error, 'No pudimos revisar el archivo') }
    }

    // Si mientras tanto se eligió otro archivo para este curso, esta respuesta llegó tarde.
    setArchivos((previos) => {
      const actual = previos[claveTab]?.[curso.id]
      if (!actual || !('archivo' in actual) || actual.archivo !== archivo) return previos
      return { ...previos, [claveTab]: { ...previos[claveTab], [curso.id]: siguiente } }
    })
  }

  const listos = cursosDelTipo.filter((curso) => estadoDe(curso.id).tipo === 'listo')
  const todosConArchivo = cursosDelTipo.every((curso) =>
    ['listo', 'guardado'].includes(estadoDe(curso.id).tipo),
  )
  const puedeGuardar =
    tipo.fuente !== null && cursosDelTipo.length > 0 && todosConArchivo && listos.length > 0 && !guardando

  async function guardar() {
    if (!tipo.fuente) return
    const claveTab = clave
    setGuardando(true)
    const resultados: ResumenCurso[] = []

    // Uno por uno: el informe sale en orden y el servidor no recibe todo de golpe.
    for (const curso of listos) {
      const estado = estadoDe(curso.id)
      if (estado.tipo !== 'listo') continue
      try {
        const resultado = await confirmarCarga(estado.archivo, tipo.fuente, momento)
        fijar(claveTab, curso.id, { tipo: 'guardado', resultado })
        resultados.push({ curso: curso.nombre, resultado })
      } catch (error) {
        const mensaje = mensajeDeError(error, 'No se pudo guardar el archivo')
        fijar(claveTab, curso.id, { tipo: 'invalido', archivo: estado.archivo, mensaje })
        resultados.push({ curso: curso.nombre, error: mensaje })
      }
    }

    setGuardando(false)
    // Las fichas en memoria no se refrescan solas: así muestran los resultados nuevos.
    await clienteConsultas.invalidateQueries({ queryKey: ['alumnos'] })
    setResumen(resultados)
  }

  function contenidoPanel() {
    if (!tipo.fuente) {
      return (
        <div className="flex h-full min-h-72 flex-col items-center justify-center text-center text-tinta/60 dark:text-italia-blanco/60">
          <p className="text-lg font-semibold">{tipo.etiqueta}: próximamente</p>
          <p className="mt-1 max-w-sm text-sm">
            Esta carga se habilita cuando el sistema reciba el formato real del archivo.
          </p>
        </div>
      )
    }
    if (cursos.isPending) return <p className="text-sm text-tinta/60">Cargando cursos…</p>
    if (cursos.isError) return <p className="text-sm text-tinta/60">No pudimos cargar los cursos.</p>
    if (cursosDelTipo.length === 0) {
      return <p className="text-sm text-tinta/60">No hay cursos de los niveles en que se aplica esta evaluación.</p>
    }

    return (
      <>
        <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold">{tipo.etiqueta}</h2>
            <p className="text-sm text-tinta/60 dark:text-italia-blanco/60">{tipo.descripcion}</p>
          </div>
          {tipo.momentos && (
            <label className="flex flex-col gap-1 text-sm font-medium">
              Momento
              <select
                value={momento}
                onChange={(evento) => setMomento(evento.target.value)}
                disabled={guardando}
                className="rounded-md border border-tinta/20 bg-white px-3 py-2 dark:border-white/20 dark:bg-noche"
              >
                {tipo.momentos.map((opcion) => (
                  <option key={opcion.valor} value={opcion.valor}>
                    {opcion.etiqueta}
                  </option>
                ))}
              </select>
            </label>
          )}
        </div>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {cursosDelTipo.map((curso) => (
            <TarjetaCurso
              key={curso.id}
              curso={curso}
              estado={estadoDe(curso.id)}
              deshabilitada={guardando}
              alElegirArchivo={(archivo) => void elegirArchivo(curso, archivo)}
            />
          ))}
        </div>
      </>
    )
  }

  const conArchivo = cursosDelTipo.filter((curso) =>
    ['listo', 'guardado'].includes(estadoDe(curso.id).tipo),
  ).length

  return (
    <div className="mx-auto max-w-5xl">
      <h1 className="text-2xl font-semibold">Carga de evaluaciones y asistencia</h1>
      <p className="text-sm text-tinta/60 dark:text-italia-blanco/60">
        Elige el tipo de carga y sube un archivo por curso.
      </p>

      <div className="mt-4 rounded-2xl bg-linear-to-br from-italia-verde to-green-900 p-4 shadow-lg md:p-6">
        <div className="flex flex-col md:flex-row">
          <PestanasCarga tipos={TIPOS_CARGA} activo={tipo.id} alElegir={setTipoId} />

          <section
            id="panel-carga"
            role="tabpanel"
            className="min-h-80 flex-1 rounded-xl bg-white p-5 text-tinta md:p-6 dark:bg-noche dark:text-italia-blanco"
          >
            {contenidoPanel()}
          </section>
        </div>

        <div className="mt-4 flex flex-wrap items-center justify-end gap-4">
          {tipo.fuente && cursosDelTipo.length > 0 && (
            <p className="text-sm text-white/80">
              {conArchivo} de {cursosDelTipo.length} cursos con archivo
            </p>
          )}
          <button
            type="button"
            onClick={() => void guardar()}
            disabled={!puedeGuardar}
            className={`rounded-md px-6 py-2.5 font-semibold transition-colors ${
              puedeGuardar
                ? 'bg-white text-italia-verde hover:bg-italia-blanco'
                : 'cursor-not-allowed bg-white/25 text-white/60'
            }`}
          >
            {guardando ? 'Guardando…' : 'Guardar'}
          </button>
        </div>
      </div>

      <ModalResultadoCarga resumen={resumen} alCerrar={() => setResumen(null)} />
    </div>
  )
}