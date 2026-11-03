export class ErrorApi extends Error {
  estado: number

  constructor(estado: number, mensaje: string) {
    super(mensaje)
    this.name = 'ErrorApi'
    this.estado = estado
  }
}

export async function pedir<T>(ruta: string, opciones: RequestInit = {}): Promise<T> {
  const respuesta = await fetch(`/api${ruta}`, {
    ...opciones,
    credentials: 'include',
    headers: { 'Content-Type': 'application/json', ...opciones.headers },
  })

  if (!respuesta.ok) {
    throw new ErrorApi(respuesta.status, await leerMensajeError(respuesta))
  }
  if (respuesta.status === 204) return undefined as T
  return (await respuesta.json()) as T
}

async function leerMensajeError(respuesta: Response): Promise<string> {
  try {
    const cuerpo = (await respuesta.json()) as { message?: string | string[] }
    if (Array.isArray(cuerpo.message)) return cuerpo.message.join('. ')
    if (cuerpo.message) return cuerpo.message
  } catch {
  }
  return `Error ${respuesta.status}`
}