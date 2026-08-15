# Admin Dashboard - Hardcoded Data Replacement Plan

## Overview
Replace all hardcoded/mock data in Admin.tsx dashboard with real dynamic data from API endpoints and Firestore listeners.

---

## Implementation Steps

### Step 1: Total Active Users System-wide
**Status:** �� Already Dynamic  
**Source:** `userStats` state from `/api/users` endpoint  
**Location:** Line 416  
**Current:** `userStats.total.toString()` with sub `+${userStats.students} students, +${userStats.teachers} teachers`  
**No changes needed.**

---

### Step 2: Server Status
**Status:** �� Already Dynamic  
**Source:** `serverStatus` state from `/api/status` endpoint  
**Location:** Line 417  
**Current:** Uses `serverOffline`, `serverStatus.uptimeSeconds`  
**No changes needed.**

---

### Step 3: Last Database Backup
**Status:** �� Already Dynamic  
**Source:** `backups[0]` from Firestore `onSnapshot` listener + `/api/backups` fallback  
**Location:** Lines 418-428  
**Current:** Uses `latest?.date`, `latest?.time`, `latest?.size`  
**No changes needed.**

---

### Step 4: Recent System Activities
**Status:** ��� Hardcoded  
**Location:** Lines 466-471 (hardcoded array of 5 objects)  
**Should Use:** `activities` state from Firestore `onSnapshot` (lines 190-203)  
**Data Structure:** `{ id, action, detail, user, status, createdAt }`  
**Fix:** Map `activities` array instead of hardcoded array

---

### Step 5: System Health Metrics
**Status:** ��� Hardcoded  
**Location:** Lines 490-493 (CPU 42%, Memory 67%, Storage 53%)  
**Should Use:** `serverStatus.health` from `/api/status`  
**Data Structure:** `{ cpu, memory, storage, storageMB }`  
**Fix:** Replace hardcoded percentages with `serverStatus.health.cpu`, `.memory`, `.storage`

---

### Step 6: User Distribution
**Status:** ��� Hardcoded  
**Location:** Lines 508-511 (1142 students, 142 teachers, 1 admin)  
**Should Use:** `userStats` state  
**Data Structure:** `{ total, students, teachers, admins }`  
**Fix:** Calculate counts and percentages from `userStats`

---

### Step 7: Recent System Activities Table (Extended)
**Status:** ��� Partially Hardcoded  
**Location:** Lines 465-480 (table body with hardcoded rows)  
**Should Use:** Same `activities` state as Step 4  
**Fix:** Replace entire table body with mapped `activities` array

---

## Data Sources Summary

| Endpoint/Listener | Data Provided | Used By |
|-------------------|---------------|---------|
| `/api/users` | All users with roles | Steps 1, 6 |
| `/api/status` | `{ uptimeSeconds, health: { cpu, memory, storage, storageMB }, nextBackupAt }` | Steps 2, 5 |
| Firestore `backups` collection | Backup records | Step 3 |
| Firestore `activities` collection | Activity logs | Steps 4, 7 |

---

## Implementation Order

1. Step 4 - Recent System Activities (replace hardcoded array)
2. Step 5 - System Health Metrics (use serverStatus.health)
3. Step 6 - User Distribution (calculate from userStats)
4. Step 7 - Activities Table (replace hardcoded table rows)

Steps 1-3 are already complete and working.