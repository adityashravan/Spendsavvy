# 💰 SpendSavvy - AI-Powered Expense Splitting Platform

[![Next.js](https://img.shields.io/badge/Next.js-15.5.2-black)](https://nextjs.org/)
[![React](https://img.shields.io/badge/React-19.1.0-blue)](https://reactjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue)](https://www.typescriptlang.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-3.4.17-38B2AC)](https://tailwindcss.com/)
[![Neon](https://img.shields.io/badge/Neon-PostgreSQL-green)](https://neon.tech/)
[![Redis](https://img.shields.io/badge/Redis-Upstash-red)](https://upstash.com/)

> **SpendSavvy** is a modern, AI-enhanced expense splitting and financial management platform that makes sharing costs with friends, family, and groups effortless. Built with cutting-edge technologies including Next.js 15, Neon PostgreSQL, and intelligent OCR for bill processing.

## 🌟 Features

### 💡 Smart Expense Management
- **📸 OCR Bill Processing** - Upload receipts and automatically extract expense data using Google Vision API
- **🤖 AI-Powered Insights** - Get intelligent spending analysis and recommendations via Gemini AI
- **⚡ Real-time Splitting** - Split expenses instantly with equal or custom amounts
- **👥 Group Management** - Create and manage expense groups for different occasions

### 📊 Advanced Analytics
- **📈 Financial Insights Dashboard** - Comprehensive spending analytics with interactive charts
- **🏆 Gamification** - Achievement badges, spending streaks, and milestones
- **📱 Real-time Notifications** - Stay updated with expense activities and payment reminders
- **💾 Smart Caching** - Redis-powered caching for lightning-fast performance

### 🔐 Secure & Scalable
- **🔒 JWT Authentication** - Secure user authentication and session management
- **☁️ Cloud Storage** - AWS S3 integration for secure file storage
- **�️ Serverless Database** - Neon PostgreSQL for scalable data management
- **📧 Email Notifications** - Automated email notifications for important activities

## 🚀 Tech Stack

### Frontend
- **⚛️ Next.js 15** - React framework with App Router
- **🎨 Tailwind CSS** - Utility-first CSS framework
- **🎭 Framer Motion** - Animation library
- **📊 Recharts** - Data visualization
- **🧩 Radix UI** - Headless component library

### Backend & Database
- **🐘 Neon PostgreSQL** - Serverless PostgreSQL database
- **⚡ Redis (Upstash)** - In-memory caching
- **🔐 JWT** - JSON Web Token authentication
- **📧 Nodemailer** - Email service integration

### AI & External Services
- **🤖 Google Gemini AI** - Natural language processing
- **👁️ Google Vision API** - OCR and image processing
- **☁️ AWS S3** - File storage and management
- **🔧 MCP (Model Context Protocol)** - AI tool orchestration

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ 
- npm or yarn
- Neon PostgreSQL database
- Upstash Redis instance

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/adityashravan/Spendsavvy.git
   cd Spendsavvy
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Environment Setup**
   
   Create a `.env.local` file in the root directory:
   ```env
   # Database Configuration
   DATABASE_URL=your_neon_postgresql_url
   NEON_DATABASE_URL=your_neon_postgresql_url
   
   # Application Configuration
   NODE_ENV=development
   PORT=3000
   JWT_SECRET=your_super_secure_jwt_secret
   
   # AI & Vision APIs
   GEMINI_API_KEY=your_gemini_api_key
   
   # AWS S3 Configuration
   AWS_REGION=your_aws_region
   AWS_ACCESS_KEY_ID=your_aws_access_key
   AWS_SECRET_ACCESS_KEY=your_aws_secret_key
   AWS_S3_BUCKET_NAME=your_s3_bucket_name
   
   # Redis Cache Configuration
   UPSTASH_REDIS_REST_URL=your_upstash_redis_url
   UPSTASH_REDIS_REST_TOKEN=your_upstash_redis_token
   
   # MCP Server Configuration
   MCP_SERVER_NAME=expense-splitter-server
   MCP_SERVER_VERSION=1.0.0
   ```

4. **Database Setup**
   ```bash
   # Initialize database schema
   npm run setup-db
   
   # Run database migrations (if needed)
   npm run migrate-db
   ```

5. **Start Development Server**
   ```bash
   npm run dev
   ```
   
   🎉 Visit `http://localhost:3000` to see your application!

## 🏗️ Project Architecture

```
SpendSavvy/
├── 📁 app/                     # Next.js App Router
│   ├── 📁 api/                 # API Routes
│   │   ├── 📁 analytics/       # Analytics endpoints
│   │   ├── 📁 dashboard/       # Dashboard data
│   │   └── 📁 ai/             # AI-powered features
│   ├── 📁 auth/               # Authentication pages
│   ├── 📁 dashboard/          # Main dashboard
│   ├── 📁 insights/           # Financial insights
│   ├── 📁 bills/              # Bill management
│   └── 📁 groups/             # Group management
├── 📁 components/             # Reusable React components
│   ├── 📁 ui/                 # Base UI components
│   ├── 📁 dashboard/          # Dashboard components
│   ├── 📁 insights/           # Analytics components
│   └── 📁 layout/             # Layout components
├── 📁 lib/                    # Utilities & Services
│   ├── 📄 db.ts               # Database connection
│   ├── 📄 redis.ts            # Redis caching
│   ├── 📄 auth.ts             # Authentication logic
│   ├── 📄 gemini.ts           # AI integration
│   └── 📄 aws-config.ts       # AWS services
├── 📁 hooks/                  # Custom React hooks
└── 📁 scripts/                # Build & deployment scripts
```

## 🎯 Key Features Deep Dive

### 🧠 AI-Powered Bill Processing
SpendSavvy uses advanced OCR technology to automatically extract data from receipts:
- Upload photos of bills/receipts
- Automatic text extraction using Google Vision API
- AI-powered categorization and expense detection
- Smart merchant and amount recognition

### 📊 Comprehensive Analytics
Get detailed insights into your spending patterns:
- **Summary Snapshot** - Monthly spending overview
- **Category Breakdown** - Spending analysis by categories
- **Friend Analytics** - Shared expense tracking
- **Trend Analysis** - Spending patterns over time
- **Achievement System** - Badges and milestones

### 👥 Advanced Group Management
- Create expense groups for different purposes
- Add multiple participants to expenses
- Track group balances and individual contributions
- Real-time group activity notifications

### ⚡ Performance Optimizations
- **Redis Caching** - Sub-second response times
- **Database Optimization** - Efficient PostgreSQL queries
- **Image Optimization** - Next.js Image component
- **Bundle Optimization** - Tree shaking and code splitting

## 🚀 Deployment

### Vercel (Recommended)
1. Push your code to GitHub
2. Connect your repository to Vercel
3. Add environment variables in Vercel dashboard
4. Deploy automatically with every push

### Docker
```bash
# Build Docker image
docker build -t spendsavvy .

# Run container
docker run -p 3000:3000 --env-file .env.local spendsavvy
```

## 📝 API Documentation

### Authentication Endpoints
```
POST /api/auth/login       # User login
POST /api/auth/register    # User registration
POST /api/auth/logout      # User logout
```

### Expense Management
```
GET  /api/expenses         # Get user expenses
POST /api/expenses         # Create new expense
PUT  /api/expenses/:id     # Update expense
DELETE /api/expenses/:id   # Delete expense
```

### Analytics
```
GET /api/analytics?type=total_spent           # Get spending totals
GET /api/analytics?type=category_breakdown    # Category analysis
GET /api/analytics?type=friend_expenses       # Friend analytics
```

## 🤝 Contributing

We welcome contributions! Please follow these steps:

1. **Fork the repository**
2. **Create a feature branch**
   ```bash
   git checkout -b feature/amazing-feature
   ```
3. **Commit your changes**
   ```bash
   git commit -m 'Add some amazing feature'
   ```
4. **Push to the branch**
   ```bash
   git push origin feature/amazing-feature
   ```
5. **Open a Pull Request**

### Development Guidelines
- Follow TypeScript best practices
- Use Tailwind CSS for styling
- Write meaningful commit messages
- Add tests for new features
- Update documentation as needed

## 🐛 Troubleshooting

### Common Issues

**Database Connection Error**
```bash
# Check your DATABASE_URL in .env.local
# Ensure Neon database is running
npm run test-db
```

**MCP Server Fails to Start**
```bash
# Check environment variables
# Verify database connectivity
# Check logs for specific errors
```

**OCR Not Working**
```bash
# Verify GEMINI_API_KEY is set
# Check AWS S3 configuration
# Ensure proper image format (JPG, PNG)
```

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- **Neon** - For providing excellent serverless PostgreSQL
- **Upstash** - For Redis cloud hosting
- **Google Cloud** - For Vision API and Gemini AI
- **Vercel** - For seamless deployment platform
- **Open Source Community** - For amazing tools and libraries

## 📞 Support

- 📧 Email: support@spendsavvy.com
- 🐛 Issues: [GitHub Issues](https://github.com/adityashravan/Spendsavvy/issues)
- 💬 Discussions: [GitHub Discussions](https://github.com/adityashravan/Spendsavvy/discussions)

---

<div align="center">

**Built with ❤️ by [Aditya Shravan](https://github.com/adityashravan)**

⭐ Star this repository if you found it helpful!

</div>
