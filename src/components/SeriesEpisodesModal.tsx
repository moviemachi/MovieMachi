import React from "react";
import { X, Play, Download, Star, Calendar, Film, User, Tag } from "lucide-react";
import { Movie, Series } from "../types";
import { motion, AnimatePresence } from "motion/react";

interface SeriesEpisodesModalProps {
  series: Movie | Series | null; // Keeps backward compatibility with App.tsx prop name
  onClose: () => void;
  onPlayEpisode?: (series: Series, episodeNum: number) => void;
  onDownloadEpisode?: (series: Series, episodeNum: number) => void;
  onWatchMovie?: (movie: Movie) => void;
}

export default function SeriesEpisodesModal({
  series,
  onClose,
  onPlayEpisode,
  onDownloadEpisode,
  onWatchMovie
}: SeriesEpisodesModalProps) {
  if (!series) return null;

  // Type guard check to detect if the selected item is a TV Series
  const isSeries = "type" in series && series.type === "series";

  // Shared metadata helpers
  const numericRating = series.rating ? series.rating.replace("/10", "") : "8.5";
  const image = series.image;
  const titleName = isSeries ? (series as Series).seriesName : (series as Movie).movieName;
  const director = series.director || "Not Specified";
  const starring = series.starring || "Not Specified";
  const genres = series.genres || [];
  const quality = series.quality || "Original HD";
  const language = series.language || "English";

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
        {/* Blurred backdrop layer */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 bg-[#020205]/95 backdrop-blur-md"
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
          <div className="w-full md:w-2/5 relative shrink-0 overflow-hidden min-h-[200px] md:min-h-0 bg-neutral-900 flex flex-col justify-end p-5 md:p-6 border-b md:border-b-0 md:border-r border-white/5">
            <img
              src={image}
              alt={titleName}
              referrerPolicy="no-referrer"
              className="absolute inset-0 w-full h-full object-cover opacity-80"
              loading="lazy"
            />
            
            {/* Dark gradient overlay for typography safety */}
            <div className="absolute inset-0 bg-gradient-to-t from-[#09090f] via-[#09090fd0] to-transparent md:bg-gradient-to-t md:from-[#09090f] md:via-[#09090f90] md:to-[#000000a0]" />

            {/* Dynamic details */}
            <div className="relative z-10 space-y-3.5">
              <span className="text-[9px] uppercase font-mono font-extrabold bg-red-650 text-white px-2 py-0.5 rounded shadow">
                {isSeries ? "OTT SERIES PRINT" : "OTT MOVIE PRINT"}
              </span>

              <div className="space-y-1">
                <h3 className="font-display font-black text-xl md:text-2xl text-white tracking-tight leading-tight">
                  {titleName}
                </h3>
                {isSeries && (
                  <p className="text-xs sm:text-sm text-red-400 font-bold">
                    Season {(series as Series).seasonNumber}
                  </p>
                )}
              </div>

              <div className="flex items-center gap-1.5 flex-wrap">
                <div className="flex items-center gap-1 px-1.5 py-0.5 bg-[#00000090] text-amber-400 rounded-lg text-[10px] font-bold font-mono border border-white/5">
                  <Star size={10} fill="currentColor" />
                  <span>{numericRating}</span>
                </div>
                <div className="text-[10px] text-stone-400 bg-white/5 border border-white/5 px-2 py-0.5 rounded font-mono uppercase font-semibold">
                  {quality}
                </div>
                <div className="text-[10px] text-gray-400 bg-white/5 border border-white/5 px-2 py-0.5 rounded font-mono uppercase font-semibold">
                  {language}
                </div>
              </div>

              {/* Extended Credits listing */}
              <div className="text-xs text-gray-400 space-y-1.5 border-t border-white/5 pt-3">
                <p className="flex items-center gap-1.5 truncate">
                  <User size={12} className="text-stone-600 shrink-0" />
                  <span className="text-stone-500">Director:</span>
                  <span className="text-stone-200 font-medium truncate">{director}</span>
                </p>
                <p className="flex items-center gap-1.5 truncate">
                  <Film size={12} className="text-stone-600 shrink-0" />
                  <span className="text-stone-500">Starring:</span>
                  <span className="text-stone-200 font-medium truncate">{starring}</span>
                </p>
                <div className="flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-white/3 border border-white/5 w-fit max-w-full">
                  <Tag size={10} className="text-rose-500 font-bold shrink-0" />
                  <span className="text-[9.5px] font-mono tracking-wider text-gray-400 uppercase font-black truncate">
                    {genres.length > 0 ? genres.join(" • ") : "Show"}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Right panel: Downloads list */}
          <div className="w-full md:w-3/5 flex flex-col p-5 md:p-6 overflow-hidden bg-[#050508]/40">
            <div className="pb-3 border-b border-white/5 mb-3">
              <h4 className="font-display font-extrabold text-[#fff] text-sm uppercase tracking-wider">
                {isSeries ? "Episodes" : "Available Quality Anchors"}
              </h4>
              <p className="text-[11px] text-stone-400">
                {isSeries
                  ? "Select an episode download stream to launch premium file copy queue."
                  : "Pick a premium resolution server to trigger instant direct download or web streaming."}
              </p>
            </div>

            {/* List panel */}
            <div className="flex-1 overflow-y-auto pr-1 space-y-3 scroll-smooth max-h-[40vh] md:max-h-none scrollbar-none">
              
              {isSeries ? (
                // Series Episodes view
                (series as Series).episodes && (series as Series).episodes.length > 0 ? (
                  (series as Series).episodes.map((ep) => {
                    const epNum = ep.episodeNumber || ep.episode || 1;
                    const hasUrl = ep.downloadUrl && ep.downloadUrl.trim() !== "";
                    
                    return (
                      <div
                        key={epNum}
                        className="w-full flex items-center justify-between p-4 rounded-2xl bg-[#0b0b11] border border-white/5 font-sans select-none"
                      >
                        <span className="text-sm font-semibold text-gray-200">
                          Episode {epNum}
                        </span>
                        {hasUrl ? (
                          <button
                            onClick={() => {
                              if (onDownloadEpisode) onDownloadEpisode(series as Series, epNum);
                            }}
                            className="px-5 py-2 text-xs font-semibold rounded-xl bg-gradient-to-r from-red-650 to-rose-650 hover:brightness-110 active:scale-97 text-white shadow-md cursor-pointer transition-all flex items-center gap-1.5"
                          >
                            <Download size={14} />
                            <span>Download</span>
                          </button>
                        ) : (
                          <button
                            disabled
                            className="px-5 py-2 text-xs font-semibold rounded-xl bg-neutral-900 text-stone-600 border border-white/5 cursor-not-allowed transition-all flex items-center gap-1.5"
                          >
                            <span>Coming Soon</span>
                          </button>
                        )}
                      </div>
                    );
                  })
                ) : (
                  <div className="text-center py-12 text-stone-500 text-xs font-bold uppercase tracking-widest border border-dashed border-white/5 rounded-2xl bg-black/10 select-none">
                    No Episodes Added Yet
                  </div>
                )
              ) : (
                // Movie download structures (Left: watch / Right: dynamic resolution links)
                <div className="space-y-3">
                  
                  {/* Watch Online Now Premium Row (only show if watchUrl exists) */}
                  {(series as Movie).watchUrl && (series as Movie).watchUrl!.trim() !== "" && (
                    <button
                      onClick={() => {
                        onClose();
                        if (onWatchMovie) onWatchMovie(series as Movie);
                      }}
                      className="w-full flex items-center justify-between p-4 rounded-2xl bg-[#ff2d55]/10 hover:bg-[#ff2d55]/20 border border-[#ff2d55]/30 hover:border-[#ff2d55]/50 hover:shadow-[0_0_20px_rgba(255,45,85,0.25)] transition-all cursor-pointer group/watch font-sans select-none"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-[#ff2d55]/10 flex items-center justify-center shrink-0 border border-[#ff2d55]/20">
                          <Play size={14} fill="currentColor" className="text-rose-500 ml-0.5 group-hover/watch:scale-110 transition-transform" />
                        </div>
                        <span className="text-xs sm:text-sm font-bold text-white transition-colors">
                          Watch Online Now
                        </span>
                      </div>
                      <span className="text-[10px] font-mono uppercase bg-rose-600 px-2.5 py-1 rounded text-white select-none shadow">
                        Stream Full
                      </span>
                    </button>
                  )}

                  {/* High fidelity quality mirrors */}
                  {(series as Movie).links && (series as Movie).links.length > 0 ? (
                    (series as Movie).links.map((link, idx) => {
                      // Normalize label names strictly to (360P / 720P / 1080P / 4K) format requested
                      const rawLabel = link.label || "";
                      let formattedLabel = rawLabel || "Download Link";
                      const normLabel = rawLabel.toLowerCase();
                      const normClass = (link.className || "").toLowerCase();

                      if (normClass === "p480" || normLabel.includes("360p") || normLabel.includes("480p")) {
                        formattedLabel = "360P Download";
                      } else if (normClass === "p720" || normLabel.includes("720p")) {
                        formattedLabel = "720P Download";
                      } else if (normClass === "p1080" || normLabel.includes("1080p")) {
                        formattedLabel = "1080P Download";
                      } else if (normClass === "k4" || normLabel.includes("4k") || normLabel.includes("2160p")) {
                        formattedLabel = "4K Download";
                      }

                      const is4k = normClass === "k4" || normLabel.includes("4k") || normLabel.includes("2160p");
                      const is1080 = normClass === "p1080" || normLabel.includes("1080p");
                      const is720 = normClass === "p720" || normLabel.includes("720p");

                      return (
                        <a
                          key={idx}
                          href={link.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className={`w-full flex items-center justify-between p-4 rounded-2xl border transition-all hover:-translate-y-0.5 cursor-pointer font-sans select-none ${
                            is4k
                              ? "bg-amber-500/10 hover:bg-amber-500/15 text-amber-350 border-amber-500/30 hover:shadow-[0_0_15px_rgba(245,158,11,0.2)]"
                              : is1080
                              ? "bg-[#ff2d55]/10 hover:bg-[#ff2d55]/15 text-[#ff2d55] border-[#ff2d55]/30 hover:shadow-[0_0_15px_rgba(255,45,85,0.2)]"
                              : is720
                              ? "bg-blue-600/10 hover:bg-blue-600/15 text-blue-400 border-blue-500/30"
                              : "bg-[#0b0b11] hover:bg-white/5 text-gray-300 hover:text-white border-white/5"
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                              is4k ? "bg-amber-500/10" : is1080 ? "bg-[#ff2d55]/10" : is720 ? "bg-blue-600/10" : "bg-white/5"
                            }`}>
                              <Download size={14} className={
                                is4k ? "text-amber-400" : is1080 ? "text-rose-500" : is720 ? "text-blue-400" : "text-gray-400"
                              } />
                            </div>
                            <span className="text-xs sm:text-sm font-bold">
                              {formattedLabel}
                            </span>
                          </div>
                          <span className={`text-[10px] font-mono uppercase bg-black hover:bg-neutral-900 border px-2.5 py-1 rounded select-none ${
                            is4k ? "border-amber-500/20 text-amber-400" : is1080 ? "border-[#ff2d55]/20 text-[#ff2d55]" : is720 ? "border-blue-500/20 text-blue-400" : "border-white/5 text-gray-400"
                          }`}>
                            {link.className || "Link"}
                          </span>
                        </a>
                      );
                    })
                  ) : (
                    <div className="py-12 text-center text-stone-500 text-xs font-bold uppercase tracking-widest border border-dashed border-white/5 rounded-2xl bg-black/10 select-none">
                      No Download Quality Anchors Listed.
                    </div>
                  )}

                </div>
              )}

            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
