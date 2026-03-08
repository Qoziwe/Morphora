"use client"

import { useState } from "react"
import { ChevronLeft, ChevronRight } from "lucide-react"

interface Props {
  images: string[]
  alt?: string
}

export function ImageSlider({ images, alt }: Props) {
  const [current, setCurrent] = useState(0)

  if (!images || images.length === 0) {
    return (
      <div className="aspect-square flex items-center justify-center bg-muted rounded-xl">
        Нет изображения
      </div>
    )
  }

  function prev() {
    setCurrent((c) => (c === 0 ? images.length - 1 : c - 1))
  }

  function next() {
    setCurrent((c) => (c === images.length - 1 ? 0 : c + 1))
  }

  return (
    <div className="space-y-3">
      {/* Main image */}
      <div className="relative overflow-hidden rounded-2xl border bg-muted aspect-square">
        <img
          src={images[current]}
          alt={alt}
          className="w-full h-full object-cover"
        />

        {images.length > 1 && (
          <>
            <button
              onClick={prev}
              className="absolute left-3 top-1/2 -translate-y-1/2 bg-white/80 p-2 rounded-full shadow"
            >
              <ChevronLeft size={18} />
            </button>

            <button
              onClick={next}
              className="absolute right-3 top-1/2 -translate-y-1/2 bg-white/80 p-2 rounded-full shadow"
            >
              <ChevronRight size={18} />
            </button>
          </>
        )}
      </div>

      {/* Thumbnails */}
      {images.length > 1 && (
        <div className="flex gap-2 overflow-x-auto">
          {images.map((img, i) => (
            <img
              key={img}
              src={img}
              onClick={() => setCurrent(i)}
              className={`h-16 w-16 object-cover rounded cursor-pointer border ${
                i === current ? "border-black" : "border-muted"
              }`}
            />
          ))}
        </div>
      )}
    </div>
  )
}