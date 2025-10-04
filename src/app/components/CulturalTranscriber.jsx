"use client";

import { useState, useRef, useEffect } from "react";

export default function CulturalTranscriber() {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [interimTranscript, setInterimTranscript] = useState("");
  const [culturalHighlights, setCulturalHighlights] = useState([]);
  const [sourceLanguage, setSourceLanguage] = useState("es-ES");
  const [targetLanguage, setTargetLanguage] = useState("en-US"); // used only for TTS on stop
  const [isSupported, setIsSupported] = useState(false);
  const [error, setError] = useState("");
  const [isContinuous, setIsContinuous] = useState(true);
  const [interimResults, setInterimResults] = useState(true);
  const [conversations, setConversations] = useState([]);
  const [currentSessionId, setCurrentSessionId] = useState(null);

  const recognitionRef = useRef(null);
  const finalTranscriptRef = useRef("");
  const chatContainerRef = useRef(null);

  // Available languages supported by Web Speech API
  const languages = [
    { code: "en-US", name: "English (US)" },
    { code: "en-GB", name: "English (UK)" },
    { code: "es-ES", name: "Spanish (Spain)" },
    { code: "es-MX", name: "Spanish (Mexico)" },
    { code: "fr-FR", name: "French (France)" },
    { code: "de-DE", name: "German (Germany)" },
    { code: "it-IT", name: "Italian (Italy)" },
    { code: "pt-BR", name: "Portuguese (Brazil)" },
    { code: "pt-PT", name: "Portuguese (Portugal)" },
    { code: "ru-RU", name: "Russian (Russia)" },
    { code: "ja-JP", name: "Japanese (Japan)" },
    { code: "ko-KR", name: "Korean (Korea)" },
    { code: "zh-CN", name: "Chinese (Simplified)" },
    { code: "zh-TW", name: "Chinese (Traditional)" },
    { code: "ar-SA", name: "Arabic (Saudi Arabia)" },
    { code: "hi-IN", name: "Hindi (India)" },
    { code: "th-TH", name: "Thai (Thailand)" },
    { code: "nl-NL", name: "Dutch (Netherlands)" },
    { code: "sv-SE", name: "Swedish (Sweden)" },
    { code: "no-NO", name: "Norwegian (Norway)" },
    { code: "da-DK", name: "Danish (Denmark)" },
    { code: "fi-FI", name: "Finnish (Finland)" },
    { code: "pl-PL", name: "Polish (Poland)" },
    { code: "tr-TR", name: "Turkish (Turkey)" },
    { code: "he-IL", name: "Hebrew (Israel)" },
    { code: "cs-CZ", name: "Czech (Czech Republic)" },
    { code: "hu-HU", name: "Hungarian (Hungary)" },
    { code: "ro-RO", name: "Romanian (Romania)" },
    { code: "bg-BG", name: "Bulgarian (Bulgaria)" },
    { code: "hr-HR", name: "Croatian (Croatia)" },
    { code: "sk-SK", name: "Slovak (Slovakia)" },
    { code: "sl-SI", name: "Slovenian (Slovenia)" },
    { code: "et-EE", name: "Estonian (Estonia)" },
    { code: "lv-LV", name: "Latvian (Latvia)" },
    { code: "lt-LT", name: "Lithuanian (Lithuania)" },
    { code: "uk-UA", name: "Ukrainian (Ukraine)" },
    { code: "vi-VN", name: "Vietnamese (Vietnam)" },
    { code: "id-ID", name: "Indonesian (Indonesia)" },
    { code: "ms-MY", name: "Malay (Malaysia)" },
    { code: "tl-PH", name: "Filipino (Philippines)" }
  ];

  // Mock cultural highlights data (placeholder for backend)
  const mockCulturalHighlights = [
    { word: "fiesta", type: "cultural_event", explanation: "Traditional Spanish celebration", confidence: 0.95 },
    { word: "tapas", type: "food", explanation: "Small Spanish appetizers", confidence: 0.88 },
    { word: "siesta", type: "cultural_practice", explanation: "Afternoon nap tradition", confidence: 0.92 },
    { word: "paella", type: "food", explanation: "Traditional Spanish rice dish", confidence: 0.97 },
    { word: "flamenco", type: "art", explanation: "Traditional Spanish dance", confidence: 0.89 }
  ];

  // Check if Speech Recognition is supported
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
  }, [sourceLanguage, isContinuous, interimResults]);

  // Auto-scroll to bottom when new conversations are added
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

    recognition.onresult = (event) => {
      let interim = "";
      let finalChunk = "";

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const t = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          finalChunk += t;
        } else {
          interim += t;
        }
      }

      setInterimTranscript(interim);

      if (finalChunk) {
        finalTranscriptRef.current += finalChunk;
        setTranscript(finalTranscriptRef.current);

        // Update cultural highlights from the finalized text
        const words = finalChunk.toLowerCase().split(/\s+/).filter(Boolean);
        const found = mockCulturalHighlights.filter(h =>
          words.some(w => w.includes(h.word.toLowerCase()))
        );
        if (found.length > 0) {
          setCulturalHighlights(prev => [...prev, ...found]);
        }
      }
    };

    recognition.onerror = (event) => {
      let errorMessage = "";
      switch (event.error) {
        case "no-speech":
          errorMessage = "No speech was detected. Please try again.";
          break;
        case "audio-capture":
          errorMessage = "No microphone was found. Please ensure a microphone is connected.";
          break;
        case "not-allowed":
          errorMessage = "Microphone permission was denied. Please allow microphone access.";
          break;
        case "network":
          errorMessage = "Network error occurred. Please check your internet connection.";
          break;
        case "service-not-allowed":
          errorMessage = "Speech recognition service is not allowed.";
          break;
        default:
          errorMessage = `Speech recognition error: ${event.error}`;
      }
      setError(errorMessage);
      setIsListening(false);
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    recognitionRef.current = recognition;
  };
  const analyzeTranscript = async (text) => {
    try {
      const response = await fetch('/api/transcript', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ transcript: text }),
      });
      const data = await response.json();
      // Do something with data.entities or handle error
      return data;
    } catch (err) {
      console.error('API error:', err);
      return null;
    }
  };
  // Mock translation function (placeholder for backend)
  const translateText = async (text) => {
    if (!text.trim()) return;
    
    setIsTranslating(true);
    
    // Simulate API delay
    const resp = await analyzeTranscript(text);
    // Mock translation (replace with actual API call)
    const mockTranslation = `[TRANSLATED] ${text}`;
    finalTranslationRef.current += mockTranslation;
    setEnglishTranslation(finalTranslationRef.current);
    
    // Mock cultural highlighting
    
    if (resp && resp.success && resp.entities) {
      resp.entites = resp.entities.filter(e => e.label != "MISC");
      console.log(resp.entities);
      setCulturalHighlights(prev => [...prev, ...resp.entities]);
    }
    
    setIsTranslating(false);
  };

  // Mock streaming translation (placeholder for backend)
  const startTranslationStreaming = () => {
    translationIntervalRef.current = setInterval(() => {
      if (interimTranscript) {
        // Mock interim translation
        const mockInterimTranslation = `[STREAMING] ${interimTranscript}`;
        setInterimEnglishTranslation(mockInterimTranslation);
      }
    }, 1000);
  };

  const stopTranslationStreaming = () => {
    if (translationIntervalRef.current) {
      clearInterval(translationIntervalRef.current);
      translationIntervalRef.current = null;
    }
    setInterimEnglishTranslation("");
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
    } catch (err) {
      setError("Failed to start speech recognition. Please try again.");
    }
  };

  // Plays back a TTS translation of the captured text (no on-screen translation)
  const stopListening = async () => {
    if (recognitionRef.current && isListening) {
      recognitionRef.current.stop();
      setIsListening(false);

      try {
        // small delay so the final chunk gets appended to finalTranscriptRef
        await new Promise((r) => setTimeout(r, 120));

        const textToSpeak = (finalTranscriptRef.current || transcript || "").trim();

        if (textToSpeak) {
          try {
            const analysis = await analyzeTranscript(textToSpeak);
            console.log("Transcript analysis:", analysis);
          } catch (e) {
            console.log("Transcript analysis failed:", e);
          }
          const res = await fetch("/api/speak-translation", {
            method: "POST",
            headers: { "content-type": "application/json" },
            // send simple language code like "en" / "es", derived from targetLanguage
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

        // Add current conversation to history
        const currentText = finalTranscriptRef.current.trim();
        if (currentText) {
          addToConversations(currentText);
        }
      } catch (e) {
        setError("Failed to fetch or play audio.");
      }
    }
  };

  const addToConversations = (originalText) => {
    (async () => {
      let translatedText = null;
      try {
        const res = await fetch('/api/translate', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ text: originalText, targetLang: (targetLanguage || 'en-US').split('-')[0] }),
        });
        if (res.ok) {
          const j = await res.json();
          translatedText = j.text || null;
        }
      } catch (e) {
        console.warn('Translation fetch failed', e);
      }

      const newConversation = {
        id: Date.now(),
        originalText,
        translatedText,
        timestamp: new Date(),
        sourceLanguage,
        targetLanguage, // stored for context of the TTS choice
        sessionId: currentSessionId,
        culturalHighlights: [...culturalHighlights],
      };

      setConversations((prev) => [newConversation, ...prev]);
    })();

    // Clear current session
    setTranscript("");
    setInterimTranscript("");
    setCulturalHighlights([]);
    finalTranscriptRef.current = "";
  };

  const clearAllConversations = () => {
    setConversations([]);
    setTranscript("");
    setInterimTranscript("");
    setCulturalHighlights([]);
    finalTranscriptRef.current = "";
    setError("");
  };

  const deleteConversation = (id) => {
    setConversations((prev) => prev.filter((conv) => conv.id !== id));
  };

  const copyConversation = (text) => {
    navigator.clipboard
      .writeText(text)
      .then(() => {
        alert("Conversation copied to clipboard!");
      })
      .catch(() => {
        alert("Failed to copy text to clipboard.");
      });
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

  const formatTimestamp = (timestamp) => {
    return timestamp.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  };

  const getStatusColor = () => {
    if (error) return "bg-red-500";
    if (isListening) return "bg-green-500 animate-pulse";
    return "bg-gray-500";
  };

  const getStatusText = () => {
    if (error) return "Error";
    if (isListening) return "Listening...";
    return "Ready";
  };

  const getLanguageName = (code) => {
    return languages.find((lang) => lang.code === code)?.name || code;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 via-orange-50 to-red-50">
      <div className="max-w-6xl mx-auto p-4">
        {/* Header */}
        <div className="bg-white/80 backdrop-blur-sm rounded-lg shadow-lg p-6 mb-4 border border-amber-100">
          <h1 className="text-3xl font-bold text-gray-800 mb-4 text-center">
            ACCLTR
          </h1>

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
                  <option key={lang.code} value={lang.code}>
                    {lang.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center space-x-2">
              <span className="text-2xl">→</span>
            </div>

            <div className="flex items-center space-x-2">
              <label className="text-sm font-medium text-gray-700">Audio (TTS) language:</label>
              <select
                value={targetLanguage}
                onChange={(e) => setTargetLanguage(e.target.value)}
                disabled={isListening}
                className="px-3 py-1 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-amber-500 text-sm"
              >
                {languages.map((lang) => (
                  <option key={lang.code} value={lang.code}>
                    {lang.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Error Display */}
          {error && (
            <div className="mb-4 p-4 bg-red-100 border border-red-400 text-red-700 rounded">
              {error}
            </div>
          )}

          {/* Control Buttons */}
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

          {/* Status Indicator */}
          <div className="flex items-center justify-center">
            <div className="flex items-center space-x-2">
              <div className={`w-3 h-3 rounded-full ${getStatusColor()}`}></div>
              <span className="text-sm text-gray-600">
                Status: {getStatusText()}
              </span>
            </div>
          </div>
        </div>

        {/* Current Session */}
        {(transcript || interimTranscript) && (
          <div className="bg-white/80 backdrop-blur-sm rounded-lg shadow-lg p-6 mb-4 border border-amber-100">
            <h2 className="text-xl font-semibold text-gray-800 mb-4 flex items-center space-x-2">
              <span>🎯</span>
              <span>Current Session</span>
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
                    <div className="text-gray-800">{transcript}</div>
                  </div>
                )}
                {/* If we have a translated text for the live session, show it below original */}
                {/** Note: live session translation only available after stop (when conversation saved) **/}
                {interimTranscript && interimResults && (
                  <div className="italic text-amber-600">
                    <span className="text-xs font-medium">Interim: </span>
                    {interimTranscript}
                  </div>
                )}
              </div>
            </div>

            {/* Cultural Highlights */}
            {culturalHighlights.length > 0 && (
              <div className="mb-4">
                <h3 className="text-sm font-medium text-gray-700 mb-2">
                  Cultural References:
                </h3>
                <div className="flex flex-wrap gap-2">
                  {culturalHighlights.map((highlight, index) => (
                    <div
                      key={index}
                      className="bg-gradient-to-r from-purple-100 to-pink-100 border border-purple-300 px-3 py-1 rounded-full text-sm"
                    >
                      <span className="font-medium text-purple-800">{highlight.word}</span>
                      <span className="text-purple-600 ml-1">({highlight.type})</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Chat Container */}
        <div className="bg-white/80 backdrop-blur-sm rounded-lg shadow-lg border border-amber-100">
          <div className="p-4 border-b border-amber-200">
            <h2 className="text-xl font-semibold text-gray-800">
              💬 Cultural Conversations ({conversations.length})
            </h2>
          </div>

          {/* Chat Messages */}
          <div
            ref={chatContainerRef}
            className="h-96 overflow-y-auto p-4 space-y-4"
          >
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
                      <span className="text-xs text-orange-500">
                        {formatTimestamp(conversation.timestamp)}
                      </span>
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

                  {/* Original Text */}
                  <div className="mb-3">
                    <h4 className="text-sm font-medium text-gray-700 mb-1">Original:</h4>
                    <div className="text-gray-800 whitespace-pre-wrap bg-white/50 p-2 rounded">
                      {conversation.originalText}
                    </div>
                  </div>

                  {/* Translated Text */}
                  {conversation.translatedText && (
                    <div className="mb-3">
                      <h4 className="text-sm font-medium text-gray-700 mb-1">Translated:</h4>
                      <div className="text-gray-600 whitespace-pre-wrap bg-white/30 p-2 rounded">
                        {conversation.translatedText}
                      </div>
                    </div>
                  )}

                  {/* Cultural Highlights */}
                  {conversation.culturalHighlights.length > 0 && (
                    <div>
                      <h4 className="text-sm font-medium text-gray-700 mb-1">Cultural References:</h4>
                      <div className="flex flex-wrap gap-1">
                        {conversation.culturalHighlights.map((highlight, index) => (
                          <span
                            key={index}
                            className="bg-purple-100 text-purple-800 px-2 py-1 rounded text-xs"
                          >
                            {highlight.word}
                          </span>
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
    </div>
  );
}
