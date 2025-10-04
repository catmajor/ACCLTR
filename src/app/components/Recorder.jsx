"use client";

import { useState, useRef, useEffect } from "react";

export default function Recorder() {
  const [recording, setRecording] = useState(false);
  const [saving, setSaving] = useState(false);
  const [recordings, setRecordings] = useState([]);
  const [playingId, setPlayingId] = useState(null);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const audioRef = useRef(null);

  // Load recordings on component mount
  useEffect(() => {
    loadRecordings();
  }, []);

  const loadRecordings = async () => {
    try {
      const response = await fetch("/api/recordings");
      if (response.ok) {
        const data = await response.json();
        setRecordings(data.recordings || []);
      }
    } catch (error) {
      console.error("Error loading recordings:", error);
    }
  };

  const startRecording = async () => {
    if (typeof window === "undefined" || !("MediaRecorder" in window)) {
      alert("MediaRecorder not supported in this browser.");
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      
      // Check what formats are supported
      const options = { mimeType: 'audio/webm;codecs=opus' };
      if (!MediaRecorder.isTypeSupported(options.mimeType)) {
        // Fallback to basic webm
        options.mimeType = 'audio/webm';
        if (!MediaRecorder.isTypeSupported(options.mimeType)) {
          // Fallback to mp4
          options.mimeType = 'audio/mp4';
          if (!MediaRecorder.isTypeSupported(options.mimeType)) {
            // Use default
            delete options.mimeType;
          }
        }
      }
      
      console.log("Using MIME type:", options.mimeType || "default");
      
      const mediaRecorder = new MediaRecorder(stream, options);
      mediaRecorderRef.current = mediaRecorder;
      
      // Clear previous chunks
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        // Create a complete audio blob from all chunks
        const audioBlob = new Blob(audioChunksRef.current, { type: options.mimeType || 'audio/webm' });
        
        console.log("Audio blob created:", {
          size: audioBlob.size,
          type: audioBlob.type
        });
        
        // Send the complete audio file to the server
        setSaving(true);
        try {
          const formData = new FormData();
          const extension = options.mimeType?.includes('mp4') ? 'm4a' : 'webm';
          formData.append("audio", audioBlob, `recording-${Date.now()}.${extension}`);

          const response = await fetch("/api/", {
            method: "POST",
            body: formData,
          });

          // Check if response is ok
          if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
          }

          // Get the response text first
          const responseText = await response.text();
          console.log("Response text:", responseText);

          // Try to parse as JSON
          let result;
          try {
            result = JSON.parse(responseText);
          } catch (parseError) {
            console.error("Failed to parse JSON:", parseError);
            console.error("Response was:", responseText);
            throw new Error("Server returned invalid JSON");
          }

          if (result.success) {
            alert(`Recording saved as: ${result.file}`);
            // Reload recordings list
            loadRecordings();
          } else {
            alert(`Failed to save recording: ${result.error || 'Unknown error'}`);
          }
        } catch (error) {
          console.error("Error saving recording:", error);
          alert(`Error saving recording: ${error.message}`);
        } finally {
          setSaving(false);
        }

        // Stop all tracks to release microphone
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start(); // Start recording without time slices
      setRecording(true);
    } catch (error) {
      console.error("Error accessing microphone:", error);
      alert("Error accessing microphone. Please check permissions.");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && recording) {
      mediaRecorderRef.current.stop();
      setRecording(false);
    }
  };

  const playRecording = async (filename) => {
    try {
      setPlayingId(filename);
      const audioUrl = `/api/play/${filename}`;
      
      console.log("Attempting to play:", audioUrl);
      
      if (audioRef.current) {
        audioRef.current.pause();
      }
      
      audioRef.current = new Audio(audioUrl);
      
      // Add more detailed error handling
      audioRef.current.onended = () => {
        console.log("Audio playback ended");
        setPlayingId(null);
      };
      
      audioRef.current.onerror = (e) => {
        console.error("Audio error:", e);
        console.error("Audio error details:", audioRef.current.error);
        setPlayingId(null);
        alert(`Error playing audio file: ${audioRef.current.error?.message || 'Unknown error'}`);
      };
      
      audioRef.current.onloadstart = () => console.log("Audio loading started");
      audioRef.current.oncanplay = () => console.log("Audio can play");
      audioRef.current.onload = () => console.log("Audio loaded");
      
      await audioRef.current.play();
      console.log("Audio playback started");
    } catch (error) {
      console.error("Error playing recording:", error);
      setPlayingId(null);
      alert(`Error playing recording: ${error.message}`);
    }
  };

  const stopPlayback = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
    setPlayingId(null);
  };

  const deleteRecording = async (filename) => {
    if (!confirm(`Delete recording ${filename}?`)) return;
    
    try {
      const response = await fetch(`/api/delete/${filename}`, {
        method: "DELETE",
      });
      
      if (response.ok) {
        alert("Recording deleted");
        loadRecordings();
      } else {
        alert("Failed to delete recording");
      }
    } catch (error) {
      console.error("Error deleting recording:", error);
      alert("Error deleting recording");
    }
  };

  return (
    <div className="space-y-4">
      {/* Recording Controls */}
      <div className="space-x-2">
        {!recording ? (
          <button 
            onClick={startRecording}
            disabled={saving}
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:bg-gray-400"
          >
            {saving ? "Saving..." : "Start Recording"}
          </button>
        ) : (
          <button 
            onClick={stopRecording}
            className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600"
          >
            Stop Recording
          </button>
        )}
        <button 
          onClick={loadRecordings}
          className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600"
        >
          Refresh List
        </button>
      </div>

      {/* Recordings List */}
      <div className="mt-6">
        <h3 className="text-lg font-semibold mb-3">Recorded Files</h3>
        {recordings.length === 0 ? (
          <p className="text-gray-500">No recordings found</p>
        ) : (
          <div className="space-y-2">
            {recordings.map((recording) => (
              <div key={recording} className="flex items-center justify-between p-3 border rounded bg-gray-50">
                <span className="font-mono text-sm">{recording}</span>
                <div className="space-x-2">
                  {playingId === recording ? (
                    <button 
                      onClick={stopPlayback}
                      className="px-3 py-1 bg-red-500 text-white rounded text-sm hover:bg-red-600"
                    >
                      Stop
                    </button>
                  ) : (
                    <button 
                      onClick={() => playRecording(recording)}
                      className="px-3 py-1 bg-green-500 text-white rounded text-sm hover:bg-green-600"
                    >
                      Play
                    </button>
                  )}
                  <button 
                    onClick={() => deleteRecording(recording)}
                    className="px-3 py-1 bg-gray-500 text-white rounded text-sm hover:bg-gray-600"
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
