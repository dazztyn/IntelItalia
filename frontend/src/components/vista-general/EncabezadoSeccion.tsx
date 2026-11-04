interface Props {
  titulo: string
  subtitulo: string
}

export function EncabezadoSeccion({ titulo, subtitulo }: Props) {
  return (
    <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="text-2xl font-semibold">{titulo}</h1>
        <p className="text-sm text-tinta/60 dark:text-italia-blanco/60">{subtitulo}</p>
      </div>
      <span className="rounded-full bg-italia-verde/10 px-3 py-1 text-xs font-medium text-italia-verde dark:bg-emerald-400/10 dark:text-emerald-300">
        Datos de ejemplo
      </span>
    </div>
  )
}