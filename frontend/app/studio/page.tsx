"use client";
import { useEffect, useState, useCallback, useRef } from "react";
import {
  StreamVideo,
  StreamCall,
  useCallStateHooks,
  ParticipantView,
  useCall,
} from "@stream-io/video-react-sdk";
import "@stream-io/video-react-sdk/dist/css/styles.css";
import { motion, AnimatePresence } from "framer-motion";
import { createStreamClient } from "@/lib/stream";
import { DirectorCanvas } from "@/components/studio/DirectorCanvas";
import { DirectorLog } from "@/components/studio/DirectorLog";
import { useDirectorEvents } from "@/hooks/useDirectorEvents";

// ─── Remote audio bridge ───────────────────────────────────────────────────────
// Renders a hidden <audio> element for every remote participant (including the
// AI Director). Without this the browser never subscribes to their WebRTC audio
// track, so you never hear the AI voice.
function RemoteAudio() {
  const { useRemoteParticipants } = useCallStateHooks();
  const remote = useRemoteParticipants();
  return (
    <>
      {remote.map((p) => (
        <div key={p.sessionId} className="sr-only" aria-hidden="true">
          <ParticipantView participant={p} muteAudio={false} />
        </div>
      ))}
    </>
  );
}

// ─── Inner component (rendered inside StreamVideo + StreamCall) ───────────────
function StudioInner({ callId }: { callId: string }) {
  const call = useCall();
  const { useCallCallingState } = useCallStateHooks();
  const callingState = useCallCallingState();
  const { effects, log } = useDirectorEvents();
  const [isRecording, setIsRecording] = useState(false);
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [duration, setDuration] = useState(0);
  const [isDownloading, setIsDownloading] = useState(false);
  const durationRef = useRef<ReturnType<typeof setInterval>>();
  const hasJoined = useRef(false);

  // Join call once — guard against Fast Refresh remount calling join() twice
  useEffect(() => {
    if (!call || hasJoined.current) return;
    hasJoined.current = true;

    const initCall = async () => {
      try {
        // If already joined (e.g. after Fast Refresh), skip join and just enable devices
        const state = (call as unknown as { state?: { callingState?: string } })
          .state?.callingState;
        if (state !== "joined") {
          await call.join({ create: true });
        }
        await call.camera.enable();
        await call.microphone.enable();

        // Invite the AI Director ONLY AFTER mic/cam are active.
        // This prevents the backend's 10-second TrackPublished timeout.
        const BACKEND = process.env.NEXT_PUBLIC_BACKEND_URL ?? "http://localhost:8000";
        fetch(`${BACKEND}/sessions`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ call_id: call.id, call_type: "default" }),
        }).catch((err) => console.error("Failed to invite AI Director:", err));
      } catch (err) {
        console.error("Error joining call:", err);
      }
    };

    initCall();
  }, [call]);

  // Derive connection status from calling state
  const isConnected = callingState === "joined";

  const handleStart = useCallback(async () => {
    setIsRecording(true);
    setDuration(0);
    durationRef.current = setInterval(() => setDuration((d) => d + 1), 1000);
    try {
      await call?.startRecording();
    } catch (err) {
      console.warn("startRecording failed (may still record):", err);
    }
  }, [call]);

  const handleStop = useCallback(async () => {
    setIsRecording(false);
    clearInterval(durationRef.current);
    try {
      await call?.stopRecording();
    } catch (err) {
      console.warn("stopRecording failed (recording may still be available):", err);
    }
    const url = `${window.location.origin}/recordings/${callId}`;
    setShareUrl(url);

    if (window.confirm("Recording finished! Would you like to download the video?")) {
      setIsDownloading(true);
      let recUrl = null;
      for (let i = 0; i < 20; i++) {
        try {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const result = await (call as any)?.queryRecordings();
          const recs = result?.recordings || [];
          if (recs.length > 0 && recs[0].url) {
            recUrl = recs[0].url;
            break;
          }
        } catch (e) {
          console.error("Error fetching recordings", e);
        }
        await new Promise((r) => setTimeout(r, 2000));
      }
      setIsDownloading(false);

      if (recUrl) {
        window.open(recUrl, "_blank");
      } else {
        alert(
          "Recording is still processing. Use the 'View Final Cut' link to check back in a minute."
        );
      }
    }
  }, [call, callId]);

  const handleCopy = useCallback(() => {
    if (!shareUrl) return;
    navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [shareUrl]);

  const fmt = (s: number) =>
    `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;

  return (
    <div className="h-screen bg-[#07070f] text-white flex flex-col overflow-hidden">
      {/* ── Top Bar ─────────────────────────────────────────────────────────── */}
      <header className="flex items-center justify-between px-5 py-3 border-b border-white/5 glass flex-shrink-0 z-30">
        <div className="flex items-center gap-3">
          <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-violet-600 to-pink-500 flex items-center justify-center text-xs shadow-lg shadow-violet-500/30">
            🎬
          </div>
          <span className="font-bold text-sm tracking-tight">Semantic Cinematographer</span>
          <div
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] border ${
              isConnected
                ? "bg-green-500/10 text-green-400 border-green-500/20"
                : "bg-yellow-500/10 text-yellow-400 border-yellow-500/20"
            }`}
          >
            <div
              className={`w-1.5 h-1.5 rounded-full ${
                isConnected ? "bg-green-400 animate-glow-pulse" : "bg-yellow-400 animate-pulse"
              }`}
            />
            {isConnected ? "AI Director Live" : "Connecting…"}
          </div>
        </div>

        <div className="flex items-center gap-3">
          {!isRecording && !shareUrl && (
            <motion.button
              onClick={handleStart}
              whileHover={{ scale: 1.04 }}
              whileTap={{ scale: 0.97 }}
              className="flex items-center gap-2 px-5 py-2.5 rounded-full bg-red-500 hover:bg-red-400 text-white font-semibold text-sm shadow-lg shadow-red-500/25 transition-colors"
            >
              <span className="w-2.5 h-2.5 rounded-full bg-white" />
              Start Recording
            </motion.button>
          )}

          {isRecording && (
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-red-500/20 border border-red-500/40">
                <div className="w-2 h-2 rounded-full bg-red-400 animate-pulse" />
                <span className="text-sm font-mono font-bold text-red-400">
                  REC {fmt(duration)}
                </span>
              </div>
              <motion.button
                onClick={handleStop}
                whileHover={{ scale: 1.04 }}
                whileTap={{ scale: 0.97 }}
                className="flex items-center gap-2 px-4 py-2 rounded-full glass border-white/20 text-sm font-semibold hover:bg-white/10 transition-colors disabled:opacity-50"
                disabled={isDownloading}
              >
                {isDownloading ? "⏳ Processing…" : "■ End & Share"}
              </motion.button>
            </div>
          )}

          <AnimatePresence>
            {shareUrl && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="flex items-center gap-2"
              >
                <a
                  href={shareUrl}
                  className="flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-violet-500/15 border border-violet-500/30 text-violet-300 text-xs font-semibold hover:bg-violet-500/25 transition-colors"
                >
                  🎬 View Final Cut
                </a>
                <button
                  onClick={handleCopy}
                  className="flex items-center gap-2 px-3.5 py-1.5 rounded-full glass border-white/15 text-xs font-semibold text-white/70 hover:text-white transition-colors"
                >
                  {copied ? "✓ Copied!" : "🔗 Copy Link"}
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </header>

      {/* ── Main Content ─────────────────────────────────────────────────────── */}
      {/* Hidden remote audio — plays AI Director's voice over WebRTC */}
      <RemoteAudio />

      <div className="flex flex-1 min-h-0">
        <div className="flex-1 p-4 min-w-0">
          <div
            className="w-full h-full rounded-2xl overflow-hidden"
            style={{
              boxShadow: isRecording
                ? "0 0 0 2px rgba(239,68,68,0.5), 0 0 80px rgba(239,68,68,0.06)"
                : "0 0 0 1px rgba(255,255,255,0.06)",
            }}
          >
            <DirectorCanvas effects={effects} isRecording={isRecording} logLength={log.length} />
          </div>
        </div>

        <div className="w-72 flex-shrink-0">
          <DirectorLog log={log} isConnected={isConnected} />
        </div>
      </div>
    </div>
  );
}

// ─── Outer page component (sets up Stream client) ─────────────────────────────
export default function StudioPage() {
  const [client, setClient] =
    useState<import("@stream-io/video-react-sdk").StreamVideoClient>();
  const [call, setCall] =
    useState<import("@stream-io/video-react-sdk").Call>();
  const [callId, setCallId] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    createStreamClient()
      .then(({ client: c, callId: id }) => {
        setClient(c);
        setCallId(id);
        setCall(c.call("default", id));
      })
      .catch((err) => {
        console.error("Studio init failed:", err);
        setError(
          "Could not connect to the backend. Make sure the backend server is running on port 8000."
        );
      });
  }, []);

  // Error state — backend offline
  if (error) {
    return (
      <div className="h-screen bg-[#07070f] flex items-center justify-center px-6">
        <div className="flex flex-col items-center gap-5 text-center max-w-sm">
          <div className="text-4xl">⚠️</div>
          <h1 className="text-white font-bold text-lg">Backend Offline</h1>
          <p className="text-white/40 text-sm leading-relaxed">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="px-5 py-2.5 rounded-full bg-violet-600 hover:bg-violet-500 text-white text-sm font-semibold transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  // Loading state — setting up session
  if (!client || !call) {
    return (
      <div className="h-screen bg-[#07070f] flex items-center justify-center">
        <div className="flex flex-col items-center gap-4 text-white/40">
          <div className="w-8 h-8 border-2 border-violet-500/40 border-t-violet-500 rounded-full animate-spin" />
          <p className="text-sm">Setting up your studio…</p>
        </div>
      </div>
    );
  }

  return (
    <StreamVideo client={client}>
      <StreamCall call={call}>
        <StudioInner callId={callId} />
      </StreamCall>
    </StreamVideo>
  );
}
