# School Language Violence Warning

A comprehensive system for detecting and analyzing violent language in school environments. This project consists of a **React Native mobile app** for notifications and history tracking, a **Flask-based backend** for processing and analyzing text/audio inputs, and integration with **Firebase** for real-time data storage and push notifications.

---

## Features

### Frontend (React Native)

- **Real-time Notifications**: Receive alerts for detected violent language.
- **History Tracking**: View a list of previously detected violent phrases stored in Firebase.
- **Audio Transcription**: Record and transcribe audio inputs for analysis.
- **Push Notifications**: Integrated with Expo Notifications for real-time alerts.
- **User-Friendly Interface**: Modern UI with support for both iOS and Android.

### Backend (Flask)

- **Violence Detection**: Analyze text inputs using a fine-tuned BERT model.
- **Audio Transcription**: Convert audio to text using OpenAI's Whisper model.
- **Push Notifications**: Send alerts to devices via Expo Push Notifications.
- **Text Preprocessing**: Clean and tokenize Vietnamese text using `underthesea` and custom stopword filtering.

### Firebase Integration

- **Realtime Database**: Store and retrieve violent phrases and device tokens.
- **Push Notifications**: Use Firebase tokens to send notifications to specific devices.

---

## Project Structure

### Frontend

- **Path**: `notifications-app/`, `front-end/`
- **Technologies**: React Native, Expo, Firebase Realtime Database.
- **Key Files**:
  - `App.tsx`: Main application logic for notifications and history tracking.
  - `styles.ts`: Styling for the React Native components.
  - `firebaseConfig.ts`: Firebase configuration for the app.

### Backend

- **Path**: `back-end/`
- **Technologies**: Flask, PyTorch, Transformers, OpenAI Whisper.
- **Key Files**:
  - `app.py`: Flask server for handling API requests.
  - `utils.py`: Utility functions for text preprocessing and tokenization.
  - `requirements.txt`: Python dependencies for the backend.

---

## Installation

### Prerequisites

- Node.js and npm
- Python 3.8+
- Expo CLI
- Firebase account
- CUDA-enabled GPU (optional for Whisper and BERT)

### Frontend Setup

1. Navigate to the `notifications-app` directory:

   ```bash
   cd notifications-app
   ```

2. Install dependencies:

   ```bash
   Install dependencies:
   ```

3. Configure Firebase:

- Update firebaseConfig.ts with your Firebase project credentials.

4. Start the Expo development server:

   ```bash
   npm start
   ```

5. Do again with `front-end` directory:

   ```bash
   cd front-end
   ```

### Backend Setup

1. Navigate to the `back-end` directory:

   ```bash
   npm start
   ```

2. Create a virtual environment and activate it:
   ```bash
   python -m venv venv
   ```

- On MacOS/Linux:

  ```bash
  source venv/bin/activate
  ```

- On Windows:
  ```bash
  venv\Scripts\activate
  ```

3. Install dependencies:

   ```bash
   pip install -r requirements.txt
   ```

4. Download the BERT model and Whisper model:

- Place the fine-tuned BERT model in the model/ directory.
- Whisper will be downloaded automatically when the server starts.

5. Start the Flask server:
   ```bash
   python app.py
   ```

---

## Usage

### Frontend

1. Launch the app on your mobile device using Expo Go or a simulator.
2. Enter a text phrase or record audio to analyze for violent language.
3. View the analysis result and receive notifications for high-violence levels.
4. Check the history of detected violent phrases in the app.

### Backend

1. The backend provides two main endpoints:
   - `/predict`: Analyze text for violent language.
   - `/transcribe`: Transcribe audio to text.
2. The backend sends push notifications for high-violence levels.

---

## API Endpoints

### `/predict` (POST)

- **Description**: Analyze text for violent language.
- **Request Body**:
  ```json
  {
    "text": "Your input text",
    "token": "Expo push token"
  }
  ```
- **Response**:
  ```json
  {
    "text": "Your input text",
    "violence_level": "low | medium | high"
  }
  ```

### `/transcribe` (POST)

- **Description**: Transcribe audio to text.
- **Request Body**:
  ```json
  {
    "audio": "Base64-encoded audio file"
  }
  ```
- **Response**:
  ```json
  {
    "transcript": "Transcribed text"
  }
  ```

---

## Technologies Used

### Frontend

- React Native
- Expo
- Firebase Realtime Database
- Expo Notifications

### Backend

- Flask
- PyTorch
- Transformers (BERT)
- OpenAI Whisper
- Underthesea (Vietnamese NLP)

---

## Future Improvements

- Add user authentication for personalized notifications.
- Enhance the violence detection model with more training data.
- Implement a dashboard for administrators to monitor detected phrases.
- Add support for multiple languages.

---

## Contributing

Contributions are welcome! Please follow these steps:

1. Fork the repository.
2. Create a new branch for your feature or bug fix.
3. Submit a pull request with a detailed description of your changes.

---

## Contact

For questions or feedback, please contact [GitHub](https://github.com/quanho119).
