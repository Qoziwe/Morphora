"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { adminApi } from "@/lib/adminApi";

type User = {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  nickname?: string | null;
  orders: any[];
};



export default function AdminPage() {
  const router = useRouter();

  const [users, setUsers] = useState<User[]>([]);
  const [newOrders, setNewOrders] = useState(0);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  // ✅ 1) Проверяем токен и доступ
  useEffect(() => {
    const token = localStorage.getItem("admin_token");
    if (!token) {
      router.replace("/admin/login");
      return;
    }

    // проверяем токен на бэке
    adminApi
      .me()
      .then(() => {
        // ✅ 2) Если токен ок — грузим данные
        return adminApi.dashboard();
      })
      .then((data) => {
        setUsers(data.users);
        setNewOrders(data.newOrders);
        setErr(null);
      })
      .catch(() => {
        // токен невалидный/просрочен
        localStorage.removeItem("admin_token");
        router.replace("/admin/login");
      })
      .finally(() => setLoading(false));
  }, [router]);

  async function deleteUser(userId: string) {
    if (!confirm("Удалить пользователя и все его заказы?")) return;
    await adminApi.deleteUser(userId);
    const data = await adminApi.dashboard();
    setUsers(data.users);
    setNewOrders(data.newOrders);
  }

  // ✅ Только после хуков делаем ранние return
  if (loading) return <div className="p-6">Загрузка...</div>;
  if (err) return <div className="p-6 text-red-600">Ошибка: {err}</div>;

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Админ-панель</h1>
          <div className="text-sm opacity-70">Новых заказов: {newOrders}</div>
        </div>


        <Link className="px-4 py-2 rounded border" href="/admin/products">
          Все товары
        </Link>

        
        <Link className="px-4 py-2 rounded bg-black text-white" href="/admin/products/new">
          + Добавить товар
        </Link>

        

      </div>

      <div className="space-y-4">
        {users.map((u) => {
          const name = u.nickname || `${u.firstName} ${u.lastName}`;
          return (
            <div key={u.id} className="border rounded p-4">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="font-medium">{name}</div>
                  <div className="text-sm opacity-70">{u.email}</div>
                </div>

                <button onClick={() => deleteUser(u.id)} className="px-3 py-1 rounded border">
                  Удалить
                </button>
              </div>

              <div className="mt-4">
                <div className="font-medium mb-2">Заказы</div>
                {u.orders.length === 0 ? (
                  <div className="text-sm opacity-70">Нет заказов</div>
                ) : (
                  <div className="space-y-2">
                    {u.orders.map((o: any) => (
                      <Link
                        key={o.id}
                        href={`/admin/orders/${o.id}`}
                        className="block border rounded p-3 hover:bg-gray-50"
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="font-medium">
                              {o.trackingNumber}{" "}
                              {o.isNewForAdmin ? (
                                <span className="ml-2 text-xs px-2 py-1 rounded bg-yellow-200">
                                  NEW
                                </span>
                              ) : null}
                            </div>
                            <div className="text-sm opacity-70">
                              Сумма: {o.totalPrice} | Статус: {o.status}
                            </div>
                          </div>
                          <div className="text-sm opacity-70">→</div>
                        </div>
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
``
