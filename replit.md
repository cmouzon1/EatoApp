# Eato - Food Truck Marketplace Platform

## Overview

Eato is a two-sided marketplace platform that connects food truck owners with event organizers. The application enables food trucks to discover catering opportunities and allows event organizers to find and book food vendors for their events. Built as a full-stack web application with a modern React frontend and Express backend, the platform features user authentication, searchable listings, booking management, and role-based dashboards.

## User Preferences

Preferred communication style: Simple, everyday language.

## Recent Updates (November 9, 2025)

**Role-Based Navigation & Profile Completion Improvements:**
- Added `hasCompletedProfile` flag to backend API and useAuth hook to detect profile completion status
- Created `getDashboardPath()` helper function in `client/src/lib/navigation.ts` for role-based dashboard routing
  - `truck_owner` → `/dashboard/truck`
  - `event_organizer` → `/dashboard/organizer`
  - `user` (foodie) → `/trucks` (browse page, no dedicated dashboard)
- Fixed SubscriptionSuccess page to redirect users to correct role-based destination using getDashboardPath
- Added subscription tier badge display in Header component user dropdown menu
- Implemented ProfileCompletionPrompt component with clear free registration messaging
- Added profile completion navigation guards in App.tsx:
  - Blocks access to protected routes (/trucks, /events, /dashboard/*) until profile is complete
  - Allows /profile, /subscription, and payment routes for onboarding flow
  - Shows ProfileCompletionPrompt as default fallback for incomplete profiles

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
- **Users**: Profile information with role designation (truck_owner, event_organizer, or user/foodie)
- **Trucks**: Food truck listings with details, images, menu items, pricing
- **Events**: Event listings with requirements and details
- **Bookings**: Connection between trucks and events with status tracking
- **Truck Unavailability**: Calendar system for truck owners to block specific dates when unavailable for bookings
- **Subscriptions**: Tiered user subscriptions (basic/pro) with role-specific Stripe recurring billing

**Key Backend Patterns:**
- Storage abstraction layer (`DatabaseStorage` implementing `IStorage`)
- Authentication middleware (`isAuthenticated`) for protected routes
- Shared schema definitions between frontend and backend using Drizzle-Zod
- Environment-based configuration for development/production modes

### Data Storage

**Database:**
- PostgreSQL (via Neon serverless)
- Schema managed through Drizzle ORM with migrations in `migrations/` directory
- Tables: users, trucks, events, bookings, truck_unavailability, subscriptions, sessions

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
- Role-based access: truck_owner, event_organizer, or user (foodie)
- Protected routes require authentication middleware
- User-specific data filtering (my-trucks, my-events, my-bookings)
- Profile completion flow for new users to select role from three options

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

**Email Service:**
- Resend API for transactional email notifications
- Direct API integration (not using Replit connector to allow more flexibility)
- API key stored in `RESEND_API_KEY` environment variable
- Automated notifications for booking lifecycle events:
  - New booking request created (notifies truck owner + event organizer)
  - Booking accepted by truck owner (notifies event organizer)
  - Booking declined by truck owner (notifies event organizer)
- HTML email templates with branded styling
- Non-blocking email sending (errors logged but don't fail requests)

**Payment Service:**
- Stripe API for payment processing
- Blueprint integration: `blueprint:javascript_stripe`
- API keys stored in `STRIPE_SECRET_KEY` and `VITE_STRIPE_PUBLIC_KEY` environment variables
- Payment flow for booking deposits:
  - Event organizer can pay deposit when booking is accepted
  - Deposit amount calculated as 25% of proposed price or $100 default
  - Stripe Checkout handles secure payment processing
  - Payment confirmation via webhooks
- Payment tracking in bookings table:
  - `paymentStatus`: unpaid, pending, paid, refunded
  - `paymentIntentId`: Stripe payment intent identifier
  - `depositAmount`: Deposit amount in cents
- Payment pages: `/payment-checkout` and `/payment-success`
- Non-production webhook handling (signature verification disabled for development)

**Subscription Service:**
- Stripe API for recurring subscription billing with role-specific pricing
- Blueprint integration: `blueprint:javascript_stripe`
- Environment variables for role-specific price IDs:
  - Food Trucks: `STRIPE_PRICE_TRUCK_BASIC` ($49), `STRIPE_PRICE_TRUCK_PRO` ($149)
  - Event Organizers: `STRIPE_PRICE_ORG_BASIC` ($49), `STRIPE_PRICE_ORG_PRO` ($99)
  - Users/Foodies: `STRIPE_PRICE_USER_BASIC` ($4.99), `STRIPE_PRICE_USER_PRO` ($19.99)
- Role-specific subscription plans:
  - **Food Trucks**: Basic $49/month (starter tools) | Pro $149/month (advanced features)
  - **Event Organizers**: Basic $49/month (small venues) | Pro $99/month (unlimited events)
  - **Users/Foodies**: Basic $4.99/month (discovery features) | Pro $19.99/month (power user tools)
- Subscription flow:
  - User selects role during profile setup
  - `/subscription` page displays role-specific pricing automatically
  - User selects tier (basic or pro)
  - Stripe Checkout creates recurring subscription with correct price
  - Webhook confirms subscription activation
  - Subscription status tracked in subscriptions table (linked to user via userId)
- Subscription tracking in subscriptions table:
  - `tier`: basic, pro
  - `status`: active, canceled, past_due, incomplete, trialing, none
  - `stripeCustomerId`: Stripe customer identifier
  - `stripeSubscriptionId`: Stripe subscription identifier
  - `currentPeriodEnd`: End date of current billing period
  - Role stored in user's `userRole` field (not duplicated in subscriptions)
- Subscription pages: `/subscription` and `/subscription-success`
- Webhook endpoint: `/api/subscription/webhook` handles subscription lifecycle events
- Complete setup instructions in `STRIPE_SETUP_GUIDE.md`

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
- `STRIPE_SECRET_KEY`: Stripe API secret key for payment processing
- `VITE_STRIPE_PUBLIC_KEY`: Stripe publishable key (accessible in frontend)
- `STRIPE_PRICE_BASIC`: Stripe Price ID for Basic tier subscription ($9/month)
- `STRIPE_PRICE_PRO`: Stripe Price ID for Pro tier subscription ($29/month)
- `RESEND_API_KEY`: Resend API key for sending transactional emails

### Asset Management

- Static assets in `attached_assets/` directory
- Generated placeholder images for trucks, events, and food items
- Vite alias `@assets` for asset imports
- Image URLs stored as arrays in JSONB database fields