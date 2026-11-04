import type { TipoCarga } from '../../datos/tiposCarga'

interface Props {
  tipos: TipoCarga[]
  activo: string
  alElegir: (id: string) => void
}

export function PestanasCarga({ tipos, activo, alElegir }: Props) {
  return (
    <div
      role="tablist"
      aria-label="Tipo de carga"
      className="flex shrink-0 items-end gap-2 overflow-x-auto md:max-h-[30rem] md:w-52 md:flex-col md:items-stretch md:overflow-y-auto md:py-3"
    >
      {tipos.map((tipo) => {
        const activa = tipo.id === activo
        return (
          <button
            key={tipo.id}
            type="button"
            role="tab"
            aria-selected={activa}
            aria-controls="panel-carga"
            onClick={() => alElegir(tipo.id)}
            className={`flex shrink-0 items-center justify-between gap-2 whitespace-nowrap rounded-t-lg bg-white px-4 py-3 text-left text-sm font-semibold text-italia-verde transition-all duration-300 motion-reduce:transition-none md:rounded-l-lg md:rounded-tr-none dark:bg-noche dark:text-emerald-400 ${
              activa ? 'mb-0 md:mr-0' : 'mb-2 opacity-80 hover:opacity-100 md:mb-0 md:mr-4'
            }`}
          >
            {tipo.etiqueta}
            {!tipo.fuente && (
              <span className="rounded-full bg-italia-verde/10 px-2 py-0.5 text-xs font-medium">
                Pronto
              </span>
            )}
          </button>
        )
      })}
    </div>
  )
}