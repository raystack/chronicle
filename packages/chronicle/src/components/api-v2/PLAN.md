# API Reference Page Redesign — TODO

## Context

Current `EndpointPage` combines read-only docs + editable "try it out" in one view. Redesign separates:
- **Overview page**: read-only, field names + types only
- **Playground dialog**: opens via navbar "Test request" button, all editable fields + live response
- **Navbar**: 3 action buttons (Test request, View documentation, Open in ChatGPT)

Build all new components from scratch in `components/api-v2/`. Old components stay untouched.

---

## Phase 1: Read-only API Overview

### TODO
- [ ] Create `api-overview.tsx` + `api-overview.module.css`
- [ ] Create `api-field-list.tsx` + `api-field-list.module.css`

### `ApiOverview` — main page component

Two-column grid layout:

**Left column:**
- Title (h1, `--rs-font-size-t3`)
- Description (secondary color text)
- Method badge + path + copy icon (no Send button)
- **Authorisations** section: `Badge(name)` + "String" type text
- **Query Parameters** section: per field `Badge(name)` + type + description, bottom border separator
- **Response** section: "Response" header + "application/json" + status dropdown (200), description ("OK"), fields same format, "Show child attributes" expandable for nested objects

**Right column:**
- Code snippet (cURL, Python, Go, TS) with language dropdown + copy
- Response JSON with status code tabs (200, 400, 404, 500) + copy

### `ApiFieldList` — read-only field display

Each field renders:
```
[Badge: field_name]  type_text
description (optional)
─── border-bottom ───
```

Nested objects: "Show child attributes" expandable row (bg secondary, border, chevron icon).

### Reuse (import):
- `MethodBadge` from `components/api/method-badge`
- `flattenSchema`, `generateExampleJson`, `SchemaField` from `lib/schema`

### Copy (internalize):
- `paramsToFields`, `getRequestBody`, `getResponseSections` helper functions from `endpoint-page.tsx`

---

## Phase 2: Playground Dialog

### TODO
- [ ] Create `playground-dialog.tsx` + `playground-dialog.module.css`
- [ ] Create `playground-field-row.tsx` + `playground-field-row.module.css`

### `PlaygroundDialog` — full editable playground

Uses Apsara `Dialog` (`open`/`onOpenChange` controlled, ~900px width).

**Structure:**
```
┌─ Action Nav ──────────────────────────────────────┐
│  [Breadcrumb: endpoint name]      [Reset] [Close] │
├─ Split panel (flex 1:1) ──────────────────────────┤
│ Left Panel          │ Right Panel                  │
│                     │                              │
│ "Test request" [JSON]│ "Response"     [Body ▾]     │
│ [All] [Auth] [Body] │ Status:200 | Time:987ms     │
│                     │ [Curl ▾]                     │
│ ┌Authorization  ▾┐  │                              │
│ │ Authorization   │  │ (code snippet w/ line nos)  │
│ │ [input field]   │  │                              │
│ ├Body        </> ▾┤  │                              │
│ │ Name [input]    │  │                              │
│ │ Description ... │  │                              │
│ │ Nested arrays   │  │                              │
│ └─────────────────┘  │                              │
├─ Bottom bar ──────────────────────────────────────┤
│  [POST badge] /v0/projects  [copy]     [Send ▶]   │
└───────────────────────────────────────────────────┘
```

**Action Nav:**
- Breadcrumb showing endpoint name (left)
- Reset icon button + Close (X) icon button (right)

**Left panel:**
- Tab bar: All | Auth | Body — plain underline tabs (active = border-bottom emphasis, not Apsara Tabs)
- Collapsible sections: gray bg header row (label + chevron), content below
- **Authorization section**: label "Authorization" + `InputField` (24px height, placeholder "Enter ID")
- **Body section**: header has label + JSON toggle (`</>` icon) + chevron
  - Each body field: label (11px medium) left, `InputField` right (168px width)
  - Nested arrays: dashed left border, indented children, add (+) / remove (X) / collapse (chevron) icons

**Right panel:**
- "Response" header + Body dropdown button
- Status bar (gray bg): `Status: {code}` (green) | separator | `Time: {ms}` (green) | Curl dropdown
- Code snippet: line numbers (gray, right-aligned) + response body (monospace, red/syntax colored)

**Bottom bar:**
- Rounded bordered container: Badge (method) + monospace path + copy icon
- "Send" button: `variant="solid" color="accent" size="small" trailingIcon={PlayIcon}`

**State** (all `useState` inside dialog):
- `customHeaders`, `headerValues`, `pathValues`, `queryValues`
- `bodyValues`, `bodyJsonStr` (two-way sync)
- `responseBody`, `loading`, `responseTime`
- `activeTab` (All/Auth/Body)
- `collapsedSections` (Set of section names)
- `jsonView` (boolean for body JSON toggle)

**Send handler:** POST to `/api/apis-proxy` with `{ specName, method, path, headers, body }`. Track response time.

### `PlaygroundFieldRow` — editable field row

Layout: `label (flex-1)  |  InputField (168px)`
- 11px medium font for label
- InputField 24px height, 12px font, placeholder text
- For nested: dashed left border, indented, X button to remove

---

## Phase 3: Navbar Action Buttons

### TODO
- [ ] Create `api-nav-actions.tsx` + `api-nav-actions.module.css`

### `ApiNavActions`

Renders 3 buttons + hosts `PlaygroundDialog`:

1. **Test request** — `Button variant="outline" color="neutral" size="small" leadingIcon={PlayIcon}` → opens playground dialog
2. **View documentation** — `Button variant="outline" color="neutral" size="small" leadingIcon={DocumentIcon}` → navigates to docs page
3. **Open in ChatGPT** — `Button variant="outline" color="neutral" size="small" leadingIcon={ChatGPTIcon} trailingIcon={ChevronDownIcon}` → dropdown menu with: Copy as MD, View MD, Open in ChatGPT, Open in Claude (same as existing `OpenInAI`)

Reads `apiOperation` from page context to pass to `PlaygroundDialog`.

Manages `playgroundOpen` state locally.

---

## Phase 4: Wire Together

### TODO
- [ ] Update `lib/page-context.tsx` — add `apiOperation` field
- [ ] Update `pages/ApiPage.tsx` — import `ApiOverview` instead of `EndpointPage`, set `apiOperation` in context
- [ ] Update `themes/default/Layout.tsx` — render `ApiNavActions` on API endpoint pages (when `apiOperation` exists in context)
- [ ] Create `components/api-v2/index.ts` — barrel exports

### `page-context.tsx` changes

Add to context type:
```ts
apiOperation?: {
  method: string
  path: string
  operation: OpenAPIV3.OperationObject
  serverUrl: string
  specName: string
  auth?: { type: string; header: string; placeholder?: string }
}
```

### `ApiPage.tsx` changes

```tsx
// Before: <EndpointPage method={...} path={...} ... />
// After:  set apiOperation in context + <ApiOverview method={...} path={...} ... />
```

### `Layout.tsx` changes

```tsx
// Line 193 area:
{apiOperation ? <ApiNavActions /> : <OpenInAI />}
```

---

## File Summary

| File | Action |
|------|--------|
| `components/api-v2/api-overview.tsx` | **NEW** |
| `components/api-v2/api-overview.module.css` | **NEW** |
| `components/api-v2/api-field-list.tsx` | **NEW** |
| `components/api-v2/api-field-list.module.css` | **NEW** |
| `components/api-v2/playground-dialog.tsx` | **NEW** |
| `components/api-v2/playground-dialog.module.css` | **NEW** |
| `components/api-v2/playground-field-row.tsx` | **NEW** |
| `components/api-v2/playground-field-row.module.css` | **NEW** |
| `components/api-v2/api-nav-actions.tsx` | **NEW** |
| `components/api-v2/api-nav-actions.module.css` | **NEW** |
| `components/api-v2/index.ts` | **NEW** |
| `lib/page-context.tsx` | Modify — add `apiOperation` |
| `pages/ApiPage.tsx` | Modify — use new components |
| `themes/default/Layout.tsx` | Modify — conditional navbar |

**Untouched**: all existing `components/api/` files.

---

## Verification

1. `bun run build:cli`
2. `bun run dev:examples:basic` → API reference pages
3. Overview page: read-only (Badge + type), two-column, no inputs
4. Navbar: 3 buttons on API endpoint pages
5. "Test request" → dialog opens with editable fields
6. Fill + Send → response shows (status, time, JSON)
7. Close → back to overview
8. "View documentation" + "Open in ChatGPT" work
9. Non-API pages: `<OpenInAI />` only
10. `bunx tsc --noEmit --project packages/chronicle/tsconfig.json` passes
