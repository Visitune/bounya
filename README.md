# 🥋 KIAI 64 — Karaté Rétro

Jeu de karaté au point, de style 8-bit, dans le navigateur. Il comprend un arbitre, un tournoi par ceintures contre l'IA, un duel local au clavier, jouable sur mobile et tablette et un **combat en ligne à deux**.

## Jouer en local

```bash
npm install
npm run dev          # http://localhost:3000
```

| | Joueur 1 | Joueur 2 (duel local) |
|---|---|---|
| Bouger / sauter / s'accroupir | Flèches | Z Q S D (W A S D en QWERTY) |
| Attaque | Espace | F |

Il y a 5 coups selon la direction tenue avec l'attaque : rien, ↑, ↓, avant, arrière, plus l'attaque en l'air. Reculer permet de bloquer.

## Mobile et tablette

Bouton **JOUER EN PLEIN ÉCRAN** : le jeu passe en paysage avec une croix de direction (pouce gauche) et un gros bouton **FRAPPE** (pouce droit), comme Flèches + Espace.
Astuce iPhone : Partager → **Sur l'écran d'accueil** pour un vrai plein écran.

## Jouer à deux en ligne

1. Joueur A : **En Ligne → Créer un salon**, puis envoyer le **lien d'invitation** à son ami.
2. Joueur B : ouvrir le lien. Le combat démarre automatiquement.

Technique : synchronisation par **lockstep déterministe** avec 4 frames (environ 67 ms) de délai d'entrée. Les deux machines calculent exactement la même partie, sans avantage pour l'hôte. Toutes les 2 secondes, une empreinte de l'état est comparée, et l'invité se recale automatiquement en cas d'écart.

## Héberger

### Option 1 — Render.com (lien permanent, gratuit)

1. Pousser ce dépôt sur GitHub.
2. Sur <https://dashboard.render.com> : **New → Blueprint** → choisir le dépôt. Le fichier `render.yaml` configure tout.
   (Ou à la main : **New → Web Service**, Build `npm ci && npm run build`, Start `npm start`, Health check `/healthz`.)
3. Partager l'URL `https://kiai-64.onrender.com` (ou celle que Render attribue).

Chaque `git push` sur `main` redéploie automatiquement.

> Offre gratuite : le service s'endort après 15 min sans visite. La première connexion prend alors environ 1 minute. Ouvrez le site une minute avant de jouer.
> Les salons sont en mémoire : gardez **une seule instance**.

### Option 2 — Depuis ton PC, tout de suite (Cloudflare Tunnel)

```powershell
winget install --id Cloudflare.cloudflared   # une fois
npm run prod                                 # build + serveur sur :3000
cloudflared tunnel --url http://localhost:3000
```

Envoyer l'adresse `https://xxxx.trycloudflare.com` affichée.

### Même Wi-Fi

`npm run prod`, puis l'ami ouvre `http://IP-DE-TON-PC:3000` (IP visible avec `ipconfig`).

## Scripts

| Script | Rôle |
|---|---|
| `npm run dev` | serveur + Vite avec rechargement à chaud |
| `npm run build` | build de production dans `dist/` |
| `npm start` | sert `dist/` + WebSocket (production) |
| `npm run prod` | build puis start |
| `npm run lint` | vérification TypeScript |
