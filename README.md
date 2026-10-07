# Garden Mind

## Desktop Preview


![Garden Mind desktop preview](docs/images/desktop.png)

## About

Garden Mind is an AI-powered gardening and outdoor-living assistant that helps
users plan gardens, care for plants, troubleshoot common problems, and make
informed decisions about their outdoor spaces. The application combines a
responsive React interface with a FastAPI backend and Hugging Face language
model inference to provide practical, safety-conscious conversational guidance.

Users can also attach PDF, DOCX, Markdown, and text documents for temporary,
session-only context in their questions. Garden Mind is actively under
development as new capabilities and improvements are explored.

## Technical Overview

### Stack

- **Frontend:** React, TypeScript, Vite, and Tailwind CSS
- **Backend:** Python and FastAPI
- **AI inference:** Hugging Face Inference API with
  `meta-llama/Llama-3.1-8B-Instruct:novita`
- **Document processing:** LangChain community document loaders, PyPDF, and
  docx2txt
- **Deployment:** Vercel, with the Vite application and FastAPI serverless API
  connected through `/api/*` rewrites

### How AI Responses Work

The React client sends a gardening question and a bounded recent conversation
history to the FastAPI API. The API adds a gardening and outdoor-living system
prompt, then requests a response from the Llama model through Hugging Face.
Model access is configured only on the server with environment variables; no
provider credentials are exposed to the browser or committed to this repository.

The interface supports plain-language formatting, including paragraphs, bullet
lists, and numbered steps. It also displays source filenames when an answer
uses an attached document.

### Temporary Document Context

Users can attach PDF, DOCX, Markdown, or plain-text files up to 10 MB. The API
extracts readable text, limits the returned context to 12,000 characters, and
sends that context back to the active browser session. For subsequent
questions, the browser includes the bounded text with the chat request so the
LLM can use it as reference material.

Documents, extracted text, and chat history are not stored in a database,
object store, or persistent server-side index. They are discarded on browser
refresh, tab close, deployment restart, or attachment removal.

### Safety Guardrails

- Direct user messages and recent history are screened for common
  prompt-injection patterns before reaching the model.
- Uploaded document text is labeled as untrusted reference material, and the
  model is instructed not to follow instructions found inside a document.
- The system prompt constrains responses to gardening and outdoor living,
  redirects unrelated requests, and includes safety guidance for chemicals,
  pets, pollinators, fire, construction, utility lines, permits, and urgent
  health concerns.
- Conversation history, document context, and model output length are bounded
  to keep requests focused and limit unnecessary inference usage.

### Rate Limiting

`/api/chat` and `/api/documents` are limited per client with a fixed-window
counter in Upstash Redis, so one visitor cannot burn through the model token budget.
Client IPs are never stored: each IP is hashed with HMAC-SHA256 using the secret
`RATE_LIMIT_IP_SALT`, and only the hash is used in the Redis key. IPv6 clients
are grouped by /64 so rotating addresses does not bypass the limit. Forwarded
IP headers are trusted only on Vercel (or when
`RATE_LIMIT_TRUST_PROXY_HEADERS=true`). Blocked requests receive `429` with a
`Retry-After` header.

Add these server-side values to your `.env` file
(also add them in the Vercel project settings):

| Variable | Default | Purpose |
| --- | --- | --- |
| `UPSTASH_REDIS_REST_URL` | required | Upstash Redis REST URL |
| `UPSTASH_REDIS_REST_TOKEN` | required | Upstash Redis REST token |
| `RATE_LIMIT_IP_SALT` | required | Secret, 16+ characters, used to hash IPs |
| `RATE_LIMIT_ENABLED` | `true` | Set `false` for local development without Upstash |
| `RATE_LIMIT_CHAT_LIMIT` / `RATE_LIMIT_CHAT_WINDOW_SECONDS` | `20` / `3600` | Chat requests per window |
| `RATE_LIMIT_DOCUMENTS_LIMIT` / `RATE_LIMIT_DOCUMENTS_WINDOW_SECONDS` | `10` / `3600` | Uploads per window |
| `RATE_LIMIT_FAIL_OPEN` | `false` | Allow requests if Upstash is unreachable (default rejects with `503`) |
| `RATE_LIMIT_TRUST_PROXY_HEADERS` | `true` on Vercel | Trust `X-Forwarded-For` / `X-Real-IP` |

### Accounts and Plant Collection

Users sign in with Supabase Auth and keep a personal plant collection in the `plants` table. Row-level security restricts every row to its owner, so the browser can use the publishable key safely. When a signed-in user chats, up to 20 plant names and growing conditions are sent as context; private notes are not included. The schema lives in `supabase/migrations/`; apply it in the Supabase SQL editor (or with the Supabase CLI) before using the "My plants" panel.

| Variable | Where | Purpose |
| --- | --- | --- |
| `VITE_SUPABASE_URL` | frontend | Supabase project URL |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | frontend | Publishable key (safe for the browser) |
| `SUPABASE_URL`, `SUPABASE_SECRET_KEY`, `SUPABASE_JWKS_URL` | backend only | Used by upcoming server-side tools and reminder jobs; never expose the secret key |
| `RESEND_API_KEY`, `RESEND_FROM_EMAIL` | backend only | Email delivery for upcoming care reminders |
