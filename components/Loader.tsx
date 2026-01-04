
import React, { useState, useEffect } from 'react';

const Loader: React.FC = () => {
  const [step, setStep] = useState(0);
  const messages = [
    "Synchronizing with Federal Reserve data...",
    "Scanning Real-time Chart patterns...",
    "Calculating liquidity clusters...",
    "Analyzing macroeconomic sentiment...",
    "Finalizing institutional trade setup..."
  ];

  useEffect(() => {
    const interval = setInterval(() => {
      setStep((prev) => (prev + 1) % messages.length);
    }, 2500);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="flex flex-col items-center justify-center p-12 space-y-6">
      <div className="relative w-20 h-20">
        <div className="absolute inset-0 border-4 border-[#9403fc]/20 rounded-full"></div>
        <div className="absolute inset-0 border-4 border-t-[#a3e635] rounded-full animate-spin"></div>
        <div className="absolute inset-0 flex items-center justify-center">
          <i className="fa-solid fa-chart-line text-[#a3e635] text-xl animate-pulse"></i>
        </div>
      </div>
      <div className="text-center space-y-2">
        <h3 className="text-white font-medium text-lg tracking-wide">AI Quantitative Analysis in Progress</h3>
        <p className="text-[#9403fc]/80 text-sm italic transition-all duration-500 ease-in-out">
          {messages[step]}
        </p>
      </div>
    </div>
  );
};

export default Loader;
