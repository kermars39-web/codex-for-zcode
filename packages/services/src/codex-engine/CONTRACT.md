# Codex engine

Local Host owns one lazy stdio process and authoritative live task state. The renderer sends typed commands and listens for sequenced invalidations; it never executes tools or stores credentials. Disk tasks are durable indexes/projections, not a second execution engine. A per-task process lease prevents concurrent owners. On transport loss, pending approvals expire and mutating requests are never replayed.

Public surfaces: contract.ts for browser-safe types/service descriptor; node.ts for Host construction and disposal. Only local desktop callers register the service. Legacy ZCode sessions remain on their original service path.

`status().defaults` exposes only the configured model ID and reasoning effort read through official App Server config/read. No credential or other configuration data is returned. UI preferences can override these defaults for new tasks without modifying Codex configuration or existing tasks.
