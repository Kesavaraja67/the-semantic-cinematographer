"use client";
import { motion, AnimatePresence } from "framer-motion";
import { formatDistanceToNow } from "date-fns";
import type { LogEntry } from "@/hooks/useDirectorEvents";

const TOOL_META: Record<string, { icon: string; color: string }> = {
  zoom:         { icon: "🔍", color: "border-blue-500/40 bg-blue-950/40" },
  filter:       { icon: "🎨", color: "border-purple-500/40 bg-purple-950/40" },
  shake:        { icon: "⚡", color: "border-yellow-500/40 bg-yellow-950/40" },
  overlay_text: { icon: "💬", color: "border-green-500/40 bg-green-950/40" },
  decart_style: { icon: "🖼️", color: "border-pink-500/40 bg-pink-950/40" },
  reset:        { icon: "↩️", color: "border-white/10 bg-white/5" },
};

export function DirectorLog({
  log,
  isConnected,
}: {
  log: LogEntry[];
  isConnected: boolean;
}) {
  return (
    <div className="flex flex-col h-full bg-black/40 backdrop-blur-xl border-l border-white/10">
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/10 flex-shrink-0">
        <div className="flex items-center gap-3">
          <div
            className={`w-2 h-2 rounded-full ${
              isConnected ? "bg-green-400 animate-glow-pulse" : "bg-yellow-400 animate-pulse"
            }`}
          />
          <span className="text-[11px] font-semibold text-white/50 uppercase tracking-[0.15em]">
            Director's Log
          </span>
        </div>
        <span className="text-[10px] font-mono text-white/25">
          {log.length} cuts
        </span>
      </div>

      <div className="flex-1 overflow-y-auto px-3 py-2 space-y-2 scrollbar-thin">
        <AnimatePresence mode="popLayout" initial={false}>
          {log.map((entry) => {
            const meta = TOOL_META[entry.tool] ?? {
              icon: "🎬",
              color: "border-white/10 bg-white/5",
            };
            return (
              <motion.div
                key={entry.id}
                initial={{ opacity: 0, x: 16 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.22 }}
                className={`rounded-xl border px-3 py-2.5 ${meta.color}`}
              >
                <div className="flex items-start gap-2">
                  <span className="text-sm mt-0.5 flex-shrink-0">{meta.icon}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[11px] font-mono font-bold text-white/75 uppercase">
                        {entry.tool.replace("_", " ")}
                      </span>
                      <span className="text-[10px] text-white/25 whitespace-nowrap">
                        {formatDistanceToNow(entry.timestamp, { addSuffix: true })}
                      </span>
                    </div>
                    <pre className="text-[10px] font-mono text-white/35 bg-black/30 rounded px-2 py-1 overflow-x-auto whitespace-pre-wrap break-all">
                      {JSON.stringify(
                        Object.fromEntries(
                          Object.entries(entry.payload).filter(
                            ([k]) => !["type", "tool"].includes(k)
                          )
                        ),
                        null,
                        0
                      )}
                    </pre>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>

        {log.length === 0 && (
          <div className="flex flex-col items-center justify-center h-40 text-white/20 text-center">
            <div className="text-3xl mb-3 animate-float">🎬</div>
            <p className="text-xs leading-relaxed">
              Waiting for the AI Director
              <br />
              to call their first shot…
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
