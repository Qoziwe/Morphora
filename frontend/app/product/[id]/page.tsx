"use client"

import { use, useEffect, useState } from "react"
import Link from "next/link"
import { notFound } from "next/navigation"
import { ArrowLeft, ShoppingCart, Star, Package, ShieldCheck, Truck, Check } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { SiteHeader } from "@/components/site-header"
import { SiteFooter } from "@/components/site-footer"
import { formatPrice } from "@/store/price-utils"
import { useCart } from "@/store/provider"
import { toast } from "sonner"
import { api } from "@/lib/api"
import type { Product } from "@/store/types"
import { useAuth } from "@/store/provider"
import { Textarea } from "@/components/ui/textarea"
import { formatDate } from "@/store/price-utils"

import { ImageSlider } from "@/components/image-slider"

export default function ProductPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const [product, setProduct] = useState<Product | null>(null)
  const [loading, setLoading] = useState(true)
  const [notFoundFlag, setNotFoundFlag] = useState(false)
  const { addItem } = useCart()
  const { user } = useAuth()

  // Reviews state
  const [reviews, setReviews] = useState<any[]>([])
  const [loadingReviews, setLoadingReviews] = useState(false)
  const [newReviewText, setNewReviewText] = useState("")
  const [newReviewRating, setNewReviewRating] = useState(5)
  const [submittingReview, setSubmittingReview] = useState(false)
  const [newReviewImages, setNewReviewImages] = useState<File[]>([])
  const [uploadingImages, setUploadingImages] = useState(false)

  useEffect(() => {
    async function load() {
      try {
        const p = await api.getProductById(id)
        setProduct(p as Product)
        
        // Load reviews
        setLoadingReviews(true)
        const r = await api.getReviews(id)
        setReviews(r)
      } catch {
        setNotFoundFlag(true)
      } finally {
        setLoading(false)
        setLoadingReviews(false)
      }
    }
    load()
  }, [id])

  async function handleAddReview() {
    if (!user || !product) {
      toast.error("Войдите, чтобы оставить отзыв")
      return
    }
    if (!newReviewText.trim()) {
      toast.error("Напишите текст отзыва")
      return
    }

    setSubmittingReview(true)
    try {
      let uploadedUrls: string[] = []
      if (newReviewImages.length > 0) {
        setUploadingImages(true)
        try {
          const uploadRes = await api.uploadImages(newReviewImages)
          uploadedUrls = uploadRes.urls || []
        } catch (e) {
          toast.error("Не удалось загрузить фото")
          setUploadingImages(false)
          setSubmittingReview(false)
          return
        }
        setUploadingImages(false)
      }

      const res = await api.addReview({
        productId: product.id,
        rating: newReviewRating,
        text: newReviewText,
        images: uploadedUrls,
      })
      
      const newReview = {
        id: res.id,
        userId: user.id,
        productId: product.id,
        rating: newReviewRating,
        text: newReviewText,
        images: uploadedUrls,
        createdAt: new Date().toISOString(),
        userName: user.nickname || `${user.firstName} ${user.lastName}`, 
      }
      
      setReviews([newReview, ...reviews])
      setNewReviewText("")
      setNewReviewImages([])
      toast.success("Отзыв опубликован!")
      
      // Update product rating visually without refetch
      setProduct({
        ...product,
        rating: res.rating,
        reviewsCount: res.reviewsCount
      })
      
    } catch (e) {
      console.error(e)
      toast.error("Не удалось отправить отзыв")
    } finally {
      setSubmittingReview(false)
    }
  }

  if (notFoundFlag) {
    notFound()
  }

  if (loading || !product) {
    return (
      <div className="flex min-h-screen flex-col">
        <SiteHeader />
        <main className="flex-1 flex items-center justify-center">
           <Package className="h-12 w-12 animate-pulse text-muted-foreground/50" />
        </main>
        <SiteFooter />
      </div>
    )
  }

  function toAbsUrl(u?: string) {
    if (!u) return "";
    if (u.startsWith("http://") || u.startsWith("https://")) return u;
    const base = process.env.NEXT_PUBLIC_API_URL; // например http://192.168.10.4:1488
    return `${base}${u}`;
  }


  function handleAddToCart() {
    if (!product) return
    addItem(product)
    toast.success(`${product.name} добавлен в корзину`)
  }

  const discount = product.originalPrice
    ? Math.round(((product.originalPrice - product.price) / product.originalPrice) * 100)
    : 0

  const categoryLabel = product.categoryName || product.category || "Далее";

  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />

      <main className="flex-1">
        <div className="mx-auto max-w-7xl px-4 py-8">
          {/* Breadcrumb */}
          <div className="mb-6 flex items-center gap-2 text-sm text-muted-foreground">
            <Link href="/" className="transition-colors hover:text-foreground">
              Главная
            </Link>
            <span>/</span>
            <Link href={`/?category=${product.category}`} className="transition-colors hover:text-foreground">
              {categoryLabel}
            </Link>
            <span>/</span>
            <span className="text-foreground">{product.name}</span>
          </div>

          <div className="grid gap-8 lg:grid-cols-2">
            {/* Image */}
            <div>
              <ImageSlider
                images={
                  product.images && product.images.length > 0
                    ? product.images
                    : product.image
                      ? [product.image]
                      : []
                }
                alt={product.name}
              />
            </div>

            {/* Info */}
            <div className="flex flex-col gap-4">
              <div>
                <Badge variant="secondary" className="mb-2">
                  {categoryLabel}
                </Badge>
                <h1 className="text-2xl font-bold text-foreground md:text-3xl">{product.name}</h1>
              </div>

              {/* Rating */}
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star
                      key={i}
                      className={`h-4 w-4 ${
                        i < Math.floor(product.rating)
                          ? "fill-[#5ecf8f] text-[#5ecf8f]"
                          : "text-border"
                      }`}
                    />
                  ))}
                </div>
                <span className="text-sm font-medium">{product.rating}</span>
                <span className="text-sm text-muted-foreground">
                  ({product.reviewsCount} отзывов)
                </span>
              </div>

              {/* Price */}
              <div className="flex items-baseline gap-3">
                <span className="text-3xl font-bold text-foreground">{formatPrice(product.price)}</span>
                {product.originalPrice && (
                  <>
                    <span className="text-lg text-muted-foreground line-through">
                      {formatPrice(product.originalPrice)}
                    </span>
                    <Badge className="bg-destructive text-destructive-foreground">-{discount}%</Badge>
                  </>
                )}
              </div>

              <p className="leading-relaxed text-muted-foreground">{product.description}</p>

              <Separator />

              {/* Specs */}
              <div className="flex flex-col gap-2">
                <h3 className="text-sm font-semibold text-foreground">Характеристики</h3>
                <div className="grid grid-cols-2 gap-2">
                  {Object.entries(product.specs).map(([key, value]) => (
                    <div key={key} className="flex items-center gap-2 rounded-lg bg-secondary/50 px-3 py-2">
                      <Check className="h-3.5 w-3.5 text-primary" />
                      <span className="text-xs text-muted-foreground">{key}:</span>
                      <span className="text-xs font-medium text-foreground">{value}</span>
                    </div>
                  ))}
                </div>
              </div>

              <Separator />

              {/* Delivery Info */}
              <div className="flex flex-col gap-3">
                <div className="flex items-center gap-3 text-sm">
                  <Truck className="h-4 w-4 text-primary" />
                  <span>Доставка за {product.deliveryDays} дней по Казахстану</span>
                </div>
                <div className="flex items-center gap-3 text-sm">
                  <ShieldCheck className="h-4 w-4 text-primary" />
                  <span>Официальная гарантия</span>
                </div>
                <div className="flex items-center gap-3 text-sm">
                  <Package className="h-4 w-4 text-primary" />
                  <span>{product.inStock ? "В наличии" : "Под заказ"}</span>
                </div>
              </div>

              {/* Actions */}
              <div className="mt-4 flex gap-3">
                <Button size="lg" className="flex-1 gap-2" onClick={handleAddToCart}>
                  <ShoppingCart className="h-4 w-4" />
                  Добавить в корзину
                </Button>
              </div>
            </div>
          </div>

          <Separator className="my-10" />

          {/* Reviews Section */}
          <div className="max-w-2xl">
            <h2 className="mb-6 text-2xl font-bold">Отзывы ({reviews.length})</h2>
            
            {/* Add Review Form */}
            {user ? (
              <div className="mb-8 rounded-xl border bg-card p-6">
                 <h3 className="mb-4 text-lg font-medium">Оставить отзыв</h3>
                 <div className="mb-4 flex gap-2">
                   {[1, 2, 3, 4, 5].map((star) => (
                     <Star
                       key={star}
                       className={`h-6 w-6 cursor-pointer ${
                         star <= newReviewRating ? "fill-yellow-400 text-yellow-400" : "text-muted"
                       }`}
                       onClick={() => setNewReviewRating(star)}
                     />
                   ))}
                 </div>
                 <Textarea
                   placeholder="Расскажите о ваших впечатлениях..."
                   value={newReviewText}
                   onChange={(e) => setNewReviewText(e.target.value)}
                   className="mb-4"
                 />
                 <div className="mb-4">
                   <Label className="mb-2 block text-sm">Прикрепить фото (макс. 3)</Label>
                   <Input 
                     type="file" 
                     accept="image/jpeg, image/png, image/webp" 
                     multiple 
                     onChange={(e) => {
                       if (e.target.files) {
                         const files = Array.from(e.target.files).slice(0, 3)
                         setNewReviewImages(files)
                       }
                     }} 
                   />
                   {newReviewImages.length > 0 && (
                     <div className="mt-2 flex flex-wrap gap-2">
                       {newReviewImages.map((file, i) => (
                         <span key={i} className="text-xs text-muted-foreground">{file.name}</span>
                       ))}
                     </div>
                   )}
                 </div>
                 <Button onClick={handleAddReview} disabled={submittingReview || uploadingImages}>
                   {submittingReview || uploadingImages ? "Отправка..." : "Отправить отзыв"}
                 </Button>
              </div>
            ) : (
               <div className="mb-8 rounded-xl border bg-muted/50 p-6 text-center">
                 <p className="text-muted-foreground">
                   <Link href={`/auth?mode=login&callbackUrl=/product/${id}`} className="font-medium text-primary underline">
                     Войдите
                   </Link>
                   , чтобы оставить отзыв
                 </p>
               </div>
            )}

            {/* List */}
             <div className="flex flex-col gap-6">
              {reviews.map((review) => (
                <div key={review.id} className="border-b pb-6 last:border-0">
                  <div className="mb-2 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{review.userName || "Пользователь"}</span>
                      {review.userId === user?.id && <Badge variant="outline" className="text-[10px]">Вы</Badge>}
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {formatDate(review.createdAt)}
                    </span>
                  </div>
                  <div className="mb-2 flex">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Star
                        key={i}
                        className={`h-3 w-3 ${
                          i < review.rating ? "fill-primary text-primary" : "text-muted"
                        }`}
                      />
                    ))}
                  </div>
                  <p className="text-sm text-foreground mb-3">{review.text}</p>
                  {review.images && review.images.length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-2">
                      {review.images.map((img: string, idx: number) => (
                        <a key={idx} href={toAbsUrl(img)} target="_blank" rel="noreferrer">
                          <img src={toAbsUrl(img)} alt={`Review photo ${idx + 1}`} className="h-16 w-16 rounded object-cover border" />
                        </a>
                      ))}
                    </div>
                  )}
                </div>
              ))}
              {reviews.length === 0 && !loadingReviews && (
                <p className="text-muted-foreground">Отзывов пока нет. Будьте первыми!</p>
              )}
            </div>
          </div>
        </div>
      </main>

      <SiteFooter />
    </div>
  )
}
