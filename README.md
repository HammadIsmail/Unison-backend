# Unison Backend

A robust, scalable backend service built with [NestJS](https://nestjs.com/), featuring a dual-database architecture, real-time capabilities, and comprehensive observability.

## 🌟 Features

- **🔐 Authentication & Security:** Secure JWT-based authentication using Passport, password hashing with bcrypt, and built-in security headers (Helmet).
- **🗄️ Dual Database Architecture:**
  - **MongoDB:** Primary document-based data store (via Mongoose).
  - **Neo4j:** Graph database for managing complex relationships and connections.
- **💬 Real-time Communication:** Built-in WebSocket support using Socket.io for live notifications and messaging.
- **📧 Email Services:** Integrated email delivery system utilizing Resend and Nodemailer.
- **☁️ Cloud Media Storage:** Seamless image and media uploads handling via Cloudinary.
- **📊 Monitoring & Observability:**
  - Error tracking and performance profiling with **Sentry**.
  - Metrics collection and tracing with **OpenTelemetry**, pushing directly to **Grafana Cloud**.
- **📝 API Documentation:** Auto-generated interactive API documentation using Swagger UI.

## 🛠️ Tech Stack

- **Framework:** [NestJS](https://nestjs.com/) (Node.js/TypeScript)
- **Databases:** [MongoDB](https://www.mongodb.com/) (Mongoose), [Neo4j](https://neo4j.com/)
- **Authentication:** Passport, JWT, bcryptjs
- **Real-time:** Socket.io
- **Observability:** Sentry, OpenTelemetry
- **Tools:** PM2 (Process Management), Jest (Testing), ESLint/Prettier (Linting/Formatting)

## 🚀 Getting Started

### Prerequisites

Ensure you have the following installed on your local machine:
- **Node.js** (v18 or higher recommended)
- **npm** (or yarn/pnpm)
- Access to **MongoDB** and **Neo4j** database instances.

### 1. Clone the repository

```bash
git clone <repository-url>
cd Unison-backend
```

### 2. Install dependencies

```bash
npm install
```

### 3. Environment Variables

Create a `.env` file in the root directory. You can use the following template based on the required configurations:

```env
# Server
PORT=5000

# MongoDB
MONGODB_URI=mongodb+srv://<username>:<password>@<cluster>.mongodb.net/<database>?appName=<app>

# Neo4j
NEO4J_URI=neo4j+s://<your-instance>.databases.neo4j.io
NEO4J_USERNAME=<your-username>
NEO4J_PASSWORD=<your-password>

# JWT Authentication
JWT_SECRET=your_jwt_secret_key
JWT_EXPIRES_IN=7d
VERIFIED_TOKEN_SECRET=your_verified_token_secret
VERIFIED_TOKEN_EXPIRES_IN=15m

# Email (Resend)
RESEND_API_KEY=your_resend_api_key

# Cloudinary (Media Storage)
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret

# Observability
SENTRY_DSN=your_sentry_dsn

# Grafana Cloud Direct Push (OTLP)
OTEL_SERVICE_NAME=unison-backend
OTEL_EXPORTER_OTLP_PROTOCOL=http/protobuf
OTEL_EXPORTER_OTLP_METRICS_ENDPOINT=https://<otlp-gateway>.grafana.net/otlp/v1/metrics
OTEL_EXPORTER_OTLP_METRICS_HEADERS=Authorization=Basic <base64-encoded-credentials>
```

### 4. Database Initialization

Run the initialization scripts to set up constraints or indexes in your databases:

```bash
# Initialize Neo4j constraints/indexes
npm run init:neo4j

# Migrate email index
npm run migrate:email-index
```

## 💻 Running the Application

```bash
# Development mode
npm run start

# Watch mode (Hot reloading)
npm run start:dev

# Production mode
npm run start:prod
```

Once the server is running, you can access the interactive **Swagger API documentation** at:
`http://localhost:5000/api` *(Assuming the default route is setup to `/api`)*

## 🧪 Testing

```bash
# Unit tests
npm run test

# Watch mode
npm run test:watch

# Test coverage
npm run test:cov

# End-to-end tests
npm run test:e2e
```

## 📦 Deployment

The project includes an `ecosystem.config.js` file for deploying the application using [PM2](https://pm2.keymetrics.io/).

```bash
# Build the project first
npm run build

# Start the application with PM2
pm2 start ecosystem.config.js
```


