# Design System Master File

> **LOGIC:** When building a specific page, first check `design-system/pages/[page-name].md`.
> If that file exists, its rules **override** this Master file.
> If not, strictly follow the rules below.

---

## ⛳ ZEROS 확정 오버라이드 (AGENTS.md §10 — 아래 일반 추천보다 우선)

> 이 프로젝트의 실제 토큰/규칙. ui-ux-pro-max 일반 추천(Noto Sans KR·#1E3A8A 등)보다 **이 절을 먼저 따른다.**

- **폰트:** Pretendard (Noto Sans KR 아님).
- **색(실제 Tailwind 토큰):** `navy`(#041B33 계열)·`steel`(보조 청)·`accent`(오렌지 #EA4F18). **오렌지는 최종 CTA 1곳에만**, 데이터 강조는 청색 `#155EEF`. 색은 핵심 하나에만(도형 남발 금지, 여백·헤어라인 우선).
- **위계:** 헤드라인이 항상 최상위. 보조 지표(±5% 등)는 헤드라인보다 작게(역전 금지).
- **가독성(중장년 타깃·필수 체크):**
  - 본문 ≥16px. **`text-gray-light`(#9AA3AF)는 본문 금지** → `text-gray`(#5B6573) 이상(대비 4.5:1). (게이트 R2)
  - 에러 메시지는 **`role="alert"`/aria-live** 로 announce. (게이트 R1)
  - 터치 타깃 **≥44×44px**. 아이콘 전용 버튼은 `aria-label`. (게이트 R3)
  - `focus-visible` 가시 · `prefers-reduced-motion` 존중(`motion-reduce:animate-none`) · 숫자 `tabular-nums`.
- **카피:** 단정/과장 금지(거품·부풀림 등). ZEROS=최적합 견적 산출 서비스(시공사 아님). 격식 어미.
- **검증 루프:** UI(.tsx) 변경 시 마감 전 `node .claude/hooks/ui-quality-gate.mjs --check` 로 점검 → 통과 시 `--pass`. 미통과면 Stop 훅이 마감을 차단한다.

---

**Project:** ZEROS
**Generated:** 2026-06-30 00:03:31
**Category:** B2B Service

---

## Global Rules

### Color Palette

| Role | Hex | CSS Variable |
|------|-----|--------------|
| Primary | `#1E3A8A` | `--color-primary` |
| Secondary | `#1E40AF` | `--color-secondary` |
| CTA/Accent | `#B45309` | `--color-cta` |
| Background | `#F8FAFC` | `--color-background` |
| Text | `#0F172A` | `--color-text` |

**Color Notes:** Authority navy + trust gold

### Typography

- **Heading Font:** Noto Sans KR
- **Body Font:** Noto Sans KR
- **Mood:** korean, modern, clean, professional, multilingual, readable
- **Google Fonts:** [Noto Sans KR + Noto Sans KR](https://fonts.google.com/share?selection.family=Noto+Sans+KR:wght@300;400;500;700)

**CSS Import:**
```css
@import url('https://fonts.googleapis.com/css2?family=Noto+Sans+KR:wght@300;400;500;700&display=swap');
```

### Spacing Variables

| Token | Value | Usage |
|-------|-------|-------|
| `--space-xs` | `4px` / `0.25rem` | Tight gaps |
| `--space-sm` | `8px` / `0.5rem` | Icon gaps, inline spacing |
| `--space-md` | `16px` / `1rem` | Standard padding |
| `--space-lg` | `24px` / `1.5rem` | Section padding |
| `--space-xl` | `32px` / `2rem` | Large gaps |
| `--space-2xl` | `48px` / `3rem` | Section margins |
| `--space-3xl` | `64px` / `4rem` | Hero padding |

### Shadow Depths

| Level | Value | Usage |
|-------|-------|-------|
| `--shadow-sm` | `0 1px 2px rgba(0,0,0,0.05)` | Subtle lift |
| `--shadow-md` | `0 4px 6px rgba(0,0,0,0.1)` | Cards, buttons |
| `--shadow-lg` | `0 10px 15px rgba(0,0,0,0.1)` | Modals, dropdowns |
| `--shadow-xl` | `0 20px 25px rgba(0,0,0,0.15)` | Hero images, featured cards |

---

## Component Specs

### Buttons

```css
/* Primary Button */
.btn-primary {
  background: #B45309;
  color: white;
  padding: 12px 24px;
  border-radius: 8px;
  font-weight: 600;
  transition: all 200ms ease;
  cursor: pointer;
}

.btn-primary:hover {
  opacity: 0.9;
  transform: translateY(-1px);
}

/* Secondary Button */
.btn-secondary {
  background: transparent;
  color: #1E3A8A;
  border: 2px solid #1E3A8A;
  padding: 12px 24px;
  border-radius: 8px;
  font-weight: 600;
  transition: all 200ms ease;
  cursor: pointer;
}
```

### Cards

```css
.card {
  background: #F8FAFC;
  border-radius: 12px;
  padding: 24px;
  box-shadow: var(--shadow-md);
  transition: all 200ms ease;
  cursor: pointer;
}

.card:hover {
  box-shadow: var(--shadow-lg);
  transform: translateY(-2px);
}
```

### Inputs

```css
.input {
  padding: 12px 16px;
  border: 1px solid #E2E8F0;
  border-radius: 8px;
  font-size: 16px;
  transition: border-color 200ms ease;
}

.input:focus {
  border-color: #1E3A8A;
  outline: none;
  box-shadow: 0 0 0 3px #1E3A8A20;
}
```

### Modals

```css
.modal-overlay {
  background: rgba(0, 0, 0, 0.5);
  backdrop-filter: blur(4px);
}

.modal {
  background: white;
  border-radius: 16px;
  padding: 32px;
  box-shadow: var(--shadow-xl);
  max-width: 500px;
  width: 90%;
}
```

---

## Style Guidelines

**Style:** Trust & Authority

**Keywords:** Certificates/badges displayed, expert credentials, case studies with metrics, before/after comparisons, industry recognition, security badges

**Best For:** Healthcare/medical landing pages, financial services, enterprise software, premium/luxury products, legal services

**Key Effects:** Badge hover effects, metric pulse animations, certificate carousel, smooth stat reveal

### Page Pattern

**Pattern Name:** Lead Magnet + Form

- **Conversion Strategy:** Form fields ≤ 3 for best conversion. Offer valuable lead magnet preview. Show form submission progress.
- **CTA Placement:** Form CTA: Submit button
- **Section Order:** 1. Hero (benefit headline), 2. Lead magnet preview (ebook cover, checklist, etc), 3. Form (minimal fields), 4. CTA submit

---

## Anti-Patterns (Do NOT Use)

- ❌ Playful design
- ❌ Hidden credentials
- ❌ AI purple/pink gradients

### Additional Forbidden Patterns

- ❌ **Emojis as icons** — Use SVG icons (Heroicons, Lucide, Simple Icons)
- ❌ **Missing cursor:pointer** — All clickable elements must have cursor:pointer
- ❌ **Layout-shifting hovers** — Avoid scale transforms that shift layout
- ❌ **Low contrast text** — Maintain 4.5:1 minimum contrast ratio
- ❌ **Instant state changes** — Always use transitions (150-300ms)
- ❌ **Invisible focus states** — Focus states must be visible for a11y

---

## Pre-Delivery Checklist

Before delivering any UI code, verify:

- [ ] No emojis used as icons (use SVG instead)
- [ ] All icons from consistent icon set (Heroicons/Lucide)
- [ ] `cursor-pointer` on all clickable elements
- [ ] Hover states with smooth transitions (150-300ms)
- [ ] Light mode: text contrast 4.5:1 minimum
- [ ] Focus states visible for keyboard navigation
- [ ] `prefers-reduced-motion` respected
- [ ] Responsive: 375px, 768px, 1024px, 1440px
- [ ] No content hidden behind fixed navbars
- [ ] No horizontal scroll on mobile
