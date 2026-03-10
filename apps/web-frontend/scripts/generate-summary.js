#!/usr/bin/env node
/**
 * 汇总表格生成器
 * 读取扫描结果，生成多种格式的汇总文档
 * 
 * 用法: node generate-summary.js
 */

const fs = require('fs');
const path = require('path');
const { TestIdScanner } = require('./scan-testids');
const { NAMING_CONVENTIONS } = require('./validate-testids');

class SummaryGenerator {
  constructor(componentsDir) {
    this.componentsDir = componentsDir;
    this.scanner = new TestIdScanner(componentsDir);
    this.scanResults = null;
    this.componentInfo = {};
  }

  // 获取组件信息
  getComponentInfo() {
    /** @type {string[]} */
    const files = [];
    const walk = (dir) => {
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      for (const e of entries) {
        const abs = path.join(dir, e.name);
        if (e.isDirectory()) walk(abs);
        else if (e.isFile() && e.name.endsWith('.vue')) files.push(path.relative(this.componentsDir, abs).replace(/\\/g, '/'));
      }
    };
    walk(this.componentsDir);
    files.sort();
    
    files.forEach(file => {
      const filePath = path.join(this.componentsDir, file);
      const stats = fs.statSync(filePath);
      const content = fs.readFileSync(filePath, 'utf-8');
      const lines = content.split('\n').length;
      const missingInteractive = this.countMissingInteractiveInFile(content);
      
      // 提取组件名称
      const nameMatch = content.match(/name:\s*['"]([^'"]+)['"]/);
      const componentName = nameMatch ? nameMatch[1] : path.basename(file).replace('.vue', '');
      
      // 确定前缀
      let suggestedPrefix = 'ui-';
      Object.entries(NAMING_CONVENTIONS.prefixes).forEach(([prefix, desc]) => {
        if (desc.includes(path.basename(file)) || desc.includes(componentName)) {
          suggestedPrefix = prefix;
        }
      });
      
      // 确定优先级
      let priority = '低';
      if (lines > 1000) priority = '高';
      else if (lines > 400) priority = '中';
      
      this.componentInfo[file] = {
        file,
        name: componentName,
        lines,
        size: stats.size,
        suggestedPrefix,
        priority,
        modifiedAt: stats.mtime,
        missingInteractive
      };
    });
  }

  extractTemplate(content) {
    const start = content.indexOf('<template>');
    const end = content.indexOf('</template>');
    if (start === -1 || end === -1 || end <= start) return '';
    return content.slice(start + '<template>'.length, end);
  }

  countMissingInteractiveInFile(content) {
    const tpl = this.extractTemplate(content);
    if (!tpl) return 0;
    const hasTestId = (s) => /\bdata-testid\s*=/.test(s) || /\b:data-testid\s*=/.test(s);
    const hasEvent = (s) =>
      /@(?:click|change|input|submit|mousedown|mouseup|mousemove|mouseenter|mouseleave|touchstart|touchend|touchmove|wheel|keydown|keyup|focus|blur)(?:\.[a-zA-Z-]+)*/.test(
        s,
      );
    const tagRe = /<([a-zA-Z][\w-]*)(\s[^>]*?)?>/g;
    let m;
    let missing = 0;
    while ((m = tagRe.exec(tpl)) !== null) {
      const openTag = m[0];
      const tag = m[1];
      if (tag === 'template' || tag === 'script' || tag === 'style') continue;
      if (!hasEvent(openTag)) continue;
      if (hasTestId(openTag)) continue;
      missing++;
    }
    return missing;
  }

  // 扫描所有组件
  async scan() {
    console.log('\n🔍 扫描所有组件...\n');
    this.getComponentInfo();
    this.scanResults = await this.scanner.scanAllComponents();
    console.log('✅ 扫描完成\n');
  }

  // 生成 CSV 格式的主汇总表
  generateMasterCSV() {
    let csv = '组件文件,组件名称,代码行数,建议前缀,标识数量,优先级,状态,最后修改时间\n';
    
    Object.keys(this.componentInfo).sort().forEach(file => {
      const info = this.componentInfo[file];
      const testIdCount = this.scanResults[file] ? this.scanResults[file].testIdCount : 0;
      
      let status = '❌ 未开始';
      if (testIdCount > 0) {
        status = info.missingInteractive > 0 ? `🔄 进行中(缺${info.missingInteractive})` : '✅ 已完成';
      }
      
      const modifiedDate = new Date(info.modifiedAt).toLocaleDateString('zh-CN');
      
      csv += `${info.file},${info.name},${info.lines},${info.suggestedPrefix},${testIdCount},${info.priority},${status},${modifiedDate}\n`;
    });
    
    return csv;
  }

  // 生成 CSV 格式的详细标识表
  generateDetailCSV() {
    let csv = '组件,测试标识,功能描述,元素类型,行号,父级区域,状态属性\n';
    
    Object.keys(this.scanResults).sort().forEach(file => {
      const result = this.scanResults[file];
      result.testIds.forEach(ti => {
        const componentName = this.componentInfo[file].name;
        const description = this.describeTestId(ti.id);
        const parentArea = '-'; // 需要手动填写
        const dataState = ti.dataState || '-';
        
        csv += `${componentName},${ti.id},${description},${ti.elementType},${ti.line},${parentArea},${dataState}\n`;
      });
    });
    
    return csv;
  }

  describeTestId(id) {
    // 简单启发式描述：从命名中推导“类型 + 名称”
    // e.g. fp-btn-autofocus -> 按钮：autofocus
    const parts = String(id).split('-').filter(Boolean);
    if (parts.length < 2) return '元素';
    const type = parts[1];
    const name = parts.slice(2).join('-') || parts.slice(1).join('-');
    const zhType =
      type === 'btn' ? '按钮' :
      type === 'input' ? '输入' :
      type === 'select' ? '选择' :
      type === 'checkbox' ? '复选框' :
      type === 'radio' ? '单选' :
      type === 'switch' ? '开关' :
      type === 'slider' ? '滑块' :
      type === 'value' ? '数值' :
      type === 'icon' ? '图标' :
      type === 'img' ? '图片' :
      type === 'panel' ? '面板' :
      type === 'dialog' ? '对话框' :
      type === 'root' ? '根容器' :
      '元素';
    return `${zhType}：${name}`;
  }

  // 生成 Markdown 格式的主汇总文档
  generateMasterMarkdown() {
    let md = '# E2E 测试标识主汇总\n\n';
    md += `**生成时间**: ${new Date().toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' })}\n\n`;
    
    // 统计摘要
    const totalComponents = Object.keys(this.componentInfo).length;
    const withTestIds = Object.keys(this.scanResults).length;
    const totalTestIds = Object.values(this.scanResults).reduce((sum, r) => sum + r.testIdCount, 0);
    
    md += `## 📊 统计摘要\n\n`;
    md += `- **总组件数**: ${totalComponents}\n`;
    md += `- **已添加标识的组件**: ${withTestIds} (${Math.round(withTestIds/totalComponents*100)}%)\n`;
    md += `- **总测试标识数**: ${totalTestIds}\n`;
    md += `- **平均标识数**: ${withTestIds > 0 ? Math.round(totalTestIds/withTestIds) : 0} 个/组件\n\n`;
    
    // 按优先级分类
    const byPriority = { '高': [], '中': [], '低': [] };
    Object.values(this.componentInfo).forEach(info => {
      byPriority[info.priority].push(info);
    });
    
    md += `## 📋 按优先级分类\n\n`;
    ['高', '中', '低'].forEach(priority => {
      const components = byPriority[priority];
      const withIds = components.filter(c => this.scanResults[c.file]).length;
      md += `### ${priority}优先级 (${withIds}/${components.length} 已完成)\n\n`;
      
      md += `| 组件文件 | 组件名称 | 代码行数 | 标识数量 | 状态 |\n`;
      md += `|---------|---------|---------|---------|------|\n`;
      
      components.sort((a, b) => b.lines - a.lines).forEach(info => {
        const testIdCount = this.scanResults[info.file] ? this.scanResults[info.file].testIdCount : 0;
        let status = '❌ 未开始';
        if (testIdCount > 0) {
          status = info.missingInteractive > 0 ? `🔄 进行中(缺${info.missingInteractive})` : '✅ 已完成';
        }
        md += `| ${info.file} | ${info.name} | ${info.lines} | ${testIdCount} | ${status} |\n`;
      });
      md += `\n`;
    });
    
    // 命名规范
    md += `## 📘 命名规范\n\n`;
    md += `### 推荐前缀\n\n`;
    md += `| 前缀 | 用途 |\n`;
    md += `|------|------|\n`;
    Object.entries(NAMING_CONVENTIONS.prefixes).forEach(([prefix, desc]) => {
      md += `| \`${prefix}\` | ${desc} |\n`;
    });
    
    return md;
  }

  // 生成 JSON 格式的索引
  generateIndexJSON() {
    const index = {
      metadata: {
        generatedAt: new Date().toISOString(),
        totalComponents: Object.keys(this.componentInfo).length,
        componentsWithTestIds: Object.keys(this.scanResults).length,
        totalTestIds: Object.values(this.scanResults).reduce((sum, r) => sum + r.testIdCount, 0)
      },
      components: {},
      testIds: {},
      prefixes: NAMING_CONVENTIONS.prefixes
    };
    
    // 组件索引
    Object.keys(this.componentInfo).forEach(file => {
      const info = this.componentInfo[file];
      const scanResult = this.scanResults[file];
      
      index.components[file] = {
        name: info.name,
        lines: info.lines,
        suggestedPrefix: info.suggestedPrefix,
        priority: info.priority,
        testIdCount: scanResult ? scanResult.testIdCount : 0,
        testIds: scanResult ? scanResult.testIds.map(t => t.id) : []
      };
    });
    
    // 测试标识索引
    Object.values(this.scanResults).forEach(result => {
      result.testIds.forEach(ti => {
        index.testIds[ti.id] = {
          component: result.file,
          line: ti.line,
          elementType: ti.elementType,
          hasDataState: ti.hasDataState,
          dataState: ti.dataState
        };
      });
    });
    
    return JSON.stringify(index, null, 2);
  }

  // 生成所有格式的报告
  async generateAll(outputDir) {
    console.log('\n📝 生成汇总报告...\n');
    
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }
    
    // CSV格式
    console.log('  ⏳ 生成 CSV 格式...');
    const masterCSV = this.generateMasterCSV();
    fs.writeFileSync(path.join(outputDir, 'E2E_TEST_IDS_MASTER_SUMMARY.csv'), masterCSV);
    
    const detailCSV = this.generateDetailCSV();
    fs.writeFileSync(path.join(outputDir, 'E2E_TEST_IDS_DETAIL.csv'), detailCSV);
    console.log('  ✅ CSV 生成完成');
    
    // Markdown格式
    console.log('  ⏳ 生成 Markdown 格式...');
    const masterMD = this.generateMasterMarkdown();
    fs.writeFileSync(path.join(outputDir, 'E2E_TEST_IDS_MASTER_SUMMARY.md'), masterMD);
    console.log('  ✅ Markdown 生成完成');
    
    // JSON格式
    console.log('  ⏳ 生成 JSON 索引...');
    const indexJSON = this.generateIndexJSON();
    fs.writeFileSync(path.join(outputDir, 'E2E_TEST_IDS_INDEX.json'), indexJSON);
    console.log('  ✅ JSON 生成完成');
    
    console.log(`\n📄 所有报告已生成到: ${outputDir}\n`);
    console.log('生成的文件:');
    console.log('  - E2E_TEST_IDS_MASTER_SUMMARY.csv (主汇总表 - Excel可读)');
    console.log('  - E2E_TEST_IDS_DETAIL.csv (详细标识表 - Excel可读)');
    console.log('  - E2E_TEST_IDS_MASTER_SUMMARY.md (主汇总文档 - Markdown)');
    console.log('  - E2E_TEST_IDS_INDEX.json (索引数据 - JSON)\n');
  }
}

// 主程序
async function main() {
  const componentsDir = path.join(__dirname, '../src');
  const outputDir = path.join(__dirname, '../docs/e2e');
  
  console.log('\n' + '='.repeat(60));
  console.log('  📊 汇总表格生成器');
  console.log('='.repeat(60));
  
  const generator = new SummaryGenerator(componentsDir);
  await generator.scan();
  await generator.generateAll(outputDir);
  
  console.log('✅ 汇总生成完成！\n');
}

// 如果直接运行此脚本
if (require.main === module) {
  main().catch(console.error);
}

module.exports = { SummaryGenerator };
