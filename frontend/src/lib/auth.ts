import api from "./api";

export async function login(email: string, password: string): Promise<void> {
  // This function authenticates and stores JWT token in local storage.
  const response = await api.post("/auth/login", { email, password });
  localStorage.setItem("token", response.data.token);
  localStorage.setItem("user", JSON.stringify(response.data.user));
}

export function logout(): void {
  // This function clears local auth session.
  localStorage.removeItem("token");
  localStorage.removeItem("user");
}

export function getUser() {
  // This function returns current logged-in user from local storage.
  const raw = localStorage.getItem("user");
  return raw ? JSON.parse(raw) : null;
}
