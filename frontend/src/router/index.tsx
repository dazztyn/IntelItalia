import { createBrowserRouter, Navigate } from 'react-router'
import { RutaProtegida } from '../components/RutaProtegida'
import { Inicio } from '../pages/Inicio'
import { Login } from '../pages/Login'

export const router = createBrowserRouter([
  { path: '/ingresar', element: <Login /> },
  {
    element: <RutaProtegida />,
    children: [{ path: '/', element: <Inicio /> }],
  },
  { path: '*', element: <Navigate to="/" replace /> },
])