import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Settings as SettingsIcon, Loader2, Upload, X, RefreshCw, Calendar, Download, Image as ImageIcon, Sun, Palette, Car, Mountain, User, Sparkles, Shuffle, Check, FileVideo, ZoomIn, Moon, ToggleLeft, ToggleRight } from 'lucide-react';
import { AnalogClock } from './components/AnalogClock';
import { DigitalClock } from './components/DigitalClock';
import { CalendarWidget } from './components/CalendarWidget';
import { ClockStyle, AppSettings, TimeState, CalendarStyle } from './types';

// --- IndexedDB Helper Utilities ---
const DB_NAME = 'ZenClockDB';
const DB_VERSION = 1;
const STORE_NAME = 'assets';
const KEY_BG = 'current_bg_file';
const KEY_BG_TYPE = 'current_bg_type'; // 'image' or 'video'

const initDB = (): Promise<IDBDatabase> => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };
  });
};

const saveAssetToDB = async (key: string, data: Blob | string) => {
  try {
    const db = await initDB();
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    store.put(data, key);
    return tx.oncomplete;
  } catch (e) {
    console.error("Failed to save to DB:", e);
  }
};

const getAssetFromDB = async (key: string): Promise<Blob | string | undefined> => {
  try {
    const db = await initDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const request = store.get(key);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  } catch (e) {
    console.error("Failed to read from DB:", e);
    return undefined;
  }
};

// --- End IndexedDB Helpers ---

// Helper to determine if a URL represents a video
const isVideoUrl = (url: string) => {
  if (!url) return false;
  return url.startsWith('data:video') || url.startsWith('blob:') || url.match(/\.(mp4|webm|ogg)$/i);
};

// New Helper: Compress image to ensure it fits in localStorage (still used for Day/Night small configs)
// Resizes to max 1920px width/height and compresses to 0.7 quality JPEG
const compressImage = async (source: File | Blob | string): Promise<string> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    
    // Check if source is NOT a string (meaning it's a File or Blob) to avoid instanceof errors on primitives
    const isBlob = typeof source !== 'string';
    
    // Create object URL if it's a File or Blob
    const url = isBlob 
      ? URL.createObjectURL(source as Blob) 
      : source;

    img.onload = () => {
      const canvas = document.createElement('canvas');
      let width = img.width;
      let height = img.height;
      
      // Limit resolution to avoid localStorage quota exceeded
      const maxDim = 1920;
      if (width > maxDim || height > maxDim) {
        if (width > height) {
          height = Math.round((height * maxDim) / width);
          width = maxDim;
        } else {
          width = Math.round((width * maxDim) / height);
          height = maxDim;
        }
      }
      
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(img, 0, 0, width, height);
        // Compress to JPEG 0.7
        const dataUrl = canvas.toDataURL('image/jpeg', 0.7);
        resolve(dataUrl);
      } else {
        reject(new Error("Canvas context failed"));
      }

      if (isBlob) {
        URL.revokeObjectURL(url);
      }
    };

    img.onerror = (e) => {
      if (isBlob) {
        URL.revokeObjectURL(url);
      }
      reject(e);
    };

    img.crossOrigin = "Anonymous"; // Attempt to handle CORS if a string URL is passed
    img.src = url;
  });
};

export default function App() {
  // --- State ---
  const [time, setTime] = useState<TimeState>({ hours: 0, minutes: 0, seconds: 0, date: '', weekday: '' });
  
  // Animation States for Settings Modal
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isSettingsClosing, setIsSettingsClosing] = useState(false);
  const [modalOrigin, setModalOrigin] = useState({ x: 0, y: 0 });
  const settingsBtnRef = useRef<HTMLButtonElement>(null);
  
  const [isBingLoading, setIsBingLoading] = useState(false);
  
  // Background State Management for Smooth Transition
  // Initial state: try localStorage for light strings, but mainly rely on useEffect to load from IDB
  const [bgImage, setBgImage] = useState<string>(() => {
    // We use a default first, restoration happens in useEffect
    return 'https://picsum.photos/1920/1080?blur=2';
  });
  const [nextBgImage, setNextBgImage] = useState<string | null>(null);
  const [isBgTransitioning, setIsBgTransitioning] = useState(false);

  const [bgType, setBgType] = useState<'image' | 'video'>('image');
  const [nextBgType, setNextBgType] = useState<'image' | 'video'>('image');

  const [showControls, setShowControls] = useState(true);
  
  // Load settings from local storage or use default
  const [settings, setSettings] = useState<AppSettings>(() => {
    try {
      const saved = localStorage.getItem('clockSettings');
      if (saved) {
        const parsed = JSON.parse(saved);
        // Safety check: ensure the saved style is still valid in our enum
        if (!Object.values(ClockStyle).includes(parsed.clockStyle)) {
          parsed.clockStyle = ClockStyle.IOS_MODERN;
        }
        // Migration: Add defaults for new properties if missing
        if (parsed.clockScale === undefined) parsed.clockScale = 1.0;
        if (parsed.calendarScale === undefined) parsed.calendarScale = 0.5; // Default updated to 0.5
        if (parsed.enableDayNightMode === undefined) parsed.enableDayNightMode = false;
        if (parsed.dayBgUrl === undefined) parsed.dayBgUrl = 'https://picsum.photos/1920/1080?blur=2';
        if (parsed.nightBgUrl === undefined) parsed.nightBgUrl = 'https://images.unsplash.com/photo-1472552944129-b035e9ea3744?q=80&w=1920&auto=format&fit=crop';
        return parsed;
      }
    } catch (e) {
      console.error("Failed to parse saved settings:", e);
    }
    // Default settings
    return {
      showSeconds: true,
      is24Hour: false,
      clockStyle: ClockStyle.IOS_MODERN,
      calendarStyle: CalendarStyle.GRID,
      showCalendar: true,
      brightness: 0.2,
      bingApiUrl: 'https://bing.img.run/rand.php',
      clockScale: 1.0,
      calendarScale: 0.5, // Default updated to 0.5 as requested
      enableDayNightMode: false,
      dayBgUrl: 'https://picsum.photos/1920/1080?blur=2',
      nightBgUrl: 'https://images.unsplash.com/photo-1472552944129-b035e9ea3744?q=80&w=1920&auto=format&fit=crop'
    };
  });

  const controlsTimeoutRef = useRef<number | null>(null);
  const isRestoringRef = useRef(true); // Flag to prevent saving initial default to DB

  // --- Effects ---

  // 1. Restore Background from IndexedDB on Mount
  useEffect(() => {
    const restoreBackground = async () => {
      if (settings.enableDayNightMode) {
        isRestoringRef.current = false;
        return; 
      }

      try {
        const savedType = await getAssetFromDB(KEY_BG_TYPE) as 'image' | 'video';
        const savedAsset = await getAssetFromDB(KEY_BG);

        if (savedAsset) {
          let url = '';
          if (savedAsset instanceof Blob) {
            url = URL.createObjectURL(savedAsset);
          } else if (typeof savedAsset === 'string') {
            url = savedAsset;
          }

          if (url) {
            // Use transition for smooth restore without flash
            // Since we are restoring, we can set it immediately if we want, 
            // but triggerBgTransition handles preloading nicely.
            triggerBgTransition(url, savedType || 'image');
          }
        }
      } catch (e) {
        console.error("Error restoring background:", e);
      } finally {
        isRestoringRef.current = false;
      }
    };
    restoreBackground();
  }, [settings.enableDayNightMode]);

  // Safety Effect: Ensure settings close if animation end doesn't fire
  useEffect(() => {
    let timer: number;
    if (isSettingsClosing) {
      // Force close after 400ms (animation is 300ms) to prevent getting stuck
      timer = window.setTimeout(() => {
        setIsSettingsOpen(false);
        setIsSettingsClosing(false);
      }, 400);
    }
    return () => clearTimeout(timer);
  }, [isSettingsClosing]);

  // Save settings on change
  useEffect(() => {
    localStorage.setItem('clockSettings', JSON.stringify(settings));
  }, [settings]);

  // Timer Logic
  useEffect(() => {
    const timer = setInterval(() => {
      const now = new Date();
      setTime({
        hours: now.getHours(),
        minutes: now.getMinutes(),
        seconds: now.getSeconds(),
        date: now.toLocaleDateString('zh-CN', { month: 'long', day: 'numeric' }),
        weekday: now.toLocaleDateString('zh-CN', { weekday: 'long' }),
      });
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Show controls and reset auto-hide timer
  const resetControlsTimeout = useCallback(() => {
    if (isSettingsOpen) return; // Don't hide controls if settings modal is open
    setShowControls(true);
    if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
    controlsTimeoutRef.current = window.setTimeout(() => {
      // Only hide if not hovering over the panel
      if (!document.querySelector('.interactive-panel:hover') && !isSettingsOpen) {
        setShowControls(false);
      }
    }, 3000); // Hide after 3 seconds of inactivity
  }, [isSettingsOpen]);

  // Handle click logic
  const handleGlobalClick = useCallback((e: MouseEvent) => {
    const target = e.target as HTMLElement;
    if (isSettingsOpen) return;
    if (target.closest('.interactive-panel') || target.closest('.settings-modal')) {
      resetControlsTimeout();
      return;
    }
    if (showControls) {
       setShowControls(false);
       if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
    } else {
       resetControlsTimeout();
    }
  }, [showControls, resetControlsTimeout, isSettingsOpen]);

  useEffect(() => {
    window.addEventListener('mousemove', resetControlsTimeout);
    window.addEventListener('click', handleGlobalClick);
    return () => {
      window.removeEventListener('mousemove', resetControlsTimeout);
      window.removeEventListener('click', handleGlobalClick);
      if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
    };
  }, [resetControlsTimeout, handleGlobalClick]);

  // --- Handlers ---

  // Trigger smooth background transition with PRELOADING
  const triggerBgTransition = useCallback(async (newSource: string, type: 'image' | 'video') => {
    // Avoid re-triggering if the source is same
    if (newSource === bgImage) return;

    // 1. Preload Logic: Ensure the asset is ready before we start fading
    if (type === 'image') {
       try {
         await new Promise<void>((resolve, reject) => {
           const img = new Image();
           img.onload = () => resolve();
           img.onerror = () => {
             console.warn("Image preload failed, attempting to show anyway.");
             resolve(); // Proceed anyway to avoid UI hanging
           };
           img.src = newSource;
         });
       } catch (e) {
         console.error("Preload error", e);
       }
    } else if (type === 'video') {
       // Basic check for video readiness
       try {
         await new Promise<void>((resolve) => {
            const vid = document.createElement('video');
            vid.onloadeddata = () => resolve();
            vid.onerror = () => resolve();
            vid.src = newSource;
            vid.load();
         });
       } catch (e) {
          console.error("Video preload error", e);
       }
    }
    
    // 2. State Update for Transition
    setNextBgImage(newSource);
    setNextBgType(type);
    
    // 3. Start Animation (Double RequestAnimationFrame to ensure DOM update)
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        setIsBgTransitioning(true);
      });
    });

    // 4. Complete Swap after animation duration
    // Note: The timeout matches the CSS transition duration (1500ms)
    return new Promise<void>((resolve) => {
      setTimeout(() => {
        // Revoke old blob URL to free memory if applicable
        // Note: For IDB restored blobs, we might not want to revoke if we reuse them,
        // but generally creating new objectURL for each restore is fine.
        if (bgImage.startsWith('blob:') && bgImage !== newSource) {
           // URL.revokeObjectURL(bgImage); 
        }

        setBgImage(newSource);
        setBgType(type);
        setIsBgTransitioning(false); 
        
        // Clear the "Next" layer after a short buffer
        setTimeout(() => setNextBgImage(null), 100); 
        resolve();
      }, 1500);
    });
  }, [bgImage]);

  // --- Modal Open/Close Logic (macOS Style) ---
  const openSettings = () => {
    if (settingsBtnRef.current) {
      const rect = settingsBtnRef.current.getBoundingClientRect();
      // Calculate center of the button
      setModalOrigin({ 
        x: rect.left + rect.width / 2, 
        y: rect.top + rect.height / 2 
      });
    }
    setIsSettingsOpen(true);
    setIsSettingsClosing(false);
  };

  const closeSettings = () => {
    setIsSettingsClosing(true);
    // Note: We don't set setIsSettingsOpen(false) here. 
    // We wait for the animation to finish in onAnimationEnd of the modal container
    // Or the useEffect timeout will catch it.
  };

  const handleModalAnimationEnd = (e: React.AnimationEvent) => {
    // Only handle the closing animation of the container or content
    if (isSettingsClosing) {
      setIsSettingsOpen(false);
      setIsSettingsClosing(false);
    }
  };


  // --- Day/Night Logic ---
  const isDayTime = time.hours >= 6 && time.hours < 18;

  useEffect(() => {
    if (settings.enableDayNightMode) {
      const targetUrl = isDayTime ? settings.dayBgUrl : settings.nightBgUrl;
      // Prevent redundant transitions
      if (targetUrl && bgImage !== targetUrl && nextBgImage !== targetUrl) {
         const type = isVideoUrl(targetUrl) ? 'video' : 'image';
         triggerBgTransition(targetUrl, type);
      }
    }
  }, [settings.enableDayNightMode, settings.dayBgUrl, settings.nightBgUrl, isDayTime, bgImage, nextBgImage, triggerBgTransition]);


  const handleImageFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      try {
        const compressedUrl = await compressImage(file);
        
        if (!settings.enableDayNightMode) {
           // Persist compressed image (as Base64 string) to IDB
           await saveAssetToDB(KEY_BG, compressedUrl);
           await saveAssetToDB(KEY_BG_TYPE, 'image');
           
           await triggerBgTransition(compressedUrl, 'image');
        } else {
           const isDay = new Date().getHours() >= 6 && new Date().getHours() < 18;
           if (isDay) setSettings(s => ({...s, dayBgUrl: compressedUrl}));
           else setSettings(s => ({...s, nightBgUrl: compressedUrl}));
        }
      } catch (err) {
         console.error("Compression failed", err);
         const reader = new FileReader();
         reader.onloadend = () => {
           const result = reader.result as string;
           triggerBgTransition(result, 'image');
         };
         reader.readAsDataURL(file);
      }
    }
  };

  const handleVideoFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const videoUrl = URL.createObjectURL(file);
      
      if (!settings.enableDayNightMode) {
        // Save actual video BLOB to IDB
        await saveAssetToDB(KEY_BG, file);
        await saveAssetToDB(KEY_BG_TYPE, 'video');

        triggerBgTransition(videoUrl, 'video').then(() => closeSettings());
      } else {
         const isDay = new Date().getHours() >= 6 && new Date().getHours() < 18;
         if (isDay) setSettings(s => ({...s, dayBgUrl: videoUrl}));
         else setSettings(s => ({...s, nightBgUrl: videoUrl}));
         closeSettings();
      }
    }
  };
  
  // Specific handlers for Settings Modal (Day/Night)
  const handleDayNightUpload = (event: React.ChangeEvent<HTMLInputElement>, isDaySlot: boolean) => {
    const file = event.target.files?.[0];
    if (file) {
       const isVideo = file.type.startsWith('video');
       if (isVideo) {
          const url = URL.createObjectURL(file);
          setSettings(s => ({...s, [isDaySlot ? 'dayBgUrl' : 'nightBgUrl']: url }));
       } else {
          // Compress for settings too
          compressImage(file).then(url => {
             setSettings(s => ({...s, [isDaySlot ? 'dayBgUrl' : 'nightBgUrl']: url }));
          });
       }
    }
  };

  const handleFetchBg = async () => {
    const url = settings.bingApiUrl;
    if (!url) return;
    
    setIsBingLoading(true);

    const entropy = `${Date.now()}-${Math.floor(Math.random() * 100000)}`;
    const separator = url.includes('?') ? '&' : '?';
    const fetchUrl = `${url}${separator}t=${entropy}`;

    try {
      const response = await fetch(fetchUrl, { cache: 'no-store' });
      if (!response.ok) throw new Error("Network response was not ok");
      const blob = await response.blob();
      
      // Compress the blob before setting it to save storage and ensure readiness
      const compressedDataUrl = await compressImage(blob);
      
      if (!settings.enableDayNightMode) {
        // Save to DB so it persists on reload
        await saveAssetToDB(KEY_BG, compressedDataUrl);
        await saveAssetToDB(KEY_BG_TYPE, 'image');

        // IMPORTANT: Await the transition to ensure image is preloaded before stopping spinner
        await triggerBgTransition(compressedDataUrl, 'image');
      } else {
         const isDay = new Date().getHours() >= 6 && new Date().getHours() < 18;
         setSettings(s => ({...s, [isDay ? 'dayBgUrl' : 'nightBgUrl']: compressedDataUrl}));
      }
      
      setIsBingLoading(false);
      closeSettings();

    } catch (e) {
      console.warn("Fetch or compress failed, fallback to URL load", e);
      // Fallback
      if (!settings.enableDayNightMode) {
        // Even in fallback, we try to trigger standard flow, though persistence might fail if it's just a URL string to an external resource (we save strings too)
        await saveAssetToDB(KEY_BG, fetchUrl);
        await saveAssetToDB(KEY_BG_TYPE, 'image');
        await triggerBgTransition(fetchUrl, 'image');
      } else {
         const isDay = new Date().getHours() >= 6 && new Date().getHours() < 18;
         setSettings(s => ({...s, [isDay ? 'dayBgUrl' : 'nightBgUrl']: fetchUrl}));
      }
       
      setIsBingLoading(false);
      closeSettings();
    }
  };

  const handleDownloadImage = () => {
    if (bgType === 'video') {
       alert("视频背景不支持直接下载");
       return;
    }
    const link = document.createElement('a');
    link.href = bgImage;
    link.download = `zen-wallpaper-${Date.now()}.png`;
    link.target = '_blank';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const toggleClockStyle = () => {
    const styles = [
      ClockStyle.IOS_MODERN,
      ClockStyle.IOS_CLEAN,
      ClockStyle.ANALOG,
      ClockStyle.NEON,
      ClockStyle.ELEGANT,
      ClockStyle.WORD,
      ClockStyle.CHINESE_VERTICAL,
      ClockStyle.CHINESE_INK,
      ClockStyle.CHINESE_CLASSIC
    ];
    const currentIndex = styles.indexOf(settings.clockStyle);
    const nextStyle = styles[(currentIndex + 1) % styles.length];
    setSettings(prev => ({ ...prev, clockStyle: nextStyle }));
  };

  const toggleCalendarStyle = () => {
    const styles = [
      CalendarStyle.GRID,
      CalendarStyle.LIST,
      CalendarStyle.BIG_CARD,
      CalendarStyle.STRIP,
      CalendarStyle.DOTS,
      CalendarStyle.RED_FESTIVE,
      CalendarStyle.INK_SCROLL
    ];
    const currentIndex = styles.indexOf(settings.calendarStyle);
    const nextStyle = styles[(currentIndex + 1) % styles.length];
    setSettings(prev => ({ ...prev, calendarStyle: nextStyle }));
  };

  const setPresetUrl = (url: string) => {
    setSettings(s => ({ ...s, bingApiUrl: url }));
  };

  // --- Render ---

  return (
    <div className="relative h-screen w-screen overflow-hidden text-white bg-black select-none font-sans">
      
      {/* Background Layer 1: Current Stable Source (Bottom) */}
      <div className="absolute inset-0 z-0">
         {bgType === 'video' ? (
           <video 
             key={bgImage} // Re-mount video if src changes to ensure autoplay works reliably
             src={bgImage} 
             autoPlay 
             muted 
             loop 
             playsInline 
             className="w-full h-full object-cover"
           />
         ) : (
           <div 
             className="w-full h-full bg-cover bg-center"
             style={{ backgroundImage: `url(${bgImage})` }}
           />
         )}
      </div>
      
      {/* Background Layer 2: Next Source (Top, fades in) */}
      {nextBgImage && (
        <div 
          className={`absolute inset-0 z-0 transition-opacity duration-[1500ms] ease-in-out ${isBgTransitioning ? 'opacity-100' : 'opacity-0'}`}
        >
          {nextBgType === 'video' ? (
             <video 
               src={nextBgImage} 
               autoPlay 
               muted 
               loop 
               playsInline 
               className="w-full h-full object-cover"
             />
          ) : (
             <div 
               className="w-full h-full bg-cover bg-center"
               style={{ backgroundImage: `url(${nextBgImage})` }}
             />
          )}
        </div>
      )}
      
      {/* Dim Overlay */}
      <div 
        className="absolute inset-0 bg-black transition-opacity duration-300 pointer-events-none z-0"
        style={{ opacity: settings.brightness }}
      />

      {/* Calendar Widget (Top Left) */}
      <div 
        className={`absolute top-4 left-4 md:top-8 md:left-8 z-20 transition-all duration-500 ease-out origin-top-left ${settings.showCalendar ? 'opacity-100' : 'opacity-0 scale-50 pointer-events-none'}`}
        style={{ transform: `scale(${settings.calendarScale})` }}
      >
        <CalendarWidget style={settings.calendarStyle} onToggleStyle={toggleCalendarStyle} />
      </div>

      {/* Main Content */}
      <div className="relative z-10 h-full w-full flex flex-col items-center justify-center p-0 md:p-4 pointer-events-none">
        <div 
           className="transition-all duration-500 w-full h-full flex items-center justify-center landscape:pl-[20%] landscape:justify-center md:landscape:pl-0"
           style={{ transform: `scale(${settings.clockScale})` }}
        >
          <div className="pointer-events-auto">
             {settings.clockStyle === ClockStyle.ANALOG ? (
               <AnalogClock time={time} showSeconds={settings.showSeconds} />
             ) : (
               <DigitalClock 
                 time={time} 
                 style={settings.clockStyle} 
                 showSeconds={settings.showSeconds}
                 is24Hour={settings.is24Hour}
               />
             )}
          </div>
        </div>
      </div>

      {/* Settings Modal (macOS Style Animation) */}
      {isSettingsOpen && (
        <div 
          className={`settings-modal absolute inset-0 z-[60] flex items-center justify-center p-4 
            ${isSettingsClosing ? 'animate-fade-out-bg' : 'animate-fade-in-bg'} 
            bg-black/40 backdrop-blur-xl`} 
          onClick={(e) => {
            if (e.target === e.currentTarget) closeSettings();
          }}
          onAnimationEnd={handleModalAnimationEnd}
        >
          <div 
            className={`bg-black/60 border border-white/10 rounded-3xl w-full max-w-md landscape:max-w-5xl landscape:w-[95%] landscape:h-[90vh] shadow-2xl max-h-[85vh] flex flex-col backdrop-blur-md origin-center
              ${isSettingsClosing ? 'animate-mac-close' : 'animate-mac-open'}`}
            style={{ 
              transformOrigin: `${modalOrigin.x}px ${modalOrigin.y}px`
            }}
          >
            
            {/* Header - Fixed layout part (flex item, no sticky) to guarantee clickability */}
            <div className="flex-none flex justify-between items-center p-4 bg-black/60 backdrop-blur-md border-b border-white/10 rounded-t-3xl z-50">
              <h2 className="text-xl font-semibold">设置</h2>
              <button 
                onClick={(e) => { e.stopPropagation(); closeSettings(); }} 
                onTouchEnd={(e) => { e.stopPropagation(); closeSettings(); }}
                className="p-3 bg-white/10 rounded-full hover:bg-white/20 active:bg-white/30 transition-colors cursor-pointer"
              >
                <X size={20}/>
              </button>
            </div>

            {/* Content Container - Scrollable area */}
            <div className="p-5 flex-1 overflow-y-auto landscape:grid landscape:grid-cols-2 landscape:gap-6 landscape:items-start">
              
               {/* Left Column: Visual Settings */}
               <div className="space-y-4 mb-4 landscape:mb-0">
                  
                  {/* Day/Night Mode Switch - Moved to top for visibility */}
                  <div className="bg-white/5 p-4 rounded-xl">
                      <div className="flex justify-between items-center mb-4">
                         <h3 className="text-sm font-bold flex items-center gap-2"><Sun size={16}/> 日夜自动切换</h3>
                         <button 
                           onClick={() => setSettings(s => ({...s, enableDayNightMode: !s.enableDayNightMode}))}
                           className={`p-1.5 rounded-full transition-colors ${settings.enableDayNightMode ? 'bg-blue-500 text-white' : 'bg-white/10 text-white/50'}`}
                         >
                           {settings.enableDayNightMode ? <ToggleRight size={24}/> : <ToggleLeft size={24}/>}
                         </button>
                      </div>

                      {settings.enableDayNightMode && (
                        <div className="space-y-3 animate-fade-in">
                          {/* Day Setting */}
                          <div className="p-3 bg-black/20 rounded-lg border border-white/5">
                             <div className="flex justify-between items-center mb-2">
                                <span className="text-xs text-yellow-200 flex items-center gap-1"><Sun size={12}/> 白天 (6:00-18:00)</span>
                             </div>
                             <label className="flex items-center justify-center gap-2 w-full py-1.5 bg-white/10 hover:bg-white/20 text-xs rounded cursor-pointer transition-colors">
                                <Upload size={12}/> 上传图片/视频
                                <input type="file" accept="image/*,video/*" onChange={(e) => handleDayNightUpload(e, true)} className="hidden" />
                             </label>
                             {isVideoUrl(settings.dayBgUrl) ? (
                                <video src={settings.dayBgUrl} className="w-full h-16 object-cover rounded mt-2 opacity-60" muted />
                             ) : (
                                <div className="w-full h-16 bg-cover bg-center rounded mt-2 opacity-60" style={{backgroundImage: `url(${settings.dayBgUrl})`}}></div>
                             )}
                          </div>

                          {/* Night Setting */}
                          <div className="p-3 bg-black/20 rounded-lg border border-white/5">
                             <div className="flex justify-between items-center mb-2">
                                <span className="text-xs text-blue-200 flex items-center gap-1"><Moon size={12}/> 晚上 (18:00-6:00)</span>
                             </div>
                             <label className="flex items-center justify-center gap-2 w-full py-1.5 bg-white/10 hover:bg-white/20 text-xs rounded cursor-pointer transition-colors">
                                <Upload size={12}/> 上传图片/视频
                                <input type="file" accept="image/*,video/*" onChange={(e) => handleDayNightUpload(e, false)} className="hidden" />
                             </label>
                             {isVideoUrl(settings.nightBgUrl) ? (
                                <video src={settings.nightBgUrl} className="w-full h-16 object-cover rounded mt-2 opacity-60" muted />
                             ) : (
                                <div className="w-full h-16 bg-cover bg-center rounded mt-2 opacity-60" style={{backgroundImage: `url(${settings.nightBgUrl})`}}></div>
                             )}
                          </div>
                        </div>
                      )}
                  </div>

                  {/* Scaling Controls */}
                  <div className="bg-white/5 p-4 rounded-xl space-y-4">
                     <h3 className="text-sm font-bold flex items-center gap-2 text-white/80"><ZoomIn size={16}/> 缩放控制</h3>
                     {/* Clock Scale */}
                     <div className="space-y-1">
                        <div className="flex justify-between text-xs text-white/60">
                           <span>时钟大小</span>
                           <span>{Math.round(settings.clockScale * 100)}%</span>
                        </div>
                        <input 
                           type="range" 
                           min="0.5" 
                           max="1.5" 
                           step="0.05"
                           value={settings.clockScale}
                           onChange={(e) => setSettings(s => ({...s, clockScale: parseFloat(e.target.value)}))}
                           className="w-full h-1 bg-white/20 rounded-lg appearance-none cursor-pointer accent-white"
                        />
                     </div>
                     
                     {/* Calendar Scale (NEW) */}
                     <div className="space-y-1 pt-2 border-t border-white/5">
                        <div className="flex justify-between text-xs text-white/60">
                           <span>日历大小</span>
                           <span>{Math.round(settings.calendarScale * 100)}%</span>
                        </div>
                        <input 
                           type="range" 
                           min="0.5" 
                           max="1.5" 
                           step="0.05"
                           value={settings.calendarScale}
                           onChange={(e) => setSettings(s => ({...s, calendarScale: parseFloat(e.target.value)}))}
                           className="w-full h-1 bg-white/20 rounded-lg appearance-none cursor-pointer accent-white"
                        />
                     </div>
                  </div>

                  {/* Developer Credit */}
                  <div className="text-[10px] text-white/30 text-center mt-4 font-mono">
                    开发者 @单纯 微信号2648215977
                  </div>
               </div>

               {/* Right Column: Wallpaper Source */}
               <div className="space-y-3">
                <h3 className="text-xs uppercase tracking-wider text-white/50 font-bold">通用壁纸 & 媒体</h3>
                <div className="bg-white/5 p-4 rounded-xl space-y-3">
                   
                   {/* Local Video Beta */}
                   <div className="mb-4 pb-4 border-b border-white/10">
                      <label className="flex items-center gap-2 w-full py-2 bg-purple-600/20 hover:bg-purple-600/30 text-purple-200 border border-purple-500/20 rounded-lg text-sm font-medium transition-colors justify-center cursor-pointer">
                         <FileVideo size={16}/>
                         <span>上传通用视频背景</span>
                         <input type="file" accept="video/*" onChange={handleVideoFileChange} className="hidden" />
                      </label>
                      <p className="text-[10px] text-white/40 mt-1 text-center">开启日夜切换后，此处上传将仅改变当前时间段壁纸</p>
                   </div>

                   {/* Quick Presets */}
                   <div className="grid grid-cols-3 gap-2 mb-2">
                      <button onClick={() => setPresetUrl('https://bing.img.run/rand.php')} className="preset-btn"><ImageIcon size={14}/> Bing</button>
                      <button onClick={() => setPresetUrl('https://cdn.seovx.com/ha/?mom=302')} className="preset-btn"><Sparkles size={14}/> 古风</button>
                      <button onClick={() => setPresetUrl('https://api.fuchenboke.cn/api/fengjing.php')} className="preset-btn"><Mountain size={14}/> 风景</button>
                      <button onClick={() => setPresetUrl('https://cdn.seovx.com/d/?mom=302')} className="preset-btn"><Palette size={14}/> 二次元</button>
                      <button onClick={() => setPresetUrl('https://cdn.seovx.com/?mom=302')} className="preset-btn"><ImageIcon size={14} className="inline"/> 随机4K</button>
                      <button onClick={() => setPresetUrl('https://api.liuzhuai.com/img/m.php')} className="preset-btn"><User size={14}/> 美女</button>
                   </div>
                   
                   <div>
                      <label className="text-xs text-white/60 mb-1 flex items-center gap-1">API 地址</label>
                      <input 
                        type="text" 
                        value={settings.bingApiUrl}
                        onChange={(e) => setSettings(s => ({...s, bingApiUrl: e.target.value}))}
                        placeholder="输入图片 API URL"
                        className="w-full bg-black/30 border border-white/10 rounded-lg px-3 py-2 text-xs focus:border-white/50 outline-none font-mono"
                      />
                   </div>
                   <button 
                     onClick={handleFetchBg}
                     disabled={isBingLoading}
                     className="w-full py-2 bg-blue-600/20 hover:bg-blue-600/30 text-blue-200 border border-blue-500/20 rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2"
                   >
                     {isBingLoading ? <Loader2 size={14} className="animate-spin" /> : <Shuffle size={14} />}
                     应用网络壁纸
                   </button>
                </div>
              </div>

            </div>
          </div>
        </div>
      )}

      {/* Dock Panel */}
      <div 
        className={`interactive-panel absolute bottom-2 md:bottom-6 left-0 right-0 flex justify-center transition-transform duration-500 ease-out z-50 ${showControls ? 'translate-y-0' : 'translate-y-[150%]'}`}
      >
        <div className="flex flex-wrap md:flex-nowrap items-center justify-center gap-2 md:gap-4 bg-black/40 md:bg-white/10 backdrop-blur-xl border border-white/10 md:border-white/20 p-2 md:p-3 rounded-2xl md:rounded-full shadow-2xl mx-auto max-w-[95%]">
          
          {/* Group 1: Style & Calendar */}
          <div className="flex items-center gap-1 md:gap-2">
             <button onClick={toggleClockStyle} className="dock-btn" title="切换时钟"><RefreshCw size={18} /></button>
             <button onClick={() => setSettings(s => ({...s, showCalendar: !s.showCalendar}))} className={`dock-btn ${settings.showCalendar ? 'text-white' : 'text-white/40'}`} title="日历"><Calendar size={18} /></button>
          </div>
          
          <div className="w-px h-6 bg-white/10 hidden md:block"></div>

          {/* Group 2: Format */}
          <div className="flex items-center gap-1 md:gap-2">
             <button onClick={() => setSettings(s => ({ ...s, is24Hour: !s.is24Hour }))} className="dock-text-btn">{settings.is24Hour ? '24h' : '12h'}</button>
             <button onClick={() => setSettings(s => ({ ...s, showSeconds: !s.showSeconds }))} className={`dock-text-btn ${settings.showSeconds ? 'bg-white/20 text-white' : 'text-white/50'}`}>秒</button>
          </div>

          <div className="w-px h-6 bg-white/10 hidden md:block"></div>

          {/* Group 3: Brightness */}
          <div className="flex items-center gap-2 px-2 py-1 bg-white/5 rounded-full border border-white/5">
            <Sun size={14} className="text-white/60" />
            <input 
              type="range" 
              min="0" 
              max="0.8" 
              step="0.05"
              value={settings.brightness}
              onChange={(e) => setSettings(s => ({...s, brightness: parseFloat(e.target.value)}))}
              className="w-16 md:w-20 h-1 bg-white/30 rounded-lg appearance-none cursor-pointer accent-white"
            />
          </div>

          <div className="w-px h-6 bg-white/10 hidden md:block"></div>

          {/* Group 4: Actions */}
          <div className="flex items-center gap-1 md:gap-2">
              <label className="dock-btn cursor-pointer" title="上传本地图片">
                <Upload size={18} />
                <input type="file" accept="image/*" onChange={handleImageFileChange} className="hidden" />
              </label>
              
              {/* Save/Download Image Button */}
              <button 
                onClick={handleDownloadImage} 
                className="dock-btn" 
                title="保存当前壁纸到手机"
              >
                <Download size={18} />
              </button>

              <button onClick={handleFetchBg} disabled={isBingLoading} className="dock-btn" title="随机切换壁纸">
                {isBingLoading ? <Loader2 size={18} className="animate-spin" /> : <Shuffle size={18} />}
              </button>
              <button ref={settingsBtnRef} onClick={openSettings} className="dock-btn bg-white/10 hover:bg-white/30 text-white" title="设置"><SettingsIcon size={18} /></button>
          </div>
        </div>
        
        <style>{`
          .dock-btn {
            padding: 10px;
            border-radius: 99px;
            transition: all 0.2s;
            color: rgba(255,255,255,0.9);
            display: flex;
            align-items: center;
            justify-content: center;
            background-color: rgba(255,255,255,0.05);
          }
          .dock-btn:hover { background-color: rgba(255,255,255,0.2); }
          .dock-btn:active { transform: scale(0.95); }
          
          .dock-text-btn {
            padding: 6px 10px;
            border-radius: 99px;
            font-size: 11px;
            font-weight: 600;
            border: 1px solid rgba(255,255,255,0.1);
            transition: all 0.2s;
            min-width: 36px;
            text-align: center;
          }
          .dock-text-btn:hover { background-color: rgba(255,255,255,0.2); }

          .preset-btn {
             display: flex;
             align-items: center;
             justify-content: center;
             gap: 4px;
             font-size: 10px;
             padding: 6px;
             background-color: rgba(255,255,255,0.05);
             border: 1px solid rgba(255,255,255,0.05);
             border-radius: 8px;
             transition: all 0.2s;
          }
          .preset-btn:hover {
             background-color: rgba(255,255,255,0.15);
             border-color: rgba(255,255,255,0.2);
          }
        `}</style>
      </div>
    </div>
  );
}