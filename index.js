import express from "express";
import cors from "cors";
import asynchandler from "express-async-handler";
import dotenv from "dotenv";
import crypto from "crypto";
import { error } from "console";

const app = express();
dotenv.config();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 8000;

//In memory for analyzed strings
const analyzedString = new Map();

//Hash function
function generateHash(value) {
  return crypto.createHash("sha256").update(value).digest("hex");
}

//Function to analyze strings and returns string info
const analyzeString = (value) => {
  const length = value.length;

  const normalized = value.toLowerCase().replace(/\s/g, "");
  const isPalindrome = normalized === normalized.split("").reverse().join("");
  const wordCount = value
    .trim()
    .split(/\s+/)
    .filter((word) => word.length > 0).length;
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
      created_at: new Date().toISOString(),
    },
  };
};

//Returns info about the inputted string
app.post(
  "/strings",
  asynchandler(async (req, res) => {
    const { value } = req.body;

    if (value === undefined) {
      return res.status(404).json({ error: "Value field is required" });
    }
    if (typeof value !== "string") {
      return res.status(422).json({
        error: "Unprocessable Content",
        message: "Value must be a string, Kindly insert a string",
      });
    }

    const sha256 = generateHash(value);

    if (analyzedString.has(sha256)) {
      return res.status(409).json({
        error: "Conflict",
        message: " String already exists in the system",
        existing: analyzedString.get(sha256),
      });
    }

    const result = analyzeString(value);
    analyzedString.set(sha256, result);
    res.status(201).json(result);
  })
);

// Natural language query parser
function interpretQuery(query) {
  const lower = query.toLowerCase();
  const filters = {};

  if (lower.includes("palindromic")) {
    filters.is_palindrome = true;
  }

  if (lower.includes("single word") || lower.includes("one word")) {
    filters.word_count = 1;
  }

  const matchLength = lower.match(/longer than (\d+)/);
  if (matchLength) {
    filters.min_length = parseInt(matchLength[1]) + 1;
  }

  const matchContains = lower.match(/containing the letter (\w)/);
  if (matchContains) {
    filters.contains_character = matchContains[1];
  }

  return Object.keys(filters).length ? filters : null;
}

// GET /strings/filter-by-natural-language - Filter using natural language
app.get(
  "/strings/filter-by-natural-language",
  asynchandler(async (req, res) => {
    const { query } = req.query;
    if (!query) {
      return res.status(400).json({ error: "Query is required" });
    }

    const parsedFilters = interpretQuery(query);

    if (!parsedFilters) {
      return res
        .status(400)
        .json({ error: "Unable to parse natural language query" });
    }

    let results = Array.from(analyzedString.values());

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

    res.json({
      data: results,
      count: results.length,
      interpreted_query: {
        original: query,
        parsed_filters: parsedFilters,
      },
    });
  })
);

// Get a specific string
app.get(
  "/strings/:string_value",
  asynchandler(async (req, res) => {
    const { string_value } = req.params;
    const hash = generateHash(string_value);

    if (analyzedString.has(hash)) {
      return res.status(200).json(analyzedString.get(hash));
    }

    return res.status(404).json({
      error: "Not Found",
      message: "String does not exist in the system",
    });
  })
);

// GET /strings - Get all stored strings with filtering
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

    // Validate query parameters
    const filters = {};
    const errors = [];

    //validate is_palindrome
    if (is_palindrome !== undefined) {
      if (is_palindrome !== "true" && is_palindrome !== "false") {
        errors.push("is_palindrome must be true or false");
      } else {
        filters.is_palindrome = is_palindrome === "true";
      }
    }

    //validate min_length
    if (min_length !== undefined) {
      const minlen = parseInt(min_length, 10);
      if (isNaN(minlen) || minlen < 0) {
        // if "abc" or -1
        errors.push("Minlength must not be a negative number");
      } else {
        filters.min_length = minlen;
      }
    }

    //validate max_length
    if (max_length !== undefined) {
      const maxlen = parseInt(max_length, 10);
      if (isNaN(maxlen) || maxlen < 0) {
        errors.push("Maxlength must not be a negative number");
      } else {
        filters.max_length = maxlen;
      }
    }

    //validate word_count
    if (word_count !== undefined) {
      const wc = parseInt(word_count, 10);
      if (isNaN(wc) || wc < 0) {
        errors.push("Wordcount must not be a negative number");
      } else {
        filters.word_count = wc;
      }
    }

    // validate contains_character
    if (contains_character !== undefined) {
      if (
        typeof contains_character !== "string" ||
        contains_character.length !== 1
      ) {
        errors.push("contains_character must be a single character");
      } else {
        filters.contains_character = contains_character;
      }
    }

    // Check for min/max length conflict
    if (filters.min_length !== undefined && filters.max_length !== undefined) {
      if (filters.min_length > filters.max_length) {
        errors.push("min_length cannot be greater than max_length");
      }
    }

    // Return validation errors
    if (errors > 0) {
      res.status(400).json({
        error: "Bad Request",
        message: "Invalid query parameter values",
        details: errors,
      });
    }

    // Get all strings and apply filters
    let filteredStrings = Array.from(analyzedString.values());

    //Filter by palindrome status
    if (filters.is_palindrome !== undefined) {
      filteredStrings = filteredStrings.filter(
        (item) => item.properties.is_palindrome === filters.is_palindrome
      );
    }

    //filter by min_length
    if (filters.min_length !== undefined) {
      filteredStrings = filteredStrings.filter(
        (item) => item.properties.length >= filters.min_length
      );
    }

    //filter by max_length
    if (filters.max_length !== undefined) {
      filteredStrings = filteredStrings.filter(
        (item) => item.properties.length <= filters.max_length
      );
    }

    //filter by word_count
    if (filters.word_count !== undefined) {
      filteredStrings = filteredStrings.filter(
        (item) => item.properties.word_count === filters.word_count
      );
    }

    //filter by contain_character
    if (filters.contains_character !== undefined) {
      filteredStrings = filteredStrings.filter((item) =>
        item.value.includes(filters.contains_character)
      );
    }

    res.json({
      data: filteredStrings,
      count: filteredStrings.length,
      filters_applied: filters,
    });
  })
);

//Delete specified string
app.delete(
  "/strings/:string_value",
  asynchandler(async (req, res) => {
    const { string_value } = req.params;
    const hash = generateHash(string_value);
    if (analyzedString.has(hash)) {
      analyzedString.delete(hash);
      res.status(204).json({
        message: "String has been deleted from memory",
      });
    } else {
      res.status(404).json({
        error: "Not Found",
        message: "String does not exist in the system",
      });
    }
  })
);

// Global error handler
app.use((err, req, res, next) => {
  console.error("Unhandled error:", err.stack);
  res
    .status(500)
    .json({ error: "Internal Server Error", message: err.message });
});

app.listen(PORT, () => {
  console.log(`Server is running at port: ${PORT}`);
});
