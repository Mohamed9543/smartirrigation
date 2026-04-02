import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, Alert, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { API_ENDPOINTS, apiFetch } from '@api/client';

export default function ETcHistory({ cultureId, cultureName, todayEtc, todayEt0, todayKc }) {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(false);
  const [stats, setStats] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => { if (cultureId) fetchETcHistory(); }, [cultureId]);

  const fetchETcHistory = async () => {
    try {
      setLoading(true); setError(null);
      const response = await apiFetch(`${API_ENDPOINTS.irrigations.base}/etc-history/${cultureId}?days=30`);
      const result = await response.json();
      if (result.success) { setHistory(result.data); setStats(result.stats); }
      else setError(result.error || 'Erreur chargement');
    } catch (err) { setError('Erreur de connexion'); }
    finally { setLoading(false); }
  };

  const toLocalDateStr = (date) => {
    const d = new Date(date);
    return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
  };
  const todayLocalStr = toLocalDateStr(new Date());
  const isToday = (date) => toLocalDateStr(date) === todayLocalStr;

  const formatDateLabel = (date) => {
    const d = new Date(date);
    const today = new Date(); const yesterday = new Date(today); yesterday.setDate(today.getDate()-1);
    if (toLocalDateStr(d) === toLocalDateStr(today)) return "Aujourd'hui";
    if (toLocalDateStr(d) === toLocalDateStr(yesterday)) return 'Hier';
    return d.toLocaleDateString('fr-FR', { day:'2-digit', month:'2-digit' });
  };

  const applyTodayPatch = (day) => {
    if (!isToday(day.date) || todayEtc == null) return day;
    return { ...day, et0: String(parseFloat(todayEt0).toFixed(2)), kc: String(parseFloat(todayKc).toFixed(2)), etc: String(parseFloat(todayEtc).toFixed(2)) };
  };

  const getBarColor = (etc, irrigated) => {
    if (irrigated) return '#22c55e';
    const v = parseFloat(etc);
    if (v > 5) return '#ef4444';
    if (v > 3) return '#f97316';
    if (v > 1) return '#eab308';
    return '#3b82f6';
  };

  if (loading) return <View style={{ paddingVertical:20, alignItems:'center' }}><ActivityIndicator size="small" color="#4CAF50" /></View>;
  if (error && history.length === 0) return (
    <View style={[s.container, { alignItems:'center' }]}>
      <Ionicons name="alert-circle" size={40} color="#FF6B6B" />
      <Text style={{ color:'#ef4444', textAlign:'center', marginTop:8 }}>{error}</Text>
      <TouchableOpacity onPress={fetchETcHistory} style={{ marginTop:12, backgroundColor:'#3b82f6', paddingHorizontal:16, paddingVertical:8, borderRadius:99 }}>
        <Text style={{ color:'#fff', fontSize:13 }}>Réessayer</Text>
      </TouchableOpacity>
    </View>
  );

  const patchedHistory = history.map(applyTodayPatch);
  const displayHistory = expanded ? patchedHistory : patchedHistory.slice(0, 7);

  return (
    <View style={s.container}>
      <View style={s.header}>
        <View style={{ flexDirection:'row', alignItems:'center' }}>
          <Ionicons name="calendar" size={20} color="#4CAF50" />
          <Text style={s.title}> ETc — {cultureName || ''}</Text>
        </View>
        <TouchableOpacity onPress={() => setExpanded(!expanded)}>
          <Ionicons name={expanded ? 'chevron-up' : 'chevron-down'} size={20} color="#666" />
        </TouchableOpacity>
      </View>

      {stats && (
        <View style={s.statsBox}>
          <Text style={s.statsLabel}>Jours irrigués</Text>
          <Text style={s.statsVal}>{stats.irrigatedDays}/30</Text>
          <Text style={s.statsSub}>{stats.avgEfficacite}% du temps</Text>
        </View>
      )}

      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <View style={{ flexDirection:'row' }}>
          {displayHistory.map((day, index) => {
            const color = getBarColor(day.etc, day.irrigated);
            return (
              <TouchableOpacity key={index} style={[s.dayCard, { borderColor: color + '60', backgroundColor: color + '15' }]}
                onPress={() => Alert.alert(formatDateLabel(day.date), `ET₀: ${day.et0} mm\nKc: ${day.kc}\nETc: ${day.etc} mm\n${day.irrigated ? '💧 Irrigué' : '⚠️ Non irrigué'}${day.volume ? `\nVolume: ${day.volume} L` : ''}`)}>
                <Text style={s.dayLabel}>{formatDateLabel(day.date)}</Text>
                <Text style={[s.dayVal, { color }]}>{parseFloat(day.etc).toFixed(2)}</Text>
                <Text style={s.dayUnit}>mm</Text>
                {day.irrigated && <View style={s.irrigDot}><Text style={{ fontSize:10 }}>💧</Text></View>}
              </TouchableOpacity>
            );
          })}
        </View>
      </ScrollView>

      <View style={s.legend}>
        {[['#22c55e','Irrigué'],['#eab308','ETc 1-3'],['#ef4444','ETc >5']].map(([color, label]) => (
          <View key={label} style={{ flexDirection:'row', alignItems:'center' }}>
            <View style={{ width:10, height:10, borderRadius:5, backgroundColor:color, marginRight:4 }} />
            <Text style={{ fontSize:11, color:'#6b7280' }}>{label}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}
const s = StyleSheet.create({
  container: { backgroundColor:'#fff', borderRadius:16, padding:16, marginBottom:16, shadowColor:'#000', shadowOffset:{width:0,height:2}, shadowOpacity:0.06, shadowRadius:8, elevation:3 },
  header: { flexDirection:'row', justifyContent:'space-between', alignItems:'center', marginBottom:12 },
  title: { fontSize:15, fontWeight:'600', color:'#1f2937' },
  statsBox: { backgroundColor:'#f8fafc', borderRadius:12, padding:12, marginBottom:12, alignItems:'center' },
  statsLabel: { fontSize:12, color:'#6b7280' },
  statsVal: { fontSize:24, fontWeight:'700', color:'#7c3aed' },
  statsSub: { fontSize:11, color:'#9ca3af', marginTop:2 },
  dayCard: { marginRight:8, padding:10, borderRadius:12, borderWidth:1, width:72, alignItems:'center' },
  dayLabel: { fontSize:11, fontWeight:'500', color:'#4b5563', marginBottom:4 },
  dayVal: { fontSize:16, fontWeight:'700' },
  dayUnit: { fontSize:11, color:'#6b7280' },
  irrigDot: { marginTop:4, backgroundColor:'#22c55e', borderRadius:99, paddingHorizontal:6, paddingVertical:2 },
  legend: { flexDirection:'row', justifyContent:'space-around', marginTop:12, paddingTop:8, borderTopWidth:1, borderTopColor:'#f3f4f6' },
});

