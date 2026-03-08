"use client"

import { useEffect, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { SiteHeader } from "@/components/site-header"
import { SiteFooter } from "@/components/site-footer"
import { useAuth, useOrders, useCart } from "@/store/provider"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { formatPrice, formatDate } from "@/store/price-utils"
import {
  User,
  Package,
  MessageSquare,
  ShoppingBag,
  ShoppingCart,
  Edit3,
  Save,
  Truck,
  Clock,
  CheckCircle2,
  MapPin,
} from "lucide-react"
import Link from "next/link"
import { toast } from "sonner"

export default function ProfilePage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { user, updateProfile } = useAuth()
  const { orders: ordersList, loadOrders } = useOrders()
  const { items: cartItems, count: cartCount } = useCart()

  

  const [activeTab, setActiveTab] = useState(searchParams.get("tab") || "tracking")
  const [editing, setEditing] = useState(false)
  const [editData, setEditData] = useState({
    firstName: "",
    lastName: "",
    nickname: "",
    phone: "",
  })

  const [reviews, setReviews] = useState<any[]>([])
  const [loadingReviews, setLoadingReviews] = useState(false)


  useEffect(() => {
    if (!user) return
    loadOrders(user.id)
  }, [user, loadOrders])


  useEffect(() => {
    if (!user) {
      router.push("/auth?mode=login")
    } else {
      setEditData({
        firstName: user.firstName,
        lastName: user.lastName,
        nickname: user.nickname || "",
        phone: user.phone,
      })
    }
  }, [user, router])

  useEffect(() => {
    if (activeTab !== "reviews" || !user) return

    const controller = new AbortController()

    ;(async () => {
      try {
        setLoadingReviews(true)

        const res = await fetch(`http://localhost:5000/api/users/${user.id}/reviews`, {
          signal: controller.signal,
        })

        if (!res.ok) throw new Error("Failed to load reviews")

        const data = await res.json()
        setReviews(Array.isArray(data) ? data : [])
      } catch (e) {
        setReviews([])
      } finally {
        setLoadingReviews(false)
      }
    })()

    return () => controller.abort()
  }, [activeTab, user])

  if (!user) return null

  const initials = `${user.firstName[0]}${user.lastName[0]}`
  const displayName = user.nickname || `${user.firstName} ${user.lastName}`

  function toAbsUrl(u?: string) {
    if (!u) return "";
    if (u.startsWith("http://") || u.startsWith("https://")) return u;
    const base = process.env.NEXT_PUBLIC_API_URL || "";
    return `${base}${u}`;
  }

  function handleSaveProfile() {
    updateProfile(editData)
    setEditing(false)
    toast.success("Профиль обновлен")
  }

  const statusLabel = (status: string) => {
    switch (status) {
      case "processing":
        return { label: "В обработке", color: "bg-yellow-100 text-yellow-800" }
      case "packing":
        return { label: "Упаковка", color: "bg-blue-100 text-blue-800" }
      case "shipped":
        return { label: "В пути", color: "bg-[#cfead6] text-[#063827]" }
      case "delivered":
        return { label: "Доставлен", color: "bg-[#5ecf8f] text-white" }
      default:
        return { label: status, color: "bg-muted text-muted-foreground" }
    }
  }

  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />

      <main className="flex-1">
        <div className="mx-auto max-w-5xl px-4 py-8">
          {/* Profile Header */}
          <div className="mb-8 flex items-start gap-6 rounded-2xl border bg-card p-6">
            <Avatar className="h-20 w-20">
              <AvatarFallback className="bg-primary text-2xl text-primary-foreground">
                {initials}
              </AvatarFallback>
            </Avatar>
            <div className="flex flex-1 flex-col gap-2">
              {editing ? (
                <div className="flex flex-col gap-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label className="text-xs">Имя</Label>
                      <Input
                        value={editData.firstName}
                        onChange={(e) => setEditData({ ...editData, firstName: e.target.value })}
                      />
                    </div>
                    <div>
                      <Label className="text-xs">Фамилия</Label>
                      <Input
                        value={editData.lastName}
                        onChange={(e) => setEditData({ ...editData, lastName: e.target.value })}
                      />
                    </div>
                  </div>
                  <div>
                    <Label className="text-xs">Никнейм</Label>
                    <Input
                      value={editData.nickname}
                      onChange={(e) => setEditData({ ...editData, nickname: e.target.value })}
                      placeholder="Необязательно"
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Телефон</Label>
                    <Input
                      value={editData.phone}
                      onChange={(e) => setEditData({ ...editData, phone: e.target.value })}
                    />
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" onClick={handleSaveProfile} className="gap-1.5">
                      <Save className="h-3.5 w-3.5" />
                      Сохранить
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => setEditing(false)}>
                      Отмена
                    </Button>
                  </div>
                </div>
              ) : (
                <>
                  <div className="flex items-center gap-3">
                    <h1 className="text-xl font-bold text-card-foreground">{displayName}</h1>
                    <Button size="sm" variant="ghost" onClick={() => setEditing(true)} className="gap-1.5">
                      <Edit3 className="h-3.5 w-3.5" />
                      Редактировать
                    </Button>
                  </div>
                  <p className="text-sm text-muted-foreground">{user.email}</p>
                  <p className="text-sm text-muted-foreground">{user.phone}</p>
                  {user.addresses?.length > 0 && (
                    <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                      <MapPin className="h-3.5 w-3.5" />
                      <span>
                        {user.addresses[0].city}, {user.addresses[0].street}{" "}
                        {user.addresses[0].building}
                      </span>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>

          {/* Tabs */}
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="mb-6 grid w-full grid-cols-4">
              <TabsTrigger value="tracking" className="gap-1.5 text-xs">
                <Truck className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Отслеживание</span>
              </TabsTrigger>
              <TabsTrigger value="reviews" className="gap-1.5 text-xs">
                <MessageSquare className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Отзывы</span>
              </TabsTrigger>
              <TabsTrigger value="orders" className="gap-1.5 text-xs">
                <ShoppingBag className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">История</span>
              </TabsTrigger>
              <TabsTrigger value="cart" className="gap-1.5 text-xs">
                <ShoppingCart className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Корзина</span>
                {cartCount > 0 && (
                  <Badge className="ml-1 h-5 bg-primary px-1.5 text-[10px] text-primary-foreground">
                    {cartCount}
                  </Badge>
                )}
              </TabsTrigger>
            </TabsList>
            

            {/* Reviews */}
            <TabsContent value="reviews" className="mt-0">
              {loadingReviews ? (
                <div className="rounded-xl border bg-card p-6 text-sm text-muted-foreground">
                  Загружаю отзывы...
                </div>
              ) : reviews.length === 0 ? (
                <div className="flex flex-col items-center justify-center gap-3 rounded-xl border bg-card py-16">
                  <MessageSquare className="h-12 w-12 text-muted-foreground/40" />
                  <p className="text-sm text-muted-foreground">Вы пока не оставляли отзывов</p>
                </div>
              ) : (
                <div className="flex flex-col gap-3">
                  {reviews.map((r) => (
                    <div key={r.id} className="rounded-xl border bg-card p-4">
                      <div className="flex items-start gap-3">
                        <div className="h-12 w-12 shrink-0 overflow-hidden rounded-lg bg-muted">
                          <img
                            src={r.productImage || "/placeholder.svg"}
                            alt={r.productName}
                            className="h-full w-full object-cover"
                          />
                        </div>

                        <div className="min-w-0 flex-1">
                          <div className="flex items-start justify-between gap-3">
                            <Link
                              href={`/product/${r.productId}`}
                              className="truncate text-sm font-medium text-card-foreground hover:underline"
                            >
                              {r.productName}
                            </Link>
                            <span className="shrink-0 text-xs text-muted-foreground">
                              {formatDate(r.createdAt)}
                            </span>
                          </div>

                          <div className="mt-1 text-xs text-muted-foreground">Оценка: {r.rating}/5</div>
                          <p className="mt-2 break-words text-sm text-muted-foreground mb-2">{r.text}</p>
                          {r.images && r.images.length > 0 && (
                            <div className="flex flex-wrap gap-2 mt-2">
                              {r.images.map((img: string, idx: number) => (
                                <a key={idx} href={toAbsUrl(img)} target="_blank" rel="noreferrer">
                                  <img src={toAbsUrl(img)} alt={`Review photo ${idx + 1}`} className="h-16 w-16 rounded object-cover border" />
                                </a>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </TabsContent>



            {/* Tracking */}
            <TabsContent value="tracking">
              {ordersList.length === 0 ? (
                <div className="flex flex-col items-center justify-center gap-3 rounded-xl border bg-card py-16">
                  <Package className="h-12 w-12 text-muted-foreground/40" />
                  <p className="text-sm text-muted-foreground">У вас пока нет заказов для отслеживания</p>
                  <Link href="/">
                    <Button size="sm">Перейти в каталог</Button>
                  </Link>
                </div>
              ) : (
                <div className="flex flex-col gap-4">
                  {ordersList.map((order) => {
                    const st = statusLabel(order.status)
                    return (
                      <Link key={order.id} href={`/tracking/${order.trackingNumber}`}>
                        <div className="flex items-center gap-4 rounded-xl border bg-card p-4 transition-colors hover:bg-secondary/30">
                          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-secondary">
                            <Package className="h-5 w-5 text-primary" />
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-medium text-card-foreground">{order.trackingNumber}</span>
                              <Badge className={`text-xs ${st.color}`}>{st.label}</Badge>
                            </div>
                            <p className="text-xs text-muted-foreground">
                              {order.items.length} товар(ов) на {formatPrice(order.totalPrice)}
                            </p>
                          </div>
                          <span className="text-xs text-muted-foreground">
                            {formatDate(order.createdAt)}
                          </span>
                        </div>
                      </Link>
                    )
                  })}
                </div>
              )}
            </TabsContent>


            {/* Orders History */}
            <TabsContent value="orders">
              {ordersList.length === 0 ? (
                <div className="flex flex-col items-center justify-center gap-3 rounded-xl border bg-card py-16">
                  <ShoppingBag className="h-12 w-12 text-muted-foreground/40" />
                  <p className="text-sm text-muted-foreground">История покупок пуста</p>
                  <Link href="/">
                    <Button size="sm">Перейти в каталог</Button>
                  </Link>
                </div>
              ) : (
                <div className="flex flex-col gap-4">
                  {ordersList.map((order) => (
                    <div key={order.id} className="rounded-xl border bg-card p-4">
                      <div className="mb-3 flex items-center justify-between">
                        <div>
                          <span className="text-sm font-medium text-card-foreground">Заказ #{order.trackingNumber}</span>
                          <p className="text-xs text-muted-foreground">{formatDate(order.createdAt)}</p>
                        </div>
                        <span className="text-sm font-bold text-card-foreground">{formatPrice(order.totalPrice)}</span>
                      </div>
                      <Separator className="mb-3" />
                      <div className="flex flex-col gap-2">
                        {order.items.map((item) => (
                          <div key={item.product.id} className="flex items-center gap-3">
                            <div className="h-10 w-10 shrink-0 overflow-hidden rounded-lg bg-muted">
                              <img
                                src={item.product.image || "/placeholder.svg"}
                                alt={item.product.name}
                                className="h-full w-full object-cover"
                              />
                            </div>
                            <div className="flex-1">
                              <p className="text-xs font-medium text-card-foreground">{item.product.name}</p>
                              <p className="text-xs text-muted-foreground">{item.quantity} шт.</p>
                            </div>
                            <span className="text-xs font-medium text-card-foreground">
                              {formatPrice(item.product.price * item.quantity)}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </TabsContent>

            {/* Cart */}
            <TabsContent value="cart">
              {cartItems.length === 0 ? (
                <div className="flex flex-col items-center justify-center gap-3 rounded-xl border bg-card py-16">
                  <ShoppingCart className="h-12 w-12 text-muted-foreground/40" />
                  <p className="text-sm text-muted-foreground">Корзина пуста</p>
                  <Link href="/">
                    <Button size="sm">Перейти в каталог</Button>
                  </Link>
                </div>
              ) : (
                <div className="flex flex-col gap-3">
                  {cartItems.map((item) => (
                    <div key={item.product.id} className="flex items-center gap-4 rounded-xl border bg-card p-4">
                      <div className="h-16 w-16 shrink-0 overflow-hidden rounded-lg bg-muted">
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
                      <span className="font-medium text-card-foreground">
                        {formatPrice(item.product.price * item.quantity)}
                      </span>
                    </div>
                  ))}
                  <Link href="/cart" className="self-end">
                    <Button>Перейти в корзину</Button>
                  </Link>
                </div>
              )}
            </TabsContent>
          </Tabs>
        </div>
      </main>

      <SiteFooter />
    </div>
  )
}
