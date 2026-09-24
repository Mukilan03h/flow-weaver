# Workflow Workspace Clone

## Goal
Build a polished, high-fidelity n8n-style workflow workspace at `/` using React Flow, improving discoverability and interaction while preserving the dense professional editor feel shown in the references.

## Experience
- Full-screen workspace with collapsible navigation, editable workflow title, Editor/Executions tabs, active status, save/share controls, and light/dark mode.
- Interactive dotted canvas with draggable nodes, typed connection handles, animated edges, multi-selection, minimap, zoom/fit controls, undo/redo, and keyboard-friendly actions.
- Prebuilt AI workflow matching the references: chat trigger → AI agent → condition → success/failure, plus attached model, memory, and tool nodes.
- Node library opened from add buttons or canvas actions, with search, categories, popular integrations, and click-to-add behavior.
- Clicking a node opens a detailed configuration window with Parameters, Settings, and Output tabs; editable fields adapt to each node type and support a test-step action.
- Functional workflow run simulation with visible running/success states, result summaries, execution history, and a bottom status/activity area.
- Practical UX improvements: command palette, contextual toolbar, clear selection states, accessible tooltips, responsive panels, and reduced-motion support.

## Visual Direction
A refined operations desk rather than a marketing page: neutral graphite/white surfaces, coral action color, compact typography, crisp borders, restrained shadows, and integration-specific icon colors. Both themes remain equally legible and information-dense.

## Technical Details
- Add `@xyflow/react` for canvas interaction and layout primitives.
- Keep editor state local and deterministic for this frontend prototype: nodes, edges, theme, history, panel state, and simulated runs.
- Split the workspace into focused components for shell, canvas nodes, node library, inspector, execution panel, and command palette.
- Define all visual roles as semantic OKLCH tokens in the global design system.
- Add route-specific metadata for the workspace and replace the template page.
- Verify the central flow in the browser: add/connect/select/configure/test/run, inspect execution history, and switch themes at desktop and mobile sizes.

## Scope Note
This delivers a feature-rich interactive editor prototype. External integrations, real credentials, persistent projects, collaboration, and production workflow execution are not included because they require backend services and provider connections.
