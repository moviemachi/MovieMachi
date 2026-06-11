import React, { useState } from "react";
import { 
  PlusCircle, Send, CheckCircle, Sparkles, Star, Flame, 
  History, User, ShieldCheck, Database, UploadCloud, Video, 
  HelpCircle, AlertTriangle, Play, ChevronRight, CheckCircle2, 
  ArrowUpCircle, ChevronDown, Check, Heart, Clock, Users, Laptop, Film,
  Edit, Trash2, Search, Tv
} from "lucide-react";
import { Movie, MovieLink, CommunityRequest, Series, SeriesEpisode } from "../types";
import { motion, AnimatePresence } from "motion/react";

interface RequestSectionProps {
  movies: Movie[];
  requests: CommunityRequest[];
  userId: string;
  onAddRequest: (
    movie: string, 
    year: string, 
    language: string, 
    genre: string, 
    quality: string, 
    comments: string
  ) => { success: boolean; error?: string; action?: "created" | "upvoted"; movieName?: string };
  onUpvoteRequest: (id: string) => void;
  onAdminUploadMovie: (
    id: string, 
    details: { 
      imageUrl?: string; 
      director?: string; 
      starring?: string; 
      rating?: string; 
      watchUrl?: string; 
      trailerUrl?: string; 
    }
  ) => void;
  onAdminAddMovie?: (movie: Movie) => void;
  onAdminUpdateMovie?: (oldTitle: string, movie: Movie) => void;
  onAdminDeleteMovie?: (movieTitle: string) => void;
  onFulfillRequestCMS?: (reqId: string, movie: Movie) => void;
  setActivePlayerMovie: (movie: Movie | null) => void;
  
  // Series addition
  series: Series[];
  onAdminAddSeries?: (series: Series) => void;
  onAdminUpdateSeries?: (oldTitle: string, series: Series) => void;
  onAdminDeleteSeries?: (seriesTitle: string) => void;
}

// 1. Premium Glassmorphic Dropdown component 
interface PremiumDropdownProps {
  label: string;
  value: string;
  options: string[];
  onChange: (val: string) => void;
}

function PremiumDropdown({ label, value, options, onChange }: PremiumDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="space-y-2 relative select-none flex-1">
      <label className="text-[10px] font-mono font-black text-stone-400 uppercase tracking-widest block">
        {label}
      </label>
      <div className="relative">
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className={`w-full px-4 py-3 rounded-xl bg-gradient-to-r from-[#050505] via-[#0a0a0a] to-[#111111] border text-left text-xs sm:text-sm font-semibold transition-all duration-300 flex items-center justify-between cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#ff2d55]/50 focus:scale-[1.01] active:scale-98 ${
            isOpen 
              ? "border-[#ff2d55] shadow-[0_0_15px_rgba(255,45,85,0.4)]" 
              : "border-white/5 hover:border-[#ff2d55]/40 hover:shadow-[0_0_12px_rgba(255,45,85,0.15)]"
          }`}
          style={{ contentVisibility: "auto" }}
        >
          <span className="text-stone-100 font-bold">{value}</span>
          <ChevronDown 
            size={16} 
            className={`text-[#ff2d55] transition-transform duration-300 ${isOpen ? "rotate-180" : "rotate-0"}`} 
          />
        </button>

        <AnimatePresence>
          {isOpen && (
            <>
              {/* Overlay window cover to handle click outside */}
              <div className="fixed inset-0 z-[60]" onClick={() => setIsOpen(false)} />
              
              <motion.div
                initial={{ opacity: 0, y: -10, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -10, scale: 0.95 }}
                transition={{ duration: 0.2, ease: "easeOut" }}
                className="absolute z-[70] left-0 right-0 mt-2 rounded-2xl bg-gradient-to-b from-[#0e0c0e]/95 to-[#050505]/98 border border-[#ff2d55]/40 shadow-[0_20px_50px_rgba(0,0,0,0.9)] backdrop-blur-3xl overflow-hidden py-1 max-h-56 overflow-y-auto"
              >
                {options.map((opt) => {
                  const isSelected = opt === value;
                  return (
                    <button
                      key={opt}
                      type="button"
                      onClick={() => {
                        onChange(opt);
                        setIsOpen(false);
                      }}
                      className={`w-full px-4 py-3 text-left text-xs sm:text-sm transition-all duration-200 flex items-center justify-between cursor-pointer focus:outline-none focus:bg-white/5 ${
                        isSelected 
                          ? "bg-gradient-to-r from-[#ff2d55]/20 to-[#ff6b00]/10 text-[#ff2d55] font-black" 
                          : "text-stone-300 hover:bg-[#ff2d55]/5 hover:text-white"
                      }`}
                    >
                      <span className="truncate">{opt}</span>
                      {isSelected && <Check size={14} className="text-[#ff2d55] shrink-0 ml-2" />}
                    </button>
                  );
                })}
              </motion.div>
            </>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

export default function RequestSection({
  movies,
  requests,
  userId,
  onAddRequest,
  onUpvoteRequest,
  onAdminUploadMovie,
  onAdminAddMovie,
  onAdminUpdateMovie,
  onAdminDeleteMovie,
  onFulfillRequestCMS,
  setActivePlayerMovie,
  series,
  onAdminAddSeries,
  onAdminUpdateSeries,
  onAdminDeleteSeries
}: RequestSectionProps) {
  // Input form state variables
  const [movieName, setMovieName] = useState("");
  const [year, setYear] = useState("");
  const [genre, setGenre] = useState("Action");
  const [language, setLanguage] = useState("Tamil");
  const [quality, setQuality] = useState("Original HD (Recommended)");
  const [comments, setComments] = useState("");

  // Admin Login Security State
  const [isAdminLoggedIn, setIsAdminLoggedIn] = useState(false);
  const [adminUsernameInput, setAdminUsernameInput] = useState("");
  const [adminPasswordInput, setAdminPasswordInput] = useState("");
  const [adminLoginError, setAdminLoginError] = useState("");

  // Ledger configuration tab: "public" | "admin"
  const [ledgerTab, setLedgerTab] = useState<"public" | "admin">("public");

  // Admin CMS Sub-Tab: "form" | "requests" | "catalog"
  const [adminSubTab, setAdminSubTab] = useState<"form" | "requests" | "catalog">("form");

  // Publish Type selection (Movies vs. Series)
  const [publishType, setPublishType] = useState<"movies" | "series" | null>(null);

  // Series-specific states
  const [editingSeriesTitle, setEditingSeriesTitle] = useState<string | null>(null);
  const [cmsSeriesName, setCmsSeriesName] = useState("");
  const [cmsSeriesTitle, setCmsSeriesTitle] = useState("");
  const [cmsSeriesSeason, setCmsSeriesSeason] = useState("");
  const [cmsSeriesImage, setCmsSeriesImage] = useState("");
  const [cmsSeriesDirector, setCmsSeriesDirector] = useState("");
  const [cmsSeriesStarring, setCmsSeriesStarring] = useState("");
  const [cmsSeriesGenres, setCmsSeriesGenres] = useState("");
  const [cmsSeriesLanguage, setCmsSeriesLanguage] = useState("");
  const [cmsSeriesQuality, setCmsSeriesQuality] = useState("");
  const [cmsSeriesRating, setCmsSeriesRating] = useState("");
  const [cmsSeriesLastUpdated, setCmsSeriesLastUpdated] = useState("");
  const [cmsSeriesEpisodeCount, setCmsSeriesEpisodeCount] = useState("");
  const [cmsSeriesEpisodeUrls, setCmsSeriesEpisodeUrls] = useState<string[]>([]);

  // Admin CMS Form Inputs
  const [cmsTitle, setCmsTitle] = useState("");
  const [cmsImage, setCmsImage] = useState("");
  const [cmsMovieName, setCmsMovieName] = useState("");
  const [cmsDirector, setCmsDirector] = useState("");
  const [cmsStarring, setCmsStarring] = useState("");
  const [cmsGenres, setCmsGenres] = useState(""); // comma separated or quick selection
  const [cmsQuality, setCmsQuality] = useState("");
  const [cmsLanguage, setCmsLanguage] = useState("");
  const [cmsRating, setCmsRating] = useState("");
  const [cmsLastUpdated, setCmsLastUpdated] = useState("");
  const [cmsUrl360p, setCmsUrl360p] = useState("");
  const [cmsUrl720p, setCmsUrl720p] = useState("");
  const [cmsUrl1080p, setCmsUrl1080p] = useState("");
  const [cmsUrl4K, setCmsUrl4K] = useState("");
  const [cmsWatchUrl, setCmsWatchUrl] = useState("");
  const [cmsTrailerUrl, setCmsTrailerUrl] = useState("");

  const [editingMovieTitle, setEditingMovieTitle] = useState<string | null>(null);
  const [activeFulfillmentReqId, setActiveFulfillmentReqId] = useState<string | null>(null);
  const [catalogSearch, setCatalogSearch] = useState("");
  const [catalogFilterType, setCatalogFilterType] = useState<"movies" | "series">("movies");
  const [deleteConfirmationState, setDeleteConfirmationState] = useState<{
    isOpen: boolean;
    itemId: string;
    itemTitle: string;
    itemType: "movie" | "series";
  }>({
    isOpen: false,
    itemId: "",
    itemTitle: "",
    itemType: "movie"
  });

  // Interactive alert overlays
  const [alertState, setAlertState] = useState<{ type: "success" | "duplicate" | "error" | "upvote"; message: string } | null>(null);

  // Admin select request to fulfill state
  const [fulfillRequestId, setFulfillRequestId] = useState<string | null>(null);

  // Admin inject configurations
  const [adminPoster, setAdminPoster] = useState("");
  const [adminDirector, setAdminDirector] = useState("");
  const [adminStarring, setAdminStarring] = useState("");
  const [adminRating, setAdminRating] = useState("9.5/10");
  const [adminWatchUrl, setAdminWatchUrl] = useState("https://assets.mixkit.co/videos/preview/mixkit-curious-cat-watching-tv-40847-large.mp4");
  const [adminTrailerUrl, setAdminTrailerUrl] = useState("https://assets.mixkit.co/videos/preview/mixkit-curious-cat-watching-tv-40847-large.mp4");

  // Dropdown list arrays
  const languageOptions = [
    "Tamil",
    "Dual Audio [Tamil+Hindi]",
    "Dual Audio [Tamil+English]",
    "Multi-Audio [5 Languages]",
    "English"
  ];

  const genreOptions = [
    "Action",
    "Comedy",
    "Drama",
    "Mystery",
    "Fantasy",
    "Romance"
  ];

  const qualityOptions = [
    "Original HD (Recommended)",
    "4K Ultra HD (HEVC/HDR)",
    "1080p Direct WEB-DL",
    "720p Mobile Friendly"
  ];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!movieName.trim()) return;

    const result = onAddRequest(movieName, year, language, genre, quality, comments);

    if (!result.success) {
      if (result.error === "duplicate_exists") {
        setAlertState({
          type: "duplicate",
          message: `${movieName} is already available in MovieMachi catalog. No duplicate request created.`
        });
      } else if (result.error === "already_voted") {
        setAlertState({
          type: "error",
          message: `You have already requested or upvoted "${movieName}". Curators are tracking this request.`
        });
      }
      return;
    }

    if (result.action === "upvoted") {
      setAlertState({
        type: "upvote",
        message: `🔥 "${result.movieName}" already exists! Upvoted successfully. Raising queue priority score.`
      });
    } else {
      setAlertState({
        type: "success",
        message: `🎉 Request ticket for "${result.movieName}" is now active on the public community ledger.`
      });
    }

    // Reset fields
    setMovieName("");
    setYear("");
    setGenre("Action");
    setLanguage("Tamil");
    setQuality("Original HD (Recommended)");
    setComments("");

    // Auto dismiss alert
    setTimeout(() => {
      setAlertState(null);
    }, 6000);
  };

  // Filter lists - Ledger becomes a shared public request board showing ALL regardless of status, sorted by highest votes!
  const publicLedgerRequests = [...requests].sort((a, b) => b.requestCount - a.requestCount);
  const myRequests = requests.filter(r => r.requesters.includes(userId));

  const resetCmsForm = () => {
    setCmsTitle("");
    setCmsImage("");
    setCmsMovieName("");
    setCmsDirector("");
    setCmsStarring("");
    setCmsGenres("");
    setCmsQuality("");
    setCmsLanguage("");
    setCmsRating("");
    setCmsLastUpdated(new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }));
    setCmsUrl360p("");
    setCmsUrl720p("");
    setCmsUrl1080p("");
    setCmsUrl4K("");
    setCmsWatchUrl("");
    setCmsTrailerUrl("");
    setEditingMovieTitle(null);
    setActiveFulfillmentReqId(null);

    // Reset Series Form
    setPublishType(null);
    setEditingSeriesTitle(null);
    setCmsSeriesName("");
    setCmsSeriesTitle("");
    setCmsSeriesSeason("");
    setCmsSeriesImage("");
    setCmsSeriesDirector("");
    setCmsSeriesStarring("");
    setCmsSeriesGenres("");
    setCmsSeriesLanguage("");
    setCmsSeriesQuality("");
    setCmsSeriesRating("");
    setCmsSeriesLastUpdated(new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }));
    setCmsSeriesEpisodeCount("");
    setCmsSeriesEpisodeUrls([]);
  };

  const handleEpisodeCountChange = (val: string) => {
    setCmsSeriesEpisodeCount(val);
    const count = parseInt(val) || 0;
    setCmsSeriesEpisodeUrls(prev => {
      const updated = [...prev];
      if (updated.length < count) {
        while (updated.length < count) {
          updated.push("");
        }
      } else if (updated.length > count) {
        updated.splice(count);
      }
      return updated;
    });
  };

  const handleSaveCmsSeries = (e: React.FormEvent) => {
    e.preventDefault();
    if (
      !cmsSeriesName.trim() ||
      !cmsSeriesTitle.trim() ||
      !cmsSeriesSeason.trim() ||
      !cmsSeriesImage.trim() ||
      !cmsSeriesEpisodeCount.trim()
    ) {
      setAlertState({
        type: "error",
        message: "Error: Missing required fields for Series"
      });
      setTimeout(() => setAlertState(null), 6000);
      return;
    }

    const epCount = Number(cmsSeriesEpisodeCount) || 0;
    if (epCount <= 0) {
      setAlertState({
        type: "error",
        message: "Error: Episode Count must be greater than 0."
      });
      setTimeout(() => setAlertState(null), 6000);
      return;
    }

    const seriesObj: Series = {
      id: editingSeriesTitle || undefined,
      type: "series",
      seriesName: cmsSeriesName.trim(),
      title: cmsSeriesTitle.trim(),
      seasonNumber: Number(cmsSeriesSeason) || 1,
      image: cmsSeriesImage.trim(),
      director: cmsSeriesDirector.trim(),
      starring: cmsSeriesStarring.trim(),
      genres: cmsSeriesGenres.split(",").map(g => g.trim()).filter(Boolean),
      language: cmsSeriesLanguage.trim(),
      quality: cmsSeriesQuality.trim(),
      rating: cmsSeriesRating.trim(),
      lastUpdated: cmsSeriesLastUpdated.trim(),
      episodes: cmsSeriesEpisodeUrls.map((url, idx) => ({
        episodeNumber: idx + 1,
        episode: idx + 1,
        downloadUrl: url.trim()
      }))
    };

    if (editingSeriesTitle) {
      if (onAdminUpdateSeries) {
        onAdminUpdateSeries(editingSeriesTitle, seriesObj);
      }
    } else {
      if (onAdminAddSeries) {
        onAdminAddSeries(seriesObj);
      }
    }

    setAlertState({
      type: "success",
      message: "Success: Series uploaded successfully."
    });

    resetCmsForm();
    setAdminSubTab("catalog");
    setTimeout(() => setAlertState(null), 6000);
  };

  const handleEditExistingSeries = (s: Series) => {
    setCmsSeriesName(s.seriesName || "");
    setCmsSeriesTitle(s.title || "");
    setCmsSeriesSeason(String(s.seasonNumber) || "");
    setCmsSeriesImage(s.image || "");
    setCmsSeriesDirector(s.director || "");
    setCmsSeriesStarring(s.starring || "");
    setCmsSeriesGenres(s.genres ? s.genres.join(", ") : "");
    setCmsSeriesLanguage(s.language || "");
    setCmsSeriesQuality(s.quality || "");
    setCmsSeriesRating(s.rating || "");
    setCmsSeriesLastUpdated(s.lastUpdated || "");
    
    setCmsSeriesEpisodeCount(String(s.episodes ? s.episodes.length : 0));
    setCmsSeriesEpisodeUrls(s.episodes ? s.episodes.map(ep => ep.downloadUrl) : []);
    
    setEditingSeriesTitle(s.title);
    setPublishType("series");
    setAdminSubTab("form");
  };

  const handleDeleteSeriesCMS = (id: string, sName: string) => {
    setDeleteConfirmationState({
      isOpen: true,
      itemId: id,
      itemTitle: sName,
      itemType: "series"
    });
  };

  const handleEditExistingMovie = (movie: Movie) => {
    setCmsTitle(movie.title || "");
    setCmsImage(movie.image || "");
    setCmsMovieName(movie.movieName || "");
    setCmsDirector(movie.director || "");
    setCmsStarring(movie.starring || "");
    setCmsGenres(movie.genres ? movie.genres.join(", ") : "");
    setCmsQuality(movie.quality || "");
    setCmsLanguage(movie.language || "");
    setCmsRating(movie.rating || "");
    setCmsLastUpdated(movie.lastUpdated || "");
    
    let url360 = "";
    let url720 = "";
    let url1080 = "";
    let url4K = "";
    
    if (movie.links) {
      movie.links.forEach((link: any) => {
        const lbl = link.label.toLowerCase();
        if (lbl.includes("360p") || (link.className === "p480" && lbl.includes("360"))) {
          url360 = link.url;
        } else if (lbl.includes("720p") || link.className === "p720") {
          url720 = link.url;
        } else if (lbl.includes("1080p") || link.className === "p1080") {
          url1080 = link.url;
        } else if (lbl.includes("4k") || link.className === "K4") {
          url4K = link.url;
        }
      });
    }
    
    setCmsUrl360p(url360);
    setCmsUrl720p(url720);
    setCmsUrl1080p(url1080);
    setCmsUrl4K(url4K);
    setCmsWatchUrl(movie.watchUrl || "");
    setCmsTrailerUrl(movie.trailerUrl || "");
    
    setEditingMovieTitle(movie.title);
    setActiveFulfillmentReqId(null);
    setAdminSubTab("form");
  };

  const handleStartRequestFulfillmentCMS = (req: CommunityRequest) => {
    // Force manual inputs - do not auto-fill fields with demo values!
    setCmsTitle(`${req.movieName} (${req.year})`);
    setCmsImage("");
    setCmsMovieName(req.movieName);
    setCmsDirector("");
    setCmsStarring("");
    setCmsGenres(req.genre);
    setCmsQuality(req.quality.replace(" (Recommended)", ""));
    setCmsLanguage(req.language);
    setCmsRating("");
    setCmsLastUpdated(new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }));
    
    setCmsUrl360p("");
    setCmsUrl720p("");
    setCmsUrl1080p("");
    setCmsUrl4K("");
    setCmsWatchUrl("");
    setCmsTrailerUrl("");
    
    setEditingMovieTitle(null);
    setActiveFulfillmentReqId(req.id);
    setAdminSubTab("form");
  };

  const handleSaveCmsMovie = (e: React.FormEvent) => {
    e.preventDefault();
    if (!cmsTitle.trim() || !cmsMovieName.trim() || !cmsImage.trim()) {
      setAlertState({
        type: "error",
        message: "Error: Missing required fields"
      });
      setTimeout(() => setAlertState(null), 6000);
      return;
    }

    const compiledLinks: MovieLink[] = [];
    if (cmsUrl360p.trim()) {
      compiledLinks.push({ label: "Standard 360p Stream", url: cmsUrl360p.trim(), className: "p480" });
    }
    if (cmsUrl720p.trim()) {
      compiledLinks.push({ label: "High Definition 720p HD", url: cmsUrl720p.trim(), className: "p720" });
    }
    if (cmsUrl1080p.trim()) {
      compiledLinks.push({ label: "Full High Definition 1080p FHD", url: cmsUrl1080p.trim(), className: "p1080" });
    }
    if (cmsUrl4K.trim()) {
      compiledLinks.push({ label: "Ultra High Bitrate 4K UHD", url: cmsUrl4K.trim(), className: "K4" });
    }

    if (compiledLinks.length === 0 && cmsWatchUrl.trim()) {
      compiledLinks.push({ label: "Direct Play HLS 1080p", url: cmsWatchUrl.trim(), className: "p1080" });
      compiledLinks.push({ label: "Ultra High Bitrate 4K Stream", url: cmsWatchUrl.trim(), className: "K4" });
    }

    const movieObj: Movie = {
      title: cmsTitle.trim(),
      image: cmsImage.trim(),
      movieName: cmsMovieName.trim(),
      director: cmsDirector.trim(),
      starring: cmsStarring.trim(),
      genres: cmsGenres.split(",").map(g => g.trim()).filter(Boolean),
      quality: cmsQuality.trim(),
      language: cmsLanguage.trim(),
      rating: cmsRating.trim(),
      lastUpdated: cmsLastUpdated.trim(),
      links: compiledLinks,
      watchUrl: cmsWatchUrl.trim() || undefined,
      trailerUrl: cmsTrailerUrl.trim() || undefined
    };

    if (activeFulfillmentReqId) {
      if (onFulfillRequestCMS) {
        onFulfillRequestCMS(activeFulfillmentReqId, movieObj);
      } else if (onAdminUploadMovie) {
        onAdminUploadMovie(activeFulfillmentReqId, {
          imageUrl: movieObj.image,
          director: movieObj.director,
          starring: movieObj.starring,
          rating: movieObj.rating,
          watchUrl: movieObj.watchUrl,
          trailerUrl: movieObj.trailerUrl
        });
      }
    } else if (editingMovieTitle) {
      if (onAdminUpdateMovie) {
        onAdminUpdateMovie(editingMovieTitle, movieObj);
      }
    } else {
      if (onAdminAddMovie) {
        onAdminAddMovie(movieObj);
      }
    }

    setAlertState({
      type: "success",
      message: "Success: Movie uploaded successfully."
    });

    resetCmsForm();
    setAdminSubTab("catalog");
    setTimeout(() => setAlertState(null), 6000);
  };

  const handleDeleteMovieCMS = (id: string, movieName: string) => {
    setDeleteConfirmationState({
      isOpen: true,
      itemId: id,
      itemTitle: movieName,
      itemType: "movie"
    });
  };

  if (isAdminLoggedIn) {
    return (
      <div 
        className="w-full rounded-3xl bg-gradient-to-b from-[#0a0a0f]/95 via-black/98 to-[#050505]/95 border border-white/5 p-5 sm:p-7 shadow-[0_20px_50px_rgba(255,45,85,0.12)] space-y-6 relative overflow-hidden backdrop-blur-3xl font-sans"
        id="admin-dashboard-panel"
      >
        <div className="absolute top-0 right-0 w-36 h-36 bg-amber-500/5 rounded-full blur-3xl pointer-events-none" />

        {/* Dashboard Title & Exit/Logout Button */}
        <div className="border-b border-white/5 pb-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <h3 className="font-sans font-black text-xl sm:text-2xl text-white tracking-tight flex items-center gap-2">
              <ShieldCheck className="text-amber-500 drop-shadow-[0_0_12px_rgba(245,158,11,0.8)]" size={26} />
              <span>Movie Management Panel</span>
            </h3>
            <p className="text-xs text-stone-400 font-semibold leading-relaxed font-sans">
              Dynamically add, edit, or delete movies from the catalog and fulfill outstanding community requests.
            </p>
          </div>

          <button
            onClick={() => {
              setIsAdminLoggedIn(false);
              setAdminUsernameInput("");
              setAdminPasswordInput("");
              resetCmsForm();
              setLedgerTab("public");
            }}
            className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-red-600 to-rose-600 hover:brightness-110 text-white font-sans font-black text-xs uppercase tracking-widest transition-all cursor-pointer shadow-[0_0_15px_rgba(239,68,68,0.3)] hover:shadow-[0_0_20px_rgba(239,68,68,0.45)] active:scale-95 text-center shrink-0"
          >
            Exit / Logout
          </button>
        </div>

        {/* Dynamic Alert Messages */}
        <AnimatePresence>
          {alertState && (
            <motion.div
              initial={{ height: 0, opacity: 0, scale: 0.95 }}
              animate={{ height: "auto", opacity: 1, scale: 1 }}
              exit={{ height: 0, opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.25 }}
              className={`p-4 rounded-2xl border text-xs sm:text-sm flex items-start gap-3 relative overflow-hidden font-sans font-semibold ${
                alertState.type === "error"
                  ? "bg-red-500/10 border-red-500/30 text-red-400"
                  : "bg-emerald-500/10 border-emerald-500/30 text-emerald-400"
              }`}
            >
              {alertState.type === "error" ? (
                <AlertTriangle size={18} className="shrink-0 mt-0.5 animate-pulse text-red-400" />
              ) : (
                <CheckCircle2 size={18} className="shrink-0 mt-0.5 animate-pulse text-emerald-400" />
              )}
              <div className="flex-1">
                <p className="font-bold uppercase tracking-wider text-[11px] opacity-85 mb-0.5">
                  {alertState.type === "error" ? "Validation Failure" : "Database Broadcast Code Updated"}
                </p>
                <p className="font-sans text-xs sm:text-[13px] leading-relaxed">{alertState.message}</p>
              </div>
              <button 
                onClick={() => setAlertState(null)}
                className="text-stone-400 hover:text-white transition-colors cursor-pointer text-xs font-black px-1.5 self-center"
              >
                ✕
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* SUB TABS SELECTION FOR CMS */}
        <div className="flex bg-[#050505] p-1 rounded-xl border border-white/5 gap-1 shadow-inner max-w-md">
          <button
            onClick={() => {
              if (adminSubTab !== "form" || editingMovieTitle || editingSeriesTitle) {
                resetCmsForm();
              }
              setAdminSubTab("form");
            }}
            className={`flex-1 py-1.5 text-[10px] font-sans font-black uppercase tracking-widest rounded-lg transition-all cursor-pointer ${
              adminSubTab === "form"
                ? "bg-gradient-to-r from-[#ff2d55] to-[#ff6b00] text-white shadow-md shadow-[#ff2d55]/10"
                : "text-stone-400 hover:text-stone-100"
            }`}
          >
            {editingMovieTitle ? "✏️ Edit Movie" : editingSeriesTitle ? "✏️ Edit Series" : "✨ Publish New"}
          </button>
          <button
            onClick={() => setAdminSubTab("requests")}
            className={`flex-1 py-1.5 text-[10px] font-sans font-black uppercase tracking-widest rounded-lg relative transition-all cursor-pointer ${
              adminSubTab === "requests"
                ? "bg-gradient-to-r from-[#ff2d55] to-[#ff6b00] text-white shadow-md shadow-[#ff2d55]/10"
                : "text-stone-400 hover:text-stone-100"
            }`}
          >
            <span>🎬 Ingest Queue</span>
            {requests.filter(r => r.status !== "Uploaded").length > 0 && (
              <span className="absolute -top-1.5 -right-1.5 px-2 py-0.5 rounded-full bg-[#ff2d55] text-white font-mono text-[8px] font-black animate-bounce border border-black">
                {requests.filter(r => r.status !== "Uploaded").length}
              </span>
            )}
          </button>
          <button
            onClick={() => setAdminSubTab("catalog")}
            className={`flex-1 py-1.5 text-[10px] font-sans font-black uppercase tracking-widest rounded-lg transition-all cursor-pointer ${
              adminSubTab === "catalog"
                ? "bg-gradient-to-r from-[#ff2d55] to-[#ff6b00] text-white shadow-md shadow-[#ff2d55]/10"
                : "text-stone-400 hover:text-stone-100"
            }`}
          >
            🎒 Catalog List
          </button>
        </div>

        {/* RENDER ACTIVE SUB TAB ACTION BLOCK */}
        {adminSubTab === "form" && publishType === null && !editingMovieTitle && !editingSeriesTitle && !activeFulfillmentReqId && (
          /* SELECTION SCREEN: 2 large premium cards */
          <div className="space-y-6 max-w-4xl py-4 animate-fade-in">
            <div className="text-center space-y-2 max-w-xl mx-auto pb-4">
              <h4 className="text-sm font-sans font-black text-rose-500 uppercase tracking-widest text-[#ff2d55]">
                Publishing Terminal
              </h4>
              <p className="text-xs text-stone-300 font-semibold leading-relaxed">
                Select the type of media catalog asset you want to publish to MovieMachi premium databases.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Movie publishes card */}
              <div 
                onClick={() => setPublishType("movies")}
                className="group relative p-8 rounded-2xl bg-gradient-to-br from-[#0a0a0f] via-black/40 to-[#0e0c0e] border border-white/5 hover:border-[#ff2d55]/30 hover:shadow-[0_0_35px_rgba(255,45,85,0.18)] transition-all duration-300 flex flex-col items-center text-center space-y-4 cursor-pointer"
              >
                <div className="w-14 h-14 rounded-full bg-[#ff2d55]/10 border border-[#ff2d55]/30 flex items-center justify-center text-[#ff2d55] group-hover:scale-105 transition-transform duration-300 shadow-[0_0_15px_rgba(255,45,85,0.25)]">
                  <Film size={26} />
                </div>
                <div className="space-y-2">
                  <h5 className="font-sans font-black text-[#ff2d55] text-base uppercase tracking-wider group-hover:underline">
                    Feature Movies
                  </h5>
                  <p className="text-xs text-stone-400 font-semibold leading-relaxed font-sans mt-1">
                    Publish standard feature films, short movies, HLS streams, direct video play links, and trailer nodes into the catalog.
                  </p>
                </div>
              </div>

              {/* Series publishes card */}
              <div 
                onClick={() => setPublishType("series")}
                className="group relative p-8 rounded-2xl bg-gradient-to-br from-[#0a0a0f] via-black/40 to-[#0e0c0e] border border-white/5 hover:border-amber-500/30 hover:shadow-[0_0_35px_rgba(245,158,11,0.18)] transition-all duration-300 flex flex-col items-center text-center space-y-4 cursor-pointer"
              >
                <div className="w-14 h-14 rounded-full bg-[#ff2d55]/10 border border-[#ff2d55]/30 flex items-center justify-center text-[#ff2d55] group-hover:scale-105 transition-transform duration-300 shadow-[0_0_15px_rgba(255,45,85,0.25)]">
                  <Tv size={26} className="text-amber-500" />
                </div>
                <div className="space-y-2">
                  <h5 className="font-sans font-black text-amber-500 text-base uppercase tracking-wider group-hover:underline">
                    Episodic Series
                  </h5>
                  <p className="text-xs text-stone-400 font-semibold leading-relaxed font-sans mt-1">
                    Publish series/seasons with multiple episodes. Episode list URL fields will be generated dynamically based on count.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Back Link to Selector */}
        {adminSubTab === "form" && publishType !== null && !editingMovieTitle && !editingSeriesTitle && !activeFulfillmentReqId && (
          <button
            type="button"
            onClick={() => setPublishType(null)}
            className="mb-4 text-[10px] font-mono font-black text-rose-500 hover:text-rose-400 flex items-center gap-1.5 uppercase tracking-widest cursor-pointer hover:underline bg-transparent border-none outline-none font-bold select-none"
          >
            ← Back to Ingestion Selection
          </button>
        )}

        {/* RENDER ACTIVE SUB TAB ACTION BLOCK */}
        {adminSubTab === "form" && (publishType === "movies" || editingMovieTitle || activeFulfillmentReqId) && (
          <form onSubmit={handleSaveCmsMovie} className="space-y-4 max-w-4xl">
            
            {/* EDITING / FULFILLING STATUS BANNER */}
            {editingMovieTitle && (
              <div className="p-3 rounded-xl bg-blue-500/10 border border-blue-500/30 flex items-center justify-between text-[11px] text-blue-300">
                <span className="font-semibold font-sans">✏️ Editing Catalog Asset: <b className="text-white font-black">{editingMovieTitle}</b></span>
                <button type="button" onClick={resetCmsForm} className="text-[9px] font-mono hover:underline uppercase font-black text-blue-400 hover:text-blue-200 cursor-pointer">Cancel Edit</button>
              </div>
            )}
            {activeFulfillmentReqId && (
              <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-between text-[11px] text-amber-400 font-sans">
                <span className="font-semibold select-text font-sans">🙌 Fulfilling Request Ticket: <b className="text-white font-black">{cmsMovieName}</b></span>
                <button type="button" onClick={resetCmsForm} className="text-[9px] font-mono hover:underline uppercase font-black text-amber-500 hover:text-amber-300 cursor-pointer font-sans font-semibold">Direct Mode</button>
              </div>
            )}

            {/* Title & Movie Name inputs */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-mono font-black text-stone-400 uppercase tracking-widest block font-bold">Title (with Year) *</label>
                <input 
                  type="text" 
                  required
                  placeholder="e.g. Leo (2024)" 
                  value={cmsTitle} 
                  onChange={(e) => setCmsTitle(e.target.value)} 
                  className="w-full px-4 py-3 rounded-xl bg-[#050505] border border-white/5 focus:border-[#ff2d55] text-white text-xs sm:text-sm font-semibold focus:shadow-[0_0_12px_rgba(255,45,85,0.2)] focus:ring-1 focus:ring-[#ff2d55]/40 outline-none transition-all duration-300 font-sans"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-mono font-black text-stone-400 uppercase tracking-widest block font-bold">Movie Name *</label>
                <input 
                  type="text" 
                  required
                  placeholder="e.g. Leo" 
                  value={cmsMovieName} 
                  onChange={(e) => setCmsMovieName(e.target.value)} 
                  className="w-full px-4 py-3 rounded-xl bg-[#050505] border border-white/5 focus:border-[#ff2d55] text-white text-xs sm:text-sm font-semibold focus:shadow-[0_0_12px_rgba(255,45,85,0.2)] focus:ring-1 focus:ring-[#ff2d55]/40 outline-none transition-all duration-300 font-sans"
                />
              </div>
            </div>

            {/* Image Poster Path */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-mono font-black text-stone-400 uppercase tracking-widest block font-bold">Image / Poster URL *</label>
              <input 
                type="text" 
                required
                placeholder="e.g. https://images.unsplash.com/photo-..." 
                value={cmsImage} 
                onChange={(e) => setCmsImage(e.target.value)} 
                className="w-full px-4 py-3 rounded-xl bg-[#050505] border border-white/5 focus:border-[#ff2d55] text-white text-xs sm:text-sm font-semibold focus:shadow-[0_0_12px_rgba(255,45,85,0.2)] focus:ring-1 focus:ring-[#ff2d55]/40 outline-none transition-all duration-300 font-sans"
              />
            </div>

            {/* Director & Cast Information */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-mono font-black text-stone-400 uppercase tracking-widest block font-bold">Director *</label>
                <input 
                  type="text" 
                  required
                  placeholder="e.g. Lokesh Kanagaraj" 
                  value={cmsDirector} 
                  onChange={(e) => setCmsDirector(e.target.value)} 
                  className="w-full px-4 py-3 rounded-xl bg-[#050505] border border-white/5 focus:border-[#ff2d55] text-white text-xs sm:text-sm font-semibold focus:shadow-[0_0_12px_rgba(255,45,85,0.2)] focus:ring-1 focus:ring-[#ff2d55]/40 outline-none transition-all duration-300 font-sans"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-mono font-black text-stone-400 uppercase tracking-widest block font-bold">Starring Credits *</label>
                <input 
                  type="text" 
                  required
                  placeholder="e.g. Thalapathy Vijay, Sanjay Dutt" 
                  value={cmsStarring} 
                  onChange={(e) => setCmsStarring(e.target.value)} 
                  className="w-full px-4 py-3 rounded-xl bg-[#050505] border border-white/5 focus:border-[#ff2d55] text-white text-xs sm:text-sm font-semibold focus:shadow-[0_0_12px_rgba(255,45,85,0.2)] focus:ring-1 focus:ring-[#ff2d55]/40 outline-none transition-all duration-300 font-sans"
                />
              </div>
            </div>

            {/* Genre inputs & Quality/Language/Rating */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-mono font-black text-stone-400 uppercase tracking-widest block font-bold">Genres * (Comma Separated)</label>
              <input 
                type="text" 
                required
                placeholder="e.g. Action, Thriller, Drama" 
                value={cmsGenres} 
                onChange={(e) => setCmsGenres(e.target.value)} 
                className="w-full px-4 py-3 rounded-xl bg-[#050505] border border-white/5 focus:border-[#ff2d55] text-white text-xs sm:text-sm font-semibold focus:shadow-[0_0_12px_rgba(255,45,85,0.2)] focus:ring-1 focus:ring-[#ff2d55]/40 outline-none transition-all duration-300 font-sans"
              />
              <div className="flex flex-wrap gap-1.5 pt-1">
                {["Action", "Comedy", "Drama", "Thriller", "Sci-Fi", "Romance", "Horror", "Mystery"].map(g => {
                  const exists = cmsGenres.split(",").map(x => x.trim().toLowerCase()).includes(g.toLowerCase());
                  return (
                    <button
                      type="button"
                      key={g}
                      onClick={() => {
                        const current = cmsGenres.split(",").map(x => x.trim()).filter(Boolean);
                        if (exists) {
                          setCmsGenres(current.filter(x => x.toLowerCase() !== g.toLowerCase()).join(", "));
                        } else {
                          setCmsGenres([...current, g].join(", "));
                        }
                      }}
                      className={`text-[9px] font-mono font-black px-2.5 py-1 rounded cursor-pointer border transition-colors ${
                        exists 
                          ? "bg-[#ff2d55]/15 text-[#ff2d55] border-[#ff2d55]/25" 
                          : "bg-white/3 text-gray-400 border-white/5 hover:text-white"
                      }`}
                    >
                      {exists ? `✓ ${g}` : `+ ${g}`}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-mono font-black text-stone-400 uppercase tracking-widest block font-bold">Quality *</label>
                <input 
                  type="text" 
                  required
                  placeholder="e.g. 4K Ultra HD" 
                  value={cmsQuality} 
                  onChange={(e) => setCmsQuality(e.target.value)} 
                  className="w-full px-4 py-3 rounded-xl bg-[#050505] border border-white/5 focus:border-[#ff2d55] text-white text-xs sm:text-sm font-semibold focus:shadow-[0_0_12px_rgba(255,45,85,0.2)] focus:ring-1 focus:ring-[#ff2d55]/40 outline-none transition-all duration-300 font-sans"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-mono font-black text-stone-400 uppercase tracking-widest block font-bold">Language *</label>
                <input 
                  type="text" 
                  required
                  placeholder="e.g. Tamil" 
                  value={cmsLanguage} 
                  onChange={(e) => setCmsLanguage(e.target.value)} 
                  className="w-full px-4 py-3 rounded-xl bg-[#050505] border border-white/5 focus:border-[#ff2d55] text-white text-xs sm:text-sm font-semibold focus:shadow-[0_0_12px_rgba(255,45,85,0.2)] focus:ring-1 focus:ring-[#ff2d55]/40 outline-none transition-all duration-300 font-sans"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-mono font-black text-stone-400 uppercase tracking-widest block font-bold">Rating *</label>
                <input 
                  type="text" 
                  required
                  placeholder="e.g. 9.1/10" 
                  value={cmsRating} 
                  onChange={(e) => setCmsRating(e.target.value)} 
                  className="w-full px-4 py-3 rounded-xl bg-[#050505] border border-white/5 focus:border-[#ff2d55] text-white text-xs sm:text-sm font-semibold focus:shadow-[0_0_12px_rgba(255,45,85,0.2)] focus:ring-1 focus:ring-[#ff2d55]/40 outline-none transition-all duration-300 font-sans"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-mono font-black text-stone-400 uppercase tracking-widest block font-bold">Last Update *</label>
                <input 
                  type="text" 
                  required
                  placeholder="e.g. Jun 9, 2026" 
                  value={cmsLastUpdated} 
                  onChange={(e) => setCmsLastUpdated(e.target.value)} 
                  className="w-full px-4 py-3 rounded-xl bg-[#050505] border border-white/5 focus:border-[#ff2d55] text-white text-xs sm:text-sm font-semibold focus:shadow-[0_0_12px_rgba(255,45,85,0.2)] focus:ring-1 focus:ring-[#ff2d55]/40 outline-none transition-all duration-300 font-sans"
                />
              </div>
            </div>

            {/* Stream Playable URLs */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-mono font-black text-stone-400 uppercase tracking-widest block font-bold">Watch URL (Optional)</label>
                <input 
                  type="text" 
                  placeholder="e.g. HLS (.m3u8) or video link" 
                  value={cmsWatchUrl} 
                  onChange={(e) => setCmsWatchUrl(e.target.value)} 
                  className="w-full px-4 py-3 rounded-xl bg-[#050505] border border-white/5 focus:border-[#ff2d55] text-white text-xs sm:text-sm font-mono focus:shadow-[0_0_12px_rgba(255,45,85,0.2)] focus:ring-1 focus:ring-[#ff2d55]/50 outline-none transition-all duration-300"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-mono font-black text-stone-400 uppercase tracking-widest block font-bold">Trailer URL (Optional)</label>
                <input 
                  type="text" 
                  placeholder="e.g. Embed/trailer video MP4 stream" 
                  value={cmsTrailerUrl} 
                  onChange={(e) => setCmsTrailerUrl(e.target.value)} 
                  className="w-full px-4 py-3 rounded-xl bg-[#050505] border border-white/5 focus:border-[#ff2d55] text-white text-xs sm:text-sm font-mono focus:shadow-[0_0_12px_rgba(255,45,85,0.2)] focus:ring-1 focus:ring-[#ff2d55]/50 outline-none transition-all duration-300"
                />
              </div>
            </div>

            {/* Resolutive Download Links */}
            <div className="p-4 sm:p-5 rounded-2xl bg-black border border-white/5 space-y-4 shadow-inner">
              <p className="text-[10px] font-mono font-black text-amber-500 uppercase tracking-widest flex items-center gap-2 leading-none">
                <Laptop size={13} />
                <span>Download Quality URLs</span>
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="space-y-1">
                  <label className="text-[9px] font-mono font-black text-stone-400 uppercase block">360p URL</label>
                  <input 
                    type="text"
                    placeholder="Paste standard stream url" 
                    value={cmsUrl360p} 
                    onChange={(e) => setCmsUrl360p(e.target.value)} 
                    className="w-full px-3 py-2 rounded-lg bg-[#07070a] border border-white/5 focus:border-[#ff2d55] text-stone-300 text-xs font-mono outline-none"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[9px] font-mono font-black text-stone-400 uppercase block">720p URL</label>
                  <input 
                    type="text"
                    placeholder="Paste High Def stream url" 
                    value={cmsUrl720p} 
                    onChange={(e) => setCmsUrl720p(e.target.value)} 
                    className="w-full px-3 py-2 rounded-lg bg-[#07070a] border border-white/5 focus:border-[#ff2d55] text-stone-300 text-xs font-mono outline-none"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[9px] font-mono font-black text-stone-400 uppercase block">1080p URL</label>
                  <input 
                    type="text"
                    placeholder="Paste Full HD stream url" 
                    value={cmsUrl1080p} 
                    onChange={(e) => setCmsUrl1080p(e.target.value)} 
                    className="w-full px-3 py-2 rounded-lg bg-[#07070a] border border-white/5 focus:border-[#ff2d55] text-[#ff2d55]/90 text-xs font-mono outline-none"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[9px] font-mono font-black text-stone-400 uppercase block">4K URL</label>
                  <input 
                    type="text"
                    placeholder="Paste 4K UHD stream url" 
                    value={cmsUrl4K} 
                    onChange={(e) => setCmsUrl4K(e.target.value)} 
                    className="w-full px-3 py-2 rounded-lg bg-[#07070a] border border-white/5 focus:border-[#ff2d55] text-stone-300 text-xs font-mono outline-none"
                  />
                </div>
              </div>
            </div>

            {/* Upload Button */}
            <div className="pt-2 flex gap-4 max-w-sm pb-2 font-sans text-xs">
              <button 
                type="submit"
                className="flex-1 py-4 px-6 rounded-xl bg-gradient-to-r from-[#ff2d55] to-[#ff6b00] border border-white/10 text-white font-sans font-black text-xs uppercase tracking-widest flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(255,45,85,0.25)] hover:brightness-115 active:scale-98 transition-all cursor-pointer font-bold"
              >
                <UploadCloud size={16} />
                <span>{editingMovieTitle ? "Apply Update" : activeFulfillmentReqId ? "Fulfill Request" : "Upload Movie"}</span>
              </button>

              {(editingMovieTitle || activeFulfillmentReqId || cmsTitle || cmsMovieName || cmsImage) && (
                <button 
                  type="button"
                  onClick={resetCmsForm}
                  className="py-4 px-6 rounded-xl bg-white/5 hover:bg-white/10 border border-white/5 text-stone-400 hover:text-stone-100 font-sans font-black text-xs uppercase tracking-wider cursor-pointer active:scale-98 transition-all shrink-0"
                >
                  Reset
                </button>
              )}
            </div>

          </form>
        )}

        {/* RENDER EPISODIC SERIES FORM */}
        {adminSubTab === "form" && (publishType === "series" || editingSeriesTitle) && (
          <form onSubmit={handleSaveCmsSeries} className="space-y-4 max-w-4xl animate-fade-in">
            
            {/* EDITING STATUS BANNER */}
            {editingSeriesTitle && (
              <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-between text-[11px] text-amber-300">
                <span className="font-semibold font-sans">✏️ Editing Series Catalog Asset: <b className="text-white font-black">{editingSeriesTitle}</b></span>
                <button type="button" onClick={resetCmsForm} className="text-[9px] font-mono hover:underline uppercase font-black text-amber-400 hover:text-amber-200 cursor-pointer">Cancel Edit</button>
              </div>
            )}

            {/* Series Name & Title inputs */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-mono font-black text-stone-400 uppercase tracking-widest block font-bold">Series Name *</label>
                <input 
                  type="text" 
                  required
                  placeholder="e.g. Loki" 
                  value={cmsSeriesName} 
                  onChange={(e) => setCmsSeriesName(e.target.value)} 
                  className="w-full px-4 py-3 rounded-xl bg-[#050505] border border-white/5 focus:border-[#ff2d55] text-white text-xs sm:text-sm font-semibold focus:shadow-[0_0_12px_rgba(255,45,85,0.2)] focus:ring-1 focus:ring-[#ff2d55]/40 outline-none transition-all duration-300 font-sans"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-mono font-black text-stone-400 uppercase tracking-widest block font-bold">Title (with Season detail) *</label>
                <input 
                  type="text" 
                  required
                  placeholder="e.g. Loki Season 1 (2023)" 
                  value={cmsSeriesTitle} 
                  onChange={(e) => setCmsSeriesTitle(e.target.value)} 
                  className="w-full px-4 py-3 rounded-xl bg-[#050505] border border-white/5 focus:border-[#ff2d55] text-white text-xs sm:text-sm font-semibold focus:shadow-[0_0_12px_rgba(255,45,85,0.2)] focus:ring-1 focus:ring-[#ff2d55]/40 outline-none transition-all duration-300 font-sans"
                />
              </div>
            </div>

            {/* Season Number & Poster URL */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-mono font-black text-stone-400 uppercase tracking-widest block font-bold">Season Number *</label>
                <input 
                  type="number" 
                  required
                  min="1"
                  placeholder="e.g. 1" 
                  value={cmsSeriesSeason} 
                  onChange={(e) => setCmsSeriesSeason(e.target.value)} 
                  className="w-full px-4 py-3 rounded-xl bg-[#050505] border border-white/5 focus:border-[#ff2d55] text-white text-xs sm:text-sm font-semibold focus:shadow-[0_0_12px_rgba(255,45,85,0.2)] focus:ring-1 focus:ring-[#ff2d55]/40 outline-none transition-all duration-300 font-sans"
                />
              </div>
              <div className="sm:col-span-2 space-y-1.5">
                <label className="text-[10px] font-mono font-black text-stone-400 uppercase tracking-widest block font-bold">Image / Poster URL *</label>
                <input 
                  type="text" 
                  required
                  placeholder="e.g. https://images.unsplash.com/photo-..." 
                  value={cmsSeriesImage} 
                  onChange={(e) => setCmsSeriesImage(e.target.value)} 
                  className="w-full px-4 py-3 rounded-xl bg-[#050505] border border-white/5 focus:border-[#ff2d55] text-white text-xs sm:text-sm font-semibold focus:shadow-[0_0_12px_rgba(255,45,85,0.2)] focus:ring-1 focus:ring-[#ff2d55]/40 outline-none transition-all duration-300 font-sans"
                />
              </div>
            </div>

            {/* Episode Count (Dynamic URLs list generator) */}
            <div className="p-4 sm:p-5 rounded-2xl bg-[#09090d] border border-white/5 space-y-4 shadow-inner">
              <div className="space-y-1.5 max-w-xs">
                <label className="text-[10px] font-mono font-black text-stone-400 uppercase tracking-widest block font-bold">Episode Count *</label>
                <input 
                  type="number" 
                  required
                  min="1"
                  max="100"
                  placeholder="e.g. 10" 
                  value={cmsSeriesEpisodeCount} 
                  onChange={(e) => handleEpisodeCountChange(e.target.value)} 
                  className="w-full px-4 py-3 rounded-xl bg-[#050505] border border-[#ff2d55]/30 focus:border-[#ff2d55] text-[#ff2d55] text-xs font-mono outline-none shadow-sm shadow-[#ff2d55]/5"
                />
              </div>

              {/* Dyn generated episode inputs */}
              {cmsSeriesEpisodeUrls.length > 0 && (
                <div className="space-y-3.5 pt-2 border-t border-white/5 max-h-[350px] overflow-y-auto pr-1">
                  <p className="text-[10px] font-mono font-black text-amber-500 uppercase tracking-widest flex items-center gap-2 leading-none">
                    <Laptop size={13} />
                    <span>Map Episode Streaming / Download URLs</span>
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {cmsSeriesEpisodeUrls.map((url, index) => (
                      <div key={index} className="space-y-1.5 p-3 rounded-xl bg-[#06060a] border border-white/5 hover:border-[#ff2d55]/20 hover:bg-[#ff2d55]/2 transition-all">
                        <div className="flex items-center justify-between">
                          <label className="text-[9px] font-mono font-black text-[#ff2d55] uppercase tracking-wider block">
                            Episode {index + 1} Download URL
                          </label>
                          <button
                            type="button"
                            onClick={() => {
                              const updated = cmsSeriesEpisodeUrls.filter((_, i) => i !== index);
                              setCmsSeriesEpisodeUrls(updated);
                              setCmsSeriesEpisodeCount(String(updated.length));
                            }}
                            className="text-stone-500 hover:text-red-500 hover:bg-red-500/10 p-1 rounded-md transition-all cursor-pointer"
                            title={`Delete Episode ${index + 1}`}
                          >
                            <Trash2 size={12} />
                          </button>
                        </div>
                        <input 
                          type="text"
                          required
                          placeholder="Paste direct play/download link" 
                          value={url} 
                          onChange={(e) => {
                            const updated = [...cmsSeriesEpisodeUrls];
                            updated[index] = e.target.value;
                            setCmsSeriesEpisodeUrls(updated);
                          }} 
                          className="w-full px-3 py-2 rounded-lg bg-[#050510] border border-white/5 focus:border-[#ff2d55] text-stone-200 text-xs font-mono outline-none"
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Crew detail */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-mono font-black text-stone-400 uppercase tracking-widest block font-bold">Director</label>
                <input 
                  type="text" 
                  placeholder="e.g. Kate Herron" 
                  value={cmsSeriesDirector} 
                  onChange={(e) => setCmsSeriesDirector(e.target.value)} 
                  className="w-full px-4 py-3 rounded-xl bg-[#050505] border border-white/5 focus:border-[#ff2d55] text-white text-xs sm:text-sm font-semibold focus:shadow-[0_0_12px_rgba(255,45,85,0.2)] focus:ring-1 focus:ring-[#ff2d55]/40 outline-none transition-all duration-300 font-sans"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-mono font-black text-stone-400 uppercase tracking-widest block font-bold">Starring Credits</label>
                <input 
                  type="text" 
                  placeholder="e.g. Tom Hiddleston, Owen Wilson" 
                  value={cmsSeriesStarring} 
                  onChange={(e) => setCmsSeriesStarring(e.target.value)} 
                  className="w-full px-4 py-3 rounded-xl bg-[#050505] border border-white/5 focus:border-[#ff2d55] text-white text-xs sm:text-sm font-semibold focus:shadow-[0_0_12px_rgba(255,45,85,0.2)] focus:ring-1 focus:ring-[#ff2d55]/40 outline-none transition-all duration-300 font-sans"
                />
              </div>
            </div>

            {/* Classification Genres */}
            <div className="space-y-2">
              <label className="text-[10px] font-mono font-black text-stone-400 uppercase tracking-widest block font-bold">Genres (comma separated)</label>
              <input 
                type="text" 
                placeholder="e.g. Sci-Fi, Action, Adventure" 
                value={cmsSeriesGenres} 
                onChange={(e) => setCmsSeriesGenres(e.target.value)} 
                className="w-full px-4 py-3 rounded-xl bg-[#050505] border border-white/5 focus:border-[#ff2d55] text-white text-xs sm:text-sm font-semibold focus:shadow-[0_0_12px_rgba(255,45,85,0.2)] focus:ring-1 focus:ring-[#ff2d55]/40 outline-none transition-all duration-300 font-sans mb-1.5"
              />
              <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto pr-1">
                {["Sci-Fi", "Action", "Adventure", "Fantasy", "Mystery", "Drama", "Comedy", "Thriller", "Horror", "Crime"].map((g) => {
                  const list = cmsSeriesGenres.split(",").map(i => i.trim().toLowerCase());
                  const exists = list.includes(g.toLowerCase());
                  return (
                    <button
                      key={g}
                      type="button"
                      onClick={() => {
                        const currentList = cmsSeriesGenres.split(",").map(i => i.trim()).filter(Boolean);
                        if (exists) {
                          setCmsSeriesGenres(currentList.filter(i => i.toLowerCase() !== g.toLowerCase()).join(", "));
                        } else {
                          setCmsSeriesGenres([...currentList, g].join(", "));
                        }
                      }}
                      className={`px-3 py-1 rounded-lg text-[10px] font-mono font-bold uppercase tracking-wider transition-all border ${
                        exists 
                          ? "bg-amber-500/15 text-amber-500 border-amber-500/30 shadow-sm" 
                          : "bg-[#050505]/60 text-stone-400 border-white/5 hover:border-white/10"
                      }`}
                    >
                      {exists ? `✓ ${g}` : `+ ${g}`}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Metadata attributes */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-mono font-black text-stone-400 uppercase tracking-widest block font-bold">Print Quality</label>
                <input 
                  type="text" 
                  placeholder="e.g. WEBRip" 
                  value={cmsSeriesQuality} 
                  onChange={(e) => setCmsSeriesQuality(e.target.value)} 
                  className="w-full px-4 py-3 rounded-xl bg-[#050505] border border-white/5 focus:border-[#ff2d55] text-white text-xs sm:text-sm font-semibold focus:shadow-[0_0_12px_rgba(255,45,85,0.2)] outline-none"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-mono font-black text-stone-400 uppercase tracking-widest block font-bold">Language</label>
                <input 
                  type="text" 
                  placeholder="e.g. English" 
                  value={cmsSeriesLanguage} 
                  onChange={(e) => setCmsSeriesLanguage(e.target.value)} 
                  className="w-full px-4 py-3 rounded-xl bg-[#050505] border border-white/5 focus:border-[#ff2d55] text-white text-xs sm:text-sm font-semibold focus:shadow-[0_0_12px_rgba(255,45,85,0.2)] outline-none"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-mono font-black text-stone-400 uppercase tracking-widest block font-bold">Rating</label>
                <input 
                  type="text" 
                  placeholder="e.g. 8.7/10" 
                  value={cmsSeriesRating} 
                  onChange={(e) => setCmsSeriesRating(e.target.value)} 
                  className="w-full px-4 py-3 rounded-xl bg-[#050505] border border-white/5 focus:border-[#ff2d55] text-white text-xs sm:text-sm font-semibold focus:shadow-[0_0_12px_rgba(255,45,85,0.2)] outline-none"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-mono font-black text-stone-400 uppercase tracking-widest block font-bold">Pub Date *</label>
                <input 
                  type="text" 
                  required
                  placeholder="e.g. Nov 15, 2024" 
                  value={cmsSeriesLastUpdated} 
                  onChange={(e) => setCmsSeriesLastUpdated(e.target.value)} 
                  className="w-full px-4 py-3 rounded-xl bg-[#050505] border border-white/5 focus:border-[#ff2d55] text-white text-xs sm:text-sm font-semibold focus:shadow-[0_0_12px_rgba(255,45,85,0.2)] outline-none"
                />
              </div>
            </div>

            {/* Action buttons */}
            <div className="pt-2 flex gap-4 max-w-sm pb-2 font-sans text-xs">
              <button 
                type="submit"
                className="flex-1 py-4 px-6 rounded-xl bg-gradient-to-r from-red-650 to-amber-500 border border-white/10 text-white font-sans font-black text-xs uppercase tracking-widest flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(239,68,68,0.25)] hover:brightness-115 active:scale-98 transition-all cursor-pointer font-bold animate-pulse"
              >
                <UploadCloud size={16} />
                <span>{editingSeriesTitle ? "Apply Update" : "Upload Series"}</span>
              </button>

              {(editingSeriesTitle || cmsSeriesName || cmsSeriesTitle || cmsSeriesImage) && (
                <button 
                  type="button"
                  onClick={resetCmsForm}
                  className="py-4 px-6 rounded-xl bg-white/5 hover:bg-white/10 border border-white/5 text-stone-400 hover:text-stone-100 font-sans font-black text-xs uppercase tracking-wider cursor-pointer active:scale-98 transition-all shrink-0"
                >
                  Reset
                </button>
              )}
            </div>

          </form>
        )}

        {/* SUB TAB: PENDING REQUEST TICKETS LIST WITHIN ADMIN */}
        {adminSubTab === "requests" && (
          <div className="space-y-3.5 max-w-4xl max-h-[550px] overflow-y-auto pr-1">
            {requests.filter(r => r.status !== "Uploaded").length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center text-center py-16 px-6 space-y-3 font-sans">
                <CheckCircle2 size={36} className="text-emerald-500 animate-bounce" />
                <div className="space-y-1 font-sans">
                  <p className="text-white font-black text-sm uppercase tracking-wider leading-none">All Queues Cleared</p>
                  <p className="text-xs text-stone-500 max-w-xs font-semibold leading-relaxed pt-1">
                    There are no active community requests in the queue right now.
                  </p>
                </div>
              </div>
            ) : (
              requests.filter(r => r.status !== "Uploaded").map(r => (
                <div 
                  key={r.id}
                  className="p-4 rounded-2xl bg-[#0c0c0e] border border-white/5 hover:border-amber-500/15 transition-all flex items-center justify-between gap-4 max-w-3xl animate-fade-in"
                >
                  <div className="min-w-0 space-y-1.5 flex-1 font-sans">
                    <h5 className="font-sans font-black text-xs sm:text-sm text-stone-200 truncate">{r.movieName} {r.year && <span className="text-stone-500 font-mono">({r.year})</span>}</h5>
                    <div className="flex items-center gap-1.5 text-[9px] font-mono text-stone-400 uppercase font-black tracking-wider flex-wrap leading-none">
                      <span className="text-[#ff2d55] bg-[#ff2d55]/5 border border-[#ff2d55]/10 px-1 py-0.5 rounded text-[8px]">{r.genre}</span>
                      <span>•</span>
                      <span>{r.language}</span>
                      <span>•</span>
                      <span>{r.quality.split(" ")[0]}</span>
                      <span>•</span>
                      <span>{r.timeAgo}</span>
                    </div>
                    {r.comments && (
                      <p className="text-[10px] text-stone-500 font-medium italic truncate max-w-xs">💬 "{r.comments}"</p>
                    )}
                    <span className="text-[10px] font-mono text-rose-500 font-black flex items-center gap-1.5 pt-0.5">
                      <span>Priority queue: {r.requestCount} upvotes</span>
                    </span>
                  </div>

                  <button
                    onClick={() => handleStartRequestFulfillmentCMS(r)}
                    className="bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/25 py-2 px-3 rounded-lg text-[9px] font-sans font-black uppercase tracking-widest flex items-center gap-1 cursor-pointer active:scale-95 transition-all shrink-0 font-bold"
                  >
                    <span>Inject</span>
                    <ChevronRight size={10} />
                  </button>
                </div>
              ))
            )}
          </div>
        )}

        {/* SUB TAB: COMPREHENSIVE COMPANION DATABASE CATALOG FOR MOVIE / SERIES */}
        {adminSubTab === "catalog" && (
          <div className="space-y-4 max-w-4xl animate-fade-in text-stone-100">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              {/* Media selection tab */}
              <div className="flex bg-[#050505] p-1 rounded-xl border border-white/5 gap-1 shadow-inner w-full sm:w-auto">
                <button
                  type="button"
                  onClick={() => setCatalogFilterType("movies")}
                  className={`flex-1 sm:flex-none px-4 py-1.5 text-[10px] font-sans font-black uppercase tracking-widest rounded-lg transition-all cursor-pointer ${
                    catalogFilterType === "movies"
                      ? "bg-gradient-to-r from-[#ff2d55] to-[#ff6b00] text-white shadow-md shadow-[#ff2d55]/10"
                      : "text-stone-400 hover:text-stone-100"
                  }`}
                >
                  🎬 Movies ({movies.length})
                </button>
                <button
                  type="button"
                  onClick={() => setCatalogFilterType("series")}
                  className={`flex-1 sm:flex-none px-4 py-1.5 text-[10px] font-sans font-black uppercase tracking-widest rounded-lg transition-all cursor-pointer ${
                    catalogFilterType === "series"
                      ? "bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-md shadow-amber-500/10"
                      : "text-stone-400 hover:text-stone-100"
                  }`}
                >
                  📺 Series ({series?.length || 0})
                </button>
              </div>

              {/* Search input bar */}
              <div className="relative w-full sm:max-w-xs">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-600" size={13} strokeWidth={3} />
                <input 
                  type="text" 
                  placeholder={catalogFilterType === "movies" ? "Search catalog movies..." : "Search catalog series..."}
                  value={catalogSearch}
                  onChange={(e) => setCatalogSearch(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 rounded-lg bg-[#050505] border border-white/5 focus:border-[#ff2d55] text-white text-xs font-semibold outline-none focus:shadow-[0_0_8px_rgba(255,45,85,0.15)] ring-1 ring-transparent font-sans"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-[500px] overflow-y-auto pr-1">
              {(() => {
                if (catalogFilterType === "movies") {
                  const filtered = movies.filter(m => {
                    const titleMatch = m.title ? m.title.toLowerCase().includes(catalogSearch.toLowerCase()) : false;
                    const nameMatch = m.movieName ? m.movieName.toLowerCase().includes(catalogSearch.toLowerCase()) : false;
                    const directorMatch = m.director ? m.director.toLowerCase().includes(catalogSearch.toLowerCase()) : false;
                    return titleMatch || nameMatch || directorMatch;
                  });

                  if (filtered.length === 0) {
                    return (
                      <p className="col-span-1 md:col-span-2 text-center py-10 text-stone-600 text-xs font-bold uppercase tracking-widest select-none leading-relaxed">
                        No movies matched your search parameters
                      </p>
                    );
                  }

                  return filtered.map((m, mIdx) => {
                    const mId = m.id || m.title.replace(/[^a-zA-Z0-9_\-]/g, "_");
                    return (
                      <div 
                        key={`${m.title || mId}-${mIdx}`}
                        className="p-3 rounded-2xl bg-[#0c0c0e] border border-white/5 flex items-center gap-3 hover:border-white/10 transition-all font-sans"
                      >
                        <img 
                          src={m.image} 
                          alt={m.movieName} 
                          referrerPolicy="no-referrer"
                          className="w-10 h-14 rounded-lg object-cover bg-stone-900 border border-white/5 shrink-0"
                        />
                        <div className="min-w-0 flex-1 space-y-1 font-sans">
                          <h6 className="font-sans font-black text-xs sm:text-sm text-stone-200 truncate leading-tight">{m.title}</h6>
                          <div className="flex items-center gap-1.5 text-[9px] font-mono text-stone-500 uppercase font-black flex-wrap">
                            <span className="text-[#ff2d55]">{m.language}</span>
                            <span>•</span>
                            <span>{m.quality}</span>
                            <span>•</span>
                            <span className="text-amber-400">★ {m.rating}</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0">
                          <button
                            type="button"
                            onClick={() => handleEditExistingMovie(m)}
                            className="p-2 rounded-lg bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 border border-blue-500/20 active:scale-95 transition-all cursor-pointer"
                            title="Edit Film Link"
                          >
                            <Edit size={12} />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteMovieCMS(mId, m.movieName)}
                            className="p-2 rounded-lg bg-[#ff2d55]/10 hover:bg-[#ff2d55]/20 text-[#ff2d55] border border-[#ff2d55]/25 active:scale-95 transition-all cursor-pointer"
                            title="Wipe Film Index"
                          >
                            <Trash2 size={12} />
                          </button>
                        </div>
                      </div>
                    );
                  });
                } else {
                  const filteredSeries = (series || []).filter(s => {
                    const titleMatch = s.title ? s.title.toLowerCase().includes(catalogSearch.toLowerCase()) : false;
                    const nameMatch = s.seriesName ? s.seriesName.toLowerCase().includes(catalogSearch.toLowerCase()) : false;
                    const directorMatch = s.director ? s.director.toLowerCase().includes(catalogSearch.toLowerCase()) : false;
                    return titleMatch || nameMatch || directorMatch;
                  });

                  if (filteredSeries.length === 0) {
                    return (
                      <p className="col-span-1 md:col-span-2 text-center py-10 text-stone-600 text-xs font-bold uppercase tracking-widest select-none leading-relaxed">
                        No series matched your search parameters
                      </p>
                    );
                  }

                  return filteredSeries.map((s, sIdx) => {
                    const sId = s.id || s.title.replace(/[^a-zA-Z0-9_\-]/g, "_");
                    return (
                      <div 
                        key={`${s.title || sId}-${sIdx}`}
                        className="p-3 rounded-2xl bg-[#0c0c0e] border border-white/5 flex items-center gap-3 hover:border-white/10 transition-all font-sans"
                      >
                        <img 
                          src={s.image} 
                          alt={s.seriesName} 
                          referrerPolicy="no-referrer"
                          className="w-10 h-14 rounded-lg object-cover bg-stone-900 border border-white/5 shrink-0"
                        />
                        <div className="min-w-0 flex-1 space-y-1 font-sans">
                          <h6 className="font-sans font-black text-xs sm:text-sm text-stone-200 truncate leading-tight">
                            {s.seriesName} <span className="text-[10px] text-stone-500 font-bold font-sans">S{s.seasonNumber}</span>
                          </h6>
                          <div className="flex items-center gap-1.5 text-[9px] font-mono text-stone-500 uppercase font-black flex-wrap">
                            <span className="text-[#ff2d55]">{s.language}</span>
                            <span>•</span>
                            <span>{s.quality}</span>
                            <span>•</span>
                            <span className="text-amber-500">★ {s.rating}</span>
                            <span>•</span>
                            <span className="text-orange-400">{s.episodes?.length || 0} Episodes</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0">
                          <button
                            type="button"
                            onClick={() => handleEditExistingSeries(s)}
                            className="p-2 rounded-lg bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 border border-blue-500/20 active:scale-95 transition-all cursor-pointer"
                            title="Edit Series Link"
                          >
                            <Edit size={12} />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteSeriesCMS(sId, s.seriesName)}
                            className="p-2 rounded-lg bg-[#ff2d55]/10 hover:bg-[#ff2d55]/20 text-[#ff2d55] border border-[#ff2d55]/25 active:scale-95 transition-all cursor-pointer"
                            title="Wipe Series Index"
                          >
                            <Trash2 size={12} />
                          </button>
                        </div>
                      </div>
                    );
                  });
                }
              })()}
            </div>
          </div>
        )}

        {/* Global Delete Confirmation overlay modal */}
        <AnimatePresence>
          {deleteConfirmationState.isOpen && (
            <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setDeleteConfirmationState(prev => ({ ...prev, isOpen: false }))}
                className="absolute inset-0 bg-black/85 backdrop-blur-md"
              />
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 15 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 15 }}
                transition={{ type: "spring", damping: 25, stiffness: 350 }}
                className="relative w-full max-w-sm rounded-[24px] bg-gradient-to-b from-[#181618] to-[#0c0a0c] border border-[#ff2d55]/30 p-6 shadow-[0_30px_70px_rgba(255,45,85,0.25)] space-y-5 text-center font-sans"
              >
                <div className="w-12 h-12 rounded-full bg-[#ff2d55]/10 border border-[#ff2d55]/30 flex items-center justify-center mx-auto text-[#ff2d55] shadow-[0_0_15px_rgba(255,45,85,0.2)]">
                  <AlertTriangle size={24} />
                </div>
                <div className="space-y-2">
                  <h4 className="text-sm font-sans font-black text-[#ff2d55] uppercase tracking-widest leading-none">
                    Confirm Catalog Wipe
                  </h4>
                  <p className="text-xs text-stone-300 font-semibold leading-relaxed">
                    Are you sure you want to delete this item?
                  </p>
                  <div className="text-[11px] font-mono text-stone-400 bg-black/60 px-3 py-2 rounded-xl border border-white/5 truncate select-all">
                    {deleteConfirmationState.itemTitle}
                  </div>
                </div>
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => setDeleteConfirmationState(prev => ({ ...prev, isOpen: false }))}
                    className="flex-1 py-3 rounded-xl bg-white/5 hover:bg-white/10 text-stone-300 hover:text-white font-sans font-black text-[10px] uppercase tracking-wider transition-all cursor-pointer border border-white/5 active:scale-95 text-center shadow-inner"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={async () => {
                      const { itemId, itemTitle, itemType } = deleteConfirmationState;
                      setDeleteConfirmationState(prev => ({ ...prev, isOpen: false }));
                      try {
                        if (itemType === "movie") {
                          if (onAdminDeleteMovie) {
                            await onAdminDeleteMovie(itemId);
                          }
                        } else {
                          if (onAdminDeleteSeries) {
                            await onAdminDeleteSeries(itemId);
                          }
                        }
                        setAlertState({
                          type: "success",
                          message: "Deleted successfully"
                        });
                      } catch (err: any) {
                        console.error(err);
                        setAlertState({
                          type: "error",
                          message: "Deletion failed: " + (err.message || String(err))
                        });
                      }
                      setTimeout(() => setAlertState(null), 6000);
                    }}
                    className="flex-1 py-3 rounded-xl bg-gradient-to-r from-red-600 to-rose-600 hover:brightness-110 text-white font-sans font-black text-[10px] uppercase tracking-wider transition-all cursor-pointer shadow-[0_0_15px_rgba(220,38,38,0.3)] active:scale-95 text-center"
                  >
                    Delete
                  </button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start relative select-none pb-12">
      
      {/* LEFT COLUMN: Clean glass design Submission Deck form */}
      <div 
        className="lg:col-span-6 rounded-3xl bg-gradient-to-b from-[#0a0a0f]/95 via-black/98 to-[#050505]/95 border border-white/5 p-5 sm:p-7 shadow-[0_20px_50px_rgba(255,45,85,0.12)] space-y-6 relative overflow-hidden backdrop-blur-3xl"
        id="submission-deck"
      >
        <div className="absolute top-0 right-0 w-36 h-36 bg-[#ff2d55]/5 rounded-full blur-3xl pointer-events-none" />
        
        <div className="space-y-2 border-b border-white/5 pb-4">
          <div className="flex items-center gap-2.5">
            <PlusCircle className="text-[#ff2d55] drop-shadow-[0_0_12px_rgba(255,45,85,0.8)] animate-pulse" size={26} />
            <h3 className="font-sans font-black text-xl sm:text-2xl text-white tracking-tight">
              Request Studio
            </h3>
          </div>
          <p className="text-xs text-stone-400 leading-relaxed font-sans font-semibold">
            Can't find a classic or audio release on MovieMachi? Create a ticket! The system scans shared networks to index elite prints instantly.
          </p>
        </div>

        {/* Dynamic Alert Messages */}
        <AnimatePresence>
          {alertState && (
            <motion.div
              initial={{ height: 0, opacity: 0, scale: 0.95 }}
              animate={{ height: "auto", opacity: 1, scale: 1 }}
              exit={{ height: 0, opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.25 }}
              className={`p-4 rounded-2xl border text-xs sm:text-sm flex items-start gap-3 relative overflow-hidden ${
                alertState.type === "duplicate"
                  ? "bg-amber-500/10 border-amber-500/40 text-amber-400 font-sans font-black tracking-wide"
                  : alertState.type === "success"
                  ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400 font-sans font-semibold"
                  : alertState.type === "upvote"
                  ? "bg-gradient-to-r from-[#ff2d55]/10 to-[#ff6b00]/10 border-[#ff2d55]/40 text-[#ff2d55] font-sans font-black"
                  : "bg-red-500/10 border-red-500/30 text-red-400 font-sans font-bold"
              }`}
            >
              {alertState.type === "duplicate" ? (
                <AlertTriangle size={18} className="shrink-0 mt-0.5 animate-bounce text-amber-500" />
              ) : alertState.type === "success" ? (
                <CheckCircle size={18} className="shrink-0 mt-0.5 animate-pulse text-emerald-400" />
              ) : alertState.type === "upvote" ? (
                <Flame size={18} className="shrink-0 mt-0.5 animate-bounce text-[#ff6b00]" />
              ) : (
                <HelpCircle size={18} className="shrink-0 mt-0.5" />
              )}
              <div className="flex-1">
                <p className="font-bold uppercase tracking-wider text-[11px] opacity-85 mb-0.5">
                  {alertState.type === "duplicate" 
                    ? "Asset Verified" 
                    : alertState.type === "success" 
                    ? "Request Decoded" 
                    : alertState.type === "upvote"
                    ? "Weight Amplified"
                    : "Network Alert"}
                </p>
                <p className="font-sans text-xs sm:text-[13px] leading-relaxed">{alertState.message}</p>
              </div>
              <button 
                onClick={() => setAlertState(null)}
                className="text-stone-400 hover:text-white transition-colors cursor-pointer text-xs font-black px-1.5 self-center"
              >
                ✕
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* OTT Input form */}
        <form onSubmit={handleSubmit} className="space-y-5 font-sans">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            
            {/* Movie Title */}
            <div className="space-y-1.5 col-span-1 sm:col-span-2">
              <label className="text-[10px] font-mono font-black text-stone-400 uppercase tracking-widest block">
                Movie / Series Name:
              </label>
              <input
                type="text"
                required
                value={movieName}
                onChange={(e) => setMovieName(e.target.value)}
                placeholder="e.g. Coolie, Kanguva, Vidaamuyarchi"
                className="w-full px-4 py-3 rounded-xl bg-gradient-to-r from-[#050505] to-[#111111] focus:bg-black border border-white/5 focus:border-[#ff2d55] outline-none text-white text-xs sm:text-sm font-semibold transition-all duration-300 placeholder:text-stone-600 focus:shadow-[0_0_15px_rgba(255,45,85,0.3)] touch-target-height focus:ring-1 focus:ring-[#ff2d55]/40"
              />
            </div>

            {/* Launch Year */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-mono font-black text-stone-400 uppercase tracking-widest block">
                Release Year:
              </label>
              <input
                type="text"
                value={year}
                maxLength={4}
                onChange={(e) => setYear(e.target.value.replace(/\D/g, ""))}
                placeholder={`e.g. ${new Date().getFullYear()}`}
                className="w-full px-4 py-3 rounded-xl bg-gradient-to-r from-[#050505] to-[#111111] focus:bg-black border border-white/5 focus:border-[#ff2d55] outline-none text-white text-xs sm:text-sm font-semibold transition-all duration-300 placeholder:text-stone-600 focus:shadow-[0_0_15px_rgba(255,45,85,0.3)] touch-target-height focus:ring-1 focus:ring-[#ff2d55]/40"
              />
            </div>

            {/* Language Feed - Premium Custom Dropdown */}
            <PremiumDropdown 
              label="Language Feed:"
              value={language}
              options={languageOptions}
              onChange={setLanguage}
            />

          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            
            {/* Genre selection - Premium Custom Dropdown */}
            <PremiumDropdown 
              label="Primary Genre:"
              value={genre}
              options={genreOptions}
              onChange={setGenre}
            />

            {/* Requested Quality - Premium Custom Dropdown */}
            <PremiumDropdown 
              label="Requested Quality:"
              value={quality}
              options={qualityOptions}
              onChange={setQuality}
            />

          </div>

          {/* Comments block */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-[10px] font-mono font-black text-stone-400 uppercase tracking-widest block">
                Additional Notes:
              </label>
              <span className="text-[9px] text-[#ff2d55] font-black uppercase tracking-wider bg-[#ff2d55]/10 px-1.5 py-0.5 rounded">Optional</span>
            </div>
            <textarea
              value={comments}
              onChange={(e) => setComments(e.target.value)}
              placeholder="e.g. Dolby surround sound 5.1 track preferred if available..."
              className="w-full px-4 py-3 rounded-xl bg-gradient-to-r from-[#050505] to-[#111111] focus:bg-black border border-white/5 focus:border-[#ff2d55] outline-none text-white text-xs sm:text-sm font-semibold h-20 resize-none transition-all duration-300 placeholder:text-stone-600 focus:shadow-[0_0_15px_rgba(255,45,85,0.3)] focus:ring-1 focus:ring-[#ff2d55]/40"
            />
          </div>

          <button
            type="submit"
            className="w-full py-4 rounded-xl bg-gradient-to-r from-[#ff2d55] to-[#ff6b00] hover:brightness-110 active:scale-98 focus:ring-2 focus:ring-[#ff2d55] outline-none transition-all border border-white/10 text-white font-sans font-black text-xs sm:text-sm uppercase tracking-widest shadow-[0_0_20px_rgba(255,45,85,0.35)] flex items-center justify-center gap-2 group cursor-pointer hover:shadow-[0_0_25px_rgba(255,45,85,0.5)] touch-target"
            id="ticket-button"
            tabIndex={0}
          >
            <Send size={15} className="group-hover:translate-x-1 group-hover:-translate-y-0.5 transition-transform" />
            <span>SUBMIT MOVIE REQUEST</span>
          </button>
        </form>

      </div>

      {/* RIGHT COLUMN: Tabbed community ledger display */}
      <div className="lg:col-span-6 space-y-5" id="ledger-column">
        
        {/* Tab Selection Headers */}
        <div className="p-1 rounded-2xl bg-[#0a0a0f] border border-white/5 grid grid-cols-2 gap-1 shadow-lg">
          <button
            onClick={() => { setLedgerTab("public"); setFulfillRequestId(null); }}
            className={`py-3 px-1.5 rounded-xl font-sans font-black text-[10px] sm:text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 cursor-pointer focus:outline-none focus:ring-1 focus:ring-[#ff2d55] ${
              ledgerTab === "public"
                ? "bg-[#ff2d55]/15 text-[#ff2d55] border border-[#ff2d55]/30 shadow-[0_0_12px_rgba(255,45,85,0.2)]"
                : "text-stone-400 hover:text-stone-200"
            }`}
          >
            <Database size={13} />
            <span>Public Board ({requests.length})</span>
          </button>

          <button
            onClick={() => { setLedgerTab("admin"); setFulfillRequestId(null); }}
            className={`py-3 px-1.5 rounded-xl font-sans font-black text-[10px] sm:text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 cursor-pointer focus:outline-none focus:ring-1 focus:ring-amber-500 ${
              ledgerTab === "admin"
                ? "bg-[#443711] text-amber-400 border border-amber-500/30 shadow-[0_0_12px_rgba(245,158,11,0.25)]"
                : "text-stone-400 hover:text-stone-200"
            }`}
          >
            <ShieldCheck size={13} />
            <span>Admin Login</span>
          </button>
        </div>

        {/* Tab Body Box */}
        <div 
          className="rounded-3xl bg-gradient-to-b from-[#0e0c0f]/95 via-black/98 to-[#050505]/95 border border-white/5 p-4 sm:p-6 min-h-[460px] flex flex-col relative overflow-hidden backdrop-blur-3xl shadow-[0_20px_50px_rgba(0,0,0,0.85)]"
          id="tab-content-area"
        >
          <div className="absolute inset-0 bg-[#ff2d55]/2 blur-[100px] pointer-events-none -y-z-10" />
          
          <AnimatePresence mode="wait">
            
            {/* TAB 1: Public Community Ledger Board */}
            {ledgerTab === "public" && (
              <motion.div
                key="public"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                className="space-y-4 flex flex-col flex-1"
              >
                <div className="border-b border-white/5 pb-3">
                  <h4 className="font-sans font-black text-sm text-stone-200 uppercase tracking-widest flex items-center gap-2">
                    <Database size={14} className="text-[#ff2d55]" />
                    <span>Seeding Ledger Priorities</span>
                  </h4>
                  <p className="text-[10px] text-stone-500 font-semibold tracking-wide">
                    Demands sorted globally by support votes. Anyone can like an existing demand:
                  </p>
                </div>

                {publicLedgerRequests.length === 0 ? (
                  <div className="flex-1 flex flex-col items-center justify-center text-center p-6 space-y-3 font-sans">
                    <div className="w-14 h-14 rounded-full bg-white/2 border border-white/5 flex items-center justify-center text-stone-600 shadow-[0_0_15px_rgba(255,255,255,0.02)]">
                      <HelpCircle size={24} />
                    </div>
                    <div className="space-y-1">
                      <p className="text-white font-extrabold text-sm uppercase tracking-wider">Empty Demand Book</p>
                      <p className="text-xs text-stone-500 max-w-xs font-semibold leading-relaxed">
                        Currently no movie request tickets active. Create the first request on the left deck!
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4 max-h-[380px] overflow-y-auto pr-1">
                    {publicLedgerRequests.map((r) => {
                      const hasVoted = r.requesters.includes(userId);
                      return (
                        <div 
                          key={r.id}
                          className="p-4 rounded-2xl bg-gradient-to-br from-[#0c0c12]/90 to-[#050505]/95 hover:from-[#110003]/90 hover:to-[#050505]/98 border border-white/5 hover:border-[#ff2d55]/30 focus-within:border-[#ff2d55]/50 transition-all duration-300 relative group"
                        >
                          {/* Card Content Layout */}
                          <div className="space-y-3">
                            
                            {/* Row 1: Header Title and Status Badge */}
                            <div className="flex items-start justify-between gap-3">
                              <div className="space-y-1">
                                <h5 className="font-sans font-black text-xs sm:text-sm text-stone-100 group-hover:text-white transition-colors flex items-center gap-1.5 flex-wrap">
                                  <span>{r.movieName}</span>
                                  {r.year && <span className="text-[#ff6b00] font-mono text-[10px] bg-white/5 border border-white/10 px-1.5 py-0.2 rounded font-black">({r.year})</span>}
                                </h5>
                                
                                {/* Info details tags */}
                                <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[9px] text-stone-500 font-bold uppercase tracking-wider">
                                  <span className="text-[#ff2d55] font-black">{r.genre}</span>
                                  <span>•</span>
                                  <span>{r.language}</span>
                                  <span>•</span>
                                  <span className="text-stone-400">{r.quality}</span>
                                </div>
                              </div>

                              {/* Status Badge */}
                              <div className="shrink-0">
                                {r.status === "Pending" && (
                                  <span className="inline-flex items-center gap-1 text-[9px] font-mono font-black px-2.5 py-0.5 rounded-full border bg-amber-500/10 text-amber-500 border-amber-500/20 animate-pulse tracking-wider">
                                    <span>⏳ PENDING</span>
                                  </span>
                                )}
                                {r.status === "Under Review" && (
                                  <span className="inline-flex items-center gap-1 text-[9px] font-mono font-black px-2.5 py-0.5 rounded-full border bg-purple-500/15 text-purple-400 border-purple-500/35 tracking-wider">
                                    <span>🔄 REVIEW</span>
                                  </span>
                                )}
                                {r.status === "Uploaded" && (
                                  <span className="inline-flex items-center gap-1 text-[9px] font-mono font-black px-2.5 py-0.5 rounded-full border bg-emerald-500/15 text-emerald-400 border-emerald-500/35 tracking-wider">
                                    <span>✅ UPLOADED</span>
                                  </span>
                                )}
                              </div>
                            </div>

                            {/* Optional Remarks note snippet */}
                            {r.comments && (
                              <p className="text-[11px] text-stone-400 font-sans italic border-l-2 border-[#ff2d55]/30 pl-2.5 py-0.5 bg-white/1 rounded-r-md">
                                "{r.comments}"
                              </p>
                            )}

                            {/* Row 3: Action Buttons & Demands details */}
                            <div className="pt-2 border-t border-white/5 flex items-center justify-between gap-3 text-[10px] font-mono font-semibold text-stone-500">
                              
                              <div className="flex items-center gap-2">
                                <span className="inline-flex items-center gap-1 text-[10px] font-mono font-black text-stone-400 bg-white/2 border border-white/5 px-2 py-0.5 rounded-md">
                                  <Heart size={10} className="text-[#ff2d55] fill-[#ff2d55]" />
                                  <span>{r.requestCount} Votes</span>
                                </span>
                                
                                <span className="text-[9px] text-stone-600 flex items-center gap-1">
                                  <Clock size={9} />
                                  <span>{r.timeAgo}</span>
                                </span>
                                {r.requesterUsername && (
                                  <span className="text-[9px] text-[#ff6b00] font-black font-mono">
                                    • {r.requesterUsername}
                                  </span>
                                )}
                              </div>

                              <div className="shrink-0">
                                {r.status === "Uploaded" ? (
                                  <button
                                    onClick={() => {
                                      const matched = movies.find(
                                        m => m.movieName.toLowerCase() === r.movieName.toLowerCase() ||
                                             m.title.toLowerCase().includes(r.movieName.toLowerCase())
                                      );
                                      if (matched) {
                                        setActivePlayerMovie(matched);
                                      }
                                    }}
                                    className="bg-emerald-500/10 hover:bg-emerald-500/25 border border-emerald-500/30 hover:border-emerald-500 text-emerald-400 text-[10px] sm:text-xs font-sans font-black py-1 px-3 rounded-lg flex items-center gap-1 cursor-pointer transition-all active:scale-95"
                                  >
                                    <Play size={11} fill="currentColor" />
                                    <span>Stream</span>
                                  </button>
                                ) : (
                                  <button
                                    disabled={hasVoted}
                                    onClick={() => onUpvoteRequest(r.id)}
                                    className={`py-1.5 px-3 rounded-lg font-sans font-black text-[10px] uppercase tracking-wider transition-all cursor-pointer flex items-center gap-1 focus:outline-none focus:ring-1 focus:ring-[#ff2d55]/50 ${
                                      hasVoted
                                        ? "bg-stone-900/40 text-stone-600 border border-stone-800/40 cursor-not-allowed"
                                        : "bg-[#ff2d55]/10 text-white hover:bg-gradient-to-r hover:from-[#ff2d55] hover:to-[#ff6b00] border border-[#ff2d55]/30 hover:border-transparent active:scale-95 shadow-sm"
                                    }`}
                                  >
                                    <ArrowUpCircle size={12} className={!hasVoted ? "text-[#ff2d55] animate-pulse" : ""} />
                                    <span>{hasVoted ? "Voted" : "Vote Request"}</span>
                                  </button>
                                )}
                              </div>

                            </div>

                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
                
                <div className="mt-auto pt-3 border-t border-white/5">
                  <div className="p-3.5 rounded-2xl bg-gradient-to-r from-[#ff2d55]/5 to-amber-500/5 border border-[#ff2d55]/10 flex items-center gap-3">
                    <Star size={14} className="text-amber-400 shrink-0" />
                    <p className="text-[10px] text-stone-400 font-sans font-semibold leading-snug">
                      Each unique request vote moves the movie higher up the priority queue. Admin control option is accessible from the Admin Center.
                    </p>
                  </div>
                </div>
              </motion.div>
            )}



            {/* TAB 3: Curators / Admin Console Simulator Area */}
            {ledgerTab === "admin" && (
              <motion.div
                key="admin"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                className="space-y-4 flex flex-col flex-1 font-sans"
              >
                {!isAdminLoggedIn ? (
                  <div className="space-y-6 py-6 flex flex-col flex-1 justify-center max-w-sm mx-auto w-full">
                    <div className="text-center space-y-2 pb-2">
                      <div className="w-14 h-14 rounded-full bg-[#ff2d55]/10 border border-[#ff2d55]/30 flex items-center justify-center mx-auto shadow-[0_0_20px_rgba(255,45,85,0.3)]">
                        <ShieldCheck className="text-[#ff2d55]" size={26} />
                      </div>
                      <h4 className="font-sans font-black text-base text-stone-100 uppercase tracking-widest">
                        Security Access Ingestion Terminal
                      </h4>
                      <p className="text-[11px] text-stone-400 font-semibold tracking-wide leading-relaxed">
                        Authorize with hardcoded system credentials to unlock advanced curator catalog control nodes.
                      </p>
                    </div>

                    <form 
                      onSubmit={(e) => {
                        e.preventDefault();
                        if (adminUsernameInput.trim() === "admin" && adminPasswordInput === "moviemachi2026") {
                          setIsAdminLoggedIn(true);
                          setAdminLoginError("");
                          setAdminPasswordInput("");
                        } else {
                          setAdminLoginError("Invalid Username or Password");
                        }
                      }}
                      className="space-y-5"
                    >
                      {adminLoginError && (
                        <div className="p-3.5 rounded-xl bg-[#ff2d55]/10 border border-[#ff2d55]/30 text-[#ff2d55] text-xs font-bold text-center leading-snug">
                          {adminLoginError}
                        </div>
                      )}

                      <div className="space-y-2">
                        <label className="text-[10px] font-mono font-black text-stone-400 uppercase tracking-widest block">
                          Ingestion Username:
                        </label>
                        <input
                          type="text"
                          required
                          value={adminUsernameInput}
                          onChange={(e) => setAdminUsernameInput(e.target.value)}
                          placeholder="e.g. admin"
                          className="w-full px-4 py-3 rounded-xl bg-gradient-to-r from-[#050505] to-[#111111] focus:bg-black border border-white/5 focus:border-[#ff2d55] outline-none text-white text-xs sm:text-sm font-semibold transition-all duration-300 placeholder:text-stone-700 focus:shadow-[0_0_12px_rgba(255,45,85,0.2)] focus:ring-1 focus:ring-[#ff2d55]/30"
                        />
                      </div>

                      <div className="space-y-2">
                        <label className="text-[10px] font-mono font-black text-stone-400 uppercase tracking-widest block">
                          Access Key / Password:
                        </label>
                        <input
                          type="password"
                          required
                          value={adminPasswordInput}
                          onChange={(e) => setAdminPasswordInput(e.target.value)}
                          placeholder="••••••••••••"
                          className="w-full px-4 py-3 rounded-xl bg-gradient-to-r from-[#050505] to-[#111111] focus:bg-black border border-white/5 focus:border-[#ff2d55] outline-none text-white text-xs sm:text-sm font-semibold transition-all duration-300 placeholder:text-stone-700 focus:shadow-[0_0_12px_rgba(255,45,85,0.2)] focus:ring-1 focus:ring-[#ff2d55]/30"
                        />
                      </div>

                      <button
                        type="submit"
                        className="w-full py-4 rounded-xl bg-gradient-to-r from-[#ff2d55] to-[#ff6b00] border border-white/10 text-white font-sans font-black text-xs uppercase tracking-widest shadow-[0_0_20px_rgba(255,45,85,0.3)] hover:shadow-[0_0_25px_rgba(255,45,85,0.45)] hover:brightness-110 active:scale-98 transition-all cursor-pointer text-center"
                      >
                        Authenticate Curator Terminal
                      </button>
                    </form>
                  </div>
                ) : (
                  <>
                    <div className="border-b border-white/5 pb-3 flex items-center justify-between">
                      <div>
                        <h4 className="font-sans font-black text-sm text-stone-200 uppercase tracking-widest flex items-center gap-1.5 animate-pulse">
                          <ShieldCheck size={14} className="text-amber-500" />
                          <span>OTT Ingestion Center</span>
                        </h4>
                        <p className="text-[10px] text-stone-400 font-semibold tracking-wide">
                          Dynamic curator content management node dashboard
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => {
                            setIsAdminLoggedIn(false);
                            setAdminUsernameInput("");
                            setAdminPasswordInput("");
                            resetCmsForm();
                          }}
                          className="text-[9px] font-mono text-[#ff2d55] border border-[#ff2d55]/35 bg-[#ff2d55]/5 px-2 py-1 rounded-lg uppercase font-black tracking-widest hover:bg-[#ff2d55]/15 transition-all cursor-pointer"
                        >
                          Lock Terminal
                        </button>
                        <span className="text-[9px] font-mono text-amber-500 border border-amber-500/30 bg-amber-500/5 px-2 py-1 rounded-lg uppercase font-black tracking-widest animate-pulse">
                          Live Curator
                        </span>
                      </div>
                    </div>

                    {/* SUB TABS SELECTION FOR CMS */}
                    <div className="flex bg-[#050505] p-1 rounded-xl border border-white/5 gap-1 shadow-inner">
                      <button
                        onClick={() => setAdminSubTab("form")}
                        className={`flex-1 py-1.5 text-[10px] font-sans font-black uppercase tracking-widest rounded-lg transition-all cursor-pointer ${
                          adminSubTab === "form"
                            ? "bg-gradient-to-r from-[#ff2d55] to-[#ff6b00] text-white shadow-md shadow-[#ff2d55]/10"
                            : "text-stone-400 hover:text-stone-100"
                        }`}
                      >
                        {editingMovieTitle ? "✏️ Edit Movie" : "✨ Publish New"}
                      </button>
                      <button
                        onClick={() => setAdminSubTab("requests")}
                        className={`flex-1 py-1.5 text-[10px] font-sans font-black uppercase tracking-widest rounded-lg relative transition-all cursor-pointer ${
                          adminSubTab === "requests"
                            ? "bg-gradient-to-r from-[#ff2d55] to-[#ff6b00] text-white shadow-md shadow-[#ff2d55]/10"
                            : "text-stone-400 hover:text-stone-100"
                        }`}
                      >
                        <span>🎬 Ingest Queue</span>
                        {requests.filter(r => r.status !== "Uploaded").length > 0 && (
                          <span className="absolute -top-1.5 -right-1.5 px-2 py-0.5 rounded-full bg-[#ff2d55] text-white font-mono text-[8px] font-black animate-bounce border border-black">
                            {requests.filter(r => r.status !== "Uploaded").length}
                          </span>
                        )}
                      </button>
                      <button
                        onClick={() => setAdminSubTab("catalog")}
                        className={`flex-1 py-1.5 text-[10px] font-sans font-black uppercase tracking-widest rounded-lg transition-all cursor-pointer ${
                          adminSubTab === "catalog"
                            ? "bg-gradient-to-r from-[#ff2d55] to-[#ff6b00] text-white shadow-md shadow-[#ff2d55]/10"
                            : "text-stone-400 hover:text-stone-100"
                        }`}
                      >
                        🎒 Catalog List
                      </button>
                    </div>

                    {/* RENDER ACTIVE SUB TAB ACTION BLOCK */}
                    {adminSubTab === "form" && (
                      <form onSubmit={handleSaveCmsMovie} className="space-y-4 max-h-[500px] overflow-y-auto pr-1">
                        
                        {/* EDITING / FULFILLING STATUS BANNER */}
                        {editingMovieTitle && (
                          <div className="p-3 rounded-xl bg-blue-500/10 border border-blue-500/30 flex items-center justify-between text-[11px] text-blue-300">
                            <span className="font-semibold">✏️ Editing Catalog Asset: <b className="text-white font-black">{editingMovieTitle}</b></span>
                            <button type="button" onClick={resetCmsForm} className="text-[9px] font-mono hover:underline uppercase font-black text-blue-400 hover:text-blue-200 cursor-pointer">Cancel Edit</button>
                          </div>
                        )}
                        {activeFulfillmentReqId && (
                          <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-between text-[11px] text-amber-400 font-sans">
                            <span className="font-semibold select-text">🙌 Fulfilling Request Ticket: <b className="text-white font-black">{cmsMovieName}</b></span>
                            <button type="button" onClick={resetCmsForm} className="text-[9px] font-mono hover:underline uppercase font-black text-amber-500 hover:text-amber-300 cursor-pointer">Direct Mode</button>
                          </div>
                        )}

                        {/* Title & Short Name ID inputs */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div className="space-y-1">
                            <label className="text-[9px] font-mono font-black text-stone-400 uppercase tracking-widest block">Title (with Year) *</label>
                            <input 
                              type="text" 
                              required
                              placeholder="e.g. Leo (2024)" 
                              value={cmsTitle} 
                              onChange={(e) => setCmsTitle(e.target.value)} 
                              className="w-full px-3 py-2 rounded-lg bg-[#050505] border border-white/5 focus:border-[#ff2d55] text-white text-xs font-semibold focus:shadow-[0_0_8px_rgba(255,45,85,0.15)] outline-none"
                            />
                          </div>
                          <div className="space-y-1">
                            <label className="text-[9px] font-mono font-black text-stone-400 uppercase tracking-widest block">Movie Name *</label>
                            <input 
                              type="text" 
                              required
                              placeholder="e.g. Leo" 
                              value={cmsMovieName} 
                              onChange={(e) => setCmsMovieName(e.target.value)} 
                              className="w-full px-3 py-2 rounded-lg bg-[#050505] border border-white/5 focus:border-[#ff2d55] text-white text-xs font-semibold focus:shadow-[0_0_8px_rgba(255,45,85,0.15)] outline-none"
                            />
                          </div>
                        </div>

                        {/* Image Poster Path */}
                        <div className="space-y-1">
                          <label className="text-[9px] font-mono font-black text-stone-400 uppercase tracking-widest block">Image / Poster URL *</label>
                          <input 
                            type="text" 
                            required
                            placeholder="e.g. https://images.unsplash.com/photo-..." 
                            value={cmsImage} 
                            onChange={(e) => setCmsImage(e.target.value)} 
                            className="w-full px-3 py-2 rounded-lg bg-[#050505] border border-white/5 focus:border-[#ff2d55] text-white text-xs font-mono focus:shadow-[0_0_8px_rgba(255,45,85,0.15)] outline-none"
                          />
                        </div>

                        {/* Director & Cast Information */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div className="space-y-1">
                            <label className="text-[9px] font-mono font-black text-stone-400 uppercase tracking-widest block">Director *</label>
                            <input 
                              type="text" 
                              required
                              placeholder="e.g. Lokesh Kanagaraj" 
                              value={cmsDirector} 
                              onChange={(e) => setCmsDirector(e.target.value)} 
                              className="w-full px-3 py-2 rounded-lg bg-[#050505] border border-white/5 focus:border-[#ff2d55] text-white text-xs font-semibold focus:shadow-[0_0_8px_rgba(255,45,85,0.15)] outline-none"
                            />
                          </div>
                          <div className="space-y-1">
                            <label className="text-[9px] font-mono font-black text-stone-400 uppercase tracking-widest block">Starring Credits *</label>
                            <input 
                              type="text" 
                              required
                              placeholder="e.g. Thalapathy Vijay, Sanjay Dutt" 
                              value={cmsStarring} 
                              onChange={(e) => setCmsStarring(e.target.value)} 
                              className="w-full px-3 py-2 rounded-lg bg-[#050505] border border-white/5 focus:border-[#ff2d55] text-white text-xs font-semibold focus:shadow-[0_0_8px_rgba(255,45,85,0.15)] outline-none"
                            />
                          </div>
                        </div>

                        {/* Genre inputs with Quick pill tags overlay selectors */}
                        <div className="space-y-1.5">
                          <label className="text-[9px] font-mono font-black text-stone-400 uppercase tracking-widest block">Genres * (Comma Separated)</label>
                          <input 
                            type="text" 
                            required
                            placeholder="e.g. Action, Thriller, Drama" 
                            value={cmsGenres} 
                            onChange={(e) => setCmsGenres(e.target.value)} 
                            className="w-full px-3 py-2 rounded-lg bg-[#050505] border border-white/5 focus:border-[#ff2d55] text-white text-xs font-semibold focus:shadow-[0_0_8px_rgba(255,45,85,0.15)] outline-none"
                          />
                          <div className="flex flex-wrap gap-1 pt-0.5 gap-y-1">
                            {["Action", "Comedy", "Drama", "Thriller", "Sci-Fi", "Romance", "Horror", "Mystery"].map(g => {
                              const exists = cmsGenres.split(",").map(x => x.trim().toLowerCase()).includes(g.toLowerCase());
                              return (
                                <button
                                  type="button"
                                  key={g}
                                  onClick={() => {
                                    const current = cmsGenres.split(",").map(x => x.trim()).filter(Boolean);
                                    if (exists) {
                                      setCmsGenres(current.filter(x => x.toLowerCase() !== g.toLowerCase()).join(", "));
                                    } else {
                                      setCmsGenres([...current, g].join(", "));
                                    }
                                  }}
                                  className={`text-[8.5px] font-mono font-black px-2 py-0.5 rounded cursor-pointer border transition-colors ${
                                    exists 
                                      ? "bg-[#ff2d55]/15 text-[#ff2d55] border-[#ff2d55]/25" 
                                      : "bg-white/3 text-gray-400 border-white/5 hover:text-white"
                                  }`}
                                >
                                  {exists ? `✓ ${g}` : `+ ${g}`}
                                </button>
                              );
                            })}
                          </div>
                        </div>

                        {/* Stream attributes parameters panel */}
                        <div className="grid grid-cols-2 gap-3 animate-fade-in">
                          <div className="space-y-1">
                            <label className="text-[9px] font-mono font-black text-stone-400 uppercase tracking-widest block font-semibold">Quality *</label>
                            <input 
                              type="text" 
                              required
                              placeholder="e.g. 4K Ultra HD" 
                              value={cmsQuality} 
                              onChange={(e) => setCmsQuality(e.target.value)} 
                              className="w-full px-3 py-2 rounded-lg bg-[#050505] border border-white/5 focus:border-[#ff2d55] text-white text-xs font-semibold focus:shadow-[0_0_8px_rgba(255,45,85,0.15)] outline-none"
                            />
                          </div>
                          <div className="space-y-1">
                            <label className="text-[9px] font-mono font-black text-stone-400 uppercase tracking-widest block font-semibold">Language *</label>
                            <input 
                              type="text" 
                              required
                              placeholder="e.g. Tamil" 
                              value={cmsLanguage} 
                              onChange={(e) => setCmsLanguage(e.target.value)} 
                              className="w-full px-3 py-2 rounded-lg bg-[#050505] border border-white/5 focus:border-[#ff2d55] text-white text-xs font-semibold focus:shadow-[0_0_8px_rgba(255,45,85,0.15)] outline-none"
                            />
                          </div>
                          <div className="space-y-1">
                            <label className="text-[9px] font-mono font-black text-stone-400 uppercase tracking-widest block font-semibold">Rating *</label>
                            <input 
                              type="text" 
                              required
                              placeholder="e.g. 9.1/10" 
                              value={cmsRating} 
                              onChange={(e) => setCmsRating(e.target.value)} 
                              className="w-full px-3 py-2 rounded-lg bg-[#050505] border border-white/5 focus:border-[#ff2d55] text-white text-xs font-semibold focus:shadow-[0_0_8px_rgba(255,45,85,0.15)] outline-none"
                            />
                          </div>
                          <div className="space-y-1">
                            <label className="text-[9px] font-mono font-black text-stone-400 uppercase tracking-widest block font-semibold">Last Update Date *</label>
                            <input 
                              type="text" 
                              required
                              placeholder="e.g. Jun 9, 2026" 
                              value={cmsLastUpdated} 
                              onChange={(e) => setCmsLastUpdated(e.target.value)} 
                              className="w-full px-3 py-2 rounded-lg bg-[#050505] border border-white/5 focus:border-[#ff2d55] text-white text-xs font-semibold focus:shadow-[0_0_8px_rgba(255,45,85,0.15)] outline-none"
                            />
                          </div>
                        </div>

                        {/* Interactive Playable URLs */}
                        <div className="space-y-3">
                          <div className="space-y-1">
                            <label className="text-[9px] font-mono font-black text-stone-400 uppercase tracking-widest block font-bold">Watch Online Stream URL (Optional)</label>
                            <input 
                              type="text" 
                              placeholder="e.g. HLS (.m3u8) or video link" 
                              value={cmsWatchUrl} 
                              onChange={(e) => setCmsWatchUrl(e.target.value)} 
                              className="w-full px-3 py-2 rounded-lg bg-[#050505] border border-white/5 focus:border-[#ff2d55] text-white text-[11px] font-mono focus:shadow-[0_0_8px_rgba(255,45,85,0.15)] outline-none"
                            />
                          </div>

                          <div className="space-y-1">
                            <label className="text-[9px] font-mono font-black text-stone-400 uppercase tracking-widest block font-bold">Trailer URL (Optional)</label>
                            <input 
                              type="text" 
                              placeholder="e.g. Embed/trailer video MP4 stream" 
                              value={cmsTrailerUrl} 
                              onChange={(e) => setCmsTrailerUrl(e.target.value)} 
                              className="w-full px-3 py-2 rounded-lg bg-[#050505] border border-white/5 focus:border-[#ff2d55] text-white text-[11px] font-mono focus:shadow-[0_0_8px_rgba(255,45,85,0.15)] outline-none"
                            />
                          </div>
                        </div>

                        {/* HD RESOLUTION OPTIONS ACCORDION-STYLE CARD CONTROLLER */}
                        <div className="p-3.5 rounded-2xl bg-black border border-white/5 space-y-3 shadow-inner">
                          <p className="text-[9.5px] font-mono font-black text-amber-500 uppercase tracking-widest flex items-center gap-1.5 leading-none">
                            <Laptop size={11} />
                            <span>Optional Download Quality Links</span>
                          </p>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                            <div className="space-y-1">
                              <label className="text-[8px] font-mono font-black text-stone-500 uppercase block">360p (Data Saver)</label>
                              <input 
                                type="text"
                                placeholder="Paste stream / download link" 
                                value={cmsUrl360p} 
                                onChange={(e) => setCmsUrl360p(e.target.value)} 
                                className="w-full px-2 py-1.5 rounded-lg bg-[#07070a] border border-white/5 focus:border-[#ff2d55] text-stone-300 text-[10px] font-mono outline-none focus:border-[#ff2d55]"
                              />
                            </div>
                            <div className="space-y-1">
                              <label className="text-[8px] font-mono font-black text-stone-500 uppercase block">720p (High Definition)</label>
                              <input 
                                type="text"
                                placeholder="Paste stream / download link" 
                                value={cmsUrl720p} 
                                onChange={(e) => setCmsUrl720p(e.target.value)} 
                                className="w-full px-2 py-1.5 rounded-lg bg-[#07070a] border border-white/5 focus:border-[#ff2d55] text-stone-300 text-[10px] font-mono outline-none focus:border-[#ff2d55]"
                              />
                            </div>
                            <div className="space-y-1">
                              <label className="text-[8px] font-mono font-black text-stone-500 uppercase block">1080p (Full Speed FHD)</label>
                              <input 
                                type="text"
                                placeholder="Paste stream / download link" 
                                value={cmsUrl1080p} 
                                onChange={(e) => setCmsUrl1080p(e.target.value)} 
                                className="w-full px-2 py-1.5 rounded-lg bg-[#07070a] border border-white/5 focus:border-[#ff2d55] text-stone-300 text-[10px] font-mono outline-none focus:border-[#ff2d55]"
                              />
                            </div>
                            <div className="space-y-1">
                              <label className="text-[8px] font-mono font-black text-stone-500 uppercase block">4K (Ultra UHD HDR)</label>
                              <input 
                                type="text"
                                placeholder="Paste stream / download link" 
                                value={cmsUrl4K} 
                                onChange={(e) => setCmsUrl4K(e.target.value)} 
                                className="w-full px-2 py-1.5 rounded-lg bg-[#07070a] border border-white/5 focus:border-[#ff2d55] text-stone-300 text-[10px] font-mono outline-none focus:border-[#ff2d55]"
                              />
                            </div>
                          </div>
                        </div>

                        {/* Trigger submission controllers */}
                        <div className="pt-2 flex gap-3 pb-2 select-none">
                          <button 
                            type="submit"
                            className="flex-1 py-3 px-4 rounded-xl bg-gradient-to-r from-[#ff2d55] to-[#ff6b00] border border-white/10 text-white font-sans font-black text-[10px] uppercase tracking-widest flex items-center justify-center gap-1.5 shadow-[0_0_20px_rgba(255,45,85,0.25)] hover:brightness-115 active:scale-98 transition-all cursor-pointer"
                          >
                            <UploadCloud size={14} />
                            <span>{editingMovieTitle ? "Apply Update" : activeFulfillmentReqId ? "Fulfill Request" : "Publish Movie"}</span>
                          </button>
                          
                          {(editingMovieTitle || activeFulfillmentReqId || cmsTitle || cmsMovieName || cmsImage) && (
                            <button 
                              type="button"
                              onClick={resetCmsForm}
                              className="py-3 px-4 rounded-xl bg-white/5 hover:bg-white/10 border border-white/5 text-stone-400 hover:text-stone-100 font-sans font-black text-[10px] uppercase tracking-wider cursor-pointer active:scale-98 transition-all"
                            >
                              Reset
                            </button>
                          )}
                        </div>

                      </form>
                    )}

                    {/* SUB TAB: PENDING REQUEST TICKETS LIST */}
                    {adminSubTab === "requests" && (
                      <div className="space-y-3.5 max-h-[500px] overflow-y-auto pr-1">
                        {requests.filter(r => r.status !== "Uploaded").length === 0 ? (
                          <div className="flex-1 flex flex-col items-center justify-center text-center py-16 px-6 space-y-3 animate-fade-in">
                            <CheckCircle2 size={36} className="text-emerald-500 animate-bounce" />
                            <div className="space-y-1 font-sans">
                              <p className="text-white font-black text-sm uppercase tracking-wider leading-none">All Queues Cleared</p>
                              <p className="text-xs text-stone-500 max-w-xs font-semibold leading-relaxed pt-1 select-none">
                                There are no active community requests in the queue right now.
                              </p>
                            </div>
                          </div>
                        ) : (
                          requests.filter(r => r.status !== "Uploaded").map(r => (
                            <div 
                              key={r.id}
                              className="p-3.5 rounded-2xl bg-gradient-to-br from-[#0c0c0e] to-black border border-white/5 hover:border-amber-500/15 transition-all flex items-center justify-between gap-4"
                            >
                              <div className="min-w-0 space-y-1.5 flex-1 font-sans">
                                <h5 className="font-sans font-black text-xs text-stone-200 truncate">{r.movieName} {r.year && <span className="text-stone-500 font-mono">({r.year})</span>}</h5>
                                <div className="flex items-center gap-1.5 text-[9px] font-mono text-stone-400 uppercase font-black tracking-wider flex-wrap leading-none">
                                  <span className="text-[#ff2d55] bg-[#ff2d55]/5 border border-[#ff2d55]/10 px-1 py-0.5 rounded text-[8px]">{r.genre}</span>
                                  <span>•</span>
                                  <span>{r.language}</span>
                                  <span>•</span>
                                  <span>{r.quality.split(" ")[0]}</span>
                                  <span>•</span>
                                  <span>{r.timeAgo}</span>
                                </div>
                                {r.comments && (
                                  <p className="text-[10px] text-stone-500 font-medium italic truncate max-w-xs">💬 "{r.comments}"</p>
                                )}
                                <div className="text-[9.5px] font-mono text-rose-500 font-black flex items-center gap-1.5 pt-0.5 select-none">
                                  <span>🚀 priority queue:</span>
                                  <span className="bg-rose-500/10 border border-rose-500/20 px-2 py-0.5 rounded-full text-[9px] font-black">{r.requestCount} upvotes</span>
                                </div>
                              </div>

                              <button
                                onClick={() => handleStartRequestFulfillmentCMS(r)}
                                className="bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/25 py-2 px-3 rounded-lg text-[9px] font-sans font-black uppercase tracking-widest flex items-center gap-1 cursor-pointer active:scale-95 transition-all shrink-0 font-sans font-semibold"
                              >
                                <span>Inject</span>
                                <ChevronRight size={10} />
                              </button>
                            </div>
                          ))
                        )}
                      </div>
                    )}

                    {/* SUB TAB: COMPREHENSIVE MOVIE CATALOG FOR EDIT / WIPE */}
                    {adminSubTab === "catalog" && (
                      <div className="space-y-3.5">
                        <div className="relative">
                          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-600" size={13} strokeWidth={3} />
                          <input 
                            type="text" 
                            placeholder="Power Search loaded OTT catalog..." 
                            value={catalogSearch}
                            onChange={(e) => setCatalogSearch(e.target.value)}
                            className="w-full pl-9 pr-4 py-2 rounded-lg bg-black border border-white/5 focus:border-[#ff2d55] text-white text-xs font-semibold outline-none focus:shadow-[0_0_8px_rgba(255,45,85,0.15)] ring-1 ring-transparent"
                          />
                        </div>

                        <div className="space-y-2.5 max-h-[400px] overflow-y-auto pr-1">
                          {(() => {
                            const filtered = movies.filter(m => {
                              const titleMatch = m.title ? m.title.toLowerCase().includes(catalogSearch.toLowerCase()) : false;
                              const nameMatch = m.movieName ? m.movieName.toLowerCase().includes(catalogSearch.toLowerCase()) : false;
                              const directorMatch = m.director ? m.director.toLowerCase().includes(catalogSearch.toLowerCase()) : false;
                              return titleMatch || nameMatch || directorMatch;
                            });
                            if (filtered.length === 0) {
                              return (
                                <p className="text-center py-10 text-stone-600 text-xs font-bold uppercase tracking-widest select-none">No catalog assets match filters</p>
                              );
                            }
                            return filtered.map((m, mIdx) => (
                              <div 
                                key={`${m.title}-${mIdx}`}
                                className="p-2 sm:p-2.5 rounded-xl bg-gradient-to-br from-[#0c0c0e] to-black border border-white/5 flex items-center gap-3"
                              >
                                <img 
                                  src={m.image} 
                                  alt={m.movieName} 
                                  referrerPolicy="no-referrer"
                                  className="w-8 h-11 rounded-md object-cover bg-stone-900 border border-white/5 shrink-0"
                                />
                                <div className="min-w-0 flex-1 space-y-1 font-sans">
                                  <h6 className="font-sans font-black text-xs text-stone-200 truncate leading-none">{m.title}</h6>
                                  <div className="flex items-center gap-1.5 text-[8px] sm:text-[9px] font-mono text-stone-500 uppercase font-black flex-wrap">
                                    <span className="text-[#ff2d55]">{m.language}</span>
                                    <span>•</span>
                                    <span>{m.quality}</span>
                                    <span>•</span>
                                    <span className="text-amber-400 font-extrabold">★ {m.rating}</span>
                                  </div>
                                  <p className="text-[8.5px] text-stone-500 truncate font-semibold">Stars: {m.starring || "Unspecified"}</p>
                                </div>
                                <div className="flex items-center gap-1.5 shrink-0 select-none">
                                  <button
                                    onClick={() => handleEditExistingMovie(m)}
                                    className="p-1.5 rounded-lg bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 border border-blue-500/20 active:scale-95 transition-all cursor-pointer hover:shadow-xs"
                                    title="Edit Film Database Link"
                                  >
                                    <Edit size={11} />
                                  </button>
                                  <button
                                    onClick={() => handleDeleteMovieCMS(m.title, m.movieName)}
                                    className="p-1.5 rounded-lg bg-[#ff2d55]/10 hover:bg-[#ff2d55]/20 text-[#ff2d55] border border-[#ff2d55]/25 active:scale-95 transition-all cursor-pointer hover:shadow-xs"
                                    title="Wipe Film Index"
                                  >
                                    <Trash2 size={11} />
                                  </button>
                                </div>
                              </div>
                            ));
                          })()}
                        </div>
                      </div>
                    )}
                  </>
                )}
              </motion.div>
            )}

          </AnimatePresence>
        </div>

      </div>

    </div>
  );
}
