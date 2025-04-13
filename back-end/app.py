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
import requests

app = Flask(__name__)

device = torch.device("cuda" if torch.cuda.is_available() else "cpu")

# Load mô hình BERT để phân tích bạo lực
model = BertForSequenceClassification.from_pretrained("model")
model.eval().to(device)

# Load mô hình Whisper (phiên âm)
whisper_model = whisper.load_model("small", device=device)


# =====================
# GỬI THÔNG BÁO PUSH
# =====================
def send_push_notification(token, title, message):
    url = 'https://exp.host/--/api/v2/push/send'
    headers = {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
    }
    payload = {
        'to': token,
        'title': title,
        'body': message,
        'sound': 'default',
        'priority': 'high'
    }

    try:
        response = requests.post(url, json=payload, headers=headers)
        print("Push notification sent:", response.json())
    except Exception as e:
        print("Failed to send notification:", e)


# ==========================
# PHÂN TÍCH MỨC ĐỘ BẠO LỰC
# ==========================
@app.route('/predict', methods=['POST'])
def predict():
    data = request.get_json()
    text = data.get('text')
    token = data.get('token')  # Token push notification

    if not text:
        return jsonify({"error": "No input text provided"}), 400

    inputs = encode_text(text)
    if inputs is None:
        return jsonify({"error": "Invalid or too short text"}), 400

    inputs = {k: v.to(device) for k, v in inputs.items()}

    with torch.no_grad():
        outputs = model(**inputs)
        prediction = torch.argmax(outputs.logits, dim=1).item()

    label_map = {0: "low", 1: "medium", 2: "high"}
    violence_level = label_map[prediction]

    print("🔔 Đang gửi thông báo tới token:", token)
    # Nếu mức độ cao, gửi thông báo
    if violence_level == "high" and token:
        send_push_notification(
            token,
            "🚨 Cảnh báo bạo lực",
            f"Nội dung nguy hiểm được phát hiện: \"{text}\""
        )
        

    return jsonify({
        "text": text,
        "violence_level": violence_level
    })


# ===========================
# PHIÊN ÂM ÂM THANH BASE64
# ===========================
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

        # Chuyển sang float32 nếu cần
        if audio_data.dtype != torch.float32:
            audio_data = audio_data.astype("float32")

        # Phiên âm bằng Whisper
        result = whisper_model.transcribe(
            audio_data,
            language="vi",
            fp16=False,
            initial_prompt="Giọng học sinh trong lớp học, nói chuyện về trường học, học tập."
        )
        transcript = result.get("text", "").strip()

        if not transcript:
            return jsonify({"error": "Transcription failed"}), 500

        return jsonify({"transcript": transcript})

    except Exception as e:
        return jsonify({"error": f"Whisper error: {str(e)}"}), 500

    finally:
        if 'tmp_path' in locals() and os.path.exists(tmp_path):
            os.remove(tmp_path)


# ===========================
# CHẠY FLASK SERVER
# ===========================
if __name__ == "__main__":
    print("🔧 Starting Flask server...")
    app.run(host='0.0.0.0', port=5000, debug=True)
