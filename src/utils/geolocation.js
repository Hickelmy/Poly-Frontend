/**
 * Geolocalização por IP - fallback quando GPS não está disponível.
 * Usa ipinfo.io (HTTPS, CORS, gratuito) - ipapi.co pode falhar com ERR_NAME_NOT_RESOLVED.
 * @returns {Promise<{latitude: number, longitude: number, city?: string, country?: string} | null>}
 */
export async function getLocationByIP() {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);

    const response = await fetch('https://ipinfo.io/json', {
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    if (!response.ok) return null;

    const data = await response.json();
    if (!data.loc) return null;

    const [latStr, lngStr] = data.loc.split(',');
    const lat = parseFloat(latStr);
    const lng = parseFloat(lngStr);
    if (isNaN(lat) || isNaN(lng) || lat < -90 || lat > 90 || lng < -180 || lng > 180) return null;

    return {
      latitude: lat,
      longitude: lng,
      city: data.city,
      country: data.country_name || data.country,
    };
  } catch {
    return null;
  }
}
