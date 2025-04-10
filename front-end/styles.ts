// styles.ts
import { StyleSheet } from "react-native";

const styles = StyleSheet.create({
    container: {
      flex: 1,
      paddingTop: 100,
      paddingHorizontal: 20,
      backgroundColor: "#fff",
    },
    title: {
      fontSize: 24,
      fontWeight: "600",
      marginBottom: 30,
      textAlign: "center",
    },
    input: {
      height: 50,
      borderColor: "#ccc",
      borderWidth: 1,
      paddingHorizontal: 10,
      borderRadius: 8,
      marginBottom: 20,
    },
    result: {
      marginTop: 20,
      fontSize: 18,
      fontWeight: "500",
      textAlign: "center",
      color: "#333",
    },
  });

export default styles;
