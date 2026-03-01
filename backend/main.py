import os
import hmac
import json
import time
import base64
import hashlib
import logging
from dotenv import load_dotenv
from vision_agents.core import Runner, AgentLauncher
from vision_agents.core.runner.http.options import ServeOptions
from director_agent import create_agent, join_call
from fastapi import HTTPException, Request
from pydantic import BaseModel
import typing

load_dotenv()
logging.basicConfig(level=logging.INFO)


# ── Clock-skew fix ────────────────────────────────────────────────────────────
# The getstream SDK hard-codes iat = time.time() - 5, which only tolerates 5s
# of clock drift between the local machine and Stream's API servers.
# Windows clocks often drift further, causing "token used before issue at (iat)".
# Patch both token methods to use a 60-second backward offset instead.
def _patch_stream_clock_skew():
    import time as _time
    from getstream.stream import BaseStream  # type: ignore

    def _create_token_patched(self, user_id, expiration=None):
        if not user_id:
            raise ValueError("user_id is required")
        return self._create_token(
            user_id=user_id, expiration=expiration, iat=int(_time.time()) - 60
        )

    def _create_call_token_patched(
        self, user_id, call_cids=None, role=None, expiration=None
    ):
        return self._create_token(
            user_id=user_id,
            call_cids=call_cids,
            role=role,
            expiration=expiration,
            iat=int(_time.time()) - 60,
        )

    BaseStream.create_token = _create_token_patched
    BaseStream.create_call_token = _create_call_token_patched
    logging.info("Applied 60s clock-skew patch to getstream SDK token methods")


_patch_stream_clock_skew()
# ─────────────────────────────────────────────────────────────────────────────


launcher = AgentLauncher(create_agent=create_agent, join_call=join_call)


async def my_get_current_user(req: Request) -> typing.Any:
    """Return the AI agent's user_id so Stream knows who owns the session."""
    return "director-agent"


runner = Runner(
    launcher,
    serve_options=ServeOptions(
        cors_allow_origins=[
            "*",
        ],
        get_current_user=my_get_current_user,
    ),
)
app = runner.fast_api  # underlying FastAPI instance — extend with custom routes


async def _register_agent_user():
    """
    Upsert the director-agent user on Stream at server startup.
    This ensures the user exists so GetOrCreateCall can reference
    created_by_id='director-agent' without failing.
    """
    from getstream import AsyncStream

    stream_client = AsyncStream(
        api_key=os.getenv("STREAM_API_KEY"),
        api_secret=os.getenv("STREAM_API_SECRET"),
    )
    try:
        await stream_client.create_user(name="Director AI", id="director-agent")
        logging.info("director-agent user upserted on Stream successfully")
    except Exception as e:
        logging.warning(f"Could not upsert director-agent user on Stream: {e}")


# Register using the non-deprecated router list (avoids FastAPI on_event warning)
app.router.on_startup.append(_register_agent_user)


class TokenRequest(BaseModel):
    user_id: str


@app.post("/token")
async def get_stream_token(req: TokenRequest):
    """Generate a Stream Video user JWT server-side. Secret never leaves backend."""
    api_key = os.getenv("STREAM_API_KEY")
    secret = os.getenv("STREAM_API_SECRET")
    if not api_key or not secret:
        raise HTTPException(status_code=500, detail="Stream credentials missing")

    header = (
        base64.urlsafe_b64encode(json.dumps({"alg": "HS256", "typ": "JWT"}).encode())
        .rstrip(b"=")
        .decode()
    )

    payload = (
        base64.urlsafe_b64encode(
            json.dumps(
                {
                    "user_id": req.user_id,
                    "iss": "stream-video-python",
                    "sub": f"user/{req.user_id}",
                    "iat": int(time.time()) - 60,
                    "exp": int(time.time()) + 7200,
                }
            ).encode()
        )
        .rstrip(b"=")
        .decode()
    )

    signing_input = f"{header}.{payload}".encode()
    sig = (
        base64.urlsafe_b64encode(
            hmac.new(secret.encode(), signing_input, hashlib.sha256).digest()
        )
        .rstrip(b"=")
        .decode()
    )

    return {"token": f"{header}.{payload}.{sig}", "api_key": api_key}


if __name__ == "__main__":
    import sys

    if len(sys.argv) > 1 and sys.argv[1] == "serve":
        runner.serve(host="0.0.0.0", port=8000)
    else:
        runner.cli()
