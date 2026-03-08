"use client"

import { use, useEffect, useState } from "react"
import Link from "next/link"
import { SiteHeader } from "@/components/site-header"
import { SiteFooter } from "@/components/site-footer"
import { useOrders } from "@/store/provider"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { formatPrice, formatDate } from "@/store/price-utils"
import type { Order } from "@/store/types"
import {
  CheckCircle2,
  Circle,
  Package,
  Truck,
  PackageCheck,
  ClipboardCheck,
  ArrowLeft,
  Copy,
  MapPin,
} from "lucide-react"
import { toast } from "sonner"
import { api } from "@/lib/api"


export default function TrackingPage({ params }: { params: Promise<{ trackingNumber: string }> }) {
  const { trackingNumber } = use(params)
  const { getOrderByTracking } = useOrders()
  const [loading, setLoading] = useState(true)
  const [order, setOrder] = useState<ReturnType<typeof getOrderByTracking> | null>(null)

  useEffect(() => {
    const local = getOrderByTracking(trackingNumber)
    if (local) {
      setOrder(local)
      setLoading(false)
      return
    }

    

    async function load() {
      try {
        const remote = await api.getOrderByTracking(trackingNumber)
        setOrder(remote as any)
      } catch {
        setOrder(null)
      } finally {
        setLoading(false)
      }
    }

    load()
  }, [getOrderByTracking, trackingNumber])

  function copyTracking() {
    navigator.clipboard.writeText(trackingNumber)
    toast.success("Трек-номер скопирован")
  }

  if (!loading && !order) {

    return (
      <div className="flex min-h-screen flex-col">
        <SiteHeader />
        <main className="flex flex-1 flex-col items-center justify-center gap-4 px-4">
          <Package className="h-16 w-16 text-muted-foreground/30" />
          <h1 className="text-xl font-bold text-foreground">Заказ не найден</h1>
          <p className="text-sm text-muted-foreground">
            Заказ с трек-номером {trackingNumber} не найден
          </p>
          <Link href="/">
            <Button>На главную</Button>
          </Link>
        </main>
        <SiteFooter />
      </div>
    )
  }

  if (!order) {
    return (
      <div className="flex min-h-screen flex-col">
        <SiteHeader />
        <main className="flex flex-1 flex-col items-center justify-center gap-4 px-4">
          <Package className="h-16 w-16 text-muted-foreground/30" />
          <h1 className="text-xl font-bold text-foreground">Загрузка...</h1>
        </main>
        <SiteFooter />
      </div>
    )
  }
  const itemsTotal = order.items.reduce(
    (sum, item) => sum + item.product.price * item.quantity,
    0
  )

  const total = itemsTotal + (order.deliveryPrice ?? 0)
  const statusIcons = {
    processing: ClipboardCheck,
    packing: PackageCheck,
    shipped: Truck,
    delivered: CheckCircle2,
  }

  

  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />

      <main className="flex-1">
        <div className="mx-auto max-w-3xl px-4 py-8">
          <Link
            href="/profile?tab=tracking"
            className="mb-6 inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" />
            Все заказы
          </Link>

          {/* Success Banner */}
          <div className="mb-6 rounded-2xl bg-gradient-to-r from-[#5ecf8f] to-[#063827] p-6 text-white">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-medium text-white/80">Заказ успешно оформлен</p>
                <h1 className="mt-1 text-2xl font-bold">Отслеживание заказа</h1>
              </div>
              <CheckCircle2 className="h-8 w-8 text-white/80" />
            </div>
            <div className="mt-4 flex items-center gap-3">
              <div className="rounded-lg bg-white/20 px-4 py-2 backdrop-blur">
                <p className="text-xs text-white/70">Трек-номер</p>
                <p className="text-lg font-bold">{order.trackingNumber}</p>
              </div>
              <button
                onClick={copyTracking}
                className="flex h-10 w-10 items-center justify-center rounded-lg bg-white/20 text-white backdrop-blur transition hover:bg-white/30"
                aria-label="Копировать трек-номер"
              >
                <Copy className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Timeline */}
          <div className="mb-6 rounded-xl border bg-card p-6">
            <h2 className="mb-6 text-lg font-semibold text-card-foreground">Статус доставки</h2>

            <div className="flex flex-col gap-0">
              {order.statusHistory.map((entry, i) => {
                const Icon = statusIcons[entry.status]
                const isLast = i === order.statusHistory.length - 1
                
                return (
                  <div key={entry.status} className="flex gap-4">
                    {/* Timeline line */}
                    <div className="flex flex-col items-center">
                      <div
                        className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${entry.completed
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted text-muted-foreground"
                          }`}
                      >
                        {entry.completed ? (
                          <Icon className="h-5 w-5" />
                        ) : (
                          <Circle className="h-5 w-5" />
                        )}
                      </div>
                      {!isLast && (
                        <div
                          className={`h-12 w-0.5 ${entry.completed ? "bg-primary" : "bg-border"
                            }`}
                        />
                      )}
                    </div>

                    {/* Content */}
                    <div className="pb-8">
                      <p
                        className={`text-sm font-medium ${entry.completed ? "text-card-foreground" : "text-muted-foreground"
                          }`}
                      >
                        {entry.label}
                      </p>
                      {entry.date && (
                        <p className="mt-0.5 text-xs text-muted-foreground">
                          {formatDate(entry.date)}
                        </p>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Order Details */}
          <div className="rounded-xl border bg-card p-6">
            <h2 className="mb-4 text-lg font-semibold text-card-foreground">Детали заказа</h2>

            {/* Address */}
            <div className="mb-4 flex items-start gap-3 rounded-lg bg-secondary/50 p-3">
              <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
              <div>
                <p className="text-sm font-medium text-card-foreground">Адрес доставки</p>
                <p className="text-xs text-muted-foreground">
                  {order.address.city}, {order.address.district && `${order.address.district}, `}
                  {order.address.street} {order.address.building}
                  {order.address.apartment && `, кв. ${order.address.apartment}`}
                </p>
              </div>
            </div>

            <Separator className="mb-4" />

            {/* Items */}
            <div className="flex flex-col gap-3">
              {order.items.map((item) => (
                <div key={item.product.id} className="flex items-center gap-3">
                  <div className="h-12 w-12 shrink-0 overflow-hidden rounded-lg bg-muted">
                    <img
                      src={item.product.image || "/placeholder.svg"}
                      alt={item.product.name}
                      className="h-full w-full object-cover"
                    />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-card-foreground">{item.product.name}</p>
                    <p className="text-xs text-muted-foreground">{item.quantity} шт.</p>
                  </div>
                  <span className="text-sm font-medium text-card-foreground">
                    {formatPrice(item.product.price * item.quantity)}
                  </span>
                </div>
              ))}
            </div>

            <Separator className="my-4" />

            <div className="flex flex-col gap-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Доставка</span>
                <span className="text-card-foreground">
                  {order.deliveryPrice === 0 ? "Бесплатно" : formatPrice(order.deliveryPrice)}
                </span>
              </div>
              <div className="flex justify-between text-sm">
              </div>
              <Separator />
              <div className="flex justify-between">
                <span className="font-semibold text-card-foreground">Итого</span>
                <span className="text-lg font-bold text-card-foreground">{formatPrice(total)}</span>
              </div>
            </div>

            <div className="mt-4 text-xs text-muted-foreground">
              Ожидаемая дата доставки: {formatDate(order.estimatedDelivery)}
            </div>
          </div>
        </div>
      </main>

      <SiteFooter />
    </div>
  )
}
