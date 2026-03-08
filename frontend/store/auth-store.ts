"use client"

import type { User, Address } from "./types"
import { api, setAuthToken, getAuthToken } from "@/lib/api"

const STORAGE_KEY = "morphoshop_user"

function loadUserFromStorage(): User | null {
  if (typeof window === "undefined") return null
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    return JSON.parse(raw) as User
  } catch {
    return null
  }
}

function saveUserToStorage(user: User | null) {
  if (typeof window === "undefined") return
  try {
    if (user) {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(user))
    } else {
      window.localStorage.removeItem(STORAGE_KEY)
    }
  } catch {
    // ignore localStorage errors
  }
}

let currentUser: User | null = loadUserFromStorage()
let listeners: Array<() => void> = []

function notifyListeners() {
  for (const listener of listeners) {
    listener()
  }
}

export const authStore = {
  subscribe(listener: () => void) {
    listeners.push(listener)
    return () => {
      listeners = listeners.filter((l) => l !== listener)
    }
  },

  getUser(): User | null {
    return currentUser
  },

  getToken(): string | null {
    return getAuthToken()
  },

  async login(email: string, password: string): Promise<{ success: boolean; error?: string }> {
    try {
      const res = await api.login(email, password)
      if (res.success && res.user) {
        currentUser = res.user as User
        saveUserToStorage(currentUser)
        if (res.token) {
          setAuthToken(res.token)
        }
        notifyListeners()
        return { success: true }
      }
      return { success: false, error: res.error || "Неверный email или пароль" }
    } catch (e: any) {
      return { success: false, error: e.message || "Ошибка входа" }
    }
  },

  async register(data: {
    firstName: string
    lastName: string
    email: string
    phone: string
    password: string
  }): Promise<{ success: boolean; error?: string }> {
    try {
      const res = await api.register(data)
      if (res.success && res.user) {
        currentUser = res.user as User
        saveUserToStorage(currentUser)
        if (res.token) {
          setAuthToken(res.token)
        }
        notifyListeners()
        return { success: true }
      }
      return { success: false, error: res.error || "Ошибка регистрации" }
    } catch (e: any) {
      return { success: false, error: e.message || "Ошибка регистрации" }
    }
  },

  logout() {
    currentUser = null
    saveUserToStorage(null)
    setAuthToken(null)
    notifyListeners()
  },

  async updateProfile(
    updates: Partial<Pick<User, "firstName" | "lastName" | "nickname" | "phone" | "avatar">>
  ) {
    if (!currentUser) return
    try {
      const res = await api.updateProfile(currentUser.id, updates)
      if (res.success && res.user) {
        currentUser = res.user as User
        saveUserToStorage(currentUser)
        notifyListeners()
      }
    } catch (e) {
      console.error("Failed to update profile", e)
    }
  },

  async addAddress(address: Omit<Address, "id">) {
    if (!currentUser) return
    try {
      const newAddr = await api.addAddress(currentUser.id, address)
      const addresses = currentUser.addresses || []
      if (newAddr.isDefault) {
        currentUser = {
          ...currentUser,
          addresses: [...addresses.map((a) => ({ ...a, isDefault: false })), newAddr],
        }
      } else {
        currentUser = {
          ...currentUser,
          addresses: [...addresses, newAddr],
        }
      }
      saveUserToStorage(currentUser)
      notifyListeners()
    } catch (e) {
      console.error("Failed to add address", e)
    }
  },

  async removeAddress(addressId: string) {
    if (!currentUser) return
    try {
      await api.deleteAddress(currentUser.id, addressId)
      currentUser = {
        ...currentUser,
        addresses: currentUser.addresses.filter((a) => a.id !== addressId),
      }
      saveUserToStorage(currentUser)
      notifyListeners()
    } catch (e) {
      console.error("Failed to remove address", e)
    }
  },
}
