import { StreamVideoClient } from "@stream-io/video-react-sdk";
import { nanoid } from "nanoid";

export const USER_ID = `director-${nanoid(8)}`;
const BACKEND = process.env.NEXT_PUBLIC_BACKEND_URL ?? "http://localhost:8000";

// Module-level singleton — prevents React StrictMode double-init
let _instance: { client: StreamVideoClient; callId: string } | null = null;
let _inflight: Promise<{ client: StreamVideoClient; callId: string }> | null = null;

export async function createStreamClient(): Promise<{
  client: StreamVideoClient;
  callId: string;
}> {
  // Return existing instance if already initialized
  if (_instance) return _instance;
  // Return in-flight promise if initialization is in progress
  if (_inflight) return _inflight;

  _inflight = (async () => {
    try {
      const res = await fetch(`${BACKEND}/token`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_id: USER_ID }),
      });

      if (!res.ok) {
        throw new Error(`Backend returned status ${res.status}`);
      }

      const { token, api_key } = await res.json();

      const client = new StreamVideoClient({
        apiKey: api_key,
        user: { id: USER_ID, name: "You" },
        token,
      });

      const callId = `sc-${nanoid(10)}`;

      _instance = { client, callId };
      return _instance;
    } catch (err) {
      _inflight = null; // Reset singleton lock so user can click Retry
      console.error("Failed to initialize Stream client:", err);
      throw new Error("Could not connect to the backend server.");
    }
  })();

  return _inflight;
}
