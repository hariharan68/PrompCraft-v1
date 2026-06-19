// Labeled text input with optional leading icon (used by the auth forms).
export default function Field({ label, icon: Icon, ...props }) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-medium text-slate-700">{label}</span>
      <div className="relative">
        {Icon && (
          <Icon
            size={16}
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
          />
        )}
        <input
          {...props}
          className={`w-full rounded-lg border border-slate-200 bg-white py-2.5 ${
            Icon ? 'pl-9' : 'pl-3'
          } pr-3 text-sm text-slate-800 outline-none transition focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100`}
        />
      </div>
    </label>
  )
}
