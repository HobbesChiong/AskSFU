# AskSFU

AskSFU is a mobile application designed for Simon Fraser University students to ask questions about courses, clubs, schedules, and faculty using AI. 

## 🚀 Getting Started

To run this application locally, you'll need to run both the Node.js backend server and the Expo React Native frontend.

### Prerequisites
- Node.js (v18+)
- npm or yarn
- An OpenAI API Key

---

## 1. Running the Backend 🛠️

The backend handles the AI routing, web scraping, vector similarity searches, and course integrations. You must have this running for the chatbot to work.

1. **Navigate to the backend directory:**
   ```bash
   cd backend
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Set up the Environment Variables:**
   Create a `.env` file in the `backend` directory and add your keys:
   ```env
   OPENAI_API_KEY=your_openai_api_key_here
   PORT=3000
   ```

4. **Start the Server:**
   ```bash
   node server.mjs
   ```
   
   The server will start running at `http://localhost:3000`. Leave this terminal running window open!

---

## 2. Running the Frontend 📱

The frontend is built using React Native and Expo. You'll need a separate terminal window to run it alongside your backend.

1. **Open a new terminal and navigate to the project root directory (`my-app`):**
   ```bash
   cd my-app
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Start the Expo Bundler:**
   ```bash
   npx expo start
   ```

4. **Launch the App:**
   - **iOS Simulator:** Press `i` in the terminal.
   - **Android Emulator:** Press `a` in the terminal.
   - **Physical Device:** Download the "Expo Go" app on your phone and scan the QR code displayed in your terminal.
   
> **Note for Physical Devices**: If you are testing on a real phone via Expo Go, the app will try to connect to the backend at `localhost`. You will need to update the `API_CONFIG.BASE_URL` or `API_CONFIG.ANDROID_EMULATOR_URL` inside your frontend code (typically in `constants/api.ts` or `API_CONFIG`) to your computer's local Wi-Fi IP address (e.g., `http://192.168.1.5:3000`) for the requests to succeed.

---

## Technical Highlights
- **AI Chatbot**: Talk with a helpful SFU Academic Advisor AI backed by OpenAI's `gpt-4o-mini` and `gpt-3.5-turbo` APIs.
- **Image Recognition**: Upload screenshots of course schedules directly in the chat to extract class sections accurately.
- **RAG Architecture**: The backend indexes live SFU club databases, news pages, and course configurations using LangChain.