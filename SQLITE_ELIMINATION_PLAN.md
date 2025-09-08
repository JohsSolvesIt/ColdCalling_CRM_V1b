# SQLite Elimination Plan

## Overview
The CRM system currently has SQLite database logic that needs to be completely removed since the system no longer uses SQLite databases at all. This plan outlines all files and components that need to be updated.

## Files to Update

### 1. Server-Side Files

#### `/crm-app/server/index-broken.js`
- **Lines to Remove/Update:**
  - Line 25: `const smsService = new SMSService(); // Remove SQLite dependency`
  - Lines 377, 417, 443: SQLite database manager calls
  - Lines 804-806: SQLite-specific data retrieval logic
  - Line 994: `sqliteCount` references
- **Action:** Remove all SQLite manager references and database type checks

#### `/crm-app/server/package.json`
- **Line 23:** Remove `"sqlite3": "^5.1.7"` dependency
- **Action:** Remove SQLite3 package dependency

#### `/crm-app/server/smsService-backup.js` & `/crm-app/server/smsService-broken.js`
- **Lines:** Remove SQLite comments and references
- **Action:** Clean up comments referring to SQLite

#### `/crm-app/server/UnifiedDatabaseManager.js`
- **Line 506+:** Review `transformAgentToContact` method for SQLite references
- **Action:** Remove any SQLite-specific transformation logic

### 2. Client-Side Files

#### `/crm-app/client/src/App.js`
- **Line 59:** Remove "SQLite local database storage" comment
- **Lines 300, 554, 699, 718:** Remove SQLite-specific logic in data processing
- **Line 3678:** Remove SQLite storage documentation
- **Action:** Remove all SQLite references and conditional logic

#### `/crm-app/client/src/components/DatabaseManager.jsx`
- **Lines 194, 214:** Remove SQLite tabs and UI components
- **Lines 240+:** Remove SQLite database management functionality
- **Action:** Simplify to only handle Chrome Extension data source

#### `/crm-app/client/src/components/DatabaseManagerOld.jsx`
- **Lines 189+:** Remove entire SQLite database section
- **Action:** Remove SQLite database management UI

#### `/crm-app/client/src/components/DatabaseManagerNew.jsx`
- **Lines 143+:** Remove SQLite tabs and database creation
- **Action:** Remove SQLite functionality entirely

#### `/crm-app/client/src/services/api.js`
- **Lines 35+:** Remove database operations for SQLite
- **Lines 51+:** Remove `switchDatabase`, `createDatabase`, `renameDatabase`, `deleteDatabase` methods
- **Action:** Remove all SQLite database API calls

#### `/crm-app/client/src/components/CleanupModal.js`
- **Line 48:** Remove SQLite field detection logic
- **Action:** Simplify field detection without SQLite considerations

### 3. Package Files

#### `/crm-app/package.json`
- **Line 4:** Update description to remove SQLite reference
- **Line 30:** Remove `"sqlite3": "^5.1.6"` dependency
- **Line 36:** Remove `"sqlite"` keyword
- **Action:** Clean up package metadata

#### `/crm-app/server/package-lock.json`
- **Lines 20, 3397+:** Remove all SQLite3 package references
- **Action:** Remove SQLite3 from lock file (will be done automatically when removing from package.json)

## Implementation Steps

### Phase 1: Server Cleanup
1. Remove SQLite3 dependency from package.json files
2. Update server index files to remove SQLite logic
3. Clean up UnifiedDatabaseManager
4. Update SMS service files

### Phase 2: Client Cleanup
1. Update App.js to remove SQLite conditional logic
2. Simplify DatabaseManager components
3. Remove SQLite API methods
4. Update CleanupModal

### Phase 3: Testing
1. Test Chrome Extension data source functionality
2. Verify all SQLite references are removed
3. Ensure no broken imports or dependencies
4. Test tag functionality with Chrome Extension data

### Phase 4: Documentation
1. Update README files
2. Remove SQLite from documentation
3. Update help text in UI components

## Benefits After Elimination
- Simplified codebase
- Reduced dependencies
- Clearer data flow
- Better performance
- Easier maintenance

## Risk Assessment
- **Low Risk:** SQLite is not currently being used
- **Dependencies:** Ensure Chrome Extension data source works properly
- **Testing:** All functionality should continue to work with Chrome Extension data
