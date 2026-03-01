"use client";
import { useEffect, useRef, useCallback, useState } from "react";
import { useCall } from "@stream-io/video-react-sdk";
import { DirectorCommand, CSS_FILTERS } from "@/lib/effects";

export interface EffectState {
  zoom: number;
  zoomOrigin: string;
  filter: string;
  shakeClass: string;
  overlayText: string;
  overlayStyle: "caption" | "title" | "whisper";
  overlayVisible: boolean;
}

const DEFAULT_STATE: EffectState = {
  zoom: 1,
  zoomOrigin: "50% 50%",
  filter: "none",
  shakeClass: "",
  overlayText: "",
  overlayStyle: "caption",
  overlayVisible: false,
};

export interface LogEntry {
  id: string;
  tool: string;
  timestamp: Date;
  payload: Record<string, unknown>;
}

export function useDirectorEvents() {
  const call = useCall();
  const [effects, setEffects] = useState<EffectState>(DEFAULT_STATE);
  const [log, setLog] = useState<LogEntry[]>([]);
  const overlayTimer = useRef<ReturnType<typeof setTimeout>>();
  const shakeTimer = useRef<ReturnType<typeof setTimeout>>();

  const applyCommand = useCallback((cmd: DirectorCommand) => {
    setLog((prev) =>
      [
        {
          id: `${Date.now()}-${Math.random()}`,
          tool: cmd.tool,
          timestamp: new Date(),
          payload: cmd as unknown as Record<string, unknown>,
        },
        ...prev,
      ].slice(0, 60)
    );

    setEffects((prev) => {
      const next = { ...prev };
      switch (cmd.tool) {
        case "zoom":
          next.zoom = cmd.zoom_level ?? 1.5;
          next.zoomOrigin =
            { face: "50% 30%", center: "50% 50%", gesture: "50% 60%" }[
              cmd.target ?? "face"
            ] ?? "50% 50%";
          setTimeout(() => setEffects((s) => ({ ...s, zoom: 1 })), 2500);
          break;
        case "filter":
          next.filter = CSS_FILTERS[cmd.style ?? "cinematic"] ?? "none";
          break;
        case "shake":
          next.shakeClass = "animate-shake";
          clearTimeout(shakeTimer.current);
          shakeTimer.current = setTimeout(
            () => setEffects((s) => ({ ...s, shakeClass: "" })),
            cmd.duration_ms ?? 400
          );
          break;
        case "overlay_text":
          next.overlayText = cmd.text ?? "";
          next.overlayStyle =
            (cmd.style as EffectState["overlayStyle"]) ?? "caption";
          next.overlayVisible = true;
          clearTimeout(overlayTimer.current);
          overlayTimer.current = setTimeout(
            () => setEffects((s) => ({ ...s, overlayVisible: false })),
            cmd.duration_ms ?? 3000
          );
          break;
        case "reset":
          return DEFAULT_STATE;
      }
      return next;
    });
  }, []);

  useEffect(() => {
    if (!call) return;
    const unsub = call.on("custom", (event) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const e = event as any;
      const payload = e?.custom?.custom || e?.custom || e;

      if (payload?.type === "director_command") {
        applyCommand(payload as DirectorCommand);
      }
    });

    // Fallback/Demo shortcut keys
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "1") applyCommand({ type: "director_command", tool: "zoom", zoom_level: 1.8, target: "face" });
      if (e.key === "2") applyCommand({ type: "director_command", tool: "filter", style: "neon", intensity: 1.0 });
      if (e.key === "3") applyCommand({ type: "director_command", tool: "shake", intensity: 0.8, duration_ms: 500 });
      if (e.key === "4") applyCommand({ type: "director_command", tool: "overlay_text", text: "We simply out-engineered the competition.", style: "title", duration_ms: 4000 });
      if (e.key === "0") applyCommand({ type: "director_command", tool: "reset" });
    };
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      unsub();
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [call, applyCommand]);

  return { effects, log, applyCommand };
}
