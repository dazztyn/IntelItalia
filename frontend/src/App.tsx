import { RouterProvider } from 'react-router/dom'
import { router } from './router/index'
import { BotonTema } from './components/BotonTema'
import { SessionProvider } from './providers/SessionProvider'

function App() {
  return (
    <SessionProvider>
      <RouterProvider router={router} />
      <BotonTema />
    </SessionProvider>
  )
}

export default App
