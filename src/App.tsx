import React, { useState, useEffect, useMemo, useRef } from "react";
import { allMovies } from "./data/all_movies";
import { Movie, CommunityRequest, Series, AppNotification } from "./types";
import { 
  fetchAllMoviesFromFirestore, 
  saveMovieToFirestore, 
  deleteMovieFromFirestore,
  db,
  fetchAllRequestsFromFirestore,
  submitRequestToFirestore,
  upvoteRequestInFirestore,
  fulfillRequestInFirestore,
  fetchAllSeriesFromFirestore,
  saveSeriesToFirestore,
  deleteSeriesFromFirestore,
  markNotificationAsReadInFirestore,
  deleteNotificationFromFirestore,
  ensureDatabaseSeeded
} from "./lib/firebase";
import { collection, onSnapshot, query, where, deleteDoc, doc } from "firebase/firestore";
import BackgroundAurora from "./components/BackgroundAurora";
import Header from "./components/Header";
import PWAInstallPrompt from "./components/PWAInstallPrompt";
import ContinueWatching from "./components/ContinueWatching";
import MovieCard from "./components/MovieCard";
import SeriesCard from "./components/SeriesCard";
import SeriesEpisodesModal from "./components/SeriesEpisodesModal";
import MovieDetailsModal from "./components/MovieDetailsModal";
import MovieVideoPlayer from "./components/MovieVideoPlayer";
import RequestSection from "./components/RequestSection";
import { 
  Play, Download, Star, Sparkles, Filter, ListOrdered, 
  Tv, Film, X, Laptop, ShieldCheck, CheckCircle2, Info, Compass,
  ChevronLeft, ChevronRight, Heart, Flame, ChevronDown,
  WifiOff, RefreshCw, Home, Globe, AlertTriangle, Database
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

export default function App() {
  // Lifted Notification Panel States for Back-navigation control
  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const [isNotifMobileOpen, setIsNotifMobileOpen] = useState(false);

  const [homeSearchQuery, setHomeSearchQuery] = useState("");
  const [watchlistSearchQuery, setWatchlistSearchQuery] = useState("");
  const [historySearchQuery, setHistorySearchQuery] = useState("");
  const [selectedGenre, setSelectedGenre] = useState<string>("All Genres");
  const [sortBy, setSortBy] = useState<string>("date_newest");
  const [isSortDropdownOpen, setIsSortDropdownOpen] = useState(false);
  const sortDropdownRef = useRef<HTMLDivElement>(null);
  const [downloadPendingInfo, setDownloadPendingInfo] = useState<{
    name: string;
    quality: string;
    url: string;
    image?: string;
  } | null>(null);

  // Players and Modals
  const [activePlayerMovie, setActivePlayerMovie] = useState<Movie | null>(null);
  const [activeDownloadMovie, setActiveDownloadMovie] = useState<Movie | null>(null);
  const [activeTrailerMovie, setActiveTrailerMovie] = useState<Movie | null>(null);
  const [selectedSeries, setSelectedSeries] = useState<Series | null>(null);
  const [premiumMessage, setPremiumMessage] = useState<string | null>(null);

  // Auto-hide premium message toast
  useEffect(() => {
    if (premiumMessage) {
      const timer = setTimeout(() => {
        setPremiumMessage(null);
      }, 4000);
      return () => clearTimeout(timer);
    }
  }, [premiumMessage]);

  const handlePlayMedia = (item: Movie | Series | { type: "episode"; series: Series; episodeNumber: number }) => {
    let watchUrl: string | undefined = undefined;
    let downloadUrl: string | undefined = undefined;
    let virtualMovie: Movie | null = null;

    if (item && 'type' in item && item.type === "episode") {
      const ep = item.series.episodes?.find(e => (e.episodeNumber === item.episodeNumber || e.episode === item.episodeNumber));
      if (ep) {
        downloadUrl = ep.downloadUrl;
        virtualMovie = {
          id: `${item.series.id}_E${item.episodeNumber}`,
          title: `${item.series.seriesName} - Season ${item.series.seasonNumber} - Episode ${item.episodeNumber}`,
          movieName: `${item.series.seriesName} - S${item.series.seasonNumber}E${item.episodeNumber}`,
          image: item.series.image,
          director: item.series.director,
          starring: item.series.starring,
          genres: item.series.genres,
          language: item.series.language,
          quality: item.series.quality,
          rating: item.series.rating,
          lastUpdated: item.series.lastUpdated,
          watchUrl: "",
          links: []
        };
      }
    } else if (item && 'type' in item && item.type === "series") {
      watchUrl = (item as any).watchUrl;
      const firstEp = item.episodes?.find(ep => ep.downloadUrl && ep.downloadUrl.trim() !== "");
      downloadUrl = firstEp?.downloadUrl;
      
      virtualMovie = {
        id: item.id,
        title: item.title,
        movieName: item.seriesName,
        image: item.image,
        director: item.director,
        starring: item.starring,
        genres: item.genres,
        language: item.language,
        quality: item.quality,
        rating: item.rating,
        lastUpdated: item.lastUpdated,
        watchUrl: watchUrl || "",
        links: []
      };
    } else if (item) {
      const movieItem = item as Movie;
      watchUrl = movieItem.watchUrl;
      downloadUrl = movieItem.links?.find(l => l.url && l.url.trim() !== "")?.url;
      virtualMovie = movieItem;
    }

    if (watchUrl && watchUrl.trim() !== "") {
      if (virtualMovie) {
        setActivePlayerMovie({
          ...virtualMovie,
          watchUrl: watchUrl
        });
      }
    } else if (downloadUrl && downloadUrl.trim() !== "") {
      if (virtualMovie) {
        setActivePlayerMovie({
          ...virtualMovie,
          watchUrl: downloadUrl
        });
      }
    } else {
      setPremiumMessage("Watch link not available.");
    }
  };

  // Active background and hover state logic completely reverted

  // Accurate online/offline monitoring state
  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  const [isCheckingConnection, setIsCheckingConnection] = useState(false);
  const [retryMessage, setRetryMessage] = useState<string | null>(null);
  const [networkDiagnosticInfo, setNetworkDiagnosticInfo] = useState<string | null>(null);

  useEffect(() => {
    const handleOnline = () => {
      setIsOffline(false);
      setRetryMessage(null);
      setNetworkDiagnosticInfo(null);
    };
    const handleOffline = () => {
      setIsOffline(true);
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    // Initial check
    if (navigator.onLine !== undefined) {
      setIsOffline(!navigator.onLine);
    }

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  const handleRetryConnection = () => {
    setIsCheckingConnection(true);
    setRetryMessage("Pinging actual network gateway...");
    
    setTimeout(() => {
      setIsCheckingConnection(false);
      const isOnlineNow = navigator.onLine;
      if (isOnlineNow) {
        setIsOffline(false);
        setRetryMessage(null);
        setNetworkDiagnosticInfo(null);
      } else {
        setRetryMessage("Offline status persistent. Check router configuration.");
        setTimeout(() => setRetryMessage(null), 3000);
      }
    }, 850);
  };

  const handleCheckNetwork = () => {
    const ua = navigator.userAgent.toLowerCase();
    const isAndroid = /android/.test(ua);
    const isTV = /smart-tv|smarttv|googletv|appletv|firetv|firestick|tizen|netcast|webos|hbbtv|roku/.test(ua) || (isAndroid && /box|tv|atv/.test(ua));

    // Double check connection right away
    if (navigator.onLine) {
      setIsOffline(false);
      setRetryMessage(null);
      setNetworkDiagnosticInfo(null);
      return;
    }

    if (isTV) {
      setNetworkDiagnosticInfo(
        "📺 SMART TV / BOX DETECTED:\n\n1. Press Home/Settings button on your Remote.\n2. Go to 'Network/Wi-Fi Settings'.\n3. Disconnect and reconnect to your router.\n4. Check if other streaming apps on the TV work.\n5. If on Fire TV, rerun network status check from System Settings -> Network."
      );
    } else if (isAndroid) {
      try {
        // Try opening native wifi settings
        window.location.href = "intent:#Intent;action=android.settings.WIFI_SETTINGS;end";
      } catch (e) {
        setNetworkDiagnosticInfo(
          "📱 ANDROID DEVICE DETECTED:\n\n1. Swipe down from top of mobile screen to see quick tiles.\n2. Toggle Wi-Fi and Cellular data Off, then back On.\n3. Verify your hotspot subscription status.\n4. Close and reload the MovieMachi browser tab."
        );
      }
    } else {
      try {
        // Desktop network setting trigger attempt
        window.location.href = "ms-settings:network-wifi";
      } catch (e) {
        setNetworkDiagnosticInfo(
          "💻 DESKTOP / LAPTOP DETECTED:\n\n1. Check taskbar/menu-bar to see if Wi-Fi or Ethernet is active.\n2. Go to System Preferences -> Network settings to troubleshoot.\n3. Make sure proxy or VPN settings are not blocking the gateway.\n4. Restart browser window."
        );
      }
    }
  };

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (sortDropdownRef.current && !sortDropdownRef.current.contains(event.target as Node)) {
        setIsSortDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const [activeTab, setActiveTab ] = useState<string>("all"); // "all", "watching", "requests", "watchlist"

  const prevTabRef = useRef("all");

  useEffect(() => {
    setHomeSearchQuery("");
    setWatchlistSearchQuery("");
    setHistorySearchQuery("");
    prevTabRef.current = activeTab;
  }, [activeTab]);

  const searchQuery = 
    activeTab === "all" ? homeSearchQuery :
    activeTab === "watchlist" ? watchlistSearchQuery :
    activeTab === "watching" ? historySearchQuery : "";

  const setSearchQuery = (val: string) => {
    if (activeTab === "all") {
      setHomeSearchQuery(val);
    } else if (activeTab === "watchlist") {
      setWatchlistSearchQuery(val);
    } else if (activeTab === "watching" || activeTab === "requests") {
      setHistorySearchQuery(val);
    }
  };

  const [movies, setMovies] = useState<Movie[]>(() => {
    try {
      const saved = localStorage.getItem("moviemachi_active_catalog");
      if (saved) {
        return JSON.parse(saved).map((m: any) => ({
          ...m,
          id: m.id || m.title.replace(/[^a-zA-Z0-9_\-]/g, "_")
        }));
      }
      return allMovies.map(m => ({
        ...m,
        id: m.title.replace(/[^a-zA-Z0-9_\-]/g, "_")
      }));
    } catch {
      return allMovies.map(m => ({
        ...m,
        id: m.title.replace(/[^a-zA-Z0-9_\-]/g, "_")
      }));
    }
  });

  const [series, setSeries] = useState<Series[]>(() => {
    try {
      const saved = localStorage.getItem("moviemachi_series_catalog");
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  // Persistent User Anonymous identifier
  const [userId, setUserId] = useState<string>(() => {
    try {
      let id = localStorage.getItem("moviemachi_user_anonymous_id");
      if (!id) {
        id = "USER_" + Math.random().toString(36).substring(2, 7).toUpperCase();
        localStorage.setItem("moviemachi_user_anonymous_id", id);
      }
      return id;
    } catch {
      return "USER_ANON";
    }
  });

  // Persistent user & community tickets requests database
  const [requests, setRequests] = useState<CommunityRequest[]>(() => {
    try {
      const saved = localStorage.getItem("moviemachi_requests_ledger");
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  // Persistent real-time notifications from Firestore
  const [notifications, setNotifications] = useState<AppNotification[]>(() => {
    try {
      const saved = localStorage.getItem("moviemachi_notifications_ledger");
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  // Lifted state to synchronize Header and RequestSection for admin security layout
  const [isAdminLoggedIn, setIsAdminLoggedIn] = useState(false);

  // Automatically scroll to top of page when admin logs in successfully
  useEffect(() => {
    if (isAdminLoggedIn) {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  }, [isAdminLoggedIn]);

  // Movie available instant alert banner state
  const [availNotification, setAvailNotification] = useState<Movie | null>(null);

  useEffect(() => {
    if (availNotification) {
      const timer = setTimeout(() => {
        setAvailNotification(null);
      }, 9500); // Premium slightly longer auto close duration
      return () => clearTimeout(timer);
    }
  }, [availNotification]);

  // Load and sync movies and requests from Firebase Firestore in Real-Time
  useEffect(() => {
    // Run database seeding check first to ensure Firestore gets all 72 movies as a single source of truth
    ensureDatabaseSeeded()
      .then(() => {
        // Fetch movies directly from Firestore to initialize state immediately
        return fetchAllMoviesFromFirestore();
      })
      .then((initialMovies) => {
        setMovies(initialMovies || []);
      })
      .catch((err) => {
        console.warn("[Firebase] Offline fallback or initialization check for movies catalog:", err);
      });

    // Fetch requests from Firestore to initialize state immediately
    fetchAllRequestsFromFirestore()
      .then((initialRequests) => {
        setRequests(initialRequests || []);
      })
      .catch((err) => {
        console.warn("[Firebase] Offline fallback for requests ledger:", err);
      });

    // Fetch series from Firestore
    fetchAllSeriesFromFirestore()
      .then((initialSeries) => {
        setSeries(initialSeries || []);
      })
      .catch((err) => {
        console.warn("[Firebase] Offline fallback for series catalog:", err);
      });

    // 1. Set up active real-time subscription for movies collection
    const unsubMovies = onSnapshot(collection(db, "movies"), (snapshot) => {
      const list: Movie[] = [];
      snapshot.forEach((document) => {
        const data = document.data();
        list.push({
          ...data,
          id: document.id
        } as Movie);
      });
      setMovies(list);
    }, (error) => {
      console.error("Movies onSnapshot error:", error);
    });

    // 2. Set up active real-time subscription for requests collection
    const unsubRequests = onSnapshot(collection(db, "requests"), (snapshot) => {
      const list: CommunityRequest[] = [];
      snapshot.forEach((document) => {
        const data = document.data() as CommunityRequest;
        list.push({
          ...data,
          id: document.id
        });
      });
      // Sort requests by creation date descending (newest first)
      list.sort((a, b) => b.createdAt - a.createdAt);
      setRequests(list);
    }, (error) => {
      console.error("Requests onSnapshot error:", error);
    });

    // 3. Set up active real-time subscription for series collection
    const unsubSeries = onSnapshot(collection(db, "series"), (snapshot) => {
      const list: Series[] = [];
      snapshot.forEach((document) => {
        const data = document.data();
        list.push({
          ...data,
          id: document.id,
          type: "series"
        } as Series);
      });
      setSeries(list);
    }, (error) => {
      console.error("Series onSnapshot error:", error);
    });

    // 4. Set up active real-time subscription for notifications collection matching current userId
    const qNotifs = query(collection(db, "notifications"), where("userId", "==", userId));
    const unsubNotifs = onSnapshot(qNotifs, (snapshot) => {
      const list: AppNotification[] = [];
      snapshot.forEach((document) => {
        list.push({
          ...document.data(),
          id: document.id
        } as AppNotification);
      });
      // Sort newest first
      list.sort((a, b) => b.createdAt - a.createdAt);
      setNotifications(list);
    }, (error) => {
      console.error("Notifications onSnapshot error:", error);
    });

    return () => {
      unsubMovies();
      unsubRequests();
      unsubSeries();
      unsubNotifs();
    };
  }, [userId]);

  // Synchronize state changes to localStorage for an incredibly robust, zero-lag offline experience
  useEffect(() => {
    try {
      localStorage.setItem("moviemachi_active_catalog", JSON.stringify(movies));
    } catch (e) {
      console.warn("Failed to cache movies in local-first storage:", e);
    }
  }, [movies]);

  useEffect(() => {
    try {
      localStorage.setItem("moviemachi_series_catalog", JSON.stringify(series));
    } catch (e) {
      console.warn("Failed to cache series in local-first storage:", e);
    }
  }, [series]);

  useEffect(() => {
    try {
      localStorage.setItem("moviemachi_requests_ledger", JSON.stringify(requests));
    } catch (e) {
      console.warn("Failed to cache requests in local-first storage:", e);
    }
  }, [requests]);

  useEffect(() => {
    try {
      localStorage.setItem("moviemachi_notifications_ledger", JSON.stringify(notifications));
    } catch (e) {
      console.warn("Failed to cache notifications in local-first storage:", e);
    }
  }, [notifications]);

  // Automatic request board cleanup: uploaded requests deleted 24 hours later
  useEffect(() => {
    if (requests.length === 0) return;
    const now = Date.now();
    const oneDayMs = 24 * 60 * 60 * 1000;
    const expired = requests.filter(r => {
      if (r.status !== "Uploaded") return false;
      const uploadedTime = r.uploadedAt || r.createdAt;
      return (now - uploadedTime) > oneDayMs;
    });

    if (expired.length > 0) {
      expired.forEach(async (r) => {
        try {
          await deleteDoc(doc(db, "requests", r.id));
          console.log(`[Auto-Cleanup] Successfully cleared request metadata for "${r.movieName}".`);
        } catch (err) {
          console.error("Error running auto-cleanup on request:", err);
        }
      });
    }
  }, [requests]);

  // Notification interactions and actions
  const handleMarkNotificationRead = async (id: string) => {
    try {
      await markNotificationAsReadInFirestore(id);
    } catch (e) {
      console.error("Error marking notification as read:", e);
    }
  };

  const handleDismissNotification = async (id: string) => {
    try {
      await deleteNotificationFromFirestore(id);
    } catch (e) {
      console.error("Error dismissing notification:", e);
    }
  };

  const handlePlayMovieTitle = (title: string) => {
    if (!title) return;
    const matchedMovie = movies.find(
      m => (m.movieName && m.movieName.toLowerCase() === title.toLowerCase()) ||
           (m.title && m.title.toLowerCase().includes(title.toLowerCase()))
    );
    if (matchedMovie) {
      handlePlayMedia(matchedMovie);
      return;
    }

    const matchedSeries = series.find(
      s => (s.seriesName && s.seriesName.toLowerCase() === title.toLowerCase()) ||
           (s.title && s.title.toLowerCase().includes(title.toLowerCase()))
    );
    if (matchedSeries) {
      setSelectedSeries(matchedSeries);
    }
  };

  // Real-time toast bridge for incoming unread notifications
  useEffect(() => {
    const unread = notifications.filter(n => !n.isRead);
    if (unread.length === 0) return;
    const newest = unread[0];
    const ageMs = Date.now() - newest.createdAt;
    if (ageMs < 15000) {
      const match = movies.find(
        m => (m.movieName && newest.movieTitle && m.movieName.toLowerCase() === newest.movieTitle.toLowerCase()) ||
             (m.title && m.title.toLowerCase().includes((newest.movieTitle || "").toLowerCase()))
      );
      if (match) {
        setAvailNotification(match);
      } else {
        const matchS = series.find(
          s => (s.seriesName && newest.movieTitle && s.seriesName.toLowerCase() === newest.movieTitle.toLowerCase()) ||
               (s.title && s.title.toLowerCase().includes((newest.movieTitle || "").toLowerCase()))
        );
        if (matchS) {
          setAvailNotification({
            title: matchS.title,
            image: matchS.image,
            movieName: matchS.seriesName,
            director: matchS.director,
            starring: matchS.starring,
            genres: matchS.genres,
            quality: matchS.quality,
            language: matchS.language,
            rating: matchS.rating,
            lastUpdated: matchS.lastUpdated,
            links: []
          });
        }
      }
    }
  }, [notifications, movies, series]);

  // Handle request ticket creation/upvoting
  const handleAddRequest = (movieInput: string, yearInput: string, languageInput: string, genreInput: string, qualityInput: string, commentsInput: string): { success: boolean; error?: string; action?: "created" | "upvoted"; movieName?: string } => {
    const formattedMovieName = movieInput.trim();
    const formattedYear = yearInput.trim() || new Date().getFullYear().toString();
    const movieLookupTitle = `${formattedMovieName} (${formattedYear})`;

    // check if it exists in movie catalog
    const movieExists = movies.some(
      m => (m.movieName && m.movieName.toLowerCase() === formattedMovieName.toLowerCase()) ||
           (m.title && m.title.toLowerCase() === movieLookupTitle.toLowerCase())
    );

    if (movieExists) {
      return { success: false, error: "duplicate_exists" };
    }

    // check duplicate in request ledger
    const existingReqIdx = requests.findIndex(
      r => r.movieName && r.movieName.toLowerCase() === formattedMovieName.toLowerCase() &&
           r.year === formattedYear
    );

    // Call Firestore directly with local requests state to prevent slow duplicate lookups
    submitRequestToFirestore(movieInput, yearInput, languageInput, genreInput, qualityInput, commentsInput, userId, movies, requests)
      .catch(err => console.error("Error submitting request to Firestore:", err));

    if (existingReqIdx > -1) {
      const existingReq = { ...requests[existingReqIdx] };
      if (existingReq.requesters.includes(userId)) {
        return { success: false, error: "already_voted" };
      }
      
      const updated = requests.map((r, idx) => {
        if (idx === existingReqIdx) {
          const newCount = r.requestCount + 1;
          const newStatus = (newCount >= 3 && r.status === "Pending") ? ("Under Review" as const) : r.status;
          return {
            ...r,
            requesters: [...r.requesters, userId],
            requestCount: newCount,
            status: newStatus
          };
        }
        return r;
      });
      setRequests(updated);

      return { success: true, action: "upvoted" as const, movieName: formattedMovieName };
    } else {
      const newId = "REQ_" + Date.now() + "_" + Math.floor(Math.random() * 1000);
      const newReq: CommunityRequest = {
        id: newId,
        movieName: formattedMovieName,
        year: formattedYear,
        genre: genreInput || "Action",
        language: languageInput || "Tamil",
        quality: qualityInput || "1080p",
        comments: (commentsInput || "").trim(),
        requesters: [userId],
        status: "Pending",
        requestCount: 1,
        timeAgo: "Just now",
        createdAt: Date.now(),
        requesterUserId: userId,
        requesterUsername: `Peer-${userId.replace("USER_", "")}`,
        requestedMovieName: formattedMovieName
      };

      setRequests(prev => [newReq, ...prev]);

      return { success: true, action: "created" as const, movieName: formattedMovieName };
    }
  };

  const handleRequestPlusOne = (reqId: string) => {
    let changed = false;
    const updatedRequests = requests.map(r => {
      if (r.id === reqId) {
        if (r.requesters.includes(userId)) return r;
        changed = true;
        const newCount = r.requestCount + 1;
        return {
          ...r,
          requesters: [...r.requesters, userId],
          requestCount: newCount,
          status: (newCount >= 3 && r.status === "Pending") ? "Under Review" as const : r.status
        };
      }
      return r;
    });
    
    if (changed) {
      updatedRequests.sort((a, b) => b.createdAt - a.createdAt);
      setRequests(updatedRequests);
    }

    upvoteRequestInFirestore(reqId, userId)
      .catch(err => console.error("Error upvoting request in Firestore:", err));
  };

  const handleAdminUploadMovie = async (
    reqId: string, 
    movieDetails: { 
      imageUrl?: string; 
      director?: string; 
      starring?: string; 
      rating?: string; 
      watchUrl?: string; 
      trailerUrl?: string; 
    }
  ) => {
    const req = requests.find(r => r.id === reqId);
    if (!req) return;

    const movieTitle = `${req.movieName} (${req.year})`;
    const movieWatch = movieDetails.watchUrl ? movieDetails.watchUrl.trim() : "";
    const movieTrailer = movieDetails.trailerUrl ? movieDetails.trailerUrl.trim() : "";

    const newMovie: Movie = {
      title: movieTitle,
      image: movieDetails.imageUrl || "https://images.unsplash.com/photo-1542204172-e70528091869?w=500&auto=format&fit=crop&q=80",
      movieName: req.movieName,
      director: movieDetails.director || "Port Encoder Studio",
      starring: movieDetails.starring || "Seeding Cluster Cast",
      genres: [req.genre],
      quality: req.quality || "4K HEVC Ultra HD",
      language: req.language || "Tamil",
      rating: movieDetails.rating || "9.5/10",
      lastUpdated: new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }),
      links: [],
      watchUrl: movieWatch || undefined,
      trailerUrl: movieTrailer || undefined
    };

    try {
      // Optimistically update status to show Uploaded instantly
      setRequests(prev => prev.map(r => r.id === reqId ? { ...r, status: "Uploaded" as const, uploadedAt: Date.now() } : r));

      await saveMovieToFirestore(newMovie);
      await fulfillRequestInFirestore(reqId);
    } catch (err) {
      console.error("Error creating movie from upload:", err);
    }

    // Show popup notification since current user requested/voted for it
    if (req.requesters.includes(userId)) {
      setAvailNotification(newMovie);
    }
  };

  const handleAdminAddMovie = async (newMovie: Movie) => {
    try {
      await saveMovieToFirestore(newMovie);
    } catch (err) {
      console.error("Error saving newly added movie:", err);
    }
  };

  const handleAdminUpdateMovie = async (oldId: string, updatedMovie: Movie) => {
    try {
      const newId = updatedMovie.id || updatedMovie.title.replace(/[^a-zA-Z0-9_\-]/g, "_");
      if (oldId !== newId) {
        await deleteMovieFromFirestore(oldId);
      }
      await saveMovieToFirestore(updatedMovie);
    } catch (err) {
      console.error("Error updating movie:", err);
    }
  };

  const handleAdminDeleteMovie = async (movieId: string) => {
    try {
      await deleteMovieFromFirestore(movieId);
      
      // Update local state immediately
      setMovies(prev => {
        const updated = prev.filter(m => m.id !== movieId);
        localStorage.setItem("moviemachi_active_catalog", JSON.stringify(updated));
        return updated;
      });

      // Also remove from watchlist if present
      setWatchlist(prev => {
        const updated = prev.filter(t => t.toLowerCase() !== movieId.toLowerCase());
        localStorage.setItem("moviemachi_watchlist", JSON.stringify(updated));
        return updated;
      });
    } catch (err) {
      console.error("Error deleting movie:", err);
    }
  };

  const handleAdminAddSeries = async (newSeries: Series) => {
    try {
      await saveSeriesToFirestore(newSeries);
    } catch (err) {
      console.error("Error saving newly added series:", err);
    }
  };

  const handleAdminUpdateSeries = async (oldId: string, updatedSeries: Series) => {
    try {
      const newId = updatedSeries.id || updatedSeries.title.replace(/[^a-zA-Z0-9_\-]/g, "_");
      if (oldId !== newId) {
        await deleteSeriesFromFirestore(oldId);
      }
      await saveSeriesToFirestore(updatedSeries);
    } catch (err) {
      console.error("Error updating series:", err);
    }
  };

  const handleAdminDeleteSeries = async (seriesId: string) => {
    try {
      await deleteSeriesFromFirestore(seriesId);
      
      // Update local state immediately
      setSeries(prev => {
        const updated = prev.filter(s => s.id !== seriesId);
        localStorage.setItem("moviemachi_series_catalog", JSON.stringify(updated));
        return updated;
      });
    } catch (err) {
      console.error("Error deleting series:", err);
    }
  };

  const handleFulfillRequestCMS = async (reqId: string, newMovie: Movie) => {
    try {
      await saveMovieToFirestore(newMovie);
      await fulfillRequestInFirestore(reqId);
    } catch (err) {
      console.error("Error fulfilling request:", err);
    }

    // Show popup notification since users wanted it
    const req = requests.find(r => r.id === reqId);
    if (req && req.requesters.includes(userId)) {
      setAvailNotification(newMovie);
    }
  };

  // Local storage persisted watchlist state
  const [watchlist, setWatchlist] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem("moviemachi_watchlist");
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const handleToggleWatchlist = (movie: Movie) => {
    setWatchlist(prev => {
      const isFav = prev.includes(movie.title);
      const updated = isFav ? prev.filter(t => t !== movie.title) : [...prev, movie.title];
      try {
        localStorage.setItem("moviemachi_watchlist", JSON.stringify(updated));
      } catch (err) {
        console.error("Storage error:", err);
      }
      return updated;
    });
  };

  // Theme state restoration and default dark mode
  const [theme, setTheme] = useState<"dark" | "light">(() => {
    try {
      const saved = localStorage.getItem("moviemachi_theme");
      if (saved === "light" || saved === "dark") {
        return saved;
      }
    } catch (e) {}
    return "dark"; // Default is dark mode
  });

  const toggleTheme = () => {
    setTheme(prev => prev === "dark" ? "light" : "dark");
  };

  useEffect(() => {
    const root = document.documentElement;
    const body = document.body;
    if (theme === "light") {
      root.classList.add("light");
      body.classList.add("light");
    } else {
      root.classList.remove("light");
      body.classList.remove("light");
    }
    try {
      localStorage.setItem("moviemachi_theme", theme);
    } catch (e) {}
  }, [theme]);

  // Browser & PWA Notification Triggering and Listener Systems
  useEffect(() => {
    // Function to check and trigger a notification for the newest movie added
    const checkAndTriggerNewMovieNotification = () => {
      if (!("Notification" in window) || Notification.permission !== "granted") return;

      // Extract the absolute newest movie based on the last updated date
      const sorted = [...movies].sort((a, b) => {
        const dateA = a.lastUpdated ? Date.parse(a.lastUpdated) || 0 : 0;
        const dateB = b.lastUpdated ? Date.parse(b.lastUpdated) || 0 : 0;
        return dateB - dateA;
      });

      const newestMovie = sorted[0];
      if (!newestMovie) return;

      // Only notify if this movie was requested/voted by this user in requests list
      const isRequestedByMe = requests.some(r => 
        r.requesters.includes(userId) && r.movieName && newestMovie.movieName && (
          r.movieName.toLowerCase() === newestMovie.movieName.toLowerCase() ||
          (newestMovie.title && newestMovie.title.toLowerCase().includes(r.movieName.toLowerCase())) ||
          r.movieName.toLowerCase().includes(newestMovie.movieName.toLowerCase())
        )
      );
      if (!isRequestedByMe) return;

      const lastNotifiedTitle = localStorage.getItem("moviemachi_last_notified");
      // Notify the user only about the new movie once
      if (lastNotifiedTitle !== newestMovie.title) {
        localStorage.setItem("moviemachi_last_notified", newestMovie.title);

        const notifTitle = "🎬 New Movie Added";
        const notifOptions = {
          body: `${newestMovie.movieName} [${newestMovie.quality}] is now streaming! Click to watch now.`,
          icon: "/moviemachi_logo.png",
          badge: "/moviemachi_logo.png",
          tag: "new-movie-alert",
          renotify: true,
          data: {
            movieTitle: newestMovie.title
          }
        };

        // Try utilizing PWA/ServiceWorker registration for better Android/Mobile rendering
        if (navigator.serviceWorker && navigator.serviceWorker.controller) {
          navigator.serviceWorker.ready.then((registration) => {
            registration.showNotification(notifTitle, notifOptions);
          }).catch((err) => {
            console.warn("ServiceWorker showNotification failed, using fallback:", err);
            triggerStandardNotification(notifTitle, notifOptions, newestMovie);
          });
        } else {
          triggerStandardNotification(notifTitle, notifOptions, newestMovie);
        }
      }
    };

    // Fallback notification mechanism for standard browsers if SW is not fully configured
    const triggerStandardNotification = (title: string, options: any, movieRef: Movie) => {
      try {
        const notif = new Notification(title, options);
        notif.onclick = () => {
          window.focus();
          handlePlayMedia(movieRef);
          notif.close();
        };
      } catch (err) {
        console.error("Standard Notification constructor failed:", err);
      }
    };

    // 1. Listen for message events posted by the Service Worker click action
    const handleServiceWorkerMessage = (event: MessageEvent) => {
      if (event.data && event.data.type === "OPEN_MOVIE" && event.data.movieTitle) {
        const matchedMovie = movies.find(m => m.title === event.data.movieTitle);
        if (matchedMovie) {
          handlePlayMedia(matchedMovie);
        }
      }
    };
    navigator.serviceWorker?.addEventListener("message", handleServiceWorkerMessage);

    // 2. Parse initial URL parameters when notification starts the app afresh in background
    try {
      const searchParams = new URLSearchParams(window.location.search);
      const openMovieTitle = searchParams.get("openMovie");
      if (openMovieTitle) {
        const matchedMovie = movies.find(m => m.title === openMovieTitle);
        if (matchedMovie) {
          handlePlayMedia(matchedMovie);
          // Clean the URL parameters so sequential refreshes don't auto-popup the player
          const cleanUrl = window.location.pathname;
          window.history.replaceState({}, document.title, cleanUrl);
        }
      }
    } catch (e) {
      console.warn("Failed to parse static search params on load:", e);
    }

    // 3. Ask for permissions only once
    const requestNotificationPermission = async () => {
      if (!("Notification" in window)) return;

      const hasAskedBefore = localStorage.getItem("moviemachi_notif_requested");
      if (hasAskedBefore) return; // Comply with "Ask permission only once"

      try {
        localStorage.setItem("moviemachi_notif_requested", "true");
        const permission = await Notification.requestPermission();
        if (permission === "granted") {
          checkAndTriggerNewMovieNotification();
        }
      } catch (err) {
        console.error("Failed to request notification permission:", err);
      }
    };

    // Slight delay of prompt to allow UI animations and main layouts to complete
    const delayTimer = setTimeout(() => {
      requestNotificationPermission();
      if ("Notification" in window && Notification.permission === "granted") {
        checkAndTriggerNewMovieNotification();
      }
    }, 2800);

    return () => {
      clearTimeout(delayTimer);
      navigator.serviceWorker?.removeEventListener("message", handleServiceWorkerMessage);
    };
  }, [movies, requests, userId]);

  // Players and Modals hooks (moved to top of component body)
  
  // Modals backdrop binding reverted

  const handlePlayEpisode = (seriesItem: Series, episodeNum: number) => {
    handlePlayMedia({
      type: "episode",
      series: seriesItem,
      episodeNumber: episodeNum
    });
  };

  const handleDownloadEpisode = (seriesItem: Series, episodeNum: number) => {
    const episodeObj = seriesItem.episodes?.find(ep => (ep.episodeNumber === episodeNum || ep.episode === episodeNum));
    if (episodeObj && episodeObj.downloadUrl) {
      setDownloadPendingInfo({
        name: `${seriesItem.seriesName} - Episode ${episodeNum}`,
        quality: "Episode Download",
        url: episodeObj.downloadUrl,
        image: seriesItem.image
      });
    }
  };

  // Handle ESC keypress to close trailer modal
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setActiveTrailerMovie(null);
      }
    };
    if (activeTrailerMovie) {
      window.addEventListener("keydown", handleKeyDown);
    }
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [activeTrailerMovie]);

  // TV remote control simulate guides helper
  const [tvKeyboardActive, setTvKeyboardActive] = useState(true);

  // Home page sub-tab state (Home | Movies | Series)
  const [homeSubTab, setHomeSubTab] = useState<"all" | "movies" | "series">("all");

  // Movie pagination state
  const [currentPage, setCurrentPage] = useState(1);

  // Popstate history navigation sync
  useEffect(() => {
    const handlePopState = (event: PopStateEvent) => {
      const state = event.state || {};
      
      // Update all React states to match popped history state
      setActiveTab(state.activeTab !== undefined ? state.activeTab : "all");
      setCurrentPage(state.currentPage !== undefined ? state.currentPage : 1);
      setHomeSearchQuery(state.homeSearchQuery !== undefined ? state.homeSearchQuery : "");
      setWatchlistSearchQuery(state.watchlistSearchQuery !== undefined ? state.watchlistSearchQuery : "");
      setHistorySearchQuery(state.historySearchQuery !== undefined ? state.historySearchQuery : "");
      setActiveDownloadMovie(state.activeDownloadMovie !== undefined ? state.activeDownloadMovie : null);
      setSelectedSeries(state.selectedSeries !== undefined ? state.selectedSeries : null);
      setActivePlayerMovie(state.activePlayerMovie !== undefined ? state.activePlayerMovie : null);
      setActiveTrailerMovie(state.activeTrailerMovie !== undefined ? state.activeTrailerMovie : null);
      setIsNotifOpen(state.isNotifOpen !== undefined ? state.isNotifOpen : false);
      setIsNotifMobileOpen(state.isNotifMobileOpen !== undefined ? state.isNotifMobileOpen : false);
      setIsAdminLoggedIn(state.isAdminLoggedIn !== undefined ? state.isAdminLoggedIn : false);
      setDownloadPendingInfo(state.downloadPendingInfo !== undefined ? state.downloadPendingInfo : null);
    };

    window.addEventListener("popstate", handlePopState);

    // Capture initial state on mount
    const initialNavState = {
      activeTab,
      currentPage,
      homeSearchQuery,
      watchlistSearchQuery,
      historySearchQuery,
      activeDownloadMovie,
      selectedSeries,
      activePlayerMovie,
      activeTrailerMovie,
      isNotifOpen,
      isNotifMobileOpen,
      isAdminLoggedIn,
      downloadPendingInfo
    };
    
    if (!window.history.state) {
      window.history.replaceState(initialNavState, "");
    }

    return () => {
      window.removeEventListener("popstate", handlePopState);
    };
  }, []);

  // History state serializer helper
  const serializeState = (state: any) => {
    if (!state) return "";
    return JSON.stringify({
      activeTab: state.activeTab,
      currentPage: state.currentPage,
      homeSearchQuery: state.homeSearchQuery,
      watchlistSearchQuery: state.watchlistSearchQuery,
      historySearchQuery: state.historySearchQuery,
      activeDownloadMovie: state.activeDownloadMovie,
      selectedSeries: state.selectedSeries,
      activePlayerMovie: state.activePlayerMovie,
      activeTrailerMovie: state.activeTrailerMovie,
      isNotifOpen: state.isNotifOpen,
      isNotifMobileOpen: state.isNotifMobileOpen,
      isAdminLoggedIn: state.isAdminLoggedIn,
      downloadPendingInfo: state.downloadPendingInfo
    });
  };

  // Synchronize React state to browser history
  useEffect(() => {
    const currentState = {
      activeTab,
      currentPage,
      homeSearchQuery,
      watchlistSearchQuery,
      historySearchQuery,
      activeDownloadMovie,
      selectedSeries,
      activePlayerMovie,
      activeTrailerMovie,
      isNotifOpen,
      isNotifMobileOpen,
      isAdminLoggedIn,
      downloadPendingInfo
    };

    const previousState = window.history.state;
    const currentSerialized = serializeState(currentState);
    const previousSerialized = serializeState(previousState);

    if (currentSerialized !== previousSerialized) {
      if (previousState) {
        // Detect if only search queries changed
        const onlySearchChanged = 
          currentState.activeTab === previousState.activeTab &&
          currentState.currentPage === previousState.currentPage &&
          currentState.isNotifOpen === previousState.isNotifOpen &&
          currentState.isNotifMobileOpen === previousState.isNotifMobileOpen &&
          currentState.isAdminLoggedIn === previousState.isAdminLoggedIn &&
          JSON.stringify(currentState.activeDownloadMovie) === JSON.stringify(previousState.activeDownloadMovie) &&
          JSON.stringify(currentState.selectedSeries) === JSON.stringify(previousState.selectedSeries) &&
          JSON.stringify(currentState.activePlayerMovie) === JSON.stringify(previousState.activePlayerMovie) &&
          JSON.stringify(currentState.activeTrailerMovie) === JSON.stringify(previousState.activeTrailerMovie) &&
          JSON.stringify(currentState.downloadPendingInfo) === JSON.stringify(previousState.downloadPendingInfo);

        const wasSearching = 
          (previousState.homeSearchQuery && previousState.homeSearchQuery.trim() !== "") ||
          (previousState.watchlistSearchQuery && previousState.watchlistSearchQuery.trim() !== "") ||
          (previousState.historySearchQuery && previousState.historySearchQuery.trim() !== "");

        const isCurrentlySearching = 
          (currentState.homeSearchQuery && currentState.homeSearchQuery.trim() !== "") ||
          (currentState.watchlistSearchQuery && currentState.watchlistSearchQuery.trim() !== "") ||
          (currentState.historySearchQuery && currentState.historySearchQuery.trim() !== "");

        if (onlySearchChanged && wasSearching && isCurrentlySearching) {
          // Replace state when typing continuously in the search input
          window.history.replaceState(currentState, "");
        } else {
          // Push state for all other standard transitions
          window.history.pushState(currentState, "");
        }
      } else {
        // Fallback: replaceState on initial mount if state is empty
        window.history.replaceState(currentState, "");
      }
    }
  }, [
    activeTab,
    currentPage,
    homeSearchQuery,
    watchlistSearchQuery,
    historySearchQuery,
    activeDownloadMovie,
    selectedSeries,
    activePlayerMovie,
    activeTrailerMovie,
    isNotifOpen,
    isNotifMobileOpen,
    isAdminLoggedIn,
    downloadPendingInfo
  ]);

  // Reset page when search, genre, sorting, tab, or sub-tab changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, selectedGenre, sortBy, activeTab, homeSubTab]);

  // Reset slider index when sub-tab changes
  useEffect(() => {
    setCurrentSlideIndex(0);
  }, [homeSubTab]);

  // Auto Scroll to catalog
  const scrollToCatalog = () => {
    const catalogEl = document.getElementById("movie-catalog-shelf");
    if (catalogEl) {
      catalogEl.scrollIntoView({ behavior: "smooth" });
    }
  };

  const allMediaItems = useMemo(() => {
    const mappedMovies = movies.map(m => ({ ...m, type: "movie" as const }));
    const mappedSeries = series.map(s => ({
      ...s,
      type: "series" as const,
      movieName: s.seriesName || s.title || "",
      title: s.title || s.seriesName || ""
    }));
    return [...mappedMovies, ...mappedSeries];
  }, [movies, series]);

  // Extract list of all unique genres in data catalog to auto-generate filter capsules
  const [genreOptions, setGenreOptions] = useState<string[]>([]);
  useEffect(() => {
    const genresSet = new Set<string>();
    allMediaItems.forEach(m => {
      if (m.genres) {
        m.genres.forEach(g => genresSet.add(g));
      }
    });
    setGenreOptions(["All Genres", ...Array.from(genresSet)]);
  }, [allMediaItems]);

  // Filter & Search logic
  const filteredMovies = allMediaItems.filter(item => {
    // If activeTab is watchlist, filter by watchlist first
    if (activeTab === "watchlist" && !watchlist.includes(item.title)) {
      return false;
    }

    // Filter by homeSubTab if on Home
    if (activeTab === "all") {
      if (homeSubTab === "movies" && item.type !== "movie") {
        return false;
      }
      if (homeSubTab === "series" && item.type !== "series") {
        return false;
      }
    }

    // Search input match
    const titleVal = item.title || "";
    const nameVal = (item.type === "series" ? (item as any).seriesName : (item as any).movieName) || "";
    const directorVal = item.director || "";
    const genreVal = (item.genres || []).join(" ");
    const languageVal = item.language || "";
    const starringVal = item.starring || "";

    const stringToSearch = `${titleVal} ${nameVal} ${directorVal} ${genreVal} ${languageVal} ${starringVal}`.toLowerCase();
    const queryMatch = stringToSearch.includes(searchQuery.toLowerCase());

    // Genre badge match
    const genreMatch = selectedGenre === "All Genres" || (item.genres && item.genres.includes(selectedGenre));

    return queryMatch && genreMatch;
  });

  // Sort logic
  const sortedMovies = [...filteredMovies].sort((a, b) => {
    if (sortBy === "rating_highest") {
      const ratingA = parseFloat(a.rating ? a.rating.replace("/10", "") : "0") || 0;
      const ratingB = parseFloat(b.rating ? b.rating.replace("/10", "") : "0") || 0;
      return ratingB - ratingA;
    }
    if (sortBy === "rating_lowest") {
      const ratingA = parseFloat(a.rating ? a.rating.replace("/10", "") : "0") || 0;
      const ratingB = parseFloat(b.rating ? b.rating.replace("/10", "") : "0") || 0;
      return ratingA - ratingB;
    }
    if (sortBy === "name_asc") {
      const nameA = a.movieName || a.title || "";
      const nameB = b.movieName || b.title || "";
      return nameA.localeCompare(nameB);
    }
    if (sortBy === "name_desc") {
      const nameA = a.movieName || a.title || "";
      const nameB = b.movieName || b.title || "";
      return nameB.localeCompare(nameA);
    }
    if (sortBy === "date_newest") {
      const parseDate = (dStr: string) => {
        try {
          return Date.parse(dStr) || 0;
        } catch {
          return 0;
        }
      };
      return parseDate(b.lastUpdated) - parseDate(a.lastUpdated);
    }
    if (sortBy === "date_oldest") {
      const parseDate = (dStr: string) => {
        try {
          return Date.parse(dStr) || 0;
        } catch {
          return 0;
        }
      };
      return parseDate(a.lastUpdated) - parseDate(b.lastUpdated);
    }
    // Fallback: newest first since that's the default
    const parseDateFallback = (dStr: string) => {
      try {
        return Date.parse(dStr) || 0;
      } catch {
        return 0;
      }
    };
    return parseDateFallback(b.lastUpdated) - parseDateFallback(a.lastUpdated);
  });

  // Pagination parameters
  const ITEMS_PER_PAGE = 20;
  const totalMoviesCount = sortedMovies.length;
  const totalPagesCount = Math.ceil(totalMoviesCount / ITEMS_PER_PAGE) || 1;
  const safeCurrentPage = Math.min(Math.max(1, currentPage), totalPagesCount);

  const paginatedMovies = sortedMovies.slice(
    (safeCurrentPage - 1) * ITEMS_PER_PAGE,
    safeCurrentPage * ITEMS_PER_PAGE
  );

  // Sliding window pagination range: center safeCurrentPage when possible, max 5 pages total.
  let startPage = 1;
  let endPage = totalPagesCount;

  if (totalPagesCount > 5) {
    startPage = Math.max(1, safeCurrentPage - 2);
    endPage = startPage + 4;
    if (endPage > totalPagesCount) {
      endPage = totalPagesCount;
      startPage = endPage - 4;
    }
  }

  const paginatedPosterUrls = useMemo(() => {
    return paginatedMovies.map((m) => m.image).join(",");
  }, [paginatedMovies]);

  // Preload visible poster images of the current paginated page to guarantee zero-latency dynamic background transitions on hover
  useEffect(() => {
    if (paginatedMovies && paginatedMovies.length > 0) {
      paginatedMovies.forEach((item) => {
        if (item.image) {
          const img = new Image();
          img.src = item.image;
        }
      });
    }
  }, [paginatedPosterUrls]);

  const paginationPages = [];
  for (let p = startPage; p <= endPage; p++) {
    paginationPages.push(p);
  }

  // TV Remote and Keyboard Navigation for Pagination
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      const activeEl = document.activeElement;
      const isInputActive = activeEl && (
        activeEl.tagName === "INPUT" || 
        activeEl.tagName === "TEXTAREA" || 
        activeEl.getAttribute("contenteditable") === "true"
      );
      
      const isAnyModalOpen = !!(
        activePlayerMovie || 
        activeTrailerMovie || 
        selectedSeries || 
        activeDownloadMovie || 
        downloadPendingInfo
      );

      if (isAnyModalOpen || isInputActive) {
        return;
      }

      if (e.key === "PageDown" || e.key === "]" || e.key === "ArrowRight") {
        e.preventDefault();
        if (currentPage < totalPagesCount) {
          setCurrentPage(currentPage + 1);
          scrollToCatalog();
        }
      } else if (e.key === "PageUp" || e.key === "[" || e.key === "ArrowLeft") {
        e.preventDefault();
        if (currentPage > 1) {
          setCurrentPage(currentPage - 1);
          scrollToCatalog();
        }
      }
    };

    window.addEventListener("keydown", handleGlobalKeyDown);
    return () => {
      window.removeEventListener("keydown", handleGlobalKeyDown);
    };
  }, [currentPage, totalPagesCount, activePlayerMovie, activeTrailerMovie, selectedSeries, activeDownloadMovie, downloadPendingInfo]);

  // Custom function to trigger resume playback from Continued Watching
  const handleResumeMovie = (movieTitle: string) => {
    const matchedMovie = movies.find(m => m.title === movieTitle);
    if (matchedMovie) {
      handlePlayMedia(matchedMovie);
    }
  };

  // Hero Slider states for automatic movie carousel rotate
  const [currentSlideIndex, setCurrentSlideIndex] = useState(0);
  const [isAutoplayPaused, setIsAutoplayPaused] = useState(false);
  const [sliderResumeTimer, setSliderResumeTimer] = useState<any>(null);

  // Touch swipe states for Spotlight Slider on mobile devices
  const [touchStartX, setTouchStartX] = useState<number | null>(null);
  const [touchStartY, setTouchStartY] = useState<number | null>(null);
  const [touchEndX, setTouchEndX] = useState<number | null>(null);
  const [touchEndY, setTouchEndY] = useState<number | null>(null);

  const handleTouchStart = (e: React.TouchEvent) => {
    if (!e.targetTouches || e.targetTouches.length === 0) return;
    setTouchStartX(e.targetTouches[0].clientX);
    setTouchStartY(e.targetTouches[0].clientY);
    setTouchEndX(e.targetTouches[0].clientX);
    setTouchEndY(e.targetTouches[0].clientY);
    setIsAutoplayPaused(true);
    if (sliderResumeTimer) {
      clearTimeout(sliderResumeTimer);
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!e.targetTouches || e.targetTouches.length === 0) return;
    setTouchEndX(e.targetTouches[0].clientX);
    setTouchEndY(e.targetTouches[0].clientY);

    // If swiping mostly horizontally, prevent vertical scroll conflicts to keep drag smooth
    if (touchStartX !== null && touchStartY !== null) {
      const currentX = e.targetTouches[0].clientX;
      const currentY = e.targetTouches[0].clientY;
      const diffX = Math.abs(touchStartX - currentX);
      const diffY = Math.abs(touchStartY - currentY);
      
      if (diffX > diffY && diffX > 8) {
        if (e.cancelable) {
          e.preventDefault();
        }
      }
    }
  };

  const handleTouchEnd = () => {
    if (touchStartX === null || touchEndX === null || touchStartY === null || touchEndY === null) {
      const timer = setTimeout(() => {
        setIsAutoplayPaused(false);
      }, 6000);
      setSliderResumeTimer(timer);
      return;
    }
    const diffX = touchStartX - touchEndX;
    const diffY = touchStartY - touchEndY;
    const threshold = 30; // lower threshold for smoother experience on mobile

    // Only swipe if predominantly horizontal to guard against scrolling conflicts
    if (Math.abs(diffX) > Math.abs(diffY) && Math.abs(diffX) > threshold) {
      if (diffX > 0) {
        handleNextSlide();
      } else {
        handlePrevSlide();
      }
    }

    const timer = setTimeout(() => {
      setIsAutoplayPaused(false);
    }, 6000);
    setSliderResumeTimer(timer);

    setTouchStartX(null);
    setTouchEndX(null);
    setTouchStartY(null);
    setTouchEndY(null);
  };

  // Derive latest 5 added movies based on movie date correctly
  const parseDateForSlider = (dStr: string) => {
    try {
      return Date.parse(dStr) || 0;
    } catch {
      return 0;
    }
  };

  const latestMovies = useMemo(() => {
    return [...allMediaItems]
      .filter(item => {
        if (homeSubTab === "movies") return item.type === "movie";
        if (homeSubTab === "series") return item.type === "series";
        return true;
      })
      .sort((a, b) => parseDateForSlider(b.lastUpdated) - parseDateForSlider(a.lastUpdated))
      .slice(0, 5);
  }, [allMediaItems, homeSubTab]);

  useEffect(() => {
    if (isAutoplayPaused || latestMovies.length === 0) return;
    const interval = setInterval(() => {
      setCurrentSlideIndex(prev => (prev + 1) % latestMovies.length);
    }, 5000);
    return () => clearInterval(interval);
  }, [isAutoplayPaused, latestMovies.length]);

  const handleSlideInteraction = (index?: number) => {
    setIsAutoplayPaused(true);
    if (index !== undefined) {
      setCurrentSlideIndex(index);
    }
    if (sliderResumeTimer) {
      clearTimeout(sliderResumeTimer);
    }
    const timer = setTimeout(() => {
      setIsAutoplayPaused(false);
    }, 10000); // Resume auto-slide after 10s of inactivity
    setSliderResumeTimer(timer);
  };

  const handlePrevSlide = () => {
    if (latestMovies.length === 0) return;
    const newIdx = (currentSlideIndex - 1 + latestMovies.length) % latestMovies.length;
    handleSlideInteraction(newIdx);
  };

  const handleNextSlide = () => {
    if (latestMovies.length === 0) return;
    const newIdx = (currentSlideIndex + 1) % latestMovies.length;
    handleSlideInteraction(newIdx);
  };

  // Back to library action
  const resetFilters = () => {
    setSearchQuery("");
    setSelectedGenre("All Genres");
    setSortBy("default");
    setActiveTab("all");
  };

  if (isOffline) {
    const cachedMoviesStr = localStorage.getItem("moviemachi_active_catalog");
    let hasCachedContent = false;
    if (cachedMoviesStr) {
      try {
        const parsed = JSON.parse(cachedMoviesStr);
        if (Array.isArray(parsed) && parsed.length > 0) {
          hasCachedContent = true;
        }
      } catch (e) {}
    }

    const handleGoHome = () => {
      if (hasCachedContent) {
        setIsOffline(false);
      } else {
        setRetryMessage("No cached content found. Connection required.");
        setTimeout(() => setRetryMessage(null), 3000);
      }
    };

    const handleReload = () => {
      window.location.reload();
    };

    return (
      <div className="relative min-h-screen text-gray-200 font-sans flex items-center justify-center p-4 sm:p-6 md:p-8 select-none overflow-x-hidden bg-[#050508] w-full">
        {/* Animated glowing red ambient gradients */}
        <div className="absolute inset-0 bg-radial-gradient from-transparent via-[#06060a]/90 to-[#030305] z-0 pointer-events-none" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] sm:w-[800px] sm:h-[800px] bg-[#ff2d55]/8 rounded-full blur-[160px] pointer-events-none -z-10 animate-pulse duration-[6000ms]" />
        <div className="absolute top-1/3 left-1/4 w-72 h-72 sm:w-96 sm:h-96 bg-[#ff6b00]/4 rounded-full blur-[140px] pointer-events-none -z-10" />

        {/* Floating particles */}
        {[...Array(8)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute w-1.5 h-1.5 bg-[#ff2d55]/25 rounded-full blur-[0.5px] pointer-events-none"
            animate={{
              y: [0, -100, 0],
              x: [0, (i % 2 === 0 ? 40 : -40), 0],
              opacity: [0.1, 0.7, 0.1],
            }}
            transition={{
              duration: 8 + i * 2,
              repeat: Infinity,
              ease: "easeInOut",
            }}
            style={{
              left: `${10 + i * 12}%`,
              top: `${40 + (i * 8)}%`,
            }}
          />
        ))}

        {/* Soft Vignette Overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-black pointer-events-none z-0 opacity-60" />

        {/* Background Aurora */}
        <BackgroundAurora />

        {/* Cinematic Premium Glass Card Container */}
        <motion.div 
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
          className="relative w-full max-w-lg mx-auto bg-[#0d0e15]/65 backdrop-blur-3xl border border-white/10 rounded-[32px] p-6 sm:p-10 text-center shadow-[0_30px_80px_rgba(0,0,0,0.9),_0_0_60px_rgba(255,45,85,0.15)] flex flex-col items-center justify-center gap-7 max-h-[96vh] overflow-y-auto z-10"
        >
          
          {/* Subtle laser sheen at the top of the container */}
          <div className="absolute top-0 inset-x-0 h-[1px] bg-gradient-to-r from-transparent via-[#ff2d55]/50 to-transparent blur-[0.5px]" />

          {/* Logo with pulse and slide-in */}
          <motion.div 
            initial={{ opacity: 0, scale: 0.85 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.6, ease: "easeOut" }}
            className="flex flex-col items-center gap-2"
          >
            {/* Premium Logo branding with Red Ring Glow */}
            <div className="relative w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-gradient-to-br from-[#ff2d55] to-[#ff6b00] flex items-center justify-center shadow-[0_8px_30px_rgba(255,45,85,0.4)] select-none shrink-0 transform hover:scale-105 transition-transform duration-300">
              <span className="text-3xl sm:text-4xl text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.45)]">🎬</span>
              <div className="absolute -inset-1.5 bg-gradient-to-tr from-[#ff2d55]/20 to-amber-500/20 rounded-2xl blur-lg pointer-events-none -z-10 animate-pulse" />
            </div>

            <div className="text-center mt-2">
              <h1 className="font-display font-black text-2xl sm:text-3xl text-white tracking-widest uppercase bg-clip-text bg-gradient-to-r from-white via-stone-200 to-gray-400">
                MovieMachi
              </h1>
              <p className="text-[10px] sm:text-xs font-black uppercase tracking-[0.18em] text-[#ff2d55] mt-1 select-none">
                Premium Tamil Cinema Portal
              </p>
            </div>
          </motion.div>

          {/* Cinematic Floating Screen Illustration */}
          <motion.div 
            animate={{ y: [0, -8, 0] }}
            transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
            className="relative w-64 h-36 sm:w-72 sm:h-40 bg-black/80 rounded-2xl border-2 border-white/10 overflow-hidden shadow-[0_20px_50px_rgba(0,0,0,0.9),_0_0_30px_rgba(255,45,85,0.15)] flex flex-col items-center justify-center group"
          >
            {/* Screen scanlines overlay */}
            <div className="absolute inset-0 bg-[linear-gradient(rgba(18,16,16,0)_50%,_rgba(0,0,0,0.25)_50%),_linear-gradient(90deg,_rgba(255,0,0,0.06),_rgba(0,255,0,0.02),_rgba(0,0,255,0.06))] bg-[size:100%_4px,_6px_100%] pointer-events-none opacity-40" />
            
            {/* Subtle Red ambient back-glow */}
            <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-red-600/10 to-transparent blur-md" />

            {/* No Signal CRT Color Bars Pattern (Subtle & Stylized in dark theme) */}
            <div className="absolute top-0 inset-x-0 h-3 flex opacity-25">
              <div className="flex-1 bg-white/60" />
              <div className="flex-1 bg-yellow-400/40" />
              <div className="flex-1 bg-cyan-400/40" />
              <div className="flex-1 bg-green-500/40" />
              <div className="flex-1 bg-magenta-500/40" />
              <div className="flex-1 bg-red-650/40" />
              <div className="flex-1 bg-blue-600/40" />
            </div>

            {/* Cinema Static Noise Glow and WiFiOff Icon */}
            <div className="flex flex-col items-center gap-2 relative z-10">
              <div className="relative">
                <WifiOff size={36} className="text-red-500/80 drop-shadow-[0_0_10px_rgba(239,68,68,0.6)]" />
                <motion.div 
                  animate={{ scale: [1, 1.15, 1], opacity: [0.4, 0.8, 0.4] }}
                  transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                  className="absolute -inset-2 bg-red-500/10 rounded-full blur-md -z-10" 
                />
              </div>
              
              <span className="font-mono text-[9px] font-black tracking-[0.25em] text-red-500 bg-red-950/40 border border-red-500/30 px-2 py-0.5 rounded uppercase select-none animate-pulse">
                NO SIGNAL
              </span>
            </div>

            {/* Screen corner highlights */}
            <div className="absolute top-2 left-2 w-1.5 h-1.5 border-t border-l border-white/20" />
            <div className="absolute top-2 right-2 w-1.5 h-1.5 border-t border-r border-white/20" />
            <div className="absolute bottom-2 left-2 w-1.5 h-1.5 border-b border-l border-white/20" />
            <div className="absolute bottom-2 right-2 w-1.5 h-1.5 border-b border-r border-white/20" />
          </motion.div>

          <div className="space-y-2">
            <h2 className="font-display font-black text-xl sm:text-2xl text-white tracking-wide">
              You're Offline
            </h2>
            <p className="text-xs sm:text-sm text-gray-400 leading-relaxed max-w-sm mx-auto font-medium">
              No internet connection detected. Reconnect to continue watching your favourite movies and series.
            </p>
          </div>

          {/* Premium Glass Information Card */}
          <div className="w-full p-4 sm:p-5 rounded-2xl bg-white/[0.02] border border-white/5 space-y-3.5 text-left text-xs sm:text-sm backdrop-blur-md">
            <div className="flex justify-between items-center pb-2.5 border-b border-white/5">
              <span className="text-gray-400 font-semibold flex items-center gap-2">
                <Globe size={14} className="text-[#ff2d55]" /> Connection Status
              </span>
              <span className="font-mono font-bold text-[#ff2d55] flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-[#ff2d55] animate-ping" />
                ● Offline
              </span>
            </div>
            
            <div className="flex justify-between items-center pb-2.5 border-b border-white/5">
              <span className="text-gray-400 font-semibold flex items-center gap-2">
                <Database size={14} className="text-amber-500" /> Offline Availability
              </span>
              {hasCachedContent ? (
                <span className="font-mono font-bold text-emerald-400 flex items-center gap-1">
                  ✓ Cached Content Available
                </span>
              ) : (
                <span className="font-mono font-bold text-stone-500">
                  No Cached Content
                </span>
              )}
            </div>

            <div className="flex justify-between items-center">
              <span className="text-gray-400 font-semibold flex items-center gap-2">
                <AlertTriangle size={14} className="text-yellow-500" /> Network Status
              </span>
              <span className="font-mono text-xs text-stone-300 animate-pulse">
                Waiting for internet...
              </span>
            </div>
          </div>

          {/* Diagnostics Guidance Box if triggered */}
          {networkDiagnosticInfo && (
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="w-full text-left p-4 rounded-2xl bg-white/4 border border-white/5 font-mono text-[10px] sm:text-xs leading-relaxed text-stone-300 whitespace-pre-line shadow-inner max-h-48 overflow-y-auto"
            >
              {networkDiagnosticInfo}
            </motion.div>
          )}

          {/* Status Message Line */}
          {retryMessage && (
            <p className="text-[11px] font-mono font-bold text-amber-400 animate-pulse bg-amber-500/10 border border-amber-500/20 py-2.5 px-4 rounded-xl w-full">
              {retryMessage}
            </p>
          )}

          {/* Interactive buttons row */}
          <div className="flex flex-col sm:flex-row items-center gap-3 w-full shrink-0">
            <motion.button
              onClick={handleReload}
              whileTap={{ scale: 0.98 }}
              className="w-full sm:w-1/2 py-3.5 px-6 rounded-2xl bg-gradient-to-r from-[#ff2d55] to-[#ff6b00] hover:brightness-110 text-white font-sans font-black text-xs tracking-wider uppercase transition-all shadow-[0_0_20px_rgba(255,45,85,0.45)] cursor-pointer flex items-center justify-center gap-2 select-none animate-pulse hover:animate-none"
            >
              <RefreshCw size={14} className="animate-spin duration-3000" /> Retry Connection
            </motion.button>

            <button
              onClick={handleGoHome}
              className="w-full sm:w-1/2 py-3.5 px-6 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20 text-stone-200 hover:text-white font-sans font-black text-xs tracking-wider uppercase transition-all cursor-pointer flex items-center justify-center gap-2 select-none active:scale-95"
            >
              <Home size={14} /> Go Home
            </button>
          </div>

          {/* Diagnostics Button to reveal detailed platform specific options */}
          <div className="border-t border-white/5 w-full pt-4 flex flex-col items-center gap-2.5">
            <button 
              onClick={handleCheckNetwork}
              className="text-[10px] font-mono font-bold text-gray-500 hover:text-gray-300 uppercase tracking-widest cursor-pointer transition-colors"
            >
              ⚙️ Diagnostic Troubleshooting Guide
            </button>
            <p className="text-[8px] font-mono text-gray-600 uppercase tracking-widest leading-none">
              🎮 TV Remote & Keyboard Compatible
            </p>
          </div>

        </motion.div>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen text-gray-200 font-sans pb-16 selection:bg-red-650 selection:text-white">
      {/* Immersive motion dust space background wrapper */}
      <BackgroundAurora />

      {/* Swipe-to-dismiss mobile-style PWA Install Notification Bar */}
      <PWAInstallPrompt />

      {/* Sticky Premium Navigation Hub */}
      <Header 
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        theme={theme}
        onThemeToggle={toggleTheme}
        notifications={notifications}
        onMarkNotificationRead={handleMarkNotificationRead}
        onDismissNotification={handleDismissNotification}
        onPlayMovieTitle={handlePlayMovieTitle}
        isAdminLoggedIn={isAdminLoggedIn}
        isNotifOpen={isNotifOpen}
        setIsNotifOpen={setIsNotifOpen}
        isNotifMobileOpen={isNotifMobileOpen}
        setIsNotifMobileOpen={setIsNotifMobileOpen}
      />

      <main className={`max-w-[2000px] mx-auto px-4 sm:px-6 md:px-8 ${isAdminLoggedIn ? "mt-0 pt-0 sm:pt-1" : "mt-6"} space-y-12`}>
        
        {/* Dynamic routing layouts depending on which activeTab tab is toggled */}
        {isAdminLoggedIn ? (
          <RequestSection 
            movies={movies}
            requests={requests}
            userId={userId}
            onAddRequest={handleAddRequest}
            onUpvoteRequest={handleRequestPlusOne}
            onAdminUploadMovie={handleAdminUploadMovie}
            onAdminAddMovie={handleAdminAddMovie}
            onAdminUpdateMovie={handleAdminUpdateMovie}
            onAdminDeleteMovie={handleAdminDeleteMovie}
            onFulfillRequestCMS={handleFulfillRequestCMS}
            setActivePlayerMovie={handlePlayMedia}
            series={series}
            onAdminAddSeries={handleAdminAddSeries}
            onAdminUpdateSeries={handleAdminUpdateSeries}
            onAdminDeleteSeries={handleAdminDeleteSeries}
            isAdminLoggedIn={isAdminLoggedIn}
            onAdminLoggedInChange={setIsAdminLoggedIn}
          />
        ) : activeTab === "all" ? (
          <>
            {/* Home Page Sub-Filter Tabs: All | Movies | Series */}
            {!searchQuery.trim() && (
              <div id="home-sub-tabs-bar" className="flex items-center justify-center pt-2 pb-6 border-b border-white/5 animate-fade-in select-none w-full">
                <div className="flex items-center bg-[#0d0e15]/85 backdrop-blur-xl border border-white/10 p-1.5 rounded-2xl relative shadow-[0_15px_35px_rgba(255,45,85,0.25)] w-full max-w-sm sm:max-w-[320px] mx-auto overflow-hidden group">
                  
                  {/* Subtle red/orange glow ambient overlay inside active region */}
                  <div className="absolute inset-0 bg-gradient-to-r from-[#ff2d55]/5 via-orange-500/5 to-[#ff2d55]/5 pointer-events-none" />
                  
                  {/* Sweep shimmer/shine animation overlay */}
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-[#ff2d55]/15 to-transparent -translate-x-full animate-loop-shine pointer-events-none" />

                  {/* Glass active slider background */}
                  <div className="absolute inset-y-1.5 left-1.5 right-1.5 pointer-events-none w-[calc(100%-12px)]">
                    <motion.div
                      layoutId="activeSubTabIndicator"
                      className="absolute h-full rounded-xl bg-gradient-to-r from-[#ff2d55] to-[#ff6b00] shadow-[0_0_22px_rgba(255,45,85,0.85),_inset_0_1px_1.5px_rgba(255,255,255,0.35)] animate-pulse-glow"
                      initial={false}
                      animate={{
                        width: "33.333%",
                        x: homeSubTab === "all" ? "0%" : homeSubTab === "movies" ? "100%" : "200%",
                      }}
                      transition={{ type: "spring", stiffness: 350, damping: 24 }}
                    />
                  </div>

                  {/* Toggle Mode: All */}
                  <button
                    onClick={() => {
                      setHomeSubTab("all");
                    }}
                    className={`flex-1 relative z-10 py-2.5 rounded-xl text-xs font-black tracking-widest uppercase transition-all duration-300 flex items-center justify-center cursor-pointer select-none ${
                      homeSubTab === "all"
                        ? "text-white scale-102 font-extrabold drop-shadow-[0_2px_6px_rgba(255,45,85,0.5)]"
                        : "text-stone-400 hover:text-white"
                    }`}
                    title="View All Content"
                    aria-label="All content view"
                  >
                    <span>All</span>
                  </button>

                  {/* Toggle Mode: Movies */}
                  <button
                    onClick={() => {
                      setHomeSubTab("movies");
                    }}
                    className={`flex-1 relative z-10 py-2.5 rounded-xl text-xs font-black tracking-widest uppercase transition-all duration-300 flex items-center justify-center cursor-pointer select-none ${
                      homeSubTab === "movies"
                        ? "text-white scale-102 font-extrabold drop-shadow-[0_2px_6px_rgba(255,45,85,0.5)]"
                        : "text-stone-400 hover:text-white"
                    }`}
                    title="Filter to Movies"
                    aria-label="Movies tab view"
                  >
                    <span>Movies</span>
                  </button>

                  {/* Toggle Mode: Series */}
                  <button
                    onClick={() => {
                      setHomeSubTab("series");
                    }}
                    className={`flex-1 relative z-10 py-2.5 rounded-xl text-xs font-black tracking-widest uppercase transition-all duration-300 flex items-center justify-center cursor-pointer select-none ${
                      homeSubTab === "series"
                        ? "text-white scale-102 font-extrabold drop-shadow-[0_2px_6px_rgba(255,45,85,0.5)]"
                        : "text-stone-400 hover:text-white"
                    }`}
                    title="Filter to Series"
                    aria-label="Series tab view"
                  >
                    <span>Series</span>
                  </button>

                </div>
              </div>
            )}

            {/* Interactive curated Spotlight slider block (Hides if filter is active for pristine layout) */}
            {!searchQuery.trim() && selectedGenre === "All Genres" && latestMovies.length > 0 && (
              <div 
                className="relative rounded-3xl overflow-hidden glass-panel border border-white/8 h-[280px] sm:h-[320px] md:h-[500px] flex items-end select-none group/slider shadow-[0_4px_30px_rgba(0,0,0,0.4)] touch-pan-y"
                onMouseEnter={() => setIsAutoplayPaused(true)}
                onMouseLeave={() => setIsAutoplayPaused(false)}
                onTouchStart={handleTouchStart}
                onTouchMove={handleTouchMove}
                onTouchEnd={handleTouchEnd}
              >
                {latestMovies.map((slide, slideIdx) => {
                  const isActive = slideIdx === currentSlideIndex;
                  const isSeries = slide.type === "series";
                  let hasWatchUrl = false;
                  let hasDownloads = false;

                  if (isSeries) {
                    const seriesObj = slide as unknown as Series;
                    if (seriesObj.episodes) {
                      hasDownloads = seriesObj.episodes.some(ep => ep.downloadUrl && ep.downloadUrl.trim() !== "");
                    }
                    hasWatchUrl = !!(slide.watchUrl && slide.watchUrl.trim() !== "");
                  } else {
                    hasWatchUrl = !!(slide.watchUrl && slide.watchUrl.trim() !== "");
                    hasDownloads = !!(slide.links && slide.links.some(l => l.url && l.url.trim() !== ""));
                  }

                  const canWatch = hasWatchUrl || hasDownloads;
                  
                  return (
                    <div
                      key={`slide-${slide.title}-${slideIdx}`}
                      className={`absolute inset-0 w-full h-full transition-all duration-700 ease-in-out ${
                        isActive 
                          ? "opacity-100 translate-x-0 scale-100 pointer-events-auto z-10" 
                          : "opacity-0 translate-x-12 scale-95 pointer-events-none z-0"
                      }`}
                    >
                      {/* Immersive backdrop poster art */}
                      <img 
                        src={slide.image}
                        alt={slide.title}
                        referrerPolicy="no-referrer"
                        className="absolute inset-0 w-full h-full object-cover select-none pointer-events-none"
                        style={{ objectPosition: slide.heroPosition || "center" }}
                        loading="lazy"
                      />
                      
                      {/* Chromatic shadow gradient mask */}
                      <div className="absolute inset-0 bg-gradient-to-t from-[#09090f] via-[#09090f]/60 to-transparent" />
                      <div className="absolute inset-0 bg-gradient-to-r from-[#09090f]/75 via-transparent to-transparent hidden md:block" />

                      {/* Floating ambient colored lights spotlight */}
                      <div className="absolute top-[20%] right-[10%] w-56 h-56 rounded-full bg-red-600/10 blur-[80px]" />

                      {/* Film Spotlight metadata call-to-action */}
                      <div className="absolute bottom-0 left-0 right-0 p-3.5 sm:p-6 md:p-12 space-y-2 sm:space-y-3 md:space-y-4 max-w-2xl select-text mb-8 sm:mb-0">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span className="px-2 py-0.5 sm:px-3 sm:py-1 bg-gradient-to-r from-red-600 to-amber-500 text-white font-mono font-bold text-[8.5px] sm:text-xs uppercase rounded-full shadow-lg">
                            Spotlight Premier
                          </span>
                          <span className="text-[9.5px] sm:text-xs font-mono text-amber-400 font-bold bg-[#00000080] backdrop-blur px-2 py-0.5 sm:px-2.5 sm:py-1 rounded border border-amber-500/20 flex items-center gap-1 shrink-0">
                            <Star size={10} fill="currentColor" className="sm:w-[11px] sm:h-[11px]" />
                            <span>{slide.rating ? slide.rating.replace("/10", "") : "8.5"} Rated</span>
                          </span>
                          {slide.genres && slide.genres.slice(0, 2).map((g, gIdx) => (
                            <span key={`${g}-${gIdx}`} className="text-[9px] sm:text-[10px] font-mono text-gray-400 bg-white/5 border border-white/5 px-1.5 py-0.5 rounded uppercase hidden xs:inline-block">
                              {g}
                            </span>
                          ))}
                        </div>

                        <h1 className="font-display font-black text-base xs:text-lg sm:text-4xl md:text-5xl text-white tracking-tight leading-tight line-clamp-1 truncate">
                          {slide.movieName}
                        </h1>

                        <p className="text-[10px] xs:text-xs sm:text-sm text-gray-300 leading-normal max-w-xl line-clamp-1 xs:line-clamp-2 md:line-clamp-none">
                          Discover our highlighted premiere! Directed by <span className="text-white font-medium">{slide.director || "Not Specified"}</span>. Starring <span className="text-white font-medium">{slide.starring || "Not Specified"}</span>. Featuring pristine audio channels and high resolution encoders.
                        </p>

                        <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 pt-1 sm:pt-2">
                          {slide.trailerUrl && slide.trailerUrl.trim() !== "" && (
                            <button
                              onClick={() => {
                                handleSlideInteraction();
                                setActiveTrailerMovie(slide as any);
                              }}
                              className="h-11 px-4 sm:px-6 sm:h-auto sm:py-3.5 rounded-xl md:rounded-2xl bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/25 text-amber-400 font-display font-bold text-[9px] xs:text-[11px] sm:text-sm flex items-center justify-center gap-1 sm:gap-2 transition-all cursor-pointer select-none font-semibold"
                            >
                              <span>🎬 Watch Trailer</span>
                            </button>
                          )}

                          {slide.type === "series" ? (
                            <>
                              {canWatch && (
                                <button 
                                  onClick={() => {
                                    handleSlideInteraction();
                                    setSelectedSeries(slide as any);
                                  }}
                                  className="h-11 px-4 sm:px-6 sm:h-auto sm:py-3.5 rounded-xl md:rounded-2xl bg-red-650 hover:bg-red-550 border border-red-500/20 text-white font-display font-bold text-[9px] xs:text-[11px] sm:text-sm flex items-center justify-center gap-1 sm:gap-2 transition-all cursor-pointer shadow-[0_0_20px_rgba(239,68,68,0.35)]"
                                >
                                  <Play size={11} fill="currentColor" className="xs:w-3.5 xs:h-3.5 sm:w-4 sm:h-4" />
                                  <span>Watch Online</span>
                                </button>
                              )}

                              {hasDownloads && (
                                <button 
                                  onClick={() => {
                                    handleSlideInteraction();
                                    setSelectedSeries(slide as any);
                                  }}
                                  className={`h-11 px-4 sm:px-6 sm:h-auto sm:py-3.5 rounded-xl md:rounded-2xl bg-white/5 hover:bg-white/10 text-gray-200 font-display font-bold text-[9px] xs:text-[11px] sm:text-sm border border-white/10 flex items-center justify-center gap-1 sm:gap-2 transition-all cursor-pointer ${
                                    !canWatch ? "shadow-[0_0_20px_rgba(239,68,68,0.25)] bg-red-650 hover:bg-red-550 border border-red-500/20 text-white" : ""
                                  }`}
                                >
                                  <Download size={11} className="xs:w-3.5 xs:h-3.5 sm:w-4 sm:h-4" />
                                  <span>Downloads</span>
                                </button>
                              )}
                            </>
                          ) : (
                            <>
                              {canWatch && (
                                <button 
                                  onClick={() => {
                                    handleSlideInteraction();
                                    handlePlayMedia(slide);
                                  }}
                                  className="h-11 px-4 sm:px-6 sm:h-auto sm:py-3.5 rounded-xl md:rounded-2xl bg-red-650 hover:bg-red-550 border border-red-500/20 text-white font-display font-bold text-[9px] xs:text-[11px] sm:text-sm flex items-center justify-center gap-1 sm:gap-2 transition-all cursor-pointer shadow-[0_0_20px_rgba(239,68,68,0.35)]"
                                >
                                  <Play size={11} fill="currentColor" className="xs:w-3.5 xs:h-3.5 sm:w-4 sm:h-4" />
                                  <span>Watch Online</span>
                                </button>
                              )}

                              {hasDownloads && (
                                <button 
                                  onClick={() => {
                                    handleSlideInteraction();
                                    setActiveDownloadMovie(slide);
                                  }}
                                  className={`h-11 px-4 sm:px-6 sm:h-auto sm:py-3.5 rounded-xl md:rounded-2xl bg-white/5 hover:bg-white/10 text-gray-200 font-display font-bold text-[9px] xs:text-[11px] sm:text-sm border border-white/10 flex items-center justify-center gap-1 sm:gap-2 transition-all cursor-pointer ${
                                    !canWatch ? "shadow-[0_0_20px_rgba(239,68,68,0.25)] bg-red-650 hover:bg-red-550 border border-red-500/20 text-white" : ""
                                  }`}
                                >
                                  <Download size={11} className="xs:w-3.5 xs:h-3.5 sm:w-4 sm:h-4" />
                                  <span>Downloads</span>
                                </button>
                              )}
                            </>
                          )}

                          <button 
                            onClick={() => {
                              handleSlideInteraction();
                              scrollToCatalog();
                            }}
                            className="h-11 px-3 sm:px-5 sm:h-auto sm:py-3.5 rounded-xl md:rounded-2xl text-gray-400 hover:text-white font-display font-semibold transition-all text-[9px] xs:text-[11px] sm:text-sm flex items-center justify-center gap-0.5 sm:gap-1"
                          >
                            <Compass size={11} className="xs:w-3.5 xs:h-3.5 sm:w-4 sm:h-4" />
                            <span className="hidden sm:inline">Browse Shelf</span>
                          </button>
                        </div>
                      </div>

                      {/* Quality label overlay - Replace "SEEDED: " with "QUALITY: " */}
                      <div className="absolute right-4 top-4 md:right-6 md:top-6 z-20">
                        <div className="px-2 py-1 md:px-3 md:py-1.5 rounded-lg md:rounded-xl bg-[#000000cc] backdrop-blur-md text-[9px] md:text-xs font-mono font-bold border border-white/10 text-gray-300">
                          QUALITY: <span className="text-red-500 text-neon-red font-black uppercase">{slide.quality}</span>
                        </div>
                      </div>
                    </div>
                  );
                })}

                {/* Left/Right manual slide navigation arrows (Hidden on mobile for non-cluttered screen space) */}
                <button
                  onClick={handlePrevSlide}
                  className="absolute left-4 top-1/2 -translate-y-1/2 z-20 w-10 h-10 rounded-full bg-black/60 hover:bg-red-600/90 text-white border border-white/10 hover:border-red-500/30 hidden md:flex items-center justify-center transition-all opacity-0 group-hover/slider:opacity-100 cursor-pointer active:scale-90"
                  aria-label="Previous Slide"
                >
                  <ChevronLeft size={20} />
                </button>

                <button
                  onClick={handleNextSlide}
                  className="absolute right-4 top-1/2 -translate-y-1/2 z-20 w-10 h-10 rounded-full bg-black/60 hover:bg-red-600/90 text-white border border-white/10 hover:border-red-500/30 hidden md:flex items-center justify-center transition-all opacity-0 group-hover/slider:opacity-100 cursor-pointer active:scale-90"
                  aria-label="Next Slide"
                >
                  <ChevronRight size={20} />
                </button>

                {/* Manual slide indicators / dots */}
                <div className="absolute bottom-2.5 sm:bottom-4 left-1/2 -translate-x-1/2 z-20 flex items-center gap-1.5 bg-black/50 backdrop-blur px-2.5 py-1.5 sm:px-3 sm:py-2 rounded-full border border-white/10">
                  {latestMovies.map((_, dotIdx) => {
                    const isDotActive = dotIdx === currentSlideIndex;
                    return (
                      <button
                        key={`dot-${dotIdx}`}
                        onClick={() => handleSlideInteraction(dotIdx)}
                        className={`w-2.5 h-2.5 rounded-full transition-all duration-300 cursor-pointer ${
                          isDotActive 
                            ? "bg-red-500 w-6 shadow-[0_0_10px_#ef4444]" 
                            : "bg-gray-500 hover:bg-gray-300"
                        }`}
                        aria-label={`Go to slide ${dotIdx + 1}`}
                      />
                    );
                  })}
                </div>

              </div>
            )}

            {/* Watch Continuity row */}
            {!searchQuery.trim() && (
              <div className="mt-8 animate-fade-in">
                <ContinueWatching onResumeMovie={handleResumeMovie} />
              </div>
            )}

            {/* Primary Movie Catalog Shelf */}
            <div id="movie-catalog-shelf" className={`space-y-6 scroll-mt-24 ${searchQuery.trim() ? "pt-0 mt-0" : "pt-4"}`}>
              
              {/* Dynamic Filters Tool rail */}
              {!searchQuery.trim() && (
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-white/5 animate-fade-in">
                  
                  {/* Visual Section Indicator */}
                  <div className="flex items-center gap-2.5">
                    <div className="w-1.5 h-6 bg-red-600 rounded-full" />
                    <h2 className="font-display font-black text-xl sm:text-2xl text-white uppercase tracking-wider">
                      {homeSubTab === "movies" ? "Feature Movies" : homeSubTab === "series" ? "Feature Series" : "Feature Releases"}
                    </h2>
                  </div>

                  {/* Filter / Sort Actions controls */}
                  <div className="flex flex-wrap items-center gap-2.5">
                    
                    {/* Custom Styled Inline Sort Dropdown */}
                    <div className="relative inline-block text-left select-none" ref={sortDropdownRef}>
                      <button
                        onClick={() => setIsSortDropdownOpen(!isSortDropdownOpen)}
                        className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/4 border border-white/5 hover:border-[#ff2d55]/40 hover:bg-[#ff2d55]/5 transition-all text-gray-300 hover:text-white cursor-pointer active:scale-95 shadow-inner group relative"
                        title="Change listing sort option"
                      >
                        <ListOrdered size={14} className="text-[#ff2d55] group-hover:rotate-12 transition-transform duration-300" />
                        <span className="text-[11px] font-mono font-bold text-gray-400 uppercase">Sort:</span>
                        <span className="text-xs font-semibold text-white">
                          {sortBy === "date_newest" && "Latest Added"}
                          {sortBy === "date_oldest" && "Oldest Added"}
                          {sortBy === "name_asc" && "A-Z"}
                          {sortBy === "name_desc" && "Z-A"}
                        </span>
                        <ChevronDown size={12} className={`text-stone-400 transition-transform duration-300 ${isSortDropdownOpen ? "rotate-180 text-rose-500" : ""}`} />
                      </button>

                      {/* Dropdown Menu */}
                      <AnimatePresence>
                        {isSortDropdownOpen && (
                          <motion.div
                            initial={{ opacity: 0, y: 10, scale: 0.95 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: 10, scale: 0.95 }}
                            transition={{ duration: 0.2 }}
                            className="absolute right-0 mt-2 w-48 rounded-2xl border border-[#ff2d55]/30 bg-[#07070cdf]/90 backdrop-blur-xl shadow-[0_10px_35px_rgba(255,45,85,0.25)] p-2.5 z-50 overflow-hidden space-y-1 select-none"
                          >
                            {[
                              { value: "date_newest", label: "Latest Added" },
                              { value: "date_oldest", label: "Oldest Added" },
                              { value: "name_asc", label: "A-Z" },
                              { value: "name_desc", label: "Z-A" },
                            ].map((opt) => {
                              const isSelected = sortBy === opt.value;
                              return (
                                <button
                                  key={opt.value}
                                  onClick={() => {
                                    setSortBy(opt.value);
                                    setIsSortDropdownOpen(false);
                                  }}
                                  className={`w-full py-2.5 px-3 rounded-xl flex items-center justify-between transition-all duration-200 text-left text-xs font-semibold select-none cursor-pointer group/item ${
                                    isSelected
                                      ? "bg-[#ff2d55]/15 border border-[#ff2d55]/35 text-rose-400 shadow-[inset_0_1px_8px_rgba(255,45,85,0.1)] font-bold mb-0.5"
                                      : "text-gray-400 hover:bg-[#ff2d55]/5 border border-transparent hover:border-[#ff2d55]/10 hover:text-white mb-0.5"
                                  }`}
                                >
                                  <span>{opt.label}</span>
                                  {isSelected && (
                                    <div className="w-1.5 h-1.5 rounded-full bg-[#ff2d55] shadow-[0_0_8px_rgba(255,45,85,1)]" />
                                  )}
                                </button>
                              );
                            })}
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>

                    {/* Reset Filters button visible only if actively filtering */}
                    {selectedGenre !== "All Genres" && (
                      <button
                        onClick={resetFilters}
                        className="px-3.5 py-2 rounded-xl bg-red-600/10 text-red-400 hover:bg-red-600/20 text-xs font-semibold border border-red-500/20 transition-colors cursor-pointer"
                      >
                        Reset Filters
                      </button>
                    )}

                  </div>

                </div>
              )}

              {/* Genre Pills Row (Aesthetic category chips) */}
              {!searchQuery.trim() && (
                <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none animate-fade-in">
                  <div className="flex items-center gap-1.5 shrink-0 pr-4 border-r border-[#ff2d55]/10">
                    <Filter size={11} className="text-gray-500" />
                    <span className="text-[10px] font-mono font-bold text-gray-500 uppercase tracking-widest">GENRES:</span>
                  </div>

                  <div className="flex items-center gap-1.5">
                    {genreOptions.map((genre) => (
                      <button
                        key={genre}
                        onClick={() => setSelectedGenre(genre)}
                        className={`px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all duration-300 cursor-pointer ${
                          selectedGenre === genre
                            ? "bg-gradient-to-r from-red-600 to-amber-500 text-white shadow-lg shadow-red-950/20"
                            : "bg-white/4 hover:bg-white/10 text-gray-400 hover:text-white"
                        }`}
                      >
                        {genre}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Movies Grid */}
              {paginatedMovies.length > 0 ? (
                <div className="space-y-8">
                  <div className="grid grid-cols-[repeat(auto-fill,minmax(140px,1fr))] sm:grid-cols-[repeat(auto-fill,minmax(180px,1fr))] gap-3 sm:gap-6">
                    {paginatedMovies.map((movie, movieIdx) => (
                      movie.type === "series" ? (
                        <SeriesCard
                          key={`${movie.title}-${movieIdx}`}
                          series={movie as unknown as Series}
                          onOpenEpisodes={(s) => setSelectedSeries(s)}
                          isFavorite={watchlist.includes(movie.title)}
                          onToggleFavorite={(s) => handleToggleWatchlist(s as unknown as Movie)}
                          onPlayTrailer={setActiveTrailerMovie}
                        />
                      ) : (
                        <MovieCard
                          key={`${movie.title}-${movieIdx}`}
                          movie={movie as Movie}
                          onWatch={handlePlayMedia}
                          onDownload={setActiveDownloadMovie}
                          isFavorite={watchlist.includes(movie.title)}
                          onToggleFavorite={handleToggleWatchlist}
                          onPlayTrailer={setActiveTrailerMovie}
                        />
                      )
                    ))}
                  </div>

                  {/* Dynamic Glassmorphism Pagination controls */}
                  {totalPagesCount > 1 && (
                    <div className="flex items-center justify-center gap-4 pt-8 border-t border-white/5 bg-black/20 p-4 rounded-3xl backdrop-blur-md">
                      <div className="flex flex-wrap items-center gap-1.5 justify-center">
                        {/* FIRST BUTTON - Shown only when page > 1 */}
                        {safeCurrentPage > 1 && (
                          <button
                            onClick={() => {
                              setCurrentPage(1);
                              scrollToCatalog();
                            }}
                            className="px-3 py-2 rounded-xl text-xs font-semibold bg-white/5 hover:bg-white/10 active:scale-95 text-white border border-white/5 transition-all cursor-pointer select-none"
                          >
                            First
                          </button>
                        )}

                        {/* PREV BUTTON - Shown only when page > 1 */}
                        {safeCurrentPage > 1 && (
                          <button
                            onClick={() => {
                              setCurrentPage(prev => Math.max(1, prev - 1));
                              scrollToCatalog();
                            }}
                            className="px-3 py-2 rounded-xl text-xs font-semibold bg-white/5 hover:bg-white/10 active:scale-95 text-white border border-white/5 transition-all cursor-pointer select-none"
                          >
                            Prev
                          </button>
                        )}

                        {/* Sliding Page Numbers navigation */}
                        <div className="flex items-center gap-1.5">
                          {paginationPages.map((pg) => {
                            const isActive = pg === safeCurrentPage;
                            return (
                              <button
                                key={pg}
                                onClick={() => {
                                  setCurrentPage(pg);
                                  scrollToCatalog();
                                }}
                                className={`min-w-[36px] h-9 px-2 rounded-xl text-xs font-mono font-bold flex items-center justify-center transition-all cursor-pointer select-none active:scale-95 ${
                                  isActive
                                    ? "bg-gradient-to-r from-red-600 to-amber-500 text-white shadow-lg shadow-red-950/20 scale-105 border border-red-500/20 font-black"
                                    : "bg-white/5 hover:bg-white/10 text-gray-300 border border-white/5"
                                }`}
                              >
                                {pg}
                              </button>
                            );
                          })}
                        </div>

                        {/* NEXT BUTTON - Shown only when page < totalPages */}
                        {safeCurrentPage < totalPagesCount && (
                          <button
                            onClick={() => {
                              setCurrentPage(prev => Math.min(totalPagesCount, prev + 1));
                              scrollToCatalog();
                            }}
                            className="px-3 py-2 rounded-xl text-xs font-semibold bg-white/5 hover:bg-white/10 active:scale-95 text-white border border-white/5 transition-all cursor-pointer select-none"
                          >
                            Next
                          </button>
                        )}

                        {/* LAST BUTTON - Shown only when page < totalPages */}
                        {safeCurrentPage < totalPagesCount && (
                          <button
                            onClick={() => {
                              setCurrentPage(totalPagesCount);
                              scrollToCatalog();
                            }}
                            className="px-3 py-2 rounded-xl text-xs font-semibold bg-white/5 hover:bg-white/10 active:scale-95 text-white border border-white/5 transition-all cursor-pointer select-none"
                          >
                            Last
                          </button>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                /* Beautiful empty state */
                <div className="text-center py-20 bg-black/40 rounded-3xl border border-white/5 space-y-4 max-w-2xl mx-auto px-6">
                  <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center text-red-400 mx-auto border border-white/10">
                    <Info size={28} />
                  </div>
                  <div className="space-y-1.5">
                    <h3 className="font-display font-black text-xl text-white">No Seeding Matches Found</h3>
                    <p className="text-xs sm:text-sm text-gray-400 leading-relaxed">
                      We couldn't locate any movies matching "{searchQuery}" under {selectedGenre}. Double check the spelling or send an upload query in our request arena!
                    </p>
                  </div>
                  <div className="pt-2 flex justify-center gap-3">
                    <button
                      onClick={resetFilters}
                      className="px-4 py-2.5 rounded-xl bg-white/5 text-gray-300 border border-white/5 hover:bg-white/10 font-medium text-xs transition-colors"
                    >
                      Clear Search Filters
                    </button>
                    <button
                      onClick={() => setActiveTab("requests")}
                      className="px-4 py-2.5 rounded-xl bg-red-650 text-white font-medium text-xs hover:bg-red-550 transition-colors"
                    >
                      Submit Upload request
                    </button>
                  </div>
                </div>
              )}

            </div>
          </>
        ) : activeTab === "watching" ? (
          /* Separate tab view exclusively for Watching list */
          <div className="space-y-6">
            <div className="p-6 rounded-3xl bg-black/40 border border-white/5">
              <h2 className="font-display font-black text-xl text-white uppercase tracking-wider flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-blue-500 shadow-[0_0_10px_rgba(59,130,246,0.5)]" />
                Your Session Stream History
              </h2>
              <p className="text-xs text-gray-400 mt-1 max-w-xl">
                Here are the films and series you began watching recently. The server caches timestamps to help you resume streams immediately across all smart device views.
              </p>
            </div>
            <ContinueWatching onResumeMovie={handleResumeMovie} />
          </div>
        ) : activeTab === "watchlist" ? (
          <div className="space-y-6">
            <div className="p-6 rounded-3xl bg-black/40 border border-white/5 flex flex-col md:flex-row md:items-center md:justify-between gap-4 animate-fade-in">
              <div>
                <h2 className="font-display font-black text-xl text-white uppercase tracking-wider flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.5)]" />
                  Watchlist ({watchlist.length} Movies)
                </h2>
                <p className="text-xs text-gray-400 mt-1 max-w-xl">
                  Your curated list of premium favorites. Saved on your local storage to resume stream collections instantly across setups.
                </p>
              </div>

              {/* Reset search/genre/sort if filter active */}
              {(searchQuery || selectedGenre !== "All Genres") && (
                <button
                  onClick={resetFilters}
                  className="px-3.5 py-2 rounded-xl bg-red-650/10 text-red-400 hover:bg-red-650/20 text-xs font-semibold border border-red-500/20 transition-colors cursor-pointer shrink-0"
                >
                  Reset Active Filters
                </button>
              )}
            </div>

            {watchlist.length === 0 ? (
              <div className="text-center py-20 bg-black/40 rounded-3xl border border-white/5 space-y-4 max-w-2xl mx-auto px-6 animate-fade-in">
                <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center text-red-500 mx-auto border border-white/10">
                  <Heart size={28} />
                </div>
                <div className="space-y-1.5">
                  <p className="text-sm sm:text-base text-gray-400 leading-relaxed">
                    No movies in your watchlist.
                  </p>
                </div>
                <div className="pt-2">
                  <button
                    onClick={() => setActiveTab("all")}
                    className="px-5 py-3 rounded-xl bg-gradient-to-r from-red-600 to-amber-500 hover:brightness-110 font-bold text-xs sm:text-sm text-white shadow-lg cursor-pointer transition-transform duration-200 active:scale-95"
                  >
                    Browse Main Catalog
                  </button>
                </div>
              </div>
            ) : (
              <div id="movie-catalog-shelf" className="space-y-6">
                
                {/* Filter / Sort Actions controls */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-white/5 animate-fade-in">
                  
                  <div className="flex items-center gap-2.5">
                    <div className="w-1.5 h-6 bg-red-600 rounded-full" />
                    <h3 className="font-display font-black text-lg text-white uppercase tracking-wider">
                      Saved Favorites
                    </h3>
                  </div>

                  <div className="flex flex-wrap items-center gap-2.5">
                    {/* Custom Styled Inline Sort Dropdown */}
                    <div className="relative inline-block text-left select-none" ref={sortDropdownRef}>
                      <button
                        onClick={() => setIsSortDropdownOpen(!isSortDropdownOpen)}
                        className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/4 border border-white/5 hover:border-[#ff2d55]/40 hover:bg-[#ff2d55]/5 transition-all text-gray-300 hover:text-white cursor-pointer active:scale-95 shadow-inner group relative"
                        title="Change listing sort option"
                      >
                        <ListOrdered size={14} className="text-[#ff2d55] group-hover:rotate-12 transition-transform duration-300" />
                        <span className="text-[11px] font-mono font-bold text-gray-400 uppercase">Sort:</span>
                        <span className="text-xs font-semibold text-white">
                          {sortBy === "date_newest" && "Latest Added"}
                          {sortBy === "date_oldest" && "Oldest Added"}
                          {sortBy === "name_asc" && "A-Z"}
                          {sortBy === "name_desc" && "Z-A"}
                        </span>
                        <ChevronDown size={12} className={`text-stone-400 transition-transform duration-300 ${isSortDropdownOpen ? "rotate-180 text-rose-500" : ""}`} />
                      </button>

                      {/* Dropdown Menu */}
                      <AnimatePresence>
                        {isSortDropdownOpen && (
                          <motion.div
                            initial={{ opacity: 0, y: 10, scale: 0.95 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: 10, scale: 0.95 }}
                            transition={{ duration: 0.2 }}
                            className="absolute right-0 mt-2 w-48 rounded-2xl border border-[#ff2d55]/30 bg-[#07070cdf]/90 backdrop-blur-xl shadow-[0_10px_35px_rgba(255,45,85,0.25)] p-2.5 z-55 overflow-hidden space-y-1 select-none"
                          >
                            {[
                              { value: "date_newest", label: "Latest Added" },
                              { value: "date_oldest", label: "Oldest Added" },
                              { value: "name_asc", label: "A-Z" },
                              { value: "name_desc", label: "Z-A" },
                            ].map((opt) => {
                              const isSelected = sortBy === opt.value;
                              return (
                                <button
                                  key={opt.value}
                                  onClick={() => {
                                    setSortBy(opt.value);
                                    setIsSortDropdownOpen(false);
                                  }}
                                  className={`w-full py-2.5 px-3 rounded-xl flex items-center justify-between transition-all duration-200 text-left text-xs font-semibold select-none cursor-pointer group/item ${
                                    isSelected
                                      ? "bg-[#ff2d55]/15 border border-[#ff2d55]/35 text-rose-400 shadow-[inset_0_1px_8px_rgba(255,45,85,0.1)] font-bold mb-0.5"
                                      : "text-gray-400 hover:bg-[#ff2d55]/5 border border-transparent hover:border-[#ff2d55]/10 hover:text-white mb-0.5"
                                  }`}
                                >
                                  <span>{opt.label}</span>
                                  {isSelected && (
                                    <div className="w-1.5 h-1.5 rounded-full bg-[#ff2d55] shadow-[0_0_8px_rgba(255,45,85,1)]" />
                                  )}
                                </button>
                              );
                            })}
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  </div>

                </div>

                {/* Genre Pills */}
                <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none animate-fade-in">
                  <div className="flex items-center gap-1.5 shrink-0 pr-4 border-r border-white/5">
                    <Filter size={11} className="text-gray-500" />
                    <span className="text-[10px] font-mono font-bold text-gray-500 uppercase tracking-widest">GENRES:</span>
                  </div>

                  <div className="flex items-center gap-1.5">
                    {genreOptions.map((genre) => (
                      <button
                        key={genre}
                        onClick={() => setSelectedGenre(genre)}
                        className={`px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all duration-300 ${
                          selectedGenre === genre
                            ? "bg-gradient-to-r from-red-600 to-amber-500 text-white shadow-lg"
                            : "bg-white/4 hover:bg-white/10 text-gray-400 hover:text-white"
                        }`}
                      >
                        {genre}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Grid */}
                {paginatedMovies.length > 0 ? (
                  <div className="space-y-8 animate-fade-in">
                    <div className="grid grid-cols-[repeat(auto-fill,minmax(140px,1fr))] sm:grid-cols-[repeat(auto-fill,minmax(180px,1fr))] gap-3 sm:gap-6">
                      {paginatedMovies.map((movie, movieIdx) => (
                        movie.type === "series" ? (
                          <SeriesCard
                            key={`${movie.title}-${movieIdx}`}
                            series={movie as unknown as Series}
                            onOpenEpisodes={(s) => setSelectedSeries(s)}
                            isFavorite={watchlist.includes(movie.title)}
                            onToggleFavorite={(s) => handleToggleWatchlist(s as unknown as Movie)}
                            onPlayTrailer={setActiveTrailerMovie}
                          />
                        ) : (
                          <MovieCard
                            key={`${movie.title}-${movieIdx}`}
                            movie={movie as Movie}
                            onWatch={handlePlayMedia}
                            onDownload={setActiveDownloadMovie}
                            isFavorite={watchlist.includes(movie.title)}
                            onToggleFavorite={handleToggleWatchlist}
                            onPlayTrailer={setActiveTrailerMovie}
                          />
                        )
                      ))}
                    </div>

                    {/* Pagination control */}
                    {totalPagesCount > 1 && (
                      <div className="flex items-center justify-center gap-4 pt-8 border-t border-white/5 bg-black/20 p-4 rounded-3xl backdrop-blur-md">
                        <div className="flex flex-wrap items-center gap-1.5 justify-center">
                          {safeCurrentPage > 1 && (
                            <button
                              onClick={() => {
                                setCurrentPage(1);
                                scrollToCatalog();
                              }}
                              className="px-3 py-2 rounded-xl text-xs font-semibold bg-white/5 hover:bg-white/10 text-white border border-white/5 transition-all cursor-pointer select-none"
                            >
                              First
                            </button>
                          )}

                          {safeCurrentPage > 1 && (
                            <button
                              onClick={() => {
                                setCurrentPage(prev => Math.max(1, prev - 1));
                                scrollToCatalog();
                              }}
                              className="px-3 py-2 rounded-xl text-xs font-semibold bg-white/5 hover:bg-white/10 text-white border border-white/5 transition-all cursor-pointer select-none"
                            >
                              Prev
                            </button>
                          )}

                          <div className="flex items-center gap-1.5">
                            {paginationPages.map((pg) => {
                              const isActive = pg === safeCurrentPage;
                              return (
                                <button
                                  key={pg}
                                  onClick={() => {
                                    setCurrentPage(pg);
                                    scrollToCatalog();
                                  }}
                                  className={`min-w-[36px] h-9 px-2 rounded-xl text-xs font-mono font-bold flex items-center justify-center transition-all cursor-pointer select-none active:scale-95 ${
                                    isActive
                                      ? "bg-gradient-to-r from-red-600 to-amber-500 text-white shadow-lg overflow-hidden border border-red-500/20 font-black"
                                      : "bg-white/5 hover:bg-white/10 text-gray-300 border border-white/5"
                                  }`}
                                >
                                  {pg}
                                </button>
                              );
                            })}
                          </div>

                          {safeCurrentPage < totalPagesCount && (
                            <button
                              onClick={() => {
                                setCurrentPage(prev => Math.min(totalPagesCount, prev + 1));
                                scrollToCatalog();
                              }}
                              className="px-3 py-2 rounded-xl text-xs font-semibold bg-white/5 hover:bg-white/10 text-white border border-white/5 transition-all cursor-pointer select-none"
                            >
                              Next
                            </button>
                          )}

                          {safeCurrentPage < totalPagesCount && (
                            <button
                              onClick={() => {
                                setCurrentPage(totalPagesCount);
                                scrollToCatalog();
                              }}
                              className="px-3 py-2 rounded-xl text-xs font-semibold bg-white/5 hover:bg-white/10 text-white border border-white/5 transition-all cursor-pointer select-none"
                            >
                              Last
                            </button>
                          )}
                        </div>
                      </div>
                    )}

                  </div>
                ) : (
                  <div className="text-center py-20 bg-black/40 rounded-3xl border border-white/5 space-y-4 max-w-2xl mx-auto px-6 animate-fade-in">
                    <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center text-red-400 mx-auto border border-white/10">
                      <Info size={28} />
                    </div>
                    <div className="space-y-1.5">
                      <h3 className="font-display font-black text-xl text-white">No Matching Saved Prints</h3>
                      <p className="text-xs sm:text-sm text-gray-400 leading-relaxed">
                        We couldn't locate any movies in your watchlist matching "{searchQuery}" under {selectedGenre}. Try adjusting your filter parameters above!
                      </p>
                    </div>
                    <div className="pt-2">
                      <button
                        onClick={resetFilters}
                        className="px-4 py-2.5 rounded-xl bg-white/5 text-gray-300 border border-white/5 hover:bg-white/10 font-medium text-xs transition-colors"
                      >
                        Reset Search Filters
                      </button>
                    </div>
                  </div>
                )}

              </div>
            )}

          </div>
        ) : (
          /* Separate tab view exclusively for request form section */
          <RequestSection 
            movies={movies}
            requests={requests}
            userId={userId}
            onAddRequest={handleAddRequest}
            onUpvoteRequest={handleRequestPlusOne}
            onAdminUploadMovie={handleAdminUploadMovie}
            onAdminAddMovie={handleAdminAddMovie}
            onAdminUpdateMovie={handleAdminUpdateMovie}
            onAdminDeleteMovie={handleAdminDeleteMovie}
            onFulfillRequestCMS={handleFulfillRequestCMS}
            setActivePlayerMovie={handlePlayMedia}
            series={series}
            onAdminAddSeries={handleAdminAddSeries}
            onAdminUpdateSeries={handleAdminUpdateSeries}
            onAdminDeleteSeries={handleAdminDeleteSeries}
            isAdminLoggedIn={isAdminLoggedIn}
            onAdminLoggedInChange={setIsAdminLoggedIn}
          />
        )}

      </main>

      {/* Universal Floating Cinematic Video player (Mounted dynamically when selected) */}
      {(activePlayerMovie || activeTrailerMovie) && (
        <MovieVideoPlayer 
          movie={activePlayerMovie || activeTrailerMovie}
          isTrailer={!!activeTrailerMovie}
          onClose={() => {
            setActivePlayerMovie(null);
            setActiveTrailerMovie(null);
          }}
        />
      )}

      {/* Premium Toast/Message for unavailable links */}
      <AnimatePresence>
        {premiumMessage && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: -50 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: -20 }}
            className="fixed top-24 left-1/2 -translate-x-1/2 z-[100] w-[90%] max-w-sm bg-[#0a0507]/95 border-2 border-[#ff2d55]/50 backdrop-blur-xl rounded-2xl p-4 shadow-[0_10px_30px_rgba(255,45,85,0.3)] flex items-center justify-between gap-3"
          >
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-full bg-[#ff2d55]/10 flex items-center justify-center border border-[#ff2d55]/30 shrink-0">
                <X size={16} className="text-[#ff2d55]" />
              </div>
              <p className="text-xs sm:text-sm font-semibold text-gray-200">
                {premiumMessage}
              </p>
            </div>
            <button
              onClick={() => setPremiumMessage(null)}
              className="text-stone-400 hover:text-white cursor-pointer transition-colors p-1"
            >
              <X size={16} />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Series Episodes Modal */}
      {selectedSeries && (
        <SeriesEpisodesModal
          series={selectedSeries}
          onClose={() => setSelectedSeries(null)}
          onPlayEpisode={handlePlayEpisode}
          onDownloadEpisode={handleDownloadEpisode}
        />
      )}

      {/* Movie Details Modal */}
      {activeDownloadMovie && (
        <MovieDetailsModal
          movie={activeDownloadMovie}
          onClose={() => setActiveDownloadMovie(null)}
          onWatch={handlePlayMedia}
          onDownloadMovie={(title, quality, url, image) => {
            setDownloadPendingInfo({ name: title, quality, url, image: image || activeDownloadMovie.image });
          }}
        />
      )}

      {/* Download Confirmation Popup */}
      <AnimatePresence>
        {downloadPendingInfo && (
          <div className="fixed inset-0 z-55 flex items-center justify-center p-4">
            {/* Cinematic dark glass backdrop blur layer */}
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setDownloadPendingInfo(null)}
              className="absolute inset-0 bg-[#020204]/90 backdrop-blur-md"
            />

            {/* Premium Container */}
            <motion.div
              initial={{ scale: 0.95, y: 15, opacity: 0 }}
              animate={{ scale: 1, y: 0, opacity: 1 }}
              exit={{ scale: 0.95, y: 15, opacity: 0 }}
              transition={{ type: "spring", stiffness: 350, damping: 25 }}
              className="w-full max-w-md bg-gradient-to-b from-[#110204] via-[#050508] to-[#0d0103] border border-[#ff2d55]/30 rounded-[28px] p-6 sm:p-8 shadow-[0_20px_50px_rgba(255,45,85,0.25)] relative z-55 overflow-hidden text-center space-y-6"
            >
              {/* Outer soft ambient glow */}
              <div className="absolute -inset-1 rounded-[28px] bg-gradient-to-tr from-[#ff2d55]/15 to-[#ff6b00]/10 blur-3xl pointer-events-none -z-10" />

              <div className="flex flex-col items-center gap-4">
                {/* Download Circle Icon with Pulse Effect */}
                <div className="relative w-16 h-16 rounded-full bg-[#ff2d55]/10 border border-[#ff2d55]/30 flex items-center justify-center text-[#ff2d55] shadow-[0_0_20px_rgba(255,45,85,0.2)]">
                  <Download size={28} className="animate-bounce" />
                  <div className="absolute -inset-1 rounded-full bg-[#ff2d55]/5 blur-md animate-pulse -z-10" />
                </div>
                
                <div className="space-y-2">
                  <h3 className="font-display font-black text-lg sm:text-xl text-white uppercase tracking-wider">
                    Confirm Download
                  </h3>
                  <p className="text-xs text-gray-400 font-sans px-2">
                    You are about to stream-route and prepare this media file for offline storage. Do you wish to proceed?
                  </p>
                </div>

                {/* Media Item Badge */}
                <div className="w-full py-3.5 px-4 rounded-xl bg-white/2 border border-white/5 shadow-inner">
                  <p className="text-[10px] font-mono font-bold text-gray-400 uppercase tracking-wider mb-1">
                    Ready to route ({downloadPendingInfo.quality}):
                  </p>
                  <p className="text-sm font-bold text-transparent bg-clip-text bg-gradient-to-r from-white to-stone-400 truncate">
                    {downloadPendingInfo.name}
                  </p>
                </div>
              </div>

              {/* Action controls */}
              <div className="grid grid-cols-2 gap-3 pt-2">
                <button
                  onClick={() => setDownloadPendingInfo(null)}
                  className="py-3 px-4 rounded-xl bg-white/5 border border-white/10 text-gray-300 hover:text-white hover:bg-white/10 active:scale-95 transition-all text-xs font-bold font-sans cursor-pointer tracking-wider uppercase select-none"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    if (downloadPendingInfo.url) {
                      window.open(downloadPendingInfo.url, "_blank");
                    }
                    setDownloadPendingInfo(null);
                  }}
                  className="py-3 px-4 rounded-xl bg-gradient-to-r from-red-600 to-amber-500 hover:brightness-110 active:scale-95 transition-all text-xs font-black font-sans text-white cursor-pointer shadow-[0_0_15px_rgba(239,68,68,0.35)] tracking-wider uppercase select-none"
                >
                  Download Now
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
 
      {/* Premium Glassmorphism Movie Now Available Popup Notification */}
      <AnimatePresence>
        {availNotification && (
          <motion.div
            initial={{ opacity: 0, y: 100, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 50, scale: 0.9 }}
            transition={{ type: "spring", stiffness: 350, damping: 25 }}
            className="fixed bottom-6 right-6 z-[60] w-full max-w-sm bg-gradient-to-br from-[#0f0305]/95 via-black/98 to-[#0b0102]/95 border-2 border-[#ff2d55]/40 rounded-[24px] p-5 shadow-[0_20px_50px_rgba(255,45,85,0.4)] overflow-hidden"
          >
            {/* Background luxury gradient glow */}
            <div className="absolute -inset-1.5 bg-gradient-to-tr from-[#ff2d55]/10 to-[#ff6b00]/10 blur-xl pointer-events-none -z-10" />

            <div className="flex items-start gap-4">
              {/* Thumbnail of new movie */}
              <div className="w-16 h-24 rounded-xl overflow-hidden border border-white/10 shrink-0 shadow-lg relative group">
                <img 
                  src={availNotification.image} 
                  alt={availNotification.title} 
                  className="w-full h-full object-cover"
                  referrerPolicy="no-referrer"
                />
                <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                  <Play size={16} className="text-white" />
                </div>
              </div>

              {/* Text content details */}
              <div className="flex-1 min-w-0 space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-mono font-black tracking-widest text-[#ff2d55] uppercase flex items-center gap-1.5 invite-glow">
                    <Sparkles size={11} className="text-amber-500 animate-spin" style={{ animationDuration: "3s" }} />
                    🎉 Movie Now Available
                  </span>
                  <button 
                    onClick={() => setAvailNotification(null)}
                    className="text-stone-400 hover:text-white transition-colors cursor-pointer"
                  >
                    <X size={14} />
                  </button>
                </div>
                <h5 className="font-sans font-black text-xs sm:text-sm text-white truncate drop-shadow-[0_0_8px_rgba(255,45,85,0.2)]">
                  {availNotification.title}
                </h5>
                <p className="text-[11px] text-stone-300 font-sans tracking-wide leading-relaxed">
                  Your requested movie has been added to MovieMachi.
                </p>
                
                <div className="pt-2 flex items-center gap-2">
                  <button
                    onClick={() => {
                      handlePlayMedia(availNotification);
                      setAvailNotification(null);
                    }}
                    className="flex-1 py-1.5 px-3 rounded-xl bg-gradient-to-r from-[#ff2d55] to-[#ff6b00] hover:scale-[1.03] active:scale-95 text-white font-sans font-bold text-[10px] sm:text-xs tracking-wider uppercase transition-all shadow-[0_0_15px_rgba(255,45,85,0.4)] flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <Play size={10} fill="currentColor" />
                    <span>Watch Now</span>
                  </button>
                  <button
                    onClick={() => setAvailNotification(null)}
                    className="py-1.5 px-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/5 hover:border-white/15 text-stone-300 font-sans font-black text-[10px] tracking-wider uppercase transition-all cursor-pointer"
                  >
                    Dismiss
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Modern copyright and site credits footer */}
      <footer className="mt-16 py-8 border-t border-white/5 relative z-10 select-none bg-[#07070c]">
        <div className="max-w-[2000px] mx-auto px-4 text-center space-y-3">
          <div className="flex items-center justify-center gap-2.5">
            <span className="text-xs font-display font-medium text-white">MovieMachi Engine.</span>
            <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
            <span className="text-xs text-gray-500">Premium Cinema Distribution Nodes</span>
          </div>
          <p className="text-[11px] text-gray-600 max-w-xl mx-auto leading-relaxed">
            All original movie indices, direct download streaming streams, rating metrics, metadata attributes, and preview frames remain perfectly preserved according to exact system protocols. Crafted with high contrast luxury glassmorphism grids.
          </p>
        </div>
      </footer>
    </div>
  );
}
