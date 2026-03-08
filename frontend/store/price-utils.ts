// Format price in KZT
export function formatPrice(price: number): string {
  return new Intl.NumberFormat("ru-KZ", {
    style: "currency",
    currency: "KZT",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(price)
}

// Calculate final price with markup
export function calculateFinalPrice(basePrice: number, deliveryFee: number = 0): {
  base: number
  delivery: number
  sellerFee: number
  total: number
} {
  const sellerFee = Math.round(basePrice * 0.05) // 5% процент продавца
  const total = basePrice + deliveryFee + sellerFee
  return { base: basePrice, delivery: deliveryFee, sellerFee, total }
}

export function formatDate(dateString: string): string {
  return new Intl.DateTimeFormat("ru-KZ", {
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(dateString))
}

export function formatShortDate(dateString: string): string {
  return new Intl.DateTimeFormat("ru-KZ", {
    day: "numeric",
    month: "short",
  }).format(new Date(dateString))
}
