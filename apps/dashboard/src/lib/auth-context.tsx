"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from "react";
import { getApiKey, setApiKey, clearApiKey } from "./api";
import { isDemoMode, enableDemoMode, disableDemoMode } from "./demo-data";

interface AuthContextValue {
  isAuthenticated: boolean;
  isLoading: boolean;
  isDemo: boolean;
  login: (apiKey: string) => void;
  loginDemo: () => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue>({
  isAuthenticated: false,
  isLoading: true,
  isDemo: false,
  login: () => {},
  loginDemo: () => {},
  logout: () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isDemo, setIsDemo] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const key = getApiKey();
    const demo = isDemoMode();
    setIsAuthenticated(!!key || demo);
    setIsDemo(demo);
    setIsLoading(false);
  }, []);

  const login = useCallback((apiKey: string) => {
    disableDemoMode();
    setApiKey(apiKey);
    setIsDemo(false);
    setIsAuthenticated(true);
  }, []);

  const loginDemo = useCallback(() => {
    enableDemoMode();
    setIsDemo(true);
    setIsAuthenticated(true);
  }, []);

  const logout = useCallback(() => {
    clearApiKey();
    disableDemoMode();
    setIsDemo(false);
    setIsAuthenticated(false);
  }, []);

  return (
    <AuthContext.Provider value={{ isAuthenticated, isLoading, isDemo, login, loginDemo, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
