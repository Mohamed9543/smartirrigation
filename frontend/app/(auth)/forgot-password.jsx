import { useState } from "react";
import { View, Text, TextInput, TouchableOpacity, KeyboardAvoidingView, Platform, Alert, StyleSheet } from "react-native";
import { router } from "expo-router";
import { Logo } from "@components/Logo";
import { BackButton } from "@components/BackButton";
import { authAPI } from "@api/auth";
import { useLanguage } from "@context/LanguageContext";

export default function ForgotPasswordScreen() {
  const { t, isRTL } = useLanguage();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!email) { Alert.alert(t("common.errorTitle"), t("forgotPassword.emailRequired")); return; }
    setLoading(true);
    try {
      await authAPI.forgotPassword({ email });
      router.push({ pathname: "/(auth)/confirm-code", params: { email } });
    } catch (error) {
      Alert.alert(t("common.errorTitle"), error?.message || t("forgotPassword.unexpectedError"));
    } finally { setLoading(false); }
  };

  return (
    <KeyboardAvoidingView style={{ flex:1, backgroundColor:'#fff' }} behavior={Platform.OS === "ios" ? "padding" : "height"}>
      <View style={s.container}>
        <BackButton />
        <Logo />
        <Text style={[s.label, { textAlign: isRTL ? 'right' : 'left' }]}>{t("forgotPassword.emailLabel")}</Text>
        <TextInput
          style={[s.input, { textAlign: isRTL ? 'right' : 'left' }]}
          placeholder={t("forgotPassword.emailPlaceholder")}
          placeholderTextColor="#9ca3af"
          keyboardType="email-address"
          autoCapitalize="none"
          value={email}
          onChangeText={setEmail}
        />
        <TouchableOpacity style={[s.btn, { opacity: loading ? 0.7 : 1 }]} onPress={handleSubmit} disabled={loading}>
          <Text style={s.btnText}>{loading ? t("forgotPassword.submitLoading") : t("common.confirm")}</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  container: { flex:1, paddingHorizontal:32, paddingTop:56, paddingBottom:32 },
  label: { fontSize:14, color:'#374151', fontWeight:'500', marginBottom:4 },
  input: { borderWidth:1, borderColor:'#d1d5db', borderRadius:12, paddingHorizontal:16, paddingVertical:12, marginBottom:40, color:'#1f2937', backgroundColor:'#f9fafb' },
  btn: { backgroundColor:'#22c55e', borderRadius:99, paddingVertical:16, alignItems:'center' },
  btnText: { color:'#fff', fontWeight:'700', fontSize:16 },
});

