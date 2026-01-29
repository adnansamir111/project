# 🔧 CRITICAL FIXES IMPLEMENTATION GUIDE

## ✅ What Has Been Fixed So Far:

### 1. Registration Request System ✅
- ✅ Migration created (`019_registration_requests.sql`)
- ✅ API routes added to `apps/api/src/routes/orgs.ts`:
  - `POST /orgs/:orgId/request-join` - User submits request
  - `GET /orgs/:orgId/join-requests` - Organizer views pending requests
  - `POST /orgs/join-requests/:requestId/approve` - Organizer approves and gets token
  - `POST /orgs/join-requests/:requestId/reject` - Organizer rejects
  - `POST /orgs/complete-registration` - User completes with token

## 🚧 Still Need to Fix:

### 2. Role Switching Fix (CRITICAL)
**Problem:** Header shows "No Organizations" - cannot switch roles
**Location:** `apps/web/src/components/Layout.tsx`
**Fix:** Update `getUserOrganizations()` call and dropdown logic

### 3. Delete Election Feature
**Locations to update:**
- Add stored procedure `sp_delete_election` in new migration
- Add `DELETE /elections/:electionId` route in `apps/api/src/routes/elections.ts`
- Add delete button in `apps/web/src/pages/ElectionDetails.tsx`
- Add `electionsApi.delete()` method in `apps/web/src/lib/api.ts`

###4. Remove Organization Requirement from Dashboard
**Problem:** Dashboard requires selecting organization
**Fix:** Make dashboard work without organization selection - show global stats

### 5. Frontend API Client Updates
Need to add to `apps/web/src/lib/api.ts`:
```typescript
// Registration requests
requestToJoin: async (orgId: number, message?: string)
getJoinRequests: async (orgId: number)
approveJoinRequest: async (requestId: number)
rejectJoinRequest: async (requestId: number)
completeRegistration: async (token: string)
```

## 📋 NEW USER FLOW:

### Registration Request Flow:
1. **User browses organizations**
   - Goes to Organizations page
   - Clicks on an organization card
   
2. **User requests to join**
   - Clicks "Request to Join" button
   - Optionally adds message explaining why they want to join
   - System creates pending request

3. **Organizer reviews requests**
   - Goes to Organizer Dashboard
   - Sees "Pending Join Requests" section (NEW)
   - Reviews user details and message
   - Clicks "Approve" or "Reject"

4. **On approval - Organizer gets token**
   - System generates registration token
   - Shows token in modal with copy button
   - Organizer shares token with user (email/message)

5. **User completes registration**
   - User receives token from organizer
   - Goes to dashboard
   - Clicks "Complete Registration" (or modal shows automatically if they have pending approval)
   - Enters token
   - Becomes MEMBER of organization

## 🎨 UI COMPONENTS NEEDED:

### 1. Organizations Page (`Organizations.tsx`):
```tsx
- Show all organizations as cards
- Each card has "Request to Join" button
- Modal for entering join request message
```

### 2. Organizer Dashboard (`OrganizerDashboard.tsx`):
```tsx
// Add new section:
<PendingJoinRequests>
  - List of users requesting to join
  - Show username, email, message, date requested
  - Approve / Reject buttons per request
  - On approve: Show token modal with copy button
</PendingJoinRequests>
```

### 3. Voter Dashboard or Header Toast:
```tsx
// If user has approved request pending token:
<Toast>
  "Your join request was approved! Enter the token sent by the organizer"
  <Button>Complete Registration</Button>
</Toast>
```

### 4. Complete Registration Modal:
```tsx
<Modal>
  <Input placeholder="Enter registration token" />
  <Button>Complete Registration</Button>
</Modal>
```

## 🔧 CRITICAL LAYOUT FIX:

The "No Organizations" dropdown issue is in `apps/web/src/components/Layout.tsx`

Current problem likely:
```tsx
// WRONG - organizations array is empty or undefined
const organizations = [];
```

Fix needed:
```tsx
// Load organizations on component mount
useEffect(() => {
  loadUserOrganizations();
}, []);

const loadUserOrganizations = async () => {
  try {
    const orgs = await organizationsApi.getUserOrganizations();
    setOrganizations(orgs);
    
    // Set current org if none selected
    if (!currentOrganization && orgs.length > 0) {
      setCurrentOrganization(orgs[0]);
    }
  } catch (error) {
    console.error('Failed to load organizations:', error);
  }
};
```

## 📝 STEP-BY-STEP IMPLEMENTATION ORDER:

1. ✅ **Registration Request System - Backend** (DONE)
2. ⏭️ **Fix Layout.tsx** - Role switching (NEXT - CRITICAL)
3. ⏭️ **Add Delete Election** - Backend + Frontend
4. ⏭️ **Update API Client** - Add all new methods
5. ⏭️ **Update Organizations Page** - Add "Request to Join"
6. ⏭️ **Update Organizer Dashboard** - Add pending requests section
7. ⏭️ **Update Voter Dashboard** - Add complete registration
8. ⏭️ **Fix Dashboard** - Remove org requirement
9. ⏭️ **Test Everything** - End-to-end flow

## 🚨 PRIORITY ORDER (Most Critical First):

1. **FIX ROLE SWITCHING** (breaks basic navigation)
2. **ADD DELETE ELECTION** (user explicitly requested)
3. **COMPLETE REGISTRATION REQUEST UI** (new feature requested)
4. **FIX DASHBOARD ORG REQUIREMENT** (UX improvement)

Let me continue with these fixes now...
