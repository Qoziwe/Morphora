

***

```markdown
# Документация архитектуры сервера MorphoShop

Этот документ описывает полную конфигурацию сервера Ubuntu 22.04 для проекта MorphoShop (Интернет-магазин).
Используется связка: Nginx (Reverse Proxy) + Python Flask (Backend) + Next.js (Frontend).

## 1. Общая информация
- **ОС:** Ubuntu Server 22.04 LTS
- **Пользователь:** root
- **Корневая директория проекта:** `/var/www/MorphoShop`
- **Домен:** morphora.kz (или ваш текущий домен)
- **SSL:** Let's Encrypt (Certbot auto-renew)

---

## 2. Бэкенд (Backend)
API сервер на Python Flask.

- **Путь:** `/var/www/MorphoShop/backend`
- **Язык:** Python 3.11 (установлен через ppa:deadsnakes).
- **Виртуальное окружение:** `/var/www/MorphoShop/backend/venv`
- **Фреймворк:** Flask
- **WSGI сервер:** Gunicorn (запускается через systemd)
- **Порт:** 5000 (закрыт снаружи фаерволом, доступен только локально)
- **База данных:** SQLite (`/var/www/MorphoShop/backend/database.db`)
- **Загрузка файлов:** Папка `uploads` раздается Nginx'ом, но физически находится в папке бэкенда.

### Управление службой (Systemd)
Служба называется `morphobackend.service`.
Файл конфигурации: `/etc/systemd/system/morphobackend.service`

**Основные команды:**
```bash
systemctl status morphobackend   # Статус
systemctl restart morphobackend  # Перезапуск (после изменения кода Python)
journalctl -u morphobackend -f   # Логи в реальном времени
```

### Структура важных файлов бэкенда:
- `app.py`: Точка входа приложения.
- `requirements.txt`: Список зависимостей.
- `.env`: Переменные окружения (SECRET_KEY, ADMIN_HASH и т.д.).

---

## 3. Фронтенд (Frontend)
Клиентская часть на Next.js.

- **Путь:** `/var/www/MorphoShop/frontend`
- **Фреймворк:** Next.js (App Router) + TypeScript + Tailwind CSS.
- **Node.js версия:** 20.x
- **Пакетный менеджер:** pnpm
- **Менеджер процессов:** PM2
- **Порт:** 3000 (закрыт снаружи, доступен только локально)

### Управление процессом (PM2)
Приложение запущено под именем `morpho-frontend`.

**Основные команды:**
```bash
pm2 list                         # Список процессов
pm2 status morpho-frontend       # Статус
pm2 restart morpho-frontend      # Перезапуск (после pnpm build)
pm2 logs morpho-frontend         # Логи
```

### Конфигурация окружения
Файл: `/var/www/MorphoShop/frontend/.env.production`
Содержит: `NEXT_PUBLIC_API_URL=https://ваш-домен.kz/api`

---

## 4. Веб-сервер и маршрутизация (Nginx)
Nginx выступает в роли обратного прокси (Reverse Proxy). Он принимает запросы на 80/443 порты и перенаправляет их.

- **Конфиг сайта:** `/etc/nginx/sites-available/morphoshop`
- **Симлинк:** `/etc/nginx/sites-enabled/morphoshop`

### Логика маршрутизации (location blocks):
1. `/api/` -> Проксирует на `http://127.0.0.1:5000` (Бэкенд).
2. `/uploads/` -> Проксирует на `http://127.0.0.1:5000` (для отдачи картинок).
3. `/` (все остальное) -> Проксирует на `http://127.0.0.1:3000` (Фронтенд).

**Команды:**
```bash
nginx -t                 # Проверка конфигурации
systemctl restart nginx  # Перезапуск Nginx
certbot --nginx          # Управление SSL сертификатами
```

---

## 5. Процедура деплоя (Обновления)

### Если обновлен Бэкенд (Python):
1. `cd /var/www/MorphoShop/backend`
2. `git pull` (если используется git)
3. `source venv/bin/activate`
4. `pip install -r requirements.txt` (если были новые библиотеки)
5. `systemctl restart morphobackend`

### Если обновлен Фронтенд (Next.js):
1. `cd /var/www/MorphoShop/frontend`
2. `git pull`
3. `pnpm install`
4. `pnpm build` (Сборка продакшен версии)
5. `pm2 restart morpho-frontend`

---

## 6. Важные заметки для ИИ
- В системе настроен алиас или update-alternatives для Python, но виртуальное окружение (`venv`) создано строго на версии 3.11.
- База данных SQLite требует прав на запись для пользователя, от которого запущен Gunicorn (в данном случае root, так что проблем с правами нет, но стоит иметь в виду).
- CORS на бэкенде настроен на прием запросов с домена фронтенда.
```

***
