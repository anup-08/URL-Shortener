import { apiClient } from './client';

export async function shortenUrl(longUrl) {
  const response = await apiClient.post('/url/shorten', longUrl, {
    headers: { 'Content-Type': 'text/plain' },
  });

  return response.data;
}

export async function createCustomUrl(longUrl, shortUrl) {
  const response = await apiClient.post('/url/custom', {
    longUrl,
    shortUrl,
  });

  return response.data;
}

export async function getUrlStatus(shortUrl, options = {}) {
  const response = await apiClient.get(`/url/${encodeURIComponent(shortUrl)}/status`, options);
  return response.data;
}

export async function deleteUrl(shortUrl) {
  await apiClient.delete(`/url/${encodeURIComponent(shortUrl)}`);
}

export function buildShortLink(shortUrl) {
  const baseUrl = (
    import.meta.env.VITE_PUBLIC_SHORTENER_BASE_URL ||
    import.meta.env.VITE_BACKEND_URL ||
    window.location.origin
  ).replace(/\/$/, '');
  return `${baseUrl}/api/url/${encodeURIComponent(shortUrl)}`;
}