import React from 'react';
import { TimeState, ClockStyle } from '../types';

interface DigitalClockProps {
  time: TimeState;
  style: ClockStyle;
  showSeconds: boolean;
  is24Hour: boolean;
}

// Helper for Chinese number conversion
const toChineseNum = (n: number, isHour: boolean = false): string => {
  const chars = ['零', '一', '二', '三', '四', '五', '六', '七', '八', '九'];
  
  if (isHour && n === 2) return '两'; // Special case for 2 o'clock

  if (n <= 9) return chars[n];
  if (n < 20) return '十' + (n % 10 === 0 ? '' : chars[n % 10]);
  return chars[Math.floor(n / 10)] + '十' + (n % 10 === 0 ? '' : chars[n % 10]);
};

// Helper for Earthly Branches (Shichen)
const getShichen = (hours: number): string => {
  const earthlyBranches = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥'];
  // Time ranges: Zi (23-1), Chou (1-3), etc.
  // Formula: (hours + 1) / 2 floor, mod 12
  const index = Math.floor(((hours + 1) % 24) / 2);
  return earthlyBranches[index];
};

export const DigitalClock: React.FC<DigitalClockProps> = ({ time, style, showSeconds, is24Hour }) => {
  const formatHour = (h: number) => {
    if (is24Hour) return h.toString().padStart(2, '0');
    const civilian = h % 12 || 12;
    return civilian.toString().padStart(2, '0'); // Pad for consistent look in most styles
  };

  const formatMinSec = (n: number) => n.toString().padStart(2, '0');

  const displayHours = formatHour(time.hours);
  const displayMinutes = formatMinSec(time.minutes);
  const displaySeconds = formatMinSec(time.seconds);
  const ampm = time.hours >= 12 ? '下午' : '上午';

  // Common shadow class for visibility on white backgrounds
  const textShadowClass = "drop-shadow-[0_2px_8px_rgba(0,0,0,0.8)]";

  // --- Styles Rendering ---

  // 1. IOS_CLEAN (Legacy Clean)
  if (style === ClockStyle.IOS_CLEAN) {
    return (
      <div className={`flex flex-col items-center justify-center text-white transition-all duration-300 w-full max-w-[90vw] mt-8 md:mt-0 ${textShadowClass}`}>
        <div className="text-[10px] md:text-xl font-semibold uppercase text-white/90 mb-1 md:mb-2 tracking-wide select-none drop-shadow-md">
          {time.weekday}
        </div>
        <div className="text-[10vw] md:text-[9rem] leading-none font-semibold tracking-tight select-none flex items-start justify-center">
          <span className="tabular-nums">{is24Hour ? displayHours : parseInt(displayHours)}</span>
          <span className="opacity-80 mx-[1vw] md:mx-2">:</span>
          <span className="tabular-nums">{displayMinutes}</span>
          {!is24Hour && <span className="text-[2.5vw] md:text-2xl mt-[1.5vw] md:mt-6 ml-1 md:ml-2 font-medium opacity-90">{ampm}</span>}
        </div>
        {showSeconds && (
           <div className="text-[3vw] md:text-3xl font-light text-white/90 mt-1 md:mt-2 tabular-nums select-none">
             {displaySeconds}
           </div>
        )}
        <div className="text-xs md:text-xl font-normal mt-2 md:mt-4 opacity-90 select-none">
          {time.date}
        </div>
      </div>
    );
  }

  // 2. NEON (Already has its own shadows, adding backing for light bg)
  if (style === ClockStyle.NEON) {
    return (
      <div className="flex flex-col items-center w-full max-w-[90vw] mt-8 md:mt-0 drop-shadow-[0_4px_4px_rgba(0,0,0,0.8)]">
         <div 
           className="text-[9vw] md:text-[9rem] font-bold leading-none select-none tracking-widest text-center"
           style={{
             color: 'transparent',
             WebkitTextStroke: '1px #fff',
             textShadow: '0 0 5px #0ff, 0 0 10px #0ff, 0 0 20px #00f, 0 0 40px #00f'
           }}
         >
           {displayHours}:{displayMinutes}
         </div>
         {showSeconds && (
           <div 
             className="text-[3vw] md:text-4xl mt-2 md:mt-4 font-medium tracking-widest"
             style={{
               color: '#f0f',
               textShadow: '0 0 5px #f0f, 0 0 10px #f0f'
             }}
           >
             {displaySeconds}
           </div>
         )}
         <div className="mt-2 md:mt-8 text-xs md:text-xl tracking-[0.2em] md:tracking-[0.5em] text-cyan-200 drop-shadow-[0_0_5px_rgba(34,211,238,0.8)]">
           {time.weekday}
         </div>
      </div>
    );
  }

  // 3. ELEGANT (Serif)
  if (style === ClockStyle.ELEGANT) {
    return (
      <div className={`flex flex-col items-center text-amber-100 font-serif italic w-full max-w-[90vw] mt-8 md:mt-0 drop-shadow-[0_2px_4px_rgba(0,0,0,0.9)]`}>
         <div className="text-[10px] md:text-2xl mb-1 md:mb-4 tracking-widest uppercase border-b border-amber-100/50 pb-0.5 md:pb-2">
            {time.weekday}
         </div>
         <div className="flex items-baseline text-[10vw] md:text-[10rem] leading-none justify-center">
            <span>{displayHours}</span>
            <span className="mx-[1vw] md:mx-4 text-xl md:text-4xl opacity-80 not-italic font-sans">|</span>
            <span>{displayMinutes}</span>
         </div>
         {showSeconds && (
            <div className="text-[2.5vw] md:text-4xl mt-0.5 md:mt-2 font-light not-italic font-sans opacity-90">
               {displaySeconds}
            </div>
         )}
         <div className="mt-2 md:mt-8 text-[10px] md:text-base font-sans tracking-widest opacity-90">
            {time.date}
         </div>
      </div>
    );
  }

  // 4. WORD (Chinese - Horizontal Layout)
  if (style === ClockStyle.WORD) {
    const hourNum = is24Hour ? time.hours : (time.hours % 12 || 12);
    const chineseHour = toChineseNum(hourNum, true);
    const chineseMinute = time.minutes === 0 ? '整' : toChineseNum(time.minutes);
    
    return (
      <div className={`flex flex-col items-end justify-center p-4 md:p-16 max-w-7xl w-full h-full mt-4 md:mt-0 landscape:mt-0 ${textShadowClass}`}>
        <div className="text-xs md:text-xl text-red-100 font-bold mb-1 md:mb-6 tracking-widest bg-red-600/80 px-2 py-0.5 md:px-3 md:py-1 rounded-full backdrop-blur-md self-end shadow-lg">
           {time.date} {time.weekday}
        </div>
        
        <div className="text-[4.5vw] landscape:text-[8vh] md:text-[6rem] font-bold leading-tight text-right w-full flex flex-col items-end text-white">
          <div className="flex items-baseline gap-1 md:gap-4 flex-wrap justify-end">
             <span>{chineseHour}</span>
             <span className="text-[2.5vw] landscape:text-[4vh] md:text-5xl opacity-90">点</span>
          </div>
          <div className="flex items-baseline gap-1 md:gap-4 mr-0 md:mr-32 flex-wrap justify-end">
             {time.minutes === 0 ? (
               <span className="opacity-90">整</span>
             ) : (
                <>
                  <span>{chineseMinute}</span>
                  <span className="text-[2.5vw] landscape:text-[4vh] md:text-5xl opacity-90">分</span>
                </>
             )}
          </div>
        </div>
        
        {showSeconds && (
          <div className="mt-1 md:mt-8 text-xs landscape:text-sm md:text-3xl opacity-80 mr-1 font-light text-white">
             {toChineseNum(time.seconds)}秒
          </div>
        )}
      </div>
    );
  }

  // 5. CHINESE_VERTICAL (Vertical traditional writing)
  if (style === ClockStyle.CHINESE_VERTICAL) {
    const hourNum = is24Hour ? time.hours : (time.hours % 12 || 12);
    const chineseHour = toChineseNum(hourNum, true);
    const chineseMinute = time.minutes === 0 ? '整' : toChineseNum(time.minutes);

    return (
      <div className={`flex flex-row-reverse items-center justify-center h-[60vh] md:h-[70vh] gap-6 md:gap-16 font-serif text-white/90 landscape:scale-90 ${textShadowClass}`}>
        
        {/* Hour Column */}
        <div className="flex flex-col items-center gap-2 md:gap-4 border-l-2 border-white/30 pl-4 md:pl-8 py-4">
           {chineseHour.split('').map((char, i) => (
             <span key={i} className="text-[8vw] md:text-8xl landscape:text-[12vh] font-bold leading-none writing-vertical-rl">{char}</span>
           ))}
           <span className="text-[3vw] md:text-4xl landscape:text-[4vh] mt-4 opacity-70 text-red-400 font-bold">时</span>
        </div>

        {/* Minute Column */}
        <div className="flex flex-col items-center gap-2 md:gap-4 border-l-2 border-white/30 pl-4 md:pl-8 py-4 mt-16 md:mt-32">
           {chineseMinute.split('').map((char, i) => (
             <span key={i} className="text-[8vw] md:text-8xl landscape:text-[12vh] font-bold leading-none writing-vertical-rl">{char}</span>
           ))}
           <span className="text-[3vw] md:text-4xl landscape:text-[4vh] mt-4 opacity-70 text-red-400 font-bold">分</span>
        </div>

        {/* Info Column (Date/Day) */}
        <div className="flex flex-col justify-between h-full py-8 text-xs md:text-xl landscape:text-sm opacity-80 tracking-widest writing-vertical-rl items-center border-l border-dashed border-white/20 pl-4">
           <span>{time.weekday}</span>
           <span>{time.date}</span>
        </div>

      </div>
    );
  }

  // 6. CHINESE_INK (Ink Calligraphy Style)
  if (style === ClockStyle.CHINESE_INK) {
     const hourNum = is24Hour ? time.hours : (time.hours % 12 || 12);
     const cHour = toChineseNum(hourNum, true);
     const cMin = toChineseNum(time.minutes);

     return (
       <div className={`flex flex-col items-center justify-center font-serif text-white/95 landscape:flex-row landscape:gap-16 ${textShadowClass}`}>
          <div className="relative">
             <div className="text-[18vw] md:text-[14rem] landscape:text-[25vh] leading-none font-black tracking-widest opacity-90 mix-blend-overlay blur-[1px] absolute top-2 left-2 text-black select-none pointer-events-none">
                {cHour}
             </div>
             <div className="text-[18vw] md:text-[14rem] landscape:text-[25vh] leading-none font-black tracking-widest z-10 relative">
                {cHour}
             </div>
             <div className="absolute -top-4 -right-4 md:-top-8 md:-right-12 bg-red-700 text-white text-[10px] md:text-xl p-1 md:p-3 rounded-sm shadow-lg font-sans writing-vertical-rl">
                {time.weekday}
             </div>
          </div>

          <div className="w-16 h-1 bg-white/50 my-4 landscape:w-1 landscape:h-32 landscape:my-0 rounded-full"></div>

          <div className="flex flex-col items-center landscape:items-start">
             <div className="text-[8vw] md:text-[6rem] landscape:text-[12vh] font-bold opacity-90 leading-tight">
                {time.minutes === 0 ? '整' : cMin}
             </div>
             <div className="text-sm md:text-2xl landscape:text-xl mt-2 opacity-70 tracking-[0.5em] uppercase">
                {time.minutes === 0 ? "O'CLOCK" : "MINUTES"}
             </div>
          </div>
       </div>
     );
  }

  // 7. CHINESE_CLASSIC (New: Ancient Time/Shichen with Horizontal Plaque Layout)
  if (style === ClockStyle.CHINESE_CLASSIC) {
    const shichen = getShichen(time.hours);
    const hourNum = is24Hour ? time.hours : (time.hours % 12 || 12);
    const cHour = toChineseNum(hourNum, true);
    const cMin = time.minutes === 0 ? '整' : toChineseNum(time.minutes);

    return (
       <div className={`flex flex-col items-center justify-center font-serif text-white ${textShadowClass}`}>
         {/* Top Decoration Line */}
         <div className="w-32 md:w-64 h-px bg-gradient-to-r from-transparent via-white/50 to-transparent mb-4 md:mb-8"></div>
         
         <div className="flex items-center gap-4 md:gap-8 landscape:gap-12 p-4 md:p-8 border-y-2 border-white/20 backdrop-blur-sm bg-black/10 rounded-lg">
            {/* Shichen (Main Feature) */}
            <div className="flex flex-col items-center border-r border-white/20 pr-4 md:pr-8">
               <div className="text-[15vw] md:text-[8rem] landscape:text-[15vh] font-black leading-none text-red-100 drop-shadow-xl">
                 {shichen}
               </div>
               <div className="text-xs md:text-xl tracking-[0.5em] mt-2 opacity-80 uppercase font-bold">时</div>
            </div>
            
            {/* Exact Time */}
            <div className="flex flex-col items-start gap-1 md:gap-4">
               <div className="text-[5vw] md:text-[3rem] landscape:text-[6vh] font-bold leading-tight whitespace-nowrap">
                 {cHour}点
               </div>
               <div className="text-[5vw] md:text-[3rem] landscape:text-[6vh] font-bold leading-tight whitespace-nowrap">
                 {cMin}分
               </div>
            </div>
         </div>

         {/* Bottom Decoration / Date */}
         <div className="mt-4 md:mt-8 flex items-center gap-4 text-xs md:text-xl landscape:text-base opacity-80 tracking-widest bg-red-800/80 px-4 py-1 rounded shadow-lg border border-red-900/50">
            <span>{time.date}</span>
            <span>{time.weekday}</span>
         </div>
       </div>
    );
  }

  // DEFAULT: IOS_MODERN (Modified: Removed background, clean look with heavy shadow)
  return (
    <div className={`flex flex-col items-center justify-center text-white transition-all duration-300 w-auto max-w-[90vw] md:min-w-[400px] mt-8 md:mt-0 ${textShadowClass}`}>
      <div className="text-[9px] md:text-xl font-semibold uppercase text-red-100/90 mb-0.5 md:mb-2 tracking-wide select-none drop-shadow-md">
        {time.weekday}
      </div>
      <div className="text-[9vw] md:text-[9rem] leading-none font-semibold tracking-tight select-none flex items-start justify-center">
        <span className="tabular-nums">{is24Hour ? displayHours : parseInt(displayHours)}</span>
        <span className="opacity-80 mx-[1vw] md:mx-2">:</span>
        <span className="tabular-nums">{displayMinutes}</span>
        {!is24Hour && <span className="text-[2vw] md:text-3xl mt-[1.5vw] md:mt-6 ml-1 md:ml-2 font-medium opacity-90">{ampm}</span>}
      </div>
      {showSeconds && (
         <div className="text-[2.5vw] md:text-4xl font-light text-gray-100 mt-0.5 md:mt-2 tabular-nums select-none opacity-90">
           {displaySeconds}
         </div>
      )}
      <div className="text-[10px] md:text-2xl font-normal mt-1 md:mt-4 opacity-90 select-none text-white">
        {time.date}
      </div>
    </div>
  );
};