const UN_DECIMAL = new Intl.NumberFormat('es-CL', {
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
})

export const formatoNota = (nota: number) => UN_DECIMAL.format(nota)
export const formatoPorcentaje = (valor: number) => `${UN_DECIMAL.format(valor)} %`

export function formatoRut(rut: string): string {
  const [cuerpo, dv] = rut.split('-')
  return `${Number(cuerpo).toLocaleString('es-CL')}-${dv}`
}