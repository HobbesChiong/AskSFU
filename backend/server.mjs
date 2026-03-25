import dotenv from 'dotenv';
import express from 'express';
import cors from 'cors';
import { OpenAI } from 'openai';
import axios from 'axios';
import * as cheerio from 'cheerio';
import { CheerioWebBaseLoader } from "@langchain/community/document_loaders/web/cheerio";
import { Document } from "langchain/document";
import { RecursiveCharacterTextSplitter } from "langchain/text_splitter";
import { OpenAIEmbeddings, ChatOpenAI } from "@langchain/openai";
import { MemoryVectorStore } from "langchain/vectorstores/memory";
import { createRetrievalChain } from "langchain/chains/retrieval";
import { createStuffDocumentsChain } from "langchain/chains/combine_documents";
import { ChatPromptTemplate } from "@langchain/core/prompts";
import puppeteer from 'puppeteer';
import { createServer } from 'http';
import { WebSocketServer } from 'ws';

// Club finding functionality (integrated from sfu_scraper.py)
const SFU_CLUBS = [
  "350 - SFU", "Accounting Student Association - SFU", "Ace SFU", "Afghanistan Student Union",
  "Ahmadiyya Muslim Student Association (AMSA)", "AIESEC", "ALAS (Association of Latin American Students)",
  "Anime Club - SFU", "Arab Students' Association", "Ascend Leadership", "Astronomy Club - SFU",
  "Backpacking Club", "Bangladesh Students' Alliance", "Bhangra - SFU", "Bowling 300", "BRASA SFU",
  "Burnaby Mountain Toastmasters", "Campus Association of Baha'i Studies", "Campus Vibe for Christ",
  "Canadian Cancer Society - SFU", "Canadian Liver Foundation SFU", "Canadianized Asian Club (CAC)",
  "CaseIT", "Chess Club - SFU", "Choir - SFU", "Christian Leadership Initiative - SFU",
  "Christian Students @ SFU", "Concert Orchestra - SFU", "Debate Society", "Developers & Systems Club",
  "Dodo Club", "EAT!SFU", "Enactus SFU", "Engineers Without Borders - SFU Chapter",
  "Ethiopian & Eritrean Students Association", "Evangelical Chinese Bible Fellowship (ECBF)",
  "Exercise is Medicine SFU", "Filipino Students Association", "Finance Student Association (FINSA)",
  "Game Developers Club", "Giddha - SFU", "Google Developer Student Club - SFU", "Hanvoice SFU",
  "Hiking Club", "Hillel Jewish Students Association", "Hip Hop Club - SFU", "Hong Kong Society (HKS)",
  "Human Resources Student Association", "Indian Student Federation (ISF)", "Indoor Climbing Club",
  "Iranian Club - SFU", "Ismaili Students Association", "Japanese Network - SFU", "Jazz Band - Simon Fraser",
  "JDC West - SFU", "Korean Storm (K.STORM)", "Latin Dance Passion - SFU", "Love Your Neighbour Club",
  "Malaysia Singapore Students Club", "Management Information Systems Association",
  "Model United Nations - SFU", "Music Discussion Club", "Muslim Students Association",
  "NeuraXtension", "Operation Smile SFU", "Outdoors Club - SFU", "Pakistan Students Association",
  "Palestinian Youth Movement (PYM SFU)", "Phi Delta Epsilon", "Power to Change (P2C)",
  "Pre-Law Society - SFU", "Pre-Med Society - SFU", "Pre-Vet & Animal Wellness Club",
  "Provincial BC Conservatives", "Punjabi Student Association - SFU", "Reclaim Tech",
  "Rock Music Club", "SFU Artists", "SFU ASL Club", "SFU Befikre Dance Team", "SFU Blood, Organ, and Stem Cell Club",
  "SFU Cybersecurity Club", "SFU Dragon Boat", "SFU Esports Association", "SFU First Responders",
  "SFU Foodie Club", "SFU Golf Club", "SFU Hanfu Culture Society", "SFU Hindu Yuva", "SFU Magic the Gathering Club (MTG)",
  "SFU Mechanical Keyboards Club", "SFU OS Development", "SFU Peak Frequency", "SFU Pokemon Go Official Group",
  "SFU Robotics Club", "SFU Sports Analytics Club", "SFU Swifties", "SFU Thaqalyn Muslim Association",
  "SFU Transit Enthusiasts Club (SFU TEC)", "Sikh Students' Association - SFU", "Simon Fraser Investment Club",
  "Ski and Snowboard Club", "Smash Club", "Speech and Hearing Club", "STEM Fellowship", "Student Marketing Association",
  "Taiwanese Association - SFU", "Team Phantom: SFU Formula SAE Electric",
  "The FentaNIL Project at SFU (TFP)", "UNICEF - SFU", "University Bible Fellowship",
  "University Christian Ministries", "UPhoto Photography Club", "Vietnamese Student Association",
  "Women in Clean Tech", "Women In Engineering", "Women in STEM", "Young Women in Business SFU"
];

const CLUB_KEYWORDS = {
  // Tech & Programming
  "coding": ["developers", "google developer", "cybersecurity", "programming", "software", "game development", "AI", "competitive programming"],
  "programming": ["developers", "google developer", "coding", "software", "hacking", "AI", "competitive programming"],
  "developer": ["developers", "google developer", "cybersecurity", "software", "app development", "game development"],
  "cybersecurity": ["hacking", "security", "privacy", "ethical hacking", "developers"],
  "game development": ["game developers", "game design", "game programming", "gamedev"],
  "AI": ["machine learning", "deep learning", "data science", "neural networks", "quantum computing"],
  "data science": ["AI", "statistics", "machine learning", "big data"],

  // Business & Finance
  "business": ["beedie", "entrepreneurship", "finance", "marketing", "startups", "investment"],
  "entrepreneurship": ["business", "startups", "founders", "finance", "networking"],
  "marketing": ["business", "advertising", "social media", "branding"],
  "finance": ["investing", "stocks", "trading", "accounting", "investment", "financial literacy"],
  "investment": ["finance", "stocks", "equity", "venture capital", "real estate"],

  // Debating & Public Speaking
  "debating": ["debate", "public speaking", "model un", "argumentation", "toastmasters"],
  "debate": ["debating", "public speaking", "model un", "critical thinking"],
  "public speaking": ["debating", "toastmasters", "leadership", "speech", "presentation"],

  // Science & Engineering
  "robotics": ["engineering", "hardware", "electronics", "AI", "automation", "mechatronics"],
  "engineering": ["robotics", "civil", "mechanical", "electrical", "design", "aerospace", "rocket"],
  "quantum computing": ["AI", "machine learning", "data science", "physics", "computing"],
  "data analytics": ["finance", "business", "big data", "sports analytics", "statistics"],

  // Sports & Outdoor Activities
  "hiking": ["outdoors", "adventure", "camping", "trekking"],
  "climbing": ["rock climbing", "bouldering", "indoor climbing"],
  "badminton": ["racket sports", "tennis", "ping pong"],
  "skiing": ["snowboarding", "winter sports", "mountain sports"],
  "martial arts": ["taekwondo", "karate", "judo", "bjj", "self-defense"],
  "dragon boat": ["rowing", "paddling", "team sports"],

  // Culture & Arts
  "music": ["choir", "jazz", "orchestra", "rock music", "band"],
  "dance": ["bhangra", "giddha", "hip hop", "latin dance", "bollywood", "salsa", "bachata"],
  "photography": ["photo", "camera", "visual arts", "media"],
  "anime": ["manga", "cosplay", "animation", "japanese culture"],
  "writing": ["creative writing", "poetry", "literature", "novels"],
  "graphic novels": ["comics", "illustration", "visual storytelling"],

  // Social & Cultural
  "volunteering": ["charity", "fundraising", "service", "ngo", "awareness"],
  "sustainability": ["climate change", "environment", "green", "eco-friendly"],
  "politics": ["government", "activism", "policy", "conservative", "liberal", "ndp", "student government"],
  "women in stem": ["women in tech", "gender equality", "diversity", "women in engineering"],
  "mental health": ["stress-free", "happiness", "well-being", "mindfulness"],
  "religion": ["christian", "muslim", "hindu", "sikh", "buddhist"],
  "christian": ["bible", "faith", "jesus", "evangelical", "catholic"],
  "muslim": ["islam", "prayer", "quran", "msa"],
  "hindu": ["culture", "tradition", "festivals", "hindu yuva"],
  "sikh": ["gurdwara", "community", "seva"],
  "jewish": ["judaism", "hillel", "torah"],

  // Miscellaneous
  "gaming": ["esports", "smash", "pokemon go", "tabletop"],
  "technology": ["AI", "robotics", "cybersecurity", "quantum computing"],
  "food": ["foodie", "cuisine", "restaurants", "cooking"],
  "medicine": ["pre-med", "healthcare", "biology", "science"],
  "law": ["pre-law", "law school", "justice", "legal studies"]
};

function extractClubKeywords(query) {
  query = query.toLowerCase();
  query = query.replace(/[^a-zA-Z0-9\s]/g, "");  // Remove punctuation
  const keywords = query.split(" ");

  // Remove unnecessary words
  const stopwords = new Set(["is", "there", "a", "for", "club", "at", "sfu", "any", "do", "you", "have"]);
  const filteredKeywords = keywords.filter(word => !stopwords.has(word));

  return filteredKeywords;
}

function findClub(query) {
  const keywords = extractClubKeywords(query);
  const matchedClubs = new Set();
  
  // Check if user wants all clubs
  const wantsAllClubs = query.toLowerCase().includes('all') || 
                       query.toLowerCase().includes('list all') || 
                       query.toLowerCase().includes('every club') ||
                       query.toLowerCase().includes('complete list');

  // If they want all clubs, return the complete list
  if (wantsAllClubs) {
    const allClubsList = SFU_CLUBS.join("\n- ");
    return {
      match: true,
      message: `✅ Here is the complete list of all ${SFU_CLUBS.length} clubs at SFU:\n- ${allClubsList}\n\n🔗 For more details, visit: [SFU Club List](https://go.sfss.ca/clubs/list)`
    };
  }

  // Step 1: Direct Matching with Club Names
  for (const keyword of keywords) {
    for (const club of SFU_CLUBS) {
      if (club.toLowerCase().includes(keyword)) {
        matchedClubs.add(club);
      }
    }

    // Step 2: Check for Keywords in CLUB_KEYWORDS Dictionary
    if (CLUB_KEYWORDS[keyword]) {
      for (const related of CLUB_KEYWORDS[keyword]) {
        for (const club of SFU_CLUBS) {
          if (club.toLowerCase().includes(related)) {
            matchedClubs.add(club);
          }
        }
      }
    }
  }

  // Step 3: Fuzzy Matching for Backup (if no exact match found)
  if (matchedClubs.size === 0) {
    for (const keyword of keywords) {
      const closeMatches = getCloseMatches(keyword, SFU_CLUBS, 3, 0.6);
      closeMatches.forEach(match => matchedClubs.add(match));
    }
  }

  // Prepare the Final Response
  if (matchedClubs.size > 0) {
    const clubList = Array.from(matchedClubs).slice(0, 10).join("\n- "); // Increased from 3 to 10
    return {
      match: true,
      message: `✅ Here are some clubs related to **'${query}'** at SFU:\n- ${clubList}\n\nFor more clubs, visit: [SFU Club List](https://go.sfss.ca/clubs/list)`
    };
  }

  return {
    match: false,
    message: `❌ No exact match for '${query}', but you can check all clubs here: [SFU Club List](https://go.sfss.ca/clubs/list)`
  };
}


dotenv.config();

const app = express();
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Serve static files from the current directory
app.use(express.static("."));

// Create HTTP server and WebSocket server
const server = createServer(app);
const wss = new WebSocketServer({ server });

// WebSocket connection handling
wss.on('connection', (ws) => {
  console.log('New WebSocket connection established');
  
  ws.on('message', async (message) => {
    try {
      const data = JSON.parse(message);
      const { type, message: userMessage, sessionId = "default" } = data;
      
      if (type === 'chat') {
        await handleStreamingChat(ws, userMessage, sessionId);
      }
    } catch (error) {
      console.error('WebSocket message error:', error);
      ws.send(JSON.stringify({ type: 'error', message: 'Invalid message format' }));
    }
  });
  
  ws.on('close', () => {
    console.log('WebSocket connection closed');
  });
});

const CLUB_KEYWORDS_MAP = {
  // Tech & Programming
  "tech": ["developers", "google developer", "cybersecurity", "programming", "software", "game development", "AI", "competitive programming", "coding"],
  "coding": ["tech","developers", "google developer", "cybersecurity", "programming", "software", "game development", "AI", "competitive programming"],
  "programming": ["developers", "google developer", "coding", "software", "hacking", "AI", "competitive programming"],
  "developer": ["developers", "google developer", "cybersecurity", "software", "app development", "game development"],
  "cybersecurity": ["hacking", "security", "privacy", "ethical hacking", "developers"],
  "game development": ["game developers", "game design", "game programming", "gamedev"],
  "AI": ["machine learning", "deep learning", "data science", "neural networks", "quantum computing"],
  "data science": ["AI", "statistics", "machine learning", "big data"],

  // Business & Finance
  "business": ["beedie", "entrepreneurship", "finance", "marketing", "startups", "investment"],
  "entrepreneurship": ["business", "startups", "founders", "finance", "networking"],
  "marketing": ["business", "advertising", "social media", "branding"],
  "finance": ["investing", "stocks", "trading", "accounting", "investment", "financial literacy"],
  "investment": ["finance", "stocks", "equity", "venture capital", "real estate"],

  // Debating & Public Speaking
  "debating": ["debate", "public speaking", "model un", "argumentation", "toastmasters"],
  "debate": ["debating", "public speaking", "model un", "critical thinking"],
  "public speaking": ["debating", "toastmasters", "leadership", "speech", "presentation"],

  // Science & Engineering
  "robotics": ["engineering", "hardware", "electronics", "AI", "automation", "mechatronics"],
  "engineering": ["robotics", "civil", "mechanical", "electrical", "design", "aerospace", "rocket"],
  "quantum computing": ["AI", "machine learning", "data science", "physics", "computing"],
  "data analytics": ["finance", "business", "big data", "sports analytics", "statistics"],

  // Sports & Outdoor Activities
  "hiking": ["outdoors", "adventure", "camping", "trekking"],
  "climbing": ["rock climbing", "bouldering", "indoor climbing"],
  "badminton": ["racket sports", "tennis", "ping pong"],
  "skiing": ["snowboarding", "winter sports", "mountain sports"],
  "martial arts": ["taekwondo", "karate", "judo", "bjj", "self-defense"],
  "dragon boat": ["rowing", "paddling", "team sports"],

  // Culture & Arts
  "music": ["choir", "jazz", "orchestra", "rock music", "band"],
  "dance": ["bhangra", "giddha", "hip hop", "latin dance", "bollywood", "salsa", "bachata", "dancing", "dance team", "befikre"],
  "dancing": ["dance", "bhangra", "giddha", "hip hop", "latin dance", "bollywood", "salsa", "bachata", "dance team", "befikre"],
  "photography": ["photo", "camera", "visual arts", "media"],
  "anime": ["manga", "cosplay", "animation", "japanese culture"],
  "writing": ["creative writing", "poetry", "literature", "novels"],
  "graphic novels": ["comics", "illustration", "visual storytelling"],

  // Social & Cultural
  "volunteering": ["charity", "fundraising", "service", "ngo", "awareness"],
  "sustainability": ["climate change", "environment", "green", "eco-friendly"],
  "politics": ["government", "activism", "policy", "conservative", "liberal", "ndp", "student government"],
  "women in stem": ["women in tech", "gender equality", "diversity", "women in engineering"],
  "mental health": ["stress-free", "happiness", "well-being", "mindfulness"],
  "religion": ["christian", "muslim", "hindu", "sikh", "buddhist"],
  "christian": ["bible", "faith", "jesus", "evangelical", "catholic"],
  "muslim": ["islam", "prayer", "quran", "msa"],
  "hindu": ["culture", "tradition", "festivals", "hindu yuva"],
  "sikh": ["gurdwara", "community", "seva"],
  "jewish": ["judaism", "hillel", "torah"],

  // Miscellaneous
  "gaming": ["esports", "smash", "pokemon go", "tabletop"],
  "technology": ["AI", "robotics", "cybersecurity", "quantum computing"],
  "food": ["foodie", "cuisine", "restaurants", "cooking"],
  "medicine": ["pre-med", "healthcare", "biology", "science"],
  "law": ["pre-law", "law school", "justice", "legal studies"],
  "clubs": ["club", "organization", "society", "association", "group"]
};

// Fuzzy matching function (simple implementation)
function getCloseMatches(word, possibilities, n = 3, cutoff = 0.6) {
  const matches = [];
  for (const possibility of possibilities) {
    const similarity = calculateSimilarity(word.toLowerCase(), possibility.toLowerCase());
    if (similarity >= cutoff) {
      matches.push({ text: possibility, similarity });
    }
  }
  return matches
    .sort((a, b) => b.similarity - a.similarity)
    .slice(0, n)
    .map(match => match.text);
}

// Simple string similarity function
function calculateSimilarity(str1, str2) {
  const longer = str1.length > str2.length ? str1 : str2;
  const shorter = str1.length > str2.length ? str2 : str1;
  
  if (longer.length === 0) return 1.0;
  
  const distance = levenshteinDistance(longer, shorter);
  return (longer.length - distance) / longer.length;
}

// Levenshtein distance calculation
function levenshteinDistance(str1, str2) {
  const matrix = [];
  
  for (let i = 0; i <= str2.length; i++) {
    matrix[i] = [i];
  }
  
  for (let j = 0; j <= str1.length; j++) {
    matrix[0][j] = j;
  }
  
  for (let i = 1; i <= str2.length; i++) {
    for (let j = 1; j <= str1.length; j++) {
      if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1
        );
      }
    }
  }
  
  return matrix[str2.length][str1.length];
}

// Match clubs function
function matchClubs(query) {
  const keywords = extractClubKeywords(query);
  const matches = new Set();
  const exactMatches = new Set();

  // First, try exact keyword matches in club names
  for (const keyword of keywords) {
    for (const club of SFU_CLUBS) {
      if (club.toLowerCase().includes(keyword)) {
        exactMatches.add(club);
      }
    }
  }

  // Then try keyword mapping
  for (const keyword of keywords) {
    if (CLUB_KEYWORDS_MAP[keyword]) {
      for (const related of CLUB_KEYWORDS_MAP[keyword]) {
        for (const club of SFU_CLUBS) {
          if (club.toLowerCase().includes(related)) {
            matches.add(club);
          }
        }
      }
    }
  }

  // Combine exact matches with mapped matches, prioritizing exact matches
  const allMatches = [...exactMatches, ...matches];
  
  // If we have matches, return them
  if (allMatches.length > 0) {
    return allMatches;
  }

  // Fallback to fuzzy matching only if no matches found
  for (const keyword of keywords) {
    const close = getCloseMatches(keyword, SFU_CLUBS, 3, 0.6);
    close.forEach(match => matches.add(match));
  }

  return [...matches];
}

// NEW: /api/news endpoint to scrape SFU News
// app.get("/api/news", async (req, res) => {
//   try {
//     const { data } = await axios.get("https://www.sfu.ca/sfunews.html");
//     const $ = cheerio.load(data);

//     // 1. Convert all <img> src to absolute paths
//     $("img").each((i, el) => {
//       const src = $(el).attr("src");
//       if (src && !src.startsWith("http")) {
//         const absoluteUrl = new URL(src, "https://www.sfu.ca").toString();
//         $(el).attr("src", absoluteUrl);
//       }
//     });

//     // 2. Convert all <a> href to absolute paths
//     $("a").each((i, el) => {
//       const href = $(el).attr("href");
//       if (href && !href.startsWith("http")) {
//         const absoluteUrl = new URL(href, "https://www.sfu.ca").toString();
//         $(el).attr("href", absoluteUrl);
//       }
//     });

//     // 3. Now pick the .sfu-columns that has .show-date items
//     let newsHtml = "";
//     $(".sfu-columns").each((i, el) => {
//       const $col = $(el);
//       if ($col.find(".show-date").length > 0) {
//         newsHtml = $col.html();
//         return false;
//       }
//     });

//     res.json({ news: newsHtml });
//   } catch (error) {
//     console.error("Error scraping SFU News:", error);
//     res.status(500).json({ error: "Failed to scrape news" });
//   }
// });
app.get("/api/full-news", async (req, res) => {
  try {
    const browser = await puppeteer.launch({
      headless: "new",
      args: ["--no-sandbox", "--disable-setuid-sandbox"]
    });
    const page = await browser.newPage();

    await page.goto("https://www.sfu.ca/sfunews/stories/news.html", {
      waitUntil: "networkidle2"
    });

    // Click "Show All"
    await page.click("#cmp-dynamic-filter-show-all-button");
    await page.waitForSelector(".cmp-result-item", { timeout: 5000 });

    // Get full HTML after clicking
    const html = await page.content();

    const cheerio = await import("cheerio");
    const $ = cheerio.load(html);

    // Fix all relative <img> src attributes
    $("img").each((i, el) => {
      const src = $(el).attr("src");
      if (src && !src.startsWith("http")) {
        $(el).attr("src", "https://www.sfu.ca" + src);
      }
    });

    // Fix all relative <a> href attributes
    $("a").each((i, el) => {
      const href = $(el).attr("href");
      if (href && !href.startsWith("http")) {
        $(el).attr("href", "https://www.sfu.ca" + href);
      }
    });

    // Now extract all news blocks again
    const newsHTML = $(".cmp-result-item").map((i, el) => $.html(el)).get().join("");

    await browser.close();
    res.json({ news: newsHTML });
  } catch (err) {
    console.error("Error scraping full news:", err);
    res.status(500).json({ error: "Failed to scrape full news." });
  }
});

app.get("/api/events", async (req, res) => {
  try {
    const browser = await puppeteer.launch({
      headless: "new",
      args: ["--no-sandbox", "--disable-setuid-sandbox"]
    });
    const page = await browser.newPage();

    await page.goto("https://events.sfu.ca", {
      waitUntil: "networkidle2"
    });

    // Get full HTML after page loads
    const html = await page.content();

    const cheerio = await import("cheerio");
    const $ = cheerio.load(html);

    // Fix all relative <img> src attributes
    $("img").each((i, el) => {
      const src = $(el).attr("src");
      if (src && !src.startsWith("http")) {
        $(el).attr("src", "https://events.sfu.ca" + src);
      }
    });

    // Fix all relative <a> href attributes
    $("a").each((i, el) => {
      const href = $(el).attr("href");
      if (href && !href.startsWith("http")) {
        $(el).attr("href", "https://events.sfu.ca" + href);
      }
    });

    // Look for actual event content from the SFU events page
    let eventsHTML = "";
    
    // Try to find event links and extract proper event information
    const eventLinks = $("a[href*='/event/']");
    
    if (eventLinks.length > 0) {
      const events = [];
      const processedEvents = new Set(); // To avoid duplicates
      
      // Method 1: Look for event links directly and extract info from their parent containers
      eventLinks.each((i, el) => {
        if (events.length >= 6) return; // Limit to 6 events
        
        const $link = $(el);
        const href = $link.attr("href");
        const linkText = $link.text().trim();
        
        // Skip if already processed or invalid
        if (!href || processedEvents.has(href)) return;
        
        // Look for the parent container that holds the event info
        const $parent = $link.closest("div, article, section, li").first();
        
        // Try to find image within the parent container
        const $img = $parent.find("img").first();
        const imageUrl = $img.attr("src") || $img.attr("data-src") || $img.attr("data-lazy-src");
        
        // Extract event title - try multiple methods
        let eventTitle = "";
        
        // Try to get title from various elements
        const titleSelectors = ["h1", "h2", "h3", "h4", ".title", "[class*='title']", ".event-title"];
        for (const selector of titleSelectors) {
          const titleText = $parent.find(selector).first().text().trim();
          if (titleText && titleText.length > 3) {
            eventTitle = titleText;
            break;
          }
        }
        
        // Fallback to link text if no title found
        if (!eventTitle) {
          eventTitle = linkText;
        }
        
        // Clean up event titles
        if (eventTitle.includes("Event details for")) {
          const match = eventTitle.match(/event (.+?)$/i);
          if (match) {
            eventTitle = match[1].trim();
          }
        }
        
        // Try to find date
        const dateSelectors = [".date", ".time", "[class*='date']", "[class*='time']"];
        let dateText = "";
        for (const selector of dateSelectors) {
          const date = $parent.find(selector).first().text().trim();
          if (date && date.length > 3) {
            dateText = date;
            break;
          }
        }
        
        // Try to find category
        const categorySelectors = [".category", ".tag", "[class*='category']", "[class*='tag']"];
        let categoryText = "";
        for (const selector of categorySelectors) {
          const category = $parent.find(selector).first().text().trim();
          if (category && category.length > 2) {
            categoryText = category;
            break;
          }
        }
        
        // Only add if we have a valid title and haven't processed this event
        if (eventTitle && eventTitle.length > 3 && !processedEvents.has(href)) {
          processedEvents.add(href);
          events.push({
            title: eventTitle.length > 60 ? eventTitle.substring(0, 57) + "..." : eventTitle,
            link: href.startsWith("http") ? href : "https://events.sfu.ca" + href,
            date: dateText || "Upcoming",
            category: categoryText || "SFU Event",
            image: imageUrl ? (imageUrl.startsWith("http") ? imageUrl : "https://events.sfu.ca" + imageUrl) : null
          });
        }
      });
      
      // If we found events, use them with exact news page styling
      if (events.length > 0) {
        eventsHTML = events.map((event, index) => {
          // Use actual event image if available, otherwise use placeholder
          const fallbackImages = [
            'https://www.sfu.ca/content/dam/sfu/sfunews/2024/09/SFU-campus-aerial-view.jpg',
            'https://www.sfu.ca/content/dam/sfu/sfunews/2024/08/students-studying.jpg',
            'https://www.sfu.ca/content/dam/sfu/sfunews/2024/07/sfu-library.jpg',
            'https://www.sfu.ca/content/dam/sfu/sfunews/2024/06/sfu-convocation.jpg',
            'https://www.sfu.ca/content/dam/sfu/sfunews/2024/05/sfu-research.jpg'
          ];
          
          const imageUrl = event.image || fallbackImages[index % fallbackImages.length];
          
          return `<div class="cmp-result-item"><img src="${imageUrl}" alt="thumbnail image" loading="lazy" onerror="dynamicFilter.fallbackImg(this)"><div class="cmp-result-card-content"><div><p class="cmp-result-card-date">${event.date}</p></div><p class="cmp-result-card-title"><a href="${event.link}">${event.title}</a></p><div class="cmp-result-card-filters"><ul class="cmp-result-card-filter1"></ul><ul class="cmp-result-card-filter2 filled"><li><span class="filled">${event.category}</span></li></ul></div><p class="cmp-result-card-link"><a href="${event.link}">read more →</a></p></div></div>`;
        }).join("");
      }
    }
    
    // If no events found, use the fallback with card-based styling
    if (!eventsHTML) {
      const fallbackEvents = [
        {
          title: "Can I Call You Back?",
          link: "https://events.sfu.ca/event/45224-can-i-call-you-back",
          date: "Friday, September 26, 2025",
          category: "Arts & Culture",
          description: "Arts & Culture event at Audain Gallery. Presented by School for the Contemporary Arts."
        },
        {
          title: "Science Week of Welcome (WoW)",
          link: "https://events.sfu.ca",
          date: "Friday, September 26, 2025", 
          category: "Campus Life",
          description: "Campus Life event at SFU Burnaby Campus. Presented by Science Student Unions."
        },
        {
          title: "Student Orientation",
          link: "https://events.sfu.ca",
          date: "Ongoing",
          category: "Student Services",
          description: "Welcome new students to SFU with orientation activities and campus tours."
        },
        {
          title: "Research Symposium",
          link: "https://events.sfu.ca",
          date: "TBA",
          category: "Academic",
          description: "Showcase of student and faculty research projects across all disciplines."
        },
        {
          title: "Cultural Events",
          link: "https://events.sfu.ca",
          date: "Throughout the year",
          category: "Student Life",
          description: "Celebrate diversity with cultural events and activities organized by student groups."
        }
      ];

      const eventImages = [
        'https://www.sfu.ca/content/dam/sfu/sfunews/2024/09/SFU-campus-aerial-view.jpg',
        'https://www.sfu.ca/content/dam/sfu/sfunews/2024/08/students-studying.jpg',
        'https://www.sfu.ca/content/dam/sfu/sfunews/2024/07/sfu-library.jpg',
        'https://www.sfu.ca/content/dam/sfu/sfunews/2024/06/sfu-convocation.jpg',
        'https://www.sfu.ca/content/dam/sfu/sfunews/2024/05/sfu-research.jpg'
      ];

      eventsHTML = fallbackEvents.map((event, index) => {
        const imageUrl = eventImages[index % eventImages.length];
        
        return `<div class="cmp-result-item"><img src="${imageUrl}" alt="thumbnail image" loading="lazy" onerror="dynamicFilter.fallbackImg(this)"><div class="cmp-result-card-content"><div><p class="cmp-result-card-date">${event.date}</p></div><p class="cmp-result-card-title"><a href="${event.link}">${event.title}</a></p><div class="cmp-result-card-filters"><ul class="cmp-result-card-filter1"></ul><ul class="cmp-result-card-filter2 filled"><li><span class="filled">${event.category}</span></li></ul></div><p class="cmp-result-card-link"><a href="${event.link}">read more →</a></p></div></div>`;
      }).join("");
    }

    await browser.close();
    res.json({ events: eventsHTML });
  } catch (error) {
    console.error("Error fetching events:", error);
    res.json({
      events: `
        <div class="news-item">
          <h3><a href="https://events.sfu.ca" target="_blank">SFU Events</a></h3>
          <p class="news-date">Upcoming</p>
          <p class="news-summary">Visit the official SFU Events page for the latest campus activities and events.</p>
        </div>
      `,
    });
  }
});



const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

/**
 * Returns a default academic term based on the current date
 */
function getDefaultAcademicTerm() {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  let defaultTerm = "";
  if (month >= 0 && month <= 3) {
    defaultTerm = "spring";
  } else if (month >= 4 && month <= 7) {
    defaultTerm = "summer";
  } else {
    defaultTerm = "fall";
  }
  return { defaultYear: String(year), defaultTerm };
}

const SFU_BASE_URL = "https://www.sfu.ca/bin/wcm/course-outlines";

/**
 * Utility: Gather all text from a given heading until the next <h2> or <h3>.
 */
function gatherSection($, startEl) {
  let sectionText = "";
  let current = startEl.next();
  while (current.length && !/^(h2|h3)$/i.test(current[0].tagName)) {
    sectionText += current.text().trim() + "\n";
    current = current.next();
  }
  return sectionText.trim();
}

/**
 * CustomCheerioLoader that:
 * 1) Loads <body> from the parent CheerioWebBaseLoader,
 * 2) Fetches the raw HTML via axios,
 * 3) For the CMPT major page, creates separate documents for each heading section
 *    (e.g., Lower Division Requirements, Upper Division Requirements, etc.)
 * 4) Also extracts each <div class="course"> block (combining course link, title, and units)
 */
class CustomCheerioLoader extends CheerioWebBaseLoader {
  constructor(url) {
    super(url, { selector: "body" });
    this.webPath = url;
  }

  async load() {
    const docs = await super.load();
    try {
      const response = await axios.get(this.webPath);
      const html = response.data;
      const $ = cheerio.load(html);
      const newDocs = [];
      // SFSS CLUBS HANDLING
if (this.webPath.includes("sfss.ca/clubs")) {
  $(".col-md-12 > .row").each((i, el) => {
    const name = $(el).find("h4").text().trim();
    const desc = $(el).find("p").text().trim();
    const logo = $(el).find("img").attr("src")?.trim();
    if (name && desc) {
      const clubText = `${name}\n${desc}${logo ? `\nLogo: https://go.sfss.ca/${logo}` : ""}`;
      newDocs.push(new Document({
        pageContent: clubText,
        metadata: {
          source: this.webPath,
          heading: name
        }
      }));
    }
  });
}

// FACULTY HANDLING - TEXT INFORMATION ONLY (NO IMAGES)
if (this.webPath.includes("fas/computing/people/faculty.html")) {
  // Remove all images from the page to avoid processing them
  $("img").remove();
  
  // Look for SFU faculty directory items with the specific class structure
  $(".clf-fdi").each((i, el) => {
    const $faculty = $(el);
    
    // Extract faculty information from the specific SFU structure
    const name = $faculty.find(".faculty-name").text().trim();
    const position = $faculty.find(".position").text().trim();
    const email = $faculty.find("a[href*='mailto:']").attr("href")?.replace("mailto:", "") || 
                  $faculty.find(".email span").text().trim();
    const phone = $faculty.find("a[href*='tel:']").text().trim() || 
                  $faculty.find(".phone span").text().trim();
    const office = $faculty.find(".office span").text().trim();
    const profileLink = $faculty.find("a[href*='faculty-members']").attr("href");
    
    if (name && name.length > 2) {
      let facultyText = `Faculty Member: ${name}`;
      if (position) facultyText += `\nPosition: ${position}`;
      if (email) facultyText += `\nEmail: ${email}`;
      if (phone) facultyText += `\nPhone: ${phone}`;
      if (office) facultyText += `\nOffice Location: ${office}`;
      if (profileLink) {
        const fullProfileLink = profileLink.startsWith("http") ? profileLink : `https://www.sfu.ca${profileLink}`;
        facultyText += `\nProfile: ${fullProfileLink}`;
      }
      
      // Add department affiliation
      facultyText += `\nDepartment: School of Computing Science, Simon Fraser University`;
      
      console.log(`Extracted faculty: ${name}`); // Debug log
      
      newDocs.push(new Document({
        pageContent: facultyText,
        metadata: {
          source: this.webPath,
          heading: `${name} - SFU Computing Science Faculty`,
          type: "faculty",
          name: name
        }
      }));
    }
  });
  
  // Enhanced fallback: Look for faculty info in the profile divs
  $(".clf-fdi__profile").each((i, el) => {
    const $profile = $(el);
    const name = $profile.find(".faculty-name").text().trim();
    const position = $profile.find(".position").text().trim();
    const email = $profile.find("a[href*='mailto:']").attr("href")?.replace("mailto:", "");
    const phone = $profile.find("a[href*='tel:'] span").text().trim();
    const office = $profile.find(".office span").text().trim();
    
    if (name && email) {
      let facultyText = `Faculty Member: ${name}`;
      if (position) facultyText += `\nPosition: ${position}`;
      if (email) facultyText += `\nEmail: ${email}`;
      if (phone) facultyText += `\nPhone: ${phone}`;
      if (office) facultyText += `\nOffice Location: ${office}`;
      facultyText += `\nDepartment: School of Computing Science, Simon Fraser University`;
      
      console.log(`Extracted faculty (profile): ${name}`); // Debug log
      
      newDocs.push(new Document({
        pageContent: facultyText,
        metadata: {
          source: this.webPath,
          heading: `${name} - SFU Computing Science Faculty`,
          type: "faculty",
          name: name
        }
      }));
    }
  });
  
  // Final fallback: Look for any element containing faculty info patterns
  $("*").each((i, el) => {
    const $el = $(el);
    const text = $el.text();
    
    // Look for patterns like "LASTNAME, FIRSTNAME" followed by contact info
    const nameMatch = text.match(/([A-Z][a-z]+,\s*[A-Z][a-z]+)/);
    if (nameMatch && text.includes("@sfu.ca")) {
      const name = nameMatch[1].trim();
      const email = text.match(/([a-zA-Z0-9._-]+@sfu\.ca)/)?.[1];
      const phone = text.match(/(\d{3}\.\d{3}\.\d{4})/)?.[1];
      const office = text.match(/(SYRE?\s*\d+|ASB\s*\d+|TASC\s*\d+)/)?.[1];
      
      if (name && email) {
        let facultyText = `Faculty Member: ${name}`;
        if (email) facultyText += `\nEmail: ${email}`;
        if (phone) facultyText += `\nPhone: ${phone}`;
        if (office) facultyText += `\nOffice Location: ${office}`;
        facultyText += `\nDepartment: School of Computing Science, Simon Fraser University`;
        
        console.log(`Extracted faculty (fallback): ${name}`); // Debug log
        
        newDocs.push(new Document({
          pageContent: facultyText,
          metadata: {
            source: this.webPath,
            heading: `${name} - SFU Computing Science Faculty`,
            type: "faculty",
            name: name
          }
        }));
      }
    }
  });
}


      // If this is the CMPT major page, gather heading sections
      if (
        this.webPath ===
        "https://www.sfu.ca/students/calendar/2025/spring/programs/computing-science/major/bachelor-of-science-or-bachelor-of-arts.html"
      ) {
        $("h2, h3").each((i, el) => {
          const headingText = $(el).text().trim();
          const lowerHeading = headingText.toLowerCase();
          // Check for various headings (do not hardcode only one term)
          if (
            lowerHeading.includes("admission requirements") ||
            lowerHeading.includes("lower division requirements") ||
            lowerHeading.includes("upper division requirements") ||
            lowerHeading.includes("continuation requirements") ||
            lowerHeading.includes("internal transfer")
          ) {
            const lines = gatherSection($, $(el));
            if (lines) {
              const docText = headingText + "\n" + lines;
              newDocs.push(
                new Document({
                  pageContent: docText,
                  metadata: { source: this.webPath, heading: headingText }
                })
              );
            }
          }
        });
      }

      // Gather <div class="course"> blocks (combine course link, title, and units only)
      const courseElements = [];
      $("div.course").each((i, courseDiv) => {
        const courseLink = $(courseDiv).find("a.course-link").text().trim();
        const courseTitle = $(courseDiv).find("span.course-title").text().trim();
        const courseUnits = $(courseDiv).find("span.units").text().trim();
        let combinedText = `${courseLink} - ${courseTitle} - ${courseUnits}`;
        courseElements.push(combinedText);
      });
      const courseDocs = courseElements.map(textItem =>
        new Document({
          pageContent: textItem,
          metadata: { source: this.webPath, selector: ".course" }
        })
      );

      return [...docs, ...newDocs, ...courseDocs];
    } catch (err) {
      console.error("Error extracting content:", err);
      return docs;
    }
  }
}

// List of SFU URLs to scrape
const URLS = [
  "https://www.sfu.ca/students/calendar/2025/summer/courses/cmpt.html",
  "https://www.sfu.ca/students/calendar/2025/spring/programs/computing-science/major/bachelor-of-science-or-bachelor-of-arts.html",
  "https://www.sfu.ca/students/calendar/2025/spring/programs/computing-science/minor.html",
  "https://www.sfu.ca/students/admission/programs/a-z/c/computing-science/careers.html",
  "https://www.sfu.ca/students/calendar/2025/spring/areas-of-study/engineering-science.html",
  "https://www.sfu.ca/students/calendar/2025/spring/programs/computer-and-electronics-design/minor.html",
  "https://www.sfu.ca/students/calendar/2025/spring/programs/mechatronic-systems-engineering/major/bachelor-of-applied-science.html",
  "https://go.sfss.ca/clubs/list.php",
  "https://www.sfu.ca/fas/computing/people/faculty.html"
];

let vectorStore;
let retrievalChain;

// Chat history storage - simple in-memory storage (in production, use Redis or database)
const chatHistory = new Map(); // sessionId -> conversation history

/**
 * Get or create chat history for a session
 */
function getChatHistory(sessionId) {
  if (!chatHistory.has(sessionId)) {
    chatHistory.set(sessionId, []);
  }
  return chatHistory.get(sessionId);
}

/**
 * Add message to chat history
 */
function addToHistory(sessionId, role, content) {
  const history = getChatHistory(sessionId);
  history.push({ role, content, timestamp: Date.now() });
  
  // Keep only last 10 messages to prevent memory issues
  if (history.length > 10) {
    history.splice(0, history.length - 10);
  }
}

/**
 * Get recent context from chat history
 */
function getRecentContext(sessionId, maxMessages = 6) {
  const history = getChatHistory(sessionId);
  return history.slice(-maxMessages);
}

/**
 * Handle streaming chat via WebSocket
 */
async function handleStreamingChat(ws, message, sessionId) {
  try {
    console.log(`Streaming chat: ${message} (Session: ${sessionId})`);
    
    // Add user message to history
    addToHistory(sessionId, "user", message);
    
    // Send typing indicator
    ws.send(JSON.stringify({ type: 'typing', isTyping: true }));
    
    // Check for greetings
    const greetings = ["hi", "hello", "hey", "good morning", "good afternoon"];
    if (greetings.includes(message.toLowerCase().trim())) {
      const response = "Hello! How can I assist you today?";
      addToHistory(sessionId, "assistant", response);
      ws.send(JSON.stringify({ type: 'typing', isTyping: false }));
      ws.send(JSON.stringify({ type: 'message', content: response }));
      return;
    }
    
    const lower = message.toLowerCase();
    const keywords = extractClubKeywords(lower);
    const hasRelevantClubKeyword = keywords.some(kw => CLUB_KEYWORDS_MAP[kw]);
    
    // Handle club queries
    if (hasRelevantClubKeyword) {
      // Check if user wants all clubs
      const wantsAllClubs = lower.includes('all') || 
                           lower.includes('list all') || 
                           lower.includes('every club') ||
                           lower.includes('complete list');
      
      const matched = matchClubs(lower);
      let response;
      
      if (wantsAllClubs) {
        const allClubsList = SFU_CLUBS.join("\n- ");
        response = `Here is the complete list of all ${SFU_CLUBS.length} clubs at SFU:\n- ${allClubsList}\n\nFor more details, visit: https://go.sfss.ca/clubs/list.php`;
      } else if (matched.length > 0) {
        const limit = matched.length > 10 ? 10 : matched.length; // Show up to 10 clubs
        response = `Here are some SFU clubs related to "${message}":\n- ${matched.slice(0, limit).join("\n- ")}\n\nExplore more at: https://go.sfss.ca/clubs/list.php`;
      } else {
        response = `Couldn't find a club match for "${message}".\n\nCheck all clubs at: https://go.sfss.ca/clubs/list.php`;
      }
      addToHistory(sessionId, "assistant", response);
      ws.send(JSON.stringify({ type: 'typing', isTyping: false }));
      ws.send(JSON.stringify({ type: 'message', content: response }));
      return;
    }
    
    // Handle course sections
    const sectionMatch = message.match(/^[A-Za-z]{1,3}\d{1,3}$/);
    if (sectionMatch) {
      const section = sectionMatch[0].toUpperCase();
      if (courseContext.year && courseContext.term && courseContext.department && courseContext.courseNumber) {
        const { data, error, url } = await fetchCourseOutline(
          courseContext.year,
          courseContext.term,
          courseContext.department,
          courseContext.courseNumber,
          section
        );
        if (error) {
          const response = "Sorry, I couldn't find the course outline.";
          addToHistory(sessionId, "assistant", response);
          ws.send(JSON.stringify({ type: 'typing', isTyping: false }));
          ws.send(JSON.stringify({ type: 'message', content: response }));
          return;
        }
        const formattedOutline = formatCourseOutline(data, url);
        const response = formattedOutline.split("\n").join("<br>") || "Course outline not available.";
        addToHistory(sessionId, "assistant", response);
        ws.send(JSON.stringify({ type: 'typing', isTyping: false }));
        ws.send(JSON.stringify({ type: 'message', content: response }));
        return;
      } else {
        const response = "Please first ask for the course outline (e.g., CMPT 225 Summer 2025) before specifying the section.";
        addToHistory(sessionId, "assistant", response);
        ws.send(JSON.stringify({ type: 'typing', isTyping: false }));
        ws.send(JSON.stringify({ type: 'message', content: response }));
        return;
      }
    }
    
    // Handle course requests
    const { year, term, department, courseNumber } = extractCourseDetails(message);
    if (year && term && department && courseNumber) {
      courseContext = { year, term, department, courseNumber };
      const { sections, error } = await fetchAvailableSections(year, term, department, courseNumber);
      if (error || !sections.length) {
        console.log("No sections available, falling back to streaming LLM.");
        await handleStreamingFallbackLLM(ws, message, sessionId);
        return;
      }
      const sectionList = sections.map(sec => `${sec.text} - ${sec.title}`).join("\n");
      const response = `Here are the available sections for ${department} ${courseNumber} (${term} ${year}):\n${sectionList}\n\nPlease type the section code (e.g., D100) to get the course outline.`;
      addToHistory(sessionId, "assistant", response);
      ws.send(JSON.stringify({ type: 'typing', isTyping: false }));
      ws.send(JSON.stringify({ type: 'message', content: response }));
      return;
    }
    
    // Handle general queries - try web search first, then fall back to vector store
    await handleWebSearch(ws, message, sessionId);
    
  } catch (error) {
    console.error("Streaming chat error:", error);
    ws.send(JSON.stringify({ type: 'typing', isTyping: false }));
    ws.send(JSON.stringify({ type: 'error', message: "Sorry, something went wrong. Please try again." }));
  }
}

/**
 * Handle streaming LLM responses
 */
async function handleStreamingLLM(ws, message, sessionId) {
  try {
    const { year, term, department, courseNumber } = extractCourseDetails(message);
    console.log(`Extracted Details -> Year: ${year}, Term: ${term}, Department: ${department}, Course Number: ${courseNumber}`);
    
    // Get recent chat history for context
    const recentHistory = getRecentContext(sessionId, 4);
    const historyContext = recentHistory.map(msg => `${msg.role}: ${msg.content}`).join('\n');
    
    // Enhanced prompt with chat history
    const enhancedPrompt = historyContext ? 
      `Previous conversation context:\n${historyContext}\n\nCurrent question: ${message}` : 
      message;
    
    console.log("Checking SFU vector store for relevant docs...");
    const docs = await vectorStore.similaritySearchWithScore(enhancedPrompt, 3);
    console.log(`Top doc's score: ${docs[0]?.[1] || 0}`);
    
    if (docs.length > 0 && docs[0][1] > 0.75) {
      console.log("Using vector store docs for streaming response");
      const result = await retrievalChain.invoke({ input: enhancedPrompt });
      const responseWithSource = `${result.answer}\n\nSource: ${result.context.map(doc => doc.metadata.source).join(", ")}`;
      
      // Stream the response
      await streamResponse(ws, responseWithSource, sessionId);
    } else {
      console.log("Score too low, falling back to streaming GPT.");
      await handleStreamingFallbackLLM(ws, message, sessionId);
    }
  } catch (error) {
    console.error("Streaming LLM error:", error);
    await handleStreamingFallbackLLM(ws, message, sessionId);
  }
}

/**
 * Handle streaming fallback LLM
 */
async function handleStreamingFallbackLLM(ws, message, sessionId) {
  try {
    const recentHistory = getRecentContext(sessionId, 6);
    const conversationHistory = [
      {
        content: "You are AskSFU, a friendly, knowledgeable, and empathetic academic advisor at Simon Fraser University (SFU). Your goal is to guide students with a warm and supportive tone, offering accurate and clear advice.\nDO NOT use markdown formatting like **bold** or *italic*, and DO NOT use any HTML tags. Format your responses with simple plain text and standard newlines. Use the conversation history to provide contextual responses."
      }
    ];
    
    // Add recent conversation history
    recentHistory.forEach(msg => {
      conversationHistory.push({
        role: msg.role,
        content: msg.content
      });
    });
    
    // Add current message
    conversationHistory.push({ role: "user", content: message });
    
    const fallbackResponse = await fallbackLLM.call(conversationHistory);
    let answer = fallbackResponse.text || "I'm sorry, I couldn't generate an answer at this time.";
    
    // Stream the response
    await streamResponse(ws, answer, sessionId);
    
  } catch (error) {
    console.error("Streaming fallback LLM error:", error);
    const errorResponse = "I'm sorry, I encountered an error. Please try again.";
    await streamResponse(ws, errorResponse, sessionId);
  }
}

/**
 * Handle web search for dynamic SFU information
 */
async function handleWebSearch(ws, message, sessionId) {
  try {
    console.log(`Performing web search for: ${message}`);
    
    // Check if this is a real-time data query first
    const realtimeData = await checkRealtimeData(message);
    if (realtimeData) {
      await streamResponse(ws, realtimeData, sessionId);
      return;
    }
    
    // Create OpenAI client for web search
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    
    // Determine if this query needs web search
    const needsWebSearch = shouldUseWebSearch(message);
    
    if (!needsWebSearch) {
      // Fall back to regular LLM processing
      await handleStreamingLLM(ws, message, sessionId);
      return;
    }
    
    // Use regular chat completion for web search queries (WebSocket version)
    const response = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [
        {
          content: "You are AskSFU, a friendly, knowledgeable, and empathetic academic advisor at Simon Fraser University (SFU). Your goal is to guide students with a warm and supportive tone, offering accurate and clear advice.\nDO NOT use markdown formatting like **bold** or *italic*, and DO NOT use any HTML tags. Format your responses with simple plain text and standard newlines. Provide helpful information about SFU-related topics including courses, programs, clubs, campus life, and general university information."
        },
        {
          role: "user",
          content: `Please provide information about: ${message}. Focus on Simon Fraser University context when relevant.`
        }
      ],
      max_tokens: 500
    });
    
    // Extract the response text
    let responseText = response.choices[0]?.message?.content || "I couldn't find specific information about that topic.";
    let sources = [];
    
    // Format response with sources
    if (sources.length > 0) {
      responseText += "\n\n📚 **Sources:**\n";
      sources.slice(0, 3).forEach((source, index) => {
        responseText += `${index + 1}. [${source.title || source.url}](${source.url})\n`;
      });
    }
    
    // Stream the web search response
    await streamResponse(ws, responseText, sessionId);
    
  } catch (error) {
    console.error("Web search error:", error);
    // Fall back to regular LLM if web search fails
    await handleStreamingLLM(ws, message, sessionId);
  }
}

/**
 * Handle web search for HTTP requests
 */
async function handleWebSearchHTTP(message, res, sessionId) {
  try {
    console.log(`Performing HTTP web search for: ${message}`);
    
    // Create OpenAI client for web search
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    
    // Use regular chat completion for web search queries (HTTP version)
    const response = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [
        {
          content: "You are AskSFU, a friendly, knowledgeable, and empathetic academic advisor at Simon Fraser University (SFU). Your goal is to guide students with a warm and supportive tone, offering accurate and clear advice.\nDO NOT use markdown formatting like **bold** or *italic*, and DO NOT use any HTML tags. Format your responses with simple plain text and standard newlines. Provide helpful information about SFU-related topics including courses, programs, clubs, campus life, and general university information."
        },
        {
          role: "user",
          content: `Please provide information about: ${message}. Focus on Simon Fraser University context when relevant.`
        }
      ],
      max_tokens: 500
    });
    
    // Extract the response text
    let responseText = response.choices[0]?.message?.content || "I couldn't find specific information about that topic.";
    let sources = [];
    
    // Format response with sources
    if (sources.length > 0) {
      responseText += "\n\n📚 **Sources:**\n";
      sources.slice(0, 3).forEach((source, index) => {
        responseText += `${index + 1}. [${source.title || source.url}](${source.url})\n`;
      });
    }
    
    // Add to chat history and return response
    addToHistory(sessionId, "assistant", responseText);
    return res.json({ response: responseText });
    
  } catch (error) {
    console.error("HTTP web search error:", error);
    // Fall back to regular LLM if web search fails
    return handleFallbackLLM(message, res, sessionId);
  }
}

/**
 * Check for real-time data queries and fetch from APIs
 */
async function checkRealtimeData(message) {
  const lowerMessage = message.toLowerCase();
  
  // Weather queries
  if (lowerMessage.includes('weather') || lowerMessage.includes('temperature') || lowerMessage.includes('forecast')) {
    return await getWeatherData();
  }
  
  // News queries
  if (lowerMessage.includes('news') || lowerMessage.includes('announcement') || lowerMessage.includes('latest')) {
    return await getNewsData();
  }
  
  // Time queries
  if (lowerMessage.includes('time') || lowerMessage.includes('date') || lowerMessage.includes('what time')) {
    return await getCurrentTime();
  }
  
  // Course schedule queries
  if (lowerMessage.includes('schedule') || lowerMessage.includes('timetable') || lowerMessage.includes('class times')) {
    return await getCourseSchedule();
  }
  
  // Library hours queries
  if (lowerMessage.includes('library hours') || lowerMessage.includes('library open') || lowerMessage.includes('library closed')) {
    return await getLibraryHours();
  }
  
  // Campus events queries
  if (lowerMessage.includes('events') || lowerMessage.includes('activities') || lowerMessage.includes('what\'s happening')) {
    return await getCampusEvents();
  }
  
  return null; // No real-time data needed
}

/**
 * Get current weather for SFU campus
 */
async function getWeatherData() {
  try {
    // Using OpenWeatherMap API (you'll need to get a free API key)
    const API_KEY = process.env.OPENWEATHER_API_KEY || 'demo_key';
    const response = await axios.get(`https://api.openweathermap.org/data/2.5/weather?q=Burnaby,BC,CA&appid=${API_KEY}&units=metric`);
    
    const weather = response.data;
    const temp = Math.round(weather.main.temp);
    const description = weather.weather[0].description;
    const humidity = weather.main.humidity;
    const windSpeed = weather.wind.speed;
    
    return `Current Weather at SFU Campus (Burnaby):\n\n` +
           `Temperature: ${temp}°C\n` +
           `Conditions: ${description}\n` +
           `Humidity: ${humidity}%\n` +
           `Wind Speed: ${windSpeed} m/s\n\n` +
           `Data provided by OpenWeatherMap`;
           
  } catch (error) {
    console.error('Weather API error:', error);
    return `SFU Campus Weather:\n\nI'm having trouble fetching current weather data. Please check the weather app or visit https://weather.gc.ca/ for current conditions in Burnaby, BC.`;
  }
}

/**
 * Get latest SFU news and announcements
 */
async function getNewsData() {
  try {
    // Using NewsAPI (you'll need to get a free API key)
    const API_KEY = process.env.NEWS_API_KEY || 'demo_key';
    const response = await axios.get(`https://newsapi.org/v2/everything?q=Simon+Fraser+University+OR+SFU&apiKey=${API_KEY}&sortBy=publishedAt&pageSize=5`);
    
    const articles = response.data.articles;
    let newsText = `Latest SFU News & Announcements:\n\n`;
    
    articles.slice(0, 3).forEach((article, index) => {
      newsText += `${index + 1}. ${article.title}\n`;
      newsText += `   ${article.description}\n`;
      newsText += `   Link: ${article.url}\n\n`;
    });
    
    newsText += `Data provided by NewsAPI`;
    return newsText;
    
  } catch (error) {
    console.error('News API error:', error);
    return `SFU News:\n\nI'm having trouble fetching the latest news. Please visit https://www.sfu.ca/news.html for the most recent announcements and updates.`;
  }
}

/**
 * Get current time and date
 */
async function getCurrentTime() {
  const now = new Date();
  const options = {
    timeZone: 'America/Vancouver',
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  };
  
  const vancouverTime = now.toLocaleString('en-US', options);
  
  return `Current Time at SFU Campus:\n\n` +
         `${vancouverTime} (Pacific Time)\n\n` +
         `This is the current local time in Vancouver, BC where SFU is located.`;
}

/**
 * Get course schedule information
 */
async function getCourseSchedule() {
  try {
    // This would typically connect to SFU's course schedule API
    // For now, we'll provide general information
    return `SFU Course Schedule Information:\n\n` +
           `Current Term: Fall 2025\n` +
           `Registration Period: Check SFU Student Services (https://www.sfu.ca/students.html) for current registration dates\n` +
           `Class Schedule: Visit SFU Course Outlines (https://www.sfu.ca/outlines.html) for detailed class times\n\n` +
           `For real-time schedule updates, please check your student portal or the official SFU website.`;
           
  } catch (error) {
    return `Course Schedule:\n\nPlease visit https://www.sfu.ca/outlines.html for the most current class schedules and times.`;
  }
}

/**
 * Get library hours and information
 */
async function getLibraryHours() {
  try {
    // This would typically connect to SFU Library's API
    return `SFU Library Hours:\n\n` +
           `Bennett Library (Burnaby):\n` +
           `• Monday-Thursday: 8:00 AM - 10:00 PM\n` +
           `• Friday: 8:00 AM - 6:00 PM\n` +
           `• Saturday: 10:00 AM - 6:00 PM\n` +
           `• Sunday: 12:00 PM - 8:00 PM\n\n` +
           `Fraser Library (Surrey):\n` +
           `• Monday-Thursday: 8:00 AM - 10:00 PM\n` +
           `• Friday: 8:00 AM - 6:00 PM\n` +
           `• Saturday: 10:00 AM - 6:00 PM\n` +
           `• Sunday: 12:00 PM - 8:00 PM\n\n` +
           `Hours may vary during holidays and exam periods. Check https://www.lib.sfu.ca/ for updates.`;
           
  } catch (error) {
    return `Library Hours:\n\nPlease visit https://www.lib.sfu.ca/ for the most current library hours and services.`;
  }
}

/**
 * Get campus events and activities
 */
async function getCampusEvents() {
  try {
    // This would typically connect to SFU Events API
    return `Upcoming SFU Campus Events:\n\n` +
           `This Week:\n` +
           `• Student Orientation Events\n` +
           `• Career Fair 2025\n` +
           `• Research Symposium\n\n` +
           `Ongoing:\n` +
           `• Fitness Classes at the Recreation Centre\n` +
           `• Study Groups in the Library\n` +
           `• Cultural Events at the Student Union\n\n` +
           `For the most current events, visit https://www.sfu.ca/events.html or check the SFU Student Union calendar.`;
           
  } catch (error) {
    return `Campus Events:\n\nPlease visit https://www.sfu.ca/events.html for the most current campus activities and events.`;
  }
}

/**
 * Determine if a query should use web search
 */
function shouldUseWebSearch(message) {
  const lowerMessage = message.toLowerCase();
  
  // Keywords that indicate need for current/dynamic information
  const webSearchKeywords = [
    'professor', 'professors', 'faculty', 'instructor', 'teacher',
    'financial aid', 'scholarship', 'bursary', 'tuition', 'fees',
    'contact', 'phone', 'email', 'address', 'office hours',
    'admission', 'application', 'deadline', 'requirements',
    'current', 'latest', 'recent', 'updated', 'new',
    'events', 'news', 'announcement', 'schedule',
    'campus', 'building', 'location', 'directions',
    'library', 'hours', 'services', 'resources'
  ];
  
  // Check if message contains web search keywords
  return webSearchKeywords.some(keyword => lowerMessage.includes(keyword));
}

/**
 * Stream response to WebSocket
 */
async function streamResponse(ws, response, sessionId) {
  // Add to chat history
  addToHistory(sessionId, "assistant", response);
  
  // Send typing indicator off
  ws.send(JSON.stringify({ type: 'typing', isTyping: false }));
  
  // Stream the response word by word for a typing effect
  const words = response.split(' ');
  let currentText = '';
  
  for (let i = 0; i < words.length; i++) {
    currentText += (i > 0 ? ' ' : '') + words[i];
    
    // Send partial response
    ws.send(JSON.stringify({ 
      type: 'stream', 
      content: currentText,
      isComplete: i === words.length - 1
    }));
    
    // Small delay for typing effect
    await new Promise(resolve => setTimeout(resolve, 50));
  }
  
  // Send final complete message
  ws.send(JSON.stringify({ 
    type: 'message', 
    content: response 
  }));
}

/**
 * Build the vector store:
 * - Loads documents via CustomCheerioLoader.
 * - Splits them into chunks.
 * - Embeds them and stores them in MemoryVectorStore.
 */
async function initializeVectorStore() {
  const loaders = URLS.map(url => new CustomCheerioLoader(url));
  const docsArray = await Promise.all(loaders.map(loader => loader.load()));
  const flatDocs = docsArray.flat();
  const textSplitter = new RecursiveCharacterTextSplitter({
    chunkSize: 15000,
    chunkOverlap: 600
  });
  const splitDocs = await textSplitter.splitDocuments(flatDocs);
  const embeddings = new OpenAIEmbeddings({ apiKey: process.env.OPENAI_API_KEY });
  vectorStore = await MemoryVectorStore.fromDocuments(splitDocs, embeddings);
  
  // Initialize retrieval chain
  const promptTemplate = ChatPromptTemplate.fromTemplate(
    `You are a chat bot called AskSfu.
When listing multiple points, please separate each point with a <br> tag.
When providing information about faculty members, only provide text-based information such as contact details, office locations, titles, and research interests. Do not mention, describe, or reference any photos or images.
Answer the question based only on the following context:<br>
{context}<br>
Question: {input}`
  );

  const documentChain = await createStuffDocumentsChain({
    llm: new ChatOpenAI({
      modelName: "gpt-3.5-turbo-16k",
      openAIApiKey: process.env.OPENAI_API_KEY,
      maxTokens: 1000
    }),
    prompt: promptTemplate
  });

  const retriever = vectorStore.asRetriever({ k: 5 });
  retrievalChain = await createRetrievalChain({
    combineDocsChain: documentChain,
    retriever
  });
  
  console.log("Vector store and retrieval chain initialized.");
}

(async () => {
  await initializeVectorStore();
})();

// Dictionary for synonyms of major names
const majorMapping = {
  "COMPUTING SCIENCE": "CMPT",
  "CMPT": "CMPT",
  "ENGINEERING SCIENCE": "ENSC",
  "ENSC": "ENSC",
  "MECHATRONIC SYSTEMS ENGINEERING": "MSE",
  "MSE": "MSE",
  "SUSTAINABLE ENERGY ENGINEERING": "SEE",
  "SEE": "SEE",
  "SOFTWARE SYSTEMS": "SOFT",
  "SOFT": "SOFT"
};

let courseContext = {};

/**
 * Example function: fetch available sections for a course.
 */
async function fetchAvailableSections(year, term, department, courseNumber) {
  if (!year || !term || !department || !courseNumber) {
    return { error: "Missing required parameters for fetching course sections." };
  }
  const formattedCourseNumber = courseNumber.toUpperCase();
  const formattedTerm = term.toLowerCase();
  const formattedDepartment = department.toUpperCase();
  const url = `${SFU_BASE_URL}?${year}/${formattedTerm}/${formattedDepartment}/${formattedCourseNumber}`;
  console.log(`Sections API URL: ${url}`);
  try {
    const response = await axios.get(url);
    console.log("API Response:", response.data);
    const sections = response.data.filter(sec => sec.classType === 'e');
    if (!sections.length) {
      console.log("No lecture sections available for this course.");
      return { error: "No lecture sections available for this course." };
    }
    return { sections };
  } catch (error) {
    console.log(`Error fetching sections for ${courseNumber}:`, error);
    return { error: "Could not fetch course sections. It may not exist." };
  }
}

/**
 * Example function: fetch a course outline.
 */
async function fetchCourseOutline(year, term, department, courseNumber, section) {
  if (!year || !term || !department || !courseNumber) {
    return { error: "Missing required parameters for fetching course outline." };
  }
  const formattedCourseNumber = courseNumber.toUpperCase();
  const formattedTerm = term.toLowerCase();
  const formattedDepartment = department.toUpperCase();
  const url = `${SFU_BASE_URL}?${year}/${formattedTerm}/${formattedDepartment}/${formattedCourseNumber}/${section}`;
  console.log(`API URL: ${url}`);
  try {
    const response = await axios.get(url);
    return { data: response.data, url };
  } catch (error) {
    return { error: "Could not fetch course outline. It may not exist." };
  }
}

/**
 * Format the course outline data.
 */
function formatCourseOutline(data, url) {
  if (!data.info) return "Course outline not found.";
  let outlineUrl = "";
  try {
    const [termPart, year] = data.info.term.toLowerCase().split(' ');
    const [dept, courseNum, section] = data.info.name.toLowerCase().split(' ');
    outlineUrl = `https://www.sfu.ca/outlines.html?${year}/${termPart}/${dept}/${courseNum}/${section}`;
  } catch (error) {
    outlineUrl = "URL generation failed - invalid course data format";
  }
  return `${data.info.title} (${data.info.name})

Term: ${data.info.term}
Campus: ${data.courseSchedule?.[0]?.campus || "Not available"}
Instructor: ${data.instructor?.[0]?.name || "Not available"}
Description: ${data.info.description}

Prerequisites: ${data.info.prerequisites || "None listed"}

Grading Notes: ${data.info.gradingNotes || "Not specified"}

Required Texts: ${data.requiredText?.map(t => t.details).join("\n") || "None listed"}

Schedule: ${data.courseSchedule?.map(s => `${s.days}: ${s.startTime} - ${s.endTime}`).join("\n") || "Not available"}

Link: ${outlineUrl}`;
}

/**
 * Extract course details from the user message.
 */
function extractCourseDetails(message) {
  const yearMatch = message.match(/\b(20\d{2})\b/);
  const termMatch = message.match(/\b(spring|summer|fall)\b/i);
  const departmentMatch = message.match(/\b([A-Za-z]{3,4})\s+\d{3}\b/);
  const courseNumberMatch = message.match(/\b(\d{3}[A-Za-z]?)\b/);
  //const sectionMatch = message.match(/\b([dD]\d{3})\b/);
  //const sectionMatch = message.match(/\b([A-Za-z]\d{3})\b/);
  const sectionMatch = message.match(/\b([A-Za-z]{1,3}\d{1,3})\b/);



  const { defaultYear, defaultTerm } = getDefaultAcademicTerm();
  let year = yearMatch ? yearMatch[1] : defaultYear;
  let term = termMatch ? termMatch[1].toLowerCase() : defaultTerm;
  let department = departmentMatch ? departmentMatch[1].toUpperCase() : null;

  const upperMsg = message.toUpperCase();
  for (const key in majorMapping) {
    if (upperMsg.includes(key)) {
      department = majorMapping[key];
      break;
    }
  }

  const courseNumber = courseNumberMatch ? courseNumberMatch[1].toUpperCase() : null;
  const section = sectionMatch ? sectionMatch[1].toUpperCase() : null;

  console.log(`Extracted Details -> Year: ${year}, Term: ${term}, Department: ${department}, Course Number: ${courseNumber}, Section: ${section}`);
  return { year, term, department, courseNumber, section };
}

/**
 * Helper function to truncate text at a sentence boundary.
 * It looks for the last period before maxChars.
 */
function truncateText(text, maxChars, sourceUrl) {
  if (text.length <= maxChars) return text;
  let truncated = text.substring(0, maxChars);
  const lastPeriod = truncated.lastIndexOf('.');
  if (lastPeriod !== -1) {
    return (
      truncated.substring(0, lastPeriod + 1) +
      `\n...\nFor full details, please visit: ${sourceUrl}`
    );
  }
  return (
    truncated +
    `\n...\nFor full details, please visit: ${sourceUrl}`
  );
}

/**
 * Main chat endpoint.
 */
app.post("/chat", async (req, res) => {
  try {
    const { message, sessionId = "default", image } = req.body;
    console.log(`User Message: ${message} (Session: ${sessionId})`);
    
    // Add user message to history
    addToHistory(sessionId, "user", message);

    if (image) {
      console.log("Image received, processing with OpenAI vision...");
      const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
      try {
        const completion = await openai.chat.completions.create({
          model: "gpt-4o-mini",
          messages: [
            {
              role: "system",
              content: "You are AskSFU, a friendly, knowledgeable, and empathetic academic advisor at Simon Fraser University (SFU). The user has uploaded an image, likely a course schedule. Extract the courses from it, format them clearly, and answer the user's question based on the image.\nDO NOT use markdown formatting like **bold** or *italic*, and DO NOT use any HTML tags. Format your responses with simple plain text and standard newlines."
            },
            {
              role: "user",
              content: [
                { type: "text", text: message || "Please process this course schedule and extract the courses." },
                { type: "image_url", image_url: { url: image } }
              ]
            }
          ],
          max_tokens: 800
        });
        const responseText = completion.choices[0].message.content;
        addToHistory(sessionId, "assistant", responseText);
        return res.json({ response: responseText });
      } catch (err) {
        console.error("Vision API Error:", err);
        return res.json({ response: "I had trouble analyzing your image. Please try again." });
      }
    }

    // Simple greeting check
    const greetings = ["hi", "hello", "hey", "good morning", "good afternoon"];
    if (greetings.includes(message.toLowerCase().trim())) {
      const response = "Hello! How can I assist you today?";
      addToHistory(sessionId, "assistant", response);
      return res.json({ response });
    }

    const lower = message.toLowerCase();

    const keywords = extractClubKeywords(lower);
    const hasRelevantClubKeyword = keywords.some(kw => CLUB_KEYWORDS_MAP[kw]);

    if (hasRelevantClubKeyword) {
      // Check if user wants all clubs
      const wantsAllClubs = lower.includes('all') || 
                           lower.includes('list all') || 
                           lower.includes('every club') ||
                           lower.includes('complete list');
      
      const matched = matchClubs(lower);
      let response;
      
      if (wantsAllClubs) {
        const allClubsList = SFU_CLUBS.join("\n- ");
        response = `Here is the complete list of all ${SFU_CLUBS.length} clubs at SFU:\n- ${allClubsList}\n\nFor more details, visit: https://go.sfss.ca/clubs/list.php`;
      } else if (matched.length > 0) {
        const limit = matched.length > 10 ? 10 : matched.length; // Show up to 10 clubs
        response = `Here are some SFU clubs related to "${message}":\n- ${matched.slice(0, limit).join("\n- ")}\n\nExplore more at: https://go.sfss.ca/clubs/list.php`;
      } else {
        response = `Couldn't find a club match for "${message}".\n\nCheck all clubs at: https://go.sfss.ca/clubs/list.php`;
      }
      addToHistory(sessionId, "assistant", response);
      return res.json({ response });
    }

    // If user typed a section code (e.g., D100)
    //const sectionMatch = message.match(/^d\d{3}$/i);
    //const sectionMatch = message.match(/^[a-zA-Z]\d{3}$/);
    const sectionMatch = message.match(/^[A-Za-z]{1,3}\d{1,3}$/);
    if (sectionMatch) {
      const section = sectionMatch[0].toUpperCase();
      if (courseContext.year && courseContext.term && courseContext.department && courseContext.courseNumber) {
        const { data, error, url } = await fetchCourseOutline(
          courseContext.year,
          courseContext.term,
          courseContext.department,
          courseContext.courseNumber,
          section
        );
        if (error) {
          const response = "Sorry, I couldn't find the course outline.";
          addToHistory(sessionId, "assistant", response);
          return res.status(404).json({ response });
        }
        const formattedOutline = formatCourseOutline(data, url);
        const response = formattedOutline || "Course outline not available.";
        addToHistory(sessionId, "assistant", response);
        return res.json({ response });
      } else {
        const response = "Please first ask for the course outline (e.g., CMPT 225 Summer 2025) before specifying the section.";
        addToHistory(sessionId, "assistant", response);
        return res.json({ response });
      }
    }

    // Parse out year, term, department, and course number from the message
    const { year, term, department, courseNumber } = extractCourseDetails(message);
    if (year && term && department && courseNumber) {
      courseContext = { year, term, department, courseNumber };
      const { sections, error } = await fetchAvailableSections(year, term, department, courseNumber);
      if (error || !sections.length) {
        console.log("No sections available, falling back to GPT.");
        return handleFallbackLLM(message, res, sessionId);
      }
      const sectionList = sections.map(sec => `${sec.text} - ${sec.title}`).join("\n");
      const response = `Here are the available sections for ${department} ${courseNumber} (${term} ${year}):\n${sectionList}\n\nPlease type the section code (e.g., D100) to get the course outline.`;
      addToHistory(sessionId, "assistant", response);
      return res.json({ response });
    }

    // Check for real-time data first
    const realtimeData = await checkRealtimeData(message);
    if (realtimeData) {
      addToHistory(sessionId, "assistant", realtimeData);
      return res.json({ response: realtimeData });
    }

    // Check if this query needs web search for current information
    if (shouldUseWebSearch(message)) {
      console.log("Query needs web search, performing web search...");
      return handleWebSearchHTTP(message, res, sessionId);
    }

    // If not a specific course request, perform a similarity search
    console.log("Checking SFU vector store for relevant docs...");
    const resultsWithScores = await vectorStore.similaritySearchWithScore(message, 5);
    if (!resultsWithScores || resultsWithScores.length === 0) {
      console.log("No SFU docs found. Falling back to GPT.");
      return handleFallbackLLM(message, res, sessionId);
    }
    const [topDoc, topScore] = resultsWithScores[0];
    console.log(`Top doc's score: ${topScore}`);
    const THRESHOLD = 0.75; // Lowered to allow faculty queries
    if (topScore < THRESHOLD) {
      console.log(`Score ${topScore} < ${THRESHOLD}, falling back to GPT.`);
      return handleFallbackLLM(message, res, sessionId);
    }
    const relevantDocs = resultsWithScores.map(([doc]) => doc);
    relevantDocs.sort((a, b) => b.pageContent.length - a.pageContent.length);
    const context = relevantDocs.map(doc => doc.pageContent).join("\n\n");

    const promptTemplate = ChatPromptTemplate.fromTemplate(
      `You are AskSFU, a friendly, knowledgeable, and empathetic academic advisor at Simon Fraser University (SFU). Your goal is to guide students with a warm and supportive tone, offering accurate and clear advice.
DO NOT use markdown formatting like **bold** or *italic*, and DO NOT use any HTML tags. Format your responses with simple plain text and standard newlines.
When providing information about faculty members, only provide text-based information such as contact details, office locations, titles, and research interests. Do not mention, describe, or reference any photos or images.
Answer the question based only on the following context:
{context}

Question: {input}`
    );

    const documentChain = await createStuffDocumentsChain({
      llm: new ChatOpenAI({
        modelName: "gpt-3.5-turbo-16k",
        openAIApiKey: process.env.OPENAI_API_KEY,
        maxTokens: 1000
      }),
      prompt: promptTemplate
    });

    const retriever = vectorStore.asRetriever({ k: 5 });
    const retrievalChain = await createRetrievalChain({
      combineDocsChain: documentChain,
      retriever
    });

    // Get recent chat history for context
    const recentHistory = getRecentContext(sessionId, 4);
    const historyContext = recentHistory.map(msg => `${msg.role}: ${msg.content}`).join('\n');
    
    // Enhanced prompt with chat history
    const enhancedPrompt = historyContext ? 
      `Previous conversation context:\n${historyContext}\n\nCurrent question: ${message}` : 
      message;
    
    let result = await retrievalChain.invoke({ input: enhancedPrompt });
    if (!result || !result.answer || result.answer.trim() === "") {
      console.log("Primary retrieval returned empty, falling back to GPT.");
      return handleFallbackLLM(message, res, sessionId);
    }

    let sourceUrl = "Source not available";
    if (
      result.context &&
      result.context[0] &&
      result.context[0].metadata &&
      result.context[0].metadata.source
    ) {
      sourceUrl = result.context[0].metadata.source;
    }

    // If the answer is too long, truncate it at a sentence boundary and add a "Read more" link
    const MAX_CHARS = 800; // Adjust threshold as needed
    let finalAnswer = result.answer;
    if (finalAnswer.length > MAX_CHARS) {
      finalAnswer = truncateText(finalAnswer, MAX_CHARS, sourceUrl);
    }
    // finalAnswer formatting updated to keep \n



    let responseWithSource = finalAnswer;
    if (
      sourceUrl !== "Source not available" &&
      finalAnswer.toLowerCase() !== "hello! how can i assist you today?"
    ) {
      responseWithSource += `\n\nSource: ${sourceUrl}`;
    }
    
    // Add response to chat history
    addToHistory(sessionId, "assistant", responseWithSource);
    
    return res.json({ response: responseWithSource });

  } catch (error) {
    console.error("Server Error:", error);
    const { sessionId = "default" } = req.body;
    return handleFallbackLLM("I'm sorry, something went wrong. Can you please rephrase your question?", res, sessionId);
  }
});

/**
 * Fallback LLM: if no relevant docs are found or an error occurs.
 */
async function handleFallbackLLM(message, res, sessionId = "default") {
  try {
    const fallbackLLM = new ChatOpenAI({
      modelName: "gpt-3.5-turbo-16k",
      openAIApiKey: process.env.OPENAI_API_KEY,
      maxTokens: 1000
    });
    
    // Get recent chat history for context
    const recentHistory = getRecentContext(sessionId, 6);
    
    // Build conversation history for the LLM
    const conversationHistory = [
      {
        role: "system",
        content: "You are AskSFU, a friendly, knowledgeable, and empathetic academic advisor at Simon Fraser University (SFU). Your goal is to guide students with a warm and supportive tone, offering accurate and clear advice.\nDO NOT use markdown formatting like **bold** or *italic*, and DO NOT use any HTML tags. Format your responses with simple plain text and standard newlines. Use the conversation history to provide contextual responses."
      }
    ];
    
    // Add recent conversation history
    recentHistory.forEach(msg => {
      conversationHistory.push({
        role: msg.role === "assistant" ? "assistant" : "user",
        content: msg.content
      });
    });
    
    // Add current message
    conversationHistory.push({
      role: "user",
      content: message
    });
    
    const fallbackResponse = await fallbackLLM.call(conversationHistory);
    let answer = fallbackResponse.text || "I'm sorry, I couldn't generate an answer at this time.";
    // answer formatting updated to keep \n
    
    // Add response to chat history
    addToHistory(sessionId, "assistant", answer);
    
    return res.json({ response: answer });
  } catch (error) {
    console.error("Fallback LLM Error:", error);
    const errorResponse = "I'm sorry, I encountered an error while generating a response. Please try again later.";
    addToHistory(sessionId, "assistant", errorResponse);
    return res.json({ response: errorResponse });
  }
}

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));

// Add these additions to your existing server.mjs file

// Add after your existing WebSocket setup
const chatRooms = new Map(); // roomId -> Set of websockets
const userSessions = new Map(); // ws -> { userId, username, currentRoom }
const roomMessages = new Map(); // roomId -> array of recent messages
const bannedWords = ['spam', 'inappropriate']; // Add your moderation list

// Available chat rooms
const CHAT_ROOMS = {
  'general': { name: 'General SFU Discussion', description: 'Open discussion for all SFU topics' },
  'cmpt': { name: 'Computing Science', description: 'CMPT courses, programming, and tech discussions' },
  'study': { name: 'Study Groups', description: 'Find study partners and group sessions' },
  'clubs': { name: 'Clubs & Activities', description: 'SFU clubs, events, and campus life' },
  'help': { name: 'Academic Help', description: 'Get help with courses and assignments' }
};

// Initialize rooms
Object.keys(CHAT_ROOMS).forEach(roomId => {
  chatRooms.set(roomId, new Set());
  roomMessages.set(roomId, []);
});

// Enhanced WebSocket connection handling (replace your existing WebSocket handler)
wss.on('connection', (ws) => {
  console.log('New WebSocket connection established');
  
  // Send available rooms to new user
  ws.send(JSON.stringify({
    type: 'rooms_list',
    rooms: CHAT_ROOMS
  }));
  
  ws.on('message', async (message) => {
    try {
      const data = JSON.parse(message);
      const { type, message: userMessage, sessionId = "default" } = data;
      
      switch(type) {
        case 'chat':
          await handleStreamingChat(ws, userMessage, sessionId);
          break;
          
        case 'join_room':
          handleJoinRoom(ws, data);
          break;
          
        case 'leave_room':
          handleLeaveRoom(ws, data);
          break;
          
        case 'group_message':
          handleGroupMessage(ws, data);
          break;
          
        case 'set_username':
          handleSetUsername(ws, data);
          break;
          
        case 'private_message':
          handlePrivateMessage(ws, data);
          break;
      }
    } catch (error) {
      console.error('WebSocket message error:', error);
      ws.send(JSON.stringify({ type: 'error', message: 'Invalid message format' }));
    }
  });
  
  ws.on('close', () => {
    console.log('WebSocket connection closed');
    handleUserDisconnect(ws);
  });
});

// Handle username setting
function handleSetUsername(ws, data) {
  const { username } = data;
  
  // Basic validation
  if (!username || username.length < 2 || username.length > 20) {
    ws.send(JSON.stringify({
      type: 'error',
      message: 'Username must be between 2-20 characters'
    }));
    return;
  }
  
  // Check for inappropriate content
  if (bannedWords.some(word => username.toLowerCase().includes(word))) {
    ws.send(JSON.stringify({
      type: 'error',
      message: 'Username contains inappropriate content'
    }));
    return;
  }
  
  const userId = generateUserId();
  userSessions.set(ws, {
    userId,
    username: sanitizeUsername(username),
    currentRoom: null,
    joinedAt: Date.now()
  });
  
  ws.send(JSON.stringify({
    type: 'username_set',
    userId,
    username: sanitizeUsername(username)
  }));
}

// Handle joining a chat room
function handleJoinRoom(ws, data) {
  const { roomId } = data;
  const userSession = userSessions.get(ws);
  
  if (!userSession) {
    ws.send(JSON.stringify({
      type: 'error',
      message: 'Please set a username first'
    }));
    return;
  }
  
  if (!CHAT_ROOMS[roomId]) {
    ws.send(JSON.stringify({
      type: 'error',
      message: 'Room not found'
    }));
    return;
  }
  
  // Leave current room if in one
  if (userSession.currentRoom) {
    handleLeaveRoom(ws, { roomId: userSession.currentRoom });
  }
  
  // Join new room
  chatRooms.get(roomId).add(ws);
  userSession.currentRoom = roomId;
  
  // Send recent messages to user
  const recentMessages = roomMessages.get(roomId).slice(-50);
  ws.send(JSON.stringify({
    type: 'room_joined',
    roomId,
    roomName: CHAT_ROOMS[roomId].name,
    recentMessages
  }));
  
  // Notify room about new user
  broadcastToRoom(roomId, {
    type: 'user_joined',
    username: userSession.username,
    timestamp: Date.now()
  }, ws);
  
  // Update room user count
  broadcastToRoom(roomId, {
    type: 'room_stats',
    userCount: chatRooms.get(roomId).size
  });
}

// Handle leaving a chat room
function handleLeaveRoom(ws, data) {
  const { roomId } = data;
  const userSession = userSessions.get(ws);
  
  if (!userSession || userSession.currentRoom !== roomId) {
    return;
  }
  
  chatRooms.get(roomId).delete(ws);
  userSession.currentRoom = null;
  
  // Notify room about user leaving
  broadcastToRoom(roomId, {
    type: 'user_left',
    username: userSession.username,
    timestamp: Date.now()
  });
  
  // Update room user count
  broadcastToRoom(roomId, {
    type: 'room_stats',
    userCount: chatRooms.get(roomId).size
  });
  
  ws.send(JSON.stringify({
    type: 'room_left',
    roomId
  }));
}

// Handle group messages in chat rooms
function handleGroupMessage(ws, data) {
  const { message, roomId } = data;
  const userSession = userSessions.get(ws);
  
  if (!userSession || userSession.currentRoom !== roomId) {
    ws.send(JSON.stringify({
      type: 'error',
      message: 'Not in this room'
    }));
    return;
  }
  
  // Content moderation
  if (isInappropriate(message)) {
    ws.send(JSON.stringify({
      type: 'error',
      message: 'Message contains inappropriate content'
    }));
    return;
  }
  
  const messageData = {
    type: 'group_message',
    messageId: generateMessageId(),
    username: userSession.username,
    userId: userSession.userId,
    message: sanitizeMessage(message),
    roomId,
    timestamp: Date.now()
  };
  
  // Store message
  const messages = roomMessages.get(roomId);
  messages.push(messageData);
  if (messages.length > 100) {
    messages.shift(); // Keep only last 100 messages
  }
  
  // Broadcast to room
  broadcastToRoom(roomId, messageData);
  
  // Check if AskSFU should respond
  if (shouldAIRespond(message)) {
    setTimeout(() => handleAIResponse(roomId, message, userSession.username), 1000);
  }
}

// Handle private messages
function handlePrivateMessage(ws, data) {
  const { targetUserId, message } = data;
  const senderSession = userSessions.get(ws);
  
  if (!senderSession) {
    ws.send(JSON.stringify({
      type: 'error',
      message: 'Authentication required'
    }));
    return;
  }
  
  // Find target user
  const targetWs = findUserByUserId(targetUserId);
  if (!targetWs) {
    ws.send(JSON.stringify({
      type: 'error',
      message: 'User not found or offline'
    }));
    return;
  }
  
  const messageData = {
    type: 'private_message',
    messageId: generateMessageId(),
    fromUsername: senderSession.username,
    fromUserId: senderSession.userId,
    message: sanitizeMessage(message),
    timestamp: Date.now()
  };
  
  // Send to target user
  targetWs.send(JSON.stringify(messageData));
  
  // Confirm to sender
  ws.send(JSON.stringify({
    type: 'private_message_sent',
    messageId: messageData.messageId,
    toUserId: targetUserId
  }));
}

// Handle user disconnection
function handleUserDisconnect(ws) {
  const userSession = userSessions.get(ws);
  
  if (userSession && userSession.currentRoom) {
    handleLeaveRoom(ws, { roomId: userSession.currentRoom });
  }
  
  userSessions.delete(ws);
}

// Broadcast message to all users in a room
function broadcastToRoom(roomId, messageData, excludeWs = null) {
  const roomUsers = chatRooms.get(roomId);
  if (!roomUsers) return;
  
  roomUsers.forEach(ws => {
    if (ws !== excludeWs && ws.readyState === ws.OPEN) {
      try {
        ws.send(JSON.stringify(messageData));
      } catch (error) {
        console.error('Error broadcasting to user:', error);
        roomUsers.delete(ws);
      }
    }
  });
}

// AI response logic
function shouldAIRespond(message) {
  const lowerMessage = message.toLowerCase();
  const triggers = [
    '@asksfu', 'ask sfu', 'hey asksfu', 'asksfu',
    'question:', 'help with', 'what is', 'how to',
    'course', 'cmpt', 'club', 'sfu'
  ];
  
  return triggers.some(trigger => lowerMessage.includes(trigger));
}

async function handleAIResponse(roomId, message, triggerUsername) {
  try {
    // Use existing chat logic but format for group chat
    const response = await generateAIResponse(message);
    
    const aiMessage = {
      type: 'group_message',
      messageId: generateMessageId(),
      username: 'AskSFU Bot',
      userId: 'asksfu-bot',
      message: `@${triggerUsername} ${response}`,
      roomId,
      timestamp: Date.now(),
      isBot: true
    };
    
    // Store and broadcast AI response
    const messages = roomMessages.get(roomId);
    messages.push(aiMessage);
    if (messages.length > 100) {
      messages.shift();
    }
    
    broadcastToRoom(roomId, aiMessage);
    
  } catch (error) {
    console.error('AI response error:', error);
  }
}

// Generate AI response using existing logic
async function generateAIResponse(message) {
  try {
    // Use your existing handleFallbackLLM logic here
    const fallbackLLM = new ChatOpenAI({
      modelName: "gpt-3.5-turbo-16k",
      openAIApiKey: process.env.OPENAI_API_KEY,
      maxTokens: 200 // Shorter responses for group chat
    });
    
    const response = await fallbackLLM.call([
      {
        role: "system",
        content: "You are AskSFU bot in a group chat. Give brief, helpful responses about SFU. Keep responses under 150 words."
      },
      {
        role: "user",
        content: message
      }
    ]);
    
    return response.text || "I'm not sure about that. Try asking a more specific question!";
  } catch (error) {
    return "I'm having trouble processing that question right now.";
  }
}

// Utility functions
function generateUserId() {
  return 'user_' + Math.random().toString(36).substr(2, 9) + '_' + Date.now();
}

function generateMessageId() {
  return 'msg_' + Math.random().toString(36).substr(2, 9) + '_' + Date.now();
}

function sanitizeUsername(username) {
  return username.replace(/[<>\"'/]/g, '').trim().substring(0, 20);
}

function sanitizeMessage(message) {
  return message.replace(/[<>]/g, '').trim().substring(0, 500);
}

function isInappropriate(message) {
  const lowerMessage = message.toLowerCase();
  return bannedWords.some(word => lowerMessage.includes(word));
}

function findUserByUserId(userId) {
  for (const [ws, session] of userSessions) {
    if (session.userId === userId) {
      return ws;
    }
  }
  return null;
}

// New API endpoints for chat features
app.get('/api/chat/rooms', (req, res) => {
  const roomsWithStats = Object.entries(CHAT_ROOMS).map(([id, room]) => ({
    id,
    ...room,
    userCount: chatRooms.get(id).size,
    recentActivity: roomMessages.get(id).length > 0 ? 
      roomMessages.get(id)[roomMessages.get(id).length - 1].timestamp : 0
  }));
  
  res.json({ rooms: roomsWithStats });
});

app.get('/api/chat/stats', (req, res) => {
  const totalUsers = userSessions.size;
  const roomStats = Object.keys(CHAT_ROOMS).map(roomId => ({
    roomId,
    name: CHAT_ROOMS[roomId].name,
    userCount: chatRooms.get(roomId).size,
    messageCount: roomMessages.get(roomId).length
  }));
  
  res.json({
    totalUsers,
    totalRooms: Object.keys(CHAT_ROOMS).length,
    roomStats
  });
});

// Health check for chat system
app.get('/api/chat/health', (req, res) => {
  res.json({
    status: 'healthy',
    activeConnections: userSessions.size,
    activeRooms: Object.keys(CHAT_ROOMS).length,
    timestamp: new Date().toISOString()
  });
});

// News API endpoint
app.get('/api/full-news', async (req, res) => {
  try {
    // For now, return sample news data
    // In a real implementation, you would fetch from SFU's news API or scrape their website
    const sampleNews = `
      <div class="cmp-result-item">
        <img src="https://via.placeholder.com/300x200?text=SFU+News" alt="News Image">
        <div class="cmp-result-card-content">
          <div class="cmp-result-card-title">
            <a href="#">SFU Launches New AI Research Initiative</a>
          </div>
          <div class="cmp-result-card-date">October 5, 2024</div>
          <div class="cmp-result-card-filters">
            <ul class="cmp-result-card-filter1">
              <li>Research</li>
              <li>Technology</li>
            </ul>
          </div>
          <div class="cmp-result-card-link">
            <a href="#">Read more</a>
          </div>
        </div>
      </div>
      <div class="cmp-result-item">
        <img src="https://via.placeholder.com/300x200?text=Campus+News" alt="Campus Image">
        <div class="cmp-result-card-content">
          <div class="cmp-result-card-title">
            <a href="#">Fall Campus Events Begin Next Week</a>
          </div>
          <div class="cmp-result-card-date">September 28, 2024</div>
          <div class="cmp-result-card-filters">
            <ul class="cmp-result-card-filter1">
              <li>Campus Life</li>
              <li>Events</li>
            </ul>
          </div>
          <div class="cmp-result-card-link">
            <a href="#">Read more</a>
          </div>
        </div>
      </div>
      <div class="cmp-result-item">
        <img src="https://via.placeholder.com/300x200?text=Student+News" alt="Student Image">
        <div class="cmp-result-card-content">
          <div class="cmp-result-card-title">
            <a href="#">Student Union Elections Results Announced</a>
          </div>
          <div class="cmp-result-card-date">September 25, 2024</div>
          <div class="cmp-result-card-filters">
            <ul class="cmp-result-card-filter1">
              <li>Student Life</li>
              <li>Governance</li>
            </ul>
          </div>
          <div class="cmp-result-card-link">
            <a href="#">Read more</a>
          </div>
        </div>
      </div>
    `;
    
    res.json({ news: sampleNews });
  } catch (error) {
    console.error('Error fetching news:', error);
    res.status(500).json({ error: 'Failed to fetch news' });
  }
});

// Events API endpoint
app.get('/api/events', async (req, res) => {
  try {
    // For now, return sample events data
    // In a real implementation, you would fetch from SFU's events API or scrape their events page
    const sampleEvents = `
      <div class="cmp-result-item event-item">
        <div class="cmp-result-card-content">
          <div class="cmp-result-card-title">
            <a href="#">AI and Machine Learning Workshop</a>
          </div>
          <div class="cmp-result-card-date">October 15, 2024 - 2:00 PM</div>
          <div class="event-location">Location: AQ 3003</div>
          <div class="cmp-result-card-filters">
            <ul class="cmp-result-card-filter1">
              <li>Workshop</li>
              <li>Technology</li>
            </ul>
          </div>
          <div class="cmp-result-card-link">
            <a href="#">Learn more</a>
          </div>
        </div>
      </div>
      <div class="cmp-result-item event-item">
        <div class="cmp-result-card-content">
          <div class="cmp-result-card-title">
            <a href="#">Career Fair 2024</a>
          </div>
          <div class="cmp-result-card-date">October 20, 2024 - 10:00 AM</div>
          <div class="event-location">Location: Convocation Mall</div>
          <div class="cmp-result-card-filters">
            <ul class="cmp-result-card-filter1">
              <li>Career</li>
              <li>Networking</li>
            </ul>
          </div>
          <div class="cmp-result-card-link">
            <a href="#">Learn more</a>
          </div>
        </div>
      </div>
      <div class="cmp-result-item event-item">
        <div class="cmp-result-card-content">
          <div class="cmp-result-card-title">
            <a href="#">Sustainability Week Keynote</a>
          </div>
          <div class="cmp-result-card-date">October 25, 2024 - 7:00 PM</div>
          <div class="event-location">Location: Diamond Alumni Centre</div>
          <div class="cmp-result-card-filters">
            <ul class="cmp-result-card-filter1">
              <li>Sustainability</li>
              <li>Environment</li>
            </ul>
          </div>
          <div class="cmp-result-card-link">
            <a href="#">Learn more</a>
          </div>
        </div>
      </div>
    `;
    
    res.json({ events: sampleEvents });
  } catch (error) {
    console.error('Error fetching events:', error);
    res.status(500).json({ error: 'Failed to fetch events' });
  }
});