# Device Recognition for Driver Check-In

**Date:** 2026-06-26
**Status:** Approved
**Feature:** Tie drivers to their devices to prevent fraud and enable seamless re-check-in

## Problem

Currently, any driver can check in with any name. There's no way to verify that the person entering "Mohammed" is the same person who checked in as "Mohammed" before. This allows fraud and duplicate check-ins.

## Solution

Bind each driver's check-in to their device using a unique token stored in `localStorage`. The device is locked to the driver's name — no one else can use that device, and that device can't use a different name.

## Rules

1. **First check-in:** Driver enters name → device token is generated and saved → check-in proceeds
2. **Device recognized + still in queue:** Skip name form → show queue position directly
3. **Device recognized + already checked out:** Show "Welcome back, [name]" with a "Re-Join Queue" button (one tap, no name re-entry)
4. **Wrong name on registered device:** Block with "This device is already registered to [name]"
5. **Manager clicks "Done":** Status changes to `checked_out` (not deleted) so device recognition still works
6. **localStorage cleared:** Driver loses recognition and enters name again as a first-time check-in — natural fallback

## Database Changes

Add `device_id` column to the `drivers` table:

```sql
ALTER TABLE drivers ADD COLUMN device_id TEXT;
```

- `device_id` is a random UUID generated on the client
- Stored in `localStorage` as `device_token_{office}`
- Sent with POST `/api/drivers` on check-in
- Used for lookups on subsequent visits

**No separate `devices` table needed.** The `drivers` table with `device_id` and `status` columns is sufficient.

## API Changes

### POST `/api/drivers`

**New field in request body:** `device_id` (string, required)

**Updated logic:**
1. Validate `name`, `office_id`, `device_id`
2. Check if `device_id` already exists for this office:
   - If exists with `status = 'waiting'` → return 409 with `{ error: 'already_in_queue', driver: {...} }` (client shows queue position)
   - If exists with `status = 'checked_out'` → update only `status` back to `waiting` (name stays immutable — device is locked to original name), return 200
   - If not exists → insert new row, return 201
3. If device exists but with a **different name** → return 409 with `{ error: 'device_mismatch', registered_name: '...' }`

### GET `/api/drivers`

**No changes.** Already returns all `waiting` drivers for the office.

### DELETE `/api/drivers?id=X`

**Change:** Instead of deleting the row, update `status` to `checked_out`:

```typescript
await supabase
  .from('drivers')
  .update({ status: 'checked_out' })
  .eq('id', parseInt(id))
  .eq('office_id', officeId);
```

### New: GET `/api/drivers/check-device?device_id=X&office=Y`

**Purpose:** Check if a device is registered and what its status is.

**Response:**
```json
// Not registered
{ "registered": false }

// Registered + in queue
{ "registered": true, "status": "waiting", "driver": { "id": 1, "name": "Mohammed", ... } }

// Registered + checked out
{ "registered": true, "status": "checked_out", "driver": { "id": 1, "name": "Mohammed", ... } }
```

## Client Changes

### `app/scan/page.tsx`

**On mount:**
1. Check localStorage for `device_token_{office}`
2. If found → call `GET /api/drivers/check-device`
3. Based on response:
   - `registered: false` → show name form
   - `registered: true, status: 'waiting'` → auto-submit, show queue position
   - `registered: true, status: 'checked_out'` → show "Welcome back" screen with "Re-Join Queue" button

**On submit:**
1. If no device token → generate UUID, save to localStorage
2. Send `{ name, office_id, device_id }` to POST `/api/drivers`
3. Handle responses:
   - 201 → success, show queue position
   - 409 `already_in_queue` → show queue position (use returned driver data)
   - 409 `device_mismatch` → show error "This device is already registered to [name]"

**"Re-Join Queue" button:**
- Sends POST with existing device_id and stored name
- Skips the name form entirely

### `app/page.tsx` (Dashboard)

**No changes needed.** The GET endpoint already filters by `status = 'waiting'`, so `checked_out` rows are automatically excluded from the dashboard. The "Done" button calls DELETE, which now soft-deletes (sets status to `checked_out`). The UI behavior is identical — drivers disappear from the list when "Done" is clicked.

## Cleanup

Checked_out records accumulate over time. Run a cleanup on each POST `/api/drivers`:

```sql
DELETE FROM drivers
WHERE status = 'checked_out'
AND scanned_at < NOW() - INTERVAL '24 hours';
```

**Trade-off:** After 24 hours, a returning driver loses device recognition and must enter their name again. This is acceptable — drivers who haven't returned in a day are unlikely to, and it keeps the table lean. If a driver returns after 24 hours, they simply go through the normal name entry flow.

## Files to Modify

| File | Change |
|------|--------|
| `app/scan/page.tsx` | Device token logic, welcome-back screen, device mismatch handling |
| `app/api/drivers/route.ts` | POST: accept device_id, handle device lookup; DELETE: soft-delete |
| `app/api/drivers/check-device/route.ts` | **New file** — device lookup endpoint |
| `lib/db.ts` | No changes needed |
| Supabase SQL | `ALTER TABLE drivers ADD COLUMN device_id TEXT;` |
