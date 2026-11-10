# College CareerConnect Portal

Node.js / Express / EJS / PostgreSQL starter application based on the MVC style of the supplied Student Grievance Management System (Express routes, controllers, middleware, database module, server-rendered EJS views).

## Requirements
- Node.js 18+
- PostgreSQL 14+
- npm

## Setup
1. Create a database: `createdb college_career_portal`
2. Copy `.env.example` to `.env` and set `DATABASE_URL` and a strong `SESSION_SECRET`.
3. Install packages: `npm install`
4. Create tables: `psql "$DATABASE_URL" -f database/schema.sql`
5. Seed categories and an initial organization: `psql "$DATABASE_URL" -f database/seed.sql`
6. Start: `npm run dev`
7. Open http://localhost:3000

## First administrator
For security, no hard-coded admin password is seeded. Create a password hash using:
`node -e "console.log(require('bcryptjs').hashSync('ChangeMe123!',12))"`
Then insert a user:
`INSERT INTO users(full_name,email,password_hash,role) VALUES ('Portal Admin','admin@college.edu','PASTE_HASH_HERE','admin');`
Change the password immediately for real deployments.

## Notes
- Student sign-up and login use bcrypt hashes and PostgreSQL-backed sessions.
- Opportunity and application queries use parameterized SQL.
- Student application uniqueness is enforced by a database constraint.
- Resume uploads are PDF-only and limited to 5 MB. Ensure `public/uploads/resumes` exists and is writable.
- Do not deploy with the example session secret. Configure HTTPS and production database TLS.
- The project includes core portal workflows; optional advanced features such as employer self-service, email-based password recovery, complete CRUD screens for all admin resources, CSRF integration, and automated reminder jobs require additional implementation/configuration before production use.
