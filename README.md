# Pilote Project

Un launcher Minecraft Java que j'ai fait pour distribuer mes modpacks sans me prendre la tête : je push une instance, les joueurs l'ont en un clic, et le launcher se met à jour tout seul.

En gros c'est une app desktop (Electron + Vue) plus un petit backend Next.js qui sert la page de téléchargement, le panel admin et les fichiers.

> Profils hors-ligne uniquement. Pas de connexion Microsoft : on entre un pseudo, le launcher
> récupère l'UUID/skin si le compte est premium, sinon il calcule l'UUID offline habituel
> (`MD5("OfflinePlayer:<pseudo>")`). Donc ça marche seulement sur des serveurs en
> `online-mode=false` — rien n'est contourné côté Mojang. Projet perso, pas affilié à
> Mojang/Microsoft.

## Ce que ça fait

- Lance du vanilla + Fabric / Forge / NeoForge / Quilt, et installe le bon Java (8/17/21) tout seul. Le gros du boulot Minecraft (libs, natives, assets) passe par [@xmcl](https://github.com/Voxelum/minecraft-launcher-core-node).
- Plusieurs profils hors-ligne, switch rapide entre eux.
- Instances publiques (visibles par tout le monde) ou privées (cachées, débloquées avec un code). Une privée n'apparaît jamais dans la liste publique.
- Sync par hash : au lancement il compare les SHA-1 et ne télécharge que ce qui a changé.
- Auto-update du launcher et des instances.
- Panel admin web pour créer/éditer les instances, balancer les mods en drag & drop et gérer les codes d'accès.

## Le repo

Monorepo pnpm :

- `apps/client` — le launcher (Electron + Vue 3)
- `packages/core` — la logique Minecraft (install, lancement, sync, auth offline)
- `packages/types` — les types et schémas partagés
- `web` — le site : landing + admin + API (Next.js + Prisma)

## Lancer en local

Il faut Node 20+ et pnpm.

```bash
pnpm install
```

Le backend :

```bash
cd web
cp .env.example .env      # remplir les secrets
pnpm db:migrate:dev
pnpm db:seed              # crée le premier admin
pnpm dev                  # http://localhost:3000
```

En prod il y a un `web/start.sh` qui enchaîne tout (install, migrate, seed, build, start).

Le launcher :

```bash
pnpm dev:client
```

## API

Le contrat est dans [`openapi.yaml`](./openapi.yaml) et il y a une page Swagger sur `/docs`.

## Releases

Un tag `vX.Y.Z` lance le build des installeurs et la publication sur les Releases GitHub. Le launcher check ce flux au démarrage pour se mettre à jour.

## Licence

MIT — voir [LICENSE](./LICENSE).
