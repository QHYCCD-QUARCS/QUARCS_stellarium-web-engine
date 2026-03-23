#!/usr/bin/env node
/**
 * 批量为 Vue SFC 的 <template> 自动补齐 data-testid（根容器 + 交互元素）。
 *
 * 目标：
 * - 覆盖所有 src/components/*.vue
 * - 不引入 :data-testid 的模板表达式（避免非法字符/不稳定）
 * - 对 v-for 元素补充 :data-index（若能解析出 index 变量）
 * - 保证单文件内 data-testid 不重复；跨文件通过前缀减少冲突
 *
 * 用法：
 *   node scripts/auto-add-testids.js
 */

const fs = require('fs');
const path = require('path');

const COMPONENTS_DIR = path.join(__dirname, '../src');

// 文件 -> 前缀映射（按计划）
const PREFIX_BY_FILE = {
  'AutomaticPolarAlignmentCalibration.vue': 'pa-',
  'CapturePanel.vue': 'cp-',
  'MountControlPanel.vue': 'mcp-',
  'FocuserPanel.vue': 'fp-',
  'ImageManagerPanel.vue': 'imp-',
  'SchedulePanel.vue': 'scp-',
  'HistogramPanel.vue': 'hp-',
  'DeviceAllocationPanel.vue': 'dap-',
  'DevicePicker.vue': 'dp-',
  'toolbar.vue': 'tb-',
  'gui.vue': 'gui-',
  'bottom-bar.vue': 'bb-',
};

function kebabCase(input) {
  return String(input)
    .replace(/([a-z0-9])([A-Z])/g, '$1-$2')
    .replace(/[_\s]+/g, '-')
    .replace(/[^a-zA-Z0-9-]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .toLowerCase();
}

function shortUiPrefixForFile(file) {
  const base = file.replace(/\.vue$/i, '');
  // 如果传入的是相对路径（包含 /），将路径也纳入前缀，减少跨目录同名冲突
  return `ui-${kebabCase(base)}-`;
}

function getPrefix(file) {
  return PREFIX_BY_FILE[file] || shortUiPrefixForFile(file);
}

function collectExistingTestIds(template) {
  const ids = new Set();
  const re = /\bdata-testid\s*=\s*["']([^"']+)["']/g;
  let m;
  while ((m = re.exec(template)) !== null) ids.add(m[1]);
  return ids;
}

function hasTestId(openTag) {
  return /\bdata-testid\s*=/.test(openTag) || /\b:data-testid\s*=/.test(openTag);
}

function hasDataIndex(openTag) {
  return /\bdata-index\s*=/.test(openTag) || /\b:data-index\s*=/.test(openTag);
}

function extractHandlerName(openTag) {
  // 支持 @click="foo" / @click.stop="foo()" / @mousedown="foo('x')"
  const m = openTag.match(/@(?:click|change|input|submit|mousedown|mouseup|touchstart|touchend)(?:\.[a-zA-Z-]+)*\s*=\s*["']([^"']+)["']/);
  if (!m) return null;
  const expr = m[1].trim();
  if (!expr) return null;
  if (expr.startsWith('(') || expr.includes('=>')) return null;
  const name = expr.split('(')[0].trim();
  if (!name || /[^a-zA-Z0-9_$\.]/.test(name)) return null;
  return name.split('.').pop();
}

function extractAttr(openTag, attrName) {
  const re = new RegExp(`\\b${attrName}\\s*=\\s*["']([^"']+)["']`);
  const m = openTag.match(re);
  return m ? m[1].trim() : null;
}

function extractVModel(openTag) {
  const m = openTag.match(/\bv-model(?:\.[a-zA-Z-]+)?\s*=\s*["']([^"']+)["']/);
  if (!m) return null;
  const expr = m[1].trim();
  if (!expr || expr.includes('(') || expr.includes('=>')) return null;
  return expr.split('.').pop();
}

function extractVForIndexVar(openTag) {
  const m = openTag.match(/\bv-for\s*=\s*["']\s*\(\s*([a-zA-Z_$][\w$]*)\s*,\s*([a-zA-Z_$][\w$]*)\s*\)\s+in\s+[^"']+["']/);
  if (!m) return null;
  return m[2];
}

function hasEventHandler(openTag) {
  // 覆盖常见交互事件（含修饰符 .stop/.prevent 等）
  return /@(?:click|change|input|submit|mousedown|mouseup|mousemove|mouseenter|mouseleave|touchstart|touchend|touchmove|wheel|keydown|keyup|focus|blur)(?:\.[a-zA-Z-]+)*/.test(
    openTag,
  );
}

function pickName(openTag) {
  return (
    extractHandlerName(openTag) ||
    extractAttr(openTag, 'ref') ||
    extractAttr(openTag, 'id') ||
    extractAttr(openTag, 'name') ||
    extractVModel(openTag) ||
    extractAttr(openTag, 'aria-label') ||
    extractAttr(openTag, 'label') ||
    extractAttr(openTag, 'placeholder') ||
    (() => {
      const cls = extractAttr(openTag, 'class');
      if (!cls) return null;
      return cls.split(/\s+/)[0];
    })()
  );
}

function uniqueId(used, candidate) {
  let id = candidate;
  let i = 2;
  while (used.has(id)) {
    id = `${candidate}-${i++}`;
  }
  used.add(id);
  return id;
}

function injectAttr(openTag, attrText) {
  // 插入在结尾 > 或 />
  if (openTag.endsWith('/>')) return openTag.replace(/\s*\/>$/, ` ${attrText} />`);
  return openTag.replace(/>$/, ` ${attrText}>`);
}

function addRootTestId(template, prefix, usedIds) {
  // 找到第一个非 transition/keep-alive 的标签，给它加 root
  const rootRe = /<([a-zA-Z][\w-]*)([^>]*)>/m;
  const m = template.match(rootRe);
  if (!m) return { template, changed: false };
  const full = m[0];
  const tag = m[1];
  if (tag === 'transition' || tag === 'keep-alive') {
    // 找第一个子 div/v-* 作为 root
    const subRe = /<((?:div)|(?:v-[\w-]+)|(?:span)|(?:section)|(?:main))([^>]*)>/m;
    const sm = template.match(subRe);
    if (!sm) return { template, changed: false };
    const sfull = sm[0];
    if (hasTestId(sfull)) return { template, changed: false };
    const id = uniqueId(usedIds, `${prefix}root`);
    const replaced = injectAttr(sfull, `data-testid="${id}"`);
    return { template: template.replace(sfull, replaced), changed: true };
  }
  if (hasTestId(full)) return { template, changed: false };
  const id = uniqueId(usedIds, `${prefix}root`);
  const replaced = injectAttr(full, `data-testid="${id}"`);
  return { template: template.replace(full, replaced), changed: true };
}

function addTestIdsToTags(template, prefix, usedIds) {
  let changed = 0;

  // 需要处理的 tag 列表（开标签）
  const tagNames = [
    'button',
    'input',
    'select',
    'textarea',
    'v-btn',
    'v-text-field',
    'v-select',
    'v-checkbox',
    'v-radio',
    'v-switch',
    'v-slider',
    'v-textarea',
  ];
  const tagRe = new RegExp(`<(${tagNames.join('|')})(\\s[^>]*?)?>`, 'g');

  template = template.replace(tagRe, (match, tagName, attrs = '') => {
    const openTag = match;
    if (hasTestId(openTag)) return openTag;

    const name = pickName(openTag);
    const type =
      tagName === 'button' || tagName === 'v-btn' ? 'btn' :
      tagName === 'input' ? 'input' :
      tagName === 'select' || tagName === 'v-select' ? 'select' :
      tagName === 'textarea' || tagName === 'v-textarea' ? 'textarea' :
      tagName === 'v-text-field' ? 'input' :
      tagName === 'v-checkbox' ? 'checkbox' :
      tagName === 'v-radio' ? 'radio' :
      tagName === 'v-switch' ? 'switch' :
      tagName === 'v-slider' ? 'slider' :
      'el';

    const baseName = name ? kebabCase(name) : 'auto';
    const candidate = `${prefix}${type}-${baseName}`;
    const id = uniqueId(usedIds, candidate);

    let replaced = injectAttr(openTag, `data-testid="${id}"`);

    // v-for 的元素，尽可能加 :data-index
    if (!hasDataIndex(replaced)) {
      const idx = extractVForIndexVar(replaced);
      if (idx) replaced = injectAttr(replaced, `:data-index="${idx}"`);
    }

    changed++;
    return replaced;
  });

  // 第二轮：给“有事件处理器但不是标准表单/按钮标签”的元素补齐 testid
  // 例如 <div @click="...">、<span @mousedown="...">、<v-icon @click="...">
  const anyTagRe = /<([a-zA-Z][\w-]*)(\s[^>]*?)?>/g;
  template = template.replace(anyTagRe, (match, tagName) => {
    const openTag = match;
    if (hasTestId(openTag)) return openTag;
    if (!hasEventHandler(openTag)) return openTag;

    // 跳过 SFC 顶层标签（理论上不会出现在 template 片段里，但做保护）
    if (tagName === 'template' || tagName === 'script' || tagName === 'style') return openTag;

    const name = pickName(openTag);
    const baseName = name ? kebabCase(name) : 'auto';
    const candidate = `${prefix}act-${baseName}`;
    const id = uniqueId(usedIds, candidate);

    let replaced = injectAttr(openTag, `data-testid="${id}"`);
    if (!hasDataIndex(replaced)) {
      const idx = extractVForIndexVar(replaced);
      if (idx) replaced = injectAttr(replaced, `:data-index="${idx}"`);
    }
    changed++;
    return replaced;
  });

  return { template, changed };
}

function processVueFile(filePath) {
  const rel = path.relative(COMPONENTS_DIR, filePath).replace(/\\/g, '/');
  const fileName = path.basename(filePath);
  const prefix = PREFIX_BY_FILE[fileName] || shortUiPrefixForFile(rel);
  const original = fs.readFileSync(filePath, 'utf8');

  const tStart = original.indexOf('<template>');
  const tEnd = original.indexOf('</template>');
  if (tStart === -1 || tEnd === -1 || tEnd <= tStart) return { fileName, changed: false, added: 0 };

  const before = original.slice(0, tStart + '<template>'.length);
  const template = original.slice(tStart + '<template>'.length, tEnd);
  const after = original.slice(tEnd);

  const usedIds = collectExistingTestIds(template);

  const rootRes = addRootTestId(template, prefix, usedIds);
  const tagRes = addTestIdsToTags(rootRes.template, prefix, usedIds);

  const added = (rootRes.changed ? 1 : 0) + tagRes.changed;
  if (added === 0) return { fileName, changed: false, added: 0 };

  const next = before + tagRes.template + after;
  fs.writeFileSync(filePath, next, 'utf8');
  return { fileName, changed: true, added };
}

function main() {
  const files = [];
  const walk = (dir) => {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const e of entries) {
      const abs = path.join(dir, e.name);
      if (e.isDirectory()) walk(abs);
      else if (e.isFile() && e.name.endsWith('.vue')) files.push(abs);
    }
  };
  walk(COMPONENTS_DIR);
  files.sort((a, b) => a.localeCompare(b));
  let totalAdded = 0;
  let touched = 0;

  console.log(`扫描组件目录: ${COMPONENTS_DIR}`);
  console.log(`Vue 文件数量: ${files.length}\n`);

  for (const f of files) {
    const res = processVueFile(f);
    if (res.changed) {
      touched++;
      totalAdded += res.added;
      console.log(`✅ ${res.fileName}: +${res.added}`);
    } else {
      console.log(`-  ${res.fileName}: unchanged`);
    }
  }

  console.log(`\n完成：修改 ${touched}/${files.length} 个组件，新增 data-testid 共 ${totalAdded} 个。`);
}

if (require.main === module) main();

