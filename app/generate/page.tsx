'use client'

import { useState, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'

interface Question {
  question: string
  options: Array<{ text: string; logic: string }>
  image?: string
  solution?: string
}

function GeneratePageContent() {
  const searchParams = useSearchParams()
  const questionType = searchParams.get('type')
  
  const [baseQuestion, setBaseQuestion] = useState('')
  const [numCopyQuestions, setNumCopyQuestions] = useState(5)
  const [notes, setNotes] = useState('')
  const [solution, setSolution] = useState('')
  const [images, setImages] = useState('')
  const [model, setModel] = useState('gpt-4o')
  const [loading, setLoading] = useState(false)
  const [loadingText, setLoadingText] = useState('')
  const [questions, setQuestions] = useState<Question[]>([])
  const [error, setError] = useState('')
  const [selectedQuestions, setSelectedQuestions] = useState<Set<number>>(new Set())
  
  const pageTitle = questionType === 'mathematical' 
    ? 'Mathematical Questions Generator'
    : questionType === 'word-problems'
    ? 'Word Problems Generator'
    : questionType === 'image-based'
    ? 'Image-based Questions Generator'
    : 'Copy Question Generator'
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    setQuestions([])
    
    const loadingMessages = [
      'Analyzing base question...',
      'Generating variations...',
      'Creating options...',
      'Validating questions...',
      'Almost done...'
    ]
    let messageIndex = 0
    const interval = setInterval(() => {
      setLoadingText(loadingMessages[messageIndex % loadingMessages.length])
      messageIndex++
    }, 2000)
    
    try {
      const response = await fetch('/api/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          baseQuestion,
          numCopyQuestions,
          notes,
          solution,
          images,
          model,
          questionType: questionType || null,
        }),
      })
      
      const data = await response.json()
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to generate questions')
      }
      
      if (!data.questions || data.questions.length === 0) {
        throw new Error('No questions were generated. Please try again.')
      }
      
      setQuestions(data.questions)
      setSelectedQuestions(new Set())
    } catch (err: any) {
      setError(err.message || 'An error occurred')
    } finally {
      clearInterval(interval)
      setLoading(false)
      setLoadingText('')
    }
  }
  
  const copyQuestion = (index: number) => {
    const question = questions[index]
    const text = formatQuestionForCopy(question)
    navigator.clipboard.writeText(text)
  }
  
  const copySelected = () => {
    const selected = Array.from(selectedQuestions)
      .map(idx => formatQuestionForCopy(questions[idx]))
      .join('\n\n')
    navigator.clipboard.writeText(selected)
  }
  
  const copyAll = () => {
    const all = questions.map(q => formatQuestionForCopy(q)).join('\n\n')
    navigator.clipboard.writeText(all)
  }
  
  const formatQuestionForCopy = (question: Question): string => {
    let text = question.question + '\n\n'
    question.options.forEach((opt, idx) => {
      text += `${String.fromCharCode(65 + idx)}. ${opt.text}`
      if (opt.logic === 'CA') {
        text += ' (Correct Answer)'
      }
      text += '\n'
    })
    if (question.solution) {
      text += `\nSolution: ${question.solution}`
    }
    return text
  }
  
  const toggleSelection = (index: number) => {
    const newSelected = new Set(selectedQuestions)
    if (newSelected.has(index)) {
      newSelected.delete(index)
    } else {
      newSelected.add(index)
    }
    setSelectedQuestions(newSelected)
  }
  
  return (
    <div className="container">
      <header>
        <div className="header-top">
          <div className="logo-container">
            <img
              src="https://cf.quizizz.com/practice/branding/VoyageMathPremium.png"
              alt="VM Logo"
              className="logo"
              onError={(e) => {
                const target = e.target as HTMLImageElement
                target.src = '/static/images/logo.png'
                target.onerror = () => {
                  target.style.display = 'none'
                }
              }}
            />
          </div>
          <div className="wayground-container">
            <img
              src="https://cdn.prod.website-files.com/68355113496452bf05789e95/68480ff9c322e13a2f937a22_Logo_Dark_Primary_Horizontal_MINIMUM.svg"
              alt="Wayground Logo"
              className="wayground-logo"
              onError={(e) => {
                const target = e.target as HTMLImageElement
                target.src = '/static/images/wayground-logo.svg'
                target.onerror = () => {
                  target.src = '/static/images/wayground-logo.png'
                  target.onerror = () => {
                    target.style.display = 'none'
                  }
                }
              }}
            />
          </div>
        </div>
        <h1>{pageTitle}</h1>
      </header>
      
      <main>
        <form onSubmit={handleSubmit} className="form-container">
          <div className="form-group">
            <label htmlFor="baseQuestion">Enter Base Question *</label>
            <textarea
              id="baseQuestion"
              value={baseQuestion}
              onChange={(e) => setBaseQuestion(e.target.value)}
              rows={4}
              required
              placeholder="Enter your base question here..."
            />
          </div>
          
          {questionType === 'image-based' && (
            <div className="form-group">
              <label htmlFor="images">Images (if any)</label>
              <input
                type="text"
                id="images"
                value={images}
                onChange={(e) => setImages(e.target.value)}
                placeholder="Enter image URLs (comma-separated)"
              />
            </div>
          )}
          
          <div className="form-group">
            <label htmlFor="numCopyQuestions">Number of Copy Questions *</label>
            <input
              type="number"
              id="numCopyQuestions"
              value={numCopyQuestions}
              onChange={(e) => setNumCopyQuestions(parseInt(e.target.value, 10))}
              min={1}
              max={20}
              required
            />
          </div>
          
          <div className="form-group">
            <label htmlFor="notes">SME Notes</label>
            <textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              placeholder="Enter any notes related to the base question..."
            />
          </div>
          
          <div className="form-group">
            <label htmlFor="solution">Solution Breakdown (if any)</label>
            <textarea
              id="solution"
              value={solution}
              onChange={(e) => setSolution(e.target.value)}
              rows={4}
              placeholder="Enter the solution breakdown/steps for the base question..."
            />
          </div>
          
          <div className="form-group">
            <label htmlFor="model">LLM Model *</label>
            <select
              id="model"
              value={model}
              onChange={(e) => setModel(e.target.value)}
              required
            >
              <option value="gpt-5">GPT-5</option>
              <option value="gpt-4o">GPT-4o</option>
              <option value="gpt-4-turbo">GPT-4 Turbo</option>
              <option value="gpt-4">GPT-4</option>
            </select>
          </div>
          
          <div className="button-group">
            <button type="submit" className="btn btn-primary" disabled={loading}>
              Generate Questions
            </button>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={copySelected}
              disabled={selectedQuestions.size === 0 || loading}
            >
              Copy Selected ({selectedQuestions.size})
            </button>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={copyAll}
              disabled={questions.length === 0 || loading}
            >
              Copy All Questions
            </button>
            <Link href="/" className="btn btn-secondary">
              ← Back to Home
            </Link>
          </div>
        </form>
        
        {loading && (
          <div className="loading">
            <p>{loadingText || 'Generating questions...'}</p>
          </div>
        )}
        
        {error && (
          <div className="error">
            {error}
          </div>
        )}
        
        {questions.length > 0 && (
          <div className="results">
            <h2>Generated Copy Questions</h2>
            <div className="questions-container">
              {questions.map((question, index) => (
                <div key={index} className="question-card">
                  <div className="question-header">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <input
                        type="checkbox"
                        checked={selectedQuestions.has(index)}
                        onChange={() => toggleSelection(index)}
                      />
                      <span className="question-number">Question {index + 1}</span>
                    </div>
                    <div className="button-group-inline">
                      <button
                        className="btn btn-secondary"
                        onClick={() => copyQuestion(index)}
                      >
                        Copy
                      </button>
                    </div>
                  </div>
                  <div className="question-text">{question.question}</div>
                  {question.image && (
                    <img
                      src={question.image}
                      alt="Question Image"
                      className="question-image"
                      onError={(e) => {
                        (e.target as HTMLImageElement).style.display = 'none'
                      }}
                    />
                  )}
                  {question.options && question.options.length > 0 && (
                    <>
                      <h3 className="options-heading">Options</h3>
                      <ul className="options-list">
                        {question.options.map((option, optIndex) => {
                          const isCorrect = option.logic === 'CA'
                          return (
                            <li key={optIndex} className={isCorrect ? 'correct' : 'incorrect'}>
                              <span className="option-label">
                                {String.fromCharCode(65 + optIndex)}.
                              </span>
                              <div>
                                <div>{option.text}</div>
                                <div className="option-logic">
                                  Logic: {option.logic}
                                </div>
                              </div>
                            </li>
                          )
                        })}
                      </ul>
                    </>
                  )}
                  {question.solution && (
                    <div className="solution-container">
                      <h3 className="solution-title">Solution:</h3>
                      <div className="solution-text">{question.solution}</div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  )
}

export default function GeneratePage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <GeneratePageContent />
    </Suspense>
  )
}

