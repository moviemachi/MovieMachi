import React, { useState, useEffect, useRef, MouseEvent, useMemo, TouchEvent } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  Play, Pause, Volume2, VolumeX, Maximize, X, 
  Film, Sparkles, Rewind, FastForward, Settings, Minimize2, ArrowLeft, Volume1
} from "lucide-react";
import { Movie } from "../types";

interface VideoPlayerProps {
  movie: Movie | null;
  onClose: () => void;
  onProgress?: (progress: number) => void;
  isTrailer?: boolean;
}

export default function MovieVideoPlayer({ movie, onClose, isTrailer }: VideoPlayerProps) {
  if (!movie) return null;

  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const progressBarRef = useRef<HTMLDivElement>(null);
  const controlsTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  const volumeTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const lastSavedTimeRef = useRef<number>(0);
  const currentTimeRef = useRef<number>(0);
  const isScrubbingRef = useRef(false);
  const durationRef = useRef(0);

  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isScrubbing, setIsScrubbing] = useState(false);

  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(0.85);
  const [isMuted, setIsMuted] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const [audioTrack, setAudioTrack] = useState("Original (Tamil)");
  const [showVolumeBadge, setShowVolumeBadge] = useState(false);
  
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isLayoutFullscreen, setIsLayoutFullscreen] = useState(false);
  const [controlsVisible, setControlsVisible] = useState(true);
  const [showSettingsMenu, setShowSettingsMenu] = useState(false);
  const [hoverTime, setHoverTime] = useState<number | null>(null);
  const [hoverX, setHoverX] = useState<number>(0);

  useEffect(() => {
    durationRef.current = duration;
  }, [duration]);

  const [ambientLights, setAmbientLights] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem("moviemachi_ambient_glow");
      return saved !== null ? JSON.parse(saved) : true;
    } catch {
      return true;
    }
  });

  const [glowColor, setGlowColor] = useState("rgba(239, 68, 68, 0.35)");

  const getGlowWithAlpha = (alpha: number) => {
    try {
      const rgb = glowColor.match(/\d+/g);
      if (rgb && rgb.length >= 3) {
        return `rgba(${rgb[0]}, ${rgb[1]}, ${rgb[2]}, ${alpha})`;
      }
    } catch (e) {}
    return glowColor;
  };

  const [showStartPopup, setShowStartPopup] = useState(false);
  const [savedResumeTime, setSavedResumeTime] = useState(0);
  const [isMobile, setIsMobile] = useState(false);

  const [brightness, setBrightness] = useState(1.0);
  const [showVolumeHUD, setShowVolumeHUD] = useState(false);
  const [showBrightnessHUD, setShowBrightnessHUD] = useState(false);
  const [seekType, setSeekType] = useState<"back" | "forward" | null>(null);

  const seekTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const doubleTapTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastTouchTapRef = useRef<{ time: number; x: number; y: number }>({ time: 0, x: 0, y: 0 });

  const touchStartRef = useRef<{ x: number; y: number; val: number; type: "volume" | "brightness" | null; moved: boolean }>({
    x: 0,
    y: 0,
    val: 1,
    type: null,
    moved: false
  });
  const gestureVolTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const gestureBriTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth <= 768);
    };
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  const resetControlsTimeout = () => {
    setControlsVisible(true);
    if (controlsTimeoutRef.current) {
      clearTimeout(controlsTimeoutRef.current);
    }
    controlsTimeoutRef.current = setTimeout(() => {
      setControlsVisible(false);
      setShowSettingsMenu(false);
    }, 3000); // 3 seconds of inactivity auto-hide
  };

  useEffect(() => {
    resetControlsTimeout();
    return () => {
      if (controlsTimeoutRef.current) {
        clearTimeout(controlsTimeoutRef.current);
      }
    };
  }, [isPlaying]);

  const handleUserInteraction = () => {
    setControlsVisible(true);
    resetControlsTimeout();
  };

  const handleVolumeChange = (val: number) => {
    const rounded = Math.min(1, Math.max(0, val));
    setVolume(rounded);
    if (videoRef.current) {
      videoRef.current.volume = rounded;
      videoRef.current.muted = rounded === 0;
      setIsMuted(rounded === 0);
    }
    setShowVolumeHUD(true);
    setShowBrightnessHUD(false);
    if (gestureVolTimeoutRef.current) clearTimeout(gestureVolTimeoutRef.current);
    gestureVolTimeoutRef.current = setTimeout(() => setShowVolumeHUD(false), 1500);
  };

  const handleBrightnessChange = (val: number) => {
    const rounded = Math.min(1.5, Math.max(0.1, val));
    setBrightness(rounded);
    setShowBrightnessHUD(true);
    setShowVolumeHUD(false);
    if (gestureBriTimeoutRef.current) clearTimeout(gestureBriTimeoutRef.current);
    gestureBriTimeoutRef.current = setTimeout(() => setShowBrightnessHUD(false), 1500);
  };

  const triggerSeekWithIndicator = (type: "back" | "forward") => {
    if (type === "back") {
      skipBackward();
    } else {
      skipForward();
    }
    setSeekType(type);
    setControlsVisible(false); // Hide normal controls on double-tap or key seek!

    if (seekTimeoutRef.current) {
      clearTimeout(seekTimeoutRef.current);
    }
    seekTimeoutRef.current = setTimeout(() => {
      setSeekType(null);
    }, 800);
  };

  const handleTouchStart = (e: TouchEvent<HTMLDivElement>) => {
    if (!isMobile) return;
    if (isScrubbingRef.current) return;
    
    // Prevent volume/brightness gestures on the progress bar
    const target = e.target as HTMLElement;
    if (target && progressBarRef.current && (progressBarRef.current.contains(target) || progressBarRef.current === target)) {
      return;
    }
    const className = target?.className || "";
    if (
      typeof className === "string" && (
        className.includes("progress") || 
        className.includes("track") ||
        className.includes("thumb") ||
        className.includes("h-1") ||
        className.includes("h-3") ||
        className.includes("bg-white/10") ||
        className.includes("bg-white/15")
      )
    ) {
      return;
    }

    handleUserInteraction();
    const touch = e.touches[0];
    const rect = e.currentTarget.getBoundingClientRect();
    const isLeft = (touch.clientX - rect.left) < rect.width / 2;
    const type = isLeft ? "volume" : "brightness";
    touchStartRef.current = {
      x: touch.clientX,
      y: touch.clientY,
      val: type === "volume" ? volume : brightness,
      type,
      moved: false
    };
  };

  const handleTouchMove = (e: TouchEvent<HTMLDivElement>) => {
    if (!isMobile) return;
    if (isScrubbingRef.current) return;
    if (!touchStartRef.current.type) return;
    handleUserInteraction();
    const touch = e.touches[0];
    const diffY = touchStartRef.current.y - touch.clientY; // swiping up increases value
    const diffX = touch.clientX - touchStartRef.current.x;

    if (Math.abs(diffY) > 8 || Math.abs(diffX) > 8) {
      touchStartRef.current.moved = true;
    }

    if (touchStartRef.current.moved) {
      const rect = e.currentTarget.getBoundingClientRect();
      const travelRatio = diffY / (rect.height * 0.4);

      if (touchStartRef.current.type === "volume") {
        const nextVolume = touchStartRef.current.val + travelRatio;
        handleVolumeChange(nextVolume);
      } else {
        const nextBrightness = touchStartRef.current.val + travelRatio;
        handleBrightnessChange(nextBrightness);
      }
    }
  };

  const handleTouchEnd = (e: TouchEvent<HTMLDivElement>) => {
    if (!isMobile) return;
    if (isScrubbingRef.current) {
      isScrubbingRef.current = false;
      setIsScrubbing(false);
      return;
    }
    if (!touchStartRef.current.moved) {
      const now = Date.now();
      const last = lastTouchTapRef.current;
      const x = touchStartRef.current.x;
      const y = touchStartRef.current.y;

      if (now - last.time < 300 && Math.abs(x - last.x) < 40 && Math.abs(y - last.y) < 40) {
        if (doubleTapTimeoutRef.current) {
          clearTimeout(doubleTapTimeoutRef.current);
          doubleTapTimeoutRef.current = null;
        }

        const rect = e.currentTarget.getBoundingClientRect();
        const clickX = x - rect.left;
        const isLeft = clickX < rect.width / 2;

        triggerSeekWithIndicator(isLeft ? "back" : "forward");
        lastTouchTapRef.current = { time: 0, x: 0, y: 0 };
      } else {
        lastTouchTapRef.current = { time: now, x, y };

        if (doubleTapTimeoutRef.current) {
          clearTimeout(doubleTapTimeoutRef.current);
        }

        doubleTapTimeoutRef.current = setTimeout(() => {
          setControlsVisible(prev => !prev);
          doubleTapTimeoutRef.current = null;
        }, 300);
      }
    }
    touchStartRef.current = { x: 0, y: 0, val: 0, type: null, moved: false };
  };

  const handleVideoClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isMobile) return; // Handled by handleTouchEnd on mobile
    setControlsVisible(prev => !prev);
    if (!controlsVisible) {
      resetControlsTimeout();
    }
  };

  const fallbackVideoUrl = "https://assets.mixkit.co/videos/preview/mixkit-curious-cat-watching-tv-40847-large.mp4";
  const sourceUrl = isTrailer 
    ? (movie.trailerUrl || movie.watchUrl || fallbackVideoUrl) 
    : (movie.watchUrl || fallbackVideoUrl);

  const formatTime = (secs: number) => {
    if (isNaN(secs) || secs === Infinity || secs < 0) return "00:00:00";
    const hrs = Math.floor(secs / 3600);
    const mins = Math.floor((secs % 3600) / 60);
    const remaining = Math.floor(secs % 60);
    const pad = (num: number) => num < 10 ? `0${num}` : num.toString();
    return `${pad(hrs)}:${pad(mins)}:${pad(remaining)}`;
  };

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () => {
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
    };
  }, []);

  useEffect(() => {
    const handleHotKeys = (e: KeyboardEvent) => {
      if (
        document.activeElement?.tagName === "INPUT" ||
        document.activeElement?.tagName === "TEXTAREA"
      ) {
        return;
      }

      // Any keypress on keyboard or TV Remote wakes up the controls!
      handleUserInteraction();

      switch (e.key) {
        case " ":
          e.preventDefault();
          togglePlay();
          break;
        case "ArrowLeft":
          e.preventDefault();
          triggerSeekWithIndicator("back");
          break;
        case "ArrowRight":
          e.preventDefault();
          triggerSeekWithIndicator("forward");
          break;
        case "ArrowUp":
          e.preventDefault();
          handleVolumeChange(volume + 0.05);
          break;
        case "ArrowDown":
          e.preventDefault();
          handleVolumeChange(volume - 0.05);
          break;
        case "m":
        case "M":
          e.preventDefault();
          toggleMute();
          break;
        case "h":
        case "H": {
          e.preventDefault();
          const next = !ambientLights;
          setAmbientLights(next);
          try {
            localStorage.setItem("moviemachi_ambient_glow", JSON.stringify(next));
          } catch {}
          break;
        }
        case "a":
        case "A": {
          e.preventDefault();
          const list = ["Original (Tamil)", "Dual (Eng/Tam) Stereo", "DTS 5.1 Dolby"];
          const currIdx = list.indexOf(audioTrack);
          setAudioTrack(list[(currIdx + 1) % list.length]);
          break;
        }
        case "Escape":
          e.preventDefault();
          handleClose();
          break;
        default:
          break;
      }
    };

    window.addEventListener("keydown", handleHotKeys);
    return () => {
      window.removeEventListener("keydown", handleHotKeys);
    };
  }, [movie, duration, volume, isMuted, playbackSpeed, audioTrack, ambientLights]);

  const saveProgressImmediately = () => {
    if (isTrailer) return;
    const curr = currentTimeRef.current;
    if (curr === 0 || duration <= 0) return;
    try {
      const stored = localStorage.getItem("movie_progress") || "{}";
      const progressDb = JSON.parse(stored);
      if (progressDb[movie.title]) {
        const calculatedPercent = Math.floor((curr / duration) * 100);
        
        if (calculatedPercent > 95) {
          progressDb[movie.title].percent = 0;
          progressDb[movie.title].currentTime = 0;
          progressDb[movie.title].lastWatchedTime = "00:00:00";
        } else {
          progressDb[movie.title].percent = Math.max(calculatedPercent, 1);
          progressDb[movie.title].currentTime = curr;
          progressDb[movie.title].lastWatchedTime = formatTime(curr);
        }
        progressDb[movie.title].lastPlayed = new Date().toLocaleDateString();
        localStorage.setItem("movie_progress", JSON.stringify(progressDb));
        window.dispatchEvent(new Event("storage"));
      }
    } catch (e) {
      console.warn(e);
    }
  };

  const handleClose = () => {
    saveProgressImmediately();
    onClose();
  };

  useEffect(() => {
    return () => {
      saveProgressImmediately();
      if (volumeTimeoutRef.current) {
        clearTimeout(volumeTimeoutRef.current);
      }
    };
  }, [movie, duration]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    let hlsInstance: any = null;

    if (sourceUrl && sourceUrl.toLowerCase().includes(".m3u8")) {
      video.removeAttribute("src");

      if (video.canPlayType("application/vnd.apple.mpegurl")) {
        video.src = sourceUrl;
      } else {
        const initHls = () => {
          if ((window as any).Hls) {
            const Hls = (window as any).Hls;
            if (Hls.isSupported()) {
              if (hlsInstance) {
                hlsInstance.destroy();
              }
              hlsInstance = new Hls();
              hlsInstance.loadSource(sourceUrl);
              hlsInstance.attachMedia(video);
            }
          }
        };

        if (!(window as any).Hls) {
          const script = document.createElement("script");
          script.src = "https://cdn.jsdelivr.net/npm/hls.js@1.5.17/dist/hls.min.js";
          script.async = true;
          script.onload = initHls;
          document.body.appendChild(script);
        } else {
          initHls();
        }
      }
    } else {
      video.src = sourceUrl;
    }

    return () => {
      if (hlsInstance) {
        hlsInstance.destroy();
      }
    };
  }, [sourceUrl]);

  const handleTimeUpdate = () => {
    if (videoRef.current) {
      const curr = videoRef.current.currentTime;
      setCurrentTime(curr);
      currentTimeRef.current = curr;

      if (isTrailer) return;

      const isNearEnd = duration > 0 && curr > duration - 2;
      const shouldSave = Math.abs(curr - lastSavedTimeRef.current) >= 5 || isNearEnd;

      if (shouldSave) {
        lastSavedTimeRef.current = curr;
        try {
          const stored = localStorage.getItem("movie_progress") || "{}";
          const progressDb = JSON.parse(stored);
          if (progressDb[movie.title]) {
            const calculatedPercent = duration > 0 ? Math.floor((curr / duration) * 100) : 0;
            
            if (calculatedPercent > 95) {
              progressDb[movie.title].percent = 0;
              progressDb[movie.title].currentTime = 0;
              progressDb[movie.title].lastWatchedTime = "00:00:00";
            } else {
              progressDb[movie.title].percent = Math.max(calculatedPercent, 1);
              progressDb[movie.title].currentTime = curr;
              progressDb[movie.title].lastWatchedTime = formatTime(curr);
            }
            progressDb[movie.title].lastPlayed = new Date().toLocaleDateString();
            localStorage.setItem("movie_progress", JSON.stringify(progressDb));
            window.dispatchEvent(new Event("storage"));
          }
        } catch (e) {}
      }
    }
  };

  const handleWaiting = () => {
    setIsLoading(true);
  };

  const handlePlaying = () => {
    setIsLoading(false);
    setIsPlaying(true);
    setControlsVisible(false); // Controls hide automatically when video starts/plays
  };

  useEffect(() => {
    if (isTrailer) {
      setShowStartPopup(false);
      setSavedResumeTime(0);
      return;
    }
    try {
      const stored = localStorage.getItem("movie_progress") || "{}";
      const progressDb = JSON.parse(stored);
      const mProg = progressDb[movie.title];

      if (mProg && mProg.currentTime > 0) {
        setSavedResumeTime(mProg.currentTime);
        setShowStartPopup(true);
      } else {
        setShowStartPopup(false);
        setSavedResumeTime(0);
      }

      if (!progressDb[movie.title]) {
        progressDb[movie.title] = {
          title: movie.title,
          image: movie.image,
          movieName: movie.movieName,
          quality: movie.quality,
          percent: 0,
          currentTime: 0,
          lastWatchedTime: "00:00:00",
          lastPlayed: new Date().toLocaleDateString()
        };
        localStorage.setItem("movie_progress", JSON.stringify(progressDb));
      }
    } catch (e) {}
  }, [movie]);

  const handleResumeConfirm = () => {
    setShowStartPopup(false);
    if (videoRef.current) {
      videoRef.current.currentTime = savedResumeTime;
      setCurrentTime(savedResumeTime);
      videoRef.current.play().then(() => {
        setIsPlaying(true);
      }).catch(err => console.warn(err));
    }
  };

  const handleStartOverConfirm = () => {
    setShowStartPopup(false);
    try {
      const stored = localStorage.getItem("movie_progress") || "{}";
      const progressDb = JSON.parse(stored);
      if (progressDb[movie.title]) {
        progressDb[movie.title].percent = 0;
        progressDb[movie.title].currentTime = 0;
        progressDb[movie.title].lastWatchedTime = "00:00:00";
        localStorage.setItem("movie_progress", JSON.stringify(progressDb));
        window.dispatchEvent(new Event("storage"));
      }
    } catch (e) {}

    if (videoRef.current) {
      videoRef.current.currentTime = 0;
      setCurrentTime(0);
      videoRef.current.play().then(() => {
        setIsPlaying(true);
      }).catch(err => console.warn(err));
    }
  };

  const handleLoadedMetadata = () => {
    if (videoRef.current) {
      const dur = videoRef.current.duration;
      setDuration(dur);
      setIsLoading(false);

      if (showStartPopup) {
        videoRef.current.currentTime = savedResumeTime;
        videoRef.current.pause();
        setIsPlaying(false);
      } else {
        videoRef.current.play().then(() => {
          setIsPlaying(true);
        }).catch((e) => {
           console.log("Autoplay blocked: ", e);
        });
      }
    }
  };

  const togglePlay = () => {
    if (showStartPopup) {
      setShowStartPopup(false);
    }
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
        setIsPlaying(false);
      } else {
        videoRef.current.play().then(() => {
          setIsPlaying(true);
        }).catch(() => {});
      }
    }
  };

  const handleSeek = (value: number) => {
    if (videoRef.current) {
      videoRef.current.currentTime = value;
      setCurrentTime(value);
      currentTimeRef.current = value;
      saveProgressImmediately();
    }
  };

  const toggleMute = () => {
    if (videoRef.current) {
      const nextMute = !isMuted;
      setIsMuted(nextMute);
      videoRef.current.muted = nextMute;
    }
  };

  const handleSpeedToggle = () => {
    const speeds = [1, 1.25, 1.5, 2];
    const nextIdx = (speeds.indexOf(playbackSpeed) + 1) % speeds.length;
    const nextSpeed = speeds[nextIdx];
    setPlaybackSpeed(nextSpeed);
    if (videoRef.current) {
      videoRef.current.playbackRate = nextSpeed;
    }
  };

  const toggleFullscreen = async () => {
    if (!containerRef.current) return;
    try {
      if (!document.fullscreenElement) {
        if (containerRef.current.requestFullscreen) {
          await containerRef.current.requestFullscreen();
        } else if ((containerRef.current as any).webkitRequestFullscreen) {
          await (containerRef.current as any).webkitRequestFullscreen();
        }
      } else {
        if (document.exitFullscreen) {
          await document.exitFullscreen();
        } else if ((document as any).webkitExitFullscreen) {
          await (document as any).webkitExitFullscreen();
        }
      }
    } catch (err) {
      console.warn("Fullscreen toggle failed, using sandbox layout fallback:", err);
      setIsLayoutFullscreen(prev => !prev);
    }
  };

  const skipForward = () => {
    if (videoRef.current) {
      const nextTime = Math.min(videoRef.current.currentTime + 10, duration);
      videoRef.current.currentTime = nextTime;
      setCurrentTime(nextTime);
    }
  };

  const skipBackward = () => {
    if (videoRef.current) {
      const nextTime = Math.max(videoRef.current.currentTime - 10, 0);
      videoRef.current.currentTime = nextTime;
      setCurrentTime(nextTime);
    }
  };

  const handleProgressBarMouseMove = (e: MouseEvent<HTMLDivElement>) => {
    if (!progressBarRef.current || duration <= 0) return;
    const rect = progressBarRef.current.getBoundingClientRect();
    const relX = e.clientX - rect.left;
    const percentage = Math.max(0, Math.min(1, relX / rect.width));
    setHoverTime(percentage * duration);
    setHoverX(relX);
  };

  const handleProgressBarMouseLeave = () => {
    setHoverTime(null);
  };

  const handleProgressBarClick = (e: MouseEvent<HTMLDivElement>) => {
    if (!progressBarRef.current || duration <= 0) return;
    const rect = progressBarRef.current.getBoundingClientRect();
    const relX = e.clientX - rect.left;
    const percentage = Math.max(0, Math.min(1, relX / rect.width));
    handleSeek(percentage * duration);
  };

  const seekFromClientX = (clientX: number) => {
    if (!progressBarRef.current || durationRef.current <= 0) return;
    const rect = progressBarRef.current.getBoundingClientRect();
    const relX = clientX - rect.left;
    const percentage = Math.max(0, Math.min(1, relX / rect.width));
    handleSeek(percentage * durationRef.current);
  };

  const handleProgressBarMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    isScrubbingRef.current = true;
    setIsScrubbing(true);
    seekFromClientX(e.clientX);
  };

  const handleProgressBarTouchStart = (e: React.TouchEvent<HTMLDivElement>) => {
    e.stopPropagation();
    if (e.cancelable) {
      e.preventDefault();
    }
    isScrubbingRef.current = true;
    setIsScrubbing(true);
    if (e.touches.length > 0) {
      seekFromClientX(e.touches[0].clientX);
    }
  };

  const handleProgressBarTouchMove = (e: React.TouchEvent<HTMLDivElement>) => {
    e.stopPropagation();
    if (e.cancelable) {
      e.preventDefault();
    }
    if (isScrubbingRef.current && e.touches.length > 0) {
      seekFromClientX(e.touches[0].clientX);
    }
  };

  const handleProgressBarTouchEnd = (e: React.TouchEvent<HTMLDivElement>) => {
    e.stopPropagation();
    isScrubbingRef.current = false;
    setIsScrubbing(false);
  };

  useEffect(() => {
    const handleGlobalMouseMove = (e: globalThis.MouseEvent) => {
      if (isScrubbingRef.current) {
        seekFromClientX(e.clientX);
      }
    };
    const handleGlobalMouseUp = () => {
      if (isScrubbingRef.current) {
        isScrubbingRef.current = false;
        setIsScrubbing(false);
      }
    };

    const handleGlobalTouchMove = (e: globalThis.TouchEvent) => {
      if (isScrubbingRef.current && e.touches.length > 0) {
        if (e.cancelable) {
          e.preventDefault();
        }
        seekFromClientX(e.touches[0].clientX);
      }
    };

    const handleGlobalTouchEnd = () => {
      if (isScrubbingRef.current) {
        isScrubbingRef.current = false;
        setIsScrubbing(false);
      }
    };

    window.addEventListener("mousemove", handleGlobalMouseMove);
    window.addEventListener("mouseup", handleGlobalMouseUp);
    window.addEventListener("touchmove", handleGlobalTouchMove, { passive: false });
    window.addEventListener("touchend", handleGlobalTouchEnd, { passive: true });
    window.addEventListener("touchcancel", handleGlobalTouchEnd, { passive: true });

    return () => {
      window.removeEventListener("mousemove", handleGlobalMouseMove);
      window.removeEventListener("mouseup", handleGlobalMouseUp);
      window.removeEventListener("touchmove", handleGlobalTouchMove);
      window.removeEventListener("touchend", handleGlobalTouchEnd);
      window.removeEventListener("touchcancel", handleGlobalTouchEnd);
    };
  }, []);

  // Accent Color Picker for ambient light effect
  useEffect(() => {
    if (!ambientLights || !isPlaying || !videoRef.current) return;

    if (!canvasRef.current) {
      try {
        const canvas = document.createElement("canvas");
        canvas.width = 16;
        canvas.height = 16;
        canvasRef.current = canvas;
      } catch (e) {}
    }

    const intervalId = setInterval(() => {
      const video = videoRef.current;
      if (!video || video.paused || video.ended) return;

      try {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext("2d", { willReadFrequently: true });
        if (ctx) {
          ctx.drawImage(video, 0, 0, 16, 16);
          const imgData = ctx.getImageData(0, 0, 16, 16).data;
          let r = 0, g = 0, b = 0, count = 0;
          for (let i = 0; i < imgData.length; i += 4) {
            r += imgData[i];
            g += imgData[i + 1];
            b += imgData[i + 2];
            count++;
          }
          if (count > 0) {
            r = Math.round(r / count);
            g = Math.round(g / count);
            b = Math.round(b / count);
            setGlowColor(`rgba(${r}, ${g}, ${b}, 0.35)`);
          }
        }
      } catch (err) {
        const fallbacks = [
          "rgba(239, 68, 68, 0.35)",
          "rgba(37, 99, 235, 0.35)",
          "rgba(139, 92, 246, 0.35)",
          "rgba(245, 158, 11, 0.35)"
        ];
        const randomColor = fallbacks[Math.floor(Math.random() * fallbacks.length)];
        setGlowColor(randomColor);
      }
    }, 2000);

    return () => clearInterval(intervalId);
  }, [ambientLights, isPlaying, movie]);

  const ambientBackdropContent = useMemo(() => {
    return (
      <>
        <div className="absolute inset-0 bg-neutral-950/25 backdrop-blur-[6px]" />
        <div 
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[95vw] h-[95vh] rounded-full blur-[150px] opacity-75 transition-all duration-1000 mix-blend-screen" 
          style={{ 
            background: `radial-gradient(circle, ${getGlowWithAlpha(0.5)} 0%, rgba(0,0,0,0) 75%)`
          }}
        />
        <div 
          className="absolute left-0 top-[15%] bottom-[15%] w-[30vw] blur-[110px] opacity-80 rounded-r-3xl transition-all duration-1000 animate-pulse mix-blend-screen"
          style={{
            background: `linear-gradient(to right, ${getGlowWithAlpha(0.65)}, transparent)`,
            animationDuration: '3.5s'
          }}
        />
        <div 
          className="absolute right-0 top-[15%] bottom-[15%] w-[30vw] blur-[110px] opacity-80 rounded-l-3xl transition-all duration-1000 animate-pulse mix-blend-screen"
          style={{
            background: `linear-gradient(to left, ${getGlowWithAlpha(0.65)}, transparent)`,
            animationDuration: '4.2s'
          }}
        />
        <div 
          className="absolute bottom-0 left-[15%] right-[15%] h-[35vh] blur-[90px] opacity-85 rounded-t-3xl transition-all duration-1000 animate-pulse mix-blend-screen"
          style={{
            background: `linear-gradient(to top, ${getGlowWithAlpha(0.7)}, transparent)`,
            animationDuration: '2.8s'
          }}
        />
      </>
    );
  }, [ambientLights, glowColor, movie]);

  const startOverDialogContent = useMemo(() => {
    if (!showStartPopup) return null;
    return (
      <div 
        className="absolute inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-md p-4"
        onTouchStart={(e) => e.stopPropagation()}
        onTouchMove={(e) => e.stopPropagation()}
        onTouchEnd={(e) => e.stopPropagation()}
      >
        <motion.div 
          initial={{ scale: 0.9, y: 20, opacity: 0 }}
          animate={{ scale: 1, y: 0, opacity: 1 }}
          exit={{ scale: 0.9, y: 20, opacity: 0 }}
          transition={{ type: "spring", stiffness: 300, damping: 25 }}
          className="w-full max-w-sm p-6 sm:p-8 bg-gradient-to-b from-[#0e0204]/95 via-[#050505]/98 to-[#0a0002]/95 border border-[#ff2d55]/30 rounded-[28px] shadow-[0_20px_50px_rgba(255,45,85,0.15)] text-center space-y-5 mx-auto max-h-[85%] overflow-y-auto scrollbar-none relative"
        >
          {/* Ambient Inner Shadow Glow for Cinematic OTT feel */}
          <div className="absolute -inset-1 rounded-[28px] bg-gradient-to-tr from-[#ff2d55]/10 to-[#ff6b00]/10 blur-xl pointer-events-none -z-10" />

          <div className="w-14 h-14 rounded-full bg-gradient-to-tr from-[#ff2d55] to-[#ff6b00] text-white flex items-center justify-center mx-auto shrink-0 shadow-[0_4px_15px_rgba(255,45,85,0.4)] overflow-hidden">
            <img 
              src="/moviemachi_logo.png" 
              alt="MovieMachi Logo" 
              className="w-9 h-9 object-cover rounded-lg shadow-md"
              referrerPolicy="no-referrer"
            />
          </div>
          
          <div className="space-y-2">
            <h3 className="font-sans font-black text-lg sm:text-xl text-white uppercase tracking-wider">
              Resume Watching?
            </h3>
            <p className="text-sm text-gray-300 font-semibold truncate max-w-full font-sans">
              {movie?.movieName}
            </p>
            <div className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-neutral-900/80 border border-white/5 font-mono text-xs text-[#ff6b00] font-black mx-auto shadow-inner">
              <span>Saved position:</span>
              <span>{formatTime(savedResumeTime)}</span>
            </div>
          </div>

          <div className="flex flex-col gap-3 pt-3 font-sans">
            <button
              onClick={handleResumeConfirm}
              className="py-3.5 w-full rounded-2xl bg-gradient-to-r from-[#ff2d55] to-[#ff6b00] text-white font-black text-xs sm:text-sm tracking-widest uppercase transition-all hover:brightness-110 active:scale-95 shadow-[0_6px_20px_rgba(255,45,85,0.4)] cursor-pointer hover:shadow-[0_0_25px_rgba(255,45,85,0.6)]"
            >
              Resume Watching
            </button>
            <button
              onClick={handleStartOverConfirm}
              className="py-3.5 w-full rounded-2xl bg-white/5 text-gray-300 hover:text-white border border-white/10 font-bold text-xs sm:text-sm tracking-wider uppercase transition-all hover:bg-white/10 active:scale-95 cursor-pointer"
            >
              Start Over
            </button>
          </div>
        </motion.div>
      </div>
    );
  }, [showStartPopup, savedResumeTime, movie]);

  const settingsMenuContent = useMemo(() => {
    return (
      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 15 }}
        transition={{ duration: 0.2 }}
        className="absolute bottom-20 right-4 sm:right-6 w-72 bg-[#09090f]/95 backdrop-blur-xl border border-white/10 rounded-2xl sm:rounded-3xl p-4 sm:p-5 shadow-2xl z-40 select-none space-y-4"
        onClick={(e) => e.stopPropagation()}
        onTouchStart={(e) => e.stopPropagation()}
        onTouchMove={(e) => e.stopPropagation()}
        onTouchEnd={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-white/10 pb-2.5">
          <div className="flex items-center gap-1.5 text-white font-sans font-bold">
            <Settings size={14} className="text-red-500" />
            <span className="font-display text-xs uppercase font-bold tracking-wider">Advanced Controls</span>
          </div>
          <button 
            onClick={() => setShowSettingsMenu(false)}
            className="w-6 h-6 rounded-lg bg-white/5 flex items-center justify-center text-gray-400 hover:text-white cursor-pointer hover:bg-neutral-800"
          >
            <X size={12} />
          </button>
        </div>

        <div className="space-y-3 font-sans text-xs">
          <div className="space-y-1.5">
            <span className="text-[10px] uppercase font-bold tracking-wider text-gray-500 font-mono">Speed rate</span>
            <div className="grid grid-cols-4 gap-1.5">
              {[1, 1.25, 1.5, 2].map((s) => (
                <button
                  key={s}
                  onClick={() => {
                    setPlaybackSpeed(s);
                    if (videoRef.current) videoRef.current.playbackRate = s;
                  }}
                  className={`py-1.5 rounded-lg border font-mono text-[10px] font-bold cursor-pointer transition-all ${
                    playbackSpeed === s 
                      ? "bg-red-650 text-white border-red-500/40" 
                      : "bg-white/5 text-gray-300 border-white/10 hover:bg-white/10"
                  }`}
                >
                  {s}x
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-1.5">
            <span className="text-[10px] uppercase font-bold tracking-wider text-gray-500 font-mono">Audio language track</span>
            <div className="flex flex-col gap-1">
              {["Original (Tamil)", "Dual (Eng/Tam) Stereo", "DTS 5.1 Dolby"].map((track) => (
                <button
                  key={track}
                  onClick={() => setAudioTrack(track)}
                  className={`py-2 px-3 rounded-lg border text-left flex items-center justify-between cursor-pointer transition-all ${
                    audioTrack === track 
                      ? "bg-red-650/20 text-red-400 border-red-500/30 font-semibold" 
                      : "bg-white/5 text-gray-300 border-white/10 hover:bg-white/10"
                  }`}
                >
                  <span className="truncate">{track}</span>
                  {audioTrack === track && <Sparkles size={12} className="text-red-500 animate-pulse" />}
                </button>
              ))}
            </div>
          </div>
        </div>
      </motion.div>
    );
  }, [showSettingsMenu, playbackSpeed, audioTrack]);

  const headerBarContent = useMemo(() => {
    return (
      <div 
        className="w-full p-4 sm:p-5 bg-gradient-to-b from-black/95 via-black/70 to-transparent flex items-center justify-between gap-3 select-none"
        onTouchStart={(e) => e.stopPropagation()}
        onTouchMove={(e) => e.stopPropagation()}
        onTouchEnd={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-2 sm:gap-3 flex-1 min-w-0 py-1">
          <button
            onClick={handleClose}
            className="w-10 h-10 sm:w-11 sm:h-11 flex items-center justify-center rounded-xl bg-white/5 border border-white/10 text-white cursor-pointer active:scale-95 transition-all shrink-0 hover:bg-[#ff2d55] hover:border-[#ff2d55]/50 hover:shadow-[0_0_15px_rgba(255,45,85,0.4)]"
            title="Close Player"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>

          <div className="min-w-0 shrink-1">
            <h3 className="font-display font-semibold sm:font-bold text-xs sm:text-base text-white truncate leading-tight font-sans">
              {isTrailer ? `🎬 Trailer | ${movie.movieName}` : movie.movieName}
            </h3>
            <div className="flex items-center gap-2 mt-0.5 sm:mt-1 font-sans">
              {isTrailer ? (
                <span className="shrink-0 text-[8px] sm:text-[9px] font-mono font-black bg-amber-500 text-black px-1.5 py-0.5 rounded uppercase tracking-wider">
                  TRAILER
                </span>
              ) : (
                <span className="shrink-0 text-[8px] sm:text-[9px] font-mono font-black bg-[#ff2d55] text-white px-1.5 py-0.5 rounded uppercase tracking-wider shadow-[0_0_8px_rgba(255,45,85,0.4)]">
                  {movie.quality}
                </span>
              )}
              <span className="text-[9px] sm:text-xs text-gray-400 truncate max-w-[150px] sm:max-w-none">
                Directed by {movie.director || "Not Specified"}
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0 animate-fade-in">
          {!isMobile && (
            <div className="flex items-center gap-1.5 pr-2.5 border-r border-white/10">
              <span className="font-mono text-[10px] text-gray-500 uppercase tracking-widest">Ambient Glow</span>
              <button
                onClick={() => {
                  const next = !ambientLights;
                  setAmbientLights(next);
                  try {
                    localStorage.setItem("moviemachi_ambient_glow", JSON.stringify(next));
                  } catch {}
                }}
                className={`w-9 h-5 rounded-full p-0.5 transition-colors duration-200 cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#ff2d55] ${ambientLights ? "bg-[#ff2d55]" : "bg-neutral-800"}`}
              >
                <div className={`w-4 h-4 rounded-full bg-white transition-transform duration-200 ${ambientLights ? "translate-x-4" : "translate-x-0"}`} />
              </button>
            </div>
          )}

          {/* Settings gear button is ALWAYS rendered at top right beside movie details on all layouts */}
          <button
            onClick={() => setShowSettingsMenu((prev) => !prev)}
            className={`w-10 h-10 flex items-center justify-center rounded-xl border transition-all cursor-pointer active:scale-95 shrink-0 hover:bg-white/10 ${
              showSettingsMenu 
                ? "bg-[#ff2d55] text-white border-[#ff2d55]/45 shadow-[0_0_15px_rgba(255,45,85,0.5)]" 
                : "bg-white/5 text-gray-300 border-white/10 text-gray-300 hover:text-white"
            }`}
            title="Advanced setings"
          >
            <Settings size={18} className={showSettingsMenu ? "animate-spin-slow" : ""} />
          </button>

          {!isMobile && (
            <button
              onClick={handleClose}
              className="w-10 h-10 flex items-center justify-center rounded-xl bg-white/5 border border-white/10 text-gray-300 hover:text-white transition-all cursor-pointer hover:bg-red-650 hover:border-red-500 shrink-0"
              title="Close Cinema Window"
            >
              <X size={16} />
            </button>
          )}
        </div>
      </div>
    );
  }, [showSettingsMenu, playbackSpeed, audioTrack, ambientLights, isMobile]);

  const bottomControlsContent = useMemo(() => {
    return (
      <div className="flex items-center justify-between gap-3 w-full px-1 sm:px-2 select-none">
        {/* Left spacing for balanced center position */}
        <div className="w-1/3 flex justify-start items-center" />

        {/* Center: Back 10s | Play/Pause | Forward 10s */}
        <div className="flex items-center gap-4 sm:gap-6 justify-center">
          <button 
            onClick={skipBackward}
            className="w-11 h-11 flex items-center justify-center rounded-full bg-white/5 border border-white/10 text-white hover:bg-white/10 active:scale-95 transition-all cursor-pointer hover:border-[#ff2d55]/35 hover:text-[#ff2d55]"
            title="Rewind 10s"
          >
            <Rewind size={18} />
          </button>

          <button 
            onClick={togglePlay}
            className="w-13 h-13 rounded-full bg-gradient-to-r from-[#ff2d55] to-[#ff6b00] text-white flex items-center justify-center transition-all shadow-[0_0_20px_rgba(255,45,85,0.4)] cursor-pointer hover:scale-105 active:scale-95"
            title="Play/Pause"
          >
            {isPlaying ? <Pause size={20} fill="currentColor" /> : <Play size={20} fill="currentColor" className="ml-0.5" />}
          </button>

          <button 
            onClick={skipForward}
            className="w-11 h-11 flex items-center justify-center rounded-full bg-white/5 border border-white/10 text-white hover:bg-white/10 active:scale-95 transition-all cursor-pointer hover:border-[#ff2d55]/35 hover:text-[#ff2d55]"
            title="Fast Forward 10s"
          >
            <FastForward size={18} />
          </button>
        </div>

        {/* Right: Fullscreen */}
        <div className="flex items-center gap-2 w-1/3 justify-end">
          <button
            onClick={toggleFullscreen}
            className="w-10 h-10 flex items-center justify-center rounded-xl bg-white/5 border border-white/10 text-gray-300 hover:text-white transition-all cursor-pointer active:scale-95 hover:border-[#ff2d55]/35 hover:text-[#ff2d55] hover:shadow-[0_0_10px_rgba(255,45,85,0.2)]"
            title="Toggles fullscreen view"
          >
            {isFullscreen || isLayoutFullscreen ? <Minimize2 size={16} /> : <Maximize size={16} />}
          </button>
        </div>
      </div>
    );
  }, [isPlaying, isFullscreen, isLayoutFullscreen, isMobile]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-0 md:p-4 bg-black/95 backdrop-blur-3xl overflow-hidden select-none">
      
      {/* Upgraded High-Fidelity Ambient Aura Glow Backdrop (Omitted on mobile) */}
      <AnimatePresence>
        {!isMobile && ambientLights && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.8 }}
            className="absolute inset-0 pointer-events-none z-0 overflow-hidden"
          >
            {ambientBackdropContent}
          </motion.div>
        )}
      </AnimatePresence>

      <motion.div 
        ref={containerRef}
        initial={isMobile ? false : { opacity: 0, scale: 0.98, y: 10 }}
        animate={isMobile ? false : { opacity: 1, scale: 1, y: 0 }}
        exit={isMobile ? false : { opacity: 0, scale: 0.98, y: 10 }}
        onMouseMove={isMobile ? undefined : handleUserInteraction}
        onClick={isMobile ? undefined : handleUserInteraction}
        onTouchStart={isMobile ? handleTouchStart : handleUserInteraction}
        onTouchMove={isMobile ? handleTouchMove : undefined}
        onTouchEnd={isMobile ? handleTouchEnd : undefined}
        style={!isMobile && ambientLights ? {
          boxShadow: `0 20px 50px -15px rgba(0,0,0,0.85), 0 0 75px ${getGlowWithAlpha(0.4)}, 0 0 30px ${getGlowWithAlpha(0.2)}`
        } : undefined}
        className={isMobile ? "fixed inset-0 z-50 flex flex-col justify-between bg-black overflow-hidden select-none w-screen h-screen" : `relative w-full flex flex-col bg-[#020202] transition-all duration-300 overflow-hidden ${
          isFullscreen || isLayoutFullscreen
            ? "fixed inset-0 z-50 w-screen h-screen rounded-none max-w-none border-none shadow-none" 
            : "max-w-5xl rounded-3xl glass-panel border border-white/10 aspect-video my-auto"
        } ${isPlaying && !controlsVisible ? "cursor-none" : "cursor-default"}`}
      >
        <div className="w-full h-full relative z-10 bg-black flex items-center justify-center overflow-hidden grow animate-fade-in">
          {/* SINGLE PERSISTENT VIDEO ELEMENT - Never unmounted! */}
          <video
            ref={videoRef}
            onClick={handleVideoClick}
            onTimeUpdate={handleTimeUpdate}
            onLoadedMetadata={handleLoadedMetadata}
            onWaiting={handleWaiting}
            onPlaying={handlePlaying}
            preload="metadata"
            className="w-full h-full object-contain max-h-full"
            playsInline
            style={{ filter: isMobile ? `brightness(${brightness})` : undefined }}
            onContextMenu={(e) => e.preventDefault()}
          />

          {/* Start Over / Resume Overlay Dialog */}
          <AnimatePresence>
            {showStartPopup && startOverDialogContent}
          </AnimatePresence>

          {/* Redesigned Premium Glassmorphic Volume HUD */}
          <AnimatePresence>
            {showVolumeHUD && (
              <motion.div
                initial={{ opacity: 0, scale: 0.85, y: -20, x: "-50%" }}
                animate={{ opacity: 1, scale: 1, y: 0, x: "-50%" }}
                exit={{ opacity: 0, scale: 0.85, y: -20, x: "-50%" }}
                transition={{ type: "spring", stiffness: 350, damping: 25 }}
                className="absolute z-50 top-[20%] left-1/2 px-6 py-4 bg-gradient-to-b from-[#09090f]/95 to-[#050505]/98 border border-[#ff2d55]/30 rounded-[24px] shadow-[0_12px_45px_rgba(255,45,85,0.25)] flex flex-col items-center gap-3 backdrop-blur-xl min-w-[160px] pointer-events-none select-none"
              >
                <div className="absolute -inset-1 rounded-[24px] bg-gradient-to-r from-[#ff2d55]/10 to-[#ff6b00]/10 blur-xl pointer-events-none -z-10" />
                <div className="flex items-center gap-2">
                  <Volume2 className="w-5 h-5 text-[#ff2d55] drop-shadow-[0_0_8px_rgba(255,45,85,0.6)] animate-bounce" />
                  <span className="font-sans font-black text-xs text-stone-300 tracking-wider uppercase">Volume</span>
                </div>
                <div className="w-28 h-1.5 bg-white/10 rounded-full relative overflow-hidden">
                  <div 
                    className="absolute top-0 bottom-0 left-0 bg-gradient-to-r from-[#ff2d55] to-[#ff6b00] rounded-full"
                    style={{ width: `${volume * 100}%` }}
                  />
                </div>
                <span className="text-[14px] font-mono text-[#ff2d55] font-black drop-shadow-[0_0_6px_rgba(255,45,85,0.4)]">{Math.round(volume * 100)}%</span>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Redesigned Premium Glassmorphic Brightness HUD */}
          <AnimatePresence>
            {showBrightnessHUD && (
              <motion.div
                initial={{ opacity: 0, scale: 0.85, y: -20, x: "-50%" }}
                animate={{ opacity: 1, scale: 1, y: 0, x: "-50%" }}
                exit={{ opacity: 0, scale: 0.85, y: -20, x: "-50%" }}
                transition={{ type: "spring", stiffness: 350, damping: 25 }}
                className="absolute z-50 top-[20%] left-1/2 px-6 py-4 bg-gradient-to-b from-[#09090f]/95 to-[#050505]/98 border border-[#ff6b00]/30 rounded-[24px] shadow-[0_12px_45px_rgba(255,107,0,0.25)] flex flex-col items-center gap-3 backdrop-blur-xl min-w-[160px] pointer-events-none select-none"
              >
                <div className="absolute -inset-1 rounded-[24px] bg-gradient-to-r from-[#ff6b00]/10 to-[#ff2d55]/10 blur-xl pointer-events-none -z-10" />
                <div className="flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-[#ff6b00] drop-shadow-[0_0_8px_rgba(255,107,0,0.6)] animate-spin-slow" />
                  <span className="font-sans font-black text-xs text-stone-300 tracking-wider uppercase">Brightness</span>
                </div>
                <div className="w-28 h-1.5 bg-white/10 rounded-full relative overflow-hidden">
                  <div 
                    className="absolute top-0 bottom-0 left-0 bg-gradient-to-r from-[#ff6b00] to-[#ff2d55] rounded-full"
                    style={{ width: `${((brightness - 0.1) / 1.4) * 100}%` }}
                  />
                </div>
                <span className="text-[14px] font-mono text-[#ff6b00] font-black drop-shadow-[0_0_6px_rgba(255,107,0,0.4)]">{Math.round(brightness * 100)}%</span>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Animated Seek Side Indicators (YouTube/Netflix styled) */}
          <AnimatePresence>
            {seekType === "back" && (
              <motion.div
                initial={{ opacity: 0, scale: 0.8, x: -25 }}
                animate={{ opacity: 1, scale: 1, x: 0 }}
                exit={{ opacity: 0, scale: 0.8, x: -25 }}
                transition={{ duration: 0.2 }}
                className="absolute z-40 left-[10%] sm:left-[15%] top-1/2 -translate-y-1/2 p-4 bg-black/60 hover:bg-black/75 backdrop-blur-md border border-[#ff2d55]/30 rounded-full flex items-center justify-center w-12 h-12 sm:w-16 sm:h-16 shadow-[0_0_20px_rgba(255,45,85,0.25)] pointer-events-none select-none"
              >
                <div className="absolute -inset-1 rounded-full bg-[#ff2d55]/5 blur-lg pointer-events-none -z-10 animate-pulse" />
                <div className="flex flex-col items-center justify-center">
                  <Rewind className="w-4 h-4 sm:w-5 sm:h-5 text-[#ff2d55] drop-shadow-[0_0_6px_rgba(255,45,85,0.7)]" fill="currentColor" />
                  <span className="text-[9px] font-sans font-black tracking-wider text-stone-200 mt-1 uppercase">10s</span>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <AnimatePresence>
            {seekType === "forward" && (
              <motion.div
                initial={{ opacity: 0, scale: 0.8, x: 25 }}
                animate={{ opacity: 1, scale: 1, x: 0 }}
                exit={{ opacity: 0, scale: 0.8, x: 25 }}
                transition={{ duration: 0.2 }}
                className="absolute z-40 right-[10%] sm:right-[15%] top-1/2 -translate-y-1/2 p-4 bg-black/60 hover:bg-black/75 backdrop-blur-md border border-[#ff2d55]/30 rounded-full flex items-center justify-center w-12 h-12 sm:w-16 sm:h-16 shadow-[0_0_20px_rgba(255,45,85,0.25)] pointer-events-none select-none"
              >
                <div className="absolute -inset-1 rounded-full bg-[#ff2d55]/5 blur-lg pointer-events-none -z-10 animate-pulse" />
                <div className="flex flex-col items-center justify-center">
                  <FastForward className="w-4 h-4 sm:w-5 sm:h-5 text-[#ff2d55] drop-shadow-[0_0_6px_rgba(255,45,85,0.7)]" fill="currentColor" />
                  <span className="text-[9px] font-sans font-black tracking-wider text-stone-200 mt-1 uppercase">10s</span>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Premium Logo-Centred Buffering Ring Screen (MovieMachi Branding) */}
          {isLoading && (
            <div className="absolute inset-0 z-35 flex flex-col items-center justify-center bg-[#040407]/98 backdrop-blur-md">
              <div className="relative flex items-center justify-center w-24 h-24 sm:w-28 sm:h-28 mb-5 select-none">
                {/* Ambient glow underneath the ring */}
                <div className="absolute w-20 h-20 sm:w-24 sm:h-24 rounded-full bg-gradient-to-tr from-[#ff2d55]/15 via-transparent to-[#ff6b00]/15 blur-xl pointer-events-none" />
                
                {/* Circular rotating ring using red/orange theme colors */}
                <div className="absolute inset-0 rounded-full border-[3px] border-white/5 border-t-[#ff2d55] border-r-[#ff6b00] animate-spin" style={{ animationDuration: "1.1s" }} />
                
                {/* Fixed center branding matching website header quality */}
                <div className="absolute w-12 h-12 sm:w-14 sm:h-14 flex items-center justify-center rounded-2xl bg-[#09090f]/90 border border-[#ff2d55]/25 shadow-[0_8px_25px_rgba(255,45,85,0.3)]">
                  <img 
                    src="/moviemachi_logo.png" 
                    alt="MovieMachi Logo" 
                    className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl object-cover"
                    referrerPolicy="no-referrer"
                  />
                </div>
              </div>

              <div className="text-center space-y-1.5 animate-fade-in select-none px-4">
                <h4 className="font-sans font-black text-white tracking-[0.25em] text-xs sm:text-sm uppercase drop-shadow-[0_0_8px_rgba(255,45,85,0.4)]">
                  BUFFERING STREAM
                </h4>
                <p className="text-[10px] text-gray-400 font-mono tracking-widest uppercase animate-pulse">
                  Connecting to stream...
                </p>
              </div>
            </div>
          )}

          {/* Custom Large Center Play Button Overlay (when paused - hidden on mobile) */}
          {!isMobile && !isPlaying && !isLoading && !showStartPopup && (
            <div 
              onClick={togglePlay}
              className="absolute inset-0 z-20 flex items-center justify-center bg-black/35 cursor-pointer group hover:bg-black/25 transition-colors"
            >
              <div className="w-20 h-20 rounded-full bg-red-650/10 group-hover:bg-red-600/20 border-2 border-red-500/25 group-hover:border-red-500/60 flex items-center justify-center text-red-500 group-hover:scale-110 transition-all duration-300 shadow-[0_0_35px_rgba(239,68,68,0.3)]">
                <Play size={32} fill="currentColor" className="ml-1 text-white" />
              </div>
            </div>
          )}

          {/* Settings Overlay Menu */}
          <AnimatePresence>
            {showSettingsMenu && settingsMenuContent}
          </AnimatePresence>
        </div>

        {/* TOP BAR / HEADER */}
        {isMobile ? (
          <AnimatePresence>
            {controlsVisible && !showStartPopup && (
              <motion.div 
                initial={{ translateY: -50, opacity: 0 }}
                animate={{ translateY: 0, opacity: 1 }}
                exit={{ translateY: -50, opacity: 0 }}
                transition={{ duration: 0.3, ease: "easeOut" }}
                className="absolute top-0 left-0 right-0 z-30 p-4 bg-gradient-to-b from-black via-black/85 to-transparent flex items-start justify-between gap-3 text-white"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="min-w-0 flex-1">
                  <h3 className="font-display font-bold text-sm text-white truncate leading-tight">
                    {isTrailer ? `🎬 Trailer | ${movie.movieName}` : movie.movieName}
                  </h3>
                  <p className="text-[10px] text-gray-400 mt-1 truncate">
                    Directed by {movie.director || "Not Specified"}
                  </p>
                  <div className="flex items-center gap-1.5 mt-1.5">
                    <span className="text-[8px] font-mono font-black bg-[#ff2d55] text-white px-1.5 py-0.5 rounded uppercase tracking-wider shadow-[0_0_8px_rgba(255,45,85,0.4)] shrink-0">
                      {movie.quality}
                    </span>
                    <span className="text-[9px] text-amber-500 font-bold font-mono">
                      ★ {movie.rating || "9.5/10"}
                    </span>
                  </div>
                </div>
                
                <button
                  onClick={handleClose}
                  className="w-11 h-11 flex items-center justify-center rounded-full bg-white/10 border border-white/10 text-white cursor-pointer active:scale-95 transition-all shrink-0 shadow-lg hover:bg-[#ff2d55] hover:border-[#ff2d55]/40"
                  title="Close Player"
                >
                  <X size={18} />
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        ) : (
          <AnimatePresence>
            {controlsVisible && !showStartPopup && (
              <motion.div
                initial={{ translateY: -50, opacity: 0 }}
                animate={{ translateY: 0, opacity: 1 }}
                exit={{ translateY: -50, opacity: 0 }}
                transition={{ duration: 0.3, ease: "easeOut" }}
                className="absolute top-0 left-0 right-0 z-30"
                onClick={(e) => e.stopPropagation()}
              >
                {headerBarContent}
              </motion.div>
            )}
          </AnimatePresence>
        )}

        {/* BOTTOM GLASS OVERLAY CONTROL PANEL / BOTTOM BAR */}
        {isMobile ? (
          <AnimatePresence>
            {controlsVisible && !showStartPopup && (
              <motion.div 
                initial={{ translateY: 50, opacity: 0 }}
                animate={{ translateY: 0, opacity: 1 }}
                exit={{ translateY: 50, opacity: 0 }}
                transition={{ duration: 0.3, ease: "easeOut" }}
                className="absolute bottom-0 left-0 right-0 p-4 pb-6 bg-gradient-to-t from-black via-black/90 to-transparent z-35 select-none space-y-3"
                onClick={(e) => e.stopPropagation()}
              >
                {/* Progress bar timeline with left/right timestamps */}
                <div className="flex items-center gap-2.5 w-full">
                  <span className="font-mono text-[9px] text-gray-400 select-none shrink-0">{formatTime(currentTime)}</span>
                  
                  <div 
                    ref={progressBarRef}
                    onMouseMove={handleProgressBarMouseMove}
                    onMouseLeave={handleProgressBarMouseLeave}
                    onClick={handleProgressBarClick}
                    onMouseDown={handleProgressBarMouseDown}
                    onTouchStart={handleProgressBarTouchStart}
                    onTouchMove={handleProgressBarTouchMove}
                    onTouchEnd={handleProgressBarTouchEnd}
                    className="relative flex-1 h-3 flex items-center cursor-pointer select-none"
                  >
                    {/* Progress track */}
                    <div className="w-full h-[3px] bg-white/15 rounded-full overflow-hidden relative">
                      <div 
                        className="h-full bg-gradient-to-r from-red-650 via-red-500 to-amber-500 rounded-full relative shadow-[0_0_8px_#ef4444]"
                        style={{ width: `${duration > 0 ? (currentTime / duration) * 100 : 0}%` }}
                      />
                    </div>
                  </div>

                  <span className="font-mono text-[9px] text-gray-400 select-none shrink-0">-{formatTime(Math.max(0, duration - currentTime))}</span>
                </div>

                {/* Primary triggers and parameters bar */}
                <div className="flex items-center justify-between gap-2.5 w-full">
                  
                  {/* Left Side: Play/Pause, Previous, Next */}
                  <div className="flex items-center gap-2.5">
                    <button 
                      onClick={skipBackward}
                      className="w-11 h-11 flex items-center justify-center rounded-full bg-white/5 border border-white/10 text-white active:scale-95 transition-all cursor-pointer hover:bg-white/10"
                      title="Rewind 10s"
                    >
                      <Rewind size={16} />
                    </button>

                    <button 
                      onClick={togglePlay}
                      className="w-11 h-11 rounded-full bg-gradient-to-r from-[#ff2d55] to-[#ff6b00] text-white flex items-center justify-center transition-all shadow-[0_0_15px_rgba(255,45,85,0.4)] cursor-pointer active:scale-95"
                      title="Play/Pause"
                    >
                      {isPlaying ? <Pause size={16} fill="currentColor" /> : <Play size={16} fill="currentColor" className="ml-0.5" />}
                    </button>

                    <button 
                      onClick={skipForward}
                      className="w-11 h-11 flex items-center justify-center rounded-full bg-white/5 border border-white/10 text-white active:scale-95 transition-all cursor-pointer hover:bg-white/10"
                      title="Fast Forward 10s"
                    >
                      <FastForward size={16} />
                    </button>
                  </div>

                  {/* Right Side: Volume, Settings, Fullscreen */}
                  <div className="flex items-center gap-2.5">
                    <button
                      onClick={toggleMute}
                      className="w-11 h-11 flex items-center justify-center rounded-xl bg-white/5 border border-white/10 text-gray-300 hover:text-white transition-all cursor-pointer active:scale-95"
                      title="Mute Volume"
                    >
                      {isMuted ? <VolumeX size={16} className="text-[#ff2d55]" /> : <Volume2 size={16} />}
                    </button>

                    <button
                      onClick={() => setShowSettingsMenu((prev) => !prev)}
                      className={`w-11 h-11 flex items-center justify-center rounded-xl border transition-all cursor-pointer active:scale-95 ${
                        showSettingsMenu 
                          ? "bg-[#ff2d55] text-white border-[#ff2d55]/45 shadow-[0_0_15px_rgba(255,45,85,0.5)]" 
                          : "bg-white/5 text-gray-300 border-white/10"
                      }`}
                      title="Settings"
                    >
                      <Settings size={16} className={showSettingsMenu ? "animate-spin-slow" : ""} />
                    </button>

                    <button
                      onClick={toggleFullscreen}
                      className="w-11 h-11 flex items-center justify-center rounded-xl bg-white/5 border border-white/10 text-gray-300 hover:text-white transition-all cursor-pointer active:scale-95"
                      title="Fullscreen"
                    >
                      {isFullscreen || isLayoutFullscreen ? <Minimize2 size={16} /> : <Maximize size={16} />}
                    </button>
                  </div>

                </div>
              </motion.div>
            )}
          </AnimatePresence>
        ) : (
          <AnimatePresence>
            {controlsVisible && !showStartPopup && (
              <motion.div 
                initial={{ translateY: 50, opacity: 0 }}
                animate={{ translateY: 0, opacity: 1 }}
                exit={{ translateY: 50, opacity: 0 }}
                transition={{ duration: 0.3, ease: "easeOut" }}
                className="absolute bottom-0 left-0 right-0 p-4 sm:p-6 bg-gradient-to-t from-black/95 via-black/85 to-transparent z-35 select-none space-y-4"
                onClick={(e) => e.stopPropagation()}
              >
                {/* Sleek Progress scrub timeline */}
                <div className="flex items-center gap-3 w-full">
                  <span className="font-mono text-[10px] sm:text-xs text-gray-400 select-none shrink-0">{formatTime(currentTime)}</span>
                  
                  <div 
                    ref={progressBarRef}
                    onMouseMove={handleProgressBarMouseMove}
                    onMouseLeave={handleProgressBarMouseLeave}
                    onClick={handleProgressBarClick}
                    onMouseDown={handleProgressBarMouseDown}
                    onTouchStart={handleProgressBarTouchStart}
                    onTouchMove={handleProgressBarTouchMove}
                    onTouchEnd={handleProgressBarTouchEnd}
                    className="relative flex-1 h-3 flex items-center cursor-pointer select-none group"
                  >
                    {/* Hover timestamp tooltip */}
                    {hoverTime !== null && (
                      <div 
                        className="absolute bottom-6 px-2 py-1 bg-[#09090f] border border-white/15 text-white text-[10px] font-mono font-bold rounded shadow-2xl -translate-x-1/2 pointer-events-none z-50 transform"
                        style={{ left: `${hoverX}px` }}
                      >
                        {formatTime(hoverTime)}
                      </div>
                    )}

                    {/* Progress track */}
                    <div className="w-full h-1 bg-white/10 rounded-full overflow-hidden relative group-hover:h-2 transition-all duration-150">
                      <div 
                        className="h-full bg-gradient-to-r from-red-650 via-red-500 to-amber-500 rounded-full relative shadow-[0_0_8px_#ef4444]"
                        style={{ width: `${duration > 0 ? (currentTime / duration) * 100 : 0}%` }}
                      >
                        {/* Glowing progress slider head thumb */}
                        <div className="absolute right-0 top-1/2 -translate-y-1/2 w-3.5 h-3.5 bg-white rounded-full shadow-[0_0_10px_#ef4444] scale-0 group-hover:scale-100 transition-transform duration-100 z-10" />
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 font-mono text-[10px] sm:text-xs select-none shrink-0 border-l border-white/10 pl-3">
                    <span className="text-gray-400" title="Remaining Time">-{formatTime(Math.max(0, duration - currentTime))}</span>
                    <span className="text-gray-600">/</span>
                    <span className="text-gray-200" title="Total Duration">{formatTime(duration)}</span>
                  </div>
                </div>

                {/* Primary triggers and utility parameters controls bar */}
                {bottomControlsContent}
              </motion.div>
            )}
          </AnimatePresence>
        )}
      </motion.div>
    </div>
  );
}
