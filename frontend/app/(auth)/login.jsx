import { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Alert,
  StyleSheet,
  ActivityIndicator,
} from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as WebBrowser from "expo-web-browser";
import * as Google from "expo-auth-session/providers/google";
import { Logo } from "@components/Logo";
import { authAPI } from "@api/auth";
import { APP_ROUTES, AUTH_ROUTES } from "@constants/routes";
import { LANGUAGE_OPTIONS, useLanguage } from "@context/LanguageContext";

// ─── Google Signin — Android natif seulement ─────────────────────────────────
let GoogleSignin = null;
let statusCodes = {};

if (Platform.OS === "android") {
  try {
    const gsModule = require("@react-native-google-signin/google-signin");
    GoogleSignin = gsModule.GoogleSignin;
    statusCodes = gsModule.statusCodes;

    GoogleSignin.configure({
      webClientId:
        "861346189775-dcblovh2u607hduecqvi2tj0p3sv4c2i.apps.googleusercontent.com",
      androidClientId:
        "861346189775-c9qano8fpg5lqjhlc9ebiil4ub7lpbmo.apps.googleusercontent.com",
      iosClientId:
        "861346189775-jt0kp72jduhpgkjnnupjboosdchu11td.apps.googleusercontent.com",
      offlineAccess: false,
    });
  } catch (e) {
    console.warn("[GoogleSignin] Module non disponible:", e.message);
  }
}

WebBrowser.maybeCompleteAuthSession();

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const AUTH_ROUTE = APP_ROUTES.home;
const ADMIN_ROUTE = APP_ROUTES.adminDashboard;

const GOOGLE_WEB_CLIENT_ID =
  "861346189775-dcblovh2u607hduecqvi2tj0p3sv4c2i.apps.googleusercontent.com";
const GOOGLE_ANDROID_CLIENT_ID =
  "861346189775-c9qano8fpg5lqjhlc9ebiil4ub7lpbmo.apps.googleusercontent.com";
const GOOGLE_IOS_CLIENT_ID =
  "861346189775-jt0kp72jduhpgkjnnupjboosdchu11td.apps.googleusercontent.com";

function normalizeEmail(v) {
  return String(v || "").trim().toLowerCase();
}
function sanitizeText(v) {
  return String(v || "").trim();
}

async function saveLog(action, details) {
  try {
    const raw = await AsyncStorage.getItem("smartirrig_user_logs");
    const logs = raw ? JSON.parse(raw) : [];
    logs.unshift({
      id: Date.now().toString(),
      type: "auth",
      action,
      details,
      timestamp: new Date().toISOString(),
    });
    await AsyncStorage.setItem(
      "smartirrig_user_logs",
      JSON.stringify(logs.slice(0, 200))
    );
  } catch {}
}

// ✅ Gère v11 ET v12+ response shape de @react-native-google-signin
async function googleSignInNative() {
  if (!GoogleSignin) throw new Error("GoogleSignin non disponible");
  await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
  const result = await GoogleSignin.signIn();
  const idToken =
    result?.data?.idToken ||
    result?.idToken ||
    result?.data?.authentication?.idToken;
  if (!idToken) {
    console.error("[GoogleSignin] Response shape reçue:", JSON.stringify(result));
    throw new Error(
      "idToken introuvable. Vérifiez que oauth_client n'est pas vide dans google-services.json."
    );
  }
  return { idToken };
}

// ─────────────────────────────────────────────────────────────────────────────
export default function LoginScreen() {
  const { t, isRTL, language, changeLanguage } = useLanguage();
  const [activeTab, setActiveTab] = useState("login");

  const handleLanguageSwitch = () => {
    const options = LANGUAGE_OPTIONS.map((item) => item.code);
    const currentIndex = options.indexOf(language);
    const nextLanguage = options[(currentIndex + 1) % options.length];
    changeLanguage(nextLanguage);
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: "#fff" }}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <ScrollView
        contentContainerStyle={{ flexGrow: 1 }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={s.container}>
          <View style={s.languageRow}>
            <TouchableOpacity
              style={s.languageBtn}
              onPress={handleLanguageSwitch}
              activeOpacity={0.85}
            >
              <Text style={s.languageLabel}>{t("drawer.languageTitle")}</Text>
              <Text style={s.languageCode}>{language.toUpperCase()}</Text>
            </TouchableOpacity>
          </View>
          <View style={{ marginTop: 30 }}>
            <Logo />
          </View>
          <View style={s.tabRow}>
            {["login", "signup"].map((tab) => (
              <TouchableOpacity
                key={tab}
                style={s.tabBtn}
                onPress={() => setActiveTab(tab)}
                activeOpacity={0.7}
              >
                <Text style={[s.tabText, activeTab === tab && s.tabTextActive]}>
                  {tab === "login" ? t("tabs.login") : t("tabs.signup")}
                </Text>
                {activeTab === tab && <View style={s.tabUnderline} />}
              </TouchableOpacity>
            ))}
          </View>
          {activeTab === "login" ? (
            <LoginForm t={t} isRTL={isRTL} onOpenSignup={() => setActiveTab("signup")} />
          ) : (
            <SignupForm t={t} isRTL={isRTL} />
          )}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// LOGIN FORM
// ─────────────────────────────────────────────────────────────────────────────
function LoginForm({ t, isRTL, onOpenSignup }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [fieldError, setFieldError] = useState("");

  // expo-auth-session uniquement pour iOS / Web (pas Android)
  const [, response, promptAsync] = Google.useAuthRequest(
    Platform.OS !== "android"
      ? {
          clientId: GOOGLE_WEB_CLIENT_ID,
          iosClientId: GOOGLE_IOS_CLIENT_ID,
          androidClientId: GOOGLE_ANDROID_CLIENT_ID,
          extraParams: { prompt: "select_account", access_type: "online" },
        }
      : null
  );

  const handleGoogleSuccess = useCallback(
    async ({ idToken, accessToken }) => {
      if (!idToken && !accessToken) {
        setFieldError(t("login.invalidCredentials"));
        return;
      }
      setGoogleLoading(true);
      setFieldError("");
      try {
        const data = await authAPI.googleLogin({ idToken, accessToken });
        if (data.token) await AsyncStorage.setItem("userToken", data.token);
        if (data.user)
          await AsyncStorage.setItem("userData", JSON.stringify(data.user));
        await saveLog("Connexion Google", data.user?.email || "");
        router.replace(data.role === "admin" ? ADMIN_ROUTE : AUTH_ROUTE);
      } catch (err) {
        setFieldError(err.message || t("login.invalidCredentials"));
      } finally {
        setGoogleLoading(false);
      }
    },
    [t]
  );

  useEffect(() => {
    if (Platform.OS === "android") return;
    if (response?.type === "success") {
      const idToken = response.authentication?.idToken;
      const accessToken = response.authentication?.accessToken;
      handleGoogleSuccess({ idToken, accessToken });
    } else if (response?.type === "error") {
      setFieldError(t("login.invalidCredentials"));
    }
  }, [response, handleGoogleSuccess, t]);

  const handleGooglePress = async () => {
    setFieldError("");
    setGoogleLoading(true);
    try {
      if (Platform.OS === "android") {
        const { idToken } = await googleSignInNative();
        await handleGoogleSuccess({ idToken });
      } else {
        setGoogleLoading(false);
        await promptAsync();
      }
    } catch (err) {
      const code = err?.code;
      if (
        code === statusCodes.SIGN_IN_CANCELLED ||
        code === statusCodes.IN_PROGRESS
      ) {
        // Silencieux — user a annulé
      } else {
        console.error("[Google Login]", err);
        setFieldError(err.message || t("login.invalidCredentials"));
      }
      setGoogleLoading(false);
    }
  };

  const handleLogin = async () => {
    setFieldError("");
    const em = normalizeEmail(email),
      pw = String(password || "");
    if (!em || !pw) { setFieldError(t("login.fillFields")); return; }
    if (!EMAIL_REGEX.test(em)) { setFieldError(t("login.invalidEmail")); return; }
    setLoading(true);
    try {
      let isAdmin = false, lastError = null;
      try {
        await authAPI.adminLogin({ email: em, password: pw });
        isAdmin = true;
      } catch {
        try {
          const r = await authAPI.login({ email: em, password: pw });
          isAdmin = r?.role === "admin";
        } catch (e) { lastError = e; }
      }
      if (lastError) throw lastError;
      await saveLog("Connexion", em);
      router.replace(isAdmin ? ADMIN_ROUTE : AUTH_ROUTE);
    } catch (error) {
      const msg = String(error?.message || "").toLowerCase();
      setFieldError(
        msg.includes("incorrect") || msg.includes("invalid") ||
        msg.includes("identifiant") || msg.includes("401") ||
        msg.includes("wrong") || msg.includes("password")
          ? t("login.invalidCredentials")
          : error?.message || t("login.invalidCredentials")
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <View>
      <ErrorBox message={fieldError} />
      <FieldLabel text={t("login.emailLabel")} isRTL={isRTL} />
      <FieldInput
        placeholder={t("login.emailPlaceholder")}
        value={email}
        onChangeText={(v) => { setEmail(v); setFieldError(""); }}
        icon="mail-outline"
        keyboardType="email-address"
        autoCapitalize="none"
        isRTL={isRTL}
        hasError={!!fieldError}
      />
      <FieldLabel text={t("login.passwordLabel")} isRTL={isRTL} />
      <FieldInput
        placeholder="........"
        value={password}
        onChangeText={(v) => { setPassword(v); setFieldError(""); }}
        icon="lock-closed-outline"
        secureTextEntry={!showPassword}
        isPassword
        showPassword={showPassword}
        onTogglePassword={() => setShowPassword((p) => !p)}
        isRTL={isRTL}
        hasError={!!fieldError}
      />
      <TouchableOpacity
        onPress={() => router.push(AUTH_ROUTES.forgotPassword)}
        style={{ alignItems: isRTL ? "flex-start" : "flex-end", marginTop: 8, marginBottom: 24 }}
      >
        <Text style={{ color: "#16a34a", fontSize: 14, fontWeight: "500" }}>
          {t("login.forgotPassword")}
        </Text>
      </TouchableOpacity>
      <SubmitButton
        label={loading ? t("login.loginLoading") : t("common.confirm")}
        onPress={handleLogin}
        disabled={loading}
      />
      <Separator />
      <GoogleButton loading={googleLoading} onPress={handleGooglePress} label={t("common.googleLogin")} />
      <View style={{ alignItems: "center", marginTop: 20, flexDirection: "row", justifyContent: "center", gap: 6 }}>
        <Text style={{ color: "#9ca3af", fontSize: 14 }}>{t("login.noAccount")}</Text>
        <TouchableOpacity onPress={onOpenSignup} activeOpacity={0.7}>
          <Text style={{ color: "#2563eb", fontWeight: "700", fontSize: 14, textDecorationLine: "underline" }}>
            {t("tabs.signup")}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// SIGNUP FORM
// ─────────────────────────────────────────────────────────────────────────────
function SignupForm({ t, isRTL }) {
  const [form, setForm] = useState({
    firstName: "", lastName: "", address: "", email: "", password: "",
  });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [fieldError, setFieldError] = useState("");

  const set = (key) => (value) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    setFieldError("");
  };

  const [, response, promptAsync] = Google.useAuthRequest(
    Platform.OS !== "android"
      ? {
          clientId: GOOGLE_WEB_CLIENT_ID,
          iosClientId: GOOGLE_IOS_CLIENT_ID,
          androidClientId: GOOGLE_ANDROID_CLIENT_ID,
          extraParams: { prompt: "select_account", access_type: "online" },
        }
      : null
  );

  const handleGoogleSuccess = useCallback(
    async ({ idToken, accessToken }) => {
      if (!idToken && !accessToken) { setFieldError(t("login.invalidCredentials")); return; }
      setGoogleLoading(true);
      setFieldError("");
      try {
        const data = await authAPI.googleLogin({ idToken, accessToken });
        if (data.token) await AsyncStorage.setItem("userToken", data.token);
        if (data.user) await AsyncStorage.setItem("userData", JSON.stringify(data.user));
        await saveLog("Inscription Google", data.user?.email || "");
        router.replace(AUTH_ROUTE);
      } catch (err) {
        setFieldError(err.message || t("login.invalidCredentials"));
      } finally {
        setGoogleLoading(false);
      }
    },
    [t]
  );

  useEffect(() => {
    if (Platform.OS === "android") return;
    if (response?.type === "success") {
      const idToken = response.authentication?.idToken;
      const accessToken = response.authentication?.accessToken;
      handleGoogleSuccess({ idToken, accessToken });
    } else if (response?.type === "error") {
      setFieldError(t("login.invalidCredentials"));
    }
  }, [response, handleGoogleSuccess, t]);

  const handleGooglePress = async () => {
    setFieldError("");
    setGoogleLoading(true);
    try {
      if (Platform.OS === "android") {
        const { idToken } = await googleSignInNative();
        await handleGoogleSuccess({ idToken });
      } else {
        setGoogleLoading(false);
        await promptAsync();
      }
    } catch (err) {
      const code = err?.code;
      if (code === statusCodes.SIGN_IN_CANCELLED || code === statusCodes.IN_PROGRESS) {
        // Silencieux
      } else {
        console.error("[Google Signup]", err);
        setFieldError(err.message || t("login.invalidCredentials"));
      }
      setGoogleLoading(false);
    }
  };

  const handleSignup = async () => {
    setFieldError("");
    const fn = sanitizeText(form.firstName), ln = sanitizeText(form.lastName);
    const ad = sanitizeText(form.address), em = normalizeEmail(form.email);
    const pw = String(form.password || "");
    if (!fn || !ln || !ad || !em || !pw) { setFieldError(t("signup.fillFields")); return; }
    if (fn.length < 2) { setFieldError(t("signup.firstNameTooShort")); return; }
    if (ln.length < 2) { setFieldError(t("signup.lastNameTooShort")); return; }
    if (ad.length < 5) { setFieldError(t("signup.addressTooShort")); return; }
    if (!EMAIL_REGEX.test(em)) { setFieldError(t("signup.invalidEmail")); return; }
    if (pw.length < 8) { setFieldError(t("signup.passwordTooShort")); return; }
    setLoading(true);
    try {
      await authAPI.register({ firstName: fn, lastName: ln, address: ad, email: em, password: pw });
      await saveLog("Inscription", em);
      Alert.alert(t("common.successTitle"), t("signup.createdMessage"));
      router.replace(AUTH_ROUTE);
    } catch (error) {
      setFieldError(error?.message || t("signup.signupFailed"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <View>
      <ErrorBox message={fieldError} />
      <View style={{ flexDirection: "row", gap: 12 }}>
        <View style={{ flex: 1 }}>
          <FieldLabel text={t("signup.lastNameLabel")} isRTL={isRTL} />
          <FieldInput placeholder="Ben Ali" value={form.lastName} onChangeText={set("lastName")} icon="person-outline" isRTL={isRTL} />
        </View>
        <View style={{ flex: 1 }}>
          <FieldLabel text={t("signup.firstNameLabel")} isRTL={isRTL} />
          <FieldInput placeholder="Mohamed" value={form.firstName} onChangeText={set("firstName")} icon="person-outline" isRTL={isRTL} />
        </View>
      </View>
      <FieldLabel text={t("signup.addressLabel")} isRTL={isRTL} />
      <FieldInput placeholder="Tunis, Tunisie" value={form.address} onChangeText={set("address")} icon="location-outline" isRTL={isRTL} />
      <FieldLabel text={t("signup.emailLabel")} isRTL={isRTL} />
      <FieldInput
        placeholder="votre@email.com"
        value={form.email}
        onChangeText={set("email")}
        icon="mail-outline"
        keyboardType="email-address"
        autoCapitalize="none"
        isRTL={isRTL}
      />
      <FieldLabel text={t("signup.passwordLabel")} isRTL={isRTL} />
      <FieldInput
        placeholder="........"
        value={form.password}
        onChangeText={set("password")}
        icon="lock-closed-outline"
        secureTextEntry={!showPassword}
        isPassword
        showPassword={showPassword}
        onTogglePassword={() => setShowPassword((p) => !p)}
        isRTL={isRTL}
        extraStyle={{ marginBottom: 24 }}
      />
      <SubmitButton
        label={loading ? t("signup.signupLoading") : t("common.confirm")}
        onPress={handleSignup}
        disabled={loading}
      />
      <Separator />
      <GoogleButton loading={googleLoading} onPress={handleGooglePress} label={t("common.googleLogin")} />
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// COMPOSANTS COMMUNS
// ─────────────────────────────────────────────────────────────────────────────
function ErrorBox({ message }) {
  if (!message) return null;
  return (
    <View style={s.errorBox}>
      <Ionicons name="alert-circle" size={18} color="#ef4444" />
      <Text style={s.errorText}>{message}</Text>
    </View>
  );
}

function Separator() {
  return (
    <View style={s.separator}>
      <View style={s.sepLine} />
      <Text style={s.sepText}>{"ou"}</Text>
      <View style={s.sepLine} />
    </View>
  );
}

function GoogleButton({ loading, onPress, label }) {
  const [imgErr, setImgErr] = useState(false);
  return (
    <TouchableOpacity
      style={[s.googleBtn, loading && { opacity: 0.55 }]}
      onPress={onPress}
      disabled={loading}
      activeOpacity={0.75}
    >
      {loading ? (
        <ActivityIndicator size="small" color="#EA4335" style={{ marginRight: 10 }} />
      ) : imgErr ? (
        <View style={{ width: 20, height: 20, borderRadius: 2, marginRight: 10, alignItems: "center", justifyContent: "center", backgroundColor: "#fff" }}>
          <Text style={{ fontSize: 14, fontWeight: "700", color: "#4285F4" }}>G</Text>
        </View>
      ) : (
        <Image
          source={{ uri: "https://developers.google.com/identity/images/g-logo.png" }}
          style={{ width: 20, height: 20, marginRight: 10 }}
          resizeMode="contain"
          onError={() => setImgErr(true)}
        />
      )}
      <Text style={s.googleBtnText}>{label}</Text>
    </TouchableOpacity>
  );
}

function FieldLabel({ text, isRTL }) {
  return (
    <Text style={[s.label, { textAlign: isRTL ? "right" : "left" }]}>{text}</Text>
  );
}

function FieldInput({
  isRTL = false,
  isPassword = false,
  showPassword = false,
  onTogglePassword,
  icon,
  extraStyle = {},
  hasError = false,
  ...props
}) {
  return (
    <View style={[s.inputWrap, extraStyle]}>
      {icon && (
        <View style={[s.inputIconWrap, { [isRTL ? "right" : "left"]: 12 }]} pointerEvents="none">
          <Ionicons name={icon} size={19} color="#9ca3af" />
        </View>
      )}
      <TextInput
        style={[s.input, {
          textAlign: isRTL ? "right" : "left",
          [isRTL ? "paddingRight" : "paddingLeft"]: icon ? 42 : 16,
          borderColor: hasError ? "#ef4444" : "#e5e7eb",
        }]}
        placeholderTextColor="#9ca3af"
        {...props}
      />
      {isPassword && (
        <TouchableOpacity
          style={[s.inputIconWrap, { [isRTL ? "left" : "right"]: 12 }]}
          onPress={onTogglePassword}
          activeOpacity={0.7}
        >
          <Ionicons name={showPassword ? "eye-off-outline" : "eye-outline"} size={19} color="#9ca3af" />
        </TouchableOpacity>
      )}
    </View>
  );
}

function SubmitButton({ label, onPress, disabled }) {
  return (
    <TouchableOpacity
      style={[s.submitBtn, { opacity: disabled ? 0.65 : 1 }]}
      onPress={onPress}
      disabled={disabled}
      activeOpacity={0.85}
    >
      <Text style={s.submitBtnText}>{label}</Text>
    </TouchableOpacity>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, paddingHorizontal: 28, paddingBottom: 40 },
  tabRow: { flexDirection: "row", borderBottomWidth: 1, borderBottomColor: "#e5e7eb", marginBottom: 20 },
  tabBtn: { flex: 1, paddingBottom: 12, alignItems: "center", position: "relative" },
  tabText: { fontSize: 16, fontWeight: "600", color: "#9ca3af" },
  tabTextActive: { color: "#16a34a" },
  tabUnderline: { position: "absolute", bottom: 0, left: 0, right: 0, height: 2, backgroundColor: "#16a34a" },
  errorBox: { flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: "#fef2f2", borderWidth: 1, borderColor: "#fecaca", borderRadius: 12, padding: 12, marginBottom: 14 },
  errorText: { color: "#dc2626", fontSize: 13, flex: 1, fontWeight: "500" },
  label: { fontSize: 14, color: "#374151", fontWeight: "500", marginBottom: 6, marginTop: 14 },
  inputWrap: { position: "relative", marginBottom: 0 },
  inputIconWrap: { position: "absolute", top: 0, bottom: 0, justifyContent: "center", zIndex: 5 },
  input: { borderWidth: 1, borderRadius: 12, paddingVertical: 13, paddingRight: 16, fontSize: 14, color: "#111827", backgroundColor: "#f9fafb" },
  submitBtn: { backgroundColor: "#16a34a", borderRadius: 50, paddingVertical: 15, alignItems: "center", marginBottom: 12 },
  submitBtnText: { color: "#fff", fontWeight: "700", fontSize: 16 },
  separator: { flexDirection: "row", alignItems: "center", gap: 10, marginVertical: 14 },
  sepLine: { flex: 1, height: 1, backgroundColor: "#e5e7eb" },
  sepText: { fontSize: 13, color: "#9ca3af", fontWeight: "500" },
  googleBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", borderWidth: 1.5, borderColor: "#e5e7eb", borderRadius: 50, paddingVertical: 13, paddingHorizontal: 24, backgroundColor: "#fff", marginBottom: 4 },
  googleBtnText: { color: "#374151", fontWeight: "600", fontSize: 14 },
  languageRow: { alignItems: "flex-end", marginTop: 16, marginBottom: 12 },
  languageBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: "#d1d5db", backgroundColor: "#f3f4f6", borderRadius: 999, paddingVertical: 6, paddingHorizontal: 14, alignSelf: "flex-end", shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.08, shadowRadius: 2, elevation: 2 },
  languageLabel: { fontSize: 12, color: "#374151", fontWeight: "600", marginRight: 8 },
  languageCode: { fontSize: 13, color: "#0f172a", fontWeight: "800" },
});