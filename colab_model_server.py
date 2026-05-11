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

from fastapi import FastAPI
from pydantic import BaseModel
import uvicorn
import os
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

class In(BaseModel):
    message: str

app = FastAPI()

@app.post("/generate")
def generate(payload: In):
    # Lazy load model to reduce startup time in examples
    global model, tokenizer
    try:
        model
    except NameError:
        from transformers import AutoTokenizer, AutoModelForSeq2SeqLM
        tokenizer = AutoTokenizer.from_pretrained("google/flan-t5-small")
        model = AutoModelForSeq2SeqLM.from_pretrained("google/flan-t5-small")

    in_text = payload.message
    inputs = tokenizer(in_text, return_tensors="pt")
    outputs = model.generate(**inputs, max_length=200)
    reply = tokenizer.decode(outputs[0], skip_special_tokens=True)
    return {"reply": reply}


if __name__ == "__main__":
    # optional: start ngrok automatically if token provided
    NGROK_AUTH = os.getenv('NGROK_AUTH_TOKEN')
    if NGROK_AUTH:
        try:
            from pyngrok import ngrok
            ngrok.set_auth_token(NGROK_AUTH)
            public_url = ngrok.connect(8000).public_url
            print('Public URL:', public_url)
        except Exception as e:
            print('ngrok start failed:', e)
    uvicorn.run(app, host='0.0.0.0', port=8000)
