# VM Copy Question Generator

A web application that uses GPT-5 to generate copy questions based on a base question. The application is designed for educators to create multiple variations of mathematical questions aligned with US curricula standards (Common Core, TEKS, VA SOL, FL BEST, CA CCSS).

## Features

- **Base Question Input**: Enter a base question that serves as the template
- **Smart Question Generation**: 
  - Mathematical questions: Same phrasing with different numbers
  - Word problems: Different real-life context while maintaining mathematical structure
- **Curriculum Alignment**: Questions are aligned with US curricula standards and grade levels
- **Customizable Options**: 
  - Number of options (1-4)
  - Number of copy questions to generate
  - Difficulty level (Easy, Medium, Hard)
- **Image Support**: Upload images or provide image URLs
- **Notes Field**: Add context-specific notes for question generation
- **Copy Functionality**: Copy individual questions or all questions at once

## Setup Instructions

### Prerequisites

- Python 3.8 or higher
- OpenAI API key

### Installation

1. Clone or download this repository

2. Install the required packages:
```bash
pip install -r requirements.txt
```

3. Create a `.env` file in the root directory and add your OpenAI API key:
```
OPENAI_API_KEY=your_openai_api_key_here
```

4. Run the application:
```bash
python app.py
```

5. Open your web browser and navigate to:
```
http://localhost:5000
```

## Usage

1. **Enter Base Question**: Type or paste your base question in the text area
2. **Add Notes (Optional)**: Include any specific instructions or context for generating copy questions
3. **Upload/Add Images (Optional)**: Either upload image files or provide image URLs
4. **Select Options**:
   - Number of options (1-4)
   - Number of copy questions to generate
   - Difficulty level
   - Grade level
   - Curriculum standard
5. **Generate**: Click the "Generate Questions" button
6. **Copy**: Use the "Copy All Questions" button to copy all generated questions at once, or copy individual questions using the "Copy" button on each question card

## Project Structure

```
.
├── app.py                  # Flask backend application
├── index.html             # Main HTML file
├── requirements.txt       # Python dependencies
├── README.md             # This file
├── .env                  # Environment variables (create this)
├── data/
│   └── curriculum.json   # Curriculum subskills data
└── static/
    ├── css/
    │   └── style.css     # Stylesheet
    └── js/
        └── main.js       # Frontend JavaScript
```

## Curriculum Support

The application includes comprehensive curriculum data for:
- **Common Core** (Kindergarten - Grade 12)
- **TEKS** (Texas Essential Knowledge and Skills) (Kindergarten - Grade 12)
- **VA SOL** (Virginia Standards of Learning) (Kindergarten - Grade 12)
- **FL BEST** (Florida B.E.S.T. Standards) (Kindergarten - Grade 12)
- **CA CCSS** (California Common Core State Standards) (Kindergarten - Grade 12)

Each curriculum includes grade-specific subskills that are used to guide question generation.

## Notes

- The application uses GPT-5 model from OpenAI for question generation
- Ensure you have sufficient OpenAI API credits
- Generated questions include option logic (CA for correct answer, Plausible distractors with explanations)
- **Logo Setup**: The logo uses the VoyageMath image from Google Images. If the logo doesn't load:
  1. Download the logo image from https://share.google/images/ma6J8RAyZWr3zblAs
  2. Save it as `static/images/logo.png`
  3. The fallback will automatically use the local image

## License

This project is for educational purposes.

