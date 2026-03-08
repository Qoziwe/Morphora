"use client"

import Link from "next/link"
import { SiteHeader } from "@/components/site-header"
import { SiteFooter } from "@/components/site-footer"
import { useCart, useAuth } from "@/store/provider"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { formatPrice } from "@/store/price-utils"
import { Minus, Plus, Trash2, ShoppingCart, ArrowRight, Package } from "lucide-react"
import { toast } from "sonner"

export default function CartPage() {
  const { items, count, updateQuantity, removeItem, getSubtotal, getDeliveryPrice, getTax, getTotal } = useCart()
  const { user } = useAuth()

  if (items.length === 0) {
    return (
      <div className="flex min-h-screen flex-col">
        <SiteHeader />
        <main className="flex flex-1 flex-col items-center justify-center gap-4 px-4">
          <ShoppingCart className="h-16 w-16 text-muted-foreground/30" />
          <h1 className="text-xl font-bold text-foreground">Корзина пуста</h1>
          <p className="text-sm text-muted-foreground">Добавьте товары из каталога</p>
          <Link href="/">
            <Button className="gap-2">
              Перейти в каталог
              <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
        </main>
        <SiteFooter />
      </div>
    )
  }

  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />

      <main className="flex-1">
        <div className="mx-auto max-w-5xl px-4 py-8">
          <h1 className="mb-6 text-2xl font-bold text-foreground">Корзина ({count})</h1>

          <div className="flex flex-col gap-6 lg:flex-row">
            {/* Cart Items */}
            <div className="flex flex-1 flex-col gap-3">
              {items.map((item) => (
                <div
                  key={item.product.id}
                  className="flex gap-4 rounded-xl border bg-card p-4"
                >
                  {/* Image */}
                  <div className="h-24 w-24 shrink-0 overflow-hidden rounded-lg bg-muted">
                    <img
                      src={item.product.image || "/placeholder.svg"}
                      alt={item.product.name}
                      className="h-full w-full object-cover"
                    />
                  </div>

                  {/* Info */}
                  <div className="flex flex-1 flex-col gap-2">
                    <Link
                      href={`/product/${item.product.id}`}
                      className="text-sm font-semibold text-card-foreground hover:underline"
                    >
                      {item.product.name}
                    </Link>
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <Package className="h-3 w-3" />
                      <span>Доставка {item.product.deliveryDays} дн.</span>
                    </div>
                    <div className="mt-auto flex items-center justify-between">
                      {/* Quantity */}
                      <div className="flex items-center gap-2 rounded-lg border">
                        <button
                          onClick={() => updateQuantity(item.product.id, item.quantity - 1)}
                          className="flex h-8 w-8 items-center justify-center text-muted-foreground hover:text-foreground"
                          aria-label="Уменьшить количество"
                        >
                          <Minus className="h-3.5 w-3.5" />
                        </button>
                        <span className="min-w-[2ch] text-center text-sm font-medium text-card-foreground">
                          {item.quantity}
                        </span>
                        <button
                          onClick={() => updateQuantity(item.product.id, item.quantity + 1)}
                          className="flex h-8 w-8 items-center justify-center text-muted-foreground hover:text-foreground"
                          aria-label="Увеличить количество"
                        >
                          <Plus className="h-3.5 w-3.5" />
                        </button>
                      </div>

                      <div className="flex items-center gap-3">
                        <span className="font-semibold text-card-foreground">
                          {formatPrice(item.product.price * item.quantity)}
                        </span>
                        <button
                          onClick={() => {
                            removeItem(item.product.id)
                            toast.success("Товар удален из корзины")
                          }}
                          className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
                          aria-label="Удалить"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Summary */}
            <div className="w-full shrink-0 lg:w-80">
              <div className="sticky top-24 rounded-xl border bg-card p-6">
                <h2 className="mb-4 text-lg font-bold text-card-foreground">Итого</h2>

                <div className="flex flex-col gap-3">
                  {items.map((item) => (
                    <div key={item.product.id} className="flex items-center justify-between text-sm">
                      <span className="line-clamp-1 flex-1 text-muted-foreground">{item.product.name}</span>
                      <span className="ml-2 shrink-0 text-card-foreground">x{item.quantity}</span>
                    </div>
                  ))}

                  <Separator />

                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Товары ({count})</span>
                    <span className="text-card-foreground">{formatPrice(getSubtotal())}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Доставка</span>
                    <span className="text-card-foreground">
                      {getDeliveryPrice() === 0 ? "Бесплатно" : formatPrice(getDeliveryPrice())}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                  </div>

                  <Separator />

                  <div className="flex justify-between">
                    <span className="font-semibold text-card-foreground">Итого</span>
                    <span className="text-xl font-bold text-card-foreground">{formatPrice(getSubtotal())}</span>
                  </div>
                </div>

                <Link href={user ? "/checkout" : "/auth?mode=login"} className="mt-6 block">
                  <Button className="w-full gap-2">
                    {user ? "Оформить заказ" : "Войдите для оформления"}
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </Link>

                {!user && (
                  <p className="mt-2 text-center text-xs text-muted-foreground">
                    Для оформления заказа необходимо войти в аккаунт
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      </main>

      <SiteFooter />
    </div>
  )
}
