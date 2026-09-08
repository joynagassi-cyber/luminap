/**
 * Lumina Final Migration — 4 Parallel Workstreams
 */

export const meta = {
  name: 'lumina-final-migration',
  description: 'Execute remaining migration work: IndexedDB cleanup, capability integration, tests, build fix',
  phases: [
    { title: 'Legacy Cleanup', detail: 'Migrate customFields + formSystem to PowerSync' },
    { title: 'Capability Integration', detail: 'GroupDetail lifecycle + Relationship isMember + Groups resource' },
    { title: 'Tests & Validation', detail: 'Unit tests for 5 capabilities + e2e verification' },
    { title: 'Build Fix & Polish', detail: 'Fix onesignal build + cleanup + store simplification' },
  ],
};

phase('Legacy Cleanup')

const customFieldsResult = await agent(
  `Migrate src/lib/customFields.ts from IndexedDB to PowerSync.

Current: Uses IndexedDB db.put/get/delete with StoreName cast.
Target: Use getPowerSyncDatabase().execute() instead.

Steps:
1. Read the file to understand all IndexedDB operations
2. Add PS functions to src/lib/dataLayer.ts for custom_field_definitions and custom_field_values
3. Update customFields.ts to use the new PS functions
4. Run: pnpm tsc --noEmit
5. Report: changes made, line counts, any issues`,
  { label: 'customFields → PS' }
)

const formSystemResult = await agent(
  `Migrate src/lib/formSystem.ts from IndexedDB to PowerSync.

Current: Uses IndexedDB db.put/get/delete with StoreName cast.
Target: Use getPowerSyncDatabase().execute() instead.

Steps:
1. Read the file to understand all IndexedDB operations
2. Add PS functions to src/lib/dataLayer.ts for form_definitions and form_submissions
3. Update formSystem.ts to use the new PS functions
4. Run: pnpm tsc --noEmit
5. Report: changes made, line counts, any issues`,
  { label: 'formSystem → PS' }
)

phase('Capability Integration')

const groupDetailResult = await agent(
  `Migrate src/pages/GroupDetail.tsx to use Lifecycle capability for archive.

Current (~line 112): await archiveGroup(id!, 'Archive manuelle', 'local-user');
Target: await lifecycle.archive('Group', id!, 'Archive manuelle', 'local-user');

Steps:
1. Read lines 108-115 of GroupDetail.tsx
2. Add import: import { lifecycle } from '@/capabilities/lifecycle'
3. Replace archiveGroup call with lifecycle.archive
4. Run: pnpm tsc --noEmit
5. Report the change`,
  { label: 'GroupDetail lifecycle' }
)

const relationshipResult = await agent(
  `Wire relationship.isMember() into GroupDetail.tsx for duplicate detection.

Current (~line 119): const existing = groupMemberships.find(...)
Target: const isMember = await relationship.isMember(id!, selectedMemberId);

Steps:
1. Read lines 115-135 of GroupDetail.tsx
2. Add import: import { relationship } from '@/capabilities/relationship'
3. Replace synchronous find with async isMember check
4. Run: pnpm tsc --noEmit
5. Report the change`,
  { label: 'Relationship isMember' }
)

const groupsResult = await agent(
  `Add Resource capability consumer to Groups.tsx for loading active groups.

Current: Uses useOrgUnits() hook only.
Target: Add resource.list('Role', {filter: [{field: 'is_active', op: 'eq', value: 1}]}) as primary with fallback.

Steps:
1. Read src/pages/Groups.tsx
2. Add import: import { resource } from '@/capabilities/resource'
3. Add useEffect to load active groups via resource
4. Keep useOrgUnits fallback
5. Run: pnpm tsc --noEmit
6. Report what was done`,
  { label: 'Groups resource' }
)

phase('Tests & Validation')

const testsResult = await agent(
  `Write unit tests for all 5 capabilities using vitest.

Create src/capabilities/__tests__/ with 5 test files:
1. workflow.test.ts — transactionGuard, check(), transition()
2. lifecycle.test.ts — archive(), restore(), listArchived()
3. relationship.test.ts — addMembership(), removeMembership(), isMember()
4. resource.test.ts — get(), list(), listArchived(), listByStatus()
5. security.test.ts — hasPermission(), hasRole(), hasHigherOrEqualRole()

Steps:
1. Check vitest config in package.json
2. Create test files with comprehensive tests
3. Run: pnpm test
4. Report pass/fail counts`,
  { label: 'capability unit tests' }
)

const e2eResult = await agent(
  `Run existing e2e tests and report results.

Tests in e2e-tests/ (5 files).

Steps:
1. Determine test runner
2. Run the test suite
3. Report pass/fail for each test file
4. Note any potential regressions`,
  { label: 'e2e verification' }
)

phase('Build Fix & Polish')

const buildFixResult = await agent(
  `Fix build failure: onesignal-capacitor-plugin not installed.

Problem: src/lib/authOneSignal.ts imports 'onesignal-capacitor-plugin'
which doesn't exist as an npm package.

Solution: Create src/lib/onesignal-mock.ts with stub implementations.

Steps:
1. Read src/lib/authOneSignal.ts
2. Create src/lib/onesignal-mock.ts exporting stubs
3. Update authOneSignal.ts to import from mock
4. Run: pnpm build
5. Run: pnpm tsc --noEmit
6. Report the fix`,
  { label: 'build fix' }
)

const cleanupResult = await agent(
  `Clean up legacy artifacts.

Tasks:
1. Remove dead checkPermission stub comment from src/lib/rbac.ts
2. Add PREPARED comments to src/adapters/ files
3. Add PREPARED comments to unused streams in powersync/sync-config.yaml
4. Run: pnpm tsc --noEmit
5. Report what was cleaned`,
  { label: 'cleanup legacy' }
)

const storeResult = await agent(
  `Simplify src/store/useLocalStore.ts.

Current: 1117 lines. Target: ~900 lines.

Look for:
1. Methods fully migrated to capabilities — add deprecation comments
2. Dead code
3. Small helper extractions

Do NOT refactor the entire store. Max 200 lines removed.

Steps:
1. Read the store to identify opportunities
2. Make targeted simplifications
3. Run: pnpm tsc --noEmit
4. Report what was simplified`,
  { label: 'store simplification' }
)

log('=== ALL WORKSTREAMS COMPLETE ===')

log(JSON.stringify({
  legacyCleanup: { customFields: !!customFieldsResult, formSystem: !!formSystemResult },
  capabilityIntegration: { groupDetail: !!groupDetailResult, relationship: !!relationshipResult, groups: !!groupsResult },
  tests: { unitTests: !!testsResult, e2e: !!e2eResult },
  buildFix: { fix: !!buildFixResult, cleanup: !!cleanupResult, store: !!storeResult },
}, null, 2))
