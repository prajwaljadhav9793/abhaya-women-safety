// ---------------------------------------------------------------
// fakeCallScripts.js
// All dialogue scripts + setup options live here so they are easy to edit.
// Each script has an English (en), Hindi (hi) and Marathi (mr) version.
// ---------------------------------------------------------------

export const SCRIPTS = {
  mom: {
    label: "Script A – Mom",
    gender: "female",
    en: "Hello, beta! Where are you? I have been waiting for your call. Are you on your way home? Please call me when you reach.",
    hi: "हैलो बेटा! तुम कहाँ हो? मैं तुम्हारे फ़ोन का इंतज़ार कर रही थी। क्या तुम घर के रास्ते में हो? पहुँचकर मुझे फ़ोन करना।",
    mr: "हॅलो बाळा! तू कुठे आहेस? मी तुझ्या फोनची वाट पाहत होते. तू घरी येत आहेस ना? पोहोचल्यावर मला फोन कर.",
  },
  dad: {
    label: "Script – Dad",
    gender: "male",
    en: "Hello, beta! Where are you? Is everything okay? Please call me as soon as you reach home.",
    hi: "हैलो बेटा! कहाँ हो तुम? सब ठीक है ना? घर पहुँचते ही मुझे फ़ोन करना।",
    mr: "हॅलो बाळा! कुठे आहेस? सगळं ठीक आहे ना? घरी पोहोचल्यावर मला फोन कर.",
  },
  brother: {
    label: "Script B – Brother",
    gender: "male",
    en: "Hey, where are you? I was just checking on you. Give me a call when you are free. I will talk to you later.",
    hi: "अरे, तुम कहाँ हो? मैं बस तुम्हारा हाल पूछ रहा था। फ़्री होकर मुझे फ़ोन करना। मैं बाद में बात करूँगा।",
    mr: "अरे, तू कुठे आहेस? मी फक्त चौकशी करत होतो. वेळ मिळाला की मला फोन कर. मी नंतर बोलतो.",
  },
  friend: {
    label: "Script C – Best Friend",
    gender: "female",
    en: "Hey! I have been trying to reach you. Call me back when you get a chance. I wanted to tell you something important.",
    hi: "अरे! तुम्हारा फ़ोन नहीं लग रहा था। जब समय मिले तो वापस कॉल करना। कुछ ज़रूरी बात बतानी है।",
    mr: "अरे! तुझा फोन लागत नव्हता. वेळ मिळाला की परत फोन कर. मला तुला काहीतरी महत्त्वाचं सांगायचं आहे.",
  },
  custom: {
    label: "Custom dialogue",
    gender: "female",
    en: "",
    hi: "",
    mr: "",
  },
};

// Which script is suggested for each caller preset
export const CALLER_PRESETS = {
  Mom: "mom",
  Dad: "dad",
  Brother: "brother",
  "Best Friend": "friend",
  Custom: "custom",
};

export const LANGUAGES = [
  { value: "en", label: "English", speechLang: "en-IN" },
  { value: "hi", label: "Hindi (हिन्दी)", speechLang: "hi-IN" },
  { value: "mr", label: "Marathi (मराठी)", speechLang: "mr-IN" },
];

export const DELAYS = [
  { value: 10, label: "10 seconds" },
  { value: 30, label: "30 seconds" },
  { value: 60, label: "1 minute" },
  { value: 300, label: "5 minutes" },
];

export const RINGTONES = [
  { value: "classic", label: "Classic" },
  { value: "modern", label: "Modern" },
  { value: "silent", label: "Silent (vibrate only)" },
];

// Text for a script key + language ("" for custom)
export function getScriptText(scriptKey, lang) {
  const s = SCRIPTS[scriptKey];
  return s ? s[lang] || s.en : "";
}
