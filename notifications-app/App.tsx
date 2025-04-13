import React, { useEffect, useRef, useState } from "react";
import { Text, View, Alert, Platform } from "react-native";
import * as Notifications from "expo-notifications";
import * as Device from "expo-device";
import { initializeApp } from "firebase/app";
import { getDatabase, ref, set } from "firebase/database";
import { firebaseConfig } from "./firebaseConfig"; // Import cấu hình Firebase

const app = initializeApp(firebaseConfig);
const database = getDatabase(app);

export default function App() {
  const [expoPushToken, setExpoPushToken] = useState<string | null>(null);
  const [notification, setNotification] = useState<Notifications.Notification | null>(null);
  const notificationListener = useRef<Notifications.Subscription>();
  const responseListener = useRef<Notifications.Subscription>();

  // Gửi token lên Firebase
  const sendTokenToFirebase = (token: string) => {
    const tokenRef = ref(database, "notifications/token"); // Lưu token vào Firebase ở đường dẫn "notifications/token"
    set(tokenRef, token)
      .then(() => {
        console.log("✅ Token đã lưu lên Firebase:", token);
      })
      .catch((error) => {
        console.error("❌ Không thể lưu token lên Firebase:", error);
      });
  };

  useEffect(() => {
    registerForPushNotificationsAsync().then((token) => {
      if (token) {
        setExpoPushToken(token);
        console.log("📱 Expo Push Token:", token);
        sendTokenToFirebase(token); // Gửi token lên Firebase khi lấy được
      }
    });

    // Listener nhận thông báo khi app đang chạy
    notificationListener.current = Notifications.addNotificationReceivedListener((notification) => {
      setNotification(notification);
    });

    // Listener khi người dùng tương tác với thông báo
    responseListener.current = Notifications.addNotificationResponseReceivedListener((response) => {
      console.log("📥 Người dùng nhấn vào thông báo:", response);
    });

    return () => {
      Notifications.removeNotificationSubscription(notificationListener.current!);
      Notifications.removeNotificationSubscription(responseListener.current!);
    };
  }, []);

  return (
    <View style={{ flex: 1, justifyContent: "center", alignItems: "center", padding: 20 }}>
      <Text style={{ fontSize: 22, fontWeight: "bold", marginBottom: 20 }}>
        Ứng dụng nhận cảnh báo bạo lực học đường
      </Text>

      <Text style={{ fontSize: 16, marginBottom: 10 }}>
        Token thông báo (dùng để gửi từ backend):
      </Text>
      <Text selectable style={{ fontSize: 14, color: "#333", marginBottom: 20 }}>
        {expoPushToken ?? "Đang lấy token..."}
      </Text>

      {notification && (
        <View style={{ marginTop: 20 }}>
          <Text style={{ fontWeight: "bold" }}>📢 Thông báo nhận được:</Text>
          <Text>Tiêu đề: {notification.request.content.title}</Text>
          <Text>Nội dung: {notification.request.content.body}</Text>
        </View>
      )}
    </View>
  );
}

// ========== ĐĂNG KÝ PUSH TOKEN ==========
async function registerForPushNotificationsAsync() {
  let token;

  if (Device.isDevice) {
    console.log("📲 Đang chạy trên thiết bị thật");

    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    console.log("🔐 Quyền thông báo hiện tại:", existingStatus);

    let finalStatus = existingStatus;

    if (existingStatus !== "granted") {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
      console.log("🆕 Quyền sau khi yêu cầu:", finalStatus);
    }

    if (finalStatus !== "granted") {
      Alert.alert("Không thể nhận thông báo", "Vui lòng cấp quyền thông báo");
      return null;
    }

    token = (await Notifications.getExpoPushTokenAsync()).data;
    console.log("✅ Token nhận được:", token);
  } else {
    console.warn("⚠️ Không chạy trên thiết bị thật, không thể lấy token");
    Alert.alert("Thông báo chỉ hoạt động trên thiết bị thật");
    return null;
  }

  // Android: setup kênh thông báo
  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync("default", {
      name: "default",
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: "#FF231F7C",
    });
  }

  return token;
}
