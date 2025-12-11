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

// Serve static JSON files from the /static directory
app.use("/static", express.static(path.join(__dirname, "static")));

// Health check endpoint
app.get("/health", (req, res) => {
  res.json({ status: "ok" });
});

// Wordle - serves pre-generated static JSON
app.get("/wordle", (req, res) => {
  res.sendFile(path.join(__dirname, "static", "wordle.json"));
});

// Also support POST for backwards compatibility
app.post("/wordle", (req, res) => {
  res.sendFile(path.join(__dirname, "static", "wordle.json"));
});

// Strands - serves pre-generated static JSON
app.get("/strands", (req, res) => {
  res.sendFile(path.join(__dirname, "static", "strands.json"));
});

app.post("/strands", (req, res) => {
  res.sendFile(path.join(__dirname, "static", "strands.json"));
});

// Connections - serves pre-generated static JSON
app.get("/connections", (req, res) => {
  res.sendFile(path.join(__dirname, "static", "connections.json"));
});

app.post("/connections", (req, res) => {
  res.sendFile(path.join(__dirname, "static", "connections.json"));
});

// Spelling Bee - serves pre-generated static JSON
app.get("/spellingbee", (req, res) => {
  res.sendFile(path.join(__dirname, "static", "spellingbee.json"));
});

app.post("/spellingbee", (req, res) => {
  res.sendFile(path.join(__dirname, "static", "spellingbee.json"));
});

// Letter Boxed - serves pre-generated static JSON
app.get("/letterboxd", (req, res) => {
  res.sendFile(path.join(__dirname, "static", "letterboxd.json"));
});

// Sudoku - serves pre-generated static JSON
app.get("/sudoku", (req, res) => {
  res.sendFile(path.join(__dirname, "static", "sudoku.json"));
});

app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});
