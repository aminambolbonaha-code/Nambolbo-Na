import React from 'react';
import { PredictionResult, MarketBias, TradeSignal } from '../types';

interface Props {
  data: PredictionResult;
  onExecuteTrade: (type: 'BUY' | 'SELL', price: number, sl: number, tp: number) => void;
}

const StatBox: React.FC<{ label: string; value: string | number; color?: string }> = ({ label, value, color = "text-white" }) => (
  <div className="p-3 bg-white/5 rounded-xl border border-white/5">
    <div className="text-[9px] uppercase tracking-widest text-slate-500 font-black mb-1">{label}</div>
    <div className={`text-sm font-bold tracking-tight ${color}`}>{value}</div>
  </div>
);

const AnalysisCards: React.FC<Props> = ({ data, onExecuteTrade }) => {
  const biasColor = data.market_bias === MarketBias.BULLISH ? 'text-[#a3e635]' : data.market_bias === MarketBias.BEARISH ? 'text-rose-400' : 'text-amber-400';
  const signalBg = data.trade_signal === TradeSignal.BUY ? 'bg-[#a3e635]/10 text-[#a3e635]' : data.trade_signal === TradeSignal.SELL ? 'bg-rose-500/10 text-rose-400' : 'bg-slate-500/20 text-slate-400';

  const handleTradeAction = (type: 'BUY' | 'SELL') => {
    const entryPrice = (data.entry_range.min + data.entry_range.max) / 2;
    onExecuteTrade(type, entryPrice, data.stop_loss, data.take_profit_targets[0] || entryPrice * 1.05);
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-in fade-in duration-700">
        
        {/* TECHNICAL ANALYSIS CARD */}
        <div className="glass p-6 rounded-2xl flex flex-col h-full border-white/5 shadow-xl">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center space-x-3">
              <i className="fa-solid fa-chart-column text-[#9403fc] text-lg"></i>
              <h3 className="text-xs font-black text-white uppercase tracking-widest">Technicals</h3>
            </div>
            <span className={`px-3 py-1 rounded-lg text-[9px] font-black ${biasColor} border border-current/20 bg-current/5`}>
              {data.market_bias}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-3 mb-6">
            <StatBox label="Asset" value={data.stock} />
            <StatBox label="Trend" value={data.price_action_strength} color={data.price_action_strength === 'STRONG' ? 'text-[#a3e635]' : 'text-slate-300'} />
            <StatBox label="Support" value={`$${data.liquidity_zones.support.toLocaleString()}`} />
            <StatBox label="Resist" value={`$${data.liquidity_zones.resistance.toLocaleString()}`} />
          </div>

          <div className="mt-auto space-y-2">
            <div className="text-[9px] uppercase font-black text-slate-600 tracking-widest ml-1">Detected Patterns</div>
            <div className="flex flex-wrap gap-1.5">
              {data.detected_candle_patterns.map((p, i) => (
                <span key={i} className="px-2.5 py-1 bg-white/5 rounded-lg text-[9px] text-[#9403fc] border border-[#9403fc]/20 font-black uppercase tracking-wider">
                  {p}
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* ECONOMIC CONTEXT CARD */}
        <div className="glass p-6 rounded-2xl flex flex-col h-full border-white/5 shadow-xl">
          <div className="flex items-center space-x-3 mb-6">
            <i className="fa-solid fa-earth-americas text-[#a3e635] text-lg"></i>
            <h3 className="text-xs font-black text-white uppercase tracking-widest">Macro Context</h3>
          </div>

          <div className="space-y-4">
            <div className="flex justify-between items-center pb-3 border-b border-white/5">
              <span className="text-[10px] text-slate-500 font-black uppercase tracking-wider">Fed Sentiment</span>
              <span className={`text-xs font-black ${data.economic_context.fed_impact === 'POSITIVE' ? 'text-[#a3e635]' : 'text-rose-400'}`}>{data.economic_context.fed_impact}</span>
            </div>
            <div className="flex justify-between items-center pb-3 border-b border-white/5">
              <span className="text-[10px] text-slate-500 font-black uppercase tracking-wider">Inflation</span>
              <span className="text-xs font-black text-white">{data.economic_context.inflation_pressure}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-[10px] text-slate-500 font-black uppercase tracking-wider">Systemic Risk</span>
              <span className="text-xs font-black text-white">{data.economic_context.economic_risk}</span>
            </div>
          </div>

          <div className="mt-8 p-4 bg-[#0a0a0a] rounded-xl border border-white/5 italic text-slate-400 text-[11px] leading-relaxed border-l-2 border-l-[#a3e635] shadow-inner">
            &quot;{data.analysis_brief}&quot;
          </div>
        </div>

        {/* TRADE PREDICTION CARD */}
        <div className="glass p-6 rounded-2xl flex flex-col h-full border-[#a3e635]/10 shadow-xl shadow-[#a3e635]/5">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center space-x-3">
              <i className="fa-solid fa-crosshairs text-[#a3e635] text-lg"></i>
              <h3 className="text-xs font-black text-white uppercase tracking-widest">Signal Setup</h3>
            </div>
            <div className={`px-3 py-1 rounded-lg text-[9px] font-black tracking-widest ${signalBg}`}>
              {data.trade_signal}
            </div>
          </div>

          <div className="flex-1 space-y-4">
            <div className="text-center p-4 bg-[#0a0a0a] rounded-2xl border border-white/5 shadow-inner">
              <div className="text-[9px] uppercase text-slate-500 font-black mb-1.5 tracking-widest opacity-60">Entry Range</div>
              <div className="text-xl font-black text-white tracking-tighter">${data.entry_range.min.toLocaleString()} - ${data.entry_range.max.toLocaleString()}</div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest ml-1">Stop Loss</label>
                <div className="bg-[#0a0a0a] border border-white/10 rounded-xl px-3 py-2 text-xs text-rose-400 font-black shadow-inner">${data.stop_loss.toLocaleString()}</div>
              </div>
              <div className="space-y-1">
                <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest ml-1">Take Profit</label>
                <div className="bg-[#0a0a0a] border border-white/10 rounded-xl px-3 py-2 text-xs text-[#a3e635] font-black shadow-inner">${data.take_profit_targets[0]?.toLocaleString() || 'N/A'}</div>
              </div>
            </div>

            <div className="p-3 bg-[#a3e635]/5 border border-[#a3e635]/20 rounded-xl flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <i className="fa-solid fa-clock-rotate-left text-[#a3e635] text-[10px]"></i>
                <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Target ETA</span>
              </div>
              <span className="text-xs font-black text-[#a3e635] uppercase">{data.expected_timeframe}</span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 mt-6">
            <button onClick={() => handleTradeAction('BUY')} className="py-3 bg-[#a3e635] text-[#121212] font-black rounded-xl text-[9px] uppercase tracking-widest shadow-lg active:scale-95 hover:bg-[#bef264] transition-all">Buy Sim</button>
            <button onClick={() => handleTradeAction('SELL')} className="py-3 bg-rose-500 text-white font-black rounded-xl text-[9px] uppercase tracking-widest shadow-lg active:scale-95 hover:bg-rose-400 transition-all">Sell Sim</button>
          </div>
        </div>
      </div>

      {/* GROUNDING SOURCES */}
      {data.sources && data.sources.length > 0 && (
        <div className="glass p-4 rounded-2xl border-white/5 animate-in fade-in slide-in-from-bottom-2 duration-1000">
          <h4 className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-3 flex items-center">
            <i className="fa-solid fa-link mr-2 text-[#9403fc]"></i>
            Institutional Grounding Data
          </h4>
          <div className="flex flex-wrap gap-2">
            {data.sources.map((src, i) => (
              <a 
                key={i} 
                href={src.uri} 
                target="_blank" 
                rel="noopener noreferrer"
                className="px-3 py-1.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-[10px] text-slate-300 font-medium transition-colors flex items-center space-x-2"
              >
                <span className="max-w-[150px] truncate">{src.title}</span>
                <i className="fa-solid fa-arrow-up-right-from-square text-[8px] opacity-50"></i>
              </a>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default AnalysisCards;