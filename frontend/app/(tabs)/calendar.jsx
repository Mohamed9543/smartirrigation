// frontend/app/(tabs)/calendar.jsx
import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  FontAwesome5,
  Ionicons,
  MaterialCommunityIcons,
} from "@expo/vector-icons";
import {
  getOpenWeatherBundle,
  getWeatherForecastWithET0,
  prefetchCurrentWeather,
} from "@api/weather";
import { BrandHeader } from "@components/BrandHeader";
import { useLanguage } from "@context/LanguageContext";
import { API_BASE_URL, apiFetch } from "@api/client";

function buildDay(tMin, tMax, tCur, humidity, wind, gust, rain, description, et0, location, type) {
  return {
    temp_min: Math.round(tMin),
    temp_max: Math.round(tMax),
    temp_current: Math.round(tCur),
    humidity: Math.round(humidity),
    humidity_min: Math.max(Math.round(humidity) - 10, 0),
    humidity_max: Math.min(Math.round(humidity) + 10, 100),
    wind: Number(wind).toFixed(1),
    wind_gust: Number(gust).toFixed(1),
    rain: Number(rain).toFixed(1),
    et0: Number(et0).toFixed(2),
    description: description || "--",
    location,
    type,
  };
}

export default function CalendarScreen() {
  const { t, language } = useLanguage();
  const today = new Date().toISOString().split("T")[0];
  const [selectedDate, setSelectedDate] = useState(today);
  const [dayMap, setDayMap] = useState({});
  const [loading, setLoading] = useState(false);
  const [city, setCity] = useState("Tunis");
  const [inputCity, setInputCity] = useState("Tunis");

  const fetchAll = useCallback(
    async (cityName) => {
      if (!cityName || cityName.trim() === '') {
        console.warn('Calendar.fetchAll: Nom de ville vide');
        Alert.alert(t("common.error"), "Veuillez entrer un nom de ville valide");
        return;
      }

      try {
        setLoading(true);
        const map = {};

        // ✅ Récupérer les données météo avec l'ET₀ du backend
        const { current, currentResponse, forecast, backendET0 } = await getOpenWeatherBundle(cityName, language);
        
        console.log('📊 Calendar - ET₀ reçu du backend:', backendET0);

        if (!currentResponse?.ok || !current) {
          console.error('Calendar.fetchAll: Réponse météo invalide', { 
            ok: currentResponse?.ok, 
            hasCurrent: !!current 
          });
          Alert.alert(t("common.error"), "Ville non trouvée. Vérifiez le nom.");
          setLoading(false);
          return;
        }

        const latitude = current.coord?.lat || 36.8;
        const location = { city: current.name, country: current.sys?.country || "" };

        // Données actuelles
        const currentMin = current.main?.temp_min ?? current.main?.temp ?? 0;
        const currentMax = current.main?.temp_max ?? current.main?.temp ?? 0;
        const currentTemp = current.main?.temp ?? 0;
        const currentHumidity = current.main?.humidity ?? 0;
        const currentWind = current.wind?.speed || 0;
        const currentGust = current.wind?.gust || currentWind;
        const currentRain =
          (current.rain?.["1h"] || 0) +
          (current.rain?.["3h"] || 0) +
          (current.snow?.["1h"] || 0);

        // ✅ Utiliser l'ET₀ du backend, avec fallback si nécessaire
        let finalET0 = backendET0;
        
        if (!finalET0 || finalET0 === 0) {
          console.warn('⚠️ Calendar - ET₀ = 0, tentative de calcul via API fallback');
          try {
            const et0Response = await apiFetch(`${API_BASE_URL}/weather/calculate-et0`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                tmax: currentMax,
                tmin: currentMin,
                hrmax: Math.min(currentHumidity + 15, 100),
                hrmin: Math.max(currentHumidity - 15, 0),
                windSpeed: currentWind,
                latitude: latitude
              })
            });
            
            if (!et0Response.ok) {
              throw new Error(`HTTP ${et0Response.status}: ${et0Response.statusText}`);
            }
            
            const et0Data = await et0Response.json();
            if (et0Data.success && et0Data.data.et0 > 0) {
              finalET0 = et0Data.data.et0;
              console.log('✅ Calendar - ET₀ calculé via fallback:', finalET0);
            } else {
              console.warn('⚠️ Calendar - Fallback ET₀ a retourné 0 ou succès=false', et0Data);
            }
          } catch (error) {
            console.error('❌ Calendar - Échec fallback ET₀:', error.message);
            // Garder finalET0 à 0, on continuera avec une valeur par défaut
          }
        }

        // Créer l'entrée pour aujourd'hui
        map[today] = buildDay(
          currentMin, currentMax, currentTemp, currentHumidity,
          currentWind, currentGust, currentRain,
          current.weather?.[0]?.description, 
          finalET0 || 0, 
          location, 
          "current"
        );

        // Récupérer les ET₀ pour les prévisions
        let forecastET0Map = {};
        try {
          const forecastET0Data = await getWeatherForecastWithET0(cityName, 7);
          if (forecastET0Data && forecastET0Data.et0Map) {
            forecastET0Map = forecastET0Data.et0Map;
            console.log('📊 Calendar - ET₀ prévisions récupérés:', Object.keys(forecastET0Map).length, 'jours');
          } else {
            console.warn('⚠️ Calendar - Données de prévision ET₀ invalides', forecastET0Data);
          }
        } catch (error) {
          console.error('❌ Calendar - Impossible de récupérer les ET₀ de prévision:', error.message);
          // On continue sans les ET₀ de prévision
        }

        // Traiter les prévisions OpenWeather
        if (forecast?.list?.length) {
          const groupedDays = {};

          forecast.list.forEach((item) => {
            const dateKey = new Date(item.dt * 1000).toISOString().split("T")[0];
            if (dateKey >= today) {
              groupedDays[dateKey] = groupedDays[dateKey] || [];
              groupedDays[dateKey].push(item);
            }
          });

          // Mettre à jour la pluie pour aujourd'hui avec les prévisions
          if (groupedDays[today]) {
            const items = groupedDays[today];
            const forecastRainToday = items.reduce(
              (sum, item) =>
                sum + (item.rain?.["3h"] || 0) + (item.rain?.["1h"] || 0) + (item.snow?.["3h"] || 0),
              0,
            );
            const totalRainToday = Math.max(currentRain, forecastRainToday);
            if (totalRainToday > parseFloat(map[today].rain)) {
              map[today] = { ...map[today], rain: Number(totalRainToday).toFixed(1) };
            }
          }

          // Traiter chaque jour de prévision
          Object.entries(groupedDays).forEach(([dateKey, items]) => {
            if (dateKey === today) return; // Déjà traité
            
            const tMin = Math.min(...items.map((item) => item.main.temp_min));
            const tMax = Math.max(...items.map((item) => item.main.temp_max));
            const tMean = items.reduce((sum, item) => sum + item.main.temp, 0) / items.length;
            const humidity = items.reduce((sum, item) => sum + item.main.humidity, 0) / items.length;
            const wind = items.reduce((sum, item) => sum + (item.wind?.speed || 0), 0) / items.length;
            const gust = Math.max(...items.map((item) => item.wind?.gust || item.wind?.speed || 0));
            const rain = items.reduce(
              (sum, item) =>
                sum + (item.rain?.["3h"] || 0) + (item.rain?.["1h"] || 0) + (item.snow?.["3h"] || 0),
              0,
            );
            const midDayItem =
              items.find((item) => new Date(item.dt * 1000).getHours() === 12) ||
              items[Math.floor(items.length / 2)];

            // ✅ Utiliser l'ET₀ du backend pour ce jour de prévision
            let forecastEt0 = forecastET0Map[dateKey] || 0;
            
            // Fallback si pas d'ET₀ pour ce jour
            if (forecastEt0 === 0) {
              console.warn(`⚠️ Calendar - Pas d'ET₀ pour ${dateKey}, estimation simple`);
              // Estimation très basique en attendant
              const tempMoy = (tMax + tMin) / 2;
              const windKmh = wind * 3.6;
              forecastEt0 = parseFloat((0.0023 * (tempMoy + 17.8) * Math.sqrt(100 - humidity) * (1 + 0.1 * windKmh)).toFixed(2));
            }

            map[dateKey] = buildDay(
              tMin, tMax, tMean, humidity, wind, gust, rain,
              midDayItem?.weather?.[0]?.description, 
              forecastEt0, 
              location, 
              "forecast"
            );
          });
        } else {
          console.warn('⚠️ Calendar - Aucune prévision disponible pour', cityName);
        }

        setDayMap(map);
        console.log('✅ Calendar - Données chargées pour', Object.keys(map).length, 'jours');
        
        // Précharger pour le cache (silencieux mais avec log d'erreur)
        try {
          await prefetchCurrentWeather(cityName);
        } catch (error) {
          console.error('❌ Calendar - Échec préchargement météo:', error.message);
          // Non bloquant, on continue
        }
      } catch (error) {
        console.error('❌ Calendar - Erreur fetchAll:', error.message, error.stack);
        Alert.alert(
          t("common.error"), 
          error?.message || t("common.error") || "Une erreur est survenue lors du chargement des données météo"
        );
      } finally {
        setLoading(false);
      }
    },
    [language, t, today],
  );

  useEffect(() => { 
    if (city && city.trim()) {
      fetchAll(city); 
    } else {
      console.warn('Calendar.useEffect: Ville vide, chargement ignoré');
    }
  }, [city, fetchAll]);

  const searchCity = () => { 
    if (inputCity && inputCity.trim()) {
      console.log('Calendar.searchCity: Recherche de', inputCity.trim());
      setCity(inputCity.trim());
    } else {
      console.warn('Calendar.searchCity: Champ de recherche vide');
      Alert.alert(t("common.error"), "Veuillez entrer un nom de ville");
    }
  };

  const formatDate = (value) => {
    try {
      return new Date(value).toLocaleDateString("fr-FR", {
        weekday: "long", 
        day: "numeric", 
        month: "long", 
        year: "numeric",
      });
    } catch (error) {
      console.error('Calendar.formatDate:', error.message, { value });
      return "Date invalide";
    }
  };

  const getIcon = (description = "") => {
    try {
      const text = description.toLowerCase();
      if (text.includes("pluie") || text.includes("rain") || text.includes("drizzle") || text.includes("bruine")) 
        return "rainy";
      if (text.includes("orage") || text.includes("thunder")) 
        return "thunderstorm";
      if (text.includes("nuage") || text.includes("cloud") || text.includes("couvert") || text.includes("overcast")) 
        return "cloudy";
      if (text.includes("degage") || text.includes("clear") || text.includes("ciel dégagé")) 
        return "sunny";
      return "partly-sunny";
    } catch (error) {
      console.error('Calendar.getIcon:', error.message);
      return "partly-sunny";
    }
  };

  const marked = {};
  marked[today] = { marked: true, dotColor: "#4CAF50", today: true };
  marked[selectedDate] = {
    ...(marked[selectedDate] || {}),
    selected: true,
    selectedColor: "#4CAF50",
  };

  Object.entries(dayMap).forEach(([dateKey, data]) => {
    if (data.type === "forecast" && dateKey > today) {
      marked[dateKey] = { 
        ...(marked[dateKey] || {}), 
        marked: true, 
        dotColor: "#3b82f6" 
      };
    }
  });

  const dayWeather = dayMap[selectedDate] || null;

  const [CalendarComponent, setCalendarComponent] = useState(null);
  useEffect(() => {
    import("react-native-calendars")
      .then((m) => {
        console.log('Calendar: Composant calendrier chargé avec succès');
        setCalendarComponent(() => m.Calendar);
      })
      .catch((error) => {
        console.error('Calendar: Erreur chargement react-native-calendars:', error.message);
        // On ne set pas le composant, l'utilisateur verra juste pas le calendrier
      });
  }, []);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#f3f4f6" }}>
      <BrandHeader title={t("calendar.title")} />

      <ScrollView contentContainerStyle={{ paddingBottom: 80 }} showsVerticalScrollIndicator={false}>
        {/* Barre de recherche */}
        <View style={s.searchRow}>
          <TextInput
            style={s.searchInput}
            placeholder={t("calendar.searchPlaceholder") || "Entrer une ville..."}
            value={inputCity}
            onChangeText={setInputCity}
            onSubmitEditing={searchCity}
            returnKeyType="search"
          />
          <TouchableOpacity style={s.searchBtn} onPress={searchCity}>
            <Ionicons name="search" size={20} color="#fff" />
          </TouchableOpacity>
        </View>

        {/* Localisation */}
        {dayWeather ? (
          <View style={s.locationRow}>
            <Ionicons name="location" size={16} color="#666" />
            <Text style={s.locationText}>
              {dayWeather.location?.city || city} - {dayWeather.location?.country || "TN"}
            </Text>
          </View>
        ) : null}

        {/* Calendrier */}
        {CalendarComponent ? (
          <CalendarComponent
            current={selectedDate}
            onDayPress={(day) => setSelectedDate(day.dateString)}
            markedDates={marked}
            theme={{
              todayTextColor: "#4CAF50",
              arrowColor: "#4CAF50",
              selectedDayBackgroundColor: "#4CAF50",
              selectedDayTextColor: "#fff",
              monthTextColor: "#333",
              textMonthFontWeight: "bold",
            }}
            style={{ marginHorizontal: 8, marginBottom: 8 }}
          />
        ) : null}

        {/* Indicateur de chargement */}
        {loading ? (
          <View style={{ marginTop: 32, alignItems: "center" }}>
            <ActivityIndicator size="large" color="#4CAF50" />
            <Text style={{ marginTop: 8, color: "#6b7280" }}>
              {t("common.loading") || "Chargement..."}
            </Text>
          </View>
        ) : dayWeather ? (
          /* Carte météo détaillée */
          <View style={s.card}>
            {/* En-tête avec icône et description */}
            <View style={s.cardHeader}>
              <Ionicons name={getIcon(dayWeather.description)} size={28} color="#f4b400" />
              <View style={{ marginLeft: 12, flex: 1 }}>
                <Text style={s.cardTitle}>
                  {t("calendar.weatherFor") || "Météo du"} {formatDate(selectedDate)}
                </Text>
                <Text style={s.cardDesc}>{dayWeather.description}</Text>
              </View>
            </View>

            {/* Grille 1 : Température et Humidité */}
            <View style={s.gridRow}>
              <View style={s.gridCell}>
                <MaterialCommunityIcons name="thermometer" size={28} color="#ff5252" />
                <Text style={s.gridVal}>{dayWeather.temp_min}°/{dayWeather.temp_max}°C</Text>
                <Text style={s.gridLabel}>Min / Max</Text>
                <Text style={s.gridSub}>Actuel: {dayWeather.temp_current}°C</Text>
              </View>
              <View style={s.gridCell}>
                <Ionicons name="water" size={28} color="#03a9f4" />
                <Text style={s.gridVal}>{dayWeather.humidity}%</Text>
                <Text style={s.gridLabel}>Humidité</Text>
                <Text style={s.gridSub}>{dayWeather.humidity_min}-{dayWeather.humidity_max}%</Text>
              </View>
            </View>

            {/* Grille 2 : Vent et Pluie */}
            <View style={s.gridRow}>
              <View style={s.gridCell}>
                <FontAwesome5 name="wind" size={24} color="#555" />
                <Text style={s.gridVal}>{dayWeather.wind} m/s</Text>
                <Text style={s.gridLabel}>Vent</Text>
                <Text style={s.gridSub}>Rafales: {dayWeather.wind_gust} m/s</Text>
              </View>
              <View style={s.gridCell}>
                <Ionicons name="rainy" size={28} color="#2196f3" />
                <Text style={[s.gridVal, parseFloat(dayWeather.rain) > 0 && { color: "#2196f3" }]}>
                  {dayWeather.rain} mm
                </Text>
                <Text style={s.gridLabel}>Pluie</Text>
                <Text style={s.gridSub}>
                  {parseFloat(dayWeather.rain) > 0 ? "⛈ Précipitations" : "Cumul 24h"}
                </Text>
              </View>
            </View>

            {/* ✅ ET₀ avec indication FAO-56 */}
            <View style={s.et0Row}>
              <Ionicons name="leaf-outline" size={16} color="#16a34a" />
              <Text style={s.et0Text}>
                ET₀ = {dayWeather.et0} mm/j
              </Text>
            </View>
          </View>
        ) : (
          /* Pas de données */
          <View style={s.noDataCard}>
            <Ionicons name="calendar-outline" size={48} color="#ccc" />
            <Text style={s.noDataText}>{t("calendar.noData") || "Aucune donnée"}</Text>
            <TouchableOpacity style={s.retryBtn} onPress={() => fetchAll(city)}>
              <Text style={s.retryBtnText}>{t("common.retry") || "Réessayer"}</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  searchRow: { 
    flexDirection: "row", 
    marginHorizontal: 16, 
    marginBottom: 12, 
    marginTop: 8 
  },
  searchInput: {
    flex: 1, 
    backgroundColor: "#fff", 
    paddingHorizontal: 14, 
    paddingVertical: 10,
    borderTopLeftRadius: 10, 
    borderBottomLeftRadius: 10,
    borderWidth: 1, 
    borderColor: "#e5e7eb", 
    fontSize: 14,
  },
  searchBtn: {
    backgroundColor: "#22c55e", 
    paddingHorizontal: 14, 
    paddingVertical: 10,
    borderTopRightRadius: 10, 
    borderBottomRightRadius: 10,
  },
  locationRow: { 
    flexDirection: "row", 
    alignItems: "center", 
    marginHorizontal: 16, 
    marginBottom: 8 
  },
  locationText: { 
    marginLeft: 4, 
    color: "#4b5563", 
    fontSize: 13 
  },
  card: {
    backgroundColor: "#fff", 
    marginHorizontal: 16, 
    marginTop: 4, 
    padding: 20,
    borderRadius: 16, 
    shadowColor: "#000", 
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06, 
    shadowRadius: 8, 
    elevation: 3,
  },
  cardHeader: {
    flexDirection: "row", 
    alignItems: "center", 
    marginBottom: 16,
    paddingBottom: 12, 
    borderBottomWidth: 1, 
    borderBottomColor: "#f3f4f6",
  },
  cardTitle: { 
    fontWeight: "700", 
    color: "#1f2937", 
    fontSize: 14 
  },
  cardDesc: { 
    color: "#6b7280", 
    fontSize: 13, 
    textTransform: "capitalize", 
    marginTop: 2 
  },
  gridRow: { 
    flexDirection: "row", 
    justifyContent: "space-between", 
    marginBottom: 12 
  },
  gridCell: {
    backgroundColor: "#f9fafb", 
    width: "48%", 
    padding: 14,
    borderRadius: 12, 
    borderWidth: 1, 
    borderColor: "#f3f4f6", 
    alignItems: "center",
  },
  gridVal: { 
    fontWeight: "700", 
    fontSize: 18, 
    color: "#1f2937", 
    marginTop: 6 
  },
  gridLabel: { 
    fontSize: 12, 
    color: "#6b7280", 
    marginTop: 2 
  },
  gridSub: { 
    fontSize: 11, 
    color: "#9ca3af", 
    marginTop: 2 
  },
  et0Row: {
    flexDirection: "row", 
    alignItems: "center", 
    justifyContent: "center",
    backgroundColor: "#f0fdf4", 
    borderRadius: 10, 
    paddingVertical: 8, 
    marginTop: 4,
  },
  et0Text: { 
    marginLeft: 6, 
    fontSize: 13, 
    fontWeight: "700", 
    color: "#16a34a" 
  },
  et0Method: { 
    fontSize: 10, 
    fontWeight: "400", 
    color: "#6b7280" 
  },
  noDataCard: {
    backgroundColor: "#fff", 
    marginHorizontal: 16, 
    marginTop: 8,
    padding: 32, 
    borderRadius: 16, 
    alignItems: "center",
  },
  noDataText: { 
    marginTop: 12, 
    color: "#6b7280", 
    fontSize: 15, 
    textAlign: "center" 
  },
  retryBtn: { 
    marginTop: 16, 
    backgroundColor: "#22c55e", 
    paddingVertical: 12, 
    paddingHorizontal: 24, 
    borderRadius: 99 
  },
  retryBtnText: { 
    color: "#fff", 
    fontWeight: "700" 
  },
});