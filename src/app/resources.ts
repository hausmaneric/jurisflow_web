declare global {
  interface Window {
    JURISFLOW_API_URL?: string;
  }
}

const configuredApiUrl =
  window.JURISFLOW_API_URL ||
  localStorage.getItem('jurisflow_api_url') ||
  'https://web-production-3c57a.up.railway.app/api/v1/';

export const apiURL = `${configuredApiUrl.replace(/\/+$/, '')}/`;
export const sessionStorageKey = 'jurisflow_web_session';
export const defaultDateRange = 'ultimos_30_dias';
