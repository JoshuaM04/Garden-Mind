import os
from huggingface_hub import InferenceClient
from fastapi import APIRouter
from typing import Literal
from pydantic import BaseModel

router = APIRouter()

client = InferenceClient(
    api_key=os.environ["HF_TOKEN"],
)

# Class model for one prior conversation turn (user or assistant)
class Message(BaseModel):
    role: Literal["user", "assistant"]
    content: str

# Class model for the entire incoming request + list[Message] history
class ChatRequest(BaseModel):
    message: str
    history: list[Message]

SYSTEM_PROMPT = "You are an AI Assistant that helps users with queries about their garden."

@router.post('/chat')
def chat(item: ChatRequest):

    messages = []
    messages.append( { "role": "system", "content": SYSTEM_PROMPT } )

    for message in item.history:
        messages.append( { "role": message.role, "content": message.content } )

    messages.append( { "role": "user", "content": item.message } )

    response = client.chat.completions.create(
        model="meta-llama/Llama-3.1-8B-Instruct:novita",
        messages=messages,
        max_tokens = 500,
        temperature = 0.0,
    )

    resp = response.choices[0].message.content

    return { "assistant message": resp }