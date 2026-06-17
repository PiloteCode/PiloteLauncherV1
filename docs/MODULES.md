# Les modules

Les modules sont des petites extensions qu'on active dans le launcher (onglet **Modules**)
pour lui ajouter des fonctions, sans toucher au cœur du launcher. Le launcher en embarque
quatre, et on peut en proposer d'autres depuis la marketplace du site (`/modules`).

## Les modules fournis

| Module | Ce qu'il fait |
|---|---|
| **Discord Rich Presence** (`discord-rpc`) | Affiche sur Discord l'instance en cours, le loader et le temps de jeu. |
| **Temps de jeu** (`playtime-tracker`) | Compte le temps passé par instance et garde les totaux. |
| **Statut serveur** (`server-status`) | Ping les serveurs que tu configures et montre joueurs en ligne + latence. |
| **Auto-réglage RAM** (`ram-auto-tuner`) | Lit la RAM de la machine et propose/applique une allocation par instance. |

> Discord RPC a besoin d'un *Discord Application ID*. Mets le tien via la variable
> d'environnement `PILOTE_DISCORD_CLIENT_ID` ; avec l'ID d'exemple, le module se connecte
> mais Discord ignore la présence (aucun effet de bord).

## Installer depuis le site

Sur `/modules`, chaque module a un bouton **Installer** qui ouvre un lien
`pilote://module/install/<id>`. Le launcher le capte (il s'enregistre comme gestionnaire du
schéma `pilote://`), active le module et t'amène sur l'onglet Modules. Si le launcher n'est
pas installé, le bouton propose de le télécharger.

## Écrire un module

Un module est un objet `{ id, setup(ctx) }`. `id` correspond à une entrée du registre
(`packages/types` → `BUILTIN_MODULES`). `setup` est appelé quand le module est activé et peut
renvoyer une fonction de nettoyage, appelée à la désactivation.

```ts
import type { PiloteModule } from '@/modules/sdk';

export const monModule: PiloteModule = {
  id: 'mon-module',
  setup(ctx) {
    ctx.ui.setSummary('Prêt');

    const off = ctx.on((e) => {
      if (e.type === 'session:start') {
        ctx.toast(`Tu lances ${e.instanceName}`);
      }
    });

    return () => off(); // nettoyage quand on désactive le module
  },
};
```

Puis on l'ajoute au registre des implémentations
(`apps/client/src/modules/builtin/index.ts`) et son manifeste à `BUILTIN_MODULES`.

### Ce que `ctx` donne

- **`ctx.on(handler)`** — s'abonner aux évènements du launcher. Renvoie une fonction pour se
  désabonner (auto-nettoyée). Évènements : `session:start`, `session:stop`, `profile:change`,
  `instances:change`, `tick` (toutes les 30 s).
- **`ctx.launcher`** — `activeProfile()`, `instances()`, `runningIds()`, `instanceById(id)`,
  et `setInstanceRam(id, mb)` (réglage RAM par instance).
- **`ctx.capabilities`** — les pouvoirs côté système : `systemMemoryMb()`,
  `pingServer(host, port?)`, `discordActivity(activity | null)`.
- **`ctx.storage`** — `get(key, défaut)`, `set(key, valeur)`, `all()` : réglages persistés du
  module.
- **`ctx.ui`** — `setSummary(texte)`, `setActions([{label, onClick}])`,
  `setSettingsFields([{key, label, type}])` : ce qui s'affiche sur la carte du module.
- **`ctx.toast(message, kind?)`** et **`ctx.log(...)`**.

### Permissions

Chaque module déclare dans son manifeste les capacités qu'il utilise (`sessions`, `profiles`,
`instances`, `overrides`, `system`, `network`, `discord`, `storage`, `ui`). Elles sont
affichées sur la carte du module pour que l'utilisateur sache ce qu'il fait.

### Règles

- Un module ne touche jamais au disque ni au réseau directement : tout passe par `ctx`.
- `setup` doit être idempotent (il peut être relancé quand les réglages changent).
- Garde le travail dans les handlers court ; pour du périodique, utilise l'évènement `tick`.
