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

interface AuthContextValue {
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (apiKey: string) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue>({
  isAuthenticated: false,
  isLoading: true,
  login: () => {},
  logout: () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const key = getApiKey();
    setIsAuthenticated(!!key);
    setIsLoading(false);
  }, []);

  const login = useCallback((apiKey: string) => {
    setApiKey(apiKey);
    setIsAuthenticated(true);
  }, []);

  const logout = useCallback(() => {
    clearApiKey();
    setIsAuthenticated(false);
  }, []);

  return (
    <AuthContext.Provider value={{ isAuthenticated, isLoading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
