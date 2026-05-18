# Editorial Redesign

## Goal

Replace the current generic dashboard layout with an editorial, newspaper-style design. Bigger, more readable typography. Clear visual hierarchy between top story, featured stories, and the long tail.

## Typography

- **Headlines (h1–h3, card titles, logo)**: `Fraunces` via `next/font/google`, variable, optical sizing enabled. Italic on the "Snap" portion of the logo.
- **Body & UI**: `Inter` via `next/font/google`, variable. Replaces `Geist Sans`.
- **Mono**: keep `Geist Mono` (only used in code blocks; not worth swapping).
- **Base size**: 17px (`html { font-size: 17px }`). Tailwind `text-*` utilities scale from this.
- **Line height**: body 1.65, headlines 1.15.
- **Scale**:
  - Hero title: `text-4xl md:text-5xl` (~44–56px)
  - Card title: `text-xl` (~22px)
  - Body / preview: base (17px)
  - Meta (source, time): `text-xs` (~13px)

## Layout

Max width 1280px. Single column on mobile; main + sidebar (280px) on `lg:` and up.

```
Header                  — logo (serif italic accent) + nav + theme toggle
Category tabs           — underline style, full-width, horizontal scroll on mobile
─────────────────────────────────────
Main (1 col on mobile, main + 280px right sidebar on lg)

  Hero (top story)      — top-1 by hotScore in last 24h
                          large image, hero-size serif title, summary,
                          source · time

  Featured (2 cols)     — next 4–6 by hotScore
                          image + serif title + preview, similar to current card
                          but bigger title, no badge ring

  More stories (1 col)  — remaining items
                          compact row: 120px square thumb on left,
                          serif title + meta on right

Sidebar (right, sticky on lg)
  Trending              — top 5 by hotScore (numbered list, no images)
  Sources               — same list currently on left, moved here
─────────────────────────────────────
Footer                  — short about line, last crawl timestamp, theme toggle
```

Behavioral details:

- Hero, Featured, and More all draw from the same `listArticles` result. Split client-side / server-side by index (0 → hero, 1..6 → featured, rest → more).
- If hotScore is null (AI not run), fall back to `publishedAt desc`.
- If 0 items, keep the existing empty state but use the new typography.

## Color / visual

CSS variables in `globals.css`. Both modes:

- Light: warm off-white background `oklch(0.99 0.005 80)`, ink `oklch(0.18 0 0)`, muted `oklch(0.55 0 0)`, accent `oklch(0.55 0.18 25)` (editorial red).
- Dark: blue-black background `oklch(0.15 0.01 250)`, text `oklch(0.95 0 0)`, muted `oklch(0.65 0 0)`, accent kept as the red.

Cards:

- Border `1px solid border` instead of ring.
- Hover: `translate-y-[-2px]` + slight border darkening. No ring.
- Radius: `rounded-md` (8px). Reduce the playful larger radii.

Category tabs:

- Replace the pill style with an underline style. Active = thick accent-colored underline + bold; inactive = muted text, no border.

Badges on cards:

- Drop the 🔥 emoji + secondary badge combo. Replace with a small inline meta line: `<span class="font-serif italic text-accent">HOT 87</span>` when `hotScore` is set.
- Keep the category badge but make it a plain uppercased label, not a pill: `text-xs tracking-wider uppercase text-muted`.

## Components

New files:

- `src/components/hero-card.tsx` — top story.
- `src/components/compact-card.tsx` — list row with thumb + title.
- `src/components/trending-sidebar.tsx` — numbered top-5 + sources list (combine into one component since both live in the sidebar).
- `src/components/footer.tsx` — site footer.

Modified files:

- `src/app/layout.tsx` — swap `Geist` → `Inter`; add `Fraunces`; add `<Footer />`.
- `src/app/globals.css` — palette, base size, font CSS variables.
- `src/app/page.tsx` — restructure into hero + featured + more, move sources to sidebar component.
- `src/components/header.tsx` — serif logo with italic accent on "Snap".
- `src/components/category-tabs.tsx` — underline style.
- `src/components/article-card.tsx` — used by Featured grid; bigger title, drop ring/emoji, new meta line.

Untouched:

- `src/app/digest/*` — out of scope for this redesign; will inherit the new fonts and palette automatically through `layout.tsx` and `globals.css`.
- API routes, queries, scheduler, crawler — no backend changes.

## Testing

- Visual check in browser (light + dark) on mobile + desktop widths.
- Empty state still renders.
- No-image articles render with the source-name placeholder in both hero and card forms.
- Existing unit tests in `tests/` should remain green; no logic touched.

## Out of scope

- New backend queries or scoring changes.
- Redesign of `/digest`.
- New accent-color theming options or per-category color coding.
- Animations beyond the hover translate.
