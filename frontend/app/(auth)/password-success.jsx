import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { router } from "expo-router";
import { useLanguage } from "@context/LanguageContext";

export default function PasswordSuccessScreen() {
  const { t } = useLanguage();
  return (
    <View style={s.container}>
      <View style={s.circle}>
        <Text style={s.ok}>OK</Text>
      </View>
      <Text style={s.title}>{t("passwordSuccess.title")}</Text>
      <Text style={s.line}>{t("passwordSuccess.line1")}</Text>
      <Text style={s.line}>{t("passwordSuccess.line2")}</Text>
      <TouchableOpacity style={s.btn} onPress={() => router.replace("/(auth)/login")}>
        <Text style={s.btnText}>{t("passwordSuccess.continue")}</Text>
      </TouchableOpacity>
    </View>
  );
}
const s = StyleSheet.create({
  container: { flex:1, backgroundColor:'#fff', alignItems:'center', justifyContent:'center', paddingHorizontal:32 },
  circle: { width:112, height:112, borderRadius:56, backgroundColor:'#86efac', alignItems:'center', justifyContent:'center', marginBottom:32 },
  ok: { fontSize:36, color:'#15803d', fontWeight:'700' },
  title: { fontSize:24, fontWeight:'700', color:'#1f2937', marginBottom:12, textAlign:'center' },
  line: { fontSize:16, color:'#6b7280', textAlign:'center', marginBottom:4 },
  btn: { backgroundColor:'#22c55e', borderRadius:99, paddingVertical:16, paddingHorizontal:32, alignItems:'center', marginTop:56, width:'100%' },
  btnText: { color:'#fff', fontWeight:'700', fontSize:16 },
});
