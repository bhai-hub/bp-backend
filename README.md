# Brownie Points Backend API (bp-backend)

Enterprise Employee Recognition & Brownie Points Ledger Backend API.

## Technology Stack

- **Runtime:** Node.js (v22+)
- **Framework:** Express.js with TypeScript
- **Database:** PostgreSQL (v18+)
- **ORM:** Prisma ORM
- **Authentication:** JSON Web Tokens (JWT) & bcryptjs
- **Validation:** Zod schema validation
- **Documentation:** Swagger UI / OpenAPI 3.0
- **Security:** Helmet, CORS, centralized error handling
- **Testing:** Jest & Supertest (19 automated unit & integration tests)

---

## Architectural Principles

The backend is the authoritative source of truth:
```
Controller  →  Service  →  Repository  →  Prisma  →  PostgreSQL
```
- No business logic in controllers.
- No database queries in controllers.
- Authoritative wallet calculations and organization balance deductions.
- Atomic balance modifications paired with immutable transaction ledger entries.
- Strict multi-tenant isolation: HR managers and employees can never access or credit another organization's records.

---

## Setup & Installation

### 1. Prerequisites
- PostgreSQL running locally on port 5432 with database `brownie_points`.

### 2. Environment Variables
Copy `.env.example` to `.env`:
```bash
PORT=5000
DATABASE_URL="postgresql://postgres:1234@localhost:5432/brownie_points?schema=public"
JWT_SECRET="super-secure-enterprise-jwt-secret-key-bp-2026"
JWT_EXPIRES_IN="7d"
FRONTEND_URL="http://localhost:3000"
NODE_ENV="development"
```

### 3. Install Dependencies
```bash
npm install
```

### 4. Database Push & Seeding
```bash
# Push schema to PostgreSQL
npm run prisma:push

# Seed initial Super Admin, Organizations, HR Managers, Employees, Wallets, and BP Ledgers
npm run prisma:seed
```

### 5. Start Development Server
```bash
npm run dev
```
The API will start at: `http://localhost:5000/api/v1`

---

## Automated Testing

Run the test suite (covers Authentication, Role Authorization, Tenant Isolation, BP Purchases, and Controlled BP Credits):
```bash
npm test
```

---

## Interactive API Documentation

Interactive Swagger/OpenAPI documentation is available at:
`http://localhost:5000/api/docs`

### Pre-Configured Seed Demo Credentials

| Role | Email | Password | Organization |
| :--- | :--- | :--- | :--- |
| **Super Admin** | `superadmin@browniepoints.com` | `Admin@123456` | Global Platform |
| **HR Manager** | `hr@acme.com` | `Hr@123456` | Acme Technologies |
| **HR Manager** | `hr@globex.com` | `Hr@123456` | Globex Corporation |
| **Employee** | `alex.miller@acme.com` | `Employee@123` | Acme Technologies |
| **Employee** | `jane.cooper@acme.com` | `Employee@123` | Acme Technologies |
| **Employee** | `david.lee@globex.com` | `Employee@123` | Globex Corporation |
