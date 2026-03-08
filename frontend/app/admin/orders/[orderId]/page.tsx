"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { adminApi } from "@/lib/adminApi";
import { useAuth } from "@/store/provider"



type Checkpoint = {
  status: string;
  label: string;
  completed: boolean;
  date: string | null;
};

function nowIso() {
  return new Date().toISOString();
}

export default function AdminOrderPage() {
  const params = useParams<{ orderId: string }>();
  const orderId = params.orderId;

  const [order, setOrder] = useState<any>(null);
  const [saving, setSaving] = useState(false);

  const { user } = useAuth()
  const [adminLink, setAdminLink] = useState("");


  // дефолтные этапы (можешь менять как хочешь)
  const defaultFlow: Checkpoint[] = useMemo(
    () => [
      { status: "processing", label: "Заказ принят", completed: false, date: null },
      { status: "in_transit", label: "В пути", completed: false, date: null },
      { status: "arrived_almaty", label: "Приехал в Алматы", completed: false, date: null },
      { status: "pickup_point", label: "На пункте выдачи", completed: false, date: null },
      { status: "delivered", label: "Доставлен", completed: false, date: null },
    ],
    []
  );

  async function load() {
    const data = await adminApi.order(orderId)

    const history: Checkpoint[] =
      data.statusHistory?.length ? data.statusHistory : defaultFlow

    setOrder({ ...data, statusHistory: history })

    const firstItem = data.items?.[0]
    const productId = firstItem?.productId || firstItem?.product_id || firstItem?.product?.id

    if (!productId) {
      setAdminLink("")
      return
    }

    // ⚠️ этот метод должен существовать в adminApi
    const p = await adminApi.product(productId)
    setAdminLink(p.adminLink ?? "")
  }

  useEffect(() => {
    load();
  }, [orderId]);

  if (!order) return <div className="p-6">Загрузка заказа...</div>;

  const userLabel =
    order.user?.nickname || order.user?.fullName || order.user?.email;

  function toggle(i: number) {
    const next = [...order.statusHistory];
    const cp = next[i];
    const newCompleted = !cp.completed;

    next[i] = {
      ...cp,
      completed: newCompleted,
      date: newCompleted ? nowIso() : null,
    };

    // опционально: если ты включил этап — включить все предыдущие
    if (newCompleted) {
      for (let k = 0; k < i; k++) {
        if (!next[k].completed) {
          next[k] = { ...next[k], completed: true, date: next[k].date ?? nowIso() };
        }
      }
    }

    setOrder({ ...order, statusHistory: next });
  }

  async function save() {
    setSaving(true);
    try {
      await adminApi.updateOrderStatus(orderId, order.statusHistory);
      await load();
      alert("Сохранено ✅");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="p-6 space-y-6">
      <div className="border rounded p-4">
        <div className="text-xl font-semibold">{order.trackingNumber}</div>
          <div className="text-sm opacity-70">
            Клиент: {userLabel} · {order.user?.email}
          </div>
          <div className="text-sm opacity-70">Статус в БД: {order.status}</div>
        </div>

        <div className="border rounded p-4">
                <div className="border rounded p-4">
                  <div className="font-medium mb-2">Адрес доставки</div>

                  <div className="text-sm space-y-1">
                    <div>
                      <span className="opacity-70">Тип:</span>{" "}
                      {order.address?.type ?? "—"}
                    </div>

                    <div>
                      <span className="opacity-70">Город:</span>{" "}
                      {order.address?.city ?? "—"}
                    </div>

                    {order.address?.district ? (
                      <div>
                        <span className="opacity-70">Район:</span> {order.address.district}
                      </div>
                    ) : null}

                    <div>
                      <span className="opacity-70">Улица:</span>{" "}
                      {order.address?.street ?? "—"}
                    </div>

                    <div>
                      <span className="opacity-70">Дом:</span>{" "}
                      {order.address?.building ?? "—"}
                    </div>

                    {order.address?.apartment ? (
                      <div>
                        <span className="opacity-70">Квартира:</span>{" "}
                        {order.address.apartment}
                      </div>
                    ) : null}

                    {order.address?.postalCode ? (
                      <div>
                        <span className="opacity-70">Индекс:</span>{" "}
                        {order.address.postalCode}
                      </div>
                    ) : null}
                  </div>
                </div>

        {adminLink ? (
          <a href={adminLink} target="_blank" rel="noreferrer" className="text-xs text-blue-600 underline">
            Открыть админ-ссылку ↗
          </a>
        ) : (
          <div className="text-xs opacity-60">Админ-ссылка не задана</div>
        )}

        <div className="font-medium mb-3">Отслеживание (галочки)</div>
        <div className="space-y-2">
          {order.statusHistory.map((cp: Checkpoint, i: number) => (
            <label key={cp.status} className="flex items-center gap-3">
              <input
                type="checkbox"
                checked={cp.completed}
                onChange={() => toggle(i)}
              />
              <div className="flex-1">
                <div className="font-medium">{cp.label}</div>
                <div className="text-xs opacity-70">
                  {cp.completed ? `Дата: ${cp.date}` : "Не выполнено"}
                </div>
              </div>
            </label>
          ))}
        </div>

        <button
          onClick={save}
          disabled={saving}
          className="mt-4 px-4 py-2 rounded bg-black text-white disabled:opacity-60"
        >
          {saving ? "Сохраняю..." : "Сохранить"}
        </button>
      </div>

      <div className="border rounded p-4">
        <div className="font-medium mb-2">Товары в заказе</div>
        <div className="space-y-2">
          {order.items.map((it: any) => (
            <div key={it.product.id} className="border rounded p-3">
              <div className="font-medium">{it.product.name}</div>
              <div className="text-sm opacity-70">
                Кол-во: {it.quantity} · Цена: {it.product.price}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
