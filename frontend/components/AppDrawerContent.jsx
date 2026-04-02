// components/AppDrawerContent.jsx
import {
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  Modal,
  ActivityIndicator,
  StyleSheet,
} from "react-native";
import { useState, useEffect } from "react";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { LANGUAGE_OPTIONS } from "@context/LanguageContext";
import AsyncStorage from "@react-native-async-storage/async-storage";

function getInitials(value) {
  const parts = String(value || "").trim().split(" ").filter(Boolean);
  if (parts.length === 0) return "U";
  return parts.slice(0, 2).map((p) => p[0]?.toUpperCase()).join("");
}

export function AppDrawerContent({
  profile,
  currentLanguage,
  language,
  onSelectLanguage,
  onSignOut,
  onUpdateProfile,
  t,
}) {
  const [languageDropdownOpen, setLanguageDropdownOpen] = useState(false);
  const [editModalVisible,     setEditModalVisible]     = useState(false);
  const [firstName, setFirstName] = useState("");
  const [lastName,  setLastName]  = useState("");
  const [displayName, setDisplayName] = useState("");
  const [saving,  setSaving]  = useState(false);
  const [error,   setError]   = useState("");
  const [success, setSuccess] = useState(false);

  // ── Au montage : charger depuis AsyncStorage en priorité ─────────────────
  useEffect(() => {
    const loadSaved = async () => {
      try {
        const saved = await AsyncStorage.getItem("userDisplayName");
        if (saved) {
          setDisplayName(saved);
        } else if (profile.name) {
          setDisplayName(profile.name);
        }
      } catch {
        if (profile.name) setDisplayName(profile.name);
      }
    };
    loadSaved();
  }, []);

  // ── Si le profil parent change ET qu'on n'a rien en local, on sync ────────
  useEffect(() => {
    if (!profile.name) return;
    AsyncStorage.getItem("userDisplayName").then((saved) => {
      if (!saved) setDisplayName(profile.name);
    }).catch(() => {});
  }, [profile.name]);

  // ── Ouvrir le modal d'édition ─────────────────────────────────────────────
  const openEdit = () => {
    const parts = String(displayName || profile.name || "").trim().split(" ");
    setFirstName(parts[0] || "");
    setLastName(parts.slice(1).join(" ") || "");
    setError("");
    setSuccess(false);
    setEditModalVisible(true);
  };

  // ── Enregistrer le profil ─────────────────────────────────────────────────
  const handleSave = async () => {
    if (!firstName.trim()) {
      setError(t("drawer.firstNameRequired"));
      return;
    }
    setSaving(true);
    setError("");
    try {
      // 1. Appel API via le parent
      await onUpdateProfile?.(firstName.trim(), lastName.trim());

      // 2. Construire le nouveau nom complet
      const newFullName = `${firstName.trim()} ${lastName.trim()}`.trim();

      // 3. Persister dans AsyncStorage (survit au ctrl+R)
      await AsyncStorage.setItem("userDisplayName", newFullName);

      // 4. Mettre à jour l'affichage local immédiatement
      setDisplayName(newFullName);

      setSuccess(true);
      setTimeout(() => {
        setEditModalVisible(false);
        setSuccess(false);
      }, 900);
    } catch (e) {
      setError(e?.message || t("drawer.updateError"));
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <ScrollView
        showsVerticalScrollIndicator={false}
        bounces={false}
        contentContainerStyle={s.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        {/* ── Carte profil ── */}
        <View style={s.profileCard}>
          <View style={s.profileCardTop}>
            <View style={s.avatar}>
              <Text style={s.avatarText}>{getInitials(displayName || profile.name)}</Text>
            </View>
            <TouchableOpacity activeOpacity={0.8} onPress={openEdit} style={s.editBtn}>
              <Ionicons name="pencil-outline" size={13} color="#27ae60" />
              <Text style={s.editBtnText}>
                {t("drawer.editProfile")}
              </Text>
            </TouchableOpacity>
          </View>

          <Text style={s.profileName}>{displayName || profile.name || t("drawer.guest")}</Text>
          <Text style={s.profileEmail}>{profile.email}</Text>

          <View style={s.roleBadge}>
            <Text style={s.roleBadgeText}>
              {profile.role === "admin" ? t("drawer.roleAdmin") : t("drawer.roleUser")}
            </Text>
          </View>
        </View>

        {/* ── Langue ── */}
        <View style={s.section}>
          <Text style={s.sectionLabel}>{t("drawer.languageTitle")}</Text>

          <TouchableOpacity
            activeOpacity={0.85}
            onPress={() => setLanguageDropdownOpen((prev) => !prev)}
            style={s.langSelector}
          >
            <View style={s.langLeft}>
              <View style={s.langShortBox}>
                <Text style={s.langShort}>{currentLanguage.short}</Text>
              </View>
              <Text style={s.langLabel}>{currentLanguage.label}</Text>
            </View>
            <Ionicons
              name={languageDropdownOpen ? "chevron-up" : "chevron-down"}
              size={18}
              color="#64748b"
            />
          </TouchableOpacity>

          {languageDropdownOpen && (
            <View style={{ marginTop: 8, gap: 8 }}>
              {LANGUAGE_OPTIONS.map((option) => {
                const selected = option.code === language;
                return (
                  <TouchableOpacity
                    key={option.code}
                    activeOpacity={0.85}
                    onPress={() => { onSelectLanguage(option.code); setLanguageDropdownOpen(false); }}
                    style={[s.langOption, selected && s.langOptionSelected]}
                  >
                    <Text style={[s.langOptionText, selected && s.langOptionTextSelected]}>
                      {option.label}
                    </Text>
                    {selected && <MaterialCommunityIcons name="check" size={18} color="#27ae60" />}
                  </TouchableOpacity>
                );
              })}
            </View>
          )}
        </View>

        {/* ── Déconnexion + branding ── */}
        <View style={{ marginTop: 8 }}>
          <TouchableOpacity style={s.signOutBtn} activeOpacity={0.9} onPress={onSignOut}>
            <Ionicons name="log-out-outline" size={18} color="#fff" />
            <Text style={s.signOutText}>{t("drawer.signOut")}</Text>
          </TouchableOpacity>

          <View style={{ marginTop: 12 }}>
            <Text style={s.brandText}>
              <Text style={{ color: "#3ecf6e" }}>Smart</Text>
              <Text style={{ color: "#2196F3" }}>Irrig</Text>
            </Text>
          </View>
        </View>
      </ScrollView>

      {/* ── Modal modifier le profil ── */}
      <Modal
        visible={editModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setEditModalVisible(false)}
      >
        <View style={s.modalOverlay}>
          <View style={s.modalBox}>

            {/* Header */}
            <View style={s.modalHeader}>
              <Text style={s.modalTitle}>{t("drawer.profileTitle")}</Text>
              <TouchableOpacity
                onPress={() => setEditModalVisible(false)}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Ionicons name="close" size={22} color="#64748b" />
              </TouchableOpacity>
            </View>

            {/* Avatar preview */}
            <View style={s.modalAvatar}>
              <Text style={s.modalAvatarText}>
                {getInitials(`${firstName} ${lastName}`)}
              </Text>
            </View>

            {/* Prénom */}
            <Text style={s.fieldLabel}>{t("drawer.firstName")}</Text>
            <TextInput
              style={s.fieldInput}
              value={firstName}
              onChangeText={(v) => { setFirstName(v); setError(""); }}
              placeholder={t("drawer.firstNamePlaceholder")}
              placeholderTextColor="#94a3b8"
              autoCapitalize="words"
            />

            {/* Nom */}
            <Text style={[s.fieldLabel, { marginTop: 12 }]}>{t("drawer.lastName")}</Text>
            <TextInput
              style={s.fieldInput}
              value={lastName}
              onChangeText={(v) => { setLastName(v); setError(""); }}
              placeholder={t("drawer.lastNamePlaceholder")}
              placeholderTextColor="#94a3b8"
              autoCapitalize="words"
            />

            {/* Erreur */}
            {!!error && (
              <Text style={s.errorText}>{error}</Text>
            )}

            {/* Succès */}
            {success && (
              <View style={s.successBox}>
                <Ionicons name="checkmark-circle" size={16} color="#16a34a" />
                <Text style={s.successText}>{t("drawer.profileUpdated")}</Text>
              </View>
            )}

            {/* Boutons */}
            <View style={s.modalBtns}>
              <TouchableOpacity
                style={s.cancelBtn}
                activeOpacity={0.8}
                onPress={() => setEditModalVisible(false)}
              >
                <Text style={s.cancelBtnText}>{t("drawer.cancel")}</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[s.saveBtn, saving && { opacity: 0.7 }]}
                activeOpacity={0.85}
                onPress={handleSave}
                disabled={saving}
              >
                {saving ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <>
                    <Ionicons name="checkmark" size={16} color="#fff" />
                    <Text style={s.saveBtnText}>{t("drawer.save")}</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>

          </View>
        </View>
      </Modal>
    </>
  );
}

const s = StyleSheet.create({
  scrollContent:        { paddingHorizontal: 16, paddingBottom: 24 },
  // Profil card
  profileCard:          { marginTop: 8, marginBottom: 18, borderRadius: 16, backgroundColor: "#e8f8ed", padding: 16 },
  profileCardTop:       { flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 10 },
  avatar:               { width: 56, height: 56, borderRadius: 28, backgroundColor: "#fff", alignItems: "center", justifyContent: "center" },
  avatarText:           { fontSize: 20, fontWeight: "700", color: "#27ae60" },
  editBtn:              { flexDirection: "row", alignItems: "center", borderRadius: 10, borderWidth: 1, borderColor: "#b6e8c8", backgroundColor: "#fff", paddingHorizontal: 10, paddingVertical: 6 },
  editBtnText:          { marginLeft: 4, fontSize: 12, fontWeight: "600", color: "#27ae60" },
  profileName:          { fontSize: 17, fontWeight: "700", color: "#0f172a" },
  profileEmail:         { marginTop: 2, fontSize: 12, color: "#64748b" },
  roleBadge:            { marginTop: 10, alignSelf: "flex-start", borderRadius: 12, backgroundColor: "#fff", paddingHorizontal: 10, paddingVertical: 4 },
  roleBadgeText:        { fontSize: 11, fontWeight: "700", color: "#27ae60" },
  // Section langue
  section:              { marginBottom: 18 },
  sectionLabel:         { fontSize: 11, fontWeight: "700", textTransform: "uppercase", letterSpacing: 0.8, color: "#64748b", marginBottom: 8 },
  langSelector:         { flexDirection: "row", alignItems: "center", justifyContent: "space-between", borderRadius: 12, borderWidth: 1, borderColor: "#dceee3", backgroundColor: "#f8fafc", paddingHorizontal: 12, paddingVertical: 10 },
  langLeft:             { flexDirection: "row", alignItems: "center", gap: 8 },
  langShortBox:         { width: 28, height: 28, borderRadius: 10, backgroundColor: "#fff", alignItems: "center", justifyContent: "center" },
  langShort:            { fontSize: 11, fontWeight: "700", color: "#64748b" },
  langLabel:            { fontSize: 14, fontWeight: "600", color: "#0f172a" },
  langOption:           { flexDirection: "row", alignItems: "center", justifyContent: "space-between", borderRadius: 12, borderWidth: 1, borderColor: "#dceee3", backgroundColor: "#fff", paddingHorizontal: 12, paddingVertical: 10 },
  langOptionSelected:   { borderColor: "#e8f8ed", backgroundColor: "#e8f8ed" },
  langOptionText:       { fontSize: 14, fontWeight: "500", color: "#0f172a" },
  langOptionTextSelected:{ color: "#27ae60" },
  // Sign out
  signOutBtn:           { flexDirection: "row", alignItems: "center", justifyContent: "center", borderRadius: 14, backgroundColor: "#27ae60", paddingVertical: 12, marginBottom: 18 },
  signOutText:          { marginLeft: 8, fontWeight: "700", color: "#fff" },
  brandText:            { fontSize: 18, fontWeight: "800" },
  // Modal
  modalOverlay:         { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", alignItems: "center", justifyContent: "center", paddingHorizontal: 20 },
  modalBox:             { width: "100%", maxWidth: 400, borderRadius: 20, backgroundColor: "#fff", padding: 24 },
  modalHeader:          { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 20 },
  modalTitle:           { fontSize: 17, fontWeight: "700", color: "#0f172a" },
  modalAvatar:          { alignSelf: "center", width: 60, height: 60, borderRadius: 30, backgroundColor: "#e8f8ed", alignItems: "center", justifyContent: "center", marginBottom: 20 },
  modalAvatarText:      { fontSize: 22, fontWeight: "800", color: "#27ae60" },
  fieldLabel:           { fontSize: 11, fontWeight: "700", textTransform: "uppercase", letterSpacing: 0.5, color: "#64748b", marginBottom: 6 },
  fieldInput:           { borderWidth: 1, borderColor: "#dceee3", borderRadius: 12, backgroundColor: "#f8fafc", paddingHorizontal: 14, paddingVertical: 12, fontSize: 14, color: "#0f172a" },
  errorText:            { marginTop: 10, textAlign: "center", fontSize: 12, color: "#ef4444" },
  successBox:           { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, marginTop: 10, backgroundColor: "#f0fdf4", borderRadius: 10, paddingVertical: 8 },
  successText:          { fontSize: 13, fontWeight: "600", color: "#16a34a" },
  modalBtns:            { flexDirection: "row", gap: 10, marginTop: 20 },
  cancelBtn:            { flex: 1, alignItems: "center", paddingVertical: 13, borderRadius: 12, borderWidth: 1, borderColor: "#e2e8f0", backgroundColor: "#f9fafb" },
  cancelBtnText:        { fontSize: 14, fontWeight: "600", color: "#64748b" },
  saveBtn:              { flex: 2, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, paddingVertical: 13, borderRadius: 12, backgroundColor: "#27ae60" },
  saveBtnText:          { fontSize: 14, fontWeight: "700", color: "#fff" },
});