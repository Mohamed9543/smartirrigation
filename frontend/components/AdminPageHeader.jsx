// components/AdminPageHeader.jsx
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useLanguage } from "@context/LanguageContext";

const C = {
  green: "#22c55e",
  greenDark: "#16a34a",
  greenSoft: "#e8f8ed",
  text: "#111827",
  muted: "#6b7280",
  border: "#edf1f0",
  surface: "#ffffff",
  bg: "#f7f9f8",
};

/**
 * Header standardisé pour toutes les pages admin.
 *
 * Props :
 *  - title       : string  — titre de la page (ex: t("admin.navDashboard"))
 *  - subtitle    : string  — sous-titre optionnel (ex: date du jour)
 *  - onRefresh   : func    — callback bouton refresh (optionnel)
 *  - rightAction : node    — bouton / badge custom à droite (optionnel)
 */
export function AdminPageHeader({ title, subtitle, onRefresh, rightAction }) {
  const { isRTL } = useLanguage();

  return (
    <View style={[styles.container, isRTL && styles.containerRTL]}>
      {/* Icône gauche (logo / identité) */}
      <View style={styles.logoWrap}>
        <Ionicons name="leaf" size={22} color={C.greenDark} />
      </View>

      {/* Textes */}
      <View style={[styles.textBlock, isRTL && styles.textBlockRTL]}>
        <Text
          style={[styles.title, isRTL && styles.titleRTL]}
          numberOfLines={1}
        >
          {title}
        </Text>
        {!!subtitle && (
          <Text
            style={[styles.subtitle, isRTL && styles.subtitleRTL]}
            numberOfLines={1}
          >
            {subtitle}
          </Text>
        )}
      </View>

      {/* Actions droite */}
      <View style={[styles.actions, isRTL && styles.actionsRTL]}>
        {rightAction ?? null}
        {!!onRefresh && (
          <TouchableOpacity
            style={styles.refreshBtn}
            onPress={onRefresh}
            activeOpacity={0.75}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Ionicons name="refresh-outline" size={20} color={C.greenDark} />
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}
const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: C.surface,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
    gap: 10,
  },
  containerRTL: {
    flexDirection: "row-reverse",
  },
  logoWrap: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: C.greenSoft,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  textBlock: {
    flex: 1,
  },
  textBlockRTL: {
    alignItems: "flex-end",
  },
  title: {
    fontSize: 16,
    fontWeight: "700",
    color: C.text,
  },
  titleRTL: {
    textAlign: "right",
  },
  subtitle: {
    fontSize: 12,
    color: C.muted,
    marginTop: 1,
  },
  subtitleRTL: {
    textAlign: "right",
  },
  actions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flexShrink: 0,
  },
  actionsRTL: {
    flexDirection: "row-reverse",
  },
  refreshBtn: {
    width: 36,
    height: 36,
    borderRadius: 11,
    backgroundColor: C.greenSoft,
    alignItems: "center",
    justifyContent: "center",
  },
});
