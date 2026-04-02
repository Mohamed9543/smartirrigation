import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";
import { Ionicons } from "@expo/vector-icons";
import { BrandHeader } from "@components/BrandHeader";
import { API_ENDPOINTS, apiFetch } from "@api/client";
import { authAPI } from "@api/auth";
import { useLanguage } from "@context/LanguageContext";

const COLORS = {
  green: "#22c55e",
  greenDark: "#16a34a",
  greenSoft: "#e8f8ed",
  blue: "#3b82f6",
  text: "#0f172a",
  muted: "#64748b",
  border: "#e2e8f0",
  surface: "#ffffff",
  bg: "#F4F6F8",
};

const SPRING = { damping: 16, stiffness: 220, mass: 0.8 };

export default function ContactAdmin() {
  const { t, isRTL } = useLanguage();
  const [profile, setProfile] = useState({ name: "", email: "" });
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);
  const [loadingProfile, setLoadingProfile] = useState(true);

  const iconScale = useSharedValue(1);
  const iconRotate = useSharedValue(0);

  const iconStyle = useAnimatedStyle(() => ({
    transform: [
      { rotate: `${iconRotate.value}deg` },
      { scale: iconScale.value },
    ],
  }));

  const animateSend = () => {
    iconRotate.value = withSpring(-10, SPRING, () => {
      iconRotate.value = withSpring(0, SPRING);
    });
    iconScale.value = withSpring(1.12, SPRING, () => {
      iconScale.value = withSpring(1, SPRING);
    });
  };

  const loadProfile = async () => {
    try {
      const user = await authAPI.getUser();
      const name = `${user?.firstName || ""} ${user?.lastName || ""}`.trim();
      setProfile({
        name: name || user?.email || "",
        email: user?.email || "",
      });
    } finally {
      setLoadingProfile(false);
    }
  };

  useEffect(() => {
    loadProfile();
    // petite animation d'entrée
    iconScale.value = withSpring(1.08, SPRING, () => {
      iconScale.value = withSpring(1, SPRING);
    });
  }, []);

  const canSend = useMemo(() => {
    return body.trim().length >= 5 && !sending;
  }, [body, sending]);

  const onSend = async () => {
    const trimmedBody = body.trim();
    const trimmedSubject = subject.trim();
    if (trimmedBody.length < 5) {
      Alert.alert(t("common.error"), t("messages.tooShort"));
      return;
    }

    setSending(true);
    animateSend();
    try {
      const res = await apiFetch(API_ENDPOINTS.messages.create, {
        method: "POST",
        body: JSON.stringify({
          subject: trimmedSubject,
          body: trimmedBody,
        }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json?.success) {
        throw new Error(json?.message || json?.error || "Erreur envoi.");
      }

      setSubject("");
      setBody("");
      Alert.alert(t("messages.sentTitle"), t("messages.sentBody"));
    } catch (e) {
      Alert.alert(t("common.error"), e.message || "Erreur envoi.");
    } finally {
      setSending(false);
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: COLORS.bg }}>
      <BrandHeader
        title={t("messages.contactTitle")}
        showMenu
        right={
          <Animated.View style={iconStyle}>
            <View style={styles.iconPill}>
              <Ionicons name="mail-outline" size={18} color={COLORS.greenDark} />
            </View>
          </Animated.View>
        }
      />

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.container}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.card}>
            <Text style={[styles.cardTitle, isRTL && { textAlign: "right" }]}>
              {t("messages.writeToAdmin")}
            </Text>
            <Text style={[styles.cardSubtitle, isRTL && { textAlign: "right" }]}>
              {t("messages.subtitle")}
            </Text>

            <View style={styles.metaRow}>
              <Ionicons name="person-circle-outline" size={18} color={COLORS.muted} />
              {loadingProfile ? (
                <ActivityIndicator size="small" color={COLORS.muted} />
              ) : (
                <Text style={styles.metaText} numberOfLines={1}>
                  {profile.name || t("messages.unknownUser")}
                  {profile.email ? `  •  ${profile.email}` : ""}
                </Text>
              )}
            </View>

            <Text style={[styles.label, isRTL && { textAlign: "right" }]}>
              {t("messages.subject")}
            </Text>
            <TextInput
              value={subject}
              onChangeText={setSubject}
              placeholder={t("messages.subjectPlaceholder")}
              placeholderTextColor="#94a3b8"
              style={[styles.input, isRTL && { textAlign: "right" }]}
              maxLength={140}
            />

            <Text style={[styles.label, isRTL && { textAlign: "right" }]}>
              {t("messages.message")}
            </Text>
            <TextInput
              value={body}
              onChangeText={setBody}
              placeholder={t("messages.messagePlaceholder")}
              placeholderTextColor="#94a3b8"
              style={[
                styles.input,
                styles.textArea,
                isRTL && { textAlign: "right" },
              ]}
              multiline
              textAlignVertical="top"
              maxLength={5000}
            />

            <TouchableOpacity
              onPress={onSend}
              disabled={!canSend}
              activeOpacity={0.9}
              style={[
                styles.sendButton,
                !canSend && { opacity: 0.55 },
                isRTL && { flexDirection: "row-reverse" },
              ]}
            >
              {sending ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Ionicons name="send" size={18} color="#fff" />
              )}
              <Text style={styles.sendText}>
                {sending ? t("messages.sending") : t("messages.send")}
              </Text>
            </TouchableOpacity>

            <View style={styles.hintRow}>
              <Ionicons name="shield-checkmark-outline" size={16} color={COLORS.muted} />
              <Text style={styles.hintText}>{t("messages.hint")}</Text>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
    paddingBottom: 28,
  },
  iconPill: {
    height: 34,
    paddingHorizontal: 10,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORS.greenSoft,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 6 },
    elevation: 2,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: COLORS.text,
  },
  cardSubtitle: {
    marginTop: 4,
    fontSize: 13,
    color: COLORS.muted,
    lineHeight: 18,
  },
  metaRow: {
    marginTop: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 14,
    backgroundColor: "#f8fafc",
    borderWidth: 1,
    borderColor: "#eef2f7",
  },
  metaText: {
    flex: 1,
    minWidth: 0,
    color: COLORS.text,
    fontSize: 13,
  },
  label: {
    marginTop: 14,
    marginBottom: 6,
    color: COLORS.text,
    fontWeight: "700",
    fontSize: 13,
  },
  input: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    backgroundColor: "#fff",
    color: COLORS.text,
  },
  textArea: {
    minHeight: 130,
    paddingTop: 12,
  },
  sendButton: {
    marginTop: 16,
    height: 48,
    borderRadius: 14,
    backgroundColor: COLORS.greenDark,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 10,
    shadowColor: COLORS.greenDark,
    shadowOpacity: 0.22,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 6 },
    elevation: 2,
  },
  sendText: {
    color: "#fff",
    fontWeight: "800",
    fontSize: 14,
    letterSpacing: 0.2,
  },
  hintRow: {
    marginTop: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  hintText: {
    flex: 1,
    minWidth: 0,
    color: COLORS.muted,
    fontSize: 12,
    lineHeight: 16,
  },
});

