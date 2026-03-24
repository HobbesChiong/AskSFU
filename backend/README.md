# Backend - SFU AI Chatbot by Manish

This folder contains the Node.js backend server that powers the AskSFU mobile app with AI capabilities.

**Developed by:** Manish Madishetty

## 🚀 Quick Start

### Prerequisites
- Node.js v18+
- OpenAI API key

### Installation

1. **Install dependencies:**
```bash
cd backend
npm install
```

2. **Create `.env` file:**
```bash
cp .env.example .env
```

3. **Add your OpenAI API key to `.env`:**
```
OPENAI_API_KEY=your-key-here
PORT=3000
```

4. **Start the server:**
```bash
node server.mjs
```

Server will run on `http://localhost:3000`

---

## 📡 API Endpoints

The frontend is already configured to use these endpoints:

- `POST /chat` - Main chat endpoint
- `GET /api/chat/health` - Health check
- `GET /api/full-news` - SFU news
- `GET /api/events` - SFU events
- WebSocket support on port 3000

---

## 🎯 Features

### **Data Sources:**
- ✅ 100+ SFU Computing Science professors
- ✅ 133 SFU clubs with smart search
- ✅ CMPT course catalogs (2025 Spring/Summer/Fall)
- ✅ Program requirements (CS Major/Minor)
- ✅ SFU news and events

### **AI Technology:**
- ✅ LangChain RAG (Retrieval Augmented Generation)
- ✅ OpenAI GPT-3.5-turbo-16k
- ✅ Vector embeddings for semantic search
- ✅ Real-time web scraping with Puppeteer

---

## 📚 Documentation

- **`BACKEND_INTEGRATION.md`** - Complete API documentation
- **`DEPLOYMENT_GUIDE.md`** - Production deployment guide

---

## 🧪 Testing

Test the backend is working:
```bash
curl http://localhost:3000/api/chat/health
```

Test chat endpoint:
```bash
curl -X POST http://localhost:3000/chat \
  -H "Content-Type: application/json" \
  -d '{"message": "Tell me about professors"}'
```

---

## 🔒 Security

- Never commit `.env` file to Git
- Keep your OpenAI API key private
- `.env.example` is the template (no real keys)

---

## 👨‍💻 Developer

**Manish Madishetty**
- Backend architecture and implementation
- LangChain RAG system integration
- SFU data scraping and indexing
