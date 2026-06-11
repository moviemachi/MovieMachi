import React from "react";
import { Play, Download, Star, Calendar, User, Film, Heart } from "lucide-react";
import { Movie } from "../types";

interface MovieCardProps {
  movie: Movie;
  onWatch: (movie: Movie) => void;
  onDownload: (movie: Movie) => void;
  isFavorite?: boolean;
  onToggleFavorite?: (movie: Movie) => void;
  onPlayTrailer?: (movie: Movie) => void;
  key?: any;
}

export default function MovieCard({ 
  movie, 
  onWatch, 
  onDownload,
  isFavorite = false,
  onToggleFavorite,
  onPlayTrailer
}: MovieCardProps) {
  // Extract number from rating or default
  const numericRating = movie.rating ? movie.rating.replace("/10", "") : "8.5";

  return (
    <div className="group relative rounded-2xl overflow-hidden glass-card hover:shadow-[0_0_30px_rgba(239,68,68,0.25)] transition-all duration-500 border border-white/6 flex flex-col min-h-[290px] xs:min-h-[340px] sm:min-h-[450px] h-full">
      
      {/* Upper Poster viewport wrapper with scaling */}
      <div className="relative flex-1 overflow-hidden bg-neutral-900 pointer-events-none">
        
        <img
          src={movie.image}
          alt={movie.title}
          referrerPolicy="no-referrer"
          className="w-full h-full object-cover group-hover:scale-108 transition-transform duration-700 ease-out"
          loading="lazy"
        />

        {/* Gradient vignette backdrop overlays for high legibility */}
        <div className="absolute inset-0 bg-gradient-to-t from-[#0e0e15] via-transparent to-[#000000bb] opacity-90" />

        {/* Display metadata badges at top corners */}
        <div className="absolute top-2 left-2 xs:top-3 xs:left-3 flex flex-wrap gap-1 pointer-events-auto z-10">
          
          {/* Quality indicator badge */}
          <span className="text-[8px] xs:text-[10px] font-mono font-extrabold uppercase bg-red-650 text-white px-1.5 py-0.5 rounded shadow-lg border border-red-500/20">
            {movie.quality}
          </span>

          {/* Language badge */}
          {movie.language && (
            <span className="text-[8px] xs:text-[10px] font-mono font-bold uppercase bg-black/60 text-gray-300 px-1.5 py-0.5 rounded shadow-lg border border-white/5">
              {movie.language}
            </span>
          )}

        </div>

        {/* Rating Golden Badge */}
        <div className="absolute top-2 right-2 xs:top-3 xs:right-3 z-10 pointer-events-auto">
          <div className="flex items-center gap-1 px-1.5 py-0.5 bg-[#000000a0] backdrop-blur-md text-amber-400 rounded border border-amber-500/15 shadow-lg text-[9px] xs:text-[11px] font-bold font-mono">
            <Star size={9} fill="currentColor" className="xs:w-[11px] xs:h-[11px]" />
            <span>{numericRating}</span>
          </div>
        </div>

        {/* Favorite/Watchlist Heart Button */}
        {onToggleFavorite && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              e.preventDefault();
              onToggleFavorite(movie);
            }}
            className={`absolute top-10 right-2 xs:top-11 xs:right-3 z-30 p-2 rounded-xl border transition-all duration-300 shadow-md cursor-pointer pointer-events-auto flex items-center justify-center active:scale-90 select-none ${
              isFavorite
                ? "bg-red-500/15 text-red-500 border-red-500/30 shadow-[0_0_15px_rgba(239,68,68,0.25)] hover:bg-red-500/25"
                : "bg-black/70 text-gray-300 border-white/10 hover:bg-black/90 hover:text-white"
            }`}
            aria-label={isFavorite ? "Remove from watchlist" : "Add to watchlist"}
            title={isFavorite ? "Remove from Watchlist" : "Add to Watchlist"}
          >
            <Heart 
              size={11} 
              fill={isFavorite ? "#ef4444" : "transparent"} 
              className={`transition-all duration-300 ease-out transform xs:w-[13px] xs:h-[13px] ${
                isFavorite 
                  ? "text-red-500 scale-115 drop-shadow-[0_0_4px_rgba(239,68,68,0.5)] animate-pulse" 
                  : "text-gray-300 scale-100 hover:scale-110"
              }`}
            />
          </button>
        )}

        {/* Hover overlay showcasing center play trigger icon */}
        <div 
          className="absolute inset-0 bg-black/30 group-hover:bg-black/5 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-auto cursor-pointer" 
          onClick={() => {
            onDownload(movie);
          }}
        >
          <div className="w-10 h-10 xs:w-14 xs:h-14 rounded-full bg-red-650/95 flex items-center justify-center text-white scale-75 group-hover:scale-100 transition-transform duration-300 shadow-[0_0_20px_rgba(239,68,68,0.4)] hover:bg-red-500">
            <Download size={16} className="text-white xs:w-5 xs:h-5" />
          </div>
        </div>

      </div>

      {/* Slide-Up Movie metadata panel */}
      <div className="p-2.5 xs:p-4 sm:p-5 bg-[#0a0a0f] border-t border-white/5 space-y-2 sm:space-y-3 relative z-20 flex flex-col justify-end">
        
        {/* Title and Release date meta information */}
        <div>
          <h4 
            onClick={() => {
              onDownload(movie);
            }}
            className="font-display font-medium text-xs xs:text-sm sm:text-base text-white hover:text-red-400 transition-colors cursor-pointer line-clamp-1 truncate"
          >
            {movie.movieName}
          </h4>
          
          <div className="flex items-center gap-1.5 text-[9px] xs:text-[10px] sm:text-xs text-gray-500 mt-1 font-semibold truncate">
            <Calendar size={11} className="text-gray-500 shrink-0 xs:w-3.5 xs:h-3.5" />
            <span className="truncate">{movie.lastUpdated}</span>
          </div>
        </div>

        {/* Mini Drawer Exposing core Crew (Director, Cast, Action pills) */}
        <div className="space-y-0.5 text-[9.5px] xs:text-[11px] sm:text-xs text-gray-400">
          <div className="flex items-center gap-1 truncate">
            <User size={11} className="text-gray-600 shrink-0 xs:w-3.5 xs:h-3.5" />
            <span className="text-gray-500 hidden xs:inline">Director: </span>
            <span className="text-gray-300 font-medium truncate">{movie.director || "Not Specified"}</span>
          </div>

          <div className="flex items-center gap-1 truncate">
            <Film size={11} className="text-gray-600 shrink-0 xs:w-3.5 xs:h-3.5" />
            <span className="text-gray-500 hidden xs:inline">Cast: </span>
            <span className="text-gray-300 font-medium truncate">{movie.starring || "Not Specified"}</span>
          </div>
        </div>

        {/* Styled Genre tag chips matrix */}
        <div className="flex flex-wrap gap-0.5 sm:gap-1 pt-0.5 min-h-[16px] sm:min-h-[22px] overflow-hidden">
          {movie.genres && movie.genres.slice(0, 2).map((g, gIdx) => (
            <span 
              key={`${g}-${gIdx}`}
              className="text-[8px] xs:text-[9.5px] font-mono font-medium px-1.5 py-0.5 rounded bg-white/3 text-gray-400 uppercase border border-white/3"
            >
              {g}
            </span>
          ))}
        </div>

        {/* Interactive primary trigger block */}
        <div className="space-y-1.5 sm:space-y-2 pt-1.5 sm:pt-2 border-t border-white/5">
          {movie.trailerUrl && movie.trailerUrl.trim() !== "" && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                e.preventDefault();
                if (onPlayTrailer) onPlayTrailer(movie);
              }}
              className="w-full py-1.5 xs:py-2 rounded-lg sm:rounded-xl bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/25 text-amber-400 font-display text-[9px] xs:text-[10px] sm:text-xs font-bold flex items-center justify-center gap-1 cursor-pointer transition-all active:scale-98 select-none font-semibold"
            >
              <span>🎬 Watch Trailer</span>
            </button>
          )}

          <div className={`${movie.watchUrl && movie.watchUrl.trim() !== "" ? "grid grid-cols-2" : "grid grid-cols-1"} gap-1.5 sm:gap-2`}>
            {movie.watchUrl && movie.watchUrl.trim() !== "" && (
              <button
                onClick={() => onWatch(movie)}
                className="py-1.5 px-2 rounded-lg sm:rounded-xl bg-red-650 hover:bg-red-550 border border-red-500/25 text-white font-display text-[9px] xs:text-[10px] sm:text-xs font-semibold flex items-center justify-center gap-1 cursor-pointer hover:shadow-[0_0_12px_rgba(239,68,68,0.2)] transition-all"
              >
                <Play size={9} fill="currentColor" className="xs:w-3 xs:h-3" />
                <span className="truncate">Watch Online</span>
              </button>
            )}

            <button
              onClick={() => onDownload(movie)}
              className="py-1.5 px-2 rounded-lg sm:rounded-xl bg-white/4 hover:bg-white/10 text-gray-300 hover:text-white border border-white/5 font-display text-[9px] xs:text-[10px] sm:text-xs font-semibold flex items-center justify-center gap-1 cursor-pointer transition-colors"
            >
              <Download size={9} className="xs:w-3 xs:h-3" />
              <span className="truncate">Downloads</span>
            </button>
          </div>
        </div>

      </div>

    </div>
  );
}
