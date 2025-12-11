import axios from "axios";
import { configDotenv } from "dotenv";
import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";

configDotenv();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const STATIC_DIR = path.join(__dirname, "static");

const BASE_URL_NEW = process.env.BASE_URL_NEW;
const BASE_URL_OLD = process.env.BASE_URL_OLD;

/**
 * Utility function to parse gameData from HTML content
 * Used by spellingbee, letterboxd, and sudoku puzzles
 */
function parseGameDataFromHTML(htmlContent) {
  const marker = "window.gameData";
  const markerIndex = htmlContent.indexOf(marker);
  if (markerIndex === -1) {
    throw new Error("Could not find gameData in the HTML content.");
  }

  const assignIndex = htmlContent.indexOf("=", markerIndex);
  if (assignIndex === -1) {
    throw new Error("Could not find gameData assignment in the HTML content.");
  }

  const firstBrace = htmlContent.indexOf("{", assignIndex);
  if (firstBrace === -1) {
    throw new Error("Could not find the start of the gameData object.");
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
    throw new Error("Could not find the end of the gameData object.");
  }

  const gameDataString = htmlContent.slice(firstBrace, endIndex + 1);

  let gameData;
  try {
    gameData = JSON.parse(gameDataString);
  } catch (parseErr) {
    try {
      // Fallback to evaluating the object literal in a safe function scope
      gameData = Function('"use strict";return (' + gameDataString + ")")();
    } catch (evalErr) {
      console.error("Failed to parse gameData JSON:", parseErr, evalErr);
      throw new Error("Failed to parse gameData JSON.");
    }
  }

  return gameData;
}

/**
 * Generate Wordle puzzle data for a specific date
 */
async function generateWordle(date) {
  const response = await axios.get(`${BASE_URL_NEW}/wordle/v2/${date}.json`);
  return { answer: response.data };
}

/**
 * Generate Strands puzzle data for a specific date
 */
async function generateStrands(date) {
  const response = await axios.get(`${BASE_URL_NEW}/strands/v2/${date}.json`);
  return {
    answer: response.data.themeWords,
    spangram: response.data.spangram,
  };
}

/**
 * Generate Connections puzzle data for a specific date
 */
async function generateConnections(date) {
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
  return { answer: transformed };
}

/**
 * Generate Spelling Bee puzzle data (today's puzzle)
 * Note: Unlike other puzzles, Spelling Bee doesn't use a date-based URL
 */
async function generateSpellingBee() {
  const response = await axios.get(`${BASE_URL_OLD}/spelling-bee`);
  const htmlContent = response.data;
  const gameData = parseGameDataFromHTML(htmlContent);

  if (gameData && gameData.today) {
    return { answer: gameData.today };
  } else {
    throw new Error(
      "Found gameData, but it does not contain the 'today' property."
    );
  }
}

/**
 * Generate Letter Boxed puzzle data (today's puzzle)
 */
async function generateLetterBoxed() {
  const response = await axios.get(`${BASE_URL_OLD}/letter-boxed/`);
  const htmlContent = response.data;
  const gameData = parseGameDataFromHTML(htmlContent);

  return {
    answer: {
      id: gameData.id,
      solution: gameData.ourSolution,
      date: gameData.date,
    },
  };
}

/**
 * Generate Sudoku puzzle data (today's puzzle for all difficulties)
 */
async function generateSudoku() {
  const response = await axios.get(`${BASE_URL_OLD}/sudoku/`);
  const htmlContent = response.data;
  const gameData = parseGameDataFromHTML(htmlContent);

  // Build a solutions object containing only the solution arrays for each difficulty
  const solutions = {};
  ["easy", "medium", "hard"].forEach((level) => {
    const pd = gameData && gameData[level] && gameData[level].puzzle_data;
    if (pd && Array.isArray(pd.solution)) {
      solutions[level] = pd.solution;
    }
  });

  return { answer: solutions };
}

/**
 * Save data to a JSON file in the static directory
 */
async function saveToStatic(filename, data) {
  const filepath = path.join(STATIC_DIR, filename);
  await fs.writeFile(filepath, JSON.stringify(data, null, 2), "utf8");
  console.log(`✅ Generated: ${filename}`);
}

/**
 * Get today's date in YYYY-MM-DD format
 */
function getTodayDate() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/**
 * Main function to generate all puzzle data
 */
async function generateAllPuzzles() {
  console.log("🎮 Starting puzzle data generation...\n");

  // Ensure static directory exists
  await fs.mkdir(STATIC_DIR, { recursive: true });

  const today = getTodayDate();
  console.log(`📅 Generating puzzles for date: ${today}\n`);

  const results = {
    success: [],
    failed: [],
  };

  // Generate date-based puzzles for today
  const datePuzzles = [
    { name: "wordle", fn: () => generateWordle(today) },
    { name: "strands", fn: () => generateStrands(today) },
    { name: "connections", fn: () => generateConnections(today) },
  ];

  // Generate non-date puzzles (these fetch "today's" automatically)
  const todayPuzzles = [
    { name: "spellingbee", fn: generateSpellingBee },
    { name: "letterboxd", fn: generateLetterBoxed },
    { name: "sudoku", fn: generateSudoku },
  ];

  // Process all puzzles
  for (const puzzle of [...datePuzzles, ...todayPuzzles]) {
    try {
      const data = await puzzle.fn();
      await saveToStatic(`${puzzle.name}.json`, data);
      results.success.push(puzzle.name);
    } catch (error) {
      console.error(`❌ Failed to generate ${puzzle.name}:`, error.message);
      results.failed.push({ name: puzzle.name, error: error.message });
    }
  }

  console.log("\n📊 Generation Summary:");
  console.log(`   ✅ Success: ${results.success.length}`);
  console.log(`   ❌ Failed: ${results.failed.length}`);

  if (results.failed.length > 0) {
    console.log("\n⚠️  Failed puzzles:");
    results.failed.forEach((f) => console.log(`   - ${f.name}: ${f.error}`));
  }

  console.log("\n🎮 Puzzle data generation complete!");
}

// Export functions for potential external use
export {
  generateWordle,
  generateStrands,
  generateConnections,
  generateSpellingBee,
  generateLetterBoxed,
  generateSudoku,
  generateAllPuzzles,
};

// Run generation if this file is executed directly
generateAllPuzzles().catch((err) => {
  console.error("Fatal error during generation:", err);
  process.exit(1);
});
