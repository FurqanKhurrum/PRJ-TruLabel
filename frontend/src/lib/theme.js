const THEME_KEY = "trulabel:theme";
const THEME_EVENT = "trulabel:theme";

const isBrowser = () => typeof window !== "undefined";

const normalizeTheme = (value) => (value === "dark" ? "dark" : "light");

export const getTheme = () => {
  if (!isBrowser()) return "light";
  return normalizeTheme(localStorage.getItem(THEME_KEY));
};

export const applyTheme = (theme) => {
  if (!isBrowser()) return;
  const normalized = normalizeTheme(theme);
  document.documentElement.dataset.theme = normalized;
  document.documentElement.style.colorScheme = normalized;
};

export const setTheme = (theme) => {
  if (!isBrowser()) return;
  const normalized = normalizeTheme(theme);
  localStorage.setItem(THEME_KEY, normalized);
  applyTheme(normalized);
  window.dispatchEvent(new Event(THEME_EVENT));
};

export const subscribeTheme = (callback) => {
  if (!isBrowser()) return () => {};

  const handleChange = (event) => {
    if (event?.type === "storage" && event.key && event.key !== THEME_KEY) {
      return;
    }
    callback();
  };

  window.addEventListener("storage", handleChange);
  window.addEventListener(THEME_EVENT, handleChange);

  return () => {
    window.removeEventListener("storage", handleChange);
    window.removeEventListener(THEME_EVENT, handleChange);
  };
};
