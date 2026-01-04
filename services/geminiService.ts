import { GoogleGenAI, Type, GenerateContentResponse } from "@google/genai";
import { MarketInput, PredictionResult, CalendarEvent, NewsItem, GroundingSource } from "../types";

const SYSTEM_INSTRUCTION = `You are an expert institutional-grade AI stock trading analyst bot.
You analyze real market data for the requested ticker and macroeconomic sources. 
You MUST use Google Search to find current OHLCV data, market structure, and latest news.
If real-time metal data (Gold/Silver) or exchange rates (Forex/Crypto) are provided in the context, prioritize them for current price reference.
All predictions must be based strictly on current real-time market data.

Your analysis must include:
- Technical & Chart Analysis (Recent OHLCV, Support/Resistance, RSI, Patterns)
- Macroeconomic & Fed Impact Analysis (Current Rates, Inflation context)
- Clear Trade Prediction Goals (Entry, Stop Loss, Take Profits)
- **Expected Timeframe**: Predict the duration for the trade to reach its targets (e.g., "1 Hour", "15-30 Mins", "1 Day", "1 Week").

Return ONLY valid strict JSON. No explanations outside JSON. No markdown backticks.
Prices must be realistic and reflect the current market state of the ticker.`;

/**
 * Helper to retry a function with exponential backoff on rate-limit errors.
 */
async function withRetry<T>(fn: () => Promise<T>, maxRetries = 2): Promise<T> {
  let lastError: any;
  for (let i = 0; i <= maxRetries; i++) {
    try {
      return await fn();
    } catch (error: any) {
      lastError = error;
      const errorMessage = error?.message?.toLowerCase() || "";
      const isRateLimit = errorMessage.includes("429") || errorMessage.includes("quota") || errorMessage.includes("limit");
      
      if (isRateLimit && i < maxRetries) {
        const delay = Math.pow(2, i) * 2000; // 2s, 4s...
        console.warn(`Rate limit hit. Retrying in ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
        continue;
      }
      throw error;
    }
  }
  throw lastError;
}

export async function analyzeMarket(input: MarketInput): Promise<PredictionResult> {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  let prompt = `Analyze ticker: ${input.ticker}. `;
  if (input.metalContext) {
    prompt += `\nREAL-TIME METAL DATA: ${JSON.stringify(input.metalContext)}. `;
  }
  if (input.rateContext) {
    prompt += `\nREAL-TIME EXCHANGE RATE DATA: ${JSON.stringify(input.rateContext)}. `;
  }
  prompt += `\nAdditional context: ${input.macroData || 'Provide full institutional analysis based on current real-time data.'}`;

  return withRetry(async () => {
    const response: GenerateContentResponse = await ai.models.generateContent({
      model: 'gemini-3-pro-preview',
      contents: prompt,
      config: {
        systemInstruction: SYSTEM_INSTRUCTION,
        tools: [{ googleSearch: {} }],
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            stock: { type: Type.STRING },
            market_bias: { type: Type.STRING, enum: ['BULLISH', 'BEARISH', 'NEUTRAL'] },
            trade_signal: { type: Type.STRING, enum: ['BUY', 'SELL', 'HOLD'] },
            entry_range: {
              type: Type.OBJECT,
              properties: {
                min: { type: Type.NUMBER },
                max: { type: Type.NUMBER }
              },
              required: ['min', 'max']
            },
            stop_loss: { type: Type.NUMBER },
            take_profit_targets: {
              type: Type.ARRAY,
              items: { type: Type.NUMBER }
            },
            expected_timeframe: { 
              type: Type.STRING, 
              description: "The predicted duration to reach the trade targets."
            },
            risk_level: { type: Type.STRING, enum: ['LOW', 'MEDIUM', 'HIGH'] },
            confidence: { type: Type.NUMBER },
            price_action_strength: { type: Type.STRING, enum: ['WEAK', 'MODERATE', 'STRONG'] },
            detected_candle_patterns: {
              type: Type.ARRAY,
              items: { type: Type.STRING }
            },
            liquidity_zones: {
              type: Type.OBJECT,
              properties: {
                support: { type: Type.NUMBER },
                resistance: { type: Type.NUMBER }
              },
              required: ['support', 'resistance']
            },
            economic_context: {
              type: Type.OBJECT,
              properties: {
                fed_impact: { type: Type.STRING, enum: ['POSITIVE', 'NEGATIVE', 'NEUTRAL'] },
                inflation_pressure: { type: Type.STRING, enum: ['HIGH', 'MODERATE', 'LOW'] },
                interest_rate_trend: { type: Type.STRING, enum: ['RISING', 'FALLING', 'STABLE'] },
                economic_risk: { type: Type.STRING, enum: ['LOW', 'MEDIUM', 'HIGH'] }
              },
              required: ['fed_impact', 'inflation_pressure', 'interest_rate_trend', 'economic_risk']
            },
            analysis_brief: { type: Type.STRING }
          },
          required: [
            'stock', 'market_bias', 'trade_signal', 'entry_range', 
            'stop_loss', 'take_profit_targets', 'expected_timeframe', 'risk_level', 
            'confidence', 'price_action_strength', 'detected_candle_patterns',
            'liquidity_zones', 'economic_context', 'analysis_brief'
          ]
        }
      }
    });

    const rawText = response.text || "";
    const jsonMatch = rawText.match(/\{[\s\S]*\}/);
    const text = jsonMatch ? jsonMatch[0] : rawText;

    if (!text) throw new Error("Empty response received from institutional engine.");
    
    try {
      const data = JSON.parse(text) as PredictionResult;
      const chunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks;
      if (chunks) {
        data.sources = chunks
          .filter((chunk: any) => chunk.web)
          .map((chunk: any) => ({
            title: chunk.web.title,
            uri: chunk.web.uri
          }));
      }
      return data;
    } catch (e) {
      console.error("JSON Parse Error:", text);
      throw new Error("Failed to decode market intelligence. Data structure mismatch.");
    }
  });
}

export async function fetchEconomicCalendar(): Promise<CalendarEvent[]> {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  return withRetry(async () => {
    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-preview',
      contents: "Fetch institutional economic calendar for high impact events this week.",
      config: {
        tools: [{ googleSearch: {} }],
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              id: { type: Type.STRING },
              title: { type: Type.STRING },
              time: { type: Type.STRING },
              impact: { type: Type.STRING, enum: ['HIGH', 'MEDIUM', 'LOW'] },
              reliability: { type: Type.STRING, enum: ['HIGH', 'MEDIUM', 'LOW'] },
              forecast: { type: Type.STRING },
              previous: { type: Type.STRING },
              actual: { type: Type.STRING },
              market_bias_impact: { type: Type.STRING, enum: ['BULLISH', 'BEARISH', 'NEUTRAL'] },
              description: { type: Type.STRING }
            },
            required: ['id', 'title', 'time', 'impact', 'reliability', 'market_bias_impact', 'description']
          }
        }
      }
    });
    return JSON.parse(response.text || "[]");
  });
}

export async function analyzeMarketNews(): Promise<NewsItem[]> {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  return withRetry(async () => {
    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-preview',
      contents: "Analyze broad financial news sentiment for top 10 impactful headlines.",
      config: {
        tools: [{ googleSearch: {} }],
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              id: { type: Type.STRING },
              title: { type: Type.STRING },
              source: { type: Type.STRING },
              time: { type: Type.STRING },
              sentiment: { type: Type.STRING, enum: ['POSITIVE', 'NEGATIVE', 'NEUTRAL'] },
              impact_score: { type: Type.NUMBER },
              summary: { type: Type.STRING },
              related_assets: { type: Type.ARRAY, items: { type: Type.STRING } }
            },
            required: ['id', 'title', 'source', 'time', 'sentiment', 'impact_score', 'summary', 'related_assets']
          }
        }
      }
    });
    return JSON.parse(response.text || "[]");
  });
}