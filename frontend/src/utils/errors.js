// Turn an Axios error into a readable message.
// Handles the two FastAPI error shapes: { detail: "..." } and the 422
// validation array [{ loc, msg, type }, ...].
export function extractError(err, fallback = 'Something went wrong. Please try again.') {
  const detail = err?.response?.data?.detail
  if (!detail) return err?.message || fallback
  if (typeof detail === 'string') return detail
  if (Array.isArray(detail)) {
    return detail.map((d) => d.msg || JSON.stringify(d)).join(', ')
  }
  return fallback
}
