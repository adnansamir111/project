# 🔧 **Future-Proof Multi-Organization System**

## ✅ **What We're Building**

A complete system that handles:
1. Organization approval workflow
2. System admin role
3. Organization context switching UI
4. Role-based permissions
5. Clear UX for users in multiple organizations

---

## 📊 **Database Changes (Migration 013)**

### **New Table: `system_admins`**
```sql
CREATE TABLE system_admins (
    admin_id BIGSERIAL PRIMARY KEY,
    user_id BIGINT REFERENCES users(user_id),
    granted_by BIGINT REFERENCES users(user_id),
    granted_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    is_active BOOLEAN DEFAULT TRUE
);
```

### **New Column: `organizations.status`**
```sql
ALTER TABLE organizations 
ADD COLUMN status VARCHAR(20) DEFAULT 'ACTIVE'
CHECK (status IN ('PENDING', 'ACTIVE', 'SUSPENDED', 'ARCHIVED'));
```

### **New Functions**
- `is_system_admin(user_id)` - Check if user is system admin
- `sp_get_user_organizations(user_id)` - Get all orgs with user's role
- `sp_get_user_org_role(user_id, org_id)` - Get role in specific org

---

## 🎯 **Organization Status Flow**

```
User creates org
    ↓
Status: PENDING
    ↓
System Admin approves
    ↓
Status: ACTIVE
    ↓
Organization can run elections
```

**Status Values:**
- `PENDING` - Awaiting admin approval
- `ACTIVE` - Approved and active
- `SUSPENDED` - Temporarily blocked
- `ARCHIVED` - Soft-deleted

---

## 🚀 **Frontend Changes Needed**

### **1. Add Organization Selector (Component)**

Create `OrganizationSelector.tsx`:
```tsx
<select value={currentOrgId} onChange={handleOrgChange}>
  {userOrgs.map(org => (
    <option key={org.id} value={org.id}>
      {org.name} ({org.role})
    </option>
  ))}
</select>
```

### **2. Update Dashboard**

```tsx
// Show org-specific data
const Dashboard = () => {
  const { currentOrganization, userRoleInCurrentOrg } = useAuthStore();
  
  return (
    <div>
      <h1>Welcome to {currentOrganization.name}</h1>
      <Badge>Your Role: {userRoleInCurrentOrg}</Badge>
      
      {/* Org-specific stats */}
      <Stats organizationId={currentOrganization.id} />
      
      {/* Role-based actions */}
      {isOwnerOrAdmin(userRoleInCurrentOrg) && (
        <CreateElectionButton />
      )}
    </div>
  );
};
```

### **3. Role-Based UI**

```tsx
// Show/hide features based on role
const Actions = () => {
  const { userRoleInCurrentOrg } = useAuthStore();
  
  return (
    <>
      {/* Everyone can see */}
      <ViewElectionsButton />
      
      {/* Only OWNER/ADMIN */}
      {['OWNER', 'ADMIN'].includes(userRoleInCurrentOrg) && (
        <>
          <CreateElectionButton />
          <ApproveVotersButton />
        </>
      )}
      
      {/* Only OWNER */}
      {userRoleInCurrentOrg === 'OWNER' && (
        <ManageMembersButton />
      )}
    </>
  );
};
```

---

## 🎨 **UI Mockups**

### **Header with Org Selector**

```
┌─────────────────────────────────────────────────┐
│ [Logo] Election System                          │
│                                                  │
│ [🏢 University Student Council ▼] [Profile ▼]  │
│     └─ University (OWNER) ✓                     │
│     └─ CS Club (ADMIN)                          │
│     └─ Basketball (MEMBER)                      │
└─────────────────────────────────────────────────┘
```

### **Dashboard with Role Context**

```
┌─────────────────────────────────────────────────┐
│ Welcome back, John! 👋                          │
│ Managing: University Student Council            │
│ Your Role: OWNER 👑                             │
└─────────────────────────────────────────────────┘

┌──────────┐ ┌──────────┐ ┌──────────┐
│Elections │ │ Voters   │ │ Active   │
│    5     │ │   120    │ │    2     │
└──────────┘ └──────────┘ └──────────┘

Actions (Role: OWNER):
  [+ Create Election] [+ Add Members] [📊 View Reports]

Voter Status in University: APPROVED ✓
```

---

## 🔒 **Permission Matrix**

| Action | OWNER | ADMIN | MEMBER |
|--------|-------|-------|--------|
| View elections | ✅ | ✅ | ✅ |
| Create election | ✅ | ✅ | ❌ |
| Delete election | ✅ | ❌ | ❌ |
| Add members | ✅ | ✅ | ❌ |
| Remove members | ✅ | ❌ | ❌ |
| Approve voters | ✅ | ✅ | ❌ |
| Register as voter | ✅ | ✅ | ✅ |
| Cast vote | ✅ | ✅ | ✅ |
| View results | ✅ | ✅ | ✅ |

---

## 📋 **Implementation Checklist**

### **Database (Priority 1)**
- [x] Create migration file
- [ ] Run migration manually if script fails
- [ ] Verify tables created
- [ ] Test new functions

### **Backend API (Priority 2)**
- [ ] Add endpoint: `GET /users/organizations` (get user's orgs with roles)
- [ ] Add endpoint: `GET /organizations/:id/role` (get role in specific org)
- [ ] Update organization creation to return status
- [ ] Add system admin endpoints (approve/suspend orgs)

### **Frontend (Priority 3)**
- [ ] Create `OrganizationSelector` component
- [ ] Update `authStore` to include:
  - `currentOrganization`
  - `userRoleInCurrentOrg`
  - `userOrganizations[]`
- [ ] Add selector to Layout header
- [ ] Update Dashboard to show org-specific data
- [ ] Add role badges and indicators
- [ ] Implement role-based UI rendering

### **Testing (Priority 4)**
- [ ] Create test user in multiple orgs
- [ ] Test org switching
- [ ] Test role-based permissions
- [ ] Test voter status per org
- [ ] Test creating org with PENDING status

---

## 🎯 **Migration Instructions**

If the migration script fails, run manually:

```bash
# Connect to database
psql -U election_user -d election_db

## Run migration
\i db/migrations/013_org_approval_system_admin.sql

# Verify
\d organizations  -- Should show status column
\d system_admins  -- Should show table
SELECT * FROM roles WHERE role_name = 'SYSTEM_ADMIN';
```

---

## 🚀 **API Endpoints to Add**

### **Get User's Organizations**
```typescript
GET /users/me/organizations

Response:
{
  "organizations": [
    {
      "organization_id": 1,
      "organization_name": "University",
      "organization_status": "ACTIVE",
      "user_role": "OWNER",
      "joined_at": "2024-01-01"
    },
    {
      "organization_id": 2,
      "organization_name": "CS Club",
      "organization_status": "ACTIVE",
      "user_role": "ADMIN",
      "joined_at": "2024-01-15"
    }
  ]
}
```

### **Get Role in Organization**
```typescript
GET /organizations/:id/my-role

Response:
{
  "organization_id": 1,
  "role": "OWNER",
  "permissions": ["create_election", "add_members", "approve_voters"]
}
```

---

## ✨ **Benefits of This Design**

### **For Users**
✅ Clear which org they're working in
✅ Clear what their role is
✅ No confusion about permissions
✅ Easy to switch between orgs
✅ See voter status per org

### **For Developers**
✅ Clean separation of concerns
✅ Future-proof (supports unlimited orgs)
✅ Easy to add new roles
✅ Clear permission system
✅ Scalable architecture

### **For Admins**
✅ Control organization creation
✅ Prevent spam organizations
✅ Audit trail of org approvals
✅ Can suspend problematic orgs
✅ System-wide oversight

---

## 📊 **Next Steps**

1. **Manual Migration** (5 min)
   - Run SQL manually if script fails
   - Verify tables created

2. **API Updates** (30 min)
   - Add user organizations endpoint
   - Add role lookup endpoint

3. **Frontend Org Selector** (45 min)
   - Create selector component
   - Update auth store
   - Add to layout

4. **Dashboard Updates** (30 min)
   - Make org-aware
   - Add role badges
   - Role-based rendering

**Total Time: ~2 hours for complete implementation**

---

## 🎉 **Result**

A **production-ready, future-proof** system that:
- ✅ Handles users in multiple organizations
- ✅ Clear role context everywhere
- ✅ Organization approval workflow
- ✅ No confusion about permissions
- ✅ Scalable to enterprise level

**This design will not need major changes later!** 🚀
