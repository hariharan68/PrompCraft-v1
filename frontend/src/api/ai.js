import apiClient from './client'

// POST /api/ai/generate { goal, domain, tone, output_format }
// -> 200 { generated_prompt, model, tokens_used }
// Errors: 429 rate limited, 502 Claude unavailable/timeout.
export async function generatePrompt({ goal, domain, tone, output_format }) {
  const { data } = await apiClient.post('/api/ai/generate', {
    goal,
    domain,
    tone,
    output_format,
  })
  return data
}
