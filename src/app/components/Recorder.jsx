"use client";

import { useState, useRef } from "react";

export default function Recorder() {
  const [recording, setRecording] = useState(false);
  const mediaRecorderRef = useRef(null);

  const startRecording = async () => {
    if (typeof window === "undefined" || !("MediaRecorder" in window)) {
      alert("MediaRecorder not supported in this browser.");
      return;
    }

    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    const mediaRecorder = new MediaRecorder(stream);
    mediaRecorderRef.current = mediaRecorder;

    mediaRecorder.ondataavailable = async (event) => {
      if (event.data.size > 0) {
        const formData = new FormData();
        formData.append("audio", event.data);

        await fetch("/api/", {
          method: "POST",
          body: formData,
        });
      }
    };

    mediaRecorder.start(5000); // send chunks every 500ms
    setRecording(true);
  };

  const stopRecording = () => {
    mediaRecorderRef.current?.stop();
    setRecording(false);
  };

  return (
    <div className="space-x-2">
      {!recording ? (
        <button onClick={startRecording}>Start Recording</button>
      ) : (
        <button onClick={stopRecording}>Stop Recording</button>
      )}
    </div>
  );
}
