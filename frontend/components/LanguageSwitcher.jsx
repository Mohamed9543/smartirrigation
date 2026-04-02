import { useState } from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { LANGUAGE_OPTIONS, useLanguage } from "@context/LanguageContext";

export function LanguageSwitcher() {
  const [isOpen, setIsOpen] = useState(false);
  const { language, setLanguage } = useLanguage();
  const current = LANGUAGE_OPTIONS.find(o => o.code === language);
  return (
    <View style={s.container}>
      <TouchableOpacity style={s.trigger} onPress={() => setIsOpen(p => !p)} activeOpacity={0.85}>
        <MaterialCommunityIcons name="translate" size={18} color="#374151" style={{ marginRight:8 }} />
        <Text style={s.triggerText}>{current?.short || "FR"}</Text>
        <Text style={s.arrow}>{isOpen ? "▲" : "▼"}</Text>
      </TouchableOpacity>
      {isOpen && (
        <View style={s.dropdown}>
          {LANGUAGE_OPTIONS.map(option => {
            const active = language === option.code;
            return (
              <TouchableOpacity key={option.code} style={[s.option, active && s.optionActive]} onPress={() => { setLanguage(option.code); setIsOpen(false); }} activeOpacity={0.8}>
                <Text style={[s.optionText, active && s.optionTextActive]}>{option.label}</Text>
                {active && <Text style={{ color:'#16a34a', fontWeight:'700' }}>✓</Text>}
              </TouchableOpacity>
            );
          })}
        </View>
      )}
    </View>
  );
}
const s = StyleSheet.create({
  container: { position:'absolute', right:16, top:58, zIndex:50 },
  trigger: { flexDirection:'row', alignItems:'center', paddingHorizontal:12, paddingVertical:8, borderRadius:16, borderWidth:1, borderColor:'#e5e7eb', backgroundColor:'rgba(255,255,255,0.95)' },
  triggerText: { fontSize:12, fontWeight:'600', color:'#374151' },
  arrow: { fontSize:10, color:'#9ca3af', marginLeft:4 },
  dropdown: { marginTop:8, borderRadius:16, borderWidth:1, borderColor:'#e5e7eb', backgroundColor:'#fff', overflow:'hidden' },
  option: { paddingHorizontal:12, paddingVertical:10, flexDirection:'row', alignItems:'center', justifyContent:'space-between' },
  optionActive: { backgroundColor:'#f0fdf4' },
  optionText: { fontSize:14, color:'#374151' },
  optionTextActive: { color:'#15803d', fontWeight:'600' },
});
