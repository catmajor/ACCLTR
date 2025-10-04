"use client";

import { useState, useRef, useEffect } from "react";

export default function RealTimeTranscriber() {
  const [recording, setRecording] = useState(false);
  const [transcribing, setTranscribing] = useState(false);
  const [transcription, setTranscription] = useState("");
  const [finalTranscription, setFinalTranscription] = useState("");
  const [language, setLanguage] = useState("en");
  const [modelSize, setModelSize] = useState("base");
  const [connectionStatus, setConnectionStatus] = useState("disconnected");
  const [error, setError] = useState("");
  
  const wsRef = useRef(null);
  const audioContextRef = useRef(null);
  const processorRef = useRef(null);
  const streamRef = useRef(null);
  const reconnectTimeoutRef = useRef(null);

  // Available languages and models
  const languages = [
    { code: "en", name: "English" },
    { code: "es", name: "Spanish" },
    { code: "fr", name: "French" },
    { code: "de", name: "German" },
    { code: "it", name: "Italian" },
    { code: "pt", name: "Portuguese" },
    { code: "ru", name: "Russian" },
    { code: "ja", name: "Japanese" },
    { code: "ko", name: "Korean" },
    { code: "zh", name: "Chinese" },
    { code: "auto", name: "Auto-detect" }
  ];

  const modelSizes = [
    { code: "tiny", name: "Tiny (fastest)" },
    { code: "base", name: "Base (recommended)" },
    { code: "small", name: "Small" },
    { code: "medium", name: "Medium" },
    { code: "large-v2", name: "Large (best quality)" }
  ];

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopTranscription();
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
    };
  }, []);

  const connectWebSocket = () => {
    return new Promise((resolve, reject) => {
      try {
        const ws = new WebSocket(`ws://localhost:8080?language=${language}&model=${modelSize}`);
        
        ws.onopen = () => {
          console.log("WebSocket connected");
          setConnectionStatus("connected");
          setError("");
          resolve(ws);
        };

        ws.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            
            if (data.type === 'transcription') {
              setTranscription(data.text);
            } else if (data.type === 'final_transcription') {
              setFinalTranscription(prev => prev + (prev ? '\n' : '') + data.text);
              setTranscription("");
            } else if (data.type === 'initialized') {
              console.log("Transcription initialized:", data.message);
            } else if (data.type === 'error') {
              setError(data.message);
              console.error('Transcription error:', data.message);
            }
          } catch (error) {
            console.error('Error parsing WebSocket message:', error);
          }
        };

        ws.onclose = (event) => {
          console.log("WebSocket disconnected:", event.code, event.reason);
          setConnectionStatus("disconnected");
          
          // Attempt to reconnect if not manually closed
          if (transcribing && event.code !== 1000) {
            reconnectTimeoutRef.current = setTimeout(() => {
              console.log("Attempting to reconnect...");
              connectWebSocket().then(ws => {
                wsRef.current = ws;
              }).catch(err => {
                console.error("Reconnection failed:", err);
                setError("Connection lost. Please restart transcription.");
              });
            }, 3000);
          }
        };

        ws.onerror = (error) => {
          console.error("WebSocket error:", error);
          setConnectionStatus("error");
          reject(error);
        };

      } catch (error) {
        reject(error);
      }
    });
  };

  const startTranscription = async () => {
    if (typeof window === "undefined") return;

    try {
      setError("");
      
      // Get microphone access
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          sampleRate: 16000,
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true
        }
      });
      
      streamRef.current = stream;

      // Connect to WebSocket
      const ws = await connectWebSocket();
      wsRef.current = ws;

      // Start audio processing
      startAudioProcessing(stream);
      
      setTranscribing(true);
      setRecording(true);

    } catch (error) {
      console.error("Error starting transcription:", error);
      if (error.name === 'NotAllowedError') {
        setError("Microphone access denied. Please allow microphone access and try again.");
      } else if (error.name === 'NotFoundError') {
        setError("No microphone found. Please connect a microphone and try again.");
      } else {
        setError(`Error starting transcription: ${error.message}`);
      }
    }
  };

  const startAudioProcessing = (stream) => {
    // Create AudioContext for processing audio
    const audioContext = new (window.AudioContext || window.webkitAudioContext)({
      sampleRate: 16000
    });
    audioContextRef.current = audioContext;

    const source = audioContext.createMediaStreamSource(stream);
    
    // Create a ScriptProcessorNode for audio processing
    const processor = audioContext.createScriptProcessor(4096, 1, 1);
    processorRef.current = processor;

    processor.onaudioprocess = (event) => {
      if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
        const inputBuffer = event.inputBuffer;
        const inputData = inputBuffer.getChannelData(0);
        
        // Convert float32 to int16
        const int16Buffer = new Int16Array(inputData.length);
        for (let i = 0; i < inputData.length; i++) {
          int16Buffer[i] = Math.max(-32768, Math.min(32767, inputData[i] * 32767));
        }
        
        // Send audio data to WebSocket
        wsRef.current.send(JSON.stringify({
          type: 'audio',
          audio: Array.from(int16Buffer)
        }));
      }
    };

    source.connect(processor);
    processor.connect(audioContext.destination);
  };

  const stopTranscription = () => {
    // Stop WebSocket connection
    if (wsRef.current) {
      wsRef.current.send(JSON.stringify({ type: 'stop' }));
      wsRef.current.close();
      wsRef.current = null;
    }
    
    // Stop audio processing
    if (processorRef.current) {
      processorRef.current.disconnect();
      processorRef.current = null;
    }
    
    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }
    
    // Stop microphone stream
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    
    // Clear reconnection timeout
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
    
    setTranscribing(false);
    setRecording(false);
    setConnectionStatus("disconnected");
    
    // Add current transcription to final results
    if (transcription.trim()) {
      setFinalTranscription(prev => prev + (prev ? '\n' : '') + transcription);
    }
    setTranscription("");
  };

  const clearTranscription = () => {
    setTranscription("");
    setFinalTranscription("");
    setError("");
  };

  const copyTranscription = () => {
    const fullText = finalTranscription + (transcription ? '\n' + transcription : '');
    navigator.clipboard.writeText(fullText);
    alert("Transcription copied to clipboard!");
  };

  const downloadTranscription = () => {
    const fullText = finalTranscription + (transcription ? '\n' + transcription : '');
    const blob = new Blob([fullText], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `transcription-${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const getStatusColor = () => {
    switch (connectionStatus) {
      case "connected": return "bg-green-500";
      case "error": return "bg-red-500";
      default: return "bg-gray-500";
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <div className="bg-white rounded-lg shadow-lg p-6">
        <h1 className="text-3xl font-bold text-gray-800 mb-6 text-center">
          Real-Time Audio Transcription
        </h1>
        
        {/* Language and Model Selection */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Language
            </label>
            <select
              value={language}
              onChange={(e) => setLanguage(e.target.value)}
              disabled={transcribing}
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
              Model Size
            </label>
            <select
              value={modelSize}
              onChange={(e) => setModelSize(e.target.value)}
              disabled={transcribing}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {modelSizes.map((model) => (
                <option key={model.code} value={model.code}>
                  {model.name}
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

        {/* Recording Controls */}
        <div className="flex justify-center space-x-4 mb-6">
          {!transcribing ? (
            <button
              onClick={startTranscription}
              className="px-8 py-3 bg-green-500 text-white rounded-lg hover:bg-green-600 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 font-medium"
            >
              Start Transcription
            </button>
          ) : (
            <button
              onClick={stopTranscription}
              className="px-8 py-3 bg-red-500 text-white rounded-lg hover:bg-red-600 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 font-medium"
            >
              Stop Transcription
            </button>
          )}
          
          <button
            onClick={clearTranscription}
            className="px-6 py-3 bg-gray-500 text-white rounded-lg hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 font-medium"
          >
            Clear
          </button>
          
          <button
            onClick={copyTranscription}
            disabled={!transcription && !finalTranscription}
            className="px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 font-medium disabled:bg-gray-300 disabled:cursor-not-allowed"
          >
            Copy Text
          </button>
          
          <button
            onClick={downloadTranscription}
            disabled={!transcription && !finalTranscription}
            className="px-6 py-3 bg-purple-500 text-white rounded-lg hover:bg-purple-600 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 font-medium disabled:bg-gray-300 disabled:cursor-not-allowed"
          >
            Download
          </button>
        </div>

        {/* Status Indicator */}
        <div className="flex items-center justify-center mb-4">
          <div className="flex items-center space-x-2">
            <div className={`w-3 h-3 rounded-full ${getStatusColor()} ${transcribing ? 'animate-pulse' : ''}`}></div>
            <span className="text-sm text-gray-600">
              {transcribing ? 'Transcribing...' : `Status: ${connectionStatus}`}
            </span>
          </div>
        </div>

        {/* Transcription Display */}
        <div className="space-y-4">
          {/* Current Transcription */}
          {transcription && (
            <div className="bg-blue-50 border-l-4 border-blue-400 p-4 rounded">
              <h3 className="text-sm font-medium text-blue-800 mb-2">Current:</h3>
              <p className="text-blue-900">{transcription}</p>
            </div>
          )}

          {/* Final Transcription */}
          {finalTranscription && (
            <div className="bg-green-50 border-l-4 border-green-400 p-4 rounded">
              <h3 className="text-sm font-medium text-green-800 mb-2">Final Transcription:</h3>
              <div className="text-green-900 whitespace-pre-wrap max-h-96 overflow-y-auto">
                {finalTranscription}
              </div>
            </div>
          )}

          {/* Empty State */}
          {!transcription && !finalTranscription && (
            <div className="text-center py-8 text-gray-500">
              <p>Start transcription to see results here</p>
            </div>
          )}
        </div>

        {/* Instructions */}
        <div className="mt-8 p-4 bg-gray-50 rounded-lg">
          <h3 className="text-sm font-medium text-gray-800 mb-2">Instructions:</h3>
          <ul className="text-sm text-gray-600 space-y-1">
            <li>• Select your language and preferred model size</li>
            <li>• Click "Start Transcription" to begin real-time transcription</li>
            <li>• Speak clearly into your microphone</li>
            <li>• Current transcription appears in blue, final results in green</li>
            <li>• Use "Copy Text" to copy to clipboard or "Download" to save as file</li>
            <li>• Make sure the Python WebSocket server is running on port 8080</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
