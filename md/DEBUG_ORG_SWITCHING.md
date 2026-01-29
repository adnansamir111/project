# 🐛 Organization Switching Debug Guide

## Current Status
I've added comprehensive logging to help us identify why organization switching isn't working.

## How to Test

### Step 1: Open Browser Console
1. Open your browser (where the app is running)
2. Press `F12` to open Developer Tools
3. Go to the **Console** tab
4. Clear the console (click the 🚫 icon or press Ctrl+L)

### Step 2: Perform Organization Switch
1. Look at the organization dropdown in the top navigation
2. Note which organization is currently selected
3. Change the selection to "SUST (OWNER)"
4. **BEFORE the page reloads**, check the console logs

### Step 3: Check Console Logs
You should see logs like this:

```
🔄 switchOrganization called: { orgId: 10, availableOrgs: [...], targetOrg: {...} }
✅ Setting organization: { orgName: "SUST", role: "OWNER" }
```

### Step 4: After Page Reload
After the page reloads, check the console again. You should see:
```
📋 setUserOrganizations called with: [...]
🔍 Current organization before update: { id: 10, name: "SUST" }
🔍 Current role before update: "OWNER"
🔄 Updating current org data: { name: "SUST", role: "OWNER" }
✅ Updated current org role to: "OWNER"
```

## What to Look For

### ✅ Good Signs
- You see "✅ Setting organization" with the correct role
- After reload, you see "✅ Updated current org role to: OWNER"
- The role badge shows 👑 OWNER

### ❌ Bad Signs
- You see "❌ Organization not found in userOrganizations list!"
- After reload, the role shows "MEMBER" instead of "OWNER"
- The console shows a different role than expected

## Possible Issues & Fixes

### Issue 1: Organizations List is Empty
**Log shows:** `availableOrgs: []`
**Cause:** Organizations haven't loaded yet
**Fix:** Wait a moment for data to load before switching

### Issue 2: Wrong Role in Database
**Log shows:** `targetOrg: { role: "MEMBER" }` when you expect OWNER
**Cause:** Database has incorrect role
**Fix:** Check database directly with the debug script

### Issue 3: LocalStorage Corruption
**Log shows:** Correct role before reload, wrong after
**Cause:** LocalStorage has stale data
**Fix:** Clear browser storage:
1. F12 → Application tab (Chrome) or Storage tab (Firefox)
2. Find "Local Storage" → `http://localhost:5173`
3. Right-click → Clear
4. Refresh page

### Issue 4: Persist Timing
**No logs after reload**
**Cause:** State isn't being saved before reload
**Fix:** Already implemented 100ms delay

## Manual Database Check

Run this from the `apps/api` directory:
```bash
node debug_org_switch.js
```

This will show you exactly what roles are in the database.

## Quick Fix: Clear Everything

If nothing works, try this nuclear option:
1. **Clear browser cache and storage:**
   - Chrome: F12 → Application → Clear Storage → "Clear site data"
   - Firefox: F12 → Storage → Right-click "http://localhost:5173" → "Delete All"

2. **Logout and login again**
   - Click logout button
   - Login with your credentials
   - Organizations should load fresh

3. **Check database role:**
   ```bash
   cd apps/api
   node debug_org_switch.js
   ```

## Report Back
After testing, please share:
1. **Console logs** (copy/paste from browser console)
2. **What you see** in the role badge (👤 MEMBER or 👑 OWNER?)
3. **Selected organization** in dropdown
4. **Expected vs Actual** behavior

---

**Next Steps:** Once we see the console logs, we can identify exactly where the issue is and fix it definitively.
