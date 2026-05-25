import axios from 'axios';
import { toast } from 'react-toastify';

const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || '/api';

export const apiClient = axios.create({
  baseURL: apiBaseUrl,
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
  },
});

function extractErrorMessage(error) {
  if (axios.isAxiosError(error)) {
    const data = error.response?.data;

    if (typeof data === 'string' && data.trim()) {
      return data;
    }

    if (data && typeof data === 'object') {
      if (typeof data.message === 'string' && data.message.trim()) {
        return data.message;
      }

      const fieldErrors = Object.values(data).filter(
        (value) => typeof value === 'string' && value.trim().length > 0,
      );

      if (fieldErrors.length > 0) {
        return fieldErrors.join(' ');
      }
    }

    if (error.message) {
      return error.message;
    }
  }

  if (error instanceof Error && error.message) {
    return error.message;
  }

  return 'Something went wrong while talking to the server.';
}

apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    toast.error(extractErrorMessage(error));
    return Promise.reject(error);
  },
);

export function getApiErrorMessage(error) {
  return extractErrorMessage(error);
}