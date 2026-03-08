"use client"

import React from "react"

import Link from "next/link"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { Mail, Phone, MapPin } from "lucide-react"
import { useState } from "react"
import { toast } from "sonner"
import { api } from "@/lib/api"

export function SiteFooter() {
  const [email, setEmail] = useState("")

  async function handleSubscribe(e: React.FormEvent) {
    e.preventDefault()
    if (!email) return

    try {
      await api.subscribeNewsletter(email)
      toast.success("Вы успешно подписались на рассылку!")
      setEmail("")
    } catch (error) {
      console.error(error)
      toast.error("Не удалось подписаться на рассылку")
    }
  }

  return (
    <footer className="border-t bg-[#063827] text-[#cfead6]">
      <div className="mx-auto max-w-7xl px-4 py-12">
        <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-4">
          {/* Logo & About */}
          <div className="flex flex-col gap-4">
            <div className="flex items-center gap-2">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#5ecf8f]">
                <span className="text-sm font-bold text-[#063827]">M</span>
              </div>
              <span className="text-lg font-bold text-white">Morphowebshop</span>
            </div>
            <p className="text-sm leading-relaxed text-[#9fd9b4]">
              Ваш надежный магазин электроники с доставкой по Казахстану. Лучшие цены и гарантия качества.
            </p>
          </div>

          {/* Categories */}
          <div className="flex flex-col gap-3">
            <h4 className="text-sm font-semibold text-white">Категории</h4>
            <nav className="flex flex-col gap-2">
              <Link href="/?category=phones" className="text-sm text-[#9fd9b4] transition-colors hover:text-white">
                Смартфоны
              </Link>
              <Link href="/?category=laptops" className="text-sm text-[#9fd9b4] transition-colors hover:text-white">
                Ноутбуки
              </Link>
              <Link href="/?category=gpu" className="text-sm text-[#9fd9b4] transition-colors hover:text-white">
                Видеокарты
              </Link>
              <Link href="/?category=audio" className="text-sm text-[#9fd9b4] transition-colors hover:text-white">
                Аудио
              </Link>
              <Link href="/?category=accessories" className="text-sm text-[#9fd9b4] transition-colors hover:text-white">
                Аксессуары
              </Link>
            </nav>
          </div>

          {/* Contacts */}
          <div className="flex flex-col gap-3">
            <h4 className="text-sm font-semibold text-white">Контакты</h4>
            <div className="flex flex-col gap-2">
              <div className="flex items-center gap-2 text-sm text-[#9fd9b4]">
                <Phone className="h-4 w-4" />
                <span>+7 (777) 123-45-67</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-[#9fd9b4]">
                <Mail className="h-4 w-4" />
                <span>info@morphowebshop.kz</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-[#9fd9b4]">
                <MapPin className="h-4 w-4" />
                <span>Алматы, Казахстан</span>
              </div>
            </div>
          </div>

          {/* Newsletter */}
          <div className="flex flex-col gap-3">
            <h4 className="text-sm font-semibold text-white">Подписка на новости</h4>
            <p className="text-sm text-[#9fd9b4]">
              Получайте уведомления о скидках и новинках.
            </p>
            <form onSubmit={handleSubscribe} className="flex gap-2">
              <Input
                type="email"
                placeholder="Ваш email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="border-[#5ecf8f]/30 bg-[#063827] text-white placeholder:text-[#9fd9b4]/50"
                required
              />
              <Button type="submit" className="shrink-0 bg-[#5ecf8f] text-[#063827] hover:bg-[#9fd9b4]">
                OK
              </Button>
            </form>
          </div>
        </div>

        <Separator className="my-8 bg-[#5ecf8f]/20" />

        <div className="flex flex-col items-center justify-between gap-4 md:flex-row">
          <p className="text-xs text-[#9fd9b4]">
            {new Date().getFullYear()} Morphowebshop. Все права защищены.
          </p>
          <div className="flex items-center gap-4">
            <Link href="#" className="text-xs text-[#9fd9b4] transition-colors hover:text-white">
              Политика конфиденциальности
            </Link>
            <Link href="#" className="text-xs text-[#9fd9b4] transition-colors hover:text-white">
              Условия использования
            </Link>
          </div>
        </div>
      </div>
    </footer>
  )
}
