import React from 'react';
import { CalendarStyle } from '../types';

interface CalendarWidgetProps {
  style: CalendarStyle;
  onToggleStyle: () => void;
}

export const CalendarWidget: React.FC<CalendarWidgetProps> = ({ style, onToggleStyle }) => {
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth();
  const currentDate = now.getDate();
  const currentDay = now.getDay();

  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
  const firstDayOfMonth = new Date(currentYear, currentMonth, 1).getDay(); // 0 is Sunday
  
  const weekDays = ['日', '一', '二', '三', '四', '五', '六'];
  const monthNames = ['一月', '二月', '三月', '四月', '五月', '六月', '七月', '八月', '九月', '十月', '十一月', '十二月'];

  // Enhanced styling for better visibility on all backgrounds (High Contrast Glassmorphism)
  // Changed from bg-white/10 to bg-black/40 for better contrast against light wallpapers
  // Added stronger border and shadow
  const containerClass = "p-3 md:p-4 rounded-3xl backdrop-blur-xl bg-black/40 border border-white/20 text-white shadow-2xl cursor-pointer hover:bg-black/50 transition-all select-none ring-1 ring-white/10";

  // --- Render Styles ---

  // 1. GRID (Classic Glass Grid)
  if (style === CalendarStyle.GRID) {
    return (
      <div onClick={onToggleStyle} className={`${containerClass} w-60 md:w-64`}>
        <div className="flex justify-between items-center mb-4 px-1 border-b border-white/10 pb-2">
          <span className="font-bold text-base md:text-lg drop-shadow-md">{monthNames[currentMonth]} {currentYear}</span>
        </div>
        <div className="grid grid-cols-7 gap-1 text-center text-[10px] md:text-xs opacity-70 mb-2 font-medium">
          {weekDays.map(d => <div key={d}>{d}</div>)}
        </div>
        <div className="grid grid-cols-7 gap-1 text-center text-xs md:text-sm">
          {Array.from({ length: firstDayOfMonth }).map((_, i) => <div key={`empty-${i}`} />)}
          {Array.from({ length: daysInMonth }).map((_, i) => {
            const day = i + 1;
            const isToday = day === currentDate;
            return (
              <div 
                key={day} 
                className={`aspect-square flex items-center justify-center rounded-full transition-all duration-300
                  ${isToday ? 'bg-white text-black font-bold shadow-lg scale-110' : 'hover:bg-white/20'}`}
              >
                {day}
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  // 2. LIST (Vertical List of next few days)
  if (style === CalendarStyle.LIST) {
    // Generate next 5 days
    const upcomingDays = Array.from({ length: 5 }).map((_, i) => {
      const d = new Date();
      d.setDate(currentDate + i);
      return d;
    });

    return (
      <div onClick={onToggleStyle} className={`${containerClass} min-w-[120px] md:min-w-[140px]`}>
        <div className="text-[10px] md:text-xs uppercase opacity-70 mb-2 tracking-widest font-bold border-b border-white/10 pb-1">{monthNames[currentMonth]}</div>
        <div className="flex flex-col gap-2">
          {upcomingDays.map((d, i) => {
            const isToday = i === 0;
            return (
              <div key={i} className={`flex justify-between items-center ${isToday ? 'opacity-100 font-bold text-white' : 'opacity-70 text-gray-200'}`}>
                 <span className="text-xs md:text-sm">{weekDays[d.getDay()]}</span>
                 <div className={`w-7 h-7 md:w-8 md:h-8 flex items-center justify-center rounded-full ${isToday ? 'bg-white text-black shadow-md' : ''}`}>
                    {d.getDate()}
                 </div>
              </div>
            )
          })}
        </div>
      </div>
    );
  }

  // 3. BIG_CARD (iOS Widget Style)
  if (style === CalendarStyle.BIG_CARD) {
    return (
      <div onClick={onToggleStyle} className={`${containerClass} w-36 h-36 md:w-40 md:h-40 flex flex-col justify-between group`}>
        <div className="flex justify-between items-start">
           <span className="text-red-400 font-bold text-sm uppercase drop-shadow-sm">{weekDays[currentDay]}</span>
           <span className="text-xs opacity-70 font-medium">{monthNames[currentMonth]}</span>
        </div>
        <div className="text-6xl md:text-7xl font-light tracking-tighter text-center leading-none drop-shadow-xl group-hover:scale-110 transition-transform">
          {currentDate}
        </div>
        <div className="text-xs text-center opacity-50">
           {currentYear}
        </div>
      </div>
    );
  }

  // 4. STRIP (Horizontal Timeline)
  if (style === CalendarStyle.STRIP) {
    // Show -2 to +4 days
    const range = Array.from({ length: 7 }).map((_, i) => {
      const d = new Date();
      d.setDate(currentDate + (i - 2));
      return d;
    });

    return (
      <div onClick={onToggleStyle} className={`${containerClass} flex gap-1 md:gap-2 overflow-hidden`}>
        {range.map((d, i) => {
           const isToday = d.getDate() === currentDate;
           return (
             <div key={i} className={`flex flex-col items-center gap-1 px-2 py-1 rounded-xl transition-all ${isToday ? 'bg-white/20 shadow-inner' : 'hover:bg-white/5'}`}>
                <span className="text-[10px] opacity-70 font-medium">{weekDays[d.getDay()]}</span>
                <span className={`text-base md:text-lg font-bold ${isToday ? 'text-white' : 'opacity-80'}`}>{d.getDate()}</span>
             </div>
           )
        })}
      </div>
    );
  }

  // 5. DOTS (Abstract)
  if (style === CalendarStyle.DOTS) {
    return (
      <div onClick={onToggleStyle} className={`${containerClass} p-4 md:p-6`}>
         <div className="text-center mb-4 font-mono text-[10px] md:text-xs opacity-60 tracking-[0.5em] uppercase font-bold">
            {monthNames[currentMonth]}
         </div>
         <div className="grid grid-cols-7 gap-2 md:gap-3">
            {Array.from({ length: daysInMonth }).map((_, i) => {
               const day = i + 1;
               const isToday = day === currentDate;
               const isPast = day < currentDate;
               return (
                  <div 
                    key={day} 
                    className={`w-1.5 h-1.5 md:w-2 md:h-2 rounded-full transition-all 
                      ${isToday ? 'bg-red-500 scale-150 shadow-[0_0_10px_rgba(239,68,68,1)] ring-2 ring-red-500/50' : 
                        isPast ? 'bg-white/20' : 'bg-white/80'}`} 
                    title={`${day}日`}
                  />
               )
            })}
         </div>
      </div>
    );
  }

  // 6. RED_FESTIVE (New: Chinese Red Style)
  if (style === CalendarStyle.RED_FESTIVE) {
    // Distinctive deep red background with gold accents
    return (
      <div onClick={onToggleStyle} className="p-3 md:p-4 rounded-3xl bg-red-900/90 border-2 border-yellow-600/50 text-yellow-100 shadow-2xl cursor-pointer hover:bg-red-800/90 transition-all select-none w-60 md:w-64 font-serif relative overflow-hidden">
        {/* Decorative corner accents */}
        <div className="absolute top-0 left-0 w-8 h-8 border-t-2 border-l-2 border-yellow-500 rounded-tl-xl opacity-50"></div>
        <div className="absolute top-0 right-0 w-8 h-8 border-t-2 border-r-2 border-yellow-500 rounded-tr-xl opacity-50"></div>
        <div className="absolute bottom-0 left-0 w-8 h-8 border-b-2 border-l-2 border-yellow-500 rounded-bl-xl opacity-50"></div>
        <div className="absolute bottom-0 right-0 w-8 h-8 border-b-2 border-r-2 border-yellow-500 rounded-br-xl opacity-50"></div>

        <div className="flex justify-between items-center mb-4 px-2 border-b border-yellow-500/30 pb-2">
          <span className="font-bold text-base md:text-lg tracking-widest">{monthNames[currentMonth]} {currentYear}</span>
          <span className="text-xs bg-yellow-600/30 px-2 py-0.5 rounded text-yellow-200">农历</span>
        </div>
        <div className="grid grid-cols-7 gap-1 text-center text-[10px] md:text-xs opacity-70 mb-2 font-medium text-yellow-200">
          {weekDays.map(d => <div key={d}>{d}</div>)}
        </div>
        <div className="grid grid-cols-7 gap-1 text-center text-xs md:text-sm">
          {Array.from({ length: firstDayOfMonth }).map((_, i) => <div key={`empty-${i}`} />)}
          {Array.from({ length: daysInMonth }).map((_, i) => {
            const day = i + 1;
            const isToday = day === currentDate;
            return (
              <div 
                key={day} 
                className={`aspect-square flex items-center justify-center rounded-full transition-all duration-300
                  ${isToday ? 'bg-yellow-500 text-red-900 font-bold shadow-[0_0_10px_rgba(234,179,8,0.5)] scale-110' : 'hover:bg-yellow-500/20'}`}
              >
                {day}
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  // 7. INK_SCROLL (New: Ancient Ink Style)
  if (style === CalendarStyle.INK_SCROLL) {
    // Parchment/Paper like background, Black Ink Text
    return (
      <div onClick={onToggleStyle} className="p-3 md:p-4 rounded-xl bg-[#f5f5f4]/90 border border-stone-400/50 text-stone-900 shadow-xl cursor-pointer hover:bg-[#e7e5e4]/95 transition-all select-none w-60 md:w-64 font-serif">
        <div className="flex justify-center items-center mb-4 px-1 pb-2 border-b-2 border-stone-800">
          <span className="font-bold text-lg md:text-xl tracking-[0.2em]">{currentYear} · {monthNames[currentMonth]}</span>
        </div>
        <div className="grid grid-cols-7 gap-1 text-center text-[10px] md:text-xs opacity-80 mb-2 font-bold text-stone-700">
          {weekDays.map(d => <div key={d}>{d}</div>)}
        </div>
        <div className="grid grid-cols-7 gap-1 text-center text-xs md:text-sm font-medium">
          {Array.from({ length: firstDayOfMonth }).map((_, i) => <div key={`empty-${i}`} />)}
          {Array.from({ length: daysInMonth }).map((_, i) => {
            const day = i + 1;
            const isToday = day === currentDate;
            return (
              <div 
                key={day} 
                className={`aspect-square flex items-center justify-center rounded-sm transition-all duration-300
                  ${isToday ? 'bg-stone-900 text-stone-50 font-bold shadow-md scale-105' : 'hover:bg-stone-300'}`}
              >
                {day}
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  return null;
};