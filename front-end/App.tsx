import React, { useState, useEffect } from "react";
import { Text, TextInput, View, TouchableOpacity, ActivityIndicator, Alert, SafeAreaView } from "react-native";
import styles from "./styles"; // Import styles từ styles.ts
import { Audio } from "expo-av";
import * as FileSystem from "expo-file-system";
import { getMessaging, getToken } from "firebase/messaging";
import { firebaseConfig } from "./firebaseConfig"; // Import cấu hình Firebase
import { initializeApp } from "firebase/app"; // Khởi tạo Firebase
import { getDatabase, ref, get } from "firebase/database";
import { BlurView } from "expo-blur";
import { Ionicons } from "@expo/vector-icons";

// Khởi tạo Firebase
const app = initializeApp(firebaseConfig);
const database = getDatabase(app);

export default function App() {
  const [started, setStarted] = useState(false);
  const [text, setText] = useState("");
  const [result, setResult] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [recording, setRecording] = useState<Audio.Recording | null>(null);
  const [expoPushToken, setExpoPushToken] = useState<string | null>(null);
  const [token, setToken] = useState<string | null>(null);

  useEffect(() => {
    // Lấy token Firebase khi app khởi chạy
    fetchTokenFromDatabase();
  }, []);

  const fetchTokenFromDatabase = async () => {
    setLoading(true);
    try {
      const tokenRef = ref(database, "notifications/token"); // Đường dẫn tới token trong Firebase Realtime Database
      const snapshot = await get(tokenRef);

      if (snapshot.exists()) {
        const tokenFromDB = snapshot.val(); // Lấy token từ Firebase
        setToken(tokenFromDB);
        console.log("🚀 Token lấy từ Firebase:", tokenFromDB);
      } else {
        console.log("⚠️ Không tìm thấy token trong Firebase Realtime Database");
      }
    } catch (error) {
      console.error("❌ Lỗi khi lấy token từ Firebase:", error);
    }
    setLoading(false);
  };

  const handleAnalyze = async (inputText: string) => {
    if (!inputText.trim()) return;

    if (!token) { // Kiểm tra nếu token không có
      Alert.alert("Lỗi", "Không có token để gửi");
      return;
    }

    setLoading(true);
    setResult(null);

    try {
      const response = await fetch("http://192.168.1.100:5000/predict", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          text: inputText,
          token: token, // Gửi token Firebase lên backend
        }),
      });

      const data = await response.json();
      console.log("Server response:", data);

      if (data && data.violence_level) {
        const labelMap: { [key: string]: string } = {
          low: "Thấp",
          medium: "Trung bình",
          high: "Cao",
        };

        const vietnameseLabel = labelMap[data.violence_level] || "Không xác định";
        setResult(vietnameseLabel); // Hiển thị nhãn tiếng Việt
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
            outputFormat: Audio.RECORDING_OPTION_ANDROID_OUTPUT_FORMAT_DEFAULT,
            audioEncoder: Audio.RECORDING_OPTION_ANDROID_AUDIO_ENCODER_PCM_16BIT,
            sampleRate: 16000,
            numberOfChannels: 1,
            bitRate: 256000,
          },
          ios: {
            extension: '.wav',
            audioQuality: Audio.RECORDING_OPTION_IOS_AUDIO_QUALITY_HIGH,
            sampleRate: 16000,
            numberOfChannels: 1,
            linearPCMBitDepth: 16,
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
        const fileInfo = await FileSystem.readAsStringAsync(uri, {
          encoding: FileSystem.EncodingType.Base64,
        });

        // Gửi file audio cùng với token lên backend
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
          handleAnalyze(data.transcript); // Gửi văn bản và token lên backend để phân tích
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
        <BlurView intensity={50} tint="light" style={styles.glassCard}>
          <Text style={styles.title}>Phân tích bạo lực học đường</Text>
          <TouchableOpacity style={styles.buttonPrimary} onPress={() => setStarted(true)}>
            <Text style={styles.buttonPrimaryText}>Khởi động ứng dụng</Text>
          </TouchableOpacity>
        </BlurView>
      </View>
    );
  }

  // Giao diện chính
  return (
    <SafeAreaView style={styles.container}>
      <BlurView intensity={80} tint="light" style={styles.glassCard}>
        <Text style={styles.title}>Phân tích mức độ bạo lực</Text>

        <TextInput
          style={styles.input}
          placeholder="Nhập câu nói..."
          placeholderTextColor="#aaa"
          value={text}
          onChangeText={setText}
        />

        <TouchableOpacity style={styles.buttonPrimary} onPress={() => handleAnalyze(text)}>
          <Text style={styles.buttonPrimaryText}>Phân tích</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.micButton} onPress={recording ? stopRecording : startRecording}>
          <Ionicons name={recording ? "mic-off" : "mic"} size={28} color="#fff" />
        </TouchableOpacity>

        {loading && <ActivityIndicator size="large" color="#00bcd4" style={styles.activityIndicator} />}
      </BlurView>

      {result && (
        <View style={styles.resultBox}>
          <Text style={styles.resultText}>Mức độ bạo lực: {result}</Text>
        </View>
      )}

      {/* Navbar */}
      <View style={styles.bottomTabBar}>
        <Ionicons name="home" size={26} color="#00bcd4" />
        <Ionicons name="notifications" size={26} color="#00bcd4" />
        <Ionicons name="settings" size={26} color="#00bcd4" />
      </View>
    </SafeAreaView>
  );
}
