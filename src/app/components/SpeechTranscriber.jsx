"use client";

import { useState, useRef, useEffect } from "react";

export default function SpeechTranscriber() {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [interimTranscript, setInterimTranscript] = useState("");
  const [language, setLanguage] = useState("en-US");
  const [isSupported, setIsSupported] = useState(false);
  const [error, setError] = useState("");
  const [isContinuous, setIsContinuous] = useState(true);
  const [interimResults, setInterimResults] = useState(true);
  
  const recognitionRef = useRef(null);
  const finalTranscriptRef = useRef("");

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
    }
  };

  const clearTranscript = () => {
    setTranscript("");
    setInterimTranscript("");
    finalTranscriptRef.current = "";
    setError("");
  };

  const copyToClipboard = () => {
    const fullText = finalTranscriptRef.current;
    navigator.clipboard.writeText(fullText).then(() => {
      alert("Transcript copied to clipboard!");
    }).catch((error) => {
      console.error("Failed to copy text:", error);
      alert("Failed to copy text to clipboard.");
    });
  };

  const downloadTranscript = () => {
    const fullText = finalTranscriptRef.current;
    const blob = new Blob([fullText], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `transcript-${new Date().toISOString().slice(0, 19).replace(/:/g, "-")}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
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
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <div className="bg-white rounded-lg shadow-lg p-6">
        <h1 className="text-3xl font-bold text-gray-800 mb-6 text-center">
          Real-Time Speech Transcription
        </h1>
        
        {/* Language and Settings Selection */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Language
            </label>
            <select
              value={language}
              onChange={(e) => setLanguage(e.target.value)}
              disabled={isListening}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {languages.map((lang) => (
                <option key={lang.code} value={lang.code}>
                  {lang.name}
                </option>
              ))}
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Mode
            </label>
            <select
              value={isContinuous ? "continuous" : "single"}
              onChange={(e) => setIsContinuous(e.target.value === "continuous")}
              disabled={isListening}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
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
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
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
        <div className="flex justify-center space-x-4 mb-6">
          {!isListening ? (
            <button
              onClick={startListening}
              disabled={!isSupported}
              className="px-8 py-3 bg-green-500 text-white rounded-lg hover:bg-green-600 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 font-medium disabled:bg-gray-400 disabled:cursor-not-allowed"
            >
              Start Listening
            </button>
          ) : (
            <button
              onClick={stopListening}
              className="px-8 py-3 bg-red-500 text-white rounded-lg hover:bg-red-600 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 font-medium"
            >
              Stop Listening
            </button>
          )}
          
          <button
            onClick={clearTranscript}
            className="px-6 py-3 bg-gray-500 text-white rounded-lg hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 font-medium"
          >
            Clear
          </button>
          
          <button
            onClick={copyToClipboard}
            disabled={!transcript}
            className="px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 font-medium disabled:bg-gray-300 disabled:cursor-not-allowed"
          >
            Copy Text
          </button>
          
          <button
            onClick={downloadTranscript}
            disabled={!transcript}
            className="px-6 py-3 bg-purple-500 text-white rounded-lg hover:bg-purple-600 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 font-medium disabled:bg-gray-300 disabled:cursor-not-allowed"
          >
            Download
          </button>
        </div>

        {/* Status Indicator */}
        <div className="flex items-center justify-center mb-4">
          <div className="flex items-center space-x-2">
            <div className={`w-3 h-3 rounded-full ${getStatusColor()}`}></div>
            <span className="text-sm text-gray-600">
              Status: {getStatusText()}
            </span>
          </div>
        </div>

        {/* Transcription Display */}
        <div className="space-y-4">
          {/* Interim Results */}
          {interimTranscript && interimResults && (
            <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 rounded">
              <h3 className="text-sm font-medium text-yellow-800 mb-2">Interim:</h3>
              <p className="text-yellow-900 italic">{interimTranscript}</p>
            </div>
          )}

          {/* Final Transcription */}
          {transcript && (
            <div className="bg-green-50 border-l-4 border-green-400 p-4 rounded">
              <h3 className="text-sm font-medium text-green-800 mb-2">Final Transcript:</h3>
              <div className="text-green-900 whitespace-pre-wrap max-h-96 overflow-y-auto">
                {transcript}
              </div>
            </div>
          )}

          {/* Empty State */}
          {!transcript && !interimTranscript && (
            <div className="text-center py-8 text-gray-500">
              <p>Click "Start Listening" to begin speech recognition</p>
            </div>
          )}
        </div>

        {/* Instructions */}
        <div className="mt-8 p-4 bg-gray-50 rounded-lg">
          <h3 className="text-sm font-medium text-gray-800 mb-2">Instructions:</h3>
          <ul className="text-sm text-gray-600 space-y-1">
            <li>• Select your language from the dropdown menu</li>
            <li>• Choose between continuous or single utterance mode</li>
            <li>• Enable "Show interim results" to see real-time transcription</li>
            <li>• Click "Start Listening" and speak clearly into your microphone</li>
            <li>• Use "Copy Text" to copy to clipboard or "Download" to save as file</li>
            <li>• Works best in Chrome, Edge, or Safari browsers</li>
            <li>• Requires microphone permissions</li>
          </ul>
        </div>

        {/* Browser Support Notice */}
        {!isSupported && (
          <div className="mt-4 p-4 bg-yellow-100 border border-yellow-400 text-yellow-700 rounded">
            <p className="font-medium">Browser Support Required</p>
            <p className="text-sm mt-1">
              This feature requires a browser that supports the Web Speech API. 
              Please use Chrome, Edge, or Safari for the best experience.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
