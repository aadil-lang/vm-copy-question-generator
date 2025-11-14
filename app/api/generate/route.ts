import { NextRequest, NextResponse } from "next/server";
import { QuestionGenerationRequest, QuestionGenerationResponse, Question } from "@/types/question";

const SYSTEM_PROMPT = `You are an expert educational content generator specializing in K-12 mathematics. Your task is to create high-quality, curriculum-aligned mathematics questions that assess student understanding across varying difficulty levels while adhering to specific US state standards.

Core Requirements:

1. Grade Level Specifications
- Generate questions for grades K through 12
- Ensure age-appropriate language, context, and complexity
- Align mathematical concepts with typical grade-level expectations per state standards

2. Difficulty Levels
- Easy (Foundational): Tests basic recall and fundamental understanding. Single-step problems with straightforward application. Minimal contextual complexity. Clear, direct language.
- Medium (Application): Requires multi-step reasoning. Integration of 2-3 related concepts. Real-world context with moderate complexity. Some interpretation needed.
- Hard (Advanced): Complex multi-step problems requiring deep understanding. Integration of multiple concepts and skills. Abstract reasoning or non-routine problem-solving. May include extension beyond grade-level expectations.

3. State Curriculum Alignment
Support the following state standards frameworks:
- Common Core State Standards (CCSS) - default
- Texas Essential Knowledge and Skills (TEKS)
- California Common Core State Standards (CA-CCSS)
- New York Next Generation Learning Standards (NYSED)
- Florida B.E.S.T. Standards
- Virginia Standards of Learning (VA SOL)

4. Output Format
For each question generated, provide a JSON object with:
- question_id: unique identifier (format: "q_[state]_[grade]_[timestamp]_[index]")
- state: state code
- grade: grade level (K-12)
- domain: mathematical domain
- sub_skill: specific skill being assessed
- standard_code: state standard reference (e.g., "5.NF.B.4" for CCSS)
- difficulty: "Easy", "Medium", or "Hard"
- question_text: the complete question
- question_type: "multiple_choice", "short_answer", "numeric", or "word_problem"
- answer: correct answer
- options: array of 4 options (required if question_type is "multiple_choice")
- explanation: step-by-step solution
- estimated_time: estimated minutes to complete
- cognitive_level: "remember", "understand", "apply", "analyze", "evaluate", or "create"

Quality Guidelines:
- Use clear, unambiguous language appropriate to grade level
- Ensure mathematical accuracy in all questions and solutions
- Include diverse contexts (cultural, social, practical scenarios)
- Avoid bias in problem contexts and examples
- Use realistic numbers and scenarios
- Each question should have ONE clear correct answer
- Distractors (wrong answers) should represent common misconceptions
- Questions should assess understanding, not trick students

Return ONLY valid JSON array of question objects. Do not include any markdown formatting or code blocks.`;

function buildUserPrompt(request: QuestionGenerationRequest): string {
  const stateNames: Record<string, string> = {
    CA: "California Common Core State Standards (CA-CCSS)",
    TX: "Texas Essential Knowledge and Skills (TEKS)",
    NY: "New York Next Generation Learning Standards (NYSED)",
    FL: "Florida B.E.S.T. Standards",
    VA: "Virginia Standards of Learning (VA SOL)",
    CCSS: "Common Core State Standards (CCSS)"
  };

  return `Generate ${request.quantity} ${request.difficulty}-difficulty mathematics question(s) with the following specifications:

State: ${request.state} (${stateNames[request.state] || "Common Core"})
Grade: ${request.grade}
Sub-skill: ${request.sub_skill}
Difficulty: ${request.difficulty}
Quantity: ${request.quantity}

Ensure each question:
1. Is aligned with the specified state standard for the given grade and sub-skill
2. Has appropriate difficulty level for ${request.difficulty}
3. Uses clear, grade-appropriate language
4. Includes complete metadata (standard_code, domain, etc.)
5. Has accurate mathematical solutions
6. Includes options array if question_type is "multiple_choice"

Return the questions as a JSON array.`;
}

export async function POST(request: NextRequest) {
  try {
    const body: QuestionGenerationRequest = await request.json();

    // Validate request
    if (!body.state || !body.grade || !body.sub_skill || !body.difficulty || !body.quantity) {
      return NextResponse.json(
        { success: false, error: "Missing required fields" },
        { status: 400 }
      );
    }

    if (body.quantity < 1 || body.quantity > 10) {
      return NextResponse.json(
        { success: false, error: "Quantity must be between 1 and 10" },
        { status: 400 }
      );
    }

    // Check for API key
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      // Return mock data for development if no API key is set
      console.warn("OPENAI_API_KEY not set. Returning mock data.");
      const mockQuestions: Question[] = Array.from({ length: body.quantity }, (_, i) => ({
        question_id: `q_${body.state}_${body.grade}_${Date.now()}_${i}`,
        state: body.state,
        grade: body.grade,
        domain: "Mathematics",
        sub_skill: body.sub_skill,
        standard_code: `${body.grade}.NF.B.4`,
        difficulty: body.difficulty,
        question_text: `[Mock Question ${i + 1}] This is a placeholder question for ${body.sub_skill} at grade ${body.grade} level with ${body.difficulty} difficulty. Please set OPENAI_API_KEY environment variable to generate real questions.`,
        question_type: "multiple_choice",
        answer: "Option A",
        options: ["Option A", "Option B", "Option C", "Option D"],
        explanation: "This is a mock explanation. Set OPENAI_API_KEY to generate real questions.",
        estimated_time: "5",
        cognitive_level: "apply"
      }));

      return NextResponse.json({
        success: true,
        questions: mockQuestions
      } as QuestionGenerationResponse);
    }

    // Call OpenAI API
    const userPrompt = buildUserPrompt(body);
    
    const openaiResponse = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`
      },
        body: JSON.stringify({
          model: "gpt-4o-mini", // Using gpt-4o-mini for cost efficiency, can be changed to gpt-4o for better quality
          messages: [
            { role: "system", content: SYSTEM_PROMPT },
            { role: "user", content: userPrompt + "\n\nReturn the questions as a JSON array in this format: {\"questions\": [question1, question2, ...]}" }
          ],
          temperature: 0.7,
          response_format: { type: "json_object" }
        })
    });

    if (!openaiResponse.ok) {
      const errorData = await openaiResponse.json().catch(() => ({}));
      throw new Error(`OpenAI API error: ${openaiResponse.status} - ${JSON.stringify(errorData)}`);
    }

    const data = await openaiResponse.json();
    const content = data.choices[0]?.message?.content;

    if (!content) {
      throw new Error("No content received from OpenAI API");
    }

    // Parse JSON response
    let parsedContent;
    try {
      parsedContent = JSON.parse(content);
    } catch (parseError) {
      // Try to extract JSON from markdown code blocks if present
      const jsonMatch = content.match(/```(?:json)?\s*(\{.*\})\s*```/s);
      if (jsonMatch) {
        parsedContent = JSON.parse(jsonMatch[1]);
      } else {
        throw new Error("Failed to parse JSON response");
      }
    }

    // Extract questions array (handle both {questions: [...]} and [...] formats)
    let questions: Question[] = [];
    if (Array.isArray(parsedContent)) {
      questions = parsedContent;
    } else if (parsedContent.questions && Array.isArray(parsedContent.questions)) {
      questions = parsedContent.questions;
    } else if (parsedContent.question && Array.isArray(parsedContent.question)) {
      questions = parsedContent.question;
    } else {
      // Single question object
      questions = [parsedContent];
    }

    // Ensure we have the right number of questions
    if (questions.length > body.quantity) {
      questions = questions.slice(0, body.quantity);
    }

    // Validate and add question_ids if missing
    questions = questions.map((q, i) => ({
      ...q,
      question_id: q.question_id || `q_${body.state}_${body.grade}_${Date.now()}_${i}`
    }));

    return NextResponse.json({
      success: true,
      questions
    } as QuestionGenerationResponse);

  } catch (error) {
    console.error("Error generating questions:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error occurred"
      },
      { status: 500 }
    );
  }
}

