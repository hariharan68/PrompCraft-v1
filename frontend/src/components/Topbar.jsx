import { useState, useRef, useEffect } from 'react'
import { LogOut, UserRound } from 'lucide-react'
import { useAuth } from '../auth/AuthContext'

export default function Topbar() {
  const { user, logout } = useAuth()
  const [open, setOpen] = useState(false)
  const ref = useRef(null)

  // close the dropdown on outside click
  useEffect(() => {
    function onClick(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', onClick)
    return () => document.removeEventListener('mousedown', onClick)
  }, [])

  return (
    <header className="flex h-16 items-center justify-between border-b border-slate-200 bg-white px-6">
      <div className="flex items-center gap-2 font-semibold text-slate-800">
        <span className="text-lg">PromptCraft</span>
        <span className="text-xs font-medium text-emerald-600">Beta</span>
      </div>

      <div ref={ref} className="relative flex items-center gap-3">
        <span className="hidden max-w-[180px] truncate text-sm text-slate-500 sm:inline">
          {user?.email}
        </span>
        <button
          onClick={() => setOpen((o) => !o)}
          className="grid h-9 w-9 place-items-center rounded-full border border-slate-200 text-slate-500 transition hover:bg-slate-50"
        >
          <UserRound size={18} />
        </button>

        {open && (
          <div className="absolute right-0 top-12 z-10 w-48 rounded-xl border border-slate-200 bg-white p-1 shadow-lg">
            <div className="truncate px-3 py-2 text-xs text-slate-400">
              {user?.full_name || user?.email}
            </div>
            <button
              onClick={logout}
              className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-slate-700 transition hover:bg-slate-50"
            >
              <LogOut size={16} /> Sign out
            </button>
          </div>
        )}
      </div>
    </header>
  )
}
