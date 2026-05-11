# LLM Chatbot (Colab model, local backend/frontend)

Overview
- FastAPI backend with JWT auth and SQLite chat-history storage.
- Frontend: simple static pages served by the backend (`/static`).
- Model runs in Google Colab using `colab_model_server.py`; expose via ngrok and set `MODEL_SERVER_URL` to the public `/generate` endpoint.

Quick start (local)
1. Create a Python venv and install requirements:

```bash
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

2. Start the backend (set `MODEL_SERVER_URL` to your Colab public URL):

```bash
export MODEL_SERVER_URL="https://<your-colab-url>/generate"
uvicorn server:app --reload --port 8000
```

3. Open `http://127.0.0.1:8000` in your browser.

Colab model server
- Open a Colab notebook and run `colab_model_server.py` (or paste contents) and start the server. Use `pyngrok` to expose it and obtain a public URL.

Security notes
- Replace `SECRET_KEY` env var for production.
- Use HTTPS in production and secure ngrok tunnels.
# Robert-
