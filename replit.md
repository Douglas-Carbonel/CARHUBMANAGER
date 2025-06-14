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
- **Loyalty System**: Points-based customer loyalty tracking
- **Profile Management**: Complete customer information with contact details

### Vehicle Management
- **Comprehensive Tracking**: Brand, model, year, color, and maintenance history
- **Customer Association**: Many-to-one relationship with customers
- **Service History**: Complete service record tracking per vehicle

### Service Management
- **Service Types**: Configurable service categories with pricing
- **Scheduling**: Date and time-based appointment system
- **Status Tracking**: Complete service lifecycle management
- **Recurring Services**: Automated loyalty tracking for recurring services

### Loyalty Program
- **Points System**: Configurable points per service type
- **Recurring Services**: Automatic tracking of service intervals
- **Due Date Management**: Proactive customer notification system
- **Customer Retention**: Analytics for customer service patterns

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
5. Loyalty points awarded and recurring service tracking updated

### Loyalty System Flow
1. Service completion triggers loyalty point calculation
2. Recurring services create tracking entries with due dates
3. System monitors due dates for proactive notifications
4. Customer loyalty status influences service recommendations

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
- June 14, 2025. Initial setup
```

## User Preferences

```
Preferred communication style: Simple, everyday language.
```