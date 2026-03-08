"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { adminApi } from "@/lib/adminApi";
import { ImageSlider } from "@/components/image-slider";

function safeJsonParse(s: string) {
  try {
    return { ok: true, value: JSON.parse(s) };
  } catch (e: any) {
    return { ok: false, error: e?.message ?? "JSON parse error" };
  }
}

function ProductPreview({ p }: { p: any }) {
  return (
    <div className="border rounded p-4 space-y-3">
      <div className="font-semibold">Предпросмотр</div>

      <div className="border rounded p-3">
        <div className="aspect-square w-full bg-gray-100 rounded overflow-hidden flex items-center justify-center">
          <ImageSlider
            images={
              p.images && p.images.length > 0
                ? p.images
                : p.image
                ? [p.image]
                : []
            }
            alt={p.name}
          />
        </div>

        <div className="mt-3 font-medium">{p.name || "Название товара"}</div>
        <div className="text-sm opacity-70">
          {p.brand || "Бренд"} · {p.categoryName || p.category || "Категория"}
        </div>

        <div className="mt-2 flex items-center justify-between">
          <div className="font-semibold">
            {p.price ? `${p.price} ${p.currency || ""}` : "Цена"}
          </div>
          <div className="text-xs px-2 py-1 rounded border">
            {p.inStock ? "В наличии" : "Нет в наличии"}
          </div>
        </div>

        {p.description ? (
          <div className="mt-2 text-sm opacity-80 line-clamp-3">{p.description}</div>
        ) : null}

        {p.specs && typeof p.specs === "object" ? (
          <div className="mt-3 text-sm">
            <div className="font-medium mb-1">Характеристики</div>
            <div className="space-y-1">
              {Object.entries(p.specs)
                .slice(0, 6)
                .map(([k, v]) => (
                  <div key={k} className="flex justify-between gap-4">
                    <span className="opacity-70">{k}</span>
                    <span className="text-right">{String(v)}</span>
                  </div>
                ))}
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}

export default function NewProductPage() {
  const router = useRouter();

  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  // form state (как в edit)
  const [name, setName] = useState("");
  const [category, setCategory] = useState("");
  const [brand, setBrand] = useState("");
  const [price, setPrice] = useState<number>(0);
  const [currency, setCurrency] = useState("KZT");
  const [image, setImage] = useState("");
  const [description, setDescription] = useState("");
  const [deliveryDays, setDeliveryDays] = useState<number>(12);
  const [inStock, setInStock] = useState(true);
  const [originalPrice, setOriginalPrice] = useState<number | null>(null);

  const [specsJson, setSpecsJson] = useState(`{"Экран":"6.1\\"","Память":"256 ГБ"}`);
  const [adminLink, setAdminLink] = useState("");

  const [images, setImages] = useState<string[]>([]);
  const [newImageUrl, setNewImageUrl] = useState("");

  const specsParsed = useMemo(() => safeJsonParse(specsJson), [specsJson]);

  const [categoriesList, setCategoriesList] = useState<any[]>([]);

  useEffect(() => {
    adminApi.getCategories().then(setCategoriesList).catch(console.error);
  }, []);

  function addImageUrl() {
    const url = newImageUrl.trim();
    if (!url) return;

    setImages((prev) => {
      if (prev.includes(url)) return prev;
      return [...prev, url];
    });

    setImage((prev) => prev || url);
    setNewImageUrl("");
  }

  function removeImageUrl(url: string) {
    setImages((prev) => prev.filter((x) => x !== url));
    setImage((prev) => (prev === url ? "" : prev));
  }

  function setMainImage(url: string) {
    setImage(url);
    setImages((prev) => [url, ...prev.filter((x) => x !== url)]);
  }

  const preview = useMemo(() => {
    const specs = specsParsed.ok ? specsParsed.value : {};
    return {
      id: "new", // просто чтобы preview не падал
      name,
      category,
      brand,
      price,
      originalPrice,
      currency,
      image: image || images[0] || "",
      images,
      description,
      deliveryDays,
      inStock,
      specs,
      adminLink,
    };
  }, [
    name,
    category,
    brand,
    price,
    originalPrice,
    currency,
    image,
    images,
    description,
    deliveryDays,
    inStock,
    specsParsed,
    adminLink,
  ]);

  async function create() {
    setErr(null);

    if (!specsParsed.ok) {
      setErr(`Specs JSON ошибка: ${specsParsed.error}`);
      return;
    }

    setSaving(true);
    try {
      const payload = {
        name,
        category,
        brand,
        price,
        currency,
        image: image || images[0] || "",
        images,
        description,
        deliveryDays,
        inStock,
        originalPrice,
        specs: specsParsed.value,
        adminLink,
        // если твой бэк сам ставит rating/reviewsCount — лучше убрать
        // reviewsCount: 0,
        // rating: 0,
      };

      const res = await adminApi.createProduct(payload);

      alert(`Товар создан: ${res.id ?? "OK"}`);
      router.push("/admin/products");
    } catch (e: any) {
      setErr(e.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Добавить товар</h1>
          <div className="text-sm opacity-70">Создание нового товара</div>
        </div>

        <button
          onClick={create}
          disabled={saving}
          className="px-4 py-2 rounded bg-black text-white disabled:opacity-60"
        >
          {saving ? "Создаю..." : "Создать"}
        </button>
      </div>

      {err ? <div className="text-red-600 text-sm">{err}</div> : null}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-start">
        {/* FORM */}
        <div className="border rounded p-4 space-y-3">
          <div className="font-semibold">Данные товара</div>

          <input
            className="border rounded p-2 w-full"
            placeholder="Название"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="space-y-1">
              <input
                className="border rounded p-2 w-full"
                list="category-list"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                placeholder="Категория (можно выбрать или ввести)"
              />

              <datalist id="category-list">
                {categoriesList.map(c => (
                  <option key={c.slug} value={c.name} />
                ))}
              </datalist>

              <div className="text-xs opacity-60">
                Можете выбрать из списка или ввести новую категорию
              </div>
            </div>

            <input
              className="border rounded p-2 w-full"
              placeholder="Бренд"
              value={brand}
              onChange={(e) => setBrand(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <input
              className="border rounded p-2 w-full"
              placeholder="Цена"
              type="number"
              value={price}
              onChange={(e) => setPrice(Number(e.target.value))}
            />

            <input
              className="border rounded p-2 w-full"
              placeholder="Старая цена (optional)"
              type="number"
              value={originalPrice ?? ""}
              onChange={(e) =>
                setOriginalPrice(e.target.value === "" ? null : Number(e.target.value))
              }
            />

            <input
              className="border rounded p-2 w-full"
              placeholder="Валюта"
              value={currency}
              onChange={(e) => setCurrency(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <div className="font-medium">Изображения (URL)</div>

            <div className="flex gap-2">
              <input
                className="border rounded p-2 w-full"
                placeholder="https://....jpg"
                value={newImageUrl}
                onChange={(e) => setNewImageUrl(e.target.value)}
              />
              <button type="button" className="px-3 py-2 rounded border" onClick={addImageUrl}>
                Добавить
              </button>
            </div>

            {images.length > 0 ? (
              <div className="grid grid-cols-3 gap-2">
                {images.map((url) => (
                  <div key={url} className="border rounded p-2 space-y-2">
                    <img src={url} alt="img" className="w-full aspect-square object-cover rounded" />
                    <div className="flex gap-2">
                      <button
                        type="button"
                        className={`text-xs px-2 py-1 rounded border ${
                          image === url ? "bg-black text-white" : ""
                        }`}
                        onClick={() => setMainImage(url)}
                      >
                        {image === url ? "Главная" : "Сделать главной"}
                      </button>
                      <button
                        type="button"
                        className="text-xs px-2 py-1 rounded border text-red-600"
                        onClick={() => removeImageUrl(url)}
                      >
                        Удалить
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-xs opacity-60">Изображений пока нет</div>
            )}
          </div>

          <div className="space-y-2">
            <input
              className="border rounded p-2 w-full"
              placeholder="Админ-ссылка (видно только админу)"
              value={adminLink}
              onChange={(e) => setAdminLink(e.target.value)}
            />

            {adminLink ? (
              <a
                href={adminLink}
                target="_blank"
                rel="noreferrer"
                className="text-xs text-blue-600 underline"
                onClick={(e) => e.stopPropagation()}
              >
                Открыть админ-ссылку ↗
              </a>
            ) : (
              <div className="text-xs opacity-60">Админ-ссылка не задана</div>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <input
              className="border rounded p-2 w-full"
              placeholder="Дней доставки"
              type="number"
              value={deliveryDays}
              onChange={(e) => setDeliveryDays(Number(e.target.value))}
            />

            <label className="flex items-center gap-2 border rounded p-2">
              <input type="checkbox" checked={inStock} onChange={(e) => setInStock(e.target.checked)} />
              <span>В наличии</span>
            </label>
          </div>

          <textarea
            className="border rounded p-2 w-full"
            rows={4}
            placeholder="Описание"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />

          <div className="space-y-1">
            <div className="font-medium">Характеристики (JSON)</div>
            <textarea
              className="border rounded p-2 w-full font-mono"
              rows={10}
              value={specsJson}
              onChange={(e) => setSpecsJson(e.target.value)}
            />
            {!specsParsed.ok ? (
              <div className="text-xs text-red-600">JSON ошибка: {specsParsed.error}</div>
            ) : (
              <div className="text-xs opacity-70">JSON валиден ✅</div>
            )}
          </div>

          <button onClick={() => router.push("/admin/products")} className="px-3 py-2 rounded border">
            ← Назад к списку
          </button>
        </div>

        {/* PREVIEW */}
        <ProductPreview p={preview} />
      </div>
    </div>
  );
}