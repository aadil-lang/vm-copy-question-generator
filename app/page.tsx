'use client'

import Link from 'next/link'

export default function Home() {
  return (
    <div className="homepage-container">
      <div className="homepage-header">
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
        <h1>Copy Question Generator</h1>
        <p>Select the type of questions you want to generate</p>
      </div>

      <div className="homepage-buttons">
        <Link href="/generate?type=mathematical" className="homepage-btn mathematical">
          <span>Mathematical Questions</span>
          <div className="image-previews">
            <div className="preview-item">
              <svg width="50" height="50" viewBox="0 0 50 50" xmlns="http://www.w3.org/2000/svg">
                <line x1="25" y1="15" x2="25" y2="35" stroke="white" strokeWidth="3" strokeLinecap="round"/>
                <line x1="15" y1="25" x2="35" y2="25" stroke="white" strokeWidth="3" strokeLinecap="round"/>
              </svg>
            </div>
            <div className="preview-item">
              <svg width="50" height="50" viewBox="0 0 50 50" xmlns="http://www.w3.org/2000/svg">
                <line x1="15" y1="25" x2="35" y2="25" stroke="white" strokeWidth="3" strokeLinecap="round"/>
              </svg>
            </div>
            <div className="preview-item">
              <svg width="50" height="50" viewBox="0 0 50 50" xmlns="http://www.w3.org/2000/svg">
                <line x1="15" y1="15" x2="35" y2="35" stroke="white" strokeWidth="3" strokeLinecap="round"/>
                <line x1="35" y1="15" x2="15" y2="35" stroke="white" strokeWidth="3" strokeLinecap="round"/>
              </svg>
            </div>
            <div className="preview-item">
              <svg width="50" height="50" viewBox="0 0 50 50" xmlns="http://www.w3.org/2000/svg">
                <circle cx="25" cy="15" r="2" fill="white"/>
                <line x1="15" y1="25" x2="35" y2="25" stroke="white" strokeWidth="2" strokeLinecap="round"/>
                <circle cx="25" cy="35" r="2" fill="white"/>
              </svg>
            </div>
          </div>
        </Link>
        <Link href="/generate?type=image-based" className="homepage-btn image-based">
          <span>Image based Questions</span>
          <div className="image-previews">
            <div className="preview-item">
              <svg width="50" height="50" viewBox="0 0 50 50" xmlns="http://www.w3.org/2000/svg">
                <circle cx="12" cy="12" r="8" stroke="white" strokeWidth="1.5" fill="rgba(255,255,255,0.2)"/>
                <rect x="22" y="4" width="10" height="16" stroke="white" strokeWidth="1.5" fill="rgba(255,255,255,0.2)"/>
                <polygon points="38,4 45,20 31,20" stroke="white" strokeWidth="1.5" fill="rgba(255,255,255,0.2)"/>
                <rect x="8" y="24" width="10" height="10" stroke="white" strokeWidth="1.5" fill="rgba(255,255,255,0.2)"/>
                <polygon points="25,28 30,22 35,24 34,30 26,30" stroke="white" strokeWidth="1.5" fill="rgba(255,255,255,0.2)"/>
              </svg>
            </div>
            <div className="preview-item">
              <svg width="50" height="50" viewBox="0 0 50 50" xmlns="http://www.w3.org/2000/svg">
                <defs>
                  <pattern id="grid" width="5" height="5" patternUnits="userSpaceOnUse">
                    <path d="M 5 0 L 0 0 0 5" fill="none" stroke="rgba(255,255,255,0.3)" strokeWidth="0.5"/>
                  </pattern>
                </defs>
                <rect width="50" height="50" fill="url(#grid)"/>
                <line x1="5" y1="45" x2="45" y2="45" stroke="white" strokeWidth="2"/>
                <line x1="5" y1="45" x2="5" y2="5" stroke="white" strokeWidth="2"/>
                <line x1="5" y1="35" x2="45" y2="35" stroke="rgba(255,255,255,0.5)" strokeWidth="1"/>
                <line x1="5" y1="25" x2="45" y2="25" stroke="rgba(255,255,255,0.5)" strokeWidth="1"/>
                <line x1="5" y1="15" x2="45" y2="15" stroke="rgba(255,255,255,0.5)" strokeWidth="1"/>
                <line x1="15" y1="5" x2="15" y2="45" stroke="rgba(255,255,255,0.5)" strokeWidth="1"/>
                <line x1="25" y1="5" x2="25" y2="45" stroke="rgba(255,255,255,0.5)" strokeWidth="1"/>
                <line x1="35" y1="5" x2="35" y2="45" stroke="rgba(255,255,255,0.5)" strokeWidth="1"/>
                <polyline points="10,40 15,30 20,25 25,20 30,15 35,12 40,10" stroke="white" strokeWidth="2" fill="none"/>
              </svg>
            </div>
          </div>
        </Link>
        <Link href="/generate?type=word-problems" className="homepage-btn word-problems">
          <span>Word Problems</span>
          <div className="image-previews">
            <div className="preview-item">
              <svg width="50" height="50" viewBox="0 0 50 50" xmlns="http://www.w3.org/2000/svg">
                <rect x="10" y="8" width="30" height="35" rx="2" stroke="white" strokeWidth="2" fill="rgba(255,255,255,0.2)"/>
                <line x1="15" y1="15" x2="35" y2="15" stroke="white" strokeWidth="1.5"/>
                <line x1="15" y1="22" x2="30" y2="22" stroke="white" strokeWidth="1.5"/>
                <line x1="15" y1="29" x2="35" y2="29" stroke="white" strokeWidth="1.5"/>
                <line x1="15" y1="36" x2="28" y2="36" stroke="white" strokeWidth="1.5"/>
              </svg>
            </div>
            <div className="preview-item">
              <svg width="50" height="50" viewBox="0 0 50 50" xmlns="http://www.w3.org/2000/svg">
                <circle cx="20" cy="20" r="8" stroke="white" strokeWidth="2" fill="rgba(255,255,255,0.2)"/>
                <path d="M 20 12 Q 20 8 24 8 Q 28 8 28 12" stroke="white" strokeWidth="2" fill="none"/>
                <circle cx="15" cy="18" r="1.5" fill="white"/>
                <circle cx="25" cy="18" r="1.5" fill="white"/>
                <path d="M 15 25 Q 20 28 25 25" stroke="white" strokeWidth="2" fill="none"/>
              </svg>
            </div>
            <div className="preview-item">
              <svg width="50" height="50" viewBox="0 0 50 50" xmlns="http://www.w3.org/2000/svg">
                <rect x="12" y="10" width="26" height="20" rx="2" stroke="white" strokeWidth="2" fill="rgba(255,255,255,0.2)"/>
                <line x1="12" y1="18" x2="38" y2="18" stroke="white" strokeWidth="1.5"/>
                <line x1="12" y1="22" x2="38" y2="22" stroke="white" strokeWidth="1.5"/>
                <circle cx="18" cy="14" r="1.5" fill="white"/>
                <circle cx="25" cy="14" r="1.5" fill="white"/>
                <circle cx="32" cy="14" r="1.5" fill="white"/>
              </svg>
            </div>
            <div className="preview-item">
              <svg width="50" height="50" viewBox="0 0 50 50" xmlns="http://www.w3.org/2000/svg">
                <rect x="8" y="12" width="34" height="26" rx="2" stroke="white" strokeWidth="2" fill="rgba(255,255,255,0.2)"/>
                <line x1="12" y1="20" x2="38" y2="20" stroke="white" strokeWidth="1.5"/>
                <line x1="12" y1="26" x2="35" y2="26" stroke="white" strokeWidth="1.5"/>
                <line x1="12" y1="32" x2="30" y2="32" stroke="white" strokeWidth="1.5"/>
              </svg>
            </div>
          </div>
        </Link>
      </div>
    </div>
  )
}

