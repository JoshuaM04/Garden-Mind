# Garden Mind backend

This directory contains the FastAPI service for Garden Mind's chat endpoint.

## Current chat behavior

- `POST /api/chat` accepts a new message and prior conversation history.
- Garden, outdoor-living, greeting, and unrelated requests are sent to the
  configured Hugging Face model so replies can be conversational and
  context-aware.
- Obvious prompt-injection attempts receive a local gardening redirect without
  making a model request.
- The model receives at most the 12 most recent safe history messages to bound
  input-token usage.
- The system prompt scopes responses to gardening, plant and product safety,
  nutrition, backyard layouts, outdoor furniture, and safety-aware backyard
  projects. It also requests plain-text paragraphs and lists that render well
  in the chat UI.
- The local Vite development origin (`http://localhost:5173`) is allowed by
  CORS middleware.

The deterministic guards are intentionally lightweight. The system prompt
remains the primary policy layer for nuanced or ambiguous requests.

## Running locally

Create `backend/.env` with an `HF_TOKEN` value, then run this command from the
`backend/` directory:

```powershell
python -m uvicorn app.services.main:app --reload --port 8000 --env-file .env
```

## Deploying to Vercel

The repository's root [`vercel.json`](../vercel.json) defines separate Vite
frontend and FastAPI backend services. It routes `/api/*` requests to this
backend while preserving the request path, so `POST /api/chat` reaches the
FastAPI application. The frontend uses `http://localhost:8000` while running
under Vite and uses its own deployed origin for `/api/chat` in production.

Before deploying, add `HF_TOKEN` as an encrypted environment variable in the
Vercel project settings for the Production, Preview, and Development
environments that need chat access. Do not place that token in a frontend
`VITE_*` variable or commit it to the repository.

## Suggested implementation sequence

1. Add a health endpoint and automated backend tests.
2. Add document upload and processing status endpoints.
3. Introduce embeddings and a vector store with document metadata.
4. Implement conversation-aware RAG chat responses and citations.
5. Add Redis-backed rate limiting and temporary job state.
6. Add speech-to-text and text-to-speech endpoints.
7. Add authenticated user and conversation persistence.

The frontend currently sends chat requests directly to this service. Attachments
remain local UI state until document processing is implemented.
