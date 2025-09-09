import { GoogleGenerativeAI } from '@google/generative-ai';
import { NextRequest, NextResponse } from 'next/server';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

export async function POST(request: NextRequest) {
  try {
    const { description, prompt } = await request.json();
    
    if (!description) {
      return NextResponse.json(
        { error: 'Description is required' },
        { status: 400 }
      );
    }
    
    console.log(`\n🤖 [GEMINI API] ============================================`);
    console.log(`📝 [GEMINI API] 💸 EXPENSIVE OPERATION STARTED!`);
    console.log(`📋 [GEMINI API] Input: "${description}"`);
    console.log(`💰 [GEMINI API] Cost: ~$0.02 per request`);
    console.log(`⏱️ [GEMINI API] Expected time: 1-3 seconds`);
    console.log(`🔄 [GEMINI API] Sending to Google Gemini...`);
    
    const model = genAI.getGenerativeModel({ 
      model: "gemini-2.5-pro",
      generationConfig: {
        maxOutputTokens: 20, // Very short response
        temperature: 0.1,   // Low temperature for consistent categorization
      }
    });
    
    const optimizedPrompt = prompt || `
      Categorize this expense description into one of these categories: 
      food, transport, shopping, entertainment, health, utilities, other
      
      Description: "${description}"
      
      Respond with ONLY the category name, nothing else.
    `;
    
    console.log(`🧠 [GEMINI API] Processing with AI model...`);
    const startTime = Date.now();
    
    const result = await model.generateContent(optimizedPrompt);
    const response = await result.response;
    const category = response.text().trim().toLowerCase();
    
    const processingTime = Date.now() - startTime;
    
    // Validate the category
    const validCategories = ['food', 'transport', 'shopping', 'entertainment', 'health', 'utilities', 'other'];
    const finalCategory = validCategories.includes(category) ? category : 'other';
    
    console.log(`✅ [GEMINI API] 🎯 AI categorization complete!`);
    console.log(`📋 [GEMINI API] Result: ${finalCategory}`);
    console.log(`⚡ [GEMINI API] Processing time: ${processingTime}ms`);
    console.log(`💸 [GEMINI API] Cost charged: ~$0.02`);
    console.log(`🎭 [GEMINI API] Tokens used: ~20 output tokens`);
    console.log(`🤖 [GEMINI API] ============================================\n`);
    
    return NextResponse.json({ 
      category: finalCategory,
      confidence: 0.8,
      method: 'ai',
      tokensUsed: 20,
      processingTime: `${processingTime}ms`,
      cost: '$0.02'
    });
    
  } catch (error) {
    console.error('❌ [GEMINI API] 🚨 AI processing failed:', error);
    console.log(`💸 [GEMINI API] Cost still charged: ~$0.02 (failed request)`);
    console.log(`🔄 [GEMINI API] Returning fallback category...`);
    console.log(`🤖 [GEMINI API] ============================================\n`);
    
    return NextResponse.json(
      { 
        error: 'Categorization failed',
        category: 'other',
        confidence: 0.3,
        method: 'error',
        cost: '$0.02'
      },
      { status: 500 }
    );
  }
}
