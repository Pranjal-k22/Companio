import axios from 'axios';

/**
 * Companio Centralized API Client
 * Configured with request correlation IDs, RFC 9457 error normalization,
 * and seamless fallback handling for older adults.
 */
const API = axios.create({
  baseURL: '/api/v1', // Target-state versioned REST namespace
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 15000,
});

// Helper to generate lightweight client correlation ID if crypto.randomUUID is available
const generateClientId = () => {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return 'req_' + Math.random().toString(36).substring(2, 11);
};

// 1. Request Interceptor: Attach JWT & Correlation Request ID
API.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('companio_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    if (!config.headers['X-Request-Id']) {
      config.headers['X-Request-Id'] = generateClientId();
    }

    return config;
  },
  (error) => Promise.reject(error)
);

// 2. Response Interceptor: Capture Server Response & Request Correlation
API.interceptors.response.use(
  (response) => {
    // Record correlation ID from server response header if available
    const serverRequestId = response.headers['x-request-id'];
    if (serverRequestId && response.data && typeof response.data === 'object') {
      if (!response.data.meta) response.data.meta = {};
      response.data.meta.requestId = serverRequestId;
    }
    return response;
  },
  (error) => {
    const originalRequest = error.config;
    const response = error.response;

    // Handle 401 Unauthorized (Session Expired)
    if (response && response.status === 401) {
      const isLoginRequest = originalRequest?.url?.includes('/auth/login');
      if (!isLoginRequest) {
        localStorage.removeItem('companio_token');
        localStorage.removeItem('companio_user');
        if (window.location.pathname !== '/login') {
          window.location.href = '/login?expired=true';
        }
      }
    }

    // Senior-Friendly & Normalized Error Message Translation
    let userMessage = 'We encountered an issue connecting to your care platform. Please try again shortly.';
    const requestId = response?.headers?.['x-request-id'] || originalRequest?.headers?.['X-Request-Id'] || 'unknown';

    if (response?.data) {
      const { detail, message, title } = response.data;
      userMessage = detail || message || title || userMessage;
    } else if (error.code === 'ECONNABORTED' || error.message?.includes('timeout')) {
      userMessage = 'The request took longer than expected. Please check your internet connection.';
    } else if (!response) {
      userMessage = 'Unable to reach the Companio server. Please ensure you are connected to the internet.';
    }

    // Attach normalized properties to the rejected error
    error.userMessage = userMessage;
    error.requestId = requestId;

    return Promise.reject(error);
  }
);

export default API;
