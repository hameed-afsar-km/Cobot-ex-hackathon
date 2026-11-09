# Cobot-ex Leaderboard Platform

A production-ready, real-time competition leaderboard web application featuring a futuristic crimson sci-fi aesthetic, multi-administrator management, independent 3-round scoring, real-time public synchronization, top-three concealment, and a cinematic animated winner reveal.

---

## 🚀 Key Features

### 1. Public Live Leaderboard (`/`)
- **Real-Time Synchronization**: Live updates pushed immediately upon administrator score submissions.
- **Top-3 Concealment**: Top 3 teams are concealed prior to the official reveal. Spectators see rankings and movement indicators without revealing identities or scores.
- **Dynamic Ranking Movements**: Real-time position tracking with directional badges (↑ Green, ↓ Red, — Neutral).
- **Team Expansion**: Expand non-concealed teams to inspect member lists and round-by-round criterion mark breakdowns.

### 2. Cinematic Winner Reveal Experience (`/reveal`)
- **Stage 1 (Identity Reveal)**: Sequential reveal of 3rd, 2nd, and 1st place team names with blur-removal and scale animations.
- **Stage 2 (Shuffle Animation)**: Esports-style horizontal card shuffle acceleration and deceleration.
- **Stage 3 (Podium Reveal)**: Olympic/esports style podium with final scores out of 150.
- **Stage 4 (Celebration)**: Dynamic red particle confetti and champion spotlighting.
- **Synchronized State**: Deterministic timestamp-based stages allowing late-joining spectators and refreshes to land on the correct animation stage.

### 3. Comprehensive Admin Dashboard (`/admin`)
- **Google Authentication**: Protected via administrator allowlist and role-based access control (Super Admin & Admin).
- **CSV & Excel Import (`/admin/teams/import`)**: File drag-and-drop, automated column detection, custom column mapping, duplicate detection, and batch import.
- **Three-Round Scoring (`/admin/rounds/[roundId]`)**:
  - Exactly 3 independent rounds (Round 1: 50, Round 2: 50, Round 3: 50).
  - 5 customizable criteria per round (Max 10 marks per criterion).
  - Maximum final score: 150.
  - Partial evaluation detection (missing scores are never misrepresented as zero).
  - Score revision audit history.
- **Reveal Control Center (`/admin/reveal`)**: Pre-reveal readiness checklist, top-3 preview, single-click synchronized broadcast, and reset controls.
- **Administrator Management (`/admin/administrators`)**: Super Admin controls to add/remove authorized Google accounts and toggle active status.
- **Audit Activity Log (`/admin/activity`)**: Searchable log of logins, score submissions, team modifications, and reveal actions.
- **Competition Settings (`/admin/settings`)**: Configurable criteria names, tie-breaking policy, decimal scoring toggle, and instant demo data seeder.

---

## 🎨 Visual Identity: Crimson Sci-Fi Theme

- **Obsidian Black (`#090909`)**: Core backdrop
- **Deep Black (`#050505`)**: Darkest contrast zones
- **Charcoal (`#111111`)**: Elevation and card surfaces
- **Deep Crimson (`#190707`)**: Red-tinted panels
- **Inferno Red (`#E50914`)**: Primary brand accent and interactive glow
- **Energy Red (`#FF3028`)**: Pulsing highlights
- **Metallic Silver (`#B9B9B9`)**: Secondary accents

---

## 🛠️ Technology Stack

- **Framework**: Next.js 16 (App Router, Turbopack, React 19)
- **Styling**: Tailwind CSS v4, Lucide Icons
- **UI Components**: shadcn/ui
- **Animations**: Framer Motion
- **Database & Auth**: Firebase Firestore & Firebase Authentication
- **File Parsing**: SheetJS (`xlsx`)
- **Notifications**: Sonner

---

## ⚙️ Getting Started

### 1. Environment Setup

Copy `.env.example` to `.env.local` and configure your Firebase project credentials:

```bash
cp .env.example .env.local
```

Fill in your Firebase credentials in `.env.local`:

```env
NEXT_PUBLIC_FIREBASE_API_KEY=AIzaSy...
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your-app.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your-app-id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your-app.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=...
NEXT_PUBLIC_FIREBASE_APP_ID=1:...
```

### 2. Firestore Security Rules & Indexes

Deploy the rules and indexes from the `firebase/` directory:

```bash
firebase deploy --only firestore:rules,firestore:indexes
```

### 3. Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) for the public leaderboard or [http://localhost:3000/admin](http://localhost:3000/admin) for the administrative console.

---

## 🧪 Seeding Sample Data

Navigate to `/admin/settings` and click **"Seed Sample Teams & Scores"** to populate the database with a competition, 6 competing robotics teams, and submitted scores for Rounds 1 & 2 for instant testing.
