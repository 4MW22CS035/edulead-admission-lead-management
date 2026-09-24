# Admission Lead Management System

A working prototype for Edumerge Solutions – Pre-Drive Product Engineering Assignment 5.

## Business problem addressed
Manage admission leads from first contact through follow-up and conversion, including source tracking, counsellor assignment, course preference, status, ageing, follow-up actions, manager visibility and reports/insights.

## Stack
- Backend: Node.js, Express.js, SQLite
- Frontend: React + Vite
- API: REST JSON
- Authentication: JWT

## Core features
- Login with Manager and Counsellor roles
- Create, view, update and delete admission leads
- Lead source tracking: Website, Walk-in, Phone, WhatsApp, Fair, Campaign, Other
- Course preference and contact details
- Counsellor assignment
- Lifecycle statuses: New, Contacted, Follow-up, Qualified, Converted, Lost
- Priority and notes
- Follow-up date and follow-up history
- Ageing calculation
- Dashboard KPIs and source/status insights
- Manager view of all leads; counsellor view of assigned leads
- Search and filters
- Validation and duplicate phone protection
- Seed data for demonstration

## Demo credentials
- Manager: `manager@demo.com` / `password123`
- Counsellor: `counsellor@demo.com` / `password123`

## Run
### Backend
```bash
cd backend
npm install
npm start
```
Backend runs on `http://localhost:5000`.

### Frontend
```bash
cd frontend
npm install
npm run dev
```
Open the URL shown by Vite, normally `http://localhost:5173`.

## Key API endpoints
- POST `/api/auth/login`
- GET `/api/dashboard`
- GET `/api/leads`
- POST `/api/leads`
- GET `/api/leads/:id`
- PUT `/api/leads/:id`
- DELETE `/api/leads/:id`
- POST `/api/leads/:id/followups`
- GET `/api/counsellors`

## Product assumptions
1. A lead has one primary course preference at a time.
2. Phone number is treated as the primary duplicate check.
3. Only managers can delete leads and assign leads to counsellors.
4. Converted and Lost leads remain in history rather than being deleted.
5. Ageing is calculated from the lead creation date until conversion/loss, otherwise until today.
6. A follow-up is considered overdue when its due date is before today and the lead is not Converted/Lost.

## Important edge cases handled
- Required fields and invalid phone/email input
- Duplicate phone numbers
- Invalid lead status/source/priority values
- Overdue follow-ups
- Reassigning a lead
- Updating a converted/lost lead back to an active state
- Missing counsellor assignment
- Unauthorized manager-only actions

## Architecture
React UI -> Express REST API -> SQLite database.
JWT identifies the logged-in role. The server, not the browser, enforces role permissions and validation.

## Trade-offs
SQLite keeps the prototype easy to run for assessment/demo purposes. For production at institutional scale, PostgreSQL/MySQL would be preferred with migrations, audit logs, background reminders, object storage, rate limiting and integration with WhatsApp/payment/CRM systems.

## AI usage
See `AI_USAGE_REPORT.md`.
