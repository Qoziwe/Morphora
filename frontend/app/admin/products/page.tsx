"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { adminApi } from "@/lib/adminApi";

export default function AdminProductsPage() {
  const router = useRouter();
  const [items, setItems] = useState<any[]>([]);
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(true);
  const [adminLink, setAdminLink] = useState("");


  useEffect(() => {
    const token = localStorage.getItem("admin_token");
    if (!token) {
      router.replace("/admin/login");
      return;
    }

    adminApi
      .me()
      .then(() => adminApi.products())
      .then(setItems)
      .catch(() => {
        localStorage.removeItem("admin_token");
        router.replace("/admin/login");
      })
      .finally(() => setLoading(false));
  }, [router]);

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return items;
    return items.filter((p) =>
      [p.id, p.name, p.brand, p.category, p.categoryName].some((x: any) =>
        String(x ?? "").toLowerCase().includes(s)
      )
    );
  }, [items, q]);

  if (loading) return <div className="p-6">Загрузка...</div>;

  async function deleteProduct(productId: string, name?: string) {
    if (!confirm(`Удалить товар "${name ?? productId}"?`)) return;

    await adminApi.deleteProduct(productId);

    // как в админке: перезагружаем данные
    const next = await adminApi.products();
    setItems(next);
  }


  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Товары</h1>
          <div className="text-sm opacity-70">Всего: {items.length}</div>
        </div>

        <Link className="px-4 py-2 rounded bg-black text-white" href="/admin">
          На админ панель
        </Link>

        <Link className="px-4 py-2 rounded bg-black text-white" href="/admin/products/new">
          + Добавить товар
        </Link>
      </div>

      <input
        className="border rounded p-2 w-full"
        placeholder="Поиск: id, название, бренд, категория..."
        value={q}
        onChange={(e) => setQ(e.target.value)}
      />

      <div className="space-y-2">
        {filtered.map((p) => (
          <div key={p.id} className="border rounded p-3 hover:bg-gray-50">
            <div className="flex items-center justify-between gap-4">
              <Link href={`/admin/products/${p.id}`} className="flex-1 min-w-0">
                <div className="font-medium truncate">{p.name}</div>
                <div className="text-sm opacity-70">
                  {p.brand} · {p.categoryName || p.category} · {p.price} {p.currency}
                </div>
                <div className="text-xs opacity-60">id: {p.id}</div>
              </Link>

              <div className="flex items-center gap-2">
                <Link
                  href={`/admin/products/${p.id}`}
                  className="text-sm opacity-70 hover:underline"
                >
                  Редактировать
                </Link>

                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    deleteProduct(p.id, p.name);
                  }}
                  className="px-3 py-1 text-sm rounded border text-red-600 hover:bg-red-50"
                >
                  Удалить
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
