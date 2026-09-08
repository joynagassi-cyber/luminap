/**
 * Lumina Migration Plan — Final Phase
 *
 * This plan orchestrates the remaining migration work for
 * Capability First architecture completion.
 *
 * Tasks are split into 4 parallel workstreams:
 * - Workstream A: Legacy cleanup (IndexedDB removal)
 * - Workstream B: Capability integration (store/page migration)
 * - Workstream C: Tests & validation
 * - Workstream D: Build fix & polish
 */

export const meta = {
  name: 'lumina-final-migration',
  description: 'Execute remaining capability migration work across 4 parallel workstreams',
  phases: [
    { title: 'Legacy Cleanup', detail: 'Migrate customFields.ts and formSystem.ts from IndexedDB to PowerSync' },
    { title: 'Capability Integration', detail: 'Migrate GroupDetail lifecycle, Relationship isMember, Resource Groups' },
    { title: 'Tests & Validation', detail: 'Write unit tests for all 5 capabilities + verify e2e tests' },
    { title: 'Build Fix & Polish', detail: 'Fix build, cleanup adapters/streams, simplify store' },
  ],
};

// ============================================================
// WORKSTREAM A: Legacy Cleanup
// ============================================================
phase('Legacy Cleanup — customFields + formSystem')

// --- customFields.ts migration ---
const customFieldsResult = await agent(
  `Migrate src/lib/customFields.ts from IndexedDB to PowerSync.

Current state: Uses IndexedDB via db.put/get/delete with StoreName.
Target: Use getPowerSyncDatabase().execute() instead.

Steps:
1. Read the current file to understand all IndexedDB calls
2. Create PS equivalents for each operation:
   - addCustomField → INSERT INTO custom_field_definitions
   - getCustomField → SELECT FROM custom_field_definitions WHERE id = ?
   - getAllCustomFields → SELECT FROM custom_field_definitions
   - updateCustomField → UPDATE custom_field_definitions
   - deleteCustomField → DELETE FROM custom_field_definitions WHERE id = ?
3. Add the missing PS functions to src/lib/dataLayer.ts:
   - addCustomFieldPS, getCustomFieldPS, getAllCustomFieldsPS, updateCustomFieldPS, deleteCustomFieldPS
4. Update customFields.ts to use these new functions
5. Run pnpm tsc --noEmit to verify
6. Report: what changed, how many lines, any issues

IMPORTANT: Do NOT change the public API of customFields.ts. Only change the implementation.`,
  { label: 'customFields migration' }
)

// --- formSystem.ts migration ---
const formSystemResult = await agent(
  `Migrate src/lib/formSystem.ts from IndexedDB to PowerSync.

Current state: Uses IndexedDB via db.put/get/delete with StoreName.
Target: Use getPowerSyncDatabase().execute() instead.

Steps:
1. Read the current file to understand all IndexedDB calls
2. Create PS equivalents for each operation:
   - form_definitions: add, get, list, update, delete
   - form_submissions: add, get, list, update
3. Add the missing PS functions to src/lib/dataLayer.ts:
   - addFormDefinitionPS, getFormDefinitionPS, listFormDefinitionsPS, updateFormDefinitionPS, deleteFormDefinitionPS
   - addFormSubmissionPS, getFormSubmissionPS, listFormSubmissionsPS, updateFormSubmissionPS
4. Update formSystem.ts to use these new functions
5. Run pnpm tsc --noEmit to verify
6. Report: what changed, how many lines, any issues

IMPORTANT: Do NOT change the public API. Only change the implementation.`,
  { label: 'formSystem migration' }
)

// ============================================================
// WORKSTREAM B: Capability Integration
// ============================================================
phase('Capability Integration — GroupDetail + Relationship')

// --- GroupDetail lifecycle migration ---
const groupDetailLifecycleResult = await agent(
  `Migrate src/pages/GroupDetail.tsx to use the Lifecycle capability for archive.

Current state (line 112):
  await archiveGroup(id!, 'Archive manuelle', 'local-user');

Target:
  await lifecycle.archive('Group', id!, 'Archive manuelle', 'local-user');

Steps:
1. Read src/pages/GroupDetail.tsx lines 108-115
2. Add import: import { lifecycle } from '@/capabilities/lifecycle'
3. Change the archiveGroup call to lifecycle.archive('Group', ...)
4. Run pnpm tsc --noEmit to verify
5. Report the change made`,
  { label: 'GroupDetail lifecycle migration' }
)

// --- Relationship isMember wiring ---
const relationshipIsMemberResult = await agent(
  `Wire relationship.isMember() into GroupDetail.tsx for duplicate detection.

Current state (line 119):
  const existing = groupMemberships.find((m: any) => m.member_id === selectedMemberId || m.memberId === selectedMemberId);
  if (existing) { setError('Ce membre est déjà dans le groupe'); return; }

Target: Use relationship.isMember() for the check.

Steps:
1. Read src/pages/GroupDetail.tsx lines 115-135
2. Add import: import { relationship } from '@/capabilities/relationship'
3. In handleAddMember, replace the synchronous check with an async call:
   const isMember = await relationship.isMember(id!, selectedMemberId);
   if (isMember) { setError('Ce membre est déjà dans le groupe'); return; }
4. Make handleAddMember async (it already is)
5. Run pnpm tsc --noEmit to verify
6. Report the change made`,
  { label: 'Relationship isMember wiring' }
)

// --- Resource list() in Groups.tsx ---
const groupsResourceResult = await agent(
  `Migrate src/pages/Groups.tsx to use resource.list() for active groups.

Current state:
  - Uses useOrgUnits() hook for org units (idb fallback)
  - Displays orgUnits.map(...) for the group list
  - The org_units table uses is_active column (not status)

Target:
  - Use resource.list('Role', { filter: [{ field: 'is_active', op: 'eq', value: 1 }] })
  - OR keep the current approach but add resource as a supplement

NOTE: org_units uses is_active (boolean) not status (string), so listArchived won't work directly.
      The best approach is to add a resource.list() call in useEffect to load active groups,
      keeping the current fallback as-is.

Steps:
1. Read src/pages/Groups.tsx to understand current data flow
2. Add import: import { resource } from '@/capabilities/resource'
3. In useEffect (or on mount), load active groups via resource.list
4. Keep the current useOrgUnits fallback for offline
5. Run pnpm tsc --noEmit to verify
6. Report what was done`,
  { label: 'Groups resource migration' }
)

// ============================================================
// WORKSTREAM C: Tests & Validation
// ============================================================
phase('Tests & Validation')

// --- Capability unit tests ---
const testsResult = await agent(
  `Write unit tests for all 5 capabilities.

Create src/capabilities/__tests__/ with test files:
1. workflow.test.ts — test transactionGuard, check(), transition()
2. lifecycle.test.ts — test archive(), restore(), listArchived()
3. relationship.test.ts — test addMembership(), removeMembership(), isMember()
4. resource.test.ts — test get(), list(), listArchived(), listByStatus()
5. security.test.ts — test hasPermission(), hasRole(), hasHigherOrEqualRole()

Use vitest (already configured). Each test file should:
- Test the core invariants
- Test edge cases
- Be mock-friendly (no real PS database needed)

Steps:
1. Check if vitest is configured: cat vitest.config.ts or package.json
2. Create the test directory and files
3. Write comprehensive tests for each capability
4. Run pnpm test to verify all tests pass
5. Report test coverage and any issues`,
  { label: 'capability unit tests' }
)

// --- E2E test verification ---
const e2eResult = await agent(
  `Run the existing e2e tests and verify they pass.

Tests are in e2e-tests/ directory:
- cloud-sync.spec.ts
- comprehensive-flow.spec.ts
- groups-events.spec.ts
- persistence.spec.ts
- simple-check.spec.ts

Steps:
1. Check what test runner is configured (playwright, vitest, etc.)
2. Run the test suite
3. Report pass/fail status for each test
4. If any fail, identify whether it's a regression from migration or pre-existing`,
  { label: 'e2e test verification' }
)

// ============================================================
// WORKSTREAM D: Build Fix & Polish
// ============================================================
phase('Build Fix & Polish')

// --- Build fix: mock onesignal-capacitor-plugin ---
const buildFixResult = await agent(
  `Fix the build failure caused by missing onesignal-capacitor-plugin.

Problem: src/lib/authOneSignal.ts imports from 'onesignal-capacitor-plugin'
which is not installed (it's a native Capacitor plugin, not available in web builds).

Solution options:
A. Create a mock module: src/lib/onesignal-mock.ts that provides stub implementations
   of OneSignal, OsNotificationClickEvent, NotificationReceivedEvent
   Then conditionally import based on build target
B. Wrap the import in a try-catch with graceful degradation
C. Add a vite resolve alias in vite.config.ts

Recommended: Create src/lib/onesignal-mock.ts and conditionally import.
This way the web build works while the Capacitor build uses the real plugin.

Steps:
1. Create src/lib/onesignal-mock.ts with stub implementations
2. Modify src/lib/authOneSignal.ts to use conditional import
3. Run pnpm build to verify it passes
4. Run pnpm tsc --noEmit to verify types
5. Report the fix applied`,
  { label: 'build fix' }
)

// --- Cleanup: remove stub comments, decide on adapters ---
const cleanupResult = await agent(
  `Clean up legacy artifacts from the migration.

Tasks:
1. Remove the dead checkPermission stub comment from src/lib/rbac.ts (line 35)
2. Review src/adapters/ — 5 adapters created but unused:
   - CaisseAdapter.ts, EventBudgetAdapter.ts, OrgUnitAdapter.ts
   - TransactionLegacyAdapter.ts, VersementLegacyAdapter.ts
   Option A: Keep them (they're ready for future use)
   Option B: Remove them (not needed yet)
   RECOMMENDATION: Keep them, add a comment noting they're PREPARED for migration
3. Review powersync/sync-config.yaml unused streams:
   edition3, profiles, form_definitions, form_submissions,
   custom_field_definitions, custom_field_values, report_definitions
   These are configured but may not have consumers yet.
   RECOMMENDATION: Keep them, they enable future features
4. Run pnpm tsc --noEmit to verify no regressions
5. Report what was cleaned up and what was kept with reasoning`,
  { label: 'cleanup legacy artifacts' }
)

// --- Store simplification ---
const storeSimplifyResult = await agent(
  `Analyze src/store/useLocalStore.ts for simplification opportunities.

Current state: 1117 lines, 42 async methods, 121 state handlers.

Look for:
1. Methods that have been fully migrated to capabilities (lifecycle, workflow, relationship)
   and could be deprecated or simplified
2. Dead code (methods no longer called from any page)
3. Redundant logic that duplicates capability behavior
4. Opportunities to extract small helpers

Do NOT refactor the entire store (that would be too large a change).
Focus on:
- Removing dead code
- Adding deprecation comments for migrated methods
- Adding a summary comment about capability delegation

Steps:
1. Read the store to identify opportunities
2. Make targeted simplifications (max 50 lines removed)
3. Run pnpm tsc --noEmit to verify
4. Report what was simplified and what was kept`,
  { label: 'store simplification' }
)

// ============================================================
// SYNTHESIS
// ============================================================
log('=== ALL WORKSTREAMS COMPLETE ===')

const summary = {
  legacyCleanup: { customFields: customFieldsResult, formSystem: formSystemResult },
  capabilityIntegration: { groupDetail: groupDetailLifecycleResult, relationship: relationshipIsMemberResult, groups: groupsResourceResult },
  tests: { unitTests: testsResult, e2e: e2eResult },
  buildFix: { fix: buildFixResult, cleanup: cleanupResult, store: storeSimplifyResult },
}

log(JSON.stringify(summary, null, 2))
