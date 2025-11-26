'use client'

import React, { useState } from 'react'

interface Question {
  difficulty?: string
  question: string
  options: Array<{ text: string; logic: string }>
  image?: string
  solution?: string
  difficultyReasoning?: string
  scaffoldingExplanation?: string
}

export default function BaseGeneratePage() {
  const [stateStandards, setStateStandards] = useState('')
  const [gradeLevel, setGradeLevel] = useState('')
  const [domain, setDomain] = useState('')
  const [subSkill, setSubSkill] = useState('')
  const [standardCode, setStandardCode] = useState('')
  const [notes, setNotes] = useState('')
  const [setOfQuestions, setSetOfQuestions] = useState('1')
  const [model, setModel] = useState('gpt-4o')
  const [loading, setLoading] = useState(false)
  const [questions, setQuestions] = useState<Question[]>([])
  const [error, setError] = useState('')
  const [copiedQuestionIndex, setCopiedQuestionIndex] = useState<number | null>(null)
  const [showSolutionsByDefault, setShowSolutionsByDefault] = useState('hidden')
  const [visibleSolutions, setVisibleSolutions] = useState<Set<number>>(new Set())

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    setQuestions([])

    try {
      const response = await fetch('/api/base-generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          stateStandards,
          gradeLevel,
          domain,
          subSkill,
          standardCode,
          notes,
          setOfQuestions,
          model,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to generate questions')
      }

      const generatedQuestions = data.questions || []
      setQuestions(generatedQuestions)
      
      // Initialize visible solutions based on default setting
      if (showSolutionsByDefault === 'visible') {
        setVisibleSolutions(new Set(generatedQuestions.map((_: Question, index: number) => index)))
      } else {
        setVisibleSolutions(new Set())
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred while generating questions')
    } finally {
      setLoading(false)
    }
  }

  const toggleSolution = (index: number) => {
    setVisibleSolutions(prev => {
      const newSet = new Set(prev)
      if (newSet.has(index)) {
        newSet.delete(index)
      } else {
        newSet.add(index)
      }
      return newSet
    })
  }

  const formatQuestionForCopy = (question: Question): string => {
    // Format: Question text with spacing, then each option on its own line (all in one cell)
    // Format: Question text followed by spaces so options wrap to next line
    // Each option also has spacing after it so the next option wraps to a new line
    // This ensures each option appears on its own line when pasted into spreadsheets with word wrap
    let text = question.question
    
    // Add image description below question text if it exists
    if (question.image) {
      text += ' '.repeat(100) // Add spacing before image description
      text += `Image Description: ${question.image}`
    }
    
    // Add multiple spaces to ensure first option wraps to next line
    text += ' '.repeat(100) // Add 100 spaces to push first option to next line
    
    // Add options with logic, each with spacing after to push next option to new line
    question.options.forEach((opt, idx) => {
      let optionText = `${String.fromCharCode(65 + idx)}) ${opt.text}`
      if (opt.logic === 'CA') {
        optionText += ' (Correct Answer)'
      } else if (opt.logic) {
        optionText += ` (Logic: ${opt.logic})`
      }
      text += optionText
      if (idx < question.options.length - 1) {
        text += ' '.repeat(100) // Add spacing after each option (except last) to push next to new line
      }
    })
    
    return text
  }

  const copyQuestion = (index: number) => {
    const question = questions[index]
    const text = formatQuestionForCopy(question)
    navigator.clipboard.writeText(text)
    // Show green feedback
    setCopiedQuestionIndex(index)
    setTimeout(() => setCopiedQuestionIndex(null), 20000) // Reset after 20 seconds
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: 'white',
      color: '#333',
      padding: '20px',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Oxygen, Ubuntu, Cantarell, sans-serif'
    }}>
      <div style={{
        maxWidth: '1400px',
        margin: '0 auto',
        padding: '40px 0'
      }}>
        {/* Header */}
        <div style={{
          background: '#e6d5f7',
          borderRadius: '12px',
          padding: '20px 30px 30px 30px',
          marginBottom: '40px',
          borderBottom: '3px solid #5a2d7a'
        }}>
          <div className="header-top" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', marginBottom: '20px' }}>
            <div className="logo-container" style={{ display: 'flex', justifyContent: 'flex-start', flex: '1' }}>
              <img
                src="https://cf.quizizz.com/practice/branding/VoyageMathPremium.png"
                alt="VM Logo"
                className="logo"
                style={{ maxHeight: '60px', width: 'auto', objectFit: 'contain' }}
                onError={(e) => {
                  const target = e.target as HTMLImageElement
                  target.src = '/static/images/logo.png'
                  target.onerror = () => {
                    target.style.display = 'none'
                  }
                }}
              />
            </div>
            <div className="wayground-container" style={{ display: 'flex', justifyContent: 'flex-end', flex: '1' }}>
              <img
                src="https://cdn.prod.website-files.com/68355113496452bf05789e95/68480ff9c322e13a2f937a22_Logo_Dark_Primary_Horizontal_MINIMUM.svg"
                alt="Wayground Logo"
                className="wayground-logo"
                style={{ maxHeight: '60px', width: 'auto', objectFit: 'contain' }}
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
          <h1 style={{
            fontSize: '2.5em',
            fontWeight: '700',
            marginBottom: '10px',
            color: '#5a2d7a',
            textAlign: 'center'
          }}>
            Base Question Generator
          </h1>
          <p style={{
            fontSize: '1.1em',
            color: '#666',
            margin: 0,
            textAlign: 'center'
          }}>
            US State Curriculum Alignment
          </p>
        </div>

        {/* Main Content - Two Panels */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: '30px',
          minHeight: '600px'
        }}>
          {/* Left Panel - Question Parameters */}
          <div style={{
            background: '#f5f5f5',
            borderRadius: '12px',
            padding: '30px',
            display: 'flex',
            flexDirection: 'column',
            gap: '25px'
          }}>
            <h2 style={{
              fontSize: '1.5em',
              fontWeight: '600',
              marginBottom: '10px',
              color: '#333'
            }}>
              Question Parameters
            </h2>

            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '25px', flex: 1 }}>
              {/* State Standards */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <label style={{
                  fontSize: '0.95em',
                  color: '#333',
                  fontWeight: '500'
                }}>
                  State Standards
                </label>
                <select
                  value={stateStandards}
                  onChange={(e) => setStateStandards(e.target.value)}
                  style={{
                    padding: '12px',
                    background: 'white',
                    border: '1px solid #d4c1e8',
                    borderRadius: '8px',
                    color: '#333',
                    fontSize: '1em',
                    cursor: 'pointer'
                  }}
                >
                  <option value="">Select State Standards</option>
                  <option value="CCSS">Common Core State Standards (CCSS)</option>
                  <option value="TEKS">Texas Essential Knowledge and Skills (TEKS)</option>
                  <option value="FL">Florida Standards</option>
                  <option value="CA">California Standards</option>
                  <option value="VA">Virginia Standards of Learning (SOL)</option>
                </select>
              </div>

              {/* Grade Level */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <label style={{
                  fontSize: '0.95em',
                  color: '#333',
                  fontWeight: '500'
                }}>
                  Grade Level
                </label>
                <select
                  value={gradeLevel}
                  onChange={(e) => setGradeLevel(e.target.value)}
                  style={{
                    padding: '12px',
                    background: 'white',
                    border: '1px solid #d4c1e8',
                    borderRadius: '8px',
                    color: '#333',
                    fontSize: '1em',
                    cursor: 'pointer'
                  }}
                >
                  <option value="">Select Grade Level</option>
                  {Array.from({ length: 12 }, (_, i) => i + 1).map(grade => (
                    <option key={grade} value={grade.toString()}>Grade {grade}</option>
                  ))}
                </select>
              </div>

              {/* Domain */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <label style={{
                  fontSize: '0.95em',
                  color: '#333',
                  fontWeight: '500'
                }}>
                  Domain
                </label>
                <input
                  type="text"
                  value={domain}
                  onChange={(e) => setDomain(e.target.value)}
                  placeholder="Enter domain (e.g., Operations, Algebra, Geometry)"
                  style={{
                    padding: '12px',
                    background: 'white',
                    border: '1px solid #d4c1e8',
                    borderRadius: '8px',
                    color: '#333',
                    fontSize: '1em'
                  }}
                />
              </div>

              {/* Sub-skill */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <label style={{
                  fontSize: '0.95em',
                  color: '#333',
                  fontWeight: '500'
                }}>
                  Sub-skill
                </label>
                <input
                  type="text"
                  value={subSkill}
                  onChange={(e) => setSubSkill(e.target.value)}
                  placeholder="Enter sub-skill (e.g., Addition, Multiplication, Area)"
                  style={{
                    padding: '12px',
                    background: 'white',
                    border: '1px solid #d4c1e8',
                    borderRadius: '8px',
                    color: '#333',
                    fontSize: '1em'
                  }}
                />
              </div>

              {/* Standard Code */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <label style={{
                  fontSize: '0.95em',
                  color: '#333',
                  fontWeight: '500'
                }}>
                  Standard Code
                </label>
                <input
                  type="text"
                  value={standardCode}
                  onChange={(e) => setStandardCode(e.target.value)}
                  placeholder="Enter standard code (e.g., 5.NBT.1, 7.EE.2)"
                  style={{
                    padding: '12px',
                    background: 'white',
                    border: '1px solid #d4c1e8',
                    borderRadius: '8px',
                    color: '#333',
                    fontSize: '1em'
                  }}
                />
              </div>

              {/* Notes */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <label style={{
                  fontSize: '0.95em',
                  color: '#333',
                  fontWeight: '500'
                }}>
                  Notes
                </label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Enter any additional notes or instructions for question generation (optional)"
                  rows={4}
                  style={{
                    padding: '12px',
                    background: 'white',
                    border: '1px solid #d4c1e8',
                    borderRadius: '8px',
                    color: '#333',
                    fontSize: '1em',
                    fontFamily: 'inherit',
                    resize: 'vertical'
                  }}
                />
              </div>

              {/* Set(s) of Questions */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <label style={{
                  fontSize: '0.95em',
                  color: '#333',
                  fontWeight: '500'
                }}>
                  Set(s) of Questions
                </label>
                <select
                  value={setOfQuestions}
                  onChange={(e) => setSetOfQuestions(e.target.value)}
                  style={{
                    padding: '12px',
                    background: 'white',
                    border: '1px solid #d4c1e8',
                    borderRadius: '8px',
                    color: '#333',
                    fontSize: '1em',
                    cursor: 'pointer'
                  }}
                >
                  <option value="1">1</option>
                  <option value="2">2</option>
                  <option value="3">3</option>
                </select>
              </div>

              {/* Model Selection */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <label style={{
                  fontSize: '0.95em',
                  color: '#333',
                  fontWeight: '500'
                }}>
                  Model
                </label>
                <select
                  value={model}
                  onChange={(e) => setModel(e.target.value)}
                  style={{
                    padding: '12px',
                    background: 'white',
                    border: '1px solid #d4c1e8',
                    borderRadius: '8px',
                    color: '#333',
                    fontSize: '1em',
                    cursor: 'pointer'
                  }}
                >
                  <optgroup label="OpenAI">
                    <option value="gpt-4o">GPT-4o</option>
                    <option value="gpt-5">GPT-5</option>
                    <option value="o3">o3</option>
                    <option value="o4-mini">o4-mini</option>
                  </optgroup>
                  <optgroup label="Google Gemini">
                    <option value="gemini-1.5-pro">Gemini 1.5 Pro</option>
                    <option value="gemini-1.5-flash">Gemini 1.5 Flash</option>
                  </optgroup>
                </select>
              </div>

              {/* Solution Visibility */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <label style={{
                  fontSize: '0.95em',
                  color: '#333',
                  fontWeight: '500'
                }}>
                  Solution Visibility
                </label>
                <select
                  value={showSolutionsByDefault}
                  onChange={(e) => setShowSolutionsByDefault(e.target.value)}
                  style={{
                    padding: '12px',
                    background: 'white',
                    border: '1px solid #d4c1e8',
                    borderRadius: '8px',
                    color: '#333',
                    fontSize: '1em',
                    cursor: 'pointer'
                  }}
                >
                  <option value="hidden">Hidden by default (use View solution button)</option>
                  <option value="visible">Visible by default</option>
                </select>
              </div>

              {/* Generate Questions Button */}
              <button
                type="submit"
                disabled={loading}
                style={{
                  marginTop: 'auto',
                  padding: '16px',
                  background: loading ? '#999' : '#5a2d7a',
                  border: 'none',
                  borderRadius: '8px',
                  color: 'white',
                  fontSize: '1.1em',
                  fontWeight: '600',
                  cursor: loading ? 'not-allowed' : 'pointer',
                  transition: 'all 0.3s',
                  opacity: loading ? 0.6 : 1
                }}
                onMouseEnter={(e) => {
                  if (!loading) {
                    e.currentTarget.style.background = '#764ba2'
                  }
                }}
                onMouseLeave={(e) => {
                  if (!loading) {
                    e.currentTarget.style.background = '#5a2d7a'
                  }
                }}
              >
                 {loading ? 'Generating...' : 'Generate Questions (Easy, Medium, Hard)'}
              </button>
            </form>
          </div>

          {/* Right Panel - Results Area */}
          <div style={{
            background: 'white',
            borderRadius: '12px',
            padding: '30px',
            display: 'flex',
            flexDirection: 'column',
            overflowY: 'auto',
            maxHeight: 'calc(100vh - 250px)',
            border: '1px solid #e0e0e0'
          }}>
            {loading ? (
              <div style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                textAlign: 'center',
                flex: 1
              }}>
                <div style={{
                  width: '50px',
                  height: '50px',
                  border: '4px solid #e0e0e0',
                  borderTop: '4px solid #5a2d7a',
                  borderRadius: '50%',
                  animation: 'spin 1s linear infinite',
                  marginBottom: '20px'
                }}></div>
                <p style={{ color: '#666' }}>Generating questions...</p>
              </div>
            ) : error ? (
              <div style={{
                padding: '20px',
                background: '#fee',
                border: '1px solid #c33',
                borderRadius: '8px',
                color: '#c33'
              }}>
                <strong>Error:</strong> {error}
              </div>
            ) : questions.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                {questions.map((question, index) => (
                  <div key={index} style={{
                    background: '#f9f9f9',
                    borderRadius: '8px',
                    padding: '20px',
                    border: '1px solid #e0e0e0'
                  }}>
                    <h3 style={{
                      fontSize: '1.2em',
                      fontWeight: '600',
                      marginBottom: '15px',
                      color: '#5a2d7a'
                    }}>
                      <div style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        width: '100%'
                      }}>
                        <span>{question.difficulty ? `${question.difficulty} Level` : `Question ${index + 1}`}</span>
                        <button
                          onClick={() => copyQuestion(index)}
                          style={{
                            padding: '8px 16px',
                            background: copiedQuestionIndex === index ? '#4caf50' : '#5a2d7a',
                            color: 'white',
                            border: 'none',
                            borderRadius: '6px',
                            fontSize: '0.9em',
                            fontWeight: '500',
                            cursor: 'pointer',
                            transition: 'all 0.3s',
                            whiteSpace: 'nowrap'
                          }}
                          onMouseEnter={(e) => {
                            if (copiedQuestionIndex !== index) {
                              e.currentTarget.style.background = '#764ba2'
                            }
                          }}
                          onMouseLeave={(e) => {
                            if (copiedQuestionIndex !== index) {
                              e.currentTarget.style.background = '#5a2d7a'
                            }
                          }}
                        >
                          {copiedQuestionIndex === index ? '✓ Copied!' : 'Copy'}
                        </button>
                      </div>
                    </h3>
                    {question.difficultyReasoning && (
                      <div style={{
                        marginBottom: '15px',
                        padding: '12px',
                        background: '#e3f2fd',
                        borderRadius: '6px',
                        border: '1px solid #90caf9'
                      }}>
                        <strong style={{ color: '#1976d2', display: 'block', marginBottom: '6px', fontSize: '0.95em' }}>
                          Why {question.difficulty}?
                        </strong>
                        <p style={{
                          fontSize: '0.9em',
                          lineHeight: '1.6',
                          color: '#333',
                          margin: 0
                        }}>
                          {question.difficultyReasoning}
                        </p>
                      </div>
                    )}
                    {question.scaffoldingExplanation && (
                      <div style={{
                        marginBottom: '15px',
                        padding: '12px',
                        background: '#f3e5f5',
                        borderRadius: '6px',
                        border: '1px solid #ce93d8'
                      }}>
                        <strong style={{ color: '#7b1fa2', display: 'block', marginBottom: '6px', fontSize: '0.95em' }}>
                          Learning Progression:
                        </strong>
                        <p style={{
                          fontSize: '0.9em',
                          lineHeight: '1.6',
                          color: '#333',
                          margin: 0
                        }}>
                          {question.scaffoldingExplanation}
                        </p>
                      </div>
                    )}
                    <p style={{
                      fontSize: '1em',
                      lineHeight: '1.6',
                      marginBottom: '15px',
                      color: '#333'
                    }}>
                      {question.question}
                    </p>
                    <div style={{ marginBottom: '15px' }}>
                      <strong style={{ color: '#5a2d7a', display: 'block', marginBottom: '8px' }}>Options:</strong>
                      <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                        {question.options.map((opt, optIdx) => (
                          <li key={optIdx} style={{
                            padding: '8px',
                            marginBottom: '5px',
                            background: opt.logic === 'CA' ? '#e8f5e9' : '#f5f5f5',
                            borderLeft: opt.logic === 'CA' ? '3px solid #4caf50' : '3px solid #e0e0e0',
                            borderRadius: '4px',
                            color: '#333'
                          }}>
                            <strong>{String.fromCharCode(65 + optIdx)})</strong> {opt.text}
                            {opt.logic && opt.logic !== 'CA' && (
                              <span style={{ fontSize: '0.9em', color: '#666', fontStyle: 'italic', marginLeft: '10px' }}>
                                ({opt.logic})
                              </span>
                            )}
                            {opt.logic === 'CA' && (
                              <span style={{ fontSize: '0.9em', color: '#4caf50', fontWeight: '600', marginLeft: '10px' }}>
                                (Correct Answer)
                              </span>
                            )}
                          </li>
                        ))}
                      </ul>
                    </div>
                    {question.solution && (
                      <div style={{ marginBottom: '15px', display: 'flex', justifyContent: 'flex-start' }}>
                        <button
                          onClick={() => toggleSolution(index)}
                          style={{
                            padding: '8px 16px',
                            background: visibleSolutions.has(index) ? '#ff9800' : '#5a2d7a',
                            color: 'white',
                            border: 'none',
                            borderRadius: '6px',
                            fontSize: '0.9em',
                            fontWeight: '500',
                            cursor: 'pointer',
                            transition: 'all 0.3s',
                            whiteSpace: 'nowrap'
                          }}
                          onMouseEnter={(e) => {
                            if (!visibleSolutions.has(index)) {
                              e.currentTarget.style.background = '#764ba2'
                            }
                          }}
                          onMouseLeave={(e) => {
                            if (!visibleSolutions.has(index)) {
                              e.currentTarget.style.background = '#5a2d7a'
                            }
                          }}
                        >
                          {visibleSolutions.has(index) ? 'Hide solution' : 'View solution'}
                        </button>
                      </div>
                    )}
                    {question.solution && visibleSolutions.has(index) && (
                      <div style={{
                        marginTop: '15px',
                        padding: '15px',
                        background: '#f5f5f5',
                        borderRadius: '6px',
                        border: '1px solid #e0e0e0'
                      }}>
                        <strong style={{ color: '#5a2d7a', display: 'block', marginBottom: '10px' }}>Solution:</strong>
                        <div style={{
                          color: '#333',
                          lineHeight: '1.8',
                          whiteSpace: 'pre-line'
                        }}>
                          {((): React.ReactNode => {
                            // Handle both actual newlines and literal \n strings
                            let solutionText = question.solution
                            
                            // Replace literal \n strings with actual newlines
                            solutionText = solutionText.replace(/\\n/g, '\n')
                            
                            // Split by newlines
                            const lines = solutionText.split(/\n+/)
                            
                            // If no newlines found, try splitting by "Step" pattern
                            if (lines.length === 1 && solutionText.includes('Step')) {
                              const stepMatches = solutionText.match(/(Step\s*\d+[:\-]?[^\n]*)/gi)
                              if (stepMatches && stepMatches.length > 1) {
                                return stepMatches.map((step, idx) => {
                                  const trimmedStep = step.trim()
                                  const isStep = /^(Step\s*\d+)/i.test(trimmedStep)
                                  return (
                                    <div
                                      key={idx}
                                      style={{
                                        marginBottom: isStep ? '10px' : '4px',
                                        fontWeight: isStep ? '600' : '400',
                                        color: isStep ? '#5a2d7a' : '#333',
                                        paddingLeft: isStep ? '0' : '20px'
                                      }}
                                    >
                                      {trimmedStep}
                                    </div>
                                  )
                                })
                              }
                            }
                            
                            // Normal processing with newlines
                            return lines.map((line, idx) => {
                              const trimmedLine = line.trim()
                              if (!trimmedLine) return <br key={idx} />
                              const isStep = /^(Step\s*\d+|^\d+\.|^[A-Z]\.)/i.test(trimmedLine)
                              return (
                                <div
                                  key={idx}
                                  style={{
                                    marginBottom: isStep ? '10px' : '4px',
                                    fontWeight: isStep ? '600' : '400',
                                    color: isStep ? '#5a2d7a' : '#333',
                                    paddingLeft: isStep ? '0' : '0'
                                  }}
                                >
                                  {trimmedLine}
                                </div>
                              )
                            })
                          })()}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                textAlign: 'center',
                flex: 1
              }}>
                {/* Document Icon */}
                <svg
                  width="120"
                  height="120"
                  viewBox="0 0 120 120"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                  style={{ marginBottom: '30px', opacity: 0.6 }}
                >
                  <rect
                    x="30"
                    y="20"
                    width="60"
                    height="80"
                    rx="4"
                    stroke="#999"
                    strokeWidth="3"
                    fill="none"
                  />
                  <line
                    x1="40"
                    y1="40"
                    x2="80"
                    y2="40"
                    stroke="#999"
                    strokeWidth="2"
                    strokeLinecap="round"
                  />
                  <line
                    x1="40"
                    y1="55"
                    x2="80"
                    y2="55"
                    stroke="#999"
                    strokeWidth="2"
                    strokeLinecap="round"
                  />
                </svg>

                {/* Message */}
                <h3 style={{
                  fontSize: '1.5em',
                  fontWeight: '600',
                  marginBottom: '15px',
                  color: '#333'
                }}>
                  No questions generated yet
                </h3>

                {/* Instruction */}
                 <p style={{
                   fontSize: '1em',
                   color: '#666',
                   lineHeight: '1.6',
                   maxWidth: '400px'
                 }}>
                   Fill out the form and click "Generate Questions" to create 3 curriculum-aligned mathematics questions (Easy, Medium, Hard) with proper scaffolding.
                 </p>
              </div>
            )}
          </div>
        </div>

      </div>

      <style jsx>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  )
}

