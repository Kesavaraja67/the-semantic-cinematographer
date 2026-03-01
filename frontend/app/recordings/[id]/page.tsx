"use client";
import { useEffect, useState, useCallback } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import { StreamVideoClient } from "@stream-io/video-react-sdk";
import { USER_ID } from "@/lib/stream";

const BACKEND = process.env.NEXT_PUBLIC_BACKEND_URL ?? "http://localhost:8000";
const MAX_WAIT_MS = 120_000; // 2 minutes
const POLL_INTERVAL_MS = 5_000;

interface Recording {
  url: string;
  start_time?: string;
  end_time?: string;
  filename?: string;
}

async function buildClient(): Promise<StreamVideoClient> {
  const res = await fetch(`${BACKEND}/token`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ user_id: USER_ID }),
  });
  const { token, api_key } = await res.json();
  return new StreamVideoClient({
    apiKey: api_key,
    user: { id: USER_ID, name: "You" },
    token,
  });
}

export default function RecordingsPage({
  params,
}: {
  params: { id: string };
}) {
  const { id } = params;
  const [recording, setRecording] = useState<Recording | null>(null);
  const [isPolling, setIsPolling] = useState(true);
  const [timedOut, setTimedOut] = useState(false);
  const [copied, setCopied] = useState(false);
  const [backendError, setBackendError] = useState(false);

  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, []);

  useEffect(() => {
    let cancelled = false;
    const startTime = Date.now();
    let client: StreamVideoClient | null = null;

    async function poll() {
      try {
        client = await buildClient();
      } catch {
        if (!cancelled) { setIsPolling(false); setBackendError(true); }
        return;
      }

      while (!cancelled) {
        const elapsed = Date.now() - startTime;
        if (elapsed > MAX_WAIT_MS) {
          if (!cancelled) {
            setIsPolling(false);
            setTimedOut(true);
          }
          break;
        }

        try {
          const call = client.call("default", id);
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const result = await (call as any).queryRecordings();
          const recs = result.recordings ?? [];
          if (recs.length > 0) {
            if (!cancelled) {
              setRecording(recs[0] as Recording);
              setIsPolling(false);
            }
            break;
          }
        } catch {
          // continue polling
        }

        await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS));
      }
    }

    poll();
    return () => {
      cancelled = true;
      client?.disconnectUser?.();
    };
  }, [id]);

  if (backendError) {
    return (
      <div className="min-h-screen bg-[#07070f] flex flex-col items-center justify-center gap-6 px-6">
        <div className="text-4xl">⚠️</div>
        <div className="text-center max-w-sm">
          <p className="text-white text-lg font-semibold mb-2">Backend Offline</p>
          <p className="text-sm text-white/40 leading-relaxed">
            Could not reach the backend to authenticate. Make sure the backend server is running.
          </p>
        </div>
        <Link href="/studio" className="flex items-center gap-2 px-4 py-2 rounded-full glass border border-white/10 text-white/60 text-sm hover:text-white transition-colors">
          ← Back to Studio
        </Link>
      </div>
    );
  }

  // Loading / polling state
  if (isPolling && !recording) {
    return (
      <div className="min-h-screen bg-[#07070f] flex flex-col items-center justify-center gap-6 text-white/50">
        <div className="w-10 h-10 border-2 border-violet-500/40 border-t-violet-500 rounded-full animate-spin" />
        <div className="text-center">
          <p className="text-white text-base font-medium mb-1">
            Processing your final cut…
          </p>
          <p className="text-sm text-white/40">
            This takes about 30 seconds. Hang tight.
          </p>
        </div>
        <div className="glass rounded-full px-4 py-1.5 text-xs text-white/25 font-mono">
          {id}
        </div>
      </div>
    );
  }

  // Timed-out / error state
  if (timedOut && !recording) {
    return (
      <div className="min-h-screen bg-[#07070f] flex flex-col items-center justify-center gap-6 text-white/50 px-6">
        <div className="text-5xl">⏳</div>
        <div className="text-center max-w-sm">
          <p className="text-white text-lg font-semibold mb-2">Still processing…</p>
          <p className="text-sm text-white/40 leading-relaxed">
            Recording is still processing. Check back in a few minutes.
          </p>
        </div>
        <Link
          href="/studio"
          className="flex items-center gap-2 px-4 py-2 rounded-full glass border border-white/10 text-white/60 text-sm hover:text-white transition-colors"
        >
          ← Back to Studio
        </Link>
      </div>
    );
  }

  // Playback state
  const recordingUrl = recording?.url ?? "";

  return (
    <div className="min-h-screen bg-[#07070f] flex flex-col items-center justify-center px-4 py-12">
      <motion.div
        initial={{ opacity: 0, scale: 0.97 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.4, ease: "easeOut" }}
        className="w-full max-w-4xl flex flex-col gap-6"
      >
        {/* Header */}
        <div className="text-center">
          <h1 className="text-2xl font-bold text-white mb-1">🎬 Your Final Cut</h1>
          <p className="text-xs text-white/30 font-mono mt-2">{id}</p>
        </div>

        {/* Video player */}
        <div
          className="w-full rounded-2xl overflow-hidden glass"
          style={{ boxShadow: "0 0 80px rgba(139,92,246,0.15)" }}
        >
          <video
            src={recordingUrl}
            controls
            autoPlay
            playsInline
            className="w-full h-auto"
            style={{ display: "block" }}
          />
        </div>

        {/* Action buttons */}
        <div className="flex flex-wrap items-center justify-center gap-3">
          <a
            href={recordingUrl}
            download
            id="download-btn"
            className="flex items-center gap-2 px-5 py-2.5 rounded-full glass border border-violet-500/30 text-white text-sm font-semibold hover:bg-violet-500/10 transition-colors"
          >
            ⬇ Download Final Cut
          </a>
          <button
            onClick={handleCopy}
            id="copy-link-btn"
            className="flex items-center gap-2 px-5 py-2.5 rounded-full glass border border-white/10 text-white/70 text-sm font-semibold hover:text-white hover:border-white/20 transition-colors"
          >
            {copied ? "✓ Copied!" : "🔗 Copy Share Link"}
          </button>
          <Link
            href="/studio"
            className="flex items-center gap-2 px-5 py-2.5 rounded-full glass border border-white/10 text-white/50 text-sm hover:text-white transition-colors"
          >
            ← Back to Studio
          </Link>
        </div>
      </motion.div>
    </div>
  );
}
