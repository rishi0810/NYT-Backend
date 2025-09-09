import cors from "cors";
import express from "express";
import { configDotenv } from "dotenv";
import axios from "axios";

configDotenv();

const app = express();
const port = process.env.PORT || 8080;

app.use(cors());
app.use(express.json());

const BASE_URL_NEW = process.env.BASE_URL_NEW 
const BASE_URL_OLD = process.env.BASE_URL_OLD 

app.get("/health", (req, res) => {
  res.json({ status: "ok" });
});

app.post("/wordle", async (req, res) => {
 const { date } = req.body;
  if (!date) {
    return res.status(400).json({ error: "Date is required" }); 
  }
  try { 
    const response = await axios.get(
      `${BASE_URL_NEW}/wordle/v2/${date}.json`
    );
    return res.status(200).json({ answer: response.data });
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch Wordle data" });
  }
});

app.post("/strands", async (req, res) => {
  const { date } = req.body;
  if (!date) {
    return res.status(400).json({ error: "Date is required" });
  }
  try {
    const response = await axios.get(
      `${BASE_URL_NEW}/strands/v2/${date}.json`
    );
    return res.status(200).json({
      answer: response.data.themeWords,
      spangram: response.data.spangram,
    });
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch Strands data" });
  }
});

app.post("/connections", async (req, res) => {
  const { date } = req.body;
  if (!date) {
    return res.status(400).json({ error: "Date is required" });
  }
  try {
    const response = await axios.get(
      `${BASE_URL_NEW}/connections/v2/${date}.json`
    );
    const categories = response.data.categories || [];
    const transformed = categories.map((cat) => {
      const words = Array.isArray(cat.cards)
        ? cat.cards.map((c) => c.content)
        : [];
      return { [cat.title]: words };
    });
    return res.status(200).json({ answer: transformed });
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch Connections data" });
  }
});

app.post("/spellingbee", async (req, res) => {
  const { date } = req.body;
  if (!date) {
    return res.status(400).json({ error: "Date is required" });
  }
  try {
    const response = await axios.get(
      `${BASE_URL_OLD}/spelling-bee/${date}`
    );
    const htmlContent = response.data;

    const marker = "window.gameData";
    const markerIndex = htmlContent.indexOf(marker);
    if (markerIndex === -1) {
      return res
        .status(404)
        .json({ error: "Could not find gameData in the HTML content." });
    }

    const assignIndex = htmlContent.indexOf("=", markerIndex);
    if (assignIndex === -1) {
      return res
        .status(404)
        .json({
          error: "Could not find gameData assignment in the HTML content.",
        });
    }

    const firstBrace = htmlContent.indexOf("{", assignIndex);
    if (firstBrace === -1) {
      return res
        .status(404)
        .json({ error: "Could not find the start of the gameData object." });
    }

    let i = firstBrace;
    let braceCount = 0;
    let inString = false;
    let stringChar = "";
    let prevChar = "";
    let endIndex = -1;
    for (; i < htmlContent.length; i++) {
      const ch = htmlContent[i];
      if (inString) {
        if (ch === stringChar && prevChar !== "\\") {
          inString = false;
          stringChar = "";
        }
      } else {
        if (ch === '"' || ch === "'" || ch === "`") {
          inString = true;
          stringChar = ch;
        } else if (ch === "{") {
          braceCount++;
        } else if (ch === "}") {
          braceCount--;
          if (braceCount === 0) {
            endIndex = i;
            break;
          }
        }
      }
      prevChar = ch;
    }

    if (endIndex === -1) {
      return res
        .status(404)
        .json({ error: "Could not find the end of the gameData object." });
    }

    const gameDataString = htmlContent.slice(firstBrace, endIndex + 1);

    let gameData;
    try {
      gameData = JSON.parse(gameDataString);
    } catch (parseErr) {
      try {
        gameData = Function('"use strict";return (' + gameDataString + ")")();
      } catch (evalErr) {
        console.error("Failed to parse gameData JSON:", parseErr, evalErr);
        return res
          .status(500)
          .json({ error: "Failed to parse gameData JSON." });
      }
    }

    if (gameData && gameData.today) {
      return res.status(200).json({ answer: gameData.today });
    } else {
      return res.status(404).json({
        error: "Found gameData, but it does not contain the 'today' property.",
      });
    }
  } catch (error) {
    console.error("Failed to parse game data:", error);
    return res
      .status(500)
      .json({ error: "An internal error occurred while processing the HTML." });
  }
});

app.get("/letterboxd", async (req, res) => {
  try {
    const response = await axios.get(`${BASE_URL_OLD}/letter-boxed/`);
    const htmlContent = response.data;

    const marker = 'window.gameData';
    const markerIndex = htmlContent.indexOf(marker);
    if (markerIndex === -1) {
      return res
        .status(404)
        .json({ error: "Could not find gameData in the HTML content." });
    }

    const assignIndex = htmlContent.indexOf('=', markerIndex);
    if (assignIndex === -1) {
      return res
        .status(404)
        .json({ error: "Could not find gameData assignment in the HTML content." });
    }

    const firstBrace = htmlContent.indexOf('{', assignIndex);
    if (firstBrace === -1) {
      return res
        .status(404)
        .json({ error: "Could not find the start of the gameData object." });
    }

    let i = firstBrace;
    let braceCount = 0;
    let inString = false;
    let stringChar = "";
    let prevChar = "";
    let endIndex = -1;
    for (; i < htmlContent.length; i++) {
      const ch = htmlContent[i];
      if (inString) {
        if (ch === stringChar && prevChar !== "\\") {
          inString = false;
          stringChar = "";
        }
      } else {
        if (ch === '"' || ch === "'" || ch === "`") {
          inString = true;
          stringChar = ch;
        } else if (ch === "{") {
          braceCount++;
        } else if (ch === "}") {
          braceCount--;
          if (braceCount === 0) {
            endIndex = i;
            break;
          }
        }
      }
      prevChar = ch;
    }

    if (endIndex === -1) {
      return res
        .status(404)
        .json({ error: "Could not find the end of the gameData object." });
    }

    const gameDataString = htmlContent.slice(firstBrace, endIndex + 1);

    let gameData;
    try {
      gameData = JSON.parse(gameDataString);
    } catch (parseErr) {
      try {
        // Fallback to evaluating the object literal in a safe function scope
        // eslint-disable-next-line no-new-func
        gameData = Function('"use strict";return (' + gameDataString + ')')();
      } catch (evalErr) {
        console.error('Failed to parse gameData JSON:', parseErr, evalErr);
        return res.status(500).json({ error: 'Failed to parse gameData JSON.' });
      }
    }

    // Return the extracted game data for today's Letter Boxed puzzle
    return res.status(200).json({ answer: { id: gameData.id, solution: gameData.ourSolution, date: gameData.date } });

  } catch (error) {
    console.error("Failed to parse game data:", error);
    return res
      .status(500)
      .json({ error: "An internal error occurred while processing the HTML." });
  }
});

app.get("/sudoku", async (req, res) => {
  try {
    const response = await axios.get(`${BASE_URL_OLD}/sudoku/`);
    const htmlContent = response.data;

    const marker = 'window.gameData';
    const markerIndex = htmlContent.indexOf(marker);
    if (markerIndex === -1) {
      return res
        .status(404)
        .json({ error: "Could not find gameData in the HTML content." });
    }

    const assignIndex = htmlContent.indexOf('=', markerIndex);
    if (assignIndex === -1) {
      return res
        .status(404)
        .json({ error: "Could not find gameData assignment in the HTML content." });
    }

    const firstBrace = htmlContent.indexOf('{', assignIndex);
    if (firstBrace === -1) {
      return res
        .status(404)
        .json({ error: "Could not find the start of the gameData object." });
    }

    let i = firstBrace;
    let braceCount = 0;
    let inString = false;
    let stringChar = "";
    let prevChar = "";
    let endIndex = -1;
    for (; i < htmlContent.length; i++) {
      const ch = htmlContent[i];
      if (inString) {
        if (ch === stringChar && prevChar !== "\\") {
          inString = false;
          stringChar = "";
        }
      } else {
        if (ch === '"' || ch === "'" || ch === "`") {
          inString = true;
          stringChar = ch;
        } else if (ch === "{") {
          braceCount++;
        } else if (ch === "}") {
          braceCount--;
          if (braceCount === 0) {
            endIndex = i;
            break;
          }
        }
      }
      prevChar = ch;
    }

    if (endIndex === -1) {
      return res
        .status(404)
        .json({ error: "Could not find the end of the gameData object." });
    }

    const gameDataString = htmlContent.slice(firstBrace, endIndex + 1);

    let gameData;
    try {
      gameData = JSON.parse(gameDataString);
    } catch (parseErr) {
      try {
        // Fallback to evaluating the object literal in a safe function scope
        // eslint-disable-next-line no-new-func
        gameData = Function('"use strict";return (' + gameDataString + ')')();
      } catch (evalErr) {
        console.error('Failed to parse gameData JSON:', parseErr, evalErr);
        return res.status(500).json({ error: 'Failed to parse gameData JSON.' });
      }
    }

    // Build a solutions object containing only the solution arrays for each difficulty
    const solutions = {};
    ["easy", "medium", "hard"].forEach((level) => {
      const pd = gameData && gameData[level] && gameData[level].puzzle_data;
      if (pd && Array.isArray(pd.solution)) {
        solutions[level] = pd.solution;
      }
    });

    return res.status(200).json({ answer: solutions });
  } catch (error) {
    console.error("Failed to fetch or parse sudoku game data:", error);
    return res
      .status(500)
      .json({ error: "An internal error occurred while processing the HTML." });
  }
});

app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});
