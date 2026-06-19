import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search, ArrowRight, Loader2 } from 'lucide-react'
import { listTemplates, parseVariables } from '../api/templates'
import { extractError } from '../utils/errors'

const DOMAINS = ['All', 'Coding', 'Writing', 'Business', 'Education', 'Data', 'Creative']

export default function Library() {
  const navigate = useNavigate()
  const [templates, setTemplates] = useState([])
  const [domain, setDomain] = useState('All')
  const [q, setQ] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    listTemplates()
      .then((d) => setTemplates(Array.isArray(d) ? d : d.items || []))
      .catch((e) => setError(extractError(e)))
      .finally(() => setLoading(false))
  }, [])

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase()
    return templates.filter((t) => {
      const okDomain =
        domain === 'All' || (t.domain || '').toLowerCase() === domain.toLowerCase()
      const okQ =
        !needle ||
        (t.name || '').toLowerCase().includes(needle) ||
        (t.body || '').toLowerCase().includes(needle)
      return okDomain && okQ
    })
  }, [templates, domain, q])

  return (
    <div className="mx-auto max-w-5xl">
      <h1 className="text-2xl font-bold text-slate-900">Prompt Library</h1>
      <p className="mt-1 text-slate-500">Browse curated templates by domain, then customize.</p>

      {/* search */}
      <div className="relative mt-5">
        <Search
          size={16}
          className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
        />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search templates…"
          className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-9 pr-3 text-sm outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100"
        />
      </div>

      {/* domain chips */}
      <div className="mt-3 flex flex-wrap gap-2">
        {DOMAINS.map((d) => (
          <button
            key={d}
            onClick={() => setDomain(d)}
            className={`rounded-full px-3 py-1.5 text-sm font-medium transition ${
              domain === d
                ? 'bg-emerald-600 text-white'
                : 'border border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
            }`}
          >
            {d}
          </button>
        ))}
      </div>

      {error && (
        <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </div>
      )}

      {loading ? (
        <div className="mt-10 grid place-items-center">
          <Loader2 className="h-6 w-6 animate-spin text-emerald-600" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="mt-10 grid place-items-center rounded-2xl border border-dashed border-slate-300 py-16 text-center text-sm text-slate-400">
          No templates match. (Your backend serves these from <code>/api/templates</code>.)
        </div>
      ) : (
        <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((t) => {
            const vars = parseVariables(t)
            return (
              <div
                key={t.id}
                className="flex flex-col rounded-2xl border border-slate-200 bg-white p-5"
              >
                <div className="mb-2 flex items-center justify-between">
                  <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-medium uppercase tracking-wide text-emerald-600">
                    {t.domain}
                  </span>
                  {t.is_system === false && (
                    <span className="text-xs text-slate-400">custom</span>
                  )}
                </div>
                <h3 className="font-semibold text-slate-800">{t.name}</h3>
                <p className="mt-1 line-clamp-2 flex-1 text-sm text-slate-500">{t.body}</p>
                <div className="mt-3 flex items-center justify-between">
                  <span className="text-xs text-slate-400">
                    {vars.length} variable{vars.length === 1 ? '' : 's'}
                  </span>
                  <button
                    onClick={() => navigate('/templates', { state: { templateId: t.id } })}
                    className="inline-flex items-center gap-1 rounded-lg bg-emerald-600 px-3 py-1.5 text-sm font-medium text-white transition hover:bg-emerald-700"
                  >
                    Use <ArrowRight size={14} />
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
