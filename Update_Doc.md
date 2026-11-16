# PSP Rubber MES - Update Documentation

## Overview
This document summarizes all updates made to the PSP Rubber MES production-safe bug fixing and enhancement project.

---

## 1. Authentication Fix (HTTP 401 Resolution)

### Root Cause
Three issues caused HTTP 401 Unauthorized errors:
1. Dev mode created a fake token (`dev-mode-token`) instead of a real JWT
2. No `superadmin` user existed in the database
3. Port mismatch between frontend (3000) and API backend

### Changes
- **`web/src/contexts/auth-context.tsx`**: Dev mode now calls `POST /auth/login` with real credentials to obtain a valid JWT token instead of creating a fake token string
- **`web/.env.local`**: Added `NEXT_PUBLIC_DEVELOPMENT_MODE=true`, `NEXT_PUBLIC_API_URL=http://localhost:3001`, and dev credentials
- **`api/.env`**: Added `PORT=3001` for explicit API port configuration
- **Database**: Created `superadmin` user with role `SUPER_ADMIN`

### Verification
| Check | Result |
|-------|--------|
| Superadmin login | ✅ PASS |
| Valid JWT request (inward/outward) | ✅ PASS - 200 OK |
| Missing/invalid JWT | ✅ PASS - 401 |

---

## 2. Port Configuration

| Service | Port | Config |
|---------|------|--------|
| Web (Next.js) | 3000 | `web/package.json`: `"next dev"` (default) |
| API (NestJS) | 3001 | `api/.env`: `PORT=3001` |
| PLC Service | 3002 | `nx serve plc-service` |
| Frontend→API URL | `http://localhost:3001` | `web/.env.local`: `NEXT_PUBLIC_API_URL` |

### Files Changed
| File | Change |
|------|--------|
| `api/.env` | Added `PORT=3001` |
| `web/.env.local` | Set `NEXT_PUBLIC_API_URL=http://localhost:3001` |
| Root `package.json` | Added `"dev"` script with `concurrently`, added `concurrently` devDependency |

---

## 3. Inward Module Enhancements

### New Fields Added
Added to Inward Entry creation form and database:
- Material Number, GRN Number, GRN Date, Batch Date, Shelf Life, QC Date, Supplier Invoice Number, Invoice Date

### Files Changed
| File | Change |
|------|--------|
| `api/prisma/schema.prisma` | Added 9 new columns to `InwardEntry` model |
| `api/src/inward/dto/create-inward.dto.ts` | Added all new fields with validation |
| `api/src/inward/dto/update-inward.dto.ts` | Inherits new fields |
| `api/src/inward/inward.service.ts` | Updated create/update to handle new fields + activity logging |
| `api/src/inward/inward.controller.ts` | Added user info passing for activity logging |
| `api/src/inward/inward.module.ts` | Imported `ActivityLogModule` |
| `web/src/types/inward.ts` | Added all new fields to TypeScript types |
| `web/src/app/(dashboard)/inward/add/page.tsx` | New form fields, validation, summary display |
| `web/src/app/(dashboard)/inward/components/InwardDetailsModal.tsx` | Display new fields in details view |
| `web/src/app/(dashboard)/inward/components/EditInwardDrawer.tsx` | Edit all new fields |
| `web/src/app/(dashboard)/inward/components/QrPreviewModal.tsx` | New sticker format with "PREMIER SEALING PRODUCTS" header, all fields, QR code section |

### Verification
| Test | Result |
|------|--------|
| Create inward with all fields | ✅ PASS |
| QR code generation (multiple bags) | ✅ PASS |
| GRN consistency across bags | ✅ PASS |
| Inward listing after creation | ✅ PASS |
| Inventory sync | ✅ PASS |

---

## 4. History Module (Activity Log)

### Database
Created new `ActivityLog` model with:
- `id`, `moduleType`, `activityType`, `referenceId`, `bagNumber`, `qrId`, `grnNumber`, `binNumber`
- `userId`, `username`, `status`, `errorMessage`, `metadata` (JSON)
- `createdAt` timestamp
- Indexes on: `createdAt`, `moduleType`, `activityType`, `referenceId`, `userId`, `status`

### Backend APIs
| File | Description |
|------|-------------|
| `api/src/activity-log/activity-log.service.ts` | **NEW** - Service with list, filter, export methods |
| `api/src/activity-log/activity-log.controller.ts` | **NEW** - GET list and GET export endpoints |
| `api/src/activity-log/activity-log.module.ts` | **NEW** - Module definition |

### Frontend
| File | Description |
|------|-------------|
| `web/src/hooks/useHistory.ts` | **NEW** - Hook for fetching and exporting history |
| `web/src/app/(dashboard)/history/page.tsx` | **NEW** - Centralized history page with filters, data table, Excel/PDF export |
| `web/src/components/layout/Sidebar.tsx` | Added History menu item |
| `web/src/config/access-control.ts` | Added `history` module key to all roles |

---

## 5. All `.map()` Crashes Fixed

| File | Fix |
|------|-----|
| `web/src/hooks/useIngredients.ts` | Added `Array.isArray(res.data) ? res.data : []` validation |
| `web/src/hooks/useExecutionTracking.ts` | Added `Array.isArray` validation |
| `web/src/hooks/useBinStatus.ts` | Added `Array.isArray` validation |
| `web/src/hooks/useUnassignedIngredients.ts` | Added `Array.isArray` validation |
| `web/src/hooks/useInventory.ts` | Array validation |
| `web/src/hooks/useOutwards.ts` | Array validation |
| `web/src/app/(dashboard)/ingredients/page.tsx` | Added `Array.isArray` check + loading/error/empty states |
| `web/src/app/(dashboard)/ingredients/add/page.tsx` | Array validation |
| `web/src/app/(dashboard)/bins/components/BinTable.tsx` | Array validation |
| `web/src/app/(dashboard)/recipes/components/RecipeTable.tsx` | Array validation |
| `web/src/app/(dashboard)/weighing/hooks/useExecution.ts` | Array validation |

### React Hooks Order Fix
| File | Change |
|------|--------|
| `web/src/app/(dashboard)/inward/page.tsx` | All hooks moved before early returns |

### NaN Error Fix
| File | Change |
|------|--------|
| `web/src/app/(dashboard)/inward/page.tsx` | `?? 0` fallbacks on all quantity calculations |

---

## 6. Dev Mode Bypass Login
- **`web/src/contexts/auth-context.tsx`**: Auto-gets real JWT from API login instead of fake token
- **`web/src/app/login/page.tsx`**: Auto-redirects to dashboard when dev mode on
- **`web/src/lib/api.ts`**: Dev mode error handling

---

## 7. Requisition Module Enhancements

### Requirement 1: Material Dropdown in Add Requisition Form
Added material selection dropdown in `web/src/app/(dashboard)/requisition/page.tsx` that reuses the existing `useAvailableForOutward` hook from `web/src/hooks/useMaterialStock.ts`. Users can now:
- Select materials from existing inward entries with available stock
- See material name, supplier, bag weight, unit, and available bags
- Auto-populate bag weight and unit when a material is selected

### Requirement 2: Display All Requisition Records (Pending/Approved/Rejected)
Updated `web/src/app/(dashboard)/requisition/page.tsx` to display all requisition statuses:
- **Pending**: Awaiting approval
- **Approved**: Ready for outward creation
- **Rejected**: Declined requests
- **Fulfilled**: Linked to an outward

Each status has a colored badge for quick visual identification.

### Requirement 3: Accepted Requisition → Create Outward Integration

**Backend Changes:**
- `api/src/outward/outward.service.ts`: Added `createFromRequisition()` method that:
  - Validates the requisition is Approved
  - Validates the requisition isn't already linked to an outward
  - Checks available QR codes against requested bags
  - Creates outward entry with requisition data
  - Reserves QR codes for the outward
  - Links outward to requisition
  - Marks requisition as Fulfilled
  - Records activity log
- `api/src/outward/outward.controller.ts`: Added `POST /outward/from-requisition/:requisitionId` endpoint
- `api/src/requisition/requisition.service.ts` - Added `OutwardService` injection + auto-create outward in `approve()`
- `api/src/outward/outward.module.ts` - Added `exports: [OutwardService]`

**Frontend Changes:**
- `web/src/app/(dashboard)/requisition/page.tsx`: Added "Create Outward" button for approved requisitions

**Outward Page Requisition Approval Section:**
- `web/src/app/(dashboard)/outward/page.tsx`: Added requisition list with approve/reject buttons
- `web/src/hooks/useRequisition.ts`: Added `useRejectRequisition` hook

### Approval Workflow from Outward Page:
1. Navigate to `/outward`
2. Scroll to the "Pending Requisitions for Approval" section
3. Click **Approve** to approve a requisition (automatically creates outward)
4. Click **Reject** to reject a requisition (optional rejection reason)

### Requirement 4: Number of Bags Field + Automatic Quantity Calculation

**Frontend Changes (`web/src/app/(dashboard)/requisition/page.tsx`):**
- Added `numberOfBags` input field
- Added `bagWeight` input field (read-only, from inward record)
- `Required Quantity` is now read-only and auto-calculated: `bags × weightPerBag`
- Real-time calculation as user changes bag count or weight
- Available bags display with max limit validation

**Backend Changes:**
- `api/src/requisition/dto/create-requisition.dto.ts`: Added `numberOfBags` and `weightPerBag` fields
- `api/src/requisition/requisition.service.ts`: Auto-calculates `requiredQuantity` from `numberOfBags × weightPerBag` when bags are provided
- `api/src/prisma/schema.prisma`: Added `numberOfBags` (Int?) and `weightPerBag` (Float?) columns to `Requisition` model

### Bag Availability Validation:
- Frontend: Real-time validation preventing selection of more bags than available
- Backend: `createFromRequisition` validates available QR codes against required bags

---

## 8. Complete File Change Summary

### New Files Created
| File | Description |
|------|-------------|
| `api/src/utils/unit-conversion.ts` | Centralized unit conversion utility |
| `web/src/utils/unit-conversion.ts` | Frontend unit conversion utility |
| `api/scripts/migrate-units.ts` | Database migration script for unit conversion |
| `api/src/activity-log/activity-log.service.ts` | Activity logging service |
| `api/src/activity-log/activity-log.controller.ts` | Activity logging API controller |
| `api/src/activity-log/activity-log.module.ts` | Activity logging module |
| `api/src/requisition/dto/create-requisition.dto.ts` | Requisition DTO with new fields |
| `api/src/requisition/dto/update-requisition.dto.ts` | Requisition update DTO |
| `api/src/requisition/requisition.service.ts` | Updated requisition service |
| `api/src/requisition/requisition.controller.ts` | Updated requisition controller |
| `api/src/requisition/requisition.module.ts` | Updated requisition module |
| `web/src/app/(dashboard)/history/page.tsx` | New History page |
| `web/src/hooks/useHistory.ts` | History data hook |

### Modified Files
| File | Change |
|------|--------|
| `api/prisma/schema.prisma` | Added baseQuantity/baseUnit columns, ActivityLog model, Requisition new fields |
| `api/src/inward/inward.service.ts` | Base unit conversion in create/update |
| `api/src/inward/inward.controller.ts` | User info passing for activity logging |
| `api/src/outward/outward.service.ts` | Added createFromRequisition method |
| `api/src/outward/outward.controller.ts` | Added from-requisition endpoint |
| `api/src/app/app.module.ts` | Registered ActivityLogModule and RequisitionModule |
| `api/src/inward/inward.module.ts` | Added ActivityLogModule import |
| `web/src/app/(dashboard)/requisition/page.tsx` | Complete rewrite with new fields, material dropdown, bag calculation |
| `web/src/app/(dashboard)/outward/page.tsx` | Added requisition approval section with approve/reject buttons |
| `web/src/app/(dashboard)/outward-history/page.tsx` | Redirected to new history page |
| `web/src/app/(dashboard)/inward/components/QrPreviewModal.tsx` | Minimal label design with individual printing |
| `web/src/components/layout/Sidebar.tsx` | Added History menu item |
| `web/src/config/access-control.ts` | Added history module to access control |
| `web/src/app/(dashboard)/page.tsx` | Dashboard dynamic data |
| `web/src/hooks/useDashboard.ts` | New dashboard data hooks |
| `web/src/app/(dashboard)/ingredients/page.tsx` | Fixed `.map()` error + loading/error/empty states |
| `web/src/app/(dashboard)/ingredients/add/page.tsx` | Fixed `.map()` error |
| `web/src/app/(dashboard)/bins/components/BinTable.tsx` | Fixed `.map()` error |
| `web/src/app/(dashboard)/recipes/components/RecipeTable.tsx` | Fixed `.map()` error |
| `web/src/app/(dashboard)/weighing/hooks/useExecution.ts` | Fixed `.map()` error |
| `web/src/hooks/useIngredients.ts` | Array validation |
| `web/src/hooks/useExecutionTracking.ts` | Array validation |
| `web/src/hooks/useBinStatus.ts` | Array validation |
| `web/src/hooks/useUnassignedIngredients.ts` | Array validation |
| `web/src/hooks/useInventory.ts` | Array validation |
| `web/src/hooks/useOutwards.ts` | Array validation |
| `web/src/lib/api.ts` | API interceptor error handling |

### Database Changes
Added `baseQuantity` and `baseUnit` columns to:
- `InwardEntry`, `OutwardEntry`, `MaterialStock`, `StepIngredient`, `Requisition`
- `BinAssignment` (added `unit`, `baseUnit`, `baseMinQuantity`, `baseMaxQuantity`, `baseCurrentQuantity`)
- `ExecutionIngredient` (added `unit`, `baseUnit`, `baseExpectedQuantity`, `baseTolerance`, `baseActualQuantity`)

Added new `ActivityLog` table for audit trail.

Added `numberOfBags` and `weightPerBag` columns to `Requisition`.

### Database Migration
- Script: `api/scripts/migrate-units.ts` — Converts existing KG/Litre data to GRAM/ML base units
- All existing KG records multiplied by 1,000 → GRAM
- All existing Litre records multiplied by 1,000 → ML
- NOS records unchanged
- Migration is idempotent (checks `baseQuantity IS NULL` before converting)

### Verification
| Test | Result |
|------|--------|
| Superadmin login | ✅ PASS |
| Valid JWT request (inward/outward) | ✅ PASS - 200 OK |
| Missing/invalid JWT | ✅ PASS - 401 |
| Create inward with all fields | ✅ PASS |
| QR code generation | ✅ PASS |
| Inward listing refresh | ✅ PASS |
| Activity log recording | ✅ PASS |
| Inventory sync | ✅ PASS |
| Outward module | ✅ PASS |
| TypeScript (API) | ✅ 0 errors |
| TypeScript (Web) | ✅ Only pre-existing error |
| Approve requisition from outward page | ✅ PASS |
| Reject requisition from outward page | ✅ PASS |
| Auto-create outward from approved requisition | ✅ PASS |

### Run Command
```
cd D:\psp-production-deployment-main
npm run dev
```
Navigate to `http://localhost:3000` — direct superadmin access in dev mode.

### Pre-existing Issues (Not Fixed)

- `web/src/app/(dashboard)/recipes/components/StepList.tsx:153` — TypeScript error (`string | undefined` not assignable to `string`)
- PLC hardware not connected — PLC connection errors expected in development
