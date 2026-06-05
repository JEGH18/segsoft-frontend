/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useReducer, useMemo, useCallback, useEffect } from 'react';
import type { ReactNode } from 'react';
import { refresh, me } from '@/api/auth';
import { clearAccessToken, setAccessToken } from '@/utils/tokenStorage';
import type { UserResponse } from '@/types/auth';

interface AuthState {
  user: UserResponse | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  lastAnalysisId: string | null;
}

type AuthAction =
  | { type: 'LOGIN'; payload: { user: UserResponse; token: string } }
  | { type: 'LOGOUT' }
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_LAST_ANALYSIS'; payload: string };

function authReducer(state: AuthState, action: AuthAction): AuthState {
  switch (action.type) {
    case 'LOGIN':
      return { ...state, user: action.payload.user, isAuthenticated: true, isLoading: false };
    case 'LOGOUT':
      return { user: null, isAuthenticated: false, isLoading: false, lastAnalysisId: null };
    case 'SET_LOADING':
      return { ...state, isLoading: action.payload };
    case 'SET_LAST_ANALYSIS':
      return { ...state, lastAnalysisId: action.payload };
    default:
      return state;
  }
}

interface AuthContextValue extends AuthState {
  login: (user: UserResponse, token: string) => void;
  logout: () => void;
  setLoading: (loading: boolean) => void;
  setLastAnalysisId: (id: string) => void;
}

export const AuthContext = createContext<AuthContextValue | null>(null);

// Module-level flag prevents double bootstrap in React StrictMode (double useEffect)
let bootstrapRan = false;

const initialState: AuthState = {
  user: null,
  isAuthenticated: false,
  isLoading: true,
  lastAnalysisId: null,
};

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(authReducer, initialState);

  const login = useCallback((user: UserResponse, token: string) => {
    setAccessToken(token);
    dispatch({ type: 'LOGIN', payload: { user, token } });
  }, []);

  const logout = useCallback(() => {
    clearAccessToken();
    dispatch({ type: 'LOGOUT' });
  }, []);

  const setLoading = useCallback((loading: boolean) => {
    dispatch({ type: 'SET_LOADING', payload: loading });
  }, []);

  const setLastAnalysisId = useCallback((id: string) => {
    dispatch({ type: 'SET_LAST_ANALYSIS', payload: id });
  }, []);

  // On mount: try to restore session using the httpOnly refresh cookie.
  // Module-level flag prevents a second call in React StrictMode's double-invoke.
  useEffect(() => {
    if (bootstrapRan) return;
    bootstrapRan = true;
    async function bootstrap() {
      try {
        const authResponse = await refresh();
        setAccessToken(authResponse.accessToken);
        const userResponse = await me();
        dispatch({ type: 'LOGIN', payload: { user: userResponse, token: authResponse.accessToken } });
      } catch {
        clearAccessToken();
        dispatch({ type: 'SET_LOADING', payload: false });
      }
    }
    void bootstrap();
  }, []);

  const value = useMemo(
    () => ({ ...state, login, logout, setLoading, setLastAnalysisId }),
    [state, login, logout, setLoading, setLastAnalysisId],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
