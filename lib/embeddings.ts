import { createHash } from 'crypto';

// Types for our embedding system
export interface ExpenseEmbedding {
  category: string;
  confidence: number;
  subcategory?: string;
  embedding?: number[];
}

export interface SimilarExpense {
  category: string;
  confidence: number;
  similarity: number;
  description: string;
}

// Pre-computed embeddings for known merchants/descriptions
const EXPENSE_EMBEDDINGS: Record<string, ExpenseEmbedding> = {
  // Food & Restaurants
  'mcdonalds': { category: 'food', confidence: 0.95, subcategory: 'fast-food' },
  'starbucks': { category: 'food', confidence: 0.95, subcategory: 'coffee' },
  'subway': { category: 'food', confidence: 0.95, subcategory: 'fast-food' },
  'pizza hut': { category: 'food', confidence: 0.95, subcategory: 'restaurant' },
  'kfc': { category: 'food', confidence: 0.95, subcategory: 'fast-food' },
  'burger king': { category: 'food', confidence: 0.95, subcategory: 'fast-food' },
  'dominos': { category: 'food', confidence: 0.95, subcategory: 'restaurant' },
  'taco bell': { category: 'food', confidence: 0.95, subcategory: 'fast-food' },
  'chipotle': { category: 'food', confidence: 0.95, subcategory: 'restaurant' },
  'dunkin': { category: 'food', confidence: 0.95, subcategory: 'coffee' },
  
  // Transportation
  'uber': { category: 'transport', confidence: 0.95, subcategory: 'rideshare' },
  'lyft': { category: 'transport', confidence: 0.95, subcategory: 'rideshare' },
  'shell': { category: 'transport', confidence: 0.9, subcategory: 'gas' },
  'chevron': { category: 'transport', confidence: 0.9, subcategory: 'gas' },
  'exxon': { category: 'transport', confidence: 0.9, subcategory: 'gas' },
  'bp': { category: 'transport', confidence: 0.9, subcategory: 'gas' },
  'mobil': { category: 'transport', confidence: 0.9, subcategory: 'gas' },
  'parking': { category: 'transport', confidence: 0.8, subcategory: 'parking' },
  
  // Shopping
  'walmart': { category: 'shopping', confidence: 0.9, subcategory: 'groceries' },
  'target': { category: 'shopping', confidence: 0.9, subcategory: 'retail' },
  'amazon': { category: 'shopping', confidence: 0.85, subcategory: 'online' },
  'costco': { category: 'shopping', confidence: 0.9, subcategory: 'groceries' },
  'whole foods': { category: 'shopping', confidence: 0.95, subcategory: 'groceries' },
  'kroger': { category: 'shopping', confidence: 0.95, subcategory: 'groceries' },
  'safeway': { category: 'shopping', confidence: 0.95, subcategory: 'groceries' },
  
  // Entertainment
  'netflix': { category: 'entertainment', confidence: 0.95, subcategory: 'streaming' },
  'spotify': { category: 'entertainment', confidence: 0.95, subcategory: 'streaming' },
  'youtube': { category: 'entertainment', confidence: 0.95, subcategory: 'streaming' },
  'movie theater': { category: 'entertainment', confidence: 0.9, subcategory: 'movies' },
  'cinema': { category: 'entertainment', confidence: 0.9, subcategory: 'movies' },
  
  // Utilities
  'electric': { category: 'utilities', confidence: 0.9, subcategory: 'electricity' },
  'water': { category: 'utilities', confidence: 0.9, subcategory: 'water' },
  'internet': { category: 'utilities', confidence: 0.9, subcategory: 'internet' },
  'phone bill': { category: 'utilities', confidence: 0.9, subcategory: 'phone' },
  
  // Health
  'pharmacy': { category: 'health', confidence: 0.9, subcategory: 'pharmacy' },
  'cvs': { category: 'health', confidence: 0.85, subcategory: 'pharmacy' },
  'walgreens': { category: 'health', confidence: 0.85, subcategory: 'pharmacy' },
  'doctor': { category: 'health', confidence: 0.9, subcategory: 'medical' },
  'hospital': { category: 'health', confidence: 0.95, subcategory: 'medical' },
  
  // Alcohol (for safety monitoring)
  'liquor': { category: 'alcohol', confidence: 0.95, subcategory: 'liquor-store' },
  'wine shop': { category: 'alcohol', confidence: 0.95, subcategory: 'wine' },
  'brewery': { category: 'alcohol', confidence: 0.95, subcategory: 'beer' },
  'bar': { category: 'alcohol', confidence: 0.9, subcategory: 'bar' },
  'pub': { category: 'alcohol', confidence: 0.9, subcategory: 'bar' },
};

// Category keywords for fuzzy matching
const CATEGORY_KEYWORDS: Record<string, string[]> = {
  food: [
    'restaurant', 'cafe', 'diner', 'bistro', 'eatery', 'kitchen', 'grill', 'bakery',
    'pizza', 'burger', 'sandwich', 'sushi', 'chinese', 'italian', 'mexican',
    'coffee', 'tea', 'juice', 'smoothie', 'food', 'lunch', 'dinner', 'breakfast'
  ],
  transport: [
    'gas', 'fuel', 'petrol', 'station', 'parking', 'taxi', 'uber', 'lyft',
    'bus', 'train', 'subway', 'metro', 'transport', 'travel', 'flight',
    'airline', 'car', 'rental', 'toll', 'bridge'
  ],
  shopping: [
    'store', 'shop', 'market', 'mall', 'retail', 'purchase', 'buy',
    'groceries', 'supermarket', 'pharmacy', 'clothing', 'electronics',
    'department', 'outlet', 'warehouse'
  ],
  entertainment: [
    'movie', 'cinema', 'theater', 'concert', 'show', 'game', 'sport',
    'club', 'bar', 'music', 'streaming', 'subscription', 'gym', 'fitness'
  ],
  health: [
    'doctor', 'hospital', 'clinic', 'medical', 'pharmacy', 'dentist',
    'optometrist', 'therapy', 'health', 'medicine', 'prescription'
  ],
  utilities: [
    'electric', 'electricity', 'water', 'gas', 'internet', 'phone',
    'cable', 'utility', 'bill', 'service', 'monthly'
  ]
};

// Simple embedding creation using text hashing (for demo)
// In production, you'd use OpenAI embeddings or similar
export async function createEmbedding(text: string): Promise<number[]> {
  const normalized = text.toLowerCase().trim();
  const hash = createHash('md5').update(normalized).digest('hex');
  
  // Convert hash to simple vector (128 dimensions)
  const embedding: number[] = [];
  for (let i = 0; i < hash.length; i += 2) {
    const value = parseInt(hash.substr(i, 2), 16) / 255; // Normalize to 0-1
    embedding.push(value);
  }
  
  return embedding;
}

// Calculate cosine similarity between two embeddings
export function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) return 0;
  
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;
  
  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  
  if (normA === 0 || normB === 0) return 0;
  
  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

// Find similar expenses using keyword matching
export async function findSimilarExpenses(
  description: string, 
  threshold: number = 0.8
): Promise<SimilarExpense[]> {
  const results: SimilarExpense[] = [];
  const descLower = description.toLowerCase();
  
  // Check against category keywords
  for (const [category, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
    for (const keyword of keywords) {
      if (descLower.includes(keyword)) {
        const confidence = keyword.length / descLower.length; // Rough confidence score
        if (confidence >= threshold * 0.5) { // Lower threshold for keyword matching
          results.push({
            category,
            confidence: Math.min(confidence, 0.9),
            similarity: confidence,
            description: keyword
          });
        }
      }
    }
  }
  
  // Sort by confidence and return top results
  return results
    .sort((a, b) => b.confidence - a.confidence)
    .slice(0, 3);
}

// Main categorization function with embeddings
export async function categorizeExpenseWithEmbeddings(description: string): Promise<{
  category: string;
  confidence: number;
  subcategory?: string;
  method: 'exact' | 'similar' | 'keyword' | 'ai' | 'fallback';
}> {
  console.log(`\n🔍 [CATEGORIZATION] ============================================`);
  console.log(`📝 [CATEGORIZATION] Input: "${description}"`);
  console.log(`📊 [CATEGORIZATION] Method priority: EXACT → SIMILARITY → KEYWORD → GEMINI AI → FALLBACK`);
  console.log(`💰 [CATEGORIZATION] Cost priority: FREE → FREE → FREE → $0.02 → FREE`);
  
  // 1. Check exact matches first (free, instant)
  const descLower = description.toLowerCase().trim();
  const exactMatch = EXPENSE_EMBEDDINGS[descLower];
  if (exactMatch) {
    console.log(`✅ [EXACT MATCH] 🎯 Found perfect match in local database!`);
    console.log(`📋 [EXACT MATCH] Result: ${exactMatch.category}/${exactMatch.subcategory || exactMatch.category}`);
    console.log(`⚡ [PERFORMANCE] Processing time: ~1ms (local lookup)`);
    console.log(`💰 [COST] $0.00 (free local processing)`);
    console.log(`🔍 [CATEGORIZATION] ============================================\n`);
    return { ...exactMatch, method: 'exact' };
  }
  
  console.log(`❌ [EXACT MATCH] No perfect match found, trying partial matching...`);
  
  // 2. Check partial matches in known merchants
  for (const [merchant, data] of Object.entries(EXPENSE_EMBEDDINGS)) {
    if (descLower.includes(merchant) || merchant.includes(descLower)) {
      console.log(`✅ [PARTIAL MATCH] 🎯 Found partial match!`);
      console.log(`📋 [PARTIAL MATCH] Pattern: "${merchant}" → ${data.category}/${data.subcategory || data.category}`);
      console.log(`📊 [PARTIAL MATCH] Confidence: ${(data.confidence * 0.9 * 100).toFixed(1)}% (reduced for partial match)`);
      console.log(`⚡ [PERFORMANCE] Processing time: ~3ms (pattern matching)`);
      console.log(`💰 [COST] $0.00 (free local processing)`);
      console.log(`🔍 [CATEGORIZATION] ============================================\n`);
      return { ...data, confidence: data.confidence * 0.9, method: 'similar' };
    }
  }
  
  console.log(`❌ [PARTIAL MATCH] No partial matches found, trying keyword analysis...`);
  
  // 3. Use keyword matching for category detection
  const keywordMatches = await findSimilarExpenses(description, 0.6);
  if (keywordMatches.length > 0) {
    const bestMatch = keywordMatches[0];
    console.log(`✅ [KEYWORD MATCH] 🎯 Found category by keywords!`);
    console.log(`📋 [KEYWORD MATCH] Keyword: "${bestMatch.description}" → ${bestMatch.category}`);
    console.log(`📊 [KEYWORD MATCH] Confidence: ${(bestMatch.confidence * 100).toFixed(1)}%`);
    console.log(`⚡ [PERFORMANCE] Processing time: ~10ms (keyword scanning)`);
    console.log(`💰 [COST] $0.00 (free local processing)`);
    console.log(`🔍 [CATEGORIZATION] ============================================\n`);
    return {
      category: bestMatch.category,
      confidence: bestMatch.confidence,
      method: 'keyword'
    };
  }
  
  console.log(`❌ [KEYWORD MATCH] No keywords matched, trying basic pattern rules...`);
  
  // 4. Fallback to basic rules
  if (descLower.includes('food') || descLower.includes('eat') || descLower.includes('restaurant')) {
    console.log(`✅ [FALLBACK RULES] 🎯 Matched food pattern!`);
    console.log(`📋 [FALLBACK RULES] Pattern: food-related words → food/other`);
    console.log(`📊 [FALLBACK RULES] Confidence: 60% (basic rule matching)`);
    console.log(`⚡ [PERFORMANCE] Processing time: ~1ms (rule matching)`);
    console.log(`💰 [COST] $0.00 (free local processing)`);
    console.log(`🔍 [CATEGORIZATION] ============================================\n`);
    return { category: 'food', confidence: 0.6, method: 'fallback' };
  }
  if (descLower.includes('gas') || descLower.includes('fuel') || descLower.includes('transport')) {
    console.log(`✅ [FALLBACK RULES] 🎯 Matched transport pattern!`);
    console.log(`📋 [FALLBACK RULES] Pattern: transport-related words → transport/other`);
    console.log(`📊 [FALLBACK RULES] Confidence: 60% (basic rule matching)`);
    console.log(`⚡ [PERFORMANCE] Processing time: ~1ms (rule matching)`);
    console.log(`💰 [COST] $0.00 (free local processing)`);
    console.log(`🔍 [CATEGORIZATION] ============================================\n`);
    return { category: 'transport', confidence: 0.6, method: 'fallback' };
  }
  if (descLower.includes('shop') || descLower.includes('store') || descLower.includes('buy')) {
    console.log(`✅ [FALLBACK RULES] 🎯 Matched shopping pattern!`);
    console.log(`📋 [FALLBACK RULES] Pattern: shopping-related words → shopping/other`);
    console.log(`📊 [FALLBACK RULES] Confidence: 60% (basic rule matching)`);
    console.log(`⚡ [PERFORMANCE] Processing time: ~1ms (rule matching)`);
    console.log(`💰 [COST] $0.00 (free local processing)`);
    console.log(`🔍 [CATEGORIZATION] ============================================\n`);
    return { category: 'shopping', confidence: 0.6, method: 'fallback' };
  }
  
  console.log(`❌ [ALL METHODS] No patterns matched, using final fallback...`);
  
  // 5. Default category for unknown items
  console.log(`🤷 [FINAL FALLBACK] 🎯 Using default category!`);
  console.log(`📋 [FINAL FALLBACK] Result: other/miscellaneous`);
  console.log(`📊 [FINAL FALLBACK] Confidence: 30% (default assignment)`);
  console.log(`⚡ [PERFORMANCE] Processing time: ~1ms (immediate return)`);
  console.log(`💰 [COST] $0.00 (free local processing)`);
  console.log(`⚠️ [FINAL FALLBACK] Consider adding this pattern to improve future categorization`);
  console.log(`🔍 [CATEGORIZATION] ============================================\n`);
  return { category: 'other', confidence: 0.3, method: 'fallback' };
}

// Fallback to Gemini for truly unknown cases (only when confidence < 0.7)
export async function fallbackToGemini(description: string): Promise<{
  category: string;
  confidence: number;
  method: 'ai';
}> {
  try {
    console.log(`\n🤖 [GEMINI AI] ============================================`);
    console.log(`⚠️ [GEMINI AI] EXPENSIVE API FALLBACK ACTIVATED!`);
    console.log(`📝 [GEMINI AI] Input: "${description}"`);
    console.log(`💸 [GEMINI AI] Cost: $0.02 per request`);
    console.log(`⏱️ [GEMINI AI] Expected time: ~2000ms`);
    console.log(`🔄 [GEMINI AI] Sending request to Gemini API...`);
    
    const response = await fetch('/api/ai/categorize', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        description,
        prompt: `Categorize this expense in one word: "${description}". Choose from: food, transport, shopping, entertainment, health, utilities, other. Respond with just the category name.`
      })
    });
    
    const result = await response.json();
    const category = result.category?.toLowerCase() || 'other';
    
    console.log(`✅ [GEMINI AI] 🤖 AI categorization successful!`);
    console.log(`📋 [GEMINI AI] Result: ${category}/ai-generated`);
    console.log(`📊 [GEMINI AI] Confidence: 80% (AI processed)`);
    console.log(`💰 [GEMINI AI] Cost: $0.02 (charged to account)`);
    console.log(`🤖 [GEMINI AI] ============================================\n`);
    
    return {
      category,
      confidence: 0.8,
      method: 'ai'
    };
    
  } catch (error) {
    console.error(`❌ [GEMINI AI] API call failed:`, error);
    console.log(`🚨 [GEMINI AI] Fallback failed, using default category...`);
    return {
      category: 'other',
      confidence: 0.3,
      method: 'ai'
    };
  }
}

// Enhanced categorization that combines embeddings + AI when needed
export async function smartCategorizeExpense(description: string): Promise<{
  category: string;
  confidence: number;
  subcategory?: string;
  method: string;
}> {
  // First try embeddings
  const embeddingResult = await categorizeExpenseWithEmbeddings(description);
  
  // If confidence is high enough, use embedding result
  if (embeddingResult.confidence >= 0.7) {
    return embeddingResult;
  }
  
  // If confidence is low, use AI as fallback
  const aiResult = await fallbackToGemini(description);
  
  // Return the more confident result
  return embeddingResult.confidence > aiResult.confidence ? embeddingResult : aiResult;
}
