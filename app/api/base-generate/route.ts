import { NextRequest, NextResponse } from 'next/server'
import { getOpenAIClient } from '@/lib/openai'
import { loadCurriculumSubskills } from '@/lib/curriculum'

export async function POST(request: NextRequest) {
  try {
    const data = await request.json()
    
    // Validate required fields
    const requiredFields = ['stateStandards', 'gradeLevel', 'domain', 'difficultyLevel', 'numQuestions', 'model']
    for (const field of requiredFields) {
      if (!data[field]) {
        return NextResponse.json(
          { error: `Missing required field: ${field}` },
          { status: 400 }
        )
      }
    }
    
    const stateStandards = data.stateStandards || 'CCSS'
    const gradeLevel = data.gradeLevel || ''
    const domain = data.domain || ''
    const subSkill = data.subSkill || ''
    const difficultyLevel = data.difficultyLevel || 'Medium (Application)'
    const numQuestions = parseInt(data.numQuestions, 10) || 3
    const model = data.model || 'gpt-4o'
    
    // Load relevant subskills
    let subskillsText = 'General math concepts'
    if (gradeLevel && stateStandards) {
      const subskills = loadCurriculumSubskills(gradeLevel, stateStandards)
      subskillsText = subskills.slice(0, 4).join(', ') || 'General math concepts'
    }
    
    // Generate base questions
    const questions = await generateBaseQuestionsWithGPT(
      stateStandards,
      gradeLevel,
      domain,
      subSkill,
      difficultyLevel,
      numQuestions,
      subskillsText,
      model
    )
    
    return NextResponse.json({ questions })
  } catch (error: any) {
    console.error('Error generating base questions:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to generate base questions' },
      { status: 500 }
    )
  }
}

async function generateBaseQuestionsWithGPT(
  stateStandards: string,
  gradeLevel: string,
  domain: string,
  subSkill: string,
  difficultyLevel: string,
  numQuestions: number,
  subskillsText: string,
  model: string
) {
  // Build system prompt for BASE QUESTION GENERATION
  const systemPrompt = `You are an expert educational content generator specializing in creating high-quality, original mathematical questions aligned with US curricula standards. Your primary task is to generate pedagogically sound multiple-choice questions that assess specific mathematical skills and concepts based on curriculum standards, grade levels, and learning objectives.

CRITICAL: You are generating ORIGINAL BASE QUESTIONS, not variations of existing questions. These questions should be:
- Aligned with the specified curriculum standards (CCSS, TEKS, etc.)
- Appropriate for the specified grade level
- Focused on the specified domain and sub-skill
- Matched to the specified difficulty level
- Ready to be used as base questions for generating variations later

TIER 1: Universal System Requirements (Always Apply)

1.1 Curriculum Alignment (CRITICAL)
- Questions MUST align with the specified state standards (CCSS, TEKS, etc.)
- Questions MUST be appropriate for the specified grade level
- Questions MUST target the specified domain and sub-skill
- Questions MUST match the specified difficulty level

1.2 Mathematical Correctness (CRITICAL)
- All questions must be mathematically accurate
- Verify all calculations before finalizing
- Ensure solutions exist and are mathematically valid
- Check that all conditions are consistent with no contradictions

1.3 Answer Accuracy (CRITICAL - MUST VERIFY)
- CRITICAL: You MUST solve each question completely before marking any option as correct
- The correct answer must be verified by solving the problem step-by-step
- Work backward from the answer to confirm it satisfies all conditions
- Double-check all calculations to avoid errors
- DO NOT mark an option as "CA" (Correct Answer) unless you have verified it is mathematically correct
- If you are unsure, solve the problem completely first, then mark the verified correct answer

1.4 Number of Options
- Each question MUST have exactly 4 options (standard for multiple-choice questions)
- ONE and ONLY ONE option per question MUST have "logic": "CA" (Correct Answer)
- The other 3 options must be plausible distractors with error logic

1.5 Question Quality
- Questions must be clear, unambiguous, and test the intended skill
- Questions must be age-appropriate for the grade level
- Questions must use appropriate mathematical vocabulary for the grade level
- Questions must be free from bias and culturally sensitive

1.6 Solution Requirements
- Each question MUST include a complete, detailed step-by-step solution
- Solutions must be educational and easy to follow
- Solutions must show ALL steps and calculations
- Solutions must be formatted with each step on a new line using \\n

TIER 2: Difficulty Level Requirements

${difficultyLevel.includes('Easy') || difficultyLevel.includes('Recall') ? `
EASY (RECALL) LEVEL:
- Focus on basic recall of facts, definitions, and procedures
- Direct application of formulas or algorithms
- Single-step problems
- Minimal problem-solving complexity
- Examples: "What is 5 + 3?", "What is the area of a rectangle with length 4 and width 3?"
` : difficultyLevel.includes('Hard') || difficultyLevel.includes('Analysis') ? `
HARD (ANALYSIS) LEVEL:
- Require analysis, synthesis, and evaluation
- Multi-step problems with complex reasoning
- Problems requiring strategic thinking
- May involve multiple concepts or skills
- Examples: "A store has a sale where items are 20% off. If you also have a coupon for an additional 15% off the sale price, what is the total discount percentage?"
` : `
MEDIUM (APPLICATION) LEVEL:
- Require application of concepts to new situations
- Moderate problem-solving complexity
- May involve 2-3 steps
- Require understanding of relationships between concepts
- Examples: "Sarah has 3 times as many apples as Tom. If Tom has 5 apples, how many apples do they have together?"
`}

TIER 3: Domain and Sub-Skill Requirements

Domain: ${domain}
${subSkill ? `Sub-Skill: ${subSkill}` : 'Sub-Skill: General concepts within the domain'}
- Questions MUST focus on the specified domain
${subSkill ? '- Questions MUST specifically target the sub-skill: ' + subSkill : '- Questions should cover key concepts within the domain'}
- Questions should assess understanding and application of domain-specific skills
- Questions should be appropriate for Grade ${gradeLevel}

Curriculum Standards: ${stateStandards}
Grade Level: Grade ${gradeLevel}
Relevant Subskills: ${subskillsText}

CRITICAL REQUIREMENTS FOR OPTIONS AND CORRECT ANSWERS:

1. OPTIONS FORMAT:
   - Each option MUST have a "text" field containing a COMPLETE, MEANINGFUL answer
   - DO NOT use placeholder text like "Option A", "Option B", "Choice A", etc.
   - Each option MUST be a real, complete answer that a student could choose
   - Options should be in appropriate formats (whole numbers, fractions, decimals, expressions, etc.)

2. CORRECT ANSWER (CRITICAL - MUST BE VERIFIED):
   - ONE and ONLY ONE option per question MUST have "logic": "CA" (Correct Answer)
   - CRITICAL: You MUST solve each question completely before marking the correct answer
   - The correct answer MUST be mathematically correct - verify by solving the problem step-by-step
   - Work backward from your answer to confirm it satisfies all conditions in the question
   - Mark the correct answer clearly with "logic": "CA" - DO NOT mark incorrect answers as CA
   
   VERIFICATION PROCESS (MANDATORY - FOLLOW THESE STEPS):
   Step 1: Read the question carefully and identify what is being asked
   Step 2: Solve the problem completely step-by-step (show your work mentally)
   Step 3: Calculate the final answer
   Step 4: Verify your answer by plugging it back into the problem or checking it
   Step 5: Check that your answer satisfies all conditions in the question
   Step 6: Only then, mark the option with your verified answer as "logic": "CA"
   Step 7: Generate distractors (incorrect options) with appropriate logic

3. INCORRECT OPTIONS (DISTRACTORS):
   - Each incorrect option MUST have a "logic" field explaining the error
   - Logic must be SHORT (3-6 words) describing the mistake
   - Common error types: calculation errors, conceptual misunderstandings, procedural mistakes
   - Distractors should be plausible and reflect common student errors

4. STEP-BY-STEP SOLUTIONS (CRITICAL - MUST BE COMPLETE AND DETAILED):
   - Each question MUST include a COMPLETE, DETAILED step-by-step solution in the "solution" field
   - CRITICAL: The solution MUST be complete in all sense - show ALL steps, calculations, and reasoning
   - CRITICAL: Format each step on a NEW LINE using "Step 1:", "Step 2:", "Step 3:", etc.
   - Each step MUST be clearly separated and on its own line for readability
   - Include ALL intermediate calculations and explanations
   - Show the complete work from start to finish - do NOT skip steps
   - Verify the final answer matches the correct option
   - Make it educational and easy to follow - a student should be able to understand each step
   - CRITICAL: You MUST use \\n (newline character) between each step - do NOT put multiple steps on the same line
   - Example format: "Step 1: [First step explanation and calculation]\\nStep 2: [Second step explanation and calculation]\\nStep 3: [Final step and answer]"

OUTPUT FORMAT:

You MUST return a valid JSON array containing exactly ${numQuestions} question objects. Each question object MUST have this structure:

{
  "question": "[Question text aligned with curriculum standards]",
  "options": [
    {"text": "[Correct answer value]", "logic": "CA"},
    {"text": "[Distractor 1 value]", "logic": "[Error description]"},
    {"text": "[Distractor 2 value]", "logic": "[Error description]"},
    {"text": "[Distractor 3 value]", "logic": "[Error description]"}
  ],
  "image": "",
  "solution": "Step 1: [First step]\\nStep 2: [Second step]\\nStep 3: [Final step]"
}

CRITICAL JSON FORMAT REQUIREMENTS:
- You MUST return a valid JSON array starting with [ and ending with ]
- The array must contain exactly ${numQuestions} question objects
- Each question object must have exactly 4 options
- DO NOT include any text outside the JSON array
- DO NOT use markdown code blocks (no \`\`\`json or \`\`\`)
- DO NOT include explanations or text before or after the JSON
- Start response immediately with [
- End response with ]

QUALITY CHECKLIST (Self-Verify Before Finalizing):
✅ Question aligns with ${stateStandards} standards for Grade ${gradeLevel}
✅ Question targets the ${domain} domain${subSkill ? ' and ' + subSkill + ' sub-skill' : ''}
✅ Question matches ${difficultyLevel} difficulty level
✅ Correct answer is mathematically verified
✅ Exactly 4 options provided
✅ Only one option marked as "CA"
✅ Each distractor has appropriate error logic
✅ Solution is COMPLETE with ALL steps shown
✅ Solution is formatted with each step on a new line using \\n
✅ Question is clear, unambiguous, and age-appropriate
✅ No mathematical errors or logical contradictions

CRITICAL FINAL REMINDER:
- You MUST return EXACTLY ${numQuestions} questions in the JSON array
- Each question MUST have EXACTLY 4 options - NO MORE, NO LESS
- Each solution MUST have steps on SEPARATE LINES using \\n - do NOT put multiple steps on the same line
- Solution format must be: "Step 1: ...\\nStep 2: ...\\nStep 3: ..." (with \\n between each step)
- Verify that each question aligns with the curriculum standards and grade level
- Verify that each question targets the specified domain and sub-skill
- Verify that each question matches the difficulty level
- Count your questions: The array must have exactly ${numQuestions} elements, no more, no less
- Count options in EACH question: Every question must have exactly 4 options
- Verify before submitting: Check that your JSON array contains exactly ${numQuestions} question objects
- Verify before submitting: Check that EACH question object has exactly 4 options in its options array
- Verify before submitting: Check that EACH solution has steps separated by \\n (newline characters)
- The array must start with [ and end with ]
- DO NOT return fewer than ${numQuestions} questions
- DO NOT return more than ${numQuestions} questions
- DO NOT add extra options or remove options - the count must match exactly
- DO NOT put multiple solution steps on the same line - each step MUST be on its own line with \\n`

  // Build user prompt
  const userPrompt = `Generate ${numQuestions} original base question(s) with the following specifications:

CURRICULUM ALIGNMENT:
- State Standards: ${stateStandards}
- Grade Level: Grade ${gradeLevel}
- Domain: ${domain}
${subSkill ? `- Sub-Skill: ${subSkill}` : '- Sub-Skill: General concepts within the domain'}
- Difficulty Level: ${difficultyLevel}
- Relevant Subskills: ${subskillsText}

REQUIREMENTS:
1. Each question must be an ORIGINAL question (not a variation of an existing question)
2. Questions must align with ${stateStandards} standards for Grade ${gradeLevel}
3. Questions must focus on ${domain}${subSkill ? ', specifically targeting ' + subSkill : ''}
4. Questions must match the ${difficultyLevel} difficulty level
5. Each question must have exactly 4 options
6. Each question must include a complete step-by-step solution
7. Solutions must be formatted with each step on a new line using \\n

Generate ${numQuestions} high-quality, curriculum-aligned base question(s) now.`

  try {
    const client = getOpenAIClient()
    
    // Calculate tokens needed
    const tokensPerQuestion = 600 // Base questions may need more tokens
    let tokensNeeded = Math.max(2000, tokensPerQuestion * numQuestions)
    tokensNeeded = Math.min(8000, tokensNeeded)
    
    // Set temperature for base question generation (slightly higher for creativity)
    const temperature = 0.8
    
    const apiParams: any = {
      model: model,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      max_tokens: tokensNeeded,
      temperature: temperature,
    }
    
    let response
    try {
      response = await client.chat.completions.create(apiParams)
    } catch (error: any) {
      // If model is not available, fallback to gpt-4o
      if ((model === 'gpt-5' || model === 'o3' || model === 'o4-mini') && 
          (error?.message?.includes('model') || error?.code === 'model_not_found')) {
        console.warn(`${model} not available, falling back to GPT-4o`)
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
    let jsonContent = content.trim()
    
    // Remove markdown code blocks if present
    if (jsonContent.startsWith('```json')) {
      jsonContent = jsonContent.replace(/^```json\s*/, '').replace(/\s*```$/, '')
    } else if (jsonContent.startsWith('```')) {
      jsonContent = jsonContent.replace(/^```\s*/, '').replace(/\s*```$/, '')
    }
    
    // Extract JSON array
    const jsonMatch = jsonContent.match(/\[[\s\S]*\]/)
    if (jsonMatch) {
      jsonContent = jsonMatch[0]
    }
    
    let questions
    try {
      questions = JSON.parse(jsonContent)
    } catch (parseError) {
      console.error('JSON parse error:', parseError)
      console.error('Content:', jsonContent)
      throw new Error('Failed to parse JSON response from GPT')
    }
    
    if (!Array.isArray(questions)) {
      throw new Error('GPT did not return an array of questions')
    }
    
    // Validate and clean questions
    const validatedQuestions = questions
      .filter((q: any) => q && typeof q === 'object')
      .map((q: any, index: number) => {
        // Ensure required fields
        const question: any = {
          question: q.question || `Question ${index + 1}`,
          options: Array.isArray(q.options) ? q.options : [],
          image: q.image || '',
          solution: q.solution || ''
        }
        
        // Ensure exactly 4 options
        if (question.options.length !== 4) {
          // Pad or trim to 4 options
          while (question.options.length < 4) {
            question.options.push({
              text: `Option ${String.fromCharCode(65 + question.options.length)}`,
              logic: 'Placeholder'
            })
          }
          question.options = question.options.slice(0, 4)
        }
        
        // Ensure at least one CA
        const hasCA = question.options.some((opt: any) => opt.logic === 'CA')
        if (!hasCA && question.options.length > 0) {
          question.options[0].logic = 'CA'
        }
        
        return question
      })
    
    if (validatedQuestions.length === 0) {
      throw new Error('No valid questions were generated. Please check the parameters and try again.')
    }
    
    if (validatedQuestions.length < numQuestions) {
      console.warn(`Only ${validatedQuestions.length} valid question(s) were generated, but ${numQuestions} were requested.`)
    }
    
    return validatedQuestions.slice(0, numQuestions)
  } catch (error: any) {
    console.error('Error in generateBaseQuestionsWithGPT:', error)
    throw error
  }
}

