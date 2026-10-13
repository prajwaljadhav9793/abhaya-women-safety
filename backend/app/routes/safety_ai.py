"""ABHAYA Guardian AI Safety Intelligence Engine
Provides rich, context-aware personal safety guidance, legal rights information,
emergency protocol instructions, self-defense tactics, and ABHAYA platform navigation.
Serves as an offline-resilient, always-available safety reasoning system that complements
or seamlessly falls back from cloud LLMs (Gemini).
"""

import re

# Comprehensive Safety Knowledge Base
KNOWLEDGE_TOPICS = {
    "sos": {
        "keywords": ["sos", "panic", "emergency button", "red button", "trigger sos", "alert contacts", "how does sos work"],
        "title": "ABHAYA Emergency SOS Protocol",
        "content": (
            "### 🚨 How ABHAYA Emergency SOS Works\n\n"
            "When you press the **Red SOS Button** (floating on any screen):\n\n"
            "1. **Instant Geolocation Capture:** Your exact GPS coordinates, accuracy radius, and nearest street address are immediately resolved.\n"
            "2. **Multi-Channel Dispatch:**\n"
            "   - **WhatsApp Emergency Alert:** Automatically dispatches a live location tracking link and alert message to your designated emergency contacts.\n"
            "   - **SMS & Gateway Broadcast:** If configured, sends high-priority SMS alerts directly via national gateways.\n"
            "3. **Incident Timestamping:** Logs an emergency event in the secure tamper-proof history vault.\n"
            "4. **Emergency Backup:** In an extreme crisis, immediately dial **112** (National Emergency) or **1091** (Women's Helpline)."
        ),
        "suggestions": ["/contacts", "/nearby"]
    },
    "journey_eta": {
        "keywords": ["journey", "eta", "time", "late", "3 min", "3 minutes", "countdown", "guardian", "overdue", "timer"],
        "title": "Live Journey Guardian & 3-Minute Overdue Escalation",
        "content": (
            "### 🛡️ Live Journey Guardian & Automated SOS Escalation\n\n"
            "The **Live Journey Guardian** protects your commute with proactive tracking:\n\n"
            "1. **Live Trip Clock & Target ETA:** Tracks your elapsed travel time against the estimated route duration.\n"
            "2. **Overdue Safety Challenge:** If your travel time exceeds the calculated ETA, an audio alert and visual modal prompts:\n"
            "   > *\"Are you safe? We noticed you haven't arrived at your destination yet.\"*\n"
            "3. **3-Minute (180s) Grace Window:** You have 3 minutes to confirm *\"Yes, I'm Safe\"* or adjust ETA by +5 / +10 minutes.\n"
            "4. **Automatic SOS Escalation:** If no confirmation is received within **180 seconds**, ABHAYA automatically triggers an **Emergency SOS broadcast** to your trusted contacts with your last known GPS coordinates."
        ),
        "suggestions": ["/journey", "/routes"]
    },
    "safe_routes": {
        "keywords": ["safe route", "safest route", "map", "lighting", "crime", "dark street", "navigation", "route intelligence", "street light"],
        "title": "Safe Route Intelligence & Crime Heatmaps",
        "content": (
            "### 🗺️ Safe Route Intelligence vs Standard Routing\n\n"
            "Unlike typical navigation apps that optimize purely for speed, **ABHAYA Safe Route Intelligence** balances travel time with personal security:\n\n"
            "1. **Safety Score Matrix (0–100):** Each street segment is evaluated using crime incident reports, lighting conditions, and road visibility.\n"
            "2. **Well-Lit Corridors:** Favors arterial roads with active street lamps, commercial activity, and police presence.\n"
            "3. **Safe Haven Nodes:** Highlights nearby 24/7 petrol pumps, lit convenience stores, transit hubs, and hospitals along the route.\n"
            "4. **Incident Hazard Warning:** Flags recent verified harassment or poor lighting reports within a 450m radius."
        ),
        "suggestions": ["/routes", "/reports"]
    },
    "fake_call": {
        "keywords": ["fake call", "incoming call", "pretend call", "disarm", "awkward situation", "creepy person", "excuse", "cab driver"],
        "title": "Fake Incoming Call Tactical Tool",
        "content": (
            "### 📞 Fake Incoming Call Disarming Tool\n\n"
            "The **Fake Call** module is designed to help you de-escalate or escape uncomfortable or threatening situations without confrontation:\n\n"
            "1. **Realistic Call Screen:** Simulates an authentic incoming phone call with caller ID (e.g., *Dad, Brother, Inspector Rao, Mom*).\n"
            "2. **Authentic Ringtone & Vibration:** Plays real phone ringing sounds and device vibrations.\n"
            "3. **Interactive Script Prompts:** Provides on-screen dialogue prompts so you sound natural talking to someone waiting for you at the corner.\n"
            "4. **Quick Triggers:** Set instant trigger or 10s / 30s / 60s timed delay while getting into a cab or walking past a suspicious group."
        ),
        "suggestions": ["/fake-call", "/nearby"]
    },
    "night_travel": {
        "keywords": ["night", "walking alone", "dark", "night travel", "alone at night", "traveling late", "late night"],
        "title": "Night Travel Safety Essentials",
        "content": (
            "### 🌙 Essential Night Travel Safety Guidelines\n\n"
            "When walking or traveling alone after dark:\n\n"
            "1. **Keep Both Ears Free:** Never wear both headphones or look down at your phone while walking. Stay 100% aware of your surroundings.\n"
            "2. **Walk Against Traffic:** Walk on the side facing oncoming traffic so cars cannot approach you unseen from behind.\n"
            "3. **Stick to Lit Corridors:** Avoid unlit alleys, parks, or secluded underpasses even if it adds 5 minutes to your commute.\n"
            "4. **Keep Keys in Hand:** Hold house/car keys firmly between knuckles — ready as an instant self-defense tool.\n"
            "5. **Active Decoy:** If someone feels suspicious, make a loud call: *\"I'm right at the chowk, see you in 2 minutes.\"*\n"
            "6. **Activate ABHAYA:** Start a **Live Journey** or keep **Fake Call** 1-tap ready."
        ),
        "suggestions": ["/journey", "/fake-call", "/nearby"]
    },
    "cab_auto": {
        "keywords": ["cab", "taxi", "uber", "ola", "auto", "rickshaw", "driver", "transport", "bus"],
        "title": "Cab & Public Transport Safety Precautions",
        "content": (
            "### 🚕 Cab & Auto-Rickshaw Safety Precautions\n\n"
            "Before and during public transit rides:\n\n"
            "1. **Verify Before Boarding:** Match vehicle number plate and driver photo. Never get into a cab where the driver name doesn't match.\n"
            "2. **Inspect Child Locks:** Before closing the door, verify the interior door handle opens from inside.\n"
            "3. **Sit in the Back Seat:** Always sit diagonally behind the driver — it prevents them from reaching you and makes physical control impossible.\n"
            "4. **Share Live Trip:** Share your live journey with a contact before the car pulls away.\n"
            "5. **If the Driver Takes a Detour:** Firmly speak up: *\"Why are you taking this route? I am tracking on GPS and my family is waiting at the destination.\"* If they persist, dial **112** immediately."
        ),
        "suggestions": ["/journey", "/nearby"]
    },
    "legal_rights": {
        "keywords": ["legal", "rights", "police rights", "arrest", "zero fir", "fir", "law", "ipc", "bns", "court", "station", "advocate"],
        "title": "Legal Rights of Women in India (CrPC & Bharatiya Nyaya Sanhita)",
        "content": (
            "### ⚖️ Crucial Legal Rights of Women in India\n\n"
            "Every woman is legally protected by these fundamental rights:\n\n"
            "1. **Right to Zero FIR:** You can lodge an FIR at **ANY police station** regardless of where the incident occurred. Police cannot refuse to register it.\n"
            "2. **No Arrest After Sunset:** Under Section 46(4) of CrPC, a woman cannot be arrested after sunset and before sunrise, except in extraordinary circumstances by a woman officer with prior magistrate permission.\n"
            "3. **Right to Privacy During Statements:** Statements regarding sexual offenses must be recorded by a female police officer at the victim's residence or choice of venue (Section 164 CrPC).\n"
            "4. **Free Legal Aid:** All women are entitled to free legal representation provided by the Legal Services Authority (NALSA).\n"
            "5. **IPC/BNS Protections:**\n"
            "   - **Section 354A:** Sexual harassment (punishable up to 3 years imprisonment).\n"
            "   - **Section 354D:** Physical & electronic stalking.\n"
            "   - **Section 509:** Words, gestures, or acts outraging the modesty of a woman."
        ),
        "suggestions": ["/reports", "/nearby"]
    },
    "self_defense": {
        "keywords": ["self defense", "defense", "physical attack", "fighting back", "martial art", "grabbed", "strangled", "attacked", "defend"],
        "title": "Tactical Self-Defense Moves for Emergency Escapes",
        "content": (
            "### 🥋 High-Impact Self-Defense & Escape Tactics\n\n"
            "Remember: The goal is **not to win a fight**, but to **stun the attacker and sprint to safety**:\n\n"
            "1. **High-Vulnerability Targets:**\n"
            "   - **Eyes:** Gouge or scratch using thumbs.\n"
            "   - **Nose / Chin:** Drive heel of palm upward under the nose with full body weight.\n"
            "   - **Throat:** Strike the base of the throat or windpipe.\n"
            "   - **Groin / Shin:** Hard upward knee to groin or sharp stomp with heel onto instep.\n"
            "2. **Escape Wrist Grabs:** Rotate your wrist sharply toward the attacker's **thumb** (the weakest point of grip) and yank your arm back.\n"
            "3. **Vocal Weapon:** Yell in a fierce, booming voice: **\"BACK OFF! POLICE IS ON THE WAY!\"** (Do not scream in panic; project authority).\n"
            "4. **Improvised Defense Tools:** Use pens, car keys between fingers, water bottles, or aerosol spray (deodorant/pepper spray) directly into eyes."
        ),
        "suggestions": ["/nearby", "/contacts"]
    },
    "following_stalking": {
        "keywords": ["followed", "following me", "stalker", "someone behind me", "suspicious person", "car following", "being chased"],
        "title": "Emergency Steps if Someone is Following You",
        "content": (
            "### ⚠️ Emergency Action Protocol: Being Followed\n\n"
            "If you suspect someone is following you on foot or in a vehicle:\n\n"
            "1. **Never Go Straight Home:** Entering your home reveals where you live and traps you. Head toward a crowded, well-lit public space.\n"
            "2. **Confirm Intent:** Cross the street. If they cross too, change your walking pace or take 3 consecutive right turns (circling back). If they remain, you are being followed.\n"
            "3. **Enter Safe Havens:** Walk into the nearest bank ATM, petrol pump, pharmacy, restaurant, or supermarket.\n"
            "4. **Turn and Look Them in the Eye:** Perpetrators rely on secrecy. Making direct eye contact shows you recognize their face and removes surprise.\n"
            "5. **Immediate Call:** Dial **112** (Police) or **1091** (Women Helpline) immediately and state: *\"I am being followed at [current location]. Please dispatch a patrol car.\"*"
        ),
        "suggestions": ["/nearby", "/journey", "/contacts"]
    },
    "helplines": {
        "keywords": ["helpline", "helplines", "numbers", "police number", "ambulance number", "emergency numbers", "toll free", "call police"],
        "title": "National & State Emergency Helplines (24/7 Toll-Free)",
        "content": (
            "### 📞 Verified 24/7 Emergency Helplines (India & Maharashtra)\n\n"
            "- 🚨 **112** — National Emergency Service (Police, Fire, Medical)\n"
            "- 🌸 **1091** — Women's Helpline (24/7 Dedicated Support)\n"
            "- 🛡️ **181** — Sakhi Women in Distress Helpline\n"
            "- 🚑 **108** — Free Emergency Ambulance & Trauma Care\n"
            "- 🚒 **101** — Fire Brigade & Disaster Response\n"
            "- 🚆 **139** — Railway Security & RPF 'Meri Saheli'\n"
            "- 💻 **1930** — National Cyber Crime Reporting Helpline\n"
            "- 📍 **Kolhapur Police Control:** `0231-2653960` | CPR Hospital: `0231-2641155`"
        ),
        "suggestions": ["/nearby", "/contacts"]
    },
    "cyber_safety": {
        "keywords": ["cyber", "online", "instagram", "facebook", "whatsapp", "morphed", "blackmail", "online harassment", "leak", "photos"],
        "title": "Cyber Safety, Online Harassment & Blackmail",
        "content": (
            "### 💻 Cyber Safety & Anti-Blackmail Protection\n\n"
            "If you face online harassment, stalking, or morphing:\n\n"
            "1. **Do NOT Delete Messages:** Preserve digital evidence! Take full screenshots showing timestamps, usernames, phone numbers, and profile URLs.\n"
            "2. **Do NOT Pay or Comply:** Blackmailers never stop after payment; compliance leads to higher demands.\n"
            "3. **Report Immediately:**\n"
            "   - Call **1930** (National Cyber Crime Helpline).\n"
            "   - Lodge an official complaint at **cybercrime.gov.in**.\n"
            "4. **Remove Intimate Images:** Use **StopNCII.org** (Stop Non-Consensual Intimate Images) to generate privacy hashes that prevent images from being uploaded across Meta, Instagram, and Reddit."
        ),
        "suggestions": ["/reports", "/nearby"]
    },
    "kolhapur": {
        "keywords": ["kolhapur", "cpr", "cbs", "kit", "university", "shahupuri", "rajarampuri", "sakhi", "damini"],
        "title": "Kolhapur Safety Infrastructure & Emergency Havens",
        "content": (
            "### 🏛️ Kolhapur Safe Havens & Police Support\n\n"
            "- **Damini Pathak (Kolhapur Police):** Special quick-response women's motorized patrol squad for college corridors and transit points (Dial 112 / 1091).\n"
            "- **Sakhi One Stop Centre (OSC):** Located inside CPR Civil Hospital premises (Bhausinghji Road). Offers 24/7 medical treatment, counseling, police desk, and shelter under one roof (`0231-2651181`).\n"
            "- **Major Police Stations:**\n"
            "  - Shahupuri Police (Station Rd / CBS): `0231-2651033`\n"
            "  - Rajarampuri Police (1st Lane): `0231-2524333`\n"
            "  - Gokul Shirgaon Chowki (Near KIT College): `0231-2672333`\n"
            "- **24/7 Emergency Care:** Chhatrapati Pramila Raje (CPR) General Hospital (`0231-2641155`) and Aster Aadhar Hospital (`0231-6622555`)."
        ),
        "suggestions": ["/nearby", "/routes"]
    }
}

def analyze_safety_intent(query):
    """Matches user query against safety knowledge base using semantic keyword scoring."""
    q = query.lower().strip()
    
    # 1. Check for immediate acute emergency keywords
    emergency_pattern = r"\b(help me|save me|someone is following|being attacked|in danger|urgent|kill|kidnap|rape|assault|emergency|stalker|call police now)\b"
    is_urgent = bool(re.search(emergency_pattern, q))
    
    best_match = None
    best_score = 0
    
    for topic_key, topic_data in KNOWLEDGE_TOPICS.items():
        score = 0
        for kw in topic_data["keywords"]:
            if kw in q:
                score += len(kw.split()) * 10
            elif any(w in q.split() for w in kw.split()):
                score += 3
        if score > best_score:
            best_score = score
            best_match = topic_data

    # If good match found
    if best_match and best_score >= 8:
        reply = best_match["content"]
        if is_urgent:
            reply = (
                "🚨 **URGENT EMERGENCY ALERT DETECTED:**\n\n"
                "> If you are in immediate physical danger, **press the RED SOS BUTTON right now** "
                "or dial **112 / 1091 immediately**. Do not wait to read.\n\n"
                "---\n\n"
            ) + reply
        return reply, best_match.get("suggestions", ["/nearby", "/contacts"])
        
    # If conversational greeting or general questions
    if any(w in q for w in ["hi", "hello", "hey", "namaste", "good morning", "good evening", "who are you", "what can you do"]):
        reply = (
            "### 👋 Hello! I am ABHAYA Guardian AI\n\n"
            "I am your 24/7 personal safety assistant and voice companion. Here is how I can protect and guide you:\n\n"
            "- 🚨 **Explain Emergency SOS:** Multi-channel live location & WhatsApp broadcast.\n"
            "- 🛡️ **Live Journey Guardian:** ETA tracking and 3-minute overdue safety alarms.\n"
            "- 🗺️ **Safe Route Navigation:** Lit roads, crime score heatmaps & safe havens.\n"
            "- 📞 **Tactical Fake Call:** Realistic caller ID & scripts to escape uncomfortable situations.\n"
            "- ⚖️ **Legal Rights:** Zero FIR, CrPC 46, Section 354, and free legal aid for women.\n"
            "- 📍 **Nearby Safe Havens:** Verified police chowkis, 24/7 hospitals, and Sakhi centres.\n\n"
            "Ask me any question by typing or tapping the 🎙️ **Microphone** to speak!"
        )
        return reply, ["/journey", "/routes", "/fake-call", "/nearby"]
        
    # Fallback contextual response for any arbitrary question
    reply = (
        f"### 🛡️ Safety Guidance: {query.strip().capitalize()}\n\n"
        "Here are key safety recommendations and tactical protocols regarding your query:\n\n"
        "1. **Stay Alert & Proactive:** Maintain situational awareness. Keep your head up, avoid distractions like excessive phone screen time in isolated areas, and trust your intuition.\n"
        "2. **Use ABHAYA Active Tools:**\n"
        "   - Use **Live Journey Guardian** whenever traveling alone.\n"
        "   - Use **Nearby Help** to find the closest verified police chowki or 24/7 hospital.\n"
        "   - Use **Fake Call** if you feel an uncomfortable or predatory presence nearby.\n"
        "3. **Emergency Numbers to Remember:**\n"
        "   - **112** (All Emergencies)\n"
        "   - **1091** (Women's Helpline)\n"
        "   - **181** (Sakhi Crisis Centre)\n\n"
        "In any threatening situation, do not hesitate to press the floating red **SOS** button to notify your trusted contacts with your live location."
    )
    return reply, ["/nearby", "/routes", "/journey", "/contacts"]

