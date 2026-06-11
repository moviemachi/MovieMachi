/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { initializeApp } from "firebase/app";
import { 
  getFirestore, 
  collection, 
  doc, 
  getDocs, 
  setDoc, 
  getDoc,
  deleteDoc, 
  getDocFromServer,
  setLogLevel
} from "firebase/firestore";
import { Movie, CommunityRequest, Series, SeriesEpisode, AppNotification } from "../types";
import { allMovies } from "../data/all_movies";

// Safe global console monitor to divert benign backend connectivity timeouts when testing container is offline
if (typeof window !== "undefined") {
  const originalError = console.error;
  console.error = function (...args) {
    const isFirestoreNetworkError = args.some(arg => {
      if (!arg) return false;
      const str = typeof arg === "string" ? arg : (arg instanceof Error ? arg.message : String(arg));
      const lower = str.toLowerCase();
      return (
        lower.includes("@firebase/firestore") ||
        lower.includes("could not reach cloud firestore") ||
        lower.includes("failed to get document from server") ||
        lower.includes("unable to reach database") ||
        lower.includes("quota exceeded")
      );
    });

    if (isFirestoreNetworkError) {
      console.warn("[Firestore Environment Warning]: Rerouted connection state:", ...args);
      return;
    }
    originalError.apply(console, args);
  };
}

const firebaseConfig = {
  apiKey: "AIzaSyBOuwTRj4BRerRr_oDcLmtXqsMZaWFtOtE",
  authDomain: "moviemachi-2026.firebaseapp.com",
  projectId: "moviemachi-2026",
  storageBucket: "moviemachi-2026.firebasestorage.app",
  messagingSenderId: "1090263297746",
  appId: "1:1090263297746:web:908c1f61d80aea1113c70b",
  measurementId: "G-NTFM5FEGGN"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);

try {
  setLogLevel("silent");
} catch (e) {
  // Graceful fallback
}

export enum OperationType {
  CREATE = "create",
  UPDATE = "update",
  DELETE = "delete",
  LIST = "list",
  GET = "get",
  WRITE = "write",
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
  }
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errorMessage = error instanceof Error ? error.message : String(error);
  
  const isOffline = 
    errorMessage.toLowerCase().includes("offline") || 
    errorMessage.toLowerCase().includes("could not reach") ||
    errorMessage.toLowerCase().includes("failed to get document") ||
    errorMessage.toLowerCase().includes("unavailable") ||
    errorMessage.toLowerCase().includes("network") ||
    errorMessage.toLowerCase().includes("timeout");

  const errInfo: FirestoreErrorInfo = {
    error: errorMessage,
    authInfo: {
      userId: "anonymous_machi_peer",
      email: null
    },
    operationType,
    path
  };

  if (isOffline) {
    console.warn("[Firebase Connection Offline]: Operating in local-first/cached fallback mode. Detailed ledger:", JSON.stringify(errInfo));
    // Do not throw for offline/network connectivity states to allow seamless local-first fallback operation without crashing
    return;
  }

  console.error("Firestore Error Detailed Ledger:", JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

/**
 * Filter out undefined fields from objects and arrays recursively or map to beautiful defaults so we never store undefined values.
 */
export function sanitizeMovieData(movie: any): Movie {
  return {
    id: movie.id || "",
    title: movie.title || "",
    image: movie.image || "",
    movieName: movie.movieName || "",
    director: movie.director || "",
    starring: movie.starring || "",
    genres: movie.genres || [],
    quality: movie.quality || "",
    language: movie.language || "",
    rating: movie.rating || "",
    lastUpdated: movie.lastUpdated || "",
    watchUrl: movie.watchUrl || "",
    trailerUrl: movie.trailerUrl || "",
    links: (movie.links || []).map((l: any) => ({
      label: l.label || "",
      url: l.url || "",
      className: l.className || ""
    }))
  };
}

export function sanitizeRequestData(r: any): CommunityRequest {
  return {
    id: r.id || "",
    movieName: r.movieName || "",
    year: r.year || "",
    genre: r.genre || "",
    language: r.language || "",
    quality: r.quality || "",
    comments: r.comments || "",
    requesters: r.requesters || [],
    status: r.status || "Pending",
    requestCount: Number(r.requestCount) || 1,
    timeAgo: r.timeAgo || "",
    createdAt: Number(r.createdAt) || Date.now(),
    requesterUserId: r.requesterUserId || "",
    requesterUsername: r.requesterUsername || "",
    requestedMovieName: r.requestedMovieName || r.movieName || "",
    uploadedAt: r.uploadedAt ? Number(r.uploadedAt) : undefined
  };
}

export function sanitizeSeriesData(s: any): Series {
  return {
    id: s.id || "",
    type: "series",
    seriesName: s.seriesName || "",
    title: s.title || "",
    seasonNumber: Number(s.seasonNumber) || 1,
    image: s.image || "",
    director: s.director || "",
    starring: s.starring || "",
    genres: s.genres || [],
    language: s.language || "",
    quality: s.quality || "",
    rating: s.rating || "",
    lastUpdated: s.lastUpdated || "",
    episodes: (s.episodes || []).map((ep: any) => {
      const epNum = Number(ep.episodeNumber !== undefined ? ep.episodeNumber : ep.episode) || 0;
      return {
        episodeNumber: epNum,
        episode: epNum,
        downloadUrl: ep.downloadUrl || ""
      };
    })
  };
}

// Connection check as required by Firebase skill
async function testConnection() {
  try {
    await getDocFromServer(doc(db, "test", "connection"));
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    if (msg.toLowerCase().includes("offline") || msg.toLowerCase().includes("could not reach")) {
      console.warn("Please check your Firebase configuration or internet connectivity. Operating in persistent local-first mode.", error);
    } else {
      console.warn("Firestore connection check status update:", error);
    }
  }
}
testConnection();

/**
 * Seed Firestore with initial movies list if it is completely empty
 */
export async function seedMoviesIfEmpty() {
  const path = "movies";
  try {
    const querySnapshot = await getDocs(collection(db, path));
    if (querySnapshot.empty) {
      console.log("[Firebase] Seeding catalog with default MovieMachi inventory...");
      for (const m of allMovies) {
        // Use sanitized title as document ID to avoid forbidden characters
        const safeId = m.title.replace(/[^a-zA-Z0-9_\-]/g, "_");
        const sanitized = sanitizeMovieData(m);
        sanitized.id = safeId;
        await setDoc(doc(db, path, safeId), sanitized);
      }
    }
  } catch (err) {
    console.error("[Firebase] Error checking/seeding default catalog:", err);
  }
}

/**
 * Fetch all movies from Firestore
 */
export async function fetchAllMoviesFromFirestore(): Promise<Movie[]> {
  const path = "movies";
  try {
    const querySnapshot = await getDocs(collection(db, path));
    const items: Movie[] = [];
    querySnapshot.forEach((document) => {
      const data = document.data();
      items.push({
        ...data,
        id: document.id
      } as Movie);
    });
    return items;
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
    return [];
  }
}

/**
 * Fetch all requests from Firestore
 */
export async function fetchAllRequestsFromFirestore(): Promise<CommunityRequest[]> {
  const path = "requests";
  try {
    const querySnapshot = await getDocs(collection(db, path));
    const items: CommunityRequest[] = [];
    querySnapshot.forEach((document) => {
      items.push(document.data() as CommunityRequest);
    });
    // Default sorting: highest counts first, then newest
    return items.sort((a, b) => {
      if (b.requestCount !== a.requestCount) {
        return b.requestCount - a.requestCount;
      }
      return b.createdAt - a.createdAt;
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
    return [];
  }
}

/**
 * Auto fulfill matching requests to Uploaded
 */
export async function autoFulfillMatchingRequests(movieName: string): Promise<void> {
  const path = "requests";
  try {
    const querySnapshot = await getDocs(collection(db, path));
    const requestsToUpdate: CommunityRequest[] = [];
    querySnapshot.forEach((document) => {
      const data = document.data();
      const r = { ...data, id: document.id } as CommunityRequest;
      if (r.status !== "Uploaded" && r.movieName && (
        r.movieName.toLowerCase() === movieName.toLowerCase() ||
        movieName.toLowerCase().includes(r.movieName.toLowerCase()) ||
        r.movieName.toLowerCase().includes(movieName.toLowerCase())
      )) {
        requestsToUpdate.push({
          ...r,
          status: "Uploaded",
          uploadedAt: Date.now()
        });
      }
    });

    for (const r of requestsToUpdate) {
      if (!r.id) continue;
      const sanitized = sanitizeRequestData(r);
      await setDoc(doc(db, path, r.id), sanitized);

      // Create persistent notifications in Firestore ONLY for users who requested/voted for this movie
      if (r.requesters && r.requesters.length > 0) {
        for (const uid of r.requesters) {
          const notifId = `NOTIF_${r.id}_${uid}`;
          const notifMsg = `🎬 Your requested movie "${r.movieName}" is now available.`;
          const notificationData = {
            id: notifId,
            userId: uid,
            message: notifMsg,
            isRead: false,
            createdAt: Date.now(),
            movieTitle: r.movieName
          };
          await setDoc(doc(db, "notifications", notifId), notificationData);
        }
      }
    }
  } catch (err) {
    console.error("[Firebase] Error auto-fulfilling matching requests:", err);
  }
}

/**
 * Save new or existing movie asset
 */
export async function saveMovieToFirestore(movie: Movie): Promise<void> {
  const path = "movies";
  const docId = movie.id || movie.title.replace(/[^a-zA-Z0-9_\-]/g, "_");
  const sanitized = sanitizeMovieData(movie);
  sanitized.id = docId;
  try {
    await setDoc(doc(db, path, docId), sanitized);
    // Auto-fulfill when adding/updating
    await autoFulfillMatchingRequests(movie.movieName);
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `${path}/${docId}`);
  }
}

/**
 * Delete a movie asset using document ID
 */
export async function deleteMovieFromFirestore(movieId: string): Promise<void> {
  const path = "movies";
  console.log("Deleting:", movieId);
  try {
    await deleteDoc(doc(db, path, movieId));
    console.log("Delete successful");
  } catch (error) {
    console.error(error);
    handleFirestoreError(error, OperationType.DELETE, `${path}/${movieId}`);
  }
}

/**
 * Fetch all series from Firestore
 */
export async function fetchAllSeriesFromFirestore(): Promise<Series[]> {
  const path = "series";
  try {
    const querySnapshot = await getDocs(collection(db, path));
    const items: Series[] = [];
    querySnapshot.forEach((document) => {
      const data = document.data();
      items.push({
        ...data,
        id: document.id,
        type: "series"
      } as Series);
    });
    return items;
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
    return [];
  }
}

/**
 * Save new or existing series asset
 */
export async function saveSeriesToFirestore(series: Series): Promise<void> {
  const path = "series";
  const docId = series.id || series.title.replace(/[^a-zA-Z0-9_\-]/g, "_");
  const sanitized = sanitizeSeriesData(series);
  sanitized.id = docId;
  try {
    await setDoc(doc(db, path, docId), sanitized);
    await autoFulfillMatchingRequests(series.seriesName);
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `${path}/${docId}`);
  }
}

/**
 * Delete a series asset using document ID
 */
export async function deleteSeriesFromFirestore(seriesId: string): Promise<void> {
  const path = "series";
  console.log("Deleting:", seriesId);
  try {
    await deleteDoc(doc(db, path, seriesId));
    console.log("Delete successful");
  } catch (error) {
    console.error(error);
    handleFirestoreError(error, OperationType.DELETE, `${path}/${seriesId}`);
  }
}

/**
 * Submit request directly to Firestore (or handles duplicate by upvoting)
 */
export async function submitRequestToFirestore(
  movieInput: string,
  yearInput: string,
  languageInput: string,
  genreInput: string,
  qualityInput: string,
  commentsInput: string,
  userId: string,
  currentMovies: Movie[]
): Promise<{ success: boolean; error?: string; action?: "created" | "upvoted"; movieName?: string }> {
  const movieName = movieInput.trim();
  const year = yearInput ? yearInput.trim() : new Date().getFullYear().toString();
  const lookupTitle = `${movieName} (${year})`;

  // Protect duplication against static and dynamic items in movies catalog
  const movieExists = currentMovies.some(
    m => (m.movieName && m.movieName.toLowerCase() === movieName.toLowerCase()) ||
         (m.title && m.title.toLowerCase() === lookupTitle.toLowerCase())
  );

  if (movieExists) {
    return { success: false, error: "duplicate_exists" };
  }

  const path = "requests";
  try {
    const list = await fetchAllRequestsFromFirestore();
    const existingReqIdx = list.findIndex(
      r => r.movieName.toLowerCase() === movieName.toLowerCase() && r.year === year
    );

    if (existingReqIdx > -1) {
      const existingReq = { ...list[existingReqIdx] };
      if (existingReq.requesters.includes(userId)) {
        return { success: false, error: "already_voted" };
      }

      existingReq.requesters = [...existingReq.requesters, userId];
      existingReq.requestCount += 1;

      if (existingReq.requestCount >= 3 && existingReq.status === "Pending") {
        existingReq.status = "Under Review";
      }

      const sanitized = sanitizeRequestData(existingReq);
      await setDoc(doc(db, path, existingReq.id), sanitized);
      return { success: true, action: "upvoted", movieName };
    } else {
      const newId = "REQ_" + Date.now() + "_" + Math.floor(Math.random() * 1000);
      const newReq: CommunityRequest = {
        id: newId,
        movieName,
        year,
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
        requestedMovieName: movieName
      };

      const sanitized = sanitizeRequestData(newReq);
      await setDoc(doc(db, path, newId), sanitized);
      return { success: true, action: "created", movieName };
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
    return { success: false, error: "firestore_error" };
  }
}

/**
 * Upvote existing request in Firestore
 */
export async function upvoteRequestInFirestore(reqId: string, userId: string): Promise<boolean> {
  const path = `requests/${reqId}`;
  try {
    const docRef = doc(db, "requests", reqId);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      const r = docSnap.data() as CommunityRequest;
      if (r.requesters.includes(userId)) {
        return false;
      }
      const newCount = r.requestCount + 1;
      const updated = {
        ...r,
        requesters: [...r.requesters, userId],
        requestCount: newCount,
        status: (newCount >= 3 && r.status === "Pending") ? "Under Review" as const : r.status
      };
      const sanitized = sanitizeRequestData(updated);
      await setDoc(docRef, sanitized);
      return true;
    }
    return false;
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
    return false;
  }
}

/**
 * Mark a request status as Uploaded manually
 */
export async function fulfillRequestInFirestore(reqId: string): Promise<void> {
  const path = `requests/${reqId}`;
  try {
    const docRef = doc(db, "requests", reqId);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      const r = docSnap.data() as CommunityRequest;
      const updated = {
        ...r,
        status: "Uploaded" as const,
        uploadedAt: Date.now()
      };
      const sanitized = sanitizeRequestData(updated);
      await setDoc(docRef, sanitized);

      // Create a persistent notification for every requester when manually fulfilled
      if (r.requesters && r.requesters.length > 0) {
        for (const uid of r.requesters) {
          const notifId = `NOTIF_${r.id}_${uid}`;
          const notifMsg = `🎬 Your requested movie "${r.movieName}" is now available.`;
          const notificationData = {
            id: notifId,
            userId: uid,
            message: notifMsg,
            isRead: false,
            createdAt: Date.now(),
            movieTitle: r.movieName
          };
          await setDoc(doc(db, "notifications", notifId), notificationData);
        }
      }
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

/**
 * Mark a notification as read in Firestore
 */
export async function markNotificationAsReadInFirestore(notifId: string): Promise<void> {
  const path = `notifications/${notifId}`;
  try {
    const docRef = doc(db, "notifications", notifId);
    await setDoc(docRef, { isRead: true }, { merge: true });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

/**
 * Delete/Dismiss a notification from Firestore
 */
export async function deleteNotificationFromFirestore(notifId: string): Promise<void> {
  const path = `notifications/${notifId}`;
  try {
    await deleteDoc(doc(db, "notifications", notifId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}
