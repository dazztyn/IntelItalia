import { createBrowserRouter, Navigate } from 'react-router'
import { RutaProtegida } from '../components/RutaProtegida'
import { LayoutPrincipal } from '../layouts/LayoutPrincipal'
import { Login } from '../pages/Login'
import { VistaGeneral } from '../pages/VistaGeneral'

export const router = createBrowserRouter([
  { path: '/ingresar', element: <Login /> },
  {
    element: <RutaProtegida />,
    children: [
      {
        element: <LayoutPrincipal />,
        children: [{ path: '/', element: <VistaGeneral /> }],
      },
    ],
  },
  { path: '*', element: <Navigate to="/" replace /> },
])