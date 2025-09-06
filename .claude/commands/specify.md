
Start a new feature by creating a specification (no branch creation).

This is the first step in the Spec-Driven Development lifecycle.

Given the feature description provided as an argument, do this:

1. If available, run `scripts/create-new-feature.sh --json --no-branch "$ARGUMENTS"` from the repo root and parse its JSON output for SPEC_FILE only. Do not create or checkout any Git branch. If the script is unavailable, determine SPEC_FILE as an absolute path under your feature specs directory (e.g., `/specs/<feature-slug>/spec.md`) and ensure its parent directory exists.
2. Load `templates/spec-template.md` to understand required sections.
3. Write the specification to SPEC_FILE using the template structure, replacing placeholders with concrete details derived from the feature description (arguments) while preserving section order and headings.
4. Report completion with the spec file path and readiness for the next phase (no branch info).

Note: Never create or switch branches from this command. Always work on the current branch.
