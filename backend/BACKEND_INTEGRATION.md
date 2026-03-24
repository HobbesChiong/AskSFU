# SFU AI Chatbot - Backend Integration Guide

## 🚀 Quick Start

### Prerequisites
- Node.js v18+ 
- npm or yarn
- OpenAI API key

### Installation

1. Install dependencies:
```bash
npm install
```

2. Create `.env` file:
```bash
cp .env.example .env
```

3. Add your OpenAI API key to `.env`:
```
OPENAI_API_KEY=your-actual-key-here
PORT=3000
```

4. Start the server:
```bash
npm start
# or
node server.mjs
```

Server will run on `http://localhost:3000`

---

## 📡 API Endpoints

### 1. **Chat Endpoint (HTTP)**
```http
POST http://localhost:3000/chat
Content-Type: application/json

{
  "message": "Tell me about computing science professors",
  "sessionId": "user-123" // optional
}
```

**Response:**
```json
{
  "response": "Here are some Computing Science professors at SFU...",
  "source": "https://www.sfu.ca/..."
}
```

### 2. **WebSocket Chat (Streaming)**
```javascript
const ws = new WebSocket('ws://localhost:3000');

ws.onopen = () => {
  ws.send(JSON.stringify({
    type: 'chat',
    message: 'What clubs are available?',
    sessionId: 'user-123'
  }));
};

ws.onmessage = (event) => {
  const data = JSON.parse(event.data);
  if (data.type === 'message') {
    console.log(data.content); // Streamed response
  }
};
```

### 3. **Health Check**
```http
GET http://localhost:3000/api/chat/health
```

**Response:**
```json
{
  "status": "healthy",
  "activeConnections": 0,
  "activeRooms": 5,
  "timestamp": "2026-03-24T18:59:49.330Z"
}
```

### 4. **News**
```http
GET http://localhost:3000/api/full-news
```

**Response:**
```json
{
  "news": "<HTML content with news articles>"
}
```

### 5. **Events**
```http
GET http://localhost:3000/api/events
```

**Response:**
```json
{
  "events": "<HTML content with event listings>"
}
```

### 6. **Chat Rooms**
```http
GET http://localhost:3000/api/chat/rooms
```

**Response:**
```json
{
  "rooms": [
    {
      "id": "general",
      "name": "General Discussion",
      "description": "...",
      "userCount": 5,
      "recentActivity": 1234567890
    }
  ]
}
```

### 7. **Chat Statistics**
```http
GET http://localhost:3000/api/chat/stats
```

---

## 🎯 Features

### What the Backend Provides:
- ✅ **AI-powered chat** using OpenAI GPT-3.5-turbo
- ✅ **RAG (Retrieval Augmented Generation)** with LangChain
- ✅ **Professor/Faculty lookup** - 100+ CS faculty members
- ✅ **Club recommendations** - 133 SFU clubs with smart search
- ✅ **Course information** - CMPT courses and outlines
- ✅ **Real-time news** - SFU news scraping
- ✅ **Events** - SFU events information
- ✅ **WebSocket support** - Streaming responses
- ✅ **Session management** - Chat history tracking

### Data Sources:
- SFU Computing Science faculty directory
- SFU course catalogs (2025 Spring/Summer/Fall)
- SFU club listings
- Program requirements (CS Major/Minor)
- Academic integrity resources
- SFU news and events

---

## 🔧 CORS Configuration

The backend has CORS enabled for all origins. If you need to restrict it:

```javascript
// In server.mjs, modify:
app.use(cors({
  origin: 'https://your-frontend-domain.com'
}));
```

---

## 📝 Example Frontend Integration

### React Example:
```javascript
import { useState } from 'react';

function ChatComponent() {
  const [message, setMessage] = useState('');
  const [response, setResponse] = useState('');

  const sendMessage = async () => {
    const res = await fetch('http://localhost:3000/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message })
    });
    const data = await res.json();
    setResponse(data.response);
  };

  return (
    <div>
      <input 
        value={message} 
        onChange={(e) => setMessage(e.target.value)} 
      />
      <button onClick={sendMessage}>Send</button>
      <div dangerouslySetInnerHTML={{ __html: response }} />
    </div>
  );
}
```

### WebSocket Example:
```javascript
const ws = new WebSocket('ws://localhost:3000');

ws.onopen = () => {
  console.log('Connected to chat server');
};

ws.onmessage = (event) => {
  const data = JSON.parse(event.data);
  
  switch(data.type) {
    case 'typing':
      // Show typing indicator
      break;
    case 'message':
      // Display message content
      console.log(data.content);
      break;
    case 'error':
      // Handle error
      break;
  }
};

// Send message
ws.send(JSON.stringify({
  type: 'chat',
  message: 'Your question here',
  sessionId: 'unique-session-id'
}));
```

---

## 🐛 Troubleshooting

### Server won't start:
```bash
# Check if port 3000 is in use
lsof -i :3000

# Kill existing process
lsof -ti:3000 | xargs kill -9
```

### Missing dependencies:
```bash
npm install
```

### OpenAI API errors:
- Verify your API key in `.env`
- Check API key has credits
- Ensure no rate limiting

---

## 📚 Dependencies

### Main Dependencies:
- `express` - Web server
- `@langchain/openai` - LangChain OpenAI integration
- `langchain` - RAG framework
- `openai` - OpenAI SDK
- `ws` - WebSocket support
- `puppeteer` - Web scraping
- `cheerio` - HTML parsing
- `axios` - HTTP client
- `dotenv` - Environment variables
- `cors` - CORS middleware

---

## 🔒 Security Notes

- Never commit `.env` file to git
- Keep your OpenAI API key secret
- Use environment variables for sensitive data
- Consider rate limiting for production
- Validate user inputs

---

## 📞 Support

For issues or questions about the backend integration, contact the backend developer.
