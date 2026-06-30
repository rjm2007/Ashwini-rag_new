"use client";

import { useRef, useState } from "react";
import { Mic, Square, Loader2 } from "lucide-react";
import api from "@/lib/api";

export default function MicButton({ onTranscribed }: { onTranscribed: (text: string) => void }) {
  const [state, setState] = useState<"idle" | "recording" | "transcribing">("idle");
  const [error, setError] = useState("");
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);

  const startRecording = async () => {
    setError("");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      chunksRef.current = [];
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };
      recorder.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        const blob = new Blob(chunksRef.current, { type: "audio/webm" });
        setState("transcribing");
        try {
          const formData = new FormData();
          formData.append("file", blob, "defect-description.webm");
          const res = await api.post("/defects/voice-translate", formData, {
            headers: { "Content-Type": "multipart/form-data" },
          });
          const text = res.data?.text?.trim();
          if (text) {
            onTranscribed(text);
          } else {
            setError("Didn't catch that — please try again.");
          }
        } catch (err: any) {
          setError(err?.response?.data?.message || "Could not transcribe audio.");
        } finally {
          setState("idle");
        }
      };
      mediaRecorderRef.current = recorder;
      recorder.start();
      setState("recording");
    } catch {
      setError("Microphone access denied or unavailable.");
      setState("idle");
    }
  };

  const stopRecording = () => {
    mediaRecorderRef.current?.stop();
  };

  return (
    <div style={{ display: "inline-flex", flexDirection: "column", alignItems: "flex-end", gap: 4 }}>
      <button
        type="button"
        onClick={state === "recording" ? stopRecording : startRecording}
        disabled={state === "transcribing"}
        title={
          state === "recording"
            ? "Stop recording"
            : state === "transcribing"
            ? "Transcribing..."
            : "Speak your defect description (any language)"
        }
        style={{
          width: 30,
          height: 30,
          borderRadius: "50%",
          border: "none",
          cursor: state === "transcribing" ? "not-allowed" : "pointer",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: state === "recording" ? "#DC2626" : "#4F46E5",
          color: "#FFFFFF",
        }}
      >
        {state === "transcribing" ? (
          <Loader2 size={14} className="animate-spin" />
        ) : state === "recording" ? (
          <Square size={12} />
        ) : (
          <Mic size={14} />
        )}
      </button>
      {error && <span style={{ fontSize: 10, color: "#DC2626" }}>{error}</span>}
    </div>
  );
}
