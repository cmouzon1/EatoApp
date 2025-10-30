# Eato - Food Truck Marketplace Platform

## Overview

Eato is a two-sided marketplace platform that connects food truck owners with event organizers. The application enables food trucks to discover catering opportunities and allows event organizers to find and book food vendors for their events. Built as a full-stack web application with a modern React frontend and Express backend, the platform features user authentication, searchable listings, booking management, and role-based dashboards.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture

**Technology Stack:**
- **Framework**: React 18 with TypeScript
- **Build Tool**: Vite for fast development and optimized production builds
- **Routing**: Wouter for lightweight client-side routing
- **State Management**: TanStack Query (React Query) for server state management and caching
- **UI Components**: Shadcn/ui component library built on Radix UI primitives
- **Styling**: Tailwind CSS with custom design system configuration

**Design System:**
- Custom color system using CSS variables for theme flexibility
- Typography using 'Poppins' for headings and 'Inter' for body text
- Responsive breakpoints: mobile-first approach with md (768px), lg (1024px), xl (1280px)
- Component variants using class-variance-authority for consistent styling
- Design inspiration from Airbnb's marketplace patterns

**Key Frontend Patterns:**
- Custom authentication hook (`useAuth`) providing centralized auth state
- Query client configuration with credentials for session-based auth
- Component composition with reusable cards (TruckCard, EventCard)
- Form handling using react-hook-form with Zod validation
- Toast notifications for user feedback

### Backend Architecture

**Technology Stack:**
- **Runtime**: Node.js with TypeScript
- **Framework**: Express.js for REST API
- **ORM**: Drizzle ORM for type-safe database queries
- **Database Driver**: Neon serverless PostgreSQL client
- **Session Management**: express-session with PostgreSQL store (connect-pg-simple)
- **Authentication**: OpenID Connect (OIDC) via Passport.js for Replit Auth integration

**API Design:**
- RESTful endpoints organized by resource (trucks, events, bookings)
- Role-based access control through authentication middleware
- Request validation using Zod schemas shared between client and server
- Centralized storage interface (`IStorage`) for data operations
- Session-based authentication with cookie credentials

**Core Entities:**
- **Users**: Profile information with role designation (truck_owner or event_organizer)
- **Trucks**: Food truck listings with details, images, menu items, pricing
- **Events**: Event listings with requirements and details
- **Bookings**: Connection between trucks and events with status tracking
- **Truck Unavailability**: Calendar system for truck owners to block specific dates when unavailable for bookings

**Key Backend Patterns:**
- Storage abstraction layer (`DatabaseStorage` implementing `IStorage`)
- Authentication middleware (`isAuthenticated`) for protected routes
- Shared schema definitions between frontend and backend using Drizzle-Zod
- Environment-based configuration for development/production modes

### Data Storage

**Database:**
- PostgreSQL (via Neon serverless)
- Schema managed through Drizzle ORM with migrations in `migrations/` directory
- Tables: users, trucks, events, bookings, truck_unavailability, sessions

**Schema Highlights:**
- UUID-based user IDs for compatibility with OIDC providers
- JSONB fields for flexible data (images arrays, menu items, social links)
- Timestamp tracking (createdAt, updatedAt) on all entities
- Relational structure with foreign keys linking bookings to trucks and events
- Boolean flags for active status on listings

**Data Access:**
- Type-safe queries using Drizzle ORM
- Centralized data operations in storage layer
- Support for filtered queries (by owner, organizer, status)

### Authentication & Authorization

**Authentication Flow:**
- OpenID Connect (OIDC) integration with Replit Auth as identity provider
- Passport.js strategy for OIDC authentication
- Session-based authentication with PostgreSQL session store
- Auto-refresh of tokens and session management

**Authorization:**
- Role-based access: truck_owner vs event_organizer
- Protected routes require authentication middleware
- User-specific data filtering (my-trucks, my-events, my-bookings)
- Profile completion flow for new users to select role

**Session Management:**
- Server-side sessions stored in PostgreSQL
- 7-day session TTL
- HTTP-only cookies for security
- Credential inclusion in all API requests

## External Dependencies

### Third-Party Services

**Replit Authentication:**
- OIDC provider for user authentication
- Issuer URL: `https://replit.com/oidc` (configurable via `ISSUER_URL`)
- Client ID from `REPL_ID` environment variable
- Session secret from `SESSION_SECRET` environment variable

**Database:**
- Neon Serverless PostgreSQL
- Connection via `DATABASE_URL` environment variable
- WebSocket support for serverless database connections

### Key NPM Packages

**Frontend:**
- `@tanstack/react-query`: Server state management and caching
- `@radix-ui/*`: Headless UI component primitives
- `react-hook-form` + `@hookform/resolvers`: Form handling and validation
- `wouter`: Lightweight routing
- `zod`: Runtime type validation
- `date-fns`: Date formatting and manipulation
- `lucide-react`: Icon library

**Backend:**
- `drizzle-orm`: Type-safe ORM
- `express`: Web framework
- `passport` + `openid-client`: Authentication
- `express-session` + `connect-pg-simple`: Session management
- `zod`: Schema validation
- `ws`: WebSocket client for Neon

**Build Tools:**
- `vite`: Frontend build tool and dev server
- `esbuild`: Backend bundling for production
- `tsx`: TypeScript execution for development
- `drizzle-kit`: Database migration tool

### Environment Configuration

Required environment variables:
- `DATABASE_URL`: PostgreSQL connection string
- `SESSION_SECRET`: Secret for session encryption
- `REPL_ID`: Replit application identifier (for OIDC)
- `ISSUER_URL`: OIDC issuer URL (defaults to Replit)
- `NODE_ENV`: Environment mode (development/production)

### Asset Management

- Static assets in `attached_assets/` directory
- Generated placeholder images for trucks, events, and food items
- Vite alias `@assets` for asset imports
- Image URLs stored as arrays in JSONB database fields