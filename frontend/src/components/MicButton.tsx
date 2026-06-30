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

  const isRecording = state === "recording";
  const isBusy = state === "transcribing";

  return (
    <div style={{ display: "inline-flex", flexDirection: "column", alignItems: "flex-end", gap: 3 }}>
      <button
        type="button"
        onClick={isRecording ? stopRecording : startRecording}
        disabled={isBusy}
        title={isRecording ? "Stop recording" : isBusy ? "Transcribing..." : "Speak your defect description (any language)"}
        style={{
          width: 42,
          height: 42,
          borderRadius: "50%",
          border: "none",
          cursor: isBusy ? "not-allowed" : "pointer",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: isRecording
            ? "linear-gradient(135deg, #EF4444, #DC2626)"
            : "linear-gradient(135deg, #6366F1, #4F46E5)",
          color: "#FFFFFF",
          boxShadow: isRecording
            ? "0 0 0 6px rgba(220,38,38,0.16), 0 4px 14px rgba(220,38,38,0.4)"
            : "0 0 0 4px rgba(79,70,229,0.12), 0 4px 14px rgba(79,70,229,0.35)",
          animation: isRecording ? "mic-pulse 1.1s ease-in-out infinite" : "mic-glow 2.4s ease-in-out infinite",
          transition: "transform 120ms ease",
        }}
        onMouseDown={(e) => (e.currentTarget.style.transform = "scale(0.94)")}
        onMouseUp={(e) => (e.currentTarget.style.transform = "scale(1)")}
      >
        {isBusy ? (
          <Loader2 size={18} className="animate-spin" />
        ) : isRecording ? (
          <Square size={16} />
        ) : (
          <Mic size={18} />
        )}
      </button>
      <span
        style={{
          fontSize: 10,
          fontWeight: 600,
          letterSpacing: "0.02em",
          color: isRecording ? "#DC2626" : "#4F46E5",
          whiteSpace: "nowrap",
        }}
      >
        {isRecording ? "Recording…" : isBusy ? "Transcribing…" : "Tap to speak"}
      </span>
      {error && <span style={{ fontSize: 10, color: "#DC2626", maxWidth: 140, textAlign: "right" }}>{error}</span>}

      <style jsx>{`
        @keyframes mic-glow {
          0%, 100% {
            box-shadow: 0 0 0 4px rgba(79, 70, 229, 0.12), 0 4px 14px rgba(79, 70, 229, 0.35);
          }
          50% {
            box-shadow: 0 0 0 7px rgba(79, 70, 229, 0.18), 0 4px 18px rgba(79, 70, 229, 0.5);
          }
        }
        @keyframes mic-pulse {
          0%, 100% {
            box-shadow: 0 0 0 6px rgba(220, 38, 38, 0.16), 0 4px 14px rgba(220, 38, 38, 0.4);
            transform: scale(1);
          }
          50% {
            box-shadow: 0 0 0 10px rgba(220, 38, 38, 0.22), 0 4px 18px rgba(220, 38, 38, 0.55);
            transform: scale(1.04);
          }
        }
      `}</style>
    </div>
  );
}
