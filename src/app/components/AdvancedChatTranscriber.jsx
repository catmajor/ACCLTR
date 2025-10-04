"use client";

import { useState, useRef, useEffect } from "react";

export default function AdvancedChatTranscriber() {
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
  const [searchTerm, setSearchTerm] = useState("");
  const [filteredConversations, setFilteredConversations] = useState([]);
  const [showSettings, setShowSettings] = useState(false);
  
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

  // Filter conversations based on search term
  useEffect(() => {
    if (searchTerm.trim() === "") {
      setFilteredConversations(conversations);
    } else {
      const filtered = conversations.filter(conv =>
        conv.text.toLowerCase().includes(searchTerm.toLowerCase())
      );
      setFilteredConversations(filtered);
    }
  }, [conversations, searchTerm]);

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
      setCurrentSessionId(Date.now());
    };

    recognition.onresult = (event) => {
      let interimTranscript = "";
      let finalTranscript = "";

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;
        
        if (event.results[i].isFinal) {
          finalTranscript += transcript;
        } else {
          interimTranscript += transcript;
        }
      }

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
      
      const currentText = finalTranscriptRef.current.trim();
      if (currentText) {
        addToConversations(currentText);
      }
    }
  };

  const addToConversations = (text) => {
    const newConversation = {
      id: Date.now(),
      text: text,
      timestamp: new Date(),
      language: language,
      sessionId: currentSessionId,
      wordCount: text.split(' ').length
    };
    
    setConversations(prev => [newConversation, ...prev]);
    
    setTranscript("");
    setInterimTranscript("");
    finalTranscriptRef.current = "";
  };

  const clearAllConversations = () => {
    if (conversations.length > 0 && confirm("Are you sure you want to clear all conversations?")) {
      setConversations([]);
      setTranscript("");
      setInterimTranscript("");
      finalTranscriptRef.current = "";
      setError("");
    }
  };

  const deleteConversation = (id) => {
    if (confirm("Are you sure you want to delete this conversation?")) {
      setConversations(prev => prev.filter(conv => conv.id !== id));
    }
  };

  const copyConversation = (text) => {
    navigator.clipboard.writeText(text).then(() => {
      // You could add a toast notification here instead of alert
      alert("Conversation copied to clipboard!");
    }).catch((error) => {
      console.error("Failed to copy text:", error);
      alert("Failed to copy text to clipboard.");
    });
  };

  const downloadAllConversations = () => {
    const allText = conversations.map(conv => 
      `[${conv.timestamp.toLocaleString()}] (${conv.language}) ${conv.text}`
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
      <div className="max-w-7xl mx-auto p-4">
        {/* Header */}
        <div className="bg-white/80 backdrop-blur-sm rounded-xl shadow-lg p-6 mb-6 border border-amber-100">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-4xl font-bold bg-gradient-to-r from-amber-600 to-orange-600 bg-clip-text text-transparent">
              ACCLTR
            </h1>
            <button
              onClick={() => setShowSettings(!showSettings)}
              className="px-4 py-2 bg-amber-100 hover:bg-amber-200 rounded-lg transition-colors"
            >
              ⚙️ Settings
            </button>
          </div>
          
          {/* Settings Panel */}
          {showSettings && (
            <div className="bg-gradient-to-r from-amber-50 to-orange-50 rounded-lg p-4 mb-4 border border-amber-200">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Language</label>
                  <select
                    value={language}
                    onChange={(e) => setLanguage(e.target.value)}
                    disabled={isListening}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-amber-500"
                  >
                    {languages.map((lang) => (
                      <option key={lang.code} value={lang.code}>
                        {lang.name}
                      </option>
                    ))}
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Mode</label>
                  <select
                    value={isContinuous ? "continuous" : "single"}
                    onChange={(e) => setIsContinuous(e.target.value === "continuous")}
                    disabled={isListening}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-amber-500"
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
            </div>
          )}

          {/* Error Display */}
          {error && (
            <div className="mb-4 p-4 bg-red-100 border border-red-400 text-red-700 rounded-lg">
              {error}
            </div>
          )}

          {/* Control Buttons */}
          <div className="flex flex-wrap justify-center gap-4 mb-4">
            {!isListening ? (
              <button
                onClick={startListening}
                disabled={!isSupported}
                className="px-8 py-4 bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-xl hover:from-amber-600 hover:to-orange-600 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:ring-offset-2 font-medium disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center space-x-3 shadow-lg transform hover:scale-105 transition-all duration-200"
              >
                <span className="text-2xl">🎤</span>
                <span className="text-lg">Start Listening</span>
              </button>
            ) : (
              <button
                onClick={stopListening}
                className="px-8 py-4 bg-gradient-to-r from-red-500 to-red-600 text-white rounded-xl hover:from-red-600 hover:to-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 font-medium flex items-center space-x-3 shadow-lg transform hover:scale-105 transition-all duration-200"
              >
                <span className="text-2xl">⏹️</span>
                <span className="text-lg">Stop Listening</span>
              </button>
            )}
            
            <button
              onClick={clearAllConversations}
              className="px-6 py-4 bg-gradient-to-r from-gray-500 to-gray-600 text-white rounded-xl hover:from-gray-600 hover:to-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 font-medium shadow-lg transform hover:scale-105 transition-all duration-200"
            >
              🗑️ Clear All
            </button>
            
            <button
              onClick={downloadAllConversations}
              disabled={conversations.length === 0}
              className="px-6 py-4 bg-gradient-to-r from-orange-500 to-red-500 text-white rounded-xl hover:from-orange-600 hover:to-red-600 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2 font-medium disabled:bg-gray-300 disabled:cursor-not-allowed shadow-lg transform hover:scale-105 transition-all duration-200"
            >
              📥 Download All
            </button>
          </div>

          {/* Status Indicator */}
          <div className="flex items-center justify-center">
            <div className="flex items-center space-x-3">
              <div className={`w-4 h-4 rounded-full ${getStatusColor()}`}></div>
              <span className="text-lg font-medium text-gray-700">
                Status: {getStatusText()}
              </span>
            </div>
          </div>
        </div>

        {/* Search Bar */}
        <div className="bg-white/80 backdrop-blur-sm rounded-xl shadow-lg p-4 mb-6 border border-amber-100">
          <div className="flex items-center space-x-4">
            <div className="flex-1">
              <input
                type="text"
                placeholder="Search conversations..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent"
              />
            </div>
            <div className="text-sm text-gray-500">
              {searchTerm ? `${filteredConversations.length} of ${conversations.length} conversations` : `${conversations.length} conversations`}
            </div>
          </div>
        </div>

        {/* Chat Container */}
        <div className="bg-white/80 backdrop-blur-sm rounded-xl shadow-lg border border-amber-100">
          <div className="p-6 border-b border-amber-200">
            <h2 className="text-2xl font-semibold text-gray-800 flex items-center space-x-3">
              <span>💬</span>
              <span>Conversations</span>
              <span className="bg-gradient-to-r from-amber-100 to-orange-100 text-amber-800 px-3 py-1 rounded-full text-sm font-medium">
                {conversations.length}
              </span>
            </h2>
          </div>
          
          {/* Chat Messages */}
          <div 
            ref={chatContainerRef}
            className="h-96 overflow-y-auto p-6 space-y-6"
          >
            {/* Current transcription (if any) */}
            {(transcript || interimTranscript) && (
              <div className="bg-gradient-to-r from-amber-50 to-orange-50 border-l-4 border-amber-400 p-6 rounded-xl shadow-sm">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-lg font-semibold text-amber-800 flex items-center space-x-2">
                    <span>🎯</span>
                    <span>Current Session</span>
                  </h3>
                  <span className="text-sm text-amber-600 bg-amber-100 px-3 py-1 rounded-full">
                    {formatTimestamp(new Date())}
                  </span>
                </div>
                <div className="text-amber-900 space-y-3">
                  {transcript && (
                    <div className="bg-white p-4 rounded-lg border border-amber-200">
                      <span className="text-sm font-medium text-amber-700">Final: </span>
                      <span className="text-gray-800">{transcript}</span>
                    </div>
                  )}
                  {interimTranscript && interimResults && (
                    <div className="bg-white p-4 rounded-lg border border-amber-200 italic">
                      <span className="text-sm font-medium text-amber-600">Interim: </span>
                      <span className="text-gray-600">{interimTranscript}</span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Conversation History */}
            {filteredConversations.length === 0 && !transcript && !interimTranscript ? (
              <div className="text-center py-16 text-gray-500">
                <div className="text-8xl mb-6">🎤</div>
                <h3 className="text-2xl font-semibold mb-4">Ready to Start Your Conversation</h3>
                <p className="text-lg mb-2">Click "Start Listening" and speak clearly into your microphone</p>
                <p className="text-sm">Your conversations will appear here as chat messages</p>
              </div>
            ) : filteredConversations.length === 0 && searchTerm ? (
              <div className="text-center py-16 text-gray-500">
                <div className="text-6xl mb-4">🔍</div>
                <h3 className="text-xl font-semibold mb-2">No conversations found</h3>
                <p className="text-sm">Try adjusting your search terms</p>
              </div>
            ) : (
              filteredConversations.map((conversation) => (
                <div key={conversation.id} className="bg-gradient-to-r from-orange-50 to-red-50 border-l-4 border-orange-400 p-6 rounded-xl hover:from-orange-100 hover:to-red-100 transition-all duration-200 shadow-sm">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center space-x-3">
                      <span className="bg-gradient-to-r from-orange-200 to-red-200 text-orange-700 px-3 py-1 rounded-full text-sm font-medium">
                        {conversation.language}
                      </span>
                      <span className="text-sm text-orange-500">
                        {formatTimestamp(conversation.timestamp)}
                      </span>
                      <span className="text-xs text-orange-400">
                        {conversation.wordCount} words
                      </span>
                    </div>
                    <div className="flex items-center space-x-3">
                      <button
                        onClick={() => copyConversation(conversation.text)}
                        className="text-sm text-amber-600 hover:text-amber-800 font-medium px-3 py-1 rounded-lg hover:bg-amber-50 transition-colors"
                      >
                        📋 Copy
                      </button>
                      <button
                        onClick={() => deleteConversation(conversation.id)}
                        className="text-sm text-red-600 hover:text-red-800 font-medium px-3 py-1 rounded-lg hover:bg-red-50 transition-colors"
                      >
                        🗑️ Delete
                      </button>
                    </div>
                  </div>
                  <div className="text-gray-800 whitespace-pre-wrap leading-relaxed">
                    {conversation.text}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Instructions */}
        <div className="mt-6 p-6 bg-gradient-to-r from-amber-50 to-orange-50 rounded-xl border border-amber-200">
          <h3 className="text-lg font-semibold text-amber-800 mb-3 flex items-center space-x-2">
            <span>💡</span>
            <span>How to use ACCLTR</span>
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <ul className="text-sm text-amber-700 space-y-2">
              <li>• 🎤 Click "Start Listening" to begin transcription</li>
              <li>• 🗣️ Speak clearly into your microphone</li>
              <li>• ⏹️ Click "Stop Listening" to save your conversation</li>
              <li>• 🔍 Use the search bar to find specific conversations</li>
            </ul>
            <ul className="text-sm text-amber-700 space-y-2">
              <li>• 📋 Copy individual messages to clipboard</li>
              <li>• 📥 Download all conversations as a text file</li>
              <li>• ⚙️ Adjust settings for language and mode</li>
              <li>• 🗑️ Clear all conversations when needed</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
