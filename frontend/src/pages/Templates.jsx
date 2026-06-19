import { useEffect, useMemo, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { Loader2 } from 'lucide-react'
import { listTemplates, renderTemplate, parseVariables } from '../api/templates'
import { createPrompt } from '../api/prompts'
import TemplateForm from '../components/TemplateForm'
import ResultPanel from '../components/ResultPanel'
import { extractError } from '../utils/errors'

export default function Templates() {
  const location = useLocation()
  const preselectId = location.state?.templateId // set when arriving from Library

  const [templates, setTemplates] = useState([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState(null)
  const [values, setValues] = useState({})
  const [content, setContent] = useState(null)
  const [error, setError] = useState(null)
  const [busy, setBusy] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  function selectTemplate(t) {
    setSelected(t)
    setValues({})
    setContent(null)
    setSaved(false)
    setError(null)
  }

  useEffect(() => {
    listTemplates()
      .then((d) => {
        const list = Array.isArray(d) ? d : d.items || []
        setTemplates(list)
        if (preselectId) {
          const t = list.find((x) => String(x.id) === String(preselectId))
          if (t) selectTemplate(t)
        }
      })
      .catch((e) => setError(extractError(e)))
      .finally(() => setLoading(false))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const variables = useMemo(() => parseVariables(selected), [selected])
  const onChange = (name, value) => setValues((v) => ({ ...v, [name]: value }))

  const onRender = async (e) => {
    e.preventDefault()
    setBusy(true)
    setError(null)
    setContent(null)
    setSaved(false)
    try {
      const data = await renderTemplate(selected.id, values)
      setContent(data.content)
    } catch (err) {
      setError(extractError(err))
    } finally {
      setBusy(false)
    }
  }

  const onSave = async () => {
    setSaving(true)
    try {
      await createPrompt({
        content,
        domain: selected.domain,
        mode: 'template',
        template_id: selected.id,
        title: selected.name,
      })
      setSaved(true)
    } catch (err) {
      setError(extractError(err))
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="mt-10 grid place-items-center">
        <Loader2 className="h-6 w-6 animate-spin text-emerald-600" />
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-5xl">
      <h1 className="text-2xl font-bold text-slate-900">Template Generator</h1>
      <p className="mt-1 text-slate-500">
        Pick a template, fill the blanks, get a structured prompt — no AI needed.
      </p>

      {error && (
        <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="mt-6 grid gap-6 lg:grid-cols-[280px_1fr]">
        {/* template list */}
        <div className="space-y-2">
          {templates.length === 0 && (
            <p className="rounded-xl border border-dashed border-slate-300 p-4 text-sm text-slate-400">
              No templates yet. Your backend serves these from{' '}
              <code>/api/templates</code>.
            </p>
          )}
          {templates.map((t) => (
            <button
              key={t.id}
              onClick={() => selectTemplate(t)}
              className={`w-full rounded-xl border p-3 text-left transition ${
                selected?.id === t.id
                  ? 'border-emerald-400 bg-emerald-50'
                  : 'border-slate-200 bg-white hover:border-emerald-300'
              }`}
            >
              <div className="font-medium text-slate-800">{t.name}</div>
              <div className="mt-0.5 text-xs uppercase tracking-wide text-slate-400">
                {t.domain}
              </div>
            </button>
          ))}
        </div>

        {/* form + result */}
        <div>
          {!selected ? (
            <div className="grid h-48 place-items-center rounded-2xl border border-dashed border-slate-300 text-sm text-slate-400">
              Select a template to begin
            </div>
          ) : (
            <form
              onSubmit={onRender}
              className="rounded-2xl border border-slate-200 bg-white p-5"
            >
              <h2 className="font-semibold text-slate-800">{selected.name}</h2>
              <p className="mb-4 text-sm capitalize text-slate-500">{selected.domain}</p>
              <TemplateForm variables={variables} values={values} onChange={onChange} />
              <button
                type="submit"
                disabled={busy}
                className="mt-5 inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:opacity-50"
              >
                {busy && <Loader2 size={15} className="animate-spin" />}
                Generate prompt
              </button>
            </form>
          )}

          <ResultPanel
            content={content}
            onSave={onSave}
            saving={saving}
            saved={saved}
          />
        </div>
      </div>
    </div>
  )
}
