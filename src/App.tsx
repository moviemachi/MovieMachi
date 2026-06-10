import React, { useState, useEffect } from "react";
import { allMovies } from "./data/all_movies";
import { Movie, CommunityRequest, Series } from "./types";
import { 
  seedMoviesIfEmpty, 
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
  deleteSeriesFromFirestore
} from "./lib/firebase";
import { collection, onSnapshot } from "firebase/firestore";
import BackgroundAurora from "./components/BackgroundAurora";
import Header from "./components/Header";
import ContinueWatching from "./components/ContinueWatching";
import MovieCard from "./components/MovieCard";
import MovieVideoPlayer from "./components/MovieVideoPlayer";
import RequestSection from "./components/RequestSection";
import { 
  Play, Download, Star, Sparkles, Filter, ListOrdered, 
  Tv, Film, X, Laptop, ShieldCheck, CheckCircle2, Info, Compass,
  ChevronLeft, ChevronRight, Heart
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

export default function App() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedGenre, setSelectedGenre] = useState<string>("All Genres");
  const [sortBy, setSortBy] = useState<string>("date_newest");
  const [isSortModalOpen, setIsSortModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<string>("all"); // "all", "watching", "requests", "watchlist"

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

  const [series, setSeries] = useState<Series[]>([]);

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
  const [requests, setRequests] = useState<CommunityRequest[]>([]);

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
    // Seed first if empty
    seedMoviesIfEmpty().then(() => {
      // Fetch movies directly from Firestore to initialize state immediately
      fetchAllMoviesFromFirestore().then((initialMovies) => {
        if (initialMovies && initialMovies.length > 0) {
          setMovies(initialMovies);
        }
      });
      // Fetch requests from Firestore to initialize state immediately
      fetchAllRequestsFromFirestore().then((initialRequests) => {
        if (initialRequests && initialRequests.length > 0) {
          setRequests(initialRequests);
        }
      });
      // Fetch series from Firestore
      fetchAllSeriesFromFirestore().then((initialSeries) => {
        if (initialSeries && initialSeries.length > 0) {
          setSeries(initialSeries);
        }
      });
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
      if (list.length > 0) {
        setMovies(list);
      }
    }, (error) => {
      console.error("Movies onSnapshot error:", error);
    });

    // 2. Set up active real-time subscription for requests collection
    const unsubRequests = onSnapshot(collection(db, "requests"), (snapshot) => {
      const list: CommunityRequest[] = [];
      snapshot.forEach((document) => {
        list.push(document.data() as CommunityRequest);
      });
      // Sort highest request count first, then by creation date
      list.sort((a, b) => {
        if (b.requestCount !== a.requestCount) {
          return b.requestCount - a.requestCount;
        }
        return b.createdAt - a.createdAt;
      });
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

    return () => {
      unsubMovies();
      unsubRequests();
      unsubSeries();
    };
  }, []);

  // Automated detection of movie availability & notification trigger for requesting users
  useEffect(() => {
    try {
      const dismissedRaw = localStorage.getItem("moviemachi_dismissed_notifications");
      const dismissed: string[] = dismissedRaw ? JSON.parse(dismissedRaw) : [];
      
      const uploadedRequests = requests.filter(r => r.status === "Uploaded");
      for (const r of uploadedRequests) {
        if (r.requesters.includes(userId)) {
          if (!dismissed.includes(r.id)) {
            const matchedMovie = movies.find(
              m => m.movieName.toLowerCase() === r.movieName.toLowerCase() ||
                   m.title.toLowerCase().includes(r.movieName.toLowerCase())
            );
            if (matchedMovie) {
              setAvailNotification(matchedMovie);
              const updatedDismissed = [...dismissed, r.id];
              localStorage.setItem("moviemachi_dismissed_notifications", JSON.stringify(updatedDismissed));
              break;
            }
          }
        }
      }
    } catch (e) {
      console.error("Error checking movie notifications:", e);
    }
  }, [userId, requests, movies]);

  // Handle request ticket creation/upvoting
  const handleAddRequest = (movieInput: string, yearInput: string, languageInput: string, genreInput: string, qualityInput: string, commentsInput: string): { success: boolean; error?: string; action?: "created" | "upvoted"; movieName?: string } => {
    const formattedMovieName = movieInput.trim();
    const formattedYear = yearInput.trim() || new Date().getFullYear().toString();
    const movieLookupTitle = `${formattedMovieName} (${formattedYear})`;

    // check if it exists in movie catalog
    const movieExists = movies.some(
      m => m.movieName.toLowerCase() === formattedMovieName.toLowerCase() ||
           m.title.toLowerCase() === movieLookupTitle.toLowerCase()
    );

    if (movieExists) {
      return { success: false, error: "duplicate_exists" };
    }

    // check duplicate in request ledger
    const existingReqIdx = requests.findIndex(
      r => r.movieName.toLowerCase() === formattedMovieName.toLowerCase() &&
           r.year === formattedYear
    );

    // Call Firestore directly
    submitRequestToFirestore(movieInput, yearInput, languageInput, genreInput, qualityInput, commentsInput, userId, movies)
      .catch(err => console.error("Error submitting request to Firestore:", err));

    if (existingReqIdx > -1) {
      const existingReq = { ...requests[existingReqIdx] };
      if (existingReq.requesters.includes(userId)) {
        return { success: false, error: "already_voted" };
      }
      return { success: true, action: "upvoted" as const, movieName: formattedMovieName };
    } else {
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
      updatedRequests.sort((a, b) => b.requestCount - a.requestCount);
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
      links: movieWatch ? [
        { label: "Direct Play HLS 1080p", url: movieWatch, className: "p1080" },
        { label: "Ultra High Bitrate 4K Stream", url: movieWatch, className: "K4" }
      ] : [],
      watchUrl: movieWatch || undefined,
      trailerUrl: movieTrailer || undefined
    };

    try {
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
          setActivePlayerMovie(movieRef);
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
          setActivePlayerMovie(matchedMovie);
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
          setActivePlayerMovie(matchedMovie);
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
  }, []);

  // Players and Modals
  const [activePlayerMovie, setActivePlayerMovie] = useState<Movie | null>(null);
  const [activeDownloadMovie, setActiveDownloadMovie] = useState<Movie | null>(null);
  const [activeTrailerMovie, setActiveTrailerMovie] = useState<Movie | null>(null);

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
  const [tvKeyboardActive, setTvKeyboardActive] = useState(false);

  // Movie pagination state
  const [currentPage, setCurrentPage] = useState(1);

  // Reset page when search, genre, sorting, or tab changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, selectedGenre, sortBy, activeTab]);

  // Auto Scroll to catalog
  const scrollToCatalog = () => {
    const catalogEl = document.getElementById("movie-catalog-shelf");
    if (catalogEl) {
      catalogEl.scrollIntoView({ behavior: "smooth" });
    }
  };

  // Extract list of all unique genres in data catalog to auto-generate filter capsules
  const [genreOptions, setGenreOptions] = useState<string[]>([]);
  useEffect(() => {
    const genresSet = new Set<string>();
    movies.forEach(m => {
      if (m.genres) {
        m.genres.forEach(g => genresSet.add(g));
      }
    });
    setGenreOptions(["All Genres", ...Array.from(genresSet)]);
  }, [movies]);

  // Filter & Search logic
  const filteredMovies = movies.filter(movie => {
    // If activeTab is watchlist, filter by watchlist first
    if (activeTab === "watchlist" && !watchlist.includes(movie.title)) {
      return false;
    }

    // Search input match
    const stringToSearch = `${movie.title} ${movie.director || ""} ${movie.starring || ""} ${(movie.genres || []).join(" ")}`.toLowerCase();
    const queryMatch = stringToSearch.includes(searchQuery.toLowerCase());

    // Genre badge match
    const genreMatch = selectedGenre === "All Genres" || (movie.genres && movie.genres.includes(selectedGenre));

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
      
      if (activePlayerMovie || isInputActive) {
        return;
      }

      const totalMs = sortedMovies.length;
      const totalPgs = Math.ceil(totalMs / 20) || 1;

      if (e.key === "PageDown" || e.key === "]" || (tvKeyboardActive && e.key === "ArrowRight")) {
        e.preventDefault();
        setCurrentPage(prev => Math.min(totalPgs, prev + 1));
        scrollToCatalog();
      } else if (e.key === "PageUp" || e.key === "[" || (tvKeyboardActive && e.key === "ArrowLeft")) {
        e.preventDefault();
        setCurrentPage(prev => Math.max(1, prev - 1));
        scrollToCatalog();
      }
    };

    window.addEventListener("keydown", handleGlobalKeyDown);
    return () => {
      window.removeEventListener("keydown", handleGlobalKeyDown);
    };
  }, [sortedMovies, activePlayerMovie, tvKeyboardActive]);

  // Custom function to trigger resume playback from Continued Watching
  const handleResumeMovie = (movieTitle: string) => {
    const matchedMovie = movies.find(m => m.title === movieTitle);
    if (matchedMovie) {
      setActivePlayerMovie(matchedMovie);
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

  const latestMovies = [...movies]
    .sort((a, b) => parseDateForSlider(b.lastUpdated) - parseDateForSlider(a.lastUpdated))
    .slice(0, 5);

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

  return (
    <div className="relative min-h-screen text-gray-200 font-sans pb-16 selection:bg-red-650 selection:text-white">
      {/* Immersive motion dust space background wrapper */}
      <BackgroundAurora />

      {/* Sticky Premium Navigation Hub */}
      <Header 
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        totalCount={movies.length}
        theme={theme}
        onThemeToggle={toggleTheme}
      />

      {/* Smart TV Overlay banner */}
      <div className="bg-gradient-to-r from-red-600/10 via-amber-500/5 to-transparent border-y border-red-500/15 py-2.5 px-4 sm:px-6 text-center select-none">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2.5">
          <div className="flex items-center gap-2">
            <Tv size={16} className="text-red-500 animate-pulse" />
            <span className="text-[11px] sm:text-xs font-mono font-bold uppercase tracking-wider text-white">
              Sovereign TV Support Active
            </span>
            <span className="text-[10px] bg-red-950 text-red-400 border border-red-900/30 px-1.5 py-0.5 rounded-full font-mono uppercase font-bold hidden sm:inline">
              Google TV • Fire TV
            </span>
          </div>

          <div className="flex items-center gap-3">
            <span className="text-[10px] sm:text-xs text-gray-400">
              Responsive key listeners mapped to standard remote parameters.
            </span>
            <button 
              onClick={() => setTvKeyboardActive(!tvKeyboardActive)}
              className={`text-[9px] sm:text-[10px] uppercase font-bold font-mono px-2 py-1 rounded transition-colors ${
                tvKeyboardActive 
                  ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/40" 
                  : "bg-white/5 text-gray-400 hover:text-white"
              }`}
            >
              {tvKeyboardActive ? "Remote Connected" : "Keyboard Remote Map"}
            </button>
          </div>
        </div>
      </div>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8 mt-6 space-y-12">
        
        {/* Dynamic routing layouts depending on which activeTab tab is toggled */}
        {activeTab === "all" ? (
          <>
            {/* Interactive curated Spotlight slider block (Hides if filter is active for pristine layout) */}
            {/* Interactive curated Spotlight slider block (Hides if filter is active for pristine layout) */}
            {!searchQuery && selectedGenre === "All Genres" && latestMovies.length > 0 && (
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
                  const hasWatchUrl = slide.watchUrl && slide.watchUrl.trim() !== "";
                  
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
                          {hasWatchUrl && (
                            <button 
                              onClick={() => {
                                handleSlideInteraction();
                                setActivePlayerMovie(slide);
                              }}
                              className="h-11 px-4 sm:px-6 sm:h-auto sm:py-3.5 rounded-xl md:rounded-2xl bg-red-650 hover:bg-red-550 border border-red-500/20 text-white font-display font-bold text-[9px] xs:text-[11px] sm:text-sm flex items-center justify-center gap-1 sm:gap-2 transition-all cursor-pointer shadow-[0_0_20px_rgba(239,68,68,0.35)]"
                            >
                              <Play size={11} fill="currentColor" className="xs:w-3.5 xs:h-3.5 sm:w-4 sm:h-4" />
                              <span>Watch Online</span>
                            </button>
                          )}

                          <button 
                            onClick={() => {
                              handleSlideInteraction();
                              setActiveDownloadMovie(slide);
                            }}
                            className={`h-11 px-4 sm:px-6 sm:h-auto sm:py-3.5 rounded-xl md:rounded-2xl bg-white/5 hover:bg-white/10 text-gray-200 font-display font-bold text-[9px] xs:text-[11px] sm:text-sm border border-white/10 flex items-center justify-center gap-1 sm:gap-2 transition-all cursor-pointer ${
                              !hasWatchUrl ? "shadow-[0_0_20px_rgba(239,68,68,0.25)] bg-red-650 hover:bg-red-550 border border-red-500/20 text-white" : ""
                            }`}
                          >
                            <Download size={11} className="xs:w-3.5 xs:h-3.5 sm:w-4 sm:h-4" />
                            <span>Downloads</span>
                          </button>

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
            <div className="mt-8">
              <ContinueWatching onResumeMovie={handleResumeMovie} />
            </div>

            {/* Primary Movie Catalog Shelf */}
            <div id="movie-catalog-shelf" className="space-y-6 pt-4 scroll-mt-24">
              
              {/* Dynamic Filters Tool rail */}
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-white/5">
                
                {/* Visual Section Indicator */}
                <div className="flex items-center gap-2.5">
                  <div className="w-1.5 h-6 bg-red-600 rounded-full" />
                  <h2 className="font-display font-black text-xl sm:text-2xl text-white uppercase tracking-wider">
                    Feature Releases
                  </h2>
                  <span className="text-xs text-gray-500 font-mono font-bold bg-white/5 px-2.5 py-1 rounded border border-white/5 uppercase">
                    Total: {sortedMovies.length} Prints
                  </span>
                </div>

                {/* Filter / Sort Actions controls */}
                <div className="flex flex-wrap items-center gap-2.5">
                  
                  {/* Sorting select node selector replaced with premium custom modal trigger */}
                  <button
                    onClick={() => setIsSortModalOpen(true)}
                    className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/4 border border-white/5 hover:border-[#ff2d55]/40 hover:bg-[#ff2d55]/5 transition-all text-gray-300 hover:text-white cursor-pointer active:scale-95 shadow-inner group"
                    title="Change listing sort option"
                  >
                    <ListOrdered size={14} className="text-[#ff2d55] group-hover:animate-pulse" />
                    <span className="text-[11px] font-mono font-bold text-gray-400 uppercase">Sort:</span>
                    <span className="text-xs font-semibold text-white">
                      {sortBy === "date_newest" && "Newest First"}
                      {sortBy === "date_oldest" && "Oldest First"}
                      {sortBy === "rating_highest" && "Highest Rating"}
                      {sortBy === "rating_lowest" && "Lowest Rating"}
                      {sortBy === "name_asc" && "A → Z"}
                      {sortBy === "name_desc" && "Z → A"}
                    </span>
                  </button>

                  {/* Reset Filters button visible only if actively searching */}
                  {(searchQuery || selectedGenre !== "All Genres") && (
                    <button
                      onClick={resetFilters}
                      className="px-3.5 py-2 rounded-xl bg-red-600/10 text-red-400 hover:bg-red-600/20 text-xs font-semibold border border-red-500/20 transition-colors cursor-pointer"
                    >
                      Reset Filters
                    </button>
                  )}

                </div>

              </div>

              {/* Genre Pills Row (Aesthetic category chips) */}
              <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
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
                          ? "bg-gradient-to-r from-red-600 to-amber-500 text-white shadow-lg shadow-red-950/20"
                          : "bg-white/4 hover:bg-white/10 text-gray-400 hover:text-white"
                      }`}
                    >
                      {genre}
                    </button>
                  ))}
                </div>
              </div>

              {/* Movies Grid */}
              {paginatedMovies.length > 0 ? (
                <div className="space-y-8">
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-6">
                    {paginatedMovies.map((movie, movieIdx) => (
                      <MovieCard
                        key={`${movie.title}-${movieIdx}`}
                        movie={movie}
                        onWatch={setActivePlayerMovie}
                        onDownload={setActiveDownloadMovie}
                        isFavorite={watchlist.includes(movie.title)}
                        onToggleFavorite={handleToggleWatchlist}
                        onPlayTrailer={setActiveTrailerMovie}
                      />
                    ))}
                  </div>

                  {/* Dynamic Glassmorphism Pagination controls */}
                  {totalPagesCount > 1 && (
                    <div className="flex flex-col lg:flex-row items-center justify-between gap-4 pt-8 border-t border-white/5 bg-black/20 p-4 rounded-3xl backdrop-blur-md">
                      <span className="text-xs text-gray-400 font-mono flex flex-wrap items-center gap-2 justify-center lg:justify-start">
                        <span className="bg-red-950/40 text-red-500 border border-red-500/20 px-2.5 py-1 rounded-lg text-[11px] font-bold shrink-0">
                          Page {safeCurrentPage} of {totalPagesCount}
                        </span>
                        <span className="shrink-0 text-center lg:text-left">
                          Showing <span className="text-white font-medium">{(safeCurrentPage - 1) * ITEMS_PER_PAGE + 1}</span> to{" "}
                          <span className="text-white font-medium">{Math.min(totalMoviesCount, safeCurrentPage * ITEMS_PER_PAGE)}</span> of{" "}
                          <span className="text-white font-medium">{totalMoviesCount}</span> movies
                        </span>
                      </span>

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
                    <span className="text-xs text-gray-500 font-mono font-bold bg-white/5 px-2.5 py-1 rounded border border-white/5 uppercase">
                      Total: {sortedMovies.length} Prints
                    </span>
                  </div>

                  <div className="flex flex-wrap items-center gap-2.5">
                    {/* Sorting select node selector replaced with premium custom modal trigger */}
                    <button
                      onClick={() => setIsSortModalOpen(true)}
                      className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/4 border border-white/5 hover:border-[#ff2d55]/40 hover:bg-[#ff2d55]/5 transition-all text-gray-300 hover:text-white cursor-pointer active:scale-95 shadow-inner group"
                      title="Change listing sort option"
                    >
                      <ListOrdered size={14} className="text-[#ff2d55] group-hover:animate-pulse" />
                      <span className="text-[11px] font-mono font-bold text-gray-400 uppercase">Sort:</span>
                      <span className="text-xs font-semibold text-white">
                        {sortBy === "date_newest" && "Newest First"}
                        {sortBy === "date_oldest" && "Oldest First"}
                        {sortBy === "rating_highest" && "Highest Rating"}
                        {sortBy === "rating_lowest" && "Lowest Rating"}
                        {sortBy === "name_asc" && "A → Z"}
                        {sortBy === "name_desc" && "Z → A"}
                      </span>
                    </button>
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
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-6">
                      {paginatedMovies.map((movie, movieIdx) => (
                        <MovieCard
                          key={`${movie.title}-${movieIdx}`}
                          movie={movie}
                          onWatch={setActivePlayerMovie}
                          onDownload={setActiveDownloadMovie}
                          isFavorite={watchlist.includes(movie.title)}
                          onToggleFavorite={handleToggleWatchlist}
                          onPlayTrailer={setActiveTrailerMovie}
                        />
                      ))}
                    </div>

                    {/* Pagination control */}
                    {totalPagesCount > 1 && (
                      <div className="flex flex-col lg:flex-row items-center justify-between gap-4 pt-8 border-t border-white/5 bg-black/20 p-4 rounded-3xl backdrop-blur-md">
                        <span className="text-xs text-gray-400 font-mono flex flex-wrap items-center gap-2 justify-center lg:justify-start">
                          <span className="bg-red-950/40 text-red-500 border border-red-500/20 px-2.5 py-1 rounded-lg text-[11px] font-bold shrink-0">
                            Page {safeCurrentPage} of {totalPagesCount}
                          </span>
                          <span className="shrink-0 text-center lg:text-left">
                            Showing <span className="text-white font-medium">{(safeCurrentPage - 1) * ITEMS_PER_PAGE + 1}</span> to{" "}
                            <span className="text-white font-medium">{Math.min(totalMoviesCount, safeCurrentPage * ITEMS_PER_PAGE)}</span> of{" "}
                            <span className="text-white font-medium">{totalMoviesCount}</span> movies
                          </span>
                        </span>

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
            setActivePlayerMovie={setActivePlayerMovie}
            series={series}
            onAdminAddSeries={handleAdminAddSeries}
            onAdminUpdateSeries={handleAdminUpdateSeries}
            onAdminDeleteSeries={handleAdminDeleteSeries}
          />
        )}

      </main>

      {/* Floating simulated Remote controls info bar (Fades in if connected) */}
      {tvKeyboardActive && (
        <div className="fixed bottom-4 left-4 right-4 xs:left-auto xs:right-4 z-40 p-4 rounded-2xl glass-panel max-w-md xs:max-w-sm border border-emerald-500/30 shadow-[0_0_20px_rgba(16,185,129,0.15)] space-y-3">
          <div className="flex items-center justify-between">
            <h5 className="text-xs font-bold font-mono text-emerald-400 uppercase tracking-wider flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />
              Keyboard Remote Map
            </h5>
            <button 
              onClick={() => setTvKeyboardActive(false)}
              className="text-gray-500 hover:text-white"
            >
              <X size={12} />
            </button>
          </div>
          
          <div className="grid grid-cols-2 gap-2 text-[10px] font-mono text-gray-400">
            <div className="p-1 rounded bg-black/40 border border-white/5">
              <strong className="text-white">SPACE:</strong> Play/Pause
            </div>
            <div className="p-1 rounded bg-black/40 border border-white/5">
              <strong className="text-white">LEFT:</strong> Rewind -30s
            </div>
            <div className="p-1 rounded bg-black/40 border border-white/5">
              <strong className="text-white">RIGHT:</strong> Fast -30s
            </div>
            <div className="p-1 rounded bg-black/40 border border-white/5">
              <strong className="text-white">Esc/X:</strong> Close player
            </div>
          </div>
        </div>
      )}

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

      {/* Custom High-Fidelity Downloads Ticket Modal Overlay */}
      {activeDownloadMovie && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md">
          <div className="relative w-full max-w-md rounded-3xl glass-panel box-glow-red p-4 xs:p-6 space-y-4 xs:space-y-5 max-h-[92vh] overflow-y-auto scrollbar-none flex flex-col">
            
            {/* Modal header */}
            <div className="flex items-start justify-between">
              <div>
                <span className="text-[10px] font-mono font-bold text-red-400 uppercase tracking-widest bg-red-950/40 px-2.5 py-0.5 rounded border border-red-900/30">
                  Multiple Seeding Mirrors
                </span>
                <h3 className="font-display font-black text-lg text-white mt-1.5 tracking-tight line-clamp-1 pr-6 uppercase">
                  {activeDownloadMovie.movieName}
                </h3>
              </div>
              <button 
                onClick={() => setActiveDownloadMovie(null)}
                className="p-1.5 rounded-lg bg-white/5 hover:bg-red-650/40 hover:text-white text-gray-400 transition-colors"
              >
                <X size={16} />
              </button>
            </div>

            {/* Mirror instructions info */}
            <div className="p-3 rounded-2xl bg-white/3 border border-white/5 flex items-start gap-2.5">
              <Info size={16} className="text-blue-400 shrink-0 mt-0.5" />
              <p className="text-[11px] text-gray-400 leading-relaxed">
                Direct torrent and file hosting mirrors are listed strictly with their original names and formats preserved. Select a resolution link to launch local download queues.
              </p>
            </div>

            {/* List Links wrapper */}
            <div className="space-y-3">
              <span className="text-[10px] font-mono font-bold text-gray-500 uppercase tracking-widest block">Available Quality Anchors:</span>
              
              <div className="space-y-2.5 max-h-[220px] overflow-y-auto pr-1">
                {activeDownloadMovie.links && activeDownloadMovie.links.length > 0 ? (
                  activeDownloadMovie.links.map((link, idx) => {
                    // Match visual styles
                    const is4k = link.className === "K4" || link.label.toLowerCase().includes("4k");
                    const is1080 = link.className === "p1080" || link.label.toLocaleLowerCase().includes("1080p");
                    const is720 = link.className === "p720" || link.label.toLowerCase().includes("720p");

                    return (
                      <a
                        key={idx}
                        href={link.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={`w-full py-3.5 px-4 rounded-2xl border text-xs sm:text-sm font-semibold flex items-center justify-between transition-all hover:-translate-y-0.5 cursor-pointer ${
                          is4k
                            ? "bg-amber-500/10 hover:bg-amber-500/15 text-amber-300 border-amber-500/30 hover:shadow-[0_0_15px_rgba(245,158,11,0.2)]"
                            : is1080
                            ? "bg-red-600/10 hover:bg-red-600/15 text-red-400 border-red-500/30 hover:shadow-[0_0_15px_rgba(239,68,68,0.2)]"
                            : is720
                            ? "bg-blue-600/10 hover:bg-blue-600/15 text-blue-400 border-blue-500/30"
                            : "bg-white/4 hover:bg-white/8 text-gray-200 border-white/5"
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <Download size={15} />
                          <span>{link.label}</span>
                        </div>
                        <span className="text-[10px] font-mono uppercase bg-black/40 px-2 py-0.5 rounded text-gray-400 border border-white/5 select-none">
                          {link.className || "Link"}
                        </span>
                      </a>
                    );
                  })
                ) : (
                  <div className="py-8 text-center text-xs text-gray-500 bg-white/2 rounded-2xl border border-white/5">
                    No individual quality anchors available. Please use Watch Online link to stream dynamic resolutions.
                  </div>
                )}
              </div>
            </div>

            {/* Footer warning */}
            <div className="pt-2 text-center text-[10px] text-gray-550 select-none">
              Secured SSL Seeding mirrors • Verified Zero Viruses
            </div>

          </div>
        </div>
      )}

      {/* Premium Glassmorphic Sort By Modal */}
      <AnimatePresence>
        {isSortModalOpen && (
          <div className="fixed inset-0 z-55 flex items-center justify-center p-4">
            {/* Dark glass backdrop blur layer */}
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsSortModalOpen(false)}
              className="absolute inset-0 bg-black/85 backdrop-blur-md"
            />

            {/* Premium Container */}
            <motion.div
              initial={{ scale: 0.95, y: 15, opacity: 0 }}
              animate={{ scale: 1, y: 0, opacity: 1 }}
              exit={{ scale: 0.95, y: 15, opacity: 0 }}
              transition={{ type: "spring", stiffness: 350, damping: 25 }}
              className="w-full max-w-sm bg-gradient-to-b from-[#0e0204] via-[#050505] to-[#0d0103] border border-[#ff2d55]/30 rounded-[28px] p-6 sm:p-8 shadow-[0_20px_50px_rgba(255,45,85,0.25)] relative z-55 overflow-hidden space-y-6"
            >
              {/* Outer soft ambient glow */}
              <div className="absolute -inset-1 rounded-[28px] bg-gradient-to-tr from-[#ff2d55]/10 to-[#ff6b00]/10 blur-2xl pointer-events-none -z-10" />

              <div className="flex items-center justify-between border-b border-white/5 pb-3">
                <div className="flex items-center gap-2">
                  <ListOrdered size={18} className="text-[#ff2d55] drop-shadow-[0_0_8px_rgba(255,45,85,0.5)]" />
                  <span className="font-sans font-black text-xs uppercase tracking-widest text-stone-200">Sort Catalogue</span>
                </div>
                <button 
                  onClick={() => setIsSortModalOpen(false)}
                  className="w-8 h-8 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-gray-400 hover:text-white hover:bg-white/10 active:scale-95 transition-all cursor-pointer"
                >
                  <X size={14} />
                </button>
              </div>

              <div className="flex flex-col gap-2.5 pt-1">
                {[
                  { value: "date_newest", label: "Newest First" },
                  { value: "date_oldest", label: "Oldest First" },
                  { value: "rating_highest", label: "Highest Rating" },
                  { value: "rating_lowest", label: "Lowest Rating" },
                  { value: "name_asc", label: "A → Z" },
                  { value: "name_desc", label: "Z → A" },
                ].map((opt) => {
                  const isSelected = sortBy === opt.value;
                  return (
                    <button
                      key={opt.value}
                      onClick={() => {
                        setSortBy(opt.value);
                        setTimeout(() => setIsSortModalOpen(false), 200);
                      }}
                      className={`w-full py-3.5 px-4 rounded-2xl flex items-center justify-between border transition-all cursor-pointer select-none font-sans group ${
                        isSelected 
                          ? "bg-[#ff2d55]/10 border-[#ff2d55]/40 shadow-[inset_0_1px_12px_rgba(255,45,85,0.15)] animate-pulse" 
                          : "bg-white/2 border-white/5 hover:border-white/15 hover:bg-white/5"
                      }`}
                    >
                      {/* Left: Indicator & Text */}
                      <div className="flex items-center gap-3">
                        {/* Custom Animated Circle Radio Button */}
                        <div className="relative w-5 h-5 flex items-center justify-center shrink-0">
                          <div className={`absolute inset-0 rounded-full border transition-all ${
                            isSelected 
                              ? "border-[#ff2d55] scale-100" 
                              : "border-gray-600 scale-100 group-hover:border-gray-400"
                          }`} />
                          
                          {/* Inner glowing selection circle */}
                          <motion.div 
                            initial={false}
                            animate={{ scale: isSelected ? 1 : 0 }}
                            className="w-2.5 h-2.5 rounded-full bg-gradient-to-r from-[#ff2d55] to-[#ff6b00] shadow-[0_0_10px_rgba(255,45,85,0.8)]"
                          />
                        </div>

                        {/* Label Content */}
                        <span className={`text-xs font-semibold tracking-wide transition-all ${
                          isSelected 
                            ? "text-transparent bg-clip-text bg-gradient-to-r from-[#ff2d55] to-amber-500 font-extrabold drop-shadow-[0_0_5px_rgba(255,45,85,0.2)]" 
                            : "text-gray-300"
                        }`}>
                          {opt.label}
                        </span>
                      </div>

                      {/* Right decoration */}
                      {isSelected && (
                        <div className="w-1.5 h-1.5 rounded-full bg-[#ff2d55] shadow-[0_0_8px_rgba(255,45,85,1)] animate-pulse" />
                      )}
                    </button>
                  );
                })}
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
                      setActivePlayerMovie(availNotification);
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
        <div className="max-w-7xl mx-auto px-4 text-center space-y-3">
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
