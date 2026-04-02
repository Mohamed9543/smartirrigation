// app/(user)/irrigation.jsx - Version corrigée

import React, { useState, useEffect } from 'react';
import {
  View, Text, TouchableOpacity, ScrollView,
  ActivityIndicator, Modal, FlatList, StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { BrandHeader } from '@components/BrandHeader';
import { Platform } from 'react-native';
import NotificationBell from '@components/NotificationBell';
import { useIrrigationNotifications } from '@hooks/useNotifications';
import { API_ENDPOINTS, apiFetch } from '@api/client';
import { useLanguage } from '@context/LanguageContext';
import ETcHistory from '@components/ETcHistory';

// ✅ Correction : les pertes (surplus d'eau) sont:
// goutte-à-goutte: efficacité 90% → perte 10% (ajouter 10%)
// aspersion:       efficacité 70% → perte 30% (ajouter 30%)
// gravitaire:      efficacité 60% → perte 40% (ajouter 40%)
const PERTE_PAR_MODE = {
  'goutte-à-goutte': 0.10,  // +10% d'eau à apporter
  'aspersion':       0.30,  // +30% d'eau à apporter
  'gravitaire':      0.40,  // +40% d'eau à apporter
};

const EFF_PAR_MODE = {
  'goutte-à-goutte': 0.90,  // 90% d'efficacité
  'aspersion':       0.70,  // 70% d'efficacité
  'gravitaire':      0.60,  // 60% d'efficacité
};

const DEFAULT_BESOINS = {
  volumeReel: 0, volumeTheorique: 0, volumeM3Ha: '0.0',
  volumeReelM3Ha: '0.0', volumeParArbre: null, temps: 0,
  valeur: 0, unite: 'L/h', perte: 0, pourcentagePerte: 0,
  eta: 90, et0: '0.00', kc: '0.65', etc: '0.00',
};

const TAB_LABELS = {
  needs:   { fr: 'Besoins',    en: 'Needs',   ar: 'الاحتياجات', tr: 'İhtiyaçlar' },
  history: { fr: 'Historique', en: 'History', ar: 'السجل',      tr: 'Geçmiş'     },
};
const ALERT_TXT = {
  fr: { count: 'alerte(s) en cours', tap: 'Appuyez sur 🔔 pour les détails' },
  en: { count: 'active alert(s)',    tap: 'Tap 🔔 for details'              },
  ar: { count: 'تنبيهات نشطة',       tap: 'اضغط على 🔔 للتفاصيل'            },
  tr: { count: 'aktif uyarı',        tap: 'Detaylar için 🔔 ye dokunun'     },
};
const MODE_EMOJI = {
  'goutte-à-goutte': '💧',
  'aspersion':       '💦',
  'gravitaire':      '🌊',
};

export default function IrrigationPage() {
  const { t, language } = useLanguage();
  const lang = language || 'fr';

  const [cultures,            setCultures]            = useState([]);
  const [selectedCulture,     setSelectedCulture]     = useState(null);
  const [selectedMode,        setSelectedMode]        = useState('goutte-à-goutte');
  const [loading,             setLoading]             = useState(true);
  const [weatherData,         setWeatherData]         = useState(null);
  const [historyItems,        setHistoryItems]        = useState([]);
  const [isCompleted,         setIsCompleted]         = useState(false);
  const [etcHistoryKey,       setEtcHistoryKey]       = useState(0);
  const [cultureModalVisible, setCultureModalVisible] = useState(false);
  const [activeTab,           setActiveTab]           = useState('needs');

  useEffect(() => { fetchCultures(); fetchWeather(); fetchHistory(); }, []);

  const fetchCultures = async () => {
    try {
      const res = await apiFetch(API_ENDPOINTS.cultures.base);
      const result = await res.json();
      if (result.success) {
        setCultures(result.data);
        if (result.data.length > 0) setSelectedCulture(result.data[0]);
      }
    } catch (e) { console.log('Erreur cultures:', e); }
    finally { setLoading(false); }
  };

  const fetchWeather = async () => {
    try {
      const res = await apiFetch(`${API_ENDPOINTS.weather.current}?city=Tunis`);
      const result = await res.json();
      if (result.success) setWeatherData(result.data);
    } catch (e) { console.log('Erreur météo:', e); }
  };

  const fetchHistory = async () => {
    try {
      const res = await apiFetch(API_ENDPOINTS.irrigations.base);
      const result = await res.json();
      if (result.success) setHistoryItems(result.data);
    } catch (e) { console.log('Erreur historique:', e); }
  };

  // ✅ Calcul des besoins avec les bonnes formules
  const calculateNeeds = () => {
    if (!selectedCulture || !weatherData) return DEFAULT_BESOINS;
    
    // ET₀ depuis la météo (calculé par Penman-Monteith)
    const et0     = parseFloat(weatherData.et0) || 4.48;
    // Kc depuis la culture (FAO-56 selon le mois)
    const kc      = parseFloat(selectedCulture.kcActuel) || 0.65;
    const surface = parseFloat(selectedCulture.surface) || 100;
    const debit   = parseFloat(selectedCulture.irrigation?.debit) || 1000;
    const nbArbres = selectedCulture.nombreArbres || null;

    // ✅ ETc = ET₀ × Kc (mm/jour)
    const etc = et0 * kc;
    
    // ✅ Volume théorique = ETc × surface (litres)
    // 1 mm d'eau sur 1 m² = 1 litre
    const volumeTheorique = etc * surface;
    const volumeM3Ha = etc * 10;  // m³/ha (1 mm × 10 = 10 m³/ha)
    
    // ✅ Perte selon le mode d'irrigation
    const perte = PERTE_PAR_MODE[selectedMode] || 0.10;
    const eta = 1 - perte;  // efficacité
    
    // ✅ Volume réel = volume théorique / efficacité
    const volumeReel = volumeTheorique / eta;
    const volumeReelM3Ha = volumeM3Ha / eta;
    
    // ✅ Volume par arbre (si nombre d'arbres renseigné)
    const volumeParArbre = nbArbres ? Math.round(volumeReel / nbArbres) : null;
    
    // ✅ Temps d'irrigation en minutes
    const tempsMinutes = Math.round((volumeReel / debit) * 60);
    
    // ✅ Affichage du débit selon le mode
    let valeur, unite;
    if (selectedMode === 'goutte-à-goutte') { 
      valeur = Math.round(debit); 
      unite = 'L/h'; 
    } else if (selectedMode === 'aspersion') {  
      valeur = (debit / surface).toFixed(1); 
      unite = 'mm/h'; 
    } else {                                    
      valeur = (debit / 1000).toFixed(2); 
      unite = 'm³/h'; 
    }
    
    // ✅ Calcul des pertes en litres
    const perteLitres = volumeReel - volumeTheorique;
    const pourcentagePerte = Math.round(perte * 100);
    
    return {
      volumeReel:     Math.round(volumeReel),
      volumeTheorique: Math.round(volumeTheorique),
      volumeM3Ha:     volumeM3Ha.toFixed(1),
      volumeReelM3Ha: volumeReelM3Ha.toFixed(1),
      volumeParArbre,
      temps: tempsMinutes,
      valeur: parseFloat(valeur), 
      unite,
      perte:           Math.round(perteLitres),
      pourcentagePerte,
      eta:             Math.round(eta * 100),
      et0:  et0.toFixed(2),
      kc:   kc.toFixed(2),
      etc:  etc.toFixed(2),
    };
  };

  const handleFaitPress = async () => {
    if (!selectedCulture || isCompleted) return;
    const needs = calculateNeeds();
    try {
      const res = await apiFetch(API_ENDPOINTS.irrigations.base, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cultureId:  selectedCulture._id,
          mode:       selectedMode,
          duree:      needs.temps,
          volume:     needs.volumeReel,
          debit:      selectedCulture.irrigation?.debit || 1000,
          et0:        parseFloat(needs.et0),
          etc:        parseFloat(needs.etc),
          kc:         parseFloat(needs.kc),
          surface:    selectedCulture.surface || 100,
          efficacite: EFF_PAR_MODE[selectedMode],
        }),
      });
      const result = await res.json();
      if (result.success) {
        setIsCompleted(true);
        await fetchHistory();
        setEtcHistoryKey(p => p + 1);
      }
    } catch (e) { console.log('Erreur sauvegarde:', e); }
  };

  const handleSelectCulture = (culture) => {
    setSelectedCulture(culture);
    setIsCompleted(false);
    setEtcHistoryKey(p => p + 1);
    setCultureModalVisible(false);
  };

  const formatDate = (date) => {
    const diff = (Date.now() - new Date(date).getTime()) / 60000;
    if (diff < 1)    return t('irrigation.justNow') || "À l'instant";
    if (diff < 60)   return `${Math.floor(diff)} min`;
    if (diff < 1440) return `${Math.floor(diff / 60)} h`;
    return new Date(date).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' });
  };

  const getModeLabel = (mode) => {
    if (mode === 'goutte-à-goutte') return t('irrigation.drip') || 'Goutte-à-goutte';
    if (mode === 'aspersion')       return t('irrigation.sprinkler') || 'Aspersion';
    return t('irrigation.gravity') || 'Gravitaire';
  };

  const { notifications, markRead, markAllRead } = useIrrigationNotifications(
    cultures, historyItems, weatherData, lang
  );
  const urgentCount = notifications.filter(n => !n.read && (n.type === 'urgent' || n.type === 'warning')).length;

  const exportIrrigation = () => {
    try {
      const headers = ['Date', 'Culture', 'Parcelle', 'Mode', 'Volume (L)', 'Durée (min)', 'ET₀ (mm/j)', 'ETc (mm/j)', 'Kc', 'Surface (m²)', 'Efficacité (%)'];
      const rows = historyItems.map(item => {
        const culture = cultures.find(c => c._id === (item.cultureId?._id || item.cultureId));
        return [
          new Date(item.date).toLocaleDateString('fr-FR'),
          item.nom || culture?.nom || item.cultureId?.nom || '—',
          culture?.parcelle || '—',
          item.mode || '—',
          Math.round(item.volume),
          item.duree || item.temps || '—',
          item.et0 != null ? Number(item.et0).toFixed(2) : '—',
          item.etc != null ? Number(item.etc).toFixed(2) : '—',
          item.kc  != null ? Number(item.kc).toFixed(2)  : '—',
          item.surface || culture?.surface || '—',
          item.efficacite != null ? Math.round(item.efficacite * 100) : '—',
        ];
      });
      const escape = (v) => {
        if (v === null || v === undefined) return '';
        const s = String(v);
        return (s.includes(',') || s.includes('"') || s.includes('\n')) ? '"' + s.replace(/"/g, '""') + '"' : s;
      };
      const csv = '\uFEFF' + [headers.map(escape).join(','), ...rows.map(row => row.map(escape).join(','))].join('\r\n');
      const filename = `SmartIrrig_Irrigation_${new Date().toISOString().split('T')[0]}.csv`;
      if (Platform.OS === 'web') {
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url; a.download = filename; a.style.display = 'none';
        document.body.appendChild(a); a.click();
        document.body.removeChild(a); URL.revokeObjectURL(url);
      } else {
        alert("Pour exporter en CSV, ouvrez l'application dans un navigateur web.");
      }
    } catch (e) { console.error('Export error:', e); }
  };

  if (loading) return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#f3f4f6', alignItems: 'center', justifyContent: 'center' }}>
      <ActivityIndicator size="large" color="#4CAF50" />
    </SafeAreaView>
  );

  const besoins = selectedCulture ? calculateNeeds() : DEFAULT_BESOINS;
  const alertTxt = ALERT_TXT[lang] || ALERT_TXT.fr;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#f3f4f6' }}>
      <BrandHeader
        title={t('irrigation.title')}
        right={
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            {historyItems.length > 0 && (
              <TouchableOpacity style={s.exportBtn} onPress={exportIrrigation} activeOpacity={0.8}>
                <Ionicons name="download-outline" size={15} color="#16a34a" />
                <Text style={s.exportBtnText}>{t('irrigation.exporter')}</Text>
              </TouchableOpacity>
            )}
            <NotificationBell notifications={notifications} onMarkRead={markRead} onMarkAllRead={markAllRead} lang={lang} />
          </View>
        }
      />
      <ScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 90, paddingTop: 12 }} showsVerticalScrollIndicator={false}>

        {urgentCount > 0 && (
          <View style={s.alertBanner}>
            <Ionicons name="alert-circle" size={16} color="#dc2626" />
            <View style={{ flex: 1 }}>
              <Text style={s.alertTitle}>{urgentCount} {alertTxt.count}</Text>
              <Text style={s.alertSub}>{alertTxt.tap}</Text>
            </View>
          </View>
        )}

        {/* Culture picker */}
        <TouchableOpacity style={s.culturePicker} onPress={() => setCultureModalVisible(true)}>
          <View style={{ flex: 1 }}>
            <Text style={s.culturePickerLabel}>Culture</Text>
            {selectedCulture ? (
              <>
                <Text style={s.culturePickerName}>{selectedCulture.nom}</Text>
                <Text style={s.culturePickerSub}>
                  {selectedCulture.parcelle} • {selectedCulture.surface} m²
                  {selectedCulture.nombreArbres ? ` • ${selectedCulture.nombreArbres} arbres` : ''}
                  {` • Kc: ${parseFloat(selectedCulture.kcActuel || 0.65).toFixed(2)}`}
                </Text>
              </>
            ) : (
              <Text style={[s.culturePickerName, { color: '#9ca3af', fontStyle: 'italic', fontWeight: '400' }]}>
                {cultures.length === 0 ? 'Aucune culture disponible' : 'Sélectionner une culture'}
              </Text>
            )}
          </View>
          <Ionicons name={cultureModalVisible ? 'chevron-up' : 'chevron-down'} size={24} color="#4CAF50" />
        </TouchableOpacity>

        {/* Tabs */}
        <View style={s.tabRow}>
          {['needs', 'history'].map(tab => (
            <TouchableOpacity
              key={tab}
              style={[s.tab, activeTab === tab && s.tabActive]}
              onPress={() => setActiveTab(tab)}
            >
              <Text style={[s.tabText, activeTab === tab && s.tabTextActive]}>
                {(TAB_LABELS[tab] || {})[lang] || TAB_LABELS[tab].fr}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* ════ TAB BESOINS ════ */}
        {activeTab === 'needs' && (
          <>
            <Text style={s.sectionTitle}>{t('irrigation.mode') || "Mode d'irrigation"}</Text>

            {/* ✅ Affichage des pourcentages d'efficacité */}
            <View style={s.modesRow}>
              {['goutte-à-goutte', 'aspersion', 'gravitaire'].map(mode => {
                const eta = Math.round((1 - PERTE_PAR_MODE[mode]) * 100);
                const pct = Math.round(PERTE_PAR_MODE[mode] * 100);
                const active = selectedMode === mode;
                return (
                  <TouchableOpacity
                    key={mode}
                    style={[s.modeCard, active && s.modeCardActive]}
                    onPress={() => { setSelectedMode(mode); setIsCompleted(false); }}
                  >
                    <Text style={s.modeEmoji}>{MODE_EMOJI[mode]}</Text>
                    <Text style={[s.modeLabel, active && s.modeLabelActive]}>{getModeLabel(mode)}</Text>
                    <Text style={s.modePct}>η = {eta}%</Text>
                    <Text style={[s.modePct, { color: '#ef4444' }]}>+{pct}%</Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Besoins carte */}
            {!isCompleted && selectedCulture && (
              <View style={s.needsCard}>
                <Text style={s.needsTitle}>{selectedCulture.nom}</Text>

                {/* ✅ ET₀, Kc, ETc corrects */}
                <View style={s.etcRow}>
                  <View style={s.etcItem}>
                    <Text style={s.etcLabel}>ET₀</Text>
                    <Text style={[s.etcVal, { color: '#2563eb' }]}>{besoins.et0}</Text>
                    <Text style={s.etcUnit}>mm/j</Text>
                  </View>
                  <View style={s.etcSep} />
                  <View style={s.etcItem}>
                    <Text style={s.etcLabel}>Kc</Text>
                    <Text style={[s.etcVal, { color: '#7c3aed' }]}>{besoins.kc}</Text>
                    <Text style={s.etcUnit}>FAO-56</Text>
                  </View>
                  <View style={s.etcSep} />
                  <View style={s.etcItem}>
                    <Text style={s.etcLabel}>ETc</Text>
                    <Text style={[s.etcVal, { color: '#16a34a' }]}>{besoins.etc}</Text>
                    <Text style={s.etcUnit}>mm/j</Text>
                  </View>
                </View>

                <View style={s.volRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={s.volLabel}>Volume total à apporter</Text>
                    <Text style={s.volMain}>{besoins.volumeReel} L</Text>
                    <Text style={s.volSub}>
                      théorique: {besoins.volumeTheorique} L • pertes: {besoins.perte} L ({besoins.pourcentagePerte}%)
                    </Text>
                    {besoins.volumeParArbre && (
                      <Text style={[s.volSub, { color: '#16a34a', marginTop: 4 }]}>
                        ≈ {besoins.volumeParArbre} L/arbre
                      </Text>
                    )}
                  </View>
                  <View style={{ alignItems: 'flex-end' }}>
                    <Text style={s.debitLabel}>Débit</Text>
                    <Text style={s.debitVal}>{besoins.valeur} {besoins.unite}</Text>
                    <Text style={s.debitTime}>{besoins.temps} min</Text>
                    <Text style={[s.debitTime, { color: '#16a34a' }]}>{besoins.eta}% eff.</Text>
                  </View>
                </View>

                <TouchableOpacity style={s.doneBtn} onPress={handleFaitPress}>
                  <Text style={s.doneBtnText}>{t('irrigation.done') || 'Fait'} ✓</Text>
                </TouchableOpacity>
              </View>
            )}

            {isCompleted && selectedCulture && (
              <View style={s.completedCard}>
                <MaterialCommunityIcons name="check-circle" size={50} color="#4CAF50" />
                <Text style={s.completedTitle}>{t('irrigation.completed') || 'Irrigation enregistrée !'}</Text>
                <Text style={s.completedName}>{selectedCulture.nom}</Text>
                <Text style={s.completedVol}>{besoins.volumeReel} L</Text>
                {besoins.volumeParArbre && (
                  <Text style={s.completedSub}>≈ {besoins.volumeParArbre} L/arbre</Text>
                )}
                <Text style={s.completedSub}>{besoins.temps} min</Text>
                <Text style={s.completedMeta}>ETc = {besoins.etc} mm  (ET₀ {besoins.et0} × Kc {besoins.kc})</Text>
                <Text style={s.completedMeta}>{besoins.volumeReelM3Ha} m³/ha/j • η = {besoins.eta}%</Text>
              </View>
            )}

            {selectedCulture && (
              <View style={{ marginBottom: 24 }}>
                <ETcHistory
                  key={etcHistoryKey}
                  cultureId={selectedCulture._id}
                  cultureName={selectedCulture.nom}
                  todayEtc={parseFloat(besoins.etc)}
                  todayEt0={parseFloat(besoins.et0)}
                  todayKc={parseFloat(besoins.kc)}
                />
              </View>
            )}
          </>
        )}

        {/* ════ TAB HISTORIQUE ════ */}
        {activeTab === 'history' && (
          <View style={s.histWrap}>
            {historyItems.length === 0 ? (
              <View style={s.emptyWrap}>
                <Text style={{ fontSize: 48, marginBottom: 12 }}>📋</Text>
                <Text style={s.emptyText}>{t('irrigation.noHistory') || 'Aucune irrigation enregistrée'}</Text>
              </View>
            ) : (
              historyItems.map((item, idx) => (
                <View key={item._id}>
                  <View style={s.histRow}>
                    <Text style={s.histCulture}>{item.nom || item.cultureId?.nom}</Text>
                    <Text style={s.histTime}>{formatDate(item.date)}</Text>
                  </View>
                  <View style={s.histModeBadge}>
                    <Text style={s.histModeText}>{MODE_EMOJI[item.mode]} {getModeLabel(item.mode)}</Text>
                  </View>
                  <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 4 }}>
                    <Text style={s.histVol}>{item.volume} L</Text>
                    <Text style={s.histSep}>•</Text>
                    <Text style={s.histDur}>{item.duree || item.temps} min</Text>
                  </View>
                  {item.et0 != null && item.etc != null && (
                    <View style={{ flexDirection: 'row', marginTop: 4, gap: 12 }}>
                      <Text style={s.histMeta}>ET₀: {Number(item.et0).toFixed(2)}</Text>
                      <Text style={[s.histMeta, { color: '#16a34a' }]}>ETc: {Number(item.etc).toFixed(2)}</Text>
                      <Text style={[s.histMeta, { color: '#7c3aed' }]}>Kc: {Number(item.kc).toFixed(2)}</Text>
                    </View>
                  )}
                  {idx < historyItems.length - 1 && <View style={s.histDivider} />}
                </View>
              ))
            )}
          </View>
        )}
      </ScrollView>

      {/* Modal culture */}
      <Modal visible={cultureModalVisible} transparent animationType="slide" onRequestClose={() => setCultureModalVisible(false)}>
        <TouchableOpacity style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.4)' }} activeOpacity={1} onPress={() => setCultureModalVisible(false)}>
          <SafeAreaView edges={['bottom', 'left', 'right']} style={s.sheet}>
            <View style={s.sheetHeader}>
              <Text style={s.sheetTitle}>Choisir une culture</Text>
              <TouchableOpacity onPress={() => setCultureModalVisible(false)}>
                <Ionicons name="close" size={24} color="#6b7280" />
              </TouchableOpacity>
            </View>
            {cultures.length === 0 ? (
              <View style={s.emptyWrap}>
                <Text style={{ fontSize: 40, marginBottom: 8 }}>🌱</Text>
                <Text style={s.emptyText}>Aucune culture disponible</Text>
              </View>
            ) : (
              <FlatList
                data={cultures}
                keyExtractor={item => item._id}
                style={{ maxHeight: 380 }}
                contentContainerStyle={{ paddingVertical: 8 }}
                renderItem={({ item }) => {
                  const isSelected = selectedCulture?._id === item._id;
                  return (
                    <TouchableOpacity
                      style={[s.cultureItem, isSelected && s.cultureItemActive]}
                      onPress={() => handleSelectCulture(item)}
                    >
                      <View style={{ flex: 1 }}>
                        <Text style={[s.cultureItemName, isSelected && { color: '#15803d' }]}>{item.nom}</Text>
                        <Text style={s.cultureItemSub}>{item.parcelle} • {item.variete}</Text>
                        <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginTop: 6, gap: 6 }}>
                          <View style={s.chipWrap}><Text style={s.chipText}>{item.surface} m²</Text></View>
                          {item.nombreArbres && <View style={s.chipWrap}><Text style={s.chipText}>{item.nombreArbres} arbres</Text></View>}
                          <View style={s.chipWrap}>
                            <Text style={[s.chipText, { color: '#7c3aed', fontWeight: '600' }]}>
                              Kc: {parseFloat(item.kcActuel || 0.65).toFixed(2)}
                            </Text>
                          </View>
                        </View>
                      </View>
                      {isSelected && <Ionicons name="checkmark-circle" size={24} color="#4CAF50" />}
                    </TouchableOpacity>
                  );
                }}
              />
            )}
            <View style={{ height: 24 }} />
          </SafeAreaView>
        </TouchableOpacity>
      </Modal>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  alertBanner:     { flexDirection: 'row', alignItems: 'flex-start', gap: 8, backgroundColor: '#fee2e2', borderWidth: 1, borderColor: '#fecaca', borderRadius: 14, paddingHorizontal: 14, paddingVertical: 12, marginBottom: 16 },
  alertTitle:      { fontSize: 13, fontWeight: '700', color: '#dc2626' },
  alertSub:        { fontSize: 11, color: '#ef4444', marginTop: 2 },
  culturePicker:   { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#fff', borderRadius: 16, padding: 16, marginBottom: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 4, elevation: 2 },
  culturePickerLabel: { fontSize: 13, color: '#6b7280', marginBottom: 4 },
  culturePickerName:  { fontSize: 20, fontWeight: '600', color: '#1f2937' },
  culturePickerSub:   { fontSize: 13, color: '#6b7280', marginTop: 4 },
  tabRow:    { flexDirection: 'row', backgroundColor: '#f1f5f9', borderRadius: 14, padding: 4, marginBottom: 20 },
  tab:       { flex: 1, paddingVertical: 10, borderRadius: 11, alignItems: 'center' },
  tabActive: { backgroundColor: '#fff', shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 3, elevation: 2 },
  tabText:       { fontSize: 14, fontWeight: '500', color: '#9ca3af' },
  tabTextActive: { fontWeight: '700', color: '#111827' },
  sectionTitle: { fontSize: 16, fontWeight: '600', color: '#4b5563', marginBottom: 12 },
  modesRow:    { flexDirection: 'row', backgroundColor: '#fff', borderRadius: 16, padding: 12, marginBottom: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 4, elevation: 2, gap: 4 },
  modeCard:       { flex: 1, alignItems: 'center', paddingVertical: 12, paddingHorizontal: 4, borderRadius: 12, borderWidth: 1.5, borderColor: 'transparent' },
  modeCardActive: { backgroundColor: '#f0fdf4', borderColor: '#86efac' },
  modeEmoji:      { fontSize: 24, marginBottom: 4 },
  modeLabel:      { fontSize: 11, fontWeight: '500', color: '#4b5563', textAlign: 'center' },
  modeLabelActive: { color: '#166534', fontWeight: '700' },
  modePct: { fontSize: 10, color: '#9ca3af', marginTop: 2 },
  et0Banner: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#eff6ff', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8, marginBottom: 16, gap: 6 },
  et0BannerText: { fontSize: 12, color: '#2563eb', fontWeight: '600' },
  needsCard:   { backgroundColor: '#fff', borderRadius: 16, padding: 20, marginBottom: 24, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 4, elevation: 2 },
  needsTitle:  { fontSize: 20, fontWeight: '700', color: '#1f2937', marginBottom: 16 },
  etcRow:  { flexDirection: 'row', alignItems: 'center', backgroundColor: '#f9fafb', borderRadius: 12, padding: 12, marginBottom: 20 },
  etcItem: { flex: 1, alignItems: 'center' },
  etcSep:  { width: 1, height: 40, backgroundColor: '#e5e7eb' },
  etcLabel: { fontSize: 12, color: '#6b7280', marginBottom: 4 },
  etcVal:   { fontSize: 20, fontWeight: '700' },
  etcUnit:  { fontSize: 10, color: '#9ca3af', marginTop: 2 },
  volRow:    { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 },
  volLabel:  { fontSize: 13, color: '#6b7280', marginBottom: 4 },
  volMain:   { fontSize: 32, fontWeight: '700', color: '#16a34a' },
  volSub:    { fontSize: 11, color: '#9ca3af', marginTop: 4 },
  debitLabel: { fontSize: 13, color: '#6b7280', marginBottom: 4 },
  debitVal:   { fontSize: 14, color: '#374151' },
  debitTime:  { fontSize: 13, fontWeight: '600', color: '#374151', marginTop: 4 },
  doneBtn:     { backgroundColor: '#f0fdf4', borderWidth: 2, borderColor: '#15803d', borderRadius: 50, paddingVertical: 14, alignItems: 'center' },
  doneBtnText: { fontSize: 17, fontWeight: '600', color: '#166534' },
  completedCard:  { backgroundColor: '#f0fdf4', borderWidth: 2, borderColor: '#bbf7d0', borderRadius: 16, padding: 24, marginBottom: 24, alignItems: 'center' },
  completedTitle: { fontSize: 20, fontWeight: '600', color: '#166534', marginTop: 8 },
  completedName:  { fontSize: 22, fontWeight: '700', color: '#1f2937', marginTop: 6 },
  completedVol:   { fontSize: 32, fontWeight: '700', color: '#16a34a', marginTop: 8 },
  completedSub:   { fontSize: 16, color: '#16a34a', marginTop: 4 },
  completedMeta:  { fontSize: 13, color: '#6b7280', marginTop: 4 },
  histWrap:     { backgroundColor: '#fff', borderRadius: 16, padding: 20, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 4, elevation: 2, marginBottom: 16 },
  histRow:      { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  histCulture:  { fontSize: 14, fontWeight: '600', color: '#f97316' },
  histTime:     { fontSize: 13, color: '#9ca3af' },
  histModeBadge:{ backgroundColor: '#f3f4f6', paddingHorizontal: 12, paddingVertical: 4, borderRadius: 50, alignSelf: 'flex-start', marginBottom: 4 },
  histModeText: { fontSize: 12, color: '#4b5563' },
  histVol:      { fontSize: 18, fontWeight: '700', color: '#16a34a' },
  histSep:      { fontSize: 14, color: '#6b7280', marginHorizontal: 8 },
  histDur:      { fontSize: 14, color: '#4b5563' },
  histMeta:     { fontSize: 11, color: '#6b7280' },
  histDivider:  { height: 1, backgroundColor: '#e5e7eb', marginVertical: 12 },
  exportBtn:     { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: '#f0fdf4', borderWidth: 1, borderColor: '#86efac', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 20 },
  exportBtnText: { fontSize: 12, fontWeight: '700', color: '#16a34a' },
  emptyWrap: { alignItems: 'center', paddingVertical: 40 },
  emptyText: { fontSize: 15, color: '#9ca3af', fontStyle: 'italic' },
  sheet:       { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24 },
  sheetHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: '#f3f4f6' },
  sheetTitle:  { fontSize: 17, fontWeight: '700', color: '#1f2937' },
  cultureItem:       { flexDirection: 'row', alignItems: 'center', marginHorizontal: 16, marginVertical: 4, padding: 16, borderRadius: 12, backgroundColor: '#f9fafb', borderWidth: 1, borderColor: '#f3f4f6' },
  cultureItemActive: { backgroundColor: '#f0fdf4', borderColor: '#bbf7d0' },
  cultureItemName:   { fontSize: 15, fontWeight: '600', color: '#1f2937' },
  cultureItemSub:    { fontSize: 13, color: '#6b7280', marginTop: 2 },
  chipWrap:  { backgroundColor: '#fff', borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 50, paddingHorizontal: 8, paddingVertical: 3 },
  chipText:  { fontSize: 11, color: '#4b5563' },
});