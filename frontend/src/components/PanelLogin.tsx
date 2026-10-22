import logo from '../assets/INTELITALIA_LOGO_WH.png'
import { BotonGoogle } from './BotonLogin'
export function PanelLogin() {
  return (
  <div className="flex flex-col items-center justify-center p-4 text-center text-white bg-linear-to-br from-[#008C45] to-green-900">
    <p className="text-5xl font-light">Bienvenid@ a</p>
    <img src={logo} alt="Intelitalia" className="w-97 max-w-full" />
    <BotonGoogle onClick={() => console.log('Ingresar con Google')} />
      </div>
    )
  
}