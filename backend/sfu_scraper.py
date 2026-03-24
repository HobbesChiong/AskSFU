from flask import Flask, request, jsonify
import requests
from bs4 import BeautifulSoup
import difflib  
import re


app = Flask(__name__)

# Dictionary of SFU-related pages
SFU_LINKS = {
    "clubs": "https://go.sfss.ca/clubs/list",
    "food": "https://www.sfu.ca/food/wheretoeat.html",
    "financial_aid": "https://www.sfu.ca/students/financial-aid/undergraduate.html",
    "counseling": "https://www.sfu.ca/students/health/support-resources/counselling-services.html",
    "admission_appeals": "https://www.sfu.ca/students/enrolment-services/appeals/admission-appeals.html",
    "general_appeals": "https://www.sfu.ca/students/enrolment-services/appeals.html",
    "contact": "https://www.sfu.ca/students/contact/ris.html"
}

# Extend SFU_LINKS to include academic integrity pages
SFU_LINKS.update({
    "academic_integrity_violations": "https://www.sfu.ca/students/enrolment-services/academic-integrity/violations.html",
    "academic_integrity_risks": "https://www.sfu.ca/students/enrolment-services/academic-integrity/putting-yourself-at-risk.html",
    "academic_integrity_support": "https://www.sfu.ca/students/enrolment-services/academic-integrity/support-and-resources.html",
    "academic_integrity_ai": "https://www.sfu.ca/students/enrolment-services/academic-integrity/using-generative-ai.html",
    "academic_integrity_process": "https://www.sfu.ca/students/enrolment-services/academic-integrity/academic-disciplinary-process.html",
    "academic_integrity_ombudsperson": "https://www.sfu.ca/ombudsperson.html"
})

CLUB_KEYWORDS = {
    # Tech & Programming
    "coding": ["developers", "google developer", "cybersecurity", "programming", "software", "game development", "AI", "competitive programming"],
    "programming": ["developers", "google developer", "coding", "software", "hacking", "AI", "competitive programming"],
    "developer": ["developers", "google developer", "cybersecurity", "software", "app development", "game development"],
    "cybersecurity": ["hacking", "security", "privacy", "ethical hacking", "developers"],
    "game development": ["game developers", "game design", "game programming", "gamedev"],
    "AI": ["machine learning", "deep learning", "data science", "neural networks", "quantum computing"],
    "data science": ["AI", "statistics", "machine learning", "big data"],

    # Business & Finance
    "business": ["beedie", "entrepreneurship", "finance", "marketing", "startups", "investment"],
    "entrepreneurship": ["business", "startups", "founders", "finance", "networking"],
    "marketing": ["business", "advertising", "social media", "branding"],
    "finance": ["investing", "stocks", "trading", "accounting", "investment", "financial literacy"],
    "investment": ["finance", "stocks", "equity", "venture capital", "real estate"],

    # Debating & Public Speaking
    "debating": ["debate", "public speaking", "model un", "argumentation", "toastmasters"],
    "debate": ["debating", "public speaking", "model un", "critical thinking"],
    "public speaking": ["debating", "toastmasters", "leadership", "speech", "presentation"],

    # Science & Engineering
    "robotics": ["engineering", "hardware", "electronics", "AI", "automation", "mechatronics"],
    "engineering": ["robotics", "civil", "mechanical", "electrical", "design", "aerospace", "rocket"],
    "quantum computing": ["AI", "machine learning", "data science", "physics", "computing"],
    "data analytics": ["finance", "business", "big data", "sports analytics", "statistics"],

    # Sports & Outdoor Activities
    "hiking": ["outdoors", "adventure", "camping", "trekking"],
    "climbing": ["rock climbing", "bouldering", "indoor climbing"],
    "badminton": ["racket sports", "tennis", "ping pong"],
    "skiing": ["snowboarding", "winter sports", "mountain sports"],
    "martial arts": ["taekwondo", "karate", "judo", "bjj", "self-defense"],
    "dragon boat": ["rowing", "paddling", "team sports"],

    # Culture & Arts
    "music": ["choir", "jazz", "orchestra", "rock music", "band"],
    "dance": ["bhangra", "giddha", "hip hop", "latin dance", "bollywood", "salsa", "bachata"],
    "photography": ["photo", "camera", "visual arts", "media"],
    "anime": ["manga", "cosplay", "animation", "japanese culture"],
    "writing": ["creative writing", "poetry", "literature", "novels"],
    "graphic novels": ["comics", "illustration", "visual storytelling"],

    # Social & Cultural
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

    # Miscellaneous
    "gaming": ["esports", "smash", "pokemon go", "tabletop"],
    "technology": ["AI", "robotics", "cybersecurity", "quantum computing"],
    "food": ["foodie", "cuisine", "restaurants", "cooking"],
    "photography": ["visual arts", "photo club", "cinematography"],
    "medicine": ["pre-med", "healthcare", "biology", "science"],
    "law": ["pre-law", "law school", "justice", "legal studies"]
}


# List of all clubs extracted from your data
SFU_CLUBS = [
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
]

def extract_club_keywords(query):
    """Extract meaningful keywords from a user's query."""
    query = query.lower()
    query = re.sub(r"[^a-zA-Z0-9\s]", "", query)  # Remove punctuation
    keywords = query.split()

    # Remove unnecessary words
    stopwords = {"is", "there", "a", "for", "club", "at", "sfu", "any", "do", "you", "have"}
    filtered_keywords = [word for word in keywords if word not in stopwords]

    return filtered_keywords  # Return a list of keywords

def find_club(query):
    """Find relevant clubs based on user query with fuzzy matching and strict keyword mapping."""
    keywords = extract_club_keywords(query)
    matched_clubs = set()  # Store unique clubs

    # **Step 1: Direct Matching with Club Names**
    for keyword in keywords:
        for club in SFU_CLUBS:
            if keyword in club.lower():
                matched_clubs.add(club)

        # **Step 2: Check for Keywords in CLUB_KEYWORDS Dictionary**
        if keyword in CLUB_KEYWORDS:
            for related in CLUB_KEYWORDS[keyword]:
                for club in SFU_CLUBS:
                    if related in club.lower():
                        matched_clubs.add(club)

    # **Step 3: Fuzzy Matching for Backup (if no exact match found)**
    if not matched_clubs:
        for keyword in keywords:
            close_matches = difflib.get_close_matches(keyword, SFU_CLUBS, n=3, cutoff=0.6)
            matched_clubs.update(close_matches)

    # **Prepare the Final Response**
    if matched_clubs:
        club_list = "\n- ".join(list(matched_clubs)[:3])  # Show up to 3 clubs
        return {
            "match": True,
            "message": f"✅ Here are some clubs related to **'{query}'** at SFU:\n- {club_list}\n\nFor more clubs, visit: [SFU Club List](https://go.sfss.ca/clubs/list)"
        }

    return {
        "match": False,
        "message": f"❌ No exact match for '{query}', but you can check all clubs here: [SFU Club List](https://go.sfss.ca/clubs/list)"
    }
    
def fetch_academic_integrity_info(topic):
    """Fetch academic integrity-related information from SFU pages."""
    url = SFU_LINKS.get(topic)
    if not url:
        return {"error": "Invalid academic integrity topic requested."}

    try:
        response = requests.get(url)
        response.raise_for_status()
        soup = BeautifulSoup(response.text, "html.parser")

        # Extract relevant text from SFU page
        paragraphs = soup.find_all("p")
        extracted_text = "\n".join([p.text for p in paragraphs if len(p.text) > 50])[:1500]  # Limit response length

        return {"summary": extracted_text, "more_info": url}
    except requests.RequestException as e:
        return {"error": f"Failed to fetch academic integrity details: {str(e)}"}

# API endpoint for academic integrity requests
@app.route("/scrape/academic-integrity/<topic>", methods=["GET"])
def get_academic_integrity_info(topic):
    result = fetch_academic_integrity_info(topic)
    return jsonify(result)

# API endpoint to check if a club exists
@app.route("/scrape/clubs/check", methods=["POST"])
def check_club():
    data = request.json
    query = data.get("query", "")
    result = find_club(query)
    return jsonify(result)

if __name__ == "__main__":
    app.run(port=5001, debug=True)