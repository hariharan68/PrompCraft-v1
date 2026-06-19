import { Outlet } from 'react-router-dom'
import Sidebar from './Sidebar'
import Topbar from './Topbar'

// App shell for every protected page: left rail + top bar + routed content.
export default function Layout() {
  return (
    <div className="flex min-h-screen bg-[#f2f8f4] text-slate-800">
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar />
        <main className="flex-1 px-6 py-8">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
