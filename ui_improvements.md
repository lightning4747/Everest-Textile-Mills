# 🧵 Everest Textile Mills — Frontend Architecture & Optimization Guide

An industrial-grade Enterprise Resource Planning (ERP) and Shopfloor Operations frontend engineered for **Everest Textile Mills**. This guide defines standard frontend optimization strategies, layout alignment systems, and design authenticity principles to keep the platform blazingly fast, visually grounded, and pixel-precise across all production modules.

---

## 📑 Table of Contents

1. [Architectural Overview & Tech Stack](#-architectural-overview--tech-stack)
2. [Frontend Optimization Strategies](#-frontend-optimization-strategies)
   - [1. Data Pagination & Virtualization](#1-data-pagination--virtualization)
   - [2. Debouncing & Throttling](#2-debouncing--throttling)
   - [3. Render Optimization & Memoization](#3-render-optimization--memoization)
   - [4. Route & Bundle-Level Code Splitting](#4-route--bundle-level-code-splitting)
   - [5. Heavy Component & Chart Lazy Loading](#5-heavy-component--chart-lazy-loading)
   - [6. Caching, Prefetching & Request Deduplication](#6-caching-prefetching--request-deduplication)
   - [7. Asset & Bundle Size Optimization](#7-asset--bundle-size-optimization)
3. [Design Authenticity: Industrial ERP Identity](#-design-authenticity-industrial-erp-identity)
   - [Authentic Domain-First Aesthetic](#authentic-domain-first-aesthetic)
   - [Typography Hierarchy & Font Pairing](#typography-hierarchy--font-pairing)
   - [Color Tokens & Industrial Status Semantics](#color-tokens--industrial-status-semantics)
   - [Micro-Interactions & Tactile Polish](#micro-interactions--tactile-polish)
   - [Zero-Jump Skeletons & Resilient States](#zero-jump-skeletons--resilient-states)
4. [Precision Layout & Alignment Rules](#-precision-layout--alignment-rules)
   - [The 8pt Spatial System](#the-8pt-spatial-system)
   - [Layout Consistency (Grid & Flexbox Standards)](#layout-consistency-grid--flexbox-standards)
   - [Tabular Data & Metric Alignment Rules](#tabular-data--metric-alignment-rules)
   - [Filter & Action Bar Uniform Height Discipline](#filter--action-bar-uniform-height-discipline)
   - [Responsive Breakpoints & Padding Harmony](#responsive-breakpoints--padding-harmony)
5. [Code Recipes & Reusable Patterns](#-code-recipes--reusable-patterns)
   - [Hook: `useDebounce`](#hook-usedebounce)
   - [Component: Paginated & Aligned Table](#component-paginated--aligned-table)
   - [Component: Aligned Metric Card with Tactile Feedback](#component-aligned-metric-card-with-tactile-feedback)
6. [Frontend Performance & UI Quality Checklist](#-frontend-performance--ui-quality-checklist)
7. [Getting Started & Development Commands](#-getting-started--development-commands)

---

## 🏗 Architectural Overview & Tech Stack

```
Everest-Textile-Mills/
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── layout/       # Sidebar, Topbar, Page Containers
│   │   │   └── ui/           # Buttons, Inputs, Modals, Badges, Tables
│   │   ├── data/             # Mock batches, loom telemetry, ERP data
│   │   ├── pages/
│   │   │   ├── dashboard/    # Mill executive overview & telemetry
│   │   │   ├── quality/      # Fabric inspection, GSM & defect tracking
│   │   │   ├── reports/      # Production, cost, & dispatch analytics
│   │   │   ├── sales/        # Wholesale orders, ledger, & export status
│   │   │   ├── shopfloor/    # Loom efficiency, spindle count, real-time alerts
│   │   │   └── yarn/         # Yarn spinning, cone inventory, lot batching
│   │   ├── types/            # Domain TypeScript models
│   │   └── utils/            # Formatters, calculations, debounce helpers
```

- **Runtime & Bundler**: [Vite](https://vitejs.dev/) + React 18 + TypeScript
- **Styling & System**: [Tailwind CSS](https://tailwindcss.com/) with custom industrial tokens
- **Data Visualization**: [Recharts](https://recharts.org/) (Shopfloor yields, spindle efficiency, yarn stock levels)
- **Animation & Motion**: [Anime.js](https://animejs.com/) for mechanical, authentic transitions
- **Iconography**: [Lucide React](https://lucide.dev/) for clean, purposeful industrial symbols

---

## ⚡ Frontend Optimization Strategies

High-frequency industrial dashboards stream thousands of sensor data points, yarn lots, and shopfloor logs. Without stringent performance patterns, the UI quickly suffers from dropped frames, jank, and sluggish input response.

```
┌────────────────────────────────────────────────────────────────────────┐
│                      Frontend Optimization Matrix                       │
├───────────────────────┬────────────────────────────────────────────────┤
│ Issue                 │ Applied Strategy                               │
├───────────────────────┼────────────────────────────────────────────────┤
│ High-frequency search │ Debouncing (`useDebounce`, 300ms window)       │
│ Rapid scroll/telemetry│ Throttling (`useThrottle`, 100ms throttle)     │
│ Large yarn inventory  │ Server-side pagination & windowed DOM rows     │
│ Heavy Recharts charts │ Code-split route imports + `React.lazy`        │
│ Repeated re-renders   │ `React.memo` + stable `useCallback` references │
│ Table number shifts   │ `font-mono tabular-nums` to eliminate layout   │
│                       │ shift (CLS)                                    │
└───────────────────────┴────────────────────────────────────────────────┘
```

---

### 1. Data Pagination & Virtualization

Rendering thousands of yarn batches or loom inspection rows in a single DOM tree degrades memory and spikes reflow durations.

#### Strategy
- **Pagination by Default**:
  - Implement **offset / cursor pagination** for ERP datasets (e.g., 25, 50, 100 items per page).
  - Cache previous pages so users flipping between pages experience instant rendering without re-fetching.
  - Persist pagination state in URL query params (`?page=2&limit=25`) to make URLs shareable and refresh-resilient.
- **DOM Virtualization (Windowing)**:
  - For real-time shopfloor logs or live telemetry with >500 rows, use virtualization (`@tanstack/react-virtual` or window slicing).
  - Only render rows currently within the visible viewport plus an overscan buffer of 3 to 5 items.

---

### 2. Debouncing & Throttling

Prevent continuous state updates and API inundation during user typing or high-frequency telemetry.

#### Strategy
- **Debouncing (Search & Text Filters)**:
  - Delay execution until user ceases typing for a defined duration (**300ms** standard; **500ms** for heavy fuzzy search).
  - Decouple the local input value (instant, 60fps responsiveness) from the debounced query used for filtering or network requests.
- **Throttling (Window Resize & Sensor Streaming)**:
  - Limit event handler executions to at most once per interval (**100ms** for window resize / scroll tracking).

```typescript
// Pattern: Decoupled Instant Input + Debounced Query Trigger
const [searchTerm, setSearchTerm] = useState('');
const debouncedSearch = useDebounce(searchTerm, 300);

useEffect(() => {
  fetchBatches({ query: debouncedSearch });
}, [debouncedSearch]);
```

---

### 3. Render Optimization & Memoization

Avoid gratuitous re-evaluations across sprawling dashboard trees when unrelated state changes.

#### Strategy
- **`React.memo` on Leaf Cards**:
  - Wrap atomic cards (e.g., `LoomCard`, `BatchRow`, `StatBadge`) with `React.memo` using strict shallow comparison.
- **`useMemo` for Costly Computations**:
  - Memoize aggregate calculations (e.g., average yarn tenacity, GSM deviation, overall shopfloor OEE).
- **`useCallback` for Event Handlers**:
  - Wrap handlers passed down to deeply nested list items to avoid breaking memoization downstream.
- **React 18 Concurrent Primitives**:
  - Use `useTransition` when switching tabs or applying complex filters so high-priority keystrokes remain smooth while the dashboard renders in the background.

---

### 4. Route & Bundle-Level Code Splitting

Never bundle the entire mill ERP into a single monolithic JavaScript payload.

#### Strategy
- Split routes with `React.lazy()` and `React.Suspense`:
  ```tsx
  const Dashboard = lazy(() => import('./pages/dashboard/Dashboard'));
  const Shopfloor = lazy(() => import('./pages/shopfloor/ShopFloor'));
  const YarnInventory = lazy(() => import('./pages/yarn/YarnManagement'));
  const Quality = lazy(() => import('./pages/quality/QualityAudit'));
  const Reports = lazy(() => import('./pages/reports/Reports'));
  ```
- Wrap route transitions with a persistent shell and an authentic fallback spinner or skeleton to avoid flashing unstyled layouts.

---

### 5. Heavy Component & Chart Lazy Loading

Recharts and complex SVG renderers carry heavy bundle weight.

#### Strategy
- Defer loading chart components until the user scrolls into view (using `IntersectionObserver`) or until tab activation.
- Use lightweight placeholder skeleton boxes matching the exact chart dimensions (`h-72 w-full`) before the chart chunk resolves.

---

### 6. Caching, Prefetching & Request Deduplication

Reduce network roundtrips for semi-static mill configurations.

#### Strategy
- **Stale-While-Revalidate (SWR)**: Serve existing cached yarn lot data instantly, validating in the background.
- **Prefetch on Hover**: When the user hovers over a primary navigation link (e.g., "Shopfloor Telemetry"), begin prefetching the respective bundle and initial summary payload.
- **Request Deduplication**: Guard against duplicate simultaneous API requests triggered by rapid component re-mounting.

---

### 7. Asset & Bundle Size Optimization

- **Lucide Icons Tree-Shaking**: Import named icons directly (`import { AlertCircle, Sliders } from 'lucide-react'`). Never use wildcard or barrel imports that pull the entire icon library.
- **Font Subsetting**: Preload only the required weights and latin subsets of `Fraunces`, `Inter`, and `JetBrains Mono`.
- **CSS Purge**: Ensure Tailwind cleanly strips unused utilities in production via the content glob:
  `content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"]`.

---

## 🏛 Design Authenticity: Industrial ERP Identity

A textile mill ERP should feel **purpose-built, grounded, and authoritative** — never like a generic consumer SaaS template. It balances industrial utilitarianism with polished typographic craft.

```
┌────────────────────────────────────────────────────────────────────────┐
│                        Design Language Principles                      │
├───────────────────────┬────────────────────────────────────────────────┤
│ Dimension             │ Specification                                  │
├───────────────────────┼────────────────────────────────────────────────┤
│ Primary Heritage      │ Cyprus Deep Teal (`#004643`)                   │
│ Atmospheric Canvas    │ Clean Cloud White & Sage Tint (`#FAFAFA`)      │
│ Editorial Brand       │ Fraunces Serif (Craft, Heritage, Mill Quality) │
│ Functional UI         │ Inter (Clarity, Density, Legibility)           │
│ Industrial Metrics    │ JetBrains Mono (Lot codes, GSM, RPM, Tenacity) │
│ Border & Edges        │ Controlled 6px/8px radii; no playful pill-cuts │
└───────────────────────┴────────────────────────────────────────────────┘
```

---

### Authentic Domain-First Aesthetic

1. **Textile-Native Terminology**: Use genuine industry terms — **Count (Ne/Nm)**, **GSM**, **Pick Density**, **Spindle RPM**, **Warp/Weft Tension**, and **Lot Number**, instead of vague placeholders like "Item 1" or "Metric A".
2. **Physicality & Tactility**:
   - Panels and cards feature subtle, crisp 1px borders (`border-cloud-border`) and soft elevation shadows (`shadow-sm` or `shadow-theme`).
   - Active loom machines visually convey status through mechanical pulses and crisp color coding.
3. **Restrained Color Palettes**:
   - Reserve vibrant saturation solely for state warnings and action confirmation. Backgrounds and containers remain calm and neutral to prevent visual fatigue over 8-hour operating shifts.

---

### Typography Hierarchy & Font Pairing

| Role | Font Family | Size / Leading | Weight | Usage |
| :--- | :--- | :--- | :--- | :--- |
| **Brand Headings** | `Fraunces` | `text-2xl` / `text-3xl` | 600 / 700 | Mill page headers, major section titles, banner titles |
| **UI Body / Controls** | `Inter` | `text-sm` (`14px`) | 400 / 500 | Form labels, table headers, descriptions, navigation items |
| **Industrial Metrics** | `JetBrains Mono` | `text-sm` / `text-lg` | 500 / 600 | Batch codes (`#YN-2024-88A`), RPM counts, weights, currency |
| **Micro Labels** | `Inter` | `text-xs` (`11px` / `12px`) | 600 uppercase | Status badges, tracking tags, column sorts (`tracking-wider`) |

---

### Color Tokens & Industrial Status Semantics

Tailwind configuration maps to strict contextual semantic variables:

```css
/* Color Palette System */
--cyprus: #004643;        /* Primary heritage brand */
--cyprus-dark: #003330;   /* Deep interactive active states */
--cyprus-light: #E0EFEA;  /* Soft active badge tint */
--cloud: #FAFAFA;         /* Base application background */
--cloud-panel: #F0F6F4;   /* Contrasting section surface */
--cloud-border: #DCE7E4;  /* Structural dividing lines */

/* Machine & Quality Statuses */
--ok: #15803D;            /* Running / In Spec / Cleared (Green) */
--warn: #B45309;          /* Maintenance / Nearing Tolerance (Amber) */
--bad: #B91C1C;           /* Loom Halt / Tension Breach / Defect (Crimson) */
--idle: #64748B;          /* Offline / Unassigned / Standby (Slate) */
```

---

### Micro-Interactions & Tactile Polish

- **Physical Machine Clicks**: Buttons should feel mechanical (`active:scale-[0.98]` with a snappy `100ms` transition).
- **Subtle Status Glows**: Critical telemetry errors use a soft pulse effect (`animate-pulse`) with restrained opacity rather than harsh neon flashing.
- **Clean Breadcrumb & Header Anchoring**: Every view maintains a stable, grounded top hierarchy with breadcrumbs indicating Mill Unit → Section → Specific Machine/Batch.

---

### Zero-Jump Skeletons & Resilient States

Layout shift (Cumulative Layout Shift, CLS) is disorienting during shift handovers.
- **Geometric Skeleton Parity**: Skeleton placeholders must replicate the exact padding, row height, and column widths of the resolved table.
- **Explicit Aspect Ratios**: Assign strict dimensions or aspect ratios (`aspect-video`, `h-64`) on charts and machine diagrams to ensure the page doesn't shift when charts render.
- **Actionable Empty States**: When a filter yields zero results, render an authentic graphic or icon with an immediate action (e.g., *"No yarn lots match filter 'Count 40s'. [Clear Filters]"*).

---

## 📐 Precision Layout & Alignment Rules

Misaligned cards, wandering inputs, and jagged table numbers make dashboards feel unpolished and untrustworthy. Enforce the following spatial rules across all pages.

```
┌────────────────────────────────────────────────────────────────────────┐
│                        Spatial Alignment Canvas                        │
│                                                                        │
│  [Page Header] ─────────────────────────────────── [Action Bar: h-10]  │
│  ├── Title (Fraunces)                                                  │
│  └── Subtitle (Inter text-sm)                                          │
│                                                                        │
│  [Stat Grid: 4 Equal Columns] ───────────────────── [gap-4 / gap-6]    │
│  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐ ┌──────────────┐   │
│  │ Metric Card  │ │ Metric Card  │ │ Metric Card  │ │ Metric Card  │   │
│  │ h-32         │ │ h-32         │ │ h-32         │ │ h-32         │   │
│  └──────────────┘ └──────────────┘ └──────────────┘ └──────────────┘   │
│                                                                        │
│  [Filter Bar: Unified Height h-10] ─────────────────────────────────   │
│  [Search Bar]  [Dropdown: Lot]  [Date Range]  [Export Button]          │
│                                                                        │
│  [Aligned Data Table] ──────────────────────────────────────────────   │
│  │ Machine ID (L) │ Type (L) │ Status (C) │ Speed (R) │ Action (R) │   │
│                                                                        │
└────────────────────────────────────────────────────────────────────────┘
```

---

### The 8pt Spatial System

All margins, paddings, gaps, and heights must be multiples of **4px** and **8px**:

| Space Token | Tailwind Class | Pixel Value | Standard Application |
| :--- | :--- | :--- | :--- |
| `space-1` | `p-1`, `gap-1` | `4px` | Badge interior padding, tight icon spacing |
| `space-2` | `p-2`, `gap-2` | `8px` | Form field inner padding, dropdown item gap |
| `space-3` | `p-3`, `gap-3` | `12px` | Compact list item padding |
| `space-4` | `p-4`, `gap-4` | `16px` | Standard card internal padding, compact grid gap |
| `space-6` | `p-6`, `gap-6` | `24px` | Standard page grid gap, major card padding |
| `space-8` | `p-8`, `gap-8` | `32px` | Section vertical rhythm, major view separation |

---

### Layout Consistency (Grid & Flexbox Standards)

1. **Dashboard Overview Grids**:
   - Metric cards: Use `grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6`.
   - Equal-height enforcement: Always ensure cards in the same row share uniform height using flex containers (`flex flex-col justify-between`).
2. **Main Layout Shell**:
   - Sidebar: Fixed width (`w-64`), full height (`h-screen sticky top-0`), collapsible to `w-20` on compact views.
   - Main Content Area: Constrained with `max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6` to prevent ultra-wide distortion on factory floor monitors.

---

### Tabular Data & Metric Alignment Rules

Tables present dense operational telemetry. Enforce strict directional alignments:

```
┌────────────────────────────────────────────────────────────────────────┐
│                        Table Column Alignment                          │
├─────────────────┬───────────┬──────────────────────────────────────────┤
│ Column Type     │ Alignment │ Reason & Tailwind Class                  │
├─────────────────┼───────────┼──────────────────────────────────────────┤
│ Text & Names    │ Left      │ Natural reading direction (`text-left`)  │
│ Lot / Batch IDs │ Left      │ Monospace identifier (`text-left font-mono`)│
│ Status & Tags   │ Center    │ Balanced pill geometry (`text-center`)   │
│ Counts / RPM    │ Right     │ Decimal & magnitude clarity (`text-right`)│
│ Financials      │ Right     │ Tabular number stacking (`text-right font-mono`)│
│ Action Buttons  │ Right     │ Direct proximity to end (`text-right`)   │
└─────────────────┴───────────┴──────────────────────────────────────────┘
```

> **Crucial**: Always combine `font-mono` with `tabular-nums` on dynamic numerical columns so updating numbers do not cause the layout to wobble horizontally.

---

### Filter & Action Bar Uniform Height Discipline

A common alignment bug is pairing a 42px search input next to a 36px filter dropdown and a 40px export button.
- **Rule**: Every element inside an action bar must share an identical height:
  - Standard control height: `h-10` (`40px`).
  - Compact table control height: `h-9` (`36px`).
- Wrap controls inside `flex items-center gap-3`. Do not let browser defaults dictate inconsistent heights.

---

### Responsive Breakpoints & Padding Harmony

| Breakpoint | Tailwind Prefix | Target Device / Screen | Shell Padding |
| :--- | :--- | :--- | :--- |
| `< 640px` | Default | Mobile shopfloor inspection device | `px-4 py-4` |
| `640px - 768px` | `sm:` | Supervisor Tablet (Portrait) | `px-6 py-6` |
| `768px - 1024px` | `md:` / `lg:` | Tablet Landscape / Shopfloor Terminal | `px-6 py-6` |
| `> 1024px` | `xl:` / `2xl:` | Operations Room Workstation / Desktop | `px-8 py-8` |

---

## 🛠 Code Recipes & Reusable Patterns

### Hook: `useDebounce`

A type-safe React hook to throttle continuous input before hitting filters or network APIs:

```typescript
// frontend/src/utils/useDebounce.ts
import { useState, useEffect } from 'react';

export function useDebounce<T>(value: T, delay: number = 300): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}
```

---

### Component: Paginated & Aligned Table

A production-ready blueprint illustrating precise column alignment, pagination controls, uniform filter height, and tabular numbers:

```tsx
// frontend/src/components/ui/YarnBatchTable.tsx
import React, { useState, useMemo } from 'react';
import { Search, ChevronLeft, ChevronRight, Filter } from 'lucide-react';
import { useDebounce } from '../../utils/useDebounce';

interface YarnBatch {
  id: string;
  lotNumber: string;
  countNe: number;
  composition: string;
  weightKg: number;
  status: 'In Stock' | 'Allocated' | 'Dyeing' | 'Rejected';
}

interface YarnBatchTableProps {
  batches: YarnBatch[];
  pageSize?: number;
}

export const YarnBatchTable: React.FC<YarnBatchTableProps> = ({
  batches,
  pageSize = 10,
}) => {
  const [search, setSearch] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const debouncedSearch = useDebounce(search, 300);

  // 1. Filtered Dataset
  const filtered = useMemo(() => {
    return batches.filter((b) =>
      b.lotNumber.toLowerCase().includes(debouncedSearch.toLowerCase()) ||
      b.composition.toLowerCase().includes(debouncedSearch.toLowerCase())
    );
  }, [batches, debouncedSearch]);

  // 2. Pagination Calculations
  const totalPages = Math.ceil(filtered.length / pageSize) || 1;
  const paginatedRows = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filtered.slice(start, start + pageSize);
  }, [filtered, currentPage, pageSize]);

  return (
    <div className="bg-white border border-cloud-border rounded-lg shadow-sm overflow-hidden">
      {/* Action / Filter Bar: Enforced uniform h-10 alignment */}
      <div className="p-4 border-b border-cloud-border flex flex-col sm:flex-row items-center justify-between gap-3 bg-cloud-panel">
        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 text-cyprus-muted absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setCurrentPage(1); // Reset page on input
            }}
            placeholder="Search Lot Number or Blend..."
            className="w-full h-10 pl-9 pr-3 text-sm bg-white border border-cloud-border rounded-md focus:outline-none focus:ring-1 focus:ring-cyprus focus:border-cyprus"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
          <button className="h-10 px-3 text-sm font-medium border border-cloud-border rounded-md bg-white hover:bg-slate-50 flex items-center gap-2 text-cyprus">
            <Filter className="w-4 h-4" />
            <span>Filter</span>
          </button>
        </div>
      </div>

      {/* Aligned Data Grid */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm text-left border-collapse">
          <thead>
            <tr className="border-b border-cloud-border bg-cloud text-xs font-semibold text-cyprus uppercase tracking-wider">
              <th className="py-3 px-4 text-left">Lot Number</th>
              <th className="py-3 px-4 text-left">Composition</th>
              <th className="py-3 px-4 text-right">Count (Ne)</th>
              <th className="py-3 px-4 text-right">Weight (KG)</th>
              <th className="py-3 px-4 text-center">Status</th>
              <th className="py-3 px-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-cloud-border">
            {paginatedRows.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-8 text-center text-slate-500">
                  No matching yarn batches found.
                </td>
              </tr>
            ) : (
              paginatedRows.map((batch) => (
                <tr key={batch.id} className="hover:bg-slate-50 transition-colors">
                  <td className="py-3.5 px-4 font-mono font-medium text-cyprus-dark">
                    {batch.lotNumber}
                  </td>
                  <td className="py-3.5 px-4 text-slate-700">
                    {batch.composition}
                  </td>
                  <td className="py-3.5 px-4 text-right font-mono tabular-nums text-slate-700">
                    {batch.countNe.toFixed(1)}s
                  </td>
                  <td className="py-3.5 px-4 text-right font-mono tabular-nums text-slate-900 font-semibold">
                    {batch.weightKg.toLocaleString()}
                  </td>
                  <td className="py-3.5 px-4 text-center">
                    <span
                      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        batch.status === 'In Stock'
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          : batch.status === 'Allocated'
                          ? 'bg-blue-50 text-blue-700 border border-blue-200'
                          : batch.status === 'Dyeing'
                          ? 'bg-amber-50 text-amber-700 border border-amber-200'
                          : 'bg-red-50 text-red-700 border border-red-200'
                      }`}
                    >
                      {batch.status}
                    </span>
                  </td>
                  <td className="py-3.5 px-4 text-right">
                    <button className="text-xs font-medium text-cyprus hover:underline">
                      View Audit
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination Footer */}
      <div className="p-4 border-t border-cloud-border flex items-center justify-between text-sm text-slate-600 bg-cloud">
        <div>
          Showing{' '}
          <span className="font-semibold font-mono tabular-nums">
            {filtered.length === 0 ? 0 : (currentPage - 1) * pageSize + 1}
          </span>{' '}
          to{' '}
          <span className="font-semibold font-mono tabular-nums">
            {Math.min(currentPage * pageSize, filtered.length)}
          </span>{' '}
          of{' '}
          <span className="font-semibold font-mono tabular-nums">
            {filtered.length}
          </span>{' '}
          entries
        </div>

        <div className="flex items-center gap-1">
          <button
            onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
            disabled={currentPage === 1}
            className="p-1.5 rounded border border-cloud-border bg-white disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-100"
            aria-label="Previous Page"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="px-3 text-xs font-mono font-medium">
            {currentPage} / {totalPages}
          </span>
          <button
            onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
            disabled={currentPage === totalPages}
            className="p-1.5 rounded border border-cloud-border bg-white disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-100"
            aria-label="Next Page"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
```

---

### Component: Aligned Metric Card with Tactile Feedback

```tsx
// frontend/src/components/ui/StatMetricCard.tsx
import React from 'react';
import { LucideIcon } from 'lucide-react';

interface StatMetricCardProps {
  title: string;
  value: string | number;
  unit?: string;
  change?: string;
  isPositive?: boolean;
  icon: LucideIcon;
  subtext?: string;
}

export const StatMetricCard: React.FC<StatMetricCardProps> = ({
  title,
  value,
  unit,
  change,
  isPositive = true,
  icon: Icon,
  subtext,
}) => {
  return (
    <div className="flex flex-col justify-between h-32 p-4 bg-white border border-cloud-border rounded-lg shadow-sm hover:border-cyprus/40 transition-all active:scale-[0.99]">
      <div className="flex items-start justify-between">
        <span className="text-xs font-semibold text-cyprus uppercase tracking-wider">
          {title}
        </span>
        <div className="p-1.5 bg-cloud-panel rounded-md text-cyprus">
          <Icon className="w-4 h-4" />
        </div>
      </div>

      <div className="mt-2 flex items-baseline gap-1.5">
        <span className="text-2xl font-bold font-mono tabular-nums text-cyprus-dark">
          {value}
        </span>
        {unit && <span className="text-xs text-slate-500 font-medium">{unit}</span>}
      </div>

      <div className="mt-1 flex items-center justify-between text-xs">
        {change && (
          <span
            className={`font-mono font-semibold ${
              isPositive ? 'text-emerald-700' : 'text-rose-700'
            }`}
          >
            {change}
          </span>
        )}
        {subtext && <span className="text-slate-400">{subtext}</span>}
      </div>
    </div>
  );
};
```

---

## ✅ Frontend Performance & UI Quality Checklist

Before shipping any new view, page, or modal in `Everest-Textile-Mills`:

### 🚀 Performance Checks
- [ ] **Pagination/Limit Enforced**: Any array rendering over 25 items implements pagination or windowing.
- [ ] **Search Debounced**: Keystroke-driven filtering or API requests use `useDebounce(..., 300)`.
- [ ] **Memoization Applied**: Expensive aggregations use `useMemo`; list items use `React.memo`.
- [ ] **Dynamic Route Imports**: New pages are lazy-loaded via `React.lazy()` with suspense boundaries.
- [ ] **Named Icon Imports**: Lucide icons are strictly imported as named members, avoiding full module bloat.
- [ ] **No Unnecessary Re-renders**: Checked via React DevTools Profiler to ensure parent state doesn't trigger cascade re-renders.

### 📐 Layout & Alignment Checks
- [ ] **Action Bar Height Uniformity**: All input boxes, dropdowns, and buttons in the filter bar share an exact height (`h-10` or `h-9`).
- [ ] **Tabular Numerics**: Numerical columns in tables feature `text-right font-mono tabular-nums`.
- [ ] **Grid Gaps Synchronized**: Section cards and stats strictly use `gap-4` or `gap-6` on the 8pt scale.
- [ ] **Horizontal Margins Responsive**: Page shell uses `px-4 sm:px-6 lg:px-8` with a constrained container (`max-w-7xl mx-auto`).
- [ ] **Zero Cumulative Layout Shift (CLS)**: Chart and media containers declare explicit height bounds or skeletons before async data loads.

### 🧵 Authenticity & Industrial Polish Checks
- [ ] **Authentic Domain Lexicon**: Displays actual textile metrics (Ne Count, GSM, Spindle RPM, Loom Efficiency %).
- [ ] **Typography Hierarchy**: Headers in `Fraunces`, UI labels in `Inter`, telemetry/IDs in `JetBrains Mono`.
- [ ] **Semantic Status Tokens**: Loom machine statuses strictly use defined tokens (`--ok`, `--warn`, `--bad`, `--idle`).
- [ ] **Tactile Feedback**: Interactive buttons possess subtle active scale states (`active:scale-[0.98]`).

---

## 💻 Getting Started & Development Commands

Navigate to the `frontend/` directory to run and build the application:

```bash
# Navigate to the frontend directory
cd frontend

# Install dependencies
npm install

# Start local development server with HMR
npm run dev

# Run TypeScript check and build production bundle
npm run build

# Preview production build locally
npm run preview
```

---

*Designed and maintained for Everest Textile Mills Operations & Engineering.*
