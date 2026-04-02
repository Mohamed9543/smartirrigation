import { useEffect, useMemo, useState } from "react";
import { Alert, StyleSheet, Text, TextInput, View } from "react-native";
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

const LOCALE_MAP = {
  fr: "fr-FR",
  en: "en-GB",
  ar: "ar-TN",
  tr: "tr-TR",
};

function formatNumber(value) {
  if (value == null) return "0";
  const num = Number(value);
  if (Number.isNaN(num)) return "0";
  return num.toLocaleString();
}

function normalizeMode(mode, t) {
  const value = String(mode || "").toLowerCase();
  if (value.includes("goutte")) return t ? t("irrigation.drip") : "goutte-à-goutte";
  if (value.includes("aspers"))  return t ? t("irrigation.sprinkler") : "aspersion";
  if (value.includes("grav"))    return t ? t("irrigation.gravity") : "gravitaire";
  return mode || "—";
}

export default function AdminIrrigations() {
  const { t, language, isRTL } = useLanguage();
  const [irrigations, setIrrigations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  // Styles dynamiques selon RTL (arabe)
  const dynStyles = useMemo(() => ({
    // textTransform:"uppercase" + letterSpacing cassent l'arabe dans React Native
    statLabel: isRTL
      ? { textAlign: "right" }
      : { textTransform: "uppercase", letterSpacing: 0.6 },
    tableHeaderText: isRTL
      ? { fontSize: 10, color: COLORS.muted, fontWeight: "700", textAlign: "right" }
      : { fontSize: 10, textTransform: "uppercase", letterSpacing: 0.6, color: COLORS.muted, fontWeight: "700" },
    tableHeader: {
      flexDirection: isRTL ? "row-reverse" : "row",
      paddingVertical: 8,
      borderBottomWidth: 1,
      borderBottomColor: COLORS.border,
    },
    tableRow: {
      flexDirection: isRTL ? "row-reverse" : "row",
      paddingVertical: 10,
      borderBottomWidth: 1,
      borderBottomColor: COLORS.border,
    },
    panelHeader: {
      gap: 10,
      marginBottom: 12,
      alignItems: isRTL ? "flex-end" : "flex-start",
    },
    panelTitle: {
      fontSize: 15,
      fontWeight: "700",
      color: COLORS.text,
      textAlign: isRTL ? "right" : "left",
    },
    panelSubtitle: {
      fontSize: 13,
      color: COLORS.muted,
      marginTop: 2,
      textAlign: isRTL ? "right" : "left",
    },
    actionsRow: {
      flexDirection: isRTL ? "row-reverse" : "row",
      alignItems: "center",
      justifyContent: "space-between",
      gap: 10,
    },
    searchBox: {
      flex: 1,
      flexDirection: isRTL ? "row-reverse" : "row",
      alignItems: "center",
      backgroundColor: "#f8fafc",
      borderRadius: 12,
      borderWidth: 1,
      borderColor: COLORS.border,
      paddingHorizontal: 10,
      height: 40,
      gap: 6,
    },
  }), [isRTL]);

  const loadIrrigations = async () => {
    setLoading(true);
    try {
      const response = await apiFetch(API_ENDPOINTS.irrigations.base);
      const data = await response.json();
      if (response.ok && data.success) {
        setIrrigations(data.data || []);
      }
    } catch (error) {
      Alert.alert(t("common.error"), error?.message || t("common.error"));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadIrrigations();
  }, []);

  const totalVolumeLiters = irrigations.reduce(
    (sum, item) => sum + (Number(item.volume) || 0),
    0,
  );
  const totalDuration = irrigations.reduce(
    (sum, item) => sum + (Number(item.duree) || 0),
    0,
  );

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return irrigations;
    return irrigations.filter((item) => {
      const text = `${item.nom || ""} ${item.mode || ""}`;
      return text.toLowerCase().includes(query);
    });
  }, [irrigations, search]);

  const modeTotals = useMemo(() => {
    const totals = { "goutte-à-goutte": 0, aspersion: 0, gravitaire: 0 };
    irrigations.forEach((item) => {
      const mode = normalizeMode(item.mode);
      if (totals[mode] != null) {
        totals[mode] += Number(item.volume) || 0;
      }
    });
    return totals;
  }, [irrigations]);

  const maxModeValue = Math.max(1, ...Object.values(modeTotals));

  // Labels traduits pour les modes
  const modeLabels = {
    "goutte-à-goutte": t("irrigation.drip"),
    aspersion:         t("irrigation.sprinkler"),
    gravitaire:        t("irrigation.gravity"),
  };

  const locale = LOCALE_MAP[language] || "fr-FR";

  return (
    <AdminShell
      activeKey="irrigations"
      title={t("admin.navIrrigations")}
      onRefresh={loadIrrigations}
      loading={loading}
    >
      {/* ── Cartes stats ── */}
      <View style={styles.statRow}>
        {[
          {
            label: t("admin.totalIrrigations"),
            value: formatNumber(irrigations.length),
            bg: COLORS.greenSoft,
            icon: <Ionicons name="water-outline" size={20} color={COLORS.blue} />,
          },
          {
            label: t("admin.totalVolume"),
            value: `${(totalVolumeLiters / 1000).toFixed(2)} m³`,
            bg: "#fff3e0",
            icon: <Ionicons name="stats-chart" size={20} color={COLORS.orange} />,
          },
          {
            label: t("admin.totalDuration"),
            value: `${formatNumber(totalDuration)} min`,
            bg: "#ede9fe",
            icon: <MaterialCommunityIcons name="timer-outline" size={20} color="#7c3aed" />,
          },
        ].map((card, i) => (
          <View key={i} style={styles.statCard}>
            <View
              style={[
                styles.statCardHeader,
                isRTL && styles.statCardHeaderRtl,
              ]}
            >
              <View style={[styles.iconBadge, { backgroundColor: card.bg }]}>
                {card.icon}
              </View>
              <Text
                style={[styles.statLabel, dynStyles.statLabel]}
                numberOfLines={2}
              >
                {card.label}
              </Text>
            </View>
            <Text
              style={styles.statValue}
              numberOfLines={1}
              adjustsFontSizeToFit
              minimumFontScale={0.85}
            >
              {card.value}
            </Text>
          </View>
        ))}
      </View>

      {/* ── Graphique par mode ── */}
      <View style={styles.panel}>
        <Text style={dynStyles.panelTitle}>{t("admin.volumeByMode")}</Text>
        <Text style={dynStyles.panelSubtitle}>{t("admin.totalVolume")}</Text>

        <View style={styles.modeChart}>
          {Object.entries(modeTotals).map(([mode, value]) => {
            const height = 16 + (value / maxModeValue) * 80;
            return (
              <View key={mode} style={styles.modeColumn}>
                <View style={[styles.modeBar, { height }]} />
                <Text style={styles.modeLabel} numberOfLines={1}>
                  {modeLabels[mode] || mode}
                </Text>
              </View>
            );
          })}
        </View>
      </View>

      {/* ── Liste irrigations ── */}
      <View style={styles.panel}>
        <View style={dynStyles.panelHeader}>
          <View>
            <Text style={dynStyles.panelTitle}>{t("admin.irrigationsList")}</Text>
            <Text style={dynStyles.panelSubtitle}>
              {filtered.length} {t("admin.results")}
            </Text>
          </View>
          <View style={dynStyles.actionsRow}>
            <View style={dynStyles.searchBox}>
              <Ionicons name="search" size={16} color={COLORS.muted} />
              <TextInput
                placeholder={t("admin.search")}
                placeholderTextColor={COLORS.muted}
                value={search}
                onChangeText={setSearch}
                style={[styles.searchInput, isRTL && { textAlign: "right" }]}
                textAlign={isRTL ? "right" : "left"}
              />
            </View>
            <View style={styles.filterChip}>
              <Text style={styles.filterText}>{t("admin.filterAllModes")}</Text>
            </View>
          </View>
        </View>

        {/* En-tête tableau */}
        <View style={dynStyles.tableHeader}>
          <Text style={[dynStyles.tableHeaderText, { flex: 2 }]}>
            {t("admin.tableCulture")}
          </Text>
          <Text style={[dynStyles.tableHeaderText, { flex: 1 }]}>
            {t("admin.tableMode")}
          </Text>
          <Text style={[dynStyles.tableHeaderText, { flex: 1 }]}>
            {t("admin.tableVolume")}
          </Text>
          <Text style={[dynStyles.tableHeaderText, { flex: 1 }]}>
            {t("admin.tableDuration")}
          </Text>
        </View>

        {filtered.length === 0 ? (
          <View style={styles.emptyWrap}>
            <Text style={styles.emptyText}>{t("admin.emptyIrrigations")}</Text>
          </View>
        ) : (
          filtered.map((item) => (
            <View key={item._id} style={dynStyles.tableRow}>
              <View style={{ flex: 2 }}>
                <Text style={styles.rowTitle}>{item.nom}</Text>
                <Text style={styles.rowSub}>
                  {item.date
                    ? new Date(item.date).toLocaleDateString(locale)
                    : ""}
                </Text>
              </View>
              <Text style={[styles.rowText, { flex: 1, textAlign: isRTL ? "right" : "left" }]}>
                {normalizeMode(item.mode, t)}
              </Text>
              <Text style={[styles.rowText, { flex: 1, textAlign: isRTL ? "right" : "left" }]}>
                {Math.round(Number(item.volume) || 0)} L
              </Text>
              <Text style={[styles.rowText, { flex: 1, textAlign: isRTL ? "right" : "left" }]}>
                {Math.round(Number(item.duree) || 0)} min
              </Text>
            </View>
          ))
        )}
      </View>
    </AdminShell>
  );
}

const styles = StyleSheet.create({
  statRow: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 16,
  },
  statCard: {
    flex: 1,
    minWidth: 0,
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    padding: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  statCardHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 12,
    minHeight: 42,
  },
  statCardHeaderRtl: {
    flexDirection: "row-reverse",
  },
  statLabel: {
    flex: 1,
    minWidth: 0,
    fontSize: 11,
    color: COLORS.muted,
    fontWeight: "700",
    lineHeight: 14,
  },
  statValue: {
    fontSize: 20,
    fontWeight: "700",
    color: COLORS.text,
    paddingLeft: 2,
  },
  iconBadge: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORS.greenSoft,
    flexShrink: 0,
    overflow: "hidden",
  },
  panel: {
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: 16,
  },
  modeChart: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 12,
    marginTop: 12,
    paddingBottom: 4,
  },
  modeColumn: {
    flex: 1,
    alignItems: "center",
  },
  modeBar: {
    width: 24,
    borderRadius: 7,
    backgroundColor: COLORS.green,
  },
  modeLabel: {
    fontSize: 11,
    color: COLORS.muted,
    marginTop: 8,
    textAlign: "center",
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    color: COLORS.text,
  },
  filterChip: {
    paddingHorizontal: 12,
    height: 38,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: "center",
    justifyContent: "center",
  },
  filterText: {
    fontSize: 12,
    color: COLORS.muted,
    fontWeight: "600",
  },
  rowTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: COLORS.text,
  },
  rowSub: {
    fontSize: 11,
    color: COLORS.muted,
    marginTop: 2,
  },
  rowText: {
    fontSize: 12,
    color: COLORS.text,
  },
  emptyWrap: {
    alignItems: "center",
    paddingVertical: 24,
  },
  emptyText: {
    fontSize: 13,
    color: COLORS.muted,
  },
});
