import { NavLink } from 'react-router-dom'
import {
  LayoutDashboard,
  Sparkles,
  LayoutGrid,
  FolderClosed,
  Clock,
} from 'lucide-react'

const items = [
  { to: '/', icon: LayoutDashboard, label: 'Home', end: true },
  { to: '/generate', icon: Sparkles, label: 'Generate' },
  { to: '/templates', icon: LayoutGrid, label: 'Templates' },
  { to: '/library', icon: FolderClosed, label: 'Library' },
  { to: '/history', icon: Clock, label: 'History' },
]

export default function Sidebar() {
  return (
    <aside className="flex w-20 shrink-0 flex-col items-center gap-1 border-r border-slate-200 bg-white py-4">
      <NavLink
        to="/"
        className="mb-3 grid h-9 w-9 place-items-center rounded-xl bg-emerald-600 font-bold text-white"
      >
        P
      </NavLink>

      {items.map(({ to, icon: Icon, label, end }) => (
        <NavLink
          key={to}
          to={to}
          end={end}
          className={({ isActive }) =>
            `flex w-16 flex-col items-center gap-1 rounded-xl py-2 text-[11px] font-medium transition ${
              isActive
                ? 'bg-emerald-50 text-emerald-700'
                : 'text-slate-500 hover:bg-slate-50 hover:text-slate-700'
            }`
          }
        >
          <Icon size={20} strokeWidth={1.8} />
          {label}
        </NavLink>
      ))}
    </aside>
  )
}
