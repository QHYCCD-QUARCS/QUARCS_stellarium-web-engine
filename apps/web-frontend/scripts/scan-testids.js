#!/usr/bin/env node
/**
 * 测试标识扫描工具
 * 扫描所有 Vue 组件中的 data-testid 并生成索引
 * 
 * 用法: node scan-testids.js [rootDir]
 * - 默认扫描 ../src 下所有 .vue（递归）
 */

const fs = require('fs');
const path = require('path');

class TestIdScanner {
  constructor(rootDir) {
    this.rootDir = rootDir;
    this.results = {};
    this.allTestIds = new Set();
    this.duplicates = [];
  }

  // 递归列出所有 .vue 文件（返回相对 rootDir 的路径）
  listVueFiles() {
    /** @type {string[]} */
    const out = [];
    const walk = (dir) => {
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      for (const e of entries) {
        const abs = path.join(dir, e.name);
        if (e.isDirectory()) {
          walk(abs);
        } else if (e.isFile() && e.name.endsWith('.vue')) {
          out.push(path.relative(this.rootDir, abs));
        }
      }
    };
    walk(this.rootDir);
    return out.sort();
  }

  // 扫描单个组件文件
  scanComponent(filePath, fileName) {
    const content = fs.readFileSync(filePath, 'utf-8');
    const testIds = [];
    
    // 匹配 data-testid="xxx" 和 data-testid='xxx'
    // 注意：Vue 表达式里经常出现单引号（例如 ? 'open' : 'closed'），
    // 这里不能用 [^"'] 否则会被提前截断。
    const regex = /data-testid=(?:"([^"]+)"|'([^']+)')/g;
    let match;
    
    while ((match = regex.exec(content)) !== null) {
      const testId = match[1] || match[2];
      const lineNumber = content.substring(0, match.index).split('\n').length;
      const line = content.split('\n')[lineNumber - 1];
      
      // 提取元素类型
      const elementMatch = line.match(/<(\w+)/);
      const elementType = elementMatch ? elementMatch[1] : 'unknown';
      
      // 检查是否有 data-state 属性
      const hasDataState = /data-state=/.test(line);
      const dataStateMatch = line.match(/data-state=(?:"([^"]+)"|'([^']+)')/);
      const dataState = dataStateMatch ? (dataStateMatch[1] || dataStateMatch[2]) : null;
      
      // 检查是否有 data-value, data-progress 等属性
      const dataAttrs = {};
      const attrRegex = /data-(\w+)=(?:"([^"]+)"|'([^']+)')/g;
      let attrMatch;
      while ((attrMatch = attrRegex.exec(line)) !== null) {
        const attrName = attrMatch[1];
        if (attrName !== 'testid') {
          dataAttrs[attrName] = attrMatch[2] || attrMatch[3];
        }
      }
      
      testIds.push({
        id: testId,
        line: lineNumber,
        elementType,
        hasDataState,
        dataState,
        dataAttrs,
        preview: line.trim().substring(0, 100) + (line.trim().length > 100 ? '...' : '')
      });
      
      // 检查重复
      if (this.allTestIds.has(testId)) {
        this.duplicates.push({
          testId,
          file: fileName,
          line: lineNumber
        });
      }
      this.allTestIds.add(testId);
    }
    
    return testIds;
  }

  // 扫描所有组件
  async scanAllComponents() {
    console.log('\n🔍 开始扫描测试标识...\n');
    
    if (!fs.existsSync(this.rootDir)) {
      console.error(`❌ 目录不存在: ${this.rootDir}`);
      return {};
    }
    
    const files = this.listVueFiles();
    
    console.log(`📁 找到 ${files.length} 个 Vue 组件文件\n`);
    
    for (const file of files) {
      const filePath = path.join(this.rootDir, file);
      
      process.stdout.write(`  ⏳ 扫描 ${file}...`);
      
      const testIds = this.scanComponent(filePath, file);
      
      if (testIds.length > 0) {
        this.results[file] = {
          file,
          path: filePath,
          testIdCount: testIds.length,
          testIds,
          scannedAt: new Date().toISOString()
        };
        console.log(` ✅ ${testIds.length} 个标识`);
      } else {
        console.log(` ⚠️  未找到标识`);
      }
    }
    
    console.log(`\n✅ 扫描完成！\n`);
    return this.results;
  }

  // 生成统计摘要
  generateSummary() {
    const summary = {
      totalComponents: Object.keys(this.results).length,
      totalTestIds: this.allTestIds.size,
      duplicates: this.duplicates.length,
      componentsWithTestIds: Object.keys(this.results).filter(k => this.results[k].testIdCount > 0).length,
      componentsWithoutTestIds: 0,
      byPrefix: {},
      topComponents: []
    };
    
    // 统计前缀
    this.allTestIds.forEach(id => {
      const prefix = id.split('-')[0];
      summary.byPrefix[prefix] = (summary.byPrefix[prefix] || 0) + 1;
    });
    
    // 获取标识最多的组件（前10）
    summary.topComponents = Object.values(this.results)
      .sort((a, b) => b.testIdCount - a.testIdCount)
      .slice(0, 10)
      .map(r => ({ file: r.file, count: r.testIdCount }));
    
    return summary;
  }

  // 生成报告
  generateReport(outputPath) {
    const summary = this.generateSummary();
    
    const report = {
      summary,
      results: this.results,
      duplicates: this.duplicates,
      generatedAt: new Date().toISOString()
    };
    
    // 生成 Markdown 报告
    let markdown = '# 测试标识扫描报告\n\n';
    markdown += `**生成时间**: ${new Date().toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' })}\n\n`;
    
    markdown += `## 📊 统计摘要\n\n`;
    markdown += `- **总组件数**: ${summary.totalComponents}\n`;
    markdown += `- **有标识的组件**: ${summary.componentsWithTestIds}\n`;
    markdown += `- **总标识数**: ${summary.totalTestIds}\n`;
    markdown += `- **重复标识数**: ${summary.duplicates}\n\n`;
    
    markdown += `### 按前缀分类\n\n`;
    markdown += `| 前缀 | 数量 |\n`;
    markdown += `|------|------|\n`;
    Object.entries(summary.byPrefix)
      .sort((a, b) => b[1] - a[1])
      .forEach(([prefix, count]) => {
        markdown += `| \`${prefix}-\` | ${count} |\n`;
      });
    
    markdown += `\n### 标识最多的组件（前10）\n\n`;
    markdown += `| 组件文件 | 标识数量 |\n`;
    markdown += `|---------|----------|\n`;
    summary.topComponents.forEach(({ file, count }) => {
      markdown += `| ${file} | ${count} |\n`;
    });
    
    if (this.duplicates.length > 0) {
      markdown += `\n## ⚠️ 重复标识\n\n`;
      markdown += `| 标识 | 文件1 | 文件2 | 行号 |\n`;
      markdown += `|------|-------|-------|------|\n`;
      this.duplicates.forEach(dup => {
        markdown += `| \`${dup.testId}\` | ${dup.file1} | ${dup.file2} | ${dup.line} |\n`;
      });
    }
    
    markdown += `\n## 📝 详细列表\n\n`;
    Object.values(this.results)
      .sort((a, b) => b.testIdCount - a.testIdCount)
      .forEach(result => {
        markdown += `### ${result.file} (${result.testIdCount} 个标识)\n\n`;
        markdown += `| 标识 | 元素 | 行号 | 状态属性 |\n`;
        markdown += `|------|------|------|----------|\n`;
        result.testIds.forEach(ti => {
          const stateInfo = ti.dataState || '-';
          markdown += `| \`${ti.id}\` | ${ti.elementType} | ${ti.line} | ${stateInfo} |\n`;
        });
        markdown += `\n`;
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
  const componentsDir = args[0] || path.join(__dirname, '../src');
  const outputPath = path.join(__dirname, '../docs/testid-scan-report');
  
  console.log('\n' + '='.repeat(60));
  console.log('  🏷️  测试标识扫描工具');
  console.log('='.repeat(60));
  
  const scanner = new TestIdScanner(componentsDir);
  await scanner.scanAllComponents();
  const report = scanner.generateReport(outputPath);
  
  // 打印统计摘要
  console.log('📊 扫描结果摘要:');
  console.log('─'.repeat(60));
  console.log(`  总组件数: ${report.summary.totalComponents}`);
  console.log(`  有标识的组件: ${report.summary.componentsWithTestIds}`);
  console.log(`  总标识数: ${report.summary.totalTestIds}`);
  console.log(`  重复标识: ${report.summary.duplicates}`);
  console.log('─'.repeat(60));
  
  if (report.summary.duplicates > 0) {
    console.log(`\n⚠️  发现 ${report.summary.duplicates} 个重复标识，请检查报告。\n`);
  } else {
    console.log('\n✅ 没有发现重复标识。\n');
  }
}

// 如果直接运行此脚本
if (require.main === module) {
  main().catch(console.error);
}

module.exports = { TestIdScanner };
