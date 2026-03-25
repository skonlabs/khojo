Design system tokens, failure color mappings, and auth flow preferences for khojo project.

- Brand: khojo (AI debugging tool for developers)
- Theme: Dark mode default, Vercel/Linear inspired
- Fonts: Inter (UI), JetBrains Mono (code)
- Failure colors: hallucination=purple, incomplete=orange, irrelevant=blue, inconsistent=pink, verbose=teal
- Auth: Supabase email/password, auto-profile creation via DB trigger
- Tables: profiles, projects (multi-project with api_key, monitoring_enabled), runs (with project_id), feedback
- Edge functions: /ingest (project-based API key auth, monitoring check, token estimation), /evaluate (5 heuristic checks)
- Realtime: enabled on runs table
- Multi-project: projects table, sidebar project switcher, runs scoped to active project
- Monitoring toggle: When off, ingest returns 403
- Feedback: In-app form stored in feedback table
- Onboarding: SDK step is optional, Instant Analyzer highlighted as quick start
