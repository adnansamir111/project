# 🔐 **Superadmin Setup - Complete Guide**

## ✅ **Good News: First User is Auto-Admin!**

Migration 015 just ran successfully. Here's what it did:

**The first user who registered is now automatically a system admin!**

---

## 🎯 **How It Works**

### **Automatic (Migration 015)** ✅
```sql
-- The user with the lowest user_id is now a system admin
UPDATE user_accounts 
SET is_system_admin = TRUE 
WHERE user_id = (SELECT MIN(user_id) FROM user_accounts);
```

**Result:** Your first registered user is now a superadmin!

---

## 🔍 **Check Who Is Admin**

Run this to see who's the admin:

```sql
SELECT user_id, username, email, is_system_admin, created_at
FROM user_accounts
ORDER BY user_id;
```

---

## 🚀 **Three Ways to Make Superadmins**

### **Method 1: Automatic** ✅ (Already Done!)
- First user is automatically admin
- No manual work needed
- Already applied by migration 015

### **Method 2: Manual SQL** (For additional admins)
```sql
-- By email
UPDATE user_accounts 
SET is_system_admin = TRUE 
WHERE email = 'newadmin@example.com';

-- By username
UPDATE user_accounts 
SET is_system_admin = TRUE 
WHERE username = 'john';

-- By user_id
UPDATE user_accounts 
SET is_system_admin = TRUE 
WHERE user_id = 5;
```

### **Method 3: API Endpoint** (Future - Best!)
Create an admin-only endpoint where existing admins can promote users:

```typescript
// POST /admin/users/:userId/promote
// Requires: Current user must be system admin
router.post('/admin/users/:userId/promote', 
  authMiddleware, 
  requireSystemAdmin, 
  async (req, res) => {
    const { userId } = req.params;
    
    await pool.query(
      'UPDATE user_accounts SET is_system_admin = TRUE WHERE user_id = $1',
      [userId]
    );
    
    res.json({ ok: true, message: 'User promoted to system admin' });
  }
);
```

---

## 📊 **Current Status**

### **What Happened:**
1. ✅ Migration 014: Added `is_system_admin` column
2. ✅ Migration 015: Made first user a system admin
3. ✅ Your first registered user is now a superadmin!

### **Who Is Admin:**
Run this query to find out:
```sql
SELECT username, email 
FROM user_accounts 
WHERE is_system_admin = TRUE;
```

---

## 🎯 **Typical Workflow**

### **Initial Setup (Done!):**
```
1. First user registers → Automatically becomes admin
2. Admin can now approve organizations
3. Admin can promote other users to admin
```

### **Adding More Admins:**
```
Option A: Admin uses SQL
  └─ UPDATE user_accounts SET is_system_admin = TRUE WHERE email = '...'

Option B: Admin uses UI (when you build it)
  └─ Admin Panel → Users → Click "Make Admin" button
```

---

## 🛠️ **Building Admin Promotion UI** (Future)

### **Backend Endpoint:**
```typescript
// apps/api/src/routes/admin.ts
import { Router } from 'express';
import { pool } from '../db';
import { authMiddleware } from '../middleware/auth';

const router = Router();

// Middleware to check system admin
const requireSystemAdmin = (req, res, next) => {
  if (!req.user?.is_system_admin) {
    return res.status(403).json({ 
      ok: false, 
      error: 'System admin privileges required' 
    });
  }
  next();
};

// Promote user to admin
router.post('/users/:userId/promote', 
  authMiddleware, 
  requireSystemAdmin, 
  async (req, res) => {
    try {
      const userId = parseInt(req.params.userId);
      
      await pool.query(
        'UPDATE user_accounts SET is_system_admin = TRUE WHERE user_id = $1',
        [userId]
      );
      
      res.json({ ok: true, message: 'User promoted to system admin' });
    } catch (error) {
      res.status(500).json({ ok: false, error: error.message });
    }
  }
);

// Demote user from admin
router.post('/users/:userId/demote', 
  authMiddleware, 
  requireSystemAdmin, 
  async (req, res) => {
    try {
      const userId = parseInt(req.params.userId);
      
      // Don't allow demoting yourself
      if (userId === req.user.user_id) {
        return res.status(400).json({ 
          ok: false, 
          error: 'Cannot demote yourself' 
        });
      }
      
      await pool.query(
        'UPDATE user_accounts SET is_system_admin = FALSE WHERE user_id = $1',
        [userId]
      );
      
      res.json({ ok: true, message: 'User demoted from system admin' });
    } catch (error) {
      res.status(500).json({ ok: false, error: error.message });
    }
  }
);

// List all users (admin only)
router.get('/users', 
  authMiddleware, 
  requireSystemAdmin, 
  async (req, res) => {
    try {
      const { rows } = await pool.query(`
        SELECT 
          user_id, 
          username, 
          email, 
          is_system_admin, 
          is_active,
          created_at
        FROM user_accounts
        ORDER BY created_at DESC
      `);
      
      res.json({ ok: true, users: rows });
    } catch (error) {
      res.status(500).json({ ok: false, error: error.message });
    }
  }
);

export default router;
```

### **Frontend Admin Panel:**
```tsx
// apps/web/src/pages/AdminPanel.tsx
import { useState, useEffect } from 'react';
import { Shield, ShieldOff } from 'lucide-react';
import toast from 'react-hot-toast';

export default function AdminPanel() {
  const [users, setUsers] = useState([]);
  
  useEffect(() => {
    loadUsers();
  }, []);
  
  const loadUsers = async () => {
    const response = await fetch('/api/admin/users', {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('accessToken')}`
      }
    });
    const data = await response.json();
    setUsers(data.users);
  };
  
  const promoteUser = async (userId) => {
    try {
      await fetch(`/api/admin/users/${userId}/promote`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('accessToken')}`
        }
      });
      toast.success('User promoted to admin');
      loadUsers();
    } catch (error) {
      toast.error('Failed to promote user');
    }
  };
  
  const demoteUser = async (userId) => {
    try {
      await fetch(`/api/admin/users/${userId}/demote`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('accessToken')}`
        }
      });
      toast.success('User demoted from admin');
      loadUsers();
    } catch (error) {
      toast.error('Failed to demote user');
    }
  };
  
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">🛡️ System Administration</h1>
      
      <div className="card">
        <h2 className="text-xl font-semibold mb-4">User Management</h2>
        
        <table className="w-full">
          <thead>
            <tr className="border-b">
              <th className="text-left p-2">Username</th>
              <th className="text-left p-2">Email</th>
              <th className="text-left p-2">Status</th>
              <th className="text-left p-2">Actions</th>
            </tr>
          </thead>
          <tbody>
            {users.map(user => (
              <tr key={user.user_id} className="border-b">
                <td className="p-2">{user.username}</td>
                <td className="p-2">{user.email}</td>
                <td className="p-2">
                  {user.is_system_admin ? (
                    <span className="bg-red-100 text-red-800 px-2 py-1 rounded text-xs">
                      🛡️ ADMIN
                    </span>
                  ) : (
                    <span className="bg-gray-100 text-gray-800 px-2 py-1 rounded text-xs">
                      USER
                    </span>
                  )}
                </td>
                <td className="p-2">
                  {user.is_system_admin ? (
                    <button
                      onClick={() => demoteUser(user.user_id)}
                      className="text-sm text-red-600 hover:text-red-800"
                    >
                      <ShieldOff className="w-4 h-4 inline mr-1" />
                      Demote
                    </button>
                  ) : (
                    <button
                      onClick={() => promoteUser(user.user_id)}
                      className="text-sm text-green-600 hover:text-green-800"
                    >
                      <Shield className="w-4 h-4 inline mr-1" />
                      Promote
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
```

---

## 📋 **Quick Commands**

### **Check Current Admins:**
```sql
SELECT user_id, username, email, is_system_admin
FROM user_accounts
WHERE is_system_admin = TRUE;
```

### **Make Someone Admin:**
```sql
UPDATE user_accounts 
SET is_system_admin = TRUE 
WHERE email = 'newadmin@example.com';
```

### **Remove Admin:**
```sql
UPDATE user_accounts 
SET is_system_admin = FALSE 
WHERE email = 'oldadmin@example.com';
```

### **Count Admins:**
```sql
SELECT COUNT(*) as admin_count
FROM user_accounts
WHERE is_system_admin = TRUE;
```

---

## ✅ **Summary**

### **Question:** "Do I need to create superadmin manually?"

### **Answer:**
**No!** The first user is automatically a superadmin (migration 015).

**For additional admins:**
- **Now:** Use SQL to promote users
- **Later:** Build admin UI to promote users

**Current Status:**
- ✅ First user is automatically admin
- ✅ Can manually promote others via SQL
- ⏳ Can build UI for promoting users (optional)

---

## 🎯 **What You Should Do Now**

1. **Check who is admin:**
   ```sql
   SELECT username, email FROM user_accounts WHERE is_system_admin = TRUE;
   ```

2. **If you need more admins, use SQL:**
   ```sql
   UPDATE user_accounts SET is_system_admin = TRUE WHERE email = 'admin2@example.com';
   ```

3. **Later, build admin UI** (optional but nice to have)

---

**You're all set!** Your first user is already a superadmin. No manual work needed! 🎉
