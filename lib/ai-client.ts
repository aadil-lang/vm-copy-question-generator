import { getOpenAIClient, analyzeImageForQuestion as analyzeImageWithOpenAI } from './openai'
import { getGeminiClient, isGeminiModel, generateWithGemini, analyzeImageWithGemini } from './gemini'

export type AIModel = string
export type AIProvider = 'openai' | 'gemini'

export function getAIProvider(model: string): AIProvider {
  if (isGeminiModel(model)) {
    return 'gemini'
  }
  return 'openai'
}

export async function generateWithAI(
  systemPrompt: string,
  userPrompt: string,
  model: string,
  temperature: number = 0.7,
  maxTokens: number = 8000,
  imageFiles?: string[]
): Promise<string> {
  const provider = getAIProvider(model)
  
  if (provider === 'gemini') {
    return generateWithGemini(systemPrompt, userPrompt, model, temperature, maxTokens, imageFiles)
  } else {
    // OpenAI
    const client = getOpenAIClient()
    const supportsVision = model === 'gpt-4o' || model === 'gpt-4-turbo' || model === 'gpt-4-turbo-preview'
    const shouldIncludeImages = imageFiles && imageFiles.length > 0 && supportsVision

    const messages: any[] = [
      { role: 'system', content: systemPrompt },
      shouldIncludeImages
        ? {
            role: 'user',
            content: [
              { type: 'text', text: userPrompt },
              ...imageFiles!.map((img: string) => ({
                type: 'image_url',
                image_url: {
                  url: img.startsWith('data:') ? img : `data:image/jpeg;base64,${img.replace(/^data:image\/[a-z]+;base64,/, '')}`
                }
              }))
            ]
          }
        : { role: 'user', content: userPrompt }
    ]

    const response = await client.chat.completions.create({
      model: model,
      messages: messages,
      max_tokens: maxTokens,
      temperature: temperature,
    })

    if (!response.choices || response.choices.length === 0) {
      throw new Error('AI returned empty response')
    }

    const content = response.choices[0].message.content
    if (!content || content.trim().length === 0) {
      throw new Error('AI returned empty content')
    }

    return content
  }
}

export async function analyzeImageForQuestion(
  imageBase64: string,
  model: string = 'gpt-4o'
): Promise<string> {
  const provider = getAIProvider(model)
  
  if (provider === 'gemini') {
    // Use Gemini's vision model for analysis
    const visionModel = model.startsWith('gemini-') ? model : 'gemini-1.5-pro'
    return analyzeImageWithGemini(imageBase64, visionModel)
  } else {
    // OpenAI
    return analyzeImageWithOpenAI(imageBase64, model)
  }
}

