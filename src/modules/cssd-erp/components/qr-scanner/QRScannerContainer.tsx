// src/modules/cssd-erp/components/qr-scanner/QRScannerContainer.tsx
"use client";

import React, { useState } from "react";
import { Zap } from "lucide-react";

interface Props {
  onScan: (code: string) => void;
  loading?: boolean;
}

export default function QRScannerContainer({ onScan, loading }: Props) {
  const [inputValue, setInputValue] = useState("");

  const handleTrigger = () => {
    if (inputValue.trim() && !loading) {
      onScan(inputValue.trim().toUpperCase());
      setInputValue("");
    }
  };

  return (
    <div className="flex flex-col items-center justify-center p-8 bg-[#026f17] rounded-[40px] shadow-2xl space-y-8">
      <div className="text-center space-y-1">
        <h2 className="text-[#FFD700] text-xl font-black uppercase tracking-widest">QR Terminal</h2>
        <p className="text-white/40 text-[9px] font-bold uppercase italic tracking-widest">Quân y 103</p>
      </div>

      <div className="w-full max-w-sm space-y-4 flex flex-col items-center">
        <input
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleTrigger()}
          placeholder="MÃ QR..."
          className="w-full h-14 bg-white/10 border border-[#FFD700]/30 rounded-xl px-4 text-lg font-black text-[#FFD700] text-center uppercase outline-none focus:border-[#FFD700]"
          autoComplete="off"
          disabled={loading}
        />

        <button 
          onClick={handleTrigger}
          disabled={loading}
          className="w-24 h-24 bg-[#FFD700] text-[#026f17] rounded-full flex flex-col items-center justify-center hover:scale-105 active:scale-90 transition-all shadow-lg border-4 border-[#026f17]"
        >
          <Zap size={28} fill="currentColor" />
          <span className="text-[8px] font-black uppercase mt-1">QUÉT MÃ</span>
        </button>
      </div>
    </div>
  );
}
