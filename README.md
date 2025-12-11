# Cendika Communication Platform

[![Powered by Sendexa](https://img.shields.io/badge/Powered%20By-Sendexa-blue?style=for-the-badge&logo=data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjQiIGhlaWdodD0iMjQiIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHBhdGggZD0iTTEyIDIyQzE3LjUyMiA22MCAyMiAxNy41MjIyIDIyIDEyQzIyIDYuNDc3MTUgMTcuNTIyMiAyIDEyIDJDNi40NzcxNSAyIDIgNi40Nzc15IDIgMTJDMiAxNy41MjIyIDYuNDc3MTUgMjIgMTIgMjJaIiBmaWxsPSIjMDA2NkZGIi8+CjxwYXRoIGQ9Ik0xMi41IDExLjVDMTIuNSAxMi4wNTIyNyAxMi4wNTIyNyAxMi41IDExLjUgMTIuNUMxMC45NDc3MyAxMi41IDEwLjUgMTIuMDUyMjcgMTAuNSAxMS41QzEwLjUgMTAuOTQ3NzMgMTAuOTQ3NzMgMTAuNSAxMS41IDEwLjVDMTIuMDUyMjcgMTAuNSAxMi41IDEwLjk0NzczIDEyLjUgMTEuNVoiIGZpbGw9IndoaXRlIi8+CjxwYXRoIGQ9Ik0xNi41IDExLjVDMTYuNSAxMi4wNTIyNyAxNi4wNTIyNyAxMi41IDE1LjUgMTIuNUwxMS41IDEyLjVDMTAuOTQ3NzMgMTIuNSAxMC41IDEyLjA1MjI3IDEwLjUgMTEuNUwxMC41IDcuNUMxMC41IDYuOTQ3NzI3IDEwLjk0NzczIDYuNSAxMS41IDYuNUwxNS41IDYuNUMxNi4wNTIyNyA2LjUgMTYuNSA2Ljk0NzcyNyAxNi41IDcuNUwxNi41IDExLjVaIiBmaWxsPSJ3aGl0ZSIvPgo8L3N2Zz4K)](https://sendexa.co)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg?style=for-the-badge)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Bun](https://img.shields.io/badge/Bun-000000?style=for-the-badge&logo=bun&logoColor=white)](https://bun.sh/)
[![Prisma](https://img.shields.io/badge/Prisma-2D3748?style=for-the-badge&logo=prisma&logoColor=white)](https://www.prisma.io/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-316192?style=for-the-badge&logo=postgresql&logoColor=white)](https://www.postgresql.org/)

## 🚀 Africa-First Communication API Platform

Cendika is an **open-source, production-ready communication API platform** built following [Sendexa](https://sendexa.co) documentation and standards. Designed with Africa in mind, it provides unified APIs for SMS, Voice, Email, WhatsApp, Push Notifications, and Phone Lookup services with African-specific optimizations.

### ✨ Features

#### 📱 **Multi-Channel Communication**
- **SMS API** with African provider routing (MTN, Vodacom, Orange, Telecel, etc.)
- **Voice API** with IVR support for African phone systems
- **Email API** with African SMTP optimizations
- **WhatsApp Business API** integration
- **Push Notifications** for web and mobile
- **Two-way SMS** for customer engagement

#### 🌍 **Africa-First Features**
- **Phone Lookup Service** - Carrier detection, MNP (Mobile Number Portability), validation
- **Local Pricing** - Country-specific pricing for 54 African nations
- **Network Routing** - Intelligent routing to best local providers
- **African SMS Optimizations** - Character encoding, delivery optimization
- **Local Payment Integration** - Paystack, Flutterwave, mobile money support

#### 🔧 **Developer Experience**
- **Unified API** - Single endpoint for all communication channels
- **TypeScript First** - Full type safety from database to API responses
- **OpenAPI/Swagger** - Auto-generated API documentation
- **Webhook Support** - Real-time delivery reports and events
- **Rate Limiting** - Per-API key and per-service rate limits
- **Bulk Operations** - Send to millions with queue management

#### 💼 **Business Features**
- **Multi-tenant Architecture** - Support for personal and business accounts
- **Team Collaboration** - Role-based access control
- **Usage Analytics** - Real-time dashboards and reports
- **Credit System** - Flexible prepaid billing
- **Invoice Generation** - Automated billing with PDF generation
- **Audit Logs** - Complete audit trail for compliance

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────┐
│                 API Gateway (Hono)                  │
├─────────────────────────────────────────────────────┤
│    Authentication  │  Rate Limiting  │  Validation  │
├─────────────────────────────────────────────────────┤
│              Service Layer (Modules)                │
│  ┌─────┐  ┌─────┐  ┌─────┐  ┌─────┐  ┌─────┐        │
│  │ SMS │  │Voice│  │Email│  │Push │  │Whats│        │
│  └─────┘  └─────┘  └─────┘  └─────┘  └─────┘        │
├─────────────────────────────────────────────────────┤
│            Provider Layer (Africa-First)            │
│  ┌─────────┐  ┌─────────┐  ┌──────────────┐         │
│  │African  │  │Payment  │  │Local SMTP    │         │
│  │SMS      │  │Gateways │  │Services      │         │
│  └─────────┘  └─────────┘  └──────────────┘         │
├─────────────────────────────────────────────────────┤
│              Data Layer (Prisma/PostgreSQL)         │
└─────────────────────────────────────────────────────┘
```

## 🚀 Quick Start

### Prerequisites

- **Bun** (v1.0.0 or higher) - [Installation Guide](https://bun.sh/docs/installation)
- **PostgreSQL** (v14 or higher)
- **Redis** (v7 or higher) - For caching and queues
- **Docker** (optional) - For containerized deployment

### Installation

```bash
# Clone the repository
git clone https://github.com/CollinsVidzro/cendika.git
cd cendika

# Install dependencies
bun install

# Set up environment variables
cp .env.example .env
# Edit .env with your configuration

# Set up Africa-specific configuration
cp .env.example .env.africa
# Edit .env.africa with African providers

# Set up database
bun run db:generate
bun run db:migrate
bun run db:seed

# Start development server
bun run dev
```

### Docker Deployment

```bash
# Start all services
docker-compose up -d

# View logs
docker-compose logs -f

# Run database migrations
docker-compose exec api bun run db:migrate

# Seed African data
docker-compose exec api bun run db:seed
```

## 📚 API Documentation

Once running, access the interactive API documentation:

- **Swagger UI**: `http://localhost:3000/docs`
- **ReDoc**: `http://localhost:3000/redoc`
- **API Health**: `http://localhost:3000/api/v1/health`

### Authentication

Cendika uses API key authentication:

```bash
# Generate an API key
curl -X POST http://localhost:3000/api/v1/auth/api-keys \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Production Key",
    "permissions": ["sms:send", "sms:read"]
  }'

# Use the API key
curl -X GET http://localhost:3000/api/v1/sms \
  -H "X-API-Key: sk_live_..."
```

### Send Your First SMS

```bash
curl -X POST http://localhost:3000/api/v1/sms/send \
  -H "X-API-Key: sk_live_..." \
  -H "Content-Type: application/json" \
  -d '{
    "to": "+233501234567",
    "content": "Welcome to Cendika! Your verification code is 123456",
    "senderId": "Cendika"
  }'
```

### Lookup Phone Number (Africa-Specific)

```bash
curl -X GET "http://localhost:3000/api/v1/lookup/number/+233501234567" \
  -H "X-API-Key: sk_live_..."
```

## 🏗️ Project Structure

```
src/
├── app/                    # Application setup and routing
├── modules/               # Feature modules
│   ├── auth/             # API key authentication
│   ├── sms/              # SMS service with African routing
│   ├── voice/            # Voice calls and IVR
│   ├── email/            # Email service (self-built)
│   ├── lookup/           # Africa phone lookup
│   ├── verify/           # OTP and verification
│   ├── push/             # Push notifications
│   ├── whatsapp/         # WhatsApp integration
│   └── billing/          # Africa-focused billing
├── core/                 # Core infrastructure
│   ├── config/           # Configuration management
│   ├── providers/        # External provider integrations
│   ├── services/         # Self-built core services
│   ├── utils/            # Utilities and helpers
│   └── constants/        # Constants and enums
├── templates/            # Email and SMS templates
└── webhooks/             # Webhook handlers
```

## 🌍 Africa Coverage

Cendika supports all 54 African countries with:

### SMS Coverage
- **West Africa**: Ghana, Nigeria, Ivory Coast, Senegal
- **East Africa**: Kenya, Tanzania, Uganda, Rwanda
- **Southern Africa**: South Africa, Zambia, Zimbabwe
- **North Africa**: Egypt, Morocco, Algeria, Tunisia

### Network Support
- **MTN Group**: Ghana, Nigeria, Rwanda, Uganda, Zambia
- **Vodacom Group**: South Africa, Tanzania, DRC, Mozambique
- **Orange Group**: Ivory Coast, Senegal, Cameroon, Mali
- **Airtel Africa**: Kenya, Nigeria, Tanzania, Uganda
- **Telecel Group**: Ghana, Burkina Faso, Niger

### Pricing
Country-specific pricing in local currencies (GHS, NGN, KES, ZAR, etc.) with volume discounts.

## 🔌 Integrations

### SMS Providers
- Telecel
- MTN
- Vodacom
- Orange


### Payment Gateways
- Paystack (Nigeria, Ghana, Kenya, South Africa)
- Flutterwave (across Africa)
- Stripe (international)
- Mobile Money (M-Pesa, MTN MoMo, Airtel Money)

### Storage
- Amazon S3
- Local file system
- DigitalOcean Spaces

### Queue & Cache
- Redis (Bull queues)
- In-memory cache (development)

## 🧪 Testing

```bash
# Run all tests
bun test

# Run unit tests
bun test:unit

# Run integration tests
bun test:integration

# Run e2e tests
bun test:e2e

# Run tests with coverage
bun test --coverage
```

## 📈 Monitoring & Observability

- **Health checks**: `/api/v1/health`
- **Metrics**: Prometheus metrics at `/metrics`
- **Logging**: Structured JSON logging
- **Tracing**: Distributed tracing support
- **Alerting**: Webhook-based alerting

## 🔐 Security

- **API Key Authentication** with prefix/secret
- **Rate Limiting** per API key and IP
- **Input Validation** with Zod schemas
- **SQL Injection Protection** via Prisma
- **CORS Configuration** for web clients
- **HTTPS Enforcement** in production
- **Audit Logging** for all operations

## 📊 Performance

- **Horizontal Scaling** - Stateless API servers
- **Database Connection Pooling**
- **Redis Caching** for frequent queries
- **Background Job Processing** with Bull
- **CDN Integration** for static assets
- **Load Balancing** ready

## 🚢 Deployment

### Environment Variables

| Variable | Required | Description | Example |
|----------|----------|-------------|---------|
| `DATABASE_URL` | Yes | PostgreSQL connection URL | `postgresql://user:pass@localhost:5432/cendika` |
| `REDIS_URL` | Yes | Redis connection URL | `redis://localhost:6379` |
| `PORT` | No | API server port | `3000` |
| `NODE_ENV` | No | Environment | `production` |
| `LOG_LEVEL` | No | Logging level | `info` |
| `API_RATE_LIMIT_WINDOW` | No | Rate limit window (ms) | `60000` |
| `API_RATE_LIMIT_MAX` | No | Max requests per window | `100` |
| `JWT_SECRET` | Yes | JWT signing secret | `your-secret-key` |

### Production Deployment

```bash
# Build the application
bun run build

# Start in production mode
NODE_ENV=production bun start

# Or using PM2
pm2 start dist/index.js --name cendika-api
```

## 🤝 Contributing

We welcome contributions! Please see our [Contributing Guide](CONTRIBUTING.md) for details.

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Commit your changes: `git commit -m 'Add amazing feature'`
4. Push to the branch: `git push origin feature/amazing-feature`
5. Open a Pull Request

### Development Workflow

```bash
# Install dependencies
bun install

# Generate Prisma client
bun run db:generate

# Run database migrations
bun run db:migrate

# Start development server with hot reload
bun run dev

# Run linter
bun run lint

# Format code
bun run format

# Run type checking
bun run typecheck
```

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- **Sendexa** - For the API specifications and inspiration
- **Bun** - For the incredible JavaScript runtime
- **Prisma** - For the amazing database toolkit
- **All Contributors** - Who help make this project better

## 📞 Support

- **Documentation**: [docs.cendika.dev](https://docs.sendexa.co)
- **Issues**: [GitHub Issues](https://github.com/CollinsVidzro/cendika/issues)
- **Discussions**: [GitHub Discussions](https://github.com/CollinsVidzro/cendika/discussions)
- **Email**: cendika@sendexa.co

## 🚧 Roadmap

See our [ROADMAP.md](ROADMAP.md) for upcoming features and improvements.

---

**Built with ❤️ for Africa by the open-source community**

[![Star on GitHub](https://img.shields.io/github/stars/CollinsVidzro/cendika.svg?style=social)](https://github.com/CollinsVidzro/cendika)
[![Twitter Follow](https://img.shields.io/twitter/follow/cendika_api.svg?style=social)](https://twitter.com/cendika_api)