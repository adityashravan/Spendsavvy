import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

export interface ExpenseSplit {
  description: string;
  category: string;
  subcategory?: string;
  totalAmount: number;
  currency: string;
  splits: {
    userId: string;
    userName: string;
    amount: number;
    percentage: number;
  }[];
  reasoning: string;
}

export interface Friend {
  id: string;
  name: string;
  email: string;
}

export interface QueryResult {
  type: 'expense_split' | 'analytics' | 'expense_history' | 'friend_info' | 'general_chat' | 'unknown';
  intent: string;
  data?: any;
  needsConfirmation?: boolean;
  message?: string;
}

export interface AnalyticsQuery {
  timeframe: string; // 'this_month', 'last_month', 'this_year', 'last_week', etc.
  category?: string;
  subcategory?: string;
  friend?: string;
  type: 'total_spent' | 'category_breakdown' | 'friend_expenses' | 'monthly_comparison';
}

export class GeminiExpenseAssistant {
  private model;

  constructor() {
    this.model = genAI.getGenerativeModel({ model: 'gemini-2.5-pro' });
  }

  async processUserMessage(
  message: string,
  userContext: {
    userId: string;
    userName: string;
    friends: Friend[];
    conversationHistory?: any[];
    pendingConfirmation?: any;
  }
): Promise<QueryResult> {
  console.log('Gemini processUserMessage called with:', { message, userContext });
  console.log(userContext.friends, "Friends");
  
  
  // Check if this message is responding to a pending confirmation
  if (userContext.pendingConfirmation && (
    message.toLowerCase().includes('yes') || 
    message.toLowerCase().includes('confirm') ||
    message.toLowerCase().includes('correct') ||
    message.toLowerCase().includes('looks good') ||
    message.toLowerCase().includes('ok') ||
    message.toLowerCase().includes('sure')
  )) {
    return {
      type: 'expense_split',
      intent: 'User confirmed the expense split',
      data: userContext.pendingConfirmation,
      needsConfirmation: false
    };
  }

  // Check if this message is modifying a pending confirmation
  if (userContext.pendingConfirmation && (
    message.toLowerCase().includes('no') ||
    message.toLowerCase().includes('wrong') ||
    message.toLowerCase().includes('change') ||
    message.toLowerCase().includes('should be') ||
    message.toLowerCase().includes('subcategory')
  )) {
    // Handle subcategory changes
    if (message.toLowerCase().includes('subcategory')) {
      const subcategoryMatch = message.match(/subcategory.*should be\s+(\w+)/i) || 
                             message.match(/should be\s+(\w+)/i) ||
                             message.match(/no.*(\w+)/i);
      
      if (subcategoryMatch) {
        const newSubcategory = subcategoryMatch[1];
        const updatedExpense = {
          ...userContext.pendingConfirmation,
          subcategory: newSubcategory
        };
        
        return {
          type: 'expense_split',
          intent: `User wants to change subcategory to ${newSubcategory}`,
          data: updatedExpense,
          needsConfirmation: true,
          message: `Updated subcategory to "${newSubcategory}". Does this look correct now?`
        };
      }
    }
  }

  // Include conversation history in the prompt for better context
  let conversationContext = '';
  if (userContext.conversationHistory && userContext.conversationHistory.length > 0) {
    conversationContext = `
Recent conversation:
${userContext.conversationHistory.map(msg => 
  `${msg.type === 'user' ? 'User' : 'Assistant'}: ${msg.content}`
).join('\n')}

Current message: "${message}"
`;
  }
  
  const prompt = `
You are an AI expense management assistant. Analyze the user's message and determine what they want to do.

${conversationContext || `User message: "${message}"`}
User: ${userContext.userName}
Available friends: ${userContext.friends.map(f => f.name).join(', ')}

Classify the message into one of these categories and extract relevant information:

1. EXPENSE_SPLIT: User wants to split an expense
   - Extract: description, amount, friends involved, category
   - Format: expense splitting request
   - USER REFERENCE HANDLING: "me", "myself", "I" always refer to current user (${userContext.userName})
   - Current user is automatically included - don't treat them as a friend to search for
   - Examples: "split between me and John" = split between ${userContext.userName} and John
   - PERCENTAGE SPLITS: If message contains percentages like "John (30%)", "Mary (25%)", "rest on me"
     * This is a percentage-based split - extract EXACT percentages mentioned
     * Do NOT convert to equal splits when percentages are specified
     * Examples: "split $100 with John (30%) and rest on me", "dinner $60 with Alice (40%) Bob (60%)"

2. ANALYTICS: User wants spending analytics/insights
   - Extract: timeframe (this month, last month, etc.), category, subcategory, friend
   - Types: total spent, category breakdown, friend expenses, comparisons
   - Examples: "how much did I spend last month", "show my food expenses", "spending with John"
   - Subcategory examples: "how much on F1", "coffee expenses", "pizza spending"
   - If user mentions specific items like "F1", "pizza", "coffee", treat as subcategory under appropriate main category

3. EXPENSE_HISTORY: User wants to see past expenses
   - Extract: timeframe, category, friend, limit
   - Examples: "show my recent expenses", "what did I buy last week", "Show me my top 3 spends this month"
   - IMPORTANT: For "top X" requests, set limit to X and set type to "top_expenses"
   - For "top 3 spends", set: {"timeframe": "this_month", "type": "top_expenses", "limit": 3}

4. FRIEND_INFO: User wants friend-related information (e.g., balances, who owes whom, etc.)
   - Extract: friend name(s), query type (e.g., 'balance', 'owes', 'lent', etc.)
   - Examples: "how much does Amit owe me?", "who owes me money?", "my balance with Sarah"
   - If multiple friends are mentioned, return an array of results, one per friend

5. GENERAL_CHAT: General conversation, greetings, help requests
   - Provide helpful responses about app features

6. UNKNOWN: Cannot determine intent

Respond with a JSON object in this exact format:
{
  "type": "category_from_above",
  "intent": "detailed description of what user wants",
  "data": {
    // Relevant extracted data based on type
    // For expense_split: {"description": "", "amount": number, "friends": [], "category": ""}
    //   * If percentages mentioned, preserve them exactly in description
    //   * Friends array should include names mentioned with percentages
    // For analytics: {"timeframe": "", "type": "", "category": "", "subcategory": "", "friend": ""}
    // For expense_history: {"timeframe": "", "category": "", "friend": "", "limit": number, "type": "top_expenses|recent|all"}
    //   * For "top X" queries: set type to "top_expenses" and limit to X
    //   * For "show me my top 3 spends this month": {"timeframe": "this_month", "type": "top_expenses", "limit": 3}
    // For friend_info: {"friends": ["Amit", "Sarah"], "query_type": "owes|balance|lent|etc."}
  },
  "needsConfirmation": false,
  "message": "brief acknowledgment that you understand the request - DO NOT provide the actual data"
}

CRITICAL: For expense_history requests like "top 3 spends":
- Set type to "expense_history" 
- In data object, set "type" field to "top_expenses"
- Set "limit" field to the requested number
- Set "timeframe" to extracted time period
- Set message to something like "I'll fetch your top 3 expenses for this month" - NOT the actual expense data

The message field should ONLY acknowledge the request, never provide actual expense data, analytics, or friend information. The frontend will handle displaying the actual data based on the structured response.

If the user asks about multiple friends, return an array of results in the data field, e.g.:
{
  "type": "friend_info",
  "intent": "User wants to know balances with multiple friends",
  "data": [
    {"friend": "Amit", "query_type": "owes"},
    {"friend": "Sarah", "query_type": "owes"}
  ],
  "needsConfirmation": false,
  "message": "I'll check your balances with Amit and Sarah."
}

Be smart about understanding natural language patterns:
- "spent", "expenses", "money" often indicate analytics
- "split", "divide", "share" often indicate expense splitting
- "show", "list", "history", "top X" often indicate expense history
- Friend names followed by amounts often indicate splitting
- Time references like "last month", "this week" indicate analytics or history

CATEGORY AND SUBCATEGORY MAPPING:
- "F1", "formula 1", "race" → category: "Entertainment", subcategory: "F1"
- "pizza", "burger", "coffee", restaurant names → category: "Food", subcategory: specific item
- "uber", "taxi", "metro", "bus" → category: "Transportation", subcategory: specific service
- "movie", "cinema", "concert" → category: "Entertainment", subcategory: specific type
- For queries like "how much on F1", map F1 as subcategory under Entertainment

SPECIAL HANDLING FOR PERCENTAGE SPLITS:
- If message contains patterns like "name (X%)" or "rest on me", this is a percentage-based split
- Preserve the exact percentages and names in the description for proper parsing
- Do NOT suggest equal splits when percentages are explicitly mentioned
- Examples that should be recognized as percentage splits:
  * "split $50 with John (40%) and rest on me"
  * "grocery $30 between Alice (30%), Bob (45%), and remaining for me"
  * "dinner cost $80 shared with Sarah (25%) and rest on me"
`;

  try {
    const result = await this.model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();
    
    // Extract JSON from the response
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      console.log('No JSON found in Gemini response:', text);
      return {
        type: 'unknown',
        intent: 'Could not parse user intent',
        message: "I didn't understand that. Try asking about expenses, analytics, or splitting costs with friends."
      };
    }
    
    let parsedResponse;
    try {
      // Clean the JSON before parsing
      const cleanedJson = this.cleanAndValidateJson(jsonMatch[0]);
      parsedResponse = JSON.parse(cleanedJson);
      console.log('Parsed Gemini response:', parsedResponse);
    } catch (parseError) {
      console.error('JSON parsing error in processUserMessage:', parseError);
      console.error('Problematic JSON:', jsonMatch[0]);
      return {
        type: 'unknown',
        intent: 'JSON parsing failed',
        message: "I had trouble understanding your request. Please try rephrasing it."
      };
    }
    
    return parsedResponse as QueryResult;
    
  } catch (error) {
    console.error('Error processing user message:', error);
    return {
      type: 'unknown',
      intent: 'Error processing message',
      message: "Sorry, I had trouble understanding your request. Please try again."
    };
  }
}

  // Simple percentage parser for reliable percentage-based splits
  private parsePercentages(
    message: string, 
    friends: Friend[], 
    currentUser: { id: string; name: string },
    totalAmount: number
  ): ExpenseSplit | null {
    try {
      // Better regex to extract names with percentages, avoiding words like "with"
      // Look for pattern: (word1 word2... wordN) (percentage%)
      const percentagePattern = /(?:^|[^a-zA-Z])([a-zA-Z]+(?:\s+[a-zA-Z]+)*)\s*\((\d+(?:\.\d+)?)%\)/gi;
      const matches = [...message.matchAll(percentagePattern)];
      
      console.log('Percentage matches found:', matches.map(m => ({ name: m[1].trim(), percentage: m[2] })));
      
      if (matches.length === 0) return null;
      
      const allParticipants = [currentUser, ...friends];
      const splits: Array<{
        userId: string;
        userName: string;
        amount: number;
        percentage: number;
      }> = [];
      let totalPercentage = 0;
      
      // Process explicit percentages
      for (const match of matches) {
        let namepart = match[1].trim().toLowerCase();
        const percentage = parseFloat(match[2]);
        
        // Remove common prefixes that might have been captured
        namepart = namepart.replace(/^(with|and|,)\s+/i, '').trim();
        
        console.log(`Looking for participant with namepart: "${namepart}"`);
        console.log('Available participants:', allParticipants.map(p => p.name));
        console.log("Setting up tool handlers...");
        // More precise name matching - find the best match
        let bestMatch = null;
        let bestScore = 0;
        
        for (const participant of allParticipants) {
          const normalizedParticipantName = participant.name.toLowerCase().replace(/\s+/g, ' ').trim();
          const normalizedNamepart = namepart.replace(/\s+/g, ' ').trim();
          
          // Check if this participant is already in splits
          const alreadyExists = splits.find(s => s.userId === participant.id);
          if (alreadyExists) continue;
          
          let score = 0;
          
          // Exact match gets highest score
          if (normalizedParticipantName === normalizedNamepart) {
            score = 100;
          }
          // Check if participant name contains the namepart
          else if (normalizedParticipantName.includes(normalizedNamepart)) {
            score = 80;
          }
          // Check if namepart contains participant name
          else if (normalizedNamepart.includes(normalizedParticipantName)) {
            score = 70;
          }
          // Check word matches
          else {
            const participantWords = normalizedParticipantName.split(' ');
            const namepartWords = normalizedNamepart.split(' ');
            
            const matchingWords = participantWords.filter(word => 
              word.length > 2 && namepartWords.some(nw => nw.includes(word) || word.includes(nw))
            );
            
            if (matchingWords.length > 0) {
              score = Math.min(60, matchingWords.length * 20);
            }
          }
          
          if (score > bestScore) {
            bestScore = score;
            bestMatch = participant;
          }
        }
        
        console.log(`Best match for "${namepart}":`, bestMatch?.name || 'No match', `(score: ${bestScore})`);
        
        if (bestMatch && bestScore >= 60) {
          const amount = Math.round((totalAmount * percentage / 100) * 100) / 100;
          splits.push({
            userId: bestMatch.id,
            userName: bestMatch.name,
            amount: amount,
            percentage: percentage
          });
          totalPercentage += percentage;
        }
      }
      
      // Handle "rest on me" - assign remaining percentage to current user
      if (message.toLowerCase().includes('rest on me') || message.toLowerCase().includes('remaining on me')) {
        const remainingPercentage = 100 - totalPercentage;
        console.log(`Calculating "rest on me": remaining percentage = ${remainingPercentage}%`);
        
        if (remainingPercentage > 0) {
          const existingUserSplit = splits.find(s => s.userId === currentUser.id);
          if (!existingUserSplit) {
            const remainingAmount = Math.round((totalAmount * remainingPercentage / 100) * 100) / 100;
            splits.push({
              userId: currentUser.id,
              userName: currentUser.name,
              amount: remainingAmount,
              percentage: remainingPercentage
            });
            console.log(`Added "rest on me" split: ${currentUser.name} gets ${remainingPercentage}% = $${remainingAmount}`);
          }
        }
      }
      
      console.log('Final splits before validation:', splits);
      
      // Validate that we have splits and they add up
      if (splits.length === 0) {
        console.log('No splits found, returning null');
        return null;
      }
      
      const totalSplitAmount = splits.reduce((sum, split) => sum + split.amount, 0);
      const totalSplitPercentage = splits.reduce((sum, split) => sum + split.percentage, 0);
      
      console.log(`Validation: totalSplitAmount=${totalSplitAmount}, expected=${totalAmount}, totalSplitPercentage=${totalSplitPercentage}`);
      
      // Allow small rounding differences
      if (Math.abs(totalSplitAmount - totalAmount) > 0.02 || Math.abs(totalSplitPercentage - 100) > 0.1) {
        console.log('Percentage parsing validation failed:', { 
          totalSplitAmount, 
          totalAmount, 
          totalSplitPercentage,
          amountDiff: Math.abs(totalSplitAmount - totalAmount),
          percentageDiff: Math.abs(totalSplitPercentage - 100)
        });
        return null;
      }
      
      return {
        description: `Percentage-based split: ${splits.map(s => `${s.userName} (${s.percentage}%)`).join(', ')}`,
        category: 'Groceries', // Default category
        totalAmount: totalAmount,
        currency: 'USD',
        splits: splits,
        reasoning: `Split based on specified percentages: ${splits.map(s => `${s.userName} pays ${s.percentage}% = $${s.amount}`).join(', ')}`
      };
      
    } catch (error) {
      console.error('Error parsing percentages:', error);
      return null;
    }
  }

  // Advanced JSON cleaning and validation method
  private cleanAndValidateJson(rawJson: string): string {
    let cleaned = rawJson;
    
    // Basic cleaning
    cleaned = cleaned
      .replace(/,(\s*[}\]])/g, '$1') // Remove trailing commas
      .replace(/[\u201C\u201D]/g, '"') // Replace smart quotes
      .replace(/[\u2018\u2019]/g, "'") // Replace smart apostrophes
      .replace(/([{,]\s*)(\w+):/g, '$1"$2":') // Quote unquoted keys
      .replace(/:\s*'([^']*)'/g, ': "$1"') // Replace single quotes with double quotes
      .replace(/undefined/g, 'null') // Replace undefined with null
      .replace(/NaN/g, '0') // Replace NaN with 0
      .trim();
    
    // Advanced cleaning for common Gemini issues
    cleaned = cleaned
      .replace(/(\d+)\s*\.\s*/g, '$1.0') // Fix incomplete decimals like "25."
      .replace(/\.\s*(\d+)/g, '.$1') // Fix spaced decimals like ". 50"
      .replace(/([^0-9])\s*\.\s*([^0-9])/g, '$1$2') // Remove stray periods
      .replace(/,\s*}/g, '}') // Remove trailing commas before closing braces
      .replace(/,\s*]/g, ']') // Remove trailing commas before closing brackets
      .replace(/}\s*,\s*]/g, '}]') // Fix object-array comma issues
      .replace(/"\s*:\s*"/g, '": "') // Normalize spacing around colons
      .replace(/"\s*,\s*"/g, '", "'); // Normalize spacing around commas
    
    // Validate basic JSON structure
    const braceCount = (cleaned.match(/\{/g) || []).length - (cleaned.match(/\}/g) || []).length;
    const bracketCount = (cleaned.match(/\[/g) || []).length - (cleaned.match(/\]/g) || []).length;
    
    if (braceCount !== 0) {
      console.warn(`JSON has unmatched braces: ${braceCount} extra opening braces`);
    }
    if (bracketCount !== 0) {
      console.warn(`JSON has unmatched brackets: ${bracketCount} extra opening brackets`);
    }
    
    return cleaned;
  }

  async splitExpense(
    description: string,
    friends: Friend[],
    currentUser: { id: string; name: string },
    totalAmount?: number,
    category?: string
  ): Promise<ExpenseSplit> {
    // First try to parse percentages directly from the description
    if (totalAmount && description.includes('%')) {
      console.log('Attempting percentage parsing for:', description);
      const percentageSplit = this.parsePercentages(description, friends, currentUser, totalAmount);
      if (percentageSplit) {
        console.log('Successfully parsed percentages:', percentageSplit);
        return percentageSplit;
      }
    }
    
    // Fallback to AI-based splitting if percentage parsing fails
    const allParticipants = [currentUser, ...friends];
    
    const prompt = `
You are an AI expense splitting assistant. Based on the given description, analyze and split the expense fairly among the participants.

Expense Description: "${description}"
Total Amount: ${totalAmount ? `$${totalAmount}` : 'Not specified (please estimate based on description)'}
Category: ${category || 'Not specified (please categorize based on description)'}

Current User: ${currentUser.name} (ID: ${currentUser.id})
Participants:
${allParticipants.map((p, i) => `${i + 1}. ${p.name} (ID: ${p.id})${p.id === currentUser.id ? ' [CURRENT USER]' : ''}`).join('\n')}

IMPORTANT PARSING RULES:
- When the description mentions "me", "myself", "I", it refers to the current user: ${currentUser.name}
- The current user (${currentUser.name}) is automatically included in ALL splits
- Parse the description carefully to identify all participants
- "Split between me and John" means split between ${currentUser.name} and John
- "Split with John and Mary" means split between ${currentUser.name}, John, and Mary

Instructions:
1. If total amount is not provided, estimate a reasonable amount based on the description
2. If category is not provided, categorize the expense appropriately
3. Use subcategories when appropriate (e.g., "F1" under "Entertainment", "Pizza" under "Food")
4. If specific percentages are mentioned, use those exact percentages
5. Calculate amounts using: amount = totalAmount × (percentage ÷ 100)
6. Do NOT second-guess your calculations - if the math is correct, trust it
7. Provide simple, clear reasoning without unnecessary "corrections"

Category Guidelines:
- Entertainment: Movies, F1, Sports, Concerts, etc.
- Food: Pizza, Burger, Coffee, Restaurant names, etc.
- Transportation: Uber, Taxi, Bus, Metro, etc.
- Shopping: Clothes, Electronics, Groceries, etc.
- Bills: Electricity, Internet, Phone, etc.

IMPORTANT: For percentage-based splits, calculate each amount directly and trust the math.

CRITICAL JSON REQUIREMENTS:
- Use double quotes for all strings, never single quotes
- Do not use trailing commas
- Ensure all JSON syntax is valid
- Always include all required fields
- Numbers must be valid (no NaN, Infinity)

Respond with a JSON object in this EXACT format (no additional text before or after):
{
  "description": "cleaned up description",
  "category": "main category (Entertainment, Food, Transportation, etc.)",
  "subcategory": "specific item or null if not applicable",
  "totalAmount": 0.00,
  "currency": "USD",
  "splits": [
    {
      "userId": "user_id_string",
      "userName": "user_name_string", 
      "amount": 0.00,
      "percentage": 0.00
    }
  ],
  "reasoning": "explanation of splitting logic"
}

VALIDATION CHECKLIST:
✓ All strings use double quotes
✓ No trailing commas
✓ All numbers are valid decimals
✓ All required fields included
✓ Valid JSON syntax
`;

    try {
      const result = await this.model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();
      
      console.log('Raw Gemini response for expense splitting:', text);
      
      // Extract JSON from the response with better error handling
      let jsonMatch = text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        // Try to find JSON between ```json blocks
        const codeBlockMatch = text.match(/```(?:json)?\s*(\{[\s\S]*?\})\s*```/);
        if (codeBlockMatch) {
          jsonMatch = [codeBlockMatch[1]];
        } else {
          throw new Error('No valid JSON found in AI response');
        }
      }
      
      let rawJson = jsonMatch[0];
      console.log('Extracted JSON string:', rawJson);
      
      // Advanced JSON cleaning and validation
      rawJson = this.cleanAndValidateJson(rawJson);
      console.log('Cleaned JSON string:', rawJson);
      
      let parsedResponse: any;
      try {
        parsedResponse = JSON.parse(rawJson);
      } catch (parseError: any) {
        console.error('JSON parse error:', parseError);
        console.error('Problematic JSON:', rawJson);
        
        // Try to extract just the essential parts if JSON is malformed
        try {
          // Fallback: try to extract splits array manually
          const splitsMatch = rawJson.match(/"splits":\s*\[([\s\S]*?)\]/);
          if (splitsMatch) {
            const splitsContent = splitsMatch[1];
            console.log('Attempting manual splits extraction:', splitsContent);
            
            // Create a minimal valid structure
            parsedResponse = {
              splits: [] as any[],
              reasoning: "Parsed from malformed JSON"
            };
            
            // Parse individual split objects
            const splitObjects = splitsContent.match(/\{[^}]*\}/g);
            if (splitObjects) {
              for (const splitObj of splitObjects) {
                try {
                  const cleanSplitObj = splitObj
                    .replace(/,(\s*})/g, '$1')
                    .replace(/([{,]\s*)(\w+):/g, '$1"$2":');
                  const split = JSON.parse(cleanSplitObj);
                  parsedResponse.splits.push(split);
                } catch (splitError) {
                  console.error('Error parsing split object:', splitError, splitObj);
                }
              }
            }
          } else {
            throw new Error('Cannot extract splits from malformed JSON');
          }
        } catch (fallbackError: any) {
          const parseMsg = parseError instanceof Error ? parseError.message : 'Unknown parse error';
          const fallbackMsg = fallbackError instanceof Error ? fallbackError.message : 'Unknown fallback error';
          throw new Error(`JSON parsing failed: ${parseMsg}. Fallback also failed: ${fallbackMsg}`);
        }
      }
      
      console.log('Successfully parsed response:', parsedResponse);
      
      // Validate the response structure
      if (!parsedResponse.splits || !Array.isArray(parsedResponse.splits)) {
        throw new Error('Invalid response structure from AI');
      }
      
      // Ensure all participants are included
      const missingParticipants = allParticipants.filter(
        p => !parsedResponse.splits.find((s: any) => s.userId === p.id)
      );
      
      if (missingParticipants.length > 0) {
        // Add missing participants with 0 amount
        missingParticipants.forEach(p => {
          parsedResponse.splits.push({
            userId: p.id,
            userName: p.name,
            amount: 0,
            percentage: 0
          });
        });
      }
      
      // Validate that amounts add up correctly
      const totalSplit = parsedResponse.splits.reduce((sum: number, split: any) => sum + split.amount, 0);
      const tolerance = 0.01; // Allow for small rounding differences
      
      if (Math.abs(totalSplit - parsedResponse.totalAmount) > tolerance) {
        console.warn(`Total split (${totalSplit}) doesn't match total amount (${parsedResponse.totalAmount}). Using original Gemini calculation.`);
        // Trust Gemini's calculation rather than making incorrect adjustments
      }
      
      return parsedResponse as ExpenseSplit;
      
    } catch (error) {
      console.error('Error splitting expense with Gemini:', error);
      
      // Fallback to equal split
      const equalAmount = totalAmount ? totalAmount / allParticipants.length : 50 / allParticipants.length;
      const equalPercentage = 100 / allParticipants.length;
      
      return {
        description: description,
        category: category || 'Miscellaneous',
        subcategory: undefined,
        totalAmount: totalAmount || 50,
        currency: 'USD',
        splits: allParticipants.map(p => ({
          userId: p.id,
          userName: p.name,
          amount: Math.round(equalAmount * 100) / 100,
          percentage: Math.round(equalPercentage * 100) / 100
        })),
        reasoning: 'Equal split applied due to AI processing error'
      };
    }
  }

  async categorizeExpense(description: string): Promise<string> {
    const prompt = `
Categorize this expense description into one of these categories:
- Food & Dining
- Transportation  
- Entertainment
- Shopping
- Utilities
- Healthcare
- Travel
- Education
- Business
- Miscellaneous

Description: "${description}"

Respond with just the category name, nothing else.
`;

    try {
      const result = await this.model.generateContent(prompt);
      const response = await result.response;
      return response.text().trim();
    } catch (error) {
      console.error('Error categorizing expense:', error);
      return 'Miscellaneous';
    }
  }

  async estimateAmount(description: string): Promise<number> {
    const prompt = `
Estimate a reasonable dollar amount for this expense description in USD:
"${description}"

Consider typical costs for such activities/items. 
Respond with just a number (no currency symbol or text), rounded to 2 decimal places.
`;

    try {
      const result = await this.model.generateContent(prompt);
      const response = await result.response;
      const amount = parseFloat(response.text().trim());
      return isNaN(amount) ? 50 : Math.max(amount, 0.01); // Minimum $0.01
    } catch (error) {
      console.error('Error estimating amount:', error);
      return 50; // Default fallback amount
    }
  }
}

export const geminiAssistant = new GeminiExpenseAssistant();
export const geminiSplitter = new GeminiExpenseAssistant(); // For backward compatibility
