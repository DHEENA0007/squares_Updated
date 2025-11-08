const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';

export async function handleApiResponse<T>(response: Response): Promise<T> {
  const contentType = response.headers.get('content-type');
  
  if (!response.ok) {
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

export async function fetchWithAuth(url: string, options: RequestInit = {}): Promise<Response> {
  const token = localStorage.getItem('token');
  
  // Construct full URL if it's a relative path
  const fullUrl = url.startsWith('http') ? url : `${API_BASE_URL}${url}`;
  
  const headers = {
    'Content-Type': 'application/json',
    ...(token && { Authorization: `Bearer ${token}` }),
    ...options.headers,
  };

  return fetch(fullUrl, {
    ...options,
    headers,
  });
}
