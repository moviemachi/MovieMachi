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
  getDocFromServer
} from "firebase/firestore";
import { Movie, CommunityRequest, Series, SeriesEpisode } from "../types";
import { allMovies } from "../data/all_movies";

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
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: "anonymous_machi_peer",
      email: null
    },
    operationType,
    path
  };
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
    createdAt: Number(r.createdAt) || Date.now()
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
    if (error instanceof Error && error.message.includes("the client is offline")) {
      console.error("Please check your Firebase configuration or internet connectivity.", error);
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
      const r = document.data() as CommunityRequest;
      if (r.status !== "Uploaded" && (
        r.movieName.toLowerCase() === movieName.toLowerCase() ||
        movieName.toLowerCase().includes(r.movieName.toLowerCase())
      )) {
        requestsToUpdate.push({
          ...r,
          status: "Uploaded"
        });
      }
    });

    for (const r of requestsToUpdate) {
      const sanitized = sanitizeRequestData(r);
      await setDoc(doc(db, path, r.id), sanitized);
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
        createdAt: Date.now()
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
        status: "Uploaded" as const
      };
      const sanitized = sanitizeRequestData(updated);
      await setDoc(docRef, sanitized);
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}
