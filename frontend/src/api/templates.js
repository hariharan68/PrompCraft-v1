import apiClient from './client'

// GET /api/templates?domain=...
// -> 200 [ { id, name, domain, body, variables: [ {name,label,type,required} ],
//           is_system, created_by } ]
// (Backend may return `variables` parsed, or `variables_json` as a string —
//  parseVariables() below handles both.)
export async function listTemplates(domain) {
  const { data } = await apiClient.get('/api/templates', {
    params: domain ? { domain } : {},
  })
  return data
}

// GET /api/templates/{id}
export async function getTemplate(id) {
  const { data } = await apiClient.get(`/api/templates/${id}`)
  return data
}

// POST /api/templates/{id}/render { variables: {...} } -> { content }
export async function renderTemplate(id, variables) {
  const { data } = await apiClient.post(`/api/templates/${id}/render`, { variables })
  return data
}

// Normalises a template's variable definitions regardless of backend shape.
export function parseVariables(template) {
  if (!template) return []
  if (Array.isArray(template.variables)) return template.variables
  const raw = template.variables_json ?? template.VariablesJson
  if (typeof raw === 'string') {
    try {
      const parsed = JSON.parse(raw)
      return Array.isArray(parsed) ? parsed : []
    } catch {
      return []
    }
  }
  return []
}
