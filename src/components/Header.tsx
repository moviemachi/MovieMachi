import { Search, Flame, Clock, Heart, PlusCircle, Tv, Sun, Moon, Bell, BellRing, X, Check, Inbox } from "lucide-react";
import { useState } from "react";
import { AppNotification } from "../types";

interface HeaderProps {
  searchQuery: string;
  onSearchChange: (val: string) => void;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  totalCount: number;
  theme: "dark" | "light";
  onThemeToggle: () => void;
  notifications: AppNotification[];
  onMarkNotificationRead: (id: string) => void;
  onDismissNotification: (id: string) => void;
  onPlayMovieTitle: (title: string) => void;
}

function formatNotifTime(createdAt: number): string {
  if (!createdAt) return "Just now";
  const diffMs = Date.now() - createdAt;
  const diffMins = Math.floor(diffMs / 60000);
  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  return new Date(createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export default function Header({ 
  searchQuery, 
  onSearchChange, 
  activeTab, 
  setActiveTab, 
  totalCount,
  theme,
  onThemeToggle,
  notifications,
  onMarkNotificationRead,
  onDismissNotification,
  onPlayMovieTitle
}: HeaderProps) {
  const [isNotifOpen, setIsNotifOpen] = useState(false);

  const unreadCount = notifications.filter(n => !n.isRead).length;
  const sortedNotifications = [...notifications].sort((a, b) => b.createdAt - a.createdAt);
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
          <div className="flex items-center justify-between md:justify-end gap-3 w-full md:w-auto shrink-0">
            {/* Scrollable tabs list */}
            <div className="flex items-center justify-start gap-1.5 sm:gap-2 overflow-x-auto scrollbar-none flex-1 md:flex-initial pb-1 md:pb-0">
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
            </div>

            {/* Non-scrollable controls container */}
            <div className="flex items-center gap-1.5 shrink-0 relative">
              {/* Premium Actionable Notification Bell Component */}
              <div className="relative">
                <button
                  type="button"
                  onClick={() => {
                    setIsNotifOpen(!isNotifOpen);
                  }}
                  className={`p-2 rounded-xl transition-all duration-300 flex items-center justify-center shrink-0 cursor-pointer active:scale-95 shadow-md border ${
                    isNotifOpen 
                      ? "bg-red-600/20 text-white border-red-500/40" 
                      : "bg-white/4 hover:bg-white/10 text-gray-400 hover:text-white border-white/5 hover:border-white/10"
                  }`}
                  title="Notifications"
                >
                  {unreadCount > 0 ? (
                    <div className="relative">
                      <BellRing size={14} className="text-red-500 animate-[bounce_1.5s_infinite]" />
                      <span className="absolute -top-1.5 -right-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-red-600 text-[9px] font-bold text-white shadow-[0_0_8px_rgba(220,38,38,0.8)] leading-none">
                        {unreadCount}
                      </span>
                    </div>
                  ) : (
                    <Bell size={14} />
                  )}
                </button>

                {/* Real-time Notifications Popover Dropdown */}
                {isNotifOpen && (
                  <div className="absolute right-0 mt-3.5 w-72 sm:w-80 rounded-2xl border border-white/10 bg-[#0f0f18]/95 backdrop-blur-xl shadow-2xl p-4 z-50 animate-in fade-in slide-in-from-top-3 duration-300 select-text overflow-hidden">
                    <div className="flex items-center justify-between pb-2 mb-2 border-b border-white/5">
                      <span className="text-xs font-mono font-bold text-white uppercase tracking-wider">
                        Request Alerts
                      </span>
                      {unreadCount > 0 && (
                        <span className="text-[10px] text-red-400 font-semibold bg-red-500/10 px-2 py-0.5 rounded-full border border-red-500/10">
                          {unreadCount} New
                        </span>
                      )}
                    </div>

                    <div className="max-h-64 overflow-y-auto space-y-2.5 pr-1 scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent">
                      {sortedNotifications.length === 0 ? (
                        <div className="py-8 flex flex-col items-center justify-center text-center gap-2">
                          <Inbox size={20} className="text-stone-600" />
                          <span className="text-[11px] font-sans text-stone-500 font-medium">
                            Nothing here yet
                          </span>
                        </div>
                      ) : (
                        sortedNotifications.map((notif) => (
                          <div 
                            key={notif.id} 
                            className={`relative group p-2.5 rounded-xl border transition-all flex flex-col gap-1.5 ${
                              notif.isRead 
                                ? "bg-white/2 border-white/3" 
                                : "bg-red-950/10 hover:bg-red-950/20 border-red-500/10 hover:border-red-500/20"
                            }`}
                          >
                            <div className="flex items-start justify-between gap-2">
                              <span 
                                onClick={() => {
                                  if (notif.movieTitle) {
                                    onPlayMovieTitle(notif.movieTitle);
                                    setIsNotifOpen(false);
                                  }
                                  if (!notif.isRead) {
                                    onMarkNotificationRead(notif.id);
                                  }
                                }}
                                className={`text-[11px] font-sans leading-snug cursor-pointer text-left hover:text-red-400 transition-colors ${
                                  notif.isRead ? "text-stone-400" : "text-white font-medium"
                                }`}
                              >
                                {notif.message}
                              </span>
                              <div className="flex items-center gap-1 shrink-0 opacity-80 md:opacity-0 group-hover:opacity-100 transition-opacity">
                                {!notif.isRead && (
                                  <button
                                    onClick={() => onMarkNotificationRead(notif.id)}
                                    className="p-1 rounded bg-white/5 hover:bg-white/10 text-emerald-400 transition-colors cursor-pointer"
                                    title="Mark as read"
                                  >
                                    <Check size={11} />
                                  </button>
                                )}
                                <button
                                  onClick={() => onDismissNotification(notif.id)}
                                  className="p-1 rounded bg-white/5 hover:bg-white/10 text-stone-400 hover:text-red-400 transition-colors cursor-pointer"
                                  title="Dismiss notification"
                                >
                                  <X size={11} />
                                </button>
                              </div>
                            </div>
                            
                            <div className="flex items-center justify-between mt-1 pt-1 border-t border-white/5">
                              {!notif.isRead ? (
                                <div className="flex items-center gap-1">
                                  <span className="h-1.5 w-1.5 rounded-full bg-red-500 animate-pulse shadow-sm" />
                                  <span className="text-[9px] font-mono text-red-400 font-semibold tracking-wider uppercase">Unread</span>
                                </div>
                              ) : (
                                <span className="text-[9px] font-mono text-stone-500 uppercase tracking-wider">Read</span>
                              )}
                              <span className="text-[9px] font-mono text-stone-500">{formatNotifTime(notif.createdAt)}</span>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Theme toggle button */}
              <button
                onClick={onThemeToggle}
                id="theme-toggler"
                className="p-2 rounded-xl bg-white/4 hover:bg-white/10 text-gray-400 hover:text-white border border-white/5 hover:border-white/10 transition-all duration-300 flex items-center justify-center shrink-0 cursor-pointer active:scale-95 shadow-md"
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
      </div>
    </header>
  );
}
