# ROCK repository agent guidance

## Brand and product constraints
- Preserve the existing ROCK identity and logo. Core palette: navy #071A33, electric blue #1479DC, light gray #F4F6F8, border gray #DFE5EB, white #FFFFFF.
- Keep the storefront primarily light, premium, calm, legible, and mobile-first. Avoid generic AI-looking layouts and decorative effects without a clear purpose.
- Preserve the existing product catalogue, names, prices, SKUs, product options, checkout/cart behavior, Arabic/English language support, and working links unless the user explicitly asks to change them.
- Arabic is RTL and English is LTR. Use the project's existing Arabic and Latin font choices unless a measured design reason justifies a change.
- Do not replace the official ROCK logo or mascot. Do not invent product claims, specifications, prices, ratings, or availability.
- Product imagery should follow the project's established white-background product-image requirement. Do not replace real product photos with unrelated stock images.

## How to use installed skills
- For visual direction, page composition, typography, spacing, imagery, and motion, read and apply `.agents/skills/design-taste-frontend/SKILL.md` and its relevant references. Treat its strict visual rules as critique prompts, not absolute rules: they must not override ROCK's brand identity, usability, accessibility, or explicit user direction.
- For a full website review, use `.agents/skills/web-quality-audit/SKILL.md`, then the focused accessibility, performance, Core Web Vitals, SEO, and best-practices skills as applicable.
- For accessibility work, use `.agents/skills/accessibility/SKILL.md` and target WCAG 2.2 AA where practical.
- For performance work, use `.agents/skills/performance/SKILL.md` and `.agents/skills/core-web-vitals/SKILL.md`. Measure before claiming an improvement; label source-only findings as hypotheses.
- For search visibility, use `.agents/skills/seo/SKILL.md`. Do not promise ranking outcomes.
- For security or compatibility work, use `.agents/skills/best-practices/SKILL.md`. Never claim a Lighthouse score proves the site is secure.

## Required implementation workflow
1. Inspect the existing implementation and relevant project conventions before editing.
2. State the scope and preserve unrelated behavior.
3. Make focused, maintainable changes; avoid adding dependencies unless needed.
4. Test Arabic RTL and English LTR, desktop and mobile, keyboard navigation, reduced motion, and relevant storefront journeys.
5. Run available source checks and browser checks. Report exactly what passed, what failed, and what could not be tested.
6. Never claim a deployment succeeded until the deployment workflow confirms success and the deployed site is checked.
