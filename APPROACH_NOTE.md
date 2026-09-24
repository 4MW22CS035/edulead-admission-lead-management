# Approach Note — Assignment 5: Admission Lead Management

## 1. Problem understanding
The institution receives admission leads from multiple channels and needs one place to manage the complete lifecycle from first contact to follow-up and conversion. The prototype therefore focuses on visibility, ownership, follow-up discipline and conversion reporting.

## 2. Users
### Manager
- View all leads
- Assign/reassign counsellors
- Filter by counsellor
- Create/update/delete leads
- View pipeline and source insights

### Counsellor
- View assigned leads
- Create leads assigned to self
- Update lead details
- Add follow-up actions
- Track ageing and next actions

## 3. Lead lifecycle
New → Contacted → Follow-up → Qualified → Converted / Lost

The system does not delete converted/lost records automatically because historical outcomes are useful for reporting.

## 4. Main screens
1. Login
2. Dashboard KPI cards
3. Status pipeline insight
4. Lead-source insight
5. Lead list with search and filters
6. Add/Edit Lead modal
7. Follow-up modal

## 5. Data model
### users
id, name, email, password_hash, role

### leads
id, name, phone, email, course, source, status, priority, counsellor_id, notes, created_at, updated_at

### followups
id, lead_id, due_date, note, outcome, created_at

## 6. Engineering decisions
- REST API keeps frontend and backend separated.
- SQLite reduces setup friction for an assessment prototype.
- Server-side role checks prevent a browser user from bypassing permissions.
- Phone number is unique to reduce duplicate lead creation.
- Follow-ups are stored as separate records so a lead can have a history of actions.
- Dashboard metrics are calculated from database records rather than duplicated counters.

## 7. Validation and edge cases
- Required name, phone and course
- 10-digit phone validation
- Email format validation
- Allowed values for source/status/priority
- Duplicate phone detection
- Invalid counsellor detection
- Counsellor can only access assigned leads
- Manager-only delete operation
- Overdue follow-up count
- Unassigned leads are visible to managers
- Converted and lost leads remain in history

## 8. Future production improvements
- PostgreSQL/MySQL and migrations
- SSO/RBAC integration
- WhatsApp and website lead ingestion
- Automated reminders via email/WhatsApp
- Audit trail for every field change
- SLA rules and escalation
- Advanced funnel analytics and counsellor performance reporting
- Pagination, rate limiting, structured logging and monitoring
