export enum MarketBias {
  BULLISH = 'BULLISH',
  BEARISH = 'BEARISH',
  NEUTRAL = 'NEUTRAL'
}

export enum TradeSignal {
  BUY = 'BUY',
  SELL = 'SELL',
  HOLD = 'HOLD'
}

export enum RiskLevel {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH'
}

export interface GroundingSource {
  title: string;
  uri: string;
}

export interface PredictionResult {
  stock: string;
  market_bias: MarketBias;
  trade_signal: TradeSignal;
  entry_range: { min: number; max: number };
  stop_loss: number;
  take_profit_targets: number[];
  expected_timeframe: string;
  risk_level: RiskLevel;
  confidence: number;
  price_action_strength: 'WEAK' | 'MODERATE' | 'STRONG';
  detected_candle_patterns: string[];
  liquidity_zones: {
    support: number;
    resistance: number;
  };
  economic_context: {
    fed_impact: 'POSITIVE' | 'NEGATIVE' | 'NEUTRAL';
    inflation_pressure: 'HIGH' | 'MODERATE' | 'LOW';
    interest_rate_trend: 'RISING' | 'FALLING' | 'STABLE';
    economic_risk: RiskLevel;
  };
  analysis_brief: string;
  sources?: GroundingSource[];
}

export interface CalendarEvent {
  id: string;
  title: string;
  time: string; // ISO format or relative
  impact: 'HIGH' | 'MEDIUM' | 'LOW';
  reliability: 'HIGH' | 'MEDIUM' | 'LOW';
  forecast: string;
  previous: string;
  actual?: string;
  market_bias_impact: 'BULLISH' | 'BEARISH' | 'NEUTRAL';
  description: string;
}

export interface NewsItem {
  id: string;
  title: string;
  source: string;
  time: string;
  sentiment: 'POSITIVE' | 'NEGATIVE' | 'NEUTRAL';
  impact_score: number; // 0-100
  summary: string;
  related_assets: string[];
}

export interface MarketInput {
  ticker: string;
  macroData: string;
  metalContext?: any;
  rateContext?: any;
}

export interface SimulatedTrade {
  id: string;
  ticker: string;
  type: 'BUY' | 'SELL';
  entryPrice: number;
  stopLoss: number;
  takeProfit: number;
  timestamp: number;
  status: 'OPEN' | 'CLOSED';
  pnl?: number;
}