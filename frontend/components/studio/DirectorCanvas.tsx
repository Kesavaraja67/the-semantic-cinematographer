"use client";
import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  useCallStateHooks,
  ParticipantView,
} from "@stream-io/video-react-sdk";
import type { EffectState } from "@/hooks/useDirectorEvents";

// Removes Stream's built-in overlay (quality badge, "Poor connection" banner, etc.)
const EmptyParticipantUI = () => null;

export function DirectorCanvas({
  effects,
  isRecording,
  logLength = 0,
}: {
  effects: EffectState;
  isRecording: boolean;
  logLength?: number;
}) {
  const { useLocalParticipant, useMicrophoneState } = useCallStateHooks();
  const local = useLocalParticipant();
  // Use Stream SDK's existing microphone stream — avoids a conflicting second getUserMedia call
  const { isMute, mediaStream: micStream } = useMicrophoneState();

  const [micActive, setMicActive] = useState(false);
  const animFrameRef = useRef<number>();
  const ctxRef = useRef<AudioContext | null>(null);

  useEffect(() => {
    // Cleanup previous analyser
    cancelAnimationFrame(animFrameRef.current!);
    ctxRef.current?.close();
    ctxRef.current = null;

    if (!micStream) return;

    const ctx = new AudioContext();
    ctxRef.current = ctx;
    const src = ctx.createMediaStreamSource(micStream);
    const analyser = ctx.createAnalyser();
    analyser.fftSize = 256;
    src.connect(analyser);

    const data = new Uint8Array(analyser.frequencyBinCount);
    const tick = () => {
      analyser.getByteFrequencyData(data);
      const avg = data.reduce((a, b) => a + b, 0) / data.length;
      setMicActive(avg > 4); // threshold: ~4/255 ≈ very sensitive
      animFrameRef.current = requestAnimationFrame(tick);
    };
    tick();

    return () => {
      cancelAnimationFrame(animFrameRef.current!);
      ctx.close();
    };
  }, [micStream]);

  const showSpeakHint = !isRecording && logLength === 0 && !!local;

  return (
    <div
      className={`relative w-full h-full rounded-2xl overflow-hidden bg-black ${effects.shakeClass}`}
    >
      {/* ── Video ───────────────────────────────────────────────────────── */}
      <motion.div
        className="w-full h-full"
        animate={{ scale: effects.zoom }}
        style={{
          transformOrigin: effects.zoomOrigin,
          filter: effects.filter,
          transition: "filter 1.2s ease",
        }}
        transition={{ type: "spring", stiffness: 80, damping: 20 }}
      >
        {local ? (
          <ParticipantView
            participant={local}
            className="w-full h-full object-cover"
            muteAudio
            ParticipantViewUI={EmptyParticipantUI}
          />
        ) : (
          <div className="w-full h-full bg-zinc-900 flex items-center justify-center text-white/50 text-sm">
            Waiting for camera…
          </div>
        )}
      </motion.div>

      {/* ── Vignette ────────────────────────────────────────────────────── */}
      <div
        className="absolute inset-0 pointer-events-none rounded-2xl"
        style={{
          background:
            "radial-gradient(ellipse at center, transparent 55%, rgba(0,0,0,0.55) 100%)",
        }}
      />

      {/* ── REC badge ───────────────────────────────────────────────────── */}
      {isRecording && (
        <div className="absolute top-4 left-4 flex items-center gap-2 px-3 py-1.5 rounded-full bg-red-500/90 backdrop-blur-sm z-10">
          <div className="w-2 h-2 rounded-full bg-white animate-pulse" />
          <span className="text-xs font-bold text-white tracking-widest">LIVE</span>
        </div>
      )}

      {/* ── Mic indicator (bottom-left) ─────────────────────────────────── */}
      {local && (
        <div className="absolute bottom-4 left-4 z-10 flex items-center gap-2">
          <motion.div
            animate={micActive && !isMute ? { scale: [1, 1.2, 1] } : { scale: 1 }}
            transition={{ repeat: Infinity, duration: 0.4 }}
            className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors duration-150 ${
              isMute
                ? "bg-red-500/80"
                : micActive
                ? "bg-violet-500 shadow-lg shadow-violet-500/60"
                : "bg-white/10"
            }`}
          >
            <svg viewBox="0 0 24 24" className="w-4 h-4 fill-white">
              <path d="M12 14a3 3 0 0 0 3-3V5a3 3 0 0 0-6 0v6a3 3 0 0 0 3 3Zm5-3a5 5 0 0 1-10 0H5a7 7 0 0 0 14 0h-2Z" />
            </svg>
          </motion.div>
          {isMute && (
            <span className="text-xs text-red-300 font-medium bg-black/50 px-2 py-0.5 rounded-full">
              Mic muted
            </span>
          )}
        </div>
      )}

      {/* ── "Speak now" prompt ──────────────────────────────────────────── */}
      <AnimatePresence>
        {showSpeakHint && (
          <motion.div
            key="speak-hint"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ delay: 3, duration: 0.5 }}
            className="absolute bottom-16 left-1/2 -translate-x-1/2 z-20 px-5 py-2.5 rounded-xl backdrop-blur-md bg-black/60 border border-white/10 text-white/70 text-sm font-medium whitespace-nowrap"
          >
            🎙️ Speak to activate your AI Director
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Text overlay from AI Director ───────────────────────────────── */}
      <AnimatePresence>
        {effects.overlayVisible && effects.overlayText && (
          <motion.div
            key="overlay"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.25 }}
            className={`
              absolute left-1/2 -translate-x-1/2 z-20 px-5 py-2.5 rounded-xl
              backdrop-blur-md border whitespace-nowrap
              ${
                effects.overlayStyle === "title"
                  ? "bottom-1/2 translate-y-1/2 bg-black/80 border-white/20 text-white text-3xl font-black"
                  : effects.overlayStyle === "whisper"
                  ? "bottom-6 bg-emerald-950/80 border-emerald-500/40 text-emerald-300 text-sm font-mono italic"
                  : "bottom-6 bg-black/75 border-white/15 text-white text-lg font-semibold"
              }
            `}
          >
            {effects.overlayText}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
