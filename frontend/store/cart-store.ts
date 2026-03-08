"use client"

import type { CartItem, Product, User } from "./types"
import { api } from "@/lib/api"

let cartItems: CartItem[] = []
let currentUser: User | null = null
let listeners: Array<() => void> = []

function notifyListeners() {
  for (const listener of listeners) {
    listener()
  }
}

export const cartStore = {
  subscribe(listener: () => void) {
    listeners.push(listener)
    return () => {
      listeners = listeners.filter((l) => l !== listener)
    }
  },

  getItems(): CartItem[] {
    return cartItems
  },

  getCount(): number {
    return cartItems.reduce((sum, item) => sum + item.quantity, 0)
  },

  getSubtotal(): number {
    return cartItems.reduce((sum, item) => sum + item.product.price * item.quantity, 0)
  },

  getDeliveryPrice(): number {
    const subtotal = cartStore.getSubtotal()
    if (subtotal >= 100000) return 0
    return 3500
  },

  getTax(): number {
    return Math.round(cartStore.getSubtotal() * 0.12)
  },

  getTotal(): number {
    return cartStore.getSubtotal() + cartStore.getDeliveryPrice() + cartStore.getTax()
  },

  async syncWithUser(user: User | null) {
    if (user?.id === currentUser?.id) return
    currentUser = user

    if (user) {
      try {
        const mergedItems = await api.syncCart(cartItems)
        cartItems = mergedItems
      } catch (e) {
        console.error("Failed to sync cart", e)
      }
    } else {
      cartItems = []
    }
    notifyListeners()
  },

  async addItem(product: Product) {
    const existing = cartItems.find((item) => item.product.id === product.id)
    if (existing) {
      cartItems = cartItems.map((item) =>
        item.product.id === product.id ? { ...item, quantity: item.quantity + 1 } : item
      )
    } else {
      cartItems = [...cartItems, { product, quantity: 1 }]
    }
    notifyListeners()

    if (currentUser) {
       try {
         await api.addToCart(product.id, 1)
       } catch (e) { console.error(e) }
    }
  },

  async removeItem(productId: string) {
    cartItems = cartItems.filter((item) => item.product.id !== productId)
    notifyListeners()

    if (currentUser) {
      try {
        await api.removeFromCart(productId)
      } catch (e) { console.error(e) }
    }
  },

  async updateQuantity(productId: string, quantity: number) {
    if (quantity <= 0) {
      cartStore.removeItem(productId)
      return
    }
    cartItems = cartItems.map((item) =>
      item.product.id === productId ? { ...item, quantity } : item
    )
    notifyListeners()

    if (currentUser) {
      try {
        await api.updateCartItem(productId, quantity)
      } catch (e) { console.error(e) }
    }
  },

  clear() {
    cartItems = []
    notifyListeners()
  },
}
