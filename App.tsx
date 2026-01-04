import React, { useState, useEffect, useRef } from 'react';
import { PredictionResult, SimulatedTrade, CalendarEvent, NewsItem } from './types';
import { analyzeMarket, fetchEconomicCalendar, analyzeMarketNews } from './services/geminiService';
import { fetchMetalData } from './services/metalService';
import { fetchRateData } from './services/rateService';
import Loader from './components/Loader';
import AnalysisCards from './components/AnalysisCards';
import TradingViewChart from './components/TradingViewChart';
import MarketClock from './components/MarketClock';

const QUICK_ASSETS = [
  { label: 'Gold', value: 'XAUUSD', display: 'XAU/USD' },
  { label: 'Silver', value: 'XAGUSD', display: 'XAG/USD' },
  { label: 'Bitcoin', value: 'BTCUSD', display: 'BTC/USD' },
  { label: 'Ethereum', value: 'ETHUSD', display: 'ETH/USD' },
  { label: 'Euro', value: 'EURUSD', display: 'EUR/USD' },
  { label: 'Nasdaq', value: 'QQQ', display: 'NAS100' },
];

const TIMEFRAMES = [
  { label: '5m', value: '5' },
  { label: '15m', value: '15' },
  { label: '30m', value: '30' },
  { label: '1H', value: '60' },
  { label: '4H', value: '240' },
  { label: '1D', value: 'D' },
];

type View = 'MARKET' | 'SIGNALS' | 'AI_TRADER' | 'CALENDAR' | 'NEWS' | 'MANAGER';

const App: React.FC = () => {
  const [currentView, setCurrentView] = useState<View>('MARKET');
  const [ticker, setTicker] = useState('XAUUSD');
  const [activeTicker, setActiveTicker] = useState('OANDA:XAUUSD');
  const [selectedTimeframe, setSelectedTimeframe] = useState('60');
  const [macroData, setMacroData] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<PredictionResult | null>(null);
  const [liveData, setLiveData] = useState<{ price: string; label: string; raw?: any } | null>(null);
  const [calendar, setCalendar] = useState<CalendarEvent[]>([]);
  const [news, setNews] = useState<NewsItem[]>([]);
  const [trades, setTrades] = useState<SimulatedTrade[]>([]);
  const [isAutoTraderActive, setIsAutoTraderActive] = useState(false);
  const [aiLogs, setAiLogs] = useState<string[]>([]);
  
  const autoTraderRef = useRef<number | null>(null);

  useEffect(() => {
    const fetchLiveContext = async () => {
      if (!ticker) return;
      try {
        const upTicker = ticker.toUpperCase();
        
        if (upTicker.includes('XAU') || upTicker.includes('XAG') || upTicker === 'GOLD' || upTicker === 'SILVER') {
          const metal = await fetchMetalData(ticker);
          if (metal) {
            setLiveData({ 
              price: metal.price.toLocaleString(), 
              label: `LIVE ${upTicker}`,
              raw: metal
            });
            return;
          }
        }

        const data = await fetchRateData(ticker);
        if (data && data.rates) {
          const base = upTicker.length >= 3 ? upTicker.substring(0, 3) : upTicker;
          const val = data.rates[base];
          if (val) {
            const price = (1 / val).toLocaleString(undefined, {
              minimumFractionDigits: 2,
              maximumFractionDigits: 5
            });
            setLiveData({ price, label: `LIVE ${upTicker}`, raw: data });
          }
        }
      } catch (err) { console.warn("Live context fetch failed", err); }
    };
    fetchLiveContext();
    const interval = window.setInterval(fetchLiveContext, 60000);
    return () => clearInterval(interval);
  }, [ticker]);

  useEffect(() => {
    if (currentView === 'CALENDAR' && calendar.length === 0) {
      loadCalendar();
    } else if (currentView === 'NEWS' && news.length === 0) {
      loadNews();
    }
  }, [currentView]);

  const loadCalendar = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await fetchEconomicCalendar();
      setCalendar(data);
    } catch (err: any) {
      setError("Failed to fetch calendar data. Gemini API might be rate-limited.");
    } finally {
      setIsLoading(false);
    }
  };

  const loadNews = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await analyzeMarketNews();
      setNews(data);
    } catch (err: any) {
      setError("Failed to fetch news sentiment. Gemini API might be rate-limited.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleAnalyze = async () => {
    if (!ticker.trim() || isLoading) return;
    setIsLoading(true); 
    setResult(null);
    setError(null);
    try {
      const upTicker = ticker.toUpperCase();
      const metalContext = (upTicker.includes('XAU') || upTicker.includes('XAG')) ? liveData?.raw : undefined;
      const rateContext = !metalContext ? liveData?.raw : undefined;

      const prediction = await analyzeMarket({ 
        ticker: upTicker, 
        macroData,
        metalContext,
        rateContext
      });
      setResult(prediction);
    } catch (err: any) { 
      console.error("Deep Analysis Error:", err);
      const msg = err.message || "";
      if (msg.includes("429") || msg.toLowerCase().includes("quota")) {
        setError("AI Quota Exceeded. The institutional engine is temporarily overloaded. Please wait 60 seconds and try again.");
      } else {
        setError(msg || "Institutional analysis failed due to market volatility. Please retry.");
      }
    } 
    finally { setIsLoading(false); }
  };

  const executeTrade = (type: 'BUY' | 'SELL', price: number, sl: number, tp: number) => {
    const newTrade: SimulatedTrade = {
      id: Math.random().toString(36).substr(2, 9), ticker: ticker.toUpperCase(), type, entryPrice: price, stopLoss: sl, takeProfit: tp, timestamp: Date.now(), status: 'OPEN', pnl: 0
    };
    setTrades(prev => [newTrade, ...prev]);
  };

  const closeTrade = (id: string) => {
    setTrades(prev => prev.map(t => t.id === id ? { ...t, status: 'CLOSED' as const } : t));
  };

  const deleteTrade = (id: string) => {
    setTrades(prev => prev.filter(t => t.id !== id));
  };

  const updateChart = (manualTicker?: string) => {
    const targetTicker = (manualTicker || ticker).trim().toUpperCase();
    if (!targetTicker) return;
    let sym = targetTicker;
    if (sym === 'XAUUSD' || sym === 'GOLD') sym = 'OANDA:XAUUSD';
    else if (sym === 'XAGUSD' || sym === 'SILVER') sym = 'OANDA:XAGUSD';
    else if (sym === 'BTCUSD' || sym === 'BTCUSDT') sym = 'BINANCE:BTCUSDT';
    else if (sym === 'ETHUSD' || sym === 'ETHUSDT') sym = 'BINANCE:ETHUSDT';
    else if (sym.length === 6 && !sym.includes(':')) sym = `FX_IDC:${sym}`;
    else if (!sym.includes(':')) sym = `NASDAQ:${sym}`;
    setActiveTicker(sym);
  };

  const handleToggleAsset = (val: string) => { 
    setLiveData(null); 
    setTicker(val); 
    updateChart(val); 
    setError(null);
    setResult(null);
  };

  return (
    <div className="min-h-screen trading-gradient text-slate-200 p-4 md:p-6">
      <div className="max-w-7xl mx-auto space-y-6 pb-24">
        
        {/* HEADER */}
        <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/10 pb-6">
          <div className="flex items-center space-x-4">
            <div className="w-10 h-10 bg-[#9403fc] rounded-xl flex items-center justify-center shadow-lg shadow-[#9403fc]/20">
              <i className="fa-solid fa-bolt-lightning text-white text-xl"></i>
            </div>
            <div>
              <h1 className="text-xl font-black text-white italic tracking-tighter uppercase">QUANTLY <span className="text-[#a3e635]">AI</span></h1>
              <p className="text-slate-500 text-[10px] font-black uppercase tracking-[0.2em] opacity-60 leading-none mt-1">Institutional Terminal</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <MarketClock />
            {liveData && (
              <div className="bg-white/5 px-4 py-2 rounded-xl border border-white/10 hidden lg:flex flex-col items-end">
                <span className="text-[8px] font-black text-slate-500 uppercase tracking-widest mb-0.5">{liveData.label}</span>
                <span className="text-white font-bold text-base leading-none">${liveData.price}</span>
              </div>
            )}
          </div>
        </header>

        {/* MARKET VIEW */}
        {currentView === 'MARKET' && (
          <div className="space-y-6 animate-in fade-in duration-500">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="flex flex-wrap items-center gap-1.5 p-1 bg-white/5 rounded-xl border border-white/10">
                {QUICK_ASSETS.map((asset) => (
                  <button key={asset.value} onClick={() => handleToggleAsset(asset.value)} className={`px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all ${ticker === asset.value ? 'bg-[#9403fc] text-white shadow-md' : 'hover:bg-white/5 text-slate-500'}`}>
                    {asset.display}
                  </button>
                ))}
              </div>
              <div className="flex items-center gap-1.5 p-1 bg-white/5 rounded-xl border border-white/10">
                {TIMEFRAMES.map((tf) => (
                  <button key={tf.value} onClick={() => setSelectedTimeframe(tf.value)} className={`px-3 py-2 rounded-lg text-[10px] font-bold transition-all ${selectedTimeframe === tf.value ? 'bg-[#a3e635] text-[#121212]' : 'hover:bg-white/5 text-slate-500'}`}>
                    {tf.label}
                  </button>
                ))}
              </div>
            </div>
            
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              <div className="lg:col-span-8">
                <TradingViewChart symbol={activeTicker} interval={selectedTimeframe} />
              </div>
              <div className="lg:col-span-4 glass p-6 rounded-2xl flex flex-col space-y-6 shadow-xl">
                 <div className="flex items-center space-x-3 opacity-60">
                   <i className="fa-solid fa-terminal text-[#a3e635] text-base"></i>
                   <h3 className="text-white font-black uppercase text-[10px] tracking-widest">Trade Terminal</h3>
                 </div>
                 <div className="space-y-4">
                   <div className="space-y-1">
                     <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest ml-1">Symbol Ticker</label>
                     <input type="text" value={ticker} onChange={(e) => setTicker(e.target.value.toUpperCase())} placeholder="TICKER..." className="w-full bg-[#0a0a0a] border border-white/10 rounded-xl px-4 py-2.5 text-xs text-white font-bold outline-none focus:ring-1 ring-[#9403fc]/50 transition-all shadow-inner" />
                   </div>
                   <div className="space-y-1">
                     <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest ml-1">Macro Overlays</label>
                     <textarea value={macroData} onChange={(e) => setMacroData(e.target.value)} className="w-full h-32 bg-[#0a0a0a] border border-white/10 rounded-xl p-4 text-[10px] outline-none text-slate-300 resize-none font-mono focus:ring-1 ring-[#9403fc]/50 shadow-inner" placeholder="Optional context..."></textarea>
                   </div>
                   <button disabled={isLoading} onClick={handleAnalyze} className="w-full py-3.5 bg-[#a3e635] text-[#121212] font-black rounded-xl text-[10px] uppercase tracking-widest hover:bg-[#bef264] transition-all shadow-lg active:scale-95">
                     {isLoading ? 'Processing...' : 'Run Deep Analysis'}
                   </button>
                 </div>
              </div>
            </div>
            
            {error && (
              <div className="p-4 bg-rose-500/10 border border-rose-500/20 rounded-xl text-rose-400 text-xs font-bold flex flex-col sm:flex-row sm:items-center justify-between gap-3 animate-in fade-in slide-in-from-top-2">
                <div className="flex items-center space-x-3">
                  <i className="fa-solid fa-triangle-exclamation"></i>
                  <span>{error}</span>
                </div>
                <button onClick={handleAnalyze} className="px-4 py-1.5 bg-rose-500 text-white rounded-lg text-[9px] font-black uppercase hover:bg-rose-400 transition-colors">
                  Retry Action
                </button>
              </div>
            )}

            {result && !isLoading && <AnalysisCards data={result} onExecuteTrade={executeTrade} />}
            {isLoading && <Loader />}
          </div>
        )}

        {/* SIGNALS VIEW */}
        {currentView === 'SIGNALS' && (
          <div className="space-y-8 animate-in fade-in duration-500 max-w-4xl mx-auto">
             <div className="glass p-10 rounded-3xl border-white/5 text-center space-y-8 shadow-xl">
                <div className="space-y-2">
                  <h2 className="text-3xl font-black italic uppercase text-white tracking-tight">Signal Scanner</h2>
                  <p className="text-slate-500 text-[10px] font-black uppercase tracking-[0.4em] opacity-60">Institutional Probability Engine</p>
                </div>
                <div className="flex flex-wrap justify-center gap-4">
                  <select value={ticker} onChange={(e) => handleToggleAsset(e.target.value)} className="bg-[#121212] border border-white/10 rounded-xl px-6 py-3 text-xs text-white font-black appearance-none cursor-pointer hover:border-white/20 transition-all shadow-lg">
                    {QUICK_ASSETS.map(a => <option key={a.value} value={a.value}>{a.display}</option>)}
                  </select>
                  <select value={selectedTimeframe} onChange={(e) => setSelectedTimeframe(e.target.value)} className="bg-[#121212] border border-white/10 rounded-xl px-6 py-3 text-xs text-white font-black appearance-none cursor-pointer hover:border-white/20 transition-all shadow-lg">
                    {TIMEFRAMES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                  </select>
                </div>
                <button onClick={handleAnalyze} disabled={isLoading} className="bg-[#9403fc] px-12 py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest text-white hover:bg-[#a322fc] transition-all shadow-lg active:scale-95">
                   {isLoading ? 'Scanning Market...' : 'Request Trade Signal'}
                </button>
             </div>
             
             {error && (
               <div className="p-4 bg-rose-500/10 border border-rose-500/20 rounded-xl text-rose-400 text-xs font-bold flex items-center justify-between gap-3 max-w-lg mx-auto">
                 <div className="flex items-center space-x-3">
                   <i className="fa-solid fa-triangle-exclamation"></i>
                   <span>{error}</span>
                 </div>
                 <button onClick={handleAnalyze} className="px-4 py-1.5 bg-rose-500 text-white rounded-lg text-[9px] font-black uppercase">
                   Retry
                 </button>
               </div>
             )}

             {result && !isLoading && <AnalysisCards data={result} onExecuteTrade={executeTrade} />}
             {isLoading && <Loader />}
          </div>
        )}

        {/* CALENDAR VIEW */}
        {currentView === 'CALENDAR' && (
          <div className="space-y-6 animate-in fade-in duration-500">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-black uppercase tracking-tight italic">Economic <span className="text-[#a3e635]">Calendar</span></h2>
                <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Global High Impact Events</p>
              </div>
              <button onClick={loadCalendar} disabled={isLoading} className="px-4 py-2 bg-white/5 border border-white/10 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-white/10 transition-all">
                <i className={`fa-solid fa-arrows-rotate mr-2 ${isLoading ? 'animate-spin' : ''}`}></i> Refresh
              </button>
            </div>
            
            {isLoading ? <Loader /> : (
              <div className="grid grid-cols-1 gap-4">
                {calendar.length === 0 ? (
                  <div className="glass p-12 text-center rounded-2xl text-slate-500 italic">No events currently listed.</div>
                ) : (
                  calendar.map(event => (
                    <div key={event.id} className="glass p-5 rounded-2xl border-white/5 flex flex-col md:flex-row gap-6 hover:bg-white/[0.06] transition-all shadow-lg">
                      <div className="flex flex-col items-center justify-center min-w-[100px] border-r border-white/5 pr-6">
                        <span className="text-xs font-black text-white">{event.time}</span>
                        <span className={`text-[8px] font-black uppercase px-2 py-0.5 rounded mt-1 ${event.impact === 'HIGH' ? 'bg-rose-500 text-white' : event.impact === 'MEDIUM' ? 'bg-amber-500 text-white' : 'bg-slate-700 text-slate-300'}`}>
                          {event.impact} IMPACT
                        </span>
                      </div>
                      <div className="flex-1 space-y-2">
                        <div className="flex items-center justify-between">
                          <h4 className="text-sm font-bold text-white uppercase tracking-tight">{event.title}</h4>
                          <span className={`text-[9px] font-black uppercase ${event.market_bias_impact === 'BULLISH' ? 'text-[#a3e635]' : 'text-rose-400'}`}>
                            Bias: {event.market_bias_impact}
                          </span>
                        </div>
                        <p className="text-[10px] text-slate-400 leading-relaxed">{event.description}</p>
                        <div className="flex gap-4 pt-2">
                          <div className="flex flex-col">
                            <span className="text-[8px] font-black text-slate-600 uppercase">Forecast</span>
                            <span className="text-[10px] font-bold text-white">{event.forecast || '-'}</span>
                          </div>
                          <div className="flex flex-col">
                            <span className="text-[8px] font-black text-slate-600 uppercase">Previous</span>
                            <span className="text-[10px] font-bold text-slate-400">{event.previous || '-'}</span>
                          </div>
                          {event.actual && (
                            <div className="flex flex-col">
                              <span className="text-[8px] font-black text-slate-600 uppercase">Actual</span>
                              <span className="text-[10px] font-bold text-[#a3e635]">{event.actual}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        )}

        {/* NEWS VIEW */}
        {currentView === 'NEWS' && (
          <div className="space-y-6 animate-in fade-in duration-500">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-black uppercase tracking-tight italic">Market <span className="text-[#a3e635]">Sentiment</span></h2>
                <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Global News Flow & Institutional Intelligence</p>
              </div>
              <button onClick={loadNews} disabled={isLoading} className="px-4 py-2 bg-white/5 border border-white/10 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-white/10 transition-all">
                <i className={`fa-solid fa-arrows-rotate mr-2 ${isLoading ? 'animate-spin' : ''}`}></i> Refresh News
              </button>
            </div>

            {isLoading ? <Loader /> : (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {news.length === 0 ? (
                  <div className="lg:col-span-2 glass p-12 text-center rounded-2xl text-slate-500 italic">No news reports currently available.</div>
                ) : (
                  news.map(item => (
                    <div key={item.id} className="glass p-5 rounded-2xl border-white/5 flex flex-col space-y-4 hover:bg-white/[0.06] transition-all shadow-lg group">
                      <div className="flex items-start justify-between">
                        <div className="space-y-1">
                          <span className="text-[8px] font-black text-[#9403fc] uppercase tracking-widest">{item.source} • {item.time}</span>
                          <h4 className="text-sm font-bold text-white uppercase group-hover:text-[#a3e635] transition-colors">{item.title}</h4>
                        </div>
                        <div className={`px-2 py-1 rounded text-[8px] font-black uppercase border ${item.sentiment === 'POSITIVE' ? 'border-[#a3e635]/30 bg-[#a3e635]/10 text-[#a3e635]' : item.sentiment === 'NEGATIVE' ? 'border-rose-500/30 bg-rose-500/10 text-rose-500' : 'border-slate-500/30 bg-slate-500/10 text-slate-500'}`}>
                          {item.sentiment}
                        </div>
                      </div>
                      <p className="text-[10px] text-slate-400 leading-relaxed line-clamp-3">{item.summary}</p>
                      <div className="flex items-center justify-between pt-2">
                        <div className="flex flex-wrap gap-1">
                          {item.related_assets.map(asset => (
                            <span key={asset} className="px-2 py-0.5 bg-white/5 rounded text-[8px] font-bold text-slate-500 uppercase">{asset}</span>
                          ))}
                        </div>
                        <div className="flex items-center space-x-2">
                          <span className="text-[8px] font-black text-slate-600 uppercase">Impact Score</span>
                          <div className="w-16 h-1 bg-white/5 rounded-full overflow-hidden">
                            <div className={`h-full ${item.sentiment === 'POSITIVE' ? 'bg-[#a3e635]' : 'bg-rose-500'}`} style={{ width: `${item.impact_score}%` }}></div>
                          </div>
                          <span className="text-[10px] font-black text-white">{item.impact_score}%</span>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        )}

        {/* MANAGER (Ops) VIEW */}
        {currentView === 'MANAGER' && (
          <div className="space-y-6 animate-in fade-in duration-500">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-black uppercase tracking-tight italic">Operations <span className="text-[#a3e635]">Log</span></h2>
                <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Simulated Portfolio Execution</p>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4">
              {trades.length === 0 ? (
                <div className="glass p-12 text-center rounded-2xl text-slate-500 italic">No active simulated trades found. Run an analysis to generate signals.</div>
              ) : (
                <div className="glass rounded-2xl overflow-hidden border-white/5 shadow-xl">
                  <table className="w-full text-left text-[10px]">
                    <thead className="bg-white/5 border-b border-white/10">
                      <tr>
                        <th className="px-6 py-4 font-black uppercase text-slate-500 tracking-widest">Ticker</th>
                        <th className="px-6 py-4 font-black uppercase text-slate-500 tracking-widest">Action</th>
                        <th className="px-6 py-4 font-black uppercase text-slate-500 tracking-widest">Entry</th>
                        <th className="px-6 py-4 font-black uppercase text-slate-500 tracking-widest">Status</th>
                        <th className="px-6 py-4 font-black uppercase text-slate-500 tracking-widest text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {trades.map(trade => (
                        <tr key={trade.id} className="hover:bg-white/[0.02] transition-colors">
                          <td className="px-6 py-4 font-bold text-white">{trade.ticker}</td>
                          <td className="px-6 py-4">
                            <span className={`px-2 py-0.5 rounded font-black text-[8px] uppercase ${trade.type === 'BUY' ? 'bg-[#a3e635]/20 text-[#a3e635]' : 'bg-rose-500/20 text-rose-500'}`}>
                              {trade.type}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-slate-300">${trade.entryPrice.toLocaleString()}</td>
                          <td className="px-6 py-4">
                            <span className={`text-[9px] font-black uppercase ${trade.status === 'OPEN' ? 'text-[#a3e635] animate-pulse' : 'text-slate-500'}`}>
                              {trade.status}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-right">
                            <div className="flex items-center justify-end space-x-2">
                              {trade.status === 'OPEN' && (
                                <button onClick={() => closeTrade(trade.id)} className="px-3 py-1 bg-white/5 rounded border border-white/10 hover:bg-white/10 text-[9px] font-black uppercase">Close</button>
                              )}
                              <button onClick={() => deleteTrade(trade.id)} className="px-3 py-1 bg-rose-500/10 text-rose-400 rounded border border-rose-500/20 hover:bg-rose-500/20 text-[9px] font-black uppercase">Delete</button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {/* AI TRADER VIEW */}
        {currentView === 'AI_TRADER' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 animate-in fade-in duration-500">
             <div className="lg:col-span-9 space-y-4">
                <TradingViewChart symbol={activeTicker} interval={selectedTimeframe} />
                <div className="glass p-4 rounded-2xl border-white/5 bg-black/40 shadow-inner">
                   <h3 className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-2 flex items-center">
                     <i className="fa-solid fa-robot mr-2 text-[#9403fc]"></i>
                     Bot Execution Logs
                   </h3>
                   <div className="h-32 overflow-y-auto space-y-1.5 font-mono text-[10px] no-scrollbar">
                      {aiLogs.map((log, i) => <div key={i} className="text-slate-400 py-1 border-b border-white/5 opacity-80">{log}</div>)}
                      {aiLogs.length === 0 && <div className="text-slate-600 italic">Standby... AI Scraper active but no recent trade matches.</div>}
                   </div>
                </div>
             </div>
             <div className="lg:col-span-3">
                <div className="glass p-6 rounded-3xl border-white/5 flex flex-col items-center text-center space-y-6 h-full justify-center shadow-xl">
                   <div className={`w-16 h-16 rounded-full flex items-center justify-center transition-all duration-500 ${isAutoTraderActive ? 'bg-[#a3e635]/10 shadow-[0_0_20px_#a3e63533]' : 'bg-[#1e1e1e] opacity-40'}`}>
                      <i className={`fa-solid fa-microchip text-2xl ${isAutoTraderActive ? 'text-[#a3e635]' : 'text-slate-500'}`}></i>
                   </div>
                   <div className="space-y-1">
                    <h2 className="text-lg font-black italic text-white uppercase tracking-tight leading-none">AI Agent</h2>
                    <p className="text-[8px] text-slate-500 font-black uppercase tracking-[0.2em]">Automated Scraper</p>
                   </div>
                   <button onClick={() => setIsAutoTraderActive(!isAutoTraderActive)} className={`w-full py-3.5 rounded-xl font-black text-[9px] uppercase tracking-widest transition-all active:scale-95 shadow-lg ${isAutoTraderActive ? 'bg-rose-500 text-white' : 'bg-[#a3e635] text-[#121212]'}`}>
                      {isAutoTraderActive ? 'Stop Bot' : 'Start Bot'}
                   </button>
                </div>
             </div>
          </div>
        )}

        {/* BOTTOM NAVIGATION */}
        <nav className="fixed bottom-6 left-1/2 -translate-x-1/2 glass px-2 py-1.5 rounded-2xl border-white/10 shadow-2xl flex items-center space-x-1 z-50 ring-1 ring-white/10 backdrop-blur-2xl">
           {[
             { id: 'MARKET', icon: 'fa-chart-pie', label: 'Market' },
             { id: 'SIGNALS', icon: 'fa-bolt', label: 'Signals' },
             { id: 'AI_TRADER', icon: 'fa-robot', label: 'Agent' },
             { id: 'CALENDAR', icon: 'fa-calendar-days', label: 'Events' },
             { id: 'NEWS', icon: 'fa-rss', label: 'News' },
             { id: 'MANAGER', icon: 'fa-briefcase', label: 'Ops', count: trades.filter(t => t.status === 'OPEN').length }
           ].map(item => (
             <button 
                key={item.id} 
                onClick={() => {
                  setCurrentView(item.id as View);
                  setError(null); // Clear errors on view switch
                }} 
                className={`flex items-center space-x-2 px-4 py-2.5 rounded-xl transition-all relative ${currentView === item.id ? 'bg-[#9403fc] text-white shadow-lg' : 'hover:bg-white/5 text-slate-500'}`}
             >
                <i className={`fa-solid ${item.icon} text-xs`}></i>
                <span className="text-[10px] font-black uppercase tracking-wider hidden md:inline">{item.label}</span>
                {item.count ? <span className="absolute -top-1 -right-1 w-4 h-4 bg-rose-500 text-white text-[8px] rounded-full flex items-center justify-center border border-[#000000] font-black">{item.count}</span> : null}
             </button>
           ))}
        </nav>
      </div>
    </div>
  );
};

export default App;