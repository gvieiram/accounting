# F1a · PR5 — Client CRUD with Matriz/Filial + ViaCEP (v2)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the full Client CRUD: list with filters, create, edit, archive (soft-delete), with ViaCEP autofill and matriz/filial hierarchy. This version refines the Audit Log system to automatically capture context in Server Actions.

**Architecture:** Logic in `features/clients/`, UI in `app/admin/clients/`. Unified form for create/edit. Audit context extraction is moved to the core `auditLog` helper to keep actions clean. Matriz/filial validation ensures consistent CNPJ roots (8 digits).

**Tech Stack:** Next.js Server Actions & Components · Prisma · RHF + Zod · shadcn/ui · ViaCEP API.

---

## Phase A — Foundation & Refinements

### Task 1: Install shadcn primitives

**Files:**
- Create: `src/components/ui/command.tsx`
- Create: `src/components/ui/popover.tsx`
- Create: `src/components/ui/radio-group.tsx`

- [ ] **Step 1.1: Install via CLI**
- [ ] **Step 1.2: Commit**

---

### Task 2: Refine Audit Log context extraction

Simplify audit logging by allowing `extractRequestContext` to handle `Headers` (from `next/headers`) directly.

**Files:**
- Modify: `src/lib/audit/extract-request-context.ts`
- Modify: `src/lib/audit/log.ts`

- [ ] **Step 2.1: Update `extractRequestContext` to support Headers**
- [ ] **Step 2.2: Update `auditLog.write` to accept headers**
- [ ] **Step 2.3: Commit**

---

### Task 3: Expand Content Messages (Admin & Common)

**Files:**
- Modify: `src/content/messages/common.ts`
- Modify: `src/content/messages/admin.ts`

- [ ] **Step 3.1: Add client terms/masks to `common.ts`**
- [ ] **Step 3.2: Add `clients` and `enums` blocks to `admin.ts`**
- [ ] **Step 3.3: Commit**

---

### Task 4: ViaCEP Helper and Proxy

**Files:**
- Create: `src/lib/viacep.ts`
- Create: `src/app/api/viacep/[cep]/route.ts`
- Create: `src/lib/viacep.test.ts`

- [ ] **Step 4.1: Implement `lookupCep` in `src/lib/viacep.ts`**
- [ ] **Step 4.2: Implement the protected API route in `src/app/api/viacep/[cep]/route.ts`**
- [ ] **Step 4.3: Verify with tests**
- [ ] **Step 4.4: Commit**

---

## Phase B — Domain Logic

### Task 5: Constants & Utils

**Files:**
- Create: `src/features/clients/constants.ts`
- Create: `src/features/clients/utils.ts`
- Create: `src/features/clients/utils.test.ts`

- [ ] **Step 5.1: Define enums order and limits in `constants.ts`**
- [ ] **Step 5.2: Implement `cnpjRoot` and `computeDiff` in `utils.ts`**
- [ ] **Step 5.3: Commit**

---

### Task 6: Zod Schemas & Types

**Files:**
- Create: `src/features/clients/schemas.ts`
- Create: `src/features/clients/types.ts`
- Create: `src/features/clients/schemas.test.ts`

- [ ] **Step 6.1: Define `clientSchema` with `superRefine` for CPF/CNPJ and Matriz/Filial rules**
- [ ] **Step 6.2: Define list and filter types in `types.ts`**
- [ ] **Step 6.3: Commit**

---

### Task 7: Prisma Queries

**Files:**
- Create: `src/features/clients/queries.ts`
- Create: `src/features/clients/queries.test.ts`

- [ ] **Step 7.1: Implement `listClients` (with filters/search), `getClient`, and `listMatrizCandidates`**
- [ ] **Step 7.2: Commit**

---

### Task 8: Server Actions (Create/Update/Archive)

**Files:**
- Create: `src/features/clients/actions.ts`
- Create: `src/features/clients/actions.test.ts`

- [ ] **Step 8.1: Implement `createClientAction` with refined audit logging**
- [ ] **Step 8.2: Implement `updateClientAction` with `computeDiff` for the audit log**
- [ ] **Step 8.3: Implement `archiveClientAction` (soft-delete)**
- [ ] **Step 8.4: Commit**

---

## Phase C — UI Components

### Task 9: Specialized Inputs (`DocumentInput`, `AddressFields`)

**Files:**
- Create: `src/app/admin/clients/_components/document-input.tsx`
- Create: `src/app/admin/clients/_components/address-fields.tsx`

- [ ] **Step 9.1: Build `DocumentInput` with live masking**
- [ ] **Step 9.2: Build `AddressFields` with ViaCEP integration on CEP blur**
- [ ] **Step 9.3: Commit**

---

### Task 10: Parent Client Selector & Additional Contacts

**Files:**
- Create: `src/app/admin/clients/_components/parent-client-combobox.tsx`
- Create: `src/app/admin/clients/_components/additional-contacts-field.tsx`

- [ ] **Step 10.1: Build Combobox for Matriz selection (async search)**
- [ ] **Step 10.2: Build `useFieldArray` component for Additional Contacts (max 10)**
- [ ] **Step 10.3: Commit**

---

### Task 11: Unified Client Form

**Files:**
- Create: `src/app/admin/clients/_components/client-form.tsx`

- [ ] **Step 11.1: Assemble the sections into a single `ClientForm` (React Hook Form)**
- [ ] **Step 11.2: Commit**

---

## Phase D — Pages & Routing

### Task 12: List Page & Filters

**Files:**
- Create: `src/app/admin/clients/page.tsx`
- Create: `src/app/admin/clients/_components/clients-table.tsx`

- [ ] **Step 12.1: Build the main list page with search and status filters**
- [ ] **Step 12.2: Commit**

---

### Task 13: New & Edit Pages

**Files:**
- Create: `src/app/admin/clients/new/page.tsx`
- Create: `src/app/admin/clients/[id]/page.tsx`

- [ ] **Step 13.1: Build the 'New' page**
- [ ] **Step 13.2: Build the 'Edit' page with data fetching and breadcrumbs**
- [ ] **Step 13.3: Commit**

---

## Phase E — Final Verification

### Task 14: Robot Framework E2E Test

**Files:**
- Create: `tests/robot/admin/client_crud.robot`

- [ ] **Step 14.1: Write E2E flow: Create Matriz → Create Filial → Edit Matriz → Archive Filial**
- [ ] **Step 14.2: Run tests and ensure 100% PASS**
- [ ] **Step 14.3: Commit**
