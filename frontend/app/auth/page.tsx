"use client"

import React from "react"

import { useState, useEffect } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import { Eye, EyeOff, ArrowLeft } from "lucide-react"
import { useAuth } from "@/store/provider"
import { toast } from "sonner"

import { IMaskInput } from "react-imask"

export default function AuthPage() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const { user, login, register } = useAuth()
  const [mode, setMode] = useState<"login" | "register">(
    (searchParams.get("mode") as "login" | "register") || "login"
  )
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)

  // Form state
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [firstName, setFirstName] = useState("")
  const [lastName, setLastName] = useState("")
  const [phone, setPhone] = useState("")

  useEffect(() => {
    if (user) {
      router.push("/")
    }
  }, [user, router])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)

    if (mode === "login") {
      const result = await login(email, password)
      if (result.success) {
        toast.success("Добро пожаловать!")
        router.push("/")
      } else {
        toast.error(result.error || "Ошибка входа")
      }
    } else {
      if (!firstName || !lastName || !phone) {
        toast.error("Заполните все поля")
        setLoading(false)
        return
      }
      const phoneRegex = /^\+7 \(\d{3}\)-\d{3}-\d{2}-\d{2}$/
      if (!phoneRegex.test(phone)) {
        toast.error("Неверный формат номера телефона")
        setLoading(false)
        return
      }
      const result = await register({ firstName, lastName, email, phone, password })
      if (result.success) {
        toast.success("Регистрация прошла успешно!")
        router.push("/")
      } else {
        toast.error(result.error || "Ошибка регистрации")
      }
      
    }

    setLoading(false)
  }

  if (user) return null

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-secondary/30 px-4">
      <div className="w-full max-w-md">
        {/* Back */}
        <Link
          href="/"
          className="mb-6 inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          На главную
        </Link>

        {/* Card */}
        <div className="rounded-2xl border bg-card p-8 shadow-sm">
          {/* Logo */}
          <div className="mb-6 flex flex-col items-center gap-2">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary">
              <span className="text-lg font-bold text-primary-foreground">M</span>
            </div>
            <h1 className="text-xl font-bold text-card-foreground">
              {mode === "login" ? "Вход в аккаунт" : "Создать аккаунт"}
            </h1>
            <p className="text-sm text-muted-foreground">
              {mode === "login"
                ? "Введите свои данные для входа"
                : "Заполните форму для регистрации"}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            {mode === "register" && (
              <>
                <div className="grid grid-cols-2 gap-3">
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor="firstName">Имя</Label>
                    <Input
                      id="firstName"
                      placeholder="Алексей"
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                      required
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor="lastName">Фамилия</Label>
                    <Input
                      id="lastName"
                      placeholder="Иванов"
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                      required
                    />
                  </div>
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="phone">Телефон</Label>

                  <IMaskInput
                    id="phone"
                    mask="+{7} (000)-000-00-00"
                    placeholder="+7 (777)-123-45-67"
                    value={phone}
                    // IMask не даёт букв, только цифры по маске
                    onAccept={(value) => setPhone(String(value))}
                    // важно: чтобы выглядело как твой shadcn Input
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background
                              placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring
                              focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                    inputMode="tel"
                    required
                  />
                </div>
              </>
            )}

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="email">Электронная почта</Label>
              <Input
                id="email"
                type="email"
                placeholder="example@mail.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="password">Пароль</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Минимум 6 символов"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={6}
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <Button type="submit" className="mt-2 w-full" disabled={loading}>
              {loading
                ? "Подождите..."
                : mode === "login"
                  ? "Войти"
                  : "Зарегистрироваться"}
            </Button>
          </form>

          <Separator className="my-6" />

          <p className="text-center text-sm text-muted-foreground">
            {mode === "login" ? (
              <>
                {"Нет аккаунта? "}
                <button
                  onClick={() => setMode("register")}
                  className="font-medium text-primary underline-offset-4 hover:underline"
                >
                  Зарегистрируйтесь
                </button>
              </>
            ) : (
              <>
                {"Уже есть аккаунт? "}
                <button
                  onClick={() => setMode("login")}
                  className="font-medium text-primary underline-offset-4 hover:underline"
                >
                  Войдите
                </button>
              </>
            )}
          </p>

          {mode === "login" && (
            <p className="mt-3 text-center text-xs text-muted-foreground">
              Демо: demo@morphowebshop.kz / любой пароль
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
