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
    const imageFiles = data.imageFiles || [] // Array of base64 encoded images
    const numQuestions = parseInt(data.numCopyQuestions, 10)
    const model = data.model || 'gpt-4o'
    const questionTypeFromUrl = data.questionType || null
    
    // Generate questions
    const questions = await generateQuestionsWithGPT(
      baseQuestion,
      notes,
      solution,
      images,
      imageFiles,
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
  const imageInfo = images ? `\nBase Question Image Description: ${images}` : ''
  const uploadedImageInfo = imageFiles.length > 0 
    ? `\nBase Question Uploaded Images: ${imageFiles.length} image(s) uploaded. These images are provided as base64 data and should be used as reference for generating similar visual elements.`
    : ''
  const shouldGenerateImages = Boolean(images || imageFiles.length)
  
  let userPrompt = ''
  
  if (questionType === 'image_based') {
    userPrompt = `${'='.repeat(80)}
⚠️⚠️⚠️ CRITICAL: YOU MUST GENERATE EXACTLY ${numQuestions} IMAGE-BASED QUESTIONS ⚠️⚠️⚠️
${'='.repeat(80)}
If this says ${numQuestions}, you MUST return ${numQuestions} question objects.
DO NOT return only 1 question. DO NOT return fewer than ${numQuestions}.
FAILURE TO RETURN ${numQuestions} QUESTIONS WILL CAUSE AN ERROR.

🔥 YOUR RESPONSE MUST START WITH [ AND END WITH ] 🔥
🔥 DO NOT START WITH { OR RETURN A SINGLE OBJECT 🔥
🔥 YOU MUST RETURN AN ARRAY: [{...}, {...}, ...] 🔥
${'='.repeat(80)}

IMAGE-BASED QUESTION GENERATION

INPUT PROVIDED:

BASE QUESTION:
${baseQuestion}

${images ? `IMAGE DESCRIPTION:
${images}` : ''}${imageFiles.length > 0 ? `\n\nUPLOADED IMAGES: ${imageFiles.length} image(s) have been uploaded. Use these images as reference for the visual elements, dimensions, angles, and other details needed to generate similar questions.` : ''}${!images && imageFiles.length === 0 ? '\nIMAGE DESCRIPTION: [Provided in base question or notes]' : ''}

SME NOTES:
${notes || 'None - No specific notes provided'}

${solution ? `BASE SOLUTION:
${solution}` : ''}

${curriculum && grade ? `Curriculum: ${curriculum} | Grade: ${grade} | Difficulty: ${difficulty}` : difficulty ? `Difficulty: ${difficulty}` : ''}
Subskills: ${subskillsText.substring(0, 200)}

CRITICAL REQUIREMENTS FOR IMAGE-BASED QUESTIONS:

1. INPUT FORMAT UNDERSTANDING:
   - The base question contains the complete question text with logic for correct answer and wrong options
   - Image description is provided between the question text and options (or in the image description field)
   - Image description includes detailed visual elements: sides, angles, equation of line/function for graph, table values, etc.
   - ${imageFiles.length > 0 ? `UPLOADED IMAGES: ${imageFiles.length} image(s) have been uploaded as base64 data. Use these images as reference for understanding the visual elements, dimensions, angles, and other details. Generate similar questions based on these uploaded images.` : ''}
   - SME notes contain specific variations needed in copy questions and options, plus any constraints

2. OUTPUT FORMAT - For EACH of the ${numQuestions} copy questions, you MUST provide:

   a) IMAGE DESCRIPTION: Detailed description of the visual element including:
      - Sides, angles, dimensions (for geometric figures)
      - Equation of the line or function for which graph is needed (for graphs)
      - Table values (for data tables)
      - Any other visual elements relevant to the question
      - The image description MUST be different for each question while maintaining the same mathematical concept

   b) QUESTION: The question text based on the new image. The question must:
      - Reference specific elements in the image description
      - Maintain the same mathematical concept as the base question
      - Use the same phrasing style and structure as the base question
      - Be mathematically correct and logically sound

   c) SOLUTION: Step-by-step solution with explicit reference to image elements:
      - Reference specific parts of the image description (e.g., "Using the angle shown in the triangle...", "From the graph, we can see...")
      - Show clear logical progression from problem to answer
      - Make it educational and easy to follow

   d) CORRECT ANSWER (CA): The final answer clearly marked with "CA" logic

   e) DISTRACTORS: Exactly ${numOptions - 1} distractors (incorrect options) based on the number of options in the base question. Each distractor MUST:
      - Have a specific value/answer
      - Include logic explaining the VISUAL MISINTERPRETATION that leads to this distractor
      - Logic should describe how misreading or misinterpreting the image would lead to this wrong answer
      - Examples of visual misinterpretation logic:
        * "Misread angle measurement from protractor"
        * "Counted wrong number of sides/shapes"
        * "Misinterpreted graph scale or axis labels"
        * "Read wrong value from table"
        * "Confused similar-looking angles or lengths"
        * "Misread coordinate points on graph"

3. IMAGE VARIATION REQUIREMENTS:
   - Each of the ${numQuestions} questions MUST have a DIFFERENT image description
   - Change visual elements (sides, angles, graph equations, table values) while maintaining the same mathematical concept
   - Ensure all images are mathematically valid and consistent with their descriptions
   - Do NOT repeat the same image description across questions

4. SME NOTES COMPLIANCE:
   - All SME notes provided above MUST be strictly followed
   - Incorporate any specific requirements, constraints, or guidelines from SME notes into every generated question

5. MATHEMATICAL CORRECTNESS:
   - Every question MUST be mathematically correct
   - All calculations, operations, and numerical relationships must be accurate and verifiable
   - The image description must be consistent with the question and solution

6. PHRASING CONSISTENCY:
   - The phrasing, wording style, sentence structure, and grammatical patterns MUST match the base question's reference phrasing
   - Preserve the exact tone, formality level, and linguistic style of the base question

JSON FORMAT REQUIREMENTS:
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

⚠️⚠️⚠️ CRITICAL: You MUST return EXACTLY ${numQuestions} question objects in a JSON array. DO NOT return only one question.

Each question object MUST have this structure:
{
  "image": "[Detailed image description with sides, angles, equations, table values, etc.]",
  "question": "[Question text referencing the image]",
  "solution": "[Step-by-step solution with reference to image elements]",
  "options": [
    {"text": "[Correct answer value]", "logic": "CA"},
    {"text": "[Distractor 1 value]", "logic": "[Visual misinterpretation that leads to this]"},
    {"text": "[Distractor 2 value]", "logic": "[Visual misinterpretation that leads to this]"},
    ...
  ]
}

CRITICAL: Each "options" array MUST contain EXACTLY ${numOptions} option objects:
- ONE option with "logic": "CA" (the correct answer)
- ${numOptions - 1} distractors, each with logic explaining the VISUAL MISINTERPRETATION

Example structure for ${numOptions} options:
"options": [
  {"text": "45°", "logic": "CA"},
  {"text": "30°", "logic": "Misread angle measurement from protractor"},
  {"text": "60°", "logic": "Confused complementary angle"},
  {"text": "90°", "logic": "Misinterpreted right angle indicator"}
]

DO NOT return placeholder text like "Option A", "Option B", etc. Each option MUST be a complete, valid answer choice.

Your response should look like this (example for ${numQuestions} questions):
[
  {
    "image": "A right triangle with sides labeled: base = 3 cm, height = 4 cm, hypotenuse = 5 cm. The right angle is at the bottom left corner.",
    "question": "What is the area of the triangle shown?",
    "solution": "Step 1: Identify the base and height from the image. Base = 3 cm, Height = 4 cm. Step 2: Apply area formula: Area = (1/2) × base × height = (1/2) × 3 × 4 = 6 cm²",
    "options": [
      {"text": "6 cm²", "logic": "CA"},
      {"text": "12 cm²", "logic": "Forgot to multiply by 1/2"},
      {"text": "7 cm²", "logic": "Added base and height instead of multiplying"},
      {"text": "5 cm²", "logic": "Used hypotenuse length instead of height"}
    ]
  },
  ...
]

You MUST return an array with ${numQuestions} objects, starting with [ and ending with ].`
  } else if (questionType === 'mathematical') {
    userPrompt = `Generate EXACTLY ${numQuestions} questions. Return JSON array starting with [ and ending with ].

Generate ${numQuestions} MCQ questions with ${numOptions} options each. Base Question: ${baseQuestion}

${notes ? `SME NOTES (CRITICAL - MUST FOLLOW IN ADDITION TO ALL PROMPT INSTRUCTIONS):
${notes}
YOU MUST FOLLOW THE SME NOTES ABOVE IN ADDITION TO ALL OTHER INSTRUCTIONS. Incorporate any specific requirements, constraints, or guidelines from the SME notes into every generated question.\n` : ''}${solution ? `Base Solution: ${solution}\n` : ''}${imageInfo ? `${imageInfo}\n` : ''}

Rules:
- CRITICAL: All SME notes provided above MUST be strictly followed. Incorporate any specific requirements, constraints, or guidelines from SME notes into every generated question.
- Keep EXACTLY the SAME phrasing and structure, change ONLY the numbers
- Each question MUST have EXACTLY ${numOptions} options (same as base question)
- ONE option per question must be marked "CA" (Correct Answer)
- Incorrect options logic must be SHORT (3-6 words) based on student errors
- Examples: "CA", "Added instead of multiplied", "Forgot to carry over"

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

WORD PROBLEM GENERATION REQUIREMENTS:
1. SME NOTES COMPLIANCE: All SME notes provided above MUST be strictly followed. Incorporate any specific requirements, constraints, or guidelines from the SME notes into every generated question.

2. MATHEMATICAL CORRECTNESS: Every question MUST be mathematically correct. All calculations, operations, and numerical relationships must be accurate and verifiable.

3. STEP-BY-STEP SOLUTIONS: Each question MUST include a brief, clear step-by-step solution in the "solution" field. Show the logical progression from the problem statement to the final answer, making it educational and easy to follow.

4. NO SCENARIO REPETITION: Each of the ${numQuestions} questions MUST use a DIFFERENT scenario. Do NOT repeat the same scenario, context, names, or situations across multiple questions. Each question should be unique in its context.

5. VARIED SCENARIOS: Use DIFFERENT scenarios beyond just the one provided in the base question. While maintaining the same mathematical concept, explore various real-world contexts, settings, and situations. Do NOT limit yourself to only the scenario from the base question.

6. LOGICAL AND REALISTIC POSSIBILITY: All questions MUST be logically sound and realistically possible. Scenarios should make sense in the real world, with numbers and situations that are believable and appropriate for the grade level.

7. SCENARIO DIVERSITY: Provide a wide variety of different scenarios across all ${numQuestions} questions. Use diverse contexts such as different settings (school, store, park, home, etc.), different people/characters, different items/objects, and different situations while maintaining the same mathematical structure.

8. PHRASING CONSISTENCY: The phrasing, wording style, sentence structure, and grammatical patterns MUST match the base question's reference phrasing. Preserve the exact tone, formality level, and linguistic style of the base question.

Rules:
- ${questionType}: CHANGE ONLY the context/real-life scenario, keep the SAME math operation, structure, and question format. Preserve the same wording style and structure.
- CRITICAL: Each copy question MUST match the base question's sentence structure, phrasing, word order, and grammatical style
- CRITICAL: Number of options MUST match the base question: Each question MUST have EXACTLY ${numOptions} options (same as the base question). DO NOT generate more or fewer options.
- ONE option per question must be marked "CA" (Correct Answer)
- ALL copy questions must have the SAME number of options (${numOptions} options) as the base question
- CRITICAL: Each option's "text" field MUST contain a COMPLETE, MEANINGFUL answer choice - NOT placeholder text
- FORBIDDEN: DO NOT use placeholder text like "Option A", "Option B", "Choice A", etc. in the "text" field
- Each option MUST be a real, complete answer that a student could choose (e.g., "5 + 7", "12", "5 - 7", "5 × 7")
- CRITICAL: Incorrect options MUST be based on ACTUAL ERRORS students would make when solving the BASE QUESTION or similar problems
- Logic must be SHORT (3-6 words) and SPECIFIC to the question type
- Examples: "CA", "Added instead of multiplied", "Forgot to carry over", "Wrong order of operations", "Place value mistake", "Used subtraction instead"
${solution ? 'IMPORTANT: Generate a brief step-by-step solution for each question based on the base solution. Adapt the steps to match each question\'s numbers/context while keeping the same solution approach. Show clear, logical progression from problem to answer.' : 'IMPORTANT: Generate a brief step-by-step solution for each question showing the logical progression from the problem statement to the final answer.'}

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

CRITICAL: Each "options" array MUST contain EXACTLY ${numOptions} option objects. Each option object MUST have:
- "text": A complete, meaningful answer choice (NOT placeholder text like "Option A")
- "logic": Either "CA" for the correct answer, or a short description of the error (e.g., "Added instead of multiplied")

Example of correct options format:
"options": [
  {"text": "5 + 7", "logic": "CA"},
  {"text": "5 - 7", "logic": "Used subtraction instead"},
  {"text": "5 × 7", "logic": "Used multiplication instead"}
]

DO NOT return placeholder text like "Option A", "Option B", etc. Each option MUST be a complete, valid answer choice.

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
      model: model, // Supports gpt-5, gpt-4o, gpt-4-turbo, gpt-4
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      max_tokens: tokensNeeded,
      temperature: 0.7,
    }
    
    let response
    try {
      response = await client.chat.completions.create(apiParams)
    } catch (error: any) {
      // If gpt-5 is not available, fallback to gpt-4o
      if (model === 'gpt-5' && (error?.message?.includes('model') || error?.code === 'model_not_found')) {
        console.warn('GPT-5 not available, falling back to GPT-4o')
        apiParams.model = 'gpt-4o'
        response = await client.chat.completions.create(apiParams)
      } else {
        throw error
      }
    }
    
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
      
      if (!question.question) {
        console.warn(`Question ${idx + 1}: Missing question text`)
        continue
      }
      
      if (!question.options || !Array.isArray(question.options)) {
        console.warn(`Question ${idx + 1}: Missing or invalid options array. Received:`, question.options)
        continue
      }
      
      // Log original options for debugging
      if (question.options.length === 0 || question.options.some((opt: any) => !opt || !opt.text || opt.text.trim() === '')) {
        console.warn(`Question ${idx + 1}: Options are empty or invalid. Original options:`, JSON.stringify(question.options))
      }
      
      // Ensure correct number of options
      let options = question.options
      if (options.length !== numOptions) {
        if (options.length < numOptions) {
          console.warn(`Question ${idx + 1}: Only ${options.length} options provided, expected ${numOptions}`)
        } else {
          console.warn(`Question ${idx + 1}: ${options.length} options provided, expected ${numOptions}, trimming`)
          options = options.slice(0, numOptions)
        }
      }
      
      // Validate options - filter out empty or invalid ones
      const validOptions = []
      let hasCorrectAnswer = false
      
      for (const option of options) {
        // Skip options without text or with empty/placeholder text
        if (!option || !option.text || typeof option.text !== 'string') {
          console.warn(`Question ${idx + 1}: Skipping invalid option:`, option)
          continue
        }
        
        const optionText = option.text.trim()
        
        // Skip placeholder text like "Option A", "Option B", etc.
        if (optionText.match(/^Option\s+[A-Z]$/i) || optionText === '' || optionText.length < 2) {
          console.warn(`Question ${idx + 1}: Skipping placeholder or empty option: "${optionText}"`)
          continue
        }
        
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
        
        validOptions.push({
          text: optionText,
          logic: option.logic
        })
      }
      
      // If no valid options were found, log error and skip this question
      if (validOptions.length === 0) {
        console.error(`Question ${idx + 1}: No valid options found after validation. Original options:`, JSON.stringify(question.options))
        continue
      }
      
      // If no correct answer found, mark first option as CA
      if (!hasCorrectAnswer && validOptions.length > 0) {
        validOptions[0].logic = 'CA'
      }
      
      // If we don't have enough valid options, pad with placeholders as last resort
      // This should rarely happen if GPT generates properly, but we need to ensure we have the right number
      if (validOptions.length < numOptions) {
        console.error(`Question ${idx + 1}: Only ${validOptions.length} valid options found, expected ${numOptions}. Padding with placeholders.`)
        // Only add placeholders if we have at least one valid option
        // This indicates GPT partially generated options but not enough
        while (validOptions.length < numOptions) {
          validOptions.push({
            text: `Option ${String.fromCharCode(65 + validOptions.length)}`,
            logic: 'Plausible distractor'
          })
        }
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

