# GPT-Taste QA Hard Gate

A configurable GitHub Actions workflow that automatically reviews frontend files against Awwwards-level design standards based on the GPT-Taste design system.

## Overview

This QA gate enforces design standards across the SOC Command Center frontend, ensuring all UI changes meet premium quality requirements before merging.

## Files

| File | Purpose |
|------|---------|
| `.github/workflows/gpt-taste-qa.yml` | GitHub Actions workflow that runs on PRs |
| `.claude/gpt-taste-config.json` | Configuration for rules and thresholds |
| `scripts/gpt-taste-api-review.js` | CI review script using Anthropic API |
| `scripts/gpt-taste-local.js` | Local review script using static analysis |
| `.env.example` | Environment variables documentation |

## Quick Start

### Local Development

```bash
# Review all eligible files
npm run qa:frontend

# Review specific files
npm run qa:frontend -- --files app/page.tsx,app/layout.tsx

# Review git staged files
npm run qa:frontend:staged

# Review files changed since last commit
npm run qa:frontend:changed
```

### CI/CD Setup

1. Add `ANTHROPIC_API_KEY` to your repository secrets:
   - Go to Settings > Secrets and variables > Actions
   - Add `ANTHROPIC_API_KEY` with your Anthropic API key

2. The workflow runs automatically on PRs to `main` when frontend files change.

## Configuration

Edit `.claude/gpt-taste-config.json` to customize behavior:

```json
{
  "enforcement_mode": "soft",     // "soft" = warnings, "hard" = blocks merge
  "review_threshold": 75,          // Minimum score to pass (0-100)
  "include_patterns": [...],       // Files to review
  "exclude_patterns": [...],       // Files to skip
  "rules": {
    "hero_max_lines": {            // H1 must be 2-3 lines max
      "enabled": true,
      "max_lines": 3
    },
    "bento_grid_density": {        // Grids must use grid-flow-dense
      "enabled": true
    },
    "section_spacing": {           // Minimum py-32 between sections
      "enabled": true
    },
    "gsap_motion": {               // Require GSAP animations
      "enabled": true
    },
    "meta_label_ban": {            // Ban cheap labels like "SECTION 01"
      "enabled": true
    },
    "button_contrast": {           // Ensure button text legibility
      "enabled": true
    },
    "typography": {                // Require approved fonts
      "enabled": true
    },
    "horizontal_scroll_prevention": { // Prevent horizontal scroll
      "enabled": true
    },
    "aida_structure": {            // Require AIDA page structure
      "enabled": true
    }
  }
}
```

## Phased Rollout Strategy

### Week 1: Soft Mode (Warnings Only)

```json
{
  "enforcement_mode": "soft"
}
```

- Allow team to see feedback without blocking merges
- Gather data on common failures and false positives

### Week 2: Refine Rules

Adjust configuration based on actual findings:

```json
{
  "review_threshold": 80,
  "rules": {
    "hero_max_lines": {
      "enabled": true,
      "max_lines": 3
    }
  }
}
```

### Week 3: Hard Mode for Critical Paths

```json
{
  "enforcement_mode": "hard",
  "include_patterns": [
    "app/**/*.tsx",
    "components/**/*.tsx"
  ]
}
```

### Week 4: Full Hard Gate

```json
{
  "enforcement_mode": "hard"
}
```

## Design Rules

### 1. Hero Line Limits

H1 elements must never exceed 3 lines. Use wide containers:

```tsx
// Good
<h1 className="max-w-5xl text-[clamp(3rem,5vw,5.5rem)]">
  Protect Your Digital Assets
</h1>

// Bad - too narrow, will wrap to 4+ lines
<h1 className="max-w-md text-6xl">
  Protect Your Digital Assets with Advanced Security
</h1>
```

### 2. Bento Grid Density

Grids must use `grid-flow-dense` with mathematically verified spans:

```tsx
// Good
<div className="grid grid-cols-12 grid-flow-dense gap-4">
  <div className="col-span-8 row-span-4">...</div>
  <div className="col-span-4 row-span-4">...</div>
  <div className="col-span-5 row-span-4">...</div>
  <div className="col-span-7 row-span-4">...</div>
</div>
```

### 3. Section Spacing

Major sections must have `py-32 md:py-48` minimum:

```tsx
<section className="py-32 md:py-48">
  {/* Content */}
</section>
```

### 4. GSAP Motion

Every interactive element needs hover physics:

```tsx
<div className="overflow-hidden">
  <div className="transition-transform duration-700 ease-out group-hover:scale-105">
    {/* Content */}
  </div>
</div>
```

### 5. Meta-Label Ban

Banned labels (use descriptive text instead):

- SECTION 01, SECTION 02, etc.
- QUESTION 01, QUESTION 02, etc.
- STEP 01, STEP 02, etc.
- PHASE 01, PHASE 02, etc.
- ABOUT US

### 6. Button Contrast

```tsx
// Dark background
<button className="bg-[#080b10] text-white">

// Light background
<button className="bg-white text-[#080b10]">
```

### 7. Typography

Approved fonts:
- Satoshi
- Cabinet Grotesk
- Outfit
- Geist

Banned fonts:
- Inter
- Arial
- Helvetica

### 8. Horizontal Scroll Prevention

Wrap the page to prevent horizontal scrollbars from off-screen animations:

```tsx
<main className="overflow-x-hidden w-full max-w-full">
  {/* Page content */}
</main>
```

### 9. AIDA Structure

Pages must follow the Attention-Interest-Desire-Action framework:

```tsx
// Good
<nav>...</nav>           {/* Attention: Navigation */}
<section className="hero">...</section>  {/* Interest: Hero */}
<section>...</section>   {/* Desire: Content */}
<section>...</section>   {/* Desire: More Content */}
<footer>...</footer>     {/* Action: Footer */}
```

### Out-of-Scope Rules

The following design-process rules are **not statically reviewable** and require manual design review:

- **Python-driven randomization** (font selection, layout assignment)
- **Component arsenal** (inline micro-images, horizontal accordions, infinite marquee)
- **Creative backgrounds** (CSS filters, radial gradients)
- **Pre-flight design plans** (`<design_plan>` blocks)

## API vs Local Review

| Feature | API Review (`gpt-taste-api-review.js`) | Local Review (`gpt-taste-local.js`) |
|---------|----------------------------------------|-------------------------------------|
| **Requires API key** | Yes (`ANTHROPIC_API_KEY`) | No |
| **Accuracy** | High (AI-powered analysis) | Medium (static heuristics) |
| **Speed** | Slower (API call + response) | Fast (local regex analysis) |
| **Use case** | CI/CD, final PR review | Local development, pre-commit |
| **Fallback** | Falls back to local if API fails | No fallback needed |

**Recommendation:** Use local review during development for quick feedback. The API review runs automatically in CI/CD for thorough analysis.

## Troubleshooting

### API Errors

If the Anthropic API fails, the script falls back to local static analysis. Check the workflow logs for details.

### False Positives

If you encounter false positives:

1. Update `.claude/gpt-taste-config.json` to refine rules
2. Add specific file patterns to `exclude_patterns`
3. Temporarily switch to `soft` mode

### Performance

The workflow typically completes in 2-5 minutes. If it takes longer:

- The API may be experiencing high load
- Large files are automatically truncated to 8000 characters
- Consider reducing `include_patterns` scope

## Security

- `ANTHROPIC_API_KEY` is stored as a GitHub Secret
- File content is sanitized before sending to API
- Secrets in code are not sent to the API
- Consider caching reviews for unchanged files to reduce API costs
