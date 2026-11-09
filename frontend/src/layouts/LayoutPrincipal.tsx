import { Outlet, useLocation } from 'react-router'
import { ControlLectura } from '../components/ControlLectura'
import { Footer } from '../components/Footer'
import { Topbar } from '../components/Topbar'

export function LayoutPrincipal() {
  const { pathname, search } = useLocation()

  return (
    <div className="flex min-h-svh flex-col">
      <Topbar />
      <main className="flex-1 px-4 py-8">
        <Outlet />
      </main>
      <Footer />
      <ControlLectura key={pathname + search} />
    </div>
  )
}