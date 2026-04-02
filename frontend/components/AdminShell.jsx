// components/AdminShell.jsx
import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from "react-native";
import {
  Gesture,
  GestureDetector,
  GestureHandlerRootView,
} from "react-native-gesture-handler";
import Animated, {
  runOnJS,
  useAnimatedReaction,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { router } from "expo-router";
import { authAPI } from "@api/auth";
import { API_ENDPOINTS, apiFetch } from "@api/client";
import { APP_ROUTES, AUTH_ROUTES } from "@constants/routes";
import { LANGUAGE_OPTIONS, useLanguage } from "@context/LanguageContext";

const COLORS = {
  green: "#3ecf6e",
  greenDark: "#27ae60",
  blue: "#2196F3",
  greenLight: "#e8f8ed",
  text: "#0f172a",
  muted: "#64748b",
  card: "#ffffff",
  border: "#dceee3",
  backdrop: "#0b1220",
};

const SPRING = { damping: 22, stiffness: 260, mass: 0.75 };
const EDGE_WIDTH = 28;
const DRAWER_RATIO = 0.78;
const MAIN_SCALE_MIN = 0.92;
const MAIN_RADIUS = 20;
const OPEN_VELOCITY = 720;
const CLOSE_VELOCITY = -720;

function getInitials(value) {
  const parts = String(value || "").trim().split(" ").filter(Boolean);
  if (parts.length === 0) return "A";
  return parts.slice(0, 2).map((p) => p[0]?.toUpperCase()).join("");
}

function formatDate(locale) {
  try {
    return new Date().toLocaleDateString(locale, {
      weekday: "long", day: "numeric", month: "long", year: "numeric",
    });
  } catch { return new Date().toDateString(); }
}

function snapOpenState(progress, velocityX, isRTL) {
  "worklet";
  const p = progress.value;
  let target = p >= 0.5 ? 1 : 0;
  if (!isRTL) {
    if (velocityX > OPEN_VELOCITY) target = 1;
    if (velocityX < CLOSE_VELOCITY) target = 0;
  } else {
    if (velocityX < -OPEN_VELOCITY) target = 1;
    if (velocityX > -CLOSE_VELOCITY) target = 0;
  }
  progress.value = withSpring(target, SPRING);
}

// Contenu du drawer
function DrawerContent({ profile, navItems, activeKey, language, currentLanguage, languageDropdownOpen, setLanguageDropdownOpen, handleSelectLanguage, handleSignOut, closeDrawer, t, isRTL, unreadCount }) {
  return (
    <ScrollView
      showsVerticalScrollIndicator={false}
      bounces={false}
      contentContainerStyle={styles.drawerScroll}
      keyboardShouldPersistTaps="handled"
    >
      <View style={styles.profileCard}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{getInitials(profile.name)}</Text>
        </View>
        <Text style={styles.profileName}>{profile.name || "Admin"}</Text>
        <Text style={styles.profileEmail}>{profile.email}</Text>
        <View style={styles.roleBadge}>
          <Text style={styles.roleBadgeText}>Administrateur</Text>
        </View>
      </View>

      <View style={styles.menuList}>
        {navItems.map((item) => {
          const selected = item.key === activeKey;
          return (
            <TouchableOpacity
              key={item.key}
              activeOpacity={0.85}
              onPress={() => { router.push(item.route); closeDrawer?.(); }}
              style={[styles.menuItem, selected && styles.menuItemSelected]}
            >
              <View style={styles.menuTextRow}>
                <View style={styles.menuBadge}>
                  <MaterialCommunityIcons
                    name={item.icon}
                    size={18}
                    color={selected ? COLORS.greenDark : COLORS.muted}
                  />
                </View>
                <Text style={[styles.menuLabel, selected && styles.menuLabelSelected]}>
                  {item.label}
                </Text>
              </View>
              {item.key === "messages" && unreadCount > 0 && (
                <View style={styles.menuBadgeCount}>
                  <Text style={styles.menuBadgeCountText}>
                    {unreadCount > 99 ? "99+" : String(unreadCount)}
                  </Text>
                </View>
              )}
              {selected && item.key !== "messages" && (
                <MaterialCommunityIcons name="check" size={18} color={COLORS.greenDark} />
              )}
            </TouchableOpacity>
          );
        })}
      </View>

      <View style={styles.section}>
        <Text style={[styles.sectionTitle, isRTL && { textAlign: "right" }]}>Langue</Text>
        <TouchableOpacity
          activeOpacity={0.85}
          onPress={() => setLanguageDropdownOpen((prev) => !prev)}
          style={styles.langDropdownToggle}
        >
          <View style={styles.langTextRow}>
            <View style={styles.langBadge}>
              <Text style={styles.langCode}>{currentLanguage.short}</Text>
            </View>
            <Text style={styles.langLabel}>{currentLanguage.label}</Text>
          </View>
          <Ionicons
            name={languageDropdownOpen ? "chevron-up" : "chevron-down"}
            size={18}
            color={COLORS.muted}
          />
        </TouchableOpacity>

        {languageDropdownOpen && (
          <View style={styles.languageListDropdown}>
            {LANGUAGE_OPTIONS.map((option) => {
              const selected = option.code === language;
              return (
                <TouchableOpacity
                  key={option.code}
                  activeOpacity={0.85}
                  onPress={() => { handleSelectLanguage(option.code); setLanguageDropdownOpen(false); }}
                  style={selected ? [styles.langItem, styles.langItemSelected] : styles.langItem}
                >
                  <View style={styles.langTextRow}>
                    <View style={styles.langBadge}>
                      <Text style={selected ? [styles.langCode, styles.langCodeSelected] : styles.langCode}>
                        {option.short}
                      </Text>
                    </View>
                    <Text style={selected ? [styles.langLabel, styles.langLabelSelected] : styles.langLabel}>
                      {option.label}
                    </Text>
                  </View>
                  {selected && <MaterialCommunityIcons name="check" size={18} color={COLORS.greenDark} />}
                </TouchableOpacity>
              );
            })}
          </View>
        )}
      </View>

      <View style={styles.footer}>
        <TouchableOpacity style={styles.signOutButton} activeOpacity={0.9} onPress={handleSignOut}>
          <Ionicons name="log-out-outline" size={18} color="#fff" />
          <Text style={styles.signOutText}>Se déconnecter</Text>
        </TouchableOpacity>
        <View style={styles.brandRow}>
          <Text style={styles.brandText}>
            <Text style={{ color: COLORS.green }}>Smart</Text>
            <Text style={{ color: COLORS.blue }}>Irrig</Text>
          </Text>
        </View>
      </View>
    </ScrollView>
  );
}

// Shell principal
export function AdminShell({ activeKey, title, subtitle, loading = false, onRefresh, children }) {
  const insets = useSafeAreaInsets();
  const { language, setLanguage, isRTL } = useLanguage();
  const { width: screenWidth } = useWindowDimensions();
  const isWeb = Platform.OS === "web";
  const isPersistentWebDrawer = isWeb;

  const drawerWidth = isPersistentWebDrawer
    ? Math.min(340, Math.max(260, Math.round(screenWidth * 0.22)))
    : Math.round(screenWidth * DRAWER_RATIO);

  const drawerWidthSV  = useSharedValue(drawerWidth);
  const isRTLShared    = useSharedValue(isRTL ? 1 : 0);
  const progress       = useSharedValue(0);
  const startProgress  = useSharedValue(0);

  const [isOpen,              setIsOpen]              = useState(false);
  const [profile,             setProfile]             = useState({ name: "Admin", email: "" });
  const [unreadCount,         setUnreadCount]         = useState(0);
  const [languageDropdownOpen,setLanguageDropdownOpen]= useState(false);

  useEffect(() => { drawerWidthSV.value = drawerWidth; }, [drawerWidth]);
  useEffect(() => { if (isPersistentWebDrawer) { progress.value = 1; setIsOpen(true); } }, [isPersistentWebDrawer]);
  useEffect(() => { isRTLShared.value = isRTL ? 1 : 0; }, [isRTL]);

  useAnimatedReaction(
    () => progress.value,
    (v, prev) => {
      const open = v > 0.5;
      const wasOpen = prev != null && prev > 0.5;
      if (open !== wasOpen) runOnJS(setIsOpen)(open);
    },
  );

  // ✅ Navigation en français
  const navItems = useMemo(() => [
    { key: "dashboard", label: "Tableau de bord", icon: "view-dashboard-outline", route: APP_ROUTES.adminDashboard },
    { key: "addculture", label: "Ajouter une culture", icon: "plus-box-outline", route: APP_ROUTES.adminAddCulture },
    { key: "utilisateurs", label: "Utilisateurs", icon: "account-group-outline", route: APP_ROUTES.adminUsers },
    { key: "irrigations", label: "Irrigations", icon: "water-outline", route: APP_ROUTES.adminIrrigations },
    { key: "messages", label: "Messages", icon: "email-outline", route: APP_ROUTES.adminMessages },
  ], []);

  const currentLanguage = useMemo(
    () => LANGUAGE_OPTIONS.find((o) => o.code === language) || LANGUAGE_OPTIONS[0],
    [language],
  );

  const loadProfile = async () => {
    const admin = await authAPI.getAdmin();
    if (admin?.email) { setProfile({ name: admin.fullName || admin.email, email: admin.email }); return; }
    setProfile({ name: "Admin", email: "" });
  };

  const loadUnreadCount = async () => {
    try {
      const res  = await apiFetch(API_ENDPOINTS.admin.messagesUnreadCount);
      const json = await res.json().catch(() => ({}));
      if (res.ok && json?.success) setUnreadCount(Number(json.count) || 0);
    } catch {}
  };

  useEffect(() => { loadProfile(); }, []);
  useEffect(() => { if (isOpen || isPersistentWebDrawer) loadProfile(); }, [isOpen, isPersistentWebDrawer]);
  useEffect(() => { loadUnreadCount(); }, [activeKey]);

  async function handleSelectLanguage(lang) { await setLanguage(lang); }
  async function handleSignOut() { await authAPI.logout(); router.replace(AUTH_ROUTES.login); }

  const closeDrawer  = () => { if (!isPersistentWebDrawer) progress.value = withSpring(0, SPRING); };
  const toggleDrawer = () => { if (!isPersistentWebDrawer) progress.value = withSpring(progress.value > 0.5 ? 0 : 1, SPRING); };

  const edgePan = useMemo(() =>
    Gesture.Pan()
      .activeOffsetX([-12, 12]).failOffsetY([-12, 12])
      .onBegin(() => { startProgress.value = progress.value; })
      .onUpdate((e) => {
        const w = drawerWidthSV.value;
        const rtl = isRTLShared.value === 1;
        const delta = e.translationX / w;
        const next = rtl ? startProgress.value - delta : startProgress.value + delta;
        progress.value = Math.max(0, Math.min(1, next));
      })
      .onEnd((e) => { snapOpenState(progress, e.velocityX, isRTLShared.value === 1); }),
    [drawerWidthSV, isRTLShared, progress, startProgress],
  );

  const mainPan = useMemo(() =>
    Gesture.Pan()
      .activeOffsetX([-14, 14]).failOffsetY([-12, 12])
      .onBegin(() => { startProgress.value = progress.value; })
      .onUpdate((e) => {
        if (startProgress.value < 0.02) return;
        const w = drawerWidthSV.value;
        const rtl = isRTLShared.value === 1;
        const delta = e.translationX / w;
        const next = rtl ? startProgress.value - delta : startProgress.value + delta;
        progress.value = Math.max(0, Math.min(1, next));
      })
      .onEnd((e) => { if (startProgress.value < 0.02) return; snapOpenState(progress, e.velocityX, isRTLShared.value === 1); }),
    [drawerWidthSV, isRTLShared, progress, startProgress],
  );

  const drawerAnim = useAnimatedStyle(() => {
    const w = drawerWidthSV.value;
    const rtl = isRTLShared.value === 1;
    return { transform: [{ translateX: rtl ? w * (1 - progress.value) : w * (progress.value - 1) }] };
  });

  const mainAnim = useAnimatedStyle(() => {
    const w = drawerWidthSV.value;
    const rtl = isRTLShared.value === 1;
    const p = progress.value;
    return {
      transform: [{ translateX: rtl ? -w * p : w * p }, { scale: 1 - (1 - MAIN_SCALE_MIN) * p }],
      borderRadius: MAIN_RADIUS * p,
      overflow: "hidden",
      shadowColor: "#000",
      shadowOffset: { width: -4, height: 0 },
      shadowOpacity: 0.1 + 0.18 * p,
      shadowRadius: 10 + 16 * p,
      elevation: 4 + 10 * p,
    };
  });

  const overlayAnim = useAnimatedStyle(() => ({ opacity: 0.38 * progress.value }));

  const topPad        = insets.top + 8;
  const contentTopPad = insets.top + 18;
  const drawerSide    = isRTL ? { right: 0 } : { left: 0 };
  const edgeSide      = isRTL ? { right: 0, width: EDGE_WIDTH } : { left: 0, width: EDGE_WIDTH };

  const drawerProps = {
    profile, navItems, activeKey, language, currentLanguage,
    languageDropdownOpen, setLanguageDropdownOpen,
    handleSelectLanguage, handleSignOut, t, isRTL, unreadCount,
  };

  const PageHeader = ({ withMenuBtn = false }) => (
    <View style={styles.header}>
      <View style={styles.headerLead}>
        {withMenuBtn && (
          <TouchableOpacity style={styles.menuButton} onPress={toggleDrawer} activeOpacity={0.85}>
            <Ionicons name={isOpen ? "close" : "menu"} size={22} color={COLORS.greenDark} />
          </TouchableOpacity>
        )}
        <View style={styles.headerText}>
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.subtitle}>{subtitle || formatDate(language)}</Text>
        </View>
      </View>
      <View style={styles.headerActions}>
        <TouchableOpacity
          style={styles.actionIcon}
          onPress={() => router.push(APP_ROUTES.adminMessages)}
          activeOpacity={0.85}
        >
          <MaterialCommunityIcons name="email-outline" size={20} color={COLORS.muted} />
          {unreadCount > 0 && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{unreadCount > 99 ? "99+" : String(unreadCount)}</Text>
            </View>
          )}
        </TouchableOpacity>
        {onRefresh && (
          <TouchableOpacity style={styles.refreshButton} onPress={onRefresh} activeOpacity={0.85}>
            <Ionicons name="refresh" size={20} color={COLORS.muted} />
          </TouchableOpacity>
        )}
      </View>
    </View>
  );

  if (isPersistentWebDrawer) {
    return (
      <View style={styles.webShell}>
        <View style={[styles.webDrawer, { width: drawerWidth, paddingTop: topPad }]}>
          <DrawerContent {...drawerProps} closeDrawer={null} />
        </View>
        <View style={styles.webMain}>
          <View style={[styles.contentBody, { paddingTop: contentTopPad }]}>
            <PageHeader withMenuBtn={false} />
            {loading ? (
              <View style={styles.loadingWrap}>
                <ActivityIndicator size="large" color={COLORS.greenDark} />
              </View>
            ) : (
              <ScrollView style={styles.contentScroll} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
                {children}
              </ScrollView>
            )}
          </View>
        </View>
      </View>
    );
  }

  return (
    <GestureHandlerRootView style={styles.flex}>
      <View style={styles.backdrop}>
        <View style={styles.backdropInner} />

        <Animated.View style={[styles.drawer, { width: drawerWidth, paddingTop: topPad }, drawerSide, drawerAnim]}>
          <DrawerContent {...drawerProps} closeDrawer={closeDrawer} />
        </Animated.View>

        <GestureDetector gesture={mainPan}>
          <Animated.View style={[styles.main, mainAnim]}>
            <View style={[styles.contentBody, { paddingTop: contentTopPad }]}>
              <PageHeader withMenuBtn={true} />
              {loading ? (
                <View style={styles.loadingWrap}>
                  <ActivityIndicator size="large" color={COLORS.greenDark} />
                </View>
              ) : (
                <ScrollView style={styles.contentScroll} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
                  {children}
                </ScrollView>
              )}
            </View>

            <Animated.View style={[styles.dimOverlay, overlayAnim]} pointerEvents={isOpen ? "auto" : "none"}>
              <Pressable style={StyleSheet.absoluteFill} onPress={closeDrawer} />
            </Animated.View>
          </Animated.View>
        </GestureDetector>

        <GestureDetector gesture={edgePan}>
          <View style={[styles.edgeHit, edgeSide]} pointerEvents="box-only" />
        </GestureDetector>
      </View>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  webShell: { flex: 1, flexDirection: "row", backgroundColor: COLORS.backdrop },
  webDrawer: { backgroundColor: COLORS.card, borderRightWidth: 1, borderRightColor: COLORS.border },
  webMain: { flex: 1, minWidth: 0, backgroundColor: "#fff" },
  backdrop: { flex: 1, backgroundColor: COLORS.backdrop },
  backdropInner: { ...StyleSheet.absoluteFillObject, backgroundColor: COLORS.backdrop },
  drawer: { position: "absolute", top: 0, bottom: 0, zIndex: 0, backgroundColor: COLORS.card, borderWidth: StyleSheet.hairlineWidth, borderColor: COLORS.border },
  drawerScroll: { paddingHorizontal: 16, paddingBottom: 24 },
  profileCard: { backgroundColor: COLORS.greenLight, borderRadius: 16, padding: 16, marginTop: 8, marginBottom: 18 },
  avatar: { width: 56, height: 56, borderRadius: 28, backgroundColor: "#fff", alignItems: "center", justifyContent: "center", marginBottom: 10 },
  avatarText: { fontSize: 20, fontWeight: "700", color: COLORS.greenDark },
  profileName: { fontSize: 17, fontWeight: "700", color: COLORS.text },
  profileEmail: { fontSize: 12, color: COLORS.muted, marginTop: 2 },
  roleBadge: { alignSelf: "flex-start", backgroundColor: "#fff", borderRadius: 12, paddingHorizontal: 10, paddingVertical: 4, marginTop: 10 },
  roleBadgeText: { fontSize: 11, fontWeight: "700", color: COLORS.greenDark },
  menuList: { marginBottom: 18, gap: 8 },
  menuItem: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingVertical: 10, paddingHorizontal: 12, borderRadius: 12, borderWidth: 1, borderColor: COLORS.border, backgroundColor: "#f8fafc" },
  menuItemSelected: { backgroundColor: COLORS.greenLight, borderColor: COLORS.greenLight },
  menuTextRow: { flexDirection: "row", alignItems: "center", gap: 8, flex: 1 },
  menuBadge: { width: 28, height: 28, borderRadius: 10, backgroundColor: "#fff", alignItems: "center", justifyContent: "center" },
  menuLabel: { fontSize: 14, fontWeight: "600", color: COLORS.text },
  menuLabelSelected: { color: COLORS.greenDark },
  menuBadgeCount: { minWidth: 20, height: 20, paddingHorizontal: 5, borderRadius: 10, backgroundColor: COLORS.blue, alignItems: "center", justifyContent: "center" },
  menuBadgeCountText: { color: "#fff", fontSize: 10, fontWeight: "800" },
  section: { marginBottom: 18 },
  sectionTitle: { fontSize: 12, textTransform: "uppercase", letterSpacing: 0.8, color: COLORS.muted, fontWeight: "700", marginBottom: 8 },
  langDropdownToggle: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingVertical: 10, paddingHorizontal: 12, borderRadius: 12, borderWidth: 1, borderColor: COLORS.border, backgroundColor: "#f8fafc" },
  languageListDropdown: { marginTop: 8, gap: 6 },
  langItem: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingVertical: 10, paddingHorizontal: 12, borderRadius: 12, borderWidth: 1, borderColor: COLORS.border, backgroundColor: "#f8fafc" },
  langItemSelected: { backgroundColor: COLORS.greenLight, borderColor: COLORS.greenLight },
  langTextRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  langBadge: { width: 28, height: 28, borderRadius: 10, backgroundColor: "#fff", alignItems: "center", justifyContent: "center" },
  langCode: { fontSize: 12, fontWeight: "700", color: COLORS.muted },
  langCodeSelected: { color: COLORS.greenDark },
  langLabel: { fontSize: 14, fontWeight: "600", color: COLORS.text },
  langLabelSelected: { color: COLORS.greenDark },
  footer: { marginTop: 8 },
  signOutButton: { flexDirection: "row", alignItems: "center", justifyContent: "center", backgroundColor: COLORS.greenDark, borderRadius: 14, paddingVertical: 12, marginBottom: 18 },
  signOutText: { color: "#fff", fontWeight: "700", marginLeft: 8 },
  brandRow: { alignItems: "flex-start" },
  brandText: { fontSize: 18, fontWeight: "800" },
  main: { ...StyleSheet.absoluteFillObject, backgroundColor: "#fff", zIndex: 1 },
  contentBody: { flex: 1, paddingHorizontal: 18, backgroundColor: "#fff" },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 14 },
  headerLead: { flex: 1, minWidth: 0, flexDirection: "row", alignItems: "center", gap: 12 },
  headerText: { flex: 1, minWidth: 0 },
  title: { fontSize: 22, fontWeight: "700", lineHeight: 28, flexShrink: 1, color: COLORS.text },
  subtitle: { fontSize: 13, color: COLORS.muted, marginTop: 2, flexShrink: 1 },
  headerActions: { flexDirection: "row", alignItems: "center", gap: 10 },
  actionIcon: { width: 38, height: 38, borderRadius: 14, borderWidth: 1, borderColor: COLORS.border, alignItems: "center", justifyContent: "center", backgroundColor: COLORS.card },
  badge: { position: "absolute", top: -6, right: -6, minWidth: 18, height: 18, paddingHorizontal: 5, borderRadius: 999, alignItems: "center", justifyContent: "center", backgroundColor: COLORS.blue, borderWidth: 2, borderColor: COLORS.card },
  badgeText: { color: "#fff", fontSize: 10, fontWeight: "800" },
  refreshButton: { width: 38, height: 38, borderRadius: 14, borderWidth: 1, borderColor: COLORS.border, alignItems: "center", justifyContent: "center", backgroundColor: COLORS.card },
  menuButton: { width: 40, height: 40, borderRadius: 14, borderWidth: 1, borderColor: COLORS.border, alignItems: "center", justifyContent: "center", backgroundColor: COLORS.greenLight },
  contentScroll: { flex: 1 },
  scrollContent: { paddingBottom: 32 },
  loadingWrap: { flex: 1, alignItems: "center", justifyContent: "center" },
  dimOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: "#000", zIndex: 100 },
  edgeHit: { position: "absolute", top: 0, bottom: 0, zIndex: 50 },
});