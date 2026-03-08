"use client"

import { useEffect, useState } from "react"
import { Search, SlidersHorizontal, X } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"
import type { ActiveFilters, Category } from "@/store/types"
import { fetchCategories } from "@/store/data"

interface ProductFiltersProps {
  filters: ActiveFilters
  onFiltersChange: (filters: ActiveFilters) => void
}

export function ProductFilters({ filters, onFiltersChange }: ProductFiltersProps) {
  const [categories, setCategories] = useState<Category[]>([])

  useEffect(() => {
    fetchCategories().then(setCategories).catch(() => setCategories([]))
  }, [])

  const selectedCategory = categories.find((c) => c.slug === filters.category)
  const dynamicFilters = selectedCategory?.filters || []

  function handleSearchChange(value: string) {
    onFiltersChange({ ...filters, search: value || undefined })
  }

  function handleCategoryChange(value: string) {
    if (value === "all") {
      const { category, ...rest } = filters
      // Reset dynamic filters too
      const cleaned: ActiveFilters = { search: rest.search }
      onFiltersChange(cleaned)
    } else {
      onFiltersChange({ search: filters.search, category: value })
    }
  }

  function handleDynamicFilter(key: string, value: string) {
    if (value === "all") {
      const next = { ...filters }
      delete next[key]
      onFiltersChange(next)
    } else {
      onFiltersChange({ ...filters, [key]: value })
    }
  }

  function clearFilters() {
    onFiltersChange({})
  }

  const activeCount = Object.keys(filters).filter(
    (k) => k !== "search" && filters[k] !== undefined
  ).length

  return (
    <div className="flex flex-col gap-4 rounded-xl border bg-card p-4">
      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Поиск товаров..."
          value={filters.search || ""}
          onChange={(e) => handleSearchChange(e.target.value)}
          className="pl-9"
        />
      </div>

      <Separator />

      {/* Category */}
      <div className="flex flex-col gap-2">
        <label className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
          <SlidersHorizontal className="h-3.5 w-3.5" />
          Категория
        </label>
        <Select value={filters.category || "all"} onValueChange={handleCategoryChange}>
          <SelectTrigger>
            <SelectValue placeholder="Все категории" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Все категории</SelectItem>
            {categories.map((cat) => (
              <SelectItem key={cat.id} value={cat.slug}>
                {cat.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Dynamic Filters */}
      {dynamicFilters.map((filterDef) => (
        <div key={filterDef.key} className="flex flex-col gap-2">
          <label className="text-xs font-medium text-muted-foreground">
            {filterDef.label}
          </label>
          {filterDef.type === "select" && filterDef.options && (
            <Select
              value={(filters[filterDef.key] as string) || "all"}
              onValueChange={(v) => handleDynamicFilter(filterDef.key, v)}
            >
              <SelectTrigger>
                <SelectValue placeholder={`Все`} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Все</SelectItem>
                {filterDef.options.map((opt) => (
                  <SelectItem key={opt} value={opt}>
                    {opt}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>
      ))}

      {/* Active filters & Clear */}
      {activeCount > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="secondary" className="text-xs">
            {activeCount} {activeCount === 1 ? "фильтр" : "фильтров"}
          </Badge>
          <Button variant="ghost" size="sm" onClick={clearFilters} className="h-7 text-xs text-muted-foreground">
            <X className="mr-1 h-3 w-3" />
            Сбросить
          </Button>
        </div>
      )}
    </div>
  )
}
