export enum ClockStyle {
  IOS_MODERN = 'IOS_MODERN',
  IOS_CLEAN = 'IOS_CLEAN',
  ANALOG = 'ANALOG',
  NEON = 'NEON',
  ELEGANT = 'ELEGANT',
  WORD = 'WORD',
  CHINESE_VERTICAL = 'CHINESE_VERTICAL',
  CHINESE_INK = 'CHINESE_INK',
  CHINESE_CLASSIC = 'CHINESE_CLASSIC' // New Ancient Style
}

export enum CalendarStyle {
  GRID = 'GRID',         // Classic Grid
  LIST = 'LIST',         // Vertical List
  BIG_CARD = 'BIG_CARD', // Big Day Number
  STRIP = 'STRIP',       // Horizontal Strip
  DOTS = 'DOTS',         // Abstract Dots
  RED_FESTIVE = 'RED_FESTIVE', // New Chinese Red
  INK_SCROLL = 'INK_SCROLL'    // New Ink Style
}

export interface AppSettings {
  showSeconds: boolean;
  is24Hour: boolean;
  clockStyle: ClockStyle;
  calendarStyle: CalendarStyle;
  showCalendar: boolean;
  brightness: number; // 0 to 1 opacity overlay
  bingApiUrl: string; // Custom Bing Wallpaper API URL
  clockScale: number; // New: Scale factor for clock (0.5 - 1.5)
  calendarScale: number; // New: Scale factor for calendar (0.5 - 1.5)
  
  // Day/Night Mode
  enableDayNightMode: boolean;
  dayBgUrl: string;
  nightBgUrl: string;
}

export interface TimeState {
  hours: number;
  minutes: number;
  seconds: number;
  date: string;
  weekday: string;
}