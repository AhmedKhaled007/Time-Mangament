# Netlify Serverless Deployment Guide (Multi-User with Google OAuth)

## Prerequisites

1. **Netlify Account**: Sign up at [netlify.com](https://netlify.com)
2. **Git Repository**: Your code should be in a Git repository (GitHub, GitLab, etc.)
3. **Neon Database**: Create a PostgreSQL database on [neon.tech](https://neon.tech)
4. **Google OAuth**: Set up Google OAuth application at [console.cloud.google.com](https://console.cloud.google.com)

## Database Setup

### 1. Create Neon Database

1. Sign up at [neon.tech](https://neon.tech)
2. Create a new project
3. Copy the connection string (DATABASE_URL)
4. Run the schema.sql file to create tables:

```sql
-- Copy and paste contents of schema.sql into Neon SQL editor
```

## Google OAuth Setup

### 1. Create Google OAuth Application

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Create a new project or select an existing one
3. Enable the Google+ API
4. Go to "Credentials" and create "OAuth 2.0 Client IDs"
5. Set application type to "Web application"
6. Add authorized origins:
   - `http://localhost:5173` (for local development)
   - `https://your-netlify-domain.netlify.app` (for production)
7. Copy the Client ID for use in environment variables

### 2. Environment Variables in Netlify

Go to Site Settings > Environment Variables and add:

```
DATABASE_URL = postgresql://username:password@host/database?sslmode=require
NODE_ENV = production
JWT_SECRET = your-random-jwt-secret-key-here
VITE_GOOGLE_CLIENT_ID = your-google-oauth-client-id
```

## Deployment Steps

### 1. Deploy via Git Integration

1. Connect your repository to Netlify
2. Set build settings:
   - **Base directory**: `frontend`
   - **Build command**: `npm run build`
   - **Publish directory**: `frontend/dist`
   - **Functions directory**: `frontend/netlify/functions`

### 2. Automatic Deployment

Netlify will automatically:
- Build your React app
- Deploy serverless functions
- Set up API endpoints at `/.netlify/functions/`

## Architecture

This is now a **fully serverless application**:

### **Frontend (React + Vite)**
- Static site deployed to Netlify CDN
- Client-side routing with redirects
- Optimized builds with code splitting

### **Backend (Netlify Functions)**
- Serverless functions for all API endpoints
- PostgreSQL database via Neon
- No need for separate backend server

### **Database (Neon PostgreSQL)**
- Fully managed PostgreSQL
- Automatic scaling and backups
- Connection pooling built-in

## API Endpoints

All API calls now go to Netlify Functions:

```
/.netlify/functions/weekly-tasks        # GET, POST
/.netlify/functions/weekly-tasks/[id]   # PUT, DELETE
/.netlify/functions/weekly-tasks/[id]/toggle  # POST
/.netlify/functions/lunch-ideas         # GET, POST
/.netlify/functions/lunch-ideas/[id]    # PUT, DELETE
/.netlify/functions/breakfast-ideas     # GET, POST
/.netlify/functions/breakfast-ideas/[id] # PUT, DELETE
/.netlify/functions/daily-lunch/[date]  # GET, PUT
/.netlify/functions/daily-breakfast/[date] # GET, PUT
/.netlify/functions/distractions        # GET, POST
/.netlify/functions/stats               # GET
```

## Local Development

### 1. Install Dependencies

```bash
cd frontend
npm install
```

### 2. Set Environment Variables

Create `.env` file:

```
DATABASE_URL=postgresql://username:password@host/database
```

### 3. Set Local Environment Variables

Create `.env` file:

```
DATABASE_URL=postgresql://username:password@host/database
JWT_SECRET=your-random-secret-key
VITE_GOOGLE_CLIENT_ID=your-google-client-id
```

### 4. Start Development Server

```bash
npm run dev  # Uses netlify dev for full functionality
```

This runs:
- Vite dev server for React app
- Netlify functions locally
- Database connections
- Google OAuth authentication

## Available Scripts

```bash
# Development with Netlify functions
npm run dev

# Development with Vite only (no functions)
npm run dev:vite

# Production build
npm run build

# Type checking
npm run type-check

# Linting
npm run lint

# Preview production build
npm run preview
```

## Features

✅ **Fully Serverless**: No backend server needed  
✅ **Multi-User**: Google OAuth authentication  
✅ **Database**: PostgreSQL via Neon with user isolation  
✅ **Auto-scaling**: Functions scale automatically  
✅ **Global CDN**: Fast static asset delivery  
✅ **Type-safe**: TypeScript throughout  
✅ **Secure**: JWT-based session management  
✅ **Real-time**: Instant updates with database  

## Limitations

❌ **Obsidian Integration**: File system access not available  
❌ **TickTick Integration**: OAuth flows need configuration  
❌ **Local Storage**: Data now persists in database  

## Cost

- **Netlify**: Free tier includes 125K function invocations/month
- **Neon**: Free tier includes 0.5GB storage, 1 million queries/month
- **Total**: Free for personal use, scales with usage

## Troubleshooting

### Build Fails
```bash
npm run type-check  # Check TypeScript errors
npm run lint       # Check code style
```

### Database Connection Issues
- Verify DATABASE_URL in Netlify environment variables
- Check Neon database is running
- Ensure connection string includes `?sslmode=require`

### Function Errors
- Check Netlify function logs in dashboard
- Verify database schema matches expected structure
- Test functions locally with `netlify dev`