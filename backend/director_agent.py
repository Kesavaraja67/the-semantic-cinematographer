import os
import logging

from dotenv import load_dotenv
from vision_agents.core import Agent, User
from vision_agents.plugins import getstream

load_dotenv()
logger = logging.getLogger(__name__)


def build_llm():
    """
    Modular LLM factory. Reads LLM_PROVIDER from .env.
    """
    provider = os.getenv("LLM_PROVIDER", "gemini").lower()

    if provider == "gemini":
        from vision_agents.plugins import gemini

        model = os.getenv("GEMINI_MODEL", "gemini-2.0-flash")
        api_key = os.getenv("GEMINI_API_KEY")

        logger.info(f"Using GeminiVLM for native multimodal processing: model={model}")
        try:
            return gemini.LLM(
                model=model,
                api_key=api_key,
            )
        except Exception as e:
            logger.warning(f"Failed to load GeminiVLM, falling back to GeminiLLM: {e}")
            return gemini.LLM(
                model=model,
                api_key=api_key,
            )

    elif provider in ("groq", "ollama", "openai_compat"):
        from vision_agents.plugins import openai as va_openai

        base_url = os.getenv("LLM_BASE_URL")
        api_key = os.getenv("LLM_API_KEY", "nokey")
        model = os.getenv("LLM_MODEL", "llama-3.3-70b-versatile")

        if not base_url:
            raise ValueError(
                f"LLM_PROVIDER={provider} requires LLM_BASE_URL to be set in .env"
            )

        logger.info(f"Using ChatCompletionsLLM: model={model}, base_url={base_url}")
        return va_openai.ChatCompletionsLLM(
            model=model,
            base_url=base_url,
            api_key=api_key,
        )

    else:
        raise ValueError(
            f"Unknown LLM_PROVIDER='{provider}'. "
            "Set to: gemini, groq, ollama, or openai_compat"
        )


def build_processors(llm) -> list:
    """
    Builds the processor list.
    Decart is opt-in via DECART_API_KEY.
    YOLO pose detection is only useful with a VideoLLM (e.g. Gemini multimodal).
    With text-only LLMs (Groq), YOLO would draw skeleton overlays on the video
    with no LLM benefit, so it is skipped.
    """
    processors = []

    # ── Decart live restyling (opt-in, added FIRST so it's the video publisher) ──
    decart_key = os.getenv("DECART_API_KEY")
    if decart_key:
        try:
            from vision_agents.plugins import decart

            llm._decart_processor = decart.RestylingProcessor(
                initial_prompt="cinematic color grade, subtle film grain",
                model="mirage_v2",
                api_key=decart_key,
            )
            processors.append(llm._decart_processor)
            logger.info("Decart RestylingProcessor loaded")
        except Exception as e:
            logger.warning(f"Decart unavailable: {e}")

    return processors


async def create_agent(**kwargs) -> Agent:
    """
    Vision Agents factory. Called by AgentLauncher for each new session.
    """
    llm = build_llm()
    processors = build_processors(llm)

    # ── Remove Deepgram STT Dependency ──────────────────────────────────────
    from vision_agents.core.stt.stt import STT
    from vision_agents.core.edge.types import Participant
    import uuid

    class MockSTT(STT):
        """
        A dummy STT class that bypasses Deepgram.
        It keeps the vision_agents framework happy without doing any cloud transcription,
        forcing the Agent to rely entirely on the VideoWatcherProcessor's camera feed.
        """

        def __init__(self):
            super().__init__()
            self.turn_detection = False
            self.session_id = str(uuid.uuid4())
            self.provider_name = "mock"

        async def process_audio(self, pcm_data, participant: Participant):
            # Silently discard audio, avoiding API rate limits
            pass

    agent = Agent(
        edge=getstream.Edge(),
        agent_user=User(name="Director AI", id="director-agent"),
        instructions="Read @instructions.md",
        llm=llm,
        stt=MockSTT(),
        tts=None,  # Disabled TTS as well for speed
        processors=processors,
    )

    # ── Director Tool Registrations ─────────────────────────────────────────

    @agent.llm.register_function(
        description=(
            "Digitally zoom the camera into the subject. "
            "Use for emphasis, key moments, or when the user gestures strongly. "
            "zoom_level: float 1.0 (normal) to 3.0 (close-up). "
            "target: 'face', 'center', or 'gesture'."
        )
    )
    async def adjust_zoom(zoom_level: float, target: str = "face") -> str:
        zoom_level = max(1.0, min(3.0, zoom_level))
        await agent.send_custom_event(
            {
                "type": "director_command",
                "tool": "zoom",
                "zoom_level": zoom_level,
                "target": target,
            }
        )
        return f"Zoom adjusted to {zoom_level}x targeting {target}"

    @agent.llm.register_function(
        description=(
            "Apply a cinematic CSS filter to shift the visual mood. "
            "style: 'cinematic' | 'cold' | 'warm' | 'noir' | 'neon' | 'dreamy'. "
            "intensity: float 0.0 (subtle) to 1.0 (full effect)."
        )
    )
    async def apply_css_filter(style: str, intensity: float = 0.8) -> str:
        valid = {"cinematic", "cold", "warm", "noir", "neon", "dreamy"}
        style = style if style in valid else "cinematic"
        intensity = max(0.0, min(1.0, intensity))
        await agent.send_custom_event(
            {
                "type": "director_command",
                "tool": "filter",
                "style": style,
                "intensity": intensity,
            }
        )
        return f"Applied {style} filter at intensity {intensity}"

    @agent.llm.register_function(
        description=(
            "Trigger a screen shake for impact. "
            "Use on strong gestures, emphatic points, or loud sounds. "
            "intensity: 0.1–1.0. duration_ms: 200–800."
        )
    )
    async def trigger_shake(intensity: float = 0.5, duration_ms: int = 400) -> str:
        await agent.send_custom_event(
            {
                "type": "director_command",
                "tool": "shake",
                "intensity": max(0.1, min(1.0, intensity)),
                "duration_ms": max(200, min(800, duration_ms)),
            }
        )
        return f"Shake: intensity={intensity}, duration={duration_ms}ms"

    @agent.llm.register_function(
        description=(
            "Display a caption or title overlay on the video. "
            "text: max 60 chars. "
            "style: 'caption' (bottom) | 'title' (center large) | 'whisper' (small italic). "
            "duration_ms: 1500–5000."
        )
    )
    async def overlay_caption(
        text: str, style: str = "caption", duration_ms: int = 3000
    ) -> str:
        await agent.send_custom_event(
            {
                "type": "director_command",
                "tool": "overlay_text",
                "text": text[:60],
                "style": style,
                "duration_ms": duration_ms,
            }
        )
        return f"Caption: '{text[:60]}'"

    if hasattr(llm, "_decart_processor"):
        decart_proc = llm._decart_processor

        @agent.llm.register_function(
            description=(
                "Change the live video style using Decart Mirage AI. "
                "Examples: 'Studio Ghibli', 'oil painting', 'cyberpunk neon', "
                "'film noir', 'watercolor impressionist'. "
                "Use for dramatic transitions when the mood shifts significantly."
            )
        )
        async def change_video_style(prompt: str) -> str:
            await decart_proc.update_prompt(prompt)
            await agent.send_custom_event(
                {
                    "type": "director_command",
                    "tool": "decart_style",
                    "prompt": prompt,
                }
            )
            return f"Video style: {prompt}"

    @agent.llm.register_function(
        description=(
            "Reset ALL visual effects to default. "
            "Call after a dramatic sequence or when starting a new segment."
        )
    )
    async def reset_effects() -> str:
        await agent.send_custom_event(
            {
                "type": "director_command",
                "tool": "reset",
            }
        )
        return "All effects reset"

    return agent


async def join_call(agent: Agent, call_type: str, call_id: str, **kwargs) -> None:
    try:
        # MUST call create_user() first — this registers "director-agent" in Stream's
        # user system AND sets edge.agent_user_id so create_call() can reference it.
        # Without this, get_or_create(data={"created_by_id": None}) → 400 error.
        await agent.create_user()
        call = await agent.create_call(call_type, call_id)
        async with agent.join(call):
            await agent.llm.simple_response(
                "The recording studio is live. Greet the user in one sentence "
                "and tell them you're their AI Director, watching and ready."
            )
            # Keep the connection alive indefinitely until the call is destroyed
            # or the process gets a termination signal.
            # Previously, agent.finish() here caused an instant hang-up.
            import asyncio

            await asyncio.Event().wait()
    except Exception as e:
        logger.exception(f"CRITICAL ERROR IN JOIN_CALL: {e}")
        raise
