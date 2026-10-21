import axios from 'axios';
import { clearAccessToken, getAccessToken, setAccessToken } from './tokenStorage';

// Without VITE_API_BASE_URL the API is called on the same origin (/api/...), e.g. through
// the Vercel rewrite to the backend in vercel.json.
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? '';

const axiosInstance = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true, // sends the httpOnly refresh_token cookie automatically
});

axiosInstance.interceptors.request.use((config) => {
  const token = getAccessToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

axiosInstance.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    const isTokenExpired =
      error.response?.status === 401 &&
      error.response?.data?.errorCode === 'TOKEN_EXPIRED' &&
      !originalRequest._retried;

    if (isTokenExpired) {
      originalRequest._retried = true;
      try {
        // Cookie is sent automatically; no need to pass refreshToken in body
        const { data } = await axios.post<{ accessToken: string }>(
          `${API_BASE_URL}/api/v1/auth/refresh`,
          {},
          { withCredentials: true },
        );
        setAccessToken(data.accessToken);
        originalRequest.headers.Authorization = `Bearer ${data.accessToken}`;
        return axiosInstance(originalRequest);
      } catch {
        clearAccessToken();
        window.location.href = '/login';
      }
    }

    return Promise.reject(error);
  },
);

export default axiosInstance;
