# Ninety Nine Acres Server

A comprehensive Node.js backend API for the Ninety Nine Acres real estate platform.

## Features

- 🔐 **Authentication & Authorization** - JWT-based auth with role-based access control
- 🏠 **Property Management** - CRUD operations for property listings
- ❤️ **Favorites System** - Users can save and manage favorite properties
- 💬 **Real-time Messaging** - Socket.IO powered chat system
- 🛠️ **Service Requests** - Home loans, movers, legal services, interior design
- 📤 **File Upload** - Cloudinary integration for image/document uploads
- 📧 **Email Service** - Automated emails for verification, notifications
- 👨‍💼 **Admin Panel** - Complete admin dashboard with analytics
- 🔍 **Advanced Search** - Location, price, amenities-based filtering
- 📊 **Analytics** - Property views, inquiries, performance tracking

## Tech Stack

- **Runtime**: Node.js
- **Framework**: Express.js
- **Database**: Supabase (PostgreSQL)
- **Authentication**: JWT + bcrypt
- **File Storage**: Cloudinary
- **Email**: Nodemailer
- **Real-time**: Socket.IO
- **Validation**: Joi
- **Security**: Helmet, CORS, Rate Limiting

## Quick Start

### 1. Install Dependencies

```bash
npm install
```

### 2. Environment Setup

Copy `.env.example` to `.env` and configure:

```bash
cp .env.example .env
```

Required environment variables:
- `JWT_SECRET` - JWT signing secret
- `SUPABASE_URL` - Your Supabase project URL
- `SUPABASE_SERVICE_ROLE_KEY` - Supabase service role key
- `CLOUDINARY_*` - Cloudinary credentials for file uploads
- `SMTP_*` - Email service configuration

### 3. Database Migration

```bash
npm run migrate
```

### 4. Start Development Server

```bash
npm run dev
```

Server will start on `http://localhost:5000`

## API Endpoints

### Authentication
- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login
- `POST /api/auth/logout` - User logout
- `GET /api/auth/me` - Get current user
- `POST /api/auth/verify-email` - Email verification
- `POST /api/auth/forgot-password` - Password reset request
- `POST /api/auth/reset-password` - Password reset

### Properties
- `GET /api/properties` - List properties with filters
- `GET /api/properties/:id` - Get single property
- `POST /api/properties` - Create property (auth required)
- `PUT /api/properties/:id` - Update property (auth required)
- `DELETE /api/properties/:id` - Delete property (auth required)
- `GET /api/properties/my/properties` - User's properties (auth required)

### Favorites
- `GET /api/favorites` - User's favorites (auth required)
- `POST /api/favorites/:propertyId` - Add to favorites (auth required)
- `DELETE /api/favorites/:propertyId` - Remove from favorites (auth required)
- `GET /api/favorites/check/:propertyId` - Check if favorited (auth required)

### Messages
- `GET /api/messages/conversations` - User's conversations (auth required)
- `GET /api/messages/conversations/:id` - Get conversation messages (auth required)
- `POST /api/messages/conversations` - Create conversation (auth required)
- `POST /api/messages/conversations/:id/messages` - Send message (auth required)

### Services
- `GET /api/services/requests` - User's service requests (auth required)
- `POST /api/services/requests` - Create service request (auth required)
- `PUT /api/services/requests/:id` - Update service request (auth required)
- `POST /api/services/requests/:id/cancel` - Cancel service request (auth required)
- `POST /api/services/requests/:id/rate` - Rate service provider (auth required)
- `GET /api/services/providers` - List service providers
- `GET /api/services/categories` - Service categories

### File Upload
- `POST /api/upload/single` - Upload single file (auth required)
- `POST /api/upload/multiple` - Upload multiple files (auth required)
- `DELETE /api/upload/:publicId` - Delete file (auth required)

### User Management
- `GET /api/users/profile` - Get user profile (auth required)
- `PUT /api/users/profile` - Update user profile (auth required)
- `PUT /api/users/avatar` - Update user avatar (auth required)
- `GET /api/users/activity` - User activity log (auth required)

### Admin (Admin role required)
- `GET /api/admin/dashboard` - Admin dashboard stats
- `GET /api/admin/users` - List all users
- `PUT /api/admin/users/:id/status` - Update user status
- `GET /api/admin/properties` - List all properties
- `PUT /api/admin/properties/:id/status` - Update property status
- `GET /api/admin/service-requests` - List service requests
- `GET /api/admin/settings` - System settings
- `PUT /api/admin/settings/:key` - Update system setting

## WebSocket Events

The server supports real-time messaging via Socket.IO:

### Client Events
- `join_conversation` - Join a conversation room
- `send_message` - Send a message
- `typing` - Typing indicator

### Server Events
- `new_message` - New message received
- `message_notification` - Message notification
- `user_typing` - Typing indicator
- `message_error` - Message sending error

## Database Schema

### Core Tables
- `users` - User accounts and authentication
- `user_profiles` - Extended user information
- `properties` - Property listings
- `property_images` - Property photos
- `property_amenities` - Property features
- `user_favorites` - Saved properties
- `conversations` & `messages` - Chat system
- `service_requests` - Service bookings
- `service_providers` - Service provider directory

### Features
- UUID primary keys
- Soft deletes where appropriate
- Comprehensive indexing
- JSONB for flexible metadata
- Audit timestamps

## Security Features

- 🔐 JWT authentication with secure tokens
- 🛡️ Password hashing with bcrypt (12 rounds)
- 🚦 Rate limiting (100 requests per 15 minutes)
- 🔒 Helmet.js security headers
- ✅ Input validation with Joi schemas
- 🌐 CORS protection
- 📝 Request logging with Morgan

## File Upload

Supports image and document uploads via Cloudinary:

- **Supported formats**: JPG, PNG, PDF, DOC, DOCX
- **Max file size**: 10MB (configurable)
- **Storage**: Cloudinary with organized folders
- **Features**: Automatic optimization, multiple formats

## Email Templates

Pre-built responsive email templates:

- Welcome & email verification
- Password reset
- Property inquiry notifications
- Service request updates
- System notifications

## Error Handling

Comprehensive error handling:

- Global error middleware
- Async error catching
- Detailed error responses
- Environment-specific stack traces
- Database error mapping

## Development

### Project Structure
```
server/
├── config/          # Database and app configuration
├── controllers/     # Business logic (optional)
├── middleware/      # Custom middleware
├── models/          # Data models (optional)
├── routes/          # API route definitions
├── scripts/         # Database migrations and utilities
├── utils/           # Helper functions and services
├── .env.example     # Environment variables template
├── index.js         # Application entry point
└── package.json     # Dependencies and scripts
```

### Available Scripts
- `npm start` - Start production server
- `npm run dev` - Start development server with nodemon
- `npm run migrate` - Run database migrations
- `npm test` - Run test suite

### Code Quality
- ESLint for code linting
- Prettier for code formatting
- Consistent error handling
- Comprehensive input validation
- Security best practices

## Deployment

### Environment Variables
Ensure all required environment variables are set:
- Database credentials
- JWT secret
- Third-party service keys
- Email configuration

### Production Considerations
- Set `NODE_ENV=production`
- Use PM2 or similar process manager
- Configure proper logging
- Set up monitoring and alerts
- Enable HTTPS
- Configure rate limiting appropriately

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

MIT License - see LICENSE file for details.

## Support

For support, email support@ninetyneacres.com or create an issue in the repository.