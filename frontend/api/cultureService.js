import { API_ENDPOINTS, apiFetch } from '@api/client';

class CultureService {
  // ── Cultures utilisateurs ────────────────────────────────────────────────
  async getAllCultures() {
    const response = await apiFetch(API_ENDPOINTS.cultures.base);
    return response.json();
  }

  async addCulture(cultureData) {
    const response = await apiFetch(API_ENDPOINTS.cultures.base, {
      method: 'POST',
      body: JSON.stringify(cultureData),
    });
    return response.json();
  }

  async deleteCulture(id) {
    const response = await apiFetch(API_ENDPOINTS.cultures.byId(id), {
      method: 'DELETE',
    });
    return response.json();
  }

  // ── Base Kc (KCReference) — admin ────────────────────────────────────────
  async getAllKcCultures() {
    const response = await apiFetch(API_ENDPOINTS.kc.search);
    return response.json();
  }

  async addKcCulture(kcData) {
    const response = await apiFetch(API_ENDPOINTS.kc.add, {
      method: 'POST',
      body: JSON.stringify(kcData),
    });
    return response.json();
  }

  async deleteKcCulture(id) {
    const response = await apiFetch(API_ENDPOINTS.kc.delete(id), {
      method: 'DELETE',
    });
    return response.json();
  }
}

export default new CultureService();