"use client"

import { useState, useEffect, Suspense } from "react"
import { useSearchParams } from "next/navigation"
import { SiteHeader } from "@/components/site-header"
import { SiteFooter } from "@/components/site-footer"
import { HeroSlider } from "@/components/hero-slider"
import { ProductFilters } from "@/components/product-filters"
import { ProductGrid } from "@/components/product-grid"
import type { ActiveFilters } from "@/store/types"
import { Truck, ShieldCheck, Headset, CreditCard } from "lucide-react"

function HomeContent() {
  const searchParams = useSearchParams()
  const initialCategory = searchParams?.get("category") || undefined
  const [filters, setFilters] = useState<ActiveFilters>({ category: initialCategory })

  useEffect(() => {
    const cat = searchParams?.get("category") || undefined
    if (cat !== filters.category) {
      setFilters(prev => ({ ...prev, category: cat }))
    }
  }, [searchParams])

  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />

      <main className="flex-1">
        {/* Hero Slider */}
        <section className="mx-auto max-w-7xl px-4 pt-6">
          <HeroSlider />
        </section>

        {/* Advantages */}
        <section className="mx-auto max-w-7xl px-4 py-8">
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            <div className="flex flex-col items-center gap-2 rounded-xl border bg-card p-4 text-center">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-secondary">
                <Truck className="h-5 w-5 text-primary" />
              </div>
              <span className="text-xs font-medium text-card-foreground">Доставка по КЗ</span>
              <span className="text-[10px] text-muted-foreground">Быстро и надежно</span>
            </div>
            <div className="flex flex-col items-center gap-2 rounded-xl border bg-card p-4 text-center">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-secondary">
                <ShieldCheck className="h-5 w-5 text-primary" />
              </div>
              <span className="text-xs font-medium text-card-foreground">Гарантия</span>
              <span className="text-[10px] text-muted-foreground">Официальная</span>
            </div>
            <div className="flex flex-col items-center gap-2 rounded-xl border bg-card p-4 text-center">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-secondary">
                <Headset className="h-5 w-5 text-primary" />
              </div>
              <span className="text-xs font-medium text-card-foreground">Поддержка 24/7</span>
              <span className="text-[10px] text-muted-foreground">Всегда на связи</span>
            </div>
            <div className="flex flex-col items-center gap-2 rounded-xl border bg-card p-4 text-center">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-secondary">
                <CreditCard className="h-5 w-5 text-primary" />
              </div>
              <span className="text-xs font-medium text-card-foreground">Безопасная оплата</span>
              <span className="text-[10px] text-muted-foreground">Через банковский шлюз</span>
            </div>
          </div>
        </section>

        {/* About */}
        <section className="mx-auto max-w-7xl px-4 pb-6">
          <div className="rounded-xl bg-secondary/50 px-6 py-5">
            <h2 className="text-lg font-semibold text-foreground">Добро пожаловать в Morphowebshop</h2>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              Мы предлагаем широкий ассортимент электроники от ведущих мировых брендов. Смартфоны, ноутбуки, видеокарты, аудиотехника и аксессуары — все с официальной гарантией и доставкой по Казахстану. Наши цены формируются динамически с учетом актуальных курсов валют.
            </p>
          </div>
        </section>

        {/* Products Section */}
        <section className="mx-auto max-w-7xl px-4 pb-12" id="products">
          <h2 className="mb-6 text-xl font-bold text-foreground">Каталог товаров</h2>
          <div className="flex flex-col gap-6 lg:flex-row">
            {/* Filters Sidebar */}
            <aside className="w-full shrink-0 lg:w-72">
              <ProductFilters filters={filters} onFiltersChange={setFilters} />
            </aside>
            {/* Grid */}
            <div className="flex-1">
              <ProductGrid filters={filters} />
            </div>
          </div>
        </section>
      </main>

      <SiteFooter />
    </div>
  )
}

export default function HomePage() {
  return (
    <Suspense fallback={<div className="flex min-h-screen items-center justify-center">Загрузка...</div>}>
      <HomeContent />
    </Suspense>
  )
}
