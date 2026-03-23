#!/usr/bin/env node
/**
 * 代码清理检测工具
 * 检测并报告未使用、已弃用的代码
 * 
 * 用法: node detect-unused-code.js [componentsDir]
 */

const fs = require('fs');
const path = require('path');

class UnusedCodeDetector {
  constructor(componentsDir) {
    this.componentsDir = componentsDir;
    this.issues = [];
  }

  // 检测大段注释代码
  detectCommentedCode(content, filePath) {
    // 匹配 HTML 注释和 JS 多行注释
    const commentRegex = /<!--[\s\S]*?-->|\/\*[\s\S]*?\*\//g;
    let match;
    
    while ((match = commentRegex.exec(content)) !== null) {
      const commentBlock = match[0];
      const lines = commentBlock.split('\n').length;
      
      // 超过5行的注释块视为可疑
      if (lines > 5) {
        const lineNumber = content.substring(0, match.index).split('\n').length;
        
        // 检查是否是合法的文档注释或许可证
        const isDocComment = commentBlock.includes('@param') || 
                            commentBlock.includes('@returns') ||
                            commentBlock.includes('Copyright') ||
                            commentBlock.includes('LICENSE') ||
                            commentBlock.includes('/**') && commentBlock.includes('*/');
        
        if (!isDocComment) {
          this.issues.push({
            file: filePath,
            type: 'commented-code',
            severity: 'warning',
            line: lineNumber,
            lines: lines,
            message: `发现 ${lines} 行被注释的代码块`,
            suggestion: '建议删除或恢复使用',
            preview: commentBlock.substring(0, 100) + (commentBlock.length > 100 ? '...' : '')
          });
        }
      }
    }
  }

  // 检测 v-if="false" 或永远不会显示的代码
  detectDeadCode(content, filePath) {
    const deadCodePatterns = [
      { pattern: /v-if="false"/g, desc: 'v-if="false"' },
      { pattern: /v-show="false"/g, desc: 'v-show="false"' },
      { pattern: /:if="false"/g, desc: ':if="false"' },
      { pattern: /v-if="0"/g, desc: 'v-if="0"' },
      { pattern: /v-if="null"/g, desc: 'v-if="null"' }
    ];
    
    deadCodePatterns.forEach(({ pattern, desc }) => {
      let match;
      const regex = new RegExp(pattern.source, 'g');
      while ((match = regex.exec(content)) !== null) {
        const lineNumber = content.substring(0, match.index).split('\n').length;
        const line = content.split('\n')[lineNumber - 1];
        this.issues.push({
          file: filePath,
          type: 'dead-code',
          severity: 'error',
          line: lineNumber,
          message: '发现永远不会执行的代码',
          code: desc,
          suggestion: '删除此代码块',
          preview: line.trim()
        });
      }
    });
  }

  // 检测废弃标记
  detectDeprecatedMarkers(content, filePath) {
    const deprecatedPatterns = [
      { pattern: /@deprecated/gi, desc: '@deprecated' },
      { pattern: /TODO.*remove/gi, desc: 'TODO remove' },
      { pattern: /FIXME.*delete/gi, desc: 'FIXME delete' },
      { pattern: /obsolete/gi, desc: 'obsolete' },
      { pattern: /已弃用/g, desc: '已弃用' },
      { pattern: /不再使用/g, desc: '不再使用' }
    ];
    
    deprecatedPatterns.forEach(({ pattern, desc }) => {
      let match;
      const regex = new RegExp(pattern.source, pattern.flags);
      while ((match = regex.exec(content)) !== null) {
        const lineNumber = content.substring(0, match.index).split('\n').length;
        const line = content.split('\n')[lineNumber - 1];
        this.issues.push({
          file: filePath,
          type: 'deprecated',
          severity: 'warning',
          line: lineNumber,
          message: `发现已标记为废弃的代码 (${desc})`,
          code: line.trim().substring(0, 80) + (line.trim().length > 80 ? '...' : ''),
          suggestion: '确认后删除'
        });
      }
    });
  }

  // 检测未使用的 console.log
  detectDebugLogs(content, filePath) {
    const debugPatterns = [
      /console\.log\(/g,
      /console\.debug\(/g,
      /console\.warn\(/g,
      /debugger;/g
    ];
    
    debugPatterns.forEach(pattern => {
      let match;
      while ((match = pattern.exec(content)) !== null) {
        const lineNumber = content.substring(0, match.index).split('\n').length;
        const line = content.split('\n')[lineNumber - 1];
        
        // 跳过注释中的 console
        if (!line.trim().startsWith('//') && !line.trim().startsWith('*')) {
          this.issues.push({
            file: filePath,
            type: 'debug-code',
            severity: 'info',
            line: lineNumber,
            message: '发现调试代码',
            code: match[0],
            suggestion: '生产环境应删除',
            preview: line.trim()
          });
        }
      }
    });
  }

  // 扫描所有组件
  async scanAllComponents() {
    console.log(`\n🔍 开始扫描目录: ${this.componentsDir}\n`);
    
    if (!fs.existsSync(this.componentsDir)) {
      console.error(`❌ 目录不存在: ${this.componentsDir}`);
      return [];
    }
    
    const files = fs.readdirSync(this.componentsDir)
      .filter(f => f.endsWith('.vue'));
    
    console.log(`📁 找到 ${files.length} 个 Vue 组件文件\n`);
    
    for (const file of files) {
      const filePath = path.join(this.componentsDir, file);
      const content = fs.readFileSync(filePath, 'utf-8');
      
      process.stdout.write(`  ⏳ 检测 ${file}...`);
      
      const beforeCount = this.issues.length;
      this.detectCommentedCode(content, file);
      this.detectDeadCode(content, file);
      this.detectDeprecatedMarkers(content, file);
      this.detectDebugLogs(content, file);
      const afterCount = this.issues.length;
      
      if (afterCount > beforeCount) {
        console.log(` ⚠️  发现 ${afterCount - beforeCount} 个问题`);
      } else {
        console.log(` ✅`);
      }
    }
    
    console.log(`\n✅ 扫描完成！共发现 ${this.issues.length} 个问题\n`);
    return this.issues;
  }

  // 生成清理报告
  generateReport(outputPath) {
    const report = {
      summary: {
        total: this.issues.length,
        byType: {},
        bySeverity: {},
        byFile: {}
      },
      issues: this.issues,
      generatedAt: new Date().toISOString()
    };
    
    // 统计
    this.issues.forEach(issue => {
      report.summary.byType[issue.type] = (report.summary.byType[issue.type] || 0) + 1;
      report.summary.bySeverity[issue.severity] = (report.summary.bySeverity[issue.severity] || 0) + 1;
      report.summary.byFile[issue.file] = (report.summary.byFile[issue.file] || 0) + 1;
    });
    
    // 生成 Markdown 报告
    let markdown = '# 代码清理检测报告\n\n';
    markdown += `**生成时间**: ${new Date().toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' })}\n\n`;
    markdown += `## 📊 摘要\n\n`;
    markdown += `- **总问题数**: ${report.summary.total}\n\n`;
    
    markdown += `### 按严重程度分类\n\n`;
    const severityEmoji = { error: '🔴', warning: '⚠️', info: 'ℹ️' };
    Object.entries(report.summary.bySeverity).forEach(([severity, count]) => {
      markdown += `- ${severityEmoji[severity] || '•'} **${severity}**: ${count}\n`;
    });
    
    markdown += `\n### 按问题类型分类\n\n`;
    const typeNames = {
      'commented-code': '注释代码',
      'dead-code': '死代码',
      'deprecated': '已弃用',
      'debug-code': '调试代码'
    };
    Object.entries(report.summary.byType).forEach(([type, count]) => {
      markdown += `- **${typeNames[type] || type}**: ${count}\n`;
    });
    
    markdown += `\n## 📝 详细问题列表\n\n`;
    markdown += `| 组件文件 | 问题类型 | 严重程度 | 位置 | 描述 | 建议 |\n`;
    markdown += `|---------|---------|---------|------|------|------|\n`;
    
    this.issues.forEach(issue => {
      const location = issue.line ? `行 ${issue.line}` : '-';
      const typeName = typeNames[issue.type] || issue.type;
      markdown += `| ${issue.file} | ${typeName} | ${issue.severity} | ${location} | ${issue.message} | ${issue.suggestion} |\n`;
    });
    
    // 按文件分组的详细报告
    markdown += `\n## 📁 按文件分组\n\n`;
    const issuesByFile = {};
    this.issues.forEach(issue => {
      if (!issuesByFile[issue.file]) {
        issuesByFile[issue.file] = [];
      }
      issuesByFile[issue.file].push(issue);
    });
    
    Object.entries(issuesByFile).sort((a, b) => b[1].length - a[1].length).forEach(([file, issues]) => {
      markdown += `### ${file} (${issues.length} 个问题)\n\n`;
      issues.forEach(issue => {
        markdown += `- **[${issue.severity}]** 行 ${issue.line}: ${issue.message}\n`;
        if (issue.preview) {
          markdown += `  \`\`\`\n  ${issue.preview}\n  \`\`\`\n`;
        }
        markdown += `  💡 建议: ${issue.suggestion}\n\n`;
      });
    });
    
    // 保存报告
    const dir = path.dirname(outputPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    
    fs.writeFileSync(outputPath + '.md', markdown);
    fs.writeFileSync(outputPath + '.json', JSON.stringify(report, null, 2));
    
    console.log(`\n📄 报告已生成:`);
    console.log(`   - Markdown: ${outputPath}.md`);
    console.log(`   - JSON: ${outputPath}.json\n`);
    
    return report;
  }
}

// 主程序
async function main() {
  const args = process.argv.slice(2);
  const componentsDir = args[0] || path.join(__dirname, '../src/components');
  const outputPath = path.join(__dirname, '../docs/code-cleanup-report');
  
  console.log('\n' + '='.repeat(60));
  console.log('  🧹 代码清理检测工具');
  console.log('='.repeat(60));
  
  const detector = new UnusedCodeDetector(componentsDir);
  await detector.scanAllComponents();
  const report = detector.generateReport(outputPath);
  
  // 打印统计摘要
  console.log('📊 检测结果摘要:');
  console.log('─'.repeat(60));
  console.log(`  总问题数: ${report.summary.total}`);
  console.log(`  严重错误 (error): ${report.summary.bySeverity.error || 0}`);
  console.log(`  警告 (warning): ${report.summary.bySeverity.warning || 0}`);
  console.log(`  信息 (info): ${report.summary.bySeverity.info || 0}`);
  console.log('─'.repeat(60));
  
  if (report.summary.total > 0) {
    console.log('\n⚠️  发现需要清理的代码，请查看报告文件进行人工审查。');
    console.log(`   报告位置: ${outputPath}.md\n`);
  } else {
    console.log('\n✅ 恭喜！没有发现需要清理的代码问题。\n');
  }
}

// 如果直接运行此脚本
if (require.main === module) {
  main().catch(console.error);
}

module.exports = { UnusedCodeDetector };
