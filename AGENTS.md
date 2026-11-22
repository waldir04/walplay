# Walplay Project Instructions

## Git Branching Rules
All branches MUST follow the rules in `.specify/memory/constitution.md` under **Git branch naming for specifications** and **Git branch naming for non-specification branches**. 

- For specification workflows, export `GIT_BRANCH_NAME="<prefix>/NNN-<slug>"` before invoking `/speckit.specify` or `/speckit.git.feature` so the Spec Kit Git extension applies the dynamic prefix instead of its static template.
- For non-specification tasks, create the branch directly with `git checkout -b <prefix>/<slug>` without Spec Kit numbering.

## Git Commit Rules

- Before invoking /speckit.git.commit, review git status and git diff to identify all pending changes.

- Follow all applicable commit conventions and Git hook requirements defined in `.specify/memory/constitution.md` under **Automated Quality Gates, Git Hooks, and Commit Convention (NON-NEGOTIABLE)**. Do not duplicate or redefine these rules here.

- Stage only files related to the current task. Never include unrelated changes or existing user modifications.

- If unrelated or ambiguous changes are present, ask the user for clarification before staging or committing.

- Manual invocation of /speckit.git.commit MUST work independently of automatic hooks and auto_commit configuration.

- Creating commits MUST require explicit user authorization. Never create commits automatically.

- Never push changes unless explicitly requested by the user.

## Product Context

Before creating or modifying any feature specification, implementation plan, task list, or application code, you MUST review the following project documents:

1. `.specify/memory/constitution.md` — authoritative source for engineering principles, architectural standards, and development rules.
2. `docs/product-overview.md` — authoritative source for product vision, MVP scope, general business rules, user expectations, and feature relationships.

## Specification Rules

- All feature specifications MUST align with the product scope and principles defined in these documents.
- Do not introduce functionality outside the MVP without explicitly identifying it as out of scope or requesting clarification.
- Do not contradict existing product decisions.
- If a feature requirement is ambiguous or conflicts with the Product Overview, identify the conflict and request clarification rather than making unsupported assumptions.
- Feature-specific requirements may refine general product requirements but MUST NOT silently contradict them.
- When a significant product decision changes, identify whether the Product Overview also needs to be updated.

These documents must be reviewed as part of the Spec Kit workflow, not treated as optional reference material.