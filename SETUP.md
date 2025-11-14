# Next.js Setup Instructions

## Prerequisites

1. **Install Node.js** (version 18 or higher)
   - Download from: https://nodejs.org/
   - Or use Homebrew: `brew install node`

2. **Verify installation**:
   ```bash
   node --version
   npm --version
   ```

## Setup Steps

1. **Navigate to the Next.js app directory**:
   ```bash
   cd nextjs-app
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Copy curriculum data**:
   ```bash
   cp -r ../data ./data
   ```

4. **Create environment file**:
   ```bash
   cp .env.local.example .env.local
   ```

5. **Edit `.env.local`** and add your OpenAI API key:
   ```
   OPENAI_API_KEY=your_actual_api_key_here
   ```

6. **Run the development server**:
   ```bash
   npm run dev
   ```

7. **Open your browser**:
   ```
   http://localhost:3000
   ```

## Project Structure

```
nextjs-app/
├── app/
│   ├── api/
│   │   └── generate/
│   │       └── route.ts          # API route
│   ├── generate/
│   │   └── page.tsx               # Generate page
│   ├── layout.tsx                 # Root layout
│   ├── page.tsx                    # Home page
│   └── globals.css                # Global styles
├── lib/
│   ├── openai.ts                  # OpenAI utilities
│   ├── curriculum.ts              # Curriculum utilities
│   └── question-utils.ts          # Question utilities
├── data/
│   └── curriculum.json            # Curriculum data
├── public/
│   └── static/
│       └── images/                # Static images
└── package.json
```

## Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm start` - Start production server
- `npm run lint` - Run ESLint

## Deployment

### Vercel (Recommended)

1. Push code to GitHub
2. Go to https://vercel.com
3. Import your repository
4. Add environment variable: `OPENAI_API_KEY`
5. Deploy!

### Other Platforms

- **Netlify**: Supports Next.js
- **Railway**: Auto-deploys from GitHub
- **Render**: Supports Next.js applications

## Troubleshooting

### Module not found errors
```bash
npm install
```

### Port 3000 already in use
```bash
# Kill the process
lsof -ti:3000 | xargs kill -9

# Or use a different port
PORT=3001 npm run dev
```

### OpenAI API errors
- Check `.env.local` file exists
- Verify `OPENAI_API_KEY` is set correctly
- Ensure API key is valid and has credits

### TypeScript errors
```bash
npm install --save-dev @types/node @types/react @types/react-dom
```

