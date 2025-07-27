/**
 * @fileoverview Authenticated API Client Utility
 * @module APIClient
 * @category Utils
 * 
 * @description
 * Utility for making authenticated API calls with proper session handling.
 * Automatically includes credentials for authenticated requests.
 */

interface APIResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

interface APIRequestOptions extends RequestInit {
  requireAuth?: boolean;
}

/**
 * Makes an authenticated API request with automatic cookie inclusion
 */
export async function apiRequest<T = any>(
  url: string, 
  options: APIRequestOptions = {}
): Promise<APIResponse<T>> {
  const {
    requireAuth = true,
    ...fetchOptions
  } = options;

  try {
    const requestOptions: RequestInit = {
      ...fetchOptions,
      headers: {
        'Content-Type': 'application/json',
        ...fetchOptions.headers,
      },
    };

    // Always include credentials for authenticated requests
    if (requireAuth) {
      requestOptions.credentials = 'include';
    }

    const response = await fetch(url, requestOptions);
    
    if (!response.ok) {
      // Handle authentication errors
      if (response.status === 401) {
        throw new Error('Authentication required. Please log in.');
      }
      
      // Handle other HTTP errors
      const errorText = await response.text();
      throw new Error(`Request failed: ${response.status} ${response.statusText}${errorText ? ` - ${errorText}` : ''}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error(`API Request failed for ${url}:`, error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    };
  }
}

/**
 * Convenience methods for different HTTP methods
 */
export const api = {
  get: <T = any>(url: string, options?: APIRequestOptions) => 
    apiRequest<T>(url, { ...options, method: 'GET' }),
    
  post: <T = any>(url: string, data?: any, options?: APIRequestOptions) => 
    apiRequest<T>(url, { 
      ...options, 
      method: 'POST', 
      body: data ? JSON.stringify(data) : undefined 
    }),
    
  put: <T = any>(url: string, data?: any, options?: APIRequestOptions) => 
    apiRequest<T>(url, { 
      ...options, 
      method: 'PUT', 
      body: data ? JSON.stringify(data) : undefined 
    }),
    
  delete: <T = any>(url: string, options?: APIRequestOptions) => 
    apiRequest<T>(url, { ...options, method: 'DELETE' }),

  // Special method for file uploads that preserves FormData
  upload: <T = any>(url: string, formData: FormData, options?: APIRequestOptions) => 
    apiRequest<T>(url, {
      ...options,
      method: 'POST',
      body: formData,
      headers: {
        // Don't set Content-Type for FormData - let the browser set it with boundary
        ...options?.headers,
      },
    }),
};

export default api;
