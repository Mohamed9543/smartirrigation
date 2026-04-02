import React from "react";
import { View, Text, StyleSheet, ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { BrandHeader } from "@components/BrandHeader";
import { useLanguage } from "@context/LanguageContext";
import UserActivityLog from "@components/UserActivityLog";

export default function IrrigationHistoryPage() {
  const { t } = useLanguage();

  return (
    <SafeAreaView style={styles.container}>
      <BrandHeader title={t("history.title") || "Historique"} />
      <ScrollView contentContainerStyle={{ paddingBottom: 80, padding: 16 }}>
        {/* Log d'activité utilisateur */}
        <UserActivityLog maxItems={15} showClear={true} />

        {/* Section historique irrigation (placeholder) */}
        <View style={styles.historyContainer}>
          <View style={styles.iconWrap}>
            <Ionicons name="water" size={36} color="#4CAF50" />
          </View>
          <Text style={styles.sectionTitle}>Historique d'irrigation</Text>
          <Text style={styles.emptyHistoryText}>
            {t("history.empty") || "Les irrigations enregistrées apparaîtront ici."}
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f5f5f5" },
  historyContainer: {
    backgroundColor: "#fff", padding: 24, borderRadius: 16,
    alignItems: "center", borderWidth: 1, borderColor: "#edf1f0",
  },
  iconWrap: { marginBottom: 12 },
  sectionTitle: { fontSize: 16, fontWeight: "700", color: "#111827", marginBottom: 8 },
  emptyHistoryText: { fontSize: 14, color: "#666", textAlign: "center" },
});

