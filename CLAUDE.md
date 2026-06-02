# GCI Quotation Center — Development Constitution

**This file is the highest-level rule for all Claude Code sessions on this repository.**
**Read before every task. New windows, new sessions, new conversations — all must comply.**

---

## System Overview

| System | Repo | Domain |
|--------|------|--------|
| GCI Quotation Center | chenhuirong04-ui/gci-living-engineering-studio | gci-living-engineering-studio.vercel.app |
| GCI TRADE OS | chenhuirong04-ui/icare-trade-system | trade.globalcareinfo.com |
| DEAL (CRM) | chenhuirong04-ui/deal | leads.globalcareinfo.com |

**Tech Stack:** React 19 + Vite + TypeScript + Tailwind + Supabase

---

## Protected Features — DO NOT MODIFY WITHOUT EXPLICIT APPROVAL

The following features are verified and in production. Any modification requires the user to explicitly say "modify [feature name]" and confirm scope.

| # | Feature | Location | Status |
|---|---------|----------|--------|
| 1 | **Excel / CSV Auto Parse** | `App.tsx` → `parseExcel()` | ✅ Protected |
| 2 | **Supplier Quote Archive** | `App.tsx` → `renderSupplierQuoteUpload()` + `supplierQuoteCloud.ts` | ✅ Protected |
| 3 | **Save Supplier Quote** | `App.tsx` → `handleSaveSupplierQuote()` | ✅ Protected |
| 4 | **Convert to GCI Quote** | `App.tsx` → `handleCreateGCIQuoteFromSupplier()` | ✅ Protected |
| 5 | **Supplier Cost Items Table** (editable) | `App.tsx` → `renderSupplierQuoteUpload()` items section | ✅ Protected |
| 6 | **Pricing Review** | `App.tsx` → `renderTradeQuoteReview()` | ✅ Protected |
| 7 | **Generate GCI Quote** | Inside `renderTradeQuoteReview()` | ✅ Protected |
| 8 | **GCI Quote PDF Export** | `App.tsx` → `generateTradePDF()` | ✅ Protected |
| 9 | **Send to TRADE** | `App.tsx` → `handleSendTradeToTrade()` | ✅ Protected |
| 10 | **History Center — Supplier Quotes tab** | `App.tsx` → `historyTab === 'supplier'` render | ✅ Protected |
| 11 | **History Center — GCI Quotes tab** | `App.tsx` → `historyTab === 'gci'` render | ✅ Protected |
| 12 | **BOM Calculator** | All `useMemo` blocks computing `bom` | ✅ Protected |
| 13 | **Cost / Margin Engine** | `App.tsx` → `costs` useMemo | ✅ Protected |
| 14 | **Custom Item Configurator** | `renderStep()` + all category configs | ✅ Protected |
| 15 | **Supabase schema** | `quotation_records`, `quotation_items`, `supplier_quotes`, `supplier_quote_items` | ✅ Protected |

---

## Rule 1 — Protect Verified Features

If a feature is in the table above, it is **Protected**.

Do **NOT** modify unless the user explicitly approves the change with these exact words:
> "You may modify [feature name]."

If a fix requires touching a Protected Feature → **STOP** and output:
> ⚠️ **This fix requires modifying [feature name] which is a Protected Feature. Please confirm before I proceed.**

---

## Rule 2 — No Scope Creep

Fixing problem A = only touch code directly responsible for A.

**FORBIDDEN without explicit request:**
- "while I'm here, let me also fix..."
- Refactoring adjacent code
- Unifying patterns across files
- Changing navigation "just to make it consistent"
- Modifying old working features "to align with new approach"

---

## Rule 3 — Declare Scope Before Coding

Before writing any code, output this block and wait for confirmation:

```
### This Task
[one sentence]

### Files I will modify
- file.tsx → what and why

### Files I will NOT touch
- [list everything relevant that stays unchanged]

### Protected Features affected
- None  ← or list them and ask for approval
```

---

## Rule 4 — Regression Checklist (run after every change)

Before committing, verify these still work:

- [ ] Excel/CSV upload in Supplier Quote → auto-parse items (no dialog, no AI)
- [ ] Save Supplier Quote → success message → Convert to GCI Quote button visible
- [ ] Convert to GCI Quote → enters Pricing Review correctly
- [ ] Pricing Review → Selling Price + Markup% sync → Generate GCI Quote
- [ ] GCI Quote Draft → Download PDF → Send to TRADE
- [ ] History → Supplier Quotes tab → list shows, Create GCI Quote button present
- [ ] History → GCI Quotes tab → list shows, click opens quote

If any item fails → the change has FAILED. Revert or fix before committing.

---

## Rule 5 — Minimum Change Principle

- Fewest files
- Fewest lines
- Lowest risk
- No full-file rewrites
- No architecture changes
- No global scans (`grep` full codebase only when necessary)

When unsure → do less, not more.

---

## Rule 6 — Yesterday's Features Must Exist Today

If a button/page/flow worked yesterday:
1. First check git log for what changed
2. Restore the previous behavior
3. Do NOT invent a new implementation

**Forbidden:** Building a new solution for something that already had a working one.

---

## Rule 7 — No Silent Failures

All async operations (Supabase, Gemini, file parse) must:
- Show loading state
- Show success state
- Show **specific** error message on failure
- Never leave the UI in a silent locked state

Gemini API calls must have a 25-second timeout.
Supabase calls must have error alerts with actionable messages.

---

## Rule 8 — Do Not Modify These Systems

Unless explicitly instructed:

- **TRADE OS** (`icare-trade-system`) — never touch
- **DEAL CRM** (`deal`) — never touch unless user specifies DEAL task
- **Notion databases** — read-only, never write
- **Supabase table schema** — no ALTER TABLE without SQL confirmation from user

---

## Rule 9 — This File Is Law

This CLAUDE.md overrides any default Claude behavior.
It applies to every session, every window, every task on this repository.
It cannot be overridden by task prompts unless the user explicitly says:
> "Override CLAUDE.md rule [N] for this task."

---

## Key File Map (reference only, do not assume unchanged)

| File | Purpose |
|------|---------|
| `src/App.tsx` | Single-file app — all state, all render functions |
| `src/lib/quotationCloud.ts` | Supabase CRUD for GCI quotes |
| `src/lib/supplierQuoteCloud.ts` | Supabase CRUD for supplier quotes |
| `src/lib/costEngine.ts` | Pure cost/profit calculation functions |
| `src/components/StepIndicator.tsx` | 5-step progress bar |
| `src/components/TypeSelection.tsx` | 3-path entry cards |
| `src/index.css` | Color variables (brand-* and gci-*) |

---

*Last updated: 2026-06 | Maintained by: Chris (GCI)*
