// app/(tabs)/cultures.jsx — Merge V1 (interface) + V2 (Type de Sol / RFU)
import React, { useState, useCallback, useRef } from 'react';
import {
  View, Text, TouchableOpacity, Pressable, Alert, TextInput,
  Modal, FlatList, ActivityIndicator, ScrollView,
  Platform, StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from 'expo-router';
import DateTimePicker from '@react-native-community/datetimepicker';
import { BrandHeader } from '@components/BrandHeader';
import { API_ENDPOINTS, apiFetch } from '@api/client';
import cultureService from '../../api/cultureService';
import { useLanguage } from '@context/LanguageContext';

// ══════════════════════════════════════════════════════════════════════════════
// DONNÉES TYPES DE SOL (depuis V2)
// ══════════════════════════════════════════════════════════════════════════════
const TYPES_SOL = [
  {
    key: 'sableux',
    nom: 'Sableux',
    emoji: '🏖️',
    description: 'Drainage rapide • Irrigation fréquente',
    couleur: '#f59e0b',
    fondCouleur: '#fffbeb',
    ruInfo: '60 mm/m • RFU: 40%',
  },
  {
    key: 'limono_sableux',
    nom: 'Limono-Sableux',
    emoji: '🌾',
    description: 'Bonne structure • Drainage modéré',
    couleur: '#84cc16',
    fondCouleur: '#f7fee7',
    ruInfo: '90 mm/m • RFU: 45%',
  },
  {
    key: 'limoneux',
    nom: 'Limoneux',
    emoji: '🌱',
    description: 'Sol équilibré • Idéal cultures',
    couleur: '#22c55e',
    fondCouleur: '#f0fdf4',
    ruInfo: '120 mm/m • RFU: 50%',
  },
  {
    key: 'argilo_limoneux',
    nom: 'Argilo-Limoneux',
    emoji: '🏔️',
    description: 'Forte rétention • Drainage lent',
    couleur: '#8b5cf6',
    fondCouleur: '#f5f3ff',
    ruInfo: '140 mm/m • RFU: 55%',
  },
  {
    key: 'argileux',
    nom: 'Argileux',
    emoji: '🪨',
    description: 'Très forte rétention • Risque engorgement',
    couleur: '#ef4444',
    fondCouleur: '#fef2f2',
    ruInfo: '150 mm/m • RFU: 60%',
  },
];

// ══════════════════════════════════════════════════════════════════════════════
// KC CULTURES FALLBACK (depuis V1)
// ══════════════════════════════════════════════════════════════════════════════
const KC_CULTURES_FALLBACK = [
  { nom: 'Orange',         variete: 'Navel Washington'      },
  { nom: 'Citron',         variete: 'Eureka / Lisbon'       },
  { nom: 'Mandarine',      variete: 'Clémentine'            },
  { nom: 'Pamplemousse',   variete: 'Standard'              },
  { nom: 'Olivier',        variete: 'Chemlali / Chetoui'    },
  { nom: 'Grenadier',      variete: 'Standard'              },
  { nom: 'Figuier',        variete: 'Standard'              },
  { nom: 'Pommier',        variete: 'Golden / Red'          },
  { nom: 'Poirier',        variete: 'Williams / Conference' },
  { nom: 'Pêcher',         variete: 'Standard'              },
  { nom: 'Abricotier',     variete: 'Standard'              },
  { nom: 'Vigne',          variete: 'Table / Vin'           },
  { nom: 'Dattier',        variete: 'Deglet Nour'           },
  { nom: 'Tomate',         variete: 'Cœur de bœuf / Ronde' },
  { nom: 'Pomme de terre', variete: 'Standard'              },
  { nom: 'Poivron',        variete: 'Standard'              },
  { nom: 'Oignon',         variete: 'Standard'              },
  { nom: 'Concombre',      variete: 'Standard'              },
  { nom: 'Courgette',      variete: 'Standard'              },
  { nom: 'Laitue',         variete: 'Standard'              },
  { nom: 'Haricot',        variete: 'Standard'              },
  { nom: 'Melon',          variete: 'Standard'              },
  { nom: 'Artichaut',      variete: 'Standard'              },
  { nom: 'Blé',            variete: 'Dur / Tendre'          },
  { nom: 'Orge',           variete: 'Standard'              },
  { nom: 'Maïs',           variete: 'Standard'              },
  { nom: 'Tournesol',      variete: 'Standard'              },
];

// ══════════════════════════════════════════════════════════════════════════════
// CONFIRM MODAL (V1 — inchangé)
// ══════════════════════════════════════════════════════════════════════════════
function ConfirmModal({ visible, title, message, onConfirm, onCancel, danger = true, t }) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
      <SafeAreaView
        style={{ flex:1, backgroundColor:'rgba(0,0,0,0.4)', alignItems:'center', justifyContent:'center', paddingHorizontal:24 }}
        edges={['top','left','right','bottom']}
      >
        <View style={{
          backgroundColor:'#fff', borderRadius:20, padding:28, width:'100%', maxWidth:400,
          shadowColor:'#000', shadowOffset:{width:0,height:8}, shadowOpacity:0.2, shadowRadius:24, elevation:12,
        }}>
          <View style={{
            width:52, height:52, borderRadius:26,
            backgroundColor: danger ? '#fef2f2' : '#eff6ff',
            alignItems:'center', justifyContent:'center', alignSelf:'center', marginBottom:16,
          }}>
            <Ionicons name={danger ? 'trash-outline' : 'help-circle-outline'} size={26} color={danger ? '#ef4444' : '#3b82f6'} />
          </View>
          <Text style={{ fontSize:17, fontWeight:'700', color:'#111827', textAlign:'center', marginBottom:8 }}>{title}</Text>
          <Text style={{ fontSize:14, color:'#6b7280', textAlign:'center', marginBottom:24, lineHeight:20 }}>{message}</Text>
          <View style={{ flexDirection:'row', gap:10 }}>
            <TouchableOpacity
              style={{ flex:1, paddingVertical:13, borderRadius:12, borderWidth:1, borderColor:'#e5e7eb', alignItems:'center', backgroundColor:'#f9fafb' }}
              onPress={onCancel} activeOpacity={0.8}
            >
              <Text style={{ fontSize:14, fontWeight:'600', color:'#374151' }}>{t('cultures.modal.cancel')}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={{ flex:1, paddingVertical:13, borderRadius:12, alignItems:'center', backgroundColor: danger ? '#ef4444' : '#3b82f6' }}
              onPress={onConfirm} activeOpacity={0.85}
            >
              <Text style={{ fontSize:14, fontWeight:'700', color:'#fff' }}>
                {danger ? t('cultures.modal.delete') : t('cultures.modal.confirm')}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </SafeAreaView>
    </Modal>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// SELECT PICKER MODAL (V1 — avec search bar et icônes)
// ══════════════════════════════════════════════════════════════════════════════
function SelectPickerModal({ visible, title, items, selectedValue, onSelect, onClose, loading = false, loadingText = 'Chargement...' }) {
  const [search, setSearch] = useState('');
  const searchRef = useRef(null);

  const filtered = items.filter(item =>
    item.toLowerCase().includes(search.toLowerCase())
  );

  const handleClose = () => { setSearch(''); onClose(); };
  const handleSelect = (item) => { setSearch(''); onSelect(item); };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={handleClose}
      statusBarTranslucent
    >
      <View style={pk.overlay}>
        <TouchableOpacity style={pk.backdrop} activeOpacity={1} onPress={handleClose} />
        <View style={pk.sheet}>
          <View style={pk.handleWrap}><View style={pk.handle} /></View>
          <View style={pk.header}>
            <Text style={pk.title}>{title}</Text>
            <TouchableOpacity onPress={handleClose} style={pk.closeBtn} activeOpacity={0.7}>
              <Ionicons name="close" size={20} color="#6b7280" />
            </TouchableOpacity>
          </View>
          <View style={pk.searchWrap}>
            <Ionicons name="search-outline" size={16} color="#9ca3af" style={{ marginRight: 8 }} />
            <TextInput
              ref={searchRef}
              style={pk.searchInput}
              placeholder="Rechercher..."
              placeholderTextColor="#9ca3af"
              value={search}
              onChangeText={setSearch}
              autoCorrect={false}
              autoCapitalize="none"
              returnKeyType="search"
            />
            {search.length > 0 && (
              <TouchableOpacity onPress={() => setSearch('')} activeOpacity={0.7}>
                <Ionicons name="close-circle" size={16} color="#9ca3af" />
              </TouchableOpacity>
            )}
          </View>
          <View style={pk.countWrap}>
            <Text style={pk.countText}>
              {loading ? loadingText : `${filtered.length} résultat${filtered.length !== 1 ? 's' : ''}`}
            </Text>
          </View>
          {loading ? (
            <View style={pk.loadingWrap}>
              <ActivityIndicator size="large" color="#16a34a" />
              <Text style={{ marginTop: 12, fontSize: 13, color: '#6b7280' }}>{loadingText}</Text>
            </View>
          ) : (
            <FlatList
              data={filtered}
              keyExtractor={(item, i) => `${item}-${i}`}
              keyboardShouldPersistTaps="always"
              showsVerticalScrollIndicator
              style={pk.list}
              contentContainerStyle={{ paddingBottom: 20 }}
              renderItem={({ item }) => {
                const isSelected = item === selectedValue;
                return (
                  <TouchableOpacity
                    style={[pk.item, isSelected && pk.itemActive]}
                    onPress={() => handleSelect(item)}
                    activeOpacity={0.75}
                  >
                    <View style={[pk.itemIcon, isSelected && pk.itemIconActive]}>
                      <Ionicons
                        name={isSelected ? 'checkmark' : 'leaf-outline'}
                        size={14}
                        color={isSelected ? '#fff' : '#16a34a'}
                      />
                    </View>
                    <Text style={[pk.itemText, isSelected && pk.itemTextActive]} numberOfLines={1}>
                      {item}
                    </Text>
                    {isSelected && (
                      <Ionicons name="checkmark-circle" size={18} color="#16a34a" />
                    )}
                  </TouchableOpacity>
                );
              }}
              ListEmptyComponent={
                <View style={{ alignItems: 'center', paddingVertical: 40 }}>
                  <Ionicons name="search-outline" size={36} color="#d1d5db" />
                  <Text style={{ fontSize: 14, color: '#9ca3af', marginTop: 10 }}>Aucun résultat</Text>
                </View>
              }
            />
          )}
        </View>
      </View>
    </Modal>
  );
}

const pk = StyleSheet.create({
  overlay:        { flex: 1, justifyContent: 'flex-end', backgroundColor: 'transparent' },
  backdrop:       { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.45)' },
  sheet:          {
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '78%',
    minHeight: 360,
    shadowColor: '#000', shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.12, shadowRadius: 16, elevation: 20,
  },
  handleWrap:     { alignItems: 'center', paddingTop: 10, paddingBottom: 4 },
  handle:         { width: 36, height: 4, borderRadius: 2, backgroundColor: '#e5e7eb' },
  header:         {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingBottom: 14, paddingTop: 4,
    borderBottomWidth: 1, borderBottomColor: '#f3f4f6',
  },
  title:          { fontSize: 16, fontWeight: '700', color: '#111827' },
  closeBtn:       {
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: '#f3f4f6',
    alignItems: 'center', justifyContent: 'center',
  },
  searchWrap:     {
    flexDirection: 'row', alignItems: 'center',
    marginHorizontal: 16, marginTop: 14, marginBottom: 6,
    backgroundColor: '#f3f4f6', borderRadius: 12,
    paddingHorizontal: 12, paddingVertical: 10,
    borderWidth: 1, borderColor: '#e5e7eb',
  },
  searchInput:    { flex: 1, fontSize: 14, color: '#111827', padding: 0 },
  countWrap:      { paddingHorizontal: 20, paddingBottom: 8 },
  countText:      { fontSize: 11, color: '#9ca3af', fontWeight: '500' },
  list:           { flex: 1 },
  loadingWrap:    { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 40 },
  item:           {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 14,
    borderBottomWidth: 1, borderBottomColor: '#f9fafb',
    gap: 12,
  },
  itemActive:     { backgroundColor: '#f0fdf4' },
  itemIcon:       {
    width: 28, height: 28, borderRadius: 14,
    backgroundColor: '#f0fdf4', borderWidth: 1, borderColor: '#bbf7d0',
    alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  },
  itemIconActive: { backgroundColor: '#16a34a', borderColor: '#16a34a' },
  itemText:       { flex: 1, fontSize: 14, color: '#374151' },
  itemTextActive: { fontWeight: '700', color: '#15803d' },
});

// ══════════════════════════════════════════════════════════════════════════════
// SOL PICKER MODAL (depuis V2)
// ══════════════════════════════════════════════════════════════════════════════
function SolPickerModal({ visible, selectedKey, onSelect, onClose }) {
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={{ flex:1, justifyContent:'flex-end', backgroundColor:'rgba(0,0,0,0.45)' }}>
        <TouchableOpacity style={{ flex:1 }} activeOpacity={1} onPress={onClose} />
        <View style={{ backgroundColor:'#fff', borderTopLeftRadius:24, borderTopRightRadius:24, paddingBottom:32 }}>
          <View style={{ alignItems:'center', paddingTop:12, paddingBottom:8 }}>
            <View style={{ width:40, height:4, backgroundColor:'#e5e7eb', borderRadius:2 }} />
          </View>
          <View style={{
            flexDirection:'row', justifyContent:'space-between', alignItems:'center',
            paddingHorizontal:20, paddingBottom:16, borderBottomWidth:1, borderBottomColor:'#f3f4f6',
          }}>
            <View>
              <Text style={{ fontSize:18, fontWeight:'700', color:'#111827' }}>🌍 Type de Sol</Text>
              <Text style={{ fontSize:12, color:'#6b7280', marginTop:2 }}>Influence la fréquence d'irrigation (RFU)</Text>
            </View>
            <TouchableOpacity onPress={onClose} activeOpacity={0.7} style={{ padding:4 }}>
              <Ionicons name="close" size={22} color="#6b7280" />
            </TouchableOpacity>
          </View>
          {TYPES_SOL.map((sol) => {
            const isSelected = sol.key === selectedKey;
            return (
              <TouchableOpacity
                key={sol.key}
                onPress={() => { onSelect(sol.key); onClose(); }}
                activeOpacity={0.75}
                style={{
                  flexDirection: 'row', alignItems: 'center',
                  paddingHorizontal: 20, paddingVertical: 14,
                  marginHorizontal: 12, marginTop: 8,
                  borderRadius: 14,
                  backgroundColor: isSelected ? sol.fondCouleur : '#f9fafb',
                  borderWidth: isSelected ? 2 : 1,
                  borderColor: isSelected ? sol.couleur : '#f3f4f6',
                }}
              >
                <Text style={{ fontSize: 28, marginRight: 14 }}>{sol.emoji}</Text>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 15, fontWeight: isSelected ? '700' : '600', color: isSelected ? sol.couleur : '#1f2937' }}>
                    {sol.nom}
                  </Text>
                  <Text style={{ fontSize: 12, color: '#6b7280', marginTop: 2 }}>{sol.description}</Text>
                  <Text style={{ fontSize: 11, color: sol.couleur, marginTop: 2, fontWeight: '600' }}>{sol.ruInfo}</Text>
                </View>
                {isSelected && <Ionicons name="checkmark-circle" size={24} color={sol.couleur} />}
              </TouchableOpacity>
            );
          })}
          <View style={{ marginHorizontal: 20, marginTop: 16, padding: 12, backgroundColor: '#eff6ff', borderRadius: 10 }}>
            <Text style={{ fontSize: 11, color: '#3b82f6', lineHeight: 16 }}>
              📖 <Text style={{ fontWeight: '700' }}>FAO-56 :</Text> La RFU (Réserve Facilement Utilisable) = fraction p × RU. Elle détermine le seuil critique avant stress hydrique et la fréquence optimale d'irrigation.
            </Text>
          </View>
        </View>
      </View>
    </Modal>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// SELECT FIELD (V1 — inchangé)
// ══════════════════════════════════════════════════════════════════════════════
function SelectField({ label, required, value, placeholder, onPress, hasError = false, loading = false }) {
  return (
    <View style={{ marginBottom: 16 }}>
      <Text style={s.fieldLabel}>
        {label}
        {required && <Text style={{ color: '#ef4444' }}> *</Text>}
      </Text>
      <TouchableOpacity
        style={[sf.btn, hasError && sf.btnError]}
        onPress={onPress}
        activeOpacity={0.75}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator size="small" color="#16a34a" style={{ marginRight: 8 }} />
        ) : (
          <Ionicons
            name="leaf-outline"
            size={16}
            color={value ? '#16a34a' : '#9ca3af'}
            style={{ marginRight: 8 }}
          />
        )}
        <Text style={[sf.text, !value && sf.placeholder]} numberOfLines={1}>
          {value || placeholder}
        </Text>
        <Ionicons name="chevron-down" size={18} color="#9ca3af" />
      </TouchableOpacity>
    </View>
  );
}

const sf = StyleSheet.create({
  btn: {
    flexDirection: 'row', alignItems: 'center',
    borderWidth: 1, borderColor: '#d1d5db',
    borderRadius: 10, backgroundColor: '#f9fafb',
    paddingHorizontal: 14, paddingVertical: 0,
    height: 48,
  },
  btnError:    { borderColor: '#ef4444', backgroundColor: '#fff8f8' },
  text:        { flex: 1, fontSize: 14, color: '#111827' },
  placeholder: { color: '#9ca3af' },
});

// ══════════════════════════════════════════════════════════════════════════════
// CULTURE CARD (V1 + badge sol de V2)
// ══════════════════════════════════════════════════════════════════════════════
function CultureCard({ item, deletingId, onDelete, formatDate, t }) {
  const solData = TYPES_SOL.find(sol => sol.key === item.typeSol) || null;

  return (
    <View style={s.card}>
      <View style={{ flex:1 }}>
        <View style={s.cardTopRow}>
          <Text style={s.cardNom}>{item.nom}</Text>
          {item.kcActuel != null && (
            <View style={s.kcBadge}>
              <Text style={s.kcBadgeText}>
                Kc {item.kcActuel.toFixed(2)}{item.stadeActuel ? ` · ${item.stadeActuel}` : ''}
              </Text>
            </View>
          )}
        </View>
        <Text style={s.cardRow}>🌿 {t('cultures.card.variety')} : <Text style={s.cardVal}>{item.variete}</Text></Text>
        {item.parcelle       && <Text style={s.cardRow}>📍 {t('cultures.card.parcel')} : <Text style={s.cardVal}>{item.parcelle}</Text></Text>}
        {item.region         && <Text style={s.cardRow}>🌍 Région : <Text style={s.cardVal}>{item.region}</Text></Text>}
        {item.datePlantation && <Text style={s.cardRow}>📅 {t('cultures.card.planted')} : <Text style={s.cardVal}>{formatDate(item.datePlantation)}</Text></Text>}
        {item.surface != null && <Text style={s.cardRow}>📐 {t('cultures.card.surface')} : <Text style={s.cardVal}>{item.surface} m²</Text></Text>}
        {item.nombreArbres != null && <Text style={s.cardRow}>🌳 {t('cultures.card.trees')} : <Text style={s.cardVal}>{item.nombreArbres}</Text></Text>}

        {/* ✅ Badge Type de Sol — nouveau depuis V2 */}
        {solData && (
          <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 6 }}>
            <View style={[s.solBadge, { backgroundColor: solData.fondCouleur, borderColor: solData.couleur }]}>
              <Text style={{ fontSize: 12 }}>{solData.emoji}</Text>
              <Text style={[s.solBadgeText, { color: solData.couleur }]}>{solData.nom}</Text>
              <Text style={[s.solBadgeRu, { color: solData.couleur }]}>{solData.ruInfo}</Text>
            </View>
          </View>
        )}

        <Text style={s.cardDate}>{t('cultures.card.addedOn')} {formatDate(item.createdAt)}</Text>
      </View>
      <Pressable
        style={({ pressed }) => [
          s.deleteBtn,
          deletingId === item._id && { opacity:0.4 },
          pressed && { opacity:0.6 },
        ]}
        onPress={() => onDelete(item._id)}
        disabled={deletingId === item._id}
        hitSlop={{ top:10, bottom:10, left:10, right:10 }}
      >
        {deletingId === item._id
          ? <ActivityIndicator size="small" color="#ef4444" />
          : <Ionicons name="trash-outline" size={22} color="#ef4444" />}
      </Pressable>
    </View>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// MAIN PAGE
// ══════════════════════════════════════════════════════════════════════════════
export default function CulturesPage() {
  const { t } = useLanguage();

  const [cultures,           setCultures]           = useState([]);
  const [loading,            setLoading]            = useState(true);
  const [submitting,         setSubmitting]         = useState(false);
  const [modalVisible,       setModalVisible]       = useState(false);
  const [showDatePicker,     setShowDatePicker]     = useState(false);
  const [error,              setError]              = useState(null);
  const [deletingId,         setDeletingId]         = useState(null);
  const [fieldErrors,        setFieldErrors]        = useState({});
  const [confirmDelete,      setConfirmDelete]      = useState({ visible:false, id:null });
  const [availableCultures,  setAvailableCultures]  = useState([]);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);

  // Pickers state
  const [nomPickerVisible,     setNomPickerVisible]     = useState(false);
  const [varietePickerVisible, setVarietePickerVisible] = useState(false);
  const [solPickerVisible,     setSolPickerVisible]     = useState(false); // ✅ NOUVEAU

  const [newCulture, setNewCulture] = useState({
    parcelle: '', nom: '', variete: '',
    datePlantation: null, surface: '', nombreArbres: '',
    typeSol: 'limoneux',
    region: '',  // ✅ Région géographique
  });

  const formatDate = (date) => {
    if (!date) return '';
    const d = new Date(date);
    return `${String(d.getDate()).padStart(2,'0')}/${String(d.getMonth()+1).padStart(2,'0')}/${d.getFullYear()}`;
  };

  const allCultures              = availableCultures.length > 0 ? availableCultures : KC_CULTURES_FALLBACK;
  const nomSuggestions           = allCultures.map(c => c.nom);
  const allVarietes              = [...new Set(allCultures.map(c => c.variete))];
  const totalCulturesDisponibles = allCultures.length;

  // Sol sélectionné pour affichage dans le formulaire
  const selectedSolData = TYPES_SOL.find(s => s.key === newCulture.typeSol) || TYPES_SOL[2];

  const renderCard = useCallback(({ item }) => (
    <CultureCard item={item} deletingId={deletingId} onDelete={deleteCulture} formatDate={formatDate} t={t} />
  ), [deletingId]); // eslint-disable-line react-hooks/exhaustive-deps

  const loadAllAvailableCultures = async () => {
    try {
      setLoadingSuggestions(true);
      const response = await apiFetch(API_ENDPOINTS.kc.search);
      if (response.ok) {
        const result = await response.json();
        if (result.success && Array.isArray(result.data)) {
          const fromDB = result.data.map(item => ({ nom: item.culture, variete: item.variete || 'Standard' }));
          const merged = [
            ...fromDB,
            ...KC_CULTURES_FALLBACK.filter(local => !fromDB.some(db => db.nom.toLowerCase() === local.nom.toLowerCase())),
          ].sort((a, b) => a.nom.localeCompare(b.nom));
          setAvailableCultures(merged);
        }
      }
    } catch (err) {
      setAvailableCultures(KC_CULTURES_FALLBACK);
    } finally {
      setLoadingSuggestions(false);
    }
  };

  const loadCultures = async () => {
    try {
      setLoading(true); setError(null);
      const result = await cultureService.getAllCultures();
      setCultures(result?.success ? result.data : []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(useCallback(() => { loadCultures(); loadAllAvailableCultures(); }, []));

  const handleNomSelect = (selectedNom) => {
    const found = allCultures.find(c => c.nom.toLowerCase() === selectedNom.toLowerCase());
    setNewCulture(prev => ({
      ...prev,
      nom: selectedNom,
      variete: found ? found.variete : prev.variete || 'Standard',
    }));
    setFieldErrors(prev => ({ ...prev, nom: null, variete: null }));
    setNomPickerVisible(false);
  };

  const handleVarieteSelect = (selectedVariete) => {
    setNewCulture(prev => ({ ...prev, variete: selectedVariete }));
    setFieldErrors(prev => ({ ...prev, variete: null }));
    setVarietePickerVisible(false);
  };

  const validate = () => {
    const errs = {};
    if (!newCulture.parcelle.trim())   errs.parcelle = t('cultures.modal.parcelRequired');
    if (!newCulture.nom.trim())        errs.nom = t('cultures.modal.nomRequired');
    if (!newCulture.variete.trim())    errs.variete = t('cultures.modal.varietyRequired');
    if (!newCulture.datePlantation)    errs.datePlantation = t('cultures.modal.dateRequired');
    if (!newCulture.surface.trim()) {
      errs.surface = t('cultures.modal.surfaceRequired');
    } else if (isNaN(parseFloat(newCulture.surface)) || parseFloat(newCulture.surface) <= 0) {
      errs.surface = t('cultures.modal.surfaceInvalid');
    }
    if (newCulture.nombreArbres?.trim()) {
      const n = parseInt(newCulture.nombreArbres);
      if (isNaN(n) || n <= 0) errs.nombreArbres = t('cultures.modal.treesInvalid');
    }
    setFieldErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const addCulture = async () => {
    if (!validate()) return;
    try {
      setSubmitting(true);
      const result = await cultureService.addCulture({
        parcelle:       newCulture.parcelle.trim(),
        nom:            newCulture.nom.trim(),
        variete:        newCulture.variete.trim(),
        datePlantation: newCulture.datePlantation.toISOString(),
        surface:        parseFloat(newCulture.surface),
        nombreArbres:   newCulture.nombreArbres?.trim() ? parseInt(newCulture.nombreArbres) : undefined,
        typeSol:        newCulture.typeSol,
        region:         newCulture.region?.trim() || undefined,  // ✅ Région
      });
      if (result.success) {
        setModalVisible(false); resetForm(); loadCultures();
        Alert.alert(t('common.successTitle'), t('cultures.modal.successAdd'));
      } else {
        Alert.alert(t('common.errorTitle'), result.error || t('cultures.modal.errorAdd'));
      }
    } catch (err) {
      Alert.alert(t('common.errorTitle'), err.message || t('cultures.modal.errorServer'));
    } finally {
      setSubmitting(false);
    }
  };

  const deleteCulture = (id) => setConfirmDelete({ visible:true, id });

  const doConfirmedDelete = async () => {
    const id = confirmDelete.id;
    setConfirmDelete({ visible:false, id:null }); setDeletingId(id);
    try {
      const result = await cultureService.deleteCulture(id);
      if (result.success) {
        setCultures(prev => prev.filter(c => c._id !== id));
      } else {
        Alert.alert(t('common.errorTitle'), result?.error || result?.message || t('cultures.modal.errorDelete'));
      }
    } catch (e) {
      Alert.alert(t('common.errorTitle'), e?.message || t('cultures.modal.errorDelete'));
    } finally {
      setDeletingId(null);
    }
  };

  const resetForm = () => {
    setNewCulture({ parcelle:'', nom:'', variete:'', datePlantation:null, surface:'', nombreArbres:'', typeSol:'limoneux', region:'' });
    setFieldErrors({});
    setNomPickerVisible(false);
    setVarietePickerVisible(false);
    setSolPickerVisible(false);
  };

  if (loading && cultures.length === 0) {
    return (
      <SafeAreaView style={{ flex:1, justifyContent:'center', alignItems:'center' }}>
        <ActivityIndicator size="large" color="#16a34a" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex:1, backgroundColor:'#f3f4f6' }}>
      <BrandHeader
        title={t('cultures.title')}
        right={
          <TouchableOpacity style={s.addBtn} onPress={() => setModalVisible(true)}>
            <Ionicons name="add" size={18} color="#fff" />
            <Text style={s.addBtnText}>{t('cultures.add')}</Text>
          </TouchableOpacity>
        }
      />

      {loading && cultures.length > 0 && (
        <View style={s.refreshBar}>
          <ActivityIndicator size="small" color="#16a34a" />
          <Text style={s.refreshText}>{t('cultures.refreshing')}</Text>
        </View>
      )}

      {error && !loading && (
        <View style={s.errorBanner}>
          <Ionicons name="wifi-outline" size={16} color="#ef4444" />
          <Text style={s.errorBannerText}>{error}</Text>
          <TouchableOpacity onPress={loadCultures}>
            <Text style={s.errorRetry}>{t('cultures.retry')}</Text>
          </TouchableOpacity>
        </View>
      )}

      <FlatList
        data={cultures}
        keyExtractor={item => item._id}
        contentContainerStyle={{ padding:12, paddingBottom:100 }}
        ListEmptyComponent={!loading && (
          <View style={s.emptyWrap}>
            <Ionicons name="leaf-outline" size={52} color="#d1d5db" />
            <Text style={s.emptyText}>{t('cultures.empty')}</Text>
          </View>
        )}
        renderItem={renderCard}
      />

      <ConfirmModal
        visible={confirmDelete.visible}
        title={t('cultures.modal.deleteTitle')}
        message={t('cultures.modal.deleteMsg')}
        onConfirm={doConfirmedDelete}
        onCancel={() => setConfirmDelete({ visible:false, id:null })}
        danger
        t={t}
      />

      {/* ─── MODAL AJOUT CULTURE ─────────────────────────────────────────────── */}
      <Modal
        visible={modalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => { setModalVisible(false); resetForm(); }}
      >
        <SafeAreaView style={s.overlay} edges={['top','left','right','bottom']}>
          <View style={s.sheet}>
            <View style={s.modalHeader}>
              <Text style={s.modalTitle}>{t('cultures.modal.addTitle')}</Text>
              <TouchableOpacity onPress={() => { setModalVisible(false); resetForm(); }}>
                <Ionicons name="close" size={24} color="#fff" />
              </TouchableOpacity>
            </View>

            <ScrollView
              style={{ padding: 20 }}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
            >
              {/* Parcelle */}
              <View style={{ marginBottom: 16 }}>
                <Text style={s.fieldLabel}>{t('cultures.modal.parcelLabel')} <Text style={{ color:'#ef4444' }}>*</Text></Text>
                <TextInput
                  style={[s.fieldInput, fieldErrors.parcelle && s.fieldInputError]}
                  placeholder={t('cultures.modal.parcelPlaceholder')}
                  value={newCulture.parcelle}
                  onChangeText={v => { setNewCulture({...newCulture, parcelle:v}); setFieldErrors(p => ({...p, parcelle:null})); }}
                />
                {fieldErrors.parcelle && <Text style={s.errorText}>{fieldErrors.parcelle}</Text>}
              </View>

              {/* Région */}
              <View style={{ marginBottom: 16 }}>
                <Text style={s.fieldLabel}>
                  🌍 Région{' '}
                  <Text style={{ color:'#9ca3af', fontSize:12, fontWeight:'400' }}>(optionnel)</Text>
                </Text>
                <TextInput
                  style={s.fieldInput}
                  placeholder="ex: Tunis, Sfax, Nabeul, Sousse…"
                  placeholderTextColor="#9ca3af"
                  value={newCulture.region}
                  onChangeText={v => setNewCulture({ ...newCulture, region: v })}
                  autoCapitalize="words"
                />
                <Text style={{ fontSize:11, color:'#9ca3af', marginTop:4 }}>
                  Utilisée pour récupérer la météo locale et calculer l'ET₀ précis
                </Text>
              </View>
              <SelectField
                label={t('cultures.modal.nomLabel')}
                required
                value={newCulture.nom}
                placeholder={t('cultures.modal.nomPlaceholder')}
                onPress={() => setNomPickerVisible(true)}
                hasError={!!fieldErrors.nom}
                loading={loadingSuggestions && !newCulture.nom}
              />
              {fieldErrors.nom && (
                <Text style={[s.errorText, { marginTop: -10, marginBottom: 10 }]}>{fieldErrors.nom}</Text>
              )}

              {totalCulturesDisponibles > 0 && !loadingSuggestions && (
                <View style={s.availableCountBadge}>
                  <Ionicons name="list-outline" size={12} color="#16a34a" />
                  <Text style={s.availableCountText}>
                    {totalCulturesDisponibles} {t('cultures.modal.available')}
                  </Text>
                </View>
              )}

              {/* Variété */}
              <SelectField
                label={t('cultures.modal.varietyLabel')}
                required
                value={newCulture.variete}
                placeholder={t('cultures.modal.varietyPlaceholder')}
                onPress={() => setVarietePickerVisible(true)}
                hasError={!!fieldErrors.variete}
                loading={loadingSuggestions && !newCulture.variete}
              />
              {fieldErrors.variete && (
                <Text style={[s.errorText, { marginTop: -10, marginBottom: 10 }]}>{fieldErrors.variete}</Text>
              )}

              {/* ✅ TYPE DE SOL — NOUVEAU */}
              <View style={{ marginBottom: 16 }}>
                <Text style={s.fieldLabel}>
                  🌍 Type de Sol <Text style={{ color:'#ef4444' }}>*</Text>
                  <Text style={{ color:'#9ca3af', fontSize:11, fontWeight:'400' }}>  (pour calcul RFU)</Text>
                </Text>
                <TouchableOpacity
                  style={[sf.btn, { borderColor: selectedSolData.couleur, borderWidth: 1.5, height: 58 }]}
                  onPress={() => setSolPickerVisible(true)}
                  activeOpacity={0.75}
                >
                  <Text style={{ fontSize: 20, marginRight: 10 }}>{selectedSolData.emoji}</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={{ color: selectedSolData.couleur, fontWeight: '700', fontSize: 14 }}>
                      {selectedSolData.nom}
                    </Text>
                    <Text style={{ color: '#9ca3af', fontSize: 11, marginTop: 1 }}>
                      {selectedSolData.description}
                    </Text>
                  </View>
                  <Ionicons name="chevron-down" size={18} color="#9ca3af" />
                </TouchableOpacity>
                <View style={{ flexDirection:'row', alignItems:'center', gap:6, marginTop:6, paddingHorizontal:4 }}>
                  <Ionicons name="information-circle-outline" size={13} color="#3b82f6" />
                  <Text style={{ fontSize:11, color:'#3b82f6' }}>
                    {selectedSolData.ruInfo} — Détermine quand irriguer
                  </Text>
                </View>
              </View>

              {/* Date */}
              <View style={{ marginBottom: 16 }}>
                <Text style={s.fieldLabel}>{t('cultures.modal.dateLabel')} <Text style={{ color:'#ef4444' }}>*</Text></Text>
                {Platform.OS === 'web' ? (
                  <input
                    type="date"
                    value={newCulture.datePlantation ? newCulture.datePlantation.toISOString().split('T')[0] : ''}
                    onChange={e => {
                      setNewCulture({...newCulture, datePlantation: e.target.value ? new Date(e.target.value) : null});
                      setFieldErrors(p => ({...p, datePlantation:null}));
                    }}
                    style={{
                      width: '100%',
                      border: fieldErrors.datePlantation ? '1px solid #ef4444' : '1px solid #d1d5db',
                      borderRadius: 10, padding: '12px', fontSize: 14,
                      backgroundColor: fieldErrors.datePlantation ? '#fff8f8' : '#f9fafb',
                    }}
                  />
                ) : (
                  <>
                    <TouchableOpacity
                      style={[s.fieldInput, fieldErrors.datePlantation && s.fieldInputError]}
                      onPress={() => setShowDatePicker(true)}
                    >
                      <Text style={{ color: newCulture.datePlantation ? '#111827' : '#9ca3af' }}>
                        {newCulture.datePlantation ? formatDate(newCulture.datePlantation) : t('cultures.modal.datePlaceholder')}
                      </Text>
                    </TouchableOpacity>
                    {showDatePicker && (
                      <DateTimePicker
                        value={newCulture.datePlantation || new Date()}
                        mode="date"
                        onChange={(event, date) => {
                          setShowDatePicker(false);
                          if (date) {
                            setNewCulture({...newCulture, datePlantation: date});
                            setFieldErrors(p => ({...p, datePlantation: null}));
                          }
                        }}
                      />
                    )}
                  </>
                )}
                {fieldErrors.datePlantation && <Text style={s.errorText}>{fieldErrors.datePlantation}</Text>}
              </View>

              {/* Surface */}
              <View style={{ marginBottom: 16 }}>
                <Text style={s.fieldLabel}>{t('cultures.modal.surfaceLabel')} <Text style={{ color:'#ef4444' }}>*</Text></Text>
                <TextInput
                  style={[s.fieldInput, fieldErrors.surface && s.fieldInputError]}
                  placeholder={t('cultures.modal.surfacePlaceholder')}
                  keyboardType="numeric"
                  value={newCulture.surface}
                  onChangeText={v => { setNewCulture({...newCulture, surface:v}); setFieldErrors(p => ({...p, surface:null})); }}
                />
                {fieldErrors.surface && <Text style={s.errorText}>{fieldErrors.surface}</Text>}
              </View>

              {/* Arbres */}
              <View style={{ marginBottom: 24 }}>
                <Text style={s.fieldLabel}>
                  {t('cultures.modal.treesLabel')}{' '}
                  <Text style={{ color:'#9ca3af', fontSize:12, fontWeight:'400' }}>{t('cultures.modal.treesOptional')}</Text>
                </Text>
                <TextInput
                  style={[s.fieldInput, fieldErrors.nombreArbres && s.fieldInputError]}
                  placeholder={t('cultures.modal.treesPlaceholder')}
                  keyboardType="numeric"
                  value={newCulture.nombreArbres}
                  onChangeText={v => { setNewCulture({...newCulture, nombreArbres:v}); setFieldErrors(p => ({...p, nombreArbres:null})); }}
                />
                {fieldErrors.nombreArbres
                  ? <Text style={s.errorText}>{fieldErrors.nombreArbres}</Text>
                  : <Text style={{ fontSize:11, color:'#9ca3af', marginTop:4 }}>{t('cultures.modal.treesHint')}</Text>
                }
              </View>

              {/* Boutons */}
              <View style={{ flexDirection:'row', gap:12 }}>
                <TouchableOpacity
                  style={[s.btnBase, s.btnCancel]}
                  onPress={() => { setModalVisible(false); resetForm(); }}
                >
                  <Text style={s.btnCancelText}>{t('cultures.modal.cancel')}</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[s.btnBase, s.btnAdd, submitting && { opacity:0.7 }]}
                  onPress={addCulture}
                  disabled={submitting}
                >
                  {submitting
                    ? <ActivityIndicator size="small" color="#fff" />
                    : <Text style={s.btnAddText}>{t('cultures.modal.addBtn')}</Text>
                  }
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>

          {/* ─── PICKERS — INSIDE the main Modal ──────────────────────────────── */}
          <SelectPickerModal
            visible={nomPickerVisible}
            title={t('cultures.modal.nomLabel')}
            items={nomSuggestions}
            selectedValue={newCulture.nom}
            onSelect={handleNomSelect}
            onClose={() => setNomPickerVisible(false)}
            loading={loadingSuggestions}
            loadingText={t('cultures.modal.loading')}
          />
          <SelectPickerModal
            visible={varietePickerVisible}
            title={t('cultures.modal.varietyLabel')}
            items={allVarietes}
            selectedValue={newCulture.variete}
            onSelect={handleVarieteSelect}
            onClose={() => setVarietePickerVisible(false)}
            loading={loadingSuggestions}
            loadingText={t('cultures.modal.loading')}
          />
          {/* ✅ SOL PICKER */}
          <SolPickerModal
            visible={solPickerVisible}
            selectedKey={newCulture.typeSol}
            onSelect={key => setNewCulture(p => ({ ...p, typeSol: key }))}
            onClose={() => setSolPickerVisible(false)}
          />

        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// STYLES
// ══════════════════════════════════════════════════════════════════════════════
const s = StyleSheet.create({
  addBtn:              { flexDirection:'row', alignItems:'center', gap:4, backgroundColor:'#15803d', paddingHorizontal:14, paddingVertical:8, borderRadius:10 },
  addBtnText:          { color:'#fff', fontWeight:'700', fontSize:14 },
  refreshBar:          { flexDirection:'row', alignItems:'center', gap:8, paddingHorizontal:16, paddingVertical:6, backgroundColor:'#f0fdf4' },
  refreshText:         { fontSize:12, color:'#16a34a' },
  errorBanner:         { flexDirection:'row', alignItems:'center', gap:8, paddingHorizontal:16, paddingVertical:10, backgroundColor:'#fee2e2', borderBottomWidth:1, borderBottomColor:'#fca5a5' },
  errorBannerText:     { flex:1, fontSize:12, color:'#ef4444' },
  errorRetry:          { fontSize:12, fontWeight:'700', color:'#ef4444', textDecorationLine:'underline' },
  card:                { flexDirection:'row', alignItems:'flex-start', backgroundColor:'#fff', borderRadius:14, padding:16, marginBottom:10, shadowColor:'#000', shadowOffset:{width:0,height:1}, shadowOpacity:0.06, shadowRadius:4, elevation:2 },
  cardTopRow:          { flexDirection:'row', alignItems:'center', flexWrap:'wrap', gap:8, marginBottom:6 },
  cardNom:             { fontSize:17, fontWeight:'700', color:'#15803d' },
  cardRow:             { fontSize:13, color:'#6b7280', marginBottom:2 },
  cardVal:             { fontWeight:'600', color:'#374151' },
  cardDate:            { fontSize:11, color:'#9ca3af', marginTop:6, fontStyle:'italic' },
  kcBadge:             { backgroundColor:'#f0fdf4', paddingHorizontal:10, paddingVertical:4, borderRadius:20 },
  kcBadgeText:         { fontSize:11, color:'#16a34a', fontWeight:'700' },
  // ✅ Sol badge styles (nouveau)
  solBadge:            { flexDirection:'row', alignItems:'center', gap:5, paddingHorizontal:10, paddingVertical:4, borderRadius:20, borderWidth:1 },
  solBadgeText:        { fontSize:11, fontWeight:'700' },
  solBadgeRu:          { fontSize:10, fontWeight:'500', opacity: 0.8 },
  deleteBtn:           { padding:6, marginLeft:8 },
  emptyWrap:           { alignItems:'center', paddingVertical:60, gap:12 },
  emptyText:           { fontSize:15, color:'#9ca3af' },
  overlay:             { flex:1, backgroundColor:'rgba(0,0,0,0.45)', justifyContent:'flex-end' },
  sheet:               { backgroundColor:'#fff', borderTopLeftRadius:24, borderTopRightRadius:24, maxHeight:'92%' },
  modalHeader:         { flexDirection:'row', justifyContent:'space-between', alignItems:'center', backgroundColor:'#15803d', paddingHorizontal:20, paddingVertical:16, borderTopLeftRadius:24, borderTopRightRadius:24 },
  modalTitle:          { fontSize:18, fontWeight:'700', color:'#fff' },
  fieldLabel:          { fontSize:14, fontWeight:'600', color:'#374151', marginBottom:6 },
  fieldInput:          { borderWidth:1, borderColor:'#d1d5db', borderRadius:10, paddingHorizontal:14, paddingVertical:12, fontSize:14, color:'#111827', backgroundColor:'#f9fafb' },
  fieldInputError:     { borderColor:'#ef4444', backgroundColor:'#fff8f8' },
  errorText:           { fontSize:11, color:'#ef4444', marginTop:4, fontWeight:'500' },
  btnBase:             { flex:1, paddingVertical:14, borderRadius:12, alignItems:'center' },
  btnCancel:           { backgroundColor:'#f3f4f6', borderWidth:1, borderColor:'#e5e7eb' },
  btnCancelText:       { fontSize:14, fontWeight:'700', color:'#374151' },
  btnAdd:              { backgroundColor:'#15803d' },
  btnAddText:          { fontSize:14, fontWeight:'700', color:'#fff' },
  availableCountBadge: { flexDirection:'row', alignItems:'center', gap:4, marginTop:-8, marginBottom:12, paddingHorizontal:4 },
  availableCountText:  { fontSize:11, color:'#16a34a', fontWeight:'500' },
});