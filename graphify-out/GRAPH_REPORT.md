# Graph Report - lumina  (2026-09-09)

## Corpus Check
- 221 files · ~473,800 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 2056 nodes · 7757 edges · 16 communities detected
- Extraction: 91% EXTRACTED · 9% INFERRED · 0% AMBIGUOUS · INFERRED: 696 edges (avg confidence: 0.8)
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
- [[_COMMUNITY_Community 14|Community 14]]
- [[_COMMUNITY_Community 18|Community 18]]
- [[_COMMUNITY_Community 19|Community 19]]
- [[_COMMUNITY_Community 20|Community 20]]

## God Nodes (most connected - your core abstractions)
1. `push()` - 212 edges
2. `join()` - 128 edges
3. `map()` - 122 edges
4. `x()` - 111 edges
5. `i()` - 83 edges
6. `G()` - 83 edges
7. `rw()` - 82 edges
8. `filter()` - 75 edges
9. `n()` - 74 edges
10. `t()` - 73 edges

## Surprising Connections (you probably didn't know these)
- `i()` --calls--> `s()`  [INFERRED]
  android\app\src\main\assets\public\assets\html2canvas-D6E2jxby.js → android\app\src\main\assets\public\assets\index-DUryz-dp.js
- `find()` --calls--> `findUserByEmail()`  [INFERRED]
  android\app\src\main\assets\public\assets\index-DUryz-dp.js → server\store.ts
- `delete()` --calls--> `handleDelete()`  [INFERRED]
  android\app\src\main\assets\public\assets\index-DUryz-dp.js → src\pages\CustomFields.tsx
- `filter()` --calls--> `list()`  [INFERRED]
  android\app\src\main\assets\public\assets\index-DUryz-dp.js → src\capabilities\__tests__\lifecycle.test.ts
- `push()` --calls--> `emSize()`  [INFERRED]
  android\app\src\main\assets\public\assets\index-DUryz-dp.js → android\app\src\main\assets\public\assets\index.es-8Zf2FBLs.js

## Communities

### Community 0 - "Community 0"
Cohesion: 0.01
Nodes (356): handleKey(), createGroup(), handleCreate(), handleDelete(), handleUpdate(), _acquireLock(), add(), addObserver() (+348 more)

### Community 1 - "Community 1"
Cohesion: 0.01
Nodes (222): getAccountBalance(), archiveGroupWithState(), AppProvider(), writeAudit(), CaisseAdapter, ChartStyle(), calculerDon(), calculerNombreRetards() (+214 more)

### Community 2 - "Community 2"
Cohesion: 0.03
Nodes (214): handleRestore(), DatePicker(), processResponse(), $(), a(), addBezierCurve(), addBoundingBox(), addMarker() (+206 more)

### Community 3 - "Community 3"
Cohesion: 0.04
Nodes (193): e(), i(), n(), SUPPORT_CORS_IMAGES(), SUPPORT_FOREIGNOBJECT_DRAWING(), SUPPORT_RANGE_BOUNDS(), SUPPORT_RESPONSE_TYPE(), SUPPORT_SVG_DRAWING() (+185 more)

### Community 4 - "Community 4"
Cohesion: 0.05
Nodes (188): r(), _(), a(), Aa(), Ad(), aE(), aj(), am() (+180 more)

### Community 5 - "Community 5"
Cohesion: 0.05
Nodes (147): handleClick(), updateCustomFieldDefinitionPS(), updateEventPS(), updateFormDefinitionPS(), updateFormSubmissionPS(), Ab(), ak(), Ap() (+139 more)

### Community 6 - "Community 6"
Cohesion: 0.04
Nodes (73): addFrameDataToCanvas(), applyTransformOptsToQuery(), _binaryDecode(), Ca(), cc(), copy(), createBucket(), createIndex() (+65 more)

### Community 7 - "Community 7"
Cohesion: 0.07
Nodes (69): handleChange(), handleSubmit(), mapFormFields(), validateFormSubmission(), bf(), build(), cancel(), cancelQueries() (+61 more)

### Community 8 - "Community 8"
Cohesion: 0.07
Nodes (10): OneSignalAuthService, disconnectPowerSync(), log(), parseJSON(), _terminateWorker(), initPowerSync(), NotificationCapability, getOneSignalService() (+2 more)

### Community 9 - "Community 9"
Cohesion: 0.08
Nodes (15): AuthService, handleCallback(), handleGoogleLogin(), handleLogin(), handleSignup(), cloneRequestState(), eq(), insert() (+7 more)

### Community 10 - "Community 10"
Cohesion: 0.18
Nodes (1): SecurityService

### Community 11 - "Community 11"
Cohesion: 0.47
Nodes (1): MainActivity

### Community 14 - "Community 14"
Cohesion: 0.5
Nodes (1): TransactionLegacyAdapter

### Community 18 - "Community 18"
Cohesion: 0.67
Nodes (1): ExampleInstrumentedTest

### Community 19 - "Community 19"
Cohesion: 0.67
Nodes (1): ExampleUnitTest

### Community 20 - "Community 20"
Cohesion: 1.0
Nodes (2): handleSave(), validate()

## Knowledge Gaps
- **1 isolated node(s):** `PolicyService`
  These have ≤1 connection - possible missing edges or undocumented components.
- **Thin community `Community 10`** (12 nodes): `SecurityService`, `.checkPermission()`, `.getRoleLabel()`, `.getRoleLabels()`, `.getRolePermissions()`, `.getRolesWithPermission()`, `.getSortedRoles()`, `.hasHigherOrEqualRole()`, `.hasPermission()`, `.hasRole()`, `.parseRole()`, `index.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 11`** (6 nodes): `MainActivity.java`, `MainActivity`, `.handleIntent()`, `.onActivityResult()`, `.onCreate()`, `.onNewIntent()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 14`** (4 nodes): `TransactionLegacyAdapter.ts`, `TransactionLegacyAdapter`, `.fromPowerSync()`, `.isLegacy()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 18`** (3 nodes): `ExampleInstrumentedTest.java`, `ExampleInstrumentedTest`, `.useAppContext()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 19`** (3 nodes): `ExampleUnitTest.java`, `ExampleUnitTest`, `.addition_isCorrect()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 20`** (3 nodes): `handleSave()`, `validate()`, `EventEdit.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `push()` connect `Community 5` to `Community 0`, `Community 1`, `Community 2`, `Community 3`, `Community 4`, `Community 6`, `Community 7`, `Community 8`?**
  _High betweenness centrality (0.123) - this node is a cross-community bridge._
- **Why does `map()` connect `Community 1` to `Community 0`, `Community 2`, `Community 3`, `Community 4`, `Community 5`, `Community 6`, `Community 9`?**
  _High betweenness centrality (0.085) - this node is a cross-community bridge._
- **Why does `filter()` connect `Community 1` to `Community 0`, `Community 2`, `Community 3`, `Community 4`, `Community 5`, `Community 7`, `Community 8`, `Community 10`?**
  _High betweenness centrality (0.051) - this node is a cross-community bridge._
- **Are the 54 inferred relationships involving `push()` (e.g. with `e()` and `setCurrent()`) actually correct?**
  _`push()` has 54 INFERRED edges - model-reasoned connections that need verification._
- **Are the 23 inferred relationships involving `join()` (e.g. with `pr()` and `gr()`) actually correct?**
  _`join()` has 23 INFERRED edges - model-reasoned connections that need verification._
- **Are the 49 inferred relationships involving `map()` (e.g. with `q()` and `split()`) actually correct?**
  _`map()` has 49 INFERRED edges - model-reasoned connections that need verification._
- **What connects `PolicyService` to the rest of the system?**
  _1 weakly-connected nodes found - possible documentation gaps or missing edges._