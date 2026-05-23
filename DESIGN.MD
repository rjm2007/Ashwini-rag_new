# Frontend Redesign — Cursor Implementation Guide

> Read this entire document before making any changes. This redesign touches every page and component. Work page by page, top to bottom.

---

## Design Direction

**Aesthetic:** Enterprise SaaS with depth — think Linear, Vercel, or Stripe Dashboard. Not playful, not flat, not generic Bootstrap. Clean dark sidebar, light content area, subtle shadows, precise spacing, purposeful color.

**What makes it memorable:** The review workflow visualization (clear status pipeline), the chat interface (evidence panel integrated inline, not as a separate box), and the confidence scoring displayed as a visual gauge — not just a number.

**Font stack:** `"DM Sans", sans-serif` for body, `"DM Mono", monospace` for code/IDs/status labels. Import from Google Fonts in `layout.tsx`.

**No icons library currently exists — add `lucide-react`** as a dependency. Every nav item, every action button, every status badge needs an icon.

---

## Color System

Replace all ad-hoc Tailwind colors with CSS variables in `globals.css`. This makes theming trivial later.

```css
:root {
  /* Surfaces */
  --bg-primary: #FAFBFC;
  --bg-secondary: #FFFFFF;
  --bg-sidebar: #0F1117;
  --bg-sidebar-hover: #1A1D28;
  --bg-sidebar-active: #252836;

  /* Text */
  --text-primary: #0F172A;
  --text-secondary: #475569;
  --text-muted: #94A3B8;
  --text-sidebar: #94A3B8;
  --text-sidebar-active: #FFFFFF;

  /* Brand accent — deep teal, not blue */
  --accent: #0D9488;
  --accent-light: #CCFBF1;
  --accent-hover: #0F766E;

  /* Status colors */
  --status-success: #16A34A;
  --status-success-bg: #F0FDF4;
  --status-warning: #D97706;
  --status-warning-bg: #FFFBEB;
  --status-error: #DC2626;
  --status-error-bg: #FEF2F2;
  --status-info: #2563EB;
  --status-info-bg: #EFF6FF;
  --status-pending: #8B5CF6;
  --status-pending-bg: #F5F3FF;

  /* Borders & shadows */
  --border: #E2E8F0;
  --border-strong: #CBD5E1;
  --shadow-sm: 0 1px 2px rgba(0,0,0,0.04);
  --shadow-md: 0 4px 12px rgba(0,0,0,0.06);
  --shadow-lg: 0 8px 24px rgba(0,0,0,0.08);

  /* Confidence gauge */
  --confidence-high: #16A34A;
  --confidence-medium: #D97706;
  --confidence-low: #DC2626;
}
```

---

## Package Changes

Add to `frontend/package.json` dependencies:

```json
"lucide-react": "^0.460.0"
```

Add Google Fonts link in `layout.tsx` `<head>`:
```html
<link rel="preconnect" href="https://fonts.googleapis.com" />
<link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=DM+Mono:wght@400;500&display=swap" rel="stylesheet" />
```

Update `globals.css` body:
```css
body {
  margin: 0;
  font-family: "DM Sans", sans-serif;
  background: var(--bg-primary);
  color: var(--text-primary);
  -webkit-font-smoothing: antialiased;
}
```

Update `tailwind.config.js` to extend fonts:
```js
theme: {
  extend: {
    fontFamily: {
      sans: ['"DM Sans"', 'sans-serif'],
      mono: ['"DM Mono"', 'monospace'],
    }
  }
}
```

---

## File-by-File Changes

---

### 1. `src/app/layout.tsx`

**Current:** Bare html/body wrapper.

**Change to:**
- Add Google Fonts preconnect links in head
- Add `<meta name="viewport" content="width=device-width, initial-scale=1" />`
- Add `<title>Warranty Intelligence Platform</title>`
- Body gets `className="font-sans antialiased"`

---

### 2. `src/app/globals.css`

**Current:** Minimal tailwind imports + basic body style.

**Change to:**
- Add the full `:root` CSS variable block from above
- Add utility classes:
  ```css
  .card {
    background: var(--bg-secondary);
    border: 1px solid var(--border);
    border-radius: 12px;
    box-shadow: var(--shadow-sm);
  }
  .card:hover {
    box-shadow: var(--shadow-md);
    border-color: var(--border-strong);
    transition: all 0.2s ease;
  }
  ```
- Add scrollbar styling for webkit (thin, subtle)
- Add smooth transition defaults on interactive elements

---

### 3. `src/app/page.tsx` (Login Page)

**Current:** Centered white box, plain inputs, no branding.

**Redesign:**
- Full-screen split layout: left 55% is a dark branded panel (`--bg-sidebar` color), right 45% is the login form
- Left panel contains:
  - A shield/lock icon from lucide-react (large, 48px, teal accent color)
  - Title: "Warranty Intelligence Platform" in white, `text-2xl font-bold`
  - Subtitle: "Governed AI-powered warranty document management" in `--text-sidebar` color, `text-sm`
  - Three feature bullets at the bottom (small, muted): "AI-Assisted Coverage Analysis", "Governed Document Repository", "Explainable Warranty Reasoning"
- Right panel:
  - "Sign in to your account" heading
  - Styled inputs with labels above them (not placeholder-only), border radius 8px, focus ring in accent color
  - "Sign in" button full-width, `bg-[var(--accent)]`, white text, rounded-lg, hover darkens
  - Below button: muted text "Demo credentials pre-filled for POC"
  - Error message as a red-bordered alert box, not just red text
- On mobile (< 768px): hide left panel, form goes full width

---

### 4. `src/components/Sidebar.tsx`

**Current:** White background, flat text links, no icons, no logo, no active state.

**Redesign — Dark sidebar:**
- Background: `bg-[#0F1117]`, width `w-64` (slightly wider than current `w-60`)
- Top section:
  - Small teal circle icon (or shield icon from lucide) + "Warranty AI" text in white, `text-sm font-bold`
  - Below: role badge — e.g. `ADMIN` in a small pill with `bg-[var(--accent)] text-white text-[10px] px-2 py-0.5 rounded-full uppercase tracking-wider font-mono`
- Navigation items:
  - Each item: icon (lucide) + label, `text-sm`, `text-[var(--text-sidebar)]`
  - Hover: `bg-[var(--bg-sidebar-hover)]` + text brightens
  - Active (current route — use `usePathname()` from next/navigation): `bg-[var(--bg-sidebar-active)]` + white text + left border accent bar (3px solid teal)
  - Icons: `LayoutDashboard`, `Upload`, `FileText`, `CheckSquare`, `MessageCircle` from lucide-react, size 18
- Divider line between nav groups (if needed)
- Bottom of sidebar: small muted text "v1.0 POC" and a logout button with `LogOut` icon

**Icon mapping:**
| Page | Icon from lucide-react |
|---|---|
| Dashboard | `LayoutDashboard` |
| Upload | `Upload` |
| Documents | `FileText` |
| Review | `ClipboardCheck` |
| Chat | `MessageCircle` |
| Logout | `LogOut` |

---

### 5. `src/components/Topbar.tsx`

**Current:** Simple flex row with email + logout button.

**Redesign:**
- Height: `h-16`, border-bottom
- Left side: breadcrumb showing current page name (derive from pathname)
- Right side:
  - User avatar circle (initials from user name, teal background, white text, 32x32)
  - User email in `text-sm text-[var(--text-secondary)]`
  - Logout is now in sidebar bottom (remove from topbar)
- Add a subtle bottom shadow (`var(--shadow-sm)`)

---

### 6. `src/app/(dashboard)/dashboard/page.tsx`

**Current:** Three stat cards + two breakdown sections. No charts, no visual weight.

**Redesign:**
- Page title: "Dashboard" with `text-xl font-semibold` + subtitle "Overview of your warranty platform" in muted text
- **Top row — 4 stat cards** (grid cols-4 on desktop, cols-2 on mobile):
  1. Total Documents — icon `FileText`, value large `text-3xl font-bold`, label small muted
  2. Certified — icon `ShieldCheck` in green, green accent number
  3. Pending Review — icon `Clock` in amber, amber accent number
  4. Avg Confidence — icon `Gauge`, show as percentage with color coding

  Each card: white bg, `rounded-xl`, border, shadow-sm, icon in a small colored circle (icon-bg matches status), padding `p-5`

- **Second row — two panels side by side:**
  - Left: "Repository Status" — horizontal stacked bar chart (just a div with colored segments proportional to count — no charting library needed, pure CSS). Colors: green for certified, amber for pending, red for rejected, gray for archived. Below the bar: legend with counts.
  - Right: "Processing Pipeline" — same visual style showing uploaded/ocr/extraction/ready/failed counts

- **Third row (optional stretch):** "Recent Activity" — a simple timeline list of the last 5 state changes (uploaded X, approved Y, certified Z). Pull from documents ordered by `updated_at`. Each item: icon + filename + status badge + relative time.

---

### 7. `src/app/(dashboard)/upload/page.tsx` + `src/components/UploadDropzone.tsx`

**Current:** Bare `<input type="file">` + button.

**Redesign UploadDropzone:**
- Large dashed-border drop zone (`border-2 border-dashed rounded-2xl p-12 text-center`)
- Inside: `UploadCloud` icon from lucide (48px, muted), "Drag and drop your warranty PDF" text, "or" divider, styled "Browse files" button
- On file select: drop zone shrinks, shows selected filename + file size + a small PDF icon
- Upload button appears below, full-width teal accent
- On upload: button shows spinner + "Processing..." text, progress indication
- After success: green check icon + document ID displayed in a `font-mono` styled box, with a "View Document" link
- After error: red alert box with error message, "Try Again" button
- Above the drop zone: a small info banner explaining "Upload warranty PDFs for AI processing. Supported: text-based and scanned PDFs up to 50MB."

---

### 8. `src/app/(dashboard)/documents/page.tsx` + `src/components/DocumentCard.tsx`

**Current:** Simple cards in a vertical stack.

**Redesign — proper table layout:**
- Page header: "Documents" title + document count badge + filter dropdowns (status, repository) in a row
- Replace card list with a **table** (or table-like grid):
  - Columns: Filename, Make/Model/Year, Repository, Processing Status, Uploaded, Actions
  - Repository column: colored pill badge
  - Processing status: colored pill badge with different styling
  - Filename: truncate with ellipsis, clickable (links to detail)
  - Make/Model/Year: combined into one cell like "Freightliner Cascadia 2023" or "—" if not extracted yet
  - Actions: small icon button for "View" (eye icon)
- Table rows: alternating subtle background, hover highlight
- Empty state: illustration-free but with text "No documents uploaded yet" + "Upload your first warranty PDF" link button

**DocumentCard.tsx → rename to DocumentRow.tsx** and restructure as a table row component.

---

### 9. `src/components/DocumentStatusBadge.tsx`

**Current:** Basic colored span.

**Redesign — proper pill badges:**
- Each status gets: background color, text color, small dot indicator before text, `font-mono text-[11px] uppercase tracking-wide`
- Status mapping:
  | Status | Dot + BG | Text |
  |---|---|---|
  | uploaded | blue dot, blue-50 bg | UPLOADED |
  | ocr_in_progress | purple dot, purple-50 bg | OCR IN PROGRESS |
  | extraction_in_progress | purple dot | EXTRACTING |
  | ready_for_review | amber dot, amber-50 bg | READY FOR REVIEW |
  | certified | green dot, green-50 bg | CERTIFIED |
  | rejected | red dot, red-50 bg | REJECTED |
  | failed | red dot, red-50 bg | FAILED |

- The dot is a small `w-1.5 h-1.5 rounded-full` div, with a pulsing animation on in-progress states

---

### 10. `src/app/(dashboard)/documents/[id]/page.tsx` + `src/components/MetadataEditor.tsx`

**Current:** Split grid with iframe on left + three bare inputs on right.

**Redesign:**
- Two-column layout: PDF viewer (60%) + metadata panel (40%)
- PDF viewer: proper card wrapper, toolbar-style header with filename + download button (lucide `Download` icon)
- Metadata panel:
  - Section title: "Extracted Metadata"
  - Each field as a labeled row: label on left (muted, small), value on right (or editable input)
  - Fields: Make, Model, Year, Warranty Type, Country, Confidence Score (shown as gauge), Processing Status (badge)
  - If `metadataJson` has `coverage_components`: show them as a bulleted list
  - If `metadataJson` has `exclusions`: show them as a red-tinted list
  - Bottom: "Full Metadata JSON" expandable/collapsible section (not raw dump by default)

**MetadataEditor.tsx redesign:**
- Each input gets a proper label above it
- Inputs have consistent styling: `rounded-lg border border-[var(--border)] px-3 py-2.5 text-sm focus:ring-2 focus:ring-[var(--accent)] focus:border-transparent`
- Add a "Save Changes" button (teal accent) that actually calls `PATCH /review/:id/metadata`
- Show a success toast on save

---

### 11. `src/app/(dashboard)/review/page.tsx`

**Current:** Flat list of "Document {uuid} - {status}" links.

**Redesign — structured review queue:**
- Page title: "Review Queue" + count badge
- Two tabs/sections: "Needs Your Review" and "Awaiting Admin Approval" (shown to admin only)
- Each item as a card (not a link-as-text):
  - Left: PDF icon + filename + upload date
  - Center: extracted metadata pills (Make, Model, Year) in small gray tags
  - Right: status badge + action button ("Review" → links to detail page)
- Empty state: "No documents waiting for review" with a subtle checkmark illustration

---

### 12. `src/app/(dashboard)/review/[id]/page.tsx`

**Current:** Raw JSON dump + three buttons.

**This is the most important page to redesign.** This is what the reviewer and admin interact with daily.

**Redesign — split panel review interface:**
- **Left panel (55%):** PDF viewer (same as document detail — iframe with pre-signed URL)
- **Right panel (45%):** structured review form
  - **Status banner** at top: colored bar showing current state
    - `in_review`: blue banner "Awaiting Reviewer Approval"
    - `reviewer_approved`: amber banner "Awaiting Admin Final Approval"
    - `certified`: green banner "Document Certified"
    - `rejected`: red banner "Document Rejected"
  - **Metadata section:** same as document detail metadata panel, but all fields are editable here
  - **Review Actions section** (card at bottom):
    - If `canReviewerApprove`: "Approve as Reviewer" button (teal) + "Reject" button (red outline)
    - If `canAdminApprove`: "Certify Document" button (green) + "Reject" button (red outline)
    - If already certified/rejected: disabled state with message
    - Comment textarea above the buttons: "Add a review comment (optional)"
    - Each button shows a confirmation prompt before executing

  - **Review History section** (below actions): timeline showing who approved/rejected when, with comments

Remove the raw JSON dump completely.

---

### 13. `src/app/(dashboard)/chat/page.tsx`

**Current:** Simple list of sessions.

**Redesign:**
- Split layout: session list on left (30%, max-width 320px), chat area on right (70%)
- **Session list:**
  - Each session: title (truncated), last message preview (first 60 chars), relative time
  - Active session highlighted with accent left border
  - "New Chat" button at top with `Plus` icon
  - Search/filter bar at top of list (optional but nice)
- **When no session selected:** right area shows empty state with large `MessageCircle` icon + "Select a conversation or start a new one"

---

### 14. `src/app/(dashboard)/chat/[sessionId]/page.tsx` + `src/components/ChatWindow.tsx`

**Current:** Functional but visually basic. Evidence panel is below the chat, disconnected.

**Redesign — the chat is the product's face:**

**ChatWindow layout:**
- Full height minus topbar: `h-[calc(100vh-4rem)]`
- Messages area: scrollable, `flex-1`
- Input area: fixed at bottom

**Message bubbles (MessageBubble.tsx):**
- User messages: right-aligned, teal background (`var(--accent)`), white text, rounded-2xl with bottom-right corner less rounded
- Assistant messages: left-aligned, white background, border, rounded-2xl with bottom-left corner less rounded
- Assistant messages show a small "AI" avatar circle (teal, with a sparkle icon) to the left
- Timestamp below each message in `text-[10px] text-muted`

**Evidence — inline, not separate:**
- After each assistant message, if `evidenceJson` exists and is non-empty, show a collapsible "Sources" section
- Default: collapsed, showing "3 sources cited" as a clickable row
- Expanded: shows each source as a small card with page number, section heading, and chunk preview (first 100 chars)
- Each source card has a "View in PDF" link (if page number available)

**Confidence display:**
- After each assistant message: a small horizontal bar gauge (not just text)
- The bar is 120px wide, filled proportionally with color: green >0.8, amber 0.5-0.8, red <0.5
- Next to bar: percentage text in `font-mono text-xs`

**Input area:**
- Textarea (auto-grows up to 4 rows), not a single-line input
- Right side: send button with `Send` icon from lucide (or `ArrowUp` icon)
- Subtle border-top separator, small padding
- Placeholder: "Ask about warranty coverage..."

**Empty chat state:**
- Large centered area with:
  - Shield icon + "Warranty AI" text
  - "Ask questions about certified warranty coverage"
  - Three clickable suggestion chips:
    - "Is the turbocharger covered on a 2023 Freightliner Cascadia?"
    - "What are the powertrain warranty limits?"
    - "What components are excluded from coverage?"
  - Clicking a chip fills the input and sends it

---

### 15. `src/components/EvidencePanel.tsx`

**Current:** Standalone aside component shown below chat.

**Redesign:** This component is no longer used as a standalone panel. Instead, evidence is rendered inline after each assistant message inside `ChatWindow.tsx`.

Create a new component: `src/components/InlineEvidence.tsx`
- Takes `evidence: any[]` prop
- Renders as a collapsible section
- Collapsed: single row with `ChevronDown` icon + "N sources cited"
- Expanded: list of source cards
- Each card: `rounded-lg border p-3`, shows:
  - Top line: `Page {N}` badge (small teal pill) + section heading if available
  - Body: chunk text preview, truncated to 3 lines with "Show more" toggle
  - `font-mono text-xs` for page numbers

---

### 16. `src/components/ConfidenceBadge.tsx`

**Current:** Simple colored span with text.

**Redesign → ConfidenceGauge.tsx:**
- Horizontal bar: 100px wide, 6px tall, rounded-full, gray background
- Filled portion: width = `value * 100%`, color based on value
- Right of bar: `{Math.round(value * 100)}%` in `font-mono text-xs`
- Below bar (optional): text label "High Confidence" / "Medium" / "Low" in matching color

---

### 17. `src/components/ProtectedRoute.tsx`

**Current:** Bare redirect logic.

**Change:** Add a brief loading skeleton (full-page spinner or skeleton) while checking auth, instead of a blank flash before redirect.

---

### 18. `src/components/Topbar.tsx`

As described in section 5 above. Additionally:
- Add a small notification indicator (bell icon from lucide) that shows count of pending reviews. This doesn't need real-time — just fetch on mount from `/review/pending` and show the count. Makes the dashboard feel alive.

---

## New Components to Create

### `src/components/StatusPipeline.tsx`
A horizontal status pipeline visualization for the document detail page:
```
[Uploaded] → [OCR] → [Extraction] → [Review] → [Certified]
```
Each step is a circle + label. Completed steps are green with checkmark. Current step pulses. Future steps are gray. Failed step is red with X.

Props: `currentStatus: string`

Used in: document detail page and review detail page.

### `src/components/EmptyState.tsx`
Reusable empty state component:
- Props: `icon: LucideIcon`, `title: string`, `description: string`, `action?: { label: string, href: string }`
- Renders centered content with large icon (muted), title, description, optional action button

### `src/components/StatCard.tsx`
Reusable stat card:
- Props: `icon: LucideIcon`, `label: string`, `value: string | number`, `color?: string`, `trend?: string`
- Used in dashboard

### `src/components/LoadingSkeleton.tsx`
Shimmer loading skeletons for:
- Table rows
- Stat cards
- Chat messages
- Document detail

Show these while data is loading instead of "Loading..." text.

---

## Responsive Behavior

- Sidebar: collapses to icon-only on screens < 1024px, hidden on < 768px (show hamburger menu instead)
- Dashboard grid: 4 cols → 2 cols → 1 col
- Review detail: split view → stacked (PDF on top, form below) on < 1024px
- Chat: session list hides on < 768px, accessible via back button

---

## Animations (Subtle, Not Flashy)

- Page transitions: `opacity 0→1` with `transform translateY(4px→0)` over 200ms on route change
- Card hover: `shadow-sm → shadow-md` + `border-color` transition, 200ms ease
- Status badge dot: `pulse` animation on in-progress states (CSS keyframe, 2s infinite)
- Sidebar nav: `background-color` transition 150ms on hover
- Chat messages: slide-in from bottom (8px translateY) with opacity, 200ms, staggered by 50ms
- Confidence gauge: width transition 500ms ease-out (bar fills up on render)
- Buttons: slight scale on hover (`transform: scale(1.01)`) + shadow increase

---

## What NOT to Change

- Do not touch any API call logic — only the visual layer
- Do not change route structure
- Do not change data fetching hooks (`useAuth`, `useChat`, `useDocuments`)
- Do not add new API endpoints
- Keep all TypeScript types as-is
- Keep `lib/api.ts` and `lib/auth.ts` exactly as they are

---

## Build Order for Cursor

1. **globals.css + tailwind.config.js + layout.tsx** — foundation (colors, fonts, variables)
2. **Sidebar.tsx** — install lucide-react, build dark sidebar with icons + active state
3. **Topbar.tsx** — breadcrumb + user avatar
4. **Login page (page.tsx)** — split layout with branding
5. **StatCard.tsx + EmptyState.tsx + LoadingSkeleton.tsx** — reusable components
6. **Dashboard page** — stat cards + visual breakdowns
7. **DocumentStatusBadge.tsx** — proper pill badges
8. **StatusPipeline.tsx** — horizontal status visualization
9. **Documents page** — table layout
10. **Document detail page + MetadataEditor.tsx** — split view with proper form
11. **Review queue page** — structured card list
12. **Review detail page** — split panel with actions and history
13. **ConfidenceGauge.tsx** — replaces ConfidenceBadge
14. **InlineEvidence.tsx** — collapsible source citations
15. **ChatWindow.tsx + MessageBubble.tsx** — redesigned chat with inline evidence
16. **Chat sessions page** — split layout with session list
17. **UploadDropzone.tsx** — drag-drop with progress feedback
18. **ProtectedRoute.tsx** — loading state
19. **Responsive tweaks** — test at 768px and 1024px breakpoints
20. **Animations** — add transitions last, after everything works

**Stop after each group and verify visually before moving to the next.**