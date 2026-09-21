# Garden Mind backend

This directory is deliberately an **unimplemented starting point** for the
FastAPI service. The current milestone is the React user interface; no server,
model, authentication, or document-processing code is included here.

## Intended responsibility boundaries

- `app/api/` — FastAPI routes for chat, documents, speech-to-text, and
  text-to-speech.
- `app/services/` — orchestration around LangChain, the LLM provider, vector
  store, and Redis.
- `app/models/` — API request/response schemas and persistence models.
- `tests/` — backend tests as endpoints and services are implemented.

## Suggested implementation sequence

1. Create the FastAPI application entry point and health endpoint.
2. Add document upload and processing status endpoints.
3. Introduce embeddings and a vector store with document metadata.
4. Implement conversation-aware RAG chat responses and citations.
5. Add Redis-backed rate limiting and temporary job state.
6. Add speech-to-text and text-to-speech endpoints.
7. Add authenticated user and conversation persistence.

The frontend currently uses local UI state for attachments and messages. When
the APIs are ready, replace those state-only interactions with typed client
calls to this service.
