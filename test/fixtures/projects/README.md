# Project Fixtures

These fixtures back scanner regression coverage.

- `passing-minimal/` is the smallest real project that should score `100%`.
- `passing-full/` extends `passing-minimal/` with extra populated surfaces and should still score `100%`.
- `failing-known/` extends `passing-minimal/` and intentionally breaks known checks so rubric tightenings stay protected.

Each fixture directory contains a `fixture.json` manifest. Overlay fixtures can set `"extends"` to another fixture directory and only override the files they change.
