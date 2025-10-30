# Eato - Food Truck Marketplace Platform - Design Guidelines

## Design Approach

**Reference-Based Design** drawing from successful marketplace platforms:
- **Primary Inspiration**: Airbnb's card-based layouts and trust-building design patterns
- **Secondary References**: DoorDash/Uber Eats for food-centric visual hierarchy, Thumbtack for service marketplace patterns
- **Key Principles**: Appetite appeal, trust signals, clear two-sided marketplace navigation, mobile-first responsive design

## Typography

**Font Stack**: 
- Headings: 'Poppins' (Google Fonts) - Bold (700) for primary headlines, SemiBold (600) for subheadings
- Body: 'Inter' (Google Fonts) - Regular (400) for text, Medium (500) for emphasis
- UI Elements: 'Inter' Medium (500) for buttons, labels, navigation

**Type Scale**:
- Hero Headlines: 3.5rem (desktop) / 2.25rem (mobile), Bold
- Section Titles: 2rem (desktop) / 1.5rem (mobile), SemiBold  
- Card Titles: 1.25rem, SemiBold
- Body Text: 1rem, Regular, line-height 1.6
- Small Text/Captions: 0.875rem, Regular

## Layout System

**Spacing Primitives**: Tailwind units of 2, 4, 6, 8, 12, 16, 20, 24
- Micro spacing (gaps, padding within cards): 2, 4, 6
- Component spacing (between elements): 8, 12
- Section spacing (vertical rhythm): 16, 20, 24

**Breakpoints**:
- Mobile: base (default)
- Tablet: md: (768px)
- Desktop: lg: (1024px)
- Wide: xl: (1280px)

**Container Widths**:
- Maximum content width: max-w-7xl (1280px)
- Form/detail pages: max-w-4xl
- Cards grid: 1 column (mobile), 2 columns (tablet), 3-4 columns (desktop)

## Core Components

### Navigation
**Header**: Sticky top navigation with logo left, main nav center (Desktop) / hamburger (Mobile), user actions right
- Height: 16 units (64px)
- Elements: "Browse Trucks", "Find Events", "For Truck Owners", "For Organizers", Sign In/Sign Up buttons
- Shadow: subtle drop shadow on scroll

### Cards - Truck Listings
**Structure**: Image top (aspect-ratio 4:3), content bottom with padding-6
- Truck Name: 1.25rem SemiBold
- Cuisine Type: Small badge with rounded corners, padding-2
- Rating/Reviews: Star icons + count (e.g., "4.8 (127 reviews)")
- Key Info: Operating hours, price range with icons
- Availability indicator: Badge "Available Now" or next available date
- Rounded corners: rounded-2xl, subtle shadow on hover (lift effect)

### Cards - Event Listings  
**Structure**: Similar card format
- Event Title: 1.25rem SemiBold
- Date/Time: Prominent with calendar icon
- Location: With map pin icon
- Headcount: Badge showing expected attendees
- Trucks Needed: Clear count with food truck icon
- Application Status: For logged-in trucks (badge: "Applied", "Pending", "Accepted")

### Search & Filter Bar
**Position**: Below hero, sticky when scrolling
- Search input: Large, rounded-full, with search icon left
- Filter chips: Cuisine types, date ranges, location radius (horizontally scrollable on mobile)
- Advanced filters: Dropdown panel with price range, rating, availability toggles

### Interactive Map
**Design**: Full-width section with height 500px (desktop) / 400px (mobile)
- Custom map markers: Food truck icon for trucks, event pin for events
- Marker clusters: When zoomed out, show count badges
- Popup cards: Mini version of truck/event cards with "View Details" link
- Map controls: Zoom, locate me, layer toggle (trucks/events/both)

### Booking Request Modal
**Layout**: Centered overlay, max-w-2xl
- Header: Event/Truck name with image thumbnail
- Form fields: Message textarea, proposed pricing, availability confirmation
- Footer: Cancel (ghost button), Submit Request (primary button)
- Background: Semi-transparent backdrop blur

### Dashboard Layouts
**Two-Column Split** (desktop) / Stacked (mobile):
- Sidebar: Navigation, quick stats cards (total bookings, pending requests, revenue)
- Main area: Data tables with sorting, status badges, action buttons
- Status color coding: Pending (amber), Accepted (green), Declined (gray), Completed (blue)

### Buttons
**Primary**: Rounded-lg, padding-y-3, padding-x-6, medium font weight
**Secondary**: Same size, border style
**Ghost**: Text only with hover background
**Icon Buttons**: Square with icon centered, rounded-lg
**Hover States**: Slight scale (1.02) and shadow increase

### Forms
**Input Fields**: Rounded-lg, padding-3, border with focus ring
**Labels**: Above inputs, medium font weight, margin-bottom-2
**Required Indicators**: Red asterisk
**Validation**: Inline error messages below fields in red with small text
**Multi-step Forms**: Progress indicator at top (steps 1/2/3) with active/completed states

### Badges & Tags
**Cuisine Tags**: Rounded-full, small text, padding-x-3, padding-y-1
**Status Badges**: Rounded-md, uppercase text (0.75rem), padding-x-2, padding-y-1
**Rating Stars**: Filled gold stars using icon library

### Empty States
**Structure**: Centered content, illustration/icon (8rem size), heading, description, CTA button
**Example**: "No trucks available in your area - Expand your search radius or check back later"

## Images

### Hero Section
**Large Hero Image**: Full-width, height 500px (desktop) / 400px (mobile)
- Image Content: Vibrant food truck scene at an outdoor event, people enjoying food, multiple trucks visible
- Overlay: Semi-transparent gradient (dark at bottom) to ensure text readability
- Hero Content: Centered over image - main headline, subheading, primary search bar with blurred background button

### Truck Profile Photos
**Primary Image**: Large hero (aspect-ratio 16:9), showcasing the truck exterior
**Gallery**: 4-6 additional images in grid - food close-ups, menu board, interior, team
**Menu Items**: Square images (1:1 aspect ratio) with dish names and prices overlaid

### Event Imagery
**Event Type Icons**: Illustrated icons for corporate events, festivals, weddings, private parties
**Location Placeholder**: When no image available, use map thumbnail or generic venue illustration

### Trust Signals
**Verification Badges**: Small icons next to truck names (verified, licensed, insured)
**Owner Photos**: Circular avatars (48px) for truck owners and organizers in profiles and reviews

### Background Patterns
**Subtle Food Patterns**: Light, low-opacity patterns (food truck silhouettes, utensils) for section backgrounds
**Divider Graphics**: Fun food-related illustrations between major sections

## Overall Aesthetic

**Visual Style**: Warm, inviting, energetic marketplace that balances professionalism with the casual, fun nature of food trucks
**Photography Guidelines**: Bright, appetizing food photography with natural lighting, authentic street food atmosphere
**Iconography**: Use Font Awesome icons - consistent stroke weight, 24px standard size
**Whitespace**: Generous padding around content sections to prevent overcrowding
**Shadows**: Subtle elevation - sm for cards, md for modals, lg for dropdowns
**Interactions**: Smooth transitions (200-300ms), micro-animations on hover (scale, shadow), loading skeletons for content

This design creates a trustworthy, visually appealing marketplace that celebrates food culture while providing clear, efficient tools for both food truck operators and event organizers to connect.