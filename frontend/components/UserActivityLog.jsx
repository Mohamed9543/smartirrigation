// components/UserActivityLog.jsx
import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { useEffect, useState, useCallback } from "react";
import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";

const LOG_KEY = "smartirrig_activity_log";
const MAX_LOGS = 50;

export const LOG_TYPES = {
  IRRIGATION: "irrigation",
  CULTURE_ADD: "culture_add",
  CULTURE_DELETE: "culture_delete",
  LOGIN: "login",
  FERTILISATION: "fertilisation",
  WEATHER: "weather",
};

const LOG_CONFIG = {
  irrigation:     { icon: "water",           color: "#3b82f6", label: "Irrigation" },
  culture_add:    { icon: "leaf",             color: "#22c55e", label: "Culture ajoutée" },
  culture_delete: { icon: "trash",            color: "#ef4444", label: "Culture supprimée" },
  login:          { icon: "log-in",           color: "#8b5cf6", label: "Connexion" },
  fertilisation:  { icon: "flask",            color: "#f59e0b", label: "Fertilisation" },
  weather:        { icon: "partly-sunny",     color: "#06b6d4", label: "Météo" },
};

export async function addActivityLog(type, message, details = {}) {
  try {
    const existing = await AsyncStorage.getItem(LOG_KEY);
    const logs = existing ? JSON.parse(existing) : [];
    const newLog = {
      id: Date.now().toString(),
      type,
      message,
      details,
      timestamp: new Date().toISOString(),
    };
    const updated = [newLog, ...logs].slice(0, MAX_LOGS);
    await AsyncStorage.setItem(LOG_KEY, JSON.stringify(updated));
  } catch (e) {
    console.warn("Log error:", e);
  }
}

export async function getActivityLogs() {
  try {
    const raw = await AsyncStorage.getItem(LOG_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

export async function clearActivityLogs() {
  try { await AsyncStorage.removeItem(LOG_KEY); } catch {}
}

function formatTime(iso) {
  if (!iso) return "";
  try {
    const d = new Date(iso);
    const now = new Date();
    const diffMs = now - d;
    const diffMin = Math.floor(diffMs / 60000);
    const diffH = Math.floor(diffMin / 60);
    const diffD = Math.floor(diffH / 24);
    if (diffMin < 1) return "À l'instant";
    if (diffMin < 60) return `Il y a ${diffMin} min`;
    if (diffH < 24) return `Il y a ${diffH}h`;
    if (diffD === 1) return "Hier";
    return d.toLocaleDateString("fr-FR", { day: "2-digit", month: "short" });
  } catch { return ""; }
}

export default function UserActivityLog({ maxItems = 10, showClear = true }) {
  const [logs, setLogs] = useState([]);
  const [expanded, setExpanded] = useState(false);

  const load = useCallback(async () => {
    const data = await getActivityLogs();
    setLogs(data);
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleClear = async () => {
    await clearActivityLogs();
    setLogs([]);
  };

  const displayed = expanded ? logs : logs.slice(0, maxItems);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Ionicons name="time-outline" size={18} color="#6b7280" />
          <Text style={styles.title}>Historique d'activité</Text>
          {logs.length > 0 && (
            <View style={styles.badge}><Text style={styles.badgeText}>{logs.length}</Text></View>
          )}
        </View>
        <View style={styles.headerRight}>
          <TouchableOpacity onPress={load} style={styles.iconBtn}>
            <Ionicons name="refresh" size={16} color="#6b7280" />
          </TouchableOpacity>
          {showClear && logs.length > 0 && (
            <TouchableOpacity onPress={handleClear} style={styles.iconBtn}>
              <Ionicons name="trash-outline" size={16} color="#ef4444" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {logs.length === 0 ? (
        <View style={styles.empty}>
          <Ionicons name="time-outline" size={36} color="#e5e7eb" />
          <Text style={styles.emptyText}>Aucune activité enregistrée</Text>
        </View>
      ) : (
        <>
          {displayed.map((log) => {
            const cfg = LOG_CONFIG[log.type] || { icon: "ellipse", color: "#9ca3af", label: "Activité" };
            return (
              <View key={log.id} style={styles.logRow}>
                <View style={[styles.iconWrap, { backgroundColor: cfg.color + "20" }]}>
                  <Ionicons name={cfg.icon} size={16} color={cfg.color} />
                </View>
                <View style={styles.logContent}>
                  <Text style={styles.logMessage}>{log.message}</Text>
                  <Text style={styles.logTime}>{formatTime(log.timestamp)}</Text>
                </View>
              </View>
            );
          })}
          {logs.length > maxItems && (
            <TouchableOpacity style={styles.seeMore} onPress={() => setExpanded(e => !e)}>
              <Text style={styles.seeMoreText}>
                {expanded ? "Voir moins" : `Voir tout (${logs.length})`}
              </Text>
              <Ionicons name={expanded ? "chevron-up" : "chevron-down"} size={14} color="#22c55e" />
            </TouchableOpacity>
          )}
        </>
      )}
    </View>
  );
}
const styles = StyleSheet.create({
  container: { backgroundColor: "#fff", borderRadius: 16, padding: 16, borderWidth: 1, borderColor: "#edf1f0", marginBottom: 16 },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12 },
  headerLeft: { flexDirection: "row", alignItems: "center", gap: 8 },
  headerRight: { flexDirection: "row", gap: 8 },
  title: { fontSize: 15, fontWeight: "700", color: "#111827" },
  badge: { backgroundColor: "#22c55e", borderRadius: 10, paddingHorizontal: 6, paddingVertical: 2 },
  badgeText: { fontSize: 10, color: "#fff", fontWeight: "700" },
  iconBtn: { width: 28, height: 28, borderRadius: 8, backgroundColor: "#f8fafc", alignItems: "center", justifyContent: "center" },
  logRow: { flexDirection: "row", alignItems: "flex-start", gap: 10, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: "#f3f4f6" },
  iconWrap: { width: 32, height: 32, borderRadius: 10, alignItems: "center", justifyContent: "center", marginTop: 1 },
  logContent: { flex: 1 },
  logMessage: { fontSize: 13, color: "#111827", fontWeight: "500" },
  logTime: { fontSize: 11, color: "#9ca3af", marginTop: 2 },
  empty: { alignItems: "center", paddingVertical: 24, gap: 8 },
  emptyText: { fontSize: 13, color: "#9ca3af" },
  seeMore: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 4, paddingTop: 10 },
  seeMoreText: { fontSize: 13, color: "#22c55e", fontWeight: "600" },
});

