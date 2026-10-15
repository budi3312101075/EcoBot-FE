import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

export const useAuth = create(
  persist(
    (set) => ({
      loginResponse: null,
      setLoginResponse: (response) => set({ loginResponse: response }),
      setLogOut: () => set({ loginResponse: null }),
    }),
    {
      name: "ecoBot",
      storage: createJSONStorage(() => localStorage),
    },
  ),
);
