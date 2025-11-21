import { NextRequest, NextResponse } from 'next/server'
import { generateWithAI, getAIProvider } from '@/lib/ai-client'
import { loadCurriculumSubskills } from '@/lib/curriculum'

export async function POST(request: NextRequest) {
  try {
    const data = await request.json()
    
    // Validate required fields
    const requiredFields = ['stateStandards', 'gradeLevel', 'domain', 'model']
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
    const standardCode = data.standardCode || ''
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
      standardCode,
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
  standardCode: string,
  subskillsText: string,
  model: string
) {
  // Build system prompt for BASE QUESTION GENERATION
  const systemPrompt = `You are an expert educational content generator specializing in creating high-quality, original mathematical questions aligned with US curricula standards. Your primary task is to generate pedagogically sound multiple-choice questions that assess specific mathematical skills and concepts based on curriculum standards, grade levels, and learning objectives.

CRITICAL: You are generating ORIGINAL BASE QUESTIONS, not variations of existing questions. These questions should be:
- Aligned with the specified curriculum standards (CCSS, TEKS, etc.)
- Appropriate for the specified grade level
- Focused on the specified domain and sub-skill
- Aligned with the specified standard code (if provided)
- Ready to be used as base questions for generating variations later

TIER 1: Universal System Requirements (Always Apply)

1.1 Curriculum Alignment (CRITICAL)
- Questions MUST align with the specified state standards (CCSS, TEKS, etc.)
- Questions MUST be appropriate for the specified grade level
- Questions MUST target the specified domain and sub-skill
- Questions MUST align with the specified standard code (if provided)

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

TIER 2: Standard Code and Curriculum Alignment

${standardCode ? `
STANDARD CODE REQUIREMENTS:
- The question MUST align with the specified standard code: ${standardCode}
- The standard code provides specific learning objectives and expectations
- Ensure the question directly addresses the skills and knowledge specified in the standard code
- The question should be appropriate for the grade level associated with the standard code
` : `
STANDARD CODE:
- No specific standard code provided. Generate questions that align with the general domain and sub-skill requirements.
`}

TIER 3: SCAFFOLDING AND DIFFICULTY PROGRESSION (CRITICAL)

You MUST generate exactly 3 questions with proper scaffolding across difficulty levels:
1. EASY question
2. MEDIUM question  
3. HARD question

SCAFFOLDING REQUIREMENTS (CRITICAL):
- The 3 questions MUST form a coherent learning progression for the sub-skill: ${subSkill || domain}
- Each question must build upon the previous one, showing subtle but clear progression
- ALL concepts related to the sub-skill MUST be covered across the 3 questions
- The progression should be natural and pedagogically sound
- Questions should cover different aspects or applications of the sub-skill

DIFFICULTY LEVEL DEFINITIONS (CRITICAL - NOT ALWAYS APPLICATION/ANALYSIS):

EASY LEVEL:
- Focus on basic understanding and recall
- Direct application of fundamental concepts
- Single-step or simple two-step problems
- Minimal cognitive load
- Clear, straightforward problems
- Examples: Basic calculations, identifying patterns, simple definitions
- DO NOT force "application" if the sub-skill doesn't require real-world scenarios
- If sub-skill is procedural (e.g., "Addition", "Multiplication"), Easy should test basic computation
- If sub-skill is conceptual (e.g., "Area", "Perimeter"), Easy should test basic understanding

MEDIUM LEVEL:
- Require understanding of relationships and connections
- May involve 2-3 steps or combining concepts
- Moderate complexity in reasoning
- May require strategic thinking or problem-solving
- DO NOT automatically use "application" or real-world scenarios unless the sub-skill naturally demands it
- If sub-skill is procedural, Medium should test procedural fluency with slightly more complexity
- If sub-skill is conceptual, Medium should test deeper understanding and connections
- Only use real-world scenarios if the sub-skill (e.g., "Word Problems", "Measurement", "Money") naturally involves application

HARD LEVEL:
- Require deeper understanding, synthesis, or evaluation
- Multi-step problems with complex reasoning
- May involve multiple concepts or strategic thinking
- Higher cognitive demand
- DO NOT automatically use "analysis" unless the sub-skill naturally requires it
- If sub-skill is procedural, Hard should test mastery with complex procedures or non-routine problems
- If sub-skill is conceptual, Hard should test synthesis, evaluation, or complex problem-solving
- Only use analysis-level thinking if the sub-skill naturally demands it (e.g., "Problem Solving", "Critical Thinking")

CRITICAL SCAFFOLDING RULES:
1. EASY → MEDIUM → HARD must show clear but subtle progression
2. Each question should introduce slightly more complexity than the previous
3. All questions must cover different aspects of the sub-skill to ensure complete coverage
4. The progression should feel natural, not forced
5. If Easy tests basic computation, Medium should test computation with complexity, Hard should test non-routine computation
6. If Easy tests basic understanding, Medium should test application of understanding, Hard should test synthesis
7. Cover ALL key concepts of the sub-skill across the 3 questions
8. Ensure each question addresses a different facet or application of the sub-skill

TIER 4: Domain and Sub-Skill Requirements

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
   Step 7: Generate distractors (incorrect options) based on COMMON MISTAKES students make for the sub-skill: ${subSkill || domain}
   Step 8: For each distractor, provide a "logic" field explaining the specific error related to ${subSkill || domain}

3. INCORRECT OPTIONS (DISTRACTORS) - CRITICAL: SUB-SKILL SPECIFIC COMMON MISTAKES:
   - CRITICAL: Each incorrect option MUST be based on COMMON MISTAKES that students make specifically for the sub-skill: ${subSkill || domain}
   - CRITICAL: The distractors must reflect REAL, AUTHENTIC student errors related to this sub-skill
   - Each incorrect option MUST have a "logic" field explaining the specific mistake
   - Logic must be SHORT (3-6 words) describing the mistake clearly
   - The logic MUST be specific to the sub-skill and explain WHY students make this mistake
   - Common error types for this sub-skill: calculation errors, conceptual misunderstandings, procedural mistakes, misapplication of rules/formulas
   - Distractors should be plausible and reflect common student errors SPECIFIC TO THIS SUB-SKILL
   - DO NOT use generic errors - use errors that are specifically related to ${subSkill || domain}
   - Research common misconceptions and mistakes students make when learning ${subSkill || domain}
   - Examples of sub-skill specific errors:
     * For "Addition": "Forgot to carry over", "Added ones place incorrectly", "Mixed up place values"
     * For "Fractions": "Added numerators and denominators", "Forgot to find common denominator", "Incorrectly simplified"
     * For "Area": "Used perimeter formula", "Forgot to multiply by 1/2 for triangle", "Mixed up length and width"
   - The logic field MUST be present for ALL options (including correct answer marked as "CA")

4. STEP-BY-STEP SOLUTIONS (CRITICAL - MUST BE EXTREMELY DETAILED AND COMPREHENSIVE):
   - Each question MUST include a COMPLETE, EXTREMELY DETAILED step-by-step solution in the "solution" field
   - CRITICAL: The solution MUST be comprehensive and detailed in ALL aspects - show EVERY step, EVERY calculation, and EVERY piece of reasoning
   - CRITICAL: Format each step on a NEW LINE using "Step 1:", "Step 2:", "Step 3:", etc.
   - Each step MUST be clearly separated and on its own line for readability
   
   DETAILED SOLUTION REQUIREMENTS (MANDATORY):
   - Show ALL intermediate calculations - do NOT skip any arithmetic operations
   - Show ALL formula applications - write out the formula, then substitute values, then calculate
   - Show ALL substitutions - explicitly show what values are being substituted where
   - Include ALL unit conversions if applicable - show the conversion factor and calculation
   - Show ALL algebraic manipulations - show each algebraic step clearly
   - Explain the REASONING behind each step - why is this step necessary? What does it accomplish?
   - Show ALL arithmetic operations - break down complex calculations into simpler steps
   - Include ALL simplifications - show how fractions are simplified, how expressions are reduced
   - Show ALL checks or verifications - verify intermediate results when appropriate
   - Include ALL rounding or approximation steps if applicable - show how numbers are rounded
   - Show the complete work from start to finish - do NOT skip ANY steps, even if they seem obvious
   - Verify the final answer matches the correct option
   - Make it educational and easy to follow - a student should be able to understand and replicate each step
   - For word problems: Show how to extract information, set up equations, solve, and interpret results
   - For geometry problems: Show all formula applications, substitutions, and calculations
   - For algebraic problems: Show all algebraic manipulations, simplifications, and solution steps
   - For computational problems: Show all arithmetic operations, not just the final result
   
   CRITICAL FORMATTING REQUIREMENTS:
   - CRITICAL: You MUST use \\n (newline character) between each step - do NOT put multiple steps on the same line
   - Each step should be self-contained and clear
   - Use clear mathematical notation
   - Show work vertically when appropriate (e.g., for multi-digit multiplication, long division)
   
   EXAMPLE OF DETAILED SOLUTION FORMAT:
   "Step 1: Identify what is being asked. [Explanation of what needs to be found]\\n
   Step 2: Identify the given information. [List all given values and conditions]\\n
   Step 3: Determine the approach/formula to use. [Explain which formula or method applies and why]\\n
   Step 4: Write down the formula. [Show the complete formula]\\n
   Step 5: Substitute the given values into the formula. [Show: Formula with values = ...]\\n
   Step 6: Perform the calculations step by step. [Show each arithmetic operation separately]\\n
   Step 7: Simplify the result. [Show any simplifications needed]\\n
   Step 8: Verify the answer. [Check if the answer makes sense or verify by substitution]\\n
   Step 9: State the final answer. [Clearly state the answer with appropriate units if needed]"
   
   - For EASY questions: Solutions should still be detailed but may have fewer steps (3-5 steps)
   - For MEDIUM questions: Solutions should be moderately detailed (5-7 steps)
   - For HARD questions: Solutions should be very detailed and comprehensive (7-10+ steps)
   - DO NOT abbreviate or skip steps - every calculation and reasoning must be shown

OUTPUT FORMAT:

You MUST return a valid JSON array containing exactly 3 question objects (one for each difficulty level). Each question object MUST have this structure:

[
  {
    "difficulty": "Easy",
    "question": "[Question text for EASY level - basic understanding/recall]",
    "options": [
      {"text": "[Correct answer value]", "logic": "CA"},
      {"text": "[Distractor 1 - based on common mistake for ${subSkill || domain}]", "logic": "[Specific error related to ${subSkill || domain}]"},
      {"text": "[Distractor 2 - based on common mistake for ${subSkill || domain}]", "logic": "[Specific error related to ${subSkill || domain}]"},
      {"text": "[Distractor 3 - based on common mistake for ${subSkill || domain}]", "logic": "[Specific error related to ${subSkill || domain}]"}
    ],
    "image": "",
    "solution": "Step 1: [Identify what is being asked - detailed explanation]\\nStep 2: [Identify given information - list all values]\\nStep 3: [Determine approach/formula - explain why]\\nStep 4: [Write formula and substitute values - show all substitutions]\\nStep 5: [Perform calculations step by step - show all arithmetic]\\nStep 6: [Simplify result - show simplifications]\\nStep 7: [State final answer with verification]"
  },
  {
    "difficulty": "Medium",
    "question": "[Question text for MEDIUM level - moderate complexity, builds on Easy]",
    "options": [
      {"text": "[Correct answer value]", "logic": "CA"},
      {"text": "[Distractor 1 - based on common mistake for ${subSkill || domain}]", "logic": "[Specific error related to ${subSkill || domain}]"},
      {"text": "[Distractor 2 - based on common mistake for ${subSkill || domain}]", "logic": "[Specific error related to ${subSkill || domain}]"},
      {"text": "[Distractor 3 - based on common mistake for ${subSkill || domain}]", "logic": "[Specific error related to ${subSkill || domain}]"}
    ],
    "image": "",
    "solution": "Step 1: [Identify what is being asked - detailed explanation]\\nStep 2: [Identify given information - list all values and conditions]\\nStep 3: [Determine approach/formula - explain which method and why]\\nStep 4: [Write formula and substitute values - show all substitutions explicitly]\\nStep 5: [Perform intermediate calculations - show each operation]\\nStep 6: [Continue calculations - show next set of operations]\\nStep 7: [Simplify result - show all simplifications]\\nStep 8: [Verify answer - check if it makes sense]\\nStep 9: [State final answer with appropriate units]"
  },
  {
    "difficulty": "Hard",
    "question": "[Question text for HARD level - highest complexity, builds on Medium]",
    "options": [
      {"text": "[Correct answer value]", "logic": "CA"},
      {"text": "[Distractor 1 - based on common mistake for ${subSkill || domain}]", "logic": "[Specific error related to ${subSkill || domain}]"},
      {"text": "[Distractor 2 - based on common mistake for ${subSkill || domain}]", "logic": "[Specific error related to ${subSkill || domain}]"},
      {"text": "[Distractor 3 - based on common mistake for ${subSkill || domain}]", "logic": "[Specific error related to ${subSkill || domain}]"}
    ],
    "image": "",
    "solution": "Step 1: [Identify what is being asked - comprehensive explanation]\\nStep 2: [Identify given information - list all values, conditions, and constraints]\\nStep 3: [Determine approach/strategy - explain the multi-step plan]\\nStep 4: [Write first formula/equation - show complete formula]\\nStep 5: [Substitute values into first formula - show all substitutions]\\nStep 6: [Perform first set of calculations - show all arithmetic operations]\\nStep 7: [Write second formula/equation if needed - show complete formula]\\nStep 8: [Substitute intermediate results - show how values are used]\\nStep 9: [Perform second set of calculations - show all operations]\\nStep 10: [Continue with additional steps if needed - show all work]\\nStep 11: [Simplify final result - show all simplifications and reductions]\\nStep 12: [Verify answer - check against conditions and reasonableness]\\nStep 13: [State final answer with complete interpretation]"
  }
]

CRITICAL JSON FORMAT REQUIREMENTS:
- You MUST return a valid JSON array starting with [ and ending with ]
- The array must contain exactly 3 question objects (Easy, Medium, Hard in that order)
- Each question object must have exactly 4 options
- Each question object must include a "difficulty" field ("Easy", "Medium", or "Hard")
- DO NOT include any text outside the JSON array
- DO NOT use markdown code blocks (no \`\`\`json or \`\`\`)
- DO NOT include explanations or text before or after the JSON
- Start response immediately with [
- End response with ]

QUALITY CHECKLIST (Self-Verify Before Finalizing):
✅ All 3 questions align with ${stateStandards} standards for Grade ${gradeLevel}
✅ All 3 questions target the ${domain} domain${subSkill ? ' and ' + subSkill + ' sub-skill' : ''}
${standardCode ? `✅ All 3 questions align with standard code: ${standardCode}` : ''}
✅ Proper scaffolding: Easy → Medium → Hard shows clear progression
✅ All concepts of the sub-skill are covered across the 3 questions
✅ Each question addresses a different aspect of the sub-skill
✅ Easy is appropriately easy (not forced into application)
✅ Medium is appropriately moderate (not forced into application unless sub-skill demands it)
✅ Hard is appropriately complex (not forced into analysis unless sub-skill demands it)
✅ Each question has correct answer mathematically verified
✅ Each question has exactly 4 options
✅ Only one option marked as "CA" per question
✅ ALL options have logic field (CA for correct answer, specific error description for distractors)
✅ Each distractor is based on COMMON MISTAKES specific to the sub-skill: ${subSkill || domain}
✅ Each distractor's logic explains a specific error related to ${subSkill || domain}
✅ Distractors reflect authentic student errors for this sub-skill, not generic mistakes
✅ Each solution is EXTREMELY DETAILED with ALL steps, calculations, and reasoning shown
✅ Each solution includes ALL intermediate calculations - no arithmetic operations are skipped
✅ Each solution shows ALL formula applications with explicit substitutions
✅ Each solution explains the reasoning behind each step
✅ Each solution is formatted with each step on a new line using \\n
✅ Easy questions have detailed solutions (3-5 steps minimum)
✅ Medium questions have comprehensive solutions (5-7 steps minimum)
✅ Hard questions have very detailed solutions (7-10+ steps minimum)
✅ All questions are clear, unambiguous, and age-appropriate
✅ No mathematical errors or logical contradictions

CRITICAL FINAL REMINDER:
- You MUST return EXACTLY 3 questions in the JSON array (Easy, Medium, Hard in that order)
- The 3 questions MUST show proper scaffolding with subtle progression
- ALL concepts of the sub-skill MUST be covered across the 3 questions
- Each question MUST have EXACTLY 4 options - NO MORE, NO LESS
- Each solution MUST have steps on SEPARATE LINES using \\n - do NOT put multiple steps on the same line
- Solution format must be: "Step 1: ...\\nStep 2: ...\\nStep 3: ..." (with \\n between each step)
- Solutions MUST be EXTREMELY DETAILED - show ALL calculations, ALL substitutions, ALL reasoning
- Easy questions: minimum 3-5 detailed steps
- Medium questions: minimum 5-7 detailed steps  
- Hard questions: minimum 7-10+ detailed steps
- DO NOT skip any arithmetic operations - show every calculation explicitly
- DO NOT skip formula applications - show formula, substitution, then calculation
- DO NOT skip explanations - explain why each step is taken
- Verify scaffolding: Easy should be easy, Medium should be moderate (not forced application), Hard should be complex (not forced analysis)
- Verify concept coverage: All key aspects of the sub-skill are addressed across the 3 questions
- Verify that all 3 questions align with the curriculum standards and grade level
- Verify that all 3 questions target the specified domain and sub-skill
${standardCode ? `- Verify that all 3 questions align with standard code: ${standardCode}` : ''}
- Count your questions: The array must have exactly 3 elements, no more, no less
- Count options in each question: Each question must have exactly 4 options
- Verify before submitting: Check that your JSON array contains exactly 3 question objects
- Verify before submitting: Check that each question has exactly 4 options in its options array
- Verify before submitting: Check that ALL options have a "logic" field (CA for correct, error description for distractors)
- Verify before submitting: Check that each distractor's logic describes a COMMON MISTAKE specific to the sub-skill: ${subSkill || domain}
- Verify before submitting: Check that each solution has steps separated by \\n (newline characters)
- Verify before submitting: Check that each solution is EXTREMELY DETAILED with all calculations shown
- Verify before submitting: Check that Easy questions have at least 3-5 steps, Medium have 5-7 steps, Hard have 7-10+ steps
- Verify before submitting: Check that no arithmetic operations are skipped - all calculations are shown
- Verify before submitting: Check that all formula applications show the formula, substitutions, and calculations
- Verify before submitting: Check that scaffolding progression is clear and natural
- The array must start with [ and end with ]
- DO NOT return fewer than 3 questions
- DO NOT return more than 3 questions
- DO NOT add extra options or remove options - the count must match exactly
- DO NOT put multiple solution steps on the same line - each step MUST be on its own line with \\n`

  // Build user prompt
  const userPrompt = `Generate 3 original base questions with proper scaffolding across difficulty levels for the following specifications:

CURRICULUM ALIGNMENT:
- State Standards: ${stateStandards}
- Grade Level: Grade ${gradeLevel}
- Domain: ${domain}
${subSkill ? `- Sub-Skill: ${subSkill}` : '- Sub-Skill: General concepts within the domain'}
${standardCode ? `- Standard Code: ${standardCode}` : ''}
- Relevant Subskills: ${subskillsText}

SCAFFOLDING REQUIREMENTS:
1. Generate exactly 3 questions: ONE Easy, ONE Medium, ONE Hard
2. The 3 questions must show clear but subtle progression
3. Each question must build upon the previous one
4. ALL concepts related to the sub-skill must be covered across the 3 questions
5. Each question should address a different aspect or application of the sub-skill

DIFFICULTY LEVEL GUIDELINES:
- EASY: Basic understanding/recall, single-step or simple problems. DO NOT force real-world scenarios unless sub-skill demands it.
- MEDIUM: Moderate complexity, 2-3 steps, deeper understanding. DO NOT automatically use "application" unless sub-skill naturally involves real-world scenarios.
- HARD: Complex reasoning, multi-step, synthesis. DO NOT automatically use "analysis" unless sub-skill naturally requires it.

REQUIREMENTS FOR ALL 3 QUESTIONS:
1. Each question must be ORIGINAL (not a variation of existing questions)
2. Questions must align with ${stateStandards} standards for Grade ${gradeLevel}
3. Questions must focus on ${domain}${subSkill ? ', specifically targeting ' + subSkill : ''}
${standardCode ? `4. Questions must align with standard code: ${standardCode}` : '4. Questions should be appropriate for the specified grade level and domain'}
5. Each question must have exactly 4 options
6. CRITICAL: ALL options (including correct answer) MUST have a "logic" field
7. CRITICAL: ALL incorrect options MUST be based on COMMON MISTAKES students make for the sub-skill: ${subSkill || domain}
8. CRITICAL: The logic for each distractor MUST explain a specific error related to ${subSkill || domain}
9. Each question must include a COMPLETE, EXTREMELY DETAILED step-by-step solution
10. Solutions must show ALL steps, ALL calculations, ALL substitutions, and ALL reasoning
11. Solutions must be formatted with each step on a new line using \\n
12. Easy questions must have at least 3-5 detailed steps
13. Medium questions must have at least 5-7 detailed steps
14. Hard questions must have at least 7-10+ detailed steps
15. DO NOT skip any arithmetic operations - show every calculation explicitly
11. The 3 questions together must cover ALL key concepts of the sub-skill

Generate 3 high-quality, curriculum-aligned base questions with proper scaffolding now.`

  try {
    // Calculate tokens needed (generating 3 questions with scaffolding)
    const tokensPerQuestion = 600 // Base questions may need more tokens
    let tokensNeeded = Math.max(3000, tokensPerQuestion * 3) // 3 questions
    tokensNeeded = Math.min(16000, tokensNeeded) // Increased max for 3 questions
    
    // Set temperature for base question generation (slightly higher for creativity)
    const temperature = 0.8
    
    // Use unified AI client
    let content: string
    try {
      content = await generateWithAI(
        systemPrompt,
        userPrompt,
        model,
        temperature,
        tokensNeeded
      )
    } catch (error: any) {
      // If model is not available, fallback to gpt-4o (for OpenAI models) or gemini-3-pro (for Gemini)
      if (error?.message?.includes('model') || error?.code === 'model_not_found') {
        const provider = getAIProvider(model)
        let fallbackModel = 'gpt-4o'
        if (provider === 'gemini') {
          fallbackModel = 'gemini-3-pro'
        }
        console.warn(`${model} not available, falling back to ${fallbackModel}`)
        content = await generateWithAI(
          systemPrompt,
          userPrompt,
          fallbackModel,
          temperature,
          tokensNeeded
        )
      } else {
        throw error
      }
    }
    
    if (!content || content.trim().length === 0) {
      throw new Error('AI returned empty content')
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
      throw new Error('AI did not return an array of questions')
    }
    
    if (questions.length !== 3) {
      throw new Error(`Expected exactly 3 questions (Easy, Medium, Hard), but received ${questions.length}`)
    }
    
    // Validate and clean questions
    const validatedQuestions = questions
      .filter((q: any) => q && typeof q === 'object')
      .map((q: any, index: number) => {
        // Determine difficulty from field or index
        let difficulty = q.difficulty || ''
        if (!difficulty || !['Easy', 'Medium', 'Hard'].includes(difficulty)) {
          // Assign based on index if difficulty field is missing or invalid
          if (index === 0) difficulty = 'Easy'
          else if (index === 1) difficulty = 'Medium'
          else difficulty = 'Hard'
        }
        
        // Ensure required fields
        const question: any = {
          difficulty: difficulty,
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
    
    // Ensure we have exactly 3 questions
    if (validatedQuestions.length !== 3) {
      throw new Error(`Expected exactly 3 questions with scaffolding, but only ${validatedQuestions.length} were generated`)
    }
    
    // Sort by difficulty to ensure Easy, Medium, Hard order
    const difficultyOrder = { 'Easy': 0, 'Medium': 1, 'Hard': 2 }
    validatedQuestions.sort((a: any, b: any) => {
      const orderA = difficultyOrder[a.difficulty as keyof typeof difficultyOrder] ?? 999
      const orderB = difficultyOrder[b.difficulty as keyof typeof difficultyOrder] ?? 999
      return orderA - orderB
    })
    
    // Return all 3 questions
    return validatedQuestions
  } catch (error: any) {
    console.error('Error in generateBaseQuestionsWithGPT:', error)
    throw error
  }
}

