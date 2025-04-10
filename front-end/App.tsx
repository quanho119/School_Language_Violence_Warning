import React, { useState } from "react";
import { StyleSheet, Text, TextInput, View, Button, ActivityIndicator } from "react-native";
import styles from "./styles";

export default function App() {
  const [text, setText] = useState("");
  const [result, setResult] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleAnalyze = async () => {
    if (!text.trim()) return;

    setLoading(true);
    setResult(null); // reset trước mỗi lần phân tích

    try {
      const response = await fetch("https://1b51-2405-4802-69c2-af40-d94e-115f-9a6d-82d8.ngrok-free.app/predict", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ text }), // gửi đúng format {"text": "..."}
      });

      const data = await response.json();
      console.log("Server response:", data);

      // Đảm bảo rằng server trả về object chứa 'violence_level'
      if (data && data.violence_level) {
        setResult(data.violence_level); // Match the key returned by the server
      } else {
        setResult("Không nhận được dữ liệu phù hợp");
      }
    } catch (error) {
      console.error("Lỗi fetch:", error);
      setResult("Lỗi: Không thể kết nối server");
    }

    setLoading(false);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Kiểm tra mức độ bạo lực</Text>

      <TextInput
        style={styles.input}
        placeholder="Nhập câu nói..."
        value={text}
        onChangeText={setText}
      />

      <Button title="Phân tích" onPress={handleAnalyze} />

      {loading ? (
        <ActivityIndicator size="large" color="#007bff" style={{ marginTop: 20 }} />
      ) : result !== null ? (
        <Text style={styles.result}>Kết quả: {result}</Text>
      ) : null}
    </View>
  );
}


