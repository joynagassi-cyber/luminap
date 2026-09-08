# Graph Report - lumina  (2026-09-08)

## Corpus Check
- 192 files · ~434,208 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 1935 nodes · 7560 edges · 18 communities detected
- Extraction: 92% EXTRACTED · 8% INFERRED · 0% AMBIGUOUS · INFERRED: 595 edges (avg confidence: 0.8)
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
- [[_COMMUNITY_Community 23|Community 23]]

## God Nodes (most connected - your core abstractions)
1. `push()` - 203 edges
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
- `sn()` --calls--> `Cn()`  [INFERRED]
  android\app\src\main\assets\public\assets\index-DUryz-dp.js → android\app\src\main\assets\public\assets\index.es-8Zf2FBLs.js
- `setData()` --calls--> `handleChange()`  [INFERRED]
  android\app\src\main\assets\public\assets\index-DUryz-dp.js → src\pages\FormFill.tsx
- `find()` --calls--> `handleAddDefaultBudget()`  [INFERRED]
  android\app\src\main\assets\public\assets\index-DUryz-dp.js → src\pages\EventNew.tsx
- `delete()` --calls--> `handleDelete()`  [INFERRED]
  android\app\src\main\assets\public\assets\index-DUryz-dp.js → src\pages\CustomFields.tsx

## Communities

### Community 0 - "Community 0"
Cohesion: 0.01
Nodes (322): handleKey(), handleStatusChange(), handleCreate(), handleDelete(), handleUpdate(), add(), addFrameDataToCanvas(), addObserver() (+314 more)

### Community 1 - "Community 1"
Cohesion: 0.03
Nodes (210): $(), a(), addBezierCurve(), addBoundingBox(), addMarker(), addMarkerAngle(), addOpacity(), addParentOpacity() (+202 more)

### Community 2 - "Community 2"
Cohesion: 0.05
Nodes (183): e(), _(), ac(), af(), ai(), aj(), al(), Ap() (+175 more)

### Community 3 - "Community 3"
Cohesion: 0.02
Nodes (96): CaisseAdapter, ChartStyle(), calculerNombreRetards(), calculerStatsCulte(), isCulteVerrouille(), isPaiementVerrouille(), handleCreate(), handleDelete() (+88 more)

### Community 4 - "Community 4"
Cohesion: 0.03
Nodes (87): getAccountBalance(), getAccountPendingAmount(), getAccountTransactions(), getAllAccountBalances(), archiveGroupWithState(), request(), AppProvider(), ArchiveRegistry (+79 more)

### Community 5 - "Community 5"
Cohesion: 0.06
Nodes (141): a(), Ad(), aE(), an(), applyTransformOptsToQuery(), At(), bd(), Be() (+133 more)

### Community 6 - "Community 6"
Cohesion: 0.05
Nodes (117): Aa(), _acquireLock(), _adminDeletePasskey(), _adminListPasskeys(), _approveAuthorization(), _authenticate(), _autoRefreshTokenTick(), _callRefreshToken() (+109 more)

### Community 7 - "Community 7"
Cohesion: 0.07
Nodes (121): handleClick(), Ab(), ak(), am(), az(), bi(), br(), bz() (+113 more)

### Community 8 - "Community 8"
Cohesion: 0.08
Nodes (65): i(), n(), r(), SUPPORT_CORS_IMAGES(), SUPPORT_FOREIGNOBJECT_DRAWING(), SUPPORT_RANGE_BOUNDS(), SUPPORT_RESPONSE_TYPE(), SUPPORT_SVG_DRAWING() (+57 more)

### Community 9 - "Community 9"
Cohesion: 0.05
Nodes (22): OneSignalAuthService, disconnectPowerSync(), clearHeartbeats(), flushSendBuffer(), hasLogger(), heartbeatCallback(), heartbeatTimeout(), log() (+14 more)

### Community 10 - "Community 10"
Cohesion: 0.12
Nodes (41): bf(), canRun(), ep(), explain(), ff(), get(), getConfig(), getQueryData() (+33 more)

### Community 11 - "Community 11"
Cohesion: 0.1
Nodes (14): handleRestore(), AuthService, handleCallback(), handleGoogleLogin(), handleLogin(), handleSignup(), cloneRequestState(), eq() (+6 more)

### Community 12 - "Community 12"
Cohesion: 0.25
Nodes (3): canAccess(), getRolesWithPermission(), hasPermission()

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

### Community 23 - "Community 23"
Cohesion: 1.0
Nodes (2): handleSave(), validate()

## Knowledge Gaps
- **Thin community `Community 13`** (6 nodes): `MainActivity.java`, `MainActivity`, `.handleIntent()`, `.onActivityResult()`, `.onCreate()`, `.onNewIntent()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 16`** (4 nodes): `TransactionLegacyAdapter.ts`, `TransactionLegacyAdapter`, `.fromPowerSync()`, `.isLegacy()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 20`** (3 nodes): `ExampleInstrumentedTest.java`, `ExampleInstrumentedTest`, `.useAppContext()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 21`** (3 nodes): `ExampleUnitTest.java`, `ExampleUnitTest`, `.addition_isCorrect()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 23`** (3 nodes): `handleSave()`, `validate()`, `EventEdit.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `push()` connect `Community 7` to `Community 0`, `Community 1`, `Community 2`, `Community 3`, `Community 4`, `Community 5`, `Community 6`, `Community 8`, `Community 9`, `Community 10`?**
  _High betweenness centrality (0.093) - this node is a cross-community bridge._
- **Why does `map()` connect `Community 3` to `Community 0`, `Community 1`, `Community 2`, `Community 4`, `Community 5`, `Community 6`, `Community 7`, `Community 8`, `Community 10`, `Community 11`?**
  _High betweenness centrality (0.064) - this node is a cross-community bridge._
- **Why does `log()` connect `Community 9` to `Community 0`, `Community 2`, `Community 4`, `Community 5`, `Community 7`, `Community 8`?**
  _High betweenness centrality (0.055) - this node is a cross-community bridge._
- **Are the 45 inferred relationships involving `push()` (e.g. with `e()` and `setCurrent()`) actually correct?**
  _`push()` has 45 INFERRED edges - model-reasoned connections that need verification._
- **Are the 23 inferred relationships involving `join()` (e.g. with `pr()` and `gr()`) actually correct?**
  _`join()` has 23 INFERRED edges - model-reasoned connections that need verification._
- **Are the 31 inferred relationships involving `map()` (e.g. with `q()` and `split()`) actually correct?**
  _`map()` has 31 INFERRED edges - model-reasoned connections that need verification._
- **Should `Community 0` be split into smaller, more focused modules?**
  _Cohesion score 0.01 - nodes in this community are weakly interconnected._