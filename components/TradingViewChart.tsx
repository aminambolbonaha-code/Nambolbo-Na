import React, { useEffect, useRef } from 'react';

interface TradingViewChartProps {
  symbol: string;
  interval?: string;
}

declare const TradingView: any;

const TradingViewChart: React.FC<TradingViewChartProps> = ({ symbol, interval = "60" }) => {
  const containerId = "tradingview_chart_main";
  const widgetRef = useRef<any>(null);

  useEffect(() => {
    if (typeof TradingView !== 'undefined') {
      const formattedSymbol = symbol.includes(':') ? symbol : `NASDAQ:${symbol}`;

      widgetRef.current = new TradingView.widget({
        "autosize": true,
        "symbol": formattedSymbol,
        "interval": interval,
        "timezone": "Etc/UTC",
        "theme": "dark",
        "style": "1",
        "locale": "en",
        "toolbar_bg": "rgba(0, 0, 0, 1)",
        "enable_publishing": false,
        "hide_side_toolbar": true,
        "hide_top_toolbar": true, 
        "hide_legend": true,      
        "allow_symbol_change": false,
        "container_id": containerId,
        "backgroundColor": "rgba(0, 0, 0, 1)",
        "gridColor": "rgba(255, 255, 255, 0.02)",
        "withdateranges": false, 
        "save_image": false,
        "details": false,
        "hotlist": false,
        "calendar": false,
        "studies": [
          "RSI@tv-basicstudies",
          "MASimple@tv-basicstudies",
          "StochasticRSI@tv-basicstudies"
        ],
        "loading_screen": {
          "backgroundColor": "#000000",
          "foregroundColor": "#9403fc"
        },
        "overrides": {
          "mainSeriesProperties.candleStyle.upColor": "#a3e635",
          "mainSeriesProperties.candleStyle.downColor": "#fb7185",
          "mainSeriesProperties.candleStyle.wickUpColor": "#a3e635",
          "mainSeriesProperties.candleStyle.wickDownColor": "#fb7185",
          "mainSeriesProperties.candleStyle.borderUpColor": "#a3e635",
          "mainSeriesProperties.candleStyle.borderDownColor": "#fb7185",
          "paneProperties.background": "#000000",
          "paneProperties.vertGridProperties.color": "rgba(255, 255, 255, 0.02)",
          "paneProperties.horzGridProperties.color": "rgba(255, 255, 255, 0.02)",
          "scalesProperties.textColor": "#64748b",
          "scalesProperties.fontSize": 10
        }
      });
    }
  }, [symbol, interval]);

  return (
    <div className="w-full rounded-xl overflow-hidden border border-white/5 glass shadow-2xl relative">
      <div id={containerId} className="w-full h-[500px]" />
    </div>
  );
};

export default TradingViewChart;