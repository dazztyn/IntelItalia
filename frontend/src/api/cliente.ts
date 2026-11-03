export class ErrorApi extends Error {
  estado: number

  constructor(estado: number, mensaje: string) {
    super(mensaje)
    this.name = 'ErrorApi'
    this.estado = estado
  }
}
export async function pedir<T>(ruta: string, opciones: RequestInit = {}): Promise<T> {
  const esFormulario = opciones.body instanceof FormData

  const respuesta = await fetch(`/api${ruta}`, {
    ...opciones,
    credentials: 'include',
    headers: esFormulario
      ? opciones.headers
      : { 'Content-Type': 'application/json', ...opciones.headers },
  })

  if (!respuesta.ok) {
    throw new ErrorApi(respuesta.status, await leerMensajeError(respuesta))
  }
  if (respuesta.status === 204) return undefined as T
  return (await respuesta.json()) as T
}

async function leerMensajeError(respuesta: Response): Promise<string> {
  const cuerpo = (await respuesta.json().catch(() => null)) as {
    message?: string | string[]
  } | null
  const mensaje = cuerpo?.message

  if (Array.isArray(mensaje)) return mensaje.join('. ')
  if (mensaje) return mensaje
  return `Error ${respuesta.status}`
}