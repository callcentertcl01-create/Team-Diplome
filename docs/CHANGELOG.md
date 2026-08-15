# 📋 Changelog — Team Diplôme

> Dépôt : [github.com/callcentertcl01-create/Team-Diplome](https://github.com/callcentertcl01-create/Team-Diplome)  
> Branche : `main`

---

## [aeca33a] — 2026-08-15
### ✨ feat: migrate to server-side sync architecture

Refactorisation majeure du `server.ts` : migration vers une architecture synchronisée côté serveur avec Supabase.

**Changements :**
- `startServer()` est maintenant une fonction async encapsulant toutes les routes
- Ajout de `db.syncFromSupabase()` avant chaque endpoint critique
- Nouvel endpoint `POST /api/admin/reset-database`
- Amélioration du CSV export (détail des soumissions historiques)
- Endpoint `/api/auth/supabase-signup` pour l'inscription sécurisée côté serveur

---

## [b522e50] — 2026-08-15
### 🔧 fix: remove invalid runtime field in vercel.json

```diff
- "runtime": "nodejs20.x"
+ "maxDuration": 30
```

**Erreur corrigée :** *"Les environnements d'exécution de fonctions doivent avoir une version valide"*

---

## [f6c2ed9] — 2026-08-15
### 🔧 fix: duplicate vite dep + serverless crash + vercel.json config

#### `package.json`
```diff
- "dependencies": { "vite", "@vitejs/plugin-react", "@tailwindcss/vite" }
+ "devDependencies": { "vite", "@vitejs/plugin-react", "@tailwindcss/vite" }
```

#### `server.ts`
- Import Vite statique → rendu dynamique, conditionné par `VERCEL !== "1"`

#### `vercel.json`
- Syntaxe `builds/routes` (v1) → `buildCommand/functions/rewrites` (moderne)

---

## [9236398] — 2026-08-15
### 🔧 fix: Vercel serverless function crashing due to static vite import

Première tentative de correction du crash serverless.

---

## [2e9fc95] — 2026-08-15
### 🔧 fix: Vercel server configuration et interfaces admin

---

## [18ebbc7] — 2026-08-15
### ✨ feat: improve auth, persistence, and state handling

---

## [c274001] — 2026-08-13
### ✨ feat: improve DB sync, auth fallback, and UI cleanup

---

## [0c8e643] — 2026-08-12
### ✨ feat: implement Supabase persistence and auth sync

---

## [2d9cb7a] — 2026-08-12
### 🎉 feat: initialize Team Diplôme project structure

---

## [f5d3347] — 2026-08-12
### 🚀 Initial commit

---

## 🔑 Variables d'environnement Vercel

| Variable | Cibles | Type |
|---|---|---|
| `VITE_SUPABASE_URL` | production, preview | plain |
| `VITE_SUPABASE_ANON_KEY` | production, preview | sensitive |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | production, preview, development | plain |
| `SUPABASE_SERVICE_ROLE_KEY` | production, preview | sensitive |
| `GEMINI_API_KEY` | production, preview | sensitive |
| `APP_URL` | production, preview | sensitive |

---

## 🛠️ Corrections critiques server.ts (résumé)

| Problème | Cause | Fix |
|---|---|---|
| Crash serverless Vercel | `import { createServer } from "vite"` statique au top level | Import dynamique conditionné par `VERCEL !== "1"` |
| PORT hardcodé | `const PORT = 3000` | `process.env.PORT \|\| 8080` |
| Routes non enregistrées sur Vercel | `startServer()` pas appelé côté serverless | `startServer()` appelé dans le bloc `else { VERCEL === "1" }` |
