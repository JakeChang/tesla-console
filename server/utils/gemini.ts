/**
 * Gemini API 共用工具
 */

const DEFAULT_MODEL = 'gemini-3.1-flash-lite-preview'

export async function generateWithGemini(
  apiKey: string,
  prompt: string,
  options: {
    model?: string
    temperature?: number
    maxOutputTokens?: number
    timeout?: number
  } = {},
): Promise<{ text: string, model: string }> {
  const model = options.model || DEFAULT_MODEL
  const response = await $fetch<any>(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: {
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: options.temperature ?? 0.5,
          maxOutputTokens: options.maxOutputTokens ?? 4096,
        },
      },
      timeout: options.timeout ?? 60000,
    },
  )

  const text = response?.candidates?.[0]?.content?.parts?.[0]?.text
  if (!text) {
    throw createError({ statusCode: 500, statusMessage: 'Gemini 回應為空' })
  }

  return { text, model }
}
