import fotoEscuela from '../assets/FOTO_ESCUELA.jpg'
import logoEscuela from '../assets/LOGO_ESCUELA.png'
import logoSlep from '../assets/LOGO_SLEP.png'
export function PanelFoto() {
  return (
    <div className="absolute inset-0 overflow-hidden">
      <img src={fotoEscuela} alt="Escuela República de Italia" className="h-full w-full object-cover absolute inset-0" />
      <div className="absolute inset-0 bg-linear-to-br from-emerald-900/70 to-teal-500/10" />

      <div className="absolute right-4 top-4 flex items-center gap-3">
        <img
          src={logoSlep}
          alt="SLEP"
          className="h-32 p-1"
        />
        <img
          src={logoEscuela}
          alt="Escuela República de Italia"
          className="h-32 p-1"
        />
      </div>
    </div>
  )
}