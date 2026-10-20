import { createBrowserRouter, Navigate } from 'react-router'
import { Login } from '../pages/Login'


export const router = createBrowserRouter([
  { path: '/login', element: <Login /> },
])
