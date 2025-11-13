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
    const notes = (data.notes || '').trim() // Ensure empty string if only whitespace
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
  
  // Build system prompt - TIER 1: Universal System Requirements
  const systemPrompt = `You are an expert educational content generator specializing in creating high-quality mathematical questions aligned with US curricula standards. Your primary task is to generate pedagogically sound multiple-choice questions that test specific mathematical skills and concepts while maintaining strict adherence to provided guidelines and formats.

You will follow a three-tier hierarchical approach when generating questions:

TIER 1: Universal System Requirements (Always Apply)
These rules apply to ALL questions regardless of type.

1.1 Format Preservation (CRITICAL)
- Preserve EXACT format and structure of the base question
- Maintain SAME question type and presentation style
- Match punctuation, capitalization, and formatting exactly
- Replicate any special formatting (bold, italics, mathematical notation)

1.2 Mathematical Correctness (CRITICAL)
- All questions must be mathematically accurate
- Verify calculations before finalizing
- Ensure solutions exist and are mathematically valid
- Check that all conditions are consistent with no contradictions

1.3 Answer Accuracy (CRITICAL - MUST VERIFY)
- CRITICAL: You MUST solve each question completely before marking any option as correct
- The correct answer must be verified by solving the problem step-by-step
- Work backward from the answer to confirm it satisfies all conditions
- Double-check all calculations to avoid errors
- DO NOT mark an option as "CA" (Correct Answer) unless you have verified it is mathematically correct
- If you are unsure, solve the problem completely first, then mark the verified correct answer
- Incorrect answers marked as CA will cause significant errors

1.4 Number of Options
- Match the exact number of options from the base question
- If base has 4 options, generate 4 options
- If base has 3 options, generate 3 options
- If base has 2 options, generate 3 options

1.5 Distractor Generation Strategy
You must create distractors (incorrect options) using a varied mix of the following approaches:
A. Base Question Options (when applicable) - Adapt distractor logic from the base question's options
B. Common Student Errors - Include options that reflect typical mistakes students make (sign errors, order of operations mistakes, formula misapplication)
C. Plausible Distractors - Calculation errors (one step wrong, but logical), numbers that appear in the problem but aren't the answer, results from incorrect methods that seem reasonable

CRITICAL: Options must NOT follow a predictable pattern. Mix different distractor types across your generated questions.

1.6 Auto-Check Requirement
Before providing your final answer, you must:
- Solve each question completely
- Verify the correct answer
- Check that distractors are plausible but incorrect
- Confirm all formatting matches the base question`
  
  // Build user prompt
  const solutionText = solution ? `\nBase Solution: ${solution}` : ''
  const imageInfo = images ? `\nBase Question Image Description: ${images}` : ''
  const uploadedImageInfo = imageFiles.length > 0 
    ? `\nBase Question Uploaded Images: ${imageFiles.length} image(s) uploaded. These images are provided as base64 data and should be used as reference for generating similar visual elements.`
    : ''
  const shouldGenerateImages = Boolean(images || imageFiles.length)
  
  let userPrompt = ''
  
  if (questionType === 'mathematical') {
    userPrompt = `${'='.repeat(80)}
⚠️⚠️⚠️ CRITICAL: YOU MUST GENERATE EXACTLY ${numQuestions} QUESTIONS - NO MORE, NO LESS ⚠️⚠️⚠️
CRITICAL: The response MUST contain EXACTLY ${numQuestions} question objects in the JSON array.
CRITICAL: If you generate fewer than ${numQuestions} questions, the request will fail.
CRITICAL: If you generate more than ${numQuestions} questions, only the first ${numQuestions} will be used.
CRITICAL: Count your questions before submitting - ensure the array has EXACTLY ${numQuestions} elements.
${'='.repeat(80)}

BASE QUESTION (STUDY THIS CAREFULLY):
${baseQuestion}

${notes && notes.length > 0 ? `\nTIER 3: SME NOTES (HIGHEST PRIORITY - MUST FOLLOW PRECISELY)\n${notes}\nCRITICAL: SME notes supplement Tiers 1 and 2, but do not override them. Follow them precisely.\nCRITICAL: These are the ONLY SME notes for this request. Do NOT use any notes from previous requests or conversations.\n` : '\nTIER 3: SME NOTES - None provided.\nCRITICAL: There are NO SME notes for this request. Do NOT use any notes from previous requests or conversations.\nProceed with Tiers 1 and 2 only. Ignore any notes that may have been mentioned in previous interactions.\n'}

${solution ? `Base Solution: ${solution}\n` : ''}${imageInfo ? `${imageInfo}\n` : ''}

TIER 2: Question-Specific Requirements - 2A: Mathematical Questions

Characteristics: Equations, expressions, calculations without real-world scenarios. No images/graphs.

Apply These Additional Requirements:

Mathematical Accuracy
- Verify all calculations are correct before finalizing
- Ensure solutions exist and are mathematically valid
- Check that all given conditions are consistent (no contradictions)

Problem Structure
- Clearly define what is given and what needs to be found
- Use proper mathematical notation and symbols
- Ensure the question is unambiguous
- Maintain logical flow from given information to the question

Answer Verification (CRITICAL)
- You MUST solve each question completely before generating options
- Work backward from the answer to verify it satisfies all conditions
- Check for extraneous solutions (e.g., square root problems, rational equations)
- Ensure the answer is in the requested form (simplified, exact, decimal, fraction, etc.)
- Verify units/dimensions if applicable
- CRITICAL: Only mark an option as "CA" if you have verified it is mathematically correct by solving the problem
- Double-check your calculations - incorrect answers marked as CA will cause errors

CRITICAL REQUIREMENTS FOR OPTIONS AND CORRECT ANSWERS:

1. OPTIONS FORMAT:
   - Each option MUST have a "text" field containing a COMPLETE, MEANINGFUL answer (e.g., "5/12", "0.42", "3/4", "2.5")
   - DO NOT use placeholder text like "Option A", "Option B", "Choice A", etc.
   - Each option MUST be a real, complete answer that a student could choose
   - Options should be in the same format as the base question's options (fractions, decimals, whole numbers, etc.)

2. CORRECT ANSWER (CRITICAL - MUST BE VERIFIED):
   - ONE and ONLY ONE option per question MUST have "logic": "CA" (Correct Answer)
   - CRITICAL: You MUST solve each question completely before marking the correct answer
   - The correct answer MUST be mathematically correct - verify by solving the problem step-by-step
   - Work backward from your answer to confirm it satisfies all conditions in the question
   - The correct answer MUST follow all SME notes requirements
   - Mark the correct answer clearly with "logic": "CA" - DO NOT mark incorrect answers as CA
   - If you are unsure which answer is correct, solve the problem completely first, then mark the verified correct answer
   
   VERIFICATION PROCESS (MANDATORY - FOLLOW THESE STEPS):
   Step 1: Read the question carefully and identify what is being asked
   Step 2: Solve the problem completely step-by-step (show your work mentally)
   Step 3: Calculate the final answer
   Step 4: Verify your answer by plugging it back into the problem or checking it
   Step 5: Check that your answer satisfies all conditions in the question
   Step 6: Only then, mark the option with your verified answer as "logic": "CA"
   Step 7: Generate distractors (incorrect options) with appropriate logic
   
   EXAMPLE OF CORRECT PROCESS:
   Question: "What is 15 + 27?"
   Step 1: Identify: Addition problem
   Step 2: Solve: 15 + 27 = 42
   Step 3: Verify: 42 - 15 = 27 ✓ (correct)
   Step 4: Mark option with "42" as "logic": "CA"
   Step 5: Generate distractors: "40" (logic: "Forgot to add ones"), "43" (logic: "Added incorrectly"), etc.
   
   ❌ WRONG: Marking "40" as CA because it's close to the answer
   ❌ WRONG: Marking the first option as CA without solving
   ❌ WRONG: Marking multiple options as CA
   ❌ WRONG: Guessing which answer is correct
   ✅ CORRECT: Solving completely, verifying, then marking only the verified correct answer as CA

3. INCORRECT OPTIONS (DISTRACTORS):
   - Each incorrect option MUST have a "logic" field explaining the error
   - Logic must be SHORT (3-6 words) describing the mistake
   - Distractors should be based on ACTUAL ERRORS students would make
   - Examples: "Added instead of multiplied", "Forgot to carry over", "Wrong denominator", "Calculation error"

4. OPTIONS COUNT:
   - Each question MUST have EXACTLY ${numOptions} options
   - All ${numOptions} options must be complete and valid answers

QUALITY CHECKLIST (Self-Verify Before Finalizing):
 Format matches base question exactly
✅ Correct answer is mathematically verified
✅ Options don't follow a predictable pattern
✅ Number of options matches base question
✅ SME notes (if provided) have been followed
✅ No mathematical errors or logical contradictions

JSON FORMAT REQUIREMENTS:
- Your FIRST character MUST be [ (opening square bracket)
- Your LAST character MUST be ] (closing square bracket)
- Return ONLY a valid JSON array starting with [ and ending with ]
- NO markdown code blocks (no \`\`\`json or \`\`\`)
- NO explanations or text before or after the JSON
- Start response immediately with [
- End response with ]

EXAMPLE FORMAT:
[{"question": "...", "options": [{"text": "...", "logic": "CA"}, {"text": "...", "logic": "..."}, ...], "image": "", "solution": "..."}, ...]

CRITICAL FINAL REMINDER:
- You MUST return EXACTLY ${numQuestions} questions in the JSON array
- Each question MUST have EXACTLY ${numOptions} options
- Count your questions: The array must have exactly ${numQuestions} elements, no more, no less
- Verify before submitting: Check that your JSON array contains exactly ${numQuestions} question objects`
  } else {
    // Word Problems or Image-Based Questions
    const isImageBased = questionType === 'image_based'
    const questionTypeLabel = isImageBased ? 'Image-Based Questions' : 'Word Problems / Real-World Problems'
    const tier2Section = isImageBased ? '2C: Image-Based Questions' : '2B: Word Problems / Real-World Problems'
    
    userPrompt = `${'='.repeat(80)}
⚠️⚠️⚠️ CRITICAL: YOU MUST GENERATE EXACTLY ${numQuestions} QUESTIONS - NO MORE, NO LESS ⚠️⚠️⚠️
CRITICAL: The response MUST contain EXACTLY ${numQuestions} question objects in the JSON array.
CRITICAL: If you generate fewer than ${numQuestions} questions, the request will fail.
CRITICAL: If you generate more than ${numQuestions} questions, only the first ${numQuestions} will be used.
CRITICAL: Count your questions before submitting - ensure the array has EXACTLY ${numQuestions} elements.
${'='.repeat(80)}

BASE QUESTION (STUDY THIS CAREFULLY):
${baseQuestion}

${notes && notes.length > 0 ? `\nTIER 3: SME NOTES (HIGHEST PRIORITY - MUST FOLLOW PRECISELY)\n${notes}\nCRITICAL: SME notes supplement and may modify Tiers 1 and 2. Follow them precisely.\nCRITICAL: These are the ONLY SME notes for this request. Do NOT use any notes from previous requests or conversations.\n` : '\nTIER 3: SME NOTES - None provided.\nCRITICAL: There are NO SME notes for this request. Do NOT use any notes from previous requests or conversations.\nProceed with Tiers 1 and 2 only. Ignore any notes that may have been mentioned in previous interactions.\n'}

${solution ? `Base Solution: ${solution}\n` : ''}${imageInfo ? `${imageInfo}\n` : ''}${imageFiles.length > 0 ? `\nUPLOADED IMAGES: ${imageFiles.length} image(s) have been uploaded. Use these images as reference for the visual elements, dimensions, angles, and other details needed to generate similar questions.\n` : ''}
${curriculum && grade ? `Curriculum: ${curriculum} | Grade: ${grade} | Difficulty: ${difficulty}` : difficulty ? `Difficulty: ${difficulty}` : ''}
Subskills: ${subskillsText.substring(0, 200)}

TIER 2: Question-Specific Requirements - ${tier2Section}

${isImageBased ? `Characteristics: Questions that include or reference visual elements like graphs, diagrams, geometric figures, tables, or charts.

Apply These Additional Requirements:

1. Image Description Requirements (MANDATORY) For each generated question, you MUST provide:
- Complete visual description: Detailed text description of what the image contains
- All visual elements: Describe graphs, diagrams, tables, charts, geometric figures, equations shown in image form
- Labels and annotations: Include all axis labels, point coordinates, measurements, annotations visible
- Colors and styles: Mention line types (solid, dashed), colors if relevant to understanding
- Scale and units: Specify scales, gridlines, unit measurements shown

2. Image Description Format
Structure your descriptions clearly using this template:
"The image shows [type of visual: graph/triangle/table/etc.].
[Describe main elements with labels].
[List given measurements/values].
[Note special markings or annotations].
[State what needs to be found, indicated by variable or question mark]."

3. Logical and Realistic Feasibility
- Accurate representations: Graphs must follow mathematical rules (linear functions are straight lines, parabolas open correctly, etc.)
- Proportional accuracy: Visual proportions should match numerical values
- Realistic data: If showing real-world data (temperatures, prices), use plausible values
- Consistent scales: Axes and measurements must be mathematically consistent
- Physical possibility: Geometric figures must obey mathematical constraints (triangle inequality, angle sum properties, Pythagorean relationships)

4. Mathematical Accuracy in Visuals
- Correct plotting: Points, lines, curves are mathematically accurate to the equations
- Valid constructions: Geometric figures can actually exist with given measurements
- Data consistency: Table/chart values align with what's being asked
- Scale verification: If graph shows coordinates, they must be correctly positioned
- Angle accuracy: Marked angles should visually approximate their values

5. Completeness of Description
Your description must include:
- All given information: Every number, label, symbol visible in image
- Spatial relationships: "above," "below," "parallel to," "intersects at," "perpendicular to"
- Reference points: Origin, vertices, intercepts, maxima/minima, inflection points
- Grid information: If present, specify grid spacing and scale
- Legend/key: If the image has a legend, describe it fully

6. Types of Image-Based Questions
A. Geometric Diagrams - Triangles, circles, polygons, 3D shapes, composite figures
B. Graphs and Functions - Linear equations, parabolas, piecewise functions, systems of equations, transformations
C. Data Representations - Bar graphs, line graphs, pie charts, histograms, scatter plots, tables
D. Specialized Diagrams - Venn diagrams, number lines, probability trees, trigonometric unit circles

7. Distractor Logic for Image-Based Questions
Each distractor MUST have logic explaining VISUAL MISINTERPRETATION:
- "Misread angle measurement from protractor"
- "Counted wrong number of sides/shapes"
- "Misinterpreted graph scale or axis labels"
- "Read wrong value from table"
- "Confused similar-looking angles or lengths"
- "Misread coordinate points on graph"

8. Image Variation Requirements
- Each of the ${numQuestions} questions MUST have a DIFFERENT image description
- Change visual elements (sides, angles, graph equations, table values) while maintaining the same mathematical concept
- Ensure all images are mathematically valid and consistent with their descriptions
- Do NOT repeat the same image description across questions` : `Characteristics: Mathematical concepts embedded in real-life scenarios, stories, or contexts.

Apply These Additional Requirements:

1. Scenario Diversity (CRITICAL)
- NO REPETITION: Never use the same context/scenario multiple times
- Varied contexts: Draw from diverse real-life situations (shopping, travel, construction, cooking, sports, finance, school, nature, work)
- Different characters: Use diverse names, professions, ages, and settings
- Rotate problem types: Mix distance-time, work-rate, mixture, age, money, and measurement problems

1.1 Answer Value Diversity (CRITICAL - MUST BE DIFFERENT)
- CRITICAL: Each generated copy question MUST have a DIFFERENT correct answer value than the base question
- If the base question's correct answer is 25%, NONE of the copy questions should have 25% as the correct answer
- If the base question's correct answer is $50, NONE of the copy questions should have $50 as the correct answer
- If the base question's correct answer is 12 apples, NONE of the copy questions should have 12 apples as the correct answer
- Each copy question must have a UNIQUE correct answer value that is different from the base question and different from other copy questions
- Change the numbers, quantities, percentages, amounts, etc. in each question to ensure different answer values
- Example: Base question answer = 25% → Copy questions should have answers like 30%, 20%, 35%, 15%, etc. (NOT 25%)
- Example: Base question answer = $50 → Copy questions should have answers like $60, $45, $75, $40, etc. (NOT $50)
- CRITICAL: Verify that each generated question's correct answer is different from the base question's answer

2. Logical and Realistic Feasibility
- Real-world plausibility: Scenarios must be believable and possible
- Reasonable speeds, prices, timeframes
- Consistent units: Quantities must make practical sense
- Age appropriateness: Ages must be realistic for activities described
- Economic sensibility: Prices and monetary values should reflect reality
- Physical constraints: Respect real-world limitations

3. Phrasing Consistency (CRITICAL - SENTENCE STRUCTURE PRESERVATION)
- Match the base question's style (formal/conversational)
- PRESERVE SENTENCE STRUCTURE: Maintain the EXACT same grammatical patterns, sentence complexity, and word order structure as the base question
- Keep the same sentence flow: If base question uses "A person has X and buys Y, how many...?" maintain this structure
- Maintain parallel construction: If base uses compound sentences, use compound sentences; if simple, use simple
- Consistent terminology: Use similar vocabulary level and mathematical language
- Same level of detail: Match the amount of contextual information provided
- Parallel question format: If base asks "How many...?" frame variants similarly
- CRITICAL: The sentence structure must remain the SAME - only change the numbers, names, and context, NOT the grammatical structure

4. Mathematical Accuracy in Context
- Verify all calculations produce valid, sensible answers
- Ensure given data leads to solvable problems
- Check that conditions don't contradict each other
- Confirm answers align with the scenario's logic

5. Clear Problem Setup
- Unambiguous wording: Reader should understand exactly what's being asked
- All necessary information: Include every detail needed to solve
- No extraneous data: Unless specifically testing data filtering skills
- Defined relationships: Clearly state how variables relate to each other

6. Completeness Check
- All units are specified (km, hours, dollars, liters, kg, etc.)
- Question clearly states what to find
- Timeframes are logical (before/after relationships make sense)
- Quantities are properly quantified (not vague like "some" or "few")

7. Common Pitfalls to AVOID
❌ Impossible scenarios (student solving 200 problems in 5 minutes)
❌ Anachronisms (using outdated prices or technologies inappropriately)
❌ Stereotypes (gender, cultural, or occupational stereotyping)
❌ Overly complex contexts (story overshadowing the math)
❌ Ambiguous pronouns (unclear referents for "he," "she," "it," "they")`}

CRITICAL REQUIREMENTS FOR OPTIONS AND CORRECT ANSWERS:

1. OPTIONS FORMAT:
   - Each option MUST have a "text" field containing a COMPLETE, MEANINGFUL answer
   - DO NOT use placeholder text like "Option A", "Option B", "Choice A", etc.
   - Each option MUST be a real, complete answer that a student could choose
   - Options should be in the same format as the base question's options

2. CORRECT ANSWER (CRITICAL - MUST BE VERIFIED):
   - ONE and ONLY ONE option per question MUST have "logic": "CA" (Correct Answer)
   - CRITICAL: You MUST solve each question completely before marking the correct answer
   - The correct answer MUST be mathematically correct - verify by solving the problem step-by-step
   - Work backward from your answer to confirm it satisfies all conditions in the question
   - The correct answer MUST follow all SME notes requirements
   - Mark the correct answer clearly with "logic": "CA" - DO NOT mark incorrect answers as CA
   - If you are unsure which answer is correct, solve the problem completely first, then mark the verified correct answer
   
   VERIFICATION PROCESS (MANDATORY - FOLLOW THESE STEPS):
   Step 1: Read the question carefully and identify what is being asked
   Step 2: Solve the problem completely step-by-step (show your work mentally)
   Step 3: Calculate the final answer
   Step 4: Verify your answer by plugging it back into the problem or checking it
   Step 5: Check that your answer satisfies all conditions in the question
   Step 6: Only then, mark the option with your verified answer as "logic": "CA"
   Step 7: Generate distractors (incorrect options) with appropriate logic
   
   EXAMPLE OF CORRECT PROCESS:
   Question: "What is 15 + 27?"
   Step 1: Identify: Addition problem
   Step 2: Solve: 15 + 27 = 42
   Step 3: Verify: 42 - 15 = 27 ✓ (correct)
   Step 4: Mark option with "42" as "logic": "CA"
   Step 5: Generate distractors: "40" (logic: "Forgot to add ones"), "43" (logic: "Added incorrectly"), etc.
   
   ❌ WRONG: Marking "40" as CA because it's close to the answer
   ❌ WRONG: Marking the first option as CA without solving
   ❌ WRONG: Marking multiple options as CA
   ❌ WRONG: Guessing which answer is correct
   ✅ CORRECT: Solving completely, verifying, then marking only the verified correct answer as CA

3. INCORRECT OPTIONS (DISTRACTORS):
   - Each incorrect option MUST have a "logic" field explaining the error
   - Logic must be SHORT (3-6 words) describing the mistake
   - ${isImageBased ? 'For image-based: Logic should describe VISUAL MISINTERPRETATION' : 'For word problems: Logic should describe ACTUAL ERRORS students would make'}
   - Examples: "Added instead of multiplied", "Forgot to carry over", "Wrong denominator", "Calculation error"${isImageBased ? ', "Misread angle measurement", "Counted wrong number of sides"' : ''}

4. OPTIONS COUNT:
   - Each question MUST have EXACTLY ${numOptions} options
   - All ${numOptions} options must be complete and valid answers

5. STEP-BY-STEP SOLUTIONS:
   - Each question MUST include a brief, clear step-by-step solution in the "solution" field
   ${isImageBased ? '- Reference specific parts of the image description (e.g., "Using the angle shown in the triangle...", "From the graph, we can see...")' : '- Show the logical progression from the problem statement to the final answer'}
   - Make it educational and easy to follow
   ${solution ? '- Base the solution on the provided base solution, adapting steps to match each question\'s numbers/context' : ''}

QUALITY CHECKLIST (Self-Verify Before Finalizing):
✅ Format matches base question exactly
✅ Correct answer is mathematically verified
✅ Options don't follow a predictable pattern
✅ Number of options matches base question
✅ ${isImageBased ? 'Complete visual description provided for each question' : 'Scenario is different from base and realistic'}
✅ ${isImageBased ? 'Description allows problem to be solved' : 'Phrasing style matches base question'}
✅ ${isImageBased ? '' : 'CRITICAL: Each copy question has a DIFFERENT correct answer value than the base question - verify this!'}
✅ SME notes (if provided) have been followed
✅ No mathematical errors or logical contradictions

⚠️⚠️⚠️ FINAL REMINDER - ANSWER VERIFICATION:
Before generating your response, ensure you have:
1. Solved each question completely step-by-step
2. Verified your answer is mathematically correct
3. Checked that your answer satisfies all conditions
4. Marked ONLY the verified correct answer as "logic": "CA"
5. Generated appropriate distractors with error logic
${isImageBased ? '' : '6. CRITICAL: Verified that each copy question has a DIFFERENT correct answer value than the base question (e.g., if base answer is 25%, copy questions should have 30%, 20%, 35%, etc., NOT 25%)'}

DO NOT:
- Mark an answer as CA without solving the problem
- Mark multiple options as CA
- Guess which answer is correct
- Mark the first option as CA just because it's first
${isImageBased ? '' : '- Use the same answer value as the base question for any copy question'}

CRITICAL JSON FORMAT REQUIREMENTS:
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

Each question object MUST have this structure:
${isImageBased ? `{
  "image": "[Detailed image description with sides, angles, equations, table values, etc.]",
  "question": "[Question text referencing the image]",
  "solution": "[Step-by-step solution with reference to image elements]",
  "options": [
    {"text": "[Correct answer value]", "logic": "CA"},
    {"text": "[Distractor 1 value]", "logic": "[Visual misinterpretation that leads to this]"},
    ...
  ]
}` : `{
  "question": "[Question text]",
  "options": [
    {"text": "[Correct answer]", "logic": "CA"},
    {"text": "[Distractor 1]", "logic": "[Error description]"},
    ...
  ],
  "image": "",
  "solution": "[Step-by-step solution]"
}`}

CRITICAL: Each "options" array MUST contain EXACTLY ${numOptions} option objects:
- ONE option with "logic": "CA" (the correct answer)
- ${numOptions - 1} distractors, each with logic explaining the error${isImageBased ? ' or visual misinterpretation' : ''}

Example of correct options format:
"options": [
  {"text": "${isImageBased ? '45°' : '5 + 7'}", "logic": "CA"},
  {"text": "${isImageBased ? '30°' : '5 - 7'}", "logic": "${isImageBased ? 'Misread angle measurement from protractor' : 'Used subtraction instead'}"},
  {"text": "${isImageBased ? '60°' : '5 × 7'}", "logic": "${isImageBased ? 'Confused complementary angle' : 'Used multiplication instead'}"}
]

DO NOT return placeholder text like "Option A", "Option B", etc. Each option MUST be a complete, valid answer choice.

Your response should look like this (example for ${numQuestions} questions):
[${isImageBased ? `{
  "image": "A right triangle with sides labeled: base = 3 cm, height = 4 cm, hypotenuse = 5 cm.",
  "question": "What is the area of the triangle shown?",
  "solution": "Step 1: Identify the base and height from the image. Base = 3 cm, Height = 4 cm. Step 2: Apply area formula: Area = (1/2) × base × height = (1/2) × 3 × 4 = 6 cm²",
  "options": [
    {"text": "6 cm²", "logic": "CA"},
    {"text": "12 cm²", "logic": "Forgot to multiply by 1/2"},
    {"text": "7 cm²", "logic": "Added base and height instead of multiplying"},
    {"text": "5 cm²", "logic": "Used hypotenuse length instead of height"}
  ]
}` : `{
  "question": "Sarah had 5 apples. She picked 7 more apples. Write an expression to represent the total number of apples Sarah has now.",
  "options": [
    {"text": "5 + 7", "logic": "CA"},
    {"text": "5 - 7", "logic": "Used subtraction instead"},
    {"text": "5 × 7", "logic": "Used multiplication instead"},
    {"text": "7 - 5", "logic": "Reversed the order"}
  ],
  "image": "",
  "solution": "Step-by-step solution..."
}`}, ...]

CRITICAL FINAL REMINDER:
- You MUST return EXACTLY ${numQuestions} questions in the JSON array
- Each question MUST have EXACTLY ${numOptions} options
- Count your questions: The array must have exactly ${numQuestions} elements, no more, no less
- Verify before submitting: Check that your JSON array contains exactly ${numQuestions} question objects
- The array must start with [ and end with ]
- DO NOT return fewer than ${numQuestions} questions
- DO NOT return more than ${numQuestions} questions`
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
    
    // Set temperature based on question type
    // For mathematical questions: 0.5 for more deterministic, precise answers
    // For word problems: 0.9 (within 0.6-1.2 range) to maintain sentence structure while allowing variation
    // For image-based: 0.7 (default)
    let temperature = 0.7
    if (questionType === 'mathematical') {
      temperature = 0.5
    } else if (questionType === 'word_problem') {
      temperature = 0.9 // Middle of 0.6-1.2 range to balance creativity with structure preservation
    }
    
    const apiParams: any = {
      model: model, // Supports o3, o4-mini, gpt-5, gpt-4o
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
    let cleanedContent = content.trim()
    cleanedContent = cleanedContent.replace(/```json\s*/g, '')
    cleanedContent = cleanedContent.replace(/```\s*/g, '')
    cleanedContent = cleanedContent.trim()
    
    // Extract JSON array
    const firstBracket = cleanedContent.indexOf('[')
    const lastBracket = cleanedContent.lastIndexOf(']')
    
    if (firstBracket === -1 || lastBracket === -1 || lastBracket <= firstBracket) {
      console.error('Failed to find JSON array. Content preview:', cleanedContent.substring(0, 500))
      throw new Error('Failed to find JSON array in response. The AI may not have returned questions in the expected format.')
    }
    
    const jsonContent = cleanedContent.substring(firstBracket, lastBracket + 1)
    let parsed
    try {
      parsed = JSON.parse(jsonContent)
    } catch (parseError: any) {
      console.error('JSON parse error:', parseError.message)
      console.error('JSON content preview:', jsonContent.substring(0, 500))
      throw new Error(`Failed to parse JSON response: ${parseError.message}. The AI response may be malformed.`)
    }
    
    if (!Array.isArray(parsed)) {
      console.error('Parsed JSON is not an array. Type:', typeof parsed, 'Value:', parsed)
      throw new Error('Parsed JSON is not an array. The AI may have returned a single object instead of an array.')
    }
    
    if (parsed.length === 0) {
      console.error('Parsed array is empty')
      throw new Error('The AI returned an empty array. No questions were generated.')
    }
    
    // Validate and fix questions
    const validatedQuestions = []
    // First, collect all valid questions from the parsed response
    for (let idx = 0; idx < parsed.length; idx++) {
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
      
      for (let optIdx = 0; optIdx < options.length; optIdx++) {
        const option = options[optIdx]
        // Skip options without text or with empty/placeholder text
        if (!option || !option.text || typeof option.text !== 'string') {
          console.warn(`Question ${idx + 1}: Skipping invalid option:`, option)
          continue
        }
        
        const optionText = option.text.trim()
        
        // Skip placeholder text like "Option A", "Option B", etc., but allow short valid answers
        if (optionText.match(/^Option\s+[A-Z]$/i) || optionText === '') {
          console.warn(`Question ${idx + 1}: Skipping placeholder or empty option: "${optionText}"`)
          continue
        }
        
        // Allow very short answers (like single digits, fractions, etc.) but log them
        if (optionText.length < 1) {
          console.warn(`Question ${idx + 1}: Skipping empty option`)
          continue
        }
        
        // Determine logic - check for correct answer markers
        let optionLogic = option.logic || 'Plausible distractor'
        const logicUpper = String(optionLogic).toUpperCase().trim()
        
        // Check if this is marked as correct answer
        // Only accept explicit CA markers - don't auto-assume first option is correct
        const isCorrectAnswer = logicUpper === 'CA' || 
                                logicUpper === 'CORRECT' ||
                                logicUpper === 'CORRECT ANSWER' ||
                                (logicUpper.includes('CORRECT') && !logicUpper.includes('INCORRECT')) ||
                                (logicUpper.includes('RIGHT') && !logicUpper.includes('WRONG'))
        
        if (isCorrectAnswer && !hasCorrectAnswer) {
          optionLogic = 'CA'
            hasCorrectAnswer = true
        } else if (isCorrectAnswer && hasCorrectAnswer) {
          // Multiple correct answers - mark this as distractor
          optionLogic = 'Plausible distractor'
        } else if (!option.logic) {
          // No logic provided - default to distractor
          optionLogic = 'Plausible distractor'
          } else {
          // Keep original logic
          optionLogic = option.logic
        }
        
        validOptions.push({
          text: optionText,
          logic: optionLogic
        })
      }
      
      // If no valid options were found, log error and skip this question
      if (validOptions.length === 0) {
        console.error(`Question ${idx + 1}: No valid options found after validation. Original options:`, JSON.stringify(question.options))
        continue
      }
      
      // If no correct answer found, log error and mark first option as CA (with warning)
      if (!hasCorrectAnswer && validOptions.length > 0) {
        console.error(`Question ${idx + 1}: WARNING - No correct answer (CA) found in options. Marking first option as CA. This may be incorrect! Original options:`, JSON.stringify(question.options))
        console.warn(`Question ${idx + 1}: First option "${validOptions[0].text}" is being marked as CA, but this was not verified as correct by the AI.`)
        validOptions[0].logic = 'CA'
      }
      
      // Validate that the solution mentions the correct answer (if solution exists)
      if (question.solution && validOptions.length > 0) {
        const correctOption = validOptions.find(opt => opt.logic === 'CA')
        if (correctOption) {
          const solutionText = question.solution.toLowerCase()
          const correctAnswerText = correctOption.text.toLowerCase().trim()
          // Check if solution contains the correct answer (allowing for formatting differences)
          const answerInSolution = solutionText.includes(correctAnswerText) || 
                                   solutionText.includes(correctAnswerText.replace(/\s+/g, '')) ||
                                   // Check for common variations (fractions, decimals, etc.)
                                   (correctAnswerText.match(/\d+/) && solutionText.match(new RegExp(correctAnswerText.match(/\d+/)?.[0] || '')))
          
          if (!answerInSolution && correctAnswerText.length > 0) {
            console.warn(`Question ${idx + 1}: WARNING - Solution may not match the marked correct answer "${correctOption.text}". Please verify manually.`)
            console.warn(`Question ${idx + 1}: Solution preview: ${question.solution.substring(0, 100)}...`)
          }
        }
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
      // Log the raw response for debugging
      console.error('No valid questions were generated. Parsed response:', JSON.stringify(parsed, null, 2))
      console.error('Original content length:', content?.length || 0)
      throw new Error('No valid questions were generated. Please check the base question format and try again. If the issue persists, the generated questions may not match the required format.')
    }
    
    // Ensure we have exactly the requested number of questions
    if (validatedQuestions.length < numQuestions) {
      console.warn(`Only ${validatedQuestions.length} valid questions generated, but ${numQuestions} requested. Parsed response had ${parsed.length} questions.`)
      throw new Error(`Only ${validatedQuestions.length} valid question(s) were generated, but ${numQuestions} were requested. Please try again or check the base question format.`)
    }
    
    // If we have more than requested, trim to exact number
    if (validatedQuestions.length > numQuestions) {
      console.warn(`Generated ${validatedQuestions.length} questions, but only ${numQuestions} requested. Trimming to requested number.`)
      return validatedQuestions.slice(0, numQuestions)
    }
    
    // Return exactly the requested number
    return validatedQuestions
  } catch (error: any) {
    if (error instanceof SyntaxError) {
      throw new Error(`Failed to parse GPT response as JSON: ${error.message}`)
    }
    throw error
  }
}

