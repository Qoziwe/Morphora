import React from "react"
import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import { Toaster } from 'sonner'
import './globals.css'
import { StoreProvider } from '@/store/provider'
import { AuthProvider } from "@/store/provider"

const _inter = Inter({ subsets: ['latin', 'cyrillic'] })

export const metadata: Metadata = {
  title: 'Morphowebshop — Электроника',
  description: 'Интернет-магазин электроники Morphowebshop. Смартфоны, ноутбуки, видеокарты и другая техника с доставкой по Казахстану.',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="ru">
      <body className="font-sans antialiased">
        <StoreProvider>
          {children}
          <Toaster position="top-right" />
        </StoreProvider>

      </body>
    </html>
  )
}

