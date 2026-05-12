"use client";

import { createContext, useContext } from "react";

const AuthContext = createContext<{ isAdmin: boolean }>({ isAdmin: false });

export function AuthProvider({ children, isAdmin }: { children: React.ReactNode; isAdmin: boolean }) {
  return <AuthContext.Provider value={{ isAdmin }}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}
