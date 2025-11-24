import OpenAI from 'openai'

export function getOpenAIClient(): OpenAI {
  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey || apiKey === 'your_openai_api_key_here') {
    throw new Error('Please set your OPENAI_API_KEY in the .env.local file')
  }
  return new OpenAI({ apiKey })
}

export async function generateImageForQuestion(
  questionText: string,
  imageDescription?: string
): Promise<string | null> {
  try {
    const client = getOpenAIClient()
    
    const prompt = imageDescription
      ? `Educational diagram or illustration for math problem: ${imageDescription}. Clean, simple, professional style suitable for educational materials.`
      : `Educational diagram or illustration for this math problem: ${questionText.substring(0, 200)}. Clean, simple, professional style suitable for educational materials, showing relevant numbers, shapes, or objects.`
    
    const response = await client.images.generate({
      model: 'dall-e-3',
      prompt,
      size: '1024x1024',
      quality: 'standard',
      n: 1,
    })
    
    if (response.data && response.data.length > 0) {
      return response.data[0].url || null
    }
    return null
  } catch (error) {
    console.error('Error generating image:', error)
    return null
  }
}

export async function analyzeImageForQuestion(
  imageBase64: string,
  model: string = 'gpt-4o'
): Promise<string> {
  try {
    const client = getOpenAIClient()
    
    // Ensure the image is in the correct format
    const imageUrl = imageBase64.startsWith('data:') 
      ? imageBase64 
      : `data:image/jpeg;base64,${imageBase64.replace(/^data:image\/[a-z]+;base64,/, '')}`
    
    const response = await client.chat.completions.create({
      model: model, // Use gpt-4o or gpt-4-turbo which support vision
      messages: [
        {
          role: 'system',
          content: 'You are an expert at analyzing mathematical images. Extract all text, numbers, measurements, geometric shapes, graphs, tables, and any mathematical content from the image. Provide a detailed description that can be used to generate questions. Be precise and include all visible information.'
        },
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: `Analyze this mathematical image and extract all content including:
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
            },
            {
              type: 'image_url',
              image_url: {
                url: imageUrl
              }
            }
          ]
        }
      ],
      max_tokens: 2000, // Increased to accommodate tabular data
      temperature: 0.3
    })
    
    return response.choices[0]?.message?.content || ''
  } catch (error) {
    console.error('Error analyzing image:', error)
    throw error
  }
}

