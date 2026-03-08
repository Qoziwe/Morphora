"use client"

import { useState, useEffect, useCallback } from "react"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { fetchBanners } from "@/store/data"

interface Banner {
  id: number
  title: string
  subtitle: string
  cta: string
  bgColor: string
}

export function HeroSlider() {
  const [current, setCurrent] = useState(0)
  const [banners, setBanners] = useState<Banner[]>([])

  const next = useCallback(() => {
    setCurrent((c) => (c + 1) % (banners.length || 1))
  }, [banners.length])

  const prev = useCallback(() => {
    setCurrent((c) => (c - 1 + (banners.length || 1)) % (banners.length || 1))
  }, [banners.length])

  useEffect(() => {
    fetchBanners().then(setBanners).catch(() => setBanners([]))
  }, [])

  useEffect(() => {
    if (!banners.length) return
    const timer = setInterval(next, 5000)
    return () => clearInterval(timer)
  }, [next, banners.length])

  if (!banners.length) {
    return null
  }

  return (
    <section className="relative overflow-hidden rounded-2xl">
      <div
        className="flex transition-transform duration-500 ease-out"
        style={{ transform: `translateX(-${current * 100}%)` }}
      >
        {banners.map((banner) => (
          <div
            key={banner.id}
            className={`flex min-w-full flex-col items-start justify-center bg-gradient-to-r ${banner.bgColor} px-8 py-16 md:px-16 md:py-24`}
          >
            <h2 className="max-w-lg text-balance text-2xl font-bold text-white md:text-4xl">
              {banner.title}
            </h2>
            <p className="mt-3 max-w-md text-pretty text-sm text-white/80 md:text-base">
              {banner.subtitle}
            </p>
            <Button className="mt-6 bg-white text-[#063827] hover:bg-white/90">
              {banner.cta}
            </Button>
          </div>
        ))}
      </div>

      {/* Controls */}
      <button
        onClick={prev}
        className="absolute left-3 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-white/20 text-white backdrop-blur transition hover:bg-white/40"
        aria-label="Предыдущий слайд"
      >
        <ChevronLeft className="h-5 w-5" />
      </button>
      <button
        onClick={next}
        className="absolute right-3 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-white/20 text-white backdrop-blur transition hover:bg-white/40"
        aria-label="Следующий слайд"
      >
        <ChevronRight className="h-5 w-5" />
      </button>

      {/* Dots */}
      <div className="absolute bottom-4 left-1/2 flex -translate-x-1/2 gap-2">
        {banners.map((_, i) => (
          <button
            key={i}
            onClick={() => setCurrent(i)}
            className={`h-2 rounded-full transition-all ${
              i === current ? "w-6 bg-white" : "w-2 bg-white/50"
            }`}
            aria-label={`Слайд ${i + 1}`}
          />
        ))}
      </div>
    </section>
  )
}
