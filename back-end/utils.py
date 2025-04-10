import re
import requests
from underthesea import word_tokenize
from transformers import AutoTokenizer

# Tải danh sách stopwords tiếng Việt
url = "https://raw.githubusercontent.com/stopwords/vietnamese-stopwords/master/vietnamese-stopwords.txt"
stopwords = set(requests.get(url).text.splitlines())

# Load tokenizer (PhoBERT)
tokenizer = AutoTokenizer.from_pretrained("model")  # Thay bằng đường dẫn thư mục chứa model nếu cần

# Hàm loại bỏ emoji
def de_emojify(text):
    emoji_pattern = re.compile(
        "["
        u"\U0001F600-\U0001F64F"  # emoticons
        u"\U0001F300-\U0001F5FF"  # symbols & pictographs
        u"\U0001F680-\U0001F6FF"  # transport & map symbols
        u"\U0001F1E0-\U0001F1FF"  # flags
        "]+", flags=re.UNICODE
    )
    return emoji_pattern.sub(r'', text)

# Hàm tiền xử lý văn bản
def preprocess_text(text, lowercased=True, remove_special_chars=True, min_word_count=1):
    # Loại bỏ emoji
    text = de_emojify(text)

    # Chuyển về chữ thường nếu yêu cầu
    if lowercased:
        text = text.lower()

    # Loại bỏ ký tự đặc biệt
    if remove_special_chars:
        text = re.sub(r"[^a-zA-Záàảãạăắằẳẵặâấầẩẫậđéèẻẽẹêếềểễệíìỉĩịóòỏõọôốồổỗộơớờởỡợúùủũụưứừửữựýỳỷỹỵ ]+", " ", text)
        text = re.sub(r"\s+", " ", text).strip()

    # Tách từ
    tokens = word_tokenize(text, format="text").split()

    # Bỏ câu quá ngắn
    if len(tokens) < min_word_count:
        return None

    # Loại bỏ stopwords
    filtered = [word for word in tokens if word not in stopwords]

    if len(filtered) < min_word_count:
        return None

    return " ".join(filtered)

# Hàm encode dữ liệu đầu vào cho model
def encode_text(text, min_word_count=1):
    # Kiểm tra đầu vào hợp lệ
    if not isinstance(text, str):
        return None

    # Tiền xử lý
    processed = preprocess_text(text, min_word_count=min_word_count)

    if processed is None:
        return None

    # Mã hóa token
    encoded = tokenizer(
        processed,
        padding="max_length",
        truncation=True,
        max_length=50,
        return_tensors="pt"
    )

    return encoded
