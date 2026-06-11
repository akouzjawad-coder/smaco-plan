import express from "express";
import path from "path";
import fs from "fs";
import { createServer as createViteServer } from "vite";

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Setup middleware
  app.use(express.json({ limit: '10mb' }));

  const DB_FILE = path.join(process.cwd(), 'database.json');

  // Helper to read database
  function getDb() {
    if (!fs.existsSync(DB_FILE)) {
      return null;
    }
    try {
      return JSON.parse(fs.readFileSync(DB_FILE, 'utf-8'));
    } catch (e) {
      console.error("Error reading database file, returning null", e);
      return null;
    }
  }

  // Helper to save database
  function saveDb(data: any) {
    try {
      fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), 'utf-8');
    } catch (e) {
      console.error("Error writing to database file", e);
    }
  }

  // API Route to fetch database state
  app.get("/api/db", (req, res) => {
    const db = getDb();
    if (!db) {
      return res.json({ status: "not_found" });
    }
    res.json({ status: "ok", data: db });
  });

  // API Route to save state
  app.post("/api/db", (req, res) => {
    try {
      const data = req.body;
      saveDb(data);
      res.json({ status: "ok" });
    } catch (err: any) {
      console.error("Failed to save DB:", err);
      res.status(500).json({ error: err.message });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
