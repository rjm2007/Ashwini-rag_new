# Warranty Intelligence Platform — Frontend Redesign Guide
### For Cursor Auto Mode — Read Every Word Before Touching Any File

> **CRITICAL INSTRUCTION FOR CURSOR:** Read this ENTIRE document before writing a single line of code. Every section is important. Do not skip ahead. Do not assume. Every color, every spacing value, every component behavior is specified here. If something is not specified, use your best judgment based on the patterns already established in this document.

---

## 1. WHAT THIS PROJECT IS

This is a Next.js 14 frontend for a Warranty Intelligence Platform. It has:
- A login page
- A dashboard layout with a sidebar and topbar
- Pages for: Dashboard, Upload PDF, Documents list, Document detail, Review queue, Review detail, Chat sessions, Chat window

You are **only changing visual styles**. Do NOT touch:
- Any file inside `src/lib/`
- Any file inside `src/hooks/`
- Any API calls, fetch logic, or data handling
- Route structure
- TypeScript types

You ARE changing:
- `src/app/globals.css`
- `frontend/tailwind.config.js`
- `src/app/layout.tsx`
- `src/components/Sidebar.tsx`
- `src/components/Topbar.tsx`
- `src/app/page.tsx` (login)
- `src/app/(dashboard)/dashboard/page.tsx`
- `src/app/(dashboard)/upload/page.tsx`
- `src/components/UploadDropzone.tsx`
- `src/app/(dashboard)/documents/page.tsx`
- `src/components/DocumentCard.tsx`
- `src/components/DocumentStatusBadge.tsx`
- `src/app/(dashboard)/documents/[id]/page.tsx`
- `src/components/MetadataEditor.tsx`
- `src/app/(dashboard)/review/page.tsx`
- `src/app/(dashboard)/review/[id]/page.tsx`
- `src/app/(dashboard)/chat/page.tsx`
- `src/app/(dashboard)/chat/[sessionId]/page.tsx`
- `src/components/ChatWindow.tsx`
- `src/components/MessageBubble.tsx`
- `src/components/EvidencePanel.tsx`
- `src/components/ConfidenceBadge.tsx`
- `src/components/ProtectedRoute.tsx`

You are also CREATING these new files:
- `src/components/StatCard.tsx`
- `src/components/EmptyState.tsx`
- `src/components/LoadingSkeleton.tsx`
- `src/components/StatusPipeline.tsx`
- `src/components/ConfidenceGauge.tsx` (replaces ConfidenceBadge.tsx)
- `src/components/InlineEvidence.tsx` (replaces EvidencePanel.tsx for chat)

---

## 2. INSTALL THIS PACKAGE FIRST

Before writing any component code, add `lucide-react` to the frontend:

```bash
cd frontend
npm install lucide-react@0.460.0
```

This is required. Every nav item, every button, every status indicator uses icons from `lucide-react`.

---

## 3. THE COLOR SYSTEM — FIXYEE PALETTE

This is the most important section. The entire design is built on these exact colors. These are extracted from the Fixyee asset maintenance platform (fixyee.com), which uses a deep navy + orange accent palette.

### 3A. CSS Variables — Put These in `globals.css`

Open `src/app/globals.css`. Delete everything inside it. Replace with this exact content:

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

:root {
  /* ─── SURFACES ───────────────────────────────────────── */
  --bg-primary: #F0F4F8;
  /* The main page background behind all content cards.
     This is a cool light gray-blue, not pure white.
     Think of it as the "canvas" color. */

  --bg-secondary: #FFFFFF;
  /* The background of cards, panels, modal boxes, and table rows.
     Pure white. Used whenever content needs to stand out from the canvas. */

  --bg-sidebar: #06101E;
  /* The deep navy sidebar background. This is the darkest color in the system.
     Almost black with a navy blue undertone. Matches Fixyee's dark sidebar. */

  --bg-sidebar-hover: #0D1B2E;
  /* When a user hovers their mouse over a sidebar nav item, the background
     changes to this slightly lighter navy. Still very dark but just perceptibly
     lighter than --bg-sidebar. */

  --bg-sidebar-active: #1A2B42;
  /* The background of the currently active/selected sidebar nav item.
     Noticeably lighter than hover. Creates a clear visual selection state. */

  /* ─── TEXT COLORS ────────────────────────────────────── */
  --text-primary: #0A1628;
  /* Main body text on light backgrounds. Very dark navy, not pure black.
     Used for headings, table data, form labels, paragraph text. */

  --text-secondary: #3D5A80;
  /* Secondary text. Used for subheadings, metadata labels, timestamps.
     A medium navy-gray that is clearly readable but visually subordinate. */

  --text-muted: #7A92A8;
  /* Muted/helper text. Used for placeholders, hints, disabled states,
     column headers in tables, and descriptive text below headings. */

  --text-sidebar: #8BAABF;
  /* The default color of unselected sidebar nav labels and icons.
     A muted slate-blue that sits comfortably on the dark --bg-sidebar. */

  --text-sidebar-active: #FFFFFF;
  /* The text and icon color for the active sidebar nav item. Pure white. */

  /* ─── BRAND ACCENT — FIXYEE ORANGE ──────────────────── */
  --accent: #FF6200;
  /* The PRIMARY brand color. This is the Fixyee orange.
     Use it for: primary buttons, active nav left border, links,
     focus rings, highlighted values, progress fill bars.
     Do NOT use this color for text on white backgrounds — it is for
     backgrounds and borders only. */

  --accent-light: #FFF0E6;
  /* The very light tint of the orange accent. Use this for:
     badge backgrounds, hover backgrounds on accent-tinted elements,
     the background of info callouts about the platform. */

  --accent-hover: #E05500;
  /* The darker orange used when hovering over an orange button or element.
     Slightly darker than --accent to give press/hover feedback. */

  --accent-text: #C24A00;
  /* Use this for TEXT that must appear in the orange brand color.
     It is dark enough to be readable on white backgrounds while still
     clearly communicating the orange brand. Never use --accent (#FF6200)
     for text on white — it fails contrast checks. */

  /* ─── STATUS COLORS ──────────────────────────────────── */
  --status-success: #16A34A;
  --status-success-bg: #F0FDF4;
  /* Green. For: certified status, success messages, checkmarks, approved states. */

  --status-warning: #D97706;
  --status-warning-bg: #FFFBEB;
  /* Amber. For: pending review, awaiting approval, processing states. */

  --status-error: #DC2626;
  --status-error-bg: #FEF2F2;
  /* Red. For: rejected status, failed processing, error messages, destructive actions. */

  --status-info: #2563EB;
  --status-info-bg: #EFF6FF;
  /* Blue. For: informational messages, in-review state, upload state. */

  --status-pending: #7C3AED;
  --status-pending-bg: #F5F3FF;
  /* Purple. For: OCR in progress, extraction in progress, queued states. */

  /* ─── BORDERS & SHADOWS ──────────────────────────────── */
  --border: #D1DCE8;
  /* Default border color for cards, inputs, table rows, and dividers.
     A soft blue-gray that is visible but not harsh. */

  --border-strong: #A8BCCF;
  /* Stronger border for focused inputs, hovered cards, and separators
     that need more visual weight. */

  --shadow-sm: 0 1px 3px rgba(6, 16, 30, 0.06), 0 1px 2px rgba(6, 16, 30, 0.04);
  /* Subtle shadow for cards at rest. Very light. */

  --shadow-md: 0 4px 12px rgba(6, 16, 30, 0.10), 0 2px 6px rgba(6, 16, 30, 0.06);
  /* Medium shadow for hovered cards, dropdowns, and active panels. */

  --shadow-lg: 0 8px 24px rgba(6, 16, 30, 0.14), 0 4px 12px rgba(6, 16, 30, 0.08);
  /* Large shadow for modals, sidebars on mobile, and fixed panels. */

  /* ─── CONFIDENCE GAUGE COLORS ───────────────────────── */
  --confidence-high: #16A34A;
  /* Green fill when confidence > 80% */

  --confidence-medium: #D97706;
  /* Amber fill when confidence is between 50% and 80% */

  --confidence-low: #DC2626;
  /* Red fill when confidence < 50% */
}

/* ─── BASE BODY STYLES ───────────────────────────────── */
body {
  margin: 0;
  font-family: "DM Sans", sans-serif;
  background: var(--bg-primary);
  color: var(--text-primary);
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}

/* ─── CARD UTILITY CLASS ─────────────────────────────── */
/* Use className="card" on any white panel/box */
.card {
  background: var(--bg-secondary);
  border: 1px solid var(--border);
  border-radius: 12px;
  box-shadow: var(--shadow-sm);
  transition: box-shadow 0.2s ease, border-color 0.2s ease;
}
.card:hover {
  box-shadow: var(--shadow-md);
  border-color: var(--border-strong);
}

/* ─── THIN SCROLLBAR ─────────────────────────────────── */
/* Applied automatically to all scrollable areas */
::-webkit-scrollbar {
  width: 6px;
  height: 6px;
}
::-webkit-scrollbar-track {
  background: transparent;
}
::-webkit-scrollbar-thumb {
  background: var(--border-strong);
  border-radius: 3px;
}
::-webkit-scrollbar-thumb:hover {
  background: var(--text-muted);
}

/* ─── PULSING DOT ANIMATION ──────────────────────────── */
/* Used on in-progress status badges */
@keyframes pulse-dot {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.3; }
}
.pulse {
  animation: pulse-dot 1.8s ease-in-out infinite;
}

/* ─── SLIDE-IN ANIMATION ─────────────────────────────── */
/* Used for chat message entry */
@keyframes slide-in-up {
  from {
    opacity: 0;
    transform: translateY(8px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
.animate-slide-in {
  animation: slide-in-up 0.2s ease-out forwards;
}

/* ─── PAGE FADE-IN ───────────────────────────────────── */
@keyframes fade-in {
  from { opacity: 0; transform: translateY(4px); }
  to { opacity: 1; transform: translateY(0); }
}
.animate-page-in {
  animation: fade-in 0.2s ease-out forwards;
}

/* ─── CONFIDENCE BAR TRANSITION ──────────────────────── */
.confidence-bar-fill {
  transition: width 0.5s ease-out;
}

/* ─── INTERACTIVE ELEMENTS ───────────────────────────── */
button, a {
  transition: all 0.15s ease;
}
```

---

### 3B. Update `tailwind.config.js`

Open `frontend/tailwind.config.js`. Replace the entire contents with:

```js
/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ['"DM Sans"', 'sans-serif'],
        mono: ['"DM Mono"', 'monospace'],
      },
      colors: {
        brand: {
          orange: '#FF6200',
          'orange-light': '#FFF0E6',
          'orange-hover': '#E05500',
          'orange-text': '#C24A00',
          navy: '#06101E',
          'navy-mid': '#0D1B2E',
          'navy-light': '#1A2B42',
        }
      }
    }
  },
  plugins: []
};
```

---

### 3C. Update `src/app/layout.tsx`

Open `src/app/layout.tsx`. Replace the entire contents with:

```tsx
import "./globals.css";
import { ReactNode } from "react";

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>Warranty Intelligence Platform</title>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=DM+Mono:wght@400;500&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="font-sans antialiased">{children}</body>
    </html>
  );
}
```

---

## 4. SIDEBAR — `src/components/Sidebar.tsx`

This is one of the most important components. Read carefully.

### What it looks like:
- Full height dark navy sidebar (`height: 100vh`, stays fixed on the left)
- Width: `w-64` (256px)
- Background color: `#06101E` (use `bg-[#06101E]`)
- Top section: A small logo/brand area
- Middle section: Navigation links with icons
- Bottom section: Version text + logout button

### Brand Area (top of sidebar):
- A small orange circle containing a truck/shield icon (use `ShieldCheck` from lucide-react, size 18, color white)
- Next to it: "Warranty AI" text in white, `text-sm font-bold`
- Below that on a new line: the user's role as a badge (e.g. "ADMIN")
- Role badge style: `bg-[#FF6200] text-white text-[10px] px-2 py-0.5 rounded-full uppercase tracking-wider font-mono`
- Padding of the brand area: `p-5` top and bottom, `px-5` sides
- A horizontal divider line below the brand area: `border-b border-[#1A2B42]`

### Navigation Items:
Each nav item is a `<Link>` tag. The link contains:
1. An icon from lucide-react (size 18px)
2. A text label

The icon-to-page mapping is:
- Dashboard → `LayoutDashboard` icon
- Upload → `Upload` icon
- Documents → `FileText` icon
- Review → `ClipboardCheck` icon
- Chat → `MessageCircle` icon

Default (not active) state of each nav item:
- Padding: `px-4 py-2.5`
- Margin: `mx-2 my-0.5` (small horizontal margin so the active bar has room)
- Border radius: `rounded-lg`
- Icon color: `#8BAABF` (use inline style or `text-[#8BAABF]`)
- Text color: `#8BAABF`
- Text size: `text-sm`
- Font weight: `font-medium`
- Display: `flex items-center gap-3`
- Background: transparent

Hover state (add with Tailwind `hover:` classes):
- Background: `hover:bg-[#0D1B2E]`
- Text color changes to white: `hover:text-white`

Active state (the currently visited page — detect with `usePathname()` from `next/navigation`):
- Background: `bg-[#1A2B42]`
- Text color: `text-white`
- A 3px left border in orange: use `border-l-[3px] border-l-[#FF6200]`
- Slightly adjust padding to compensate: `pl-[13px]` instead of `px-4` (3px border takes 3px so subtract from left padding)
- Icon color should also be white when active

How to detect active state: import `usePathname` from `"next/navigation"`. For each nav item, check if the current pathname starts with the nav item's href. If yes, apply active styles. If no, apply default styles.

### Nav Groups:
- Admin sees: Dashboard, Upload, Documents, Review, Chat
- Reviewer sees: Dashboard, Documents, Review, Chat
- User sees: Chat only

Import `useAuth` from `"../hooks/useAuth"` to get the current user's role.

### Bottom of Sidebar:
- A divider line: `border-t border-[#1A2B42] mt-auto`
- Version text: `"v1.0 POC"` in `text-[11px] text-[#4A6680] font-mono px-5 py-3`
- A logout button below that:
  - Uses `LogOut` icon from lucide-react, size 16
  - Style: `flex items-center gap-2 px-5 py-3 text-sm text-[#8BAABF] hover:text-white cursor-pointer w-full transition-colors`
  - On click: calls `logout()` from `"../lib/auth"` then redirects to `"/"`

### Full JSX Structure (write this code):

```tsx
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Upload,
  FileText,
  ClipboardCheck,
  MessageCircle,
  LogOut,
  ShieldCheck,
} from "lucide-react";
import { useAuth } from "../hooks/useAuth";
import { logout } from "../lib/auth";

const ALL_NAV_ITEMS = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard, roles: ["admin", "reviewer", "user"] },
  { href: "/upload",    label: "Upload",     icon: Upload,          roles: ["admin"] },
  { href: "/documents", label: "Documents",  icon: FileText,        roles: ["admin", "reviewer"] },
  { href: "/review",    label: "Review",     icon: ClipboardCheck,  roles: ["admin", "reviewer"] },
  { href: "/chat",      label: "Chat",       icon: MessageCircle,   roles: ["admin", "reviewer", "user"] },
];

export default function Sidebar() {
  const { user } = useAuth();
  const pathname = usePathname();
  const role = user?.role || "user";

  const navItems = ALL_NAV_ITEMS.filter((item) => item.roles.includes(role));

  const handleLogout = () => {
    logout();
    window.location.href = "/";
  };

  return (
    <aside
      className="flex flex-col"
      style={{
        width: "256px",
        minHeight: "100vh",
        backgroundColor: "#06101E",
        borderRight: "1px solid #1A2B42",
        flexShrink: 0,
      }}
    >
      {/* ── Brand Area ── */}
      <div style={{ padding: "20px", borderBottom: "1px solid #1A2B42" }}>
        <div className="flex items-center gap-2.5">
          <div
            style={{
              width: 32,
              height: 32,
              backgroundColor: "#FF6200",
              borderRadius: 8,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}
          >
            <ShieldCheck size={18} color="white" />
          </div>
          <span style={{ color: "#FFFFFF", fontSize: 14, fontWeight: 700 }}>
            Warranty AI
          </span>
        </div>
        <div style={{ marginTop: 10 }}>
          <span
            style={{
              backgroundColor: "#FF6200",
              color: "#FFFFFF",
              fontSize: 10,
              fontWeight: 600,
              padding: "2px 8px",
              borderRadius: 99,
              textTransform: "uppercase",
              letterSpacing: "0.08em",
              fontFamily: "DM Mono, monospace",
            }}
          >
            {role}
          </span>
        </div>
      </div>

      {/* ── Navigation ── */}
      <nav style={{ flex: 1, padding: "12px 8px" }}>
        {navItems.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 12,
                padding: isActive ? "10px 16px 10px 13px" : "10px 16px",
                marginBottom: 2,
                borderRadius: 8,
                backgroundColor: isActive ? "#1A2B42" : "transparent",
                borderLeft: isActive ? "3px solid #FF6200" : "3px solid transparent",
                color: isActive ? "#FFFFFF" : "#8BAABF",
                fontSize: 14,
                fontWeight: 500,
                textDecoration: "none",
                transition: "all 0.15s ease",
              }}
              onMouseEnter={(e) => {
                if (!isActive) {
                  (e.currentTarget as HTMLElement).style.backgroundColor = "#0D1B2E";
                  (e.currentTarget as HTMLElement).style.color = "#FFFFFF";
                }
              }}
              onMouseLeave={(e) => {
                if (!isActive) {
                  (e.currentTarget as HTMLElement).style.backgroundColor = "transparent";
                  (e.currentTarget as HTMLElement).style.color = "#8BAABF";
                }
              }}
            >
              <Icon size={18} />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>

      {/* ── Bottom Section ── */}
      <div style={{ borderTop: "1px solid #1A2B42" }}>
        <div
          style={{
            padding: "12px 20px 4px",
            fontSize: 11,
            color: "#4A6680",
            fontFamily: "DM Mono, monospace",
          }}
        >
          v1.0 POC
        </div>
        <button
          onClick={handleLogout}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            width: "100%",
            padding: "10px 20px 16px",
            background: "none",
            border: "none",
            cursor: "pointer",
            color: "#8BAABF",
            fontSize: 14,
            transition: "color 0.15s ease",
          }}
          onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.color = "#FFFFFF"; }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.color = "#8BAABF"; }}
        >
          <LogOut size={16} />
          <span>Log out</span>
        </button>
      </div>
    </aside>
  );
}
```

---

## 5. TOPBAR — `src/components/Topbar.tsx`

### What it looks like:
- Fixed at the top of the content area (not the sidebar)
- Height: `h-16` (64px)
- Background: white
- Bottom border: `border-b border-[#D1DCE8]`
- Box shadow: `var(--shadow-sm)` applied via inline style
- Content split: left side shows breadcrumb, right side shows user avatar + email + notification bell

### Left side — Breadcrumb:
- Uses `usePathname()` from `next/navigation`
- Convert the pathname to a human-readable page name:
  - `/dashboard` → `"Dashboard"`
  - `/upload` → `"Upload"`
  - `/documents` → `"Documents"`
  - `/documents/[id]` → `"Document Detail"`
  - `/review` → `"Review Queue"`
  - `/review/[id]` → `"Review Detail"`
  - `/chat` → `"Chat"`
  - `/chat/[id]` → `"Chat Session"`
- Display as: `<span style text-muted>Warranty AI</span> <span>/</span> <span text-primary font-semibold>Page Name</span>`

### Right side — User info:
- A circle avatar showing the user's initials (2 letters from their email, e.g. "AD" for admin@demo.com)
- Avatar style: 32x32 circle, background `#FF6200`, white text, `text-xs font-bold`, `font-mono`
- User's email in `text-sm text-[#3D5A80]` next to the avatar
- A bell icon (`Bell` from lucide-react, size 18, color `#7A92A8`) to the left of the avatar
  - If there are pending reviews (fetch from `/review/pending` on mount), show a small orange dot on the bell
  - The dot: absolute positioned, 8px circle, `bg-[#FF6200]`, top-right of the bell icon container

### Code to write:

```tsx
"use client";

import { usePathname } from "next/navigation";
import { Bell } from "lucide-react";
import { useEffect, useState } from "react";
import { getUser } from "../lib/auth";
import api from "../lib/api";

const PAGE_NAMES: Record<string, string> = {
  "/dashboard": "Dashboard",
  "/upload": "Upload",
  "/documents": "Documents",
  "/review": "Review Queue",
  "/chat": "Chat",
};

function getPageName(pathname: string): string {
  if (PAGE_NAMES[pathname]) return PAGE_NAMES[pathname];
  if (pathname.startsWith("/documents/")) return "Document Detail";
  if (pathname.startsWith("/review/")) return "Review Detail";
  if (pathname.startsWith("/chat/")) return "Chat Session";
  return "Page";
}

function getInitials(email: string): string {
  const parts = email.split("@")[0].split(/[._-]/);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return email.substring(0, 2).toUpperCase();
}

export default function Topbar() {
  const pathname = usePathname();
  const user = typeof window !== "undefined" ? getUser() : null;
  const [pendingCount, setPendingCount] = useState(0);

  useEffect(() => {
    api
      .get("/review/pending")
      .then((r) => setPendingCount(Array.isArray(r.data) ? r.data.length : 0))
      .catch(() => {});
  }, []);

  const pageName = getPageName(pathname || "");
  const initials = user?.email ? getInitials(user.email) : "??";

  return (
    <header
      style={{
        height: 64,
        backgroundColor: "#FFFFFF",
        borderBottom: "1px solid #D1DCE8",
        boxShadow: "0 1px 3px rgba(6,16,30,0.06)",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "0 24px",
        position: "sticky",
        top: 0,
        zIndex: 10,
      }}
    >
      {/* Left: Breadcrumb */}
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <span style={{ fontSize: 13, color: "#7A92A8" }}>Warranty AI</span>
        <span style={{ color: "#D1DCE8" }}>/</span>
        <span style={{ fontSize: 14, fontWeight: 600, color: "#0A1628" }}>{pageName}</span>
      </div>

      {/* Right: Bell + User */}
      <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
        {/* Notification Bell */}
        <div style={{ position: "relative" }}>
          <Bell size={18} color="#7A92A8" />
          {pendingCount > 0 && (
            <span
              style={{
                position: "absolute",
                top: -4,
                right: -4,
                width: 8,
                height: 8,
                backgroundColor: "#FF6200",
                borderRadius: "50%",
                border: "1.5px solid white",
              }}
            />
          )}
        </div>
        {/* User Info */}
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ fontSize: 13, color: "#3D5A80" }}>{user?.email || "Guest"}</span>
          <div
            style={{
              width: 32,
              height: 32,
              backgroundColor: "#FF6200",
              borderRadius: "50%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#FFFFFF",
              fontSize: 11,
              fontWeight: 700,
              fontFamily: "DM Mono, monospace",
              flexShrink: 0,
            }}
          >
            {initials}
          </div>
        </div>
      </div>
    </header>
  );
}
```

---

## 6. LOGIN PAGE — `src/app/page.tsx`

### Layout:
- Full screen: `min-h-screen flex`
- Split into two halves: LEFT (55% width) and RIGHT (45% width)
- On screens narrower than 768px (`md:` breakpoint): left panel is hidden, form takes full width

### LEFT PANEL (the branded side):
- Background: `#06101E` (the darkest navy)
- Padding: `p-12`
- Display: `flex flex-col justify-between` (logo at top, bullets at bottom)
- **Top of left panel:**
  - Orange icon box (same as sidebar brand): 40px square, `#FF6200` background, rounded corners, `ShieldCheck` icon from lucide (24px, white)
  - Below: `"Warranty Intelligence Platform"` in white, `text-3xl font-bold`, `mt-6`
  - Below: `"Governed AI-powered warranty document management"` in `#8BAABF`, `text-base`, `mt-3`
  - Below: A decorative orange horizontal bar: `width: 48px, height: 3px, backgroundColor: #FF6200, borderRadius: 2, marginTop: 20`

- **Bottom of left panel** (feature bullets):
  - Three bullet items, each with a small orange checkmark circle on the left
  - Bullet 1: "AI-Assisted Coverage Analysis"
  - Bullet 2: "Governed Document Repository"
  - Bullet 3: "Explainable Warranty Reasoning"
  - Each bullet: `flex items-center gap-3`, text in `#8BAABF`, `text-sm`
  - The checkmark circle: 20px, border `1px solid #FF6200`, border-radius 50%, `Check` icon from lucide (12px, `#FF6200`)

### RIGHT PANEL (the form side):
- Background: white (`#FFFFFF`)
- Display: `flex flex-col justify-center`
- Padding: `px-12 py-16`
- Max width of the form inside: `max-w-sm mx-auto w-full`

- **Form elements:**
  - Heading: `"Sign in to your account"` — `text-2xl font-bold text-[#0A1628]`
  - Subtext: `"Warranty Intelligence Platform"` — `text-sm text-[#7A92A8] mt-1 mb-8`
  - **Email field:**
    - Label above input: `"Email address"` — `text-sm font-medium text-[#0A1628] mb-1.5 block`
    - Input: full width, border `1px solid #D1DCE8`, border-radius 8px, padding `10px 12px`, `text-sm`, `focus:outline-none focus:ring-2 focus:ring-[#FF6200] focus:border-transparent`
  - **Password field:** same style as email
  - **Submit button:**
    - Full width: `width: "100%"`
    - Background: `#FF6200`
    - On hover: `#E05500`
    - Text: white, `font-semibold`, `text-sm`
    - Padding: `py-2.5`
    - Border-radius: 8px
    - Text: `"Sign in"`
    - Margin top: `mt-6`
  - **Demo note:** below the button, `"Demo credentials pre-filled for POC"` — `text-xs text-center text-[#7A92A8] mt-3`
  - **Error state:** If `error` is not empty, show a box above the button with:
    - Background: `#FEF2F2`, border: `1px solid #FCA5A5`, border-radius: 8px, padding `10px 12px`
    - An `AlertCircle` icon from lucide (16px, `#DC2626`) followed by the error text in `text-sm text-[#DC2626]`
    - Display: `flex items-center gap-2 mt-4`

---

## 7. NEW COMPONENT: `src/components/StatCard.tsx`

Create this file. It is used on the dashboard.

```tsx
import { LucideIcon } from "lucide-react";

interface StatCardProps {
  icon: LucideIcon;
  label: string;
  value: string | number;
  iconColor?: string;   // hex color for the icon
  iconBg?: string;      // hex color for icon background circle
  accent?: boolean;     // if true, value text is orange
}

export default function StatCard({ icon: Icon, label, value, iconColor = "#FF6200", iconBg = "#FFF0E6", accent = false }: StatCardProps) {
  return (
    <div className="card" style={{ padding: 20 }}>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
        <div>
          <p style={{ fontSize: 12, color: "#7A92A8", textTransform: "uppercase", letterSpacing: "0.06em", fontWeight: 600 }}>
            {label}
          </p>
          <p style={{
            fontSize: 30,
            fontWeight: 700,
            color: accent ? "#FF6200" : "#0A1628",
            marginTop: 8,
            lineHeight: 1,
          }}>
            {value}
          </p>
        </div>
        <div style={{
          width: 44,
          height: 44,
          backgroundColor: iconBg,
          borderRadius: 10,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
        }}>
          <Icon size={22} color={iconColor} />
        </div>
      </div>
    </div>
  );
}
```

---

## 8. NEW COMPONENT: `src/components/EmptyState.tsx`

```tsx
import { LucideIcon } from "lucide-react";
import Link from "next/link";

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  action?: { label: string; href: string };
}

export default function EmptyState({ icon: Icon, title, description, action }: EmptyStateProps) {
  return (
    <div style={{
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      padding: "60px 24px",
      textAlign: "center",
    }}>
      <div style={{
        width: 64,
        height: 64,
        backgroundColor: "#FFF0E6",
        borderRadius: 16,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        marginBottom: 16,
      }}>
        <Icon size={30} color="#FF6200" />
      </div>
      <p style={{ fontSize: 16, fontWeight: 600, color: "#0A1628", marginBottom: 8 }}>{title}</p>
      <p style={{ fontSize: 14, color: "#7A92A8", maxWidth: 320 }}>{description}</p>
      {action && (
        <Link
          href={action.href}
          style={{
            marginTop: 20,
            display: "inline-block",
            backgroundColor: "#FF6200",
            color: "white",
            padding: "8px 20px",
            borderRadius: 8,
            fontSize: 14,
            fontWeight: 600,
            textDecoration: "none",
          }}
        >
          {action.label}
        </Link>
      )}
    </div>
  );
}
```

---

## 9. NEW COMPONENT: `src/components/LoadingSkeleton.tsx`

```tsx
// Shimmer loading skeleton used while data is being fetched.
// Usage: <LoadingSkeleton type="card" /> or <LoadingSkeleton type="row" count={5} />

interface LoadingSkeletonProps {
  type: "card" | "row" | "stat";
  count?: number;
}

function SkeletonBox({ style }: { style?: React.CSSProperties }) {
  return (
    <div
      style={{
        backgroundColor: "#E8EEF4",
        borderRadius: 6,
        animation: "pulse-dot 1.5s ease-in-out infinite",
        ...style,
      }}
    />
  );
}

export default function LoadingSkeleton({ type, count = 3 }: LoadingSkeletonProps) {
  if (type === "stat") {
    return (
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16 }}>
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="card" style={{ padding: 20 }}>
            <SkeletonBox style={{ height: 12, width: "60%", marginBottom: 12 }} />
            <SkeletonBox style={{ height: 32, width: "40%" }} />
          </div>
        ))}
      </div>
    );
  }

  if (type === "row") {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 1 }}>
        {Array.from({ length: count }).map((_, i) => (
          <div key={i} style={{ display: "flex", gap: 16, padding: "14px 16px", backgroundColor: "white", alignItems: "center" }}>
            <SkeletonBox style={{ height: 14, flex: 3 }} />
            <SkeletonBox style={{ height: 14, flex: 2 }} />
            <SkeletonBox style={{ height: 22, width: 80, borderRadius: 99 }} />
            <SkeletonBox style={{ height: 14, flex: 1 }} />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="card" style={{ padding: 20 }}>
          <SkeletonBox style={{ height: 14, width: "70%", marginBottom: 10 }} />
          <SkeletonBox style={{ height: 12, width: "40%" }} />
        </div>
      ))}
    </div>
  );
}
```

---

## 10. NEW COMPONENT: `src/components/StatusPipeline.tsx`

This is the horizontal pipeline shown on document detail and review pages.

Stages (in order):
1. Uploaded
2. OCR
3. Extraction
4. Review
5. Certified (or Rejected)

The `currentStatus` prop is a string from the backend (e.g. `"ocr_in_progress"`, `"ready_for_review"`, `"certified"`, `"rejected"`, `"failed"`).

Map statuses to stage index:
- `"uploaded"` → stage 0
- `"ocr_in_progress"`, `"ocr_complete"` → stage 1
- `"extraction_in_progress"`, `"extraction_complete"`, `"embedded"` → stage 2
- `"ready_for_review"` → stage 3
- `"certified"`, `"rejected"`, `"failed"` → stage 4

Visual rules:
- Stages BEFORE the current stage: filled orange circle (`#FF6200`) with white `Check` icon (14px) inside
- CURRENT stage: pulsing orange circle with white dot inside (use the `.pulse` class)
- Stages AFTER current stage: gray circle (`#E8EEF4`) with gray dot inside
- The connector line between stages: 100% width, 2px height, color orange for completed connections, gray for future
- Stage label below the circle: `text-xs font-medium text-[#0A1628]` for done/active, `text-xs text-[#7A92A8]` for future
- If `currentStatus` includes `"rejected"` or `"failed"`: the final circle is red (`#DC2626`) with an `X` icon

```tsx
import { Check, X } from "lucide-react";

const STAGES = ["Uploaded", "OCR", "Extraction", "Review", "Certified"];

function getStageIndex(status: string): number {
  const s = status?.toLowerCase() || "";
  if (s.includes("certified") || s.includes("rejected") || s.includes("failed")) return 4;
  if (s.includes("ready_for_review")) return 3;
  if (s.includes("extraction") || s.includes("embedded")) return 2;
  if (s.includes("ocr")) return 1;
  return 0;
}

export default function StatusPipeline({ currentStatus }: { currentStatus: string }) {
  const activeIndex = getStageIndex(currentStatus);
  const isRejected = currentStatus?.toLowerCase().includes("rejected") || currentStatus?.toLowerCase().includes("failed");

  return (
    <div style={{ display: "flex", alignItems: "center", width: "100%", padding: "12px 0" }}>
      {STAGES.map((stage, i) => {
        const isDone = i < activeIndex;
        const isActive = i === activeIndex;
        const isFuture = i > activeIndex;
        const isFinalRejected = i === 4 && isRejected;

        return (
          <div key={stage} style={{ display: "flex", alignItems: "center", flex: i < STAGES.length - 1 ? "1" : "0" }}>
            {/* Circle + Label */}
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", flexShrink: 0 }}>
              <div
                className={isActive ? "pulse" : ""}
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: "50%",
                  backgroundColor: isFinalRejected ? "#DC2626" : isDone || isActive ? "#FF6200" : "#E8EEF4",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  border: isActive ? "2px solid #FF6200" : "none",
                  boxShadow: isActive ? "0 0 0 4px #FFF0E6" : "none",
                }}
              >
                {isFinalRejected ? (
                  <X size={14} color="white" />
                ) : isDone ? (
                  <Check size={14} color="white" />
                ) : (
                  <div style={{
                    width: 8,
                    height: 8,
                    borderRadius: "50%",
                    backgroundColor: isActive ? "white" : "#A8BCCF",
                  }} />
                )}
              </div>
              <span style={{
                fontSize: 11,
                fontWeight: isActive ? 600 : 400,
                color: isFuture ? "#7A92A8" : "#0A1628",
                marginTop: 6,
                whiteSpace: "nowrap",
              }}>
                {stage}
              </span>
            </div>

            {/* Connector line (not after last item) */}
            {i < STAGES.length - 1 && (
              <div style={{
                flex: 1,
                height: 2,
                backgroundColor: i < activeIndex ? "#FF6200" : "#E8EEF4",
                margin: "0 4px",
                marginBottom: 18, // align with circle center
              }} />
            )}
          </div>
        );
      })}
    </div>
  );
}
```

---

## 11. DOCUMENT STATUS BADGE — `src/components/DocumentStatusBadge.tsx`

Replace the existing file completely.

Each status is a pill badge with a colored dot + text. In-progress statuses have a pulsing dot.

```tsx
const STATUS_CONFIG: Record<string, {
  dot: string;      // hex color of the dot
  bg: string;       // hex background of the pill
  text: string;     // hex color of the text
  label: string;    // display label
  pulse: boolean;   // whether the dot should pulse
}> = {
  uploaded:                { dot: "#2563EB", bg: "#EFF6FF", text: "#1D4ED8", label: "UPLOADED",      pulse: false },
  ocr_in_progress:         { dot: "#7C3AED", bg: "#F5F3FF", text: "#6D28D9", label: "OCR RUNNING",   pulse: true  },
  ocr_complete:            { dot: "#7C3AED", bg: "#F5F3FF", text: "#6D28D9", label: "OCR DONE",      pulse: false },
  extraction_in_progress:  { dot: "#7C3AED", bg: "#F5F3FF", text: "#6D28D9", label: "EXTRACTING",    pulse: true  },
  extraction_complete:     { dot: "#D97706", bg: "#FFFBEB", text: "#B45309", label: "EXTRACTED",     pulse: false },
  embedded:                { dot: "#D97706", bg: "#FFFBEB", text: "#B45309", label: "EMBEDDED",      pulse: false },
  ready_for_review:        { dot: "#D97706", bg: "#FFFBEB", text: "#B45309", label: "READY",         pulse: false },
  certified:               { dot: "#16A34A", bg: "#F0FDF4", text: "#15803D", label: "CERTIFIED",     pulse: false },
  rejected:                { dot: "#DC2626", bg: "#FEF2F2", text: "#B91C1C", label: "REJECTED",      pulse: false },
  failed:                  { dot: "#DC2626", bg: "#FEF2F2", text: "#B91C1C", label: "FAILED",        pulse: false },
  pending_review:          { dot: "#D97706", bg: "#FFFBEB", text: "#B45309", label: "PENDING",       pulse: false },
  reviewer_approved:       { dot: "#FF6200", bg: "#FFF0E6", text: "#C24A00", label: "REVIEWER ✓",    pulse: false },
};

const DEFAULT_CONFIG = { dot: "#7A92A8", bg: "#F0F4F8", text: "#3D5A80", label: "UNKNOWN", pulse: false };

export default function DocumentStatusBadge({ status }: { status: string }) {
  const cfg = STATUS_CONFIG[status?.toLowerCase()] || DEFAULT_CONFIG;
  return (
    <span style={{
      display: "inline-flex",
      alignItems: "center",
      gap: 5,
      backgroundColor: cfg.bg,
      color: cfg.text,
      fontSize: 11,
      fontWeight: 600,
      fontFamily: "DM Mono, monospace",
      letterSpacing: "0.06em",
      padding: "3px 8px",
      borderRadius: 99,
    }}>
      <span
        className={cfg.pulse ? "pulse" : ""}
        style={{
          width: 6,
          height: 6,
          borderRadius: "50%",
          backgroundColor: cfg.dot,
          flexShrink: 0,
        }}
      />
      {cfg.label}
    </span>
  );
}
```

---

## 12. CONFIDENCE GAUGE — `src/components/ConfidenceGauge.tsx` (NEW FILE)

**Also update `src/components/ConfidenceBadge.tsx` to just re-export from here for backward compat.**

```tsx
// src/components/ConfidenceGauge.tsx

interface ConfidenceGaugeProps {
  value: number; // 0 to 1
  showLabel?: boolean;
}

export default function ConfidenceGauge({ value, showLabel = true }: ConfidenceGaugeProps) {
  const percent = Math.max(0, Math.min(1, value));
  const color = percent >= 0.8 ? "#16A34A" : percent >= 0.5 ? "#D97706" : "#DC2626";
  const label = percent >= 0.8 ? "High" : percent >= 0.5 ? "Medium" : "Low";

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
      {/* Bar */}
      <div style={{
        width: 100,
        height: 6,
        backgroundColor: "#E8EEF4",
        borderRadius: 3,
        overflow: "hidden",
      }}>
        <div
          className="confidence-bar-fill"
          style={{
            height: "100%",
            width: `${Math.round(percent * 100)}%`,
            backgroundColor: color,
            borderRadius: 3,
          }}
        />
      </div>
      {/* Percentage */}
      <span style={{ fontFamily: "DM Mono, monospace", fontSize: 11, color: "#3D5A80", minWidth: 30 }}>
        {Math.round(percent * 100)}%
      </span>
      {/* Label */}
      {showLabel && (
        <span style={{ fontSize: 11, fontWeight: 600, color }}>
          {label}
        </span>
      )}
    </div>
  );
}
```

Update `src/components/ConfidenceBadge.tsx` to:
```tsx
// Backward compatibility shim
import ConfidenceGauge from "./ConfidenceGauge";
export default function ConfidenceBadge({ value }: { value: number }) {
  return <ConfidenceGauge value={value} />;
}
```

---

## 13. INLINE EVIDENCE — `src/components/InlineEvidence.tsx` (NEW FILE)

```tsx
"use client";

import { useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";

export default function InlineEvidence({ evidence }: { evidence: any[] }) {
  const [open, setOpen] = useState(false);
  if (!evidence || evidence.length === 0) return null;

  return (
    <div style={{ marginTop: 8 }}>
      {/* Collapsed trigger */}
      <button
        onClick={() => setOpen(!open)}
        style={{
          display: "flex",
          alignItems: "center",
          gap: 6,
          padding: "5px 10px",
          borderRadius: 6,
          border: "1px solid #D1DCE8",
          backgroundColor: "#F0F4F8",
          color: "#3D5A80",
          fontSize: 12,
          fontWeight: 500,
          cursor: "pointer",
        }}
      >
        {open ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
        {evidence.length} source{evidence.length !== 1 ? "s" : ""} cited
      </button>

      {/* Expanded list */}
      {open && (
        <div style={{ marginTop: 8, display: "flex", flexDirection: "column", gap: 8 }}>
          {evidence.map((item, i) => (
            <div
              key={i}
              style={{
                border: "1px solid #D1DCE8",
                borderRadius: 8,
                padding: "10px 12px",
                backgroundColor: "#FFFFFF",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                <span style={{
                  backgroundColor: "#FFF0E6",
                  color: "#C24A00",
                  fontSize: 10,
                  fontWeight: 700,
                  padding: "2px 7px",
                  borderRadius: 99,
                  fontFamily: "DM Mono, monospace",
                }}>
                  Page {item.pageNumber || "?"}
                </span>
                {item.sectionHeading && item.sectionHeading !== "Unknown" && (
                  <span style={{ fontSize: 12, color: "#3D5A80", fontWeight: 500 }}>
                    {item.sectionHeading}
                  </span>
                )}
              </div>
              <p style={{
                fontSize: 12,
                color: "#0A1628",
                lineHeight: 1.6,
                display: "-webkit-box",
                WebkitLineClamp: 3,
                WebkitBoxOrient: "vertical",
                overflow: "hidden",
              }}>
                {item.chunkText || "No text available"}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
```

---

## 14. DASHBOARD PAGE — `src/app/(dashboard)/dashboard/page.tsx`

Rewrite entirely. Import these:
- `StatCard` from `"../../../components/StatCard"`
- `LoadingSkeleton` from `"../../../components/LoadingSkeleton"`
- `FileText, ShieldCheck, Clock, Gauge` from `"lucide-react"`

### Layout:
1. Page title row: `"Dashboard"` as `text-xl font-bold text-[#0A1628]` + subtitle `"Warranty platform overview"` in `text-sm text-[#7A92A8]`, margin bottom 24px
2. 4-column stat card grid (2 columns on mobile)
3. 2-column breakdown grid (1 column on mobile) below that, margin top 20px

### Stat Cards (4 total):
1. Total Documents — icon: `FileText`, iconColor: `#2563EB`, iconBg: `#EFF6FF`, value: `stats.totalDocuments ?? 0`
2. Certified — icon: `ShieldCheck`, iconColor: `#16A34A`, iconBg: `#F0FDF4`, value: `stats.repositoryBreakdown?.certified ?? 0`, accent: false
3. Pending Review — icon: `Clock`, iconColor: `#D97706`, iconBg: `#FFFBEB`, value: `stats.repositoryBreakdown?.pending_review ?? 0`
4. Avg Confidence — icon: `Gauge`, iconColor: `#FF6200`, iconBg: `#FFF0E6`, value: `${Math.round((stats.averageConfidence ?? 0) * 100)}%`, accent: true

### Repository Status Panel:
- White card with heading `"Repository Status"` in `text-sm font-semibold text-[#0A1628]`, margin bottom 12
- Horizontal stacked bar chart: a `div` with `height: 12px, borderRadius: 6, overflow: hidden, display: flex`
- Each segment is a `div` with `height: 100%`, width proportional to its count out of total
  - `certified` → backgroundColor `#16A34A`
  - `pending_review` → backgroundColor `#D97706`
  - `rejected` → backgroundColor `#DC2626`
  - `archived` → backgroundColor `#7A92A8`
- Below the bar: a legend row with color dot + label + count for each segment
- Legend item: `flex items-center gap-2`, dot is `w-2.5 h-2.5 rounded-full`

### Processing Status Panel:
- Same layout as Repository Status
- Shows `processingStatusBreakdown` data
- Colors: `uploaded`→blue, `ocr_in_progress`→purple, `extraction_in_progress`→purple, `ready_for_review`→amber, `certified`/complete→green, `failed`→red

### While loading (stats is null): Show `<LoadingSkeleton type="stat" />`

---

## 15. DOCUMENTS PAGE — `src/app/(dashboard)/documents/page.tsx`

Rewrite entirely. Replace DocumentCard with a proper table.

### Header row:
- Title `"Documents"` + a gray pill badge showing total document count
- Filter dropdowns (use plain `<select>` elements styled consistently): one for repository, one for status
- Button to reset filters

### Table:
- White card wrapper with `border-radius: 12px, overflow: hidden`
- Table element with `width: "100%", borderCollapse: "collapse"`
- **Table header row:**
  - Background: `#F0F4F8`
  - Border bottom: `1px solid #D1DCE8`
  - Columns: `File Name` | `Vehicle` | `Repository` | `Processing Status` | `Uploaded` | `Actions`
  - Header cell style: `padding: "10px 16px", fontSize: 12, fontWeight: 600, color: "#7A92A8", textTransform: "uppercase", letterSpacing: "0.06em", textAlign: "left"`
- **Table body rows:**
  - Alternating row background: even rows `#FAFBFC`, odd rows `#FFFFFF`
  - On hover: `#F5F8FB`
  - Row border bottom: `1px solid #F0F4F8`
  - Cell padding: `14px 16px`
  - **File Name cell:** Truncate with max-width 220px, `text-sm font-medium text-[#0A1628]`, clickable link to `/documents/[id]`
  - **Vehicle cell:** `"Make Model Year"` combined or `"—"` if not extracted. `text-sm text-[#3D5A80]`
  - **Repository cell:** `<DocumentStatusBadge>` with `currentRepository` value
  - **Processing Status cell:** `<DocumentStatusBadge>` with `processingStatus` value
  - **Uploaded cell:** formatted date, `text-sm text-[#7A92A8]`, use `new Date(doc.uploadedAt).toLocaleDateString()`
  - **Actions cell:** small icon button: `Eye` icon from lucide (16px, `#7A92A8`), links to `/documents/[id]`

### Empty state:
- If no documents, show `<EmptyState icon={FileText} title="No documents yet" description="Upload your first warranty PDF to get started." action={{ label: "Upload PDF", href: "/upload" }} />`

### While loading: `<LoadingSkeleton type="row" count={5} />`

---

## 16. DOCUMENT STATUS BADGE (Updated)

Already covered in section 11.

---

## 17. DOCUMENT DETAIL PAGE — `src/app/(dashboard)/documents/[id]/page.tsx`

Two-column layout: PDF viewer (60%) + metadata panel (40%).

### PDF Viewer card:
- `border-radius: 12px, overflow: hidden`
- Card header: flex row with filename (truncated, `text-sm font-semibold`) on left, a `Download` icon button on right
- Header background: `#F0F4F8`, padding `12px 16px`, border-bottom: `1px solid #D1DCE8`
- `<iframe>` below: `width: "100%", height: 560, border: "none"`

### Metadata Panel:
- Top: `<StatusPipeline currentStatus={document.processingStatus} />` — the horizontal pipeline
- Section heading: `"Extracted Metadata"` in `text-sm font-semibold text-[#0A1628]`, with a border-bottom `1px solid #D1DCE8` below it
- Each field as a row: `display: flex, justifyContent: "space-between", alignItems: "center", padding: "10px 0", borderBottom: "1px solid #F0F4F8"`
  - Label: `text-sm font-medium text-[#7A92A8]`
  - Value: `text-sm font-medium text-[#0A1628]`
- Fields to show: Make, Model, Year, Warranty Type, Country
- Then: `"Confidence"` label with `<ConfidenceGauge>` as the value
- Then: `"Status"` label with `<DocumentStatusBadge>` as the value
- If `metadataJson?.coverage_components` exists and has items: a subsection `"Coverage Components"` with a bulleted list (each item has a small orange circle dot on the left)
- If `metadataJson?.exclusions` exists: a subsection `"Exclusions"` with a red-tinted list (use `#FEF2F2` background per item, `#DC2626` dot)
- At the bottom: A collapsible `"Full JSON"` section. Collapsed by default. When expanded shows `<pre>` with the JSON. Toggle with a chevron button.

---

## 18. METADATA EDITOR — `src/components/MetadataEditor.tsx`

Redesign to be a proper form that calls `PATCH /review/:id/metadata`.

```tsx
"use client";

import { useState } from "react";
import api from "../lib/api";

interface MetadataEditorProps {
  document: any;
  readOnly?: boolean; // if true, show values but no edit inputs
}

export default function MetadataEditor({ document, readOnly = false }: MetadataEditorProps) {
  const [make, setMake] = useState(document?.make || "");
  const [model, setModel] = useState(document?.model || "");
  const [year, setYear] = useState(String(document?.year || ""));
  const [warrantyType, setWarrantyType] = useState(document?.warrantyType || "");
  const [country, setCountry] = useState(document?.country || "");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  const inputStyle = {
    width: "100%",
    padding: "8px 12px",
    border: "1px solid #D1DCE8",
    borderRadius: 8,
    fontSize: 14,
    color: "#0A1628",
    outline: "none",
    fontFamily: "DM Sans, sans-serif",
    boxSizing: "border-box" as const,
  };

  const labelStyle = {
    display: "block" as const,
    fontSize: 12,
    fontWeight: 600,
    color: "#7A92A8",
    marginBottom: 6,
    textTransform: "uppercase" as const,
    letterSpacing: "0.04em",
  };

  const save = async () => {
    if (!document?.id) return;
    setSaving(true);
    setError("");
    setSaved(false);
    try {
      await api.patch(`/review/${document.id}/metadata`, {
        make: make || undefined,
        model: model || undefined,
        year: year ? Number(year) : undefined,
        warrantyType: warrantyType || undefined,
        country: country || undefined,
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch {
      setError("Failed to save. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const fields = [
    { label: "Make", value: make, setter: setMake, placeholder: "e.g. Freightliner" },
    { label: "Model", value: model, setter: setModel, placeholder: "e.g. Cascadia" },
    { label: "Year", value: year, setter: setYear, placeholder: "e.g. 2023" },
    { label: "Warranty Type", value: warrantyType, setter: setWarrantyType, placeholder: "e.g. Powertrain" },
    { label: "Country", value: country, setter: setCountry, placeholder: "e.g. USA" },
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      {fields.map((f) => (
        <div key={f.label}>
          <label style={labelStyle}>{f.label}</label>
          {readOnly ? (
            <p style={{ fontSize: 14, color: "#0A1628", fontWeight: 500, padding: "4px 0" }}>
              {f.value || "—"}
            </p>
          ) : (
            <input
              style={inputStyle}
              value={f.value}
              onChange={(e) => f.setter(e.target.value)}
              placeholder={f.placeholder}
              onFocus={(e) => { e.target.style.borderColor = "#FF6200"; e.target.style.boxShadow = "0 0 0 3px #FFF0E6"; }}
              onBlur={(e) => { e.target.style.borderColor = "#D1DCE8"; e.target.style.boxShadow = "none"; }}
            />
          )}
        </div>
      ))}

      {!readOnly && (
        <div style={{ marginTop: 4 }}>
          {error && (
            <p style={{ fontSize: 13, color: "#DC2626", marginBottom: 8 }}>{error}</p>
          )}
          {saved && (
            <p style={{ fontSize: 13, color: "#16A34A", marginBottom: 8 }}>✓ Changes saved</p>
          )}
          <button
            onClick={save}
            disabled={saving}
            style={{
              width: "100%",
              padding: "10px",
              backgroundColor: saving ? "#E8EEF4" : "#FF6200",
              color: saving ? "#7A92A8" : "white",
              border: "none",
              borderRadius: 8,
              fontSize: 14,
              fontWeight: 600,
              cursor: saving ? "not-allowed" : "pointer",
              transition: "background-color 0.15s ease",
            }}
          >
            {saving ? "Saving..." : "Save Changes"}
          </button>
        </div>
      )}
    </div>
  );
}
```

---

## 19. UPLOAD PAGE — `src/components/UploadDropzone.tsx`

Redesign the dropzone component:

### Visual States:

**State 1 — No file selected (default):**
- Large bordered box: `border: "2px dashed #D1DCE8"`, `borderRadius: 16`, `padding: "48px 24px"`, `textAlign: "center"`, `backgroundColor: "#FAFBFC"`
- On hover of the box: `borderColor: "#FF6200"`, `backgroundColor: "#FFF0E6"` — add via onMouseEnter/Leave
- Inside: `UploadCloud` icon from lucide (48px, `#A8BCCF`)
- Text: `"Drag and drop your warranty PDF here"` — `text-sm font-medium text-[#3D5A80]`, margin top 12
- Separator: `"— or —"` in `text-xs text-[#7A92A8]`, margin top 8
- A styled browse button: `"Browse files"`, background `#F0F4F8`, border `1px solid #D1DCE8`, color `#0A1628`, padding `8px 20px`, borderRadius 8, fontSize 14
  - This button triggers the hidden `<input type="file">` via a ref

**State 2 — File selected, not yet uploaded:**
- The dashed box collapses to a smaller info bar
- Shows: PDF icon (`FileText` from lucide, 20px, `#FF6200`) + filename + file size formatted (e.g. "2.4 MB") + an X button to deselect
- Below: full-width orange button `"Upload PDF"` — same style as login button

**State 3 — Uploading:**
- The upload button changes to `"Processing..."` and is disabled
- Inside the button: a small spinning animation (CSS border spinner: `border: 2px solid rgba(255,255,255,0.3); border-top-color: white; border-radius: 50%; width: 14px; height: 14px; animation: spin 0.7s linear infinite`) — add `@keyframes spin` to globals.css

**State 4 — Success:**
- Green check circle (`CheckCircle` from lucide, 40px, `#16A34A`)
- `"Upload successful!"` in `text-base font-semibold text-[#16A34A]`
- Document ID shown in a `font-mono` box: gray background, border, rounded, shows the ID
- A `"View Document"` link button in orange

**State 5 — Error:**
- Red alert box: background `#FEF2F2`, border `1px solid #FCA5A5`, `AlertCircle` icon + error text
- `"Try Again"` button to reset state

Above the entire drop zone: an info banner:
- Background `#FFF0E6`, border `1px solid #FFD4B2`, borderRadius 8, padding `10px 16px`
- `Info` icon (16px, `#FF6200`) + text `"Upload warranty PDFs for AI processing. Text-based and scanned PDFs supported. Max 50MB."`

---

## 20. REVIEW QUEUE PAGE — `src/app/(dashboard)/review/page.tsx`

### Layout:
- Page title: `"Review Queue"` + orange pill badge with count of items
- A filter hint: `"Showing documents that require your action"`

### Each item (card, not a plain link):
Replace the simple link with a proper card:
- White card, `border-radius: 12px`, padding `16px`, hover effect
- **Left section:** PDF icon (`FileText`, 20px, `#FF6200`) + filename in `text-sm font-semibold` + upload date below in `text-xs text-[#7A92A8]`
- **Center section (pills):** Small gray metadata tags for Make, Model, Year:
  - Style: `backgroundColor: "#F0F4F8"`, `color: "#3D5A80"`, `fontSize: 12`, `padding: "3px 8px"`, `borderRadius: 6`, displayed as `inline-flex items-center gap-1`
  - Show `"—"` if not extracted yet
- **Right section:** `<DocumentStatusBadge status={item.finalStatus} />` + a `"Review"` button
  - Button: `backgroundColor: "#FF6200"`, white text, `padding: "6px 16px"`, `borderRadius: 8`, `fontSize: 13`, links to `/review/${item.documentId}`

### Empty state:
`<EmptyState icon={ClipboardCheck} title="No documents pending review" description="Documents will appear here once they are processed and ready." />`

---

## 21. REVIEW DETAIL PAGE — `src/app/(dashboard)/review/[id]/page.tsx`

This is the most important page. Read carefully.

### Layout: Two columns side by side
- Left column (55%): PDF viewer (same style as document detail — card with header)
- Right column (45%): Review form panel

### Status Banner (top of right column):
- A colored horizontal bar, `borderRadius: 8`, padding `10px 16px`, margin bottom 16
- Based on `state.finalStatus`:
  - `in_review`: background `#EFF6FF`, border `1px solid #BFDBFE`, text `"🔵 Awaiting Reviewer Approval"` — color `#1D4ED8`
  - `reviewer_approved`: background `#FFFBEB`, border `1px solid #FDE68A`, text `"🟡 Awaiting Admin Final Approval"` — color `#B45309`
  - `certified`: background `#F0FDF4`, border `1px solid #BBF7D0`, text `"✅ Document Certified"` — color `#15803D`
  - `rejected`: background `#FEF2F2`, border `1px solid #FCA5A5`, text `"❌ Document Rejected"` — color `#B91C1C`
- The text uses `text-sm font-semibold`

### Metadata Section (below banner):
- Heading `"Document Details"` in `text-xs font-bold text-[#7A92A8] uppercase tracking-wide mb-2`
- `<MetadataEditor document={document} readOnly={false} />` — the full editable form

### Review Actions Card (at the bottom of right column):
- Card with heading `"Review Actions"` in `text-sm font-semibold text-[#0A1628]`
- Comment textarea:
  - Label: `"Add a comment (optional)"`
  - Textarea: 3 rows, full width, same input styling as MetadataEditor fields, placeholder `"Describe your decision..."`
  - Store in local state `comment`
- Action buttons:
  - If `state.canReviewerApprove`: Show `"Approve as Reviewer"` button (full width, `#FF6200` background) + `"Reject"` button (full width, red outline: `border: "1px solid #DC2626"`, `color: "#DC2626"`, transparent background)
  - If `state.canAdminApprove`: Show `"Certify Document"` button (full width, `#16A34A` background) + `"Reject"` button
  - If certified or rejected: Show a disabled state message instead of buttons: `"No further actions available"` in gray text
  - Each action button must show a confirmation before executing: use `window.confirm("Are you sure?")` before calling the API
  - While action is in progress (`busy` state): button shows `"Processing..."` and is disabled
  - After successful action: show success message in green and refresh state

### Remove the raw JSON dump. Do not render `<pre>{JSON.stringify(document, null, 2)}</pre>` anywhere.

---

## 22. CHAT SESSIONS PAGE — `src/app/(dashboard)/chat/page.tsx`

Two-column layout.

### Left panel (session list, 30% width, max 300px):
- Heading `"Conversations"` + a `"New Chat"` button (icon: `Plus` from lucide, 14px + text, orange)
- Each session item:
  - Background white, hover `#F0F4F8`
  - Active session: left border `3px solid #FF6200`, background `#FFF0E6`
  - Session title: `text-sm font-medium text-[#0A1628]`, truncate
  - Last updated: `text-xs text-[#7A92A8]` relative time
  - Padding `12px 16px`
- Border right `1px solid #D1DCE8` separating list from chat area

### Right panel (70%):
- When no session selected: `<EmptyState icon={MessageCircle} title="Select a conversation" description="Choose from the list or start a new chat." />`

---

## 23. CHAT WINDOW — `src/components/ChatWindow.tsx`

### Overall layout:
- Full height: `height: "calc(100vh - 64px)"` (subtracts topbar height)
- Flex column: messages area (flex 1, scrollable) + input area (fixed at bottom)

### Message area:
- Overflow y auto
- Padding `16px`
- Background `#F0F4F8`

### Empty chat state (when no messages):
- Centered in the message area
- Orange shield icon (40px)
- `"Warranty AI"` in `text-lg font-bold text-[#0A1628]`
- `"Ask about warranty coverage for any certified vehicle"` in `text-sm text-[#7A92A8]`
- Three suggestion chips below, each is a clickable rounded pill:
  - `"Is the turbocharger covered on a 2023 Freightliner Cascadia?"`
  - `"What are the powertrain warranty limits?"`
  - `"Which components are excluded from coverage?"`
  - Chip style: `border: "1px solid #D1DCE8"`, `backgroundColor: "white"`, `color: "#0A1628"`, `padding: "8px 14px"`, `borderRadius: 99`, `fontSize: 13`, `cursor: pointer`
  - On click: fill the input with the chip text and immediately send

### Message bubbles (update `src/components/MessageBubble.tsx`):
- **User messages (role === "user"):**
  - Aligned RIGHT: `display: flex, justifyContent: "flex-end"`, margin bottom 16
  - Bubble: `backgroundColor: "#FF6200"`, `color: "white"`, `borderRadius: "18px 18px 4px 18px"`, `padding: "10px 14px"`, `maxWidth: "75%"`, `fontSize: 14`, `lineHeight: 1.6`
  - Small timestamp below: `text-[10px] text-[#7A92A8] text-right mt-1`

- **Assistant messages (role === "assistant"):**
  - Aligned LEFT: `display: flex, justifyContent: "flex-start", gap: 10`, margin bottom 4
  - A small avatar circle on the LEFT: 28x28, `backgroundColor: "#06101E"`, `borderRadius: "50%"`, containing `ShieldCheck` icon (14px, `#FF6200`)
  - Bubble: `backgroundColor: "white"`, `border: "1px solid #D1DCE8"`, `borderRadius: "18px 18px 18px 4px"`, `padding: "10px 14px"`, `maxWidth: "75%"`, `fontSize: 14`, `lineHeight: 1.6`, `color: "#0A1628"`
  - After the bubble text: `<ConfidenceGauge value={confidenceScore} />` — shown below the bubble text, inside the bubble
  - After the bubble: `<InlineEvidence evidence={evidenceJson} />` — shown below the bubble (outside), only if evidence exists

- **Animate each new message:** add `className="animate-slide-in"` to each message wrapper div

### Input area:
- Background white, `borderTop: "1px solid #D1DCE8"`, `padding: "12px 16px"`
- A `<textarea>` that auto-grows (max 4 rows)
  - Border `1px solid #D1DCE8`, borderRadius 12, padding `10px 14px`, fontSize 14, resize none
  - Placeholder: `"Ask about warranty coverage..."`
  - On focus: border color `#FF6200`, box-shadow `0 0 0 3px #FFF0E6`
  - On `Enter` key (without Shift): send the message
- Send button to the right of textarea:
  - 40px circle, `backgroundColor: "#FF6200"`, `borderRadius: "50%"`
  - Contains `ArrowUp` icon (18px, white) from lucide
  - Disabled when empty or sending: `backgroundColor: "#E8EEF4"`, icon color `#A8BCCF`

---

## 24. PROTECTED ROUTE — `src/components/ProtectedRoute.tsx`

Show a loading state instead of a blank flash:

```tsx
"use client";

import { ReactNode, useEffect, useState } from "react";
import { ShieldCheck } from "lucide-react";

export default function ProtectedRoute({ children }: { children: ReactNode }) {
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      window.location.href = "/";
    } else {
      setChecking(false);
    }
  }, []);

  if (checking) {
    return (
      <div style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "#F0F4F8",
      }}>
        <div style={{ textAlign: "center" }}>
          <div style={{
            width: 56,
            height: 56,
            backgroundColor: "#FF6200",
            borderRadius: 14,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            margin: "0 auto 16px",
          }}>
            <ShieldCheck size={28} color="white" />
          </div>
          <p style={{ fontSize: 14, color: "#7A92A8" }}>Checking credentials...</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
```

---

## 25. DASHBOARD LAYOUT — `src/app/(dashboard)/layout.tsx`

This connects the sidebar and topbar. Keep the logic identical, only update the layout:

```tsx
"use client";

import { ReactNode } from "react";
import Sidebar from "../../components/Sidebar";
import Topbar from "../../components/Topbar";
import ProtectedRoute from "../../components/ProtectedRoute";

export default function DashboardLayout({ children }: { children: ReactNode }) {
  return (
    <ProtectedRoute>
      <div style={{ display: "flex", minHeight: "100vh" }}>
        <Sidebar />
        <div style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0 }}>
          <Topbar />
          <main
            className="animate-page-in"
            style={{ flex: 1, padding: "24px", backgroundColor: "#F0F4F8" }}
          >
            {children}
          </main>
        </div>
      </div>
    </ProtectedRoute>
  );
}
```

---

## 26. GLOBALS.CSS ADDITION: Spinner Keyframe

Add this to the bottom of `globals.css` (the file already written in section 3A):

```css
@keyframes spin {
  to { transform: rotate(360deg); }
}
```

---

## 27. EXECUTION ORDER FOR CURSOR

Do these files in exactly this order. Do NOT skip steps. Verify visually after each group before proceeding.

**Group 1 — Foundation (do first, everything else depends on this):**
1. `frontend/package.json` — add `"lucide-react": "^0.460.0"` to dependencies, then run `npm install`
2. `src/app/globals.css` — full replacement (section 3A)
3. `frontend/tailwind.config.js` — full replacement (section 3B)
4. `src/app/layout.tsx` — full replacement (section 3C)

**Group 2 — Shell components:**
5. `src/components/Sidebar.tsx` — full replacement (section 4)
6. `src/components/Topbar.tsx` — full replacement (section 5)
7. `src/app/(dashboard)/layout.tsx` — full replacement (section 25)
8. `src/components/ProtectedRoute.tsx` — full replacement (section 24)

**Group 3 — Login:**
9. `src/app/page.tsx` — full replacement (section 6)

**Group 4 — Shared components (create all new files):**
10. `src/components/StatCard.tsx` — create new (section 7)
11. `src/components/EmptyState.tsx` — create new (section 8)
12. `src/components/LoadingSkeleton.tsx` — create new (section 9)
13. `src/components/StatusPipeline.tsx` — create new (section 10)
14. `src/components/DocumentStatusBadge.tsx` — full replacement (section 11)
15. `src/components/ConfidenceGauge.tsx` — create new (section 12)
16. `src/components/ConfidenceBadge.tsx` — update to re-export (section 12)
17. `src/components/InlineEvidence.tsx` — create new (section 13)
18. `src/components/MetadataEditor.tsx` — full replacement (section 18)

**Group 5 — Pages:**
19. `src/app/(dashboard)/dashboard/page.tsx` — full replacement (section 14)
20. `src/app/(dashboard)/documents/page.tsx` — full replacement (section 15)
21. `src/app/(dashboard)/documents/[id]/page.tsx` — full replacement (section 17)
22. `src/app/(dashboard)/review/page.tsx` — full replacement (section 20)
23. `src/app/(dashboard)/review/[id]/page.tsx` — full replacement (section 21)
24. `src/app/(dashboard)/chat/page.tsx` — full replacement (section 22)

**Group 6 — Chat components:**
25. `src/components/MessageBubble.tsx` — full replacement (section 23)
26. `src/components/ChatWindow.tsx` — full replacement (section 23)
27. `src/app/(dashboard)/chat/[sessionId]/page.tsx` — update to use new ChatWindow

**Group 7 — Upload:**
28. `src/components/UploadDropzone.tsx` — full replacement (section 19)
29. `src/app/(dashboard)/upload/page.tsx` — minimal wrapper (just renders `<UploadDropzone />`)

---

## 28. QUICK REFERENCE: COLOR CHEAT SHEET FOR CURSOR

When in doubt, use these:

| What | Color |
|------|-------|
| Primary CTA button background | `#FF6200` |
| Primary CTA button hover | `#E05500` |
| Sidebar background | `#06101E` |
| Sidebar hover item | `#0D1B2E` |
| Sidebar active item | `#1A2B42` |
| Active item left border | `#FF6200` (3px) |
| Page background (canvas) | `#F0F4F8` |
| Card / panel background | `#FFFFFF` |
| Card border | `#D1DCE8` |
| Card border hover | `#A8BCCF` |
| Primary text | `#0A1628` |
| Secondary text | `#3D5A80` |
| Muted text | `#7A92A8` |
| Sidebar text (unselected) | `#8BAABF` |
| Sidebar text (selected) | `#FFFFFF` |
| Orange light bg (for tinted areas) | `#FFF0E6` |
| Orange text on white | `#C24A00` |
| Success green | `#16A34A` |
| Warning amber | `#D97706` |
| Error red | `#DC2626` |
| Info blue | `#2563EB` |
| Purple (processing) | `#7C3AED` |
| Input focus ring | `0 0 0 3px #FFF0E6` with border `#FF6200` |

---

## 29. WHAT MUST NOT CHANGE

Do not modify these files under any circumstances:
- `src/lib/api.ts`
- `src/lib/auth.ts`
- `src/lib/types.ts`
- `src/hooks/useAuth.ts`
- `src/hooks/useChat.ts`
- `src/hooks/useDocuments.ts`
- All backend files
- All ai-service files
- `docker-compose.yml`
- Any `.env` files
- Database schemas

---

## 30. FINAL NOTES FOR CURSOR

- Every time you use an orange color in code, use the exact hex `#FF6200`. Do not approximate it with Tailwind classes like `orange-500` or `orange-600` — they are different values.
- Whenever you see a style referencing "teal" in the old code, replace it with `#FF6200`.
- All buttons that previously used `bg-slate-900` (black button) should now use `#FF6200` for primary actions. Keep `bg-slate-900` only for secondary/ghost buttons.
- The sidebar was white in the old code — it must now be `#06101E` (very dark navy).
- The page background was `#f8fafc` — it is now `#F0F4F8` (slightly bluer-gray).
- Every `focus:ring` that was previously teal/blue should now be orange: `focus:ring-[#FF6200]` or `box-shadow: "0 0 0 3px #FFF0E6"`.
- Import all icons from `"lucide-react"` not from any other icon library.
- Keep all TypeScript types from the existing hooks. Do not introduce new interfaces unless creating a new component file.
- If a component uses `api` from `"../lib/api"`, keep all existing API endpoint paths exactly the same. Only change the visual rendering of the returned data.