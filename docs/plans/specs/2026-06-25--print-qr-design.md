# Printable QR + Improved Confirmation — Design Spec

**Date:** 2026-06-25
**Goal:** Add printable QR code page and simplify driver confirmation message

---

## Changes

### 1. Print Page (`/print`)
- New route with clean white background
- Large QR code centered, fills page width
- Text below: "Scan to Check In"
- Print-optimized with `@media print` CSS
- No dashboard UI — just QR + text

### 2. Confirmation Message
- Simplified: green checkmark + "Done! Your name has been submitted"
- Stays on screen — driver closes tab when ready
- No auto-reset, no buttons

### 3. Dashboard Update
- Add "Print QR" link next to QR code
- Opens `/print` in new tab

## Files
- Create: `app/print/page.tsx`
- Modify: `app/scan/page.tsx`
- Modify: `app/page.tsx`
- Modify: `app/globals.css`
