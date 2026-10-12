# Visual Style & Motion Design Prompt

Use this prompt to replicate the exact color palette, visual tone, and animation language of the site:

---

```markdown
Design a user interface with a distinctive "Archival Industrial & Botanical Heritage" aesthetic, characterized by deep spruce greens, crisp mist-tinted neutrals, tactile paper grain, and fluid physical motion.

---

### 1. Color Palette & Visual Materiality

The color story pairs a stately, mid-century botanical spruce tone with archival light backgrounds and harmonized earthy status accents:

- **Primary Brand ("Cyprus"):**
  - **Core Cyprus (`#004643`):** A deep, saturated evergreen/spruce tone used for primary actions, prominent brand elements, and high-contrast editorial typography.
  - **Cyprus Dark (`#003330`):** A rich, shadowy forest green for hover states, pressed buttons, and high-emphasis focal points.
  - **Cyprus Light (`#E0EFEA`):** A pale mint-tinted mist used for subtle pill backgrounds, secondary interactive chips, and gentle tinting.
  - **Cyprus Muted (`#53706D`):** A dusty slate-pine for supporting descriptions, secondary metadata, and non-distracting icons.

- **Surfaces, Canvas & Neutrals:**
  - **Cloud White (`#FAFAFA`):** An airy, warm, off-white canvas background that avoids clinical starkness.
  - **Mint Cream Panel (`#F0F6F4`):** A soft, pale sage-tinted off-white for secondary card groupings, table header bands, and recessed surfaces.
  - **Panel Border Line (`#DCE7E4`):** A gentle botanical gray-sage border separating panels with crisp, subtle definition.
  - **Pure Surface (`#FFFFFF`):** Crisp white for elevated foreground cards and floating dialogs.
  - **Text Charcoal (`#0E2422`):** A deep spruce-black for primary body text, ensuring high legibility while retaining the botanical color temperature.

- **Harmonized Status & Alert Tones (Earth-Calibrated):**
  - **Healthy / Success (`#1C7C54`):** A calm pine emerald rather than standard neon green.
  - **Idle / Neutral (`#6E8885`):** A quiet slate-sage tone for queued, waiting, or paused states.
  - **Warning / In-Progress (`#D4881E`):** A warm ochre/amber for active processing, warnings, and attention states.
  - **Critical / Danger (`#C63737`):** An earthy brick-crimson for breakdowns, defects, and critical alerts.

- **Material Texture & Lighting:**
  - **Archival Grain Overlay:** A microscopic, semi-translucent fractal noise texture across the canvas (2.5% opacity) to provide the tactile feel of archival paper or raw cotton textile.
  - **Directional Tinted Shadows:** Soft elevation using green-tinted shadows (`rgba(0, 70, 67, 0.05)` ambient contact and `rgba(0, 70, 67, 0.15)` diffused blur) rather than generic dark gray drop shadows.
  - **Glassmorphism:** Polished translucent surfaces (`backdrop-blur-2xl` over `white/95`) with soft diffused boundaries.

---

### 2. Animation & Motion Design

The animation language combines ambient, fluid organic waves with snappy, physics-based micro-interactions:

- **Ambient Fluid WebGL Aurora Wave:**
  - A living, smooth Simplex 2D noise wave moving fluidly across the background in hero and authentication areas.
  - Transitions through a 3-stop gradient ribbon of Deep Cyprus (`#004643`), Forest Emerald (`#1C7C54`), and Luminous Teal (`#48A9A6`), drifting organically against a pure white backdrop.

- **Staggered Spatial Entrance Cascade:**
  - Cards, panels, and data widgets do not appear abruptly. They glide into view with a staggered upward cascade on page transitions.
  - Each item smoothly shifts upward by 16px while fading in from 0% to 100% opacity.
  - Paced with an exponential ease-out curve (`outExpo`) over 600ms, with a 70ms sequential stagger between adjacent cards.

- **Numerical Value Roll-Up (Counter Dynamics):**
  - Numeric metrics, metrics totals, and KPI figures animate upward from zero to their target numbers upon appearing.
  - Numbers rapidly decelerate as they approach their final target over 700ms using an exponential easing curve, giving weight and precision to the values.

- **Shopfloor & Operational Micro-Interactions:**
  - **Mechanical Rotation:** Continuous smooth circular spinning for active machinery, spindles, and running processes.
  - **Breathing Pulse:** Gentle, rhythmic opacity and glow breathing (1.5s–2s cycle) on active processes, logistics in transit, and live monitoring indicators.
  - **Attention Bounce:** Subtle, alert vertical bounce animation reserved strictly for critical alerts, defects, and system stops.
  - **Live Beacon Pulse:** Dual-ring beacon dots on active status badges that scale up to 140% and pulse softly in a continuous 1600ms quad loop.

- **Interactive Hover & Action Feedback:**
  - Buttons and interactive cards feature a crisp 150ms elevation lift (`translateY(-1px)`) combined with an 8% brightness boost on hover.
  - Progress indicators sweep smoothly from 0% to target percentage with an elastic ease-out fill over 550ms.
  - All motion strictly honors `prefers-reduced-motion` settings by instantly resolving to static, high-contrast final states.
```
