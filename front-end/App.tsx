import React, { useState } from "react";
import { StyleSheet, Text, TextInput, View, Button, ActivityIndicator } from "react-native";
import { Audio } from "expo-av";
import * as FileSystem from "expo-file-system";
import styles from "./styles";

export default function App() {
  const [started, setStarted] = useState(false);
  const [text, setText] = useState("");
  const [result, setResult] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [recording, setRecording] = useState<Audio.Recording | null>(null);

  const handleAnalyze = async (inputText: string) => {
    if (!inputText.trim()) return;

    setLoading(true);
    setResult(null);

    try {
      const response = await fetch("http://192.168.1.100:5000/predict", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ text: inputText }),
      });

      const data = await response.json();
      console.log("Server response:", data);

      if (data && data.violence_level) {
        setResult(data.violence_level);
      } else {
        setResult("Không nhận được dữ liệu phù hợp");
      }
    } catch (error) {
      console.error("Lỗi fetch:", error);
      setResult("Lỗi: Không thể kết nối server");
    }

    setLoading(false);
  };

  const startRecording = async () => {
    try {
      const permission = await Audio.requestPermissionsAsync();
      if (!permission.granted) {
        alert("Cần cấp quyền truy cập micro");
        return;
      }

      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });

      const { recording } = await Audio.Recording.createAsync(
        {
          android: {
            extension: '.wav',
            outputFormat: Audio.RECORDING_OPTION_ANDROID_OUTPUT_FORMAT_DEFAULT, // Default WAV format
            audioEncoder: Audio.RECORDING_OPTION_ANDROID_AUDIO_ENCODER_PCM_16BIT, // PCM 16-bit
            sampleRate: 16000, // Whisper model prefers 16kHz
            numberOfChannels: 1, // Mono audio
            bitRate: 256000, // Adjusted for WAV
          },
          ios: {
            extension: '.wav',
            audioQuality: Audio.RECORDING_OPTION_IOS_AUDIO_QUALITY_HIGH, // High quality
            sampleRate: 16000, // Whisper model prefers 16kHz
            numberOfChannels: 1, // Mono audio
            linearPCMBitDepth: 16, // 16-bit PCM
            linearPCMIsBigEndian: false,
            linearPCMIsFloat: false,
          },
        }
      );

      setRecording(recording);
      console.log("Bắt đầu ghi âm...");
    } catch (err) {
      console.error("Lỗi khi ghi âm:", err);
    }
  };

  const stopRecording = async () => {
    console.log("Dừng ghi âm...");
    if (!recording) return;

    await recording.stopAndUnloadAsync();
    const uri = recording.getURI();
    console.log("File ghi âm:", uri);
    setRecording(null);

    if (uri) {
      setLoading(true);

      try {
        // Ensure the file is read as Base64
        const fileInfo = await FileSystem.readAsStringAsync(uri, {
          encoding: FileSystem.EncodingType.Base64,
        });

        // Send the WAV file to the server
        const response = await fetch("http://192.168.1.100:5000/transcribe", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ audio: fileInfo }),
        });

        const data = await response.json();
        if (data && data.transcript) {
          setText(data.transcript);
          handleAnalyze(data.transcript);
        } else {
          setResult("Không nhận được văn bản từ audio");
        }
      } catch (error) {
        console.error("Lỗi khi gửi file audio:", error);
        setResult("Lỗi khi xử lý âm thanh");
      }

      setLoading(false);
    }
  };

  // Giao diện khởi động
  if (!started) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>Phân tích bạo lực học đường</Text>
        <Button title="Khởi động ứng dụng" onPress={() => setStarted(true)} />
      </View>
    );
  }

  // Giao diện chính
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Kiểm tra mức độ bạo lực</Text>

      <TextInput
        style={styles.input}
        placeholder="Nhập câu nói..."
        value={text}
        onChangeText={setText}
      />

      <Button title="Phân tích văn bản" onPress={() => handleAnalyze(text)} />

      <View style={{ marginVertical: 10 }}>
        <Button
          title={recording ? "Dừng ghi âm" : "Ghi âm câu nói"}
          onPress={recording ? stopRecording : startRecording}
          color={recording ? "red" : "#007bff"}
        />
      </View>

      {loading ? (
        <ActivityIndicator size="large" color="#007bff" style={{ marginTop: 20 }} />
      ) : result !== null ? (
        <Text style={styles.result}>Kết quả: {result}</Text>
      ) : null}
    </View>
  );
}
