import { useState } from 'react'
import { Copy, Check } from 'lucide-react'

export default function CopyButton({ text, className = '' }) {
  const [copied, setCopied] = useState(false)

  const onCopy = async () => {
    try {
      await navigator.clipboard.writeText(text || '')
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch {
      // clipboard may be blocked (insecure context) — no-op
    }
  }

  return (
    <button
      onClick={onCopy}
      className={`inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-sm text-slate-600 transition hover:bg-slate-50 ${className}`}
    >
      {copied ? <Check size={15} className="text-emerald-600" /> : <Copy size={15} />}
      {copied ? 'Copied' : 'Copy'}
    </button>
  )
}
