import axios from 'axios';
import { clearAccessToken, getAccessToken, setAccessToken } from './tokenStorage';
import { saveSessionEndedNotice, sessionEndedMessage } from './sessionNotice';

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

/** Drops the session and goes to the login page, which shows the notice if there is one. */
function endSession(notice: string | null) {
  clearAccessToken();
  if (notice) saveSessionEndedNotice(notice);
  window.location.href = '/login';
}

axiosInstance.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // The account was locked, disabled or deleted while the session was open: the server
    // refuses its access token right away, without waiting for it to expire.
    const ended = sessionEndedMessage(error);
    if (ended) {
      endSession(ended);
      return Promise.reject(error);
    }

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
      } catch (refreshError: unknown) {
        const data = (refreshError as { response?: { data?: { errorCode?: string; message?: string } } })
          .response?.data;
        endSession(data?.errorCode === 'ACCOUNT_LOCKED' ? data.message ?? null : null);
      }
    }

    return Promise.reject(error);
  },
);

export default axiosInstance;
