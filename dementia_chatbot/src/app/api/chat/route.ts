import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

// Initialize Gemini AI
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

// Load prompts from prompts.js
const { fillPrompt } = require('../../../../prompts.js');

// Chat session storage (in-memory for now)
const chatSessions = new Map();

export async function POST(request: NextRequest) {
  try {
    const { message, elapsedTime, sessionId } = await request.json();
    
    // Determine current stage based on elapsed time
    const stage = getStageFromTime(elapsedTime);
    
    // Get or create chat session
    let session = chatSessions.get(sessionId);
    if (!session) {
      session = {
        conversationHistory: [],
        startTime: Date.now()
      };
      chatSessions.set(sessionId, session);
    }
    
    // Add user message to history
    session.conversationHistory.push({
      role: 'user',
      content: message,
      timestamp: elapsedTime
    });
    
    // Get appropriate prompt for current stage
    const promptKey = `stage_${stage}_response`;
    const promptData = fillPrompt(promptKey, {
      conversation_history: JSON.stringify(session.conversationHistory),
      user_message: message
    });
    
    // Call Gemini API - using gemini-2.5-flash (latest stable model)
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
    const result = await model.generateContent(promptData.prompt);
    const response = await result.response;
    const botMessage = response.text();
    
    // Add bot response to history
    session.conversationHistory.push({
      role: 'assistant',
      content: botMessage,
      timestamp: elapsedTime
    });
    
    return NextResponse.json({
      response: botMessage,
      stage: stage,
      elapsedTime: elapsedTime,
      llm_metadata: {
        model: 'gemini-pro',
        prompt: promptData.templatePrompt,
        purpose: promptData.purpose,
        stage: stage
      }
    });
    
  } catch (error: any) {
    console.error('Chat error:', error);
    return NextResponse.json(
      { error: 'Failed to process chat message', details: error.message },
      { status: 500 }
    );
  }
}

function getStageFromTime(elapsedTime: number): number {
  if (elapsedTime < 60) return 1;
  if (elapsedTime < 120) return 2;
  if (elapsedTime < 180) return 3;
  return 4;
}
