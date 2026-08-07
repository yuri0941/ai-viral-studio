# AI Viral Studio

AI-powered platform for viral content creation, scheduling, analytics, and autonomous OMEGA co-pilot.

![Build](https://img.shields.io/badge/build-passing-brightgreen)
![React](https://img.shields.io/badge/frontend-React%20%2B%20Vite-blue)
![Node](https://img.shields.io/badge/backend-Node.js%20%2B%20Express-green)

## Quick Start

### Prerequisites
- Node.js 18+
- MongoDB
- npm or yarn

### Backend
```bash
cd backend
cp .env.example .env
npm install
npm run dev
```

### Frontend
```bash
cd frontend
cp .env.example .env
npm install
npm run dev
```

## Project Structure

```
D:/kilo2
├── backend/          # Express + MongoDB API
├── frontend/         # Vite + React + Tailwind app
├── desktop/          # Tauri desktop wrapper
├── docs/             # Guides and documentation
├── launch-kit/       # Marketing assets
└── uploads/          # User uploaded files
```

## Environment Variables

### Backend `.env`
```env
PORT=5000
MONGODB_URI=mongodb://localhost:27017/aiviral
JWT_SECRET=your_jwt_secret
GROQ_API_KEY=your_groq_key
```

### Frontend `.env`
```env
VITE_API_BASE_URL=http://localhost:5000
```

## Available Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start dev server |
| `npm run build` | Production build |
| `npm run preview` | Preview production build |
| `npm run lint` | Run linter |

## Deployment

- **Frontend**: Cloudflare Pages (build from `frontend/dist`)
- **Backend**: Render (Node.js service)
- **Database**: MongoDB Atlas

## License

Proprietary — AI Viral Studio Team.
