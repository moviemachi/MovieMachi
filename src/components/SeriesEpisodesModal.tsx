import React from "react";
import { X, Play, Download, Star, Calendar, Film, User, Tag } from "lucide-react";
import { Series } from "../types";
import { motion, AnimatePresence } from "motion/react";
import MarqueeText from "./MarqueeText";

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
            <div className="relative z-10 space-y-3.5 min-w-0 w-full">
              <span className="text-[9px] uppercase font-mono font-extrabold bg-red-650 text-white px-2 py-0.5 rounded shadow w-fit block">
                OTT SERIES PRINT
              </span>

              <div className="space-y-1 min-w-0 w-full">
                <h3 className="font-display font-black text-xl md:text-2xl text-white tracking-tight leading-tight min-w-0 w-full">
                  <MarqueeText text={series.seriesName} />
                </h3>
                <p className="text-xs sm:text-sm text-red-400 font-bold">
                  Season {series.seasonNumber}
                </p>
              </div>

              <div className="flex items-center gap-1.5 flex-wrap min-w-0 w-full">
                <div className="flex items-center gap-1 px-1.5 py-0.5 bg-[#00000090] text-amber-400 rounded-lg text-[10px] font-bold font-mono border border-white/5 shrink-0">
                  <Star size={10} fill="currentColor" />
                  <span>{numericRating}</span>
                </div>
                <div className="text-[10px] text-stone-400 bg-white/5 border border-white/5 px-2 py-0.5 rounded font-mono uppercase font-semibold shrink-0">
                  {series.quality}
                </div>
                <div className="text-[10px] text-gray-400 bg-white/5 border border-white/5 px-2 py-0.5 rounded font-mono uppercase font-semibold max-w-[120px] min-w-0">
                  <MarqueeText text={series.language || "Unknown"} />
                </div>
              </div>

              {/* Extended Credits listing */}
              <div className="text-xs text-gray-400 space-y-1.5 border-t border-white/5 pt-3 min-w-0 w-full">
                <div className="flex items-center gap-1.5 min-w-0 w-full">
                  <User size={12} className="text-stone-600 shrink-0" />
                  <span className="text-stone-500 shrink-0">Director:</span>
                  <MarqueeText 
                    text={series.director || "Not Specified"} 
                    className="text-stone-200 font-medium min-w-0 flex-1" 
                  />
                </div>
                <div className="flex items-center gap-1.5 min-w-0 w-full">
                  <Film size={12} className="text-stone-600 shrink-0" />
                  <span className="text-stone-500 shrink-0">Starring:</span>
                  <MarqueeText 
                    text={series.starring || "Not Specified"} 
                    className="text-stone-200 font-medium min-w-0 flex-1" 
                  />
                </div>
                <div className="flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-white/3 border border-white/5 w-full max-w-full min-w-0">
                  <Tag size={10} className="text-rose-500 shrink-0" />
                  <MarqueeText 
                    text={series.genres ? series.genres.join(" • ") : "Show"} 
                    className="text-[9.5px] font-mono tracking-wider text-gray-400 uppercase font-black min-w-0 flex-1" 
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Right panel: Scannable episodes selector list */}
          <div className="w-full md:w-3/5 flex flex-col p-5 md:p-6 overflow-hidden bg-[#050508]/40 justify-center">
            <div className="pb-3 border-b border-white/5 mb-3 shrink-0">
              <h4 className="font-display font-extrabold text-[#fff] text-sm uppercase tracking-wider">
                Episodes
              </h4>
            </div>

            {/* List panel */}
            <div className="flex-1 overflow-y-auto pr-1 space-y-2.5 scroll-smooth max-h-[40vh] md:max-h-none">
              {series.episodes && series.episodes.length > 0 ? (
                series.episodes.map((ep) => {
                  const hasUrl = ep.downloadUrl && ep.downloadUrl.trim() !== "";
                  return (
                    <div
                      key={ep.episode}
                      className="p-2.5 sm:p-3.5 rounded-2xl bg-[#0b0b11] border border-white/5 hover:border-[#ff2d55]/30 hover:bg-[#ff2d55]/3 transition-all grid grid-cols-12 gap-2 sm:gap-3 items-center group/ep w-full"
                    >
                      {hasUrl ? (
                        <>
                          {/* LEFT: Episode badge & title */}
                          <div className="col-span-4 xs:col-span-5 sm:col-span-6 flex items-center gap-2 sm:gap-3 min-w-0">
                            <div className="w-7 h-7 sm:w-9 sm:h-9 rounded-lg sm:rounded-xl bg-gradient-to-br from-[#1c1c28] to-[#0d0d14] border border-white/5 group-hover/ep:border-[#ff2d55]/30 flex items-center justify-center shrink-0">
                              <span className="text-[9.5px] sm:text-[11px] font-mono font-black text-rose-500 group-hover/ep:scale-105 transition-transform">
                                E{ep.episode}
                              </span>
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="text-[10px] xs:text-xs sm:text-sm font-semibold text-gray-300 group-hover/ep:text-white transition-colors whitespace-normal break-words leading-tight">
                                Episode {ep.episode}
                              </p>
                            </div>
                          </div>

                          {/* CENTER: Watch Online button */}
                          <div className="col-span-4 xs:col-span-4 sm:col-span-3 flex justify-center w-full" onClick={(e) => e.stopPropagation()}>
                            <button
                              onClick={() => onPlayEpisode(series, ep.episode)}
                              className="w-full max-w-[140px] px-1.5 py-1.5 xs:px-2.5 xs:py-2 sm:px-3.5 sm:py-2 rounded-lg sm:rounded-xl bg-red-650 hover:bg-red-550 border border-red-500/20 text-white text-[9.5px] xs:text-[10px] sm:text-xs font-semibold flex items-center justify-center gap-1 sm:gap-1.5 transition-all active:scale-95 cursor-pointer leading-5 select-none shadow-sm"
                            >
                              <Play size={11} fill="currentColor" className="shrink-0" />
                              <span className="truncate">Watch Online</span>
                            </button>
                          </div>

                          {/* RIGHT: Download button */}
                          <div className="col-span-4 xs:col-span-3 sm:col-span-3 flex justify-end w-full" onClick={(e) => e.stopPropagation()}>
                            <button
                              onClick={() => onDownloadEpisode(series, ep.episode)}
                              className="w-full max-w-[120px] px-1.5 py-1.5 xs:px-2.5 xs:py-2 sm:px-3.5 sm:py-2 rounded-lg sm:rounded-xl bg-white/5 hover:bg-neutral-800 text-gray-300 hover:text-white border border-white/10 text-[9.5px] xs:text-[10px] sm:text-xs font-semibold flex items-center justify-center gap-1 sm:gap-1.5 transition-all active:scale-95 cursor-pointer leading-5 select-none"
                            >
                              <Download size={11} className="shrink-0" />
                              <span className="truncate">Download</span>
                            </button>
                          </div>
                        </>
                      ) : (
                        <>
                          {/* LEFT: Episode badge & title */}
                          <div className="col-span-8 xs:col-span-9 sm:col-span-10 flex items-center gap-2 sm:gap-3 min-w-0">
                            <div className="w-7 h-7 sm:w-9 sm:h-9 rounded-lg sm:rounded-xl bg-gradient-to-br from-[#1c1c28] to-[#0d0d14] border border-white/5 group-hover/ep:border-[#ff2d55]/30 flex items-center justify-center shrink-0">
                              <span className="text-[9.5px] sm:text-[11px] font-mono font-black text-rose-500 group-hover/ep:scale-105 transition-transform">
                                E{ep.episode}
                              </span>
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="text-[10px] xs:text-xs sm:text-sm font-semibold text-gray-300 group-hover/ep:text-white transition-colors whitespace-normal break-words leading-tight">
                                Episode {ep.episode}
                              </p>
                            </div>
                          </div>

                          {/* RIGHT: Coming Soon badge */}
                          <div className="col-span-4 xs:col-span-3 sm:col-span-2 flex justify-end w-full">
                            <span className="text-[9px] font-mono text-gray-600 uppercase tracking-widest bg-white/2 border border-white/3 px-2 py-1 rounded truncate">
                              Coming Soon
                            </span>
                          </div>
                        </>
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
