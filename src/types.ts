/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface MovieLink {
  label: string;
  url: string;
  className: "Epi" | "p480" | "p720" | "p1080" | "K4" | string;
}

export interface Movie {
  id?: string;
  title: string;
  image: string;
  movieName: string;
  director: string;
  starring: string;
  genres: string[];
  quality: string;
  language: string;
  rating: string;
  lastUpdated: string;
  links: MovieLink[];
  watchUrl?: string;
  trailerUrl?: string;
}

export interface SeriesEpisode {
  episodeNumber: number;
  episode?: number;
  downloadUrl: string;
}

export interface Series {
  id?: string;
  type: "series";
  seriesName: string;
  title: string;
  seasonNumber: number;
  image: string;
  director: string;
  starring: string;
  genres: string[];
  language: string;
  quality: string;
  rating: string;
  lastUpdated: string;
  episodes: SeriesEpisode[];
}

export interface CommunityRequest {
  id: string;
  movieName: string;
  year: string;
  genre: string;
  language: string;
  quality: string;
  comments?: string;
  requesters: string[];
  status: "Pending" | "Under Review" | "Uploaded";
  requestCount: number;
  timeAgo: string;
  createdAt: number;
  requesterUserId?: string;
  requesterUsername?: string;
  requestedMovieName?: string;
  uploadedAt?: number;
}

export interface AppNotification {
  id: string;
  userId: string;
  message: string;
  isRead: boolean;
  createdAt: number;
  movieTitle?: string;
}



