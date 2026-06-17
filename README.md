<div align="center">

<img src="web/public/logo.svg" alt="Pilote Project" width="84" height="84" />

# Pilote Project

**Launcher Minecraft Java custom — ultra modulaire, multi-instances, auto-update.**

Un launcher desktop (Electron + Vue 3) avec profils offline, instances **publiques** et **privées** (débloquées par code d'accès), synchronisation des fichiers par hash, et un backend Next.js qui sert la landing, le panel admin et la distribution des mises à jour.

[![CI](https://github.com/PiloteCode/PiloteLauncherV1/actions/workflows/ci.yml/badge.svg)](https://github.com/PiloteCode/PiloteLauncherV1/actions/workflows/ci.yml)
[![Release](https://github.com/PiloteCode/PiloteLauncherV1/actions/workflows/release.yml/badge.svg)](https://github.com/PiloteCode/PiloteLauncherV1/actions/workflows/release.yml)
![Electron](https://img.shields.io/badge/Electron-33-47848F?logo=electron&logoColor=white)
![Vue 3](https://img.shields.io/badge/Vue-3-42b883?logo=vuedotjs&logoColor=white)
![Next.js](https://img.shields.io/badge/Next.js-15-000?logo=nextdotjs&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-strict-3178c6?logo=typescript&logoColor=white)
![License](https://img.shields.io/badge/license-MIT-blue)

</div>

---

> [!IMPORTANT]
> **Mode offline uniquement.** Pilote Project crée des profils **sans authentification Microsoft/Mojang**. Il récupère le vrai UUID/skin quand le pseudo correspond à un compte premium, sinon il calcule l'UUID offline canonique (`MD5("OfflinePlayer:{pseudo}")`). Ça ne fonctionne **que** sur des serveurs configurés avec `online-mode=false`. Le launcher **ne contourne aucune authentification** sur serveurs premium. Projet non affilié à Mojang/Microsoft.

## ✨ Fonctionnalités

- 🎮 **Lancement complet** — vanilla + **Fabric / NeoForge / Forge / Quilt**, JRE provisionné automatiquement (Java 8/17/21 selon la version MC), classpath/natives/assets gérés par [`@xmcl`](https://github.com/Voxelum/minecraft-launcher-core-node).
- 👥 **Profils offline multiples** — pseudo → UUID + skin réels (Mojang) avec cache & backoff, ou UUID offline canonique. Switch rapide de compte.
- 🗂️ **Multi-instances** — instances **publiques** (visibles par tous) et **privées** (cachées, débloquées par un **code d'accès** → JWT scopé). Personne d'autre ne voit vos instances privées.
- 🔄 **Sync par hash SHA-1** — au lancement, diff du manifeste : seuls les fichiers modifiés sont téléchargés, les obsolètes (gérés par le launcher) sont supprimés. Jamais de re-téléchargement complet inutile.
- ⬆️ **Auto-update** — du launcher (`electron-updater`) **et** des fichiers d'instance (diff de version).
- 🛡️ **Production-ready** — zéro mock, vérification d'intégrité systématique (rejet + retry sur mismatch), erreurs typées, IPC validé par Zod, CSP stricte, `contextIsolation`.
- 🎨 **UI sobre & premium** — dark par défaut, palette zinc + un seul accent bleu froid, typo Geist, animations brèves (motion-v). Covers d'instance auto-générées (OKLCH).
- 🖥️ **Panel admin web** — CRUD instances, upload **drag & drop**, gestionnaire de mods (parsing métadonnées), visibilité public/privé, génération/rotation de code d'accès.

## 🧱 Architecture (monorepo pnpm + Turborepo)

```
PiloteLauncherV1/
├── apps/
│   └── client/          # Electron + Vue 3 — le launcher (Pilote Project)
│       ├── electron/    #   main · preload (IPC typé) · ipc handlers
│       └── src/         #   renderer Vue (views, components, stores Pinia)
├── packages/
│   ├── core/            # logique launcher (wrappe @xmcl) : install · launch · auth/UUID · sync
│   └── types/           # DTO + schémas Zod partagés client ↔ server ↔ admin
├── web/                 # Next.js 15 — landing + panel admin + API + distribution updates
│   ├── app/             #   (marketing) · admin · api · docs (Swagger UI)
│   ├── lib/             #   db (Prisma) · auth (Better Auth) · storage · jwt
│   └── prisma/          #   schema + seed
├── openapi.yaml         # contrat REST (source de vérité, miroir de packages/types)
└── DESIGN.md            # tokens du design system (dérivés du mockup)
```

Le **renderer ne touche jamais au filesystem ni au réseau brut** : tout passe par `window.launcher.*` (preload → IPC → handlers main), chaque canal typé et **validé par Zod** côté main.

```
┌────────────────────────────┐        HTTPS         ┌──────────────────────────────┐
│  Electron client           │  ───────────────────▶ │  web (Next.js)               │
│  ┌──────────┐  IPC  ┌─────┐│   GET /api/instances  │  ┌──────────┐  ┌────────────┐ │
│  │ renderer │◀─────▶│main ││   POST /unlock        │  │  API     │  │  Prisma    │ │
│  │  (Vue)   │       │+core││   GET /manifest       │  │ routes   │──│  (SQLite/  │ │
│  └──────────┘       └─────┘│   GET /files/:hash    │  └──────────┘  │  Postgres) │ │
│   profiles · instances     │   GET /api/updates    │  admin (Better │  └──────────┘ │
│   sync · launch · updater  │ ◀──── latest.yml ──── │  Auth) + landing + Swagger UI │
└────────────────────────────┘                       └──────────────────────────────┘
```

## 🚀 Démarrage rapide

**Prérequis :** Node ≥ 20, pnpm ≥ 9. (Windows/macOS/Linux.)

```bash
git clone https://github.com/PiloteCode/PiloteLauncherV1.git
cd PiloteLauncherV1
pnpm install
```

### Backend web (landing + admin + API)

```bash
cd web
cp .env.example .env          # remplir BETTER_AUTH_SECRET, INSTANCE_JWT_SECRET, ADMIN_*
pnpm db:migrate:dev           # crée la base SQLite (dev)
pnpm db:seed                  # crée le premier admin (idempotent)
pnpm dev                      # http://localhost:3000  ·  admin: /admin  ·  docs: /docs
```

En production, un script tout-en-un est fourni :

```bash
cd web && ./start.sh          # install + prisma generate + migrate + seed + build + start
```

### Launcher (Electron)

```bash
pnpm dev:client               # lance le launcher en mode dev (hot reload)
# build d'installeurs :
pnpm --filter @pilote/client dist:win   # ou dist (Win/mac/Linux selon l'OS)
```

## 🔐 Instances privées — comment ça marche

1. L'admin crée une instance `private` et génère un **code d'accès** (panel admin). Seul l'**argon2 hash** est stocké.
2. Le joueur clique « Ajouter via un code » dans le launcher et saisit le code.
3. Le backend valide (argon2), renvoie un **JWT court scopé à cette instance**.
4. Le client récupère le manifeste et télécharge les fichiers — **les URLs des fichiers privés exigent ce token**. Aucune instance privée n'apparaît jamais dans `GET /api/instances`.

## 📡 API

Contrat complet : [`openapi.yaml`](./openapi.yaml) — également servi en **Swagger UI** sur `/docs`.

| Méthode | Route | Auth | Description |
|---|---|---|---|
| `GET` | `/api/instances` | — | Instances **publiques** uniquement |
| `POST` | `/api/instances/unlock` | — | Débloque une privée par code → `{ token, instance }` |
| `GET` | `/api/instances/:id/manifest` | token si privée | Manifeste de fichiers (sync) |
| `GET` | `/api/files/:hash` | token si privé | Fichier content-addressed (SHA-1) |
| `GET` | `/api/updates/:channel/:file` | — | Feed electron-updater + installeurs |
| `*` | `/api/admin/*` | session Better Auth | CRUD instances, upload, code d'accès |

## 🎨 Design system

Dark par défaut, **zinc + un seul accent** (`#3b82f6`), typo **Geist / Geist Mono**, radius doux, ombres discrètes, fenêtre frameless. Tokens & composants détaillés dans [`DESIGN.md`](./DESIGN.md).

## 🛠️ Stack

| Domaine | Choix |
|---|---|
| Desktop shell | Electron (`contextIsolation`, `nodeIntegration:false`, CSP) |
| Build | electron-vite · Next.js 15 · Turborepo |
| UI | Vue 3 `<script setup>` + shadcn-vue (client) · React + shadcn (web) · Tailwind · motion-v / framer-motion |
| State | Pinia |
| Core MC | `@xmcl/core` · `@xmcl/installer` · `@xmcl/mod-parser` |
| Backend | Next.js route handlers · Prisma (SQLite→Postgres) · Better Auth · argon2 · jose (JWT) |
| Validation | Zod (IPC, API, configs) |
| Update | electron-updater (GitHub Releases / generic self-host) |

## ⚠️ Pièges respectés

- UUID offline = `MD5("OfflinePlayer:{pseudo}")` avec bits version (3) / variant forcés → inventaire serveur conservé.
- Natives & classpath laissés à `@xmcl/core`. Forge installé via processeurs `@xmcl/installer`.
- Rate-limit Mojang : cache local + backoff, fonctionne hors-ligne sur les UUID connus.
- Intégrité SHA-1 sur **chaque** fichier téléchargé.

## 📦 Releases & auto-update

Pusher un tag `vX.Y.Z` déclenche [`release.yml`](.github/workflows/release.yml) : build multi-OS + publication des installeurs et de `latest*.yml` sur la Release GitHub. Le launcher vérifie ce feed au démarrage.

## 📄 Licence

[MIT](./LICENSE) — projet non officiel, non affilié à Mojang Studios / Microsoft.
