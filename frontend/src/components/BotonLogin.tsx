import LogoGoogle  from '../assets/GOOGLEICON.svg'

interface Props {
  onClick: () => void
}

export function BotonGoogle({ onClick }: Props) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex w-full max-w-xs items-center justify-center gap-3 rounded-md border border-slate-300 bg-white px-4 py-2.5 font-semibold text-slate-800 shadow-sm hover:bg-green-200 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 dark:hover:bg-slate-600"
    >
      <img src={LogoGoogle} alt="Logo Google" className="h-[18px] w-[18px]" />
      Ingresar con Google
    </button>
  )
}