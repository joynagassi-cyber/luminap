# Graph Report - lumina  (2026-09-10)

## Corpus Check
- 257 files · ~569,782 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 2300 nodes · 8426 edges · 18 communities detected
- Extraction: 87% EXTRACTED · 13% INFERRED · 0% AMBIGUOUS · INFERRED: 1072 edges (avg confidence: 0.8)
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
- [[_COMMUNITY_Community 14|Community 14]]
- [[_COMMUNITY_Community 16|Community 16]]
- [[_COMMUNITY_Community 18|Community 18]]
- [[_COMMUNITY_Community 22|Community 22]]
- [[_COMMUNITY_Community 23|Community 23]]

## God Nodes (most connected - your core abstractions)
1. `push()` - 222 edges
2. `join()` - 131 edges
3. `map()` - 125 edges
4. `x()` - 111 edges
5. `filter()` - 85 edges
6. `i()` - 83 edges
7. `G()` - 83 edges
8. `rw()` - 83 edges
9. `n()` - 75 edges
10. `split()` - 75 edges

## Surprising Connections (you probably didn't know these)
- `i()` --calls--> `s()`  [INFERRED]
  android\app\src\main\assets\public\assets\html2canvas-D6E2jxby.js → android\app\src\main\assets\public\assets\index-DUryz-dp.js
- `sn()` --calls--> `Cn()`  [INFERRED]
  android\app\src\main\assets\public\assets\index-DUryz-dp.js → android\app\src\main\assets\public\assets\index.es-8Zf2FBLs.js
- `setData()` --calls--> `handleChange()`  [INFERRED]
  android\app\src\main\assets\public\assets\index-DUryz-dp.js → src\pages\FormFill.tsx
- `add()` --calls--> `subscribe()`  [INFERRED]
  android\app\src\main\assets\public\assets\index-DUryz-dp.js → src\lib\organization-context.ts
- `find()` --calls--> `findUserByEmail()`  [INFERRED]
  android\app\src\main\assets\public\assets\index-DUryz-dp.js → server\store.ts

## Communities

### Community 0 - "Community 0"
Cohesion: 0.01
Nodes (387): isNativePlatform(), processImage(), startCamera(), startWebCamera(), handleKey(), Aa(), _acquireLock(), add() (+379 more)

### Community 1 - "Community 1"
Cohesion: 0.02
Nodes (163): getAccountBalance(), AppProvider(), writeAudit(), archiveOrganization(), assignOrgAdmin(), buildAudit(), createOrganization(), getOrgStats() (+155 more)

### Community 2 - "Community 2"
Cohesion: 0.03
Nodes (218): handleRestore(), DatePicker(), r(), processResponse(), $(), a(), addBezierCurve(), addBoundingBox() (+210 more)

### Community 3 - "Community 3"
Cohesion: 0.01
Nodes (146): CaisseAdapter, ChartStyle(), calculerDon(), calculerStatsCulte(), determinerStatutAvance(), isCulteVerrouille(), isPaiementVerrouille(), createCulte() (+138 more)

### Community 4 - "Community 4"
Cohesion: 0.04
Nodes (178): e(), i(), n(), SUPPORT_CORS_IMAGES(), SUPPORT_FOREIGNOBJECT_DRAWING(), SUPPORT_RANGE_BOUNDS(), SUPPORT_RESPONSE_TYPE(), SUPPORT_SVG_DRAWING() (+170 more)

### Community 5 - "Community 5"
Cohesion: 0.06
Nodes (165): _(), Ad(), aE(), aj(), an(), aR(), At(), b() (+157 more)

### Community 6 - "Community 6"
Cohesion: 0.05
Nodes (159): extractAriaAttrs(), handleClick(), updateEventPS(), a(), am(), Ap(), appendParams(), az() (+151 more)

### Community 7 - "Community 7"
Cohesion: 0.04
Nodes (97): bf(), build(), cancel(), cancelQueries(), canRun(), catch(), continue(), copy() (+89 more)

### Community 8 - "Community 8"
Cohesion: 0.04
Nodes (43): archiveGroupWithState(), asyncGetOrSet(), defaultTtl(), del(), get(), invalidate(), set(), stats() (+35 more)

### Community 9 - "Community 9"
Cohesion: 0.05
Nodes (9): ConflictResolver, handleSave(), validate(), listBucketOptionsToQueryString(), SecurityService, NetworkAdapter, getRolesWithPermission(), parseRole() (+1 more)

### Community 10 - "Community 10"
Cohesion: 0.07
Nodes (17): AuthService, handleCallback(), handleGoogleLogin(), handleLogin(), handleSignup(), selectRole(), clearInterval(), cloneRequestState() (+9 more)

### Community 11 - "Community 11"
Cohesion: 0.07
Nodes (10): OneSignalAuthService, disconnectPowerSync(), log(), parseJSON(), _terminateWorker(), initPowerSync(), NotificationCapability, getOneSignalService() (+2 more)

### Community 12 - "Community 12"
Cohesion: 0.11
Nodes (1): NotificationAdapter

### Community 14 - "Community 14"
Cohesion: 0.47
Nodes (1): MainActivity

### Community 16 - "Community 16"
Cohesion: 0.47
Nodes (1): ManifestCompilerService

### Community 18 - "Community 18"
Cohesion: 0.5
Nodes (1): TransactionLegacyAdapter

### Community 22 - "Community 22"
Cohesion: 0.67
Nodes (1): ExampleInstrumentedTest

### Community 23 - "Community 23"
Cohesion: 0.67
Nodes (1): ExampleUnitTest

## Knowledge Gaps
- **1 isolated node(s):** `PolicyService`
  These have ≤1 connection - possible missing edges or undocumented components.
- **Thin community `Community 12`** (18 nodes): `NotificationAdapter`, `.addActionListener()`, `.addRegistrationListener()`, `.checkPermission()`, `.constructor()`, `.createChannel()`, `.deleteChannel()`, `.getDeliveredNotifications()`, `.getInstance()`, `.injectMockPlugin()`, `.isNative()`, `.register()`, `.removeAllDeliveredNotifications()`, `.removeDeliveredNotifications()`, `.requestPermission()`, `.resetMockPlugin()`, `.unregister()`, `NotificationAdapter.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 14`** (6 nodes): `MainActivity.java`, `MainActivity`, `.handleIntent()`, `.onActivityResult()`, `.onCreate()`, `.onNewIntent()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 16`** (6 nodes): `ManifestCompilerService`, `.compile()`, `.mergePolicies()`, `.mergeVocabulary()`, `.validate()`, `compiler.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 18`** (4 nodes): `TransactionLegacyAdapter.ts`, `TransactionLegacyAdapter`, `.fromPowerSync()`, `.isLegacy()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 22`** (3 nodes): `ExampleInstrumentedTest.java`, `ExampleInstrumentedTest`, `.useAppContext()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 23`** (3 nodes): `ExampleUnitTest.java`, `ExampleUnitTest`, `.addition_isCorrect()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `push()` connect `Community 6` to `Community 0`, `Community 1`, `Community 2`, `Community 3`, `Community 4`, `Community 5`, `Community 7`, `Community 8`, `Community 9`, `Community 11`, `Community 16`?**
  _High betweenness centrality (0.116) - this node is a cross-community bridge._
- **Why does `map()` connect `Community 3` to `Community 0`, `Community 1`, `Community 2`, `Community 4`, `Community 5`, `Community 6`, `Community 7`, `Community 8`, `Community 10`?**
  _High betweenness centrality (0.064) - this node is a cross-community bridge._
- **Why does `filter()` connect `Community 3` to `Community 0`, `Community 1`, `Community 2`, `Community 4`, `Community 5`, `Community 6`, `Community 7`, `Community 8`, `Community 9`, `Community 11`?**
  _High betweenness centrality (0.042) - this node is a cross-community bridge._
- **Are the 64 inferred relationships involving `push()` (e.g. with `e()` and `setCurrent()`) actually correct?**
  _`push()` has 64 INFERRED edges - model-reasoned connections that need verification._
- **Are the 26 inferred relationships involving `join()` (e.g. with `pr()` and `gr()`) actually correct?**
  _`join()` has 26 INFERRED edges - model-reasoned connections that need verification._
- **Are the 52 inferred relationships involving `map()` (e.g. with `q()` and `split()`) actually correct?**
  _`map()` has 52 INFERRED edges - model-reasoned connections that need verification._
- **Are the 40 inferred relationships involving `filter()` (e.g. with `wi()` and `Ji()`) actually correct?**
  _`filter()` has 40 INFERRED edges - model-reasoned connections that need verification._