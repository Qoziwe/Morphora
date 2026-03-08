"use client"

import { useEffect, useMemo, useState } from "react"
import { ProductCard } from "@/components/product-card"
import type { ActiveFilters } from "@/store/types"
import { PackageOpen } from "lucide-react"
import type { Product } from "@/store/types"
import { fetchProducts } from "@/store/data"

interface ProductGridProps {
  filters: ActiveFilters
}

export function ProductGrid({ filters }: ProductGridProps) {
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      setLoading(true)
      try {
        let data = await fetchProducts({
          category: filters.category,
          brand: filters.brand,
          search: filters.search,
          minPrice: filters.priceMin,
          maxPrice: filters.priceMax,
        })
        
        // Local filtering for dynamic specs
        const dynamicKeys = Object.keys(filters).filter(k => !['category', 'brand', 'search', 'priceMin', 'priceMax'].includes(k))
        if (dynamicKeys.length > 0) {
          data = data.filter(product => {
            return dynamicKeys.every(k => {
              if (filters[k] === undefined || filters[k] === 'all') return true;
              return product.specs && product.specs[k] === filters[k];
            })
          })
        }
        
        setProducts(data)
      } catch (error) {
        console.error(error)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [filters])

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-20">
        <PackageOpen className="h-12 w-12 animate-pulse text-muted-foreground/50" />
        <p className="text-sm text-muted-foreground">Загружаем товары...</p>
      </div>
    )
  }

  if (products.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-20">
        <PackageOpen className="h-12 w-12 text-muted-foreground/50" />
        <p className="text-sm text-muted-foreground">Товары не найдены</p>
        <p className="text-xs text-muted-foreground">Попробуйте изменить параметры фильтрации</p>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {products.map((product) => (
        <ProductCard key={product.id} product={product} />
      ))}
    </div>
  )
}
