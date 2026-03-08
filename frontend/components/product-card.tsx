"use client"

import React from "react"

import Link from "next/link"
import { ShoppingCart, Star, Tag, Package } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import type { Product } from "@/store/types"
import { formatPrice } from "@/store/price-utils"
import { useCart } from "@/store/provider"
import { toast } from "sonner"

interface ProductCardProps {
  product: Product
}

export function ProductCard({ product }: ProductCardProps) {
  const { addItem } = useCart()
  const mainImage =
  product.image || (product.images?.length ? product.images[0] : "")

  function handleAddToCart(e: React.MouseEvent) {
    e.preventDefault()
    e.stopPropagation()
    addItem(product)
    toast.success(`${product.name} добавлен в корзину`)
  }

  const discount = product.originalPrice
    ? Math.round(((product.originalPrice - product.price) / product.originalPrice) * 100)
    : 0

  return (
    <Link href={`/product/${product.id}`} className="group">
      <div className="flex h-full flex-col overflow-hidden rounded-xl border bg-card transition-shadow hover:shadow-lg">
        {/* Image */}
        <div className="relative aspect-square overflow-hidden bg-muted">
          <img src={mainImage || "/placeholder.svg"} alt={product.name}
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
          />
          {discount > 0 && (
            <Badge className="absolute left-3 top-3 bg-destructive text-destructive-foreground">
              -{discount}%
            </Badge>
          )}
        </div>

        {/* Content */}
        <div className="flex flex-1 flex-col gap-2 p-4">
          {/* Category */}
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Tag className="h-3 w-3" />
            <span>{product.category === "phones" ? "Смартфоны" : product.category === "laptops" ? "Ноутбуки" : product.category === "gpu" ? "Видеокарты" : product.category === "audio" ? "Аудио" : "Аксессуары"}</span>
          </div>

          {/* Name */}
          <h3 className="line-clamp-2 text-sm font-semibold leading-snug text-card-foreground">
            {product.name}
          </h3>

          {/* Rating */}
          <div className="flex items-center gap-1.5">
            <Star className="h-3.5 w-3.5 fill-[#5ecf8f] text-[#5ecf8f]" />
            <span className="text-xs font-medium text-card-foreground">{product.rating}</span>
            <span className="text-xs text-muted-foreground">({product.reviewsCount})</span>
          </div>

          {/* Delivery */}
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Package className="h-3 w-3" />
            <span>Доставка {product.deliveryDays} дн.</span>
          </div>

          {/* Price & Button */}
          <div className="mt-auto flex items-end justify-between gap-2 pt-3">
            <div className="flex flex-col">
              {product.originalPrice && (
                <span className="text-xs text-muted-foreground line-through">
                  {formatPrice(product.originalPrice)}
                </span>
              )}
              <span className="text-lg font-bold text-card-foreground">
                {formatPrice(product.price)}
              </span>
            </div>
            <Button
              size="icon"
              className="h-9 w-9 shrink-0"
              onClick={handleAddToCart}
            >
              <ShoppingCart className="h-4 w-4" />
              <span className="sr-only">Добавить в корзину</span>
            </Button>
          </div>
        </div>
      </div>
    </Link>
  )
}
