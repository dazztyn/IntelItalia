import { createBrowserRouter, Navigate } from 'react-router'
import { RutaProtegida } from '../components/RutaProtegida'
import { LayoutPrincipal } from '../layouts/LayoutPrincipal'
import { Login } from '../pages/Login'
import { VistaGeneral } from '../pages/VistaGeneral'
import { FichaAlumno } from '../pages/FichaAlumno'
import { CargaEvaluaciones } from '../pages/CargaEvaluaciones'

export const router = createBrowserRouter([
  { path: '/ingresar', element: <Login /> },
  {
    element: <RutaProtegida />,
    children: [
      {
        element: <LayoutPrincipal />,
        children: [
  { path: '/', element: <VistaGeneral /> },
  { path: '/alumnos/:id', element: <FichaAlumno /> },
  {
    element: <RutaProtegida permiso="cargas.evaluaciones" />,
    children: [{ path: '/cargas', element: <CargaEvaluaciones /> }],
  },
],

        
      },
    ],
  },
  { path: '*', element: <Navigate to="/" replace /> },
])