import apiClient from './client'

// GET /api/prompts?limit=20&offset=0&favorite=&domain=
// -> 200 { items: [...], limit, offset, total }
export async function listPrompts({ limit = 20, offset = 0, favorite, domain } = {}) {
  const params = { limit, offset }
  if (favorite !== undefined && favorite !== null) params.favorite = favorite
  if (domain) params.domain = domain
  const { data } = await apiClient.get('/api/prompts', { params })
  return data
}

// POST /api/prompts -> 201 { id, ... }
// payload: { title?, content, domain?, mode: 'template'|'ai'|'library',
//            template_id?, is_favorite? }
export async function createPrompt(payload) {
  const { data } = await apiClient.post('/api/prompts', payload)
  return data
}

export async function getPrompt(id) {
  const { data } = await apiClient.get(`/api/prompts/${id}`)
  return data
}

// PATCH /api/prompts/{id} { title?, is_favorite? }
export async function updatePrompt(id, patch) {
  const { data } = await apiClient.patch(`/api/prompts/${id}`, patch)
  return data
}

// DELETE /api/prompts/{id} -> 204
export async function deletePrompt(id) {
  await apiClient.delete(`/api/prompts/${id}`)
}
