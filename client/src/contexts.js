import { createContext } from "react";

export const DarkModeContext = createContext({
  useDarkMode: true,
  setUseDarkMode: () => {}
});

export const UserContext = createContext({
  user: null,
  setUser: () => {}
});