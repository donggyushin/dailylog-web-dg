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
│   ├── ForgotPasswordPage.tsx     # Password recovery (3-step flow)
│   ├── EmailVerificationPage.tsx  # Email verification with 5-minute timer
│   ├── HomePage.tsx               # Main dashboard (diary grid with infinite scroll)
│   ├── ChatPage.tsx               # AI chat conversation page
│   ├── ChatHistoryPage.tsx        # Read-only chat history viewer
│   ├── DiaryDetailPage.tsx        # Diary detail, bookmark, thumbnails, navigation
│   ├── DiaryEditorPage.tsx        # Create/edit diary manually
│   ├── ProfilePage.tsx            # User profile management
│   ├── StatisticsPage.tsx         # Emotion timeline with recharts
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

### Password Recovery Flow

Users can reset their password via a 3-step process (`ForgotPasswordPage.tsx`):

1. **Step 1 - Email Entry**:
   - User enters their email address
   - Calls `api.forgotPassword.requestCode(email)`
   - Verification code sent to email
   - 5-minute countdown timer starts

2. **Step 2 - Code Verification**:
   - User enters 6-digit verification code
   - Calls `api.forgotPassword.verifyCode(email, code)`
   - Returns a reset token on success
   - Token stored in component state for next step

3. **Step 3 - New Password**:
   - User enters new password (minimum 8 characters)
   - Password confirmation field must match
   - Calls `api.forgotPassword.changePassword(token, newPassword)`
   - Redirects to login page on success

**Features**:
- "다시 전송" button to resend code (resets timer)
- "이전" button to go back to previous step
- All state managed within ForgotPasswordPage component
- Similar UI/UX pattern to EmailVerificationPage

### Diary Creation Workflow

Users can create diaries in two ways:

#### Method 1: AI-Generated Diary (via Chat)

The app follows a 3-step process for AI-assisted diary creation:

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
   - User can edit the AI-generated diary title and content in `EditableDiaryEntry` component
   - User clicks "일기 저장하기" button
   - Calls `api.diary.createDirect(title, content, sessionId)` to save with chat session ID
   - Automatically navigates to diary detail page (`/diary/:id`) after successful save

#### Method 2: Direct Manual Writing

Users can write diaries directly without AI assistance:

1. **Create New Diary** (`/diary/new`):
   - Users navigate to the editor page
   - Optional title field (can be left empty)
   - Content textarea with validation (minimum 30 characters)
   - "일기 저장하기" button saves via `api.diary.createDirect(title, content)`

2. **Edit Existing Diary** (`/diary/:id/edit`):
   - DiaryEditorPage loads existing diary data
   - Both AI-generated and manually-written diaries can be edited
   - "일기 수정하기" button updates via `api.diary.update(diaryId, title, content)`
   - Validation: content must be at least 30 characters

3. **Diary Field Tracking**:
   - `user_wrote_this_diary_directly` boolean field distinguishes manual vs AI diaries
   - Manual diaries don't show "대화 보기" button in detail page

### API Organization (`src/utils/api.ts`)

The API layer is organized into namespaces:

**Authentication & User:**
- `api.login(email, password)` - Login endpoint
- `api.signup(email, password)` - Register new user
- `api.me()` - Get current user info
- `api.updateMe(profile)` - Update user profile (username, birth, gender)
- `api.uploadProfileImage(file)` - Upload profile image (FormData)
- `api.deleteProfileImage()` - Delete profile image
- `api.requestEmailVerification()` - Request email verification code
- `api.verifyEmail(code)` - Verify email with 6-digit code

**Password Recovery:**
- `api.forgotPassword.requestCode(email)` - Request password reset code
- `api.forgotPassword.verifyCode(email, code)` - Verify code and get reset token
- `api.forgotPassword.changePassword(token, newPassword)` - Change password with token

**Chat:**
- `api.chat.getCurrentSession()` - Get current chat session
- `api.chat.sendMessage(sessionId, userId, content)` - Send chat message
- `api.chat.endCurrentSession()` - End current chat session

**Diary:**
- `api.diary.create(sessionId, messageId)` - Create diary from chat message
- `api.diary.createDirect(title, content, chatSessionId?)` - Create diary directly (manual writing, with optional chat session ID)
- `api.diary.update(diaryId, title, content)` - Update existing diary
- `api.diary.list(cursorId?, size?)` - Get diary list with cursor pagination
- `api.diary.getById(diaryId)` - Get single diary by ID
- `api.diary.getByDate(date)` - Get diary by specific date (YYYY-MM-DD)
- `api.diary.getChatSession(diaryId)` - Get chat session associated with a diary
- `api.diary.getThumbnail(diaryId)` - Generate AI thumbnail (max 3 times)
- `api.diary.updateThumbnail(diaryId, imgUrl)` - Apply selected thumbnail
- `api.diary.delete(diaryId)` - Delete diary entry
- `api.diary.getNextPrev(diaryId)` - Get next/previous diary navigation
- `api.diary.updateEmotion(diaryId)` - Trigger AI emotion analysis
- `api.diary.addSaved(diaryId)` - Bookmark/save diary (POST)
- `api.diary.removeSaved(diaryId)` - Remove bookmark (DELETE)
- `api.diary.getSavedDiaries(cursorId?, size?)` - Get bookmarked diaries with cursor pagination
- `api.diary.searchDiaries(query, cursorId?, size?)` - Search diaries by title or content

**Statistics:**
- `api.statistics.getEmotionTimeline(startDate?, endDate?)` - Get emotion timeline data for charts

### Diary Data Model

```typescript
interface Diary {
    id: string;
    user_id: string;
    chat_session_id: string;
    title: string;
    content: string;
    writed_at: string; // YYYY-MM-DD
    thumbnail_url?: string;
    emotion?: 'happy' | 'sad' | 'angry' | 'anxious' | 'peaceful' | 'normal';
    user_wrote_this_diary_directly: boolean;
    created_at: string;
    updated_at: string;
    saved: boolean; // Bookmark status
    tags: string[]; // Array of tag strings
}
```

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
  - Emotion icon displayed in top-right corner

- **Diaries without thumbnails**:
  - White card with border
  - Shows date, title, and content preview
  - "더 읽기 →" footer with separator line
  - Emotion icon displayed in top-right corner

- **Create diary card**:
  - Only shown if no diary exists for today's date
  - Black background with "+" icon
  - Navigates to `/chat` to start conversation

- **Infinite scrolling**:
  - Loads 30 diaries at a time via cursor-based pagination
  - Uses IntersectionObserver to detect when user reaches bottom
  - Automatically fetches next batch using `cursor_id` from last diary
  - Loading indicator shown while fetching more diaries

- **Emotion indicators**:
  - Each diary card shows emotion icon if `emotion` field exists
  - Icons match the emotion color scheme (happy=gold, sad=blue, etc.)
  - Icons positioned in absolute top-right corner of each card

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

- **Bookmark Feature**:
  - Bookmark icon appears next to "Daily Log" logo in header
  - Inactive state: outlined bookmark (stroke only)
  - Active state: filled red bookmark (#DC2626)
  - Clicking toggles saved state via `api.diary.addSaved()` / `api.diary.removeSaved()`
  - Brutalist design with sharp edges matching overall aesthetic

- **Thumbnail UI**:
  - "썸네일 추가하기" button generates new thumbnails (max 3)
  - Counter shows "X / 3개 생성됨"
  - Two panels: selected preview (top) and thumbnail grid (bottom)
  - Grid shows all generated options with selection highlighting
  - Apply button persists the selected thumbnail to the diary

- **Navigation**:
  - Previous/Next diary buttons on left/right edges (fixed positioning)
  - "대화 보기" button navigates to `/chat/history/:id` (only for AI-generated diaries)
  - "수정" button navigates to `/diary/:id/edit`
  - "삭제" button deletes the diary with confirmation (red styling)
  - "← 목록으로" returns to home page

- **Emotion Display**:
  - If `emotion` is null when diary loads, automatically calls `api.diary.updateEmotion()`
  - Emotion icons displayed in `DiaryEntry` component

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

### Statistics Page (Emotion Timeline)

Emotion visualization page (`StatisticsPage.tsx`):

- **Route**: `/statistics`
- **Data source**: `api.statistics.getEmotionTimeline(startDate?, endDate?)`
- **Chart library**: recharts (LineChart component)
- **Infinite scrolling**: Loads 60 days at a time, scrolls horizontally
- **Emotion mapping**:
  - `happy` → 행복 (Gold: #FFD700)
  - `sad` → 슬픔 (Steel Blue: #4682B4)
  - `angry` → 분노 (Crimson: #DC143C)
  - `anxious` → 불안 (Medium Purple: #9370DB)
  - `peaceful` → 평온 (Pale Green: #98FB98)
  - `normal` → 평범 (Light Gray: #D3D3D3)
- **Features**:
  - Horizontal scroll container for timeline navigation
  - Summary panel shows emotion counts and most common emotion
  - Clicking data points navigates to corresponding diary
  - Automatic loading of more data when scrolling to edges

### Profile Page

User profile management (`ProfilePage.tsx`):

- **Route**: `/profile`
- **Editable fields**:
  - Username (text input)
  - Birth date (date input in YYYY-MM-DD format)
  - Gender (radio buttons: male, female, other)
  - Profile image (file upload with preview, max 5MB)
- **Image upload**:
  - Drag-and-drop or click to select
  - Client-side preview before upload
  - Calls `api.uploadProfileImage(file)` with FormData
  - Delete button calls `api.deleteProfileImage()`
- **Profile update**: `api.updateMe({ username, birth, gender })`

### Saved Diaries Page (Bookmarks)

Magazine-style page for bookmarked diaries (`SavedDiariesPage.tsx`):

- **Route**: `/saved`
- **Data source**: `api.diary.getSavedDiaries(cursorId?, size?)`
- **Layout**: Magazine-style with large cards
  - **Thumbnail diaries**: Zigzag layout (alternating left/right image placement)
    - Even index: Image left, text right
    - Odd index: Image right, text left
    - 50/50 split on desktop, stacked on mobile
  - **No thumbnail diaries**: Full-width cards with text content
  - Brutalist shadow effect on hover: `shadow-[8px_8px_0px_0px]`
- **Features**:
  - Displays emotion emoji and Korean label
  - Shows bookmark status (red filled icon)
  - Click to remove bookmark (updates list in real-time)
  - Infinite scroll (30 diaries per batch)
  - Empty state with call-to-action

### Search Page

Timeline-style search page (`SearchPage.tsx`):

- **Route**: `/search` (supports `?q=query` URL parameter)
- **Data source**: `api.diary.searchDiaries(query, cursorId?, size?)`
- **Layout**: Compact timeline/list style
  - Horizontal cards: Thumbnail (192px fixed width) + text content
  - Smaller, more compact than home page grid
  - Stacks vertically for easy scanning
- **Search features**:
  - Large search input at top of page
  - Enter key or search button to submit
  - URL query parameter support (`?q=검색어`)
  - **Keyword highlighting**: Search terms highlighted with black background in title and content
  - Result count display ("X개의 일기를 찾았습니다")
  - Empty state with search suggestions
- **Card display**:
  - Date and emotion indicator (colored square + Korean label)
  - Highlighted title and content preview (2 lines)
  - Bookmark status indicator for saved diaries
  - Click to navigate to detail page
  - Infinite scroll (30 results per batch)

## Application Routes

**Guest-only routes** (redirect to `/` if authenticated):
- `/login` - Login page
- `/signup` - Signup page
- `/forgot-password` - Password recovery flow (3 steps: email → code → new password)

**Protected routes** (require authentication):
- `/` - Home page (diary list grid with infinite scroll)
- `/verify-email` - Email verification page (5-minute timer)
- `/chat` - Active AI chat conversation (one diary per day limit)
- `/chat/history/:id` - Read-only chat history viewer
- `/diary/new` - Create new diary manually (direct writing)
- `/diary/:id` - Diary detail page with bookmark, thumbnails, navigation
- `/diary/:id/edit` - Edit existing diary
- `/saved` - Bookmarked diaries page (magazine-style layout with infinite scroll)
- `/search` - Search diaries page (timeline-style layout with keyword highlighting, supports `?q=query` parameter)
- `/profile` - User profile management (username, birth, gender, profile image)
- `/statistics` - Emotion timeline visualization (recharts line graph, infinite scroll)

## Key Components

### EditableDiaryEntry

Editable diary display component used in ChatPage (`src/components/EditableDiaryEntry.tsx`):

- Displays AI-generated diary in journal-style format
- Allows editing of both title and content before saving
- Provides "일기 저장하기" button with loading state
- Used when AI generates diary in chat conversation

### Layout Patterns

Three distinct layout patterns are used across the app:

1. **Grid Layout** (HomePage):
   - 3-column responsive grid
   - Mixed card styles (thumbnail vs text-only)
   - Square-ish proportions
   - Dense, gallery-like presentation

2. **Magazine Layout** (SavedDiariesPage):
   - Large, single-column cards
   - Zigzag image placement (alternating sides)
   - Spacious, editorial-style presentation
   - Emphasis on visual content

3. **Timeline Layout** (SearchPage):
   - Compact horizontal cards
   - Consistent left-aligned layout
   - Easy scanning and reading
   - Keyword highlighting for search results

## Development Notes

- The project uses React 19 with StrictMode enabled
- Vite provides Fast Refresh via `@vitejs/plugin-react` using Babel
- Module resolution is set to "bundler" mode for optimal Vite compatibility
- JSX transformation uses the modern `react-jsx` runtime (no React import needed)
- Backend API is implemented separately and should be running for full functionality
- **One diary per day**: ChatPage checks for existing diary with `api.diary.getByDate(today)` before allowing new conversations
- **Chat session tracking**: When saving AI-generated diaries, the `chat_session_id` is included in the request body to link diary with conversation
