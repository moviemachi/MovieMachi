import React, { useEffect, useState } from "react";
import { Play, Trash2, Clock, Sparkles } from "lucide-react";

interface WatchingProgress {
  title: string;
  image: string;
  movieName: string;
  quality: string;
  percent: number;
  currentTime: number;
  lastPlayed: string;
}

interface ContinueWatchingProps {
  onResumeMovie: (title: string) => void;
}

export default function ContinueWatching({ onResumeMovie }: ContinueWatchingProps) {
  const [list, setList] = useState<WatchingProgress[]>([]);

  const loadProgress = () => {
    try {
      const stored = localStorage.getItem("movie_progress") || "{}";
      const db = JSON.parse(stored);
      const objects = Object.values(db) as WatchingProgress[];
      
      // Sort so most recent updates appear first
      setList(objects.filter(obj => obj.percent > 0));
    } catch (e) {
      console.warn("Storage failed to read progress status: ", e);
    }
  };

  useEffect(() => {
    loadProgress();
    
    // Add event listeners to sync session updates seamlessly when media changes
    window.addEventListener("storage", loadProgress);
    
    // Custom trigger loop for internal page events
    const interval = setInterval(loadProgress, 1200);

    return () => {
      window.removeEventListener("storage", loadProgress);
      clearInterval(interval);
    };
  }, []);

  const handleClearHistory = () => {
    try {
      localStorage.removeItem("movie_progress");
      setList([]);
    } catch (e) {
      // ignored
    }
  };

  const handleRemoveOne = (title: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const stored = localStorage.getItem("movie_progress") || "{}";
      const db = JSON.parse(stored);
      delete db[title];
      localStorage.setItem("movie_progress", JSON.stringify(db));
      loadProgress();
    } catch (e2) {}
  };

  if (list.length === 0) {
    return (
      <div className="glass-card rounded-3xl p-4 xs:p-5 sm:p-8 border border-white/5 relative overflow-hidden flex flex-col sm:flex-row items-center justify-between gap-6">
        {/* Decorative corner glows */}
        <div className="absolute top-0 right-0 w-24 h-24 bg-red-600/5 rounded-full blur-xl" />
        <div className="absolute bottom-0 left-0 w-24 h-24 bg-blue-600/5 rounded-full blur-xl" />
        
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-red-400 shrink-0 mt-1">
            <Clock size={22} className="animate-pulse" />
          </div>
          <div>
            <h4 className="font-display font-bold text-white text-lg tracking-wide">Start Your Cinema Session!</h4>
            <p className="text-sm text-gray-400 max-w-lg mt-1">
              No movies currently in your active history stream. Launch any film to start tracking your timestamps automatically.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 px-4 py-2.5 rounded-full bg-white/5 border border-white/5 text-xs text-gray-400 font-medium">
          <Sparkles size={13} className="text-amber-400 animate-spin" />
          <span>Real-time persistence active</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse" />
          <h3 className="font-display font-black text-white text-lg sm:text-xl uppercase tracking-wider">
            Resume Watching
          </h3>
          <span className="text-xs text-gray-500 font-mono">({list.length} in progress)</span>
        </div>

        <button
          onClick={handleClearHistory}
          className="text-xs font-semibold text-gray-400 hover:text-red-400 transition-colors flex items-center gap-1.5 focus:outline-none"
        >
          <Trash2 size={13} />
          <span>Reset History</span>
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {list.map((item) => (
          <div
            key={item.title}
            onClick={() => onResumeMovie(item.title)}
            className="group relative rounded-2xl glass-card hover:bg-neutral-900/60 transition-all duration-300 border border-white/5 overflow-hidden cursor-pointer flex gap-4 p-3 relative"
          >
            {/* Poster Thumbnail */}
            <div className="w-16 h-20 sm:w-20 sm:h-24 rounded-lg overflow-hidden shrink-0 relative bg-neutral-800">
              <img
                src={item.image}
                alt={item.title}
                referrerPolicy="no-referrer"
                className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
              />
              <div className="absolute inset-0 bg-black/40 flex items-center justify-center group-hover:bg-black/20 transition-all">
                <div className="w-8 h-8 rounded-full bg-red-600 font-bold text-white flex items-center justify-center scale-90 group-hover:scale-100 transition-transform">
                  <Play size={12} fill="currentColor" className="ml-0.5" />
                </div>
              </div>
            </div>

            {/* Watch Progress details */}
            <div className="flex-1 flex flex-col justify-between py-1 min-w-0">
              <div>
                <h4 className="font-display font-bold text-sm text-white line-clamp-1 group-hover:text-red-400 transition-colors">
                  {item.movieName}
                </h4>
                <div className="flex items-center gap-2 text-[11px] text-gray-500 mt-0.5">
                  <span className="uppercase font-mono bg-white/5 text-gray-400 px-1 py-0.2 rounded border border-white/5">
                    {item.quality}
                  </span>
                  <span>•</span>
                  <span>{item.lastPlayed}</span>
                </div>
              </div>

              {/* Graphical Progress Meters */}
              <div className="space-y-1 pr-6">
                <div className="flex items-center justify-between text-[11px] font-mono text-gray-400">
                  <span>Progress</span>
                  <span className="text-red-400 font-bold">{item.percent}%</span>
                </div>
                {/* Horizontal slide bar */}
                <div className="h-1 bg-white/10 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-red-500 transition-all duration-300"
                    style={{ width: `${item.percent}%` }}
                  />
                </div>
              </div>
            </div>

            {/* Delete/Delete Progress node */}
            <button
              onClick={(e) => handleRemoveOne(item.title, e)}
              className="absolute right-2 top-2 p-1.5 opacity-100 md:opacity-0 md:group-hover:opacity-100 hover:bg-white/5 text-gray-400 hover:text-red-400 rounded-lg transition-all"
              title="Remove Item"
            >
              <Trash2 size={13} />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
