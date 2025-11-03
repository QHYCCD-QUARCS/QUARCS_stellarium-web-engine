# UI层级规划文档 (Z-Index Guide)

## 层级规划系统

为了避免UI组件重叠，统一规划所有组件的z-index层级：

### 层级分布（从低到高）

1. **画布层** (z-index: -12 到 0)
   - 非活动画布: -12, -11, -10
   - 当前活动画布: 0

2. **基础UI层** (z-index: 1-99)
   - GUI容器: 1
   - Toolbar: 1
   - Target Search: 2
   - 其他常驻UI组件

3. **信息显示层** (z-index: 100-199)
   - 星点信息框: 100
   - Planets Visibility: 100
   - 其他信息提示框

4. **功能面板层** (z-index: 200-299)
   - 任务计划表相关: 200
   - 图表面板
   - 其他功能面板

5. **浮动组件层** (z-index: 300-499)
   - 搜索下拉框: 300
   - 临时输入框
   - 浮动工具

6. **进度条层** (z-index: 500-599)
   - ProgressBar: 500

7. **对话框层** (z-index: 600-799)
   - 普通对话框: 600
   - 确认对话框: 650

8. **面板覆盖层** (z-index: 800-899)
   - ImageManagerPanel: 800
   - ImageFolder: 850
   - 其他覆盖面板

9. **重要消息层** (z-index: 900-999)
   - MessageBox: 900

10. **系统对话框层** (z-index: 1000-1499)
    - UpdateProgressDialog: 1000
    - Chart-Focus结果: 1000
    - LocationFocalInputs展开视图: 1000
    - Calibration Info Box: 1000

11. **重要对话框层** (z-index: 1500-1999)
    - View Settings菜单: 1500
    - LocationFocalInputs输入框: 1500
    - RaDecDialog: 1800

12. **全屏覆盖层** (z-index: 2000-2999)
    - AutomaticPolarAlignmentCalibration轨迹覆盖: 2000
    - AutomaticPolarAlignmentCalibration最小化面板: 2000

13. **紧急提示层** (z-index: 3000+)
    - MeridianFlipNotifier: 3000
    - 其他紧急系统提示

## 使用规范

1. 所有新组件必须遵循此层级规划
2. 同一层级的组件之间不应该重叠
3. 如果需要临时显示在最上层，使用 3000+ 层级
4. 对话框类组件使用 600-1999 层级
5. 全屏覆盖类组件使用 2000+ 层级

