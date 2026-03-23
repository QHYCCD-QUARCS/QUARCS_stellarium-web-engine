#!/usr/bin/env node
/**
 * 生成按组件/按前缀分类的 data-testid 文档（Markdown）。
 *
 * 输出：
 * - docs/e2e/components/<ComponentFile>.md
 * - docs/e2e/by-category/<prefix>.md
 *
 * 用法：
 *   node scripts/generate-category-docs.js
 */

const fs = require('fs');
const path = require('path');
const { TestIdScanner } = require('./scan-testids');

const COMPONENTS_DIR = path.join(__dirname, '../src');
const OUT_DIR = path.join(__dirname, '../docs/e2e');
const OUT_COMPONENTS_DIR = path.join(OUT_DIR, 'components');
const OUT_BY_CATEGORY_DIR = path.join(OUT_DIR, 'by-category');

function ensureDir(p) {
  if (!fs.existsSync(p)) fs.mkdirSync(p, { recursive: true });
}

function mdEscape(s) {
  return String(s).replace(/\|/g, '\\|');
}

function prefixOf(id) {
  const p = String(id).split('-')[0];
  return p ? `${p}-` : 'unknown-';
}

async function main() {
  ensureDir(OUT_COMPONENTS_DIR);
  ensureDir(OUT_BY_CATEGORY_DIR);

  const scanner = new TestIdScanner(COMPONENTS_DIR);
  const results = await scanner.scanAllComponents();

  // 1) 按组件输出
  Object.keys(results).sort().forEach((file) => {
    const r = results[file];
    const rows = [...r.testIds].sort((a, b) => a.line - b.line);

    let md = `# ${file}\n\n`;
    md += `- **标识数量**: ${rows.length}\n`;
    md += `- **路径**: \`${r.path}\`\n\n`;
    md += `| data-testid | 元素类型 | 行号 | data-state |\n`;
    md += `|---|---:|---:|---|\n`;
    rows.forEach((ti) => {
      md += `| \`${mdEscape(ti.id)}\` | ${mdEscape(ti.elementType)} | ${ti.line} | ${mdEscape(ti.dataState || '-') } |\n`;
    });

    fs.writeFileSync(path.join(OUT_COMPONENTS_DIR, file.replace(/\//g, '_') + '.md'), md, 'utf8');
  });

  // 2) 按前缀输出
  const byPrefix = new Map(); // prefix -> rows
  Object.keys(results).forEach((file) => {
    const r = results[file];
    r.testIds.forEach((ti) => {
      const p = prefixOf(ti.id);
      if (!byPrefix.has(p)) byPrefix.set(p, []);
      byPrefix.get(p).push({ id: ti.id, file, line: ti.line, elementType: ti.elementType, dataState: ti.dataState || '-' });
    });
  });

  [...byPrefix.keys()].sort().forEach((p) => {
    const rows = byPrefix.get(p).sort((a, b) => (a.id.localeCompare(b.id) || a.file.localeCompare(b.file) || a.line - b.line));
    let md = `# 前缀 ${p}\n\n`;
    md += `- **标识数量**: ${rows.length}\n\n`;
    md += `| data-testid | 组件 | 行号 | 元素类型 | data-state |\n`;
    md += `|---|---|---:|---:|---|\n`;
    rows.forEach((row) => {
      md += `| \`${mdEscape(row.id)}\` | ${mdEscape(row.file)} | ${row.line} | ${mdEscape(row.elementType)} | ${mdEscape(row.dataState)} |\n`;
    });
    fs.writeFileSync(path.join(OUT_BY_CATEGORY_DIR, `${p.replace(/[^a-zA-Z0-9-]/g, '')}.md`), md, 'utf8');
  });

  console.log(`\n✅ 分类文档已生成：\n- ${OUT_COMPONENTS_DIR}\n- ${OUT_BY_CATEGORY_DIR}\n`);
}

if (require.main === module) {
  main().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}

