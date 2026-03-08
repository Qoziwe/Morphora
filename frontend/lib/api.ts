const API_BASE_URL = ""; // same-origin via Next.js rewrites

const TOKEN_KEY = "morphoshop_token";

export function getAuthToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(TOKEN_KEY);
}

export function setAuthToken(token: string | null) {
  if (typeof window === "undefined") return;
  if (token) {
    localStorage.setItem(TOKEN_KEY, token);
  } else {
    localStorage.removeItem(TOKEN_KEY);
  }
}

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const token = getAuthToken();

  const res = await fetch(`${API_BASE_URL}${path}`, {
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options?.headers || {}),
    },
    ...options,
  })

  if (!res.ok) {
    let message = `Ошибка запроса (${res.status})`
    try {
      const data = await res.json()
      if (data?.error) message = data.error
    } catch {
      // ignore
    }
    throw new Error(message)
  }

  return res.json()
}


export async function getUserOrders(userId: string) {
  return request<any[]>(`/api/users/${userId}/orders`)
}

export const api = {
  // Products
  getProducts(params?: { category?: string; brand?: string; search?: string; minPrice?: number; maxPrice?: number }) {
    const query = new URLSearchParams()
    if (params?.category) query.set("category", params.category)
    if (params?.brand) query.set("brand", params.brand)
    if (params?.search) query.set("search", params.search)
    if (params?.minPrice) query.set("minPrice", params.minPrice.toString())
    if (params?.maxPrice) query.set("maxPrice", params.maxPrice.toString())
    const qs = query.toString()
    return request<any[]>(`/api/products${qs ? `?${qs}` : ""}`)
  },

  getProductById(id: string) {
    return request<any>(`/api/products/${id}`)
  },

  getCategories() {
    return request<any[]>(`/api/categories`)
  },

  getBanners() {
    return request<any[]>(`/api/banners`)
  },

  // Reviews
  getReviews(productId: string) {
    return request<any[]>(`/api/products/${productId}/reviews`)
  },

  addReview(payload: { productId: string; rating: number; text: string; images?: string[] }) {
    return request<any>(`/api/reviews`, {
      method: "POST",
      body: JSON.stringify(payload),
    })
  },

  uploadImages(files: File[]) {
    const token = getAuthToken();
    const formData = new FormData();
    for (const f of files) {
      formData.append("files", f);
    }
    
    return fetch(`${API_BASE_URL}/api/upload`, {
      method: "POST",
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: formData,
    }).then(res => {
      if (!res.ok) throw new Error("Failed to upload");
      return res.json();
    });
  },

  // Newsletter
  subscribeNewsletter(email: string) {
    return request<any>(`/api/newsletter`, {
      method: "POST",
      body: JSON.stringify({ email }),
    })
  },

  // Auth
  login(email: string, password: string) {
    return request<{ success: boolean; error?: string; user?: any; token?: string }>(
      `/api/auth/login`,
      {
        method: "POST",
        body: JSON.stringify({ email, password }),
      }
    )
  },

  register(payload: {
    firstName: string
    lastName: string
    email: string
    phone: string
    password: string
  }) {
    return request<{ success: boolean; error?: string; user?: any; token?: string }>(
      `/api/auth/register`,
      {
        method: "POST",
        body: JSON.stringify(payload),
      }
    )
  },

  updateProfile(userId: string, updates: any) {
    return request<{ success: boolean; error?: string; user?: any }>(
      `/api/users/${userId}/profile`,
      {
        method: "PATCH",
        body: JSON.stringify(updates),
      }
    )
  },

  addAddress(userId: string, address: any) {
    return request<any>(`/api/users/${userId}/addresses`, {
      method: "POST",
      body: JSON.stringify(address),
    })
  },

  deleteAddress(userId: string, addressId: string) {
    return request<void>(`/api/users/${userId}/addresses/${addressId}`, {
      method: "DELETE",
    })
  },

  // Orders
  createOrder(payload: any) {
    return request<any>(`/api/orders`, {
      method: "POST",
      body: JSON.stringify(payload),
    })
  },

  getOrderByTracking(trackingNumber: string) {
    return request<any>(`/api/orders/tracking/${trackingNumber}`)
  },

  // Cart
  getCart() {
    return request<any[]>(`/api/cart`)
  },

  syncCart(items: any[]) {
    return request<any[]>(`/api/cart/sync`, {
      method: "POST",
      body: JSON.stringify({ items }),
    })
  },

  addToCart(productId: string, quantity: number) {
    return request<any>(`/api/cart/items`, {
      method: "POST",
      body: JSON.stringify({ productId, quantity }),
    })
  },

  updateCartItem(productId: string, quantity: number) {
    return request<any>(`/api/cart/items`, {
      method: "PUT",
      body: JSON.stringify({ productId, quantity }),
    })
  },

  removeFromCart(productId: string) {
    return request<any>(`/api/cart/items/${productId}`, {
      method: "DELETE",
    })
  },
}
