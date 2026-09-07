# Graph Report - lumina  (2026-09-07)

## Corpus Check
- 176 files · ~380,487 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 1777 nodes · 7203 edges · 16 communities detected
- Extraction: 94% EXTRACTED · 6% INFERRED · 0% AMBIGUOUS · INFERRED: 429 edges (avg confidence: 0.8)
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
- [[_COMMUNITY_Community 12|Community 12]]
- [[_COMMUNITY_Community 19|Community 19]]
- [[_COMMUNITY_Community 20|Community 20]]
- [[_COMMUNITY_Community 24|Community 24]]
- [[_COMMUNITY_Community 25|Community 25]]

## God Nodes (most connected - your core abstractions)
1. `push()` - 194 edges
2. `join()` - 119 edges
3. `x()` - 111 edges
4. `map()` - 93 edges
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
- `setTimeout()` --calls--> `handleStatusChange()`  [INFERRED]
  android\app\src\main\assets\public\assets\index-DUryz-dp.js → src\pages\EventDetail.tsx
- `setTimeout()` --calls--> `handleSave()`  [INFERRED]
  android\app\src\main\assets\public\assets\index-DUryz-dp.js → src\pages\Settings.tsx
- `setData()` --calls--> `handleChange()`  [INFERRED]
  android\app\src\main\assets\public\assets\index-DUryz-dp.js → src\pages\FormFill.tsx

## Communities

### Community 0 - "Community 0"
Cohesion: 0.01
Nodes (333): handleKey(), handleCreate(), handleDelete(), handleUpdate(), disconnectPowerSync(), add(), addFrameDataToCanvas(), addObserver() (+325 more)

### Community 1 - "Community 1"
Cohesion: 0.03
Nodes (218): Tc(), $(), a(), addBezierCurve(), addBoundingBox(), addMarker(), addMarkerAngle(), addOpacity() (+210 more)

### Community 2 - "Community 2"
Cohesion: 0.05
Nodes (187): handleClick(), updateCotisationPS(), updateEventPS(), updateMemberPS(), updateTransactionPS(), Ab(), am(), an() (+179 more)

### Community 3 - "Community 3"
Cohesion: 0.02
Nodes (108): getAccountBalance(), getAccountPendingAmount(), getAccountTransactions(), getAllAccountBalances(), request(), ArchiveRegistry, ChartStyle(), handleCreate() (+100 more)

### Community 4 - "Community 4"
Cohesion: 0.06
Nodes (155): DatePicker(), _(), a(), Aa(), Ad(), aE(), ak(), At() (+147 more)

### Community 5 - "Community 5"
Cohesion: 0.05
Nodes (114): _acquireLock(), _adminDeletePasskey(), _adminListPasskeys(), _approveAuthorization(), _authenticate(), _autoRefreshTokenTick(), _callRefreshToken(), cf() (+106 more)

### Community 6 - "Community 6"
Cohesion: 0.05
Nodes (111): e(), i(), n(), r(), SUPPORT_CORS_IMAGES(), SUPPORT_FOREIGNOBJECT_DRAWING(), SUPPORT_RANGE_BOUNDS(), SUPPORT_RESPONSE_TYPE() (+103 more)

### Community 7 - "Community 7"
Cohesion: 0.07
Nodes (76): af(), aj(), al(), bj(), bl(), cj(), Cl(), createTable() (+68 more)

### Community 8 - "Community 8"
Cohesion: 0.13
Nodes (36): calculerNombreRetards(), calculerStatsCulte(), isCulteVerrouille(), isPaiementVerrouille(), bf(), ep(), ff(), get() (+28 more)

### Community 9 - "Community 9"
Cohesion: 0.13
Nodes (26): AppProvider(), addCotisationPS(), addEventPS(), addMemberPS(), addTransactionPS(), deleteEventPS(), deleteTransactionPS(), executeWrite() (+18 more)

### Community 10 - "Community 10"
Cohesion: 0.33
Nodes (1): handleSave()

### Community 12 - "Community 12"
Cohesion: 0.4
Nodes (4): handleChange(), handleSubmit(), mapFormFields(), validateFormSubmission()

### Community 19 - "Community 19"
Cohesion: 0.67
Nodes (1): ExampleInstrumentedTest

### Community 20 - "Community 20"
Cohesion: 0.67
Nodes (1): ExampleUnitTest

### Community 24 - "Community 24"
Cohesion: 1.0
Nodes (2): handleSave(), validate()

### Community 25 - "Community 25"
Cohesion: 1.0
Nodes (1): MainActivity

## Knowledge Gaps
- **1 isolated node(s):** `MainActivity`
  These have ≤1 connection - possible missing edges or undocumented components.
- **Thin community `Community 10`** (6 nodes): `handleLogoUpload()`, `handleLogout()`, `handlePhotoUpload()`, `handleRefresh()`, `handleSave()`, `Settings.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 19`** (3 nodes): `ExampleInstrumentedTest.java`, `ExampleInstrumentedTest`, `.useAppContext()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 20`** (3 nodes): `ExampleUnitTest.java`, `ExampleUnitTest`, `.addition_isCorrect()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 24`** (3 nodes): `handleSave()`, `validate()`, `EventEdit.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 25`** (2 nodes): `MainActivity.java`, `MainActivity`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `push()` connect `Community 2` to `Community 0`, `Community 1`, `Community 3`, `Community 4`, `Community 5`, `Community 6`, `Community 7`, `Community 8`, `Community 12`?**
  _High betweenness centrality (0.081) - this node is a cross-community bridge._
- **Why does `Ke()` connect `Community 4` to `Community 1`, `Community 2`, `Community 3`, `Community 5`, `Community 6`, `Community 8`?**
  _High betweenness centrality (0.036) - this node is a cross-community bridge._
- **Why does `map()` connect `Community 3` to `Community 0`, `Community 1`, `Community 2`, `Community 4`, `Community 5`, `Community 6`, `Community 7`, `Community 8`?**
  _High betweenness centrality (0.032) - this node is a cross-community bridge._
- **Are the 36 inferred relationships involving `push()` (e.g. with `e()` and `setCurrent()`) actually correct?**
  _`push()` has 36 INFERRED edges - model-reasoned connections that need verification._
- **Are the 14 inferred relationships involving `join()` (e.g. with `pr()` and `gr()`) actually correct?**
  _`join()` has 14 INFERRED edges - model-reasoned connections that need verification._
- **Are the 20 inferred relationships involving `map()` (e.g. with `q()` and `split()`) actually correct?**
  _`map()` has 20 INFERRED edges - model-reasoned connections that need verification._
- **What connects `MainActivity` to the rest of the system?**
  _1 weakly-connected nodes found - possible documentation gaps or missing edges._