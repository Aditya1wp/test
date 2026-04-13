const DEFAULT_API_BASE_URL = '';

export const API_BASE_URL = (
  import.meta.env.VITE_API_BASE_URL?.trim() || DEFAULT_API_BASE_URL
).replace(/\/$/, '');

export const apiUrl = (path) => {
  if (!path.startsWith('/')) {
    throw new Error(`API path must start with "/": ${path}`);
  }

  return `${API_BASE_URL}${path}`;
};

export async function apiFetch(path, options = {}) {
  const isFormData = options.body instanceof FormData;
  const enhancedOptions = {
    ...options,
    headers: {
      ...(isFormData ? {} : { 'Content-Type': 'application/json' }),
      ...options.headers,
    }
  };

  return fetch(apiUrl(path), enhancedOptions);
}
