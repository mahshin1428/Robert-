"""
This script is intended to be run in Google Colab to host a small open-source model
as a REST endpoint. It uses Flan-T5 small as an example. It also demonstrates using
pyngrok to expose the local FastAPI server to the internet so your local backend can
call it. In Colab run these steps:

1. Upload this file or paste into a notebook cell.
2. Install dependencies: `pip install -U transformers accelerate fastapi uvicorn pyngrok torch`
3. Set your NGROK_AUTH_TOKEN as an env var or paste it below.
4. Run the script to start the server and get a public URL.

Notes: Using Colab GPU speeds up generation. Keep the model small (flan-t5-small) to fit.
"""
import os
import torch
import uvicorn
import nest_asyncio
import asyncio
from fastapi import FastAPI
from pydantic import BaseModel
from pyngrok import ngrok
from transformers import AutoTokenizer, AutoModelForSeq2SeqLM

# 1. FIX: Apply nest_asyncio to allow Uvicorn to run inside Colab's loop
nest_asyncio.apply()

app = FastAPI()

class In(BaseModel):
    message: str

# 2. DEVICE: Check for GPU
device = "cuda" if torch.cuda.is_available() else "cpu"
print(f"🚀 Using device: {device}")

# 3. MODEL: Load once into memory/GPU
print("⏳ Loading model... please wait.")
model_name = "google/flan-t5-small"
tokenizer = AutoTokenizer.from_pretrained(model_name)
model = AutoModelForSeq2SeqLM.from_pretrained(model_name).to(device)
print("✅ Model loaded successfully!")

@app.post("/generate")
async def generate(payload: In):
    in_text = payload.message

    # Prepare inputs and move to GPU
    inputs = tokenizer(in_text, return_tensors="pt").to(device)

    # Generate response
    with torch.no_grad():
        outputs = model.generate(**inputs, max_length=200)

    reply = tokenizer.decode(outputs[0], skip_special_tokens=True)
    return {"reply": reply}

# 4. TUNNEL: Setup Ngrok
# Load token from .env file
NGROK_TOKEN = os.getenv("NGROK_AUTH_TOKEN")

try:
    ngrok.set_auth_token(NGROK_TOKEN)
    # Check if a tunnel is already open to avoid errors on re-run
    tunnels = ngrok.get_tunnels()
    for t in tunnels:
        ngrok.disconnect(t.public_url)

    public_url = ngrok.connect(8000).public_url
    print(f'\n🌐 PUBLIC URL: {public_url}')
    print('Use this URL in your local machine to send POST requests.')
except Exception as e:
    print('ngrok start failed:', e)

# 5. EXECUTION: Run using the existing loop
if __name__ == "__main__":
    config = uvicorn.Config(app=app, host='0.0.0.0', port=8000, loop="asyncio")
    server = uvicorn.Server(config)

    # In Colab, we use 'await' instead of 'uvicorn.run' to avoid the RuntimeError
    await server.serve()





