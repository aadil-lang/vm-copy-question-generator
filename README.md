# VM Copy Question Generator - Next.js

A Next.js web application that uses OpenAI GPT models to generate copy questions based on a base question. The application is designed for educators to create multiple variations of mathematical questions aligned with US curricula standards.

## Features

- **Base Question Input**: Enter a base question that serves as the template
- **Smart Question Generation**: 
  - Mathematical questions: Same phrasing with different numbers
  - Word problems: Different real-life context while maintaining mathematical structure
  - Image-based questions: Generate questions with visual elements
- **Curriculum Alignment**: Questions are aligned with US curricula standards and grade levels
- **Customizable Options**: 
  - Number of options (auto-detected or manual)
  - Number of copy questions to generate
  - Difficulty level (Easy, Medium, Hard)
- **Image Support**: Upload images or provide image URLs
- **Notes Field**: Add context-specific notes for question generation
- **Copy Functionality**: Copy individual questions or all questions at once

## Setup Instructions

### Prerequisites

- Node.js 18+ and npm
- OpenAI API key

### Installation

1. Navigate to the nextjs-app directory:
```bash
cd nextjs-app
```

2. Install dependencies:
```bash
npm install
```

3. Create a `.env.local` file in the `nextjs-app` directory and add your OpenAI API key:
```
OPENAI_API_KEY=your_openai_api_key_here
```

4. Copy the curriculum data:
```bash
cp -r ../data ./data
```

5. Run the development server:
```bash
npm run dev
```

6. Open your browser and navigate to:
```
http://localhost:3000
```

## Project Structure

```
nextjs-app/
├── app/
│   ├── api/
│   │   └── generate/
│   │       └── route.ts          # API route for question generation
│   ├── generate/
│   │   └── page.tsx              # Question generator page
│   ├── layout.tsx                # Root layout
│   ├── page.tsx                  # Home page
│   └── globals.css               # Global styles
├── lib/
│   ├── openai.ts                 # OpenAI client utilities
│   ├── curriculum.ts             # Curriculum data utilities
│   └── question-utils.ts         # Question generation utilities
├── data/
│   └── curriculum.json           # Curriculum subskills data
├── public/
│   └── static/
│       └── images/               # Static images
├── package.json
├── tsconfig.json
└── next.config.js
```

## Deployment

### Vercel (Recommended)

1. Push your code to GitHub
2. Go to [Vercel](https://vercel.com) and sign up/login
3. Click "New Project" and import your repository
4. Add environment variable: `OPENAI_API_KEY`
5. Deploy!

### Other Platforms

- **Netlify**: Similar to Vercel, supports Next.js out of the box
- **Railway**: Supports Next.js with automatic deployments
- **Render**: Can deploy Next.js applications

## Environment Variables

- `OPENAI_API_KEY`: Your OpenAI API key (required)

## Notes

- The application uses OpenAI GPT models for question generation
- Ensure you have sufficient OpenAI API credits
- Generated questions include option logic (CA for correct answer, Plausible distractors with explanations)
- Curriculum data supports Common Core, TEKS, VA SOL, FL BEST, and CA CCSS

## License

This project is for educational purposes.

