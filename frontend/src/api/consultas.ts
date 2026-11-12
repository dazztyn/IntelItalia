import { QueryClient, useQuery } from '@tanstack/react-query'
import { ErrorApi } from './cliente'
import { listarCargas } from './cargas'

export const clienteConsultas = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60_000,
      refetchOnWindowFocus: false,
      retry: (intentos, error) =>
        !(error instanceof ErrorApi && error.estado < 500) && intentos < 2,
    },
  },
})
export function useCargas() {
  return useQuery({ queryKey: ['cargas'], queryFn: listarCargas })
}