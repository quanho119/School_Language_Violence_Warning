import os
import base64
import torch
import whisper
import tempfile
import soundfile as sf
from flask import Flask, request, jsonify
from datetime import datetime
from transformers import BertForSequenceClassification
from utils import encode_text

app = Flask(__name__)

device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
# Load mô hình BERT để phân tích bạo lực
model = BertForSequenceClassification.from_pretrained("model")
model.eval()

# Load mô hình Whisper (phiên âm)
whisper_model = whisper.load_model("small", device=device)

# --- Route phân tích bạo lực từ văn bản ---
@app.route('/predict', methods=['POST'])
def predict():
    data = request.get_json()
    text = data.get("text")

    if not text:
        return jsonify({"error": "No input text provided"}), 400

    inputs = encode_text(text)
    if inputs is None:
        return jsonify({"error": "Invalid or too short text"}), 400

    with torch.no_grad():
        outputs = model(**inputs)
        prediction = torch.argmax(outputs.logits, dim=1).item()

    label_map = {0: "low", 1: "medium", 2: "high"}
    return jsonify({
        "text": text,
        "violence_level": label_map[prediction]
    })


# --- Route phiên âm từ audio base64 (định dạng wav 16kHz) ---
@app.route('/transcribe', methods=['POST'])
def transcribe():
    data = request.get_json()
    audio_base64 = data.get("audio")

    if not audio_base64:
        return jsonify({"error": "No audio data provided"}), 400

    try:
        audio_bytes = base64.b64decode(audio_base64)

        with tempfile.NamedTemporaryFile(delete=False, suffix=".wav") as tmp_file:
            tmp_file.write(audio_bytes)
            tmp_path = tmp_file.name

        # Đọc waveform từ file .wav
        audio_data, sr = sf.read(tmp_path)

        if sr != 16000:
            return jsonify({"error": "Sample rate must be 16000Hz"}), 400

        # Chuyển sang float32 nếu chưa đúng
        if audio_data.dtype != torch.float32:
            audio_data = audio_data.astype("float32")

        # Phiên âm bằng Whisper từ waveform
        result = whisper_model.transcribe(audio_data, language="vi", fp16=False, initial_prompt="Giọng học sinh trong lớp học, nói chuyện về trường học, học tập.")
        transcript = result.get("text", "").strip()

        if not transcript:
            return jsonify({"error": "Transcription failed"}), 500

        return jsonify({"transcript": transcript})

    except Exception as e:
        return jsonify({"error": f"Whisper error: {str(e)}"}), 500

    finally:
        if 'tmp_path' in locals() and os.path.exists(tmp_path):
            os.remove(tmp_path)


if __name__ == "__main__":
    print("🔧 Starting Flask server...")
    app.run(host='0.0.0.0', port=5000, debug=True)
