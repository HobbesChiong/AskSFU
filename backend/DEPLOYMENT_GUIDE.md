# SFU AI Chatbot - Deployment Guide

## 📦 Files to Push to GitHub

### **Backend Repository Files**

Push these files from `/Users/manishmadishetty/Desktop/sfu/`:

```
✅ server.mjs                    # Main backend server (2,578 lines)
✅ package.json                  # Node.js dependencies
✅ package-lock.json             # Locked dependency versions
✅ .env.example                  # Environment variable template
✅ .gitignore                    # Git ignore file
✅ BACKEND_INTEGRATION.md        # Integration documentation
✅ DEPLOYMENT_GUIDE.md           # This file
```

**Optional Python files** (if needed):
```
⚪ sfu_scraper.py                # Python Flask scraper
⚪ app.py                        # Alternative Flask server
⚪ requirements.txt              # Python dependencies
```

### **Frontend Repository Files**

The frontend developer needs to pull/merge these modified files:

```
✅ constants/api.ts              # API configuration (NEW)
✅ app/chatbot.tsx               # Modified with backend integration
```

---

## 🚀 Step-by-Step Deployment

### **Option 1: Push Backend to New GitHub Repo**

```bash
cd /Users/manishmadishetty/Desktop/sfu

# Initialize git (if not already done)
git init

# Add backend files only
git add server.mjs package.json package-lock.json .env.example .gitignore BACKEND_INTEGRATION.md DEPLOYMENT_GUIDE.md

# Commit
git commit -m "Add SFU AI Chatbot backend with LangChain integration"

# Create a new repo on GitHub, then:
git remote add origin https://github.com/YOUR_USERNAME/sfu-backend.git
git branch -M main
git push -u origin main
```

### **Option 2: Push to Frontend Developer's Repo**

If you want to add backend to their existing repo:

```bash
cd /Users/manishmadishetty/Desktop/sfu/frontend-asksfu

# Create a backend folder
mkdir backend
cp ../server.mjs backend/
cp ../package.json backend/
cp ../package-lock.json backend/
cp ../.env.example backend/
cp ../BACKEND_INTEGRATION.md backend/

# Commit the changes
git add .
git commit -m "Add backend integration and API configuration"
git push origin main
```

---

## 🔗 Frontend Integration Steps

### **For the Frontend Developer:**

1. **Pull the latest changes** (if you pushed to their repo):
```bash
git pull origin main
```

2. **Install backend dependencies**:
```bash
cd backend
npm install
```

3. **Create `.env` file**:
```bash
cp .env.example .env
# Edit .env and add your OpenAI API key
```

4. **Start the backend**:
```bash
node server.mjs
```

5. **In a new terminal, start the frontend**:
```bash
cd ..  # Back to root
npm install
npm run web  # or npm run ios / npm run android
```

---

## 🌐 Production Deployment

### **Backend Deployment Options:**

#### **Option 1: Heroku**
```bash
# Install Heroku CLI, then:
heroku create sfu-chatbot-backend
heroku config:set OPENAI_API_KEY=your-key-here
git push heroku main
```

#### **Option 2: Railway**
1. Go to https://railway.app
2. Connect your GitHub repo
3. Add environment variable: `OPENAI_API_KEY`
4. Deploy automatically

#### **Option 3: Render**
1. Go to https://render.com
2. Create new Web Service
3. Connect GitHub repo
4. Add environment variable: `OPENAI_API_KEY`
5. Deploy

#### **Option 4: DigitalOcean/AWS/Google Cloud**
- Deploy as a Node.js application
- Set environment variables
- Ensure port 3000 is accessible

### **Update Frontend After Backend Deployment:**

Once backend is deployed, update `constants/api.ts`:

```typescript
export const API_CONFIG = {
  PRODUCTION_URL: 'https://your-actual-backend-url.com',  // ⚠️ UPDATE THIS
  
  BASE_URL: __DEV__ 
    ? 'http://localhost:3000'
    : 'https://your-actual-backend-url.com',  // ⚠️ UPDATE THIS
  
  // ... rest of config
};
```

---

## 🔒 Security Checklist

Before pushing to GitHub:

- ✅ `.env` is in `.gitignore` (already done)
- ✅ `.env.example` has no real API keys (already done)
- ✅ No hardcoded API keys in code
- ✅ CORS is configured properly
- ⚠️ Add rate limiting for production
- ⚠️ Add authentication if needed

---

## 🧪 Testing the Integration

### **1. Test Backend Health:**
```bash
curl http://localhost:3000/api/chat/health
```

Expected response:
```json
{
  "status": "healthy",
  "activeConnections": 0,
  "activeRooms": 5,
  "timestamp": "2026-03-24T..."
}
```

### **2. Test Chat Endpoint:**
```bash
curl -X POST http://localhost:3000/chat \
  -H "Content-Type: application/json" \
  -d '{"message": "Tell me about computing science professors"}'
```

### **3. Test from Frontend:**
- Start backend: `node server.mjs`
- Start frontend: `npm run web`
- Type a message in the chat
- Should get AI response from your backend

---

## 📱 Mobile Testing

### **iOS Simulator:**
- Uses `http://localhost:3000`
- Should work immediately

### **Android Emulator:**
- Uses `http://10.0.2.2:3000`
- Already configured in `constants/api.ts`

### **Physical Device:**
1. Find your computer's IP:
```bash
# Mac:
ipconfig getifaddr en0

# Windows:
ipconfig
```

2. Update `constants/api.ts`:
```typescript
LOCAL_IP_URL: 'http://YOUR_IP:3000',
```

3. Update `getAIResponse` in `chatbot.tsx` to use `LOCAL_IP_URL` for physical devices

---

## 🐛 Troubleshooting

### **Backend won't start:**
```bash
# Check if port 3000 is in use
lsof -i :3000

# Kill existing process
lsof -ti:3000 | xargs kill -9
```

### **Frontend can't connect:**
- Ensure backend is running
- Check the URL in `constants/api.ts`
- For physical devices, use your computer's IP
- Check firewall settings

### **CORS errors:**
- Backend already has CORS enabled
- If issues persist, check browser console

### **OpenAI API errors:**
- Verify API key in `.env`
- Check API key has credits
- Ensure no rate limiting

---

## 📞 Support

For integration issues:
- Backend: Check `BACKEND_INTEGRATION.md`
- API Docs: See endpoint documentation in `BACKEND_INTEGRATION.md`
- Deployment: Follow this guide

---

## 🎯 Quick Commands Reference

```bash
# Backend
cd /Users/manishmadishetty/Desktop/sfu
node server.mjs

# Frontend
cd /Users/manishmadishetty/Desktop/sfu/frontend-asksfu
npm install
npm run web      # Web version
npm run ios      # iOS simulator
npm run android  # Android emulator

# Test backend
curl http://localhost:3000/api/chat/health

# Find your IP (for physical device testing)
ipconfig getifaddr en0  # Mac
ipconfig                # Windows
```
