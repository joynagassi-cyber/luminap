# Graph Report - lumina  (2026-09-08)

## Corpus Check
- 207 files · ~455,889 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 1972 nodes · 7606 edges · 17 communities detected
- Extraction: 92% EXTRACTED · 8% INFERRED · 0% AMBIGUOUS · INFERRED: 615 edges (avg confidence: 0.8)
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
- [[_COMMUNITY_Community 15|Community 15]]
- [[_COMMUNITY_Community 19|Community 19]]
- [[_COMMUNITY_Community 20|Community 20]]
- [[_COMMUNITY_Community 22|Community 22]]

## God Nodes (most connected - your core abstractions)
1. `push()` - 209 edges
2. `join()` - 128 edges
3. `x()` - 111 edges
4. `map()` - 104 edges
5. `i()` - 83 edges
6. `G()` - 83 edges
7. `rw()` - 82 edges
8. `n()` - 74 edges
9. `t()` - 73 edges
10. `Ke()` - 72 edges

## Surprising Connections (you probably didn't know these)
- `i()` --calls--> `s()`  [INFERRED]
  android\app\src\main\assets\public\assets\html2canvas-D6E2jxby.js → android\app\src\main\assets\public\assets\index-DUryz-dp.js
- `setData()` --calls--> `handleChange()`  [INFERRED]
  android\app\src\main\assets\public\assets\index-DUryz-dp.js → src\pages\FormFill.tsx
- `find()` --calls--> `findUserByEmail()`  [INFERRED]
  android\app\src\main\assets\public\assets\index-DUryz-dp.js → server\store.ts
- `find()` --calls--> `handleAddDefaultBudget()`  [INFERRED]
  android\app\src\main\assets\public\assets\index-DUryz-dp.js → src\pages\EventNew.tsx
- `find()` --calls--> `handleOrgUnitChange()`  [INFERRED]
  android\app\src\main\assets\public\assets\index-DUryz-dp.js → src\pages\TransactionNew.tsx

## Communities

### Community 0 - "Community 0"
Cohesion: 0.01
Nodes (334): handleKey(), handleStatusChange(), handleCreate(), handleDelete(), handleUpdate(), _acquireLock(), add(), addObserver() (+326 more)

### Community 1 - "Community 1"
Cohesion: 0.03
Nodes (214): DatePicker(), processResponse(), $(), a(), addBezierCurve(), addBoundingBox(), addMarker(), addMarkerAngle() (+206 more)

### Community 2 - "Community 2"
Cohesion: 0.04
Nodes (182): e(), i(), n(), r(), SUPPORT_CORS_IMAGES(), SUPPORT_FOREIGNOBJECT_DRAWING(), SUPPORT_RANGE_BOUNDS(), SUPPORT_RESPONSE_TYPE() (+174 more)

### Community 3 - "Community 3"
Cohesion: 0.05
Nodes (171): handleClick(), Ab(), am(), an(), Ap(), appendParams(), aR(), az() (+163 more)

### Community 4 - "Community 4"
Cohesion: 0.06
Nodes (166): _(), a(), Aa(), Ad(), aE(), ak(), At(), b() (+158 more)

### Community 5 - "Community 5"
Cohesion: 0.02
Nodes (97): getAccountBalance(), getAccountPendingAmount(), getAccountTransactions(), getAllAccountBalances(), archiveGroupWithState(), AppProvider(), handleRestore(), ArchiveRegistry (+89 more)

### Community 6 - "Community 6"
Cohesion: 0.02
Nodes (92): request(), CaisseAdapter, ChartStyle(), calculerNombreRetards(), calculerStatsCulte(), isCulteVerrouille(), isPaiementVerrouille(), formatCentsToFCFA() (+84 more)

### Community 7 - "Community 7"
Cohesion: 0.04
Nodes (73): addFrameDataToCanvas(), _binaryDecode(), _binaryEncodeUserBroadcastPush(), cc(), copy(), createBucket(), createIndex(), createSignedUploadUrl() (+65 more)

### Community 8 - "Community 8"
Cohesion: 0.08
Nodes (67): bf(), build(), cancel(), cancelQueries(), canRun(), catch(), cf(), _challenge() (+59 more)

### Community 9 - "Community 9"
Cohesion: 0.06
Nodes (20): OneSignalAuthService, disconnectPowerSync(), flushSendBuffer(), hasLogger(), heartbeatCallback(), heartbeatTimeout(), log(), onConnClose() (+12 more)

### Community 10 - "Community 10"
Cohesion: 0.08
Nodes (15): AuthService, handleCallback(), handleGoogleLogin(), handleLogin(), handleSignup(), cloneRequestState(), eq(), insert() (+7 more)

### Community 11 - "Community 11"
Cohesion: 0.18
Nodes (1): SecurityService

### Community 12 - "Community 12"
Cohesion: 0.47
Nodes (1): MainActivity

### Community 15 - "Community 15"
Cohesion: 0.5
Nodes (1): TransactionLegacyAdapter

### Community 19 - "Community 19"
Cohesion: 0.67
Nodes (1): ExampleInstrumentedTest

### Community 20 - "Community 20"
Cohesion: 0.67
Nodes (1): ExampleUnitTest

### Community 22 - "Community 22"
Cohesion: 1.0
Nodes (2): handleSave(), validate()

## Knowledge Gaps
- **Thin community `Community 11`** (12 nodes): `SecurityService`, `.checkPermission()`, `.getRoleLabel()`, `.getRoleLabels()`, `.getRolePermissions()`, `.getRolesWithPermission()`, `.getSortedRoles()`, `.hasHigherOrEqualRole()`, `.hasPermission()`, `.hasRole()`, `.parseRole()`, `index.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 12`** (6 nodes): `MainActivity.java`, `MainActivity`, `.handleIntent()`, `.onActivityResult()`, `.onCreate()`, `.onNewIntent()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 15`** (4 nodes): `TransactionLegacyAdapter.ts`, `TransactionLegacyAdapter`, `.fromPowerSync()`, `.isLegacy()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 19`** (3 nodes): `ExampleInstrumentedTest.java`, `ExampleInstrumentedTest`, `.useAppContext()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 20`** (3 nodes): `ExampleUnitTest.java`, `ExampleUnitTest`, `.addition_isCorrect()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 22`** (3 nodes): `handleSave()`, `validate()`, `EventEdit.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `push()` connect `Community 3` to `Community 0`, `Community 1`, `Community 2`, `Community 4`, `Community 5`, `Community 6`, `Community 7`, `Community 8`, `Community 9`?**
  _High betweenness centrality (0.111) - this node is a cross-community bridge._
- **Why does `map()` connect `Community 6` to `Community 0`, `Community 1`, `Community 2`, `Community 3`, `Community 4`, `Community 5`, `Community 7`, `Community 8`, `Community 10`?**
  _High betweenness centrality (0.068) - this node is a cross-community bridge._
- **Why does `log()` connect `Community 9` to `Community 0`, `Community 2`, `Community 3`, `Community 4`, `Community 5`?**
  _High betweenness centrality (0.045) - this node is a cross-community bridge._
- **Are the 51 inferred relationships involving `push()` (e.g. with `e()` and `setCurrent()`) actually correct?**
  _`push()` has 51 INFERRED edges - model-reasoned connections that need verification._
- **Are the 23 inferred relationships involving `join()` (e.g. with `pr()` and `gr()`) actually correct?**
  _`join()` has 23 INFERRED edges - model-reasoned connections that need verification._
- **Are the 31 inferred relationships involving `map()` (e.g. with `q()` and `split()`) actually correct?**
  _`map()` has 31 INFERRED edges - model-reasoned connections that need verification._
- **Should `Community 0` be split into smaller, more focused modules?**
  _Cohesion score 0.01 - nodes in this community are weakly interconnected._