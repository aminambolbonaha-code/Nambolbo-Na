import React, { useState, useEffect } from 'react';

const MarketClock: React.FC = () => {
  const [times, setTimes] = useState({
    local: '',
    ny: '',
    isOpen: false,
  });

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      
      const localStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
      const nyStr = now.toLocaleTimeString('en-US', {
        timeZone: 'America/New_York',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
      });

      const nyDate = new Date(now.toLocaleString('en-US', { timeZone: 'America/New_York' }));
      const day = nyDate.getDay();
      const hour = nyDate.getHours();
      const minute = nyDate.getMinutes();
      const totalMinutes = hour * 60 + minute;
      
      const isWeekday = day >= 1 && day <= 5;
      const isOpen = isWeekday && totalMinutes >= (9 * 60 + 30) && totalMinutes < (16 * 60);

      setTimes({ local: localStr, ny: nyStr, isOpen });
    };

    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="flex items-center space-x-4 bg-white/5 border border-white/10 px-4 py-2 rounded-xl backdrop-blur-md">
      <div className="flex flex-col">
        <span className="text-[8px] font-black text-slate-500 uppercase tracking-widest">Local Terminal</span>
        <span className="text-xs font-mono font-bold text-white">{times.local}</span>
      </div>
      <div className="w-px h-6 bg-white/10"></div>
      <div className="flex flex-col">
        <span className="text-[8px] font-black text-slate-500 uppercase tracking-widest">NY Market</span>
        <div className="flex items-center space-x-1.5">
          <span className="text-xs font-mono font-bold text-white">{times.ny}</span>
          <div className={`w-1.5 h-1.5 rounded-full ${times.isOpen ? 'bg-[#a3e635] shadow-[0_0_8px_#a3e635]' : 'bg-rose-500 shadow-[0_0_8px_#f43f5e]'}`}></div>
        </div>
      </div>
    </div>
  );
};

export default MarketClock;