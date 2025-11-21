import { GoogleGenerativeAI } from '@google/generative-ai'

export function getGeminiClient(): GoogleGenerativeAI {
  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey || apiKey === 'your_gemini_api_key_here') {
    throw new Error('Please set your GEMINI_API_KEY in the .env.local file')
  }
  return new GoogleGenerativeAI(apiKey)
}

export function isGeminiModel(model: string): boolean {
  return model.startsWith('gemini-') || model.startsWith('gemini-pro')
}

export async function generateWithGemini(
  systemPrompt: string,
  userPrompt: string,
  model: string,
  temperature: number = 0.7,
  maxTokens: number = 8000,
  imageFiles?: string[]
): Promise<string> {
  try {
    const client = getGeminiClient()
    const genModel = client.getGenerativeModel({ 
      model: model,
      generationConfig: {
        temperature,
        maxOutputTokens: maxTokens,
      }
    })

    // Combine system and user prompts (Gemini doesn't have separate system messages)
    const fullPrompt = `${systemPrompt}\n\n${userPrompt}`

    let response
    if (imageFiles && imageFiles.length > 0) {
      // Handle vision requests with images
      const imageParts = imageFiles.map((img: string) => {
        // Extract base64 data
        const base64Data = img.replace(/^data:image\/[a-z]+;base64,/, '')
        // Determine MIME type
        const mimeType = img.match(/^data:image\/([a-z]+);base64,/)?.[1] || 'jpeg'
        return {
          inlineData: {
            data: base64Data,
            mimeType: `image/${mimeType}`
          }
        }
      })

      const parts = [
        { text: fullPrompt },
        ...imageParts
      ]

      response = await genModel.generateContent({
        contents: [{
          role: 'user',
          parts: parts
        }]
      })
    } else {
      // Text-only request
      response = await genModel.generateContent(fullPrompt)
    }

    const result = response.response
    const text = result.text()
    
    if (!text || text.trim().length === 0) {
      throw new Error('Gemini returned empty content')
    }
    
    return text
  } catch (error: any) {
    console.error('Error generating with Gemini:', error)
    throw error
  }
}

export async function analyzeImageWithGemini(
  imageBase64: string,
  model: string = 'gemini-1.5-pro'
): Promise<string> {
  try {
    const client = getGeminiClient()
    const genModel = client.getGenerativeModel({ 
      model: model,
      generationConfig: {
        temperature: 0.3,
        maxOutputTokens: 1500,
      }
    })

    // Extract base64 data
    const base64Data = imageBase64.replace(/^data:image\/[a-z]+;base64,/, '')
    // Determine MIME type
    const mimeType = imageBase64.match(/^data:image\/([a-z]+);base64,/)?.[1] || 'jpeg'

    const prompt = 'Analyze this mathematical image and extract all content including:\n- All text, numbers, and labels\n- Geometric shapes and their measurements (sides, angles, etc.)\n- Graphs, coordinates, and data points\n- Tables, charts, and their values\n- Any mathematical equations or formulas visible\n- Colors, line types, and visual annotations\n- Scale, units, and reference points\n\nProvide a comprehensive description that includes all numbers, measurements, labels, and visual elements that would be needed to generate similar questions.'

    const response = await genModel.generateContent({
      contents: [{
        role: 'user',
        parts: [
          { text: prompt },
          {
            inlineData: {
              data: base64Data,
              mimeType: `image/${mimeType}`
            }
          }
        ]
      }]
    })

    const result = response.response
    const text = result.text()
    
    if (!text || text.trim().length === 0) {
      throw new Error('Gemini returned empty content for image analysis')
    }
    
    return text
  } catch (error: any) {
    console.error('Error analyzing image with Gemini:', error)
    throw error
  }
}

