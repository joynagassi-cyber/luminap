# Graph Report - lumina  (2026-09-10)

## Corpus Check
- 257 files · ~555,029 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 2298 nodes · 8422 edges · 18 communities detected
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
- [[_COMMUNITY_Community 13|Community 13]]
- [[_COMMUNITY_Community 15|Community 15]]
- [[_COMMUNITY_Community 17|Community 17]]
- [[_COMMUNITY_Community 21|Community 21]]
- [[_COMMUNITY_Community 22|Community 22]]

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
- `setData()` --calls--> `handleChange()`  [INFERRED]
  android\app\src\main\assets\public\assets\index-DUryz-dp.js → src\pages\FormFill.tsx
- `subscribe()` --calls--> `add()`  [INFERRED]
  src\lib\organization-context.ts → android\app\src\main\assets\public\assets\index-DUryz-dp.js
- `handleCopyCode()` --calls--> `then()`  [INFERRED]
  src\pages\InvitationEmit.tsx → android\app\src\main\assets\public\assets\index-DUryz-dp.js
- `filter()` --calls--> `getAvailableTransitions()`  [INFERRED]
  android\app\src\main\assets\public\assets\index-DUryz-dp.js → src\templates\schema.ts

## Communities

### Community 0 - "Community 0"
Cohesion: 0.01
Nodes (330): isNativePlatform(), processImage(), startCamera(), startWebCamera(), handleKey(), add(), addFrameDataToCanvas(), addObserver() (+322 more)

### Community 1 - "Community 1"
Cohesion: 0.01
Nodes (180): CaisseAdapter, ChartStyle(), calculerDon(), calculerStatsCulte(), determinerStatutAvance(), isCulteVerrouille(), isPaiementVerrouille(), createCulte() (+172 more)

### Community 2 - "Community 2"
Cohesion: 0.02
Nodes (152): getAccountBalance(), AppProvider(), writeAudit(), handleClick(), archiveOrganization(), assignOrgAdmin(), buildAudit(), createOrganization() (+144 more)

### Community 3 - "Community 3"
Cohesion: 0.03
Nodes (205): handleRestore(), r(), os(), $(), a(), addBezierCurve(), addBoundingBox(), addMarker() (+197 more)

### Community 4 - "Community 4"
Cohesion: 0.05
Nodes (191): _(), a(), Ad(), aE(), At(), b(), bd(), Be() (+183 more)

### Community 5 - "Community 5"
Cohesion: 0.04
Nodes (174): e(), i(), SUPPORT_CORS_IMAGES(), SUPPORT_FOREIGNOBJECT_DRAWING(), SUPPORT_RANGE_BOUNDS(), SUPPORT_RESPONSE_TYPE(), SUPPORT_SVG_DRAWING(), SUPPORT_WORD_BREAKING() (+166 more)

### Community 6 - "Community 6"
Cohesion: 0.05
Nodes (166): n(), af(), al(), am(), an(), Ap(), aR(), az() (+158 more)

### Community 7 - "Community 7"
Cohesion: 0.02
Nodes (55): archiveGroupWithState(), asyncGetOrSet(), defaultTtl(), del(), get(), invalidate(), set(), stats() (+47 more)

### Community 8 - "Community 8"
Cohesion: 0.05
Nodes (116): Aa(), _acquireLock(), _adminDeletePasskey(), _adminListPasskeys(), _approveAuthorization(), _authenticate(), _autoRefreshTokenTick(), _callRefreshToken() (+108 more)

### Community 9 - "Community 9"
Cohesion: 0.07
Nodes (10): OneSignalAuthService, disconnectPowerSync(), log(), parseJSON(), _terminateWorker(), initPowerSync(), NotificationCapability, getOneSignalService() (+2 more)

### Community 10 - "Community 10"
Cohesion: 0.12
Nodes (10): AuthService, handleCallback(), handleGoogleLogin(), handleLogin(), handleSignup(), selectRole(), eq(), single() (+2 more)

### Community 11 - "Community 11"
Cohesion: 0.11
Nodes (1): NotificationAdapter

### Community 12 - "Community 12"
Cohesion: 0.22
Nodes (1): extractAriaAttrs()

### Community 13 - "Community 13"
Cohesion: 0.47
Nodes (1): MainActivity

### Community 15 - "Community 15"
Cohesion: 0.47
Nodes (1): ManifestCompilerService

### Community 17 - "Community 17"
Cohesion: 0.5
Nodes (1): TransactionLegacyAdapter

### Community 21 - "Community 21"
Cohesion: 0.67
Nodes (1): ExampleInstrumentedTest

### Community 22 - "Community 22"
Cohesion: 0.67
Nodes (1): ExampleUnitTest

## Knowledge Gaps
- **1 isolated node(s):** `PolicyService`
  These have ≤1 connection - possible missing edges or undocumented components.
- **Thin community `Community 11`** (18 nodes): `NotificationAdapter`, `.addActionListener()`, `.addRegistrationListener()`, `.checkPermission()`, `.constructor()`, `.createChannel()`, `.deleteChannel()`, `.getDeliveredNotifications()`, `.getInstance()`, `.injectMockPlugin()`, `.isNative()`, `.register()`, `.removeAllDeliveredNotifications()`, `.removeDeliveredNotifications()`, `.requestPermission()`, `.resetMockPlugin()`, `.unregister()`, `NotificationAdapter.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 12`** (9 nodes): `extractAriaAttrs()`, `hasAriaHidden()`, `hasEscapeKeyHandler()`, `hasFocusStyles()`, `hasKeyboardHandler()`, `hasSROnly()`, `readTsFile()`, `readUiFile()`, `a11y.test.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 13`** (6 nodes): `MainActivity.java`, `MainActivity`, `.handleIntent()`, `.onActivityResult()`, `.onCreate()`, `.onNewIntent()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 15`** (6 nodes): `ManifestCompilerService`, `.compile()`, `.mergePolicies()`, `.mergeVocabulary()`, `.validate()`, `compiler.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 17`** (4 nodes): `TransactionLegacyAdapter.ts`, `TransactionLegacyAdapter`, `.fromPowerSync()`, `.isLegacy()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 21`** (3 nodes): `ExampleInstrumentedTest.java`, `ExampleInstrumentedTest`, `.useAppContext()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 22`** (3 nodes): `ExampleUnitTest.java`, `ExampleUnitTest`, `.addition_isCorrect()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `push()` connect `Community 4` to `Community 0`, `Community 1`, `Community 2`, `Community 3`, `Community 5`, `Community 6`, `Community 7`, `Community 8`, `Community 9`, `Community 12`, `Community 15`?**
  _High betweenness centrality (0.119) - this node is a cross-community bridge._
- **Why does `map()` connect `Community 1` to `Community 0`, `Community 2`, `Community 3`, `Community 4`, `Community 5`, `Community 6`, `Community 7`, `Community 8`?**
  _High betweenness centrality (0.078) - this node is a cross-community bridge._
- **Why does `filter()` connect `Community 1` to `Community 0`, `Community 2`, `Community 3`, `Community 4`, `Community 5`, `Community 6`, `Community 7`, `Community 8`, `Community 9`?**
  _High betweenness centrality (0.039) - this node is a cross-community bridge._
- **Are the 64 inferred relationships involving `push()` (e.g. with `e()` and `setCurrent()`) actually correct?**
  _`push()` has 64 INFERRED edges - model-reasoned connections that need verification._
- **Are the 26 inferred relationships involving `join()` (e.g. with `pr()` and `gr()`) actually correct?**
  _`join()` has 26 INFERRED edges - model-reasoned connections that need verification._
- **Are the 52 inferred relationships involving `map()` (e.g. with `q()` and `split()`) actually correct?**
  _`map()` has 52 INFERRED edges - model-reasoned connections that need verification._
- **Are the 40 inferred relationships involving `filter()` (e.g. with `wi()` and `Ji()`) actually correct?**
  _`filter()` has 40 INFERRED edges - model-reasoned connections that need verification._