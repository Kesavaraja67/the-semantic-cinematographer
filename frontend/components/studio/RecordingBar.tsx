"use client";
import { motion, AnimatePresence } from "framer-motion";
import { useCallback, useState } from "react";

interface RecordingBarProps {
  isRecording: boolean;
  shareUrl: string | null;
  duration: number;
  onStart: () => void;
  onStop: () => void;
}

export function RecordingBar({
  isRecording,
  shareUrl,
  duration,
  onStart,
  onStop,
}: RecordingBarProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(() => {
    if (!shareUrl) return;
    navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [shareUrl]);

  const fmt = (s: number) =>
    `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;

  return (
    <div className="flex items-center gap-3">
      {!isRecording && !shareUrl && (
        <motion.button
          onClick={onStart}
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
            onClick={onStop}
            whileHover={{ scale: 1.04 }}
            whileTap={{ scale: 0.97 }}
            className="flex items-center gap-2 px-4 py-2 rounded-full glass border-white/20 text-sm font-semibold hover:bg-white/10 transition-colors"
          >
            ■ End &amp; Share
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
  );
}
