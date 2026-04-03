import React, { useEffect, useState, useRef } from 'react';
import {
  View, Text, ScrollView, ActivityIndicator,
  RefreshControl, TouchableOpacity, Alert, TextInput,
  Modal, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { API_ENDPOINTS, apiFetch } from '@api/client';
import { BrandHeader } from '@components/BrandHeader';
import { useLanguage } from '@context/LanguageContext';
import { useSession } from '@hooks/useSession';

let WebView = null;
if (Platform.OS !== 'web') {
  WebView = require('react-native-webview').WebView;
}

const VOICEFLOW_PROJECT_ID = '69ce3becb4c5bf250dcb1223';

// ─── HTML Voiceflow pour WebView native ──────────────────────────────────────
const buildVoiceflowHTML = (userData) => {
  const safe = (str) => String(str ?? '').replace(/'/g, "\\'").replace(/\n/g, ' ');

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    html, body { width: 100%; height: 100%; background: #f9fafb; }
  </style>
</head>
<body>
<script type="text/javascript">
  (function(d, t) {
    var v = d.createElement(t), s = d.getElementsByTagName(t)[0];
    v.onload = function() {
      window.voiceflow.chat.load({
        verify: { projectID: '${VOICEFLOW_PROJECT_ID}' },
        url: 'https://general-runtime.voiceflow.com',
        versionID: 'production',
        render: { mode: 'embedded', target: document.body },
        autostart: true,
        variables: {
          user_name:       '${safe(userData.userName)}',
          user_email:      '${safe(userData.userEmail)}',
          user_role:       '${safe(userData.userRole)}',
          meteo_ville:     '${safe(userData.meteoVille)}',
          meteo_pays:      '${safe(userData.meteoPays)}',
          meteo_temp_min:  '${safe(userData.meteoTempMin)}',
          meteo_temp_max:  '${safe(userData.meteoTempMax)}',
          meteo_humidite:  '${safe(userData.meteoHumidite)}',
          meteo_vent:      '${safe(userData.meteoVent)}',
          meteo_et0:       '${safe(userData.meteoEt0)}',
          nb_cultures:     ${userData.nbCultures},
          liste_cultures:  '${safe(userData.listeCultures)}',
          detail_cultures: '${safe(userData.detailCultures)}',
          nb_irrigations:  ${userData.nbIrrigations},
        },
      });
    };
    v.src = 'https://cdn.voiceflow.com/widget-next/bundle.mjs';
    v.type = 'text/javascript';
    s.parentNode.insertBefore(v, s);
  })(document, 'script');
<\/script>
</body>
</html>`;
};

// ─── Injection Web ────────────────────────────────────────────────────────────
// ✅ FIX : on détruit et recrée le script à chaque fois pour forcer le rechargement
function injectVoiceflowWeb(userData) {
  if (typeof document === 'undefined') return;

  const safe = (str) => String(str ?? '').replace(/'/g, "\\'");

  // Supprime l'ancien script s'il existe → force rechargement avec nouvelles données
  const oldScript = document.getElementById('vf-script');
  if (oldScript) oldScript.remove();

  // Supprime aussi l'ancien widget DOM si présent
  const oldWidget = document.getElementById('voiceflow-chat');
  if (oldWidget) oldWidget.remove();

  const script = document.createElement('script');
  script.id = 'vf-script';
  script.type = 'text/javascript';
  script.onload = () => {
    if (!window.voiceflow?.chat) return;
    window.voiceflow.chat.load({
      verify: { projectID: VOICEFLOW_PROJECT_ID },
      url: 'https://general-runtime.voiceflow.com',
      versionID: 'production',
      variables: {
        user_name:       userData.userName,
        user_email:      userData.userEmail,
        user_role:       userData.userRole,
        meteo_ville:     userData.meteoVille,
        meteo_pays:      userData.meteoPays,
        meteo_temp_min:  userData.meteoTempMin,
        meteo_temp_max:  userData.meteoTempMax,
        meteo_humidite:  userData.meteoHumidite,
        meteo_vent:      userData.meteoVent,
        meteo_et0:       userData.meteoEt0,
        nb_cultures:     userData.nbCultures,
        liste_cultures:  userData.listeCultures,
        detail_cultures: userData.detailCultures,
        nb_irrigations:  userData.nbIrrigations,
      },
    });
  };
  script.src = 'https://cdn.voiceflow.com/widget-next/bundle.mjs';
  document.body.appendChild(script);
}

// ─────────────────────────────────────────────────────────────────────────────
export default function HomeScreen() {
  const router             = useRouter();
  const { t }              = useLanguage();
  const { user, role }     = useSession();

  const [weatherData, setWeatherData] = useState(null);
  const [loading, setLoading]         = useState(true);
  const [refreshing, setRefreshing]   = useState(false);
  const [cultures, setCultures]       = useState([]);
  const [searchCity, setSearchCity]   = useState('');
  const [currentCity, setCurrentCity] = useState('Tunis');
  const [chatVisible, setChatVisible] = useState(false);

  // ✅ Ref pour savoir si les données sont prêtes avant d'injecter Voiceflow
  const dataReadyRef = useRef(false);

  // ─── Build userData ────────────────────────────────────────────────────
  const buildUserData = () => {
    const userName = user
      ? `${user.firstName || ''} ${user.lastName || ''}`.trim()
      : 'Visiteur';

    const detailCultures = cultures.length > 0
      ? cultures.map(c =>
          `${c.nom} (Kc=${c.kcActuel || 0.65}, surface=${c.surface || '?'}m2, stade=${c.stadeActuel || '?'})`
        ).join(' | ')
      : 'aucune culture';

    return {
      userName,
      userEmail:     user?.email || '',
      userRole:      role || 'user',
      meteoVille:    weatherData?.location?.city || 'Tunis',
      meteoPays:     weatherData?.location?.country || 'TN',
      meteoTempMin:  weatherData?.temperature?.min != null ? String(weatherData.temperature.min.toFixed(1)) : '--',
      meteoTempMax:  weatherData?.temperature?.max != null ? String(weatherData.temperature.max.toFixed(1)) : '--',
      meteoHumidite: String(weatherData?.humidity?.current || '--'),
      meteoVent:     weatherData?.wind?.speed != null ? String(weatherData.wind.speed.toFixed(1)) : '--',
      meteoEt0:      weatherData?.et0 != null ? String(weatherData.et0.toFixed(2)) : '--',
      nbCultures:    cultures.length,
      listeCultures: cultures.length > 0 ? cultures.map(c => c.nom).join(', ') : 'aucune',
      detailCultures,
      nbIrrigations: cultures.filter(c => c.historiqueIrrigation?.length > 0).length,
    };
  };

  // ✅ FIX PRINCIPAL : inject Voiceflow seulement quand météo + cultures sont chargées
  useEffect(() => {
    if (Platform.OS !== 'web') return;

    // Attendre que les deux soient chargés
    if (!weatherData || cultures === null) return;

    // Délai court pour s'assurer que le DOM est prêt
    const timer = setTimeout(() => {
      injectVoiceflowWeb(buildUserData());
    }, 500);

    return () => clearTimeout(timer);
  }, [weatherData, cultures, user, role]);

  // ─── Ouvrir le chat ────────────────────────────────────────────────────
  const openChat = () => {
    if (Platform.OS === 'web') {
      if (typeof window !== 'undefined' && window.voiceflow?.chat) {
        window.voiceflow.chat.open();
      }
    } else {
      setChatVisible(true);
    }
  };

  // ─── Météo ─────────────────────────────────────────────────────────────
  const fetchWeatherForCity = async (cityName) => {
    if (!cityName || cityName.trim() === '') return;
    try {
      setLoading(true);
      const encodedCity = encodeURIComponent(cityName.trim());
      const response    = await apiFetch(`${API_ENDPOINTS.weather.current}?city=${encodedCity}`);
      const result      = await response.json();
      if (result.success) {
        setWeatherData(result.data);
        setCurrentCity(result.data.location?.city || cityName);
        setSearchCity('');
      } else {
        Alert.alert(t('common.error'), result.error || t('common.error'));
      }
    } catch (error) {
      console.log('Erreur meteo:', error.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // ─── Cultures ──────────────────────────────────────────────────────────
  const fetchCultures = async () => {
    try {
      const response = await apiFetch(API_ENDPOINTS.cultures.base);
      const result   = await response.json();
      if (result.success) setCultures(result.data);
    } catch (error) {
      console.log('Erreur cultures:', error.message);
    }
  };

  const calculateWaterNeeds = (culture) => {
    const et0          = weatherData?.et0 || 3.5;
    const kc           = culture.kcActuel || 0.65;
    const etc          = et0 * kc;
    const volumeLiters = etc * (culture.surface || 100);
    const debit        = culture.irrigation?.debit || 1000;
    const tempsMinutes = Math.round((volumeLiters / debit) * 60);
    return { etc: etc.toFixed(2), volume: Math.round(volumeLiters), temps: tempsMinutes };
  };

  useEffect(() => {
    fetchWeatherForCity('Tunis');
    fetchCultures();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    fetchWeatherForCity(currentCity);
    fetchCultures();
  };

  if (loading && !weatherData) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F4F6F8' }}>
        <ActivityIndicator size="large" color="#4CAF50" />
      </View>
    );
  }

  const tempMin         = weatherData?.temperature?.min?.toFixed(0) || '--';
  const tempMax         = weatherData?.temperature?.max?.toFixed(0) || '--';
  const humidity        = weatherData?.humidity?.current || '--';
  const windSpeed       = weatherData?.wind?.speed?.toFixed(1) || '--';
  const et0Display      = weatherData?.et0?.toFixed(2) || '0.00';
  const locationCity    = weatherData?.location?.city || currentCity;
  const locationCountry = weatherData?.location?.country || '';

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#F4F6F8' }}>
      <View style={{ flex: 1 }}>
        <BrandHeader variant="transparent" />
        <ScrollView
          contentContainerStyle={{ paddingBottom: 80 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          showsVerticalScrollIndicator={false}
        >
          {/* Recherche */}
          <View style={{ flexDirection: 'row', paddingHorizontal: 16, marginTop: 12 }}>
            <TextInput
              style={{
                flex: 1, backgroundColor: '#fff', paddingHorizontal: 12, paddingVertical: 8,
                borderTopLeftRadius: 8, borderBottomLeftRadius: 8,
                borderWidth: 1, borderColor: '#e5e7eb', fontSize: 13,
              }}
              placeholder={t('common.search')}
              value={searchCity}
              onChangeText={setSearchCity}
              onSubmitEditing={() => fetchWeatherForCity(searchCity)}
              returnKeyType="search"
              autoCapitalize="words"
            />
            <TouchableOpacity
              style={{
                backgroundColor: '#22c55e', paddingHorizontal: 12, paddingVertical: 8,
                borderTopRightRadius: 8, borderBottomRightRadius: 8,
              }}
              onPress={() => fetchWeatherForCity(searchCity)}
            >
              <Ionicons name="search" size={16} color="white" />
            </TouchableOpacity>
          </View>

          {/* Meteo */}
          <View style={{ backgroundColor: '#EDEFF1', marginHorizontal: 16, padding: 16, borderRadius: 16, marginTop: 12 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Ionicons name="sunny" size={20} color="#F4B400" />
                <Text style={{ fontSize: 15, fontWeight: '600', marginLeft: 8 }}>{t('home.weather')}</Text>
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', marginRight: 10 }}>
                  <Ionicons name="location" size={13} color="#666" />
                  <Text style={{ fontSize: 11, color: '#666', marginLeft: 3 }}>
                    {locationCity}{locationCountry ? ` - ${locationCountry}` : ''}
                  </Text>
                </View>
                <View style={{ backgroundColor: '#dcfce7', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 99 }}>
                  <Text style={{ color: '#15803d', fontWeight: '600', fontSize: 11 }}>
                    {t('home.et0')}: {et0Display} mm/j
                  </Text>
                </View>
              </View>
            </View>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              {[
                { name: 'thermometer',   lib: 'MC', color: '#ff5252', val: `${tempMin}/${tempMax}`, lbl: `${t('home.min')}/${t('home.max')}` },
                { name: 'water',         lib: 'IO', color: '#03a9f4', val: `${humidity}%`,          lbl: t('home.humidity') },
                { name: 'weather-windy', lib: 'MC', color: '#5f6368', val: `${windSpeed}`,          lbl: t('home.wind') },
              ].map((item, i) => (
                <View key={i} style={{ backgroundColor: '#fff', flex: 1, marginHorizontal: 4, padding: 12, borderRadius: 12, alignItems: 'center' }}>
                  {item.lib === 'IO'
                    ? <Ionicons name={item.name} size={22} color={item.color} />
                    : <MaterialCommunityIcons name={item.name} size={22} color={item.color} />
                  }
                  <Text style={{ fontSize: 13, fontWeight: '700', marginTop: 6 }}>{item.val}</Text>
                  <Text style={{ fontSize: 10, color: '#9ca3af', marginTop: 2 }}>{item.lbl}</Text>
                </View>
              ))}
            </View>
          </View>

          {/* Compteurs */}
          <View style={{ flexDirection: 'row', marginHorizontal: 16, marginTop: 12 }}>
            <TouchableOpacity
              style={{ backgroundColor: '#fff', flex: 1, marginRight: 8, padding: 16, borderRadius: 12, alignItems: 'center' }}
              onPress={() => router.push('/(tabs)/cultures')}
            >
              <MaterialCommunityIcons name="sprout" size={28} color="#4CAF50" style={{ marginBottom: 8 }} />
              <Text style={{ fontSize: 18, fontWeight: '700' }}>{cultures.length}</Text>
              <Text style={{ fontSize: 12, color: '#6b7280' }}>{t('home.crops')}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={{ backgroundColor: '#fff', flex: 1, marginLeft: 8, padding: 16, borderRadius: 12, alignItems: 'center' }}
              onPress={() => router.push('/(tabs)/irrigation')}
            >
              <MaterialCommunityIcons name="water" size={28} color="#2196f3" style={{ marginBottom: 8 }} />
              <Text style={{ fontSize: 18, fontWeight: '700' }}>
                {cultures.filter(c => c.historiqueIrrigation?.length > 0).length}
              </Text>
              <Text style={{ fontSize: 12, color: '#6b7280' }}>{t('home.irrigations')}</Text>
            </TouchableOpacity>
          </View>

          {/* Cultures */}
          <View style={{ marginHorizontal: 16, marginTop: 16 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <Text style={{ fontSize: 16, fontWeight: '700', color: '#111827' }}>
                {cultures.length === 0 ? t('home.noCrops') : t('home.yourCrops')}
              </Text>
              {cultures.length > 0 && (
                <TouchableOpacity onPress={() => router.push('/(tabs)/cultures')}>
                  <Text style={{ color: '#22c55e', fontSize: 13 }}>{t('common.seeAll')}</Text>
                </TouchableOpacity>
              )}
            </View>
            {cultures.length === 0 ? (
              <View style={{ backgroundColor: '#fff', padding: 24, borderRadius: 16, alignItems: 'center' }}>
                <Text style={{ fontSize: 13, color: '#9ca3af', marginBottom: 16, textAlign: 'center' }}>
                  {t('home.addFirstCrop')}
                </Text>
                <TouchableOpacity
                  onPress={() => router.push('/(tabs)/cultures')}
                  style={{ backgroundColor: '#22c55e', paddingVertical: 12, paddingHorizontal: 24, borderRadius: 99 }}
                >
                  <Text style={{ color: '#fff', fontWeight: '700' }}>{t('home.addCrop')}</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <View>
                {cultures.slice(0, 3).map((culture) => {
                  const needs = calculateWaterNeeds(culture);
                  return (
                    <View key={culture._id} style={{ backgroundColor: '#fff', padding: 16, borderRadius: 12, marginBottom: 8, borderWidth: 1, borderColor: '#f3f4f6' }}>
                      <Text style={{ fontSize: 13, color: '#6b7280', marginBottom: 4 }}>{culture.nom}</Text>
                      <Text style={{ fontSize: 26, fontWeight: '700', color: '#16a34a', marginBottom: 4 }}>{needs.volume} L</Text>
                      <Text style={{ fontSize: 11, color: '#9ca3af', marginBottom: 6 }}>
                        {t('home.etc')}={needs.etc} mm · {t('home.kc')}={culture.kcActuel || 0.65}
                      </Text>
                      <Text style={{ fontSize: 20, fontWeight: '700', color: '#2563eb' }}>
                        {needs.temps} {t('home.minutes')}
                      </Text>
                    </View>
                  );
                })}
                {cultures.length > 3 && (
                  <TouchableOpacity onPress={() => router.push('/(tabs)/cultures')} style={{ paddingVertical: 8 }}>
                    <Text style={{ textAlign: 'center', color: '#22c55e', fontWeight: '600' }}>
                      + {cultures.length - 3} {t('home.otherCrops')}
                    </Text>
                  </TouchableOpacity>
                )}
              </View>
            )}
          </View>
        </ScrollView>

        {/* FAB Chat */}
        <TouchableOpacity
          onPress={openChat}
          style={{
            position: 'absolute', bottom: 90, right: 20,
            backgroundColor: '#22c55e', width: 54, height: 54,
            borderRadius: 27, alignItems: 'center', justifyContent: 'center',
            elevation: 8,
            shadowColor: '#000', shadowOffset: { width: 0, height: 3 },
            shadowOpacity: 0.25, shadowRadius: 5,
          }}
        >
          <MaterialCommunityIcons name="robot-happy-outline" size={26} color="white" />
        </TouchableOpacity>
      </View>

      {/* Modal Chat native */}
      {Platform.OS !== 'web' && WebView && (
        <Modal visible={chatVisible} animationType="slide" onRequestClose={() => setChatVisible(false)}>
          <SafeAreaView style={{ flex: 1, backgroundColor: '#0F6E56' }}>
            <View style={{
              flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
              paddingHorizontal: 16, paddingVertical: 14, backgroundColor: '#0F6E56',
            }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                <View style={{
                  width: 34, height: 34, borderRadius: 17,
                  backgroundColor: 'rgba(255,255,255,0.2)',
                  alignItems: 'center', justifyContent: 'center',
                }}>
                  <MaterialCommunityIcons name="robot-happy-outline" size={18} color="white" />
                </View>
                <View>
                  <Text style={{ color: 'white', fontSize: 15, fontWeight: '700' }}>Assistant SmartIrrig</Text>
                  <Text style={{ color: 'rgba(255,255,255,0.7)', fontSize: 11 }}>Powered by Voiceflow</Text>
                </View>
              </View>
              <TouchableOpacity
                onPress={() => setChatVisible(false)}
                style={{
                  backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 20,
                  paddingHorizontal: 12, paddingVertical: 6,
                  flexDirection: 'row', alignItems: 'center', gap: 4,
                }}
              >
                <Ionicons name="close" size={16} color="white" />
                <Text style={{ color: 'white', fontSize: 13, fontWeight: '500' }}>Fermer</Text>
              </TouchableOpacity>
            </View>

            {/* ✅ HTML reconstruit avec données fraîches à chaque ouverture */}
            <WebView
              source={{ html: buildVoiceflowHTML(buildUserData()) }}
              javaScriptEnabled={true}
              domStorageEnabled={true}
              originWhitelist={['*']}
              allowsInlineMediaPlayback={true}
              mediaPlaybackRequiresUserAction={false}
              style={{ flex: 1, backgroundColor: '#f9fafb' }}
            />
          </SafeAreaView>
        </Modal>
      )}
    </SafeAreaView>
  );
}