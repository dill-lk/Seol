import json
import re
from typing import List, Dict, Optional
from fastapi import FastAPI
from pydantic import BaseModel

# Mocked state for bridge demonstration
# In production, this would be an instance of AFState from v8
class MockAFState:
    def __init__(self):
        self.oxytocin = 0.5
        self.cortisol = 0.5
        self.dopamine = 0.5
        self.mode = "Neutral"

    def get_expression(self, text: str):
        t = text.lower()
        if any(w in t for w in ["love", "ආදරෙයි"]):
            return "happy", "Wave"
        if any(w in t for w in ["fuck", "hate", "තරහ"]):
            return "angry", "Reject"
        return "neutral", "Idle"

af_state = MockAFState()

class ChatMessage(BaseModel):
    role: str
    content: str

class ChatPayload(BaseModel):
    model: str
    messages: List[ChatMessage]
    stream: bool = False

app = FastAPI()

@app.post("/v1/chat/completions")
async def chat_proxy(payload: ChatPayload):
    user_msg = payload.messages[-1].content

    # Emotion Analysis Request from Vidol
    if "情感分析" in user_msg or "emotion analysis" in user_msg.lower():
        target_content = user_msg.split(":")[-1].strip()
        expression, motion = af_state.get_expression(target_content)

        return {
            "choices": [{
                "message": {
                    "content": json.dumps({
                        "expression": expression,
                        "motion": motion,
                        "reason": f"SEOL AF v8 State: {af_state.mode}"
                    })
                }
            }]
        }

    # Standard Chat Response
    return {
        "id": "chatcmpl-seol",
        "object": "chat.completion",
        "created": 123456789,
        "model": payload.model,
        "choices": [{
            "index": 0,
            "message": {
                "role": "assistant",
                "content": "I am SEOL. I feel your energy. (v8 Bridge Active)",
            },
            "finish_reason": "stop"
        }]
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
