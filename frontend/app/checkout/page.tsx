"use client"

import React from "react"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { SiteHeader } from "@/components/site-header"
import { SiteFooter } from "@/components/site-footer"
import { useAuth, useCart, useOrders } from "@/store/provider"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { formatPrice } from "@/store/price-utils"
import { CreditCard, Truck, MapPin, Phone, Shield, ArrowLeft } from "lucide-react"
import Link from "next/link"
import { toast } from "sonner"
import type { Address } from "@/store/types"

export default function CheckoutPage() {
  const router = useRouter()
  const { user } = useAuth()
  const { items, getSubtotal, getDeliveryPrice, getTax, getTotal, clear } = useCart()
  const { createOrder } = useOrders()
  const [loading, setLoading] = useState(false)

  // Address form
  const [addressType, setAddressType] = useState("Дом")
  const [city, setCity] = useState(user?.addresses[0]?.city || "")
  const [district, setDistrict] = useState(user?.addresses[0]?.district || "")
  const [street, setStreet] = useState(user?.addresses[0]?.street || "")
  const [building, setBuilding] = useState(user?.addresses[0]?.building || "")
  const [apartment, setApartment] = useState(user?.addresses[0]?.apartment || "")
  const [contactPhone, setContactPhone] = useState(user?.phone || "")

  // Payment
  const [paymentMethod, setPaymentMethod] = useState("card")
  const [cardNumber, setCardNumber] = useState("")
  const [cardExpiry, setCardExpiry] = useState("")
  const [cardCvv, setCardCvv] = useState("")
  const [sendReceipt, setSendReceipt] = useState("email")

  useEffect(() => {
    if (!user) {
      router.push("/auth?mode=login")
    }
    if (items.length === 0) {
      router.push("/cart")
    }
  }, [user, items, router])

  if (!user || items.length === 0) return null

  async function handlePlaceOrder(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)

    if (!city || !street || !building) {
      toast.error("Заполните адрес доставки")
      setLoading(false)
      return
    }

    if (!isValidAddressString(city) || !isValidAddressString(street)) {
      toast.error("Пожалуйста, введите реальный адрес (используйте буквы)")
      setLoading(false)
      return
    }

    const phoneDigits = contactPhone.replace(/\D/g, "")
    if (phoneDigits.length < 10) {
      toast.error("Введите корректный номер телефона (минимум 10 цифр)")
      setLoading(false)
      return
    }

    const cardDigits = cardNumber.replace(/\s/g, "")
    const cvvDigits = cardCvv.replace(/\D/g, "")

    if (paymentMethod === "card") {
      if (cardDigits.length !== 16) {
        toast.error("Введите 16 цифр номера карты")
        setLoading(false)
        return
      }   
      if (!luhnCheck(cardDigits)) {
        toast.error("Недействительный номер карты")
        setLoading(false)
        return
      }
      if (!/^\d{2}\/\d{2}$/.test(cardExpiry)) {
        toast.error("Введите срок действия в формате MM/YY")
        setLoading(false)
        return
      }
      if (cvvDigits.length !== 3) {
        toast.error("CVV должен состоять из 3 цифр")
        setLoading(false)
        return
      }
    }


    if (paymentMethod === "card" && (!cardNumber || !cardExpiry || !cardCvv)) {
      toast.error("Заполните данные карты")
      setLoading(false)
      return
    }

    const address: Address = {
      id: `addr-${Date.now()}`,
      type: addressType,
      city,
      district,
      street,
      building,
      apartment,
      isDefault: false,
    }

    try {
      const order = await createOrder(items, address)
      clear()
      toast.success("Заказ успешно оформлен!")
      router.push(`/tracking/${order.trackingNumber}`)
    } catch (err: any) {
      toast.error(err?.message || "Не удалось оформить заказ")
    } finally {
      setLoading(false)
    }
  }

  function onlyDigits(s: string) {
    return s.replace(/\D/g, "")
  }

  function isValidAddressString(str: string) {
    if (!str || str.trim().length < 2) return false
    // must contain at least one letter (latin or cyrillic)
    return /[a-zA-Zа-яА-ЯёЁ]/.test(str)
  }

  function luhnCheck(num: string) {
    const arr = num.split('').reverse().map((x) => Number.parseInt(x, 10))
    const lastDigit = arr.shift() || 0
    let sum = arr.reduce(
      (acc, val, i) =>
        i % 2 !== 0 ? acc + val : acc + (val * 2 > 9 ? val * 2 - 9 : val * 2),
      0
    )
    sum += lastDigit
    return sum % 10 === 0
  }

  function formatCardNumber(value: string) {
    const digits = onlyDigits(value).slice(0, 16)
    // группируем по 4
    return digits.replace(/(\d{4})(?=\d)/g, "$1 ")
  }

  function formatExpiry(value: string) {
    const digits = onlyDigits(value).slice(0, 4) // MMYY
    if (digits.length <= 2) return digits

    let mm = digits.slice(0, 2)
    const yy = digits.slice(2, 4)

    // нормализуем месяц
    const mmNum = Number(mm)
    if (Number.isNaN(mmNum)) mm = "01"
    else if (mmNum <= 0) mm = "01"
    else if (mmNum > 12) mm = "12"
    else mm = mm.padStart(2, "0")

    return `${mm}/${yy}`
  }

  function formatCvv(value: string) {
    return onlyDigits(value).slice(0, 3)
  }
  

  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />

      <main className="flex-1">
        <div className="mx-auto max-w-5xl px-4 py-8">
          <Link
            href="/cart"
            className="mb-6 inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" />
            Вернуться в корзину
          </Link>

          <h1 className="mb-6 text-2xl font-bold text-foreground">Оформление заказа</h1>

          <form onSubmit={handlePlaceOrder}>
            <div className="flex flex-col gap-6 lg:flex-row">
              {/* Left - Address & Payment */}
              <div className="flex flex-1 flex-col gap-6">
                {/* Delivery Address */}
                <div className="rounded-xl border bg-card p-6">
                  <div className="mb-4 flex items-center gap-2">
                    <MapPin className="h-5 w-5 text-primary" />
                    <h2 className="text-lg font-semibold text-card-foreground">Адрес доставки</h2>
                  </div>

                  <div className="flex flex-col gap-4">
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Label htmlFor="addressType" className="text-xs">Тип адреса</Label>
                        <Input
                          id="addressType"
                          value={addressType}
                          onChange={(e) => setAddressType(e.target.value)}
                          placeholder="Дом, Офис..."
                        />
                      </div>
                      <div>
                        <Label htmlFor="city" className="text-xs">Город</Label>
                        <Input
                          id="city"
                          value={city}
                          onChange={(e) => setCity(e.target.value)}
                          placeholder="Алматы"
                          required
                        />
                      </div>
                    </div>
                    <div>
                      <Label htmlFor="district" className="text-xs">Район</Label>
                      <Input
                        id="district"
                        value={district}
                        onChange={(e) => setDistrict(e.target.value)}
                        placeholder="Алмалинский"
                      />
                    </div>
                    <div className="grid grid-cols-3 gap-3">
                      <div className="col-span-2">
                        <Label htmlFor="street" className="text-xs">Улица</Label>
                        <Input
                          id="street"
                          value={street}
                          onChange={(e) => setStreet(e.target.value)}
                          placeholder="ул. Абая"
                          required
                        />
                      </div>
                      <div>
                        <Label htmlFor="building" className="text-xs">Дом</Label>
                        <Input
                          id="building"
                          value={building}
                          onChange={(e) => setBuilding(e.target.value)}
                          placeholder="52"
                          required
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Label htmlFor="apartment" className="text-xs">Квартира</Label>
                        <Input
                          id="apartment"
                          value={apartment}
                          onChange={(e) => setApartment(e.target.value)}
                          placeholder="14"
                        />
                      </div>
                      <div>
                        <Label htmlFor="phone" className="text-xs">Телефон</Label>
                        <Input
                          id="phone"
                          value={contactPhone}
                          onChange={(e) => {
                            const val = e.target.value
                            if (/^[\d\s()+-]*$/.test(val)) {
                              setContactPhone(val)
                            }
                          }}
                          placeholder="+7 777 123 4567"
                          required
                        />
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 flex items-center gap-2 rounded-lg bg-secondary/50 px-3 py-2">
                    <Truck className="h-4 w-4 text-primary" />
                    <span className="text-xs text-muted-foreground">
                      Ожидаемые сроки доставки: 10-12 рабочих дней по Казахстану
                    </span>
                  </div>
                </div>

                {/* Payment */}
                <div className="rounded-xl border bg-card p-6">
                  <div className="mb-4 flex items-center gap-2">
                    <CreditCard className="h-5 w-5 text-primary" />
                    <h2 className="text-lg font-semibold text-card-foreground">Оплата</h2>
                  </div>

                  <RadioGroup value={paymentMethod} onValueChange={setPaymentMethod} className="mb-4">
                    <div className="flex items-center gap-3 rounded-lg border p-3">
                      <RadioGroupItem value="card" id="card" />
                      <Label htmlFor="card" className="flex-1 cursor-pointer">
                        <span className="text-sm font-medium text-card-foreground">Банковская карта</span>
                        <p className="text-xs text-muted-foreground">Visa, Mastercard, Kaspi</p>
                      </Label>
                    </div>
                  </RadioGroup>

                  {paymentMethod === "card" && (
                    <div className="flex flex-col gap-3">
                      <div>
                        <Label htmlFor="cardNumber" className="text-xs">Номер карты</Label>
                        <Input
                          id="cardNumber"
                          inputMode="numeric"
                          autoComplete="cc-number"
                          value={cardNumber}
                          onChange={(e) => setCardNumber(formatCardNumber(e.target.value))}
                          placeholder="0000 0000 0000 0000"
                          maxLength={19}
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <Label htmlFor="cardExpiry" className="text-xs">Срок действия</Label>
                          <Input
                            id="cardExpiry"
                            inputMode="numeric"
                            autoComplete="cc-exp"
                            value={cardExpiry}
                            onChange={(e) => setCardExpiry(formatExpiry(e.target.value))}
                            placeholder="MM/YY"
                            maxLength={5}
                          />
                        </div>
                        <div>
                          <Label htmlFor="cardCvv" className="text-xs">CVV</Label>
                          <Input
                            id="cardCvv"
                            type="password"
                            value={cardCvv}
                            onChange={(e) => setCardCvv(e.target.value)}
                            placeholder="***"
                            maxLength={3}
                          />
                        </div>
                      </div>
                    </div>
                  )}
                  
                  



                  <Separator className="my-4" />

                  <div>
                    <Label className="mb-2 text-xs text-muted-foreground">Отправить чек на:</Label>
                    <RadioGroup value={sendReceipt} onValueChange={setSendReceipt}>
                      <div className="flex items-center gap-2">
                        <RadioGroupItem value="email" id="receipt-email" />
                        <Label htmlFor="receipt-email" className="text-sm">Email ({user.email})</Label>
                      </div>
                      <div className="flex items-center gap-2">
                        <RadioGroupItem value="phone" id="receipt-phone" />
                        <Label htmlFor="receipt-phone" className="text-sm">Телефон ({user.phone})</Label>
                      </div>
                    </RadioGroup>
                  </div>

                  <div className="mt-4 flex items-center gap-2 rounded-lg bg-secondary/50 px-3 py-2">
                    <Shield className="h-4 w-4 text-primary" />
                    <span className="text-xs text-muted-foreground">
                      Все платежи проходят через защищенный банковский шлюз. Данные карты не сохраняются на сервере.
                    </span>
                  </div>
                </div>
              </div>

              {/* Right - Order Summary */}
              <div className="w-full shrink-0 lg:w-80">
                <div className="sticky top-24 rounded-xl border bg-card p-6">
                  <h2 className="mb-4 text-lg font-bold text-card-foreground">Ваш заказ</h2>

                  <div className="flex flex-col gap-3">
                    {items.map((item) => (
                      <div key={item.product.id} className="flex items-center gap-3">
                        <div className="h-12 w-12 shrink-0 overflow-hidden rounded-lg bg-muted">
                          <img
                            src={item.product.image || "/placeholder.svg"}
                            alt={item.product.name}
                            className="h-full w-full object-cover"
                          />
                        </div>
                        <div className="flex-1">
                          <p className="line-clamp-1 text-xs font-medium text-card-foreground">{item.product.name}</p>
                          <p className="text-xs text-muted-foreground">x{item.quantity}</p>
                        </div>
                        <span className="text-xs font-medium text-card-foreground">
                          {formatPrice(item.product.price * item.quantity)}
                        </span>
                      </div>
                    ))}
                  </div>

                  <Separator className="my-4" />

                  <div className="flex flex-col gap-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Подытог</span>
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

                  <Button type="submit" className="mt-6 w-full" disabled={loading}>
                    {loading ? "Обработка..." : "Оплатить и оформить"}
                  </Button>
                </div>
              </div>
            </div>
          </form>
        </div>
      </main>

      <SiteFooter />
    </div>
  )
}
