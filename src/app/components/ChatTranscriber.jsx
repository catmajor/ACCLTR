"use client";

import { useState, useRef, useEffect } from "react";

export default function ChatTranscriber() {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [interimTranscript, setInterimTranscript] = useState("");
  const [language, setLanguage] = useState("en-US");
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
  }, [language, isContinuous, interimResults]);

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
    
    // Configure recognition settings
    recognition.continuous = isContinuous;
    recognition.interimResults = interimResults;
    recognition.lang = language;
    recognition.maxAlternatives = 1;

    // Event handlers
    recognition.onstart = () => {
      console.log("Speech recognition started");
      setError("");
      // Generate a new session ID for this listening session
      setCurrentSessionId(Date.now());
    };

    recognition.onresult = (event) => {
      let interimTranscript = "";
      let finalTranscript = "";

      // Process all results
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;
        
        if (event.results[i].isFinal) {
          finalTranscript += transcript;
        } else {
          interimTranscript += transcript;
        }
      }

      // Update state
      setInterimTranscript(interimTranscript);
      
      if (finalTranscript) {
        finalTranscriptRef.current += finalTranscript;
        setTranscript(finalTranscriptRef.current);
      }
    };

    recognition.onerror = (event) => {
      console.error("Speech recognition error:", event.error);
      
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
      console.log("Speech recognition ended");
      setIsListening(false);
    };

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
    } catch (error) {
      console.error("Error starting speech recognition:", error);
      setError("Failed to start speech recognition. Please try again.");
    }
  };

  const stopListening = () => {
    if (recognitionRef.current && isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
      
      // Add current transcript to conversations if there's any content
      const currentText = finalTranscriptRef.current.trim();
      if (currentText) {
        addToConversations(currentText);
      }
    }
  };

  const addToConversations = (text) => {
    // Fetch translation then add conversation with translatedText
    (async () => {
      let translatedText = null;
      try {
        const res = await fetch('/api/translate', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ text, targetLang: (language || 'en-US').split('-')[0] }),
        });
        if (res.ok) {
          const j = await res.json();
          translatedText = j.text || null;
        }
      } catch (e) {
        console.warn('Translation failed', e);
      }

      const newConversation = {
        id: Date.now(),
        text: text,
        translatedText,
        timestamp: new Date(),
        language: language,
        sessionId: currentSessionId,
      };

      setConversations((prev) => [newConversation, ...prev]);
    })();
    
    // Clear current transcript
    setTranscript("");
    setInterimTranscript("");
    finalTranscriptRef.current = "";
  };

  const clearAllConversations = () => {
    setConversations([]);
    setTranscript("");
    setInterimTranscript("");
    finalTranscriptRef.current = "";
    setError("");
  };

  const deleteConversation = (id) => {
    setConversations(prev => prev.filter(conv => conv.id !== id));
  };

  const copyConversation = (text) => {
    navigator.clipboard.writeText(text).then(() => {
      alert("Conversation copied to clipboard!");
    }).catch((error) => {
      console.error("Failed to copy text:", error);
      alert("Failed to copy text to clipboard.");
    });
  };

  const downloadAllConversations = () => {
    const allText = conversations.map(conv => 
      `[${conv.timestamp.toLocaleString()}] ${conv.text}`
    ).join('\n\n');
    
    const blob = new Blob([allText], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `conversations-${new Date().toISOString().slice(0, 19).replace(/:/g, "-")}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const formatTimestamp = (timestamp) => {
    return timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 via-orange-50 to-red-50">
      <div className="max-w-6xl mx-auto p-4">
        {/* Header */}
        <div className="bg-white/80 backdrop-blur-sm rounded-lg shadow-lg p-6 mb-4 border border-amber-100">
          <h1 className="text-3xl font-bold text-gray-800 mb-4 text-center">
            ACCLTR
          </h1>
          
          {/* Controls */}
          <div className="flex flex-wrap gap-4 items-center justify-center mb-4">
            <div className="flex items-center space-x-2">
              <label className="text-sm font-medium text-gray-700">Language:</label>
              <select
                value={language}
                onChange={(e) => setLanguage(e.target.value)}
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
              <label className="text-sm font-medium text-gray-700">Mode:</label>
              <select
                value={isContinuous ? "continuous" : "single"}
                onChange={(e) => setIsContinuous(e.target.value === "continuous")}
                disabled={isListening}
                className="px-3 py-1 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-amber-500 text-sm"
              >
                <option value="continuous">Continuous</option>
                <option value="single">Single Utterance</option>
              </select>
            </div>
            
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="interimResults"
                checked={interimResults}
                onChange={(e) => setInterimResults(e.target.checked)}
                disabled={isListening}
                className="h-4 w-4 text-amber-600 focus:ring-amber-500 border-gray-300 rounded"
              />
              <label htmlFor="interimResults" className="text-sm text-gray-700">
                Show interim results
              </label>
            </div>
          </div>

          {/* Error Display */}
          {error && (
            <div className="mb-4 p-4 bg-red-100 border border-red-400 text-red-700 rounded">
              {error}
            </div>
          )}

          {/* Control Buttons */}
          <div className="flex justify-center space-x-4 mb-4">
            {!isListening ? (
              <button
                onClick={startListening}
                disabled={!isSupported}
                className="px-6 py-3 bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-lg hover:from-amber-600 hover:to-orange-600 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:ring-offset-2 font-medium disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center space-x-2 shadow-lg"
              >
                <span>🎤</span>
                <span>Start Listening</span>
              </button>
            ) : (
              <button
                onClick={stopListening}
                className="px-6 py-3 bg-gradient-to-r from-red-500 to-red-600 text-white rounded-lg hover:from-red-600 hover:to-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 font-medium flex items-center space-x-2 shadow-lg"
              >
                <span>⏹️</span>
                <span>Stop Listening</span>
              </button>
            )}
            
            <button
              onClick={clearAllConversations}
              className="px-4 py-3 bg-gradient-to-r from-gray-500 to-gray-600 text-white rounded-lg hover:from-gray-600 hover:to-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 font-medium shadow-lg"
            >
              Clear All
            </button>
            
            <button
              onClick={downloadAllConversations}
              disabled={conversations.length === 0}
              className="px-4 py-3 bg-gradient-to-r from-orange-500 to-red-500 text-white rounded-lg hover:from-orange-600 hover:to-red-600 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2 font-medium disabled:bg-gray-300 disabled:cursor-not-allowed shadow-lg"
            >
              Download All
            </button>
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

        {/* Chat Container */}
        <div className="bg-white/80 backdrop-blur-sm rounded-lg shadow-lg border border-amber-100">
          <div className="p-4 border-b border-amber-200">
            <h2 className="text-xl font-semibold text-gray-800">
              💬 Conversations ({conversations.length})
            </h2>
          </div>
          
          {/* Chat Messages */}
          <div 
            ref={chatContainerRef}
            className="h-96 overflow-y-auto p-4 space-y-4"
          >
            {/* Current transcription (if any) */}
            {(transcript || interimTranscript) && (
              <div className="bg-gradient-to-r from-amber-50 to-orange-50 border-l-4 border-amber-400 p-4 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-sm font-medium text-amber-800">Current Session</h3>
                  <span className="text-xs text-amber-600">{formatTimestamp(new Date())}</span>
                </div>
                <div className="text-amber-900">
                  {transcript && (
                    <div className="mb-2">
                      <span className="text-xs font-medium text-amber-700">Final: </span>
                      {transcript}
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
            )}

            {/* Conversation History */}
            {conversations.length === 0 && !transcript && !interimTranscript ? (
              <div className="text-center py-12 text-gray-500">
                <div className="text-6xl mb-4">🎤</div>
                <p className="text-lg">Start speaking to begin your conversation</p>
                <p className="text-sm mt-2">Click "Start Listening" and speak clearly into your microphone</p>
              </div>
            ) : (
              conversations.map((conversation) => (
                <div key={conversation.id} className="bg-gradient-to-r from-orange-50 to-red-50 border-l-4 border-orange-400 p-4 rounded-lg hover:from-orange-100 hover:to-red-100 transition-colors">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center space-x-2">
                      <span className="text-xs font-medium text-orange-600">
                        {conversation.language}
                      </span>
                      <span className="text-xs text-orange-500">
                        {formatTimestamp(conversation.timestamp)}
                      </span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => copyConversation(conversation.text)}
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
                  <div className="text-gray-800 whitespace-pre-wrap">
                    {conversation.text}
                  </div>
                  {conversation.translatedText && (
                    <div className="mt-2 text-gray-600 whitespace-pre-wrap border-l-2 border-gray-200 pl-3">
                      <div className="text-xs text-gray-500 mb-1">Translated:</div>
                      <div>{conversation.translatedText}</div>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>

        {/* Instructions */}
        <div className="mt-4 p-4 bg-gradient-to-r from-amber-50 to-orange-50 rounded-lg border border-amber-200">
          <h3 className="text-sm font-medium text-amber-800 mb-2">How to use:</h3>
          <ul className="text-sm text-amber-700 space-y-1">
            <li>• Select your language and preferred mode</li>
            <li>• Click "Start Listening" to begin transcription</li>
            <li>• Speak clearly into your microphone</li>
            <li>• Click "Stop Listening" to save your conversation to the chat</li>
            <li>• Each conversation appears as a separate message in the chat</li>
            <li>• Use "Copy" to copy individual messages or "Download All" for everything</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
