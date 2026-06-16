# Pilote Project — Design System

Extracted from the `Halcyon Launcher` mockup (the visual reference) and rebranded **Pilote Project**.
Aesthetic: **sober, modern, premium** — dark by default, neutral zinc, a single cold-blue accent used sparingly.
Reference ambiance: Modrinth App / Prism Launcher, but calmer and more minimal.

> Brand name everywhere is **Pilote Project** (never "Halcyon").

## Typography

- UI font: **Geist** (weights 400/500/600/700)
- Mono font: **Geist Mono** (400/500) — for versions, hashes, UUIDs, logs, paths
- Google Fonts import:
  `https://fonts.googleapis.com/css2?family=Geist:wght@400;500;600;700&family=Geist+Mono:wght@400;500&display=swap`
- Type scale (px): display 26 · h1 22 · h2 16 · h3 15 · body 13.5 · caption 12 · micro 11
- `body { -webkit-font-smoothing: antialiased; text-rendering: optimizeLegibility; }`

## Color tokens (dark — default)

| Token | Hex | Usage |
|---|---|---|
| `--bg` | `#0a0a0b` | app background |
| `--bg-titlebar` | `#0c0c0e` | title bar, sidebar |
| `--surface` | `#121214` | cards |
| `--surface-elevated` | `#101012` | settings panels, search field |
| `--surface-input` | `#0d0d0f` | inputs |
| `--surface-hover` | `#161619` | hover / dropdowns |
| `--surface-2` | `#18181b` | secondary buttons, toasts |
| `--surface-3` | `#1b1b1f` / `#202024` | pressed / nested |
| `--border` | `#1f1f24` | default card border |
| `--border-subtle` | `#18181b` | title bar separator |
| `--border-2` | `#26262b` | dividers, badges |
| `--border-input` | `#2a2a30` | inputs, elevated borders |
| `--border-hover` | `#2c2c32` | hover borders |
| `--fg` | `#fafafa` | primary text |
| `--fg-1` | `#ededef` | strong text |
| `--fg-2` | `#e4e4e7` | section headers |
| `--fg-3` | `#d4d4d8` | secondary text / labels |
| `--muted` | `#a1a1aa` | muted body |
| `--muted-2` | `#71717a` | placeholder, icon idle |
| `--muted-3` | `#52525b` | faint captions |
| `--accent` | `#3b82f6` | **cold blue** — CTA, active state, focus ONLY |
| `--success` | `#22c55e` (+ `#86efac`, `#dcfce7`) | installed / running / done |
| `--destructive` | `#ef4444` (+ `#fca5a5`) | close, kill, errors |
| scrollbar thumb | `#26262b` → hover `#34343a` | |

The accent is **rare**: primary buttons, the active nav item, focus rings, the running pulse uses success-green not accent. Never flood the UI with blue.

### Loader badge dot colors
`vanilla #9aceb1` · `fabric #cbb287` · `forge #9aa0a6` · `neoforge #e8a33d` · `quilt #b79cf2`

## Radius

window `14px` · cards `16px` · panels `16-18px` · buttons `9-11px` · inputs `10px` · badges/chips `6-7px` · small icon buttons `7-8px` · pills `99px`

## Shadows

- card hover: `0 18px 42px -20px rgba(0,0,0,.75)`
- dialog/overlay: `0 40px 90px -30px rgba(0,0,0,.85)`
- window: `0 50px 130px -34px rgba(0,0,0,.85), 0 0 0 1px rgba(255,255,255,.02) inset`
- dropdown: `0 22px 50px -18px rgba(0,0,0,.8)`

## Focus ring

`border-color: var(--accent); box-shadow: 0 0 0 3px color-mix(in oklch, var(--accent) 22%, transparent)`

## Auto-generated instance covers (no invented artwork)

Derive a hue from the name, render a subtle two-stop OKLCH gradient + the initials.

```js
function hueFromName(s){ s=s||'x'; let h=0; for(let i=0;i<s.length;i++) h=(h*31+s.charCodeAt(i))%360; return h; }
function coverGradient(name){ const h=hueFromName(name), h2=(h+28)%360;
  return `linear-gradient(150deg, oklch(0.55 0.115 ${h}), oklch(0.40 0.10 ${h2}))`; }
function initials(s){ return (s||'').replace(/[^A-Za-z0-9]/g,'').slice(0,2).toUpperCase() || 'MC'; }
```
Profile avatars use `oklch(0.55 0.115 <hue>)` flat fills with white initials.

## Keyframe animations (motion-v in Vue / framer-motion in web)

| Name | Effect |
|---|---|
| `fade` | `opacity 0→1, translateY 10px→0` (0.28–0.4s) — page/screen enter |
| `glow` | splash logo glow: opacity .4↔.78, scale 1↔1.16 (3s) |
| `float` | splash logo bob: translateY 0↔-5px (3.4s) |
| `spin` | 360° spinners (.7–.8s linear) |
| `shimmer` | progress bar sheen sweep (1.2s linear) |
| `toast` | slide-in from right + fade (0.28s `cubic-bezier(.2,.8,.2,1)`) |
| `dialog` | modal enter: opacity 0→1, translateY 14px→0, scale .97→1 (0.22s) |
| `shake` | invalid access code wiggle |
| `unlock` | private unlock: scale .6→1.06→1 + fade |
| `pulse` | running session dot opacity 1↔.35 (1.4s) |
| `ring` | expanding accent rings during unlock (scale .7→2, fade out) |

## Window chrome

Frameless **1280×800** (resizable), custom **44px** title bar:
- left: logo (13px rounded square rotated 45°, accent gradient + blur glow behind) · `Pilote Project` (13px/600) · version `v1.x.x` in mono (`--muted-3`)
- right: minimize / maximize (rounded-rect icon) / close (hover bg `#ef4444`)

## Key screens (launcher)

1. **Splash** — animated logo + glow + progress bar + 3-step checklist ("Vérification des mises à jour", "Initialisation du moteur", "Chargement des instances"). Not a plain spinner.
2. **Onboarding** — pseudo input → live skin/UUID preview card, "Continuer" CTA.
3. **Home / library** — sidebar (Bibliothèque / Réglages + profile switcher at bottom) + content:
   - "Publiques" section header with count chip → responsive card grid `repeat(auto-fill, minmax(var(--card-min), 1fr))`, gap 16px.
   - "Privées" section + "Ajouter via un code" outlined button + dashed add-via-code card.
   - **Instance card**: 118px cover (auto gradient + initials watermark + loader/MC badges top-left, play FAB bottom-right on hover, lock badge top-right if private), name, status chip, action button (Play / Mettre à jour / Télécharger).
   - **Running banner**: green-tinted, pulse dot, "Arrêter" (kill) button.
4. **Download overlay** — centered modal: big mono `NN%`, speed (green mono), shimmer progress bar, current file (mono), step list (Java/Vanilla/Loader/Mods with spinner→check), "Annuler".
5. **Code modal** — lock icon header, mono code input, error state (shake + red message), unlock animation (expanding accent rings + lock) then the private card appears.
6. **Settings** — RAM slider (accent), folders rows with "Modifier", theme toggle (Sombre/Clair segmented), language, About (version + "Vérifier les mises à jour").
7. **Profile switcher** — dropdown above the profile button: avatar chips, active check, "Ajouter un profil".
8. **Toasts** — bottom-right, colored status dot + message, sonner-vue.

## Web (landing + admin) — same system

- **Landing**: hero with the same logo/glow, sober dark sections, feature grid, download CTAs (Win/macOS/Linux), screenshots in device frames. One accent. No garish gradients.
- **Admin**: Better Auth login (centered, sober) → dashboard table (instances: name, visibility badge, MC, loader, total size, updated, actions) → instance editor (cover upload, markdown description/changelog, loader+version, RAM, visibility toggle, access-code generate/copy/rotate) → file/mod manager (drag & drop zone + table: name, short hash, size, target folder select, enable/disable toggle, parsed mod metadata).
- Use shadcn (vue for client / react for web), lucide icons, Tailwind tokens mapped to the variables above.
