"use client";
import { useEffect, useState, useRef } from "react";
import { Call, StreamVideoClient } from "@stream-io/video-react-sdk";
import { createStreamClient } from "@/lib/stream";

export interface StreamCallState {
  client: StreamVideoClient | null;
  call: Call | null;
  callId: string;
  isReady: boolean;
  error: string | null;
}

export function useStreamCall(): StreamCallState {
  const [state, setState] = useState<StreamCallState>({
    client: null,
    call: null,
    callId: "",
    isReady: false,
    error: null,
  });
  const initialized = useRef(false);

  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;

    createStreamClient()
      .then(({ client, callId }) => {
        const call = client.call("default", callId);
        setState({ client, call, callId, isReady: true, error: null });
      })
      .catch((err) => {
        setState((s) => ({
          ...s,
          error: err instanceof Error ? err.message : "Failed to connect",
          isReady: false,
        }));
      });
  }, []);

  return state;
}
