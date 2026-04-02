import { API_BASE_URL, apiFetch } from "@api/client";

const OPEN_WEATHER_KEY = "2cb8eb8d3fefa584e0f6f1f7fb50303f";

export async function getOpenWeatherBundle(cityName, language = "fr") {
  const encodedCity = encodeURIComponent(String(cityName || "").trim());
  const currentUrl = `https://api.openweathermap.org/data/2.5/weather?q=${encodedCity}&appid=${OPEN_WEATHER_KEY}&units=metric&lang=${language}`;
  const forecastUrl = `https://api.openweathermap.org/data/2.5/forecast?q=${encodedCity}&appid=${OPEN_WEATHER_KEY}&units=metric&lang=${language}`;

  const [currentResponse, forecastResponse] = await Promise.all([
    fetch(currentUrl),
    fetch(forecastUrl),
  ]);

  const current = await currentResponse.json().catch(() => null);
  const forecast = forecastResponse.ok
    ? await forecastResponse.json().catch(() => ({ list: [] }))
    : { list: [] };

  return {
    current,
    currentResponse,
    forecast,
  };
}

export async function getWeatherHistory(cityName, days = 30) {
  const encodedCity = encodeURIComponent(String(cityName || "").trim());
  const response = await apiFetch(
    `${API_BASE_URL}/weather/history?city=${encodedCity}&days=${days}`,
  );

  return response.json();
}

export async function prefetchCurrentWeather(cityName) {
  const encodedCity = encodeURIComponent(String(cityName || "").trim());
  return apiFetch(`${API_BASE_URL}/weather/current?city=${encodedCity}`);
}
