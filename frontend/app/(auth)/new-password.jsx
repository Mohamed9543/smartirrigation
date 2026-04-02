import { useState } from "react";
import { View, Text, TextInput, TouchableOpacity, KeyboardAvoidingView, Platform, Alert, StyleSheet } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { BackButton } from "@components/BackButton";
import { authAPI } from "@api/auth";
import { useLanguage } from "@context/LanguageContext";

export default function NewPasswordScreen() {
  const { t, isRTL } = useLanguage();
  const { email, code } = useLocalSearchParams();
  const safeEmail = Array.isArray(email) ? email[0] : email;
  const safeCode = Array.isArray(code) ? code[0] : code;
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!password || !confirmPassword) { Alert.alert(t("common.errorTitle"), t("newPassword.fillFields")); return; }
    if (password !== confirmPassword) { Alert.alert(t("common.errorTitle"), t("newPassword.mismatch")); return; }
    if (password.length < 8) { Alert.alert(t("common.errorTitle"), t("newPassword.minLength")); return; }
    setLoading(true);
    try {
      await authAPI.resetPassword({ email: safeEmail, code: safeCode, newPassword: password });
      router.replace("/(auth)/password-success");
    } catch (error) {
      Alert.alert(t("common.errorTitle"), error?.message || t("newPassword.unexpectedError"));
    } finally { setLoading(false); }
  };

  return (
    <KeyboardAvoidingView style={{ flex:1, backgroundColor:'#fff' }} behavior={Platform.OS === "ios" ? "padding" : "height"}>
      <View style={s.container}>
        <BackButton />
        <Text style={s.title}>{t("newPassword.title")}</Text>
        <Text style={s.label}>{t("newPassword.createPassword")}</Text>
        <View style={s.inputWrap}>
          <TextInput style={[s.input, { textAlign: isRTL ? 'right' : 'left' }]} placeholder="........" placeholderTextColor="#9ca3af" secureTextEntry={!showPassword} value={password} onChangeText={setPassword} />
          <TouchableOpacity style={s.eye} onPress={() => setShowPassword(p => !p)}>
            <Ionicons name={showPassword ? "eye-off-outline" : "eye-outline"} size={20} color="#6b7280" />
          </TouchableOpacity>
        </View>
        <Text style={s.label}>{t("newPassword.confirmPassword")}</Text>
        <View style={[s.inputWrap, { marginBottom: 40 }]}>
          <TextInput style={[s.input, { textAlign: isRTL ? 'right' : 'left' }]} placeholder="........" placeholderTextColor="#9ca3af" secureTextEntry={!showConfirm} value={confirmPassword} onChangeText={setConfirmPassword} />
          <TouchableOpacity style={s.eye} onPress={() => setShowConfirm(p => !p)}>
            <Ionicons name={showConfirm ? "eye-off-outline" : "eye-outline"} size={20} color="#6b7280" />
          </TouchableOpacity>
        </View>
        <TouchableOpacity style={[s.btn, { opacity: loading ? 0.7 : 1 }]} onPress={handleSubmit} disabled={loading}>
          <Text style={s.btnText}>{loading ? t("newPassword.submitLoading") : t("common.confirm")}</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}
const s = StyleSheet.create({
  container: { flex:1, paddingHorizontal:32, paddingTop:56, paddingBottom:32 },
  title: { fontSize:24, fontWeight:'700', color:'#1f2937', marginBottom:32 },
  label: { fontSize:14, color:'#374151', fontWeight:'500', marginBottom:4 },
  inputWrap: { position:'relative', marginBottom:24 },
  input: { borderWidth:1, borderColor:'#d1d5db', borderRadius:12, paddingHorizontal:16, paddingVertical:12, paddingRight:48, color:'#1f2937', backgroundColor:'#f9fafb' },
  eye: { position:'absolute', right:12, top:0, bottom:0, justifyContent:'center' },
  btn: { backgroundColor:'#22c55e', borderRadius:99, paddingVertical:16, alignItems:'center' },
  btnText: { color:'#fff', fontWeight:'700', fontSize:16 },
});

