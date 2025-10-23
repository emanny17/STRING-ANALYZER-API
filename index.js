import express from "express";
import cors from "cors";
import asynchandler from "express-async-handler";
import dotenv from "dotenv";
import crypto from "crypto";

const app = express();
dotenv.config();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 8000;

// In-memory storage
const analyzedStrings = new Map();

// Hash function
function generateHash(value) {
  return crypto.createHash("sha256").update(value).digest("hex");
}

// Analyze string function
function analyzeString(value) {
  const length = value.length;
  const normalized = value.toLowerCase().replace(/\s/g, "");
  const isPalindrome = normalized === normalized.split("").reverse().join("");
  const wordCount = value.trim().split(/\s+/).filter(Boolean).length;
  const uniqueChars = new Set(value).size;

  const charFrequency = {};
  for (const char of value) {
    charFrequency[char] = (charFrequency[char] || 0) + 1;
  }

  const sha256 = generateHash(value);

  return {
    id: sha256,
    value,
    properties: {
      length,
      is_palindrome: isPalindrome,
      unique_characters: uniqueChars,
      word_count: wordCount,
      sha256_hash: sha256,
      character_frequency_map: charFrequency,
    },
    created_at: new Date().toISOString(),
  };
}

// POST /strings
app.post(
  "/strings",
  asynchandler(async (req, res) => {
    const { value } = req.body;

    if (value === undefined) {
      return res.status(400).json({ error: "Missing 'value' field" });
    }

    if (typeof value !== "string") {
      return res.status(422).json({ error: "Value must be a string" });
    }

    const hash = generateHash(value);

    if (analyzedStrings.has(hash)) {
      return res.status(409).json({
        error: "Duplicate string",
        message: "This string already exists",
      });
    }

    const result = analyzeString(value);
    analyzedStrings.set(hash, result);

    return res.status(201).json(result);
  })
);

// Natural Language Filter
function interpretQuery(query) {
  const lower = query.toLowerCase();
  const filters = {};

  if (lower.includes("palindromic")) filters.is_palindrome = true;
  if (lower.includes("single word") || lower.includes("one word"))
    filters.word_count = 1;

  const matchLength = lower.match(/longer than (\d+)/);
  if (matchLength) filters.min_length = parseInt(matchLength[1]) + 1;

  const matchContains = lower.match(/containing the letter (\w)/);
  if (matchContains) filters.contains_character = matchContains[1];

  return Object.keys(filters).length ? filters : null;
}

// Get Strings by Natural Language
app.get(
  "/strings/filter-by-natural-language",
  asynchandler(async (req, res) => {
    const { query } = req.query;

    if (!query) return res.status(400).json({ error: "Query is required" });

    const parsedFilters = interpretQuery(query);
    if (!parsedFilters)
      return res
        .status(400)
        .json({ error: "Unable to parse natural language query" });

    let results = Array.from(analyzedStrings.values());

    if (parsedFilters.is_palindrome !== undefined) {
      results = results.filter(
        (item) => item.properties.is_palindrome === parsedFilters.is_palindrome
      );
    }

    if (parsedFilters.word_count !== undefined) {
      results = results.filter(
        (item) => item.properties.word_count === parsedFilters.word_count
      );
    }

    if (parsedFilters.min_length !== undefined) {
      results = results.filter(
        (item) => item.properties.length >= parsedFilters.min_length
      );
    }

    if (parsedFilters.contains_character !== undefined) {
      results = results.filter((item) =>
        item.value.includes(parsedFilters.contains_character)
      );
    }

    res.status(200).json({
      data: results,
      count: results.length,
      interpreted_query: {
        original: query,
        parsed_filters: parsedFilters,
      },
    });
  })
);

// GET /strings/:string_value
app.get(
  "/strings/:string_value",
  asynchandler(async (req, res) => {
    const { string_value } = req.params;
    const hash = generateHash(string_value);

    if (!analyzedStrings.has(hash)) {
      return res.status(404).json({
        error: "Not Found",
        message: "String does not exist in the system",
      });
    }

    res.status(200).json(analyzedStrings.get(hash));
  })
);

// GET /strings
app.get(
  "/strings",
  asynchandler(async (req, res) => {
    const {
      is_palindrome,
      min_length,
      max_length,
      word_count,
      contains_character,
    } = req.query;

    const filters = {};
    const errors = [];

    // Validate is_palindrome
    if (is_palindrome !== undefined) {
      if (is_palindrome !== "true" && is_palindrome !== "false") {
        errors.push('is_palindrome must be "true" or "false"');
      } else {
        filters.is_palindrome = is_palindrome === "true";
      }
    }

    // Validate min_length
    if (min_length !== undefined) {
      const min = parseInt(min_length, 10);
      if (isNaN(min) || min < 0) {
        errors.push("min_length must be a non-negative integer");
      } else {
        filters.min_length = min;
      }
    }

    // Validate max_length
    if (max_length !== undefined) {
      const max = parseInt(max_length, 10);
      if (isNaN(max) || max < 0) {
        errors.push("max_length must be a non-negative integer");
      } else {
        filters.max_length = max;
      }
    }

    // Validate word_count
    if (word_count !== undefined) {
      const wc = parseInt(word_count, 10);
      if (isNaN(wc) || wc < 0) {
        errors.push("word_count must be a non-negative integer");
      } else {
        filters.word_count = wc;
      }
    }

    // Validate contains_character
    if (contains_character !== undefined) {
      if (contains_character.length !== 1) {
        errors.push("contains_character must be a single character");
      } else {
        filters.contains_character = contains_character;
      }
    }

    // Check min/max conflict
    if (
      filters.min_length !== undefined &&
      filters.max_length !== undefined &&
      filters.min_length > filters.max_length
    ) {
      errors.push("min_length cannot be greater than max_length");
    }

    if (errors.length > 0) {
      return res.status(400).json({
        error: "Bad Request",
        details: errors,
      });
    }

    let results = Array.from(analyzedStrings.values());

    if (filters.is_palindrome !== undefined) {
      results = results.filter(
        (item) => item.properties.is_palindrome === filters.is_palindrome
      );
    }

    if (filters.min_length !== undefined) {
      results = results.filter(
        (item) => item.properties.length >= filters.min_length
      );
    }

    if (filters.max_length !== undefined) {
      results = results.filter(
        (item) => item.properties.length <= filters.max_length
      );
    }

    if (filters.word_count !== undefined) {
      results = results.filter(
        (item) => item.properties.word_count === filters.word_count
      );
    }

    if (filters.contains_character !== undefined) {
      results = results.filter((item) =>
        item.value.includes(filters.contains_character)
      );
    }

    res.status(200).json({
      data: results,
      count: results.length,
      filters_applied: filters,
    });
  })
);

// DELETE /strings/:string_value
app.delete(
  "/strings/:string_value",
  asynchandler(async (req, res) => {
    const { string_value } = req.params;
    const hash = generateHash(string_value);

    if (!analyzedStrings.has(hash)) {
      return res.status(404).json({
        error: "Not Found",
        message: "String does not exist in the system",
      });
    }

    analyzedStrings.delete(hash);
    res.status(204).send();
  })
);

// Global Error Handler
app.use((err, req, res, next) => {
  console.error("Unhandled error:", err);
  res
    .status(500)
    .json({ error: "Internal Server Error", message: err.message });
});

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
