const API_BASE = "/api";

export const getStoredAuth = () => {
  const raw = localStorage.getItem("labconnect_auth");
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    localStorage.removeItem("labconnect_auth");
    return null;
  }
};

export const setStoredAuth = (auth) => {
  if (!auth) {
    localStorage.removeItem("labconnect_auth");
    return;
  }
  localStorage.setItem("labconnect_auth", JSON.stringify(auth));
};

let onUnauthorized = () => {};
export function setOnUnauthorized(fn) {
  onUnauthorized = typeof fn === "function" ? fn : () => {};
}

export async function apiRequest(path, options = {}) {
  const auth = getStoredAuth();
  const headers = {
    ...(options.headers || {}),
  };
  const isFormData = typeof FormData !== "undefined" && options.body instanceof FormData;
  if (!isFormData) {
    headers["Content-Type"] = "application/json";
  }
  if (!options.skipAuth && auth?.token) {
    headers.Authorization = `Bearer ${auth.token}`;
  }
  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers,
  });
  const hadAuth = !options.skipAuth && auth?.token;
  if (!response.ok) {
    if (response.status === 401 && hadAuth) {
      setStoredAuth(null);
      onUnauthorized();
    }
    let message = "Ошибка запроса";
    const text = await response.text();
    try {
      const data = text ? JSON.parse(text) : {};
      if (typeof data.message === "string") {
        message = data.message;
      } else if (typeof data.detail === "string") {
        message = data.detail;
      } else if (Array.isArray(data.fields)) {
        message = data.fields
          .map((field) => {
            if (field.field === "mail") return "Введите корректный email";
            if (field.field === "password" && field.message?.includes("at least")) {
              return "Пароль должен быть не короче 8 символов";
            }
            return `${field.field || "Поле"}: ${field.message}`;
          })
          .join(", ");
      } else if (Array.isArray(data.detail)) {
        message = data.detail
          .map((item) => {
            const field = Array.isArray(item.loc) ? item.loc.slice(1).join(".") : "Поле";
            if (field === "mail") return "Введите корректный email";
            if (field === "password" && item.msg?.includes("at least")) {
              return "Пароль должен быть не короче 8 символов";
            }
            return `${field}: ${item.msg}`;
          })
          .join(", ");
      } else if (text && !text.startsWith("<")) {
        message = text;
      }
    } catch {
      if (text && !text.startsWith("<")) message = text;
    }
    const normalized = message
      .replace("Invalid credentials", "Неверный email или пароль")
      .replace("User with this mail already exists", "Аккаунт с таким email уже существует")
      .replace("User with this mail or ORCID already exists", "Аккаунт с таким email или ORCID уже зарегистрирован. Войдите или воспользуйтесь восстановлением пароля.")
      .replace("Not authenticated", "Требуется вход")
      .replace("Invalid token", "Сессия истекла, войдите снова")
      .replace("Laboratory not published", "Лаборатория не опубликована")
      .replace("Organization not published", "Организация не опубликована")
      .replace("Body has already been consumed", "Организация с таким ROR ID уже добавлена на платформу.");
    throw new Error(normalized);
  }
  if (response.status === 204) return null;
  return response.json();
}
