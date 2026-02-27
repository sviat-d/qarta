"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
} from "react";
import { getToken, getMe, logout as apiLogout } from "./api";

interface MerchantInfo {
  id: string;
  name: string;
  email: string;
  stripeAccountId?: string;
  onboardedAt?: string;
  createdAt: string;
}

interface AuthContextType {
  merchant: MerchantInfo | null;
  loading: boolean;
  logout: () => void;
  refresh: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  merchant: null,
  loading: true,
  logout: () => {},
  refresh: async () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [merchant, setMerchant] = useState<MerchantInfo | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchMe = useCallback(async () => {
    try {
      const token = getToken();
      if (!token) {
        setMerchant(null);
        return;
      }
      const res = await getMe();
      setMerchant(res.data ?? null);
    } catch {
      setMerchant(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMe();
  }, [fetchMe]);

  const handleLogout = useCallback(() => {
    apiLogout();
  }, []);

  return (
    <AuthContext.Provider
      value={{ merchant, loading, logout: handleLogout, refresh: fetchMe }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
