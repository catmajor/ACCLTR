"use client";

import { useState, useRef, useEffect } from "react";

// Fixed cultural types
const FIXED_TYPES = [
  "FOOD_DISH",
  "DRINK",
  "PERSON",
  "GROUP_ETHNIC",
  "HOLIDAY_FESTIVAL",
  "PRACTICE_TRADITION",
  "ART_MUSIC_DANCE",
  "PLACE_REGION",
  "RELIGION",
  "LANGUAGE",
  "OBJECT_CRAFT",
  "OTHER",
];

function DefinitionPanel({ highlight, onClose }) {
  if (!highlight) return null;
  return (
    <div
      className="fixed bottom-4 left-1/2 -translate-x-1/2 w-[min(90vw,680px)] bg-white border border-purple-200 rounded-xl shadow-2xl z-50"
      role="dialog"
      aria-modal="true"
    >
      <div className="p-4">
        <div className="font-semibold text-gray-900">
          {highlight.word}
          {highlight.culture ? <span className="text-gray-500"> • {highlight.culture}</span> : null}{" "}
          <span className="text-gray-500 text-sm">({highlight.type})</span>
        </div>
        <textarea
          className="w-full mt-2 p-3 border rounded-md text-sm text-gray-800 bg-purple-50/40"
          rows={4}
          readOnly
          value={highlight.explanation || "No definition available."}
        />
        <div className="mt-3 text-right">
          <button
            onClick={onClose}
            className="px-3 py-1 text-sm bg-purple-600 text-white rounded-md hover:bg-purple-700"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

export default function CulturalTranscriber() {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [interimTranscript, setInterimTranscript] = useState("");
  const [culturalHighlights, setCulturalHighlights] = useState([]); // current session
  const culturalHighlightsRef = useRef([]); // <-- always holds latest highlights
  const [activeHighlight, setActiveHighlight] = useState(null);

  const [sourceLanguage, setSourceLanguage] = useState("es-ES");
  const [targetLanguage, setTargetLanguage] = useState("en-US");
  const [isSupported, setIsSupported] = useState(false);
  const [error, setError] = useState("");
  const [isContinuous, setIsContinuous] = useState(true);
  const [interimResults, setInterimResults] = useState(true);
  const [conversations, setConversations] = useState([]);
  const [currentSessionId, setCurrentSessionId] = useState(null);

  const recognitionRef = useRef(null);
  const finalTranscriptRef = useRef("");
  const chatContainerRef = useRef(null);

  const languages = [
    { code: "en-US", name: "English (US)" }, { code: "en-GB", name: "English (UK)" },
    { code: "es-ES", name: "Spanish (Spain)" }, { code: "es-MX", name: "Spanish (Mexico)" },
    { code: "fr-FR", name: "French (France)" }, { code: "de-DE", name: "German (Germany)" },
    { code: "it-IT", name: "Italian (Italy)" }, { code: "pt-BR", name: "Portuguese (Brazil)" },
    { code: "pt-PT", name: "Portuguese (Portugal)" }, { code: "ru-RU", name: "Russian (Russia)" },
    { code: "ja-JP", name: "Japanese (Japan)" }, { code: "ko-KR", name: "Korean (Korea)" },
    { code: "zh-CN", name: "Chinese (Simplified)" }, { code: "zh-TW", name: "Chinese (Traditional)" },
    { code: "ar-SA", name: "Arabic (Saudi Arabia)" }, { code: "hi-IN", name: "Hindi (India)" },
    { code: "th-TH", name: "Thai (Thailand)" }, { code: "nl-NL", name: "Dutch (Netherlands)" },
    { code: "sv-SE", name: "Swedish (Sweden)" }, { code: "no-NO", name: "Norwegian (Norway)" },
    { code: "da-DK", name: "Danish (Denmark)" }, { code: "fi-FI", name: "Finnish (Finland)" },
    { code: "pl-PL", name: "Polish (Poland)" }, { code: "tr-TR", name: "Turkish (Turkey)" },
    { code: "he-IL", name: "Hebrew (Israel)" }, { code: "cs-CZ", name: "Czech (Czech Republic)" },
    { code: "hu-HU", name: "Hungarian (Hungary)" }, { code: "ro-RO", name: "Romanian (Romania)" },
    { code: "bg-BG", name: "Bulgarian (Bulgaria)" }, { code: "hr-HR", name: "Croatian (Croatia)" },
    { code: "sk-SK", name: "Slovak (Slovakia)" }, { code: "sl-SI", name: "Slovenian (Slovenia)" },
    { code: "et-EE", name: "Estonian (Estonia)" }, { code: "lv-LV", name: "Latvian (Latvia)" },
    { code: "lt-LT", name: "Lithuanian (Lithuania)" }, { code: "uk-UA", name: "Ukrainian (Ukraine)" },
    { code: "vi-VN", name: "Vietnamese (Vietnam)" }, { code: "id-ID", name: "Indonesian (Indonesia)" },
    { code: "ms-MY", name: "Malay (Malaysia)" }, { code: "tl-PH", name: "Filipino (Philippines)" },
  ];

  // Speech support
  useEffect(() => {
    if (typeof window !== "undefined") {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      setIsSupported(!!SpeechRecognition);
      if (SpeechRecognition) {
        initializeRecognition();
      } else {
        setError("Speech recognition is not supported in this browser. Please use Chrome, Edge, or Safari.");
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sourceLanguage, isContinuous, interimResults]);

  // Autoscroll
  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [conversations]);

  const initializeRecognition = () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setError("Speech recognition is not supported in this browser.");
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = isContinuous;
    recognition.interimResults = interimResults;
    recognition.lang = sourceLanguage;
    recognition.maxAlternatives = 1;

    recognition.onstart = () => {
      setError("");
      setCurrentSessionId(Date.now());
    };

    recognition.onresult = async (event) => {
      let interim = "";
      let finalChunk = "";

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const t = event.results[i][0].transcript;
        if (event.results[i].isFinal) finalChunk += t;
        else interim += t;
      }

      setInterimTranscript(interim);

      if (finalChunk) {
        // Ensure we don't glue words together
        const needsSpace =
          finalTranscriptRef.current &&
          !/\s$/.test(finalTranscriptRef.current) &&
          !/^\s/.test(finalChunk);
        finalTranscriptRef.current += needsSpace ? " " + finalChunk : finalChunk;
        setTranscript(finalTranscriptRef.current);

        // Ask backend to annotate the FULL current transcript (more context)
        try {
          const res = await fetch("/api/annotate", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ text: finalTranscriptRef.current, types: FIXED_TYPES }),
          });
          if (res.ok) {
            const data = await res.json();
            const mapped = (data.entities || []).map((e) => ({
              word: e.text,
              type: e.type,
              explanation: e.definition,
              culture: e.culture || null,
              start: e.start,
              end: e.end,
              confidence: 0.9,
            }));

            // De-dupe by span+type and sync ref
            setCulturalHighlights((prev) => {
              const seen = new Set(prev.map((p) => `${p.start}-${p.end}-${p.type}`));
              const add = mapped.filter((m) => !seen.has(`${m.start}-${m.end}-${m.type}`));
              const next = [...prev, ...add];
              culturalHighlightsRef.current = next; // keep ref current
              return next;
            });
          } else {
            console.error("Annotate failed:", await res.text());
          }
        } catch (e) {
          console.error("Annotate network error:", e);
        }
      }
    };

    recognition.onerror = (event) => {
      let errorMessage = "";
      switch (event.error) {
        case "no-speech": errorMessage = "No speech was detected. Please try again."; break;
        case "audio-capture": errorMessage = "No microphone was found. Please ensure a microphone is connected."; break;
        case "not-allowed": errorMessage = "Microphone permission was denied. Please allow microphone access."; break;
        case "network": errorMessage = "Network error occurred. Please check your internet connection."; break;
        case "service-not-allowed": errorMessage = "Speech recognition service is not allowed."; break;
        default: errorMessage = `Speech recognition error: ${event.error}`;
      }
      setError(errorMessage);
      setIsListening(false);
    };

    recognition.onend = () => setIsListening(false);

    recognitionRef.current = recognition;
  };

  const startListening = () => {
    if (!recognitionRef.current) {
      setError("Speech recognition is not initialized.");
      return;
    }
    try {
      recognitionRef.current.start();
      setIsListening(true);
      setError("");
    } catch {
      setError("Failed to start speech recognition. Please try again.");
    }
  };

  const stopListening = async () => {
    if (recognitionRef.current && isListening) {
      recognitionRef.current.stop();
      setIsListening(false);

      try {
        await new Promise((r) => setTimeout(r, 120));
        const textToSpeak = (finalTranscriptRef.current || transcript || "").trim();

        if (textToSpeak) {
          const res = await fetch("/api/speak-translation", {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({
              text: textToSpeak,
              targetLang: (targetLanguage || "en-US").split("-")[0],
            }),
          });

          if (!res.ok) {
            const msg = await res.text().catch(() => "");
            setError(`TTS failed: ${msg}`);
          } else {
            const blob = await res.blob();
            const url = URL.createObjectURL(blob);
            const audio = new Audio(url);
            audio.play().catch(() => {});
          }
        }

        const currentText = finalTranscriptRef.current.trim();
        if (currentText) addToConversations(currentText);
      } catch {
        setError("Failed to fetch or play audio.");
      }
    }
  };

  const addToConversations = (originalText) => {
    // Use the ref to avoid stale state
    const highlightsForSave = Array.isArray(culturalHighlightsRef.current)
      ? [...culturalHighlightsRef.current]
      : [];

    const newConversation = {
      id: Date.now(),
      originalText,
      timestamp: new Date(),
      sourceLanguage,
      targetLanguage,
      sessionId: currentSessionId,
      culturalHighlights: highlightsForSave, // definitions included
    };

    setConversations((prev) => [newConversation, ...prev]);

    // Reset current session (keep ref/state in sync)
    setTranscript("");
    setInterimTranscript("");
    setCulturalHighlights([]);
    culturalHighlightsRef.current = [];
    finalTranscriptRef.current = "";
    setActiveHighlight(null);
  };

  const clearAllConversations = () => {
    setConversations([]);
    setTranscript("");
    setInterimTranscript("");
    setCulturalHighlights([]);
    culturalHighlightsRef.current = [];
    finalTranscriptRef.current = "";
    setActiveHighlight(null);
    setError("");
  };

  const deleteConversation = (id) => {
    setConversations((prev) => prev.filter((conv) => conv.id !== id));
  };

  const copyConversation = (text) => {
    navigator.clipboard.writeText(text).then(
      () => alert("Conversation copied to clipboard!"),
      () => alert("Failed to copy text to clipboard.")
    );
  };

  const downloadAllConversations = () => {
    const allText = conversations
      .map(
        (conv) =>
          `[${conv.timestamp.toLocaleString()}] ${conv.sourceLanguage} (spoken) → ${conv.targetLanguage} (audio TTS)\n` +
          `Original: ${conv.originalText}\n` +
          `Cultural Highlights: ${conv.culturalHighlights.map((h) => h.word).join(", ")}\n`
      )
      .join("\n\n");

    const blob = new Blob([allText], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `cultural-conversations-${new Date().toISOString().slice(0, 19).replace(/:/g, "-")}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const formatTimestamp = (timestamp) => timestamp.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  const getStatusColor = () => (error ? "bg-red-500" : isListening ? "bg-green-500 animate-pulse" : "bg-gray-500");
  const getStatusText = () => (error ? "Error" : isListening ? "Listening..." : "Ready");
  const getLanguageName = (code) => languages.find((lang) => lang.code === code)?.name || code;

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 via-orange-50 to-red-50">
      <div className="max-w-6xl mx-auto p-4">
        {/* Header */}
        <div className="bg-white/80 backdrop-blur-sm rounded-lg shadow-lg p-6 mb-4 border border-amber-100">
          <h1 className="text-3xl font-bold text-gray-800 mb-4 text-center">ACCLTR</h1>

          {/* Language Selection */}
          <div className="flex flex-wrap gap-4 items-center justify-center mb-4">
            <div className="flex items-center space-x-2">
              <label className="text-sm font-medium text-gray-700">Speak in:</label>
              <select
                value={sourceLanguage}
                onChange={(e) => setSourceLanguage(e.target.value)}
                disabled={isListening}
                className="px-3 py-1 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-amber-500 text-sm"
              >
                {languages.map((lang) => (
                  <option key={lang.code} value={lang.code}>{lang.name}</option>
                ))}
              </select>
            </div>

            <div className="flex items-center space-x-2"><span className="text-2xl">→</span></div>

            <div className="flex items-center space-x-2">
              <label className="text-sm font-medium text-gray-700">Audio (TTS) language:</label>
              <select
                value={targetLanguage}
                onChange={(e) => setTargetLanguage(e.target.value)}
                disabled={isListening}
                className="px-3 py-1 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-amber-500 text-sm"
              >
                {languages.map((lang) => (
                  <option key={lang.code} value={lang.code}>{lang.name}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Error */}
          {error && <div className="mb-4 p-4 bg-red-100 border border-red-400 text-red-700 rounded">{error}</div>}

          {/* Controls */}
          <div className="flex flex-col sm:flex-row justify-center gap-2 sm:gap-3 mb-3 sm:mb-4 w-full">
            {!isListening ? (
              <button
                onClick={startListening}
                disabled={!isSupported}
                className="w-full sm:w-auto px-4 sm:px-6 py-3 sm:py-3 bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-lg hover:from-amber-600 hover:to-orange-600 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:ring-offset-2 font-medium disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center justify-center space-x-2 shadow-lg min-h-[44px] text-sm sm:text-sm"
              >
                <span className="text-base sm:text-base">🎤</span>
                <span>Start Recording</span>
              </button>
            ) : (
              <button
                onClick={stopListening}
                className="w-full sm:w-auto px-4 sm:px-6 py-3 sm:py-3 bg-gradient-to-r from-red-500 to-red-600 text-white rounded-lg hover:from-red-600 hover:to-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 font-medium flex items-center justify-center space-x-2 shadow-lg min-h-[44px] text-sm sm:text-sm"
              >
                <span className="text-base sm:text-base">⏹️</span>
                <span>Stop Recording</span>
              </button>
            )}

            <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 w-full sm:w-auto">
              <button
                onClick={clearAllConversations}
                className="w-full sm:w-auto px-3 sm:px-4 py-2 sm:py-3 bg-gradient-to-r from-gray-500 to-gray-600 text-white rounded-lg hover:from-gray-600 hover:to-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 font-medium shadow-lg min-h-[40px] text-sm"
              >
                Clear All
              </button>

              <button
                onClick={downloadAllConversations}
                disabled={conversations.length === 0}
                className="w-full sm:w-auto px-3 sm:px-4 py-2 sm:py-3 bg-gradient-to-r from-orange-500 to-red-500 text-white rounded-lg hover:from-orange-600 hover:to-red-600 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2 font-medium disabled:bg-gray-300 disabled:cursor-not-allowed shadow-lg min-h-[40px] text-sm"
              >
                Download All
              </button>
            </div>
          </div>

          {/* Status */}
          <div className="flex items-center justify-center">
            <div className="flex items-center space-x-2">
              <div className={`w-3 h-3 rounded-full ${getStatusColor()}`}></div>
              <span className="text-sm text-gray-600">Status: {getStatusText()}</span>
            </div>
          </div>
        </div>

        {/* Current Session */}
        {(transcript || interimTranscript) && (
          <div className="bg-white/80 backdrop-blur-sm rounded-lg shadow-lg p-6 mb-4 border border-amber-100">
            <h2 className="text-xl font-semibold text-gray-800 mb-4 flex items-center space-x-2">
              <span>🎯</span><span>Current Session</span>
              <span className="text-sm text-gray-500">{formatTimestamp(new Date())}</span>
            </h2>

            {/* Original Speech */}
            <div className="mb-4">
              <h3 className="text-sm font-medium text-gray-700 mb-2">
                Original ({getLanguageName(sourceLanguage)}):
              </h3>
              <div className="bg-gradient-to-r from-amber-50 to-orange-50 border-l-4 border-amber-400 p-4 rounded-lg">
                {transcript && (
                  <div className="mb-2">
                    <span className="text-xs font-medium text-amber-700">Final: </span>
                    <span className="text-gray-800">{transcript}</span>
                  </div>
                )}
                {interimTranscript && interimResults && (
                  <div className="italic text-amber-600">
                    <span className="text-xs font-medium">Interim: </span>
                    {interimTranscript}
                  </div>
                )}
              </div>
            </div>

            {/* Cultural Highlights (current) */}
            {culturalHighlights.length > 0 && (
              <div className="mb-4">
                <h3 className="text-sm font-medium text-gray-700 mb-2">Cultural References:</h3>
                <div className="flex flex-wrap gap-2">
                  {culturalHighlights.map((h, i) => (
                    <button
                      key={`${h.start}-${h.end}-${h.type}-${i}`}
                      className="bg-gradient-to-r from-purple-100 to-pink-100 border border-purple-300 px-3 py-1 rounded-full text-sm hover:shadow"
                      onClick={() => setActiveHighlight(h)}
                      title={h.culture ? `${h.type} • ${h.culture}` : h.type}
                    >
                      <span className="font-medium text-purple-800">{h.word}</span>
                      <span className="text-purple-600 ml-1">({h.type})</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* History */}
        <div className="bg-white/80 backdrop-blur-sm rounded-lg shadow-lg border border-amber-100">
          <div className="p-4 border-b border-amber-200">
            <h2 className="text-xl font-semibold text-gray-800">💬 Cultural Conversations ({conversations.length})</h2>
          </div>

          <div ref={chatContainerRef} className="h-96 overflow-y-auto p-4 space-y-4">
            {conversations.length === 0 && !transcript && !interimTranscript ? (
              <div className="text-center py-12 text-gray-500">
                <div className="text-6xl mb-4">🌍</div>
                <p className="text-lg">Start speaking to begin cultural capture</p>
                <p className="text-sm mt-2">Select your language and click "Start Recording"</p>
              </div>
            ) : (
              conversations.map((conversation) => (
                <div
                  key={conversation.id}
                  className="bg-gradient-to-r from-orange-50 to-red-50 border-l-4 border-orange-400 p-4 rounded-lg hover:from-orange-100 hover:to-red-100 transition-colors"
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center space-x-2">
                      <span className="text-xs font-medium text-orange-600">
                        {getLanguageName(conversation.sourceLanguage)} (spoken) → {getLanguageName(conversation.targetLanguage)} (audio)
                      </span>
                      <span className="text-xs text-orange-500">{formatTimestamp(conversation.timestamp)}</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => copyConversation(`${conversation.originalText}`)}
                        className="text-xs text-amber-600 hover:text-amber-800 font-medium"
                      >
                        Copy
                      </button>
                      <button
                        onClick={() => deleteConversation(conversation.id)}
                        className="text-xs text-red-600 hover:text-red-800 font-medium"
                      >
                        Delete
                      </button>
                    </div>
                  </div>

                  {/* Original */}
                  <div className="mb-3">
                    <h4 className="text-sm font-medium text-gray-700 mb-1">Original:</h4>
                    <div className="text-gray-800 whitespace-pre-wrap bg-white/50 p-2 rounded">
                      {conversation.originalText}
                    </div>
                  </div>

                  {/* Cultural Highlights (history — clickable) */}
                  {conversation.culturalHighlights.length > 0 && (
                    <div>
                      <h4 className="text-sm font-medium text-gray-700 mb-1">Cultural References:</h4>
                      <div className="flex flex-wrap gap-1">
                        {conversation.culturalHighlights.map((h, i) => (
                          <button
                            key={`${h.start}-${h.end}-${h.type}-${i}`}
                            onClick={() => setActiveHighlight(h)}  // opens GLOBAL panel
                            className="bg-purple-100 text-purple-800 px-2 py-1 rounded text-xs hover:shadow"
                            title={h.culture ? `${h.type} • ${h.culture}` : h.type}
                          >
                            {h.word}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>

        {/* Instructions */}
        <div className="mt-4 p-4 bg-gradient-to-r from-amber-50 to-orange-50 rounded-lg border border-amber-200">
          <h3 className="text-sm font-medium text-amber-800 mb-2">How to use ACCLTR:</h3>
          <ul className="text-sm text-amber-700 space-y-1">
            <li>• Select your source language (what you'll speak) and TTS audio language</li>
            <li>• Click "Start Recording" to begin speech recognition</li>
            <li>• Speak clearly — your speech will be transcribed in real-time</li>
            <li>• Cultural references will be highlighted as you speak</li>
            <li>• Click "Stop Recording" to play back audio and save the conversation</li>
            <li>• Each conversation appears at the top with original text and cultural highlights</li>
          </ul>
        </div>
      </div>

      {/* GLOBAL definition panel works for BOTH current + history */}
      <DefinitionPanel highlight={activeHighlight} onClose={() => setActiveHighlight(null)} />
    </div>
  );
}
