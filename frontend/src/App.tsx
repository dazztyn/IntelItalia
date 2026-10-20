import { RouterProvider } from 'react-router/dom'
import { router } from './router/index'
import { SessionProvider } from './providers/SessionProvider'

function App() {
  return (
    <SessionProvider>
      <RouterProvider router={router} />
    </SessionProvider>
  )
}

export default App
