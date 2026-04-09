// app/(user)/fertilisation.jsx
import React, { useState, useEffect } from 'react';
import {
  View, Text, TouchableOpacity, ScrollView, Modal,
  FlatList, ActivityIndicator, Platform, StyleSheet,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Calendar } from 'react-native-calendars';
import { BrandHeader } from '@components/BrandHeader';
import NotificationBell from '@components/NotificationBell';
import { useFertilisationNotifications } from '@hooks/useNotifications';
import { API_ENDPOINTS, apiFetch } from '@api/client';
import { useLanguage } from '@context/LanguageContext';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';

// ─── Données FAO-56 ───────────────────────────────────────────────────────────
const FERT = {
  Orange: [
    { jour:15, mois:1,  produit:'KNO₃',   doseParArbre:'2 kg/arbre',   doseParHa:'800 kg/ha'   },
    { jour:15, mois:3,  produit:'Urée',    doseParArbre:'0.5 kg/arbre', doseParHa:'200 kg/ha'   },
    { jour:15, mois:5,  produit:'NPK',     doseParArbre:'1.5 kg/arbre', doseParHa:'600 kg/ha'   },
    { jour:15, mois:9,  produit:'K₂SO₄',  doseParArbre:'1 kg/arbre',   doseParHa:'400 kg/ha'   },
  ],
  Citron: [
    { jour:10, mois:2,  produit:'Urée',    doseParArbre:'0.4 kg/arbre', doseParHa:'160 kg/ha'   },
    { jour:10, mois:5,  produit:'NPK',     doseParArbre:'1.2 kg/arbre', doseParHa:'480 kg/ha'   },
    { jour:10, mois:10, produit:'K₂SO₄',  doseParArbre:'0.8 kg/arbre', doseParHa:'320 kg/ha'   },
  ],
  Mandarine: [
    { jour:12, mois:2,  produit:'Urée',    doseParArbre:'0.4 kg/arbre', doseParHa:'160 kg/ha'   },
    { jour:12, mois:5,  produit:'NPK',     doseParArbre:'1 kg/arbre',   doseParHa:'400 kg/ha'   },
    { jour:12, mois:9,  produit:'K₂SO₄',  doseParArbre:'0.7 kg/arbre', doseParHa:'280 kg/ha'   },
  ],
  Tomate: [
    { jour:5,  mois:3,  produit:'DAP',       doseParArbre:null, doseParHa:'150 kg/ha' },
    { jour:5,  mois:4,  produit:'Urée',      doseParArbre:null, doseParHa:'80 kg/ha'  },
    { jour:5,  mois:5,  produit:'NPK',       doseParArbre:null, doseParHa:'200 kg/ha' },
    { jour:5,  mois:6,  produit:'Ca(NO₃)₂', doseParArbre:null, doseParHa:'100 kg/ha' },
  ],
  Blé: [
    { jour:1,  mois:11, produit:'DAP',    doseParArbre:null, doseParHa:'120 kg/ha' },
    { jour:1,  mois:2,  produit:'Urée x1',doseParArbre:null, doseParHa:'100 kg/ha' },
    { jour:1,  mois:3,  produit:'Urée x2',doseParArbre:null, doseParHa:'80 kg/ha'  },
  ],
  Olivier: [
    { jour:20, mois:2,  produit:'Urée',   doseParArbre:'0.3 kg/arbre', doseParHa:'60 kg/ha'  },
    { jour:20, mois:5,  produit:'NPK',    doseParArbre:'0.8 kg/arbre', doseParHa:'160 kg/ha' },
    { jour:20, mois:8,  produit:'K₂SO₄', doseParArbre:'0.5 kg/arbre', doseParHa:'100 kg/ha' },
  ],
  Pomme: [
    { jour:10, mois:2,  produit:'Urée',   doseParArbre:'0.4 kg/arbre', doseParHa:'200 kg/ha' },
    { jour:10, mois:4,  produit:'NPK',    doseParArbre:'1 kg/arbre',   doseParHa:'500 kg/ha' },
    { jour:10, mois:7,  produit:'K₂SO₄', doseParArbre:'0.8 kg/arbre', doseParHa:'400 kg/ha' },
  ],
  _default: [
    { jour:15, mois:3,  produit:'NPK',    doseParArbre:null, doseParHa:'100 kg/ha' },
    { jour:15, mois:7,  produit:'K₂SO₄', doseParArbre:null, doseParHa:'60 kg/ha'  },
  ],
};

function getFertData(nom) {
  if (!nom) return FERT._default;
  const k = Object.keys(FERT).find(
    key => key !== '_default' && nom.toLowerCase().includes(key.toLowerCase())
  );
  return k ? FERT[k] : FERT._default;
}

function getDoseLabel(ev, culture, t) {
  const nbArbres  = culture?.nombreArbres;
  const surface   = culture?.surface;
  const surfaceHa = surface ? (surface / 10000) : null;
  const treesLabel = t ? t('cultures.details.trees') : 'arbres';

  let lines = [];

  if (ev.doseParArbre) {
    let line = ev.doseParArbre;
    if (nbArbres) {
      const numKg = parseFloat(ev.doseParArbre);
      if (!isNaN(numKg)) {
        line = `${ev.doseParArbre} (${nbArbres} ${treesLabel})`;
      }
    }
    lines.push(line);
  }

  if (ev.doseParHa) {
    let line = ev.doseParHa;
    if (surfaceHa) {
      const numKg = parseFloat(ev.doseParHa);
      if (!isNaN(numKg)) {
        line = `${ev.doseParHa} (${surfaceHa.toFixed(2)} ha)`;
      }
    }
    lines.push(line);
  }

  return lines;
}

const MOIS_COURTS = {
  fr: ['janv','févr','mars','avr','mai','juin','juil','août','sept','oct','nov','déc'],
  en: ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'],
  ar: ['يناير','فبراير','مارس','أبريل','مايو','يونيو','يوليو','أغسطس','سبتمبر','أكتوبر','نوفمبر','ديسمبر'],
  tr: ['Oca','Şub','Mar','Nis','May','Haz','Tem','Ağu','Eyl','Eki','Kas','Ara'],
};

const ALERT_TXT = {
  fr: { count:'alerte(s) à traiter', tap:'Appuyez sur 🔔 pour les détails' },
  en: { count:'alert(s) pending',    tap:'Tap 🔔 for details'              },
  ar: { count:'تنبيهات',             tap:'اضغط على 🔔 للتفاصيل'            },
  tr: { count:'uyarı',               tap:'Detaylar için 🔔 ye dokunun'     },
};

export default function FertilisationPage() {
  const { language, t } = useLanguage();
  const lang = language || 'fr';

  const [cultures,     setCultures]     = useState([]);
  const [selected,     setSelected]     = useState(null);
  const [pickModal,    setPickModal]     = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [activeTab,    setActiveTab]    = useState('calendar');
  const [loading,      setLoading]      = useState(true);
  const [exporting,    setExporting]    = useState(false);

  const year = new Date().getFullYear();
  const moisCourts = MOIS_COURTS[lang] || MOIS_COURTS.fr;

  useEffect(() => {
    apiFetch(API_ENDPOINTS.cultures.base)
      .then(r => r.json())
      .then(res => { if (res.success) setCultures(res.data); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const culturesToShow = selected ? [selected] : cultures;

  const { notifications, markRead, markAllRead } = useFertilisationNotifications(
    culturesToShow, getFertData, lang
  );
  const urgentCount = notifications.filter(n => !n.read && n.type !== 'done').length;

  const allEvents = culturesToShow.flatMap(c =>
    getFertData(c.nom).map(ev => ({
      ...ev,
      cultureName: c.nom,
      parcelle:    c.parcelle || '',
      culture:     c,
      dateStr: `${year}-${String(ev.mois).padStart(2,'0')}-${String(ev.jour).padStart(2,'0')}`,
    }))
  );

  const markedDates = {};
  allEvents.forEach(ev => {
    if (!markedDates[ev.dateStr]) markedDates[ev.dateStr] = { marked:true, dots:[] };
    if (markedDates[ev.dateStr].dots.length === 0)
      markedDates[ev.dateStr].dots.push({ color:'#16A34A', key:'fert' });
  });

  const todayStr    = new Date().toISOString().split('T')[0];
  const finalMarked = {
    ...markedDates,
    [todayStr]:     { ...(markedDates[todayStr] || {}),     today:true },
    [selectedDate]: { ...(markedDates[selectedDate] || {}), selected:true, selectedColor:'#16A34A' },
  };

  const selectedMonth = parseInt(selectedDate.split('-')[1]);
  const eventsThisMonth = allEvents
    .filter(ev => ev.mois === selectedMonth)
    .sort((a, b) => a.jour - b.jour);

  // ✅ Fonction d'exportation CSV corrigée pour mobile
  const exportFertilisation = async () => {
    try {
      setExporting(true);
      
      const headers = ['Culture', 'Parcelle', 'Date', 'Mois', 'Produit', 'Dose/arbre', 'Dose/ha', 'Statut'];
      const today = new Date();
      const tM = today.getMonth() + 1;
      const tD = today.getDate();
      const year = new Date().getFullYear();

      const rows = [];
      culturesToShow.forEach(c => {
        getFertData(c.nom).forEach(ev => {
          let statut = t('fertilisation.inDays').replace('{{count}}', '?');
          if (ev.mois < tM || (ev.mois === tM && ev.jour <= tD)) statut = t('fertilisation.past');
          if (ev.mois === tM) statut = t('fertilisation.thisMonth');
          rows.push([
            c.nom,
            c.parcelle || '—',
            `${String(ev.jour).padStart(2, '0')}/${String(ev.mois).padStart(2, '0')}/${year}`,
            moisCourts[ev.mois - 1],
            ev.produit,
            ev.doseParArbre || '—',
            ev.doseParHa || '—',
            statut,
          ]);
        });
      });

      const escape = v => {
        const s = String(v ?? '');
        return s.includes(',') || s.includes('"') ? '"' + s.replace(/"/g, '""') + '"' : s;
      };
      
      const csv = '\uFEFF' + [
        headers.map(escape).join(','),
        ...rows.map(r => r.map(escape).join(',')),
      ].join('\r\n');
      
      const filename = `SmartIrrig_Fertilisation_${year}.csv`;

      if (Platform.OS === 'web') {
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        a.style.display = 'none';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      } else {
        // ✅ Mobile: utiliser expo-file-system et expo-sharing
        const fileUri = FileSystem.documentDirectory + filename;
        await FileSystem.writeAsStringAsync(fileUri, csv, {
          encoding: FileSystem.EncodingType.UTF8,
        });
        
        // Vérifier si le partage est disponible
        const isSharingAvailable = await Sharing.isAvailableAsync();
        if (isSharingAvailable) {
          await Sharing.shareAsync(fileUri, {
            mimeType: 'text/csv',
            dialogTitle: t('fertilisation.exporter') || 'Exporter la fertilisation',
            UTI: 'public.comma-separated-values-text',
          });
        } else {
          Alert.alert(
            t('common.error') || 'Erreur',
            t('fertilisation.sharingNotAvailable') || 'Le partage n\'est pas disponible sur cet appareil'
          );
        }
      }
    } catch (e) {
      console.error('Export error:', e);
      Alert.alert(
        t('common.error') || 'Erreur',
        t('fertilisation.exportError') || 'Erreur lors de l\'exportation. Veuillez réessayer.'
      );
    } finally {
      setExporting(false);
    }
  };

  const alertTxt = ALERT_TXT[lang] || ALERT_TXT.fr;

  if (loading) return (
    <SafeAreaView style={{ flex:1, backgroundColor:'#f3f4f6', alignItems:'center', justifyContent:'center' }}>
      <ActivityIndicator size="large" color="#4CAF50" />
    </SafeAreaView>
  );

  return (
    <SafeAreaView style={{ flex:1, backgroundColor:'#f3f4f6' }}>
      <BrandHeader
        title={t('fertilisation.title')}
        right={
          <View style={{ flexDirection:'row', alignItems:'center', gap:8 }}>
            <TouchableOpacity 
              style={s.exportBtn} 
              onPress={exportFertilisation} 
              activeOpacity={0.8}
              disabled={exporting}
            >
              {exporting ? (
                <ActivityIndicator size="small" color="#16a34a" />
              ) : (
                <>
                  <Ionicons name="download-outline" size={15} color="#16a34a" />
                  <Text style={s.exportBtnText}>{t('fertilisation.exporter')}</Text>
                </>
              )}
            </TouchableOpacity>
            <NotificationBell notifications={notifications} onMarkRead={markRead} onMarkAllRead={markAllRead} lang={lang} />
          </View>
        }
      />
      <ScrollView contentContainerStyle={{ paddingHorizontal:20, paddingBottom:90, paddingTop:12 }} showsVerticalScrollIndicator={false}>

        {urgentCount > 0 && (
          <View style={s.alertBanner}>
            <Ionicons name="alert-circle" size={16} color="#dc2626" />
            <View style={{ flex:1 }}>
              <Text style={s.alertTitle}>{urgentCount} {alertTxt.count}</Text>
              <Text style={s.alertSub}>{alertTxt.tap}</Text>
            </View>
          </View>
        )}

        <TouchableOpacity style={s.culturePicker} onPress={() => setPickModal(true)}>
          <View style={{ flex:1 }}>
            <Text style={s.culturePickerLabel}>{t('common.culture').toUpperCase()}</Text>
            <Text style={s.culturePickerName}>
              {selected ? selected.nom : t('fertilisation.allCrops')}
            </Text>
            {selected?.parcelle && <Text style={s.culturePickerSub}>{selected.parcelle}</Text>}
          </View>
          <Ionicons name="chevron-down" size={22} color="#4CAF50" />
        </TouchableOpacity>

        <View style={s.tabRow}>
          {['calendar','list'].map(tab => (
            <TouchableOpacity
              key={tab}
              style={[s.tab, activeTab === tab && s.tabActive]}
              onPress={() => setActiveTab(tab)}
            >
              <Ionicons
                name={tab === 'calendar' ? 'calendar-outline' : 'list-outline'}
                size={15}
                color={activeTab === tab ? '#111827' : '#9ca3af'}
                style={{ marginRight:5 }}
              />
              <Text style={[s.tabText, activeTab === tab && s.tabTextActive]}>
                {tab === 'calendar' ? t('fertilisation.tab_calendar') : t('fertilisation.tab_list')}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* ════ TAB CALENDRIER ════ */}
        {activeTab === 'calendar' && (
          <>
            <View style={s.calCard}>
              <Calendar
                current={selectedDate}
                markingType="multi-dot"
                markedDates={finalMarked}
                onDayPress={day => setSelectedDate(day.dateString)}
                theme={{
                  todayTextColor:'#16A34A', arrowColor:'#16A34A',
                  selectedDayBackgroundColor:'#16A34A', selectedDayTextColor:'white',
                  monthTextColor:'#1F2937', textMonthFontWeight:'bold',
                  textMonthFontSize:15, calendarBackground:'white',
                }}
              />
            </View>

            <Text style={s.sectionTitle}>
              {moisCourts[selectedMonth - 1]} {year}
              <Text style={s.sectionCount}> · {eventsThisMonth.length} {t('fertilisation.applications')}</Text>
            </Text>

            {eventsThisMonth.length === 0 ? (
              <View style={s.emptyWrap}>
                <Ionicons name="leaf-outline" size={44} color="#d1d5db" />
                <Text style={s.emptyText}>{t('fertilisation.nothingMonth')}</Text>
              </View>
            ) : (
              eventsThisMonth.map((ev, i) => {
                const evDate    = new Date(year, ev.mois - 1, ev.jour);
                const todayDate = new Date(); todayDate.setHours(0,0,0,0);
                const diff      = Math.round((evDate - todayDate) / 86400000);
                const isToday   = diff === 0;
                const isSoon    = diff > 0 && diff <= 3;
                const isPast    = diff < 0;
                const doseLines = getDoseLabel(ev, ev.culture, t);

                return (
                  <View key={i} style={[
                    s.eventCard,
                    isToday && s.eventCardUrgent,
                    isSoon  && s.eventCardSoon,
                    isPast  && s.eventCardPast,
                  ]}>
                    <View style={[s.eventDot, {
                      backgroundColor: isToday ? '#ef4444' : isSoon ? '#f59e0b' : isPast ? '#d1d5db' : '#16a34a',
                    }]} />
                    <View style={{ flex:1 }}>
                      <View style={{ flexDirection:'row', alignItems:'center', gap:6, marginBottom:4 }}>
                        {isToday && <Ionicons name="alert-circle" size={13} color="#ef4444" />}
                        {isSoon  && <Ionicons name="warning-outline" size={13} color="#f59e0b" />}
                        <Text style={[s.eventCulture, isToday && { color:'#dc2626' }]}>
                          {ev.cultureName}
                        </Text>
                        {ev.parcelle ? <Text style={s.eventParcelle}>· {ev.parcelle}</Text> : null}
                      </View>

                      {doseLines.map((line, li) => (
                        <Text key={li} style={[
                          s.eventProduit,
                          li > 0 && { fontSize: 12, color: '#6b7280', fontWeight: '500' }
                        ]}>
                          {line}
                        </Text>
                      ))}

                      <View style={s.eventBadgeRow}>
                        <View style={s.eventBadge}>
                          <Text style={s.eventBadgeText}>{ev.produit}</Text>
                        </View>
                        {isToday && <View style={[s.eventBadge, { backgroundColor:'#fee2e2' }]}>
                          <Text style={[s.eventBadgeText, { color:'#dc2626' }]}>{t('fertilisation.todayLabel')}</Text>
                        </View>}
                        {isSoon && <View style={[s.eventBadge, { backgroundColor:'#fef3c7' }]}>
                          <Text style={[s.eventBadgeText, { color:'#d97706' }]}>
                            {t('fertilisation.inDays').replace('{{count}}', String(diff))}
                          </Text>
                        </View>}
                        {isPast && <View style={[s.eventBadge, { backgroundColor:'#f3f4f6' }]}>
                          <Text style={[s.eventBadgeText, { color:'#9ca3af' }]}>{t('fertilisation.past')}</Text>
                        </View>}
                      </View>
                    </View>
                    <Text style={s.eventDate}>
                      {String(ev.jour).padStart(2,'0')}/{String(ev.mois).padStart(2,'0')}
                    </Text>
                  </View>
                );
              })
            )}
          </>
        )}

        {/* ════ TAB LISTE ANNUELLE ════ */}
        {activeTab === 'list' && (
          allEvents.length === 0 ? (
            <View style={s.emptyWrap}>
              <Ionicons name="leaf-outline" size={52} color="#d1d5db" />
              <Text style={s.emptyText}>{t('fertilisation.noCropSelected')}</Text>
            </View>
          ) : (
            (() => {
              const today   = new Date(); today.setHours(0,0,0,0);
              const sorted  = [...allEvents].sort((a,b) => a.mois !== b.mois ? a.mois - b.mois : a.jour - b.jour);
              let lastMonth = null;
              return sorted.map((ev, i) => {
                const showHeader = ev.mois !== lastMonth;
                lastMonth = ev.mois;
                const evDate = new Date(year, ev.mois - 1, ev.jour);
                const diff   = Math.round((evDate - today) / 86400000);
                const isPast = diff < 0;
                const doseLines = getDoseLabel(ev, ev.culture, t);
                return (
                  <View key={i}>
                    {showHeader && (
                      <Text style={s.monthHeader}>
                        {moisCourts[ev.mois - 1].toUpperCase()} {year}
                      </Text>
                    )}
                    <View style={[s.listCard, isPast && { opacity:0.55 }]}>
                      <View style={{ flex:1 }}>
                        <Text style={s.listCulture}>{ev.cultureName}</Text>
                        {doseLines.map((line, li) => (
                          <Text key={li} style={[
                            s.listDose,
                            li > 0 && { fontSize:11, color:'#6b7280', fontWeight:'400' }
                          ]}>
                            {li === 0 ? line : line}
                            {li === 0 ? ' ' : ''}<Text style={li === 0 ? s.listProduit : null}>
                              {li === 0 ? `(${ev.produit})` : ''}
                            </Text>
                          </Text>
                        ))}
                      </View>
                      <View style={{ alignItems:'flex-end' }}>
                        <Text style={s.listDate}>{String(ev.jour).padStart(2,'0')} {moisCourts[ev.mois-1]}</Text>
                        {isPast
                          ? <Text style={[s.listStatus, { color:'#9ca3af' }]}>{t('fertilisation.past')}</Text>
                          : diff === 0
                            ? <Text style={[s.listStatus, { color:'#dc2626' }]}>{t('fertilisation.todayLabel')}</Text>
                            : <Text style={[s.listStatus, { color:'#16a34a' }]}>
                                {t('fertilisation.inDays').replace('{{count}}', String(diff))}
                              </Text>
                        }
                      </View>
                    </View>
                  </View>
                );
              });
            })()
          )
        )}
      </ScrollView>

      {/* Modal sélection culture */}
      <Modal visible={pickModal} transparent animationType="slide" onRequestClose={() => setPickModal(false)}>
        <TouchableOpacity style={{ flex:1, backgroundColor:'rgba(0,0,0,0.45)' }} activeOpacity={1} onPress={() => setPickModal(false)}>
          <SafeAreaView edges={['bottom', 'left', 'right']} style={s.sheet}>
            <View style={s.sheetHeader}>
              <Text style={s.sheetTitle}>{t('fertilisation.chooseCrop')}</Text>
              <TouchableOpacity onPress={() => setPickModal(false)}>
                <Ionicons name="close" size={24} color="#6b7280" />
              </TouchableOpacity>
            </View>
            <FlatList
              data={[{ _id:null, nom: t('fertilisation.allCrops'), parcelle:'' }, ...cultures]}
              keyExtractor={item => item._id ?? 'all'}
              style={{ maxHeight:400 }}
              contentContainerStyle={{ padding:12 }}
              renderItem={({ item }) => {
                const isActive = selected?._id === item._id || (item._id === null && selected === null);
                return (
                  <TouchableOpacity
                    style={[s.cultureItem, isActive && s.cultureItemActive]}
                    onPress={() => { setSelected(item._id === null ? null : item); setPickModal(false); }}
                  >
                    <Text style={{ fontSize:20, marginRight:12 }}>{item._id === null ? '🌍' : '🌿'}</Text>
                    <View style={{ flex:1 }}>
                      <Text style={[s.cultureItemName, isActive && { color:'#15803d' }]}>{item.nom}</Text>
                      {item.parcelle ? <Text style={s.cultureItemSub}>{item.parcelle}</Text> : null}
                      {item.nombreArbres ? (
                        <Text style={[s.cultureItemSub, { color: '#7c3aed' }]}>
                          {item.nombreArbres} {t('cultures.details.trees')} • {item.surface ? (item.surface / 10000).toFixed(2) : '?'} ha
                        </Text>
                      ) : null}
                    </View>
                    {isActive && <Ionicons name="checkmark-circle" size={22} color="#16a34a" />}
                  </TouchableOpacity>
                );
              }}
            />
            <View style={{ height:24 }} />
          </SafeAreaView>
        </TouchableOpacity>
      </Modal>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  exportBtn:     { flexDirection:'row', alignItems:'center', gap:5, backgroundColor:'#f0fdf4', borderWidth:1, borderColor:'#86efac', paddingHorizontal:10, paddingVertical:6, borderRadius:20 },
  exportBtnText: { fontSize:12, fontWeight:'700', color:'#16a34a' },
  alertBanner:   { flexDirection:'row', alignItems:'flex-start', gap:8, backgroundColor:'#fee2e2', borderWidth:1, borderColor:'#fecaca', borderRadius:14, paddingHorizontal:14, paddingVertical:12, marginBottom:16 },
  alertTitle:    { fontSize:13, fontWeight:'700', color:'#dc2626' },
  alertSub:      { fontSize:11, color:'#ef4444', marginTop:2 },
  culturePicker:     { flexDirection:'row', alignItems:'center', justifyContent:'space-between', backgroundColor:'#fff', borderRadius:16, padding:16, marginBottom:16, shadowColor:'#000', shadowOffset:{width:0,height:1}, shadowOpacity:0.06, shadowRadius:4, elevation:2 },
  culturePickerLabel:{ fontSize:11, color:'#6b7280', textTransform:'uppercase', letterSpacing:0.5, marginBottom:2 },
  culturePickerName: { fontSize:18, fontWeight:'700', color:'#1f2937' },
  culturePickerSub:  { fontSize:12, color:'#6b7280', marginTop:3 },
  tabRow:    { flexDirection:'row', backgroundColor:'#f1f5f9', borderRadius:14, padding:4, marginBottom:20 },
  tab:       { flex:1, flexDirection:'row', alignItems:'center', justifyContent:'center', paddingVertical:10, borderRadius:11 },
  tabActive: { backgroundColor:'#fff', shadowColor:'#000', shadowOffset:{width:0,height:1}, shadowOpacity:0.06, shadowRadius:3, elevation:2 },
  tabText:       { fontSize:14, fontWeight:'500', color:'#9ca3af' },
  tabTextActive: { fontWeight:'700', color:'#111827' },
  calCard:    { backgroundColor:'#fff', borderRadius:16, overflow:'hidden', marginBottom:20, shadowColor:'#000', shadowOffset:{width:0,height:1}, shadowOpacity:0.06, shadowRadius:4, elevation:2 },
  sectionTitle: { fontSize:15, fontWeight:'700', color:'#374151', marginBottom:12 },
  sectionCount: { fontSize:13, fontWeight:'400', color:'#9ca3af' },
  emptyWrap:    { alignItems:'center', paddingVertical:48, gap:10 },
  emptyText:    { fontSize:14, color:'#9ca3af' },
  eventCard:        { flexDirection:'row', alignItems:'flex-start', backgroundColor:'#fff', borderRadius:14, padding:14, marginBottom:10, borderWidth:1, borderColor:'#f3f4f6', shadowColor:'#000', shadowOffset:{width:0,height:1}, shadowOpacity:0.05, shadowRadius:4, elevation:1 },
  eventCardUrgent:  { backgroundColor:'#fef2f2', borderColor:'#fecaca' },
  eventCardSoon:    { backgroundColor:'#fffbeb', borderColor:'#fde68a' },
  eventCardPast:    { opacity:0.6 },
  eventDot:         { width:10, height:10, borderRadius:5, marginTop:5, marginRight:12, flexShrink:0 },
  eventCulture:     { fontSize:14, fontWeight:'700', color:'#1f2937' },
  eventParcelle:    { fontSize:12, color:'#9ca3af' },
  eventProduit:     { fontSize:15, fontWeight:'700', color:'#16a34a', marginBottom:4 },
  eventBadgeRow:    { flexDirection:'row', gap:6, flexWrap:'wrap', marginTop:4 },
  eventBadge:       { backgroundColor:'#f0fdf4', paddingHorizontal:8, paddingVertical:3, borderRadius:20 },
  eventBadgeText:   { fontSize:11, fontWeight:'700', color:'#16a34a' },
  eventDate:        { fontSize:13, fontWeight:'600', color:'#6b7280', marginLeft:8 },
  monthHeader: { fontSize:12, fontWeight:'700', color:'#9ca3af', letterSpacing:1, marginTop:16, marginBottom:8 },
  listCard:    { flexDirection:'row', alignItems:'center', justifyContent:'space-between', backgroundColor:'#fff', borderRadius:14, padding:14, marginBottom:8, shadowColor:'#000', shadowOffset:{width:0,height:1}, shadowOpacity:0.05, shadowRadius:3, elevation:1 },
  listCulture: { fontSize:14, fontWeight:'700', color:'#1f2937', marginBottom:3 },
  listDose:    { fontSize:13, color:'#16a34a', fontWeight:'600' },
  listProduit: { fontSize:12, color:'#6b7280', fontWeight:'400' },
  listDate:    { fontSize:13, fontWeight:'600', color:'#374151', marginBottom:3 },
  listStatus:  { fontSize:11, fontWeight:'700' },
  sheet:       { position:'absolute', bottom:0, left:0, right:0, backgroundColor:'#fff', borderTopLeftRadius:24, borderTopRightRadius:24 },
  sheetHeader: { flexDirection:'row', justifyContent:'space-between', alignItems:'center', paddingHorizontal:20, paddingVertical:16, borderBottomWidth:1, borderBottomColor:'#f3f4f6' },
  sheetTitle:  { fontSize:17, fontWeight:'700', color:'#1f2937' },
  cultureItem:       { flexDirection:'row', alignItems:'center', padding:14, borderRadius:14, marginBottom:8, backgroundColor:'#f9fafb', borderWidth:1, borderColor:'transparent' },
  cultureItemActive: { backgroundColor:'#f0fdf4', borderColor:'#bbf7d0' },
  cultureItemName:   { fontSize:15, fontWeight:'700', color:'#1f2937' },
  cultureItemSub:    { fontSize:12, color:'#9ca3af', marginTop:2 },
});