import express from "express";
import path from "path";
import fs from "fs";
import { createServer as createViteServer } from "vite";
import { allMovies } from "./src/data/all_movies";

const app = express();
const PORT = 3000;

app.use(express.json());

const MOVIES_FILE = path.join(process.cwd(), "movies_db.json");
const REQUESTS_FILE = path.join(process.cwd(), "requests_db.json");

// Local DB loaders
function loadMovies(): any[] {
  try {
    if (fs.existsSync(MOVIES_FILE)) {
      return JSON.parse(fs.readFileSync(MOVIES_FILE, "utf-8"));
    }
  } catch (err) {
    console.error("Error reading movies file:", err);
  }
  // Fallback to initial movies group
  try {
    fs.writeFileSync(MOVIES_FILE, JSON.stringify(allMovies, null, 2));
  } catch (err) {
    console.error("Error writing default movies file:", err);
  }
  return allMovies;
}

function saveMovies(movies: any[]) {
  try {
    fs.writeFileSync(MOVIES_FILE, JSON.stringify(movies, null, 2));
  } catch (err) {
    console.error("Error saving movies file:", err);
  }
}

function loadRequests(): any[] {
  try {
    if (fs.existsSync(REQUESTS_FILE)) {
      return JSON.parse(fs.readFileSync(REQUESTS_FILE, "utf-8"));
    }
  } catch (err) {
    console.error("Error reading requests file:", err);
  }
  return [];
}

function saveRequests(requests: any[]) {
  try {
    fs.writeFileSync(REQUESTS_FILE, JSON.stringify(requests, null, 2));
  } catch (err) {
    console.error("Error saving requests file:", err);
  }
}

// ----------------------------------------------------
// API ROUTES
// ----------------------------------------------------

// Load all catalog movies
app.get("/api/movies", (req, res) => {
  res.json(loadMovies());
});

// Create or Overwrite catalog movie
app.post("/api/movies", (req, res) => {
  const { movie } = req.body;
  if (!movie || !movie.title) {
    return res.status(400).json({ error: "Invalid movie payload" });
  }

  let currentList = loadMovies();
  const existingIdx = currentList.findIndex(m => m.title.toLowerCase() === movie.title.toLowerCase());
  if (existingIdx > -1) {
    currentList[existingIdx] = movie;
  } else {
    currentList = [movie, ...currentList];
  }
  saveMovies(currentList);

  // Sync requesting tickets matching this title
  let reqs = loadRequests();
  let changed = false;
  reqs = reqs.map(r => {
    if (r.status !== "Uploaded" && (
      r.movieName.toLowerCase() === movie.movieName.toLowerCase() ||
      movie.movieName.toLowerCase().includes(r.movieName.toLowerCase())
    )) {
      changed = true;
      return { ...r, status: "Uploaded" };
    }
    return r;
  });

  if (changed) {
    saveRequests(reqs);
  }

  res.json({ success: true, movie });
});

// Update catalog movie
app.put("/api/movies/:title", (req, res) => {
  const oldTitle = decodeURIComponent(req.params.title);
  const { movie } = req.body;
  if (!movie || !movie.title) {
    return res.status(400).json({ error: "Invalid movie payload" });
  }

  let currentList = loadMovies();
  const index = currentList.findIndex(m => m.title.toLowerCase() === oldTitle.toLowerCase());
  if (index > -1) {
    currentList[index] = movie;
    saveMovies(currentList);

    // Sync requesting tickets matching this title
    let reqs = loadRequests();
    let changed = false;
    reqs = reqs.map(r => {
      if (r.status !== "Uploaded" && (
        r.movieName.toLowerCase() === movie.movieName.toLowerCase() ||
        movie.movieName.toLowerCase().includes(r.movieName.toLowerCase())
      )) {
        changed = true;
        return { ...r, status: "Uploaded" };
      }
      return r;
    });

    if (changed) {
      saveRequests(reqs);
    }

    res.json({ success: true, movie });
  } else {
    res.status(404).json({ error: "Movie asset not found" });
  }
});

// Delete catalog movie
app.delete("/api/movies/:title", (req, res) => {
  const title = decodeURIComponent(req.params.title);
  const currentList = loadMovies();
  const newList = currentList.filter(m => m.title.toLowerCase() !== title.toLowerCase());
  saveMovies(newList);
  res.json({ success: true });
});

// Get tickets requests database ledger
app.get("/api/requests", (req, res) => {
  res.json(loadRequests());
});

// Add user request ticket (with auto-upvoting duplicate case handling)
app.post("/api/requests", (req, res) => {
  const { movieInput, yearInput, languageInput, genreInput, qualityInput, commentsInput, userId } = req.body;
  if (!movieInput) {
    return res.status(400).json({ error: "Movie name is required" });
  }

  const movieName = movieInput.trim();
  const year = yearInput ? yearInput.trim() : new Date().getFullYear().toString();
  const lookupTitle = `${movieName} (${year})`;

  // Protect duplication against static and dynamic items in movies catalog
  const catalog = loadMovies();
  const movieExists = catalog.some(
    m => m.movieName.toLowerCase() === movieName.toLowerCase() ||
         m.title.toLowerCase() === lookupTitle.toLowerCase()
  );

  if (movieExists) {
    return res.json({ success: false, error: "duplicate_exists" });
  }

  let requestsList = loadRequests();
  const existingReqIdx = requestsList.findIndex(
    r => r.movieName.toLowerCase() === movieName.toLowerCase() && r.year === year
  );

  if (existingReqIdx > -1) {
    const existingReq = { ...requestsList[existingReqIdx] };
    if (existingReq.requesters.includes(userId)) {
      return res.json({ success: false, error: "already_voted" });
    }

    existingReq.requesters = [...existingReq.requesters, userId];
    existingReq.requestCount += 1;

    if (existingReq.requestCount >= 3 && existingReq.status === "Pending") {
      existingReq.status = "Under Review";
    }

    requestsList[existingReqIdx] = existingReq;
    requestsList.sort((a, b) => b.requestCount - a.requestCount);
    saveRequests(requestsList);

    return res.json({ success: true, action: "upvoted", movieName });
  } else {
    const newReq = {
      id: "REQ_" + Date.now() + "_" + Math.floor(Math.random() * 1000),
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

    requestsList = [newReq, ...requestsList];
    requestsList.sort((a, b) => b.requestCount - a.requestCount);
    saveRequests(requestsList);

    return res.json({ success: true, action: "created", movieName });
  }
});

// Upvote existing queue ticket
app.post("/api/requests/upvote", (req, res) => {
  const { reqId, userId } = req.body;
  let requestsList = loadRequests();
  let changed = false;

  requestsList = requestsList.map(r => {
    if (r.id === reqId) {
      if (r.requesters.includes(userId)) return r;
      changed = true;
      const newCount = r.requestCount + 1;
      return {
        ...r,
        requesters: [...r.requesters, userId],
        requestCount: newCount,
        status: (newCount >= 3 && r.status === "Pending") ? "Under Review" : r.status
      };
    }
    return r;
  });

  if (changed) {
    requestsList.sort((a, b) => b.requestCount - a.requestCount);
    saveRequests(requestsList);
    res.json({ success: true });
  } else {
    res.json({ success: false, error: "already_voted_or_not_found" });
  }
});

// Manually sync ticket to Uploaded status
app.post("/api/requests/fulfill", (req, res) => {
  const { reqId } = req.body;
  let requestsList = loadRequests();
  let changed = false;

  requestsList = requestsList.map(r => {
    if (r.id === reqId) {
      changed = true;
      return { ...r, status: "Uploaded" };
    }
    return r;
  });

  if (changed) {
    saveRequests(requestsList);
    res.json({ success: true });
  } else {
    res.json({ success: false, error: "not_found" });
  }
});


// ----------------------------------------------------
// VITE MIDDLEWARE & STATIC SERVING CONFIG
// ----------------------------------------------------

async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`[MovieMachi Server] active, listening at http://0.0.0.0:${PORT}`);
  });
}

startServer();
