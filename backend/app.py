import os
import json
import uuid
import secrets
import sqlite3
from datetime import datetime, timedelta
from typing import Any, Dict, List

from flask import Flask, jsonify, request, abort, send_from_directory
from flask_cors import CORS
from werkzeug.utils import secure_filename
from werkzeug.security import generate_password_hash, check_password_hash
from itsdangerous import URLSafeTimedSerializer, BadSignature, SignatureExpired

from dotenv import load_dotenv
load_dotenv(os.path.join(os.path.dirname(__file__), ".env"), override=True)


app = Flask(__name__)

# CORS — разрешаем только конкретные origins (по умолчанию localhost для dev)
ALLOWED_ORIGINS = os.environ.get("ALLOWED_ORIGINS", "http://localhost:3000").split(",")
CORS(app, resources={r"/*": {"origins": ALLOWED_ORIGINS}})

# Секрет для подписи токена
app.config["SECRET_KEY"] = os.environ.get("SECRET_KEY") or secrets.token_hex(32)

# Данные админа (храним НЕ пароль, а хэш)
ADMIN_EMAIL = os.environ.get("ADMIN_EMAIL", "admin@morphowebshop.kz")
ADMIN_PASSWORD_HASH = os.environ.get("ADMIN_PASSWORD_HASH")  # обязательно задать
TOKEN_TTL_SECONDS = 60 * 60 * 6  # 6 часов

serializer = URLSafeTimedSerializer(app.config["SECRET_KEY"])

def create_admin_token(email: str) -> str:
    return serializer.dumps({"email": email, "role": "admin"})

def verify_admin_token(token: str) -> dict | None:
    try:
        data = serializer.loads(token, max_age=TOKEN_TTL_SECONDS)
        if data.get("role") != "admin":
            return None
        return data
    except (BadSignature, SignatureExpired):
        return None


# ---- Пользовательские токены ----
USER_TOKEN_TTL = 60 * 60 * 24 * 7  # 7 дней

def create_user_token(user_id: str) -> str:
    return serializer.dumps({"user_id": user_id, "role": "user"})

def verify_user_token(token: str) -> str | None:
    """Возвращает user_id или None."""
    try:
        data = serializer.loads(token, max_age=USER_TOKEN_TTL)
        return data.get("user_id")
    except (BadSignature, SignatureExpired):
        return None

def get_current_user() -> str:
    """Извлекает user_id из Authorization header. Abort 401 если невалидно."""
    auth = request.headers.get("Authorization", "")
    if not auth.startswith("Bearer "):
        abort(401)
    token = auth.removeprefix("Bearer ").strip()
    user_id = verify_user_token(token)
    if not user_id:
        abort(401)
    return user_id

def get_optional_user() -> str | None:
    """Как get_current_user, но возвращает None вместо abort."""
    auth = request.headers.get("Authorization", "")
    if not auth.startswith("Bearer "):
        return None
    token = auth.removeprefix("Bearer ").strip()
    return verify_user_token(token)



DB_PATH = os.path.join(os.path.dirname(__file__), "database.db")


def get_db_connection() -> sqlite3.Connection:
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON")
    return conn


def init_db() -> None:
    """Создает таблицы, если их еще нет."""
    conn = get_db_connection()
    cur = conn.cursor()

    # Users
    cur.execute(
        """
        CREATE TABLE IF NOT EXISTS users (
            id TEXT PRIMARY KEY,
            email TEXT UNIQUE NOT NULL,
            password_hash TEXT,
            phone TEXT NOT NULL,
            first_name TEXT NOT NULL,
            last_name TEXT NOT NULL,
            nickname TEXT,
            avatar TEXT,
            role TEXT NOT NULL,
            created_at TEXT NOT NULL
        )
        """
    )

    # Addresses
    cur.execute(
        """
        CREATE TABLE IF NOT EXISTS addresses (
            id TEXT PRIMARY KEY,
            user_id TEXT NOT NULL,
            type TEXT NOT NULL,
            city TEXT NOT NULL,
            district TEXT,
            street TEXT NOT NULL,
            building TEXT NOT NULL,
            apartment TEXT,
            postal_code TEXT,
            is_default INTEGER NOT NULL DEFAULT 0,
            FOREIGN KEY (user_id) REFERENCES users(id)
        )
        """
    )

    # Products
    cur.execute(
        """
        CREATE TABLE IF NOT EXISTS products (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            category TEXT NOT NULL,
            subcategory TEXT,
            price INTEGER NOT NULL,
            original_price INTEGER,
            currency TEXT NOT NULL,
            image TEXT NOT NULL,
            images_json TEXT,
            description TEXT NOT NULL,
            admin_link TEXT,
            specs_json TEXT NOT NULL,
            in_stock INTEGER NOT NULL,
            rating REAL NOT NULL,
            reviews_count INTEGER NOT NULL,
            brand TEXT NOT NULL,
            delivery_days INTEGER NOT NULL
        )
        """
    )

    # Categories
    cur.execute(
        """
        CREATE TABLE IF NOT EXISTS categories (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            slug TEXT NOT NULL,
            icon TEXT NOT NULL,
            filters_json TEXT NOT NULL
        )
        """
    )

    # Banners
    cur.execute(
        """
        CREATE TABLE IF NOT EXISTS banners (
            id INTEGER PRIMARY KEY,
            title TEXT NOT NULL,
            subtitle TEXT NOT NULL,
            cta TEXT NOT NULL,
            bg_color TEXT NOT NULL
        )
        """
    )

    # Orders
    cur.execute(
        """
        CREATE TABLE IF NOT EXISTS orders (
            id TEXT PRIMARY KEY,
            user_id TEXT NOT NULL,
            tracking_number TEXT NOT NULL UNIQUE,
            total_price INTEGER NOT NULL,
            delivery_price INTEGER NOT NULL,
            tax INTEGER NOT NULL,
            status TEXT NOT NULL,
            address_json TEXT NOT NULL,
            created_at TEXT NOT NULL,
            estimated_delivery TEXT NOT NULL,
            FOREIGN KEY (user_id) REFERENCES users(id)
        )
        """
    )

    # Order items
    cur.execute(
        """
        CREATE TABLE IF NOT EXISTS order_items (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            order_id TEXT NOT NULL,
            product_id TEXT NOT NULL,
            quantity INTEGER NOT NULL,
            price INTEGER NOT NULL,
            FOREIGN KEY (order_id) REFERENCES orders(id),
            FOREIGN KEY (product_id) REFERENCES products(id)
        )
        """
    )

    # Order status history
    cur.execute(
        """
        CREATE TABLE IF NOT EXISTS order_status_history (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            order_id TEXT NOT NULL,
            status TEXT NOT NULL,
            label TEXT NOT NULL,
            date TEXT,
            completed INTEGER NOT NULL,
            FOREIGN KEY (order_id) REFERENCES orders(id)
        )
        """
    )

    # Reviews
    cur.execute(
        """
        CREATE TABLE IF NOT EXISTS reviews (
            id TEXT PRIMARY KEY,
            user_id TEXT NOT NULL,
            product_id TEXT NOT NULL,
            rating INTEGER NOT NULL,
            text TEXT NOT NULL,
            created_at TEXT NOT NULL,
            FOREIGN KEY (user_id) REFERENCES users(id),
            FOREIGN KEY (product_id) REFERENCES products(id)
        )
        """
    )

    # Carts
    cur.execute(
        """
        CREATE TABLE IF NOT EXISTS carts (
            user_id TEXT PRIMARY KEY,
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL,
            FOREIGN KEY (user_id) REFERENCES users(id)
        )
        """
    )

    # Cart items
    cur.execute(
        """
        CREATE TABLE IF NOT EXISTS cart_items (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            cart_user_id TEXT NOT NULL,
            product_id TEXT NOT NULL,
            quantity INTEGER NOT NULL,
            FOREIGN KEY (cart_user_id) REFERENCES carts(user_id),
            FOREIGN KEY (product_id) REFERENCES products(id)
        )
        """
    )

    # Subscribers
    cur.execute(
        """
        CREATE TABLE IF NOT EXISTS subscribers (
            email TEXT PRIMARY KEY,
            created_at TEXT NOT NULL
        )
        """
    )
    
def ensure_columns() -> None:
    conn = get_db_connection()
    cur = conn.cursor()

    cur.execute("PRAGMA table_info(orders)")
    cols_orders = {row[1] for row in cur.fetchall()}
    if "is_new_for_admin" not in cols_orders:
        cur.execute("ALTER TABLE orders ADD COLUMN is_new_for_admin INTEGER NOT NULL DEFAULT 1")

    # products: admin_link
    cur.execute("PRAGMA table_info(products)")
    cols_products = {row[1] for row in cur.fetchall()}
    if "admin_link" not in cols_products:
        cur.execute("ALTER TABLE products ADD COLUMN admin_link TEXT")

    # reviews: images_json
    cur.execute("PRAGMA table_info(reviews)")
    cols_reviews = {row[1] for row in cur.fetchall()}
    if "images_json" not in cols_reviews:
        cur.execute("ALTER TABLE reviews ADD COLUMN images_json TEXT")

    # users: password_hash
    cur.execute("PRAGMA table_info(users)")
    cols_users = {row[1] for row in cur.fetchall()}
    if "password_hash" not in cols_users:
        cur.execute("ALTER TABLE users ADD COLUMN password_hash TEXT")
        # Установить дефолтный пароль для существующих пользователей
        default_hash = generate_password_hash("demo123")
        cur.execute("UPDATE users SET password_hash = ? WHERE password_hash IS NULL", (default_hash,))

    conn.commit()
    conn.close()


def seed_demo_data() -> None:
    """
    Заполняет БД демо-данными, если она пустая.
    Берет данные, аналогичные frontend/store/data.ts и auth-store.ts.
    """
    conn = get_db_connection()
    cur = conn.cursor()

    # Если уже есть продукты, считаем, что сидинг не нужен
    cur.execute("SELECT COUNT(*) AS c FROM products")
    if cur.fetchone()["c"] > 0:
        conn.close()
        return

    # Демо-пользователь (как в auth-store.ts)
    demo_user_id = "demo-user"
    demo_password_hash = generate_password_hash("demo123")
    cur.execute(
        """
        INSERT OR IGNORE INTO users (
            id, email, password_hash, phone, first_name, last_name, nickname, role, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        """,
        (
            demo_user_id,
            "demo@morphowebshop.kz",
            demo_password_hash,
            "+7 777 123 4567",
            "Алексей",
            "Иванов",
            "alexey",
            "customer",
            "2025-01-15T10:00:00Z",
        ),
    )

    cur.execute(
        """
        INSERT OR IGNORE INTO addresses (
            id, user_id, type, city, district, street, building, apartment,
            postal_code, is_default
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """,
        (
            "addr1",
            demo_user_id,
            "Дом",
            "Алматы",
            "Алмалинский",
            "ул. Абая",
            "52",
            "14",
            None,
            1,
        ),
    )

    # Категории и фильтры (в формате JSON)
    categories = [
        {
            "id": "phones",
            "name": "Смартфоны",
            "slug": "phones",
            "icon": "Smartphone",
            "filters": [
                {
                    "key": "brand",
                    "label": "Бренд",
                    "type": "select",
                    "options": ["Apple", "Samsung", "Xiaomi", "Huawei", "OnePlus"],
                },
                {
                    "key": "screenSize",
                    "label": "Диагональ экрана",
                    "type": "select",
                    "options": ['5.0"', '5.5"', '6.1"', '6.5"', '6.7"', '6.9"'],
                },
                {
                    "key": "memory",
                    "label": "Память",
                    "type": "select",
                    "options": ["64 ГБ", "128 ГБ", "256 ГБ", "512 ГБ", "1 ТБ"],
                },
            ],
        },
        {
            "id": "laptops",
            "name": "Ноутбуки",
            "slug": "laptops",
            "icon": "Laptop",
            "filters": [
                {
                    "key": "brand",
                    "label": "Бренд",
                    "type": "select",
                    "options": ["Apple", "Lenovo", "ASUS", "HP", "Dell", "Acer"],
                },
                {
                    "key": "processor",
                    "label": "Процессор",
                    "type": "select",
                    "options": [
                        "Intel Core i5",
                        "Intel Core i7",
                        "Intel Core i9",
                        "AMD Ryzen 5",
                        "AMD Ryzen 7",
                        "Apple M3",
                    ],
                },
                {
                    "key": "ram",
                    "label": "ОЗУ",
                    "type": "select",
                    "options": ["8 ГБ", "16 ГБ", "32 ГБ", "64 ГБ"],
                },
            ],
        },
        {
            "id": "gpu",
            "name": "Видеокарты",
            "slug": "gpu",
            "icon": "Cpu",
            "filters": [
                {
                    "key": "brand",
                    "label": "Производитель",
                    "type": "select",
                    "options": ["NVIDIA", "AMD"],
                },
                {
                    "key": "vram",
                    "label": "Видеопамять",
                    "type": "select",
                    "options": ["4 ГБ", "6 ГБ", "8 ГБ", "12 ГБ", "16 ГБ", "24 ГБ"],
                },
                {
                    "key": "model",
                    "label": "Модель",
                    "type": "select",
                    "options": [
                        "RTX 4060",
                        "RTX 4070",
                        "RTX 4080",
                        "RTX 4090",
                        "RX 7600",
                        "RX 7800 XT",
                        "RX 7900 XTX",
                    ],
                },
            ],
        },
        {
            "id": "audio",
            "name": "Аудио",
            "slug": "audio",
            "icon": "Headphones",
            "filters": [
                {
                    "key": "brand",
                    "label": "Бренд",
                    "type": "select",
                    "options": ["Sony", "Apple", "JBL", "Bose", "Sennheiser"],
                },
                {
                    "key": "type",
                    "label": "Тип",
                    "type": "select",
                    "options": ["Наушники", "Колонки", "Саундбар"],
                },
                {
                    "key": "wireless",
                    "label": "Беспроводные",
                    "type": "checkbox",
                },
            ],
        },
        {
            "id": "accessories",
            "name": "Аксессуары",
            "slug": "accessories",
            "icon": "Watch",
            "filters": [
                {
                    "key": "brand",
                    "label": "Бренд",
                    "type": "select",
                    "options": ["Apple", "Samsung", "Xiaomi", "Huawei"],
                },
                {
                    "key": "type",
                    "label": "Тип",
                    "type": "select",
                    "options": ["Смарт-часы", "Чехлы", "Зарядки", "Кабели"],
                },
            ],
        },
    ]

    for cat in categories:
        cur.execute(
            """
            INSERT OR IGNORE INTO categories (id, name, slug, icon, filters_json)
            VALUES (?, ?, ?, ?, ?)
            """,
            (
                cat["id"],
                cat["name"],
                cat["slug"],
                cat["icon"],
                json.dumps(cat["filters"], ensure_ascii=False),
            ),
        )

    # Баннеры
    banners = [
        {
            "id": 1,
            "title": "Скидки до 30% на смартфоны",
            "subtitle": "Только до конца месяца! Успей купить по выгодной цене.",
            "cta": "Смотреть акции",
            "bg_color": "from-[#5ecf8f] to-[#063827]",
        },
        {
            "id": 2,
            "title": "Новые видеокарты RTX 40 серии",
            "subtitle": "Максимальная производительность для игр и работы.",
            "cta": "Подробнее",
            "bg_color": "from-[#063827] to-[#5ecf8f]",
        },
        {
            "id": 3,
            "title": "Бесплатная доставка по Казахстану",
            "subtitle": "При заказе от 100 000 тенге — доставка бесплатно.",
            "cta": "За покупками",
            "bg_color": "from-[#9fd9b4] to-[#063827]",
        },
    ]

    for b in banners:
        cur.execute(
            """
            INSERT OR IGNORE INTO banners (id, title, subtitle, cta, bg_color)
            VALUES (?, ?, ?, ?, ?)
            """,
            (b["id"], b["title"], b["subtitle"], b["cta"], b["bg_color"]),
        )

    # Продукты (сокращенная версия: копия из frontend/store/data.ts)
    

    


    # Reviews seeding
    reviews_data = [
        {
            "id": "r1",
            "user_id": demo_user_id,
            "product_id": "p1",
            "rating": 5,
            "text": "Отличный телефон! Камера просто бомба, особенно в ночном режиме. Батарею держит уверенно день.",
            "created_at": "2025-02-10T14:30:00Z"
        },
        {
            "id": "r2",
            "user_id": demo_user_id,
            "product_id": "l1",
            "rating": 5,
            "text": "Макбук как всегда на высоте. Экран шикарный, производительность для работы с видео с запасом.",
            "created_at": "2025-02-12T09:15:00Z"
        }
    ]

    for r in reviews_data:
        cur.execute(
            """
            INSERT OR IGNORE INTO reviews (id, user_id, product_id, rating, text, created_at)
            VALUES (?, ?, ?, ?, ?, ?)
            """,
            (r["id"], r["user_id"], r["product_id"], r["rating"], r["text"], r["created_at"])
        )

    conn.commit()
    conn.close()


def row_to_dict(row: sqlite3.Row) -> Dict[str, Any]:
    return {k: row[k] for k in row.keys()}


def _get_or_create_category(category_name_or_slug: str) -> str:
    category_name_or_slug = category_name_or_slug.strip()
    if not category_name_or_slug:
        return "phones"

    conn = get_db_connection()
    cur = conn.cursor()
    # Try exact match on slug or name
    cur.execute("SELECT slug FROM categories WHERE slug = ? OR name = ?", (category_name_or_slug, category_name_or_slug))
    row = cur.fetchone()
    if row:
        conn.close()
        return row["slug"]
    
    # Create new
    import uuid
    new_slug = f"cat-{uuid.uuid4().hex[:8]}"
    cur.execute(
        "INSERT INTO categories (id, name, slug, icon, filters_json) VALUES (?, ?, ?, ?, ?)",
        (new_slug, category_name_or_slug, new_slug, "Box", "[]")
    )
    conn.commit()
    conn.close()
    return new_slug


def generate_tracking_number() -> str:
    import random
    import string

    chars = string.ascii_uppercase + string.digits
    suffix = "".join(random.choice(chars) for _ in range(8))
    return f"MWS-{suffix}"


def create_status_history(status: str) -> List[Dict[str, Any]]:
    now = datetime.utcnow().isoformat() + "Z"
    statuses = [
        {
            "status": "processing",
            "label": "Заказ принят и находится в обработке",
        },
        {
            "status": "packing",
            "label": "Заказ находится на стадии упаковки",
        },
        {
            "status": "shipped",
            "label": "Заказ отправлен и находится в пути",
        },
        {
            "status": "delivered",
            "label": "Заказ доставлен получателю",
        },
    ]
    order = ["processing", "packing", "shipped", "delivered"]
    idx = order.index(status)
    result: List[Dict[str, Any]] = []
    for i, s in enumerate(statuses):
        completed = i <= idx
        result.append(
            {
                "status": s["status"],
                "label": s["label"],
                "completed": completed,
                "date": now if completed else None,
            }
        )
    return result






@app.route("/api/health", methods=["GET"])
def health() -> Any:
    return jsonify({"status": "ok"})


# ---------- Products, categories, banners ----------


@app.route("/api/products", methods=["GET"])
def list_products() -> Any:
    conn = get_db_connection()
    cur = conn.cursor()

    category = request.args.get("category")
    brand = request.args.get("brand")
    search = request.args.get("search")

    min_price = request.args.get("minPrice")
    max_price = request.args.get("maxPrice")

    query = "SELECT p.*, c.name as categoryName FROM products p LEFT JOIN categories c ON p.category = c.slug"
    clauses: List[str] = []
    params: List[Any] = []

    if category:
        clauses.append("p.category = ?")
        params.append(category)
    if brand:
        clauses.append("p.brand = ?")
        params.append(brand)
    if min_price:
        clauses.append("p.price >= ?")
        params.append(min_price)
    if max_price:
        clauses.append("p.price <= ?")
        params.append(max_price)
    if search:
        q = f"%{search.lower()}%"
        clauses.append(
            "(LOWER(p.name) LIKE ? OR LOWER(p.description) LIKE ? OR LOWER(p.brand) LIKE ?)"
        )
        params.extend([q, q, q])

    if clauses:
        query += " WHERE " + " AND ".join(clauses)

    cur.execute(query, params)
    rows = cur.fetchall()
    conn.close()

    products = []
    for r in rows:
        d = row_to_dict(r)
        d["inStock"] = bool(d.pop("in_stock"))
        d["originalPrice"] = d.pop("original_price")
        d["deliveryDays"] = d.pop("delivery_days")
        d.pop("admin_link", None)  # не отдаём покупателю
        d["specs"] = json.loads(d.pop("specs_json"))
        d["images"] = json.loads(d["images_json"]) if d["images_json"] else None
        d.pop("images_json")
        products.append(d)

    return jsonify(products)




UPLOAD_DIR = os.path.join(os.path.dirname(__file__), "uploads")
os.makedirs(UPLOAD_DIR, exist_ok=True)

@app.route("/uploads/<path:filename>")
def serve_upload(filename):
    return send_from_directory(UPLOAD_DIR, filename)

ALLOWED_UPLOAD_EXTENSIONS = {".jpg", ".jpeg", ".png", ".gif", ".webp", ".svg"}

@app.route("/api/admin/upload", methods=["POST"])
def admin_upload():
    admin_guard()
    files = request.files.getlist("files")
    if not files:
        return jsonify({"error": "no files"}), 400

    urls = []
    for f in files:
        original = secure_filename(f.filename or "file")
        ext = os.path.splitext(original)[1].lower()
        if ext not in ALLOWED_UPLOAD_EXTENSIONS:
            return jsonify({"error": f"Файл {original}: недопустимое расширение {ext}"}), 400
        name = f"{uuid.uuid4().hex}{ext}"
        path = os.path.join(UPLOAD_DIR, name)
        f.save(path)
        urls.append(f"/uploads/{name}")

    return jsonify({"urls": urls})


@app.route("/api/upload", methods=["POST"])
def user_upload():
    get_current_user()
    files = request.files.getlist("files")
    if not files:
        return jsonify({"error": "no files"}), 400

    urls = []
    for f in files:
        original = secure_filename(f.filename or "file")
        ext = os.path.splitext(original)[1].lower()
        if ext not in ALLOWED_UPLOAD_EXTENSIONS:
            return jsonify({"error": f"Файл {original}: недопустимое расширение {ext}"}), 400
        name = f"{uuid.uuid4().hex}{ext}"
        path = os.path.join(UPLOAD_DIR, name)
        f.save(path)
        urls.append(f"/uploads/{name}")

    return jsonify({"urls": urls})



@app.route("/api/products/<product_id>", methods=["GET"])
def get_product(product_id: str) -> Any:
    conn = get_db_connection()
    cur = conn.cursor()
    cur.execute("SELECT p.*, c.name as categoryName FROM products p LEFT JOIN categories c ON p.category = c.slug WHERE p.id = ?", (product_id,))
    row = cur.fetchone()
    conn.close()

    if not row:
        return jsonify({"error": "Product not found"}), 404

    d = row_to_dict(row)
    d["inStock"] = bool(d.pop("in_stock"))
    d["originalPrice"] = d.pop("original_price")
    d.pop("admin_link", None)  # не отдаём покупателю
    d["deliveryDays"] = d.pop("delivery_days")
    d["specs"] = json.loads(d.pop("specs_json"))
    d["images"] = json.loads(d["images_json"]) if d["images_json"] else None
    d.pop("images_json")
    return jsonify(d)


@app.route("/api/products/<product_id>/reviews", methods=["GET"])
def get_product_reviews(product_id: str) -> Any:
    conn = get_db_connection()
    cur = conn.cursor()
    cur.execute(
        """
        SELECT r.*, u.first_name, u.last_name, u.nickname
        FROM reviews r
        JOIN users u ON r.user_id = u.id
        WHERE r.product_id = ?
        ORDER BY r.created_at DESC
        """,
        (product_id,),
    )
    rows = cur.fetchall()
    conn.close()

    reviews = []
    for r in rows:
        d = row_to_dict(r)
        d["userId"] = d.pop("user_id")
        d["productId"] = d.pop("product_id")
        d["createdAt"] = d.pop("created_at")
        d["userName"] = d.pop("nickname") or f"{d.pop('first_name')} {d.pop('last_name')}"
        d["images"] = json.loads(d["images_json"]) if d.get("images_json") else []
        d.pop("images_json", None)
        # cleanup if needed
        if "first_name" in d: d.pop("first_name")
        if "last_name" in d: d.pop("last_name")
        reviews.append(d)
    return jsonify(reviews)


@app.route("/api/reviews", methods=["POST"])
def add_review() -> Any:
    user_id = get_current_user()
    data = request.get_json(force=True) or {}
    product_id = data.get("productId")
    rating = data.get("rating")
    text = data.get("text")
    images = data.get("images") or []

    if not all([product_id, rating, text]):
        return jsonify({"error": "Missing required fields"}), 400

    review_id = f"review-{int(datetime.utcnow().timestamp() * 1000)}"
    created_at = datetime.utcnow().isoformat() + "Z"

    conn = get_db_connection()
    cur = conn.cursor()
    cur.execute(
        """
        INSERT INTO reviews (id, user_id, product_id, rating, text, created_at, images_json)
        VALUES (?, ?, ?, ?, ?, ?, ?)
        """,
        (review_id, user_id, product_id, int(rating), text, created_at, json.dumps(images)),
    )
    conn.commit()

    # Recalculate rating for product
    cur.execute("SELECT rating FROM reviews WHERE product_id = ?", (product_id,))
    ratings = [row["rating"] for row in cur.fetchall()]
    new_avg = sum(ratings) / len(ratings) if ratings else 0
    new_count = len(ratings)

    cur.execute(
        "UPDATE products SET rating = ?, reviews_count = ? WHERE id = ?",
        (round(new_avg, 1), new_count, product_id),
    )
    conn.commit()
    conn.close()

    return jsonify({"success": True, "id": review_id, "rating": round(new_avg, 1), "reviewsCount": new_count}), 201


@app.route("/api/categories", methods=["GET"])
def list_categories() -> Any:
    conn = get_db_connection()
    cur = conn.cursor()
    cur.execute("SELECT * FROM categories")
    rows = cur.fetchall()
    conn.close()

    cats = []
    for r in rows:
        d = row_to_dict(r)
        d["filters"] = json.loads(d.pop("filters_json"))
        cats.append(d)
    return jsonify(cats)


@app.route("/api/banners", methods=["GET"])
def list_banners() -> Any:
    conn = get_db_connection()
    cur = conn.cursor()
    cur.execute("SELECT * FROM banners ORDER BY id")
    rows = cur.fetchall()
    conn.close()

    banners = []
    for r in rows:
        d = row_to_dict(r)
        d["bgColor"] = d.pop("bg_color")
        banners.append(d)
    return jsonify(banners)


# ---------- Auth ----------


@app.route("/api/auth/login", methods=["POST"])
def login() -> Any:
    data = request.get_json(force=True) or {}
    email = data.get("email")
    password = data.get("password")

    if not email or not password:
        return jsonify({"success": False, "error": "Email и пароль обязательны"}), 400

    conn = get_db_connection()
    cur = conn.cursor()
    cur.execute("SELECT * FROM users WHERE email = ?", (email,))
    row = cur.fetchone()
    conn.close()

    if not row:
        return jsonify({"success": False, "error": "Неверный email или пароль"}), 401

    user = row_to_dict(row)

    # Проверяем пароль
    if not user.get("password_hash") or not check_password_hash(user["password_hash"], password):
        return jsonify({"success": False, "error": "Неверный email или пароль"}), 401

    # Генерируем токен
    token = create_user_token(user["id"])

    user.pop("password_hash", None)
    user["firstName"] = user.pop("first_name")
    user["lastName"] = user.pop("last_name")
    user["createdAt"] = user.pop("created_at")

    # адреса
    conn = get_db_connection()
    cur = conn.cursor()
    cur.execute("SELECT * FROM addresses WHERE user_id = ?", (user["id"],))
    addr_rows = cur.fetchall()
    conn.close()
    addresses = []
    for a in addr_rows:
        ad = row_to_dict(a)
        ad["isDefault"] = bool(ad.pop("is_default"))
        addresses.append(ad)
    user["addresses"] = addresses

    return jsonify({"success": True, "user": user, "token": token})


@app.route("/api/auth/register", methods=["POST"])
def register() -> Any:
    data = request.get_json(force=True) or {}
    email = data.get("email")
    phone = data.get("phone")
    first_name = data.get("firstName")
    last_name = data.get("lastName")
    password = data.get("password")

    if not all([email, phone, first_name, last_name, password]):
        return jsonify({"success": False, "error": "Заполните все поля"}), 400

    if len(password) < 6:
        return jsonify({"success": False, "error": "Пароль должен быть не менее 6 символов"}), 400

    conn = get_db_connection()
    cur = conn.cursor()
    cur.execute("SELECT 1 FROM users WHERE email = ?", (email,))
    if cur.fetchone():
        conn.close()
        return jsonify({"success": False, "error": "Пользователь с таким email уже существует"}), 400

    user_id = f"user-{int(datetime.utcnow().timestamp() * 1000)}"
    created_at = datetime.utcnow().isoformat() + "Z"
    password_hash = generate_password_hash(password)
    cur.execute(
        """
        INSERT INTO users (id, email, password_hash, phone, first_name, last_name, nickname, avatar, role, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """,
        (user_id, email, password_hash, phone, first_name, last_name, None, None, "customer", created_at),
    )
    conn.commit()
    conn.close()

    token = create_user_token(user_id)

    user = {
        "id": user_id,
        "email": email,
        "phone": phone,
        "firstName": first_name,
        "lastName": last_name,
        "role": "customer",
        "addresses": [],
        "createdAt": created_at,
    }

    return jsonify({"success": True, "user": user, "token": token})


@app.route("/api/users/<user_id>/profile", methods=["PATCH"])
def update_profile(user_id: str) -> Any:
    current = get_current_user()
    if current != user_id:
        return jsonify({"error": "Доступ запрещён"}), 403

    data = request.get_json(force=True) or {}
    fields = []
    params: List[Any] = []

    if "firstName" in data:
        fields.append("first_name = ?")
        params.append(data["firstName"])
    if "lastName" in data:
        fields.append("last_name = ?")
        params.append(data["lastName"])
    if "nickname" in data:
        fields.append("nickname = ?")
        params.append(data["nickname"])
    if "phone" in data:
        fields.append("phone = ?")
        params.append(data["phone"])

    if not fields:
        return jsonify({"success": False, "error": "Нет данных для обновления"}), 400

    params.append(user_id)
    conn = get_db_connection()
    cur = conn.cursor()
    cur.execute(f"UPDATE users SET {', '.join(fields)} WHERE id = ?", params)
    conn.commit()
    cur.execute("SELECT * FROM users WHERE id = ?", (user_id,))
    row = cur.fetchone()
    conn.close()

    if not row:
        return jsonify({"success": False, "error": "Пользователь не найден"}), 404

    user = row_to_dict(row)
    user.pop("password_hash", None)
    user["firstName"] = user.pop("first_name")
    user["lastName"] = user.pop("last_name")
    user["createdAt"] = user.pop("created_at")
    return jsonify({"success": True, "user": user})


@app.route("/api/users/<user_id>/addresses", methods=["POST"])
def add_address(user_id: str) -> Any:
    current = get_current_user()
    if current != user_id:
        return jsonify({"error": "Доступ запрещён"}), 403

    data = request.get_json(force=True) or {}
    addr_id = f"addr-{int(datetime.utcnow().timestamp() * 1000)}"

    is_default = 1 if data.get("isDefault") else 0

    conn = get_db_connection()
    cur = conn.cursor()

    if is_default:
        cur.execute(
            "UPDATE addresses SET is_default = 0 WHERE user_id = ?",
            (user_id,),
        )

    cur.execute(
        """
        INSERT INTO addresses (
            id, user_id, type, city, district, street, building,
            apartment, postal_code, is_default
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """,
        (
            addr_id,
            user_id,
            data.get("type", "Дом"),
            data.get("city"),
            data.get("district"),
            data.get("street"),
            data.get("building"),
            data.get("apartment"),
            data.get("postalCode"),
            is_default,
        ),
    )
    conn.commit()
    cur.execute("SELECT * FROM addresses WHERE id = ?", (addr_id,))
    row = cur.fetchone()
    conn.close()

    addr = row_to_dict(row)
    addr["isDefault"] = bool(addr.pop("is_default"))
    return jsonify(addr), 201


@app.route("/api/users/<user_id>/addresses/<address_id>", methods=["DELETE"])
def delete_address(user_id: str, address_id: str) -> Any:
    current = get_current_user()
    if current != user_id:
        return jsonify({"error": "Доступ запрещён"}), 403

    conn = get_db_connection()
    cur = conn.cursor()
    cur.execute(
        "DELETE FROM addresses WHERE id = ? AND user_id = ?",
        (address_id, user_id),
    )
    conn.commit()
    conn.close()
    return "", 204





# ---------- Cart ----------


@app.route("/api/cart", methods=["GET"])
def get_cart() -> Any:
    user_id = get_current_user()

    conn = get_db_connection()
    cur = conn.cursor()
    cur.execute(
        """
        SELECT ci.*, p.price
        FROM cart_items ci
        JOIN products p ON ci.product_id = p.id
        WHERE ci.cart_user_id = ?
        """,
        (user_id,),
    )
    rows = cur.fetchall()

    items = []
    for r in rows:
        d = row_to_dict(r)
        cur.execute("SELECT * FROM products WHERE id = ?", (d["product_id"],))
        pr = cur.fetchone()
        if pr:
            pd = row_to_dict(pr)
            pd["inStock"] = bool(pd.pop("in_stock"))
            pd["originalPrice"] = pd.pop("original_price")
            pd["deliveryDays"] = pd.pop("delivery_days")
            pd.pop("admin_link", None)
            pd["specs"] = json.loads(pd.pop("specs_json"))
            pd["images"] = json.loads(pd["images_json"]) if pd["images_json"] else None
            pd.pop("images_json")
            items.append(
                {
                    "product": pd,
                    "quantity": d["quantity"],
                }
            )

    conn.close()
    return jsonify(items)


def _get_cart_items_for_user(user_id: str) -> list:
    """Internal helper to fetch cart items (reused by sync_cart)."""
    conn = get_db_connection()
    cur = conn.cursor()
    cur.execute(
        """
        SELECT ci.*, p.price
        FROM cart_items ci
        JOIN products p ON ci.product_id = p.id
        WHERE ci.cart_user_id = ?
        """,
        (user_id,),
    )
    rows = cur.fetchall()
    items = []
    for r in rows:
        d = row_to_dict(r)
        cur.execute("SELECT * FROM products WHERE id = ?", (d["product_id"],))
        pr = cur.fetchone()
        if pr:
            pd = row_to_dict(pr)
            pd["inStock"] = bool(pd.pop("in_stock"))
            pd["originalPrice"] = pd.pop("original_price")
            pd["deliveryDays"] = pd.pop("delivery_days")
            pd.pop("admin_link", None)
            pd["specs"] = json.loads(pd.pop("specs_json"))
            pd["images"] = json.loads(pd["images_json"]) if pd["images_json"] else None
            pd.pop("images_json")
            items.append({"product": pd, "quantity": d["quantity"]})
    conn.close()
    return items


@app.route("/api/cart/sync", methods=["POST"])
def sync_cart() -> Any:
    user_id = get_current_user()
    data = request.get_json(force=True) or {}
    local_items = data.get("items", [])

    conn = get_db_connection()
    cur = conn.cursor()

    cur.execute(
        "INSERT OR IGNORE INTO carts (user_id, created_at, updated_at) VALUES (?, ?, ?)",
        (user_id, datetime.utcnow().isoformat() + "Z", datetime.utcnow().isoformat() + "Z"),
    )

    for item in local_items:
        product_id = item["product"]["id"]
        quantity = item["quantity"]
        cur.execute(
            "SELECT id, quantity FROM cart_items WHERE cart_user_id = ? AND product_id = ?",
            (user_id, product_id),
        )
        existing = cur.fetchone()
        if existing:
            cur.execute(
                "UPDATE cart_items SET quantity = ? WHERE id = ?", (quantity, existing["id"])
            )
        else:
            cur.execute(
                "INSERT INTO cart_items (cart_user_id, product_id, quantity) VALUES (?, ?, ?)",
                (user_id, product_id, quantity),
            )

    conn.commit()
    conn.close()

    return jsonify(_get_cart_items_for_user(user_id))


@app.route("/api/cart/items", methods=["POST"])
def add_to_cart() -> Any:
    user_id = get_current_user()
    data = request.get_json(force=True) or {}
    product_id = data.get("productId")
    quantity = data.get("quantity", 1)

    if not product_id:
        return jsonify({"error": "Missing productId"}), 400

    conn = get_db_connection()
    cur = conn.cursor()

    # Проверяем наличие товара
    cur.execute("SELECT in_stock FROM products WHERE id = ?", (product_id,))
    prod = cur.fetchone()
    if not prod or not prod["in_stock"]:
        conn.close()
        return jsonify({"error": "Товар недоступен"}), 400

    cur.execute(
        "INSERT OR IGNORE INTO carts (user_id, created_at, updated_at) VALUES (?, ?, ?)",
        (user_id, datetime.utcnow().isoformat() + "Z", datetime.utcnow().isoformat() + "Z"),
    )

    cur.execute(
        "SELECT id, quantity FROM cart_items WHERE cart_user_id = ? AND product_id = ?",
        (user_id, product_id),
    )
    existing = cur.fetchone()
    if existing:
        new_q = existing["quantity"] + quantity
        cur.execute("UPDATE cart_items SET quantity = ? WHERE id = ?", (new_q, existing["id"]))
    else:
        cur.execute(
            "INSERT INTO cart_items (cart_user_id, product_id, quantity) VALUES (?, ?, ?)",
            (user_id, product_id, quantity),
        )

    conn.commit()
    conn.close()
    return jsonify({"success": True})


@app.route("/api/cart/items", methods=["PUT"])
def update_cart_item() -> Any:
    user_id = get_current_user()
    data = request.get_json(force=True) or {}
    product_id = data.get("productId")
    quantity = data.get("quantity")

    if not product_id or quantity is None:
        return jsonify({"error": "Missing fields"}), 400

    if quantity <= 0:
        return _remove_cart_item(user_id, product_id)

    conn = get_db_connection()
    cur = conn.cursor()
    cur.execute(
        "UPDATE cart_items SET quantity = ? WHERE cart_user_id = ? AND product_id = ?",
        (quantity, user_id, product_id),
    )
    conn.commit()
    conn.close()
    return jsonify({"success": True})


def _remove_cart_item(user_id: str, product_id: str) -> Any:
    conn = get_db_connection()
    cur = conn.cursor()
    cur.execute(
        "DELETE FROM cart_items WHERE cart_user_id = ? AND product_id = ?",
        (user_id, product_id),
    )
    conn.commit()
    conn.close()
    return jsonify({"success": True})


@app.route("/api/cart/items/<product_id>", methods=["DELETE"])
def remove_from_cart(product_id: str) -> Any:
    user_id = get_current_user()
    return _remove_cart_item(user_id, product_id)


# ---------- Newsletter ----------


@app.route("/api/newsletter", methods=["POST"])
def subscribe_newsletter() -> Any:
    data = request.get_json(force=True) or {}
    email = data.get("email")

    if not email:
        return jsonify({"error": "Email required"}), 400

    conn = get_db_connection()
    cur = conn.cursor()
    cur.execute(
        "INSERT OR IGNORE INTO subscribers (email, created_at) VALUES (?, ?)",
        (email, datetime.utcnow().isoformat() + "Z"),
    )
    conn.commit()
    conn.close()
    return jsonify({"success": True})


# ---------- Orders ----------


@app.route("/api/orders", methods=["POST"])
def create_order() -> Any:
    user_id = get_current_user()
    data = request.get_json(force=True) or {}
    items = data.get("items") or []
    address = data.get("address")

    if not items or not address:
        return jsonify({"error": "Некорректные данные заказа"}), 400

    conn = get_db_connection()
    cur = conn.cursor()

    # Серверный расчёт цен — не доверяем клиенту
    subtotal = 0
    verified_items = []
    for item in items:
        product = item.get("product") or {}
        product_id = product.get("id")
        quantity = int(item.get("quantity", 1))
        if not product_id or quantity <= 0:
            conn.close()
            return jsonify({"error": "Некорректные данные товара"}), 400

        cur.execute("SELECT id, price, in_stock FROM products WHERE id = ?", (product_id,))
        db_prod = cur.fetchone()
        if not db_prod:
            conn.close()
            return jsonify({"error": f"Товар {product_id} не найден"}), 400
        if not db_prod["in_stock"]:
            conn.close()
            return jsonify({"error": f"Товар {product_id} нет в наличии"}), 400

        price = db_prod["price"]
        subtotal += price * quantity
        verified_items.append({"product_id": product_id, "quantity": quantity, "price": price})

    delivery_price = 0 if subtotal >= 100000 else 3500
    tax = round(subtotal * 0.12)
    total_price = subtotal + delivery_price + tax

    order_id = f"order-{int(datetime.utcnow().timestamp() * 1000)}"
    tracking_number = generate_tracking_number()
    created_at = datetime.utcnow().isoformat() + "Z"
    estimated_delivery = (datetime.utcnow() + timedelta(days=7)).isoformat() + "Z"
    status = "processing"
    status_history = create_status_history(status)

    cur.execute(
        """
        INSERT INTO orders (
            id, user_id, tracking_number, total_price, delivery_price,
            tax, status, address_json, created_at, estimated_delivery
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """,
        (
            order_id,
            user_id,
            tracking_number,
            total_price,
            delivery_price,
            tax,
            status,
            json.dumps(address, ensure_ascii=False),
            created_at,
            estimated_delivery,
        ),
    )

    for vi in verified_items:
        cur.execute(
            """
            INSERT INTO order_items (order_id, product_id, quantity, price)
            VALUES (?, ?, ?, ?)
            """,
            (order_id, vi["product_id"], vi["quantity"], vi["price"]),
        )

    for entry in status_history:
        cur.execute(
            """
            INSERT INTO order_status_history (order_id, status, label, date, completed)
            VALUES (?, ?, ?, ?, ?)
            """,
            (
                order_id,
                entry["status"],
                entry["label"],
                entry["date"],
                1 if entry["completed"] else 0,
            ),
        )

    conn.commit()

    # Собираем полную структуру заказа
    cur.execute("SELECT * FROM orders WHERE id = ?", (order_id,))
    order_row = cur.fetchone()
    cur.execute("SELECT * FROM order_items WHERE order_id = ?", (order_id,))
    item_rows = cur.fetchall()
    cur.execute("SELECT * FROM order_status_history WHERE order_id = ?", (order_id,))
    history_rows = cur.fetchall()
    conn.close()

    order = row_to_dict(order_row)
    order["trackingNumber"] = order.pop("tracking_number")
    order["totalPrice"] = order.pop("total_price")
    order["deliveryPrice"] = order.pop("delivery_price")
    order["createdAt"] = order.pop("created_at")
    order["estimatedDelivery"] = order.pop("estimated_delivery")
    order["address"] = json.loads(order.pop("address_json"))

    conn = get_db_connection()
    cur = conn.cursor()
    items_out = []
    for ir in item_rows:
        ir_d = row_to_dict(ir)
        cur.execute("SELECT * FROM products WHERE id = ?", (ir_d["product_id"],))
        pr = cur.fetchone()
        if pr:
            pd = row_to_dict(pr)
            pd["inStock"] = bool(pd.pop("in_stock"))
            pd["originalPrice"] = pd.pop("original_price")
            pd["deliveryDays"] = pd.pop("delivery_days")
            pd.pop("admin_link", None)
            pd["specs"] = json.loads(pd.pop("specs_json"))
            pd["images"] = json.loads(pd["images_json"]) if pd["images_json"] else None
            pd.pop("images_json")
            items_out.append({"product": pd, "quantity": ir_d["quantity"]})
    conn.close()
    order["items"] = items_out

    status_history_out = []
    for hr in history_rows:
        hd = row_to_dict(hr)
        status_history_out.append(
            {
                "status": hd["status"],
                "label": hd["label"],
                "date": hd["date"],
                "completed": bool(hd["completed"]),
            }
        )
    order["statusHistory"] = status_history_out

    return jsonify(order), 201


#review

@app.route("/api/users/<user_id>/reviews", methods=["GET"])
def get_reviews_by_user(user_id: str) -> Any:
    current = get_current_user()
    if current != user_id:
        return jsonify({"error": "Доступ запрещён"}), 403

    conn = get_db_connection()
    cur = conn.cursor()

    cur.execute(
        """
        SELECT
            r.id,
            r.user_id,
            r.product_id,
            r.rating,
            r.text,
            r.created_at,
            r.images_json,
            p.name AS product_name,
            p.image AS product_image
        FROM reviews r
        JOIN products p ON r.product_id = p.id
        WHERE r.user_id = ?
        ORDER BY r.created_at DESC
        """,
        (user_id,),
    )
    rows = cur.fetchall()
    conn.close()

    out = []
    for row in rows:
        d = row_to_dict(row)
        d["userId"] = d.pop("user_id")
        d["productId"] = d.pop("product_id")
        d["createdAt"] = d.pop("created_at")
        d["productName"] = d.pop("product_name")
        d["productImage"] = d.pop("product_image")
        d["images"] = json.loads(d["images_json"]) if d.get("images_json") else []
        d.pop("images_json", None)
        out.append(d)

    return jsonify(out)


#рабочее отслеживание

@app.route("/api/users/<user_id>/orders", methods=["GET"])
def get_user_orders(user_id: str):
    current = get_current_user()
    if current != user_id:
        return jsonify({"error": "Доступ запрещён"}), 403

    conn = get_db_connection()
    cur = conn.cursor()

    cur.execute("""
        SELECT * FROM orders
        WHERE user_id = ?
        ORDER BY created_at DESC
    """, (user_id,))
    order_rows = cur.fetchall()

    orders = []
    for row in order_rows:
        o = row_to_dict(row)
        order_id = o["id"]

        # items
        cur.execute("SELECT * FROM order_items WHERE order_id = ?", (order_id,))
        item_rows = cur.fetchall()

        items_out = []
        for ir in item_rows:
            ir_d = row_to_dict(ir)
            cur.execute("SELECT * FROM products WHERE id = ?", (ir_d["product_id"],))
            pr = cur.fetchone()
            if pr:
                pd = row_to_dict(pr)
                pd["inStock"] = bool(pd.pop("in_stock"))
                pd["originalPrice"] = pd.pop("original_price")
                pd["deliveryDays"] = pd.pop("delivery_days")
                pd["specs"] = json.loads(pd.pop("specs_json"))
                pd["images"] = json.loads(pd["images_json"]) if pd["images_json"] else None
                pd.pop("images_json")
                items_out.append({"product": pd, "quantity": ir_d["quantity"]})

        # status history
        cur.execute("SELECT * FROM order_status_history WHERE order_id = ? ORDER BY id ASC", (order_id,))
        history_rows = cur.fetchall()
        status_history_out = [
            {
                "status": h["status"],
                "label": h["label"],
                "date": h["date"],
                "completed": bool(h["completed"]),
            }
            for h in history_rows
        ]

        o["trackingNumber"] = o.pop("tracking_number")
        o["totalPrice"] = o.pop("total_price")
        o["deliveryPrice"] = o.pop("delivery_price")
        o["createdAt"] = o.pop("created_at")
        o["estimatedDelivery"] = o.pop("estimated_delivery")
        o["address"] = json.loads(o.pop("address_json"))
        o["items"] = items_out
        o["statusHistory"] = status_history_out

        orders.append(o)

    conn.close()
    return jsonify(orders)



#Admil_panel 

def admin_guard():
    auth = request.headers.get("Authorization", "")
    # ожидаем: Authorization: Bearer <token>
    if not auth.startswith("Bearer "):
        abort(401)
    token = auth.removeprefix("Bearer ").strip()
    payload = verify_admin_token(token)
    if not payload:
        abort(401)

def fetch_orders_for_user(cur: sqlite3.Cursor, user_id: str):
    cur.execute("""
        SELECT * FROM orders
        WHERE user_id = ?
        ORDER BY created_at DESC
    """, (user_id,))
    orders = []
    for row in cur.fetchall():
        d = row_to_dict(row)
        d["trackingNumber"] = d.pop("tracking_number")
        d["totalPrice"] = d.pop("total_price")
        d["deliveryPrice"] = d.pop("delivery_price")
        d["createdAt"] = d.pop("created_at")
        d["estimatedDelivery"] = d.pop("estimated_delivery")
        d["isNewForAdmin"] = bool(d.get("is_new_for_admin", 0))
        d["address"] = json.loads(d.pop("address_json"))
        orders.append(d)
    return orders

@app.route("/api/admin/dashboard", methods=["GET"])
def admin_dashboard():
    admin_guard()
    conn = get_db_connection()
    cur = conn.cursor()

    # users
    cur.execute("""
        SELECT id, email, first_name, last_name, nickname, role, created_at
        FROM users
        ORDER BY created_at DESC
    """)
    users_rows = cur.fetchall()

    users = []
    for u in users_rows:
        ud = row_to_dict(u)
        ud["firstName"] = ud.pop("first_name")
        ud["lastName"] = ud.pop("last_name")
        ud["createdAt"] = ud.pop("created_at")
        # заказы пользователя
        ud["orders"] = fetch_orders_for_user(cur, ud["id"])
        users.append(ud)

    # new orders counter
    cur.execute("SELECT COUNT(*) AS c FROM orders WHERE is_new_for_admin = 1")
    new_orders = cur.fetchone()["c"]

    conn.close()
    return jsonify({"users": users, "newOrders": new_orders})


@app.route("/api/admin/products/<product_id>", methods=["DELETE"])
def admin_delete_product(product_id: str):
    admin_guard()  # ✅ защита как у других админ-роутов

    conn = get_db_connection()
    cur = conn.cursor()

    # проверим что продукт существует
    cur.execute("SELECT id FROM products WHERE id = ?", (product_id,))
    row = cur.fetchone()
    if not row:
        conn.close()
        return jsonify({"error": "Product not found"}), 404

    # если хочешь "каскад" вручную: удаляем связанные данные
    cur.execute("DELETE FROM cart_items WHERE product_id = ?", (product_id,))
    cur.execute("DELETE FROM order_items WHERE product_id = ?", (product_id,))
    cur.execute("DELETE FROM reviews WHERE product_id = ?", (product_id,))

    # удаляем сам продукт
    cur.execute("DELETE FROM products WHERE id = ?", (product_id,))
    conn.commit()
    conn.close()

    return "", 204


@app.route("/api/admin/orders/<order_id>", methods=["GET"])
def admin_get_order(order_id: str):
    admin_guard()
    conn = get_db_connection()
    cur = conn.cursor()

    cur.execute("SELECT * FROM orders WHERE id = ?", (order_id,))
    order_row = cur.fetchone()
    if not order_row:
        conn.close()
        return jsonify({"error": "Order not found"}), 404

    order = row_to_dict(order_row)

    # mark as read
    cur.execute("UPDATE orders SET is_new_for_admin = 0 WHERE id = ?", (order_id,))
    conn.commit()

    cur.execute("SELECT * FROM order_items WHERE order_id = ?", (order_id,))
    items_rows = cur.fetchall()

    cur.execute("SELECT * FROM order_status_history WHERE order_id = ? ORDER BY id ASC", (order_id,))
    history_rows = cur.fetchall()

    # attach user
    cur.execute("SELECT id, email, first_name, last_name, nickname FROM users WHERE id = ?", (order["user_id"],))
    user_row = cur.fetchone()

    conn.close()

    out = order
    out["trackingNumber"] = out.pop("tracking_number")
    out["totalPrice"] = out.pop("total_price")
    out["deliveryPrice"] = out.pop("delivery_price")
    out["createdAt"] = out.pop("created_at")
    out["estimatedDelivery"] = out.pop("estimated_delivery")
    out["address"] = json.loads(out.pop("address_json"))
    out["isNewForAdmin"] = bool(out.get("is_new_for_admin", 0))

    # items with products
    conn = get_db_connection()
    cur = conn.cursor()
    items_out = []
    for ir in items_rows:
        ir_d = row_to_dict(ir)
        cur.execute("SELECT * FROM products WHERE id = ?", (ir_d["product_id"],))
        pr = cur.fetchone()
        if pr:
            pd = row_to_dict(pr)
            pd["inStock"] = bool(pd.pop("in_stock"))
            pd["originalPrice"] = pd.pop("original_price")
            pd["deliveryDays"] = pd.pop("delivery_days")
            pd["specs"] = json.loads(pd.pop("specs_json"))
            pd["images"] = json.loads(pd["images_json"]) if pd["images_json"] else None
            pd.pop("images_json")
            items_out.append({"product": pd, "quantity": ir_d["quantity"]})
    conn.close()
    out["items"] = items_out

    # status history
    out["statusHistory"] = [
        {
            "id": row["id"],
            "status": row["status"],
            "label": row["label"],
            "date": row["date"],
            "completed": bool(row["completed"]),
        }
        for row in history_rows
    ]

    # user
    if user_row:
        u = row_to_dict(user_row)
        out["user"] = {
            "id": u["id"],
            "email": u["email"],
            "nickname": u["nickname"],
            "fullName": f"{u['first_name']} {u['last_name']}".strip(),
        }
    return jsonify(out)


@app.route("/api/admin/orders/<order_id>/status", methods=["PATCH"])
def admin_update_order_status(order_id: str):
    """
    Принимает массив чекпоинтов:
    [
      { "status":"in_transit", "label":"В пути", "completed":true, "date":"..." },
      ...
    ]
    """
    admin_guard()
    data = request.get_json(force=True) or {}
    checkpoints = data.get("statusHistory")
    if not isinstance(checkpoints, list) or len(checkpoints) == 0:
        return jsonify({"error": "statusHistory required"}), 400

    conn = get_db_connection()
    cur = conn.cursor()

    # убедимся что заказ есть
    cur.execute("SELECT id FROM orders WHERE id = ?", (order_id,))
    if not cur.fetchone():
        conn.close()
        return jsonify({"error": "Order not found"}), 404

    # удаляем старую историю и пишем новую (проще и надежнее)
    cur.execute("DELETE FROM order_status_history WHERE order_id = ?", (order_id,))

    # вычислим текущий общий статус: последний completed == true
    last_completed = None
    for cp in checkpoints:
        if cp.get("completed"):
            last_completed = cp.get("status")

    overall_status = last_completed or "processing"

    for cp in checkpoints:
        cur.execute(
            """
            INSERT INTO order_status_history (order_id, status, label, date, completed)
            VALUES (?, ?, ?, ?, ?)
            """,
            (
                order_id,
                cp.get("status"),
                cp.get("label"),
                cp.get("date") if cp.get("completed") else None,
                1 if cp.get("completed") else 0,
            ),
        )

    cur.execute("UPDATE orders SET status = ? WHERE id = ?", (overall_status, order_id))

    conn.commit()
    conn.close()
    return jsonify({"success": True, "status": overall_status})


@app.route("/api/admin/users/<user_id>", methods=["DELETE"])
def admin_delete_user(user_id: str):
    admin_guard()
    conn = get_db_connection()
    cur = conn.cursor()

    # каскад вручную (SQLite без ON DELETE CASCADE тут)
    cur.execute("SELECT id FROM orders WHERE user_id = ?", (user_id,))
    order_ids = [r["id"] for r in cur.fetchall()]

    for oid in order_ids:
        cur.execute("DELETE FROM order_items WHERE order_id = ?", (oid,))
        cur.execute("DELETE FROM order_status_history WHERE order_id = ?", (oid,))
    cur.execute("DELETE FROM orders WHERE user_id = ?", (user_id,))
    cur.execute("DELETE FROM cart_items WHERE cart_user_id = ?", (user_id,))
    cur.execute("DELETE FROM carts WHERE user_id = ?", (user_id,))
    cur.execute("DELETE FROM addresses WHERE user_id = ?", (user_id,))
    cur.execute("DELETE FROM reviews WHERE user_id = ?", (user_id,))
    cur.execute("DELETE FROM users WHERE id = ?", (user_id,))

    conn.commit()
    conn.close()
    return "", 204


@app.route("/api/admin/products", methods=["POST"])
def admin_create_product():
    admin_guard()
    data = request.get_json(force=True) or {}

    required = ["name", "category", "price", "currency", "image", "description", "specs", "brand", "deliveryDays"]
    if not all(k in data for k in required):
        return jsonify({"error": f"Missing fields. Required: {required}"}), 400

    product_id = data.get("id") or f"prod-{int(datetime.utcnow().timestamp() * 1000)}"

    category_slug = _get_or_create_category(data["category"])

    conn = get_db_connection()
    cur = conn.cursor()
    cur.execute(
        """
        INSERT INTO products (
            id, name, category, subcategory, price, original_price, currency,
            image, images_json, description, specs_json, in_stock, rating,
            reviews_count, brand, delivery_days, admin_link
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """,
        (
            product_id,
            data["name"],
            category_slug,
            data.get("subcategory"),
            int(data["price"]),
            int(data["originalPrice"]) if data.get("originalPrice") else None,
            data["currency"],
            data["image"],
            json.dumps(data["images"], ensure_ascii=False) if data.get("images") else None,
            data["description"],
            json.dumps(data["specs"], ensure_ascii=False),
            1 if data.get("inStock", True) else 0,
            float(data.get("rating", 0)),
            int(data.get("reviewsCount", 0)),
            data["brand"],
            int(data["deliveryDays"]),
            data.get("adminLink"),  # ✅ только для админа
        ),
    )
    conn.commit()
    conn.close()

    return jsonify({"success": True, "id": product_id}), 201


@app.route("/api/admin/auth/login", methods=["POST"])
def admin_login():

    data = request.get_json(silent=True) or {}

    email = (data.get("email") or "").strip().lower()
    password = data.get("password") or ""

    admin_email = (os.getenv("ADMIN_EMAIL") or "").strip().lower()
    admin_hash = os.getenv("ADMIN_PASSWORD_HASH") or ""

    #удалена отладочная информация

    if not admin_email or not admin_hash:
        return jsonify(success=False, error="ADMIN_EMAIL / ADMIN_PASSWORD_HASH is not set"), 500

    if email != admin_email:
        return jsonify(success=False, error="Неверный логин или пароль"), 401

    if not check_password_hash(admin_hash, password):
        return jsonify(success=False, error="Неверный логин или пароль"), 401

    token = create_admin_token(email)
    return jsonify(success=True, token=token)


@app.route("/api/admin/auth/me", methods=["GET"])
def admin_me():
    admin_guard()
    return jsonify({"ok": True})


@app.route("/api/admin/products", methods=["GET"])
def admin_list_products():
    admin_guard()
    conn = get_db_connection()
    cur = conn.cursor()

    cur.execute("SELECT p.*, c.name as categoryName FROM products p LEFT JOIN categories c ON p.category = c.slug ORDER BY p.id DESC")
    rows = cur.fetchall()
    conn.close()

    out = []
    for r in rows:
        d = row_to_dict(r)
        d["inStock"] = bool(d.pop("in_stock"))
        d["originalPrice"] = d.pop("original_price")
        d["deliveryDays"] = d.pop("delivery_days")
        d["adminLink"] = d.pop("admin_link", None)
        d["specs"] = json.loads(d.pop("specs_json"))
        d["images"] = json.loads(d["images_json"]) if d["images_json"] else None
        d.pop("images_json")
        out.append(d)

    return jsonify(out)


@app.route("/api/admin/products/<product_id>", methods=["GET"])
def admin_get_product(product_id: str):
    admin_guard()
    conn = get_db_connection()
    cur = conn.cursor()
    cur.execute("SELECT p.*, c.name as categoryName FROM products p LEFT JOIN categories c ON p.category = c.slug WHERE p.id = ?", (product_id,))
    row = cur.fetchone()
    conn.close()

    if not row:
        return jsonify({"error": "Product not found"}), 404

    d = row_to_dict(row)
    d["inStock"] = bool(d.pop("in_stock"))
    d["adminLink"] = d.pop("admin_link", None)
    d["originalPrice"] = d.pop("original_price")
    d["deliveryDays"] = d.pop("delivery_days")
    d["specs"] = json.loads(d.pop("specs_json"))
    d["images"] = json.loads(d["images_json"]) if d["images_json"] else None
    d.pop("images_json")
    return jsonify(d)


@app.route("/api/admin/products/<product_id>", methods=["PATCH"])
def admin_update_product(product_id: str):
    admin_guard()
    data = request.get_json(force=True) or {}

    # Разрешенные поля для обновления
    mapping = {
        "name": "name",
        "category": "category",
        "subcategory": "subcategory",
        "price": "price",
        "originalPrice": "original_price",
        "currency": "currency",
        "image": "image",
        "images": "images_json",
        "description": "description",
        "specs": "specs_json",
        "inStock": "in_stock",
        "rating": "rating",
        "reviewsCount": "reviews_count",
        "brand": "brand",
        "deliveryDays": "delivery_days",
        "adminLink": "admin_link",
    }

    fields = []
    params = []

    for k, col in mapping.items():
        if k not in data:
            continue

        val = data[k]

        if col == "images_json":
            val = json.dumps(val, ensure_ascii=False) if val else None
        elif col == "specs_json":
            val = json.dumps(val or {}, ensure_ascii=False)
        elif col == "in_stock":
            val = 1 if bool(val) else 0
        elif col == "category":
            val = _get_or_create_category(val)

        fields.append(f"{col} = ?")
        params.append(val)

    if not fields:
        return jsonify({"error": "No fields to update"}), 400

    params.append(product_id)

    conn = get_db_connection()
    cur = conn.cursor()
    cur.execute(f"UPDATE products SET {', '.join(fields)} WHERE id = ?", params)
    conn.commit()
    conn.close()

    return jsonify({"success": True})



#End admin panel


@app.route("/api/orders/tracking/<tracking_number>", methods=["GET"])
def get_order_by_tracking(tracking_number: str) -> Any:
    conn = get_db_connection()
    cur = conn.cursor()
    cur.execute("SELECT * FROM orders WHERE tracking_number = ?", (tracking_number,))
    order_row = cur.fetchone()
    if not order_row:
        conn.close()
        return jsonify({"error": "Order not found"}), 404

    order = row_to_dict(order_row)
    order_id = order["id"]

    cur.execute("SELECT * FROM order_items WHERE order_id = ?", (order_id,))
    item_rows = cur.fetchall()
    cur.execute("SELECT * FROM order_status_history WHERE order_id = ?", (order_id,))
    history_rows = cur.fetchall()
    conn.close()

    order["trackingNumber"] = order.pop("tracking_number")
    order["totalPrice"] = order.pop("total_price")
    order["deliveryPrice"] = order.pop("delivery_price")
    order["createdAt"] = order.pop("created_at")
    order["estimatedDelivery"] = order.pop("estimated_delivery")
    order["address"] = json.loads(order.pop("address_json"))

    conn = get_db_connection()
    cur = conn.cursor()
    items_out = []
    for ir in item_rows:
        ir_d = row_to_dict(ir)
        cur.execute("SELECT * FROM products WHERE id = ?", (ir_d["product_id"],))
        pr = cur.fetchone()
        if pr:
            pd = row_to_dict(pr)
            pd["inStock"] = bool(pd.pop("in_stock"))
            pd["originalPrice"] = pd.pop("original_price")
            pd["deliveryDays"] = pd.pop("delivery_days")
            pd["specs"] = json.loads(pd.pop("specs_json"))
            pd["images"] = json.loads(pd["images_json"]) if pd["images_json"] else None
            pd.pop("images_json")
            items_out.append(
                {
                    "product": pd,
                    "quantity": ir_d["quantity"],
                }
            )
    conn.close()
    order["items"] = items_out

    status_history_out = []
    for hr in history_rows:
        hd = row_to_dict(hr)
        status_history_out.append(
            {
                "status": hd["status"],
                "label": hd["label"],
                "date": hd["date"],
                "completed": bool(hd["completed"]),
            }
        )
    order["statusHistory"] = status_history_out

    return jsonify(order)


if __name__ == "__main__":
    init_db()          # Это создаст таблицы при запуске
    ensure_columns()   # Это добавит новые колонки в таблицы
    seed_demo_data()   # Это заполнит их данными
    app.run(host="0.0.0.0", port=5000, debug=True)

