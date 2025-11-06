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
  const [uploadedImages, setUploadedImages] = useState<File[]>([])
  const [imagePreviews, setImagePreviews] = useState<string[]>([])
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
      // Convert uploaded images to base64
      const imageBase64Array = uploadedImages.length > 0 
        ? await convertImagesToBase64(uploadedImages)
        : []
      
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
          imageFiles: imageBase64Array,
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
      } else if (opt.logic) {
        text += ` (Logic: ${opt.logic})`
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
  
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files) return
    
    const newFiles = Array.from(files)
    const validFiles = newFiles.filter(file => {
      const isValidType = file.type.startsWith('image/')
      const isValidSize = file.size <= 10 * 1024 * 1024 // 10MB limit
      return isValidType && isValidSize
    })
    
    if (validFiles.length !== newFiles.length) {
      setError('Some files were rejected. Only image files under 10MB are allowed.')
      setTimeout(() => setError(''), 5000)
    }
    
    setUploadedImages(prev => [...prev, ...validFiles])
    
    // Create previews
    validFiles.forEach(file => {
      const reader = new FileReader()
      reader.onloadend = () => {
        setImagePreviews(prev => [...prev, reader.result as string])
      }
      reader.readAsDataURL(file)
    })
  }
  
  const removeImage = (index: number) => {
    setUploadedImages(prev => prev.filter((_, i) => i !== index))
    setImagePreviews(prev => prev.filter((_, i) => i !== index))
  }
  
  const convertImagesToBase64 = async (files: File[]): Promise<string[]> => {
    const base64Promises = files.map(file => {
      return new Promise<string>((resolve, reject) => {
        const reader = new FileReader()
        reader.onloadend = () => {
          const base64String = reader.result as string
          resolve(base64String)
        }
        reader.onerror = reject
        reader.readAsDataURL(file)
      })
    })
    return Promise.all(base64Promises)
  }
  
  return (
    <div className="container">
      <header style={{ padding: '40px 30px', minHeight: '180px', position: 'relative' }}>
        <Link href="/" className="btn btn-secondary" style={{ position: 'absolute', top: '20px', left: '30px' }}>
          ← Back to Home
        </Link>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', marginTop: '10px' }}>
          <div style={{ flex: '1' }}></div>
          <div className="logo-container" style={{ flex: '1', display: 'flex', justifyContent: 'center' }}>
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
          <div className="wayground-container" style={{ flex: '1', display: 'flex', justifyContent: 'flex-end', alignItems: 'flex-start', marginTop: '-48px' }}>
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
        <h1 style={{ textAlign: 'center', marginTop: '20px' }}>{pageTitle}</h1>
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
            <>
              <div className="form-group">
                <label htmlFor="images">Image Description (if any)</label>
                <input
                  type="text"
                  id="images"
                  value={images}
                  onChange={(e) => setImages(e.target.value)}
                  placeholder="Enter image description or URLs (comma-separated)"
                />
              </div>
              
              <div className="form-group">
                <label htmlFor="imageUpload">Upload Images</label>
                <input
                  type="file"
                  id="imageUpload"
                  accept="image/*"
                  multiple
                  onChange={handleImageUpload}
                  style={{ display: 'none' }}
                />
                <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
                  <button
                    type="button"
                    onClick={() => document.getElementById('imageUpload')?.click()}
                    className="btn btn-secondary"
                    style={{ marginBottom: '10px' }}
                  >
                    📷 Upload Images
                  </button>
                  {uploadedImages.length > 0 && (
                    <span style={{ color: '#666', fontSize: '14px' }}>
                      {uploadedImages.length} image{uploadedImages.length > 1 ? 's' : ''} selected
                    </span>
                  )}
                </div>
                
                {imagePreviews.length > 0 && (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', marginTop: '10px' }}>
                    {imagePreviews.map((preview, index) => (
                      <div key={index} style={{ position: 'relative', display: 'inline-block' }}>
                        <img
                          src={preview}
                          alt={`Preview ${index + 1}`}
                          style={{
                            width: '100px',
                            height: '100px',
                            objectFit: 'cover',
                            border: '1px solid #ddd',
                            borderRadius: '4px',
                            cursor: 'pointer'
                          }}
                        />
                        <button
                          type="button"
                          onClick={() => removeImage(index)}
                          style={{
                            position: 'absolute',
                            top: '-8px',
                            right: '-8px',
                            background: '#ff4444',
                            color: 'white',
                            border: 'none',
                            borderRadius: '50%',
                            width: '24px',
                            height: '24px',
                            cursor: 'pointer',
                            fontSize: '14px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                          }}
                          title="Remove image"
                        >
                          ×
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}
          
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
          
          <div style={{ display: 'flex', gap: '20px', alignItems: 'flex-end' }}>
            <div className="form-group" style={{ flex: '1', maxWidth: '200px' }}>
              <label htmlFor="numCopyQuestions">Number of Copy Questions *</label>
              <input
                type="number"
                id="numCopyQuestions"
                value={numCopyQuestions}
                onChange={(e) => setNumCopyQuestions(parseInt(e.target.value, 10))}
                min={1}
                max={20}
                required
                style={{ width: '100%' }}
              />
            </div>
            
            <div className="form-group" style={{ flex: '1', maxWidth: '200px' }}>
              <label htmlFor="model">LLM Model *</label>
              <select
                id="model"
                value={model}
                onChange={(e) => setModel(e.target.value)}
                required
                style={{ width: '100%' }}
              >
                <option value="gpt-5">GPT-5</option>
                <option value="gpt-4o">GPT-4o</option>
                <option value="gpt-4-turbo">GPT-4 Turbo</option>
                <option value="gpt-4">GPT-4</option>
              </select>
            </div>
          </div>
          
          <div className="button-group" style={{ flexDirection: 'column', gap: '10px' }}>
            <button type="submit" className="btn btn-primary" disabled={loading} style={{ width: '100%' }}>
              Generate Questions
            </button>
            <div style={{ display: 'flex', gap: '10px', width: '100%' }}>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={copySelected}
                disabled={selectedQuestions.size === 0 || loading}
                style={{ flex: '1' }}
              >
                Copy Selected ({selectedQuestions.size})
              </button>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={copyAll}
                disabled={questions.length === 0 || loading}
                style={{ flex: '1' }}
              >
                Copy All Questions
              </button>
            </div>
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

