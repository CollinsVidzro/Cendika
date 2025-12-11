# **CONTRIBUTION.md**

```markdown
# Contributing to Cendika

Thank you for considering contributing to Cendika! We're building Africa's premier communication platform, and your help is invaluable.

## 🎯 Code of Conduct

Please read and follow our [Code of Conduct](CODE_OF_CONDUCT.md) to ensure a welcoming environment for everyone.

## License
By contributing to Cendika, you agree that your contributions will be licensed under its MIT License.

## 🚀 Quick Start for Contributors

### Prerequisites
- **Bun** (v1.0.0+)
- **PostgreSQL** (v14+)
- **Redis** (v7+)
- **Docker** (optional, for containerized development)

### Setting Up Development Environment

```bash
# 1. Fork and clone the repository
git clone https://github.com/YOUR_USERNAME/cendika.git
cd cendika

# 2. Set up git remote
git remote add upstream https://github.com/CollinsVidzro/cendika.git

# 3. Install dependencies
bun install

# 4. Set up environment
cp .env.example .env
cp .env.example .env.africa

# 5. Start development services
docker-compose up -d postgres redis
# OR manually start PostgreSQL and Redis

# 6. Run database setup
bun run db:generate
bun run db:migrate
bun run db:seed:basic  # Lightweight seed for development

# 7. Start development server
bun run dev
```

## 📋 Development Workflow

### Branch Naming Convention
```
feature/  - New features (feature/sms-routing)
bugfix/   - Bug fixes (bugfix/rate-limit-issue)
hotfix/   - Critical production fixes (hotfix/security-patch)
refactor/ - Code refactoring (refactor/auth-service)
docs/     - Documentation updates (docs/api-examples)
test/     - Test improvements (test/coverage-sms)
```

### Commit Guidelines
We follow [Conventional Commits](https://www.conventionalcommits.org/):

```
feat: add African SMS provider routing
fix: resolve rate limiting for high-volume accounts
docs: update API documentation for WhatsApp endpoints
test: add unit tests for OTP service
refactor: improve database query performance
chore: update dependencies
style: fix code formatting
perf: optimize message queuing
```

### Pull Request Process

1. **Create a Feature Branch**
   ```bash
   git checkout -b feature/your-feature-name
   ```

2. **Make Your Changes**
   - Write clear, commented code
   - Add tests for new functionality
   - Update documentation as needed

3. **Run Tests and Linting**
   ```bash
   bun run lint        # Check code style
   bun run format      # Format code
   bun run typecheck   # TypeScript checking
   bun test            # Run tests
   ```

4. **Commit Changes**
   ```bash
   git add .
   git commit -m "feat: add your feature description"
   ```

5. **Push and Create PR**
   ```bash
   git push origin feature/your-feature-name
   # Create PR on GitHub
   ```

### PR Review Checklist
- [ ] Code follows project style guidelines
- [ ] Tests are added/updated and pass
- [ ] Documentation is updated
- [ ] No breaking changes (unless discussed)
- [ ] Commit messages follow conventional commits
- [ ] Branch is up-to-date with main

## 🏗️ Project Architecture

### Module Structure
```
modules/
├── auth/          # Authentication & authorization
├── sms/           # SMS service with African routing
├── voice/         # Voice calls and IVR
├── email/         # Email service (self-built)
├── whatsapp/      # WhatsApp Business API
├── push/          # Push notifications
├── lookup/        # Africa phone number lookup
├── verify/        # OTP and verification
├── billing/       # Credit and payment systems
└── chat/          # Live chat and two-way SMS
```

### Adding a New African SMS Provider

1. **Create Provider File**
   ```typescript
   // src/core/providers/sms/new-provider.provider.ts
   export class NewProvider extends BaseSmsProvider {
     async sendSms(message: SmsMessage): Promise<ProviderResponse> {
       // Implementation
     }
   }
   ```

2. **Add to Provider Registry**
   ```typescript
   // src/core/providers/sms/index.ts
   export const smsProviders = {
     // ... existing providers
     'new-provider': NewProvider,
   };
   ```

3. **Add Configuration**
   ```typescript
   // src/core/config/providers.ts
   export const smsProviderConfigs = {
     'new-provider': {
       apiKey: env.NEW_PROVIDER_API_KEY,
       // ... other config
     },
   };
   ```

4. **Add Tests**
   ```typescript
   // tests/unit/providers/sms/new-provider.test.ts
   describe('NewProvider', () => {
     it('should send SMS successfully', async () => {
       // Test implementation
     });
   });
   ```

## 🧪 Testing

### Test Structure
```
tests/
├── unit/           # Unit tests
│   ├── modules/    # Module-specific tests
│   ├── core/       # Core service tests
│   └── utils/      # Utility function tests
├── integration/    # Integration tests
│   ├── api/        # API endpoint tests
│   └── providers/  # Provider integration tests
└── e2e/            # End-to-end tests
    ├── api-flow/   # API workflow tests
    └── billing/    # Billing flow tests
```

### Running Tests
```bash
# Run all tests
bun test

# Run specific test file
bun test tests/unit/modules/sms/sms.service.test.ts

# Run with coverage
bun test --coverage

# Watch mode
bun test --watch

# Run integration tests
bun test:integration

# Run e2e tests
bun test:e2e
```

## 📝 Documentation

### API Documentation
- Update OpenAPI/Swagger annotations in route handlers
- Add examples to `/docs/examples/`
- Update `docs/api/` markdown files

### README Updates
- Keep installation instructions current
- Add new features to feature list
- Update supported countries/providers

### African Coverage Documentation
When adding support for a new African country:

1. Update `docs/africa-coverage.md`
2. Add country data to `prisma/seeds/countries.seed.ts`
3. Add network data to `prisma/seeds/networks.seed.ts`
4. Add pricing data to `prisma/seeds/pricing.seed.ts`

## 🔧 Development Tools

### Useful Scripts
```bash
# Database
bun run db:generate     # Generate Prisma client
bun run db:migrate      # Run migrations
bun run db:seed         # Seed database
bun run db:reset        # Reset database

# Development
bun run dev             # Start dev server
bun run dev:docker      # Start with docker

# Quality
bun run lint            # ESLint
bun run format          # Prettier
bun run typecheck       # TypeScript check

# Build
bun run build           # Build for production
bun run start           # Start production
```

### Debugging
```bash
# Enable debug logging
DEBUG=cendika:* bun run dev

# Use Bun's debugger
bun --inspect run dev
```

## 🌍 Africa-Specific Contributions

We especially welcome contributions that improve our Africa coverage:

### Priority Areas
1. **New African SMS/Voice Providers**
2. **Country-specific optimizations**
3. **Local payment gateway integrations**
4. **Network routing improvements**
5. **Compliance with local regulations**

### Adding a New African Country
1. Research country's telecom regulations
2. Identify major mobile networks
3. Research SMS/voice pricing
4. Implement phone number validation
5. Add to test coverage

## 🐛 Reporting Bugs

### Bug Report Template
```markdown
## Description
[Clear description of the bug]

## Steps to Reproduce
1. [First Step]
2. [Second Step]
3. [And so on...]

## Expected Behavior
[What you expected to happen]

## Actual Behavior
[What actually happened]

## Environment
- OS: [e.g., Ubuntu 22.04]
- Bun Version: [e.g., 1.0.0]
- Database: [e.g., PostgreSQL 15]
- Commit Hash: [if applicable]

## Additional Context
[Screenshots, logs, etc.]
```

## 💡 Feature Requests

### Feature Request Template
```markdown
## Problem Statement
[What problem does this solve?]

## Proposed Solution
[How should it work?]

## Alternatives Considered
[Other ways to solve the problem]

## Additional Context
[Use cases, examples, etc.]
```

## 🏆 Good First Issues

Look for issues tagged with:
- `good-first-issue`
- `help-wanted`
- `documentation`
- `africa-coverage`

## 📞 Getting Help

- **Discussions**: [GitHub Discussions](https://github.com/CollinsVidzro/cendika/discussions)
- **Issues**: [GitHub Issues](https://github.com/CollinsVidzro/cendika/issues)
- **Email**: cendika@sendexa.co

## 🙏 Recognition

All contributors will be:
- Added to our contributors list
- Mentioned in release notes
- Eligible for contributor swag (for significant contributions)

---

Thank you for contributing to making African communication better! 💚
```
