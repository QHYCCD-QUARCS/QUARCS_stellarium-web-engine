#!/usr/bin/env node
/**
 * 测试标识验证工具
 * 验证 data-testid 的唯一性和命名规范
 * 
 * 用法: node validate-testids.js [rootDir]
 * - 默认扫描 ../src 下所有 .vue（递归）
 */

const fs = require('fs');
const path = require('path');

// 命名规范定义
const NAMING_CONVENTIONS = {
  prefixes: {
    'pa-': '极轴校准 (AutomaticPolarAlignmentCalibration)',
    'cp-': '拍摄面板 (CapturePanel)',
    'mcp-': '赤道仪控制 (MountControlPanel)',
    'fp-': '调焦面板 (FocuserPanel)',
    'imp-': '图像管理 (ImageManagerPanel)',
    'scp-': '计划面板 (SchedulePanel)',
    'hp-': '直方图面板 (HistogramPanel)',
    'dap-': '设备分配 (DeviceAllocationPanel)',
    'dp-': '设备选择器 (DevicePicker)',
    'sd-': '设置对话框 (Settings-Dialog)',
    'chart-': '图表组件',
    'tb-': '工具栏 (toolbar)',
    'gui-': '主界面 (gui)',
    'ui-': '通用组件',
    'bb-': '底部栏 (bottom-bar)'
  },
  
  suffixes: {
    '-panel': '面板容器',
    '-dialog': '对话框',
    '-btn-': '按钮',
    '-icon-': '图标',
    '-input-': '输入框',
    '-label-': '标签',
    '-value-': '数值显示',
    '-list-': '列表',
    '-item-': '列表项',
    '-header-': '标题栏',
    '-footer-': '底部栏',
    '-content-': '内容区域'
  }
};

class TestIdValidator {
  constructor(rootDir) {
    this.rootDir = rootDir;
    this.issues = [];
    this.testIdMap = new Map(); // testId -> [files]
    this.componentTestIds = {}; // file -> testIds
    this.testIdDetailMap = new Map(); // testId -> [{file,line,tagSnippet}]
  }

  normalizeBoundTestId(raw) {
    const v = String(raw || '').trim()
    if (!v) return null

    // 1) 模板字符串：`ui-foo-${bar}-baz` -> ui-foo-X-baz（用于命名/契约弱校验）
    if (v.startsWith('`') && v.endsWith('`')) {
      const inner = v.slice(1, -1)
      const replaced = inner.replace(/\$\{[^}]+\}/g, 'X')
      // 清掉可能残留的空白/引号等，保证只包含合法字符
      const cleaned = replaced.replace(/[^A-Za-z0-9_-]/g, '')
      return cleaned || null
    }

    // 2) 纯字符串字面量（极少见，但容错）：'ui-foo' / "ui-foo"
    if ((v.startsWith("'") && v.endsWith("'")) || (v.startsWith('"') && v.endsWith('"'))) {
      const inner = v.slice(1, -1)
      return inner.trim() || null
    }

    // 3) 其它复杂表达式：无法静态推断，跳过（避免把表达式当成 testId 触发误报）
    return null
  }

  listVueFiles() {
    /** @type {string[]} */
    const out = [];
    const walk = (dir) => {
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      for (const e of entries) {
        const abs = path.join(dir, e.name);
        if (e.isDirectory()) walk(abs);
        else if (e.isFile() && e.name.endsWith('.vue')) out.push(path.relative(this.rootDir, abs));
      }
    };
    walk(this.rootDir);
    return out.sort();
  }

  // 扫描并收集所有测试标识
  collectTestIds() {
    const files = this.listVueFiles();
    
    for (const file of files) {
      const filePath = path.join(this.rootDir, file);
      const content = fs.readFileSync(filePath, 'utf-8');
      const testIds = [];
      
      // 匹配 data-testid="xxx" / data-testid='xxx'，并兼容 :data-testid="`...${}...`"
      // 注意：Vue 表达式里经常出现单引号（例如 ? 'open' : 'closed'），这里不能用 [^"'] 直接截断。
      const regex = /data-testid=(?:"([^"]+)"|'([^']+)')/g;
      let match;
      
      while ((match = regex.exec(content)) !== null) {
        const raw = match[1] || match[2];
        // 是否为绑定写法 :data-testid="..."
        const isBound = match.index > 0 && content[match.index - 1] === ':';
        let testId = raw;
        if (isBound) {
          const normalized = this.normalizeBoundTestId(raw);
          if (normalized) {
            testId = normalized;
          } else {
            // 无法静态推断的表达式：若包含非法字符则跳过（避免误报）
            if (!/^[A-Za-z0-9_-]+$/.test(String(raw || '').trim())) {
              continue;
            }
          }
        }
        const lineNumber = content.substring(0, match.index).split('\n').length;
        
        // 提取元素标签片段（从 data-testid 起始到最近的 '>'，上限 600 chars）
        const tail = content.slice(match.index);
        const end = tail.indexOf('>');
        const tagSnippet = (end >= 0 ? tail.slice(0, Math.min(end + 1, 600)) : tail.slice(0, 600)).replace(/\s+/g, ' ');
        
        testIds.push({ id: testId, line: lineNumber, tagSnippet });
        
        // 记录到映射表
        if (!this.testIdMap.has(testId)) {
          this.testIdMap.set(testId, []);
        }
        this.testIdMap.get(testId).push({ file, line: lineNumber });

        if (!this.testIdDetailMap.has(testId)) {
          this.testIdDetailMap.set(testId, []);
        }
        this.testIdDetailMap.get(testId).push({ file, line: lineNumber, tagSnippet });
      }
      
      if (testIds.length > 0) {
        this.componentTestIds[file] = testIds;
      }
    }
  }

  loadRequiredContract() {
    const p = path.join(__dirname, '../docs/e2e/e2e-contract.required.json');
    if (!fs.existsSync(p)) return null;
    try {
      return JSON.parse(fs.readFileSync(p, 'utf-8'));
    } catch (e) {
      this.issues.push({
        type: 'contract',
        severity: 'error',
        message: `required contract JSON 解析失败: ${p}`,
        suggestion: `检查 JSON 格式。错误=${String(e && e.message ? e.message : e)}`
      });
      return null;
    }
  }

  snippetHasAttr(snippet, attrName) {
    const s = String(snippet || '');
    // 支持 data-x 与 :data-x
    const re = new RegExp(`(^|\\s)(:)?${attrName.replace(/[-/\\^$*+?.()|[\\]{}]/g, '\\\\$&')}\\s*=`);
    return re.test(s);
  }

  extractAttrValue(snippet, attrName) {
    const s = String(snippet || '');
    // 捕获 data-x="..." 或 :data-x='...'
    const re = new RegExp(`(?:^|\\s)(?:[:])?${attrName.replace(/[-/\\^$*+?.()|[\\]{}]/g, '\\\\$&')}\\s*=\\s*(?:\"([^\"]*)\"|'([^']*)')`);
    const m = s.match(re);
    return m ? (m[1] != null ? m[1] : (m[2] != null ? m[2] : null)) : null;
  }

  valueSatisfiesAllowed(value, allowed) {
    if (!allowed || allowed.length === 0) return true;
    const v = String(value || '');
    // 静态值：必须在 allowed 中
    const looksDynamic = /[\?\:\$\{]/.test(v) || v.includes('=>') || v.includes('function') || v.includes('||') || v.includes('&&');
    if (!looksDynamic) return allowed.includes(v);
    // 动态表达式：要求 allowed 中每个 token 至少出现一次（弱校验，避免误报）
    return allowed.every((a) => v.includes(String(a)));
  }

  validateRequiredContract() {
    const contract = this.loadRequiredContract();
    if (!contract || !Array.isArray(contract.required)) return;

    const allIds = Array.from(this.testIdMap.keys());
    const missing = [];

    for (const rule of contract.required) {
      if (!rule) continue;
      const kind = rule.kind;
      if (kind === 'exact') {
        const id = rule.id;
        if (!this.testIdMap.has(id)) {
          missing.push(id);
          this.issues.push({
            type: 'contract-missing',
            severity: 'error',
            testId: id,
            message: `缺少必需 testId: ${id}`,
            suggestion: `在对应组件上补齐 data-testid="${id}"，并确保符合契约文档。`
          });
          continue;
        }

        const details = this.testIdDetailMap.get(id) || [];
        if (rule.requiresDataState) {
          const ok = details.some((d) => this.snippetHasAttr(d.tagSnippet, 'data-state'));
          if (!ok) {
            this.issues.push({
              type: 'contract-state-missing',
              severity: 'error',
              testId: id,
              message: `testId ${id} 缺少 data-state（或 :data-state）`,
              suggestion: `在同一元素上补齐 data-state，并符合 allowedStates。`
            });
          } else if (Array.isArray(rule.allowedStates) && rule.allowedStates.length > 0) {
            const okValue = details.some((d) => {
              const val = this.extractAttrValue(d.tagSnippet, 'data-state');
              return val != null && this.valueSatisfiesAllowed(val, rule.allowedStates);
            });
            if (!okValue) {
              this.issues.push({
                type: 'contract-state-invalid',
                severity: 'error',
                testId: id,
                message: `testId ${id} 的 data-state 未满足 allowedStates: ${rule.allowedStates.join('|')}`,
                suggestion: `确保 data-state 静态值属于 allowedStates，或动态表达式包含所有枚举 token。`
              });
            }
          }
        }

        if (rule.requiresDataAttr && rule.requiresDataAttr.name) {
          const name = String(rule.requiresDataAttr.name);
          const ok = details.some((d) => this.snippetHasAttr(d.tagSnippet, name));
          if (!ok) {
            this.issues.push({
              type: 'contract-attr-missing',
              severity: 'error',
              testId: id,
              message: `testId ${id} 缺少必需属性 ${name}`,
              suggestion: `在同一元素上补齐 ${name} 或 :${name}。`
            });
          } else if (Array.isArray(rule.requiresDataAttr.allowed) && rule.requiresDataAttr.allowed.length > 0) {
            const okValue = details.some((d) => {
              const val = this.extractAttrValue(d.tagSnippet, name);
              return val != null && this.valueSatisfiesAllowed(val, rule.requiresDataAttr.allowed);
            });
            if (!okValue) {
              this.issues.push({
                type: 'contract-attr-invalid',
                severity: 'error',
                testId: id,
                message: `testId ${id} 的 ${name} 未满足 allowed: ${rule.requiresDataAttr.allowed.join('|')}`,
                suggestion: `确保 ${name} 静态值属于 allowed，或动态表达式包含所有枚举 token。`
              });
            }
          }
        }
      } else if (kind === 'pattern') {
        const type = rule.patternType || 'regex';
        const pat = String(rule.pattern || '');
        let hit = false;
        if (type === 'regex') {
          const re = new RegExp(pat);
          hit = allIds.some((id) => re.test(id));
        } else {
          // fallback: substring match
          hit = allIds.some((id) => id.includes(pat));
        }
        if (!hit) {
          this.issues.push({
            type: 'contract-missing',
            severity: 'error',
            testId: `pattern:${pat}`,
            message: `缺少必需 pattern: ${pat}`,
            suggestion: `检查对应组件是否已包含该类 testId（动态模板也应被扫描到）。`
          });
        }
      }
    }
  }

  // 验证唯一性
  validateUniqueness() {
    console.log('\n🔍 验证唯一性...');
    let duplicateCount = 0;
    
    this.testIdMap.forEach((locations, testId) => {
      if (locations.length > 1) {
        duplicateCount++;
        this.issues.push({
          type: 'duplicate',
          severity: 'error',
          testId,
          message: `测试标识 "${testId}" 重复出现在 ${locations.length} 个位置`,
          locations,
          suggestion: '每个测试标识必须全局唯一，请修改其中一个'
        });
        
        console.log(`  ❌ 重复: ${testId}`);
        locations.forEach(loc => {
          console.log(`     - ${loc.file}:${loc.line}`);
        });
      }
    });
    
    console.log(`  ✅ 检查完成，发现 ${duplicateCount} 个重复标识\n`);
  }

  // 验证命名规范
  validateNamingConventions() {
    console.log('🔍 验证命名规范...');
    let invalidCount = 0;
    
    Object.entries(this.componentTestIds).forEach(([file, testIds]) => {
      testIds.forEach(({ id, line }) => {
        // 检查是否使用了已知前缀
        const prefix = id.split('-')[0] + '-';
        const hasValidPrefix = Object.keys(NAMING_CONVENTIONS.prefixes).some(p => id.startsWith(p));
        
        if (!hasValidPrefix) {
          invalidCount++;
          this.issues.push({
            type: 'naming',
            severity: 'warning',
            testId: id,
            file,
            line,
            message: `测试标识 "${id}" 未使用规范的前缀`,
            suggestion: `建议使用以下前缀之一: ${Object.keys(NAMING_CONVENTIONS.prefixes).join(', ')}`,
            expectedPrefixes: Object.keys(NAMING_CONVENTIONS.prefixes)
          });
        }
        
        // 检查是否包含空格或特殊字符
        if (/[\s!@#$%^&*()+=\[\]{}|\\;:'",<>/?]/.test(id)) {
          invalidCount++;
          this.issues.push({
            type: 'naming',
            severity: 'error',
            testId: id,
            file,
            line,
            message: `测试标识 "${id}" 包含非法字符`,
            suggestion: '测试标识只能包含字母、数字、连字符和下划线'
          });
        }
        
        // 检查长度
        if (id.length > 60) {
          this.issues.push({
            type: 'naming',
            severity: 'info',
            testId: id,
            file,
            line,
            message: `测试标识 "${id}" 过长 (${id.length} 字符)`,
            suggestion: '建议保持在 60 字符以内'
          });
        }
      });
    });
    
    console.log(`  ✅ 检查完成，发现 ${invalidCount} 个命名问题\n`);
  }

  // 验证组件覆盖率
  validateCoverage() {
    console.log('🔍 验证组件覆盖率...');
    
    const allFiles = this.listVueFiles();
    
    const filesWithTestIds = Object.keys(this.componentTestIds).length;
    const filesWithoutTestIds = allFiles.length - filesWithTestIds;
    
    console.log(`  📊 有标识的组件: ${filesWithTestIds}/${allFiles.length}`);
    console.log(`  ⚠️  无标识的组件: ${filesWithoutTestIds}/${allFiles.length}\n`);
    
    if (filesWithoutTestIds > 0) {
      const missingFiles = allFiles.filter(f => !this.componentTestIds[f]);
      this.issues.push({
        type: 'coverage',
        severity: 'info',
        message: `${filesWithoutTestIds} 个组件尚未添加测试标识`,
        files: missingFiles,
        suggestion: '建议为所有组件添加测试标识以提高测试覆盖率'
      });
    }
  }

  // 执行所有验证
  async validate() {
    console.log('\n' + '='.repeat(60));
    console.log('  ✅ 测试标识验证工具');
    console.log('='.repeat(60) + '\n');
    
    console.log('📁 收集测试标识...\n');
    this.collectTestIds();
    console.log(`  ✅ 收集完成，共 ${this.testIdMap.size} 个唯一标识\n`);
    
    this.validateUniqueness();
    this.validateNamingConventions();
    this.validateCoverage();
    this.validateRequiredContract();
    
    return this.issues;
  }

  // 生成验证报告
  generateReport(outputPath) {
    const summary = {
      totalTestIds: this.testIdMap.size,
      totalComponents: Object.keys(this.componentTestIds).length,
      totalIssues: this.issues.length,
      byType: {},
      bySeverity: {}
    };
    
    this.issues.forEach(issue => {
      summary.byType[issue.type] = (summary.byType[issue.type] || 0) + 1;
      summary.bySeverity[issue.severity] = (summary.bySeverity[issue.severity] || 0) + 1;
    });
    
    const report = {
      summary,
      issues: this.issues,
      namingConventions: NAMING_CONVENTIONS,
      generatedAt: new Date().toISOString()
    };
    
    // 生成 Markdown 报告
    let markdown = '# 测试标识验证报告\n\n';
    markdown += `**生成时间**: ${new Date().toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' })}\n\n`;
    
    markdown += `## 📊 验证摘要\n\n`;
    markdown += `- **总标识数**: ${summary.totalTestIds}\n`;
    markdown += `- **总组件数**: ${summary.totalComponents}\n`;
    markdown += `- **问题总数**: ${summary.totalIssues}\n\n`;
    
    markdown += `### 按严重程度分类\n\n`;
    const severityEmoji = { error: '🔴', warning: '⚠️', info: 'ℹ️' };
    Object.entries(summary.bySeverity).forEach(([severity, count]) => {
      markdown += `- ${severityEmoji[severity] || '•'} **${severity}**: ${count}\n`;
    });
    
    markdown += `\n### 按问题类型分类\n\n`;
    const typeNames = {
      'duplicate': '重复标识',
      'naming': '命名规范',
      'coverage': '覆盖率'
    };
    Object.entries(summary.byType).forEach(([type, count]) => {
      markdown += `- **${typeNames[type] || type}**: ${count}\n`;
    });
    
    // 分类列出问题
    markdown += `\n## 🔴 严重错误 (error)\n\n`;
    const errors = this.issues.filter(i => i.severity === 'error');
    if (errors.length > 0) {
      markdown += `| 类型 | 标识 | 文件 | 位置 | 描述 | 建议 |\n`;
      markdown += `|------|------|------|------|------|------|\n`;
      errors.forEach(issue => {
        const location = issue.line ? `行 ${issue.line}` : '-';
        const file = issue.file || (issue.locations ? issue.locations.map(l => l.file).join(', ') : '-');
        markdown += `| ${typeNames[issue.type]} | \`${issue.testId || '-'}\` | ${file} | ${location} | ${issue.message} | ${issue.suggestion} |\n`;
      });
    } else {
      markdown += `✅ 没有严重错误\n`;
    }
    
    markdown += `\n## ⚠️ 警告 (warning)\n\n`;
    const warnings = this.issues.filter(i => i.severity === 'warning');
    if (warnings.length > 0) {
      markdown += `| 类型 | 标识 | 文件 | 位置 | 描述 | 建议 |\n`;
      markdown += `|------|------|------|------|------|------|\n`;
      warnings.forEach(issue => {
        const location = issue.line ? `行 ${issue.line}` : '-';
        markdown += `| ${typeNames[issue.type]} | \`${issue.testId}\` | ${issue.file} | ${location} | ${issue.message} | ${issue.suggestion} |\n`;
      });
    } else {
      markdown += `✅ 没有警告\n`;
    }
    
    markdown += `\n## ℹ️ 信息 (info)\n\n`;
    const infos = this.issues.filter(i => i.severity === 'info');
    if (infos.length > 0) {
      infos.forEach(issue => {
        markdown += `### ${typeNames[issue.type]}\n\n`;
        markdown += `${issue.message}\n\n`;
        if (issue.files && issue.files.length > 0) {
          markdown += `**未添加标识的组件** (${issue.files.length}个):\n\n`;
          issue.files.slice(0, 20).forEach(f => {
            markdown += `- ${f}\n`;
          });
          if (issue.files.length > 20) {
            markdown += `- ... 还有 ${issue.files.length - 20} 个\n`;
          }
        }
        markdown += `\n💡 建议: ${issue.suggestion}\n\n`;
      });
    } else {
      markdown += `✅ 没有其他信息\n`;
    }
    
    // 命名规范参考
    markdown += `\n## 📘 命名规范参考\n\n`;
    markdown += `### 推荐前缀\n\n`;
    markdown += `| 前缀 | 用途 |\n`;
    markdown += `|------|------|\n`;
    Object.entries(NAMING_CONVENTIONS.prefixes).forEach(([prefix, desc]) => {
      markdown += `| \`${prefix}\` | ${desc} |\n`;
    });
    
    // 保存报告
    const dir = path.dirname(outputPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    
    fs.writeFileSync(outputPath + '.md', markdown);
    fs.writeFileSync(outputPath + '.json', JSON.stringify(report, null, 2));
    
    console.log(`\n📄 验证报告已生成:`);
    console.log(`   - Markdown: ${outputPath}.md`);
    console.log(`   - JSON: ${outputPath}.json\n`);
    
    return report;
  }
}

// 主程序
async function main() {
  const args = process.argv.slice(2);
  const componentsDir = args[0] || path.join(__dirname, '../src');
  const outputPath = path.join(__dirname, '../docs/testid-validation-report');
  
  const validator = new TestIdValidator(componentsDir);
  await validator.validate();
  const report = validator.generateReport(outputPath);
  
  // 打印统计摘要
  console.log('📊 验证结果摘要:');
  console.log('─'.repeat(60));
  console.log(`  总标识数: ${report.summary.totalTestIds}`);
  console.log(`  总组件数: ${report.summary.totalComponents}`);
  console.log(`  问题总数: ${report.summary.totalIssues}`);
  console.log(`  - 错误 (error): ${report.summary.bySeverity.error || 0}`);
  console.log(`  - 警告 (warning): ${report.summary.bySeverity.warning || 0}`);
  console.log(`  - 信息 (info): ${report.summary.bySeverity.info || 0}`);
  console.log('─'.repeat(60));
  
  if (report.summary.bySeverity.error > 0) {
    console.log(`\n🔴 发现 ${report.summary.bySeverity.error} 个严重错误，请立即修复！\n`);
    process.exit(1);
  } else if (report.summary.bySeverity.warning > 0) {
    console.log(`\n⚠️  发现 ${report.summary.bySeverity.warning} 个警告，建议修复。\n`);
  } else {
    console.log('\n✅ 所有验证通过！\n');
  }
}

// 如果直接运行此脚本
if (require.main === module) {
  main().catch(console.error);
}

module.exports = { TestIdValidator, NAMING_CONVENTIONS };
