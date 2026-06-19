import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  Sparkles,
  LayoutGrid,
  FolderClosed,
  Clock,
  ArrowRight,
} from 'lucide-react'
import { useAuth } from '../auth/AuthContext'
import { listPrompts } from '../api/prompts'

const actions = [
  { to: '/generate', icon: Sparkles, title: 'AI Generate', desc: 'Turn a goal into an optimized prompt' },
  { to: '/templates', icon: LayoutGrid, title: 'Templates', desc: 'Fill in a structured template' },
  { to: '/library', icon: FolderClosed, title: 'Library', desc: 'Browse curated prompts by domain' },
  { to: '/history', icon: Clock, title: 'History', desc: 'Your saved prompts & favorites' },
]

export default function Dashboard() {
  const { user } = useAuth()
  const [recent, setRecent] = useState([])

  useEffect(() => {
    listPrompts({ limit: 5 })
      .then((d) => setRecent(d.items || []))
      .catch(() => {}) // backend may not be up yet — fail silently on the dashboard
  }, [])

  const name =
    user?.full_name?.split(' ')[0] || user?.email?.split('@')[0] || 'there'

  return (
    <div className="mx-auto max-w-5xl">
      <h1 className="text-2xl font-bold text-slate-900">Welcome back, {name} 👋</h1>
      <p className="mt-1 text-slate-500">What would you like to craft today?</p>

      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {actions.map(({ to, icon: Icon, title, desc }) => (
          <Link
            key={to}
            to={to}
            className="group rounded-2xl border border-slate-200 bg-white p-5 transition hover:border-emerald-300 hover:shadow-sm"
          >
            <div className="mb-3 grid h-10 w-10 place-items-center rounded-xl bg-emerald-50 text-emerald-600">
              <Icon size={20} />
            </div>
            <h3 className="font-semibold text-slate-800">{title}</h3>
            <p className="mt-1 text-sm text-slate-500">{desc}</p>
            <span className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-emerald-700 opacity-0 transition group-hover:opacity-100">
              Open <ArrowRight size={14} />
            </span>
          </Link>
        ))}
      </div>

      {recent.length > 0 && (
        <div className="mt-8">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-semibold text-slate-800">Recent prompts</h2>
            <Link to="/history" className="text-sm font-medium text-emerald-700 hover:underline">
              View all
            </Link>
          </div>
          <div className="space-y-2">
            {recent.map((p) => (
              <Link
                key={p.id}
                to="/history"
                className="block rounded-xl border border-slate-200 bg-white p-4 transition hover:border-emerald-300"
              >
                <div className="flex items-center justify-between">
                  <span className="truncate font-medium text-slate-700">
                    {p.title || p.content?.slice(0, 60) || 'Untitled'}
                  </span>
                  <span className="ml-3 shrink-0 rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-500">
                    {p.mode}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
