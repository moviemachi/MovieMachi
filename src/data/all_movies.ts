import { moviesGroup1 } from "./movies_group1";
import { moviesGroup2 } from "./movies_group2";
import { moviesGroup3 } from "./movies_group3";
import { Movie } from "../types";

export const allMovies: Movie[] = [
  ...moviesGroup1,
  ...moviesGroup2,
  ...moviesGroup3
];
