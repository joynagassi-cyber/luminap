# Graph Report - lumina  (2026-09-08)

## Corpus Check
- 203 files · ~453,371 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 1957 nodes · 7594 edges · 19 communities detected
- Extraction: 92% EXTRACTED · 8% INFERRED · 0% AMBIGUOUS · INFERRED: 619 edges (avg confidence: 0.8)
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
- [[_COMMUNITY_Community 14|Community 14]]
- [[_COMMUNITY_Community 17|Community 17]]
- [[_COMMUNITY_Community 21|Community 21]]
- [[_COMMUNITY_Community 22|Community 22]]
- [[_COMMUNITY_Community 24|Community 24]]

## God Nodes (most connected - your core abstractions)
1. `push()` - 208 edges
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
- `setTimeout()` --calls--> `handleStatusChange()`  [INFERRED]
  android\app\src\main\assets\public\assets\index-DUryz-dp.js → src\pages\EventDetail.tsx
- `setTimeout()` --calls--> `handleSave()`  [INFERRED]
  android\app\src\main\assets\public\assets\index-DUryz-dp.js → src\pages\Settings.tsx
- `setData()` --calls--> `handleChange()`  [INFERRED]
  android\app\src\main\assets\public\assets\index-DUryz-dp.js → src\pages\FormFill.tsx
- `find()` --calls--> `findUserByEmail()`  [INFERRED]
  android\app\src\main\assets\public\assets\index-DUryz-dp.js → server\store.ts

## Communities

### Community 0 - "Community 0"
Cohesion: 0.01
Nodes (342): handleKey(), handleCreate(), handleDelete(), handleUpdate(), add(), addFrameDataToCanvas(), addObserver(), ajax() (+334 more)

### Community 1 - "Community 1"
Cohesion: 0.03
Nodes (212): DatePicker(), processResponse(), $(), a(), addBezierCurve(), addBoundingBox(), addMarker(), addMarkerAngle() (+204 more)

### Community 2 - "Community 2"
Cohesion: 0.05
Nodes (179): r(), _(), a(), Aa(), Ad(), aE(), aj(), an() (+171 more)

### Community 3 - "Community 3"
Cohesion: 0.05
Nodes (156): handleClick(), updateCotisationPS(), updateCustomFieldDefinitionPS(), updateEventPS(), updateFormDefinitionPS(), updateFormSubmissionPS(), updateMemberPS(), Ab() (+148 more)

### Community 4 - "Community 4"
Cohesion: 0.02
Nodes (85): archiveGroupWithState(), AppProvider(), ArchiveRegistry, writeAudit(), writeAuditSummary(), handleCreate(), handleDelete(), addCotisationPS() (+77 more)

### Community 5 - "Community 5"
Cohesion: 0.02
Nodes (89): getAccountBalance(), getAccountPendingAmount(), getAccountTransactions(), getAllAccountBalances(), request(), CaisseAdapter, ChartStyle(), calculerNombreRetards() (+81 more)

### Community 6 - "Community 6"
Cohesion: 0.05
Nodes (133): ac(), af(), ai(), al(), aR(), as(), Au(), bc() (+125 more)

### Community 7 - "Community 7"
Cohesion: 0.06
Nodes (104): _acquireLock(), _adminDeletePasskey(), _adminListPasskeys(), _approveAuthorization(), _autoRefreshTokenTick(), _callRefreshToken(), clear(), clearInterval() (+96 more)

### Community 8 - "Community 8"
Cohesion: 0.08
Nodes (63): e(), i(), n(), SUPPORT_CORS_IMAGES(), SUPPORT_FOREIGNOBJECT_DRAWING(), SUPPORT_RANGE_BOUNDS(), SUPPORT_RESPONSE_TYPE(), SUPPORT_SVG_DRAWING() (+55 more)

### Community 9 - "Community 9"
Cohesion: 0.07
Nodes (16): handleRestore(), AuthService, handleCallback(), handleGoogleLogin(), handleLogin(), handleSignup(), cloneRequestState(), eq() (+8 more)

### Community 10 - "Community 10"
Cohesion: 0.07
Nodes (9): OneSignalAuthService, disconnectPowerSync(), log(), parseJSON(), _terminateWorker(), initPowerSync(), getOneSignalService(), initOneSignal() (+1 more)

### Community 11 - "Community 11"
Cohesion: 0.16
Nodes (38): _authenticate(), bf(), cf(), _challenge(), _challengeAndVerify(), ep(), ff(), fm() (+30 more)

### Community 12 - "Community 12"
Cohesion: 0.2
Nodes (1): SecurityService

### Community 13 - "Community 13"
Cohesion: 0.33
Nodes (1): handleSave()

### Community 14 - "Community 14"
Cohesion: 0.47
Nodes (1): MainActivity

### Community 17 - "Community 17"
Cohesion: 0.5
Nodes (1): TransactionLegacyAdapter

### Community 21 - "Community 21"
Cohesion: 0.67
Nodes (1): ExampleInstrumentedTest

### Community 22 - "Community 22"
Cohesion: 0.67
Nodes (1): ExampleUnitTest

### Community 24 - "Community 24"
Cohesion: 1.0
Nodes (2): handleSave(), validate()

## Knowledge Gaps
- **Thin community `Community 12`** (11 nodes): `SecurityService`, `.getRoleLabel()`, `.getRoleLabels()`, `.getRolePermissions()`, `.getRolesWithPermission()`, `.getSortedRoles()`, `.hasHigherOrEqualRole()`, `.hasPermission()`, `.hasRole()`, `.parseRole()`, `index.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 13`** (6 nodes): `handleLogoUpload()`, `handleLogout()`, `handlePhotoUpload()`, `handleRefresh()`, `handleSave()`, `Settings.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 14`** (6 nodes): `MainActivity.java`, `MainActivity`, `.handleIntent()`, `.onActivityResult()`, `.onCreate()`, `.onNewIntent()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 17`** (4 nodes): `TransactionLegacyAdapter.ts`, `TransactionLegacyAdapter`, `.fromPowerSync()`, `.isLegacy()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 21`** (3 nodes): `ExampleInstrumentedTest.java`, `ExampleInstrumentedTest`, `.useAppContext()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 22`** (3 nodes): `ExampleUnitTest.java`, `ExampleUnitTest`, `.addition_isCorrect()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 24`** (3 nodes): `handleSave()`, `validate()`, `EventEdit.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `push()` connect `Community 3` to `Community 0`, `Community 1`, `Community 2`, `Community 4`, `Community 5`, `Community 6`, `Community 7`, `Community 8`, `Community 10`, `Community 11`?**
  _High betweenness centrality (0.111) - this node is a cross-community bridge._
- **Why does `log()` connect `Community 10` to `Community 0`, `Community 2`, `Community 3`, `Community 4`, `Community 6`, `Community 8`?**
  _High betweenness centrality (0.045) - this node is a cross-community bridge._
- **Why does `map()` connect `Community 5` to `Community 0`, `Community 1`, `Community 2`, `Community 3`, `Community 4`, `Community 6`, `Community 7`, `Community 8`, `Community 9`, `Community 11`?**
  _High betweenness centrality (0.040) - this node is a cross-community bridge._
- **Are the 50 inferred relationships involving `push()` (e.g. with `e()` and `setCurrent()`) actually correct?**
  _`push()` has 50 INFERRED edges - model-reasoned connections that need verification._
- **Are the 23 inferred relationships involving `join()` (e.g. with `pr()` and `gr()`) actually correct?**
  _`join()` has 23 INFERRED edges - model-reasoned connections that need verification._
- **Are the 31 inferred relationships involving `map()` (e.g. with `q()` and `split()`) actually correct?**
  _`map()` has 31 INFERRED edges - model-reasoned connections that need verification._
- **Should `Community 0` be split into smaller, more focused modules?**
  _Cohesion score 0.01 - nodes in this community are weakly interconnected._