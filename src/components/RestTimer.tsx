import React, { useState, useEffect } from 'react';
import { Play, Pause, RotateCcw } from 'lucide-react';

interface RestTimerProps {
  onReset?: () => void;
  resetKey?: number;
}

export default function RestTimer({ onReset, resetKey }: RestTimerProps) {
  const [seconds, setSeconds] = useState(0);
  const [isActive, setIsActive] = useState(true);

  useEffect(() => {
    setSeconds(0);
    setIsActive(true);
  }, [resetKey]);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isActive) {
      interval = setInterval(() => {
        setSeconds((s) => s + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isActive]);

  const formatTime = (s: number) => {
    const mins = Math.floor(s / 60);
    const secs = s % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleReset = () => {
    setSeconds(0);
    setIsActive(true);
    onReset?.();
  };

  return (
    <div className="glass-panel px-4 py-2 flex items-center space-x-4 bg-hw-accent/5 border-hw-accent/20">
      <div className="flex items-center space-x-3">
        <span className="text-[10px] font-bold text-hw-muted uppercase tracking-widest leading-none">Rest Time</span>
        <span className="text-2xl font-mono font-bold text-hw-accent tabular-nums leading-none">
          {formatTime(seconds)}
        </span>
      </div>

      <div className="flex items-center space-x-2">
        <button 
          onClick={() => setIsActive(!isActive)}
          className="p-2 rounded-lg bg-white/5 hover:bg-white/10 text-hw-muted hover:text-white transition-colors"
        >
          {isActive ? <Pause size={18} /> : <Play size={18} />}
        </button>
        <button 
          onClick={handleReset}
          className="p-2 rounded-lg bg-white/5 hover:bg-white/10 text-hw-muted hover:text-white transition-colors"
        >
          <RotateCcw size={18} />
        </button>
      </div>
    </div>
  );
}
