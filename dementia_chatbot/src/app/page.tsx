'use client'

import { useState, useEffect, useRef } from 'react'
import axios from 'axios'

interface Message {
  role: 'partner' | 'user'
  content: string
  timestamp: number
}

export default function Home() {
  const [messages, setMessages] = useState<Message[]>([])
  const [inputText, setInputText] = useState('')
  const [elapsedTime, setElapsedTime] = useState(0)
  const [currentStage, setCurrentStage] = useState(1)
  const [sessionStarted, setSessionStarted] = useState(false)
  const [sessionId] = useState(() => `session_${Date.now()}`)
  const [isLoading, setIsLoading] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  // Timer effect - updates every second
  useEffect(() => {
    if (!sessionStarted) return

    const timer = setInterval(() => {
      setElapsedTime(prev => {
        const newTime = prev + 1
        // Update stage based on time
        if (newTime >= 180) setCurrentStage(4)
        else if (newTime >= 120) setCurrentStage(3)
        else if (newTime >= 60) setCurrentStage(2)
        return newTime
      })
    }, 1000)

    return () => clearInterval(timer)
  }, [sessionStarted])

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Start session with opening message
  const startSession = async () => {
    setSessionStarted(true)
    const openingMessage: Message = {
      role: 'partner',
      content: "Happy Anniversary, darling! I can't believe it's been 40 years. *He gestures to a small wrapped gift on the table.*",
      timestamp: 0
    }
    setMessages([openingMessage])
  }

  // Helper to simulate dysphasia/confusion in text
  const glitchText = (text: string, stage: number) => {
    if (stage < 3) return text;
    
    const words = text.split(' ');
    
    if (stage === 3) {
      // Stage 3: Drop random words, replace with pauses
      return words.map(w => Math.random() > 0.8 ? '...' : w).join(' ');
    }
    
    if (stage === 4) {
      // Stage 4: Severe fragmentation
      return words.map(w => {
        if (Math.random() > 0.6) return '...';
        return w;
      }).join(' ');
    }
    
    return text;
  }

  // Send message to chatbot
  const sendMessage = async () => {
    if (!inputText.trim() || isLoading) return

    // Apply glitch effect based on stage - simulates dysphasia
    const processedText = glitchText(inputText, currentStage);

    const userMessage: Message = {
      role: 'user',
      content: processedText,
      timestamp: elapsedTime
    }

    setMessages(prev => [...prev, userMessage])
    setInputText('')
    setIsLoading(true)

    try {
      const response = await axios.post('/api/chat', {
        message: processedText, // Send the glitched text to the AI too
        elapsedTime: elapsedTime,
        sessionId: sessionId
      })

      const botMessage: Message = {
        role: 'partner',
        content: response.data.response,
        timestamp: elapsedTime
      }

      setMessages(prev => [...prev, botMessage])
    } catch (error) {
      console.error('Error sending message:', error)
      const errorMessage: Message = {
        role: 'partner',
        content: "I'm sorry, I'm having trouble responding right now.",
        timestamp: elapsedTime
      }
      setMessages(prev => [...prev, errorMessage])
    } finally {
      setIsLoading(false)
    }
  }

  // Handle Enter key
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  // Format time as MM:SS
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  // Get stage name
  const getStageName = (stage: number) => {
    const stages = [
      'The Celebration - 40th Anniversary',
      'The Confusion - Gaslighting',
      'The Frustration - Unwinnable Game',
      'The End - Breaking Point'
    ]
    return stages[stage - 1] || 'Unknown'
  }

  // Render italicized text
  const renderMessage = (content: string) => {
    const parts = content.split(/(\*[^*]+\*)/g)
    return parts.map((part, index) => {
      if (part.startsWith('*') && part.endsWith('*')) {
        return <em key={index} className="narration">{part.slice(1, -1)}</em>
      }
      return <span key={index}>{part}</span>
    })
  }

  if (!sessionStarted) {
    return (
      <div className="start-screen">
        <h1 className="start-title">A Conversation with Your Partner</h1>
        <p className="start-description">
          This is an immersive experience that simulates what it might feel like 
          to have dementia from the patient's perspective.
        </p>
        <p className="start-description">
          Duration: 4 minutes
        </p>
        <button className="start-button" onClick={startSession}>
          Begin Experience
        </button>
      </div>
    )
  }

  return (
    <div className={`chatbot-container stage-${currentStage}`}>
      <header className="chat-header">
        <div className="stage-info">
          <div className="stage-indicator">
            Stage {currentStage}/4: {getStageName(currentStage)}
          </div>
          <div className="timer-display">
            {formatTime(elapsedTime)} / 4:00
          </div>
        </div>
      </header>
      
      <main className="chat-main">
        <div className="conversation-area">
          {messages.map((msg, index) => (
            <div key={index} className={`message ${msg.role}-message`}>
              <div className="message-label">
                {msg.role === 'partner' ? 'Partner:' : 'You:'}
              </div>
              <div className="message-content">
                {renderMessage(msg.content)}
              </div>
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>
        
        <div className="input-area">
          <input
            type="text"
            className="input-field"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Type your response..."
            disabled={isLoading}
          />
          <button 
            className="send-button" 
            onClick={sendMessage}
            disabled={isLoading || !inputText.trim()}
          >
            {isLoading ? '...' : '→'}
          </button>
        </div>
      </main>
    </div>
  )
}
