#!/usr/bin/env node

/**
 * GPT-Taste API Review Script
 * 
 * This script sends changed frontend files to the Anthropic API
 * for design QA review based on gpt-taste standards.
 * 
 * Environment variables:
 *   ANTHROPIC_API_KEY - Required. Your Anthropic API key.
 *   CHANGED_FILES - Space-separated list of changed file paths.
 *   REVIEW_OUTPUT - Optional. Path to write review JSON. Defaults to ./gpt-taste-review.json
 */

const fs = require('fs');
const path = require('path');
const https = require('https');

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
const CHANGED_FILES = (process.env.CHANGED_FILES || '').split(' ').filter(Boolean);
const REVIEW_OUTPUT = process.env.REVIEW_OUTPUT || './gpt-taste-review.json';

if (!ANTHROPIC_API_KEY) {
  console.error('Error: ANTHROPIC_API_KEY environment variable is required');
  process.exit(1);
}

if (CHANGED_FILES.length === 0) {
  console.log('No changed files to review');
  // Write a passing review with no findings
  fs.writeFileSync(REVIEW_OUTPUT, JSON.stringify({
    overall_score: 100,
    pass: true,
    findings: [],
    message: 'No changed frontend files to review'
  }, null, 2));
  process.exit(0);
}

// Load configuration
const configPath = path.join(process.cwd(), '.claude', 'gpt-taste-config.json');
if (!fs.existsSync(configPath)) {
  console.error('Error: GPT-Taste configuration not found at .claude/gpt-taste-config.json');
  process.exit(1);
}

const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));

// Read changed files
const filesToReview = [];
for (const filePath of CHANGED_FILES) {
  const fullPath = path.join(process.cwd(), filePath);
  if (fs.existsSync(fullPath) && fs.statSync(fullPath).isFile()) {
    // Skip excluded patterns
    const isExcluded = config.exclude_patterns.some(pattern => {
      const regex = new RegExp(pattern.replace(/\*\*/g, '.*').replace(/\*/g, '[^/]*'));
      return regex.test(filePath);
    });
    
    if (!isExcluded) {
      const content = fs.readFileSync(fullPath, 'utf8');
      // Sanitize: truncate very large files
      const maxLength = 8000;
      const sanitized = content.length > maxLength 
        ? content.substring(0, maxLength) + '\n\n// ... [truncated for review]'
        : content;
      
      filesToReview.push({
        path: filePath,
        content: sanitized
      });
    }
  }
}

if (filesToReview.length === 0) {
  console.log('No eligible files to review after filtering');
  fs.writeFileSync(REVIEW_OUTPUT, JSON.stringify({
    overall_score: 100,
    pass: true,
    findings: [],
    message: 'No eligible files to review after filtering'
  }, null, 2));
  process.exit(0);
}

// Build the review prompt
function buildPrompt(files, config) {
  const rules = config.rules;
  
  let prompt = `You are an expert frontend design QA specialist enforcing Awwwards-level design standards. Review the following changed frontend files against the GPT-Taste design system rules.

## Design Rules

1. **Hero Line Limits** (Rule: hero_max_lines)
   - H1 elements must never exceed ${rules.hero_max_lines.max_lines} lines
   - Must use wide containers (${rules.hero_max_lines.min_container_width} or wider)
   - Font size should use clamp() to ensure proper flow

2. **Bento Grid Density** (Rule: bento_grid_density)
   - Grids must use \`grid-flow-dense\` or \`grid-auto-flow: dense\`
   - col-span and row-span values must interlock mathematically with no empty cells
   - Use 3-5 highly intentional cards, not 8+ messy ones

3. **Section Spacing** (Rule: section_spacing)
   - Minimum ${rules.section_spacing.min_vertical_padding} vertical padding between major sections
   - Sections must feel like distinct cinematic chapters

4. **GSAP Motion** (Rule: gsap_motion)
   - Every clickable element must have hover physics (group-hover:scale-105, transition-transform duration-700)
   - Scroll animations must use GSAP ScrollTrigger
   - Cards must have overflow-hidden containers for hover effects

5. **Meta-Label Ban** (Rule: meta_label_ban)
   - BANNED labels: ${rules.meta_label_ban.banned_labels.join(', ')}
   - No cheap section numbering or generic labels allowed

6. **Button Contrast** (Rule: button_contrast)
   - Dark background must use ${rules.button_contrast.dark_bg_text} text
   - Light background must use ${rules.button_contrast.light_bg_text} text
   - Text must be perfectly legible, never invisible

7. **Typography** (Rule: typography)
   - Approved fonts: ${rules.typography.approved_fonts.join(', ')}
   - BANNED fonts: ${rules.typography.banned_fonts.join(', ')}
   - Never use Inter or system defaults as primary fonts

8. **Horizontal Scroll Prevention** (Rule: horizontal_scroll_prevention)
   - Page wrapper must have overflow-x-hidden w-full max-w-full

9. **AIDA Structure** (Rule: aida_structure)
   - Must have: Navigation -> Hero -> Content Sections -> Footer
   - Follow Attention, Interest, Desire, Action framework

## Files to Review

`;

  for (const file of files) {
    prompt += `### ${file.path}\n\n`;
    prompt += '```tsx\n';
    prompt += file.content;
    prompt += '\n```\n\n';
  }

  prompt += `## Instructions

Analyze each file against ALL rules above. For each rule, check every relevant element.

Return a JSON object with this exact structure:

{
  "overall_score": 0-100,
  "pass": boolean,
  "findings": [
    {
      "rule": "hero_max_lines|bento_grid_density|section_spacing|gsap_motion|meta_label_ban|button_contrast|typography|horizontal_scroll_prevention|aida_structure",
      "status": "pass|fail|warn",
      "file": "path/to/file",
      "line": number or null,
      "message": "Clear description of the issue or confirmation of compliance"
    }
  ]
}

Scoring:
- Start at 100 points
- Deduct 15 points for each fail
- Deduct 5 points for each warn
- Score must be >= ${config.review_threshold} to pass

Be thorough but concise. Focus on actual issues, not theoretical concerns.`;

  return prompt;
}

// Call Anthropic API
async function callAnthropicAPI(prompt) {
  return new Promise((resolve, reject) => {
    const requestBody = JSON.stringify({
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: 4096,
      temperature: 0.1,
      messages: [
        {
          role: 'user',
          content: prompt
        }
      ]
    });

    const options = {
      hostname: 'api.anthropic.com',
      path: '/v1/messages',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
        'Content-Length': Buffer.byteLength(requestBody)
      },
      timeout: 120000 // 2 minute timeout
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        try {
          const response = JSON.parse(data);
          if (response.error) {
            reject(new Error(`Anthropic API error: ${response.error.message}`));
            return;
          }
          
          const content = response.content?.[0]?.text || '';
          
          // Extract JSON from response
          const jsonMatch = content.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            const review = JSON.parse(jsonMatch[0]);
            resolve(review);
          } else {
            reject(new Error('Could not extract JSON from API response'));
          }
        } catch (err) {
          reject(new Error(`Failed to parse API response: ${err.message}`));
        }
      });
    });

    req.on('error', (err) => {
      reject(new Error(`API request failed: ${err.message}`));
    });

    req.on('timeout', () => {
      req.destroy();
      reject(new Error('API request timed out'));
    });

    req.write(requestBody);
    req.end();
  });
}

// Local fallback review (when API is unavailable)
function localReview(files, config) {
  const findings = [];
  let score = 100;
  
  for (const file of files) {
    const content = file.content;
    
    // Check hero line limits
    if (content.includes('h1') || content.includes('<h1')) {
      const hasWideContainer = /max-w-(5xl|6xl|7xl|8xl|9xl|full|\[\d+px\])/.test(content);
      if (!hasWideContainer) {
        findings.push({
          rule: 'hero_max_lines',
          status: 'warn',
          file: file.path,
          line: null,
          message: 'H1 may not have sufficient width container. Consider using max-w-5xl or wider.'
        });
        score -= 5;
      }
    }
    
    // Check bento grid density
    if (content.includes('grid') && (content.includes('bento') || content.includes('col-span'))) {
      const hasDenseFlow = content.includes('grid-flow-dense') || content.includes('grid-auto-flow: dense');
      if (!hasDenseFlow) {
        findings.push({
          rule: 'bento_grid_density',
          status: 'warn',
          file: file.path,
          line: null,
          message: 'Grid may be missing grid-flow-dense. This can leave empty cells in bento layouts.'
        });
        score -= 5;
      }
    }
    
    // Check section spacing
    if (content.includes('section') || content.includes('py-')) {
      const hasAdequateSpacing = /py-(3[2-9]|[4-9][0-9])/.test(content);
      if (!hasAdequateSpacing) {
        findings.push({
          rule: 'section_spacing',
          status: 'warn',
          file: file.path,
          line: null,
          message: 'Consider using py-32 or greater spacing between major sections.'
        });
        score -= 5;
      }
    }
    
    // Check GSAP motion
    if (content.includes('onClick') || content.includes('href=') || content.includes('group-hover')) {
      const hasHoverPhysics = content.includes('group-hover:scale-') || content.includes('transition-transform');
      if (!hasHoverPhysics) {
        findings.push({
          rule: 'gsap_motion',
          status: 'warn',
          file: file.path,
          line: null,
          message: 'Interactive elements should have hover physics (group-hover:scale-105, transition-transform).'
        });
        score -= 5;
      }
    }
    
    // Check meta labels
    const metaLabelRegex = /(SECTION\s+\d+|QUESTION\s+\d+|STEP\s+\d+|PHASE\s+\d+|ABOUT\s+US)/gi;
    if (metaLabelRegex.test(content)) {
      findings.push({
        rule: 'meta_label_ban',
        status: 'fail',
        file: file.path,
        line: null,
        message: 'Banned meta-label found. Use descriptive text instead of numbered sections.'
      });
      score -= 15;
    }
    
    // Check button contrast
    if (content.includes('button') || content.includes('Button')) {
      const hasContrast = /bg-\[?#/.test(content) || /text-\[?#/.test(content);
      if (!hasContrast) {
        findings.push({
          rule: 'button_contrast',
          status: 'warn',
          file: file.path,
          line: null,
          message: 'Ensure buttons have explicit contrast colors for text legibility.'
        });
        score -= 5;
      }
    }
    
    // Check typography
    const hasBannedFont = config.rules.typography.banned_fonts.some(font => {
      const regex = new RegExp(`font-family.*${font}|className.*${font.toLowerCase()}`, 'i');
      return regex.test(content);
    });
    if (hasBannedFont) {
      findings.push({
        rule: 'typography',
        status: 'fail',
        file: file.path,
        line: null,
        message: `Banned font detected. Use approved fonts: ${config.rules.typography.approved_fonts.join(', ')}`
      });
      score -= 15;
    }
    
    // Check horizontal scroll prevention
    if (file.path.includes('layout') || file.path.includes('page')) {
      const hasOverflowHidden = content.includes('overflow-x-hidden');
      if (!hasOverflowHidden) {
        findings.push({
          rule: 'horizontal_scroll_prevention',
          status: 'warn',
          file: file.path,
          line: null,
          message: 'Add overflow-x-hidden to prevent horizontal scrollbars from off-screen animations.'
        });
        score -= 5;
      }
    }
  }
  
  return {
    overall_score: Math.max(0, score),
    pass: score >= config.review_threshold,
    findings,
    mode: 'local_fallback'
  };
}

// Main execution
async function main() {
  console.log(`GPT-Taste QA Review`);
  console.log(`===================`);
  console.log(`Files to review: ${filesToReview.length}`);
  filesToReview.forEach(f => console.log(`  - ${f.path}`));
  console.log('');

  let review;
  
  try {
    const prompt = buildPrompt(filesToReview, config);
    console.log('Calling Anthropic API for review...');
    review = await callAnthropicAPI(prompt);
    console.log('API review completed successfully');
  } catch (err) {
    console.error(`API review failed: ${err.message}`);
    console.log('Falling back to local review...');
    review = localReview(filesToReview, config);
  }

  // Ensure score is within bounds
  review.overall_score = Math.max(0, Math.min(100, review.overall_score || 0));
  
  // Determine pass/fail
  review.pass = review.overall_score >= config.review_threshold && !review.findings.some(f => f.status === 'fail');

  // Write output
  fs.writeFileSync(REVIEW_OUTPUT, JSON.stringify(review, null, 2));
  
  // Console output
  console.log('');
  console.log(`Overall Score: ${review.overall_score}/100`);
  console.log(`Status: ${review.pass ? 'PASSED' : 'FAILED'}`);
  console.log(`Findings: ${review.findings.length}`);
  
  const failures = review.findings.filter(f => f.status === 'fail');
  const warnings = review.findings.filter(f => f.status === 'warn');
  const passes = review.findings.filter(f => f.status === 'pass');
  
  if (failures.length > 0) {
    console.log(`\nFailures (${failures.length}):`);
    failures.forEach(f => console.log(`  [FAIL] ${f.rule}: ${f.message} (${f.file})`));
  }
  
  if (warnings.length > 0) {
    console.log(`\nWarnings (${warnings.length}):`);
    warnings.forEach(f => console.log(`  [WARN] ${f.rule}: ${f.message} (${f.file})`));
  }
  
  if (passes.length > 0) {
    console.log(`\nPassed (${passes.length}):`);
    passes.forEach(f => console.log(`  [PASS] ${f.rule}: ${f.message} (${f.file})`));
  }

  console.log(`\nReview written to: ${REVIEW_OUTPUT}`);

  // Exit with appropriate code
  if (config.enforcement_mode === 'hard' && !review.pass) {
    console.error('\nGPT-Taste QA FAILED in hard mode');
    process.exit(1);
  }
  
  console.log('\nGPT-Taste QA completed');
  process.exit(0);
}

main().catch(err => {
  console.error(`Unhandled error: ${err.message}`);
  process.exit(1);
});
