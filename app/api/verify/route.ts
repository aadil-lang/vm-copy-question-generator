import { NextRequest, NextResponse } from 'next/server'
import { getOpenAIClient } from '@/lib/openai'

export async function POST(request: NextRequest) {
  try {
    const data = await request.json()
    
    // Validate required fields
    const requiredFields = ['question', 'options', 'model']
    for (const field of requiredFields) {
      if (!data[field]) {
        return NextResponse.json(
          { error: `Missing required field: ${field}` },
          { status: 400 }
        )
      }
    }
    
    const question = data.question
    const options = data.options || []
    const solution = data.solution || ''
    const image = data.image || ''
    const model = data.model || 'gpt-4o'
    const questionType = data.questionType || 'mathematical'
    
    // Build verification prompt
    const verifyPrompt = `You are an expert mathematical question verifier with deep expertise in mathematical correctness, problem-solving, and educational content validation. Your task is to meticulously verify a mathematical question and its options for absolute correctness.

⚠️⚠️⚠️ CRITICAL: YOU MUST SOLVE THE QUESTION COMPLETELY BEFORE VERIFYING ANYTHING ⚠️⚠️⚠️

QUESTION TO VERIFY:
${question}

${solution ? `PROVIDED SOLUTION:\n${solution}\n` : ''}

OPTIONS PROVIDED:
${options.map((opt: any, idx: number) => 
  `${String.fromCharCode(65 + idx)}. ${opt.text} ${opt.logic === 'CA' ? '(MARKED AS CORRECT ANSWER)' : `(Logic: ${opt.logic})`}`
).join('\n')}

${image ? `IMAGE DESCRIPTION:\n${image}\n` : ''}

MANDATORY VERIFICATION PROCESS (FOLLOW THESE STEPS IN ORDER):

STEP 1: UNDERSTAND THE QUESTION
- Read the question carefully and identify what is being asked
- Identify all given information, constraints, and conditions
- Determine what type of mathematical problem this is
- Check if the question is well-formed and unambiguous

STEP 2: SOLVE THE QUESTION COMPLETELY
- Solve the problem step-by-step from scratch
- Show ALL your work mentally (you don't need to write it, but think through it)
- Calculate the final answer carefully
- Verify your answer by plugging it back into the problem
- Check that your answer satisfies ALL conditions in the question
- Ensure your answer is in the correct format (fraction, decimal, whole number, etc.)

STEP 3: VERIFY THE MARKED CORRECT ANSWER
- Check which option is currently marked as "CA" (Correct Answer)
- Compare the marked CA option with your calculated answer
- If they match exactly (or are mathematically equivalent), the CA is correct
- If they don't match, the CA is WRONG and you must identify the correct option

STEP 4: VERIFY ALL OPTIONS INDIVIDUALLY
- For EACH option, check if it could be the correct answer:
  - Option A: Is this the correct answer? (Yes/No)
  - Option B: Is this the correct answer? (Yes/No)
  - Option C: Is this the correct answer? (Yes/No)
  - Option D: Is this the correct answer? (Yes/No)
  - (Continue for all options)
- Exactly ONE option should be correct
- ALL other options should be incorrect

STEP 5: VERIFY DISTRACTOR LOGIC AND OPTION VALUES
- For each incorrect option, check if the provided logic accurately describes why it's wrong
- IMPORTANT: Only flag option value/logic mismatches if they are MATHEMATICALLY SIGNIFICANT
- Minor discrepancies or alternative valid interpretations should NOT be flagged as errors
- Only correct option values if:
  * The logic clearly describes a specific error (e.g., "Used subtraction instead") AND
  * The current option value is clearly wrong (e.g., logic says "subtraction" but value is the addition result)
  * The mismatch would confuse students or make the question invalid
- If the logic is reasonable and the option is clearly incorrect (even if not perfectly matching the logic description), do NOT change it
- Be conservative: Only change things when there are clear mathematical errors, not stylistic differences

STEP 6: VERIFY THE QUESTION ITSELF
- Check if the question has any mathematical errors
- Check if the question is solvable with the given information
- Check if there are any contradictions in the question
- Check if the question is unambiguous

STEP 7: VERIFY THE SOLUTION (if provided)
- Check if the provided solution correctly solves the problem
- Verify that the solution leads to the correct answer
- Check if the solution matches the correct option

CRITICAL ERROR DETECTION RULES:
1. If the marked CA is WRONG:
   - Set hasErrors: true
   - Add error: "Incorrect answer marked as correct. The correct answer is [option letter]."
   - Mark the actual correct option as "CA"
   - Keep the wrong option but update its logic to explain why it's wrong

2. If a distractor is actually correct:
   - Set hasErrors: true
   - Add error: "Option [letter] is marked as incorrect but is actually correct."
   - Replace that distractor with a new incorrect option
   - Provide appropriate logic for the new distractor

3. If the question has mathematical errors:
   - Set hasErrors: true
   - Add error: "Question contains mathematical error: [description]"
   - Provide corrected question text

4. If the solution doesn't match the correct answer:
   - Set hasErrors: true
   - Add error: "Solution does not match the correct answer."
   - Provide corrected solution

5. If distractor logic is inaccurate:
   - Set hasErrors: true
   - Add error: "Distractor logic for option [letter] is inaccurate."
   - Provide corrected logic
   - Ensure the option value matches the corrected logic

6. If an option value does not match its logic (ONLY FLAG IF MATHEMATICALLY SIGNIFICANT):
   - Only flag this if the mismatch is clear and would make the question confusing or invalid
   - Be conservative: If the option is clearly incorrect (even if not perfectly matching the logic), that's acceptable
   - Only set hasErrors: true if:
     * The logic describes a specific error AND
     * The current option value is clearly the correct answer (not just a different wrong answer)
     * The mismatch would make the question mathematically invalid
   - Examples of when to flag:
     * Logic: "Used subtraction instead" but option value is the correct answer → FLAG
     * Logic: "Used subtraction instead" but option value is a different wrong answer → DO NOT FLAG (acceptable)
     * Logic: "Calculation error" but option is clearly wrong → DO NOT FLAG (acceptable, even if not specific)
   - Only update option values if the current value is mathematically wrong in a way that contradicts the logic

OUTPUT FORMAT (JSON only, no markdown):
{
  "hasErrors": true/false,
  "errors": ["detailed list of all errors found"],
  "correctedQuestion": "corrected question text (only if question had errors, otherwise same as input)",
  "correctedOptions": [
    {"text": "option text", "logic": "CA" or "error description"},
    ...
  ],
  "correctedSolution": "corrected solution (only if solution had errors, otherwise same as input)",
  "verificationNotes": "detailed explanation of verification process, what was checked, and any corrections made"
}

CRITICAL OUTPUT REQUIREMENTS:
- BE CONSERVATIVE: Only flag errors if there are ACTUAL mathematical mistakes, not minor discrepancies
- If the question is mathematically correct and the correct answer is properly marked: set "hasErrors": false
- If no errors are found: set "hasErrors": false and return original question/options/solution EXACTLY as provided (unchanged)
- Only set "hasErrors": true if there are clear mathematical errors that need correction
- DO NOT change correct answers, solutions, or options just because they could be worded differently
- DO NOT change option values unless they are mathematically wrong (e.g., a distractor is actually correct)
- The "correctedOptions" array MUST have EXACTLY ${options.length} options (same as input) - DO NOT add or remove options
- Exactly ONE option MUST have "logic": "CA"
- "verificationNotes" MUST include: "I solved the question and got [your answer]. The correct option is [letter]."
- Return ONLY valid JSON, no markdown code blocks, no explanations outside JSON
- Be extremely careful and thorough - mathematical accuracy is critical
- CRITICAL: Maintain the exact same number of options - if you need to fix an option, replace it in place, do not add or remove options
- CONSERVATIVE APPROACH: When in doubt, do NOT change anything - only correct clear mathematical errors`

    try {
      const client = getOpenAIClient()
      
      const response = await client.chat.completions.create({
        model: model,
        messages: [
          { 
            role: 'system', 
            content: `You are an expert mathematical question verifier with exceptional attention to detail. Your primary responsibility is to ensure absolute mathematical correctness. 

CRITICAL INSTRUCTIONS:
1. You MUST solve every question completely from scratch before verifying anything
2. You MUST verify each option individually to ensure only one is correct
3. You MUST check that the marked correct answer is actually correct
4. You MUST verify that all distractors are actually incorrect
5. Mathematical accuracy is paramount - be extremely thorough
6. Always return valid JSON only, no markdown code blocks`
          },
          { role: 'user', content: verifyPrompt }
        ],
        max_tokens: 3000,
        temperature: 0.0, // Zero temperature for maximum consistency and determinism
      })
      
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
      
      // Extract JSON object
      const firstBrace = cleanedContent.indexOf('{')
      const lastBrace = cleanedContent.lastIndexOf('}')
      
      if (firstBrace === -1 || lastBrace === -1 || lastBrace <= firstBrace) {
        console.error('Failed to find JSON object. Content preview:', cleanedContent.substring(0, 500))
        throw new Error('Failed to find JSON object in response.')
      }
      
      const jsonContent = cleanedContent.substring(firstBrace, lastBrace + 1)
      let parsed
      try {
        parsed = JSON.parse(jsonContent)
      } catch (parseError: any) {
        console.error('JSON parse error:', parseError.message)
        console.error('JSON content preview:', jsonContent.substring(0, 500))
        throw new Error(`Failed to parse JSON response: ${parseError.message}`)
      }
      
      // Validate that corrected options have the same number as input
      if (parsed.correctedOptions && Array.isArray(parsed.correctedOptions)) {
        if (parsed.correctedOptions.length !== options.length) {
          console.warn(`Corrected options count (${parsed.correctedOptions.length}) doesn't match input (${options.length}). Adjusting...`)
          // If too many options, trim to original count
          if (parsed.correctedOptions.length > options.length) {
            parsed.correctedOptions = parsed.correctedOptions.slice(0, options.length)
          }
          // If too few options, pad with original options
          else if (parsed.correctedOptions.length < options.length) {
            const originalOptions = [...options]
            const correctedOptions = [...parsed.correctedOptions]
            // Keep corrected options and fill remaining with original
            while (correctedOptions.length < options.length) {
              const originalIndex = correctedOptions.length
              correctedOptions.push({
                text: originalOptions[originalIndex].text,
                logic: originalOptions[originalIndex].logic
              })
            }
            parsed.correctedOptions = correctedOptions
          }
        }
      }
      
      return NextResponse.json({ 
        verified: true,
        result: parsed
      })
    } catch (error: any) {
      // If model is not available, fallback to gpt-4o
      if ((model === 'gpt-5' || model === 'o3' || model === 'o4-mini') && 
          (error?.message?.includes('model') || error?.code === 'model_not_found')) {
        console.warn(`${model} not available for verification, falling back to GPT-4o`)
        const client = getOpenAIClient()
        const response = await client.chat.completions.create({
          model: 'gpt-4o',
          messages: [
            { 
              role: 'system', 
              content: `You are an expert mathematical question verifier with exceptional attention to detail. Your primary responsibility is to ensure absolute mathematical correctness. 

CRITICAL INSTRUCTIONS:
1. You MUST solve every question completely from scratch before verifying anything
2. You MUST verify each option individually to ensure only one is correct
3. You MUST check that the marked correct answer is actually correct
4. You MUST verify that all distractors are actually incorrect
5. Mathematical accuracy is paramount - be extremely thorough
6. Always return valid JSON only, no markdown code blocks`
            },
            { role: 'user', content: verifyPrompt }
          ],
          max_tokens: 3000,
          temperature: 0.0, // Zero temperature for maximum consistency and determinism
        })
        
        if (!response.choices || response.choices.length === 0) {
          throw new Error('GPT returned empty response')
        }
        
        const content = response.choices[0].message.content
        if (!content || content.trim().length === 0) {
          throw new Error('GPT returned empty content')
        }
        
        let cleanedContent = content.trim()
        cleanedContent = cleanedContent.replace(/```json\s*/g, '')
        cleanedContent = cleanedContent.replace(/```\s*/g, '')
        cleanedContent = cleanedContent.trim()
        
        const firstBrace = cleanedContent.indexOf('{')
        const lastBrace = cleanedContent.lastIndexOf('}')
        
        if (firstBrace === -1 || lastBrace === -1 || lastBrace <= firstBrace) {
          console.error('Failed to find JSON object. Content preview:', cleanedContent.substring(0, 500))
          throw new Error('Failed to find JSON object in response.')
        }
        
        const jsonContent = cleanedContent.substring(firstBrace, lastBrace + 1)
        let parsed
        try {
          parsed = JSON.parse(jsonContent)
        } catch (parseError: any) {
          console.error('JSON parse error:', parseError.message)
          console.error('JSON content preview:', jsonContent.substring(0, 500))
          throw new Error(`Failed to parse JSON response: ${parseError.message}`)
        }
        
        // Validate that corrected options have the same number as input
        if (parsed.correctedOptions && Array.isArray(parsed.correctedOptions)) {
          if (parsed.correctedOptions.length !== options.length) {
            console.warn(`Corrected options count (${parsed.correctedOptions.length}) doesn't match input (${options.length}). Adjusting...`)
            // If too many options, trim to original count
            if (parsed.correctedOptions.length > options.length) {
              parsed.correctedOptions = parsed.correctedOptions.slice(0, options.length)
            }
            // If too few options, pad with original options
            else if (parsed.correctedOptions.length < options.length) {
              const originalOptions = [...options]
              const correctedOptions = [...parsed.correctedOptions]
              // Keep corrected options and fill remaining with original
              while (correctedOptions.length < options.length) {
                const originalIndex = correctedOptions.length
                correctedOptions.push({
                  text: originalOptions[originalIndex].text,
                  logic: originalOptions[originalIndex].logic
                })
              }
              parsed.correctedOptions = correctedOptions
            }
          }
        }
        
        return NextResponse.json({ 
          verified: true,
          result: parsed
        })
      } else {
        throw error
      }
    }
  } catch (error: any) {
    console.error('Error verifying question:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to verify question' },
      { status: 500 }
    )
  }
}

