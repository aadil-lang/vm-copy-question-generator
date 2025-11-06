import { NextRequest, NextResponse } from 'next/server'
import { getOpenAIClient, generateImageForQuestion } from '@/lib/openai'
import { loadCurriculumSubskills } from '@/lib/curriculum'
import { parseNumberOfOptions, determineQuestionType } from '@/lib/question-utils'

export async function POST(request: NextRequest) {
  try {
    const data = await request.json()
    
    // Validate required fields
    const requiredFields = ['baseQuestion', 'numCopyQuestions', 'model']
    for (const field of requiredFields) {
      if (!data[field]) {
        return NextResponse.json(
          { error: `Missing required field: ${field}` },
          { status: 400 }
        )
      }
    }
    
    // Parse number of options
    const baseQuestion = data.baseQuestion || ''
    const numOptions = data.numOptions 
      ? parseInt(data.numOptions, 10)
      : parseNumberOfOptions(baseQuestion)
    
    const difficulty = data.difficulty || 'Medium'
    const grade = data.grade || ''
    const curriculum = data.curriculum || ''
    const notes = data.notes || ''
    const solution = data.solution || ''
    const images = data.images || ''
    const numQuestions = parseInt(data.numCopyQuestions, 10)
    const model = data.model || 'gpt-4o'
    const questionTypeFromUrl = data.questionType || null
    
    // Generate questions
    const questions = await generateQuestionsWithGPT(
      baseQuestion,
      notes,
      solution,
      images,
      [],
      numOptions,
      numQuestions,
      difficulty,
      grade,
      curriculum,
      model,
      questionTypeFromUrl
    )
    
    return NextResponse.json({ questions })
  } catch (error: any) {
    console.error('Error generating questions:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to generate questions' },
      { status: 500 }
    )
  }
}

async function generateQuestionsWithGPT(
  baseQuestion: string,
  notes: string,
  solution: string,
  images: string,
  imageFiles: any[],
  numOptions: number,
  numQuestions: number,
  difficulty: string,
  grade: string,
  curriculum: string,
  model: string,
  questionTypeFromUrl: string | null
) {
  // Load relevant subskills
  let subskillsText = 'General math concepts'
  if (grade && curriculum) {
    const subskills = loadCurriculumSubskills(grade, curriculum)
    subskillsText = subskills.slice(0, 4).join(', ') || 'General math concepts'
  }
  
  // Determine question type
  let questionType: 'mathematical' | 'word_problem' | 'image_based'
  if (questionTypeFromUrl) {
    if (questionTypeFromUrl === 'word-problems') {
      questionType = 'word_problem'
    } else if (questionTypeFromUrl === 'mathematical') {
      questionType = 'mathematical'
    } else if (questionTypeFromUrl === 'image-based') {
      questionType = 'image_based'
    } else {
      questionType = determineQuestionType(baseQuestion, notes)
    }
  } else {
    questionType = determineQuestionType(baseQuestion, notes)
  }
  
  // Build system prompt
  const systemPrompt = `You are an expert educational content generator specializing in creating mathematical questions aligned with US curricula standards.
You generate high-quality, pedagogically sound multiple-choice questions that test specific skills and concepts.

CRITICAL: When generating copy questions, you MUST:
1. Preserve the EXACT format and structure of the base question
2. Keep the SAME wording, phrasing, and style as the base question
3. Maintain the SAME question type and presentation style
4. Only change the numbers (for mathematical) or context (for word problems)
5. Match the base question's punctuation, capitalization, and formatting exactly`
  
  // Build user prompt
  const solutionText = solution ? `\nBase Solution: ${solution}` : ''
  const imageInfo = images ? `\nBase Question Images: ${images}` : ''
  const shouldGenerateImages = Boolean(images || imageFiles.length)
  
  let userPrompt = ''
  
  if (questionType === 'mathematical') {
    userPrompt = `Generate EXACTLY ${numQuestions} questions. Return JSON array starting with [ and ending with ].

Generate ${numQuestions} MCQ questions with ${numOptions} options each. Base Question: ${baseQuestion}

Rules:
- Keep EXACTLY the SAME phrasing and structure, change ONLY the numbers
- Each question MUST have EXACTLY ${numOptions} options (same as base question)
- ONE option per question must be marked "CA" (Correct Answer)
- Incorrect options logic must be SHORT (3-6 words) based on student errors
- Examples: "CA", "Added instead of multiplied", "Forgot to carry over"
${notes ? `SME NOTES: ${notes}\n` : ''}${solution ? `Base Solution: ${solution}\n` : ''}${imageInfo ? `${imageInfo}\n` : ''}
Return JSON array: [{"question": "...", "options": [{"text": "...", "logic": "..."}, ...], "image": "", "solution": "..."}, ...]
Return ${numQuestions} questions. Each with ${numOptions} options.`
  } else {
    userPrompt = `${'='.repeat(80)}
⚠️⚠️⚠️ CRITICAL: YOU MUST GENERATE EXACTLY ${numQuestions} QUESTIONS ⚠️⚠️⚠️
${'='.repeat(80)}
If this says ${numQuestions}, you MUST return ${numQuestions} question objects.
DO NOT return only 1 question. DO NOT return fewer than ${numQuestions}.
FAILURE TO RETURN ${numQuestions} QUESTIONS WILL CAUSE AN ERROR.

🔥 YOUR RESPONSE MUST START WITH [ AND END WITH ] 🔥
🔥 DO NOT START WITH { OR RETURN A SINGLE OBJECT 🔥
🔥 YOU MUST RETURN AN ARRAY: [{...}, {...}, ...] 🔥
${'='.repeat(80)}

You MUST generate EXACTLY ${numQuestions} distinct MCQ questions with ${numOptions} options each.

BASE QUESTION (STUDY THIS CAREFULLY):
${baseQuestion}

CRITICAL: The BASE QUESTION shown above is the question you must create variations of. DO NOT create questions about different topics or concepts. ALL copy questions must be DIRECT variations of the base question, only changing context (names, items, scenarios) and numbers while preserving the EXACT same mathematical concept, structure, and phrasing.

CRITICAL REQUIREMENT: Generate ${numQuestions} SEPARATE and DISTINCT questions. Each question must be a DIFFERENT variation of the base question.
DO NOT generate only one question. You MUST return ${numQuestions} questions.
REPEAT: ${numQuestions} questions required. Not 1. Not ${numQuestions - 1}. EXACTLY ${numQuestions}.

SME NOTES (CRITICAL - MUST FOLLOW IN ADDITION TO ALL PROMPT INSTRUCTIONS):
${notes || 'None - No specific notes provided'}
YOU MUST FOLLOW THE SME NOTES ABOVE IN ADDITION TO ALL OTHER INSTRUCTIONS
${solutionText}${imageInfo}
${curriculum && grade ? `Curriculum: ${curriculum} | Grade: ${grade} | Difficulty: ${difficulty}` : difficulty ? `Difficulty: ${difficulty}` : ''}
Subskills: ${subskillsText.substring(0, 200)}

Rules:
- ${questionType}: CHANGE ONLY the context/real-life scenario, keep the SAME math operation, structure, and question format. Preserve the same wording style and structure.
- CRITICAL: Each copy question MUST match the base question's sentence structure, phrasing, word order, and grammatical style
- CRITICAL: Number of options MUST match the base question: Each question MUST have EXACTLY ${numOptions} options (same as the base question). DO NOT generate more or fewer options.
- ONE option per question must be marked "CA" (Correct Answer)
- ALL copy questions must have the SAME number of options (${numOptions} options) as the base question
- CRITICAL: Incorrect options MUST be based on ACTUAL ERRORS students would make when solving the BASE QUESTION or similar problems
- Logic must be SHORT (3-6 words) and SPECIFIC to the question type
- Examples: "CA", "Added instead of multiplied", "Forgot to carry over", "Wrong order of operations", "Place value mistake", "Used subtraction instead"
${solution ? 'IMPORTANT: Generate a solution for each question based on the base solution. Adapt the steps to match each question\'s numbers/context while keeping the same solution approach.' : ''}

CRITICAL JSON FORMAT REQUIREMENTS
- Your FIRST character MUST be [ (opening square bracket)
- Your LAST character MUST be ] (closing square bracket)
- Return ONLY a valid JSON array starting with [ and ending with ]
- DO NOT start with { (curly brace) - that means a single object, which is WRONG
- DO NOT return a single object - you MUST return an array
- NO markdown code blocks (no \`\`\`json or \`\`\`)
- NO explanations or text before or after the JSON
- NO comments or notes
- Start response immediately with [
- End response with ]
- Ensure all strings are properly quoted with double quotes
- Ensure all brackets and braces are properly matched
- Do NOT include any text outside the JSON array

⚠️⚠️⚠️ CRITICAL: You MUST return EXACTLY ${numQuestions} question objects in a JSON array. DO NOT return only one question.

Your response must be ONLY a JSON array containing EXACTLY ${numQuestions} question objects. Each object must have "question", "options", "image", and "solution" fields.

🔥🔥🔥 CRITICAL: YOUR RESPONSE MUST START WITH [ AND END WITH ] 🔥🔥🔥

Your response should look like this (example for ${numQuestions} questions):
[{"question": "...", "options": [...], "image": "", "solution": "..."}, {"question": "...", "options": [...], "image": "", "solution": "..."}, ...]

You MUST return an array with ${numQuestions} objects, starting with [ and ending with ].`
  }
  
  try {
    const client = getOpenAIClient()
    
    // Calculate tokens needed
    const tokensPerQuestion = Math.max(500, 400 * numOptions)
    let tokensNeeded = Math.max(1500, tokensPerQuestion * numQuestions)
    tokensNeeded = Math.min(8000, tokensNeeded)
    if (numQuestions > 1) {
      tokensNeeded = Math.floor(tokensNeeded * 1.2)
    }
    
    const apiParams: any = {
      model: model === 'gpt-5' ? 'gpt-4o' : model, // Fallback if gpt-5 not available
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      max_tokens: tokensNeeded,
      temperature: 0.7,
    }
    
    const response = await client.chat.completions.create(apiParams)
    
    if (!response.choices || response.choices.length === 0) {
      throw new Error('GPT returned empty response')
    }
    
    const content = response.choices[0].message.content
    if (!content || content.trim().length === 0) {
      throw new Error('GPT returned empty content')
    }
    
    // Parse JSON from response
    let cleanedContent = content.trim()
    cleanedContent = cleanedContent.replace(/```json\s*/g, '')
    cleanedContent = cleanedContent.replace(/```\s*/g, '')
    cleanedContent = cleanedContent.trim()
    
    // Extract JSON array
    const firstBracket = cleanedContent.indexOf('[')
    const lastBracket = cleanedContent.lastIndexOf(']')
    
    if (firstBracket === -1 || lastBracket === -1 || lastBracket <= firstBracket) {
      throw new Error('Failed to find JSON array in response')
    }
    
    const jsonContent = cleanedContent.substring(firstBracket, lastBracket + 1)
    const parsed = JSON.parse(jsonContent)
    
    if (!Array.isArray(parsed)) {
      throw new Error('Parsed JSON is not an array')
    }
    
    // Validate and fix questions
    const validatedQuestions = []
    for (let idx = 0; idx < parsed.length && idx < numQuestions; idx++) {
      const question = parsed[idx]
      
      if (!question.question || !question.options || !Array.isArray(question.options)) {
        continue
      }
      
      // Ensure correct number of options
      let options = question.options
      if (options.length !== numOptions) {
        if (options.length < numOptions) {
          // Add missing options
          for (let i = options.length; i < numOptions; i++) {
            options.push({
              text: `Option ${String.fromCharCode(65 + i)}`,
              logic: 'Plausible distractor'
            })
          }
        } else {
          // Remove extra options
          options = options.slice(0, numOptions)
        }
      }
      
      // Validate options
      const validOptions = []
      let hasCorrectAnswer = false
      
      for (const option of options) {
        if (!option.text) continue
        
        if (!option.logic) {
          option.logic = 'Plausible distractor'
        }
        
        const logicUpper = String(option.logic).toUpperCase()
        if (logicUpper === 'CA' || logicUpper.includes('CORRECT') || logicUpper.includes('RIGHT')) {
          if (!hasCorrectAnswer) {
            option.logic = 'CA'
            hasCorrectAnswer = true
          } else {
            option.logic = 'Plausible distractor'
          }
        }
        
        validOptions.push(option)
      }
      
      // If no correct answer found, mark first option as CA
      if (!hasCorrectAnswer && validOptions.length > 0) {
        validOptions[0].logic = 'CA'
      }
      
      // Ensure we have enough valid options
      while (validOptions.length < numOptions) {
        validOptions.push({
          text: `Option ${String.fromCharCode(65 + validOptions.length)}`,
          logic: 'Plausible distractor'
        })
      }
      
      // Trim to exact number needed
      const finalOptions = validOptions.slice(0, numOptions)
      
      // Generate image if needed
      let imageUrl = question.image || ''
      if (shouldGenerateImages && imageUrl) {
        try {
          const generatedImage = await generateImageForQuestion(
            question.question,
            imageUrl
          )
          if (generatedImage) {
            imageUrl = generatedImage
          }
        } catch (error) {
          console.error('Error generating image:', error)
        }
      }
      
      validatedQuestions.push({
        question: String(question.question).trim(),
        options: finalOptions,
        image: imageUrl,
        solution: question.solution ? String(question.solution).trim() : ''
      })
    }
    
    if (validatedQuestions.length === 0) {
      throw new Error('No valid questions were generated')
    }
    
    return validatedQuestions.slice(0, numQuestions)
  } catch (error: any) {
    if (error instanceof SyntaxError) {
      throw new Error(`Failed to parse GPT response as JSON: ${error.message}`)
    }
    throw error
  }
}

