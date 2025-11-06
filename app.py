from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
import os
import json
from openai import OpenAI
from dotenv import load_dotenv

load_dotenv()

app = Flask(__name__, static_folder='static')
CORS(app)

# Initialize OpenAI client (always reload from environment to allow key updates)
def get_openai_client():
    # Reload environment variables to get the latest API key
    load_dotenv(override=True)
    api_key = os.getenv('OPENAI_API_KEY')
    if not api_key or api_key == 'your_openai_api_key_here':
        raise Exception("Please set your OPENAI_API_KEY in the .env file")
    # Always create a new client to ensure we use the latest API key from .env
    return OpenAI(api_key=api_key)

# Load curriculum data
CURRICULUM_DATA = {}
try:
    with open('data/curriculum.json', 'r') as f:
        CURRICULUM_DATA = json.load(f)
except FileNotFoundError:
    print("Warning: curriculum.json not found. Using empty curriculum data.")

def load_curriculum_subskills(grade, curriculum):
    """Load relevant subskills for the given grade and curriculum"""
    curriculum_key = curriculum.replace(' ', '_').upper()
    grade_key = f"Grade_{grade}" if grade != 'K' else "Kindergarten"
    
    if curriculum_key in CURRICULUM_DATA:
        return CURRICULUM_DATA[curriculum_key].get(grade_key, [])
    return []

def generate_image_for_question(question_text, image_description=None, base_images=None):
    """Generate an image for a question using DALL-E"""
    try:
        openai_client = get_openai_client()
        
        # Build prompt for image generation
        if image_description:
            prompt = f"Educational diagram or illustration for math problem: {image_description}. Clean, simple, professional style suitable for educational materials."
        else:
            # Extract key visual elements from question
            prompt = f"Educational diagram or illustration for this math problem: {question_text[:200]}. Clean, simple, professional style suitable for educational materials, showing relevant numbers, shapes, or objects."
        
        # Generate image using DALL-E
        response = openai_client.images.generate(
            model="dall-e-3",
            prompt=prompt,
            size="1024x1024",
            quality="standard",
            n=1
        )
        
        # Return the image URL
        if response.data and len(response.data) > 0:
            return response.data[0].url
        return None
        
    except Exception as e:
        print(f"Error generating image: {str(e)}")
        return None

def parse_number_of_options(base_question):
    """Parse the base question to detect the number of options"""
    import re
    
    found_options = set()
    
    # Pattern 1: A), B), C), D) - letter followed by closing paren and space
    pattern1 = r'\b([A-Z])\)\s'
    matches1 = re.findall(pattern1, base_question, re.IGNORECASE)
    for letter in matches1:
        found_options.add(letter.upper())
    
    # Pattern 2: A. B. C. D. - letter followed by period and space
    pattern2 = r'\b([A-Z])\.\s'
    matches2 = re.findall(pattern2, base_question, re.IGNORECASE)
    for letter in matches2:
        found_options.add(letter.upper())
    
    # Pattern 3: (A), (B), (C), (D) - letter in parentheses
    pattern3 = r'\(([A-Z])\)'
    matches3 = re.findall(pattern3, base_question, re.IGNORECASE)
    for letter in matches3:
        found_options.add(letter.upper())
    
    # Pattern 4: Option A, Option B, Option C, Option D
    pattern4 = r'Option\s+([A-Z])[:\s]'
    matches4 = re.findall(pattern4, base_question, re.IGNORECASE)
    for letter in matches4:
        found_options.add(letter.upper())
    
    # Pattern 5: A) Text, B) Text (no space after paren)
    pattern5 = r'\b([A-Z])\)[^\s]'
    matches5 = re.findall(pattern5, base_question, re.IGNORECASE)
    for letter in matches5:
        found_options.add(letter.upper())
    
    # If we found letter options, determine the count
    if found_options:
        # Find the maximum letter (A=1, B=2, C=3, D=4, etc.)
        max_letter = max(found_options)
        # Convert letter to number (A=1, B=2, C=3, D=4)
        num_options = ord(max_letter) - ord('A') + 1
        # Ensure it's reasonable (between 2 and 10)
        if 2 <= num_options <= 10:
            return num_options
    
    # Check for numbered options as fallback
    numbered_patterns = [
        r'\b(\d+)\)\s',  # 1), 2), 3), 4)
        r'\b(\d+)\.\s',  # 1. 2. 3. 4.
    ]
    
    numbers = []
    for pattern in numbered_patterns:
        matches = re.findall(pattern, base_question)
        for num_str in matches:
            try:
                numbers.append(int(num_str))
            except ValueError:
                pass
    
    if numbers:
        max_num = max(numbers)
        # Ensure it's reasonable (between 2 and 10)
        if 2 <= max_num <= 10:
            return max_num
    
    # Default to 4 if no options detected
    return 4

def determine_question_type(base_question, notes):
    """Determine if the question is mathematical or a word problem with real-life context"""
    # Simple heuristic: check for keywords indicating word problems
    word_problem_keywords = ['bought', 'sold', 'store', 'park', 'school', 'restaurant', 
                            'recipe', 'shopping', 'travel', 'distance', 'speed', 'time',
                            'age', 'people', 'students', 'teacher', 'class']
    
    question_lower = base_question.lower()
    has_context = any(keyword in question_lower for keyword in word_problem_keywords)
    
    # If notes mention context change, it's likely a word problem
    if notes and ('context' in notes.lower() or 'real-life' in notes.lower()):
        has_context = True
    
    return 'word_problem' if has_context else 'mathematical'

def generate_questions_with_gpt(base_question, notes, solution, images, image_files, num_options, num_questions, 
                                difficulty, grade, curriculum, model='gpt-5', question_type_from_url=None):
    """Generate copy questions using specified LLM model"""
    
    # Load relevant subskills (limit to prevent long prompts)
    # Only load if grade and curriculum are provided
    if grade and curriculum:
        subskills = load_curriculum_subskills(grade, curriculum)
        # Take only first 3-4 subskills to keep prompt concise
        subskills_text = ', '.join(subskills[:4]) if subskills else 'General math concepts'
    else:
        subskills_text = 'General math concepts'
    
    # Determine question type - use from URL if provided, otherwise determine from question
    if question_type_from_url:
        # Map URL parameter to internal question type
        if question_type_from_url == 'word-problems':
            question_type = 'word_problem'
        elif question_type_from_url == 'mathematical':
            question_type = 'mathematical'
        elif question_type_from_url == 'image-based':
            question_type = 'image_based'
        else:
            question_type = determine_question_type(base_question, notes)
    else:
        question_type = determine_question_type(base_question, notes)
    
    # Build the prompt
    system_prompt = """You are an expert educational content generator specializing in creating mathematical questions aligned with US curricula standards.
You generate high-quality, pedagogically sound multiple-choice questions that test specific skills and concepts.

CRITICAL: When generating copy questions, you MUST:
1. Preserve the EXACT format and structure of the base question
2. Keep the SAME wording, phrasing, and style as the base question
3. Maintain the SAME question type and presentation style
4. Only change the numbers (for mathematical) or context (for word problems)
5. Match the base question's punctuation, capitalization, and formatting exactly"""

    solution_text = f"\nBase Solution: {solution}" if solution else ""
    
    # Prepare image information for prompt
    image_info = ""
    if images:
        image_urls = [url.strip() for url in images.split(',') if url.strip()]
        if image_urls:
            image_info = f"\nBase Question Images: {', '.join(image_urls)}"
    elif image_files:
        image_info = f"\nBase Question has image(s) provided"
    
    # Check if we should generate images
    should_generate_images = bool(images or image_files)
    
    if should_generate_images:
        image_instruction = "\n- IMAGES: Since base question has images, provide a brief description of what image would be appropriate for each copy question (e.g., 'A diagram showing 5 apples and 3 oranges', 'A rectangle with length 8 and width 4'). Keep descriptions short (10-20 words). Leave image field empty if no image is needed."
    else:
        image_instruction = ""
    
    # Build explicit requirement at the start - optimized for mathematical questions
    if question_type == 'mathematical':
        # Shorter, more concise prompt for mathematical questions
        num_questions_requirement = f"""Generate EXACTLY {num_questions} questions. Return JSON array starting with [ and ending with ].
"""
        prompt_intro = f"""Generate {num_questions} MCQ questions with {num_options} options each. Base Question: {base_question}
"""
    else:
        # Full prompt for word problems and image-based
        num_questions_requirement = f"""
{'='*80}
⚠️⚠️⚠️ CRITICAL: YOU MUST GENERATE EXACTLY {num_questions} QUESTIONS ⚠️⚠️⚠️
{'='*80}
If this says {num_questions}, you MUST return {num_questions} question objects.
If {num_questions} = 5, return 5 questions.
If {num_questions} = 3, return 3 questions.
DO NOT return only 1 question. DO NOT return fewer than {num_questions}.
FAILURE TO RETURN {num_questions} QUESTIONS WILL CAUSE AN ERROR.

🔥 YOUR RESPONSE MUST START WITH [ AND END WITH ] 🔥
🔥 DO NOT START WITH {{ OR RETURN A SINGLE OBJECT 🔥
🔥 YOU MUST RETURN AN ARRAY: [{{...}}, {{...}}, ...] 🔥
{'='*80}

"""
        # For word problems and image-based, include base question in prompt_intro
        prompt_intro = f"""{num_questions_requirement}You MUST generate EXACTLY {num_questions} distinct MCQ questions with {num_options} options each.

BASE QUESTION (STUDY THIS CAREFULLY):
{base_question}

"""
    
    # Build user prompt based on question type
    if question_type == 'mathematical':
        # Concise prompt for mathematical questions - much shorter for faster generation
        user_prompt = f"""{num_questions_requirement}{prompt_intro}
Rules:
- Keep EXACTLY the SAME phrasing and structure, change ONLY the numbers
- Each question MUST have EXACTLY {num_options} options (same as base question)
- ONE option per question must be marked "CA" (Correct Answer)
- Incorrect options logic must be SHORT (3-6 words) based on student errors
- Examples: "CA", "Added instead of multiplied", "Forgot to carry over"
"""
        # Add SME notes, solution, and image info if provided (same for all types)
        if notes:
            user_prompt += f"""SME NOTES: {notes}
"""
        if solution:
            user_prompt += f"""Base Solution: {solution}
"""
        if image_info:
            user_prompt += f"""{image_info}
"""
        # Add JSON format requirement (concise for mathematical)
        user_prompt += f"""Return JSON array: [{{"question": "...", "options": [{{"text": "...", "logic": "..."}}, ...], "image": "", "solution": "..."}}, ...]
Return {num_questions} questions. Each with {num_options} options.
"""
    else:
        # Full prompt for word problems and image-based
        user_prompt = f"""{prompt_intro}
CRITICAL: The BASE QUESTION shown above is the question you must create variations of. DO NOT create questions about different topics or concepts. ALL copy questions must be DIRECT variations of the base question, only changing context (names, items, scenarios) and numbers while preserving the EXACT same mathematical concept, structure, and phrasing.

CRITICAL REQUIREMENT: Generate {num_questions} SEPARATE and DISTINCT questions. Each question must be a DIFFERENT variation of the base question.
DO NOT generate only one question. You MUST return {num_questions} questions.
REPEAT: {num_questions} questions required. Not 1. Not {num_questions - 1}. EXACTLY {num_questions}.

CRITICAL: STUDY THE BASE QUESTION SHOWN ABOVE
The base question is displayed at the beginning of this prompt. You MUST closely follow the base question's:
- Format and structure (same sentence structure, same question type, same presentation)
- Wording and phrasing (keep the EXACT same style and language - word-for-word where possible)
- Question type (if it's fill-in-the-blank, keep it fill-in-the-blank; if it's multiple choice, keep it multiple choice)
- Number of options: The base question has {num_options} options, so ALL copy questions MUST have EXACTLY {num_options} options (same as base question)
- Mathematical operation (same operation, just different numbers)
- Punctuation and capitalization (match exactly)
- Overall style and presentation (same format, same layout)

CRITICAL: Each copy question MUST be a DIRECT VARIATION of the base question, preserving:
- The exact wording and phrasing structure
- The same question format and presentation
- The same sentence structure and style
- For word problems: Only change the context (names, locations, items, scenarios) and numbers while keeping the EXACT same sentence structure, word order, and phrasing pattern
- For mathematical questions: Only the numbers should change

"""
        # Add SME notes, solution, and image info for non-mathematical
        user_prompt += f"""SME NOTES (CRITICAL - MUST FOLLOW IN ADDITION TO ALL PROMPT INSTRUCTIONS):
{notes if notes else 'None - No specific notes provided'}
YOU MUST FOLLOW THE SME NOTES ABOVE IN ADDITION TO ALL OTHER INSTRUCTIONS
SME NOTES PROVIDE SPECIFIC GUIDANCE THAT OVERRIDES OR SUPPLEMENTS GENERAL PROMPT INSTRUCTIONS
READ SME NOTES CAREFULLY AND FOLLOW THEM EXACTLY WHEN GENERATING COPY QUESTIONS
{solution_text}{image_info}
{f"Curriculum: {curriculum} | Grade: {grade} | Difficulty: {difficulty}" if curriculum and grade else f"Difficulty: {difficulty}" if difficulty else ""}
Subskills: {subskills_text[:200]}

"""
        # Add image-based questions specific instructions
        if question_type == 'image_based':
            user_prompt += f"""IMAGE-BASED QUESTIONS GENERATION INSTRUCTIONS
This is an IMAGE-BASED question. Follow these specific instructions:

You are an expert educational content creator specializing in visual question generation. Your task is to create a NEW question with an image, graph, or table that is similar in style, format, and visual presentation to the base question provided.

## INPUT

You will receive:

1. A base question containing an image, graph, or table

2. The subject/topic area

3. Grade level (if applicable)

4. Any specific standards alignment (optional)

## YOUR TASK

Create a completely NEW question that:

### Visual Similarity Requirements

- Uses the SAME type of visual (if base has a bar graph, create a bar graph; if it has a diagram, create a similar diagram)

- Matches the visual style: colors, layout, labeling conventions, scale, and overall aesthetic

- Uses similar complexity level in the visual presentation

- Maintains comparable visual clarity and readability

- Includes similar elements (e.g., if base has gridlines, axis labels, legends - include these)

### Content Requirements

- Tests the SAME or similar mathematical/scientific concept or skill

- Maintains similar difficulty level

- Changes the specific numbers, data, objects, or scenario to create a fresh question

- Uses different context or real-world application when appropriate

- Ensures the question is pedagogically sound and has a clear, unambiguous answer

### Format Requirements

- Match the question structure (multiple choice, open-ended, fill-in-the-blank, etc.)

- Preserve any special formatting from the base question

- Include answer choices if the original has them (with similar format) - CRITICAL: The base question has {num_options} options, so ALL copy questions MUST have EXACTLY {num_options} options (same as base question)

- Provide the correct answer and explanation

## OUTPUT FORMAT

Provide:

1. **New Question Text**: The complete question stem

2. **Image/Graph/Table Description**: Detailed description of the visual to be created, including:

   - Type of visual

   - Specific data/values to display

   - Colors, labels, and styling details

   - Dimensions and scale

3. **Answer Choices** (if applicable) - MUST have EXACTLY {num_options} options

4. **Correct Answer**

5. **Solution Explanation**: Brief explanation of how to solve

## EXAMPLE WORKFLOW

If given a bar graph showing fruit sales with blue bars on a white grid:

- Create a bar graph with a DIFFERENT topic (e.g., temperature over days)

- Use similar blue bars on white grid

- Match the axis labeling style

- Create a new question about the same skill (e.g., reading values from a bar graph)

- Maintain similar difficulty

Now, analyze the base question provided and create your similar question following all the requirements above.

CRITICAL: The base question has {num_options} options, so ALL copy questions MUST have EXACTLY {num_options} options (same as base question).

"""
        # Add word problems specific instructions if needed
        if question_type == 'word_problem':
            user_prompt += f"""WORD PROBLEMS GENERATION INSTRUCTIONS
This is a WORD PROBLEM question. Follow these specific instructions:

Prompt for Generating Similar Word Problems from Base Question

Objective:
Generate similar word problems based on a provided "Base Question" while maintaining the same mathematical concept, difficulty level, and problem-solving approach.

Instructions:
Given the Base Word Problem shown above, create multiple similar word problems that:

1. Analyze the Base Question (DISPLAYED ABOVE)

The base question is shown at the beginning of this prompt. First, identify these key elements from THAT base question:

- Mathematical Concept: What operation(s) or concept is being tested?
- Problem Structure: Single-step or multi-step? What's the solution path?
- Numerical Complexity: Size of numbers, decimals, fractions, etc.
- Context/Scenario: What real-world situation is used?
- Given Information: What data is provided?
- Unknown/Question: What needs to be found?
- Units: What measurements are involved?

2. Variation Strategies

Context Substitution:
- Change the scenario while keeping the mathematical structure identical
- Replace characters with different names (maintain diversity)
- Use equivalent contexts: shopping → dining, travel → sports, cooking → crafting
- Keep the situation relatable and realistic for the target audience

Numerical Variation:
- Modify numbers while maintaining the same mathematical relationships
- Keep computational difficulty consistent
- Scale proportionally (if base uses 12 and 8, copies might use 15 and 10)
- Maintain number types (whole numbers, decimals, fractions) unless varying difficulty

Object/Entity Replacement:
- Substitute items with equivalents from the same category
- Examples: apples → oranges, cars → bikes, dollars → euros
- Ensure the replacement makes sense in the new context
- Keep units and measurements appropriate

Time/Location Changes:
- Modify temporal or spatial elements
- Different days, times, seasons, locations
- Maintain logical consistency within the problem

3. Preserve Problem Structure

CRITICAL: Keep these elements consistent:

✓ Same sentence structure and phrasing as the base question
✓ Same word order and sentence flow
✓ Same grammatical structure and style
✓ Same number of steps to solve
✓ Same mathematical operations required
✓ Same level of complexity
✓ Same cognitive demand (Bloom's taxonomy level)
✓ Same problem type (find total, find difference, find rate, etc.)
✓ Similar word count and reading level
✓ CRITICAL: The base question has {num_options} options, so ALL copy questions MUST have EXACTLY {num_options} options (same as base question)

4. Quality Control Checks

Before finalizing each similar problem:

✓ Does it test the exact same mathematical concept?
✓ Does it match the base question's sentence structure and phrasing?
✓ Is the word order and grammatical structure the same as the base question?
✓ Is the difficulty level equivalent?
✓ Does it require the same solution approach?
✓ Are all necessary details included?
✓ Is there no extraneous information (unless in base question)?
✓ Is the context realistic and engaging?
✓ Are numbers and units appropriate?
✓ Is the question clearly stated?
✓ Does it have EXACTLY {num_options} options (same as base question)?

CRITICAL REMINDERS:
- The base question has {num_options} options → ALL copy questions MUST have EXACTLY {num_options} options (same as base question)
- These word problem instructions are in addition to all other instructions. Follow them carefully when generating copy questions.

"""
        
        user_prompt += f"""Rules:
- {question_type}: CHANGE ONLY the context/real-life scenario, keep the SAME math operation, structure, and question format. Preserve the same wording style and structure.
- CRITICAL: Each copy question MUST match the base question's sentence structure, phrasing, word order, and grammatical style
- CRITICAL: Each copy question MUST match the base question's format, structure, and style
- CRITICAL: Number of options MUST match the base question: Each question MUST have EXACTLY {num_options} options (same as the base question). DO NOT generate more or fewer options.
- CRITICAL: The base question has {num_options} options, so ALL copy questions MUST also have EXACTLY {num_options} options to match the base question format
- ONE option per question must be marked "CA" (Correct Answer)
- ALL copy questions must have the SAME number of options ({num_options} options) as the base question
- CRITICAL: Incorrect options MUST be based on ACTUAL ERRORS students would make when solving the BASE QUESTION or similar problems
- For each incorrect option, the logic must describe:
  1. What mistake a student would make when solving THIS type of question
  2. Common errors specific to the base question's concept/operation
  3. Realistic misconceptions students have about this problem type
- Logic must be SHORT (3-6 words) and SPECIFIC to the question type
- Examples: "CA", "Added instead of multiplied", "Forgot to carry over", "Wrong order of operations", "Place value mistake", "Used subtraction instead"
- {"IMPORTANT: Generate a solution for each question based on the base solution. Adapt the steps to match each question's numbers/context while keeping the same solution approach." if solution else ""}{image_instruction}

CRITICAL: COPY QUESTION FORMAT REQUIREMENT
Each copy question MUST:
1. Match the base question's sentence structure and phrasing EXACTLY
2. Use the same word order and grammatical structure as the base question
3. Match the base question's structure and format EXACTLY
4. Use the same wording style and phrasing as the base question
5. Keep the same question type (fill-in-the-blank, multiple choice, etc.)
6. Have EXACTLY {num_options} options (same as the base question) - this is CRITICAL
7. Only change the numbers (for mathematical) or context (for word problems)
8. Preserve the same punctuation, capitalization, and presentation style
9. Follow the same format as shown in the base question above

Example for Word Problems: If base question is "Sarah bought 3 apples for $2 each. How much did she spend in total?" with {num_options} options
Then copy questions should be: "Tom bought 5 oranges for $3 each. How much did he spend in total?" with EXACTLY {num_options} options
Notice: Same sentence structure, same phrasing pattern, same question format, SAME NUMBER OF OPTIONS ({num_options}) - only context (names, items, numbers) changed while preserving the exact structure.

IMPORTANT: Each distractor logic should reflect a REALISTIC mistake a student would make while solving problems similar to the base question. Base the logic on actual student errors, not generic mistakes.

CRITICAL JSON FORMAT REQUIREMENTS
- Your FIRST character MUST be [ (opening square bracket)
- Your LAST character MUST be ] (closing square bracket)
- Return ONLY a valid JSON array starting with [ and ending with ]
- DO NOT start with {{ (curly brace) - that means a single object, which is WRONG
- DO NOT return a single object - you MUST return an array
- NO markdown code blocks (no ```json or ```)
- NO explanations or text before or after the JSON
- NO comments or notes
- NO text before the opening bracket [
- NO text after the closing bracket ]
- Start response immediately with [
- End response with ]
- Ensure all strings are properly quoted with double quotes
- Ensure all brackets and braces are properly matched
- Do NOT include any text outside the JSON array

VERIFY BEFORE RESPONDING: Your response starts with [ and ends with ], not {{ and }}

⚠️⚠️⚠️ CRITICAL: You MUST return EXACTLY {num_questions} question objects in a JSON array. DO NOT return only one question.

Your response must be ONLY a JSON array containing EXACTLY {num_questions} question objects. Each object must have "question", "options", "image", and "solution" fields.

🔥🔥🔥 CRITICAL: YOUR RESPONSE MUST START WITH [ AND END WITH ] 🔥🔥🔥

DO NOT START WITH {{ (curly brace)
DO NOT RETURN A SINGLE OBJECT LIKE {{"question": ...}}
YOU MUST RETURN AN ARRAY: [{{...}}, {{...}}, ...]

Your response should look like this (example for 5 questions):
[{{"question": "...", "options": [...], "image": "", "solution": "..."}}, {{"question": "...", "options": [...], "image": "", "solution": "..."}}, {{"question": "...", "options": [...], "image": "", "solution": "..."}}, {{"question": "...", "options": [...], "image": "", "solution": "..."}}, {{"question": "...", "options": [...], "image": "", "solution": "..."}}]

WRONG FORMAT (DO NOT DO THIS):
{{"question": "...", "options": [...], "image": "", "solution": "..."}}

CORRECT FORMAT (DO THIS):
[{{"question": "...", "options": [...], "image": "", "solution": "..."}}, {{"question": "...", "options": [...], "image": "", "solution": "..."}}]

You MUST return an array with {num_questions} objects, starting with [ and ending with ].

⚠️ IMPORTANT: If {num_questions} > 1, you MUST generate {num_questions} DIFFERENT questions, each with different numbers or contexts. DO NOT duplicate the same question.

IMPORTANT: Study the base question format above and replicate it EXACTLY in your copy questions.

Example for Word Problems (if base question was "Sarah bought 3 apples for $2 each. How much did she spend in total?"):
[{{"question": "Tom bought 5 oranges for $3 each. How much did he spend in total?", "options": [{{"text": "$15", "logic": "CA"}}, {{"text": "$8", "logic": "Added instead of multiplied"}}, {{"text": "$6", "logic": "Multiplied price by quantity incorrectly"}}, {{"text": "$10", "logic": "Wrong calculation"}}], "image": "", "solution": "Step 1: Multiply 5 oranges × $3 each. Step 2: 5 × 3 = 15. Step 3: Tom spent $15 in total."}}, {{"question": "Emma bought 4 bananas for $1.50 each. How much did she spend in total?", "options": [{{"text": "$6", "logic": "CA"}}, {{"text": "$5.50", "logic": "Added instead of multiplied"}}, {{"text": "$4", "logic": "Multiplied price by quantity incorrectly"}}, {{"text": "$3", "logic": "Wrong calculation"}}], "image": "", "solution": "Step 1: Multiply 4 bananas × $1.50 each. Step 2: 4 × 1.50 = 6. Step 3: Emma spent $6 in total."}}]

Notice: Same exact sentence structure "[Name] bought [number] [items] for $[price] each. How much did [he/she] spend in total?" - only the context (names, items, numbers) changed while preserving the exact wording pattern and structure.

CRITICAL REMINDERS:
1. Base question has {num_options} options → ALL copy questions MUST have EXACTLY {num_options} options
2. SME NOTES (if provided) contain SPECIFIC instructions that MUST be followed in addition to all other prompt instructions
3. Follow SME NOTES exactly as they provide targeted guidance for generating the copy questions

⚠️⚠️⚠️ FINAL REMINDER: Return EXACTLY {num_questions} questions in an array. Start with [ and end with ]. No other text.
"""
    
    # Add final checklist only for non-mathematical questions
    if question_type != 'mathematical':
        separator = '=' * 80
        final_checklist = f"""
🔥 CRITICAL: Check that your response starts with [ (not {{) and ends with ] (not }}) 🔥
🔥 If you see {{ at the start, you're returning a single object - that's WRONG! 🔥
🔥 You MUST return an array: [{{...}}, {{...}}, ...] 🔥

{separator}
FINAL CHECKLIST BEFORE RESPONDING - COUNT YOUR QUESTIONS:
{separator}
1. Count how many question objects you are returning: it should be EXACTLY {num_questions}
2. Verify: Your JSON array should contain {num_questions} objects (count the opening braces)
3. Each question must be different (different numbers, different context, or different phrasing)
4. Each question MUST match the base question's format and structure exactly
5. Each question MUST use the same wording style as the base question
6. Your JSON array should start with [ and end with ]
7. NO other text before [ or after ]

CRITICAL VERIFICATION:
- If {num_questions} = 5, your array should look like: [{{...}}, {{...}}, {{...}}, {{...}}, {{...}}]
- If {num_questions} = 3, your array should look like: [{{...}}, {{...}}, {{...}}]
- If you return only 1 object when {num_questions} = {num_questions}, THE REQUEST WILL FAIL
- Each copy question must match the base question's format: same structure, same wording style, same type

DOUBLE-CHECK: 
1. Count the question objects in your response. You need {num_questions} objects.
2. Verify each question matches the base question's format and structure
3. Ensure each question uses the same wording style as the base question
4. Verify each question has EXACTLY {num_options} options (same as base question)
5. Ensure you followed ALL SME NOTES instructions (if provided)
{separator}"""
        user_prompt += final_checklist
    else:
        # Shorter final reminder for mathematical questions
        user_prompt += f"\nReturn [{num_questions} questions]. Each with {num_options} options. JSON array format."

    try:
        openai_client = get_openai_client()
        
        # Prepare API parameters based on model
        api_params = {
            "model": model,
            "messages": [
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt}
            ]
        }
        
        # Try to force JSON response format (if supported by model)
        # NOTE: When using response_format json_object, we need to wrap in an object
        # But we prefer array format, so we'll handle both in parsing
        use_json_object_format = False
        try:
            # Some models support response_format to force JSON
            # But json_object requires wrapping in an object, which complicates things
            # For now, let's NOT use response_format and rely on strong prompts
            # This allows the model to return arrays directly
            if False and model in ["gpt-4o", "gpt-4-turbo", "gpt-4", "gpt-3.5-turbo"]:
                # Disabled for now - we want array format, not object format
                use_json_object_format = True
                api_params["response_format"] = {"type": "json_object"}
                # Update prompt to mention JSON object format
                user_prompt += "\n\nCRITICAL: Since response_format is json_object, you MUST return: {{\"questions\": [{{...}}, {{...}}, ...]}}"
                user_prompt += f"\nThe 'questions' key must contain an array with EXACTLY {num_questions} question objects."
        except:
            pass  # If not supported, continue without it
        
        # GPT-5 uses max_completion_tokens, other models use max_tokens and temperature
        # Increase tokens for multiple questions to ensure complete generation
        # Each question needs roughly 400-600 tokens (question text, options, solution, image desc)
        # Be generous to ensure all questions are generated
        tokens_per_question = max(500, 400 * num_options)  # More options = more tokens, be generous
        tokens_needed = max(1500, tokens_per_question * num_questions)  # Ensure enough for all questions + buffer
        tokens_needed = min(8000, tokens_needed)  # Increased cap to ensure all questions fit
        # If requesting multiple questions, add extra buffer
        if num_questions > 1:
            tokens_needed = int(tokens_needed * 1.2)  # Add 20% buffer for multiple questions
        
        if model == "gpt-5":
            api_params["max_completion_tokens"] = tokens_needed
            # GPT-5 may need different handling - ensure we have minimum tokens
            if tokens_needed < 100:
                api_params["max_completion_tokens"] = 100
        else:
            api_params["max_tokens"] = tokens_needed
            api_params["temperature"] = 0.7
        
        # Log API call parameters for debugging
        print(f"DEBUG: Calling {model} with max_completion_tokens={api_params.get('max_completion_tokens')} or max_tokens={api_params.get('max_tokens')}")
        print(f"DEBUG: Number of questions requested: {num_questions}")
        print(f"DEBUG: Full user prompt length: {len(user_prompt)} characters")
        
        try:
            response = openai_client.chat.completions.create(**api_params)
        except Exception as api_error:
            error_msg = f"API call failed for {model}: {str(api_error)}"
            print(f"DEBUG: {error_msg}")
            # If model doesn't exist, suggest alternatives
            if "model" in str(api_error).lower() and "not found" in str(api_error).lower():
                error_msg += f"\n\nNote: '{model}' model may not be available. Try using 'gpt-4o' or 'gpt-4-turbo' instead."
            raise Exception(error_msg)
        
        # Check if response has content
        if not response.choices or len(response.choices) == 0:
            error_details = f"Response object: {response}"
            print(f"DEBUG: Empty choices. {error_details}")
            raise Exception(f"GPT returned empty response. No choices available. Response: {str(response)[:200]}")
        
        # Check response structure - some models might have different response formats
        choice = response.choices[0]
        
        # Log response structure for debugging
        print(f"DEBUG: Response structure - has content: {hasattr(choice.message, 'content')}")
        print(f"DEBUG: Choice finish_reason: {getattr(choice, 'finish_reason', 'N/A')}")
        
        if not hasattr(choice.message, 'content'):
            error_details = f"Message object: {choice.message}, Type: {type(choice.message)}"
            print(f"DEBUG: Message has no content attribute. {error_details}")
            raise Exception(f"GPT response structure unexpected. Message object doesn't have 'content' attribute. Finish reason: {getattr(choice, 'finish_reason', 'N/A')}")
        
        content = choice.message.content
        
        if content is None or (isinstance(content, str) and len(content.strip()) == 0):
            finish_reason = getattr(choice, 'finish_reason', 'N/A')
            error_msg = f"GPT returned empty content in response."
            if finish_reason:
                error_msg += f" Finish reason: {finish_reason}"
            if finish_reason == "length":
                error_msg += " The response was truncated. Try reducing the number of questions or increasing max_completion_tokens."
            elif finish_reason == "content_filter":
                error_msg += " The content was filtered. Try adjusting the prompt."
            elif finish_reason == "stop":
                error_msg += " The model stopped generating. This may indicate a model issue or invalid prompt."
            print(f"DEBUG: {error_msg}")
            print(f"DEBUG: Full response object: {response}")
            raise Exception(error_msg)
        
        content = content.strip()
        original_content = content  # Save for debugging
        
        # Check if content is empty
        if not content:
            raise Exception("GPT returned empty content after stripping whitespace.")
        
        # Extract JSON from response (handle markdown code blocks or extra text)
        import re
        
        # Remove markdown code blocks if present
        content = re.sub(r'```json\s*', '', content)
        content = re.sub(r'```\s*', '', content)
        content = content.strip()
        
        # Check if content still exists after cleaning
        if not content:
            raise Exception("Content became empty after removing markdown code blocks. Original response may be empty or invalid.")
        
        # Try multiple strategies to extract JSON
        questions = None
        last_error = None
        
        # Strategy 1: Try parsing directly
        try:
            parsed = json.loads(content)
            # Check if it's wrapped in an object with 'questions' key
            if isinstance(parsed, dict) and 'questions' in parsed:
                questions = parsed['questions']
            elif isinstance(parsed, list):
                questions = parsed
            elif isinstance(parsed, dict) and 'question' in parsed:
                # Single question object - wrap it in an array
                questions = [parsed]
            else:
                raise ValueError("Parsed JSON is neither a list nor an object with 'questions' key")
        except (json.JSONDecodeError, ValueError) as e:
            last_error = e
        
        # Strategy 2: Extract JSON array using regex
        if questions is None:
            json_match = re.search(r'\[[\s\S]*\]', content, re.MULTILINE | re.DOTALL)
            if json_match:
                try:
                    parsed = json.loads(json_match.group(0).strip())
                    if isinstance(parsed, list):
                        questions = parsed
                    else:
                        raise ValueError("Extracted JSON is not a list")
                except (json.JSONDecodeError, ValueError) as e:
                    last_error = e
        
        # Strategy 2b: Try extracting single object and wrap in array
        if questions is None:
            # Look for a JSON object with 'question' key
            json_obj_match = re.search(r'\{[\s\S]*"question"[\s\S]*?\}', content, re.MULTILINE | re.DOTALL)
            if json_obj_match:
                try:
                    parsed = json.loads(json_obj_match.group(0).strip())
                    if isinstance(parsed, dict) and 'question' in parsed:
                        # Single question object - wrap it in an array
                        questions = [parsed]
                except (json.JSONDecodeError, ValueError) as e:
                    if last_error is None:
                        last_error = e
        
        # Strategy 3: Try finding content between first [ and last ] or { and }
        if questions is None:
            first_bracket = content.find('[')
            last_bracket = content.rfind(']')
            if first_bracket != -1 and last_bracket != -1 and last_bracket > first_bracket:
                json_content = content[first_bracket:last_bracket + 1]
                try:
                    parsed = json.loads(json_content.strip())
                    if isinstance(parsed, list):
                        questions = parsed
                    elif isinstance(parsed, dict) and 'questions' in parsed:
                        questions = parsed['questions']
                    else:
                        raise ValueError("Extracted JSON is not a list or object with 'questions'")
                except (json.JSONDecodeError, ValueError) as e:
                    last_error = e
            else:
                # Try to find JSON object
                first_brace = content.find('{')
                last_brace = content.rfind('}')
                if first_brace != -1 and last_brace != -1 and last_brace > first_brace:
                    json_content = content[first_brace:last_brace + 1]
                    try:
                        parsed = json.loads(json_content.strip())
                        if isinstance(parsed, dict) and 'question' in parsed:
                            # Single question object - wrap it in an array
                            questions = [parsed]
                        elif isinstance(parsed, dict) and 'questions' in parsed:
                            questions = parsed['questions']
                    except (json.JSONDecodeError, ValueError) as e:
                        if last_error is None:
                            last_error = e
        
        # Strategy 4: Try to fix common JSON issues
        if questions is None:
            # Remove trailing commas before closing brackets/braces
            fixed_content = re.sub(r',(\s*[}\]])', r'\1', content)
            # Try to extract array again
            json_match = re.search(r'\[[\s\S]*\]', fixed_content, re.MULTILINE | re.DOTALL)
            if json_match:
                try:
                    parsed = json.loads(json_match.group(0).strip())
                    if isinstance(parsed, list):
                        questions = parsed
                    elif isinstance(parsed, dict) and 'questions' in parsed:
                        questions = parsed['questions']
                    else:
                        raise ValueError("Fixed JSON is not a list or object with 'questions'")
                except (json.JSONDecodeError, ValueError) as e:
                    last_error = e
            else:
                # Try to extract and fix single object
                json_obj_match = re.search(r'\{[\s\S]*"question"[\s\S]*?\}', fixed_content, re.MULTILINE | re.DOTALL)
                if json_obj_match:
                    try:
                        parsed = json.loads(json_obj_match.group(0).strip())
                        if isinstance(parsed, dict) and 'question' in parsed:
                            # Single question object - wrap it in an array
                            questions = [parsed]
                    except (json.JSONDecodeError, ValueError) as e:
                        if last_error is None:
                            last_error = e
        
        # If still no valid JSON, raise descriptive error
        if questions is None:
            # Log the full response for debugging (first 1000 chars)
            preview = original_content[:1000] if len(original_content) > 1000 else original_content
            error_msg = f"Failed to parse JSON array from response.\n"
            error_msg += f"Last error: {str(last_error)}\n"
            error_msg += f"Response length: {len(original_content)} characters\n"
            error_msg += f"Response preview:\n{preview}"
            if len(original_content) > 1000:
                error_msg += "..."
            raise Exception(error_msg)
        
        # Validate and fix questions
        validated_questions = []
        for idx, question in enumerate(questions):
            try:
                # Ensure question has required fields
                if 'question' not in question or not question['question']:
                    continue  # Skip invalid questions
                
                # Fix image field
                if 'image' not in question:
                    question['image'] = ''
                
                # Validate and fix options
                if 'options' not in question or not isinstance(question['options'], list):
                    continue  # Skip if no options
                
                options = question['options']
                
                # CRITICAL: Ensure we have exactly num_options (same as base question requirement)
                if len(options) != num_options:
                    print(f"WARNING: Question {idx + 1} has {len(options)} options but should have {num_options}")
                    if len(options) < num_options:
                        # Add missing options
                        for i in range(len(options), num_options):
                            options.append({
                                "text": f"Option {chr(65 + i)}",
                                "logic": "Plausible distractor"
                            })
                    elif len(options) > num_options:
                        # Remove extra options (keep first num_options)
                        original_count = len(options)
                        options = options[:num_options]
                        print(f"WARNING: Removed {original_count - num_options} extra options from question {idx + 1}")
                
                # Validate each option
                valid_options = []
                has_correct_answer = False
                
                for opt_idx, option in enumerate(options):
                    if not isinstance(option, dict):
                        continue
                    
                    # Ensure option has text and logic
                    if 'text' not in option or not option['text']:
                        continue
                    
                    if 'logic' not in option:
                        option['logic'] = "Plausible distractor"
                    
                    # Check if this is the correct answer
                    logic_upper = str(option['logic']).upper()
                    if logic_upper == 'CA' or 'correct' in logic_upper or 'right' in logic_upper:
                        if not has_correct_answer:
                            option['logic'] = 'CA'
                            has_correct_answer = True
                        else:
                            # Multiple CA found, mark this as distractor
                            option['logic'] = 'Plausible distractor'
                    
                    valid_options.append(option)
                
                # If no correct answer found, mark first option as CA
                if not has_correct_answer and len(valid_options) > 0:
                    valid_options[0]['logic'] = 'CA'
                
                # Ensure we have enough valid options
                while len(valid_options) < num_options:
                    valid_options.append({
                        "text": f"Option {chr(65 + len(valid_options))}",
                        "logic": "Plausible distractor"
                    })
                
                # Trim to exact number needed
                valid_options = valid_options[:num_options]
                
                # Update question with validated options
                question['options'] = valid_options
                
                # Final validation: ensure question text is not empty
                question_text = str(question['question']).strip()
                if len(question_text) < 5:  # Too short to be valid
                    continue
                
                question['question'] = question_text
                
                # Ensure solution field exists (even if empty)
                if 'solution' not in question:
                    question['solution'] = ''
                else:
                    # Ensure solution is a string
                    question['solution'] = str(question['solution']).strip()
                
                # Ensure image field exists and is a valid URL or empty
                if 'image' not in question:
                    question['image'] = ''
                else:
                    # Ensure image is a string and trim whitespace
                    image_str = str(question['image']).strip()
                    question['image'] = image_str if image_str else ''
                
                # Generate image if base question had images
                if should_generate_images:
                    try:
                        # Use image description if provided, otherwise generate from question
                        image_desc = question.get('image', '')
                        generated_image_url = generate_image_for_question(
                            question_text=question['question'],
                            image_description=image_desc if image_desc and len(image_desc) > 10 else None,
                            base_images=images if images else None
                        )
                        if generated_image_url:
                            question['image'] = generated_image_url
                        else:
                            question['image'] = ''  # Clear if generation failed
                    except Exception as e:
                        print(f"Warning: Could not generate image for question {idx}: {str(e)}")
                        question['image'] = ''  # Clear on error
                
                validated_questions.append(question)
                
            except Exception as e:
                # Log error but continue with other questions
                print(f"Error validating question {idx}: {str(e)}")
                continue
        
        # Ensure we have at least some questions
        if len(validated_questions) == 0:
            raise Exception("No valid questions were generated. Please try again or check the base question format.")
        
        # Log how many questions were parsed vs requested
        print(f"DEBUG: Parsed {len(questions)} questions from JSON, validated {len(validated_questions)} questions, requested {num_questions}")
        
        # If we got fewer questions than requested, warn and try to retry or use what we have
        if len(validated_questions) < num_questions:
            print(f"WARNING: Generated only {len(validated_questions)} questions instead of {num_questions}")
            print(f"DEBUG: Original response had {len(questions) if isinstance(questions, list) else 1} questions before validation")
            print(f"DEBUG: First 500 chars of response: {original_content[:500]}")
            
            # If we got way fewer (like only 1 when requesting 5), try to retry or provide better error
            if len(validated_questions) == 1 and num_questions > 1:
                error_details = f"\nParsed {len(questions) if isinstance(questions, list) else 1} questions from JSON"
                error_details += f"\nValidated {len(validated_questions)} questions"
                error_details += f"\nRequested {num_questions} questions"
                error_details += f"\nResponse preview (first 1000 chars):\n{original_content[:1000]}"
                raise Exception(f"Only 1 question was generated instead of {num_questions}.{error_details}")
        
        # ALWAYS return exactly num_questions, even if we need to pad
        # If we have more than requested, trim to requested
        # If we have fewer, we already raised an error above
        if len(validated_questions) > num_questions:
            print(f"DEBUG: Trimmed from {len(validated_questions)} to {num_questions} questions")
        
        return validated_questions[:num_questions]  # Return exactly the requested number
        
    except json.JSONDecodeError as e:
        raise Exception(f"Failed to parse GPT response as JSON: {str(e)}")
    except Exception as e:
        raise Exception(f"Error calling {model}: {str(e)}")

@app.route('/')
def index():
    return send_from_directory('.', 'home.html')

@app.route('/generate')
def generate():
    return send_from_directory('.', 'index.html')

@app.route('/api/generate', methods=['POST'])
def generate_questions():
    try:
        data = request.json
        
        # Validate required fields
        required_fields = ['baseQuestion', 'numCopyQuestions', 'model']
        for field in required_fields:
            if field not in data or not data[field]:
                return jsonify({'error': f'Missing required field: {field}'}), 400
        
        # Use defaults for optional fields
        # Parse number of options from base question if not provided
        base_question = data.get('baseQuestion', '')
        if 'numOptions' in data and data['numOptions']:
            num_options = int(data['numOptions'])
        else:
            # Try to parse from base question
            num_options = parse_number_of_options(base_question)
            print(f"DEBUG: Parsed {num_options} options from base question")
        
        difficulty = data.get('difficulty', 'Medium')  # Default to Medium
        grade = data.get('grade', '')  # Default to empty
        curriculum = data.get('curriculum', '')  # Default to empty
        
        # Generate questions
        questions = generate_questions_with_gpt(
            base_question=data['baseQuestion'],
            notes=data.get('notes', ''),
            solution=data.get('solution', ''),
            images=data.get('images', ''),
            image_files=data.get('imageFiles', []),
            num_options=num_options,
            num_questions=int(data['numCopyQuestions']),
            difficulty=difficulty,
            grade=grade,
            curriculum=curriculum,
            model=data['model'],
            question_type_from_url=data.get('questionType', None)
        )
        
        return jsonify({'questions': questions})
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

if __name__ == '__main__':
    # Allow access from other devices on your network
    # Change to host='0.0.0.0' to allow external connections
    port = int(os.environ.get('PORT', 8080))
    app.run(debug=True, host='0.0.0.0', port=port)

