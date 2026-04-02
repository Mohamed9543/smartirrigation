// app/(admin)/addculture.jsx
import { useState, useEffect, useRef, useCallback } from "react";
import { View, Text, TextInput, TouchableOpacity, ScrollView, ActivityIndicator, StyleSheet, Modal, Platform } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { AdminShell } from "@components/AdminShell";
import { API_ENDPOINTS, apiFetch } from "@api/client";
import { useLanguage } from "@context/LanguageContext";

const KC_CULTURES = [
  { nom: "Orange", variete: "Navel Washington", type: "agrume" },
  { nom: "Citron", variete: "Eureka / Lisbon", type: "agrume" },
  { nom: "Mandarine", variete: "Clémentine", type: "agrume" },
  { nom: "Pamplemousse", variete: "Standard", type: "agrume" },
  { nom: "Olivier", variete: "Chemlali / Chetoui", type: "fruit" },
  { nom: "Grenadier", variete: "Standard", type: "fruit" },
  { nom: "Figuier", variete: "Standard", type: "fruit" },
  { nom: "Pommier", variete: "Golden / Red", type: "fruit" },
  { nom: "Poirier", variete: "Williams / Conference", type: "fruit" },
  { nom: "Pêcher", variete: "Standard", type: "fruit" },
  { nom: "Abricotier", variete: "Standard", type: "fruit" },
  { nom: "Vigne", variete: "Table / Vin", type: "fruit" },
  { nom: "Dattier", variete: "Deglet Nour", type: "fruit" },
  { nom: "Tomate", variete: "Cœur de bœuf / Ronde", type: "legume" },
  { nom: "Pomme de terre", variete: "Standard", type: "legume" },
  { nom: "Poivron", variete: "Standard", type: "legume" },
  { nom: "Oignon", variete: "Standard", type: "legume" },
  { nom: "Concombre", variete: "Standard", type: "legume" },
  { nom: "Courgette", variete: "Standard", type: "legume" },
  { nom: "Laitue", variete: "Standard", type: "legume" },
  { nom: "Haricot", variete: "Standard", type: "legume" },
  { nom: "Melon", variete: "Standard", type: "legume" },
  { nom: "Artichaut", variete: "Standard", type: "legume" },
  { nom: "Blé", variete: "Dur / Tendre", type: "cereale" },
  { nom: "Orge", variete: "Standard", type: "cereale" },
  { nom: "Maïs", variete: "Standard", type: "cereale" },
  { nom: "Tournesol", variete: "Standard", type: "cereale" },
];

const COLORS = {
  green: "#22c55e", greenDark: "#16a34a", greenSoft: "#e8f8ed", greenBorder: "#bbf7d0",
  text: "#111827", muted: "#6b7280", border: "#edf1f0", surface: "#ffffff",
  danger: "#ef4444", dangerSoft: "#fee2e2", dangerBorder: "#fca5a5",
  sectionBg: "#f9fafb", sectionBorder: "#e5e7eb",
  amber: "#f59e0b", amberSoft: "#fffbeb", amberBorder: "#fde68a",
};

const DEFAULT_KC_STADES = { ini: "", dev: "", mid: "", late: "" };

const TYPE_COLORS = {
  agrume:  { bg: "#fff7ed", border: "#fed7aa", text: "#c2410c" },
  fruit:   { bg: "#fdf2f8", border: "#f0abfc", text: "#86198f" },
  legume:  { bg: "#f0fdf4", border: "#bbf7d0", text: "#15803d" },
  cereale: { bg: "#fefce8", border: "#fde047", text: "#a16207" },
};
const TYPE_ICONS = { agrume: "🍊", fruit: "🍎", legume: "🥬", cereale: "🌾" };

function AutocompleteInput({ label, required, value, onChangeText, onSelectSuggestion, placeholder, suggestions, zIndex = 10, error }) {
  const [showList, setShowList] = useState(false);
  const filtered = suggestions.filter(s => s.toLowerCase().includes((value || "").toLowerCase()));
  const showSuggestions = showList && filtered.length > 0;
  return (
    <View style={[acS.wrap, { zIndex }]}>
      <Text style={acS.label}>{label}{required && <Text style={{ color: COLORS.danger }}> *</Text>}</Text>
      <View style={[acS.inputRow, error && acS.inputRowError]}>
        <TextInput style={acS.input} placeholder={placeholder} placeholderTextColor={COLORS.muted} value={value}
          onChangeText={v => { onChangeText(v); setShowList(true); }}
          onFocus={() => setShowList(true)} onBlur={() => setTimeout(() => setShowList(false), 180)} />
        <TouchableOpacity style={acS.chevron} onPress={() => setShowList(v => !v)} activeOpacity={0.7}>
          <Ionicons name={showList ? "chevron-up" : "chevron-down"} size={18} color={COLORS.muted} />
        </TouchableOpacity>
      </View>
      {error && <Text style={acS.errorText}>{error}</Text>}
      {showSuggestions && (
        <View style={acS.dropdown}>
          <ScrollView keyboardShouldPersistTaps="always" style={{ maxHeight: 180 }}>
            {filtered.map((item, i) => (
              <TouchableOpacity key={i} style={[acS.item, item === value && acS.itemActive]}
                onPress={() => { onSelectSuggestion(item); setShowList(false); }} activeOpacity={0.8}>
                <Text style={[acS.itemText, item === value && acS.itemTextActive]}>{item}</Text>
                {item === value && <Ionicons name="checkmark" size={16} color={COLORS.greenDark} />}
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}
    </View>
  );
}

const acS = StyleSheet.create({
  wrap: { marginBottom: 16, position: "relative" },
  label: { fontSize: 13, fontWeight: "600", color: COLORS.text, marginBottom: 6 },
  inputRow: { flexDirection: "row", alignItems: "center", borderWidth: 1, borderColor: COLORS.border, borderRadius: 10, backgroundColor: COLORS.surface, height: 48 },
  inputRowError: { borderColor: COLORS.danger, backgroundColor: COLORS.dangerSoft },
  input: { flex: 1, fontSize: 15, color: COLORS.text, paddingHorizontal: 14 },
  chevron: { paddingHorizontal: 12 },
  errorText: { fontSize: 12, color: COLORS.danger, marginTop: 4 },
  dropdown: { position: "absolute", top: 78, left: 0, right: 0, backgroundColor: "#fff", borderWidth: 1, borderColor: "#e5e7eb", borderRadius: 10, shadowColor: "#000", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.12, shadowRadius: 8, elevation: 10, zIndex: 999 },
  item: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 14, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: "#f3f4f6" },
  itemActive: { backgroundColor: "#f0fdf4" },
  itemText: { fontSize: 14, color: "#374151" },
  itemTextActive: { color: COLORS.greenDark, fontWeight: "700" },
});

function StatusBanner({ status, message, kcInfo, isNewCulture, onDismiss, t }) {
  if (!status) return null;
  const isSuccess = status === "success";
  return (
    <View style={[banner.wrap, isSuccess ? banner.wrapSuccess : banner.wrapError]}>
      <View style={banner.row}>
        <View style={[banner.iconBox, isSuccess ? banner.iconBoxSuccess : banner.iconBoxError]}>
          <Ionicons name={isSuccess ? "checkmark-circle" : "close-circle"} size={22} color={isSuccess ? COLORS.greenDark : COLORS.danger} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[banner.title, isSuccess ? banner.titleSuccess : banner.titleError]}>
            {isSuccess ? t("admin.addCultureSuccess") : t("admin.addCultureFail")}
          </Text>
          <Text style={banner.message}>{message}</Text>
        </View>
        <TouchableOpacity onPress={onDismiss}><Ionicons name="close" size={18} color={COLORS.muted} /></TouchableOpacity>
      </View>
      {isSuccess && isNewCulture && (
        <View style={banner.newKcBadge}>
          <Ionicons name="add-circle-outline" size={16} color={COLORS.amber} />
          <Text style={banner.newKcBadgeText}>{t("admin.addCultureNewKc")}</Text>
        </View>
      )}
      {isSuccess && kcInfo && (
        <View style={banner.kcBox}>
          <View style={banner.kcRow}>
            <Text style={banner.kcLabel}>{t("admin.addCultureKcActuel")}</Text>
            <Text style={banner.kcValue}>{kcInfo.kc ?? "—"}</Text>
          </View>
          <View style={banner.kcRow}>
            <Text style={banner.kcLabel}>{t("admin.addCultureStade")}</Text>
            <Text style={banner.kcValue}>{kcInfo.stade ?? "—"}</Text>
          </View>
        </View>
      )}
      {isSuccess && (
        <TouchableOpacity style={banner.goBtn} onPress={() => router.push("/(tabs)/cultures")} activeOpacity={0.85}>
          <Ionicons name="leaf" size={16} color="#fff" />
          <Text style={banner.goBtnText}>{t("admin.addCultureSeeAll")}</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const banner = StyleSheet.create({
  wrap: { borderRadius: 14, borderWidth: 1, padding: 14, gap: 12 },
  wrapSuccess: { backgroundColor: COLORS.greenSoft, borderColor: COLORS.greenBorder },
  wrapError: { backgroundColor: COLORS.dangerSoft, borderColor: COLORS.dangerBorder },
  row: { flexDirection: "row", alignItems: "flex-start", gap: 10 },
  iconBox: { width: 36, height: 36, borderRadius: 18, alignItems: "center", justifyContent: "center" },
  iconBoxSuccess: { backgroundColor: "#dcfce7" }, iconBoxError: { backgroundColor: "#fee2e2" },
  title: { fontSize: 14, fontWeight: "700", marginBottom: 2 },
  titleSuccess: { color: COLORS.greenDark }, titleError: { color: COLORS.danger },
  message: { fontSize: 12, color: COLORS.muted, lineHeight: 17 },
  newKcBadge: { flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: COLORS.amberSoft, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 8, borderWidth: 1, borderColor: COLORS.amberBorder },
  newKcBadgeText: { fontSize: 12, color: COLORS.amber, fontWeight: "600" },
  kcBox: { backgroundColor: "#fff", borderRadius: 10, borderWidth: 1, borderColor: COLORS.greenBorder },
  kcRow: { flexDirection: "row", justifyContent: "space-between", paddingHorizontal: 12, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: COLORS.greenBorder },
  kcLabel: { fontSize: 12, color: COLORS.muted }, kcValue: { fontSize: 12, fontWeight: "700", color: COLORS.text },
  goBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, backgroundColor: COLORS.greenDark, borderRadius: 10, paddingVertical: 11 },
  goBtnText: { fontSize: 13, fontWeight: "700", color: "#fff" },
});

function ConfirmModal({ visible, title, message, onConfirm, onCancel, t }) {
  if (!visible) return null;
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
      <SafeAreaView style={{ flex:1, backgroundColor:"rgba(0,0,0,0.4)", alignItems:"center", justifyContent:"center", paddingHorizontal:24 }} edges={["top","left","right","bottom"]}>
        <View style={{ backgroundColor:"#fff", borderRadius:20, padding:28, width:"100%", maxWidth:400, shadowColor:"#000", shadowOffset:{width:0,height:8}, shadowOpacity:0.2, shadowRadius:24, elevation:12 }}>
          <View style={{ width:52, height:52, borderRadius:26, backgroundColor:"#fef2f2", alignItems:"center", justifyContent:"center", alignSelf:"center", marginBottom:16 }}>
            <Ionicons name="trash-outline" size={26} color="#ef4444" />
          </View>
          <Text style={{ fontSize:17, fontWeight:"700", color:"#111827", textAlign:"center", marginBottom:8 }}>{title}</Text>
          <Text style={{ fontSize:14, color:"#6b7280", textAlign:"center", marginBottom:24, lineHeight:20 }}>{message}</Text>
          <View style={{ flexDirection:"row", gap:10 }}>
            <TouchableOpacity style={{ flex:1, paddingVertical:13, borderRadius:12, borderWidth:1, borderColor:"#e5e7eb", alignItems:"center", backgroundColor:"#f9fafb" }} onPress={onCancel} activeOpacity={0.8}>
              <Text style={{ fontSize:14, fontWeight:"600", color:"#374151" }}>{t("cultures.modal.cancel")}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={{ flex:1, paddingVertical:13, borderRadius:12, alignItems:"center", backgroundColor:"#ef4444" }} onPress={onConfirm} activeOpacity={0.85}>
              <Text style={{ fontSize:14, fontWeight:"700", color:"#fff" }}>{t("cultures.modal.delete")}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </SafeAreaView>
    </Modal>
  );
}

function Toast({ message, type = "success", visible }) {
  if (!visible) return null;
  const bg = type === "success" ? "#16a34a" : "#ef4444";
  const icon = type === "success" ? "checkmark-circle" : "close-circle";
  return (
    <View style={{ position:"absolute", top:16, right:16, zIndex:9999, backgroundColor:bg, borderRadius:12, paddingHorizontal:14, paddingVertical:10, flexDirection:"row", alignItems:"center", gap:8, maxWidth:300, shadowColor:"#000", shadowOffset:{width:0,height:4}, shadowOpacity:0.2, shadowRadius:8, elevation:10 }}>
      <Ionicons name={icon} size={16} color="#fff" />
      <Text style={{ color:"#fff", fontSize:13, fontWeight:"600", flexShrink:1 }}>{message}</Text>
    </View>
  );
}

export default function AddCulturePage() {
  const { isRTL, t } = useLanguage();
  const [activeTab, setActiveTab] = useState("add");
  const [nomSuggestions, setNomSuggestions] = useState([]);
  const [allVarietes, setAllVarietes] = useState([]);
  const [loadingSuggestions, setLoadingSuggestions] = useState(true);
  const [nom, setNom] = useState("");
  const [variete, setVariete] = useState("");
  const [kcMode, setKcMode] = useState("auto");
  const [kcStades, setKcStades] = useState({ ...DEFAULT_KC_STADES });
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [submitStatus, setSubmitStatus] = useState(null);
  const [submitMessage, setSubmitMessage] = useState("");
  const [kcInfo, setKcInfo] = useState(null);
  const [isNewCulture, setIsNewCulture] = useState(false);
  const [kcList, setKcList] = useState([]);
  const [loadingKcList, setLoadingKcList] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const [searchFilter, setSearchFilter] = useState("");
  const [confirm, setConfirm] = useState({ visible: false, item: null });
  const [toast, setToast] = useState({ visible: false, message: "", type: "success" });
  const toastTimer = useRef(null);

  const showToast = useCallback((message, type = "success") => {
    if (toastTimer.current) clearTimeout(toastTimer.current);
    setToast({ visible: true, message, type });
    toastTimer.current = setTimeout(() => setToast(p => ({ ...p, visible: false })), 3000);
  }, []);

  const loadSuggestions = async () => {
    try {
      setLoadingSuggestions(true);
      const res = await apiFetch(API_ENDPOINTS.kc.search);
      if (res.ok) {
        const result = await res.json();
        if (result.success && Array.isArray(result.data)) {
          setNomSuggestions([...new Set(result.data.map(item => item.culture))].sort());
          setAllVarietes([...new Set(result.data.map(item => item.variete || "Standard"))].sort());
        }
      }
    } catch (e) { console.error("Failed to load suggestions", e); }
    finally { setLoadingSuggestions(false); }
  };

  const loadKcList = async () => {
    try {
      setLoadingKcList(true);
      const res = await apiFetch(API_ENDPOINTS.kc.search);
      if (res.ok) {
        const result = await res.json();
        if (result.success && Array.isArray(result.data))
          setKcList(result.data.sort((a, b) => a.culture.localeCompare(b.culture)));
      }
    } catch (e) { console.error("Failed to load KC list", e); }
    finally { setLoadingKcList(false); }
  };

  useEffect(() => { loadSuggestions(); }, []);
  useEffect(() => { if (activeTab === "manage") loadKcList(); }, [activeTab]);

  const handleDeleteKc = (item) => { if (!item?._id) return; setConfirm({ visible: true, item }); };

  const doConfirmedDeleteKc = async () => {
    const item = confirm.item;
    setConfirm({ visible: false, item: null });
    if (!item?._id) return;
    setDeletingId(item._id);
    try {
      const AsyncStorage = (await import("@react-native-async-storage/async-storage")).default;
      const adminToken = await AsyncStorage.getItem("adminToken");
      if (!adminToken) { showToast(t("admin.tokenMissing"), "error"); return; }
      const res = await fetch(API_ENDPOINTS.kc.delete(item._id), {
        method: "DELETE",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${adminToken}` },
      });
      let data = {};
      try { data = await res.json(); } catch {}
      if (res.ok && data?.success !== false) {
        setKcList(prev => prev.filter(c => c._id !== item._id));
        loadSuggestions();
        showToast(`"${item.culture}" ${t("admin.deleteKcSuccess")}`, "success");
      } else {
        showToast(data?.error || data?.message || `Erreur HTTP ${res.status}`, "error");
      }
    } catch (e) {
      showToast(e.message || t("cultures.modal.errorServer"), "error");
    } finally { setDeletingId(null); }
  };

  const handleNomSelect = (selected) => {
    setNom(selected);
    const found = KC_CULTURES.find(c => c.nom.toLowerCase() === selected.toLowerCase());
    if (found) setVariete(found.variete);
    if (errors.nom) setErrors(prev => ({ ...prev, nom: null }));
  };

  const handleNomChange = (value) => {
    setNom(value);
    const found = KC_CULTURES.find(c => c.nom.toLowerCase() === value.trim().toLowerCase());
    if (found) setVariete(found.variete);
    if (errors.nom) setErrors(prev => ({ ...prev, nom: null }));
  };

  const updateKcStade = (stade, value) => setKcStades(prev => ({ ...prev, [stade]: value }));
  const dismissBanner = () => { setSubmitStatus(null); setSubmitMessage(""); setKcInfo(null); setIsNewCulture(false); };

  const validateForm = () => {
    const newErrors = {};
    if (!nom.trim())     newErrors.nom     = t("cultures.modal.nomRequired");
    if (!variete.trim()) newErrors.variete = t("cultures.modal.varietyRequired");
    if (kcMode === "stades") {
      const allFilled = Object.values(kcStades).every(v => v !== "" && !isNaN(parseFloat(v)));
      if (!allFilled) newErrors.kcStades = t("admin.kcStadesRequired");
      else if (Object.values(kcStades).some(v => parseFloat(v) < 0 || parseFloat(v) > 3))
        newErrors.kcStades = t("admin.kcStadesRange");
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;
    dismissBanner(); setLoading(true);
    try {
      const nomTrimmed = nom.trim(), varieteTrimmed = variete.trim();
      const cultureType = KC_CULTURES.find(c => c.nom.toLowerCase() === nomTrimmed.toLowerCase())?.type || "legume";
      const stadesFAO = kcMode === "stades"
        ? [
            { nom: "Initial",       kc: parseFloat(kcStades.ini),  periode: { debut: 1,  fin: 3  } },
            { nom: "Développement", kc: parseFloat(kcStades.dev),  periode: { debut: 4,  fin: 6  } },
            { nom: "Mi-saison",     kc: parseFloat(kcStades.mid),  periode: { debut: 7,  fin: 9  } },
            { nom: "Fin saison",    kc: parseFloat(kcStades.late), periode: { debut: 10, fin: 12 } },
          ]
        : [{ nom: "Annuel", kc: 0.65, periode: { debut: 1, fin: 12 } }];
      const kcMoyen = stadesFAO.reduce((sum, s) => sum + s.kc, 0) / stadesFAO.length;
      const kcResponse = await apiFetch(API_ENDPOINTS.kc.add, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          culture: nomTrimmed, aliases: [nomTrimmed.toLowerCase(), nomTrimmed],
          variete: varieteTrimmed, type: cultureType, stades: stadesFAO,
          kcMoyen: parseFloat(kcMoyen.toFixed(3)),
          references: { fao: false, source: "Ajouté par l'administrateur", notes: `Ajouté le ${new Date().toLocaleDateString("fr-FR")}` },
        }),
      });
      const kcResult = await kcResponse.json();
      if (kcResponse.ok && kcResult.success) {
        const currentMonth = new Date().getMonth() + 1;
        const currentStade = stadesFAO.find(s => currentMonth >= s.periode.debut && currentMonth <= s.periode.fin) || stadesFAO[0];
        setKcInfo({ kc: currentStade?.kc ?? kcMoyen.toFixed(2), stade: currentStade?.nom ?? "—" });
        setIsNewCulture(true); setSubmitStatus("success");
        setSubmitMessage(`"${nomTrimmed}" ${t("admin.addCultureInfo")}`);
        setNom(""); setVariete(""); setKcStades({ ...DEFAULT_KC_STADES }); setKcMode("auto");
        loadSuggestions();
        if (activeTab === "manage") loadKcList();
      } else {
        setSubmitStatus("error");
        setSubmitMessage(kcResult.error || t("cultures.modal.errorAdd"));
      }
    } catch (err) {
      setSubmitStatus("error"); setSubmitMessage(t("cultures.modal.errorServer"));
    } finally { setLoading(false); }
  };

  const renderKcModeTabs = () => (
    <View style={styles.kcModeTabs}>
      {[{ key: "auto", icon: "flash-outline", labelKey: "admin.kcModeAuto" },
        { key: "stades", icon: "leaf-outline", labelKey: "admin.kcModeStades" }].map(({ key, icon, labelKey }) => (
        <TouchableOpacity key={key} style={[styles.kcModeTab, kcMode === key && styles.kcModeTabActive]} onPress={() => setKcMode(key)}>
          <Ionicons name={icon} size={16} color={kcMode === key ? COLORS.greenDark : COLORS.muted} />
          <Text style={[styles.kcModeTabText, kcMode === key && styles.kcModeTabTextActive]}>{t(labelKey)}</Text>
        </TouchableOpacity>
      ))}
    </View>
  );

  const STADES_KEYS = [
    { key: "ini",  labelKey: "admin.kcStadeIni"  },
    { key: "dev",  labelKey: "admin.kcStadeDev"  },
    { key: "mid",  labelKey: "admin.kcStadeMid"  },
    { key: "late", labelKey: "admin.kcStadeLate" },
  ];

  const renderKcStades = () => (
    <View style={styles.kcSection}>
      <Text style={styles.kcSectionTitle}>{t("admin.kcStadesTitle")}</Text>
      {STADES_KEYS.map(({ key, labelKey }) => (
        <View key={key} style={styles.kcStadeRow}>
          <View style={styles.kcStadeLabelBox}>
            <Ionicons name="leaf-outline" size={14} color={COLORS.greenDark} />
            <Text style={styles.kcStadeLabel}>{t(labelKey)}</Text>
          </View>
          <TextInput style={styles.kcStadeInput} value={kcStades[key]}
            onChangeText={v => updateKcStade(key, v)} placeholder="0.00" keyboardType="numeric" textAlign="center" />
        </View>
      ))}
      {errors.kcStades && <Text style={styles.errorText}>{errors.kcStades}</Text>}
    </View>
  );

  const renderKcAuto = () => (
    <View style={styles.kcSection}>
      <View style={styles.kcAutoRow}>
        <Ionicons name="flash" size={20} color={COLORS.greenDark} />
        <View style={{ flex: 1 }}>
          <Text style={styles.kcAutoTitle}>{t("admin.kcAutoTitle")}</Text>
          <Text style={{ fontSize: 11, color: COLORS.muted, marginTop: 2 }}>{t("admin.kcAutoDesc")}</Text>
        </View>
      </View>
    </View>
  );

  const filteredKcList = kcList.filter(item =>
    item.culture.toLowerCase().includes(searchFilter.toLowerCase()) ||
    (item.type || "").toLowerCase().includes(searchFilter.toLowerCase())
  );

  const renderManageTab = () => (
    <View style={{ flex: 1, paddingBottom: 40 }}>
      <View style={styles.searchBar}>
        <Ionicons name="search-outline" size={18} color={COLORS.muted} />
        <TextInput style={styles.searchInput} placeholder={t("admin.searchCulture")}
          placeholderTextColor={COLORS.muted} value={searchFilter} onChangeText={setSearchFilter} />
        {searchFilter.length > 0 && (
          <TouchableOpacity onPress={() => setSearchFilter("")}>
            <Ionicons name="close-circle" size={18} color={COLORS.muted} />
          </TouchableOpacity>
        )}
      </View>
      <View style={styles.listMeta}>
        <Text style={styles.listMetaText}>
          {filteredKcList.length} {filteredKcList.length > 1 ? t("admin.cultures2") : t("admin.cultures1")}
          {searchFilter ? " " + (filteredKcList.length > 1 ? t("admin.foundPlural") : t("admin.foundSingle")) : " " + t("admin.inKcBase")}
        </Text>
        <TouchableOpacity onPress={loadKcList} style={styles.refreshBtn}>
          <Ionicons name="refresh-outline" size={15} color={COLORS.greenDark} />
        </TouchableOpacity>
      </View>
      {loadingKcList ? (
        <View style={styles.centerLoader}>
          <ActivityIndicator size="large" color={COLORS.green} />
          <Text style={styles.loaderText}>{t("admin.loadingKc")}</Text>
        </View>
      ) : filteredKcList.length === 0 ? (
        <View style={styles.emptyState}>
          <Ionicons name="leaf-outline" size={48} color={COLORS.border} />
          <Text style={styles.emptyText}>{t("admin.noCultureFound")}</Text>
        </View>
      ) : (
        filteredKcList.map((item) => {
          const tc = TYPE_COLORS[item.type] || TYPE_COLORS.legume;
          const isDeleting = deletingId === item._id;
          return (
            <View key={item._id || item.culture} style={styles.kcCard}>
              <View style={{ flex: 1 }}>
                <View style={styles.kcCardTop}>
                  <Text style={styles.kcCardNom}>{item.culture}</Text>
                  <View style={[styles.typeBadge, { backgroundColor: tc.bg, borderColor: tc.border }]}>
                    <Text style={[styles.typeBadgeText, { color: tc.text }]}>{TYPE_ICONS[item.type] || "🌿"} {item.type || "—"}</Text>
                  </View>
                </View>
                <Text style={styles.kcCardVariete}>
                  {item.variete || "—"}  ·  Kc moy. {item.kcMoyen?.toFixed(2) ?? "—"}  ·  {item.stades?.length ?? 0} stade{item.stades?.length > 1 ? "s" : ""}
                </Text>
                {item.references?.fao && (
                  <View style={styles.faoBadge}>
                    <Ionicons name="checkmark-circle" size={12} color={COLORS.greenDark} />
                    <Text style={styles.faoBadgeText}>{t("admin.faoBadge")}</Text>
                  </View>
                )}
                {item.references?.source && !item.references?.fao && (
                  <View style={styles.faoBadge}>
                    <Ionicons name="person-outline" size={12} color={COLORS.amber} />
                    <Text style={[styles.faoBadgeText, { color: COLORS.amber }]}>{item.references.source}</Text>
                  </View>
                )}
              </View>
              <TouchableOpacity style={[styles.deleteKcBtn, isDeleting && { opacity: 0.4 }]}
                onPress={() => handleDeleteKc(item)} disabled={isDeleting} activeOpacity={0.7}>
                {isDeleting ? <ActivityIndicator size="small" color={COLORS.danger} />
                  : <Ionicons name="trash-outline" size={20} color={COLORS.danger} />}
              </TouchableOpacity>
            </View>
          );
        })
      )}
    </View>
  );

  return (
    <AdminShell activeKey="addculture" title={t("admin.navAddCulture")} loading={loading}>
      <View style={styles.mainTabs}>
        {[
          { key: "add",    icon: "add-circle-outline",  labelKey: "admin.addCultureTab" },
          { key: "manage", icon: "list-circle-outline", labelKey: "admin.manageTab"     },
        ].map(({ key, icon, labelKey }) => (
          <TouchableOpacity key={key} style={[styles.mainTab, activeTab === key && styles.mainTabActive]}
            onPress={() => setActiveTab(key)} activeOpacity={0.8}>
            <Ionicons name={icon} size={18} color={activeTab === key ? COLORS.greenDark : COLORS.muted} />
            <Text style={[styles.mainTabText, activeTab === key && styles.mainTabTextActive]}>{t(labelKey)}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {activeTab === "add" && (
        <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
          <StatusBanner status={submitStatus} message={submitMessage} kcInfo={kcInfo}
            isNewCulture={isNewCulture} onDismiss={dismissBanner} t={t} />
          <View style={styles.sectionCard}>
            <View style={styles.sectionHeader}>
              <Ionicons name="leaf-outline" size={18} color={COLORS.greenDark} />
              <Text style={styles.sectionTitle}>{t("admin.cultureInfoSection")}</Text>
            </View>
            <AutocompleteInput label={t("cultures.modal.nomLabel")} required value={nom}
              onChangeText={handleNomChange} onSelectSuggestion={handleNomSelect}
              placeholder="ex : Orange, Tomate..."
              suggestions={nomSuggestions.length ? nomSuggestions : KC_CULTURES.map(c => c.nom)}
              zIndex={30} error={errors.nom} />
            <AutocompleteInput label={t("cultures.modal.varietyLabel")} required value={variete}
              onChangeText={v => { setVariete(v); if (errors.variete) setErrors(p => ({ ...p, variete: null })); }}
              onSelectSuggestion={setVariete} placeholder="ex : Navel Washington"
              suggestions={allVarietes} zIndex={20} error={errors.variete} />
          </View>
          <View style={styles.sectionCard}>
            <View style={styles.sectionHeader}>
              <Ionicons name="stats-chart-outline" size={18} color={COLORS.greenDark} />
              <Text style={styles.sectionTitle}>{t("admin.kcSection")}</Text>
            </View>
            <Text style={styles.hint}>{t("admin.kcHint")}</Text>
            {renderKcModeTabs()}
            {kcMode === "auto"   && renderKcAuto()}
            {kcMode === "stades" && renderKcStades()}
          </View>
          <View style={styles.infoBox}>
            <Ionicons name="information-circle-outline" size={16} color="#3b82f6" />
            <Text style={styles.infoText}>{t("admin.addCultureInfo")}</Text>
          </View>
          <View style={[styles.buttonRow, isRTL && styles.buttonRowRTL]}>
            <TouchableOpacity style={styles.cancelButton} onPress={() => router.back()}>
              <Text style={styles.cancelButtonText}>{t("cultures.modal.cancel")}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.submitButton, loading && styles.submitButtonDisabled]}
              onPress={handleSubmit} disabled={loading}>
              {loading ? <ActivityIndicator color="#fff" />
                : <Text style={styles.submitButtonText}>{t("cultures.modal.addBtn")}</Text>}
            </TouchableOpacity>
          </View>
        </ScrollView>
      )}

      {activeTab === "manage" && (
        <ScrollView contentContainerStyle={[styles.container, { paddingBottom: 60 }]} keyboardShouldPersistTaps="handled">
          {renderManageTab()}
        </ScrollView>
      )}

      <ConfirmModal
        visible={confirm.visible}
        title={t("cultures.modal.deleteTitle")}
        message={`${t("cultures.modal.deleteMsg")}\n"${confirm.item?.culture}"`}
        onConfirm={doConfirmedDeleteKc}
        onCancel={() => setConfirm({ visible: false, item: null })}
        t={t}
      />
      <Toast visible={toast.visible} message={toast.message} type={toast.type} />
    </AdminShell>
  );
}

const styles = StyleSheet.create({
  mainTabs: { flexDirection:"row", marginHorizontal:16, marginTop:12, marginBottom:4, borderRadius:12, overflow:"hidden", borderWidth:1, borderColor:COLORS.border, backgroundColor:COLORS.sectionBg },
  mainTab: { flex:1, flexDirection:"row", alignItems:"center", justifyContent:"center", gap:6, paddingVertical:12 },
  mainTabActive: { backgroundColor:COLORS.greenSoft, borderBottomWidth:2, borderBottomColor:COLORS.greenDark },
  mainTabText: { fontSize:14, fontWeight:"600", color:COLORS.muted },
  mainTabTextActive: { color:COLORS.greenDark },
  container: { padding:16, paddingBottom:40, gap:16 },
  sectionCard: { backgroundColor:COLORS.surface, borderRadius:16, borderWidth:1, borderColor:COLORS.sectionBorder, padding:16 },
  sectionHeader: { flexDirection:"row", alignItems:"center", gap:8, marginBottom:16, paddingBottom:12, borderBottomWidth:1, borderBottomColor:COLORS.greenBorder },
  sectionTitle: { fontSize:15, fontWeight:"700", color:COLORS.greenDark },
  hint: { fontSize:11, color:COLORS.muted, marginBottom:12 },
  buttonRow: { flexDirection:"row", gap:12 },
  buttonRowRTL: { flexDirection:"row-reverse" },
  cancelButton: { flex:1, paddingVertical:14, borderRadius:12, borderWidth:1, borderColor:COLORS.border, backgroundColor:COLORS.surface, alignItems:"center" },
  cancelButtonText: { fontSize:14, fontWeight:"600", color:COLORS.muted },
  submitButton: { flex:2, paddingVertical:14, borderRadius:12, backgroundColor:COLORS.greenDark, alignItems:"center" },
  submitButtonDisabled: { opacity:0.6 },
  submitButtonText: { fontSize:14, fontWeight:"700", color:"#fff" },
  kcModeTabs: { flexDirection:"row", gap:8, marginBottom:16 },
  kcModeTab: { flex:1, paddingVertical:10, borderRadius:10, borderWidth:1, borderColor:COLORS.border, backgroundColor:COLORS.sectionBg, alignItems:"center", flexDirection:"row", justifyContent:"center", gap:5 },
  kcModeTabActive: { borderColor:COLORS.green, backgroundColor:COLORS.greenSoft },
  kcModeTabText: { fontSize:13, fontWeight:"600", color:COLORS.muted },
  kcModeTabTextActive: { color:COLORS.greenDark },
  kcSection: { backgroundColor:COLORS.sectionBg, borderRadius:12, padding:14, borderWidth:1, borderColor:COLORS.greenBorder },
  kcSectionTitle: { fontSize:13, fontWeight:"700", color:COLORS.text, marginBottom:12 },
  kcStadeRow: { flexDirection:"row", alignItems:"center", justifyContent:"space-between", marginBottom:10 },
  kcStadeLabelBox: { flexDirection:"row", alignItems:"center", gap:6, flex:1 },
  kcStadeLabel: { fontSize:13, color:COLORS.text },
  kcStadeInput: { width:72, height:40, borderWidth:1, borderColor:COLORS.border, borderRadius:8, backgroundColor:COLORS.surface, fontSize:14, color:COLORS.text },
  kcAutoRow: { flexDirection:"row", alignItems:"flex-start", gap:10 },
  kcAutoTitle: { fontSize:13, fontWeight:"700", color:COLORS.greenDark },
  errorText: { fontSize:12, color:COLORS.danger, marginTop:6 },
  infoBox: { flexDirection:"row", alignItems:"flex-start", gap:8, backgroundColor:"#eff6ff", borderRadius:10, borderWidth:1, borderColor:"#bfdbfe", padding:12 },
  infoText: { flex:1, fontSize:12, color:"#1d4ed8", lineHeight:17 },
  searchBar: { flexDirection:"row", alignItems:"center", gap:10, backgroundColor:COLORS.surface, borderWidth:1, borderColor:COLORS.border, borderRadius:12, paddingHorizontal:12, paddingVertical:10, marginBottom:10 },
  searchInput: { flex:1, fontSize:14, color:COLORS.text },
  listMeta: { flexDirection:"row", alignItems:"center", justifyContent:"space-between", marginBottom:12 },
  listMetaText: { fontSize:12, color:COLORS.muted, fontWeight:"500" },
  refreshBtn: { padding:6, borderRadius:8, backgroundColor:COLORS.greenSoft, borderWidth:1, borderColor:COLORS.greenBorder },
  centerLoader: { alignItems:"center", paddingVertical:40, gap:10 },
  loaderText: { fontSize:13, color:COLORS.muted },
  emptyState: { alignItems:"center", paddingVertical:50, gap:12 },
  emptyText: { fontSize:14, color:COLORS.muted },
  kcCard: { flexDirection:"row", alignItems:"center", backgroundColor:COLORS.surface, borderRadius:14, borderWidth:1, borderColor:COLORS.sectionBorder, padding:14, marginBottom:10, shadowColor:"#000", shadowOffset:{width:0,height:1}, shadowOpacity:0.05, shadowRadius:3, elevation:1 },
  kcCardTop: { flexDirection:"row", alignItems:"center", flexWrap:"wrap", gap:8, marginBottom:4 },
  kcCardNom: { fontSize:15, fontWeight:"700", color:COLORS.text },
  kcCardVariete: { fontSize:12, color:COLORS.muted },
  typeBadge: { paddingHorizontal:8, paddingVertical:3, borderRadius:20, borderWidth:1 },
  typeBadgeText: { fontSize:11, fontWeight:"700" },
  faoBadge: { flexDirection:"row", alignItems:"center", gap:4, marginTop:6 },
  faoBadgeText: { fontSize:11, color:COLORS.greenDark, fontWeight:"600" },
  deleteKcBtn: { padding:10, borderRadius:10, backgroundColor:COLORS.dangerSoft, borderWidth:1, borderColor:COLORS.dangerBorder, marginLeft:8 },
});