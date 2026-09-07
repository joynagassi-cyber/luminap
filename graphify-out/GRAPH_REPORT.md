# Graph Report - lumina  (2026-09-07)

## Corpus Check
- 169 files · ~179,240 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 1776 nodes · 7208 edges · 28 communities detected
- Extraction: 94% EXTRACTED · 6% INFERRED · 0% AMBIGUOUS · INFERRED: 427 edges (avg confidence: 0.8)
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
- [[_COMMUNITY_Community 15|Community 15]]
- [[_COMMUNITY_Community 16|Community 16]]
- [[_COMMUNITY_Community 17|Community 17]]
- [[_COMMUNITY_Community 18|Community 18]]
- [[_COMMUNITY_Community 19|Community 19]]
- [[_COMMUNITY_Community 20|Community 20]]
- [[_COMMUNITY_Community 21|Community 21]]
- [[_COMMUNITY_Community 22|Community 22]]
- [[_COMMUNITY_Community 23|Community 23]]
- [[_COMMUNITY_Community 25|Community 25]]
- [[_COMMUNITY_Community 32|Community 32]]
- [[_COMMUNITY_Community 33|Community 33]]
- [[_COMMUNITY_Community 37|Community 37]]

## God Nodes (most connected - your core abstractions)
1. `push()` - 194 edges
2. `join()` - 118 edges
3. `x()` - 111 edges
4. `map()` - 90 edges
5. `i()` - 83 edges
6. `G()` - 83 edges
7. `rw()` - 82 edges
8. `n()` - 74 edges
9. `t()` - 73 edges
10. `Ke()` - 72 edges

## Surprising Connections (you probably didn't know these)
- `i()` --calls--> `s()`  [INFERRED]
  android\app\src\main\assets\public\assets\html2canvas-D6E2jxby.js → android\app\src\main\assets\public\assets\index-DUryz-dp.js
- `fetchFromCloud()` --calls--> `fn()`  [INFERRED]
  src\lib\sync.ts → android\app\src\main\assets\public\assets\index-DUryz-dp.js
- `Cn()` --calls--> `sn()`  [INFERRED]
  android\app\src\main\assets\public\assets\index.es-8Zf2FBLs.js → android\app\src\main\assets\public\assets\index-DUryz-dp.js
- `handleStatusChange()` --calls--> `setTimeout()`  [INFERRED]
  src\pages\EventDetail.tsx → android\app\src\main\assets\public\assets\index-DUryz-dp.js
- `handleSave()` --calls--> `setTimeout()`  [INFERRED]
  src\pages\Settings.tsx → android\app\src\main\assets\public\assets\index-DUryz-dp.js

## Communities

### Community 0 - "Community 0"
Cohesion: 0.02
Nodes (238): em(), parseJSON(), processResponse(), Tc(), $(), a(), addBezierCurve(), addBoundingBox() (+230 more)

### Community 1 - "Community 1"
Cohesion: 0.05
Nodes (159): handleClick(), Ab(), am(), an(), Ap(), aR(), az(), bi() (+151 more)

### Community 2 - "Community 2"
Cohesion: 0.02
Nodes (48): assertFieldSize(), binaryEncode(), Bk(), componentDidCatch(), continue(), detectEnvironment(), ek(), execute() (+40 more)

### Community 3 - "Community 3"
Cohesion: 0.08
Nodes (141): _(), a(), Ad(), aE(), ak(), At(), b(), bd() (+133 more)

### Community 4 - "Community 4"
Cohesion: 0.03
Nodes (103): getAccountBalance(), getAccountPendingAmount(), getAccountTransactions(), getAllAccountBalances(), request(), ChartStyle(), handleCreate(), handleDelete() (+95 more)

### Community 5 - "Community 5"
Cohesion: 0.05
Nodes (117): Aa(), _acquireLock(), _adminDeletePasskey(), _adminListPasskeys(), _approveAuthorization(), _authenticate(), _autoRefreshTokenTick(), _callRefreshToken() (+109 more)

### Community 6 - "Community 6"
Cohesion: 0.06
Nodes (101): e(), i(), n(), r(), SUPPORT_CORS_IMAGES(), SUPPORT_FOREIGNOBJECT_DRAWING(), SUPPORT_RANGE_BOUNDS(), SUPPORT_RESPONSE_TYPE() (+93 more)

### Community 7 - "Community 7"
Cohesion: 0.08
Nodes (88): ac(), af(), ai(), al(), bc(), bj(), bl(), cc() (+80 more)

### Community 8 - "Community 8"
Cohesion: 0.04
Nodes (42): addEventPS(), addMemberPS(), addTransactionPS(), deleteEventPS(), deleteTransactionPS(), executeWrite(), isPowerSyncReady(), markPowerSyncReady() (+34 more)

### Community 9 - "Community 9"
Cohesion: 0.07
Nodes (48): handleCreate(), handleDelete(), handleUpdate(), addObserver(), cancel(), _cancelPendingDisconnect(), cancelRefEvent(), cancelTimeout() (+40 more)

### Community 10 - "Community 10"
Cohesion: 0.08
Nodes (38): disconnectPowerSync(), clearHeartbeats(), connect(), connectionState(), flushSendBuffer(), getSocket(), _handleNodeJsRaceCondition(), _handleTokenChanged() (+30 more)

### Community 11 - "Community 11"
Cohesion: 0.08
Nodes (32): applyTransformOptsToQuery(), createBucket(), createIndex(), createSignedUploadUrl(), createSignedUrl(), createSignedUrls(), deleteBucket(), deleteIndex() (+24 more)

### Community 12 - "Community 12"
Cohesion: 0.22
Nodes (30): bf(), ff(), fm(), Gf(), H(), hf(), hM(), If() (+22 more)

### Community 13 - "Community 13"
Cohesion: 0.08
Nodes (27): handleKey(), constructor(), ep(), getChannel(), getQueryCache(), _initRealtimeClient(), _initSupabaseAuthClient(), inPendingSyncState() (+19 more)

### Community 14 - "Community 14"
Cohesion: 0.11
Nodes (27): build(), canRun(), defaultMutationOptions(), defaultQueryOptions(), ensureInfiniteQueryData(), ensureQueryData(), explain(), fetchInfiniteQuery() (+19 more)

### Community 15 - "Community 15"
Cohesion: 0.12
Nodes (26): addFrameDataToCanvas(), decodeACTL(), decodeApng(), decodeApngChunk(), decodeApngImage(), decodeChunk(), decodeFCTL(), decodeFDAT() (+18 more)

### Community 16 - "Community 16"
Cohesion: 0.1
Nodes (22): canPush(), createNamespace(), createNamespaceIfNotExists(), createTable(), createTableIfNotExists(), dropNamespace(), dropTable(), hasReceived() (+14 more)

### Community 17 - "Community 17"
Cohesion: 0.16
Nodes (19): available(), ensureAvailable(), _updateLastWrittenByte(), writeBigInt64(), writeBigUint64(), writeBoolean(), writeByte(), writeBytes() (+11 more)

### Community 18 - "Community 18"
Cohesion: 0.15
Nodes (17): _binaryDecode(), _binaryEncodeUserBroadcastPush(), decode(), decodeBroadcast(), decodeImage(), decodePush(), decodeReply(), _decodeUserBroadcast() (+9 more)

### Community 19 - "Community 19"
Cohesion: 0.12
Nodes (17): add(), ajax(), appendParams(), batchSend(), endpointURL(), gte(), ilike(), imatch() (+9 more)

### Community 20 - "Community 20"
Cohesion: 0.13
Nodes (11): handleChange(), handleSubmit(), mapFormFields(), validateFormSubmission(), clearInterval(), setInterval(), fetchFromCloud(), startBackgroundSync() (+3 more)

### Community 21 - "Community 21"
Cohesion: 0.13
Nodes (10): ArchiveRegistry, cleanInitialData(), enqueueSync(), list(), put(), putRoleAssignment(), setConfig(), setRole() (+2 more)

### Community 22 - "Community 22"
Cohesion: 0.18
Nodes (11): channel(), getChannels(), isClosed(), mount(), onSubscribe(), setEventListener(), subscribe(), updateFilterBindings() (+3 more)

### Community 23 - "Community 23"
Cohesion: 0.33
Nodes (1): handleSave()

### Community 25 - "Community 25"
Cohesion: 0.7
Nodes (4): ensureDB(), openDB(), warmDB(), withStore()

### Community 32 - "Community 32"
Cohesion: 0.67
Nodes (1): ExampleInstrumentedTest

### Community 33 - "Community 33"
Cohesion: 0.67
Nodes (1): ExampleUnitTest

### Community 37 - "Community 37"
Cohesion: 1.0
Nodes (1): MainActivity

## Knowledge Gaps
- **1 isolated node(s):** `MainActivity`
  These have ≤1 connection - possible missing edges or undocumented components.
- **Thin community `Community 23`** (6 nodes): `handleLogoUpload()`, `handleLogout()`, `handlePhotoUpload()`, `handleRefresh()`, `handleSave()`, `Settings.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 32`** (3 nodes): `ExampleInstrumentedTest.java`, `ExampleInstrumentedTest`, `.useAppContext()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 33`** (3 nodes): `ExampleUnitTest.java`, `ExampleUnitTest`, `.addition_isCorrect()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 37`** (2 nodes): `MainActivity.java`, `MainActivity`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `push()` connect `Community 3` to `Community 0`, `Community 1`, `Community 2`, `Community 4`, `Community 5`, `Community 6`, `Community 7`, `Community 8`, `Community 9`, `Community 10`, `Community 12`, `Community 13`, `Community 15`, `Community 16`, `Community 19`, `Community 20`, `Community 22`?**
  _High betweenness centrality (0.084) - this node is a cross-community bridge._
- **Why does `Ke()` connect `Community 0` to `Community 1`, `Community 3`, `Community 4`, `Community 5`, `Community 6`, `Community 8`, `Community 12`?**
  _High betweenness centrality (0.038) - this node is a cross-community bridge._
- **Why does `join()` connect `Community 1` to `Community 0`, `Community 2`, `Community 3`, `Community 4`, `Community 5`, `Community 6`, `Community 7`, `Community 8`, `Community 10`, `Community 12`, `Community 13`, `Community 14`, `Community 19`, `Community 22`?**
  _High betweenness centrality (0.031) - this node is a cross-community bridge._
- **Are the 36 inferred relationships involving `push()` (e.g. with `e()` and `setCurrent()`) actually correct?**
  _`push()` has 36 INFERRED edges - model-reasoned connections that need verification._
- **Are the 13 inferred relationships involving `join()` (e.g. with `pr()` and `gr()`) actually correct?**
  _`join()` has 13 INFERRED edges - model-reasoned connections that need verification._
- **Are the 17 inferred relationships involving `map()` (e.g. with `q()` and `split()`) actually correct?**
  _`map()` has 17 INFERRED edges - model-reasoned connections that need verification._
- **What connects `MainActivity` to the rest of the system?**
  _1 weakly-connected nodes found - possible documentation gaps or missing edges._