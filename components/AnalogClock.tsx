import React from 'react';
import { TimeState } from '../types';

interface AnalogClockProps {
  time: TimeState;
  showSeconds: boolean;
}

export const AnalogClock: React.FC<AnalogClockProps> = ({ time, showSeconds }) => {
  // Calculate degrees
  const secondDeg = (time.seconds / 60) * 360;
  const minuteDeg = ((time.minutes + time.seconds / 60) / 60) * 360;
  const hourDeg = ((time.hours % 12 + time.minutes / 60) / 12) * 360;

  // Reduced width/height from 55vw to 40vw for mobile
  return (
    <div className="relative w-[40vw] h-[40vw] max-w-[60vh] max-h-[60vh] md:w-80 md:h-80 md:max-w-none md:max-h-none mt-8 md:mt-0">
      {/* Clock Face with stronger drop shadow for light backgrounds */}
      <svg viewBox="0 0 100 100" className="w-full h-full drop-shadow-[0_10px_20px_rgba(0,0,0,0.8)]">
        {/* Outer Ring Glass Effect */}
        <circle cx="50" cy="50" r="48" fill="rgba(255, 255, 255, 0.1)" stroke="rgba(255, 255, 255, 0.6)" strokeWidth="1.5" />
        
        {/* Hour Markers */}
        {[...Array(12)].map((_, i) => (
          <line
            key={i}
            x1="50"
            y1="10"
            x2="50"
            y2={i % 3 === 0 ? "20" : "15"}
            stroke="white"
            strokeWidth={i % 3 === 0 ? "2" : "1"}
            strokeOpacity={0.9}
            transform={`rotate(${i * 30} 50 50)`}
          />
        ))}

        {/* Hour Hand */}
        <line
          x1="50"
          y1="50"
          x2="50"
          y2="25"
          stroke="white"
          strokeWidth="3"
          strokeLinecap="round"
          transform={`rotate(${hourDeg} 50 50)`}
          className="transition-transform duration-75 ease-out shadow-lg"
        />

        {/* Minute Hand */}
        <line
          x1="50"
          y1="50"
          x2="50"
          y2="15"
          stroke="white"
          strokeWidth="2"
          strokeLinecap="round"
          transform={`rotate(${minuteDeg} 50 50)`}
          className="transition-transform duration-75 ease-out shadow-lg"
        />

        {/* Second Hand */}
        {showSeconds && (
          <g transform={`rotate(${secondDeg} 50 50)`} className="transition-transform duration-75 ease-linear">
             <line
              x1="50"
              y1="60"
              x2="50"
              y2="10"
              stroke="#fbbf24" // Amber-400
              strokeWidth="1"
            />
            <circle cx="50" cy="50" r="1.5" fill="#fbbf24" />
          </g>
        )}
        
        {/* Center Dot */}
        <circle cx="50" cy="50" r="2" fill="white" />
      </svg>
    </div>
  );
};