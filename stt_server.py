from flask import Flask, request, jsonify
from faster_whisper import WhisperModel
import os

app = Flask(__name__)
model = WhisperModel("medium", compute_type="int8")

@app.route("/stt", methods=["POST"])
def stt():
    audio = request.files["audio"]
    path = "temp.wav"
    audio.save(path)

    segments, _ = model.transcribe(path, language="en")
    text = " ".join(seg.text for seg in segments)

    os.remove(path)
    return jsonify({"text": text})

app.run(port=8000)
