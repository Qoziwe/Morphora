import type { Product, Category } from "./types"
import { api } from "@/lib/api"

// Вспомогательные функции для загрузки данных с Flask API.
// Это позволяет постепенно убирать все статические заглушки.

export async function fetchCategories(): Promise<Category[]> {
  return api.getCategories()
}

export async function fetchProducts(params?: {
  category?: string
  brand?: string
  search?: string
  minPrice?: number
  maxPrice?: number
}): Promise<Product[]> {
  return api.getProducts(params)
}

export async function fetchBanners(): Promise<
  { id: number; title: string; subtitle: string; cta: string; bgColor: string }[]
> {
  return api.getBanners()
}
