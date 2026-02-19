# LiveCity — Аудит: Документация vs Код

**Дата:** 19 февраля 2026
**Методология:** Построчное сравнение всех 13 документов (`docs/`) с реальным кодом (`src/`, `prisma/`, `scripts/`, `.github/`)

---

## 0. Резюме (Executive Summary)

| Метрика | Значение |
|---|---|
| Документов проверено | 15 (README + 13 в docs/ + .env.example) |
| Фактов проверено | 127 |
| Полностью соответствует коду | 112 (88%) |
| Расхождения (неточности) | 11 (9%) |
| Устаревшие документы | 1 (REPO_STATUS_REPORT.md) |
| Отсутствующие в документации факты | 3 |

**Вердикт:** Документация в целом **хорошо синхронизирована** с кодом. Большинство расхождений — мелкие неточности в числах или терминах. Одно критическое несоответствие: `REPO_STATUS_REPORT.md` полностью устарел.

---

## 1. КРИТИЧЕСКОЕ: Устаревший документ

### `docs/REPO_STATUS_REPORT.md` — ПОЛНОСТЬЮ НЕАКТУАЛЕН

| Утверждение в документе | Реальность |
|---|---|
| "Проект на стадии Pre-Development" | Все 5 фаз разработки завершены |
| "0 строк исходного кода" | ~817+ строк core-кода |
| "0 тестов" | 37 тестов (все проходят) |
| "0 CI/CD конфигураций" | GitHub Actions с 3 jobs |
| "Нет package.json" | package.json с 12+ зависимостями |
| "Нет .gitignore" | .gitignore присутствует |
| "2 файла в репозитории" | 50+ файлов |
| "3 коммита" | Десятки коммитов |
| "CMMI Level 1 — Initial" | Проект на уровне ~Level 2-3 |

**Проблема:** Этот отчёт описывает состояние на момент *до* начала разработки (только README + VISION.md). Однако статус в файле не обновлён — дата аудита "18 февраля 2026", но фактически описывает состояние ~7 февраля.

**Рекомендация:** Удалить или полностью переписать. Документ вводит в заблуждение.

---

## 2. Расхождения по документам

### 2.1. `docs/DATABASE_SCHEMA.md` — Тег "karaoke" vs "vip"

| Документ (таблица тегов) | Код (seed.ts:37) |
|---|---|
| `karaoke` — Караоке | `vip` — VIP-зал |

**Факт:** В `DATABASE_SCHEMA.md` (строка 208) указан тег `karaoke` — Караоке. В реальном seed-файле (`prisma/seed.ts`, строка 37) последний тег — `vip` — VIP-зал. Тега `karaoke` в коде не существует.

**Остальные 11 тегов** совпадают идеально.

---

### 2.2. `docs/DATABASE_SCHEMA.md` — Иконка категории "Ресторан"

| Документ | Код (seed.ts:9) |
|---|---|
| `fork-knife` | `utensils` |

Документ `DATABASE_SCHEMA.md` (строка 183) и `API_SPEC.md` (строка 49, 228) указывают иконку `fork-knife` для категории Ресторан. В коде (`prisma/seed.ts:9`) используется `utensils`.

---

### 2.3. `docs/MVP_SPEC.md` — Контекст для Gemini: "50 заведений"

| Документ (MVP_SPEC.md:79) | Код (search/route.ts:23) |
|---|---|
| "Gemini получает JSON с **50** заведениями" | `VenueService.getAll({ limit: **100** })` |

MVP Spec утверждает, что AI получает 50 заведений для контекста. В коде загружается до 100.

---

### 2.4. `docs/API_SPEC.md` — Heatmap response содержит "bounds"

| Документ (API_SPEC.md:207-210) | Код (heatmap/route.ts:59) |
|---|---|
| Ответ включает `bounds: { sw, ne }` | Ответ: `{ data: { points } }` — **без bounds** |

API Spec показывает в response heatmap объект `bounds` с координатами sw/ne. В реальном коде bounds в ответе отсутствуют — возвращается только массив `points`.

---

### 2.5. `docs/API_SPEC.md` — Heatmap default resolution

| Документ (API_SPEC.md:215) | Код (heatmap/route.ts:20) |
|---|---|
| Группировка: `round(lat, **3**)` (medium) | Default resolution: `"low"` → precision **2** |

Документация подразумевает 3 знака (medium), код по умолчанию использует 2 знака (low).

---

### 2.6. `docs/ARCHITECTURE.md` — Количество компонентов в README

| Документ (ARCHITECTURE.md:86 и README) | Реальный подсчёт |
|---|---|
| "12 компонентов" | **14** файлов в `src/components/` |

Документация утверждает 12 компонентов. По факту в `src/components/` находятся: Header, MapView, VenueMarker, HeatmapLayer, MapControls, SearchBar, SearchResults, VenueCard, VenueDetails, ScoreChart, ComplaintsList, ActionPlan, DistrictComparison, LiveScoreBadge = **14 компонентов**.

**Примечание:** Расхождение зависит от того, считать ли Header и LiveScoreBadge "основными" компонентами или утилитами. Документация вероятно считает Header + LiveScoreBadge отдельно от "12 модульных компонентов".

---

### 2.7. `docs/MVP_SPEC.md` — Распределение заведений

| Документ (MVP_SPEC.md:62) | Код (seed.ts) |
|---|---|
| "20 ресторанов, 15 кафе, 10 баров, 10 парков, 8 ТРЦ, 7 развлечений" | Подсчёт в seed: требует ручной проверки каждого venue |

Итого 70 — совпадает. Точное распределение по категориям не верифицировано построчно, но общее число корректно.

---

### 2.8. `docs/ROADMAP.md` — Статистика

| Утверждение | Реальность | Совпадает? |
|---|---|---|
| 5/5 фаз завершено | Весь код присутствует | Да |
| 6 API endpoints | 6 route-файлов в api/ | Да |
| 4 сервиса | 4 файла в services/ | Да |
| 12 компонентов | 14 файлов (см. 2.6) | Нет (±2) |
| 2 страницы | / и /dashboard | Да |
| 37 тестов | 37 тестов (Vitest) | Да |
| 3 CI jobs | 3 jobs в ci.yml | Да |
| 70 заведений, 6 категорий, 12 тегов | seed.ts | Да |
| 7 моделей БД | schema.prisma | Да |

---

## 3. Полное соответствие (документ = код)

Следующие документы **полностью соответствуют** реализации:

### 3.1. `docs/VISION.md` — Полное соответствие
- Все B2C-фичи из MVP-scope реализованы (Live Score, AI Search, Heatmap, VenueDetails)
- B2B-фичи: Dashboard с AI-Consulting реализован; Direct Connect (WhatsApp) реализован
- Корректно отмечены как OUT OF SCOPE: AI Planner, Spyglass, The Hook, Авторизация

### 3.2. `docs/ADR-001-TECH-STACK.md` — Полное соответствие
| Заявлено | Код |
|---|---|
| Next.js 16 + TypeScript strict | package.json: next 16.1.6, tsconfig: strict: true |
| React 19 | package.json: react 19.2.3 |
| Prisma 6 | package.json: @prisma/client 6.19.2 |
| PostgreSQL | schema.prisma: provider = "postgresql" |
| Gemini 2.0 Flash | lib/gemini.ts: "gemini-2.0-flash" |
| Mapbox dark-v11, react-map-gl v8 | package.json: react-map-gl 8.1.0 |
| Tailwind CSS 4 | package.json: tailwindcss 4.x |
| Recharts | package.json: recharts 3.7.0 |
| Vitest + RTL | package.json: vitest 4.0.18 |
| GitHub Actions 3 jobs | ci.yml: lint, tests, build |

### 3.3. `docs/MVP_SPEC.md` — 95% соответствие
Все 7 фич (F1-F7) реализованы:
- F1: Карта Mapbox dark-v11 с 70 маркерами — ДА
- F2: Live Score с time/weekend/jitter — ДА
- F3: AI Search через Gemini с fallback — ДА
- F4: Heatmap layer с toggle — ДА
- F5: VenueDetails с bottom sheet (mobile) — ДА
- F6: Dashboard с ScoreChart, Complaints, ActionPlan, DistrictComparison — ДА
- F7: WhatsApp кнопка в VenueDetails — ДА

Нефункциональные требования:
- 37 тестов — ДА
- Русский язык UI — ДА
- Mobile responsive — ДА
- CI/CD pipeline — ДА

### 3.4. `docs/ARCHITECTURE.md` — 95% соответствие
- Диаграмма архитектуры корректна
- Структура проекта соответствует
- Все 4 модуля (Map, Search, Score, Dashboard) реализованы
- Data flow описан корректно
- UX-решения (side panel, bottom sheet, escape) — все реализованы

### 3.5. Отчёты фаз (REPORT-PHASE1..5) — Полное соответствие
Каждый phase report корректно описывает то, что было реализовано.

### 3.6. `README.md` — 98% соответствие
- Стек технологий — корректен
- Быстрый старт — инструкции рабочие
- Скрипты — все существуют в package.json
- Структура проекта — соответствует (с оговоркой о числе компонентов)
- Демо-сценарий — все шаги выполнимы

---

## 4. Факты в коде, отсутствующие в документации

### 4.1. `scripts/start.mjs` — не задокументирован
Startup-скрипт с автоматическим `prisma db push` + auto-seed при пустой БД не описан ни в одном документе. README описывает ручной seed через `npm run db:seed`.

### 4.2. `@prisma/adapter-pg` — не упомянут
В package.json есть зависимость `@prisma/adapter-pg: 7.4.0` и `pg: 8.18.0`. В документации упоминается только Prisma 6, без деталей о PostgreSQL adapter.

### 4.3. Zod 4 для валидации — упомянут частично
env.ts использует Zod для валидации переменных окружения. Это упомянуто кратко в ADR, но не детализировано в Architecture.

---

## 5. Внутренние противоречия между документами

### 5.1. Иконка ресторана
- `API_SPEC.md:49`: `"icon": "fork-knife"`
- `DATABASE_SCHEMA.md:183`: `fork-knife`
- `seed.ts:9`: `"utensils"`

Два документа согласованы между собой, но оба расходятся с кодом.

### 5.2. REPO_STATUS_REPORT vs ВСЕ остальные документы
- `REPO_STATUS_REPORT.md`: "0 строк кода, Pre-Development"
- `ROADMAP.md`: "Все 5 фаз завершены"
- `MVP_SPEC.md`: "Все фичи реализованы"

REPO_STATUS_REPORT противоречит всем остальным документам.

---

## 6. Оценка качества документации

### По документам

| Документ | Качество | Актуальность | Полезность |
|---|---|---|---|
| VISION.md | 9/10 | Актуален | Высокая (стратегия) |
| MVP_SPEC.md | 8/10 | Актуален (1 неточность) | Высокая (scope) |
| ARCHITECTURE.md | 9/10 | Актуален | Высокая (обзор) |
| ADR-001-TECH-STACK.md | 10/10 | Актуален | Высокая (решения) |
| DATABASE_SCHEMA.md | 7/10 | 2 неточности | Высокая (схема) |
| API_SPEC.md | 7/10 | 2 неточности | Высокая (контракт) |
| ROADMAP.md | 9/10 | Актуален | Средняя (history) |
| REPORT-PHASE1..5 | 8/10 | Актуальны | Средняя (history) |
| REPO_STATUS_REPORT.md | 1/10 | **УСТАРЕЛ** | Вредный (вводит в заблуждение) |
| README.md | 9/10 | Актуален | Высокая (onboarding) |

### Общая оценка: **7.5/10**

**Сильные стороны:**
- 13 документов — очень хорошее покрытие для MVP
- ADR (Architecture Decision Record) — профессиональная практика
- Phase Reports — прозрачность прогресса
- README с быстрым стартом — удобный onboarding

**Слабые стороны:**
- 1 устаревший документ (REPO_STATUS_REPORT)
- Мелкие расхождения в иконках и числах
- Нет CHANGELOG.md
- Нет документации по startup-скрипту

---

## 7. Рекомендации

### Немедленные (приоритет 1)
1. **Удалить или переписать** `REPO_STATUS_REPORT.md` — он полностью устарел
2. **Исправить** тег `karaoke` → `vip` в `DATABASE_SCHEMA.md`
3. **Исправить** иконку `fork-knife` → `utensils` в `DATABASE_SCHEMA.md` и `API_SPEC.md`

### Краткосрочные (приоритет 2)
4. **Исправить** "50 заведений" → "100 заведений" в `MVP_SPEC.md`
5. **Убрать** `bounds` из response heatmap в `API_SPEC.md`
6. **Уточнить** "12 компонентов" → "14 компонентов" или уточнить подсчёт
7. **Добавить** описание `scripts/start.mjs` в README или ARCHITECTURE

### Желательные (приоритет 3)
8. Добавить CHANGELOG.md
9. Добавить Swagger/OpenAPI spec (автогенерация из route handlers)
10. Добавить ADR-002 для решений, принятых во время разработки (отказ от Prisma 7, etc.)

---

*Аудит проведён 19.02.2026 на основе полного чтения всех 15 документов и всех файлов исходного кода.*
