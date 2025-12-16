import cors from "cors";
import express from "express";
import { configDotenv } from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

configDotenv();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const port = process.env.PORT || 8080;

app.use(cors());
app.use(express.json());

const cacheOptions = {
  headers: {
    "Cache-Control": "no-cache", 
  }
};

app.use("/static", express.static(path.join(__dirname, "static"), {
  setHeaders: (res, path) => {
    res.setHeader("Cache-Control", "no-cache");
  }
}));

// Health check endpoint
app.get("/health", (req, res) => {
  res.json({ status: "ok" });
});

// Wordle
app.get("/wordle", (req, res) => {
  res.sendFile(path.join(__dirname, "static", "wordle.json"), cacheOptions);
});

// Strands
app.get("/strands", (req, res) => {
  res.sendFile(path.join(__dirname, "static", "strands.json"), cacheOptions);
});

// Connections
app.get("/connections", (req, res) => {
  res.sendFile(path.join(__dirname, "static", "connections.json"), cacheOptions);
});

// Spelling Bee
app.get("/spellingbee", (req, res) => {
  res.sendFile(path.join(__dirname, "static", "spellingbee.json"), cacheOptions);
});

// Letter Boxed
app.get("/letterboxd", (req, res) => {
  res.sendFile(path.join(__dirname, "static", "letterboxd.json"), cacheOptions);
});

// Sudoku
app.get("/sudoku", (req, res) => {
  res.sendFile(path.join(__dirname, "static", "sudoku.json"), cacheOptions);
});

app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});
