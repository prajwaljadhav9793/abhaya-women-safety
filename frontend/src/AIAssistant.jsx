import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import {
  Bot, Mic, MicOff, Volume2, VolumeX, Send, Trash2, Copy, Check,
  Shield, AlertTriangle, Sparkles, Navigation, PhoneCall, ExternalLink,
  Info, Compass, ChevronRight, RefreshCw, Flame, HeartHandshake, ShieldCheck, User
} from "lucide-react";
import { api } from "./api.js";

// Quick Preset Suggestions
const PRESET_TOPICS = [
  { label: "🌙 Night Travel Safety", query: "How do I stay safe walking alone at night?" },
  { label: "🚨 How SOS Works", query: "How does the ABHAYA emergency SOS alert work?" },
  { label: "⚖️ Zero FIR & Legal Rights", query: "What is Zero FIR and my legal rights under Indian law?" },
  { label: "📞 Fake Incoming Call", query: "How to use fake call to escape uncomfortable situations?" },
  { label: "🛡️ 3-Min Journey ETA Alert", query: "How does the 3 min overdue journey ETA alarm work?" },
  { label: "🥋 Street Self Defense", query: "What are effective self defense moves against physical attack?" },
  { label: "🚕 Cab & Auto Security", query: "What safety precautions should I take in a cab or auto?" },
  { label: "💻 Cyber Stalking & Blackmail", query: "How to handle cyber harassment, morphing and online blackmail?" },
  { label: "🏛️ Kolhapur Safe Havens", query: "What are the emergency safe havens and hospitals in Kolhapur?" },
  { label: "⚠️ Being Followed", query: "What should I do immediately if someone is following me?" }
];

// Clean speech utility: removes markdown formatting for natural voice playback
function stripMarkdownForSpeech(text) {
  if (!text) return "";
  return text
    .replace(/###\s+/g, "")
    .replace(/##\s+/g, "")
    .replace(/#\s+/g, "")
    .replace(/\*\*([^*]+)\*\*/g, "$1")
    .replace(/\*([^*]+)\*/g, "$1")
    .replace(/_([^_]+)_/g, "$1")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/>\s+/g, "")
    .replace(/---+/g, "")
    .replace(/[-*•]\s+/g, ". ")
    .replace(/\n+/g, ". ")
    .replace(/\s+/g, " ")
    .trim();
}

// Lightweight, safe markdown formatter for assistant messages
function FormattedMessage({ text }) {
  if (!text) return null;

  const lines = text.split("\n");
  const elements = [];
  let currentList = null; // { type: 'ol' | 'ul', items: [] }

  const formatInline = (str) => {
    if (!str) return "";
    return str
      .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
      .replace(/\*([^*]+)\*/g, "<em>$1</em>")
      .replace(/`([^`]+)`/g, "<code>$1</code>");
  };

  const flushList = (key) => {
    if (currentList && currentList.items.length > 0) {
      if (currentList.type === "ol") {
        elements.push(
          <ol key={`ol-${key}`} className="ai-md-ol">
            {currentList.items.map((item, idx) => (
              <li key={idx}>
                <span className="ol-index">{item.num}</span>
                <div
                  className="ol-content"
                  dangerouslySetInnerHTML={{ __html: formatInline(item.text) }}
                />
              </li>
            ))}
          </ol>
        );
      } else {
        elements.push(
          <ul key={`ul-${key}`} className="ai-md-ul">
            {currentList.items.map((item, idx) => (
              <li key={idx} dangerouslySetInnerHTML={{ __html: formatInline(item.text) }} />
            ))}
          </ul>
        );
      }
      currentList = null;
    }
  };

  lines.forEach((rawLine, idx) => {
    const line = rawLine.trim();
    if (!line) {
      flushList(idx);
      return;
    }

    // Urgent alert banner
    if (line.includes("URGENT EMERGENCY ALERT")) {
      flushList(idx);
      elements.push(
        <div key={idx} className="ai-urgent-alert-banner">
          <AlertTriangle size={18} />
          <span>{line.replace(/[*_#]/g, "")}</span>
        </div>
      );
      return;
    }

    // Heading 3
    if (line.startsWith("### ")) {
      flushList(idx);
      elements.push(
        <h4 key={idx} className="ai-md-h3">
          {line.replace("### ", "")}
        </h4>
      );
      return;
    }

    // Heading 2
    if (line.startsWith("## ")) {
      flushList(idx);
      elements.push(
        <h3 key={idx} className="ai-md-h2">
          {line.replace("## ", "")}
        </h3>
      );
      return;
    }

    // Quote block
    if (line.startsWith("> ")) {
      flushList(idx);
      elements.push(
        <blockquote key={idx} className="ai-md-quote">
          {line.replace("> ", "")}
        </blockquote>
      );
      return;
    }

    // Ordered list item (e.g. "1. **Keep Both Ears Free:** Never wear...")
    const ordMatch = line.match(/^(\d+)\.\s+(.+)/);
    if (ordMatch) {
      const num = ordMatch[1];
      const content = ordMatch[2];
      if (!currentList || currentList.type !== "ol") {
        flushList(idx);
        currentList = { type: "ol", items: [] };
      }
      currentList.items.push({ num, text: content });
      return;
    }

    // Unordered list item (e.g. "- Stick to lit corridors", "* Always stay alert")
    const unordMatch = line.match(/^[-*•]\s+(.+)/);
    if (unordMatch) {
      const content = unordMatch[1];
      if (!currentList || currentList.type !== "ul") {
        flushList(idx);
        currentList = { type: "ul", items: [] };
      }
      currentList.items.push({ text: content });
      return;
    }

    // Separator
    if (line === "---") {
      flushList(idx);
      elements.push(<hr key={idx} className="ai-md-hr" />);
      return;
    }

    // Regular line / Paragraph
    flushList(idx);
    elements.push(
      <p
        key={idx}
        className="ai-md-p"
        dangerouslySetInnerHTML={{ __html: formatInline(line) }}
      />
    );
  });

  flushList("end");

  return <div className="ai-formatted-content">{elements}</div>;
}

export default function AIAssistant() {
  const navigate = useNavigate();
  const [messages, setMessages] = useState([
    {
      id: "welcome",
      role: "assistant",
      text: (
        "### 👋 Namaste! I am ABHAYA Guardian AI\n\n"
        + "I am your 24/7 personal safety intelligence companion and voice assistant. "
        + "I can guide you on:\n\n"
        + "- 🚨 **Emergency SOS & Live Dispatch:** How alerts & GPS broadcast work.\n"
        + "- 🛡️ **Live Journey Guardian:** Real-time ETA tracking & 3-minute overdue safety challenge.\n"
        + "- 🗺️ **Safe Route Intelligence:** Well-lit streets, crime heatmaps, and safe haven waypoints.\n"
        + "- 📞 **Tactical Fake Call:** Realistic calls & dialogue scripts to de-escalate danger.\n"
        + "- ⚖️ **Legal Protections:** Zero FIR, CrPC 46, Section 354, and free legal aid.\n"
        + "- 📍 **Nearby Safe Havens:** Verified police chowkis, 24/7 civil hospitals, and Sakhi centres.\n\n"
        + "Type your safety question below or tap the 🎙️ **Microphone** to speak!"
      ),
      suggestions: ["/journey", "/routes", "/nearby", "/fake-call"],
      engine: "ABHAYA Guardian AI Engine"
    }
  ]);
  const [inputText, setInputText] = useState("");
  const [loading, setLoading] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [interimSpeech, setInterimSpeech] = useState("");
  const [autoSpeak, setAutoSpeak] = useState(false);
  const [speakingMessageId, setSpeakingMessageId] = useState(null);
  const [copiedId, setCopiedId] = useState(null);
  const [voiceAvailable, setVoiceAvailable] = useState(false);

  const messagesEndRef = useRef(null);
  const recognitionRef = useRef(null);

  // Auto scroll to bottom
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, loading, interimSpeech]);

  // Initialize Speech Recognition & Synthesis check
  useEffect(() => {
    const SpeechRec = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRec) {
      setVoiceAvailable(true);
      const rec = new SpeechRec();
      rec.continuous = false;
      rec.interimResults = true;
      rec.lang = "en-IN"; // English (India) with fallback to Hindi/local accents

      rec.onstart = () => {
        setIsListening(true);
        setInterimSpeech("");
      };

      rec.onresult = (event) => {
        let interim = "";
        let final = "";
        for (let i = event.resultIndex; i < event.results.length; ++i) {
          if (event.results[i].isFinal) {
            final += event.results[i][0].transcript;
          } else {
            interim += event.results[i][0].transcript;
          }
        }
        if (interim) setInterimSpeech(interim);
        if (final) {
          setInputText((prev) => (prev ? prev + " " + final : final).trim());
          setInterimSpeech("");
        }
      };

      rec.onerror = (e) => {
        console.warn("Speech recognition error:", e.error);
        setIsListening(false);
        setInterimSpeech("");
      };

      rec.onend = () => {
        setIsListening(false);
      };

      recognitionRef.current = rec;
    }

    return () => {
      if (window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  // Toggle Voice Listening
  const toggleListening = () => {
    if (!recognitionRef.current) {
      alert("Speech recognition is not supported in this browser. Please use Chrome, Edge, or Safari.");
      return;
    }

    if (isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
    } else {
      // Stop any active speech synthesis before listening
      if (window.speechSynthesis) window.speechSynthesis.cancel();
      setSpeakingMessageId(null);
      try {
        recognitionRef.current.start();
      } catch (e) {
        console.error("Failed to start speech recognition:", e);
      }
    }
  };

  // Speak message aloud (TTS)
  const speakMessage = (msgId, rawText) => {
    if (!window.speechSynthesis) {
      alert("Text-to-speech is not supported by your browser.");
      return;
    }

    // If currently speaking this message, stop it
    if (speakingMessageId === msgId) {
      window.speechSynthesis.cancel();
      setSpeakingMessageId(null);
      return;
    }

    window.speechSynthesis.cancel();
    const cleanText = stripMarkdownForSpeech(rawText);
    const utterance = new SpeechSynthesisUtterance(cleanText);

    // Pick best available voice
    const voices = window.speechSynthesis.getVoices();
    const naturalVoice = voices.find(
      (v) =>
        (v.lang.includes("en-IN") || v.lang.includes("en-GB") || v.lang.includes("en-US")) &&
        (v.name.includes("Female") || v.name.includes("Zira") || v.name.includes("Google") || v.name.includes("Samantha"))
    ) || voices[0];

    if (naturalVoice) utterance.voice = naturalVoice;
    utterance.rate = 1.0;
    utterance.pitch = 1.05;

    utterance.onstart = () => {
      setSpeakingMessageId(msgId);
    };

    utterance.onend = () => {
      setSpeakingMessageId(null);
    };

    utterance.onerror = () => {
      setSpeakingMessageId(null);
    };

    window.speechSynthesis.speak(utterance);
  };

  // Copy message text to clipboard
  const handleCopy = (id, text) => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(stripMarkdownForSpeech(text));
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2500);
    }
  };

  // Send message
  const handleSend = async (textToSend) => {
    const query = (textToSend || inputText).trim();
    if (!query || loading) return;

    if (isListening && recognitionRef.current) {
      recognitionRef.current.stop();
      setIsListening(false);
    }

    const userMsg = {
      id: `u-${Date.now()}`,
      role: "user",
      text: query,
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
    };

    const newHistory = [...messages, userMsg];
    setMessages(newHistory);
    setInputText("");
    setInterimSpeech("");
    setLoading(true);

    try {
      // Build conversation history for API
      const historyPayload = newHistory
        .filter((m) => m.id !== "welcome")
        .slice(-6)
        .map((m) => ({ role: m.role, text: m.text }));

      const res = await api("/ai/chat", {
        method: "POST",
        body: { message: query, history: historyPayload }
      });

      const assistantMsg = {
        id: `a-${Date.now()}`,
        role: "assistant",
        text: res.reply || "I am here to help you stay safe.",
        suggestions: res.suggestions || [],
        engine: res.engine || "ABHAYA Guardian AI",
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
      };

      setMessages((prev) => [...prev, assistantMsg]);

      // If auto-speak is enabled, speak out the assistant response
      if (autoSpeak) {
        setTimeout(() => {
          speakMessage(assistantMsg.id, assistantMsg.text);
        }, 200);
      }
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        {
          id: `err-${Date.now()}`,
          role: "assistant",
          text: `⚠️ **Unable to complete response:** ${err.message || "Please check connection"}. In an emergency, dial 112 or press SOS.`,
          suggestions: ["/nearby", "/contacts"]
        }
      ]);
    } finally {
      setLoading(false);
    }
  };

  // Clear chat
  const handleClearChat = () => {
    if (window.speechSynthesis) window.speechSynthesis.cancel();
    setSpeakingMessageId(null);
    setMessages([
      {
        id: "welcome-reset",
        role: "assistant",
        text: "Conversation cleared. How can I assist your personal safety today?",
        suggestions: ["/journey", "/routes", "/nearby", "/fake-call"]
      }
    ]);
  };

  // Map route label to readable button
  const getNavLabel = (path) => {
    switch (path) {
      case "/journey":
        return { label: "Live Guardian", icon: ShieldCheck, color: "#8b5cf6" };
      case "/routes":
        return { label: "Safe Route", icon: Navigation, color: "#06b6d4" };
      case "/nearby":
        return { label: "Nearby Help", icon: Compass, color: "#10b981" };
      case "/fake-call":
        return { label: "Fake Call", icon: PhoneCall, color: "#f59e0b" };
      case "/reports":
        return { label: "File Incident", icon: AlertTriangle, color: "#f43f5e" };
      case "/contacts":
        return { label: "Trusted Contacts", icon: HeartHandshake, color: "#a855f7" };
      case "/sos":
        return { label: "Trigger SOS", icon: Flame, color: "#ef4444" };
      default:
        return { label: path.replace("/", ""), icon: ExternalLink, color: "#8b5cf6" };
    }
  };

  return (
    <div className="ai-assistant-container">
      {/* Top Header Card */}
      <div className="ai-header-card">
        <div className="ai-header-left">
          <div className="ai-avatar-badge">
            <Bot size={24} className="ai-bot-icon" />
            <span className="ai-avatar-ring" />
          </div>
          <div className="ai-header-titles">
            <div className="ai-title-row">
              <h2>
                ABHAYA <span className="grad">Guardian AI</span>
              </h2>
              <span className="ai-status-pill">
                <span className="ai-status-dot" /> ACTIVE 24/7
              </span>
            </div>
            <p className="ai-header-subtitle">
              Voice-Enabled Personal Safety Intelligence & Emergency Guidance
            </p>
          </div>
        </div>

        {/* Header Right: Quick Helplines + Controls */}
        <div className="ai-header-right">
          <div className="ai-header-helplines">
            <a href="tel:112" className="eq-btn red" title="National Emergency 112">
              🚨 112
            </a>
            <a href="tel:1091" className="eq-btn pink" title="Women Helpline 1091">
              🌸 1091
            </a>
            <a href="tel:181" className="eq-btn purple" title="Sakhi Crisis Center 181">
              🛡️ 181
            </a>
            <a href="tel:108" className="eq-btn green" title="Medical Ambulance 108">
              🚑 108
            </a>
          </div>

          <div className="ai-header-controls">
            <button
              className={`ai-ctrl-btn ${autoSpeak ? "active" : ""}`}
              onClick={() => {
                setAutoSpeak(!autoSpeak);
                if (speakingMessageId && autoSpeak) {
                  window.speechSynthesis.cancel();
                  setSpeakingMessageId(null);
                }
              }}
              title={autoSpeak ? "Auto-speech is ON (assistant speaks responses)" : "Turn on auto-speech"}
            >
              {autoSpeak ? <Volume2 size={15} /> : <VolumeX size={15} />}
              <span>{autoSpeak ? "Voice ON" : "Muted"}</span>
            </button>

            <button
              className="ai-ctrl-btn danger"
              onClick={handleClearChat}
              title="Clear Chat History"
            >
              <Trash2 size={15} />
              <span>Clear</span>
            </button>
          </div>
        </div>
      </div>

      {/* Preset Topics Bar */}
      <div className="ai-presets-bar">
        <span className="ai-presets-title">Popular Topics:</span>
        <div className="ai-presets-scroll">
          {PRESET_TOPICS.map((topic, idx) => (
            <button
              key={idx}
              className="ai-preset-chip"
              onClick={() => handleSend(topic.query)}
              disabled={loading}
            >
              <span>{topic.label}</span>
              <ChevronRight size={13} className="preset-arrow" />
            </button>
          ))}
        </div>
      </div>

      {/* Chat Messages Feed */}
      <div className="ai-chat-feed">
        {messages.map((msg) => {
          const isUser = msg.role === "user";
          const isSpeaking = speakingMessageId === msg.id;

          return (
            <div
              key={msg.id}
              className={`ai-message-row ${isUser ? "user-row" : "assistant-row"}`}
            >
              {!isUser && (
                <div className="ai-msg-avatar">
                  <Bot size={20} />
                </div>
              )}

              <div className={`ai-message-bubble ${isUser ? "user-bubble" : "assistant-bubble"}`}>
                {/* Assistant Metadata Header */}
                {!isUser && (
                  <div className="ai-msg-meta-header">
                    <span className="ai-engine-tag">
                      <Sparkles size={12} />
                      {msg.engine || "ABHAYA Guardian AI"}
                    </span>

                    {/* Speaking Soundwave Indicator */}
                    {isSpeaking && (
                      <div className="ai-speaking-wave">
                        <span className="bar bar-1" />
                        <span className="bar bar-2" />
                        <span className="bar bar-3" />
                        <span className="bar bar-4" />
                        <span className="speaking-label">Speaking...</span>
                      </div>
                    )}
                  </div>
                )}

                {/* Message Content */}
                <div className="ai-msg-text-content">
                  {isUser ? (
                    <p className="user-plain-text">{msg.text}</p>
                  ) : (
                    <FormattedMessage text={msg.text} />
                  )}
                </div>

                {/* Assistant Action Buttons Toolbar */}
                {!isUser && (
                  <div className="ai-msg-actions-toolbar">
                    <div className="msg-tools-left">
                      <button
                        className={`ai-tool-btn ${isSpeaking ? "active-speech" : ""}`}
                        onClick={() => speakMessage(msg.id, msg.text)}
                        title={isSpeaking ? "Stop Voice Playback" : "Read Aloud with Voice"}
                      >
                        {isSpeaking ? <VolumeX size={14} /> : <Volume2 size={14} />}
                        <span>{isSpeaking ? "Stop" : "Listen"}</span>
                      </button>

                      <button
                        className="ai-tool-btn"
                        onClick={() => handleCopy(msg.id, msg.text)}
                        title="Copy Response Text"
                      >
                        {copiedId === msg.id ? <Check size={14} className="copied-icon" /> : <Copy size={14} />}
                        <span>{copiedId === msg.id ? "Copied" : "Copy"}</span>
                      </button>
                    </div>

                    {/* Action Navigation Shortcuts */}
                    {msg.suggestions && msg.suggestions.length > 0 && (
                      <div className="msg-nav-shortcuts">
                        {msg.suggestions.map((p) => {
                          const navInfo = getNavLabel(p);
                          const NavIcon = navInfo.icon;
                          return (
                            <button
                              key={p}
                              className="ai-shortcut-pill"
                              style={{ borderColor: navInfo.color, color: navInfo.color }}
                              onClick={() => navigate(p)}
                              title={`Open ${navInfo.label}`}
                            >
                              <NavIcon size={13} />
                              <span>{navInfo.label}</span>
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {isUser && (
                <div className="ai-user-avatar">
                  <User size={18} />
                </div>
              )}
            </div>
          );
        })}

        {/* Thinking Indicator */}
        {loading && (
          <div className="ai-message-row assistant-row">
            <div className="ai-msg-avatar">
              <Bot size={20} />
            </div>
            <div className="ai-message-bubble assistant-bubble ai-loading-bubble">
              <RefreshCw size={18} className="ai-spin-icon" />
              <span>Analyzing safety protocol & synthesized response...</span>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Voice Listening Active Waveform Banner */}
      {isListening && (
        <div className="ai-voice-listening-overlay">
          <div className="voice-wave-container">
            <span className="voice-pulse-ring" />
            <Mic size={24} className="voice-active-mic" />
          </div>
          <div className="voice-listening-text">
            <b>Listening... Speak your question clearly</b>
            <p>{interimSpeech || "Waiting for your voice input..."}</p>
          </div>
          <button
            className="btn-cancel-voice"
            onClick={toggleListening}
          >
            Done
          </button>
        </div>
      )}

      {/* Input Bar & Controls */}
      <div className="ai-input-wrapper">
        <form
          className="ai-input-form"
          onSubmit={(e) => {
            e.preventDefault();
            handleSend();
          }}
        >
          {/* Voice Mic Button */}
          <button
            type="button"
            className={`ai-mic-trigger-btn ${isListening ? "listening" : ""}`}
            onClick={toggleListening}
            title={isListening ? "Stop listening" : "Click to speak your safety question"}
          >
            {isListening ? <MicOff size={20} /> : <Mic size={20} />}
          </button>

          {/* Text Input */}
          <input
            type="text"
            className="ai-chat-input"
            placeholder={
              isListening
                ? "Listening... Speak now"
                : "Ask any safety question, legal right, or route tip..."
            }
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            disabled={loading}
          />

          {/* Send Button */}
          <button
            type="submit"
            className="ai-send-btn"
            disabled={loading || (!inputText.trim() && !isListening)}
            title="Send query"
          >
            <Send size={18} />
          </button>
        </form>
      </div>
    </div>
  );
}

