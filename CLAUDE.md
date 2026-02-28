# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Daily Log** is an AI-powered journaling service that helps users create emotional and literary diary entries through conversational interaction.

### Service Concept

- **AI Conversation-Based Journaling**: Users chat with an AI assistant that helps them reflect on their day
- **Automatic Diary Generation**: After the conversation, AI automatically writes a beautifully crafted diary entry
- **AI-Generated Thumbnails**: Optionally generates thematic images that match the diary's mood and content
- **Literary & Emotional Writing**: AI acts as a skilled literary writer, creating emotionally rich and poetic entries
- **Warm & Comforting Design**: The entire service should feel warm, comforting, and emotionally supportive

### Technical Stack

This is a React + TypeScript web application built with Vite. The backend is already implemented separately.

## Build Commands

### NPM Scripts
```bash
# Development server with hot module replacement (Port 5173)
npm run dev

# TypeScript type checking (without building)
npm run typecheck

# Production build (runs TypeScript compiler check first, then builds)
npm run build

# Preview production build locally
npm run preview

# Lint code with ESLint
npm run lint
```

### Makefile Commands (Recommended)
```bash
# Development
make install        # Install dependencies
make typecheck      # Run TypeScript type checking
make lint           # Run linter
make clean          # Clean build artifacts

# Docker (Production - Port 8080)
make build          # Build Docker image (docker compose build)
make up             # Start container in background
make down           # Stop container
make docker-logs    # View container logs
make docker-clean   # Remove Docker image and container
```

## Environment Variables

Create a `.env` file based on `.env.example`:

```bash
VITE_API_BASE_URL=http://localhost:8000  # Backend API URL
```

## Tech Stack

- **React 19.2** - UI framework
- **TypeScript 5.9** - Type safety
- **Vite 7.3** - Build tool and dev server
- **Tailwind CSS 3.4** - Utility-first CSS framework
- **ESLint 9** - Linting with flat config format

## Project Structure

```
src/
├── components/       # Reusable components
│   ├── ui/                   # UI components (Tailwind-based)
│   │   ├── Button.tsx        # Button component (brutalist design)
│   │   ├── Input.tsx         # Input component with labels
│   │   └── ThemeToggle.tsx   # Theme switcher (light/dark mode)
│   ├── DiaryEntry.tsx        # Diary entry display component (journal-style UI)
│   ├── ProtectedRoute.tsx    # Route guard for authenticated pages
│   └── GuestRoute.tsx        # Route guard for guest-only pages (login/signup)
├── contexts/         # React Context providers
│   ├── AuthContext.tsx       # Authentication state management
│   └── ThemeContext.tsx      # Theme state management (light/dark)
├── pages/            # Page components
│   ├── LoginPage.tsx              # Login page
│   ├── SignupPage.tsx             # Signup page
│   ├── EmailVerificationPage.tsx  # Email verification with 5-minute timer
│   ├── HomePage.tsx               # Main dashboard (authenticated)
│   ├── ChatPage.tsx               # AI chat conversation page
│   ├── ChatHistoryPage.tsx        # Read-only chat history viewer
│   ├── DiaryDetailPage.tsx        # Diary detail and thumbnail management
│   ├── AuthPages.css              # Login/Signup styles
│   └── HomePage.css               # Home page styles
├── utils/            # Utility functions
│   └── api.ts               # API communication layer with token refresh
├── main.tsx          # Application entry point with providers
├── App.tsx           # Router configuration
├── index.css         # Global styles (Tailwind directives)
└── assets/           # Static assets
```

## Core Features & Architecture

### Authentication Flow

- **Cookie-based authentication**: Uses `js-cookie` to manage `accessToken` and `refreshToken` in cookies
- **Automatic token refresh**: When API returns 401, automatically calls `/api/v1/refresh_token` to renew tokens
- **Retry logic**: Failed requests are retried once after successful token refresh
- **Auto-logout**: If token refresh fails, automatically logs out the user
- **Protected routes**: Unauthenticated users are automatically redirected to `/login`
- **Guest routes**: Authenticated users accessing `/login` or `/signup` are redirected to `/`
- **AuthContext**: Global authentication state accessible via `useAuth()` hook
- **API integration**: All API calls automatically include authentication headers

### Email Verification Flow

After signup, users must verify their email:

1. **Automatic redirect**: After signup, users are redirected to `/verify-email`
2. **Code delivery**: Verification code is automatically requested via `POST /api/v1/email_verification_code`
3. **5-minute timer**: Countdown timer shows remaining time to enter the code
4. **Code verification**: Submit code via `POST /api/v1/verify_email` with `{ code: string }`
5. **Resend functionality**: Users can request a new code, which resets the timer
6. **Auto-navigation**: Upon successful verification, user is redirected to home page
7. **User model**: `User.email_verified` boolean tracks verification status

### Diary Creation Workflow

The app follows a 3-step process for creating diary entries:

1. **Chat Conversation** (`/chat`):
   - User has a conversation with AI assistant about their day
   - Messages are sent via `POST /api/v1/chat/message` with session context
   - Chat session is loaded from `GET /api/v1/chat-current-session`
   - SYSTEM role messages are filtered out from UI display

2. **AI Diary Generation**:
   - AI generates a literary diary entry in a special format:
     ```
     [TITLE_START]
     Diary Title
     [TITLE_END]

     [CONTENT_START]
     Diary content...
     [CONTENT_END]
     ```
   - When this format is detected, the `DiaryEntry` component renders a journal-style UI
   - Once diary is generated, chat input is disabled (session ends)

3. **Diary Saving**:
   - User clicks "이대로 일기 작성하기" button
   - Calls `POST /api/v1/diary` with `session_id` and `message_id`
   - Automatically navigates to home page after successful save

### API Organization (`src/utils/api.ts`)

The API layer is organized into namespaces:

- `api.login()`, `api.signup()`, `api.me()` - Authentication endpoints
- `api.requestEmailVerification()` - Request email verification code
- `api.verifyEmail(code)` - Verify email with 6-digit code
- `api.chat.getCurrentSession()` - Get current chat session
- `api.chat.sendMessage()` - Send chat message (requires session_id, user_id, content)
- `api.chat.endCurrentSession()` - End current chat session
- `api.diary.create()` - Create diary from chat message (requires session_id, message_id)
- `api.diary.list()` - Get diary list with optional cursor pagination
- `api.diary.getById()` - Get single diary by ID
- `api.diary.getByDate(date)` - Get diary by specific date (YYYY-MM-DD)
- `api.diary.getChatSession(diaryId)` - Get chat session associated with a diary
- `api.diary.getThumbnail()` - Generate AI thumbnail for diary (can be called up to 3 times)
- `api.diary.updateThumbnail()` - Apply selected thumbnail to diary
- `api.diary.delete()` - Delete diary entry

### Thumbnail Generation Workflow

Diaries can have AI-generated thumbnails added after creation:

1. **Thumbnail Generation** (`/diary/:id` detail page):
   - Users can generate up to 3 thumbnail options per diary
   - Each call to `api.diary.getThumbnail(diaryId)` generates a new image
   - Generated thumbnails are stored in local state (not persisted until applied)

2. **Thumbnail Selection**:
   - Users can preview all generated thumbnails in a grid
   - Selecting a thumbnail shows it in a larger preview

3. **Thumbnail Application**:
   - Once satisfied, user clicks to apply the selected thumbnail
   - Calls `api.diary.updateThumbnail(diaryId, imgUrl)` to persist it
   - The diary's `thumbnail_url` field is updated

### Home Page Display Patterns

The home page (`HomePage.tsx`) displays diaries in a grid with different card styles:

- **Diaries with thumbnails**:
  - Full-width image background with gradient overlay
  - Date only (no title or content preview)
  - Image brightness detection determines text color for readability
  - Hover effect scales the image slightly (`group-hover:scale-105`)

- **Diaries without thumbnails**:
  - White card with border
  - Shows date, title, and content preview
  - "더 읽기 →" footer with separator line

- **Create diary card**:
  - Only shown if no diary exists for today's date
  - Black background with "+" icon
  - Navigates to `/chat` to start conversation

## TypeScript Configuration

The project uses TypeScript's project references feature with two separate configs:

- `tsconfig.json` - Root config that references both app and node configs
- `tsconfig.app.json` - Application code config (src/)
- `tsconfig.node.json` - Vite config file compilation

Strict mode is enabled with additional linting rules (`noUnusedLocals`, `noUnusedParameters`, etc.).

## ESLint Configuration

Uses ESLint flat config format (`eslint.config.js`) with:
- TypeScript ESLint recommended rules
- React Hooks recommended rules
- React Refresh plugin for Vite

The `dist` directory is globally ignored.

## Design Philosophy

**Design Inspiration**: [Oh Lolly Day](https://oh-lolly-day.com/index.html) - Brutalist/minimal aesthetic with a rough, handcrafted feel.

When implementing UI/UX features, keep these principles in mind:

- **Rough & Minimal**: Sharp edges, thick borders, no rounded corners, no shadows
- **High Contrast**: Clear visual hierarchy with strong black/white contrast
- **Emotionally Supportive**: Despite the brutalist aesthetic, the interface should still feel warm and supportive
- **Literary & Poetic**: Typography should feel refined - serif headings, uppercase bold labels
- **Intentional Simplicity**: Every element has a purpose, no unnecessary decorations
- **Personal & Intimate**: Design should encourage personal reflection and emotional expression

### Design System

**Core Principles:**
- **NO rounded corners** (`rounded-none` everywhere)
- **NO shadows** (no `shadow-*` classes)
- **2px borders everywhere** (`border-2`)
- **Uppercase bold labels** for form fields
- **Serif font** for headings (font-serif)
- **Simple separator lines** instead of decorative elements
- **Underlined links** with hover effects

**Typography:**
- Headings: `font-serif font-bold` with tight tracking
- Labels: `font-bold uppercase tracking-wider`
- Body text: Default sans-serif
- Links: Underlined with `underline hover:no-underline`

### Current Color Palette (Brutalist Minimal Theme)

**Light Mode (Natural Palette):**
```javascript
natural: {
  50: '#FAFAF8',   // Almost white
  100: '#F5F5F0',  // Cream paper
  200: '#E8E8E0',  // Beige
  300: '#D4D4C8',  // Light gray-beige
  400: '#B8B8A8',  // Medium beige
  500: '#9C9C88',  // Neutral beige
  600: '#6B6B58',  // Dark beige
  700: '#4A4A38',  // Very dark beige
  800: '#1F1F1B',  // Almost black
  900: '#0A0A08',  // Pure black
}

accent: {
  cream: '#F5F5F0',  // Background color
}
```

**Dark Mode (High Contrast Enhancement):**
```javascript
dark: {
  text: '#F5F5F0',      // Bright cream (for readable text)
  border: '#E8E8E0',    // Bright beige (for visible borders)
  bg: '#0A0A08',        // Deep black (background)
  card: '#1F1F1B',      // Card background (slightly lighter than bg)
}
```

**Usage Examples:**
- Background: `bg-accent-cream dark:bg-dark-bg`
- Text: `text-natural-900 dark:text-dark-text`
- Borders: `border-2 border-natural-900 dark:border-dark-border`
- Cards: `bg-white dark:bg-dark-card`
- Buttons: `bg-natural-900 dark:bg-dark-text text-white dark:text-dark-bg`

**Theme Switching:**
- ThemeContext provides light/dark mode toggle
- Persists to localStorage
- Respects system preference by default
- ThemeToggle component in top-right corner (sun/moon icons)

### Language

- **Primary language**: Korean (한국어)
- All UI text, error messages, and user-facing content should be in Korean
- Keep the service name "Daily Log" in English as the brand name

### Chat Interface UX Patterns

When working with the ChatPage component:

- **Textarea auto-resize**: Input expands vertically (max 12rem) as user types
- **Keyboard shortcuts**:
  - `Enter` = Send message
  - `Shift + Enter` = Line break
- **Message sending**:
  - User message appears immediately in UI
  - Loading indicator (bouncing dots) shows while AI responds
  - Textarea resets to original height after sending
- **Focus management**: Input stays focused during AI response (only send button disables)
- **Diary detection**: Chat automatically detects `[TITLE_START]...[TITLE_END]` and `[CONTENT_START]...[CONTENT_END]` tags
- **Session termination**: Once diary is generated, input is disabled to prevent further messages

### Diary Detail Page Layout

The diary detail page (`DiaryDetailPage.tsx`) uses a responsive layout:

- **Desktop (lg+)**: Two-column layout
  - Left column: Diary content (flexible width)
  - Right column: Thumbnail generation section (fixed 384px width, only visible if no thumbnail exists)
  - Separated by left border on thumbnail section

- **Mobile**: Single column stack
  - Diary content on top
  - Thumbnail section below (if visible)
  - Separated by top border on thumbnail section

- **Thumbnail UI**:
  - "썸네일 추가하기" button generates new thumbnails (max 3)
  - Counter shows "X / 3개 생성됨"
  - Two panels: selected preview (top) and thumbnail grid (bottom)
  - Grid shows all generated options with selection highlighting
  - Apply button persists the selected thumbnail to the diary

- **Navigation**:
  - "대화 보기" button navigates to `/chat/history/:id` to view the original conversation
  - "삭제" button deletes the diary with confirmation
  - "← 목록으로" returns to home page

### Chat History Page

Read-only page for viewing past conversations (`ChatHistoryPage.tsx`):

- **Route**: `/chat/history/:id` where `:id` is the diary ID
- **Data source**: Calls `api.diary.getChatSession(diaryId)` to fetch session data
- **Display**: Identical to ChatPage but without input controls
- **Features**:
  - Shows all messages except SYSTEM role messages
  - Renders diary entries in journal-style format (without save button)
  - "Daily Log" header links back to home page
- **Error handling**: Redirects to home if session fails to load

## Application Routes

- `/login` - Guest only (redirects to `/` if authenticated)
- `/signup` - Guest only (redirects to `/` if authenticated)
- `/verify-email` - Protected route for email verification
- `/` - Home page (protected, shows diary list)
- `/chat` - Active chat conversation (protected, one diary per day limit)
- `/chat/history/:id` - Read-only chat history viewer (protected)
- `/diary/:id` - Diary detail page with thumbnail management (protected)

## Development Notes

- The project uses React 19 with StrictMode enabled
- Vite provides Fast Refresh via `@vitejs/plugin-react` using Babel
- Module resolution is set to "bundler" mode for optimal Vite compatibility
- JSX transformation uses the modern `react-jsx` runtime (no React import needed)
- Backend API is implemented separately and should be running for full functionality
- **One diary per day**: ChatPage checks for existing diary with `api.diary.getByDate(today)` before allowing new conversations
