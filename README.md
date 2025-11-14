# Adaptive Mathematics Question Generator

A web-based application for generating curriculum-aligned mathematics questions for K-12 US state standards. This tool helps educators create high-quality, adaptive questions that assess student understanding across varying difficulty levels.

## Features

- **Multi-State Support**: Generate questions aligned with Common Core, California, Texas, New York, Florida, Virginia, and other state standards
- **Grade Levels K-12**: Comprehensive coverage from Kindergarten through 12th grade
- **Adaptive Difficulty**: Three difficulty levels (Easy, Medium, Hard) with appropriate cognitive demands
- **Sub-Skill Focus**: Target specific mathematical sub-skills within domains
- **Rich Question Format**: Multiple choice, short answer, numeric, and word problems
- **Complete Metadata**: Each question includes standard codes, explanations, cognitive levels, and more

## Getting Started

### Prerequisites

- Node.js 18+ and npm/yarn/pnpm
- OpenAI API key (for question generation)

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd base-question-generator
```

2. Install dependencies:
```bash
npm install
# or
yarn install
# or
pnpm install
```

3. Set up environment variables:
Create a `.env.local` file in the root directory:
```bash
OPENAI_API_KEY=your_openai_api_key_here
```

Get your API key from [OpenAI Platform](https://platform.openai.com/api-keys)

**Note:** If you don't set the API key, the application will return mock data for testing purposes.

4. Run the development server:
```bash
npm run dev
# or
yarn dev
# or
pnpm dev
```

5. Open [http://localhost:3001](http://localhost:3001) in your browser.

**Note:** This project runs on port 3001 to avoid conflicts with other projects running on port 3000.

## Usage

1. **Select State Standards**: Choose from Common Core, California, Texas, New York, Florida, or Virginia standards
2. **Choose Grade Level**: Select from Kindergarten through Grade 12
3. **Pick Domain**: Select a mathematical domain (e.g., Operations, Fractions, Algebra)
4. **Select Sub-Skill**: Choose the specific sub-skill you want to assess
5. **Set Difficulty**: Choose Easy, Medium, or Hard difficulty level
6. **Specify Quantity**: Enter the number of questions to generate (1-10)
7. **Generate**: Click "Generate Questions" to create your questions

## Question Format

Each generated question includes:
- Unique question ID
- State and grade level
- Domain and sub-skill
- Standard code reference
- Difficulty level
- Question text
- Question type (multiple choice, short answer, etc.)
- Correct answer
- Options (for multiple choice)
- Step-by-step explanation
- Estimated completion time
- Cognitive level (Bloom's taxonomy)

## Project Structure

```
base-question-generator/
├── app/
│   ├── api/
│   │   └── generate/
│   │       └── route.ts      # API endpoint for question generation
│   ├── page.tsx               # Main application page
│   ├── layout.tsx             # Root layout
│   └── globals.css            # Global styles
├── components/
│   └── QuestionDisplay.tsx    # Component for displaying questions
├── lib/
│   └── subskills.ts           # Sub-skill data and helper functions
├── types/
│   └── question.ts            # TypeScript type definitions
└── package.json
```

## Technology Stack

- **Next.js 16**: React framework with App Router
- **TypeScript**: Type-safe development
- **Tailwind CSS**: Utility-first styling
- **OpenAI API**: LLM-powered question generation

## Customization

### Adding New Sub-Skills

Edit `lib/subskills.ts` to add new domains and sub-skills for specific grade ranges.

### Modifying Question Generation

The system prompt and generation logic can be customized in `app/api/generate/route.ts`.

### Styling

The application uses Tailwind CSS. Modify `app/globals.css` or component styles as needed.

## Deployment

### Deploy on Vercel

The easiest way to deploy is using [Vercel Platform](https://vercel.com/new):

1. Push your code to GitHub
2. Import the project in Vercel
3. Add your `OPENAI_API_KEY` as an environment variable
4. Deploy

### Environment Variables

Make sure to set `OPENAI_API_KEY` in your deployment environment.

## License

[Add your license here]

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.
