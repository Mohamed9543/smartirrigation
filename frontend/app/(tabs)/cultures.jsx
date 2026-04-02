// app/(tabs)/cultures.jsx
import React, { useState, useCallback } from 'react';
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

function ConfirmModal({ visible, title, message, onConfirm, onCancel, danger = true, t }) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
      <SafeAreaView style={{ flex:1, backgroundColor:'rgba(0,0,0,0.4)', alignItems:'center', justifyContent:'center', paddingHorizontal:24 }} edges={['top','left','right','bottom']}>
        <View style={{ backgroundColor:'#fff', borderRadius:20, padding:28, width:'100%', maxWidth:400, shadowColor:'#000', shadowOffset:{width:0,height:8}, shadowOpacity:0.2, shadowRadius:24, elevation:12 }}>
          <View style={{ width:52, height:52, borderRadius:26, backgroundColor: danger ? '#fef2f2' : '#eff6ff', alignItems:'center', justifyContent:'center', alignSelf:'center', marginBottom:16 }}>
            <Ionicons name={danger ? 'trash-outline' : 'help-circle-outline'} size={26} color={danger ? '#ef4444' : '#3b82f6'} />
          </View>
          <Text style={{ fontSize:17, fontWeight:'700', color:'#111827', textAlign:'center', marginBottom:8 }}>{title}</Text>
          <Text style={{ fontSize:14, color:'#6b7280', textAlign:'center', marginBottom:24, lineHeight:20 }}>{message}</Text>
          <View style={{ flexDirection:'row', gap:10 }}>
            <TouchableOpacity style={{ flex:1, paddingVertical:13, borderRadius:12, borderWidth:1, borderColor:'#e5e7eb', alignItems:'center', backgroundColor:'#f9fafb' }} onPress={onCancel} activeOpacity={0.8}>
              <Text style={{ fontSize:14, fontWeight:'600', color:'#374151' }}>{t('cultures.modal.cancel')}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={{ flex:1, paddingVertical:13, borderRadius:12, alignItems:'center', backgroundColor: danger ? '#ef4444' : '#3b82f6' }} onPress={onConfirm} activeOpacity={0.85}>
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

function AutocompleteInput({ label, required, value, onChangeText, placeholder, suggestions, onSelectSuggestion, zIndex = 10, loading = false, hasError = false, loadingText }) {
  const [showList, setShowList] = useState(false);
  const filtered = suggestions.filter(s => s.toLowerCase().includes((value || '').toLowerCase()));
  const showSuggestions = showList && filtered.length > 0 && !loading;

  return (
    <View style={[ac.wrap, { zIndex }]}>
      <Text style={ac.label}>{label}{required && <Text style={{ color:'#ef4444' }}> *</Text>}</Text>
      <View style={[ac.inputRow, hasError && ac.inputRowError]}>
        <TextInput style={ac.input} placeholder={placeholder} placeholderTextColor="#9ca3af" value={value}
          onChangeText={v => { onChangeText(v); setShowList(true); }}
          onFocus={() => setShowList(true)} onBlur={() => setTimeout(() => setShowList(false), 180)} />
        <TouchableOpacity style={ac.chevron} onPress={() => setShowList(v => !v)} activeOpacity={0.7}>
          <Ionicons name={showList ? 'chevron-up' : 'chevron-down'} size={18} color="#6b7280" />
        </TouchableOpacity>
      </View>
      {loading && (
        <View style={ac.loadingHint}>
          <ActivityIndicator size="small" color="#16a34a" />
          <Text style={ac.loadingText}>{loadingText}</Text>
        </View>
      )}
      {showSuggestions && (
        <View style={ac.dropdown}>
          <ScrollView keyboardShouldPersistTaps="always" style={{ maxHeight:200 }}>
            {filtered.map((item, i) => (
              <TouchableOpacity key={i} style={[ac.item, item === value && ac.itemActive]}
                onPress={() => { onSelectSuggestion(item); setShowList(false); }} activeOpacity={0.8}>
                <Text style={[ac.itemText, item === value && ac.itemTextActive]}>{item}</Text>
                {item === value && <Ionicons name="checkmark" size={16} color="#16a34a" />}
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}
    </View>
  );
}

const ac = StyleSheet.create({
  wrap:           { marginBottom:16, position:'relative' },
  label:          { fontSize:14, fontWeight:'600', color:'#374151', marginBottom:6 },
  inputRow:       { flexDirection:'row', alignItems:'center', borderWidth:1, borderColor:'#d1d5db', borderRadius:10, backgroundColor:'#f9fafb', height:48 },
  inputRowError:  { borderColor:'#ef4444', backgroundColor:'#fff8f8' },
  input:          { flex:1, fontSize:14, color:'#111827', paddingHorizontal:12 },
  chevron:        { paddingHorizontal:12 },
  loadingHint:    { flexDirection:'row', alignItems:'center', gap:8, marginTop:8, paddingHorizontal:4 },
  loadingText:    { fontSize:12, color:'#16a34a' },
  dropdown:       { position:'absolute', top:78, left:0, right:0, backgroundColor:'#fff', borderWidth:1, borderColor:'#e5e7eb', borderRadius:10, shadowColor:'#000', shadowOffset:{width:0,height:4}, shadowOpacity:0.12, shadowRadius:8, elevation:10, zIndex:999 },
  item:           { flexDirection:'row', alignItems:'center', justifyContent:'space-between', paddingHorizontal:14, paddingVertical:12, borderBottomWidth:1, borderBottomColor:'#f3f4f6' },
  itemActive:     { backgroundColor:'#f0fdf4' },
  itemText:       { fontSize:14, color:'#374151' },
  itemTextActive: { color:'#16a34a', fontWeight:'700' },
});

function CultureCard({ item, deletingId, onDelete, formatDate, t }) {
  return (
    <View style={s.card}>
      <View style={{ flex:1 }}>
        <View style={s.cardTopRow}>
          <Text style={s.cardNom}>{item.nom}</Text>
          {item.kcActuel != null && (
            <View style={s.kcBadge}>
              <Text style={s.kcBadgeText}>Kc {item.kcActuel.toFixed(2)}{item.stadeActuel ? ` · ${item.stadeActuel}` : ''}</Text>
            </View>
          )}
        </View>
        <Text style={s.cardRow}>🌿 {t('cultures.card.variety')} : <Text style={s.cardVal}>{item.variete}</Text></Text>
        {item.parcelle       && <Text style={s.cardRow}>📍 {t('cultures.card.parcel')} : <Text style={s.cardVal}>{item.parcelle}</Text></Text>}
        {item.datePlantation && <Text style={s.cardRow}>📅 {t('cultures.card.planted')} : <Text style={s.cardVal}>{formatDate(item.datePlantation)}</Text></Text>}
        {item.surface != null && <Text style={s.cardRow}>📐 {t('cultures.card.surface')} : <Text style={s.cardVal}>{item.surface} m²</Text></Text>}
        {item.nombreArbres != null && <Text style={s.cardRow}>🌳 {t('cultures.card.trees')} : <Text style={s.cardVal}>{item.nombreArbres}</Text></Text>}
        <Text style={s.cardDate}>{t('cultures.card.addedOn')} {formatDate(item.createdAt)}</Text>
      </View>
      <Pressable
        style={({ pressed }) => [s.deleteBtn, deletingId === item._id && { opacity:0.4 }, pressed && { opacity:0.6 }]}
        onPress={() => onDelete(item._id)} disabled={deletingId === item._id}
        hitSlop={{ top:10, bottom:10, left:10, right:10 }}
      >
        {deletingId === item._id
          ? <ActivityIndicator size="small" color="#ef4444" />
          : <Ionicons name="trash-outline" size={22} color="#ef4444" />}
      </Pressable>
    </View>
  );
}

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

  const [newCulture, setNewCulture] = useState({
    parcelle:'', nom:'', variete:'', datePlantation:null, surface:'', nombreArbres:'',
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
    setNewCulture(prev => ({ ...prev, nom: selectedNom, variete: found ? found.variete : prev.variete || 'Standard' }));
    setFieldErrors(prev => ({ ...prev, nom: null }));
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
    setNewCulture({ parcelle:'', nom:'', variete:'', datePlantation:null, surface:'', nombreArbres:'' });
    setFieldErrors({});
  };

  if (loading && cultures.length === 0) {
    return <SafeAreaView style={{ flex:1, justifyContent:'center', alignItems:'center' }}><ActivityIndicator size="large" color="#16a34a" /></SafeAreaView>;
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

      <Modal visible={modalVisible} transparent animationType="slide" onRequestClose={() => { setModalVisible(false); resetForm(); }}>
        <SafeAreaView style={s.overlay} edges={['top','left','right','bottom']}>
          <View style={s.sheet}>
            <View style={s.modalHeader}>
              <Text style={s.modalTitle}>{t('cultures.modal.addTitle')}</Text>
              <TouchableOpacity onPress={() => { setModalVisible(false); resetForm(); }}>
                <Ionicons name="close" size={24} color="#fff" />
              </TouchableOpacity>
            </View>

            <ScrollView style={{ padding:20 }} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>

              {/* Parcelle */}
              <View style={{ marginBottom:16 }}>
                <Text style={s.fieldLabel}>{t('cultures.modal.parcelLabel')} <Text style={{ color:'#ef4444' }}>*</Text></Text>
                <TextInput
                  style={[s.fieldInput, fieldErrors.parcelle && s.fieldInputError]}
                  placeholder={t('cultures.modal.parcelPlaceholder')}
                  value={newCulture.parcelle}
                  onChangeText={v => { setNewCulture({...newCulture, parcelle:v}); setFieldErrors(p => ({...p, parcelle:null})); }}
                />
                {fieldErrors.parcelle && <Text style={s.errorText}>{fieldErrors.parcelle}</Text>}
              </View>

              {/* Nom */}
              <AutocompleteInput
                label={t('cultures.modal.nomLabel')} required
                value={newCulture.nom}
                onChangeText={v => { setNewCulture({...newCulture, nom:v}); setFieldErrors(p => ({...p, nom:null})); }}
                onSelectSuggestion={handleNomSelect}
                placeholder={t('cultures.modal.nomPlaceholder')}
                suggestions={nomSuggestions} zIndex={30}
                loading={loadingSuggestions}
                loadingText={t('cultures.modal.loading')}
                hasError={!!fieldErrors.nom}
              />
              {fieldErrors.nom && <Text style={[s.errorText, { marginTop:-10, marginBottom:10 }]}>{fieldErrors.nom}</Text>}

              {totalCulturesDisponibles > 0 && !loadingSuggestions && (
                <View style={s.availableCountBadge}>
                  <Ionicons name="list-outline" size={12} color="#16a34a" />
                  <Text style={s.availableCountText}>{totalCulturesDisponibles} {t('cultures.modal.available')}</Text>
                </View>
              )}

              {/* Variété */}
              <AutocompleteInput
                label={t('cultures.modal.varietyLabel')} required
                value={newCulture.variete}
                onChangeText={v => { setNewCulture({...newCulture, variete:v}); setFieldErrors(p => ({...p, variete:null})); }}
                onSelectSuggestion={v => { setNewCulture({...newCulture, variete:v}); setFieldErrors(p => ({...p, variete:null})); }}
                placeholder={t('cultures.modal.varietyPlaceholder')}
                suggestions={allVarietes} zIndex={20} hasError={!!fieldErrors.variete}
              />
              {fieldErrors.variete && <Text style={[s.errorText, { marginTop:-10, marginBottom:10 }]}>{fieldErrors.variete}</Text>}

              {/* Date */}
              <View style={{ marginBottom:16 }}>
                <Text style={s.fieldLabel}>{t('cultures.modal.dateLabel')} <Text style={{ color:'#ef4444' }}>*</Text></Text>
                {Platform.OS === 'web' ? (
                  <input type="date"
                    value={newCulture.datePlantation ? newCulture.datePlantation.toISOString().split('T')[0] : ''}
                    onChange={e => { setNewCulture({...newCulture, datePlantation: e.target.value ? new Date(e.target.value) : null}); setFieldErrors(p => ({...p, datePlantation:null})); }}
                    style={{ width:'100%', border: fieldErrors.datePlantation ? '1px solid #ef4444' : '1px solid #d1d5db', borderRadius:10, padding:'12px', fontSize:14, backgroundColor: fieldErrors.datePlantation ? '#fff8f8' : '#f9fafb' }}
                  />
                ) : (
                  <>
                    <TouchableOpacity style={[s.fieldInput, fieldErrors.datePlantation && s.fieldInputError]} onPress={() => setShowDatePicker(true)}>
                      <Text style={{ color: newCulture.datePlantation ? '#111827' : '#9ca3af' }}>
                        {newCulture.datePlantation ? formatDate(newCulture.datePlantation) : t('cultures.modal.datePlaceholder')}
                      </Text>
                    </TouchableOpacity>
                    {showDatePicker && (
                      <DateTimePicker value={newCulture.datePlantation || new Date()} mode="date"
                        onChange={(event, date) => { setShowDatePicker(false); if (date) { setNewCulture({...newCulture, datePlantation:date}); setFieldErrors(p => ({...p, datePlantation:null})); } }} />
                    )}
                  </>
                )}
                {fieldErrors.datePlantation && <Text style={s.errorText}>{fieldErrors.datePlantation}</Text>}
              </View>

              {/* Surface */}
              <View style={{ marginBottom:16 }}>
                <Text style={s.fieldLabel}>{t('cultures.modal.surfaceLabel')} <Text style={{ color:'#ef4444' }}>*</Text></Text>
                <TextInput
                  style={[s.fieldInput, fieldErrors.surface && s.fieldInputError]}
                  placeholder={t('cultures.modal.surfacePlaceholder')} keyboardType="numeric"
                  value={newCulture.surface}
                  onChangeText={v => { setNewCulture({...newCulture, surface:v}); setFieldErrors(p => ({...p, surface:null})); }}
                />
                {fieldErrors.surface && <Text style={s.errorText}>{fieldErrors.surface}</Text>}
              </View>

              {/* Arbres */}
              <View style={{ marginBottom:24 }}>
                <Text style={s.fieldLabel}>
                  {t('cultures.modal.treesLabel')}{' '}
                  <Text style={{ color:'#9ca3af', fontSize:12, fontWeight:'400' }}>{t('cultures.modal.treesOptional')}</Text>
                </Text>
                <TextInput
                  style={[s.fieldInput, fieldErrors.nombreArbres && s.fieldInputError]}
                  placeholder={t('cultures.modal.treesPlaceholder')} keyboardType="numeric"
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
                <TouchableOpacity style={[s.btnBase, s.btnCancel]} onPress={() => { setModalVisible(false); resetForm(); }}>
                  <Text style={s.btnCancelText}>{t('cultures.modal.cancel')}</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[s.btnBase, s.btnAdd, submitting && { opacity:0.7 }]} onPress={addCulture} disabled={submitting}>
                  {submitting ? <ActivityIndicator size="small" color="#fff" /> : <Text style={s.btnAddText}>{t('cultures.modal.addBtn')}</Text>}
                </TouchableOpacity>
              </View>

            </ScrollView>
          </View>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

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