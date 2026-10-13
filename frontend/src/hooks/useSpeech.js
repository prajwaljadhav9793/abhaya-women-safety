// ---------------------------------------------------------------
// useSpeech.js
// Wraps the browser Speech Synthesis API.
// - Loads the voices installed on the device
// - Picks the closest male/female voice for the chosen language
// - Never lets two dialogues overlap
// ---------------------------------------------------------------
import { useCallback, useEffect, useRef, useState } from "react";

// Browsers don't tell us a voice's gender, so we guess from common voice names.
const FEMALE_RE =
  /female|woman|zira|samantha|susan|hazel|heera|kalpana|swara|veena|lekha|karen|moira|tessa|fiona|victoria|aria|jenny|neerja|kajal|aarohi/i;
const MALE_RE =
  /\bmale\b|\bman\b|david|mark|george|ravi|hemant|prabhat|daniel|alex|fred|rishi|guy|madhur|manohar/i;

function guessGender(voice) {
  if (FEMALE_RE.test(voice.name)) return "female"; // check female first ("female" contains "male")
  if (MALE_RE.test(voice.name)) return "male";
  return "unknown";
}

export default function useSpeech() {
  const supported =
    typeof window !== "undefined" &&
    "speechSynthesis" in window &&
    "SpeechSynthesisUtterance" in window;

  const [voices, setVoices] = useState([]);
  const [speaking, setSpeaking] = useState(false);
  const [voiceInfo, setVoiceInfo] = useState(null); // what voice was really used
  const tokenRef = useRef(0); // increments to cancel older playbacks

  // Voices load asynchronously in many browsers
  useEffect(() => {
    if (!supported) return undefined;
    const load = () => setVoices(window.speechSynthesis.getVoices());
    load();
    window.speechSynthesis.addEventListener("voiceschanged", load);
    return () => window.speechSynthesis.removeEventListener("voiceschanged", load);
  }, [supported]);

  // Choose the closest voice: language first, then gender.
  const pickVoice = useCallback(
    (gender, langCode) => {
      const prefix = langCode.slice(0, 2).toLowerCase();
      let pool = voices.filter((v) => v.lang.toLowerCase().startsWith(prefix));
      const languageMatched = pool.length > 0;
      // Marathi voices are rare: fall back to Hindi (same Devanagari script)
      if (!pool.length && prefix === "mr") {
        pool = voices.filter((v) => v.lang.toLowerCase().startsWith("hi"));
      }
      if (!pool.length) pool = voices.filter((v) => v.lang.toLowerCase().startsWith("en"));
      if (!pool.length) pool = voices;
      const genderMatch = pool.find((v) => guessGender(v) === gender);
      const chosen = genderMatch || pool.find((v) => v.default) || pool[0] || null;
      return { voice: chosen, languageMatched, genderMatched: Boolean(genderMatch) };
    },
    [voices]
  );

  const stop = useCallback(() => {
    tokenRef.current += 1;
    if (supported) window.speechSynthesis.cancel();
    setSpeaking(false);
  }, [supported]);

  // Speak text sentence-by-sentence (avoids Chrome cutting off long speech)
  const speak = useCallback(
    (text, { gender, lang, speechLang, rate = 1, volume = 1, onEnd } = {}) => {
      if (!supported || !text || !text.trim()) return null;
      stop(); // cancel anything already playing -> no overlap
      const myToken = tokenRef.current;

      const { voice, languageMatched, genderMatched } = pickVoice(gender, lang);
      const info = {
        name: voice ? voice.name : "Default voice",
        languageMatched,
        genderMatched,
      };
      setVoiceInfo(info);

      const sentences = text.match(/[^.!?।]+[.!?।]?/g) || [text];
      let index = 0;
      setSpeaking(true);

      const next = () => {
        if (myToken !== tokenRef.current) return; // cancelled by a newer call
        if (index >= sentences.length) {
          setSpeaking(false);
          if (onEnd) onEnd();
          return;
        }
        const u = new SpeechSynthesisUtterance(sentences[index++].trim());
        if (voice) u.voice = voice;
        u.lang = voice ? voice.lang : speechLang;
        u.rate = rate;
        u.volume = volume;
        // If no voice of the right gender exists, shift pitch to simulate it
        u.pitch = genderMatched ? 1 : gender === "female" ? 1.3 : 0.75;
        u.onend = next;
        u.onerror = () => {
          if (myToken === tokenRef.current) setSpeaking(false);
        };
        window.speechSynthesis.speak(u);
      };

      // tiny delay: some browsers ignore speak() right after cancel()
      setTimeout(next, 60);
      return info;
    },
    [supported, stop, pickVoice]
  );

  // Stop speech if the component using this hook unmounts
  useEffect(() => {
    return () => {
      if (supported) window.speechSynthesis.cancel();
    };
  }, [supported]);

  return { supported, voices, speaking, voiceInfo, speak, stop };
}
