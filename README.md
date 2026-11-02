# COM’FRAT — Les Persévérants

Application mobile-first de gestion des présences et d’accueil de la Com’Frat Les Persévérants.

## Fonctionnalités

- Inscription des membres, nouveaux, NA, NC, invités et enfants, avec « Véhiculé(e) » (oui / non), modifiable par la personne et par les responsables.
- Présence par QR du dimanche (ouvert du samedi 18 h au lundi 22 h), QR personnel ou saisie par l’équipe.
- Espace responsables : fiches, historique, statistiques, récap, personnes à recontacter, anniversaires, effectif adulte et taux de présence.
- Espace accueil (bénévoles) : présences, ajout d’enfants, demandes de correction, sans accès aux données personnelles.
- Prières et témoignages protégés par leur propre code, exportables (copie, e-mail, WhatsApp, PDF).
- Événements ponctuels (culte du matin, service…) : QR, scan et liste de présents propres à chaque événement, à part des statistiques de la Com’Frat.
- Exports de la liste des présents (copie, e-mail, WhatsApp, PDF, Excel) et récap des statistiques pour n’importe quelle rencontre passée.

## Hébergement

- **Site** : Vercel (construction Vinext + Nitro, réglée dans `vercel.json`).
- **Base de données** : Neon (PostgreSQL), via la variable `DATABASE_URL`.
  Toutes les tables sont créées automatiquement au premier accès (`db/schema.ts`, sans toucher aux données existantes).
  Diagnostic de configuration : `/api/sante`.

## Variables d’environnement

À régler dans Vercel → *Settings → Environment Variables* (jamais dans le code) :

| Variable | Rôle |
| --- | --- |
| `DATABASE_URL` | Chaîne de connexion Neon. Obligatoire. |
| `COMFRAT_OWNER_SECRET` | Phrase secrète du propriétaire (16 caractères minimum), saisie sur `/connexion-proprietaire` pour créer ou modifier les codes d’accès. |
| `COMFRAT_TEST_CHECKIN_OPEN` | Essais uniquement : `1` ouvre le QR du dimanche à tout moment. À ne pas régler en production. |

## Développement local

Prérequis : Node.js 22.13 ou plus récent.

1. Créer un fichier `.env.local` (ignoré par Git) contenant les variables ci-dessus, avec une branche Neon d’essai.
2. Lancer :

```sh
npm ci
npm run dev          # http://localhost:5173
```

Pour tester sur un téléphone du même réseau : `npm run dev -- --host 0.0.0.0`.

Construction de production locale : `npm run build` puis `npm start`.
