# Graph Report - lumina  (2026-09-09)

## Corpus Check
- 227 files · ~510,865 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 2115 nodes · 7963 edges · 18 communities detected
- Extraction: 90% EXTRACTED · 10% INFERRED · 0% AMBIGUOUS · INFERRED: 824 edges (avg confidence: 0.8)
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- [[_COMMUNITY_Community 0|Community 0]]
- [[_COMMUNITY_Community 1|Community 1]]
- [[_COMMUNITY_Community 2|Community 2]]
- [[_COMMUNITY_Community 3|Community 3]]
- [[_COMMUNITY_Community 4|Community 4]]
- [[_COMMUNITY_Community 5|Community 5]]
- [[_COMMUNITY_Community 6|Community 6]]
- [[_COMMUNITY_Community 7|Community 7]]
- [[_COMMUNITY_Community 8|Community 8]]
- [[_COMMUNITY_Community 9|Community 9]]
- [[_COMMUNITY_Community 10|Community 10]]
- [[_COMMUNITY_Community 11|Community 11]]
- [[_COMMUNITY_Community 12|Community 12]]
- [[_COMMUNITY_Community 13|Community 13]]
- [[_COMMUNITY_Community 16|Community 16]]
- [[_COMMUNITY_Community 20|Community 20]]
- [[_COMMUNITY_Community 21|Community 21]]
- [[_COMMUNITY_Community 22|Community 22]]

## God Nodes (most connected - your core abstractions)
1. `push()` - 216 edges
2. `join()` - 129 edges
3. `map()` - 122 edges
4. `x()` - 111 edges
5. `i()` - 83 edges
6. `G()` - 83 edges
7. `rw()` - 82 edges
8. `filter()` - 79 edges
9. `n()` - 74 edges
10. `t()` - 73 edges

## Surprising Connections (you probably didn't know these)
- `i()` --calls--> `s()`  [INFERRED]
  android\app\src\main\assets\public\assets\html2canvas-D6E2jxby.js → android\app\src\main\assets\public\assets\index-DUryz-dp.js
- `setTimeout()` --calls--> `handleSave()`  [INFERRED]
  android\app\src\main\assets\public\assets\index-DUryz-dp.js → src\pages\Settings.tsx
- `filter()` --calls--> `list()`  [INFERRED]
  android\app\src\main\assets\public\assets\index-DUryz-dp.js → src\capabilities\__tests__\lifecycle.test.ts
- `filter()` --calls--> `getAvailableTransitions()`  [INFERRED]
  android\app\src\main\assets\public\assets\index-DUryz-dp.js → src\templates\schema.ts
- `push()` --calls--> `write()`  [INFERRED]
  android\app\src\main\assets\public\assets\index-DUryz-dp.js → src\capabilities\__tests__\e2e.test.ts

## Communities

### Community 0 - "Community 0"
Cohesion: 0.01
Nodes (336): handleKey(), handleChange(), handleCreate(), handleDelete(), handleUpdate(), add(), addFrameDataToCanvas(), addObserver() (+328 more)

### Community 1 - "Community 1"
Cohesion: 0.01
Nodes (164): writeAudit(), CaisseAdapter, ChartStyle(), calculerDon(), calculerStatsCulte(), determinerStatutAvance(), isCulteVerrouille(), isPaiementVerrouille() (+156 more)

### Community 2 - "Community 2"
Cohesion: 0.03
Nodes (203): handleRestore(), r(), $(), a(), addBezierCurve(), addBoundingBox(), addMarker(), addMarkerAngle() (+195 more)

### Community 3 - "Community 3"
Cohesion: 0.04
Nodes (210): _(), a(), aj(), al(), am(), an(), Ap(), aR() (+202 more)

### Community 4 - "Community 4"
Cohesion: 0.02
Nodes (122): getAccountBalance(), archiveGroupWithState(), AppProvider(), asyncGetOrSet(), defaultTtl(), del(), get(), invalidate() (+114 more)

### Community 5 - "Community 5"
Cohesion: 0.05
Nodes (155): e(), i(), n(), SUPPORT_CORS_IMAGES(), SUPPORT_FOREIGNOBJECT_DRAWING(), SUPPORT_RANGE_BOUNDS(), SUPPORT_RESPONSE_TYPE(), SUPPORT_SVG_DRAWING() (+147 more)

### Community 6 - "Community 6"
Cohesion: 0.05
Nodes (107): Aa(), _acquireLock(), _adminDeletePasskey(), _adminListPasskeys(), _approveAuthorization(), _authenticate(), _autoRefreshTokenTick(), _callRefreshToken() (+99 more)

### Community 7 - "Community 7"
Cohesion: 0.05
Nodes (96): handleClick(), ManifestCompilerService, Ad(), aE(), Be(), Cd(), Ce(), componentDidCatch() (+88 more)

### Community 8 - "Community 8"
Cohesion: 0.09
Nodes (88): At(), bd(), bf(), bt(), cf(), _challenge(), cn(), createNewAbortSignal() (+80 more)

### Community 9 - "Community 9"
Cohesion: 0.07
Nodes (16): AuthService, handleCallback(), handleGoogleLogin(), handleLogin(), handleSignup(), handleDelete(), handleStatusChange(), eq() (+8 more)

### Community 10 - "Community 10"
Cohesion: 0.07
Nodes (10): OneSignalAuthService, disconnectPowerSync(), log(), parseJSON(), _terminateWorker(), initPowerSync(), NotificationCapability, getOneSignalService() (+2 more)

### Community 11 - "Community 11"
Cohesion: 0.18
Nodes (1): SecurityService

### Community 12 - "Community 12"
Cohesion: 0.33
Nodes (1): ConflictResolver

### Community 13 - "Community 13"
Cohesion: 0.47
Nodes (1): MainActivity

### Community 16 - "Community 16"
Cohesion: 0.5
Nodes (1): TransactionLegacyAdapter

### Community 20 - "Community 20"
Cohesion: 0.67
Nodes (1): ExampleInstrumentedTest

### Community 21 - "Community 21"
Cohesion: 0.67
Nodes (1): ExampleUnitTest

### Community 22 - "Community 22"
Cohesion: 1.0
Nodes (2): handleSave(), validate()

## Knowledge Gaps
- **1 isolated node(s):** `PolicyService`
  These have ≤1 connection - possible missing edges or undocumented components.
- **Thin community `Community 11`** (12 nodes): `SecurityService`, `.checkPermission()`, `.getRoleLabel()`, `.getRoleLabels()`, `.getRolePermissions()`, `.getRolesWithPermission()`, `.getSortedRoles()`, `.hasHigherOrEqualRole()`, `.hasPermission()`, `.hasRole()`, `.parseRole()`, `index.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 12`** (6 nodes): `ConflictResolver`, `.getStrategy()`, `.hasConflict()`, `.resolveLastWriteWins()`, `.resolveServerWins()`, `conflicts.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 13`** (6 nodes): `MainActivity.java`, `MainActivity`, `.handleIntent()`, `.onActivityResult()`, `.onCreate()`, `.onNewIntent()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 16`** (4 nodes): `TransactionLegacyAdapter.ts`, `TransactionLegacyAdapter`, `.fromPowerSync()`, `.isLegacy()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 20`** (3 nodes): `ExampleInstrumentedTest.java`, `ExampleInstrumentedTest`, `.useAppContext()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 21`** (3 nodes): `ExampleUnitTest.java`, `ExampleUnitTest`, `.addition_isCorrect()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 22`** (3 nodes): `handleSave()`, `validate()`, `EventEdit.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `push()` connect `Community 7` to `Community 0`, `Community 1`, `Community 2`, `Community 3`, `Community 4`, `Community 5`, `Community 6`, `Community 8`, `Community 10`?**
  _High betweenness centrality (0.122) - this node is a cross-community bridge._
- **Why does `map()` connect `Community 1` to `Community 0`, `Community 2`, `Community 3`, `Community 4`, `Community 5`, `Community 6`, `Community 7`, `Community 8`?**
  _High betweenness centrality (0.069) - this node is a cross-community bridge._
- **Why does `log()` connect `Community 10` to `Community 0`, `Community 1`, `Community 3`, `Community 4`, `Community 5`, `Community 7`, `Community 8`?**
  _High betweenness centrality (0.068) - this node is a cross-community bridge._
- **Are the 58 inferred relationships involving `push()` (e.g. with `e()` and `setCurrent()`) actually correct?**
  _`push()` has 58 INFERRED edges - model-reasoned connections that need verification._
- **Are the 24 inferred relationships involving `join()` (e.g. with `pr()` and `gr()`) actually correct?**
  _`join()` has 24 INFERRED edges - model-reasoned connections that need verification._
- **Are the 49 inferred relationships involving `map()` (e.g. with `q()` and `split()`) actually correct?**
  _`map()` has 49 INFERRED edges - model-reasoned connections that need verification._
- **What connects `PolicyService` to the rest of the system?**
  _1 weakly-connected nodes found - possible documentation gaps or missing edges._