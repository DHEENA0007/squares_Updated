export async function handleApiResponse<T>(response: Response): Promise<T> {
  const contentType = response.headers.get('content-type');
  
  if (!response.ok) {
    // Try to parse JSON error if content-type is JSON
    if (contentType && contentType.includes('application/json')) {
      try {
        const errorData = await response.json();
        throw new Error(errorData.message || `HTTP ${response.status}: ${response.statusText}`);
      } catch (parseError) {
        // If JSON parsing fails, get text instead
        const text = await response.text();
        throw new Error(`HTTP ${response.status}: ${text || response.statusText}`);
      }
    }
    
    // For non-JSON responses, try to get text
    try {
      const text = await response.text();
      throw new Error(`HTTP ${response.status}: ${text || response.statusText}`);
    } catch {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
  }

  // Check if response is JSON
  if (contentType && contentType.includes('application/json')) {
    try {
      const text = await response.text();
      if (!text || text.trim().length === 0) {
        throw new Error('Empty response from server');
      }
      return JSON.parse(text);
    } catch (parseError) {
      console.error('JSON Parse Error:', parseError);
      throw new Error('Invalid JSON response from server. The server may be returning HTML or an error page.');
    }
  }
  
  // If not JSON content-type, throw error
  throw new Error(`Invalid response format: Expected JSON but got ${contentType || 'unknown'}`);
}

export async function fetchWithAuth(url: string, options: RequestInit = {}): Promise<Response> {
  const token = localStorage.getItem('token');
  
  return fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
      ...options.headers,
    },
  });
}
