# Mobile PWA Capture Scope

## Goal

Define the mobile capture direction for Mycelium without expanding the current implementation surface.

Mobile should make note intake faster at the moment an analyst has context to capture. It should not try to replace the desktop research workstation, relationship map, dashboard, archive review, or organization administration flows.

## Approved Direction

Build toward a PWA-first capture companion.

The mobile experience should focus on lightweight capture, offline tolerance, and quick triage into the existing note-first workspace. It should reuse the current web app, auth model, BFF routes, permission model, note metadata shape, transcript-only audio import posture, and deterministic extraction/provider seams wherever possible.

Native or Expo should remain a later contingency, not the default platform choice. Move to native only if real device constraints make the PWA insufficient for required audio recording, background upload/transcription, reliable offline storage, push notification behavior, or enterprise distribution needs.

## Future Capabilities

These are expected future capabilities for the mobile capture direction. They are not implemented by this artifact.

- Quick text notes with title, body, observed date, location scope, team, and normalized note metadata tags.
- Voice memo capture with explicit consent and transcription into transcript chunks or note draft text.
- Offline queue for unsent note drafts, metadata, and transcription job requests.
- Metadata tags for securities, industries, themes, KPIs, watchlists, participants, and access scope.
- Push notifications for queued sync failures, completed transcription, review reminders, and time-sensitive research follow-up.
- Review-lite flows for accepting, editing, or dismissing extracted suggestions without exposing the full desktop relationship-map workflow.

## Scope Boundaries

The mobile companion is an intake and lightweight review surface. The desktop web app remains the primary environment for full note editing, claim/relation review, dashboard drilldowns, organization administration, archive research, and map exploration.

The first mobile iterations should preserve the existing note import contract: capture raw analyst input first, normalize it into a note draft or note, then let extraction infer claim windows and graph relationships downstream.

PWA work should prefer incremental responsive routes and reusable pure helpers over a separate mobile product fork. Any later native/Expo shell must share service contracts and data semantics with the web app.

## Guardrails

- Preserve the note-first hierarchy: notes and drafts remain the primary intake objects, while claims, relations, alerts, and synthesis derive from accepted or processed note content.
- Do not add claim-window note intake. Mobile capture may collect observed date and note metadata, but applies-to windows and horizons remain claim-layer extraction/review concepts.
- Do not durably store raw audio by default. The durable posture remains transcript chunks, job metadata, and draft linkage unless a later compliance-reviewed storage design explicitly changes it.
- Apply permission scopes before graph computation. Personal, team, and organization visibility must constrain extraction, candidate matching, review suggestions, notifications, and sync behavior.
- Keep deterministic fallback/provider seams required. Audio transcription, extraction, notification delivery, and any future background processing must have injectable provider boundaries and deterministic fallback or no-op behavior where appropriate.

## Non-Goals

This artifact does not implement mobile UI, service workers, offline persistence, push notifications, audio recording, transcription providers, native wrappers, migrations, tests, or source changes.

It also does not approve a full desktop replacement, mobile relationship-map editor, mobile admin console, or a separate mobile-only data model.

## Testing Requirements

No tests are required for this artifact because it is documentation-only.

Future implementation work should add tests at the level of the behavior being changed: pure offline queue helpers, BFF sync contracts, permission-filtered extraction paths, transcription normalization, notification routing, and responsive UI contracts.

## Open Decisions Resolved

The approved platform direction is PWA-first. Native or Expo is reserved for demonstrated audio, background, offline, notification, or distribution constraints.

The approved product direction is capture companion, not full desktop replacement.

The mobile intake boundary remains note-first and transcript-first, with claim-window inference and graph computation staying downstream.
