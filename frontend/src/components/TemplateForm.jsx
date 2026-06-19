// Renders one input per template variable. Variable defs look like:
//   { name, label, type: 'text'|'textarea'|'number', required }
const baseInput =
  'w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-800 outline-none transition focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100'

export default function TemplateForm({ variables, values, onChange }) {
  if (!variables.length) {
    return (
      <p className="text-sm text-slate-400">This template has no variables.</p>
    )
  }

  return (
    <div className="space-y-4">
      {variables.map((v) => {
        const common = {
          value: values[v.name] ?? '',
          onChange: (e) => onChange(v.name, e.target.value),
          required: !!v.required,
          placeholder: v.label || v.name,
        }
        return (
          <label key={v.name} className="block">
            <span className="mb-1 block text-sm font-medium text-slate-700">
              {v.label || v.name}
              {v.required && <span className="text-red-500"> *</span>}
            </span>
            {v.type === 'textarea' ? (
              <textarea rows={4} {...common} className={`${baseInput} resize-y`} />
            ) : (
              <input
                type={v.type === 'number' ? 'number' : 'text'}
                {...common}
                className={baseInput}
              />
            )}
          </label>
        )
      })}
    </div>
  )
}
