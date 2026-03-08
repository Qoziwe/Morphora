"use client"

import React, { createContext, useContext, useMemo, useSyncExternalStore, useEffect, useState, type ReactNode } from "react"
import { authStore } from "./auth-store"
import { cartStore } from "./cart-store"
import { orderStore } from "./order-store"
import type { CartItem, Order } from "./types"




// Cached server snapshot values to avoid infinite loops with useSyncExternalStore
const EMPTY_CART_ITEMS: CartItem[] = []
const EMPTY_ORDERS: Order[] = []
const ZERO = 0
const NULL_USER = null

interface StoreContextValue {
  auth: typeof authStore
  cart: typeof cartStore
  orders: typeof orderStore
}

const StoreContext = createContext<StoreContextValue | null>(null)

export function StoreProvider({ children }: { children: ReactNode }) {
  useEffect(() => {
    // Sync cart with user on init and changes
    cartStore.syncWithUser(authStore.getUser())
    return authStore.subscribe(() => {
      cartStore.syncWithUser(authStore.getUser())
    })
  }, [])

  const value = useMemo<StoreContextValue>(
    () => ({
      auth: authStore,
      cart: cartStore,
      orders: orderStore,
    }),
    []
  )

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>
}

export type User = {
  id: string
  email: string
  phone: string
  firstName: string
  lastName: string
  nickname?: string
  role: string
  addresses: any[]
  createdAt: string
}

type AuthContextType = {
  user: User | null
  initialized: boolean
  login: (userData: User) => void
  logout: () => void
  updateProfile: (data: Partial<User>) => void
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [initialized, setInitialized] = useState(false)

  // загрузка из localStorage при старте
  useEffect(() => {
    const raw = localStorage.getItem("mws_user")
    if (raw) {
      try {
        setUser(JSON.parse(raw))
      } catch {}
    }
    setInitialized(true)
  }, [])

  // сохранение в localStorage
  useEffect(() => {
    if (user) {
      localStorage.setItem("mws_user", JSON.stringify(user))
    } else {
      localStorage.removeItem("mws_user")
    }
  }, [user])

  const login = (userData: User) => {
    setUser(userData)
  }

  const logout = () => {
    setUser(null)
  }

  const updateProfile = (data: Partial<User>) => {
    if (!user) return
    setUser({ ...user, ...data })
  }

  return (
    <AuthContext.Provider value={{ user, initialized, login, logout, updateProfile }}>
      {children}
    </AuthContext.Provider>
  )
}




export function useStore() {
  const ctx = useContext(StoreContext)
  if (!ctx) throw new Error("useStore must be used within StoreProvider")
  return ctx
}

export function useAuth() {
  const { auth } = useStore()
  const user = useSyncExternalStore(
    auth.subscribe,
    () => auth.getUser(),
    () => NULL_USER
  )
  return { user, ...auth }
}

export function useCart() {
  const { cart } = useStore()
  const items = useSyncExternalStore(
    cart.subscribe,
    () => cart.getItems(),
    () => EMPTY_CART_ITEMS
  )
  const count = useSyncExternalStore(
    cart.subscribe,
    () => cart.getCount(),
    () => ZERO
  )
  return { items, count, ...cart }
}

export function useOrders() {
  const { orders } = useStore()
  const ordersList = useSyncExternalStore(
    orders.subscribe,
    () => orders.getOrders(),
    () => EMPTY_ORDERS
  )
  return { orders: ordersList, ...orders }
  
  
}


