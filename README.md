# String Analyzer API

A powerful RESTful API service that analyzes strings and provides detailed information including length, palindrome status, word count, character frequency, and SHA-256 hash. Features natural language query support for intuitive filtering.

## 🚀 Features

- **String Analysis**: Complete breakdown of any input string
- **SHA-256 Hashing**: Unique identification for each string
- **Palindrome Detection**: Case-insensitive palindrome checking
- **Character Frequency Mapping**: Detailed character occurrence tracking
- **Natural Language Queries**: Filter strings using plain English
- **Advanced Filtering**: Multiple filter parameters for precise searches
- **In-Memory Storage**: Fast access with Map-based storage

## 📋 Prerequisites

Before you begin, ensure you have the following installed:

- **Node.js** (version 14.x or higher)
- **npm** (Node Package Manager, comes with Node.js)

Check your versions:
```bash
node --version
npm --version
```

## 📦 Dependencies

This project uses the following npm packages:

| Package | Version | Purpose |
|---------|---------|---------|
| `express` | ^4.18.0 | Web framework for Node.js |
| `express-async-handler` | ^1.2.0 | Async error handling middleware |
| `cors` | ^2.8.5 | Enable CORS for cross-origin requests |
| `dotenv` | ^16.0.0 | Environment variable management |
| `crypto` | Built-in | SHA-256 hashing (Node.js native module) |

## 🛠️ Installation & Setup

### Step 1: Clone or Download the Project

```bash
# If using git
git clone <your-repository-url>
cd string-analyzer-api

# Or download and extract the ZIP file
```

### Step 2: Install Dependencies

```bash
npm install
```

This will install all required packages listed in `package.json`:
- express
- express-async-handler
- cors
- dotenv

### Step 3: Create Environment File

Create a `.env` file in the project root directory:

```bash
touch .env
```

Add the following content to `.env`:

```env
PORT=8000
```

**Note**: The port defaults to 8000 if not specified.

### Step 4: Verify Project Structure

Your project should look like this:

```
string-analyzer-api/
├── index.js              # Main application file
├── package.json          # Project dependencies
├── .env                  # Environment variables
├── .gitignore           # Git ignore file
└── README.md            # This file
```

## 🚀 Running the Application

### Development Mode

Start the server:

```bash
node index.js
```

You should see:
```
Server is running at port: 8000
```

### Using nodemon (Recommended for Development)

For auto-restart on file changes:

```bash
# Install nodemon globally (one-time)
npm install -g nodemon

# Run with nodemon
nodemon index.js
```

## 📚 API Endpoints

### 1. Create/Analyze String

**POST** `/strings`

Analyzes a string and stores it in memory.

**Request Body:**
```json
{
  "value": "racecar"
}
```

**Success Response (201):**
```json
{
  "id": "abc123...",
  "value": "racecar",
  "properties": {
    "length": 7,
    "is_palindrome": true,
    "unique_characters": 4,
    "word_count": 1,
    "sha256_hash": "abc123...",
    "character_frequency_map": {
      "r": 2,
      "a": 2,
      "c": 2,
      "e": 1
    },
    "created_at": "2025-10-23T10:00:00.000Z"
  }
}
```

**Error Responses:**
- `400`: Missing value field
- `422`: Value is not a string
- `409`: String already exists

---

### 2. Get All Strings (with Filtering)

**GET** `/strings`

Retrieves all strings with optional filters.

**Query Parameters:**
- `is_palindrome` (boolean): `true` or `false`
- `min_length` (integer): Minimum string length
- `max_length` (integer): Maximum string length
- `word_count` (integer): Exact word count
- `contains_character` (string): Single character to search for

**Examples:**

```bash
# Get all palindromes
curl "http://localhost:8000/strings?is_palindrome=true"

# Get strings between 5-20 characters with 2 words
curl "http://localhost:8000/strings?min_length=5&max_length=20&word_count=2"

# Get strings containing 'a'
curl "http://localhost:8000/strings?contains_character=a"
```

**Success Response (200):**
```json
{
  "data": [
    {
      "id": "hash1",
      "value": "string1",
      "properties": { "..." }
    }
  ],
  "count": 15,
  "filters_applied": {
    "is_palindrome": true,
    "min_length": 5
  }
}
```

---

### 3. Natural Language Query

**GET** `/strings/filter-by-natural-language`

Filter strings using plain English queries.

**Query Parameter:**
- `query` (string): Natural language query

**Supported Phrases:**
- `"palindromic strings"` → palindrome filter
- `"single word"` / `"one word"` → word_count=1
- `"longer than 10"` → min_length=11
- `"containing the letter z"` → contains_character=z

**Examples:**

```bash
# Find single-word palindromes
curl "http://localhost:8000/strings/filter-by-natural-language?query=single%20word%20palindromic%20strings"

# Find long strings
curl "http://localhost:8000/strings/filter-by-natural-language?query=strings%20longer%20than%2010"

# Find strings with specific letter
curl "http://localhost:8000/strings/filter-by-natural-language?query=containing%20the%20letter%20z"
```

**Success Response (200):**
```json
{
  "data": [...],
  "count": 3,
  "interpreted_query": {
    "original": "single word palindromic strings",
    "parsed_filters": {
      "word_count": 1,
      "is_palindrome": true
    }
  }
}
```

---

### 4. Get Specific String

**GET** `/strings/:string_value`

Retrieve a specific string by its value.

**Example:**

```bash
curl "http://localhost:8000/strings/racecar"
```

**Success Response (200):**
```json
{
  "id": "abc123...",
  "value": "racecar",
  "properties": { "..." }
}
```

**Error Response:**
- `404`: String not found

---

### 5. Delete String

**DELETE** `/strings/:string_value`

Delete a string from memory.

**Example:**

```bash
curl -X DELETE "http://localhost:8000/strings/racecar"
```

**Success Response (204):** No content

**Error Response:**
- `404`: String not found

## 🧪 Testing the API

### Using cURL

```bash
# Create a string
curl -X POST http://localhost:8000/strings \
  -H "Content-Type: application/json" \
  -d '{"value": "racecar"}'

# Get all strings
curl http://localhost:8000/strings

# Filter palindromes
curl "http://localhost:8000/strings?is_palindrome=true"

# Natural language query
curl "http://localhost:8000/strings/filter-by-natural-language?query=palindromic%20strings"

# Get specific string
curl http://localhost:8000/strings/racecar

# Delete string
curl -X DELETE http://localhost:8000/strings/racecar
```

### Using Postman or Insomnia

1. Import the API endpoints
2. Set base URL to `http://localhost:8000`
3. Test each endpoint with sample data

## 📝 Package.json Setup

Create or update your `package.json`:

```json
{
  "name": "string-analyzer-api",
  "version": "1.0.0",
  "description": "API service for analyzing and filtering strings",
  "main": "index.js",
  "type": "module",
  "scripts": {
    "start": "node index.js",
    "dev": "nodemon index.js"
  },
  "keywords": ["api", "string", "analyzer", "express"],
  "author": "Your Name",
  "license": "MIT",
  "dependencies": {
    "express": "^4.18.2",
    "express-async-handler": "^1.2.0",
    "cors": "^2.8.5",
    "dotenv": "^16.3.1"
  },
  "devDependencies": {
    "nodemon": "^3.0.1"
  }
}
```

## 🐛 Troubleshooting

### Port Already in Use

If port 8000 is already in use:

1. Change port in `.env` file:
   ```env
   PORT=3000
   ```

2. Or kill the process using port 8000:
   ```bash
   # On Mac/Linux
   lsof -ti:8000 | xargs kill -9
   
   # On Windows
   netstat -ano | findstr :8000
   taskkill /PID <PID> /F
   ```

### Module Not Found Errors

If you get import errors:

```bash
# Clear npm cache
npm cache clean --force

# Reinstall dependencies
rm -rf node_modules package-lock.json
npm install
```

### CORS Issues

If you encounter CORS errors, ensure `cors` is properly configured:

```javascript
app.use(cors());
```

## 🔒 Security Considerations

For production deployment:

1. **Add rate limiting**:
   ```bash
   npm install express-rate-limit
   ```

2. **Add helmet for security headers**:
   ```bash
   npm install helmet
   ```

3. **Use environment variables** for sensitive data

4. **Add input validation** middleware

5. **Implement authentication** for protected routes

## 📈 Future Enhancements

- [ ] Add database persistence (MongoDB/PostgreSQL)
- [ ] Implement pagination for large datasets
- [ ] Add user authentication and authorization
- [ ] Create comprehensive test suite (Jest/Mocha)
- [ ] Add API documentation with Swagger
- [ ] Implement caching for frequently queried strings
- [ ] Add bulk string analysis endpoint

## 🤝 Contributing

Contributions are welcome! Please follow these steps:

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Open a pull request

## 📄 License

This project is licensed under the MIT License.

## 📧 Support

For issues or questions:
- Open an issue on GitHub
- Contact: Emmanuelnwosu109@gmail.com
