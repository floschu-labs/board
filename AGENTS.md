# AGENTS.md

This document provides guidance for AI agents working on the Board codebase.

## Project Overview

**Board** is a privacy-focused, local-only Kanban board application. Key principles:

- **No account required** - All data stays in the user's browser (localStorage)
- **Privacy by default** - No tracking, no external services
- **Self-hostable** - Docker support with SQLite persistence for teams
- **PWA support** - Installable, works offline

**Live Demo:** https://floschu.github.io/board/

## Tech Stack

### Frontend
- **React 19** with TypeScript
- **Vite 7** - Build tool
- **Tailwind CSS 4** - Styling
- **Zustand 5** - State management
- **@dnd-kit** - Drag-and-drop
- **@headlessui/react** - Accessible UI components
- **Motion (Framer Motion)** - Animations

### Backend (Self-hosted)
- **Express.js** - API server
- **better-sqlite3** - SQLite database

### Testing
- **Vitest** - Test runner
- **@testing-library/react** - Component testing

## Directory Structure

```
board/
├── .github/workflows/     # CI/CD (build, test, deploy)
├── docs/                  # Documentation assets (screenshots)
├── public/                # Static assets (icons, favicon)
├── scripts/               # Build utilities (favicon, icons, screenshots)
├── server/                # Express backend for self-hosting
│   ├── db.js              # SQLite database operations
│   ├── index.js           # Express server entry point
│   └── validation.js      # Server-side validation
├── src/
│   ├── components/        # React components
│   ├── hooks/             # Custom React hooks
│   ├── storage/           # Storage abstractions (localStorage, API)
│   ├── store/             # Zustand stores
│   ├── test/              # Test setup
│   ├── types/             # TypeScript type definitions
│   ├── utils/             # Utility functions
│   ├── App.tsx            # Main application component
│   ├── main.tsx           # React entry point
│   └── index.css          # Global styles and Tailwind config
├── Dockerfile             # Multi-stage Docker build
├── docker-compose.yml     # Docker Compose configuration
└── index.html             # HTML entry point
```

## Development Commands

```bash
# Development
npm run dev              # Start dev server (port 5173)

# Building
npm run build            # TypeScript check + Vite build
npm run preview          # Preview production build

# Testing
npm run test             # Run Vitest in watch mode
npm run test:run         # Run tests once (CI)

# Linting
npm run lint             # Run ESLint

# Server (self-hosted mode)
npm run server           # Start Express server only
npm run start            # Build + start server
```

## Architecture

### State Management

Three separate Zustand stores handle different concerns:

| Store | File | Purpose |
|-------|------|---------|
| `useBoardStore` | `src/store/index.ts` | Main data (projects, lists, cards) |
| `useThemeStore` | `src/store/theme.ts` | Theme preferences (persisted) |
| `useCardFocusStore` | `src/store/cardFocus.ts` | Keyboard navigation focus |

The main store auto-persists to localStorage via Zustand's `subscribe` middleware.

### Data Model

Hierarchical structure with position-based ordering:

```
Projects
  └── Lists
        └── Cards
```

Each entity has:
- `id` - UUID
- `position` - Integer for ordering
- `createdAt` / `updatedAt` - Timestamps

### Storage Abstraction

Two storage backends with the same interface:

- `src/storage/localStorage.ts` - Browser-only mode (default)
- `src/storage/api.ts` - Self-hosted mode with Express backend

Validation logic is shared between client (`src/utils/validation.ts`) and server (`server/validation.js`).

### Key Entry Points

| File | Purpose |
|------|---------|
| `src/main.tsx` | React application entry |
| `src/App.tsx` | Root component, initialization |
| `server/index.js` | Express server entry |
| `src/store/index.ts` | Main Zustand store |

## Code Conventions

### TypeScript

- **Strict mode** enabled with `noUnusedLocals`, `noUnusedParameters`
- Use `import type { ... }` for type-only imports
- Define interfaces for object types, type aliases for unions
- Explicit return types on exported functions

```typescript
// Good
import type { Project } from '../types';

export function getProject(id: string): Project | undefined {
  // ...
}
```

### React

- Functional components with hooks only
- Custom hooks prefixed with `use` (e.g., `useKeyboardShortcuts`)
- Props interfaces defined per component

```typescript
interface CardProps {
  card: Card;
  listId: string;
  onEdit: () => void;
}

export function Card({ card, listId, onEdit }: CardProps) {
  // ...
}
```

### Styling

- **Tailwind CSS utility classes** - No custom CSS unless necessary
- **Dark theme only** - Catppuccin Mocha color palette
- CSS custom properties for theming defined in `index.css`
- Glow color variables: `--glow-color`, `--glow-rgb`

### Naming Conventions

| Type | Convention | Example |
|------|------------|---------|
| Components | PascalCase | `CardModal.tsx` |
| Functions/variables | camelCase | `getActiveProject` |
| Hooks | camelCase with `use` prefix | `useKeyboardShortcuts` |
| Constants | SCREAMING_SNAKE_CASE | `MAX_TITLE_LENGTH` |
| CSS classes | kebab-case | `card-container` |

### Comments

- **JSDoc** for utility functions with `@param` and `@returns`
- **`SECURITY:`** prefix for security-critical code sections
- Inline comments for complex logic only

```typescript
/**
 * Validates a URL to prevent XSS attacks.
 * SECURITY: Blocks javascript:, data:, and other dangerous protocols.
 * @param url - The URL to validate
 * @returns true if the URL is safe
 */
export function isValidUrl(url: string): boolean {
  // ...
}
```

## Testing Guidelines

### Setup

- **Vitest** with jsdom environment
- **@testing-library/react** for component tests
- Setup file: `src/test/setup.ts`
- Tests are **co-located** with source files (e.g., `Card.test.tsx`)

### Test File Locations

```
src/
├── components/
│   └── Card.test.tsx
├── store/
│   ├── index.test.ts
│   ├── cardFocus.test.ts
│   └── dragAndDrop.test.ts
├── hooks/
│   └── useKeyboardShortcuts.test.ts
├── utils/
│   ├── date.test.ts
│   ├── url.test.ts
│   └── importExport.test.ts
└── storage/
    └── localStorage.test.ts
```

### Common Patterns

**Reset store state between tests:**
```typescript
beforeEach(() => {
  useBoardStore.setState({
    projects: [],
    lists: [],
    cards: [],
    activeProjectId: null,
  });
});
```

**Mock localStorage:**
```typescript
vi.mock('../storage/localStorage', () => ({
  saveToLocalStorage: vi.fn(),
  loadFromLocalStorage: vi.fn(),
}));
```

**Wrap drag-and-drop components:**
```typescript
import { DndContext } from '@dnd-kit/core';

render(
  <DndContext>
    <Card {...props} />
  </DndContext>
);
```

**Use fake timers for date-dependent tests:**
```typescript
beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date('2024-01-15'));
});

afterEach(() => {
  vi.useRealTimers();
});
```

### Security Tests

Always include tests for XSS prevention when handling URLs:

```typescript
it('should reject javascript: URLs', () => {
  expect(isValidUrl('javascript:alert(1)')).toBe(false);
});

it('should reject data: URLs', () => {
  expect(isValidUrl('data:text/html,<script>alert(1)</script>')).toBe(false);
});
```

## Security Considerations

### URL Validation

All user-provided URLs must be validated to prevent XSS:

- Use `isValidUrl()` from `src/utils/url.ts`
- Blocks: `javascript:`, `data:`, `vbscript:`, and other dangerous protocols
- Only allows: `http:`, `https:`, and relative URLs

### Input Validation

- Max length constraints enforced in `src/utils/validation.ts`
- Same validation runs on both client and server
- Referential integrity checked on data import

### Key Security Files

- `src/utils/url.ts` - URL validation and sanitization
- `src/utils/validation.ts` - Input validation (client)
- `server/validation.js` - Input validation (server, mirrors client)

## Common Tasks

### Adding a New Component

1. Create component file in `src/components/`
2. Use TypeScript interface for props
3. Use Tailwind CSS for styling
4. Add test file alongside component

### Adding a Store Action

1. Add action to store in `src/store/index.ts`
2. Include type in the store interface
3. Update persistence if needed
4. Add tests in `src/store/index.test.ts`

### Adding a Utility Function

1. Add function to appropriate file in `src/utils/`
2. Include JSDoc comment with `@param` and `@returns`
3. Add `SECURITY:` comment if handling user input
4. Add tests covering edge cases and security scenarios

### Adding Server Endpoints

1. Add route in `server/index.js`
2. Add validation in `server/validation.js` (mirror client validation)
3. Add database operations in `server/db.js`
4. Test with both valid and invalid inputs

## CI/CD

- **Build and test** run on every push/PR (`.github/workflows/build.yml`)
- **Docker image** published to `ghcr.io` on release tags
- **GitHub Pages** deployment on release (`.github/workflows/release.yml`)

## Key Dependencies

| Package | Purpose |
|---------|---------|
| `@dnd-kit/core` | Drag-and-drop core |
| `@dnd-kit/sortable` | Sortable lists |
| `@headlessui/react` | Accessible dialogs, menus |
| `@heroicons/react` | Icon set |
| `zustand` | State management |
| `motion` | Animations |
| `react-markdown` | Markdown rendering |
| `uuid` | ID generation |
| `ogl` | WebGL effects (Aurora) |
