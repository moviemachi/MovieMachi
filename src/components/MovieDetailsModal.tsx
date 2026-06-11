import React from "react";
import { X, Download, Star, Film, User, Tag, Play } from "lucide-react";
import { Movie } from "../types";
import { motion, AnimatePresence } from "motion/react";

interface MovieDetailsModalProps {
  movie: Movie | null;
  onClose: () => void;
  onWatch: (movie: Movie) => void;
}

export default function MovieDetailsModal({
  movie,
  onClose,
  onWatch
}: MovieDetailsModalProps) {
  if (!movie) return null;

  const numericRating = movie.rating ? movie.rating.replace("/10", "") : "8.5";

  // Match the links helper
  const qualities = ["360P", "720P", "1080P", "4K"];
  const availableQualityRows = qualities
    .map(q => {
      let matchedLink = null;
      if (q === "360P") {
        matchedLink = movie.links?.find(l => l && ((l.label && l.label.toLowerCase().includes("360")) || l.className === "p360" || l.className === "p360p"));
      } else if (q === "720P") {
        matchedLink = movie.links?.find(l => l && ((l.label && l.label.toLowerCase().includes("720")) || l.className === "p720" || l.className === "p720p"));
      } else if (q === "1080P") {
        matchedLink = movie.links?.find(l => l && ((l.label && l.label.toLowerCase().includes("1080")) || l.className === "p1080" || l.className === "p1080p"));
      } else if (q === "4K") {
        matchedLink = movie.links?.find(l => l && ((l.label && (l.label.toLowerCase().includes("4k") || l.label.toLowerCase().includes("2160"))) || l.className === "K4" || l.className === "4k" || l.className === "4K"));
      }
      return { quality: q, link: matchedLink };
    })
    .filter(row => row.link !== undefined && row.link !== null);

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
        {/* Blurred backdrop layer */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 bg-[#020205]/90 backdrop-blur-md"
        />

        {/* Modal Window Container */}
        <motion.div
          initial={{ opacity: 0, scale: 0.93, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.93, y: 15 }}
          transition={{ duration: 0.3, ease: "easeOut" }}
          className="relative w-full max-w-4xl rounded-3xl bg-[#09090f] border border-white/8 shadow-[0_25px_60px_rgba(239,68,68,0.15)] overflow-hidden z-10 flex flex-col md:flex-row max-h-[90vh] md:max-h-[85vh]"
        >
          {/* Close trigger button */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 z-40 p-2 rounded-xl bg-black/60 hover:bg-neutral-800 text-gray-400 hover:text-white border border-white/5 cursor-pointer active:scale-90 transition-all shadow-md"
            aria-label="Close"
          >
            <X size={16} />
          </button>

          {/* Left panel: Media details with poster blur cover */}
          <div className="w-full md:w-2/5 relative shrink-0 overflow-hidden min-h-[180px] md:min-h-0 bg-neutral-900 flex flex-col justify-end p-5 md:p-6 border-b md:border-b-0 md:border-r border-white/5">
            <img
              src={movie.image}
              alt={movie.movieName}
              referrerPolicy="no-referrer"
              className="absolute inset-0 w-full h-full object-cover opacity-80"
            />
            
            {/* Dark gradient overlay for typography safety */}
            <div className="absolute inset-0 bg-gradient-to-t from-[#09090f] via-[#09090fd0] to-transparent md:bg-gradient-to-t md:from-[#09090f] md:via-[#09090f90] md:to-[#000000a0]" />

            {/* Dynamic details */}
            <div className="relative z-10 space-y-3.5">
              <span className="text-[9px] uppercase font-mono font-extrabold bg-red-650 text-white px-2 py-0.5 rounded shadow">
                MOVIE PRINT
              </span>

              <div className="space-y-1">
                <h3 className="font-display font-black text-xl md:text-2xl text-white tracking-tight leading-tight">
                  {movie.movieName}
                </h3>
              </div>

              <div className="flex items-center gap-1.5 flex-wrap">
                <div className="flex items-center gap-1 px-1.5 py-0.5 bg-[#00000090] text-amber-400 rounded-lg text-[10px] font-bold font-mono border border-white/5">
                  <Star size={10} fill="currentColor" />
                  <span>{numericRating}</span>
                </div>
                <div className="text-[10px] text-stone-400 bg-white/5 border border-white/5 px-2 py-0.5 rounded font-mono uppercase font-semibold">
                  {movie.quality}
                </div>
                <div className="text-[10px] text-gray-400 bg-white/5 border border-white/5 px-2 py-0.5 rounded font-mono uppercase font-semibold">
                  {movie.language}
                </div>
              </div>

              {/* Extended Credits listing */}
              <div className="text-xs text-gray-400 space-y-1.5 border-t border-white/5 pt-3">
                <p className="flex items-center gap-1.5 truncate">
                  <User size={12} className="text-stone-600 shrink-0" />
                  <span className="text-stone-500">Director:</span>
                  <span className="text-stone-200 font-medium truncate">{movie.director || "Not Specified"}</span>
                </p>
                <p className="flex items-center gap-1.5 truncate">
                  <Film size={12} className="text-stone-600 shrink-0" />
                  <span className="text-stone-500">Starring:</span>
                  <span className="text-stone-200 font-medium truncate">{movie.starring || "Not Specified"}</span>
                </p>
                <div className="flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-white/3 border border-white/5 w-fit max-w-full">
                  <Tag size={10} className="text-rose-500" />
                  <span className="text-[9.5px] font-mono tracking-wider text-gray-400 uppercase font-black truncate">
                    {movie.genres ? movie.genres.join(" • ") : "Movie"}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Right panel: Scannable download selector list */}
          <div className="w-full md:w-3/5 flex flex-col p-5 md:p-6 overflow-hidden bg-[#050508]/40 justify-center">
            
            {/* Watch Online Button at top of Right Side if url exists (Watch Online Now heading) */}
            {movie.watchUrl && movie.watchUrl.trim() !== "" && (
              <div className="mb-5 pb-5 border-b border-white/5 shrink-0">
                <h4 className="font-display font-extrabold text-[#fff] text-xs uppercase tracking-wider mb-2.5">
                  Watch Online Now
                </h4>
                <button
                  onClick={() => {
                    onWatch(movie);
                    onClose();
                  }}
                  className="w-full py-3 px-4 rounded-2xl bg-gradient-to-r from-red-650 to-rose-650 hover:brightness-110 active:scale-97 text-white text-xs sm:text-sm font-bold font-sans flex items-center justify-center gap-2 cursor-pointer shadow-[0_4px_15px_rgba(239,68,68,0.25)] border border-red-500/15 transition-all text-center"
                >
                  <Play size={14} fill="currentColor" />
                  <span>Stream Video Player</span>
                </button>
              </div>
            )}

            <div className="pb-3 border-b border-white/5 mb-3 shrink-0">
              <h4 className="font-display font-extrabold text-[#fff] text-sm uppercase tracking-wider">
                Downloads
              </h4>
            </div>

            {/* List panel */}
            <div className="flex-1 overflow-y-auto pr-1 space-y-2.5 scroll-smooth max-h-[40vh] md:max-h-none">
              {availableQualityRows.length > 0 ? (
                availableQualityRows.map(({ quality, link }) => {
                  if (!link) return null;
                  return (
                    <div
                      key={quality}
                      className="p-3.5 rounded-2xl bg-[#0b0b11] border border-white/5 hover:border-[#ff2d55]/30 hover:bg-[#ff2d55]/3 transition-all flex items-center justify-between gap-3 group/ep"
                    >
                      <div className="min-w-0 flex-1 flex items-center gap-3">
                        <div className="w-11 h-9 rounded-xl bg-gradient-to-br from-[#1c1c28] to-[#0d0d14] border border-white/5 group-hover/ep:border-[#ff2d55]/30 flex items-center justify-center shrink-0">
                          <span className="text-[10px] font-mono font-black text-rose-500 group-hover/ep:scale-105 transition-transform">
                            {quality}
                          </span>
                        </div>
                        <div>
                          <p className="text-xs sm:text-sm font-semibold text-gray-300 group-hover/ep:text-white transition-colors">
                            {quality} Resolution
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        <a
                          href={link.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-4 py-2 rounded-xl bg-white/5 hover:bg-neutral-800 text-gray-300 hover:text-white border border-white/10 text-xs font-semibold flex items-center gap-1.5 transition-all active:scale-95 cursor-pointer leading-5 select-none"
                        >
                          <Download size={12} />
                          <span>Download</span>
                        </a>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="text-center py-12 text-stone-500 text-xs font-bold uppercase tracking-widest border border-dashed border-white/5 rounded-2xl bg-[#0b0b11] select-none">
                  No Download Quality Available
                </div>
              )}
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
