// Backend API Configuration
// 
// DEPLOYMENT INSTRUCTIONS:
// 1. For local testing: Keep BASE_URL as 'http://localhost:3000'
// 2. For production: Update PRODUCTION_URL to your deployed backend URL
// 3. For physical device testing: Update LOCAL_IP to your computer's IP address
//
// Platform-specific URLs:
// - iOS Simulator: use 'localhost' or '127.0.0.1'
// - Android Emulator: use '10.0.2.2' (special Android localhost)
// - Physical Device: use your computer's local IP (e.g., '192.168.1.x')

export const API_CONFIG = {
  // ⚠️ UPDATE THIS FOR PRODUCTION DEPLOYMENT
  PRODUCTION_URL: 'https://your-backend-url.com',  // TODO: Replace with actual deployed backend URL
  
  // Local development URLs
  LOCAL_URL: 'http://localhost:3000',
  ANDROID_EMULATOR_URL: 'http://10.0.2.2:3000',
  
  // ⚠️ UPDATE THIS when testing on physical device
  // Find your IP: Run 'ipconfig getifaddr en0' on Mac or 'ipconfig' on Windows
  LOCAL_IP_URL: 'http://192.168.1.x:3000',  // TODO: Replace x with your actual IP
  
  // Automatically select the right URL
  BASE_URL: __DEV__ 
    ? 'http://localhost:3000'  // Development mode
    : 'https://your-backend-url.com',  // Production mode (update this!)
  
  // API Endpoints
  ENDPOINTS: {
    CHAT: '/chat',
    HEALTH: '/api/chat/health',
    NEWS: '/api/full-news',
    EVENTS: '/api/events',
    ROOMS: '/api/chat/rooms',
    STATS: '/api/chat/stats',
  }
};

// Helper to get the correct base URL based on platform and environment
export const getBaseUrl = () => {
  return API_CONFIG.BASE_URL;
};
