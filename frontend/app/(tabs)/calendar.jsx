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
  prefetchCurrentWeather,
} from "@api/weather";
import { BrandHeader } from "@components/BrandHeader";
import { useLanguage } from "@context/LanguageContext";

function getDayOfYear(date) {
  const start = new Date(date.getFullYear(), 0, 0);
  return Math.floor((date - start) / 86400000);
}

function calcET0(tmax, tmin, humidity, windSpeed, latitude, date) {
  try {
    const tmean = (tmax + tmin) / 2;
    const pressure = 101.3 * Math.pow((293 - 0.0065 * 0) / 293, 5.26);
    const gamma = 0.000665 * pressure;
    const esTx = 0.6108 * Math.exp((17.27 * tmax) / (tmax + 237.3));
    const esTn = 0.6108 * Math.exp((17.27 * tmin) / (tmin + 237.3));
    const es = (esTx + esTn) / 2;
    const ea = es * (humidity / 100);
    const delta = (4098 * es) / Math.pow(tmean + 237.3, 2);
    const phi = (latitude * Math.PI) / 180;
    const dayOfYear = getDayOfYear(date);
    const dr = 1 + 0.033 * Math.cos((2 * Math.PI / 365) * dayOfYear);
    const decl = 0.409 * Math.sin((2 * Math.PI / 365) * dayOfYear - 1.39);
    const ws = Math.acos(
      Math.max(-1, Math.min(1, -Math.tan(phi) * Math.tan(decl))),
    );
    const ra =
      ((24 * 60) / Math.PI) *
      0.082 *
      dr *
      (ws * Math.sin(phi) * Math.sin(decl) +
        Math.cos(phi) * Math.cos(decl) * Math.sin(ws));
    const month = date.getMonth() + 1;
    const rs =
      ((month >= 5 && month <= 8) ? 28 : (month >= 3 && month <= 10) ? 22 : 15) *
      0.75;
    const rns = 0.77 * rs;
    const tk = 273.16;
    const rnl =
      4.903e-9 *
      ((Math.pow(tmax + tk, 4) + Math.pow(tmin + tk, 4)) / 2) *
      (0.34 - 0.14 * Math.sqrt(Math.max(0, ea))) *
      (1.35 * (rs / Math.max(ra, 0.1)) - 0.35);
    const rn = rns - rnl;
    const denominator = delta + gamma * (1 + 0.34 * windSpeed);
    const et0 =
      (0.408 * delta * rn) / denominator +
      (gamma * (900 / (tmean + 273)) * windSpeed * (es - ea)) / denominator;
    return Math.max(0, Number(et0.toFixed(2)));
  } catch {
    return 0;
  }
}

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
    // ✅ Fix #7: Properly accumulate rain (1h + 3h), never show 0 when raining
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
      try {
        setLoading(true);
        const map = {};

        const { current, currentResponse, forecast } = await getOpenWeatherBundle(cityName, language);

        if (!currentResponse?.ok || !current) {
          Alert.alert(t("common.error"), "Ville non trouvée");
          return;
        }

        const latitude = current.coord?.lat || 36.8;
        const location = { city: current.name, country: current.sys?.country || "" };

        // ✅ Fix #7: Collect ALL rain fields from current weather
        const currentMin = current.main?.temp_min ?? current.main?.temp ?? 0;
        const currentMax = current.main?.temp_max ?? current.main?.temp ?? 0;
        const currentTemp = current.main?.temp ?? 0;
        const currentHumidity = current.main?.humidity ?? 0;
        const currentWind = current.wind?.speed || 0;
        const currentGust = current.wind?.gust || currentWind;
        // ✅ Sum rain from 1h and 3h fields
        const currentRain =
          (current.rain?.["1h"] || 0) +
          (current.rain?.["3h"] || 0) +
          (current.snow?.["1h"] || 0);

        const currentEt0 = calcET0(currentMax, currentMin, currentHumidity, currentWind, latitude, new Date());

        map[today] = buildDay(
          currentMin, currentMax, currentTemp, currentHumidity,
          currentWind, currentGust, currentRain,
          current.weather?.[0]?.description, currentEt0, location, "current",
        );

        if (forecast?.list?.length) {
          const groupedDays = {};

          forecast.list.forEach((item) => {
            const dateKey = new Date(item.dt * 1000).toISOString().split("T")[0];
            if (dateKey >= today) {
              groupedDays[dateKey] = groupedDays[dateKey] || [];
              groupedDays[dateKey].push(item);
            }
          });

          // ✅ Fix #7: For today, merge forecast rain with current rain
          if (groupedDays[today]) {
            const items = groupedDays[today];
            // Sum all rain slots for today's forecast
            const forecastRainToday = items.reduce(
              (sum, item) =>
                sum + (item.rain?.["3h"] || 0) + (item.rain?.["1h"] || 0) + (item.snow?.["3h"] || 0),
              0,
            );
            // Use the bigger of current or forecast to avoid showing 0
            const totalRainToday = Math.max(currentRain, forecastRainToday);
            if (totalRainToday > map[today].rain) {
              map[today] = { ...map[today], rain: Number(totalRainToday).toFixed(1) };
            }
          }

          Object.entries(groupedDays).forEach(([dateKey, items]) => {
            if (dateKey === today) return; // already handled above
            const tMin = Math.min(...items.map((item) => item.main.temp_min));
            const tMax = Math.max(...items.map((item) => item.main.temp_max));
            const tMean = items.reduce((sum, item) => sum + item.main.temp, 0) / items.length;
            const humidity = items.reduce((sum, item) => sum + item.main.humidity, 0) / items.length;
            const wind = items.reduce((sum, item) => sum + (item.wind?.speed || 0), 0) / items.length;
            const gust = Math.max(...items.map((item) => item.wind?.gust || item.wind?.speed || 0));
            // ✅ Fix #7: Sum ALL rain slots (3h + 1h + snow) for the whole day
            const rain = items.reduce(
              (sum, item) =>
                sum + (item.rain?.["3h"] || 0) + (item.rain?.["1h"] || 0) + (item.snow?.["3h"] || 0),
              0,
            );
            const midDayItem =
              items.find((item) => new Date(item.dt * 1000).getHours() === 12) ||
              items[Math.floor(items.length / 2)];
            const forecastEt0 = calcET0(tMax, tMin, humidity, wind, latitude, new Date(`${dateKey}T12:00:00`));

            map[dateKey] = buildDay(
              tMin, tMax, tMean, humidity, wind, gust, rain,
              midDayItem?.weather?.[0]?.description, forecastEt0, location, "forecast",
            );
          });
        }

        setDayMap(map);
        prefetchCurrentWeather(cityName).catch(() => {});
      } catch (error) {
        Alert.alert(t("common.error"), error?.message || t("common.error"));
      } finally {
        setLoading(false);
      }
    },
    [language, t, today],
  );

  useEffect(() => { fetchAll(city); }, [city, fetchAll]);

  const searchCity = () => { if (inputCity.trim()) setCity(inputCity.trim()); };

  const formatDate = (value) =>
    new Date(value).toLocaleDateString("fr-FR", {
      weekday: "long", day: "numeric", month: "long", year: "numeric",
    });

  const getIcon = (description = "") => {
    const text = description.toLowerCase();
    if (text.includes("pluie") || text.includes("rain") || text.includes("drizzle") || text.includes("bruine")) return "rainy";
    if (text.includes("orage") || text.includes("thunder")) return "thunderstorm";
    if (text.includes("nuage") || text.includes("cloud") || text.includes("couvert") || text.includes("overcast")) return "cloudy";
    if (text.includes("degage") || text.includes("clear") || text.includes("ciel dégagé")) return "sunny";
    return "partly-sunny";
  };

  const marked = {};
  marked[today] = { marked: true, dotColor: "#4CAF50", today: true };
  marked[selectedDate] = {
    ...(marked[selectedDate] || {}),
    selected: true,
    selectedColor: "#4CAF50",
  };

  // Add forecast markers
  Object.entries(dayMap).forEach(([dateKey, data]) => {
    if (data.type === "forecast" && dateKey > today) {
      marked[dateKey] = { ...(marked[dateKey] || {}), marked: true, dotColor: "#3b82f6" };
    }
  });

  const dayWeather = dayMap[selectedDate] || null;

  const badgeMap = {
    forecast: { label: t("calendar.forecast"), bg: "#eff6ff", border: "#bfdbfe", text: "#2563eb" },
    current:  { label: t("calendar.weatherFor") || "Aujourd'hui", bg: "#f0fdf4", border: "#bbf7d0", text: "#16a34a" },
  };

  // Lazy import Calendar to avoid SSR issues
  const [CalendarComponent, setCalendarComponent] = useState(null);
  useEffect(() => {
    import("react-native-calendars").then((m) => setCalendarComponent(() => m.Calendar)).catch(() => {});
  }, []);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#f3f4f6" }}>
      <BrandHeader title={t("calendar.title")} />

      <ScrollView contentContainerStyle={{ paddingBottom: 80 }} showsVerticalScrollIndicator={false}>
        {/* ── Search ── */}
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

        {dayWeather ? (
          <View style={s.locationRow}>
            <Ionicons name="location" size={16} color="#666" />
            <Text style={s.locationText}>
              {dayWeather.location?.city || city} - {dayWeather.location?.country || "TN"}
            </Text>
          </View>
        ) : null}

        {/* ── Calendar ── */}
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

        {loading ? (
          <View style={{ marginTop: 32, alignItems: "center" }}>
            <ActivityIndicator size="large" color="#4CAF50" />
            <Text style={{ marginTop: 8, color: "#6b7280" }}>
              {t("common.loading") || "Chargement..."}
            </Text>
          </View>
        ) : dayWeather ? (
          <View style={s.card}>
            <View style={s.cardHeader}>
              <Ionicons name={getIcon(dayWeather.description)} size={28} color="#f4b400" />
              <View style={{ marginLeft: 12, flex: 1 }}>
                <Text style={s.cardTitle}>
                  {t("calendar.weatherFor") || "Météo du"} {formatDate(selectedDate)}
                </Text>
                <Text style={s.cardDesc}>{dayWeather.description}</Text>
              </View>
            </View>

            {/* ── Grid row 1: Temp + Humidity ── */}
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

            {/* ── Grid row 2: Wind + Rain ── */}
            <View style={s.gridRow}>
              <View style={s.gridCell}>
                <FontAwesome5 name="wind" size={24} color="#555" />
                <Text style={s.gridVal}>{dayWeather.wind} m/s</Text>
                <Text style={s.gridLabel}>Vent</Text>
                <Text style={s.gridSub}>Rafales: {dayWeather.wind_gust} m/s</Text>
              </View>
              <View style={s.gridCell}>
                <Ionicons name="rainy" size={28} color="#2196f3" />
                {/* ✅ Fix #7: Show real rain value, highlight if raining */}
                <Text style={[s.gridVal, parseFloat(dayWeather.rain) > 0 && { color: "#2196f3" }]}>
                  {dayWeather.rain} mm
                </Text>
                <Text style={s.gridLabel}>Pluie</Text>
                <Text style={s.gridSub}>
                  {parseFloat(dayWeather.rain) > 0 ? "⛈ Précipitations" : "Cumul 24h"}
                </Text>
              </View>
            </View>

            {/* ET0 */}
            <View style={s.et0Row}>
              <Ionicons name="leaf-outline" size={16} color="#16a34a" />
              <Text style={s.et0Text}>ET₀ = {dayWeather.et0} mm/j</Text>
            </View>
          </View>
        ) : (
          <View style={s.noDataCard}>
            <Ionicons name="calendar-outline" size={48} color="#ccc" />
            <Text style={s.noDataText}>{t("calendar.noData") || "Aucune donnée"}</Text>
            <TouchableOpacity style={s.retryBtn} onPress={() => fetchAll(city)}>
              <Text style={s.retryBtnText}>{t("common.retry") || "Réessayer"}</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* ✅ Fix #7: Historical section REMOVED */}
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  searchRow: { flexDirection: "row", marginHorizontal: 16, marginBottom: 12, marginTop: 8 },
  searchInput: {
    flex: 1, backgroundColor: "#fff", paddingHorizontal: 14, paddingVertical: 10,
    borderTopLeftRadius: 10, borderBottomLeftRadius: 10,
    borderWidth: 1, borderColor: "#e5e7eb", fontSize: 14,
  },
  searchBtn: {
    backgroundColor: "#22c55e", paddingHorizontal: 14, paddingVertical: 10,
    borderTopRightRadius: 10, borderBottomRightRadius: 10,
  },
  locationRow: { flexDirection: "row", alignItems: "center", marginHorizontal: 16, marginBottom: 8 },
  locationText: { marginLeft: 4, color: "#4b5563", fontSize: 13 },
  card: {
    backgroundColor: "#fff", marginHorizontal: 16, marginTop: 4, padding: 20,
    borderRadius: 16, shadowColor: "#000", shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06, shadowRadius: 8, elevation: 3,
  },
  badge: {
    alignSelf: "flex-start", borderWidth: 1, borderRadius: 99,
    paddingHorizontal: 12, paddingVertical: 4, marginBottom: 12,
  },
  badgeText: { fontSize: 12, fontWeight: "700" },
  cardHeader: {
    flexDirection: "row", alignItems: "center", marginBottom: 16,
    paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: "#f3f4f6",
  },
  cardTitle: { fontWeight: "700", color: "#1f2937", fontSize: 14 },
  cardDesc: { color: "#6b7280", fontSize: 13, textTransform: "capitalize", marginTop: 2 },
  gridRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: 12 },
  gridCell: {
    backgroundColor: "#f9fafb", width: "48%", padding: 14,
    borderRadius: 12, borderWidth: 1, borderColor: "#f3f4f6", alignItems: "center",
  },
  gridVal: { fontWeight: "700", fontSize: 18, color: "#1f2937", marginTop: 6 },
  gridLabel: { fontSize: 12, color: "#6b7280", marginTop: 2 },
  gridSub: { fontSize: 11, color: "#9ca3af", marginTop: 2 },
  et0Row: {
    flexDirection: "row", alignItems: "center", justifyContent: "center",
    backgroundColor: "#f0fdf4", borderRadius: 10, paddingVertical: 8, marginTop: 4,
  },
  et0Text: { marginLeft: 6, fontSize: 13, fontWeight: "700", color: "#16a34a" },
  noDataCard: {
    backgroundColor: "#fff", marginHorizontal: 16, marginTop: 8,
    padding: 32, borderRadius: 16, alignItems: "center",
  },
  noDataText: { marginTop: 12, color: "#6b7280", fontSize: 15, textAlign: "center" },
  retryBtn: { marginTop: 16, backgroundColor: "#22c55e", paddingVertical: 12, paddingHorizontal: 24, borderRadius: 99 },
  retryBtnText: { color: "#fff", fontWeight: "700" },
});