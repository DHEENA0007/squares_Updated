const API_BASE_URL = import.meta.env.VITE_API_URL || 'https://app.buildhomemartsquares.com/api';

export async function handleApiResponse<T>(response: Response): Promise<T> {
  const contentType = response.headers.get('content-type');

  if (!response.ok) {
    // Check for auth error first
    handleAuthError(response);

    if (contentType && contentType.includes('application/json')) {
      const error = await response.json().catch(() => ({
        message: `HTTP ${response.status}: ${response.statusText}`,
      }));
      throw new Error(error.message || `HTTP ${response.status}: ${response.statusText}`);
    } else {
      const text = await response.text().catch(() => '');
      throw new Error(`Invalid response format: Expected JSON but got ${contentType || 'unknown'}`);
    }
  }

  if (!contentType || !contentType.includes('application/json')) {
    throw new Error(`Invalid response format: Expected JSON but got ${contentType || 'unknown'}`);
  }

  return response.json();
}

export function handleAuthError(response: Response) {
  if (response.status === 401) {
    // Clear auth data
    localStorage.removeItem('token');
    localStorage.removeItem('user');

    // Reload the page to reset application state
    window.location.reload();

    // Throw error to stop further execution
    throw new Error('Session expired');
  }
}

export async function fetchWithAuth(url: string, options: RequestInit = {}): Promise<Response> {
  const token = localStorage.getItem('token');

  // Construct full URL if it's a relative path
  let fullUrl: string;
  if (url.startsWith('http')) {
    // Already a full URL
    fullUrl = url;
  } else if (url.startsWith('/api')) {
    // URL already has /api prefix, so use base URL without /api
    const baseUrlWithoutApi = API_BASE_URL.replace('/api', '');
    fullUrl = `${baseUrlWithoutApi}${url}`;
  } else {
    // Relative path, append to full API_BASE_URL
    fullUrl = `${API_BASE_URL}${url}`;
  }

  const headers = {
    'Content-Type': 'application/json',
    ...(token && { Authorization: `Bearer ${token}` }),
    ...options.headers,
  };

  const response = await fetch(fullUrl, {
    ...options,
    headers,
  });

  // Check for auth error
  handleAuthError(response);

  return response;
}
