import { Save, Check, Loader2 } from 'lucide-react'
import CopyButton from './CopyButton'

// Shows a generated/rendered prompt with Copy + optional Save-to-history.
export default function ResultPanel({
  title = 'Result',
  content,
  onSave,
  saving,
  saved,
  meta,
}) {
  if (!content) return null
  return (
    <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-5">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="font-semibold text-slate-800">{title}</h3>
        <div className="flex items-center gap-2">
          <CopyButton text={content} />
          {onSave && (
            <button
              onClick={onSave}
              disabled={saving || saved}
              className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-1.5 text-sm font-medium text-white transition hover:bg-emerald-700 disabled:opacity-50"
            >
              {saving ? (
                <Loader2 size={15} className="animate-spin" />
              ) : saved ? (
                <Check size={15} />
              ) : (
                <Save size={15} />
              )}
              {saved ? 'Saved' : 'Save'}
            </button>
          )}
        </div>
      </div>
      <pre className="whitespace-pre-wrap break-words rounded-lg bg-slate-50 p-4 text-sm leading-relaxed text-slate-700">
        {content}
      </pre>
      {meta && <p className="mt-2 text-xs text-slate-400">{meta}</p>}
    </div>
  )
}
