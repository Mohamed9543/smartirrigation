import { useState, useRef } from "react";
import { View, Text, TextInput, TouchableOpacity, Alert, StyleSheet } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { Logo } from "@components/Logo";
import { BackButton } from "@components/BackButton";
import { authAPI } from "@api/auth";
import { useLanguage } from "@context/LanguageContext";

export default function ConfirmCodeScreen() {
  const { t } = useLanguage();
  const { email } = useLocalSearchParams();
  const safeEmail = Array.isArray(email) ? email[0] : email;
  const [code, setCode] = useState(["", "", "", "", "", ""]);
  const [loading, setLoading] = useState(false);
  const inputs = useRef([]);

  const handleChange = (text, index) => {
    const newCode = [...code];
    newCode[index] = text;
    setCode(newCode);
    if (text && index < 5) inputs.current[index + 1]?.focus();
  };

  const handleKeyPress = (event, index) => {
    if (event?.nativeEvent?.key === "Backspace" && !code[index] && index > 0) inputs.current[index - 1]?.focus();
  };

  const handleSubmit = async () => {
    const fullCode = code.join("");
    if (!safeEmail) { Alert.alert(t("common.errorTitle"), t("confirmCode.emailMissing")); return; }
    if (fullCode.length < 6) { Alert.alert(t("common.errorTitle"), t("confirmCode.codeIncomplete")); return; }
    setLoading(true);
    try {
      await authAPI.verifyCode({ email: safeEmail, code: fullCode });
      router.push({ pathname: "/(auth)/new-password", params: { email: safeEmail, code: fullCode } });
    } catch (error) {
      Alert.alert(t("common.errorTitle"), error?.message || t("confirmCode.invalidCode"));
    } finally { setLoading(false); }
  };

  return (
    <View style={s.container}>
      <BackButton />
      <Logo />
      <Text style={s.subtitle}>{t("confirmCode.title")}</Text>
      <View style={s.codeRow}>
        {code.map((digit, index) => (
          <TextInput
            key={index}
            ref={ref => { inputs.current[index] = ref; }}
            style={[s.codeInput, { borderColor: digit ? '#22c55e' : '#d1d5db' }]}
            maxLength={1}
            keyboardType="number-pad"
            value={digit}
            onChangeText={text => handleChange(text, index)}
            onKeyPress={event => handleKeyPress(event, index)}
          />
        ))}
      </View>
      <TouchableOpacity style={[s.btn, { opacity: loading ? 0.7 : 1 }]} onPress={handleSubmit} disabled={loading}>
        <Text style={s.btnText}>{loading ? t("confirmCode.submitLoading") : t("common.confirm")}</Text>
      </TouchableOpacity>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex:1, backgroundColor:'#fff', paddingHorizontal:32, paddingTop:56, paddingBottom:32 },
  subtitle: { fontSize:16, color:'#4b5563', textAlign:'center', marginBottom:40 },
  codeRow: { flexDirection:'row', justifyContent:'center', gap:10, marginBottom:56 },
  codeInput: { width:48, height:56, borderRadius:12, textAlign:'center', fontSize:24, fontWeight:'700', color:'#1f2937', borderWidth:2, backgroundColor:'#f9fafb' },
  btn: { backgroundColor:'#22c55e', borderRadius:99, paddingVertical:16, alignItems:'center' },
  btnText: { color:'#fff', fontWeight:'700', fontSize:16 },
});

