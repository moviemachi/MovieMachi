import React from "react";
import { X, Play, Download, Star, Calendar, Film, User, Tag } from "lucide-react";
import { Series } from "../types";
import { motion, AnimatePresence } from "motion/react";

interface SeriesEpisodesModalProps {
  series: Series | null;
  onClose: () => void;
  onPlayEpisode: (series: Series, episodeNum: number) => void;
  onDownloadEpisode: (series: Series, episodeNum: number) => void;
}

export default function SeriesEpisodesModal({
  series,
  onClose,
  onPlayEpisode,
  onDownloadEpisode
}: SeriesEpisodesModalProps) {
  if (!series) return null;

  const numericRating = series.rating ? series.rating.replace("/10", "") : "8.5";

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
              src={series.image}
              alt={series.seriesName}
              referrerPolicy="no-referrer"
              className="absolute inset-0 w-full h-full object-cover opacity-80"
            />
            
            {/* Dark gradient overlay for typography safety */}
            <div className="absolute inset-0 bg-gradient-to-t from-[#09090f] via-[#09090fd0] to-transparent md:bg-gradient-to-t md:from-[#09090f] md:via-[#09090f90] md:to-[#000000a0]" />

            {/* Dynamic details */}
            <div className="relative z-10 space-y-3.5">
              <span className="text-[9px] uppercase font-mono font-extrabold bg-red-650 text-white px-2 py-0.5 rounded shadow">
                OTT SERIES PRINT
              </span>

              <div className="space-y-1">
                <h3 className="font-display font-black text-xl md:text-2xl text-white tracking-tight leading-tight">
                  {series.seriesName}
                </h3>
                <p className="text-xs sm:text-sm text-red-400 font-bold">
                  Season {series.seasonNumber}
                </p>
              </div>

              <div className="flex items-center gap-1.5 flex-wrap">
                <div className="flex items-center gap-1 px-1.5 py-0.5 bg-[#00000090] text-amber-400 rounded-lg text-[10px] font-bold font-mono border border-white/5">
                  <Star size={10} fill="currentColor" />
                  <span>{numericRating}</span>
                </div>
                <div className="text-[10px] text-stone-400 bg-white/5 border border-white/5 px-2 py-0.5 rounded font-mono uppercase font-semibold">
                  {series.quality}
                </div>
                <div className="text-[10px] text-gray-400 bg-white/5 border border-white/5 px-2 py-0.5 rounded font-mono uppercase font-semibold">
                  {series.language}
                </div>
              </div>

              {/* Extended Credits listing */}
              <div className="text-xs text-gray-400 space-y-1.5 border-t border-white/5 pt-3">
                <p className="flex items-center gap-1.5 truncate">
                  <User size={12} className="text-stone-600 shrink-0" />
                  <span className="text-stone-500">Director:</span>
                  <span className="text-stone-200 font-medium truncate">{series.director || "Not Specified"}</span>
                </p>
                <p className="flex items-center gap-1.5 truncate">
                  <Film size={12} className="text-stone-600 shrink-0" />
                  <span className="text-stone-500">Starring:</span>
                  <span className="text-stone-200 font-medium truncate">{series.starring || "Not Specified"}</span>
                </p>
                <div className="flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-white/3 border border-white/5 w-fit max-w-full">
                  <Tag size={10} className="text-rose-500" />
                  <span className="text-[9.5px] font-mono tracking-wider text-gray-400 uppercase font-black truncate">
                    {series.genres ? series.genres.join(" • ") : "Show"}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Right panel: Scannable episodes selector list */}
          <div className="w-full md:w-3/5 flex flex-col p-5 md:p-6 overflow-hidden bg-[#050508]/40">
            <div className="pb-3 border-b border-white/5 mb-3">
              <h4 className="font-display font-extrabold text-[#fff] text-sm uppercase tracking-wider">
                Browse Episodes Catalog
              </h4>
              <p className="text-[11px] text-stone-400">
                Select an episode below to launch premium video player or get download streams.
              </p>
            </div>

            {/* List panel */}
            <div className="flex-1 overflow-y-auto pr-1 space-y-2.5 scroll-smooth max-h-[40vh] md:max-h-none">
              {series.episodes && series.episodes.length > 0 ? (
                series.episodes.map((ep) => {
                  const hasUrl = ep.downloadUrl && ep.downloadUrl.trim() !== "";
                  return (
                    <div
                      key={ep.episode}
                      className="p-3.5 rounded-2xl bg-[#0b0b11] border border-white/5 hover:border-[#ff2d55]/30 hover:bg-[#ff2d55]/3 transition-all flex items-center justify-between gap-3 group/ep cursor-pointer"
                      onClick={() => {
                        if (hasUrl) {
                          onPlayEpisode(series, ep.episode);
                        }
                      }}
                    >
                      <div className="min-w-0 flex-1 flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#1c1c28] to-[#0d0d14] border border-white/5 group-hover/ep:border-[#ff2d55]/30 flex items-center justify-center shrink-0">
                          <span className="text-[11px] font-mono font-black text-rose-500 group-hover/ep:scale-105 transition-transform">
                            E{ep.episode}
                          </span>
                        </div>
                        <div>
                          <p className="text-xs sm:text-sm font-semibold text-gray-300 group-hover/ep:text-white transition-colors">
                            Episode {ep.episode}
                          </p>
                          <p className="text-[9.5px] font-mono text-gray-500 uppercase tracking-widest font-black">
                            {hasUrl ? "Stream Ready" : "Unreleased/Scheduled"}
                          </p>
                        </div>
                      </div>

                      {hasUrl ? (
                        <div className="flex items-center gap-1.5 shrink-0" onClick={(e) => e.stopPropagation()}>
                          <button
                            onClick={() => onPlayEpisode(series, ep.episode)}
                            className="p-2 sm:px-3 sm:py-1.5 rounded-xl bg-[#ff2d55]/10 group-hover/ep:bg-[#ff2d55]/20 hover:!bg-[#ff2d55] border border-[#ff2d55]/30 hover:border-transparent text-[#ff2d55] hover:text-white text-[10px] sm:text-xs font-bold font-sans flex items-center gap-1 transition-all active:scale-95 cursor-pointer shadow-md"
                            title="Play Episode Stream"
                          >
                            <Play size={10} fill="currentColor" />
                            <span className="hidden sm:inline">Stream</span>
                          </button>
                          <button
                            onClick={() => onDownloadEpisode(series, ep.episode)}
                            className="p-2 sm:px-3 sm:py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-gray-300 hover:text-white border border-white/5 text-[10px] sm:text-xs font-bold font-sans flex items-center gap-1 transition-all active:scale-95 cursor-pointer shadow-md"
                            title="Direct Download Node"
                          >
                            <Download size={10} />
                            <span className="hidden sm:inline">Get</span>
                          </button>
                        </div>
                      ) : (
                        <span className="text-[9px] font-mono text-gray-600 uppercase tracking-widest bg-white/2 border border-white/3 px-2 py-1 rounded">
                          Coming Soon
                        </span>
                      )}
                    </div>
                  );
                })
              ) : (
                <div className="text-center py-12 text-stone-500 text-xs font-bold uppercase tracking-widest border border-dashed border-white/5 rounded-2xl bg-black/10 select-none">
                  No Episodes Added Yet
                </div>
              )}
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
