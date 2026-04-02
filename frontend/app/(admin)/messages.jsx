import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { AdminShell } from "@components/AdminShell";
import { API_ENDPOINTS, apiFetch } from "@api/client";
import { useLanguage } from "@context/LanguageContext";

const COLORS = {
  green: "#22c55e",
  greenDark: "#16a34a",
  blue: "#3b82f6",
  text: "#0f172a",
  muted: "#64748b",
  border: "#e2e8f0",
  surface: "#ffffff",
  chip: "#f1f5f9",
  danger: "#ef4444",
  bg: "#F4F6F8",
};

const LOCALE_MAP = {
  fr: "fr-FR",
  en: "en-GB",
  ar: "ar-TN",
  tr: "tr-TR",
};

function formatDateTime(value, language) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const locale = LOCALE_MAP[language] || "fr-FR";
  try {
    return date.toLocaleString(locale, {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return date.toString();
  }
}

export default function AdminMessages() {
  const { t, language, isRTL } = useLanguage();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [unreadOnly, setUnreadOnly] = useState(false);
  const [items, setItems] = useState([]);

  const [selected, setSelected] = useState(null);
  const [detailVisible, setDetailVisible] = useState(false);
  const [markingRead, setMarkingRead] = useState(false);

  const loadMessages = async ({ showSpinner } = { showSpinner: true }) => {
    if (showSpinner) setLoading(true);
    try {
      const url = API_ENDPOINTS.admin.messagesList({
        limit: 50,
        skip: 0,
        unreadOnly,
      });
      const res = await apiFetch(url);
      const json = await res.json().catch(() => ({}));
      if (res.ok && json?.success) {
        setItems(json.data || []);
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadMessages({ showSpinner: true });
  }, [unreadOnly]);

  const openMessage = async (message) => {
    setSelected(message);
    setDetailVisible(true);

    if (message?.readAt) return;

    setMarkingRead(true);
    try {
      const res = await apiFetch(API_ENDPOINTS.admin.messageMarkRead(message._id), {
        method: "PATCH",
      });
      const json = await res.json().catch(() => ({}));
      if (res.ok && json?.success) {
        setItems((prev) =>
          prev.map((item) =>
            item._id === message._id
              ? { ...item, readAt: json?.data?.readAt || new Date().toISOString() }
              : item,
          ),
        );
        setSelected((prev) =>
          prev && prev._id === message._id
            ? { ...prev, readAt: json?.data?.readAt || new Date().toISOString() }
            : prev,
        );
      }
    } catch {
      // no-op
    } finally {
      setMarkingRead(false);
    }
  };

  const headerSubtitle = useMemo(() => {
    if (unreadOnly) return t("admin.messagesUnreadSubtitle");
    return t("admin.messagesAllSubtitle");
  }, [t, unreadOnly]);

  return (
    <AdminShell
      activeKey="messages"
      title={t("admin.messagesTitle")}
      subtitle={headerSubtitle}
      loading={loading}
      onRefresh={() => {
        setRefreshing(true);
        loadMessages({ showSpinner: false });
      }}
    >
      <View style={styles.segmentWrap}>
        <TouchableOpacity
          activeOpacity={0.9}
          onPress={() => setUnreadOnly(false)}
          style={[
            styles.segment,
            !unreadOnly && styles.segmentActive,
            isRTL && { flexDirection: "row-reverse" },
          ]}
        >
          <Ionicons
            name="mail-open-outline"
            size={16}
            color={!unreadOnly ? "#fff" : COLORS.muted}
          />
          <Text style={[styles.segmentText, !unreadOnly && styles.segmentTextActive]}>
            {t("admin.messagesAll")}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          activeOpacity={0.9}
          onPress={() => setUnreadOnly(true)}
          style={[
            styles.segment,
            unreadOnly && styles.segmentActive,
            isRTL && { flexDirection: "row-reverse" },
          ]}
        >
          <MaterialCommunityIcons
            name="email-alert-outline"
            size={16}
            color={unreadOnly ? "#fff" : COLORS.muted}
          />
          <Text style={[styles.segmentText, unreadOnly && styles.segmentTextActive]}>
            {t("admin.messagesUnread")}
          </Text>
        </TouchableOpacity>
      </View>

      {refreshing ? (
        <View style={styles.refreshRow}>
          <ActivityIndicator size="small" color={COLORS.muted} />
          <Text style={styles.refreshText}>{t("common.loading")}</Text>
        </View>
      ) : null}

      {items.length === 0 && !loading ? (
        <View style={styles.emptyWrap}>
          <MaterialCommunityIcons name="email-outline" size={38} color={COLORS.muted} />
          <Text style={[styles.emptyTitle, isRTL && { textAlign: "right" }]}>
            {t("admin.messagesEmptyTitle")}
          </Text>
          <Text style={[styles.emptySub, isRTL && { textAlign: "right" }]}>
            {t("admin.messagesEmptySubtitle")}
          </Text>
        </View>
      ) : null}

      {items.map((m) => {
        const unread = !m.readAt;
        return (
          <TouchableOpacity
            key={m._id}
            activeOpacity={0.9}
            onPress={() => openMessage(m)}
            style={[styles.card, unread && styles.cardUnread]}
          >
            <View style={styles.rowTop}>
              <View style={styles.sender}>
                <View style={[styles.dot, unread ? styles.dotUnread : styles.dotRead]} />
                <Text style={styles.senderName} numberOfLines={1}>
                  {m.senderName || m.senderEmail || t("messages.unknownUser")}
                </Text>
              </View>
              <Text style={styles.time} numberOfLines={1}>
                {formatDateTime(m.createdAt, language)}
              </Text>
            </View>
            {m.subject ? (
              <Text style={styles.subject} numberOfLines={1}>
                {m.subject}
              </Text>
            ) : null}
            <Text style={styles.preview} numberOfLines={2}>
              {m.body}
            </Text>
          </TouchableOpacity>
        );
      })}

      <Modal
        visible={detailVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setDetailVisible(false)}
      >
        <Pressable style={styles.modalBackdrop} onPress={() => setDetailVisible(false)} />
        <View style={styles.modalWrap}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{t("admin.messageDetails")}</Text>
              <TouchableOpacity
                onPress={() => setDetailVisible(false)}
                style={styles.modalClose}
                activeOpacity={0.85}
              >
                <Ionicons name="close" size={20} color={COLORS.muted} />
              </TouchableOpacity>
            </View>

            <View style={styles.metaLine}>
              <Text style={styles.metaLabel}>{t("admin.messageFrom")}</Text>
              <Text style={styles.metaValue} numberOfLines={1}>
                {selected?.senderName || t("messages.unknownUser")}
              </Text>
            </View>
            {selected?.senderEmail ? (
              <View style={styles.metaLine}>
                <Text style={styles.metaLabel}>{t("admin.messageEmail")}</Text>
                <Text style={styles.metaValue} numberOfLines={1}>
                  {selected.senderEmail}
                </Text>
              </View>
            ) : null}
            <View style={styles.metaLine}>
              <Text style={styles.metaLabel}>{t("admin.messageWhen")}</Text>
              <Text style={styles.metaValue} numberOfLines={1}>
                {formatDateTime(selected?.createdAt, language)}
              </Text>
            </View>

            {selected?.subject ? (
              <View style={styles.subjectBox}>
                <Text style={styles.subjectLabel}>{t("admin.messageSubject")}</Text>
                <Text style={styles.subjectValue}>{selected.subject}</Text>
              </View>
            ) : null}

            <View style={styles.bodyBox}>
              <Text style={styles.bodyLabel}>{t("admin.messageBody")}</Text>
              <Text style={styles.bodyValue}>{selected?.body || ""}</Text>
            </View>

            {markingRead ? (
              <View style={styles.readRow}>
                <ActivityIndicator size="small" color={COLORS.muted} />
                <Text style={styles.readText}>{t("admin.markingRead")}</Text>
              </View>
            ) : null}
          </View>
        </View>
      </Modal>
    </AdminShell>
  );
}

const styles = StyleSheet.create({
  segmentWrap: {
    flexDirection: "row",
    gap: 10,
    paddingHorizontal: 16,
    paddingTop: 2,
    paddingBottom: 14,
  },
  segment: {
    flex: 1,
    height: 42,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.surface,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 8,
  },
  segmentActive: {
    backgroundColor: COLORS.greenDark,
    borderColor: COLORS.greenDark,
  },
  segmentText: {
    fontWeight: "800",
    fontSize: 13,
    color: COLORS.muted,
  },
  segmentTextActive: {
    color: "#fff",
  },
  refreshRow: {
    paddingHorizontal: 16,
    paddingBottom: 8,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  refreshText: {
    color: COLORS.muted,
    fontSize: 12,
  },
  emptyWrap: {
    paddingHorizontal: 16,
    paddingVertical: 32,
    alignItems: "center",
    gap: 6,
  },
  emptyTitle: {
    marginTop: 6,
    fontWeight: "800",
    fontSize: 16,
    color: COLORS.text,
    textAlign: "center",
  },
  emptySub: {
    fontSize: 13,
    color: COLORS.muted,
    textAlign: "center",
    lineHeight: 18,
  },
  card: {
    marginHorizontal: 16,
    marginBottom: 12,
    padding: 14,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 18,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 6 },
    elevation: 2,
  },
  cardUnread: {
    borderColor: "#c7f9d3",
    backgroundColor: "#f0fdf4",
  },
  rowTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
  },
  sender: {
    flex: 1,
    minWidth: 0,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 999,
  },
  dotUnread: {
    backgroundColor: COLORS.green,
  },
  dotRead: {
    backgroundColor: "#cbd5e1",
  },
  senderName: {
    flex: 1,
    minWidth: 0,
    fontWeight: "800",
    color: COLORS.text,
    fontSize: 14,
  },
  time: {
    color: COLORS.muted,
    fontSize: 11,
    flexShrink: 0,
  },
  subject: {
    marginTop: 8,
    fontWeight: "800",
    color: COLORS.text,
    fontSize: 13,
  },
  preview: {
    marginTop: 6,
    color: COLORS.muted,
    fontSize: 12,
    lineHeight: 16,
  },
  modalBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.35)",
  },
  modalWrap: {
    flex: 1,
    justifyContent: "center",
    padding: 18,
  },
  modalCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: "900",
    color: COLORS.text,
  },
  modalClose: {
    width: 36,
    height: 36,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORS.chip,
  },
  metaLine: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
    paddingVertical: 6,
  },
  metaLabel: {
    color: COLORS.muted,
    fontSize: 12,
    fontWeight: "700",
    flexShrink: 0,
  },
  metaValue: {
    flex: 1,
    minWidth: 0,
    color: COLORS.text,
    fontSize: 12,
    fontWeight: "700",
    textAlign: "right",
  },
  subjectBox: {
    marginTop: 8,
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: "#f8fafc",
  },
  subjectLabel: {
    color: COLORS.muted,
    fontSize: 12,
    fontWeight: "800",
    marginBottom: 4,
  },
  subjectValue: {
    color: COLORS.text,
    fontSize: 13,
    fontWeight: "800",
  },
  bodyBox: {
    marginTop: 10,
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: "#fff",
  },
  bodyLabel: {
    color: COLORS.muted,
    fontSize: 12,
    fontWeight: "800",
    marginBottom: 6,
  },
  bodyValue: {
    color: COLORS.text,
    fontSize: 13,
    lineHeight: 18,
  },
  readRow: {
    marginTop: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  readText: {
    color: COLORS.muted,
    fontSize: 12,
  },
});

