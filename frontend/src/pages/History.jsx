import { useCallback, useEffect, useState } from 'react'
import { Star, Trash2, Loader2, Clock } from 'lucide-react'
import { listPrompts, updatePrompt, deletePrompt } from '../api/prompts'
import CopyButton from '../components/CopyButton'
import { extractError } from '../utils/errors'

const PAGE = 20

export default function History() {
  const [items, setItems] = useState([])
  const [total, setTotal] = useState(0)
  const [offset, setOffset] = useState(0)
  const [favOnly, setFavOnly] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await listPrompts({
        limit: PAGE,
        offset,
        favorite: favOnly ? true : undefined,
      })
      setItems(data.items || [])
      setTotal(data.total || 0)
    } catch (err) {
      setError(extractError(err))
    } finally {
      setLoading(false)
    }
  }, [offset, favOnly])

  useEffect(() => {
    load()
  }, [load])

  const toggleFav = async (p) => {
    try {
      await updatePrompt(p.id, { is_favorite: !p.is_favorite })
      setItems((list) =>
        list.map((x) => (x.id === p.id ? { ...x, is_favorite: !x.is_favorite } : x)),
      )
    } catch (err) {
      setError(extractError(err))
    }
  }

  const remove = async (p) => {
    if (!window.confirm('Delete this prompt?')) return
    try {
      await deletePrompt(p.id)
      setItems((list) => list.filter((x) => x.id !== p.id))
      setTotal((t) => Math.max(0, t - 1))
    } catch (err) {
      setError(extractError(err))
    }
  }

  const page = Math.floor(offset / PAGE) + 1
  const pages = Math.max(1, Math.ceil(total / PAGE))

  return (
    <div className="mx-auto max-w-4xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">History</h1>
          <p className="mt-1 text-slate-500">
            {total} saved prompt{total === 1 ? '' : 's'}
          </p>
        </div>
        <button
          onClick={() => {
            setOffset(0)
            setFavOnly((f) => !f)
          }}
          className={`inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium transition ${
            favOnly
              ? 'border-amber-300 bg-amber-50 text-amber-700'
              : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
          }`}
        >
          <Star size={15} className={favOnly ? 'fill-amber-400 text-amber-400' : ''} />
          Favorites
        </button>
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
      ) : items.length === 0 ? (
        <div className="mt-10 grid place-items-center rounded-2xl border border-dashed border-slate-300 py-16 text-center text-slate-400">
          <Clock className="mb-2 h-8 w-8" />
          <p>{favOnly ? 'No favorites yet.' : 'No saved prompts yet.'}</p>
        </div>
      ) : (
        <div className="mt-6 space-y-3">
          {items.map((p) => (
            <div key={p.id} className="rounded-2xl border border-slate-200 bg-white p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="truncate font-medium text-slate-800">
                      {p.title || 'Untitled prompt'}
                    </span>
                    <span className="shrink-0 rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-500">
                      {p.mode}
                    </span>
                    {p.domain && (
                      <span className="shrink-0 rounded-full bg-emerald-50 px-2 py-0.5 text-xs capitalize text-emerald-600">
                        {p.domain}
                      </span>
                    )}
                  </div>
                  <p className="mt-1 line-clamp-2 text-sm text-slate-500">{p.content}</p>
                </div>
                <div className="flex shrink-0 items-center gap-1">
                  <button
                    onClick={() => toggleFav(p)}
                    title="Favorite"
                    className="grid h-8 w-8 place-items-center rounded-lg text-slate-400 transition hover:bg-slate-50"
                  >
                    <Star
                      size={16}
                      className={p.is_favorite ? 'fill-amber-400 text-amber-400' : ''}
                    />
                  </button>
                  <CopyButton text={p.content} />
                  <button
                    onClick={() => remove(p)}
                    title="Delete"
                    className="grid h-8 w-8 place-items-center rounded-lg text-slate-400 transition hover:bg-red-50 hover:text-red-600"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {pages > 1 && (
        <div className="mt-6 flex items-center justify-center gap-3 text-sm">
          <button
            disabled={offset === 0}
            onClick={() => setOffset((o) => Math.max(0, o - PAGE))}
            className="rounded-lg border border-slate-200 px-3 py-1.5 disabled:opacity-40"
          >
            Prev
          </button>
          <span className="text-slate-500">
            Page {page} of {pages}
          </span>
          <button
            disabled={page >= pages}
            onClick={() => setOffset((o) => o + PAGE)}
            className="rounded-lg border border-slate-200 px-3 py-1.5 disabled:opacity-40"
          >
            Next
          </button>
        </div>
      )}
    </div>
  )
}
