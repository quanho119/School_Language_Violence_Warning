from flask import Flask, request, jsonify
import torch
from transformers import BertForSequenceClassification
from utils import encode_text

app = Flask(__name__)

model = BertForSequenceClassification.from_pretrained("model")
model.eval()

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

if __name__ == "__main__":
    print("Starting Flask server...")
    app.run(host='0.0.0.0', port=5000, debug=True)
