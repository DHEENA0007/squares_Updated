---
applyTo: '**'
---

# Project Context
This project focuses on producing clean, efficient, and maintainable code.  
AI tools (such as GitHub Copilot or ChatGPT) should assist with:
- Generating production-ready code aligned with existing project conventions.
- Providing concise, accurate explanations or reviews when requested.
- Avoiding unnecessary or verbose outputs that waste tokens.

# Code Generation Guidelines
- Do not create Markdown (.md) or documentation files unless explicitly requested.
- Write minimal but meaningful comments; only explain logic when it is non-obvious.
- Avoid duplicating explanations, summaries, or code snippets.
- Keep code concise and self-explanatory.
- When summarizing or refactoring, do not restate the original code unless required.
- Provide direct answers; avoid narrative or filler language.
- Follow the project’s patterns and structure; do not invent new architecture unless requested.
- Avoid placeholder code such as "TODO" unless explicitly needed.

# Token Optimization Rules
- Keep responses concise and eliminate unnecessary filler.
- Use short, targeted comments that add value.
- Avoid restating obvious context or long multi-step reasoning unless requested.
- Reuse prior context instead of repeating definitions.
- When explaining, summarize the concept rather than rewriting the entire code.
- Skip unrelated suggestions (frameworks, libraries, or patterns not used in this repository).

# Code Review and QA Guidelines
- Focus feedback on correctness, readability, and efficiency.
- Provide concise, actionable feedback (bullet points preferred).
- Only quote relevant parts of the code when reviewing.
- Do not generate new files or examples unless they directly illustrate a requested change.

# File Creation Rules
- Allowed: source code, test files, and configuration files (only when requested).
- Disallowed: Markdown (.md), text (.txt), or documentation files unless explicitly asked.
- Do not create placeholder or example files unless specifically instructed.

