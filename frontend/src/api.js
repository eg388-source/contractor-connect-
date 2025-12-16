import axios from "axios";

const API_URL = import.meta.env.VITE_API_URL || "http://127.0.0.1:5000";

export function getToken() {
  return localStorage.getItem("cc_token");
}
export function setToken(token) {
  localStorage.setItem("cc_token", token);
}
export function clearToken() {
  localStorage.removeItem("cc_token");
  localStorage.removeItem("cc_user");
}
export function getUser() {
  const raw = localStorage.getItem("cc_user");
  return raw ? JSON.parse(raw) : null;
}
export function setUser(u) {
  localStorage.setItem("cc_user", JSON.stringify(u));
}

export const api = axios.create({
  baseURL: API_URL,
});

api.interceptors.request.use((config) => {
  const t = getToken();
  if (t) config.headers.Authorization = `Bearer ${t}`;
  return config;
});
