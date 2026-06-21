# Fill out the ZaraHack 2026 submission (HACKATHON.md)

## Context

The organizer's link is the team's own OpenKBS workspace; the thing to "fill out" is the
**ZaraHack 2026 submission template**, which must be saved as **`HACKATHON.md` at the repo root**
and committed **before code freeze Sunday 15:00**. It has 12 sections, read by both a human jury
and an automated AI reviewer that cross-checks the answers against the actual code — so answers
must be truthful and match the repo.

All facts below are verified from the repo (datasets in `frontend/scripts/data/`, demo accounts in
`functions/api/index.mjs`, live domain `findmyuni.io`, repo `github.com/Moonfracture/vim`).
Team (from the user): **VIM** — Мирослав (програмиране), Иванета (research + презентация),
Виктория (презентиране); идеята е обща.

## Plan

1. Create `/home/user/project/HACKATHON.md` with the exact content in the next section.
2. Commit it (`docs: add ZaraHack 2026 submission (HACKATHON.md)`).
3. Push to `origin/master` so it lands before the code freeze.

## Final content for HACKATHON.md

```markdown
# ZaraHack 2026 — Project Submission

## 1. Team
- **Team name:** VIM
- **Members:**
  - **Мирослав** — програмиране (цялото приложение: frontend, backend, data pipeline, деплой)
  - **Иванета** — проучване (research) и презентация
  - **Виктория** — презентиране
- **How we split the work:** Мирослав разработи целия продукт; Иванета направи проучването на
  данните и подготви презентацията; Виктория представя проекта пред журито. Идеята е обща на
  целия отбор.

## 2. What Problem Are You Solving?
Българските ученици (8.–12. клас) и техните родители трудно решават кой университет е подходящ
за тях и дали си струва да учат в чужбина, или да останат в България. Информацията — рейтинги,
такси, издръжка, балообразуване, специалности — е разпръсната по десетки сайтове и на различни
езици. Това го усещат най-силно кандидат-студентите и родителите им, които вземат скъпо и важно
решение почти на сляпо.

## 3. How Do You Solve It? (in plain language)
Казваш на УниКомпас какво е важно за теб — цена, качество на дипломата, живот в града — и той ти
показва кои университети ти пасват най-добре, като ги сравнява с българските. Можеш и да питаш
помощник на български, както би питал жив човек. Така за минути виждаш ясно дали да останеш в
България, или да заминеш в чужбина.

## 4. What Technologies Do You Use?
- **Language:** JavaScript (Node.js)
- **Frontend:** React, Vite, Tailwind CSS, framer-motion, react-router
- **Backend:** Node.js (OpenKBS Lambda функции)
- **Data tools / libraries:** собствени Node скриптове (`parse-rsvu.mjs` за PDF, `build-data.mjs`
  за CSV), `pdfjs-dist` за извличане от PDF
- **Database:** PostgreSQL (Neon)
- **APIs / services:** Google Gemini (през OpenKBS AI proxy)
- **Hosting / deployment:** OpenKBS (Lambda + S3 + CloudFront CDN), собствен домейн findmyuni.io

## 5. How Do You Wire Them Together?
Реалните датасети (CSV за рейтинги/такси/издръжка + 3 PDF от РСВУ 2025) се обработват **веднъж**
от Node скриптове (`parse-rsvu.mjs`, `build-data.mjs`) в чисти JSON файлове, които се пакетират в
сайта. Потребителят отваря React сайта от CloudFront CDN, а класирането на университетите се
смята в браузъра от тези JSON данни. За вход/регистрация, любими, харесвания и Общност React
вика Lambda функция (`api`), която пише в PostgreSQL. За AI асистента Lambda препраща въпроса +
текущите резултати към Google Gemini и връща отговор на български.

```
[Реални CSV/PDF данни] -> [нашите скриптове] -> [JSON в сайта] -> [React сайт на CloudFront] -> потребител
[React] -> [Lambda API] -> [PostgreSQL]        (акаунти / Общност)
[React] -> [Lambda API] -> [Google Gemini]     (AI асистент)
```

## 6. Do You Train an ML Model?
Не трениране на собствен ML модел — и това е ок. За AI асистента използваме готов, предварително
трениран голям езиков модел (Google Gemini) през API; не го трениваме ние. Той получава текущите
резултати на потребителя като контекст и отговаря само по темата за избор на университет, на
български. Самото класиране на университетите е прозрачен алгоритъм с тегла (в `lib/scoring.js`),
а не машинно самообучение.

## 7. What Datasets Do You Use, and How?
- **World University Rankings 2026** (`world_university_rankings_2026.csv` + THE World University
  Rankings 2016–2026, `the_rankings_2026.csv`). Защо: качество/рейтинг на чуждите университети за
  картите за сравнение. Какво направихме: парснахме CSV, извадихме ранг/държава/точки, нормализирахме
  имената и разширихме пула до ~750 училища.
- **Tuition Fees 50 Countries** (`tuition_fees_50_countries.csv`). Защо: реални такси по държави за
  въпроса „струва ли си чужбина". Какво: парснахме, свързахме по държава, конвертирахме в местна валута.
- **Scimago Institutions Rankings — Bulgaria** (`scimago_bgr.csv`, scimagoir.com). Защо: базовата
  линия за България (централната карта). Какво: извлякохме българските институции и техния ранг.
- **Cost of Living** (`cost-of-living_v2.csv`). Защо: реална месечна издръжка по градове. Какво:
  парснахме и съпоставихме градовете към университетите.
- **РСВУ 2025 (МОН)** — rsvu.mon.bg, 3 официални PDF: списък на специалностите (3 854 записа / 51
  университета), активни съвместни програми с чужди ВУ, нагласи на работодателите. Защо: пълен
  каталог на всички акредитирани български университети и специалности. Какво: написахме grid-парсер
  (`parse-rsvu.mjs`), който чете таблиците от PDF по координатите на клетките, извади 3 854
  специалности + 71 съвместни програми, групира ги по университет и ги свърза с останалите данни.
- **Етика/лицензи:** официални публични данни (МОН/Scimago) и публични dataset-и. Lifestyle
  критериите без датасет са ясно обозначени като *примерни* в UI и Footer.

## 8. How Will the Platform Scale?
Архитектурата е serverless и по принцип мащабируема: сайтът и статичните JSON данни се сервират от
CloudFront CDN (поема голям трафик), а API-то са Lambda функции, които се скалират автоматично.
Класирането се смята в браузъра, така че не товари сървъра. Първото, което би се счупило при 10 000
души наведнъж, е PostgreSQL (Neon) — лимитът на връзките и cold start. Решение: connection pooling
(вече добавено, с pool + error handler), кеширане на честите заявки и при нужда ъпгрейд на базата.

## 9. What Challenges Did You Face?
1. **Извличане от РСВУ PDF:** текстът няма таблична структура, затова написахме парсер, който
   възстановява редовете и колоните по геометрията на клетките. Първоначално съвместните програми
   връщаха 0 записа заради фалшиви тънки колони — оправено с праг от 20px.
2. **Интермитентни 502 грешки:** Neon затваря неактивни връзки, което сриваше Lambda процеса.
   Добавихме error listener на connection pool-а + keepAlive и грешките изчезнаха.

## 10. Did You Check What Already Exists?
Да. Има отделни източници: rsvu.mon.bg (официалната рейтингова система на МОН), kandidatstvam.bg,
международни рейтинг сайтове (QS/THE) и портали за обучение в чужбина. Те обаче са или само за
България, или само за чужбина, и не подреждат университетите спрямо личните приоритети на ученика.
Нашата разлика: на едно място събираме български + световни данни, класираме спрямо това, което
потребителят е посочил като важно, добавяме балообразуване и AI асистент на български, и директно
показваме сравнението „остани срещу замини".

## 11. Where Did You Use AI, and What's Not Yours?
- **AI инструменти:** използвахме AI асистент (Claude / Claude Code) за писане и дебъгване на код.
  В самия продукт: Google Gemini за асистента (през OpenKBS proxy).
- **Third-party код/библиотеки:** React, Vite, Tailwind CSS, framer-motion, react-router,
  `pdfjs-dist`, `pg` (node-postgres) — open source.
- **Лицензи:** предимно MIT (`pdfjs-dist` е Apache-2.0). Данните — както е посочено в раздел 7.

## 12. Honesty Box
- Lifestyle критериите (нощен живот, паркове, молове, тихо място) са примерни/seeded стойности, не
  реални данни — ясно обозначено в UI и Footer.
- ~32 от 51-те български университета имат само специалности (от РСВУ); липсват им град/година/сайт/
  такса/балообразуване — само 19-те имат пълни данни.
- Колоната ОКС (степен) в PDF на РСВУ е частично ненадеждна в източника, затова степента е best-effort.
- Българската базова линия за централната карта е отчасти ръчно съставена.
- Някои съобщения в Общност са демонстрационни (seeded).
- Реално работещо: вход/регистрация, любими, харесвания, реални такси/издръжка, каталогът от 51
  университета, балообразуване и AI асистентът.

---
**Live:** https://findmyuni.io · **Code:** https://github.com/Moonfracture/vim
**Демо профили за журито:** Ученик `student@unikompas.bg` / `Uchenik2026!` ·
Студент `student-uni@unikompas.bg` / `Student2026!` · Университет `uni@unikompas.bg` / `Universitet2026!`
```

## Verification
- `HACKATHON.md` exists at repo root with all 12 `> _Your answer_` blocks replaced and no leftover
  template comments; no secrets beyond the intentional demo logins.
- Claims match the code (datasets in `frontend/scripts/data/`, `parse-rsvu.mjs`, `scoring.js`,
  Gemini `chat` action, Neon pool error handler) so the automated reviewer's cross-check passes.
- Commit pushed to `origin/master` before the Sunday 15:00 freeze.
