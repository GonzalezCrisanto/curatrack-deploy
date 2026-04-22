

## Dashboard fixes: Alertas Críticas height + collapsible Actividad Reciente

### 1. Alertas Críticas — auto-resize to content

The card looks "fixed height" because it's inside `<div className="grid lg:grid-cols-2 gap-6">` (line 342). CSS grid stretches both columns to the tallest item's height, so when Actividad Reciente is tall, Alertas inherits the same height with empty space below.

**Fix:** add `items-start` to that grid wrapper so each card hugs its own content.

```tsx
<div className="grid lg:grid-cols-2 gap-6 items-start">
```

No min-height / fixed height is set on the card itself, so this single change is enough.

### 2. Actividad Reciente — show 3 collapsed, expand on click

Convert `Dashboard` into using a small piece of state for expansion, and wrap the extra timeline items in a Radix `Collapsible` (already in `src/components/ui/collapsible.tsx`) so we get a smooth height animation via the existing `accordion-down` / `accordion-up` keyframes (defined in `tailwind.config.ts`).

**Implementation:**
- Add `import { useState } from 'react'` and `import { Collapsible, CollapsibleContent } from '@/components/ui/collapsible'`.
- Add `import { ChevronDown, ChevronUp } from 'lucide-react'` (alongside existing icons).
- Add state inside `Dashboard`: `const [showAllActivity, setShowAllActivity] = useState(false);`
- Split `recentEvolutions` rendering:
  - First 3 items render directly inside the `<ul>`.
  - Items 4+ render inside `<CollapsibleContent>` (still as `<li>`s within the same `<ul>` so the timeline line stays continuous).
  - Wrap the whole list in `<Collapsible open={showAllActivity} onOpenChange={setShowAllActivity}>`.
- Below the list, render a toggle button only when `recentEvolutions.length > 3`:

```tsx
{recentEvolutions.length > 3 && (
  <button
    type="button"
    onClick={() => setShowAllActivity(v => !v)}
    className="mt-3 ml-[-0.5rem] inline-flex items-center gap-1 font-body text-sm text-primary hover:underline"
  >
    {showAllActivity ? (
      <>Ver menos <ChevronUp className="h-3.5 w-3.5" /></>
    ) : (
      <>Ver toda la actividad <ChevronDown className="h-3.5 w-3.5" /></>
    )}
  </button>
)}
```

The Radix `CollapsibleContent` already uses `data-[state]` attributes that the existing Tailwind config animates with `accordion-down` / `accordion-up` (smooth height transition).

### Files to edit
- `src/pages/Dashboard.tsx` — both fixes.

No other files, no new dependencies, no data/model changes.

