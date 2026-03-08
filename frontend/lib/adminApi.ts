const API_URL = "";

function getToken() {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("admin_token");
}

async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const token = getToken();

  const res = await fetch(`${API_URL}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(init?.headers ?? {}),
    },
    cache: "no-store",
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || `HTTP ${res.status}`);
  }
  if (res.status === 204) return undefined as T;
  return res.json();
}

export const adminApi = {
  login: (email: string, password: string) =>
    api<{ success: boolean; token?: string; error?: string }>(
      "/api/admin/auth/login",
      { method: "POST", body: JSON.stringify({ email, password }) }
    ),

  me: () => api<{ ok: boolean }>("/api/admin/auth/me"),


  deleteProduct: (id: string) =>
  api<void>(`/api/admin/products/${id}`, { method: "DELETE" }),

  getCategories: () => api<any[]>("/api/categories"),
  dashboard: () => api<{ users: any[]; newOrders: number }>("/api/admin/dashboard"),
  order: (orderId: string) => api<any>(`/api/admin/orders/${orderId}`),
  updateOrderStatus: (orderId: string, statusHistory: any[]) =>
    api<any>(`/api/admin/orders/${orderId}/status`, {
      method: "PATCH",
      body: JSON.stringify({ statusHistory }),
    }),
  deleteUser: (userId: string) =>
    api<void>(`/api/admin/users/${userId}`, { method: "DELETE" }),
  createProduct: (payload: any) =>
    api<any>("/api/admin/products", { method: "POST", body: JSON.stringify(payload) }),

  products: () => api<any[]>("/api/admin/products"),
  product: (id: string) => api<any>(`/api/admin/products/${id}`),
  updateProduct: (id: string, payload: any) =>
    api<any>(`/api/admin/products/${id}`, { method: "PATCH", body: JSON.stringify(payload) }),

};

