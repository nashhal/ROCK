# Installed frontend and web-quality skills

These skills are vendored into this repository so coding agents can use them without a separate global installation.

| Skill | Purpose | Source |
|---|---|---|
| `design-taste-frontend` | Art direction, layout, typography, colour, imagery, motion, critique and browser inspection | [Leonxlnx/taste-skill](https://github.com/Leonxlnx/taste-skill) |
| `web-quality-audit` | Evidence-led end-to-end site audit | [addyosmani/web-quality-skills](https://github.com/addyosmani/web-quality-skills) |
| `accessibility` | WCAG 2.2, keyboard, screen readers, contrast and accessible interaction | Same |
| `performance` | Performance measurement and bottleneck optimization | Same |
| `core-web-vitals` | LCP, INP and CLS diagnosis | Same |
| `seo` | Technical SEO and structured data | Same |
| `best-practices` | Browser compatibility, security and code quality | Same |

Read the relevant `SKILL.md` before a matching task. Repository-level `AGENTS.md` explains how to apply these skills without overriding ROCK's brand, product data, or user requirements.

Both upstream projects are MIT-licensed; their license texts are retained in the relevant skill directories. Review upstream changes before updating vendored content. The Taste skill includes optional Node/browser scripts; follow its documented runtime requirements and run them only when the required browser/runtime is available.
