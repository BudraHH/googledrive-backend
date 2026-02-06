# CloudDrive Backend

A secure, scalable backend API for CloudDrive - an AWS S3-powered Google Drive clone. Built with Node.js, Express, and MongoDB.

## 🚀 Live Demo

- **API URL**: https://googledrive-backend-4lxu.onrender.com
- **Frontend**: https://clouddrive-red.vercel.app

## 📋 Features

### Authentication & Security
- 🔐 JWT-based authentication with HTTP-only cookies
- 📧 Two-step email verification (registration + activation)
- 🔑 Secure password reset with expiring tokens
- 🛡️ Password hashing with bcrypt (10 salt rounds)
- ⏱️ Rate limiting (100 requests per 15 minutes)
- 🔒 Helmet.js for HTTP security headers
- 🌐 CORS configured for cross-origin requests

### File Management
- ☁️ AWS S3 integration with pre-signed URLs
- 📁 Virtual folder system with infinite nesting
- ⭐ Star/unstar files and folders
- 🗑️ Soft delete with trash/restore functionality
- 🔄 Batch upload support (up to 100 files)
- 📥 Secure download with temporary signed URLs

### Data Management
- 📊 MongoDB Atlas for metadata storage
- 🔍 Efficient indexing for fast queries
- 👤 User-based access control

## 🛠️ Tech Stack

| Technology | Purpose |
|------------|---------|
| Node.js | Runtime environment |
| Express 5 | Web framework |
| MongoDB | Database (via Mongoose 9) |
| AWS S3 | File storage |
| JWT | Authentication tokens |
| Bcrypt | Password hashing |
| Brevo API | Transactional emails |
| Helmet | Security headers |

## 📁 Project Structure

```
googledrive-backend/
├── index.js                 # Application entry point
├── package.json
├── .env.example             # Environment variables template
└── src/
    ├── config/
    │   ├── db.js            # MongoDB connection
    │   └── s3Config.js      # AWS S3 client
    ├── controllers/
    │   ├── userController.js    # Auth & user operations
    │   └── fileController.js    # File/folder operations
    ├── middleware/
    │   ├── authMiddleware.js    # JWT verification
    │   └── errorMiddleware.js   # Error handling
    ├── models/
    │   ├── UserModel.js     # User schema
    │   └── Item.js          # File/folder schema
    ├── routes/
    │   ├── userRoutes.js    # /api/user routes
    │   └── fileRoutes.js    # /api/files routes
    ├── utils/
    │   ├── generateToken.js # JWT generation
    │   └── sendEmail.js     # Email service (Brevo)
    └── constants/
        └── appConstants.js  # Data types & enums
```

## ⚙️ Installation

### Prerequisites
- Node.js 18+
- MongoDB Atlas account
- AWS S3 bucket
- Brevo account (for emails)

### Setup

1. **Clone the repository**
   ```bash
   git clone https://github.com/BudraHH/googledrive-backend.git
   cd googledrive-backend
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure environment variables**
   ```bash
   cp .env.example .env
   ```
   Edit `.env` with your credentials (see below)

4. **Run development server**
   ```bash
   npm run dev
   ```

5. **Run production server**
   ```bash
   npm start
   ```

## 🔐 Environment Variables

Create a `.env` file with:

```env
# Server
PORT=5000
NODE_ENV=development

# Database
MONGO_URI=mongodb+srv://username:password@cluster.mongodb.net/clouddrive

# JWT
JWT_SECRET=your-super-secret-jwt-key-here

# Frontend URL (for email links & CORS)
FRONTEND_URL=http://localhost:5173

# Email (Brevo API)
BREVO_API_KEY=xkeysib-xxxxxxxxxxxxxxxx
FROM_EMAIL=your-verified-email@gmail.com

# AWS S3
AWS_ACCESS_KEY_ID=AKIAXXXXXXXXXXXXXXXX
AWS_SECRET_ACCESS_KEY=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
AWS_REGION=ap-south-1
AWS_BUCKET_NAME=your-bucket-name
```

## 📡 API Endpoints

### Authentication (`/api/user`)

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/register` | Register new user |
| GET | `/activate/:token` | Verify email |
| POST | `/auth` | Login |
| POST | `/logout` | Logout |
| POST | `/forgot-password` | Request password reset |
| PUT | `/reset-password/:token` | Reset password |
| GET | `/profile` | Get user profile (protected) |
| PUT | `/profile` | Update profile (protected) |

### Files (`/api/files`)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/` | List items in folder |
| GET | `/recent` | Get recent files |
| GET | `/starred` | Get starred items |
| GET | `/trash` | Get trashed items |
| GET | `/:id` | Get single item |
| POST | `/generate-upload-url` | Get S3 upload URL |
| POST | `/metadata` | Save file metadata |
| POST | `/batch/generate-upload-urls` | Batch upload URLs |
| POST | `/batch/metadata` | Batch save metadata |
| GET | `/:id/download` | Get download URL |
| PUT | `/:id/rename` | Rename item |
| PUT | `/:id/trash` | Move to trash |
| PUT | `/:id/restore` | Restore from trash |
| PUT | `/:id/star` | Toggle star |
| DELETE | `/:id` | Delete permanently |

## 🚀 Deployment (Render)

1. Create a new **Web Service** on Render
2. Connect your GitHub repository
3. Configure:
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
4. Add all environment variables
5. Deploy!

### Important Render Settings:
- `trust proxy` is enabled for rate limiting
- `sameSite: 'none'` cookies for cross-origin auth

## 🔒 Security Features

1. **Password Security**: Bcrypt with 10 salt rounds
2. **JWT Cookies**: HTTP-only, Secure, SameSite protection
3. **Rate Limiting**: 100 requests per 15 minutes
4. **Helmet**: Secure HTTP headers
5. **Token Expiry**: Activation (24h), Reset (10min), JWT (30 days)
6. **S3 Security**: Private bucket, pre-signed URLs only

## 📧 Email Service

Uses **Brevo API** for transactional emails:
- 300 emails/day on free tier
- Works on all cloud platforms (no SMTP blocking)
- Hackathon safety: Links logged to console

## 🧪 Testing

```bash
# Health check
curl https://googledrive-backend-4lxu.onrender.com/health-check

# Should return: "Server is running!!!"
```

## 📄 License

ISC License

## 👨‍💻 Author

Built for HCL-GUVI Hackathon 2026
