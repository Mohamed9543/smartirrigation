// app/(admin)/dashboard.jsx
import { useEffect, useMemo, useState } from "react";
import { Alert, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { AdminShell } from "@components/AdminShell";
import { API_ENDPOINTS, apiFetch } from "@api/client";
import { useLanguage } from "@context/LanguageContext";

const COLORS = {
  green: "#22c55e",
  greenDark: "#16a34a",
  greenSoft: "#e8f8ed",
  blue: "#3b82f6",
  orange: "#f59e0b",
  text: "#111827",
  muted: "#6b7280",
  border: "#edf1f0",
  surface: "#ffffff",
};

function formatNumber(value) {
  if (value == null) return "0";
  const num = Number(value);
  if (Number.isNaN(num)) return "0";
  return num.toLocaleString();
}

export default function AdminDashboard() {
  const { t, language, isRTL } = useLanguage();

  const [stats,        setStats]        = useState(null);
  const [volumeByDay,  setVolumeByDay]  = useState([]);
  const [totalKcCount, setTotalKcCount] = useState(0);
  const [loading,      setLoading]      = useState(true);

  const dynStyles = useMemo(() => ({
    statLabel:     isRTL ? { textAlign: "right" } : { textTransform: "uppercase", letterSpacing: 0.6 },
    legendRow:     { marginTop: 8, alignItems: isRTL ? "flex-start" : "flex-end" },
    panelSubtitle: { fontSize: 13, color: COLORS.muted, marginTop: 2, textAlign: isRTL ? "right" : "left" },
    panelTitle:    { fontSize: 15, fontWeight: "700", color: COLORS.text, textAlign: isRTL ? "right" : "left" },
  }), [isRTL]);

  const loadDashboard = async () => {
    setLoading(true);
    try {
      const [statsRes, volRes, kcRes] = await Promise.all([
        apiFetch(API_ENDPOINTS.admin.stats),
        apiFetch(API_ENDPOINTS.admin.volumeByDay(14)),
        apiFetch(API_ENDPOINTS.kc.search),
      ]);

      const statsJson = await statsRes.json();
      const volJson   = await volRes.json();
      const kcJson    = await kcRes.json().catch(() => ({}));

      if (statsRes.ok && statsJson.success) setStats(statsJson.data);
      if (volRes.ok   && volJson.success)   setVolumeByDay(volJson.data || []);

      if (kcRes.ok && kcJson.success && Array.isArray(kcJson.data)) {
        setTotalKcCount(kcJson.data.length);
      }
    } catch (error) {
      console.error("Dashboard load error:", error);
    } finally {
      setLoading(false);
    }
  };

  // Initialise les 27 cultures FAO-56 dans la base Kc
  const initKcBase = async () => {
    Alert.alert(
      "Initialiser la base Kc",
      "Cela va charger les 27 cultures FAO-56 dans la base. Continuer ?",
      [
        { text: "Annuler", style: "cancel" },
        {
          text: "Initialiser",
          onPress: async () => {
            try {
              const res = await apiFetch(API_ENDPOINTS.kc.init, { method: "POST" });
              const data = await res.json().catch(() => ({}));
              if (res.ok && data?.success) {
                Alert.alert("Succès", `${data.data?.length ?? 27} cultures FAO-56 chargées`);
                loadDashboard();
              } else {
                Alert.alert("Erreur", data?.error || "Initialisation échouée");
              }
            } catch (e) {
              Alert.alert("Erreur", e.message);
            }
          },
        },
      ]
    );
  };

  useEffect(() => { loadDashboard(); }, []);

  // ✅ FIX: totalCultures vient directement du backend (adminRoutes retourne déjà tout)
  // Ne pas additionner avec totalKcCount (KCReference = collection différente)
  const totalCultures    = stats?.totalCultures   ?? 0;
  const totalIrrigations = stats?.totalIrrigations ?? 0;
  const totalVolumeM3    = (stats?.totalVolume ?? 0) / 1000;
  const todayCount       = stats?.todayIrrigations ?? 0;
  const totalUsers       = stats?.totalUsers       ?? 0;

  const chartSeries = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const start = new Date(today);
    start.setDate(today.getDate() - 13);
    const map = new Map();
    volumeByDay.forEach((item) => { map.set(item._id, item.volume || 0); });
    return Array.from({ length: 14 }).map((_, i) => {
      const date = new Date(start);
      date.setDate(start.getDate() + i);
      const key = date.toISOString().slice(0, 10);
      return { label: String(date.getDate()).padStart(2, "0"), value: map.get(key) || 0 };
    });
  }, [volumeByDay]);

  const maxChartValue = Math.max(1, ...chartSeries.map((i) => i.value));

  return (
    <AdminShell activeKey="dashboard" title={t("admin.navDashboard")} onRefresh={loadDashboard} loading={loading}>

      {/* ── Cartes stats ── */}
      <View style={styles.statRow}>
        {[
          {
            label: t("admin.cardCultures"),
            value: formatNumber(totalCultures),
            bg: "#e9f7ef",
            icon: <MaterialCommunityIcons name="sprout" size={20} color={COLORS.greenDark} />,
          },
          {
            label: t("admin.cardIrrigations"),
            value: formatNumber(totalIrrigations),
            bg: "#eaf2ff",
            icon: <Ionicons name="water-outline" size={20} color={COLORS.blue} />,
          },
          {
            label: t("admin.cardVolumeTotal"),
            value: `${totalVolumeM3.toFixed(2)} m³`,
            bg: "#fff3e0",
            icon: <Ionicons name="stats-chart" size={20} color={COLORS.orange} />,
          },
        ].map((card, i) => (
          <View key={i} style={styles.statCard}>
            <View style={[styles.statCardHeader, isRTL && styles.statCardHeaderRtl]}>
              <View style={[styles.iconBadge, { backgroundColor: card.bg }]}>{card.icon}</View>
              <Text style={[styles.statLabel, dynStyles.statLabel]} numberOfLines={2}>{card.label}</Text>
            </View>
            <Text style={styles.statValue} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.85}>
              {card.value}
            </Text>
          </View>
        ))}
      </View>



      {/* ── Utilisateurs ── */}
      <View style={styles.statRow}>
        <View style={styles.statCard}>
          <View style={[styles.statCardHeader, isRTL && styles.statCardHeaderRtl]}>
            <View style={[styles.iconBadge, { backgroundColor: "#ede9fe" }]}>
              <Ionicons name="people-outline" size={20} color="#7c3aed" />
            </View>
            <Text style={[styles.statLabel, dynStyles.statLabel]} numberOfLines={2}>
              {t("admin.cardTotalUsers")}
            </Text>
          </View>
          <Text style={styles.statValue}>{formatNumber(totalUsers)}</Text>
        </View>
      </View>

      {/* ── Irrigations du jour ── */}
      <View style={styles.panel}>
        <Text style={dynStyles.panelTitle}>{t("admin.recentIrrigations")}</Text>
        <Text style={dynStyles.panelSubtitle}>{todayCount} {t("admin.irrigationsCount")}</Text>
        {todayCount === 0 ? (
          <View style={styles.emptyWrap}>
            <Text style={styles.emptyText}>{t("admin.noIrrigationsToday")}</Text>
          </View>
        ) : (
          <View style={styles.list}>
            <Text style={{ color: COLORS.muted, fontSize: 13, marginTop: 8 }}>
              {todayCount} {t("admin.irrigationsCount")} {t("common.today")}
            </Text>
          </View>
        )}
      </View>

      {/* ── Graphique volume 14 jours ── */}
      <View style={styles.panel}>
        <View style={styles.panelHeader}>
          <Text style={dynStyles.panelTitle}>{t("admin.chartVolumeTitle")}</Text>
          <Text style={dynStyles.panelSubtitle}>14 {t("admin.lastDays")} (L)</Text>
        </View>
        <View style={styles.chart}>
          {chartSeries.map((item, index) => {
            const height = 12 + (item.value / maxChartValue) * 64;
            return (
              <View key={`${item.label}-${index}`} style={styles.chartItem}>
                <View style={[styles.chartBar, { height }]} />
                {index % 3 === 0
                  ? <Text style={styles.chartLabel}>{item.label}</Text>
                  : <Text style={styles.chartLabelMuted}> </Text>}
              </View>
            );
          })}
        </View>
        <View style={dynStyles.legendRow}>
          <Text style={styles.legendText}>
            {t("admin.totalVolume")} · {(stats?.totalVolume ?? 0).toLocaleString()} L
          </Text>
        </View>
      </View>

    </AdminShell>
  );
}

const styles = StyleSheet.create({
  statRow:           { flexDirection: "row", gap: 10, marginBottom: 16 },
  initBanner:        { flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: "#fffbeb", borderWidth: 1, borderColor: "#fde68a", borderRadius: 12, padding: 12, marginBottom: 16 },
  initBannerText:    { flex: 1, fontSize: 12, color: "#92400e", fontWeight: "600" },
  statCard:          { flex: 1, minWidth: 0, backgroundColor: COLORS.surface, borderRadius: 16, padding: 12, borderWidth: 1, borderColor: COLORS.border },
  statCardHeader:    { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 12, minHeight: 42 },
  statCardHeaderRtl: { flexDirection: "row-reverse" },
  statLabel:         { flex: 1, minWidth: 0, fontSize: 11, color: COLORS.muted, fontWeight: "700", lineHeight: 14 },
  statValue:         { fontSize: 20, fontWeight: "700", color: COLORS.text, paddingLeft: 2 },
  iconBadge:         { width: 38, height: 38, borderRadius: 12, alignItems: "center", justifyContent: "center", flexShrink: 0, overflow: "hidden" },
  panel:             { backgroundColor: COLORS.surface, borderRadius: 16, padding: 16, borderWidth: 1, borderColor: COLORS.border, marginBottom: 16 },
  panelHeader:       { marginBottom: 10 },
  emptyWrap:         { height: 90, alignItems: "center", justifyContent: "center" },
  emptyText:         { fontSize: 13, color: COLORS.muted },
  list:              { marginTop: 10, gap: 12 },
  chart:             { flexDirection: "row", alignItems: "flex-end", justifyContent: "space-between", marginTop: 4 },
  chartItem:         { alignItems: "center", flex: 1 },
  chartBar:          { width: 8, borderRadius: 5, backgroundColor: COLORS.green },
  chartLabel:        { fontSize: 10, color: COLORS.muted, marginTop: 6 },
  chartLabelMuted:   { fontSize: 10, color: "transparent", marginTop: 6 },
  legendText:        { fontSize: 11, color: COLORS.muted },
});