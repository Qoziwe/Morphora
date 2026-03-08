// ==================== USER & AUTH ====================
export type UserRole = "admin" | "courier" | "customer" | "guest"

export interface User {
  id: string
  email: string
  phone: string
  firstName: string
  lastName: string
  nickname?: string
  avatar?: string
  role: UserRole
  addresses: Address[]
  createdAt: string
}

export interface Address {
  id: string
  type: string
  city: string
  district: string
  street: string
  building: string
  apartment?: string
  postalCode?: string
  isDefault: boolean
}

// ==================== PRODUCTS ====================
export interface Product {
  id: string
  name: string
  category: string
  categoryName?: string
  subcategory?: string
  price: number
  originalPrice?: number
  currency: string
  image: string
  images?: string[]
  description: string
  specs: Record<string, string>
  inStock: boolean
  rating: number
  reviewsCount: number
  brand: string
  deliveryDays: number
  
}

export interface Category {
  id: string
  name: string
  slug: string
  icon: string
  filters: FilterDefinition[]
}

export interface FilterDefinition {
  key: string
  label: string
  type: "select" | "range" | "checkbox"
  options?: string[]
  min?: number
  max?: number
}

export interface ActiveFilters {
  category?: string
  search?: string
  priceMin?: number
  priceMax?: number
  brand?: string
  specs?: Record<string, string>
  [key: string]: string | number | boolean | Record<string, string> | undefined
}

// ==================== CART & ORDERS ====================
export interface CartItem {
  product: Product
  quantity: number
}

export type OrderStatus = "processing" | "packing" | "shipped" | "delivered"

export interface OrderStatusEntry {
  status: OrderStatus
  label: string
  date: string | null
  completed: boolean
}

export interface Order {
  id: string
  trackingNumber: string
  items: CartItem[]
  totalPrice: number
  deliveryPrice: number
  tax: number
  status: OrderStatus
  statusHistory: OrderStatusEntry[]
  address: Address
  createdAt: string
  estimatedDelivery: string
}

// ==================== REVIEWS ====================
export interface Review {
  id: string
  productId: string
  userId: string
  userName: string
  rating: number
  text: string
  createdAt: string
}
