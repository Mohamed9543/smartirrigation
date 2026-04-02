# SmartIrrig - Application de gestion intelligente de l'irrigation

## Structure du projet
```
smartirrig/
├── frontend/          # React Native / Expo
│   ├── app/
│   │   ├── (auth)/   login, register, forgot-password, confirm-code, new-password
│   │   ├── (tabs)/   index, cultures, calendar, irrigation, fertilisation, historique
│   │   └── (admin)/  dashboard, utilisateurs, irrigations
│   ├── components/
│   ├── config/        api.js (LOCAL_IP à configurer)
│   ├── context/       LanguageContext
│   ├── hooks/         useNotifications
│   └── api/           auth.js
└── backend/           Node.js / Express / MongoDB
    ├── server.js
    ├── src/
    │   ├── controllers/
    │   ├── models/
    │   ├── routes/
    │   ├── services/
    │   └── data/
    └── .env
```

## Configuration

### Backend (.env)
```
PORT=5000
MONGODB_URI=<votre-uri-mongodb>
JWT_SECRET=<votre-secret>
ADMIN_EMAIL=admin@smartirrig.com
ADMIN_PASSWORD=Admin1234!
OPENWEATHER_API_KEY=<votre-cle>
EMAIL_USER=<gmail-pour-reset-password>
EMAIL_PASS=<app-password-gmail>
```

### Frontend (config/api.js)
Remplacez `LOCAL_IP` par l'IP de votre machine :
```js
const LOCAL_IP = '192.168.1.XXX';
```

### Google OAuth (app/(auth)/login.jsx)
Remplacez `YOUR_GOOGLE_CLIENT_ID` par votre Client ID Google Cloud.
Installez : `npx expo install @react-native-google-signin/google-signin`

## Démarrage

### Backend
```bash
cd backend
npm install
npm run dev
```

### Frontend
```bash
cd frontend
npm install
npx expo start
```

## Fonctionnalités
- ✅ Authentification JWT + Google OAuth (placeholder)
- ✅ Mot de passe oublié avec code email 6 chiffres (Nodemailer)
- ✅ Interface multilingue (FR/EN/AR/TR)
- ✅ Dashboard admin avec statistiques
- ✅ Gestion utilisateurs admin (suppression corrigée)
- ✅ Menu dropdown langue fonctionnel dans AdminShell
- ✅ Fertilisation avec prochaine/dernière + historique marquer effectué
- ✅ Calendrier météo sans badge "En direct"
- ✅ Historique logs utilisateur (UserActivityLog)
- ✅ Calcul ET₀ Penman-Monteith FAO-56
- ✅ Messages d'erreur login (Email or password wrong / champs vides)
