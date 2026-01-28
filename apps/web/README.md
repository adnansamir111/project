# Election System - React Frontend

Beautiful, modern React frontend for the Election Management System.

## 🚀 Features

- ✅ **Modern UI** - Built with React 18 + TypeScript + TailwindCSS
- ✅ **State Management** - Zustand for global state
- ✅ **Routing** - React Router v6  
- ✅ **API Integration** - Axios with interceptors
- ✅ **Authentication** - JWT with automatic token refresh
- ✅ **Notifications** - React Hot Toast for user feedback
- ✅ **Icons** - Lucide React icons
- ✅ **Responsive** - Mobile-first design

## 📦 Installation

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

## 🌐 Development Server

The frontend runs on **http://localhost:3000**

API requests are proxied to **http://localhost:4000**

## 📁 Project Structure

```
src/
├── components/        # Reusable UI components
│   └── Layout.tsx    # Main layout with header/footer
├── pages/            # Route pages
│   ├── Login.tsx
│   ├── Register.tsx
│   ├── Dashboard.tsx
│   ├── Organizations.tsx
│   ├── Elections.tsx
│   ├── ElectionDetails.tsx
│   ├── VoterPortal.tsx
│   └── Results.tsx
├── lib/              # Utilities
│   └── api.ts        # API service layer
├── store/            # State management
│   └── authStore.ts  # Authentication store
├── types/            # TypeScript types
│   └── index.ts      # All type definitions
├── App.tsx           # Main app component
├── main.tsx          # Entry point
└── index.css         # Global styles
```

## 🎨 Tech Stack

- **React 18** - UI library
- **TypeScript** - Type safety
- **Vite** - Build tool & dev server
- **TailwindCSS** - Utility-first CSS
- **React Router** - Client-side routing
- **Zustand** - State management
- **Axios** - HTTP client
- **React Hot Toast** - Notifications
- **Lucide React** - Icon library

## 🔐 Authentication

The app uses JWT authentication with access and refresh tokens:

1. Login page (`/login`)
2. Tokens stored in localStorage
3. Axios interceptor adds token to requests
4. Automatic logout on 401 errors

## 📱 Pages

### Public Routes
- `/login` - Login page
- `/register` - Registration page

### Protected Routes (require authentication)
- `/` - Dashboard
- `/organizations` - Organization management
- `/elections` - Election list
- `/elections/:id` - Election details with races/candidates
- `/vote` - Voter portal for casting votes
- `/results/:electionId/:raceId` - Election results

## 🎯 API Integration

All API calls are centralized in `src/lib/api.ts`:

```typescript
import { authApi, electionsApi, votingApi } from '@/lib/api';

// Login
const response = await authApi.login({ email, password });

// Create election
const election = await electionsApi.create({ organization_id: 1, election_name: 'Test' });

// Cast vote
await votingApi.castVote({ election_id: 1, race_id: 1, candidate_id: 1 });
```

## 🎨 Styling

Custom CSS classes in `index.css`:

```tsx
// Buttons
<button className="btn-primary">Primary Button</button>
<button className="btn-secondary">Secondary Button</button>
<button className="btn-danger">Danger Button</button>

// Cards
<div className="card">Card content</div>

// Inputs
<input className="input" />
<label className="label">Label</label>
```

## 🚀 Deployment

### Build for Production

```bash
npm run build
```

Output will be in `dist/` directory.

### Deploy to Vercel/Netlify

1. Connect your Git repository
2. Set build command: `npm run build`
3. Set publish directory: `dist`
4. Add environment variable: `VITE_API_URL=your_api_url`

### Deploy with Docker

```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build
EXPOSE 3000
CMD ["npm", "run", "preview"]
```

## 🔧 Environment Variables

Create `.env` file:

```env
VITE_API_URL=http://localhost:4000
```

## ⚡ Performance

- Code splitting with React lazy loading
- Optimized bundle size
- Fast Vite dev server with HMR
- TailwindCSS purges unused styles

## 📝 TODO

- [ ] Complete all page implementations
- [ ] Add form validation
- [ ] Add loading states
- [ ] Add error boundaries
- [ ] Add unit tests
- [ ] Add E2E tests
- [ ] Add PWA support
- [ ] Add dark mode

## 🐛 Known Issues

- Some pages are placeholders (coming soon)
- Need to implement full CRUD operations
- Need to add more error handling

## 👨‍💻 Development

```bash
# Start both API and frontend
npm run dev  # From root directory

# Or start individually
npm run dev:api   # API on :4000
npm run dev:web   # Frontend on :3000
```

## 📚 Documentation

See main project documentation:
- `PHASE_4_5_API_DOCS.md` - API reference
- `RACE_CANDIDATE_API_DOCS.md` - Race/candidate APIs
- `QUICK_START.md` - Getting started guide

---

**Built with ❤️ using React + TypeScript + TailwindCSS**
