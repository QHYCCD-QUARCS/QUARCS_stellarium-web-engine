#!/usr/bin/env node
/**
 * 批量添加测试标识工具
 * 根据命名规范自动为组件添加 data-testid
 * 
 * 用法: node add-testids-batch.js <component-file> <prefix>
 */

const fs = require('fs');
const path = require('path');

// 元素标识映射规则
const ELEMENT_PATTERNS = [
  // 容器
  { pattern: /class="[^"]*panel[^"]*"/g, suffix: 'panel', addTo: 'div' },
  { pattern: /class="[^"]*container[^"]*"/g, suffix: 'container', addTo: 'div' },
  { pattern: /class="[^"]*wrapper[^"]*"/g, suffix: 'wrapper', addTo: 'div' },
  { pattern: /class="[^"]*section[^"]*"/g, suffix: 'section', addTo: 'div' },
  { pattern: /class="[^"]*header[^"]*"/g, suffix: 'header', addTo: 'div' },
  { pattern: /class="[^"]*footer[^"]*"/g, suffix: 'footer', addTo: 'div' },
  { pattern: /class="[^"]*content[^"]*"/g, suffix: 'content', addTo: 'div' },
  
  // 按钮
  { pattern: /class="[^"]*btn-[^"]*"/g, suffix: 'btn', addTo: 'button', extractName: true },
  { pattern: /<button[^>]*>/g, suffix: 'btn', addTo: 'button' },
  
  // 显示元素
  { pattern: /class="[^"]*value[^"]*"/g, suffix: 'value', addTo: 'span' },
  { pattern: /class="[^"]*label[^"]*"/g, suffix: 'label', addTo: 'span' },
  { pattern: /class="[^"]*text[^"]*"/g, suffix: 'text', addTo: 'span' },
  { pattern: /class="[^"]*status[^"]*"/g, suffix: 'status', addTo: 'div' },
  
  // 输入元素
  { pattern: /<input[^>]*>/g, suffix: 'input', addTo: 'input' },
  { pattern: /<select[^>]*>/g, suffix: 'select', addTo: 'select' },
  { pattern: /<textarea[^>]*>/g, suffix: 'textarea', addTo: 'textarea' },
  
  // 图像和图标
  { pattern: /<img[^>]*>/g, suffix: 'img', addTo: 'img' },
  { pattern: /<v-icon[^>]*>/g, suffix: 'icon', addTo: 'v-icon' },
];

function addTestIds(content, prefix) {
  let modified = content;
  let addedCount = 0;
  
  console.log(`\n为组件添加测试标识 (前缀: ${prefix})...\n`);
  
  // 提取组件名并决定根容器标识
  const nameMatch = content.match(/name:\s*['"]([^'"]+)['"]/);
  const componentName = nameMatch ? nameMatch[1] : 'Component';
  
  // 添加根容器标识（如果还没有）
  if (!modified.includes('data-testid')) {
    // 查找第一个主要 div
    const firstDivMatch = modified.match(/<div[^>]*class="[^"]*panel[^"]*"[^>]*>/);
    if (firstDivMatch) {
      const originalTag = firstDivMatch[0];
      if (!originalTag.includes('data-testid')) {
        const newTag = originalTag.replace('>', `\n      data-testid="${prefix}-panel">`);
        modified = modified.replace(originalTag, newTag);
        addedCount++;
        console.log(`  ✅ 添加根容器: ${prefix}-panel`);
      }
    }
  }
  
  console.log(`\n完成！添加了 ${addedCount} 个测试标识\n`);
  
  return { content: modified, count: addedCount };
}

// 主程序
async function main() {
  const args = process.argv.slice(2);
  
  if (args.length < 2) {
    console.error('用法: node add-testids-batch.js <component-file> <prefix>');
    console.error('示例: node add-testids-batch.js FocuserPanel.vue fp');
    process.exit(1);
  }
  
  const componentFile = args[0];
  const prefix = args[1];
  
  const componentsDir = path.join(__dirname, '../src/components');
  const filePath = path.join(componentsDir, componentFile);
  
  if (!fs.existsSync(filePath)) {
    console.error(`❌ 文件不存在: ${filePath}`);
    process.exit(1);
  }
  
  console.log('\n' + '='.repeat(60));
  console.log('  🏷️  批量添加测试标识');
  console.log('='.repeat(60));
  console.log(`\n文件: ${componentFile}`);
  console.log(`前缀: ${prefix}-`);
  
  const content = fs.readFileSync(filePath, 'utf-8');
  
  // 检查现有标识
  const existingIds = content.match(/data-testid="[^"]+"/g) || [];
  console.log(`\n现有标识数: ${existingIds.length}`);
  
  if (existingIds.length > 10) {
    console.log('\n⚠️  该组件已有较多标识，跳过自动添加');
    console.log('请手动检查和补充\n');
    process.exit(0);
  }
  
  const result = addTestIds(content, prefix);
  
  if (result.count > 0) {
    // 备份原文件
    const backupPath = filePath + '.backup';
    fs.writeFileSync(backupPath, content);
    
    // 写入新内容
    fs.writeFileSync(filePath, result.content);
    
    console.log(`✅ 文件已更新: ${componentFile}`);
    console.log(`📦 备份文件: ${path.basename(backupPath)}\n`);
  } else {
    console.log(`ℹ️  没有添加新标识\n`);
  }
}

if (require.main === module) {
  main().catch(console.error);
}

module.exports = { addTestIds };
