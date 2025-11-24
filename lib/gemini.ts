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
        maxOutputTokens: 2000, // Increased for tabular data
      }
    })

    // Extract base64 data
    const base64Data = imageBase64.replace(/^data:image\/[a-z]+;base64,/, '')
    // Determine MIME type
    const mimeType = imageBase64.match(/^data:image\/([a-z]+);base64,/)?.[1] || 'jpeg'

    const prompt = `Analyze this mathematical image and extract all content including:
- All text, numbers, and labels
- Geometric shapes and their measurements (sides, angles, etc.)
- Graphs, coordinates, and data points
- Tables, charts, and their values
- Any mathematical equations or formulas visible
- Colors, line types, and visual annotations
- Scale, units, and reference points

IMPORTANT FOR STRUCTURED DATA:
- If the image contains a TABLE: Present the data in a clear tabular format with rows and columns
- If the image contains a DOT PLOT or LINE PLOT: Extract the data points and present them in a table format with columns for x-values, y-values, and any labels
- If the image contains a BAR CHART or HISTOGRAM: Present the data in a table format with categories and values
- For tables: Use a format like:
  Table:
  | Column1 | Column2 | Column3 |
  |---------|---------|---------|
  | Value1  | Value2  | Value3   |
  | Value4  | Value5  | Value6   |

- For plots with data points: Use a format like:
  Data Points:
  | x | y | Label |
  |---|---|-------|
  | 1 | 2 | Point A |
  | 3 | 4 | Point B |

- For other visual elements (geometric shapes, graphs without tables): Use descriptive text format

Provide a comprehensive description that includes all numbers, measurements, labels, and visual elements that would be needed to generate similar questions.`

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

