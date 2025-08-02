# TickTick Integration

This document describes the TickTick integration implemented in the Time Management Dashboard.

## Overview

The TickTick integration automatically creates tasks in TickTick when users create tasks in the Time Management Dashboard. This provides seamless synchronization between the local dashboard and TickTick for users who want to manage their tasks across multiple platforms.

## Features

- **Automatic Task Creation**: When a user creates a daily or weekly task in the dashboard, it's automatically created in TickTick
- **Priority Mapping**: Task priorities are mapped from the dashboard format to TickTick format
- **Completion Sync**: Task completion status is synchronized between the dashboard and TickTick
- **Error Handling**: Graceful handling of TickTick API failures with proper logging
- **Configuration-based**: Integration can be enabled/disabled via environment variables

## Setup

### 1. Install Dependencies

The integration requires the following Python packages (already included in requirements.txt):
```
requests==2.31.0
aiohttp==3.9.1
```

### 2. Get TickTick Access Token

There are two ways to get your TickTick access token:

#### Method 1: Direct Access Token (Recommended)
1. Get your access token from TickTick Developer Portal
2. Set it directly in your `.env` file

#### Method 2: OAuth2 Flow (Automated)
1. Register your app at TickTick Developer Portal to get Client ID and Secret
2. Use the built-in OAuth endpoints to get access token

### 3. Configuration

Set the following environment variables in your `.env` file:

```env
# Enable TickTick integration
TICKTICK_ENABLED=true

# Method 1: Direct Access Token (Recommended)
TICKTICK_ACCESS_TOKEN=your_access_token_here

# Method 2: OAuth2 Configuration (Optional)
TICKTICK_CLIENT_ID=your_client_id
TICKTICK_CLIENT_SECRET=your_client_secret
TICKTICK_REDIRECT_URI=http://localhost:8000/api/v1/ticktick/oauth/callback
```

### 4. OAuth2 Flow (if using Method 2)

1. **Get Authorization URL**: 
   ```bash
   GET http://localhost:8000/api/v1/ticktick/oauth/authorize-url
   ```

2. **Visit the URL** and authorize your application

3. **Exchange Code for Token**:
   ```bash
   POST http://localhost:8000/api/v1/ticktick/oauth/exchange-token
   {
     "authorization_code": "code_from_redirect"
   }
   ```

4. **Save the Access Token** to your `.env` file

### 3. Environment File Template

Copy `.env.example` to `.env` and update the TickTick credentials:
```bash
cp .env.example .env
```

## API Endpoints

### GET /api/v1/ticktick/status
Returns the current TickTick integration status:
```json
{
  "enabled": true,
  "connected": true,
  "configured": true
}
```

### POST /api/v1/ticktick/test-connection
Tests the TickTick connection by creating and deleting a test task:
```json
{
  "status": "success",
  "message": "TickTick connection test successful"
}
```

## Implementation Details

### Service Architecture

The integration is implemented through the `TickTickService` class in `app/services/ticktick_service.py`:

- **Authentication**: Handles TickTick API authentication
- **Task Creation**: Maps dashboard tasks to TickTick format
- **Error Handling**: Provides graceful fallback when TickTick is unavailable
- **Logging**: Comprehensive logging for debugging and monitoring

### Task Flow Integration

The integration hooks into the existing task creation flow in `TaskService`:

1. User creates a task in the dashboard
2. Task is saved locally in JSON format
3. If TickTick integration is enabled, task is sent to TickTick API
4. TickTick task ID is stored with the local task for future updates
5. Task completion status changes are synchronized to TickTick

### Priority Mapping

Dashboard priorities are mapped to TickTick priorities:
- `high` → Priority 3 (High)
- `medium` → Priority 1 (Medium) 
- `low` → Priority 0 (Low)

### Data Model

Tasks now include an optional `ticktick_id` field to store the TickTick task identifier:

```python
class Task(TaskBase):
    id: int
    created_at: datetime
    updated_at: datetime
    ticktick_id: Optional[str] = None  # New field for TickTick integration
```

## Current Implementation Status

✅ **PRODUCTION READY** - Real TickTick API Integration Implemented!

The current implementation includes:
- ✅ **Real TickTick REST API calls** using `requests` library
- ✅ **OAuth2 Authentication Flow** with authorization URL generation and token exchange
- ✅ **Direct Access Token Support** for simple authentication
- ✅ **Complete integration architecture** with proper error handling
- ✅ **Real task creation** in TickTick with priority mapping
- ✅ **Task completion synchronization** between dashboard and TickTick
- ✅ **Task deletion support** for cleanup operations
- ✅ **Weekly task support** with date and time handling
- ✅ **Comprehensive API endpoints** for OAuth flow and testing
- ✅ **Production-grade error handling** and logging

## API Endpoints

### Core Endpoints
- `POST /api/v1/task` - Automatically creates tasks in TickTick when enabled
- `PUT /api/v1/task/{id}/toggle` - Syncs completion status with TickTick

### TickTick Management Endpoints
- `GET /api/v1/ticktick/status` - Check integration status
- `POST /api/v1/ticktick/test-connection` - Test TickTick API connection
- `GET /api/v1/ticktick/oauth/authorize-url` - Get OAuth2 authorization URL
- `POST /api/v1/ticktick/oauth/exchange-token` - Exchange authorization code for access token

## Security Considerations

- Store TickTick credentials securely (consider using environment variables or secret management)
- Implement proper OAuth2 flow instead of username/password authentication
- Use HTTPS for all TickTick API communications
- Implement proper error handling to avoid exposing sensitive information

## Troubleshooting

### Integration Not Working
1. Check that `TICKTICK_ENABLED=true` in your `.env` file
2. Verify TickTick credentials are correct
3. Check application logs for TickTick-related errors
4. Test connection using the `/api/v1/ticktick/test-connection` endpoint

### Tasks Not Syncing
1. Verify TickTick integration is enabled in settings
2. Check that task creation is successful locally first
3. Review TickTick service logs for API errors
4. Ensure TickTick credentials have proper permissions

## Future Enhancements

- **Bi-directional Sync**: Sync tasks created in TickTick back to the dashboard
- **Real-time Updates**: Implement webhooks for instant synchronization
- **Bulk Operations**: Support for bulk task operations
- **Project Mapping**: Map dashboard task categories to TickTick projects
- **Due Date Sync**: Sync task due dates and reminders
- **Attachment Support**: Sync task attachments and notes