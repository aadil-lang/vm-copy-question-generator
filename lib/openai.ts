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

