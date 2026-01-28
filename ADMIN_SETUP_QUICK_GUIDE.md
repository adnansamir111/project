# 🔐 **Admin vs User - Quick Reference**

## ✅ **Migration 014 Applied Successfully!**

Your `user_accounts` table now has an `is_system_admin` column.

---

## 📊 **Your Actual Schema**

### **Tables:**
- `user_accounts` - User login accounts (NOT `users`!)
- `roles` - System-wide roles (USER, SUPER_ADMIN, ORG_ADMIN, OFFICER)
- `org_members` - Links users to organizations with roles (OWNER, ADMIN, MEMBER)
- `organizations` - Organizations (now with `status` column)

---

## 🎯 **Two Role Systems**

### **1. Organization Roles** (in `org_members` table)
Controls what you can do **within an organization**:
- **OWNER** 👑 - Full control
- **ADMIN** ⚡ - Manage elections, approve voters
- **MEMBER** 👤 - View and vote

**Example:** John is OWNER in University, ADMIN in CS Club

### **2. System Admin Flag** (in `user_accounts` table)
Controls what you can do **across the entire system**:
- **Regular User** (`is_system_admin = FALSE`) - Normal user
- **System Admin** (`is_system_admin = TRUE`) - Can approve organizations, manage system

**Example:** Alice is a System Admin who can approve new organizations

---

## 🚀 **How to Make Someone a System Admin**

### **Option 1: By User ID**
```sql
UPDATE user_accounts 
SET is_system_admin = TRUE 
WHERE user_id = 1;
```

### **Option 2: By Email**
```sql
UPDATE user_accounts 
SET is_system_admin = TRUE 
WHERE email = 'admin@example.com';
```

### **Option 3: By Username**
```sql
UPDATE user_accounts 
SET is_system_admin = TRUE 
WHERE username = 'admin';
```

### **Verify:**
```sql
SELECT user_id, username, email, is_system_admin 
FROM user_accounts 
WHERE is_system_admin = TRUE;
```

---

## 🔍 **Check Current Users**

```sql
-- See all users
SELECT user_id, username, email, is_system_admin, is_active
FROM user_accounts
ORDER BY user_id;

-- See only admins
SELECT user_id, username, email
FROM user_accounts
WHERE is_system_admin = TRUE;
```

---

## 💻 **Using in Code**

### **Backend (Check if user is system admin)**
```typescript
// In any route handler
const isAdmin = req.user.is_system_admin;

if (isAdmin) {
  // Allow admin-only action
}
```

### **Frontend (Show admin UI)**
```typescript
const { user } = useAuthStore();

if (user?.is_system_admin) {
  // Show admin panel link
  return <Link to="/admin">Admin Panel</Link>;
}
```

---

## 📋 **Next Steps**

### **1. Make Your First Admin** (Do this now!)
```sql
-- Connect to database
psql -U election_user -d election_db

-- Make yourself admin (replace with your email)
UPDATE user_accounts 
SET is_system_admin = TRUE 
WHERE email = 'your@email.com';

-- Verify
SELECT username, email, is_system_admin FROM user_accounts;
```

### **2. Update Login Endpoint**
The login endpoint needs to return `is_system_admin` in the response.

**File:** `apps/api/src/routes/auth.routes.ts`

Find the login endpoint and make sure it returns:
```typescript
{
  user_id: user.user_id,
  username: user.username,
  email: user.email,
  role_id: user.role_id,
  is_active: user.is_active,
  is_system_admin: user.is_system_admin || false  // ← Add this
}
```

### **3. Update Frontend User Type**
**File:** `apps/web/src/types/index.ts`

```typescript
export interface User {
    user_id: number;
    username: string;
    email: string;
    role_id: number;
    is_active: boolean;
    is_system_admin?: boolean;  // ← Add this
}
```

### **4. Show Admin Badge in UI**
**File:** `apps/web/src/components/Layout.tsx`

```tsx
{user?.is_system_admin && (
  <span className="px-2 py-1 bg-red-100 text-red-800 text-xs font-bold rounded ml-2">
    🛡️ SYSTEM ADMIN
  </span>
)}
```

---

## 🎯 **Permission Matrix**

| Action | Regular User | System Admin |
|--------|--------------|--------------|
| Create organization | ✅ | ✅ |
| Join organization | ✅ | ✅ |
| Vote in elections | ✅ | ✅ |
| **Approve organizations** | ❌ | ✅ |
| **Suspend organizations** | ❌ | ✅ |
| **View all users** | ❌ | ✅ |
| **System settings** | ❌ | ✅ |

---

## ✅ **What's Done**

✅ Migration 014 applied  
✅ `user_accounts.is_system_admin` column added  
✅ Function `is_system_admin(user_id)` created  
✅ Index for fast lookups created  

---

## 📝 **Summary**

**Your Schema:**
- Table: `user_accounts` (not `users`)
- New column: `is_system_admin` (BOOLEAN)
- Default: `FALSE` (regular user)

**To make admin:**
```sql
UPDATE user_accounts SET is_system_admin = TRUE WHERE email = 'you@example.com';
```

**To check in code:**
```typescript
if (user.is_system_admin) { /* admin stuff */ }
```

That's it! Simple and effective. 🚀
