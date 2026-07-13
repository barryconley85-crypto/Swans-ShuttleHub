import React, { createContext, useContext, useEffect, useState } from 'react';
import { useGetMe, AuthSession } from '@workspace/api-client-react';

interface AuthContextType {
  user: AuthSession | null | undefined;
  isLoading: boolean;
  refresh: () => void;
}

const AuthContext = createContext<AuthContextType>({ user: undefined, isLoading: true, refresh: () => {} });

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const { data: user, isLoading, refetch } = useGetMe({ query: { retry: false } });

  return (
    <AuthContext.Provider value={{ user, isLoading, refresh: () => refetch() }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
