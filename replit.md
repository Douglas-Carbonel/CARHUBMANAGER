# Sistema de Gestão Automotiva (CarHub)

## Overview

This is a comprehensive automotive service management system built as a full-stack web application. The system provides complete management capabilities for automotive service shops, including customer management, vehicle tracking, service scheduling, loyalty programs, and detailed reporting. The application features a modern React frontend with a Node.js/Express backend, utilizing PostgreSQL for data persistence.

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript
- **Build Tool**: Vite for fast development and optimized builds
- **UI Framework**: Tailwind CSS with shadcn/ui components
- **State Management**: TanStack Query (React Query) for server state management
- **Routing**: Wouter for lightweight client-side routing
- **Form Management**: React Hook Form with Zod validation
- **Icons**: Lucide React icon library

### Backend Architecture
- **Runtime**: Node.js with TypeScript
- **Framework**: Express.js for REST API endpoints
- **Database ORM**: Drizzle ORM with PostgreSQL
- **Authentication**: Passport.js with local strategy and session management
- **Session Storage**: PostgreSQL-based session store using connect-pg-simple
- **Password Security**: Node.js crypto module with scrypt hashing

### Database Design
- **Primary Database**: PostgreSQL (Supabase hosted)
- **Schema Management**: Drizzle Kit for migrations and schema management
- **Connection Pooling**: Node.js pg Pool for database connections

## Key Components

### Authentication System
- **Strategy**: Session-based local authentication with Passport.js
- **User Management**: Role-based access control (admin/technician)
- **Password Security**: Scrypt-based password hashing with salt
- **Session Persistence**: PostgreSQL session store with 7-day TTL
- **Authorization**: Route-level permission checks

### Customer Management
- **Document Validation**: Brazilian CPF/CNPJ validation and formatting
- **Profile Management**: Complete customer information with contact details

### Vehicle Management
- **Comprehensive Tracking**: Brand, model, year, color, and maintenance history
- **Customer Association**: Many-to-one relationship with customers
- **Service History**: Complete service record tracking per vehicle

### Service Management
- **Service Types**: Configurable service categories with pricing
- **Scheduling**: Date and time-based appointment system
- **Status Tracking**: Complete service lifecycle management




### Reporting System
- **Financial Analytics**: Revenue tracking and service profitability
- **Customer Analytics**: Customer behavior and retention metrics
- **Service Analytics**: Performance metrics for different service types
- **Visual Reports**: Chart-based reporting with Recharts

## Data Flow

### Authentication Flow
1. User submits credentials via login form
2. Server validates credentials against database
3. Successful authentication creates secure session
4. Session data stored in PostgreSQL for persistence
5. Client receives authentication status via protected routes

### Service Management Flow
1. Customer and vehicle data validated and stored
2. Service appointments scheduled with type and pricing
3. Service status tracked through completion lifecycle
4. Payment processing and service completion recording
5. Payment processing and service completion recording



## External Dependencies

### Production Dependencies
- **@tanstack/react-query**: Server state management and caching
- **@radix-ui/react-***: Accessible UI component primitives
- **drizzle-orm**: Type-safe database ORM
- **express**: Web application framework
- **passport**: Authentication middleware
- **pg**: PostgreSQL client
- **zod**: Runtime type validation
- **date-fns**: Date manipulation utilities

### Development Dependencies
- **vite**: Fast build tool and development server
- **typescript**: Type safety and development experience
- **tailwindcss**: Utility-first CSS framework
- **drizzle-kit**: Database migration management

### Database Provider
- **Supabase**: Managed PostgreSQL hosting with connection pooling

## Deployment Strategy

### Development Environment
- **Runtime**: Node.js 20 with ES modules
- **Development Server**: Vite dev server with HMR
- **Database**: Direct connection to Supabase PostgreSQL
- **Session Management**: In-memory development sessions

### Production Environment
- **Build Process**: Vite production build with ESBuild bundling
- **Server Bundle**: ESBuild compilation for Node.js deployment
- **Static Assets**: Optimized and minified frontend assets
- **Database**: Production PostgreSQL with connection pooling
- **Session Storage**: PostgreSQL-based persistent sessions

### Replit Deployment
- **Platform**: Replit autoscale deployment target
- **Port Configuration**: Internal port 5000, external port 80
- **Environment**: Production Node.js environment
- **Build Command**: `npm run build`
- **Start Command**: `npm run start`

## Changelog

```
Changelog:
- January 18, 2025. Added dedicated modal for multiple appointments per day - mobile users can now tap calendar days to see all appointments in a clean interface
- January 18, 2025. Improved mobile calendar experience - period filters only apply to cards view, better multiple appointments display with enhanced modal
- January 18, 2025. Made admin panel fully responsive for mobile devices - card view for small screens, table view for desktop
- January 18, 2025. Added confirmation dialogs for deletion in admin panel (users, service types, service extras) with consistent UI matching other pages
- January 18, 2025. Fixed currency formatting bug in admin panel - values with commas now convert to dots before database submission
- June 21, 2025. Redesigned dashboard with minimalist professional style - clean cards, improved spacing, modern metrics display
- June 21, 2025. Updated dashboard stats cards with currency formatting, percentage changes, and professional icons
- June 21, 2025. Restructured dashboard layout to match professional design reference with better visual hierarchy
- June 20, 2025. Improved mobile schedule page layout - moved counter next to "Hoje" for mobile devices
- June 24, 2025. Completed major architectural consolidation: merged service_types and service_extras into unified_services table
- June 24, 2025. Updated all APIs and database queries to use unified service management approach
- June 24, 2025. Maintained backward compatibility for existing frontend code during transition
- June 20, 2025. Removed loyalty/fidelization functionality from the system
- June 20, 2025. Added payment status filters to services page (Pagos, Pendentes, Parcial)
- June 20, 2025. Fixed photo deletion preventing form submission with proper event handling
- January 18, 2025. Fixed photo management issues - photos now refresh properly in cards after camera capture and deletion doesn't close edit modal
- January 18, 2025. Fixed vehicles page data loading issue - added missing queryFn to useQuery hooks
- January 18, 2025. Fixed React Select component empty value error in vehicles page
- January 2025. Migration from Replit Agent to standard Replit completed successfully
- January 2025. Fixed JSX syntax errors and cleaned up service resume modal interface
- January 2025. Added Portuguese status translation in service resume modal for better localization
- January 2025. Removed service extras/adicionais tab from admin panel and fixed storage errors to reflect unified service architecture
- June 19, 2025. Added photo category selection during capture and upload (Vehicle, Damage, Before, After, Other)
- June 19, 2025. Enhanced temporary photos display with category labels for new vehicle creation
- June 19, 2025. Implemented automatic image compression for all photo uploads (camera and file upload)
- June 19, 2025. Optimized image storage: photos now compressed to max 800px width, JPEG quality 80%
- June 19, 2025. Fixed vehicle photo capture during creation - photos now save correctly when creating new vehicles
- June 19, 2025. Increased Express payload limit to 50MB to support base64 image uploads
- June 19, 2025. Fixed critical bug: service extras now save correctly and load in edit mode
- June 19, 2025. Enhanced payment status indicators with prominent colors and badges
- June 19, 2025. Reorganized service form UI with improved payment and value sections
- June 19, 2025. Implemented comprehensive payment methods modal (PIX, Cash, Check, Card)
- June 19, 2025. Enhanced service resume modal with complete service overview
- June 19, 2025. Improved service values section with detailed base service and extras display
- January 2025. Successfully completed migration from Replit Agent to standard Replit environment
- January 2025. Fixed JSX syntax errors in vehicles.tsx component
- January 2025. Installed missing tsx dependency for TypeScript execution
- June 18, 2025. Fixed photos database schema and constraints - camera functionality now working
- June 18, 2025. Implemented custom photos storage layer to handle database structure mismatch
- June 15, 2025. Dashboard migrado para Replit com dados reais do Supabase
- June 15, 2025. Corrigido sistema de autenticação e APIs do dashboard
- June 15, 2025. Implementado dashboard funcional com gráficos e estatísticas em tempo real
- June 14, 2025. Initial setup
```

## User Preferences

```
Preferred communication style: Simple, everyday language.
```