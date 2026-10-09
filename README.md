# COM’FRAT — Les Persévérants

Application mobile-first de gestion des présences et d’accueil de la Com’Frat Les Persévérants.

## Fonctionnalités

- Inscription des membres, nouveaux, NA, NC et invités.
- Confirmation de présence avec QR personnel, tablette d’accueil ou saisie par l’équipe.
- Fiches individuelles, historique des présences, statistiques et suivi des personnes à recontacter.
- Tableau de bord réservé aux responsables.

## Développement local

Prérequis : Node.js 22.13 ou plus récent.

```sh
npm ci
npm run dev
```

L’application utilise le starter Vinext et une base Cloudflare D1. Le schéma est défini dans `db/schema.ts`, avec sa migration initiale dans `drizzle/`. Pour initialiser une base locale, générer le Worker puis appliquer la migration avec Wrangler en mode local.

## Déploiement

Le projet est configuré pour Cloudflare Sites avec une liaison D1 nommée `DB`, déclarée dans `.openai/hosting.json`. Les secrets d’authentification sont gérés par la plateforme ; aucune clé secrète ne doit être ajoutée au dépôt.

Les vérifications des parcours locaux sont disponibles dans `tests/check-flows.mjs`.
