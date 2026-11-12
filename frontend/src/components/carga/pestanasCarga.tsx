import type { TipoCarga } from '../../datos/tiposCarga'
import type { EstadoPestana } from './tipos'

interface Props {
  tipos: TipoCarga[]
  activo: string
  estados: Record<string, EstadoPestana | undefined>
  alElegir: (id: string) => void
}

function Indicador({ estado }: { estado: EstadoPestana }) {
  const completo = estado === 'completo'
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium ${
        completo ? 'bg-emerald-700 text-white' : 'bg-amber-300 text-amber-950'
      }`}
    >
      <span
        aria-hidden="true"
        className={`h-1.5 w-1.5 rounded-full ${completo ? 'bg-white' : 'bg-amber-800'}`}
      />
      {completo ? 'Completo' : 'Pendiente'}
    </span>
  )
}

export function PestanasCarga({ tipos, activo, estados, alElegir }: Props) {
  return (
    <div
      role="tablist"
      aria-label="Tipo de carga"
      className="flex shrink-0 items-end gap-2 overflow-x-auto md:max-h-[30rem] md:w-52 md:flex-col md:items-stretch md:overflow-y-auto md:py-3"
    >
      {tipos.map((tipo) => {
        const activa = tipo.id === activo
        const estado = estados[tipo.id]
        return (
          <button
            key={tipo.id}
            type="button"
            role="tab"
            aria-selected={activa}
            aria-controls="panel-carga"
            onClick={() => alElegir(tipo.id)}
            className={`flex shrink-0 flex-col items-start gap-1 whitespace-nowrap px-4 py-3 text-left text-sm font-semibold text-verde-texto transition-all duration-300 motion-reduce:transition-none dark:text-emerald-400 ${
              activa
                ? 'mb-0 rounded-t-lg rounded-b-none bg-white md:mr-0 md:rounded-l-lg md:rounded-r-none dark:bg-noche'
                : 'mb-2 rounded-lg bg-white/90 hover:bg-white md:mb-0 md:mr-4 dark:bg-noche/90 dark:hover:bg-noche'
            }`}
          >
            {tipo.etiqueta}
            {tipo.fuente ? (
              estado && <Indicador estado={estado} />
            ) : (
              <span className="rounded-full bg-verde-texto/10 px-2 py-0.5 text-xs font-medium dark:bg-emerald-400/10">
                Pronto
              </span>
            )}
          </button>
        )
      })}
    </div>
  )
}