import { useState } from 'react'
import { ArrowRight, Loader2 } from 'lucide-react'
import { generatePrompt } from '../api/ai'
import { createPrompt } from '../api/prompts'
import ResultPanel from '../components/ResultPanel'
import { extractError } from '../utils/errors'

const DOMAINS = ['Writing', 'Coding', 'Business', 'Education', 'Data', 'Creative']
const TONES = ['Professional', 'Casual', 'Friendly', 'Persuasive', 'Technical', 'Playful']
const FORMATS = ['Paragraph', 'Bulleted list', 'Step-by-step', 'Table', 'JSON']

const EXAMPLES = [
  'Write an AI prompt for a job description that attracts top talent',
  'Generate an AI prompt for a dystopian short story about AI',
  'Create an AI prompt to summarize a technical research article',
]

const selectCls =
  'appearance-none rounded-lg border border-slate-200 bg-white py-2 pl-3 pr-8 text-sm font-medium text-slate-700 transition hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-emerald-200'

export default function Generator() {
  const [goal, setGoal] = useState('')
  const [domain, setDomain] = useState('Writing')
  const [tone, setTone] = useState('Professional')
  const [outputFormat, setOutputFormat] = useState('Paragraph')

  const [result, setResult] = useState(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  const onGenerate = async () => {
    if (!goal.trim()) return
    setBusy(true)
    setError(null)
    setResult(null)
    setSaved(false)
    try {
      const data = await generatePrompt({
        goal: goal.trim(),
        domain,
        tone,
        output_format: outputFormat,
      })
      setResult(data)
    } catch (err) {
      setError(
        extractError(err, 'Generation failed. Is the backend running and the API key set?'),
      )
    } finally {
      setBusy(false)
    }
  }

  const onSave = async () => {
    if (!result) return
    setSaving(true)
    try {
      await createPrompt({
        content: result.generated_prompt,
        domain,
        mode: 'ai',
        title: goal.trim().slice(0, 80),
      })
      setSaved(true)
    } catch (err) {
      setError(extractError(err))
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="text-center text-4xl font-bold tracking-tight text-slate-900">
        AI Prompt Generator
      </h1>
      <p className="mt-3 text-center text-slate-500">
        Turn a vague idea into a precise, high-performing LLM prompt in seconds.
      </p>

      {/* gradient-bordered prompt box */}
      <div className="mt-8 rounded-2xl bg-gradient-to-r from-sky-300 via-violet-300 to-emerald-300 p-[1.5px] shadow-sm">
        <div className="rounded-2xl bg-white p-4">
          <textarea
            value={goal}
            onChange={(e) => setGoal(e.target.value)}
            rows={3}
            placeholder="Generate a prompt for..."
            className="w-full resize-none border-0 text-lg text-slate-800 outline-none placeholder:text-slate-400"
          />

          <div className="mt-2 flex flex-wrap items-center gap-2">
            <select value={domain} onChange={(e) => setDomain(e.target.value)} className={selectCls}>
              {DOMAINS.map((d) => (
                <option key={d}>{d}</option>
              ))}
            </select>
            <select value={tone} onChange={(e) => setTone(e.target.value)} className={selectCls}>
              {TONES.map((t) => (
                <option key={t}>{t}</option>
              ))}
            </select>
            <select
              value={outputFormat}
              onChange={(e) => setOutputFormat(e.target.value)}
              className={selectCls}
            >
              {FORMATS.map((f) => (
                <option key={f}>{f}</option>
              ))}
            </select>

            <button
              onClick={onGenerate}
              disabled={!goal.trim() || busy}
              className="ml-auto inline-flex items-center gap-2 rounded-full bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {busy ? <Loader2 size={16} className="animate-spin" /> : <ArrowRight size={16} />}
              {busy ? 'Generating…' : 'Generate'}
            </button>
          </div>
        </div>
      </div>

      {error && (
        <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </div>
      )}

      <ResultPanel
        title="Optimized prompt"
        content={result?.generated_prompt}
        onSave={onSave}
        saving={saving}
        saved={saved}
        meta={
          result
            ? `Model: ${result.model || 'claude'} · Tokens: ${result.tokens_used ?? '—'}`
            : null
        }
      />

      {!result && !busy && (
        <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-4">
          <p className="mb-3 text-sm font-medium text-slate-400">Try these</p>
          <div className="grid gap-3 sm:grid-cols-3">
            {EXAMPLES.map((ex) => (
              <button
                key={ex}
                onClick={() => setGoal(ex)}
                className="rounded-xl border border-slate-200 p-4 text-left text-sm text-slate-700 transition hover:border-emerald-300 hover:bg-emerald-50/40"
              >
                {ex}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
