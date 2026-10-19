import { create } from "zustand";
import { User, Session } from "@supabase/supabase-js";
import { createClient } from "@zerocraft/supabase/client";

interface AuthState {
  user: User | null;
  session: Session | null;
  initialized: boolean;
  setUser: (user: User | null) => void;
  setSession: (session: Session | null) => void;
  setInitialized: (initialized: boolean) => void;
  logout: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  session: null,
  initialized: false,
  setUser: (user) => set({ user }),
  setSession: (session) => set({ session }),
  setInitialized: (initialized) => set({ initialized }),
  logout: async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    set({ user: null, session: null });
  },
}));
