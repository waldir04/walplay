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
- After any commit is successfully created, including commits created by Spec Kit hooks or automated workflows, you MUST continue with the Pull Request Rules before ending your response.
- Do not consider reporting the commit hash and summary as completion of the requested workflow.
- If the commit was created successfully, generate and display the complete GitHub-ready Pull Request description in the same response.
- If the target branch cannot be determined, ask the user before generating the description.

## Pull Request Rules

- Follow the repository's `.github/pull_request_template.md` when generating Pull Request descriptions.
- After completing the implementation and creating the requested commit(s), generate a GitHub-ready Pull Request description.
- Analyze the complete set of changes introduced by the current feature branch compared to its target branch. Do not rely exclusively on the latest commit.
- Include the related GitHub Issue when available, using the appropriate GitHub closing keyword (e.g., `Closes #123`).
- Summarize the purpose, main changes, and relevant technical decisions.
- Report only tests, builds, and quality checks that were actually executed.
- Include screenshots or recordings when relevant to UI changes and available.
- For UI changes, identify which screens or interactions require screenshots.
- Do not fabricate screenshots or use mockups as evidence of implemented functionality.
- If screenshots are not available, leave the section as a placeholder and inform the user what should be captured.
- For backend-only changes, omit the Screenshots section.
- Do not invent functionality, test results, metrics, or implementation details.
- Keep the description concise and focused on the current task.
- Output the complete description in Markdown, ready to copy into GitHub.
- After any commit is successfully created, including commits created by Spec Kit hooks or automated workflows, you MUST continue with these rules before ending your response.
- Do not consider reporting the commit hash and summary as completion of the requested workflow.
- If the target branch cannot be determined, ask the user before generating the description.
- Do not create, publish, or submit a Pull Request unless explicitly requested by the user.
- Never push changes unless explicitly requested by the user, as defined in Git Commit Rules.

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