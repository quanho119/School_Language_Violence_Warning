import React, { useEffect, useRef, useState } from "react";
import { Text, View, Alert, Platform, Vibration, SafeAreaView, ScrollView } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as Notifications from "expo-notifications";
import * as Device from "expo-device";
import { initializeApp } from "firebase/app";
import { getDatabase, ref, set, onValue } from "firebase/database";
import { firebaseConfig } from "./firebaseConfig";
import styles from "./styles";

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

const app = initializeApp(firebaseConfig);
const database = getDatabase(app);

export default function App() {
  const [expoPushToken, setExpoPushToken] = useState<string | null>(null);
  const [notification, setNotification] = useState<Notifications.Notification | null>(null);
  const [violentMessages, setViolentMessages] = useState<string[]>([]); // State lưu lịch sử câu nói
  const notificationListener = useRef<Notifications.Subscription>();
  const responseListener = useRef<Notifications.Subscription>();

  // Hàm lưu token vào Firebase
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

  // Hàm lưu câu nói bạo lực vào Firebase
  const saveViolentMessageToFirebase = (message: string) => {
    const cleanedMessage = message.replace(/^Nội dung nguy hiểm được phát hiện:\s*/, "");
    const timestamp = new Date().toISOString().replace(/\./g, "-").replace(/:/g, "-").replace(/Z/g, "");
    const messageRef = ref(database, `violent_messages/${timestamp}`);

    set(messageRef, {
      message: cleanedMessage,
      timestamp: new Date().toISOString(),
    })
      .then(() => {
        console.log("✅ Câu nói bạo lực đã được lưu vào Firebase:", cleanedMessage);
      })
      .catch((error) => {
        console.error("❌ Không thể lưu câu nói bạo lực vào Firebase:", error);
      });
  };

  const fetchViolentMessagesFromFirebase = async (setMessages: React.Dispatch<React.SetStateAction<string[]>>) => {
    const messagesRef = ref(database, "violent_messages");

    onValue(messagesRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.val();
        const messages = Object.values(data).map((item: any) => item.message);
        setMessages(messages);
      } else {
        setMessages([]);
      }
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

      if (notification.request.content.body) {
        saveViolentMessageToFirebase(notification.request.content.body);
      }
    });

    responseListener.current = Notifications.addNotificationResponseReceivedListener((response) => {
      console.log("📥 Người dùng nhấn vào thông báo:", response);
    });

    fetchViolentMessagesFromFirebase(setViolentMessages);

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

      {/* Lịch sử các câu nói bạo lực */}
      <ScrollView style={styles.historyContainer} showsVerticalScrollIndicator={false}>
        <Text style={styles.historyTitle}>📜 Lịch sử các câu nói bạo lực:</Text>
        {violentMessages.length > 0 ? (
          violentMessages.map((msg, index) => (
            <View key={index} style={styles.historyItem}>
              <Text style={styles.historyText}>
                {index + 1}. {msg}
              </Text>
            </View>
          ))
        ) : (
          <Text style={styles.noHistory}>Không có dữ liệu lịch sử.</Text>
        )}
      </ScrollView>

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

  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync("default", {
      name: "default",
      importance: Notifications.AndroidImportance.HIGH,
      sound: "default",
      vibrationPattern: [0, 250, 250, 250],
      lightColor: "#FF231F7C",
    });
  }

  return token;
}
