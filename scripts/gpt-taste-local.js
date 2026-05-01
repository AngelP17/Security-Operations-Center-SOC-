#!/usr/bin/env node

/**
 * GPT-Taste Local Review Script
 * 
 * Run this locally to review specific files or the entire codebase
 * without making API calls. Uses static analysis heuristics.
 * 
 * Usage:
 *   npm run qa:frontend                    # Review all eligible files
 *   npm run qa:frontend -- --files app/page.tsx  # Review specific files
 *   npm run qa:frontend -- --staged      # Review git staged files
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Parse arguments
const args = process.argv.slice(2);
const specificFiles = [];
let reviewStaged = false;
let reviewChanged = false;

for (let i = 0; i < args.length; i++) {
  if (args[i] === '--files' && args[i + 1]) {
    specificFiles.push(...args[i + 1].split(','));
    i++;
  } else if (args[i] === '--staged') {
    reviewStaged = true;
  } else if (args[i] === '--changed') {
    reviewChanged = true;
  }
}

// Load configuration
const configPath = path.join(process.cwd(), '.claude', 'gpt-taste-config.json');
if (!fs.existsSync(configPath)) {
  console.error('Error: GPT-Taste configuration not found at .claude/gpt-taste-config.json');
  process.exit(1);
}

const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
const rules = config.rules;

// Collect files to review
let filesToReview = [];

if (specificFiles.length > 0) {
  filesToReview = specificFiles.map(f => path.resolve(f)).filter(f => fs.existsSync(f));
} else if (reviewStaged) {
  try {
    const staged = execSync('git diff --cached --name-only --diff-filter=ACM', { encoding: 'utf8' });
    filesToReview = staged.split('\n').filter(f => f.match(/\.(ts|tsx|css)$/));
  } catch (err) {
    console.error('Error getting staged files:', err.message);
    process.exit(1);
  }
} else if (reviewChanged) {
  try {
    const changed = execSync('git diff --name-only HEAD~1', { encoding: 'utf8' });
    filesToReview = changed.split('\n').filter(f => f.match(/\.(ts|tsx|css)$/));
  } catch (err) {
    console.error('Error getting changed files:', err.message);
    process.exit(1);
  }
} else {
  // Review all eligible files
  function findFiles(dir, pattern) {
    const files = [];
    const items = fs.readdirSync(dir);
    for (const item of items) {
      const fullPath = path.join(dir, item);
      const stat = fs.statSync(fullPath);
      if (stat.isDirectory() && !item.startsWith('.') && item !== 'node_modules') {
        files.push(...findFiles(fullPath, pattern));
      } else if (stat.isFile() && item.match(pattern)) {
        files.push(fullPath);
      }
    }
    return files;
  }
  
  filesToReview = findFiles(process.cwd(), /\.(ts|tsx|css)$/);
}

// Filter excluded patterns
filesToReview = filesToReview.filter(filePath => {
  const relativePath = path.relative(process.cwd(), filePath);
  return !config.exclude_patterns.some(pattern => {
    const regex = new RegExp(pattern.replace(/\*\*/g, '.*').replace(/\*/g, '[^/]*'));
    return regex.test(relativePath);
  });
});

if (filesToReview.length === 0) {
  console.log('No files to review');
  process.exit(0);
}

console.log('GPT-Taste Local QA Review');
console.log('=========================');
console.log(`Mode: ${config.enforcement_mode.toUpperCase()}`);
console.log(`Threshold: ${config.review_threshold}/100`);
console.log(`Files: ${filesToReview.length}`);
console.log('');

// Review each file
const allFindings = [];
let totalScore = 100;

for (const filePath of filesToReview) {
  const relativePath = path.relative(process.cwd(), filePath);
  const content = fs.readFileSync(filePath, 'utf8');
  const lines = content.split('\n');
  const fileFindings = [];

  // Rule 1: Hero line limits
  if (rules.hero_max_lines.enabled && (content.includes('<h1') || content.includes('h1>'))) {
    const hasWideContainer = /max-w-(5xl|6xl|7xl|8xl|9xl|full|\[\d+px\])/.test(content);
    const hasClamp = content.includes('clamp(');
    
    if (!hasWideContainer) {
      fileFindings.push({
        rule: 'hero_max_lines',
        status: 'warn',
        line: null,
        message: `H1 may not have sufficient width container. Use ${rules.hero_max_lines.min_container_width} or wider with clamp() font sizing.`
      });
    } else if (hasWideContainer && hasClamp) {
      fileFindings.push({
        rule: 'hero_max_lines',
        status: 'pass',
        line: null,
        message: 'H1 has wide container and clamp() sizing for proper line control.'
      });
    }
  }

  // Rule 2: Bento grid density
  if (rules.bento_grid_density.enabled && content.includes('grid')) {
    const hasDenseFlow = content.includes('grid-flow-dense') || content.includes('grid-auto-flow: dense');
    const hasColSpan = content.includes('col-span-');
    
    if (hasColSpan && !hasDenseFlow) {
      fileFindings.push({
        rule: 'bento_grid_density',
        status: 'warn',
        line: null,
        message: 'Grid with col-span should use grid-flow-dense to prevent empty cells.'
      });
    } else if (hasColSpan && hasDenseFlow) {
      fileFindings.push({
        rule: 'bento_grid_density',
        status: 'pass',
        line: null,
        message: 'Grid uses grid-flow-dense for gapless bento layout.'
      });
    }
  }

  // Rule 3: Section spacing
  if (rules.section_spacing.enabled) {
    const hasSpacing = new RegExp(`py-(3[2-9]|[4-9][0-9])`).test(content);
    const hasSection = content.includes('<section') || content.includes('className=') && content.includes('py-');
    
    if (hasSection && !hasSpacing) {
      fileFindings.push({
        rule: 'section_spacing',
        status: 'warn',
        line: null,
        message: `Consider using ${rules.section_spacing.min_vertical_padding} or greater vertical padding between major sections.`
      });
    } else if (hasSection && hasSpacing) {
      fileFindings.push({
        rule: 'section_spacing',
        status: 'pass',
        line: null,
        message: 'Adequate section spacing found.'
      });
    }
  }

  // Rule 4: GSAP motion
  if (rules.gsap_motion.enabled) {
    const hasGSAP = content.includes('gsap') || content.includes('ScrollTrigger');
    const hasHoverPhysics = content.includes('group-hover:scale-') || content.includes('transition-transform');
    const hasClickable = content.includes('onClick') || content.includes('href=') || content.includes('<a ');
    
    if (hasGSAP) {
      fileFindings.push({
        rule: 'gsap_motion',
        status: 'pass',
        line: null,
        message: 'GSAP imports found for scroll animations.'
      });
    }
    
    if (hasClickable && !hasHoverPhysics) {
      fileFindings.push({
        rule: 'gsap_motion',
        status: 'warn',
        line: null,
        message: 'Interactive elements should have hover physics (group-hover:scale-105, transition-transform).'
      });
    } else if (hasClickable && hasHoverPhysics) {
      fileFindings.push({
        rule: 'gsap_motion',
        status: 'pass',
        line: null,
        message: 'Hover physics found on interactive elements.'
      });
    }
  }

  // Rule 5: Meta-label ban
  if (rules.meta_label_ban.enabled) {
    const bannedRegex = new RegExp(`(${rules.meta_label_ban.banned_labels.join('|').replace(/\s+/g, '\\s+')})`, 'gi');
    
    lines.forEach((line, idx) => {
      const match = line.match(bannedRegex);
      if (match) {
        fileFindings.push({
          rule: 'meta_label_ban',
          status: 'fail',
          line: idx + 1,
          message: `Banned meta-label found: "${match[0]}". Use descriptive text instead.`
        });
      }
    });
    
    if (!content.match(bannedRegex)) {
      fileFindings.push({
        rule: 'meta_label_ban',
        status: 'pass',
        line: null,
        message: 'No banned meta-labels found.'
      });
    }
  }

  // Rule 6: Button contrast
  if (rules.button_contrast.enabled) {
    const hasButtons = content.includes('<button') || content.includes('role="button"');
    const hasExplicitColors = /bg-\[?#/.test(content) && /text-\[?#/.test(content);
    
    if (hasButtons && !hasExplicitColors) {
      fileFindings.push({
        rule: 'button_contrast',
        status: 'warn',
        line: null,
        message: 'Buttons should have explicit background and text colors for proper contrast.'
      });
    } else if (hasButtons && hasExplicitColors) {
      fileFindings.push({
        rule: 'button_contrast',
        status: 'pass',
        line: null,
        message: 'Buttons have explicit color styling.'
      });
    }
  }

  // Rule 7: Typography
  if (rules.typography.enabled) {
    let hasBanned = false;
    let hasApproved = false;
    
    for (const font of rules.typography.banned_fonts) {
      const regex = new RegExp(`font-family.*${font}|font-[${font.toLowerCase()}]`, 'i');
      if (regex.test(content)) {
        hasBanned = true;
        fileFindings.push({
          rule: 'typography',
          status: 'fail',
          line: null,
          message: `Banned font "${font}" found. Use approved fonts: ${rules.typography.approved_fonts.join(', ')}`
        });
      }
    }
    
    for (const font of rules.typography.approved_fonts) {
      const regex = new RegExp(`font-family.*${font}|${font.toLowerCase()}`, 'i');
      if (regex.test(content)) {
        hasApproved = true;
      }
    }
    
    if (!hasBanned && hasApproved) {
      fileFindings.push({
        rule: 'typography',
        status: 'pass',
        line: null,
        message: `Approved font found.`
      });
    }
  }

  // Rule 8: Horizontal scroll prevention
  if (rules.horizontal_scroll_prevention.enabled) {
    const isLayoutOrPage = relativePath.includes('layout') || relativePath.includes('page');
    const hasOverflowHidden = content.includes('overflow-x-hidden');
    
    if (isLayoutOrPage && !hasOverflowHidden) {
      fileFindings.push({
        rule: 'horizontal_scroll_prevention',
        status: 'warn',
        line: null,
        message: 'Add overflow-x-hidden to prevent horizontal scrollbars from off-screen animations.'
      });
    } else if (isLayoutOrPage && hasOverflowHidden) {
      fileFindings.push({
        rule: 'horizontal_scroll_prevention',
        status: 'pass',
        line: null,
        message: 'Horizontal scroll prevention found.'
      });
    }
  }

  // Rule 9: AIDA structure (check for basic structure)
  if (rules.aida_structure.enabled && (relativePath.includes('page') || relativePath.includes('layout'))) {
    const hasNav = content.includes('<nav') || content.includes('navigation') || content.includes('nav-');
    const hasHero = content.includes('hero') || content.includes('Hero');
    const hasFooter = content.includes('<footer') || content.includes('Footer');
    
    if (hasNav && hasHero && hasFooter) {
      fileFindings.push({
        rule: 'aida_structure',
        status: 'pass',
        line: null,
        message: 'Page has Navigation, Hero, and Footer structure.'
      });
    } else {
      const missing = [];
      if (!hasNav) missing.push('navigation');
      if (!hasHero) missing.push('hero');
      if (!hasFooter) missing.push('footer');
      
      fileFindings.push({
        rule: 'aida_structure',
        status: 'warn',
        line: null,
        message: `Missing AIDA elements: ${missing.join(', ')}. Ensure Navigation -> Hero -> Content -> Footer structure.`
      });
    }
  }

  // Calculate file score
  const fileFailures = fileFindings.filter(f => f.status === 'fail').length;
  const fileWarnings = fileFindings.filter(f => f.status === 'warn').length;
  const fileScore = Math.max(0, 100 - (fileFailures * 15) - (fileWarnings * 5));
  
  // Output file results
  console.log(`\n${relativePath}`);
  console.log(`${'-'.repeat(relativePath.length)}`);
  console.log(`Score: ${fileScore}/100`);
  
  const failures = fileFindings.filter(f => f.status === 'fail');
  const warnings = fileFindings.filter(f => f.status === 'warn');
  const passes = fileFindings.filter(f => f.status === 'pass');
  
  if (failures.length > 0) {
    console.log('\n  Failures:');
    failures.forEach(f => {
      console.log(`    [FAIL] ${f.rule}${f.line ? ` (line ${f.line})` : ''}: ${f.message}`);
    });
  }
  
  if (warnings.length > 0) {
    console.log('\n  Warnings:');
    warnings.forEach(f => {
      console.log(`    [WARN] ${f.rule}${f.line ? ` (line ${f.line})` : ''}: ${f.message}`);
    });
  }
  
  if (passes.length > 0) {
    console.log('\n  Passed:');
    passes.forEach(f => {
      console.log(`    [PASS] ${f.rule}: ${f.message}`);
    });
  }

  allFindings.push(...fileFindings.map(f => ({ ...f, file: relativePath })));
  totalScore = Math.min(totalScore, fileScore);
}

// Final summary
const totalFailures = allFindings.filter(f => f.status === 'fail').length;
const totalWarnings = allFindings.filter(f => f.status === 'warn').length;
const overallScore = Math.max(0, 100 - (totalFailures * 15) - (totalWarnings * 5));
const passed = overallScore >= config.review_threshold && totalFailures === 0;

console.log('\n' + '='.repeat(50));
console.log('FINAL SUMMARY');
console.log('='.repeat(50));
console.log(`Overall Score: ${overallScore}/100`);
console.log(`Status: ${passed ? 'PASSED' : 'FAILED'}`);
console.log(`Failures: ${totalFailures}`);
console.log(`Warnings: ${totalWarnings}`);
console.log(`Mode: ${config.enforcement_mode.toUpperCase()}`);

if (config.enforcement_mode === 'hard' && !passed) {
  console.log('\nGPT-Taste QA FAILED in hard mode');
  process.exit(1);
}

console.log('\nGPT-Taste QA completed');
process.exit(0);
