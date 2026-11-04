# ZeroCraft Studio — Full Product & Engineering Plan

> Product plan for `apps/studio`: a digital agency operating system for ZeroCraft teams, clients, content, media, projects and growth.

## 1. Product vision

ZeroCraft Studio is the private operating system behind the public ZeroCraft agency website.

It should connect the complete agency workflow:

```text
Public website inquiry
  → lead qualification
  → proposal
  → project planning
  → production and review
  → client approval
  → launch and publishing
  → reporting and retention
```

The product should feel like a focused creative workspace rather than a generic business dashboard. The visual direction is a dark, cinematic, translucent canvas inspired by the reference images: narrow icon rail, compact command header, asset tray, node-like work surface, floating glass panels, and a live preview inspector.

## 2. Current project baseline

### Existing application

- App: [`apps/studio`](../apps/studio)
- Main shell: [`apps/studio/app/studio/layout.tsx`](../apps/studio/app/studio/layout.tsx)
- Overview dashboard: [`apps/studio/app/studio/page.tsx`](../apps/studio/app/studio/page.tsx)
- Tailwind entry: [`apps/studio/app/studio/tailwind.css`](../apps/studio/app/studio/tailwind.css)
- Shared UI package: [`packages/ui`](../packages/ui)
- Studio data access: [`apps/studio/lib/studio-dashboard.ts`](../apps/studio/lib/studio-dashboard.ts)
- Supabase client: [`apps/studio/lib/supabase.ts`](../apps/studio/lib/supabase.ts)
- Demo seed: [`packages/supabase/supabase/studio-os-demo-seed.sql`](../packages/supabase/supabase/studio-os-demo-seed.sql)

### Current routes

```text
/studio
/studio/projects
/studio/inquiries
/studio/media
/studio/content
/studio/analytics
/studio/settings
```

### Current implementation direction

- Next.js App Router
- TypeScript
- Tailwind CSS
- Shared shadcn-style components from `packages/ui`
- Supabase-backed data with demo fallback
- Server-rendered dashboard data where possible
- Dark semantic theme tokens
- No Studio-specific custom stylesheet

## 3. Product areas

### 3.1 Workspace overview

The overview should answer three questions immediately:

1. What needs attention today?
2. What is moving across the agency?
3. What is the health of the business and delivery pipeline?

Core elements:

- Pipeline value
- Active projects
- Open opportunities
- Media published
- Today focus
- Opportunity pipeline
- Project delivery table
- Recent activity
- Workspace health
- Alerts and overdue work

### 3.2 CRM and pipeline

Purpose: convert website inquiries into qualified agency work.

Features:

- Inquiry inbox
- Lead detail view
- Contact and company records
- Service interest
- Budget range
- Timeline
- Source attribution
- Notes and internal mentions
- Follow-up reminders
- Proposal status
- Owner assignment
- Lead activity timeline
- Email reply shortcut
- Convert lead to project

Lead stages:

```text
New → Contacted → Qualified → Proposal → Negotiation → Won
                                                    ↘ Lost
```

### 3.3 Projects and delivery

Purpose: manage active client work from kickoff to launch.

Features:

- Project overview
- Client and team assignment
- Budget and estimated margin
- Start and deadline dates
- Milestones
- Tasks
- Deliverables
- Internal notes
- Client-facing notes
- File attachments
- Approval requests
- Project activity
- Health indicators
- Timeline and board views

Project statuses:

```text
Planning
Discovery
Strategy
Design
Development
Review
Launch
Completed
Archived
```

Project health:

- On track
- At risk
- Blocked
- Needs client input
- Over budget
- Overdue

### 3.4 Media library

Purpose: provide one trusted source for agency assets.

Features:

- Image, video, audio, SVG and document uploads
- Folder hierarchy
- Search and filters
- File type filters
- Project/client association
- Tags
- Alt text
- Copyright/license metadata
- File preview
- Version replacement
- Usage tracking
- Download links
- Archive and restore
- Storage usage dashboard

Reference-inspired experience:

- Asset tray on the left
- Dark canvas for creative flows
- Preview inspector on the right
- Asset cards with thumbnail/type/status
- Publish and export actions

### 3.5 Content Studio

Purpose: manage public-facing content and campaign publishing.

Content types:

- Blog post
- Case study
- Service page
- Project page
- Announcement
- Social post
- Email campaign

Features:

- Rich text or block editor
- Draft/review/publish flow
- Content versions
- Scheduled publishing
- SEO title and description
- Open Graph image
- Slug management
- Author assignment
- Category and tags
- Preview mode
- Revision history
- Publishing channels

Content statuses:

```text
Draft → In review → Approved → Scheduled → Published
                                      ↘ Archived
```

### 3.6 Analytics

Business metrics:

- Website visitors
- Qualified leads
- Lead conversion rate
- Proposal win rate
- Average response time
- Pipeline value
- Project revenue
- Project margin
- Client retention
- Content performance
- Media downloads

Technical metrics:

- Page views
- Contact form starts
- Contact form completions
- Case study views
- Service page views
- Calendar clicks
- Asset downloads
- Content publishing events
- API errors
- Function duration
- Storage usage

### 3.7 Team and workspace

Features:

- Team member directory
- Invites
- Roles and permissions
- Availability
- Workload
- Project assignments
- Notification preferences
- Workspace profile
- Brand settings
- Currency and timezone
- Integrations
- Audit log

## 4. Roles and permissions

Use workspace membership rather than a single global user role.

| Role | Workspace | CRM | Projects | Media | Content | Analytics | Settings |
|---|---:|---:|---:|---:|---:|---:|---:|
| Owner | Full | Full | Full | Full | Full | Full | Full |
| Admin | Full | Full | Full | Full | Full | Full | Limited |
| Creative lead | Read/write | Read/write | Full | Full | Full | Read | No |
| Project manager | Read/write | Read/write | Full | Read/write | Read | Read | No |
| Designer | Read | Read | Assigned | Full | Assigned | No | No |
| Developer | Read | Read | Assigned | Read/write | Read | No | No |
| Marketing | Read | Read/write | Read | Read/write | Full | Full | No |
| Finance | Read | Read | Read | No | No | Full | Billing |
| Client | Limited | Own record | Own projects | Own files | Own approvals | Limited | No |
| Viewer | Read | Read | Read | Read | Read | Read | No |

Authorization must be checked in server actions and data access functions, not only hidden in the UI.

## 5. Database design

Every workspace-owned table should contain:

```sql
workspace_id uuid not null
created_by uuid
created_at timestamptz not null default now()
updated_at timestamptz not null default now()
```

### Identity and workspace

```text
profiles
workspaces
workspace_members
workspace_roles
workspace_invitations
```

### CRM

```text
clients
contacts
leads
lead_notes
lead_activities
proposals
```

### Delivery

```text
projects
project_members
project_tasks
project_milestones
project_deliverables
project_comments
project_approvals
```

### Media

```text
media_folders
media_assets
media_tags
media_asset_tags
media_versions
media_usage
```

### Content

```text
content_items
content_versions
content_categories
content_tags
content_item_tags
publishing_channels
scheduled_publications
```

### Operations

```text
activities
notifications
calendar_events
invoices
payments
audit_logs
```

### Analytics

```text
analytics_events
campaigns
campaign_metrics
```

### Required indexes

Add indexes for:

- `workspace_id`
- `status`
- `created_at`
- `updated_at`
- `client_id`
- `project_id`
- `assigned_to`
- `slug`
- `published_at`

## 6. Supabase architecture

### Auth

- Email/password
- Magic link
- Google OAuth
- Email verification
- Password reset
- Optional MFA
- Invite acceptance
- Session refresh
- Account deactivation

### RLS

Every exposed table must:

1. Enable RLS.
2. Grant only required privileges.
3. Have explicit select, insert, update and delete policies.
4. Restrict access by `workspace_id` membership.
5. Include role checks for sensitive operations.
6. Have database tests for allow and deny cases.

Recommended membership helper:

```sql
exists (
  select 1
  from public.workspace_members member
  where member.workspace_id = target.workspace_id
    and member.user_id = auth.uid()
    and member.status = 'active'
)
```

Do not rely on user-editable metadata for authorization.

### Storage buckets

```text
studio-assets-private
studio-project-files-private
studio-content-media
studio-public-assets
studio-avatars
```

Private asset paths should include the workspace and project scope:

```text
{workspace_id}/{project_id}/{asset_id}/{filename}
```

Storage policies must protect upload, read, update and delete independently.

### Realtime

Use private Realtime channels for:

- Project comments
- Approval updates
- Notifications
- Presence in a project
- Lead assignment changes

Avoid sending sensitive workspace data over public channels.

## 7. UI/UX system

### Visual direction

- Dark cinematic workspace
- Near-black background
- Neutral white typography
- Warm orange/red creative accent
- Small green success states
- Translucent cards
- Thin white borders
- Backdrop blur
- Soft shadows
- 16–24px radius
- Compact command header
- Narrow icon rail
- High information density without visual noise

### Shared components

Use components from [`packages/ui`](../packages/ui) wherever possible:

- Button
- Card
- Badge
- Avatar
- Tabs
- Table
- Dialog
- Sheet
- Dropdown menu
- Command
- Input
- Textarea
- Select
- Calendar
- Tooltip
- Toast
- Alert dialog
- Progress
- Skeleton
- Empty state

### Required states

Every feature screen must support:

- Loading
- Empty
- Error
- Permission denied
- Success toast
- Optimistic update where safe
- Undo for destructive actions
- Mobile layout
- Keyboard navigation
- Screen reader labels

### Keyboard shortcuts

```text
⌘/Ctrl + K  Search workspace
⌘/Ctrl + N  Create item
G then D    Overview
G then P    Projects
G then L    Pipeline
G then M    Media
G then C    Content
```

## 8. Application architecture

Recommended request flow:

```text
Server component / client form
  → server action or route handler
  → validation schema
  → authorization check
  → data access function
  → Supabase
  → typed DTO
  → UI response
```

Recommended folders:

```text
apps/studio/
  app/
    studio/
      page.tsx
      projects/
      inquiries/
      media/
      content/
      analytics/
      settings/
    api/
  components/
    hooks/
  lib/
    auth/
    permissions/
    queries/
    actions/
    validation/
    supabase/
  types/
```

Avoid placing authorization decisions directly inside presentational components.

## 9. Public website integration

The public site should write into the Studio system through a controlled inquiry action.

Public form flow:

```text
Visitor submits form
  → validate with Zod
  → rate limit and spam check
  → store inquiry
  → create activity
  → notify assigned team
  → show success state
```

Required fields:

- Name
- Email
- Company
- Service interest
- Budget range
- Timeline
- Project description
- Referral source
- Consent

## 10. Implementation phases

### Phase 0 — Product and technical foundation

Duration: 1 week

- Confirm route map
- Confirm roles
- Confirm database ownership model
- Finalize semantic design tokens
- Define loading/error states
- Create migration naming convention
- Create validation conventions
- Add shared Studio layout primitives

### Phase 1 — Studio shell and navigation

Duration: 1 week

- Dark reference-inspired shell
- Icon rail
- Command header
- Search trigger
- Workspace switcher
- Responsive navigation
- Breadcrumb state
- Notification affordance
- Preview inspector pattern

### Phase 2 — CRM and pipeline

Duration: 2 weeks

- Leads table
- Lead detail
- Stage movement
- Assignment
- Notes
- Follow-up reminders
- Email action
- Lead-to-project conversion
- Audit activity

### Phase 3 — Projects and delivery

Duration: 2–3 weeks

- Project list
- Project detail
- Milestones
- Tasks
- Deliverables
- Review and approval flow
- Comments
- File attachments
- Timeline and health status

### Phase 4 — Media and content

Duration: 2–3 weeks

- Media upload
- Storage policies
- Folder and tag system
- Asset preview
- Version management
- Content editor
- SEO fields
- Preview mode
- Publish scheduling

### Phase 5 — Analytics and reporting

Duration: 1–2 weeks

- Event tracking
- Lead funnel
- Campaign reporting
- Project performance
- Content performance
- Workspace health
- Exportable reports

### Phase 6 — Client portal

Duration: 2–3 weeks

- Client login
- Client project dashboard
- Deliverable approval
- Change requests
- Files
- Comments
- Meeting notes
- Client notifications

### Phase 7 — Production hardening

Duration: 1–2 weeks

- RLS test suite
- Accessibility audit
- Mobile QA
- Performance audit
- Error tracking
- Backup verification
- Security review
- Staging acceptance
- Production release

## 11. MVP scope

### Include in MVP

- Auth and workspace membership
- Studio shell
- Overview dashboard
- Lead pipeline
- Project list and detail
- Media library
- Basic content management
- Team roles
- Notifications
- Audit log
- Supabase RLS
- Demo seed data

### Defer until post-MVP

- Full accounting
- Native chat
- Advanced invoicing
- AI content generation
- Multi-currency billing
- Complex automation builder
- Native mobile application
- Multi-region data residency

## 12. Testing plan

### Unit tests

- Status transitions
- Permission helpers
- Money and budget formatting
- Slug generation
- Validation schemas
- Analytics event normalization

### Integration tests

- Authenticated workspace access
- Lead creation
- Lead stage movement
- Project creation
- Asset metadata update
- Content publishing
- Notification creation

### Database tests

- Anonymous users denied
- Cross-workspace reads denied
- Cross-workspace writes denied
- Role restrictions enforced
- Storage path restrictions enforced
- Admin actions audited

### Browser tests

- Login flow
- Create inquiry
- Convert inquiry to project
- Upload media
- Publish content
- Approve deliverable
- Responsive navigation
- Keyboard command palette

## 13. Performance and accessibility

Performance targets:

- Fast first render for Studio shell
- Server-rendered initial data
- No unnecessary client-side data fetching
- Lazy-load preview media
- Responsive image sizes
- Paginated tables
- Virtualized asset grids for large libraries
- Optimistic updates only for safe mutations

Accessibility targets:

- WCAG 2.2 AA intent
- Visible focus styles
- Keyboard-complete workflows
- Descriptive icon labels
- Correct table semantics
- Modal focus trapping
- Color-independent status indicators
- Reduced motion support
- Accessible upload feedback

## 14. Observability and operations

Track:

- Request errors
- Server action failures
- Supabase query errors
- Storage failures
- Auth failures
- Permission denials
- Upload failures
- Publishing failures
- Slow route rendering
- Webhook retries

Operational requirements:

- Separate local, preview and production environments
- Environment variable validation
- Database migration review
- Daily backups
- Error alerting
- Audit log retention
- Incident runbook
- Rollback procedure

## 15. Definition of done

A Studio feature is complete when:

- The route has loading, empty, error and success states.
- It uses shared UI components.
- It has server-side authorization.
- It has validated input.
- It has RLS coverage.
- It has audit activity where appropriate.
- It works on mobile.
- It supports keyboard navigation.
- It has realistic demo data.
- It has focused browser coverage.
- It has no unhandled console errors.
- It passes typecheck and production build.

## 16. Immediate next tasks

1. Extract reusable Studio glass primitives from the current shell.
2. Add route-aware active navigation to the icon rail.
3. Finish Content Studio using the same dark canvas pattern.
4. Finish Analytics with real Supabase event queries.
5. Add workspace-aware RLS tests.
6. Connect public inquiry submission to `studio_leads`.
7. Replace demo-only metrics with typed query results and empty states.
8. Add project detail and deliverable approval routes.
9. Add media upload to private Supabase Storage.
10. Add end-to-end smoke tests for the lead-to-project workflow.

## 17. Release checklist

### Product

- [ ] Core public pages complete
- [ ] Studio routes complete
- [ ] Roles approved
- [ ] Demo data reviewed
- [ ] Empty states reviewed

### Security

- [ ] RLS enabled on every exposed table
- [ ] RLS allow/deny tests passing
- [ ] Storage policies passing
- [ ] Service role never exposed to browser
- [ ] Auth redirects verified
- [ ] Rate limiting enabled
- [ ] Audit logs enabled

### Quality

- [ ] Typecheck passing
- [ ] Production build passing
- [ ] Browser smoke tests passing
- [ ] Mobile QA complete
- [ ] Accessibility review complete
- [ ] No critical console errors

### Operations

- [ ] Production environment configured
- [ ] Database migrations applied
- [ ] Seed data separated from production data
- [ ] Backups verified
- [ ] Monitoring configured
- [ ] Rollback plan documented

## 18. Product outcome

The finished ZeroCraft Studio should make the agency feel operationally unified:

```text
Every inquiry has an owner.
Every project has a clear next step.
Every asset has a home.
Every approval is traceable.
Every published result is measurable.
```

The priority is not adding the maximum number of features. The priority is creating one secure, fast and visually coherent workflow from first contact to finished work.
