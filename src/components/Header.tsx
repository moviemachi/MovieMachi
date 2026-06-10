import { Search, Flame, Clock, Heart, PlusCircle, Tv, Sun, Moon } from "lucide-react";

interface HeaderProps {
  searchQuery: string;
  onSearchChange: (val: string) => void;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  totalCount: number;
  theme: "dark" | "light";
  onThemeToggle: () => void;
}

export default function Header({ 
  searchQuery, 
  onSearchChange, 
  activeTab, 
  setActiveTab, 
  totalCount,
  theme,
  onThemeToggle
}: HeaderProps) {
  return (
    <header className="sticky top-0 z-40 w-full transition-all duration-300">
      {/* Outer blurred glass panel */}
      <div className="w-full bg-[#0a0a0f]/80 backdrop-blur-md border-b border-white/5 py-2.5 sm:py-4 px-3 sm:px-6 md:px-8">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center md:justify-between gap-3 md:gap-4">
          
          {/* Logo Brand presentation section */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5 cursor-pointer shrink-0" onClick={() => setActiveTab("all")}>
              <img 
                src="/moviemachi_logo.png" 
                alt="MovieMachi Logo" 
                className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl object-cover shadow-[0_0_15px_rgba(239,68,68,0.4)] border border-red-500/40"
                referrerPolicy="no-referrer"
              />
              <div>
                <span className="font-display font-black text-lg sm:text-2xl text-white tracking-wide">
                  Movie<span className="text-red-500 text-neon-red">Machi</span>
                </span>
                <span className="text-[8px] sm:text-[9px] font-mono block text-gray-500 tracking-wider">PREMIUM TAMIL CINEMA PORTAL</span>
              </div>
            </div>

            {/* Micro pill displaying cumulative count on smaller viewports */}
            <div className="md:hidden text-[10px] sm:text-xs font-mono font-bold text-red-400 bg-red-950/40 border border-red-900/45 px-2.5 py-1 rounded-full uppercase">
              {totalCount} Available
            </div>
          </div>

          {/* Floating dynamic search block with focal glows */}
          <div className="relative flex-1 max-w-lg mx-auto w-full group">
            <div className="absolute inset-0 bg-gradient-to-r from-red-600/10 to-blue-600/10 rounded-2xl blur-md opacity-0 group-focus-within:opacity-100 transition-opacity duration-300" />
            
            <div className="relative flex items-center">
              <Search className="absolute left-3.5 text-gray-500 group-focus-within:text-red-400 transition-colors" size={16} />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => onSearchChange(e.target.value)}
                placeholder="Search movies, actors, directors or genres..."
                className="w-full pl-10 pr-4 py-2.5 sm:py-3 bg-white/4 focus:bg-[#0f0f18] text-white placeholder-gray-500 text-xs sm:text-sm rounded-2xl border border-white/5 focus:border-red-500/40 outline-none transition-all duration-300"
              />
              {searchQuery && (
                <button
                  onClick={() => onSearchChange("")}
                  className="absolute right-3 px-2 py-1 text-[9px] sm:text-[10px] uppercase font-mono font-bold bg-white/10 hover:bg-white/20 text-gray-300 rounded"
                >
                  Clear
                </button>
              )}
            </div>
          </div>

          {/* Catalog Tab selections with matching indicators */}
          <div className="flex items-center justify-start md:justify-end gap-1.5 sm:gap-2 overflow-x-auto scrollbar-none w-full md:w-auto pb-1 md:pb-0 px-4 md:px-0 -mx-3 md:mx-0 shrink-0">
            
            <button
              onClick={() => setActiveTab("all")}
              className={`px-3 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all duration-300 flex items-center gap-1.5 border shrink-0 ${
                activeTab === "all"
                  ? "bg-red-600/15 text-red-400 border-red-500/30 shadow-[0_0_12px_rgba(239,68,68,0.15)]"
                  : "bg-transparent text-gray-400 hover:text-white border-transparent"
              }`}
            >
              <Flame size={14} />
              <span>All Movies</span>
            </button>

            <button
              onClick={() => setActiveTab("watching")}
              className={`px-3 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all duration-300 flex items-center gap-1.5 border shrink-0 ${
                activeTab === "watching"
                  ? "bg-red-600/15 text-red-400 border-red-500/30"
                  : "bg-transparent text-gray-400 hover:text-white border-transparent"
              }`}
            >
              <Clock size={14} />
              <span>History</span>
            </button>

            <button
              onClick={() => setActiveTab("watchlist")}
              className={`px-3 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all duration-300 flex items-center gap-1.5 border shrink-0 ${
                activeTab === "watchlist"
                  ? "bg-red-600/15 text-red-400 border-red-500/30"
                  : "bg-transparent text-gray-400 hover:text-white border-transparent"
              }`}
            >
              <Heart size={14} />
              <span>Watchlist</span>
            </button>

            <button
              onClick={() => setActiveTab("requests")}
              className={`px-3 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all duration-300 flex items-center gap-1.5 border shrink-0 ${
                activeTab === "requests"
                  ? "bg-red-600/15 text-red-400 border-red-500/30"
                  : "bg-transparent text-gray-400 hover:text-white border-transparent"
              }`}
            >
              <PlusCircle size={14} />
              <span>Request Arena</span>
            </button>

            {/* Theme toggle button */}
            <button
              onClick={onThemeToggle}
              id="theme-toggler"
              className="p-2 ml-1 rounded-xl bg-white/4 hover:bg-white/10 text-gray-400 hover:text-white border border-white/5 hover:border-white/10 transition-all duration-300 flex items-center justify-center shrink-0 cursor-pointer active:scale-95 shadow-md"
              title={theme === "light" ? "Switch to Dark Cinema" : "Switch to Light Cinema"}
            >
              {theme === "light" ? (
                <Moon size={14} className="text-indigo-600" />
              ) : (
                <Sun size={14} className="text-amber-400 animate-pulse" />
              )}
            </button>

          </div>

        </div>
      </div>
    </header>
  );
}
