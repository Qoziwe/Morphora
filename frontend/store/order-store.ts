"use client"
import type { Order, OrderStatus, Address, CartItem } from "./types"
import { api } from "@/lib/api"
import { authStore } from "./auth-store"
import { getUserOrders } from "@/lib/api"

let orders: Order[] = []
let listeners: Array<() => void> = []

function notifyListeners() {
  for (const listener of listeners) {
    listener()
  }
}

export const orderStore = {
  subscribe(listener: () => void) {
    listeners.push(listener)
    return () => {
      listeners = listeners.filter((l) => l !== listener)
    }
  },

  getOrders(): Order[] {
    return orders
  },

  getOrderByTracking(trackingNumber: string): Order | undefined {
    return orders.find((o) => o.trackingNumber === trackingNumber)
  },

  getOrderById(id: string): Order | undefined {
    return orders.find((o) => o.id === id)
  },

  async loadOrders(userId: string) {
    try {
      const data = await getUserOrders(userId)
      orders = Array.isArray(data) ? data : []
      notifyListeners()
    } catch (e) {
      console.error("Failed to load orders", e)
      orders = []
      notifyListeners()
    }
  },

  async createOrder(
    items: CartItem[],
    address: Address,
  ): Promise<Order> {
    // Цены теперь рассчитываются сервером — не отправляем totalPrice/deliveryPrice/tax
    const payload = {
      items,
      address,
    }

    const order = (await api.createOrder(payload)) as Order
    orders = [order, ...orders]
    notifyListeners()
    return order
  },

  updateStatus(_orderId: string, _status: OrderStatus) {
    // Статус управляется только на сервере
  },
}
