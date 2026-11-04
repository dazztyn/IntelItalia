import { Outlet } from 'react-router'
import { Footer } from '../components/Footer'
import { Topbar } from '../components/Topbar'

export function LayoutPrincipal() {
  return (
    <div className="flex min-h-svh flex-col">
      <Topbar />
      <main className="flex-1 px-4 py-8">
        <Outlet />
      </main>
      <Footer />
    </div>
  )
}