import React, { useEffect, useRef, useState } from "react";
import { Text, View, Alert, Platform, Vibration, TouchableOpacity, SafeAreaView } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as Notifications from "expo-notifications";
import * as Device from "expo-device";
import { initializeApp } from "firebase/app";
import { getDatabase, ref, set } from "firebase/database";
import { firebaseConfig } from "./firebaseConfig";
import styles from "./styles";

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false
  })
});

const app = initializeApp(firebaseConfig);
const database = getDatabase(app);

export default function App() {
  const [expoPushToken, setExpoPushToken] = useState<string | null>(null);
  const [notification, setNotification] = useState<Notifications.Notification | null>(null);
  const notificationListener = useRef<Notifications.Subscription>();
  const responseListener = useRef<Notifications.Subscription>();

  // Gửi token lên Firebase
  const sendTokenToFirebase = (token: string) => {
    const tokenRef = ref(database, "notifications/token");
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
        sendTokenToFirebase(token);
      }
    });

    notificationListener.current = Notifications.addNotificationReceivedListener((notification) => {
      setNotification(notification);
      Vibration.vibrate();
      console.log("🔔 Nhận thông báo:", notification);
    });

    responseListener.current = Notifications.addNotificationResponseReceivedListener((response) => {
      console.log("📥 Người dùng nhấn vào thông báo:", response);
    });

    return () => {
      Notifications.removeNotificationSubscription(notificationListener.current!);
      Notifications.removeNotificationSubscription(responseListener.current!);
    };
  }, []);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.glassCard}>
        <Text style={styles.title}>📢 Cảnh báo học đường</Text>

        {notification ? (
          <View style={styles.notificationBox}>
            <Text style={styles.notificationLabel}>Thông báo mới:</Text>
            <Text style={styles.notificationText}>📌 {notification.request.content.title}</Text>
            <Text style={styles.notificationText}>📝 {notification.request.content.body}</Text>
          </View>
        ) : (
          <Text style={styles.noNotification}>Không có thông báo nào được nhận.</Text>
        )}
      </View>

      {/* Tab Bar */}
      <View style={styles.bottomTabBar}>
        <Ionicons name="home-outline" size={26} color="#00bcd4" />
        <Ionicons name="notifications-outline" size={26} color="#00bcd4" />
        <Ionicons name="person-outline" size={26} color="#00bcd4" />
      </View>
    </SafeAreaView>
  );
}

// ========== ĐĂNG KÝ PUSH TOKEN ==========
async function registerForPushNotificationsAsync() {
  let token;

  if (Device.isDevice) {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;
    if (existingStatus !== "granted") {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
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
      sound: "default", // Đảm bảo âm thanh được bật
      vibrationPattern: [0, 250, 250, 250],
      lightColor: "#FF231F7C",
    });
  }

  return token;
}
