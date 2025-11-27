<template>
  <div
    class="schedule-panel"
    :style="{ left: '0px', right: '0px', top: '0px', bottom: '0px', zIndex: 200 }"
  >
    <div class="schedule-main">
      <!-- 左侧：竖直操作栏，适合双手操作 -->
      <div class="left-toolbar" :class="{ collapsed: isLeftToolbarCollapsed }">
        <button
          class="btn icon-only collapse-btn"
          @click="toggleLeftToolbar"
          :title="isLeftToolbarCollapsed ? $t('Expand') : $t('Collapse')"
        >
          <v-icon small>
            {{ isLeftToolbarCollapsed ? 'mdi-chevron-right' : 'mdi-chevron-left' }}
          </v-icon>
        </button>

        <div class="left-toolbar-buttons" v-show="!isLeftToolbarCollapsed">
          <button class="btn large" @click="addRow" :disabled="isScheduleRunning">
            <v-icon small>mdi-plus</v-icon>
            <span class="btn-text">{{ $t('Add') }}</span>
          </button>

          <button
            class="btn large"
            :disabled="!selectedRow || isScheduleRunning"
            @click="deleteSelectedRow"
          >
            <v-icon small>mdi-delete</v-icon>
            <span class="btn-text">{{ $t('Delete') }}</span>
          </button>

          <button class="btn large primary" @click="toggleSchedule">
            <v-icon small>
              {{ isScheduleRunning ? 'mdi-pause' : 'mdi-play' }}
            </v-icon>
            <span class="btn-text">
              {{ isScheduleRunning ? $t('Pause') : $t('Start') }}
            </span>
          </button>

          <button class="btn" @click="openSavePresetDialog" :disabled="isScheduleRunning">
            <v-icon small>mdi-content-save</v-icon>
            <span class="btn-text">{{ $t('Save') }}</span>
          </button>

          <button class="btn" @click="openLoadPresetDialog" :disabled="isScheduleRunning">
            <v-icon small>mdi-folder-open</v-icon>
            <span class="btn-text">{{ $t('Load') }}</span>
          </button>
        </div>

        <!-- 关闭按钮：始终在最下方，只在折叠/展开时改变大小 -->
        <button
          class="btn close-btn"
          :class="[isLeftToolbarCollapsed ? 'icon-only' : 'large']"
          @click="closePanel"
          :title="$t('Close')"
        >
          <v-icon small>mdi-close</v-icon>
          <span class="btn-text" v-if="!isLeftToolbarCollapsed">{{ $t('Close') }}</span>
        </button>
      </div>

      <!-- 右侧：表格 + 日志 + 参数输入 -->
      <div class="content-area">
        <div class="schedule-header">
          <div class="schedule-title">
            {{ $t('Schedule') }}
          </div>
        </div>

        <div class="schedule-body">
          <!-- 中间：任务表格 -->
          <div class="table-wrapper">
            <div
              class="table-scroll"
              ref="tableScroll"
            >
              <table class="schedule-table">
                <thead>
                  <tr>
                    <th
                      v-for="field in fieldDefinitions"
                      :key="field.key"
                      :class="{ 'status-col': field.type === 'status' }"
                    >
                      {{ field.label }}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  <tr
                    v-for="row in numberOfRows"
                    :key="row"
                    :class="{ 'row-selected': row === selectedRow }"
                  >
                    <td
                      v-for="(field, colIndex) in fieldDefinitions"
                      :key="field.key"
                      :class="[
                        { 'cell-selected': isSelected(row, colIndex + 1) },
                        { 'status-col': field.type === 'status' }
                      ]"
                      @click="selectCell(row, colIndex + 1, field)"
                    >
                      <!-- 状态栏：进度条 + 状态文字 -->
                      <template v-if="field.type === 'status'">
                        <div class="status-cell">
                          <div class="status-label">
                            {{ statusLabel(row) }}
                          </div>
                          <div class="status-bar">
                            <div
                              class="status-bar-inner"
                              :style="{ width: rowProgressPercent(row) + '%' }"
                            ></div>
                          </div>
  </div>
</template>

                      <!-- 其它字段：展示格式化后的单元格内容 -->
                      <template v-else>
                        {{ displayCellValue(row, colIndex + 1) }}
                      </template>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          <!-- 右侧：日志 + 参数编辑 -->
          <div
            class="side-panel"
            ref="sidePanel"
            :class="{ collapsed: isSidePanelCollapsed }"
          >
            <div class="side-toggle">
              <button
                class="btn icon-only side-collapse-btn"
                @click="toggleSidePanel"
                :title="isSidePanelCollapsed ? $t('Expand') : $t('Collapse')"
              >
                <v-icon x-small>
                  {{ isSidePanelCollapsed ? 'mdi-chevron-left' : 'mdi-chevron-right' }}
                </v-icon>
              </button>
            </div>

            <div class="log-panel" v-show="!isSidePanelCollapsed">
              <div class="log-header">
                {{ $t('Task Status') }}
              </div>
              <div class="log-list">
                <div v-if="currentStatusLine" class="status-card">
                  <div class="status-card-header">
                    <div>
                      <div class="status-title">{{ currentStatusLine.title }}</div>
                      <div class="status-summary">
                        {{ currentStatusLine.progress }}% · {{ currentStatusLine.status }}
                      </div>
                    </div>
                  </div>

                  <div class="status-progress-bar">
                    <div
                      class="status-progress-inner"
                      :style="{ width: currentStatusLine.progress + '%' }"
                    ></div>
                  </div>

                  <div class="status-steps">
                    <div
                      v-for="(row, rowIdx) in currentStatusLine.stepRows"
                      :key="'steps-row-' + rowIdx"
                      class="status-steps-row"
                      :class="{ reverse: rowIdx % 2 === 1 }"
                    >
                      <div
                        v-for="node in row"
                        :key="node.key"
                        class="status-step"
                      >
                        <div
                          class="status-step-dot"
                          :class="{ done: node.isDone, active: node.isActive }"
                        ></div>
                        <div
                          class="status-step-label"
                          :class="{ done: node.isDone, active: node.isActive }"
                        >
                          {{ node.label }}
                        </div>
                        <!-- 带明确时间的步骤：显示当前剩余时间 -->
                        <div
                          v-if="node.timeRemainingSec !== null && node.timeRemainingSec >= 1 && node.isActive"
                          class="status-time"
                        >
                          {{ node.timeRemainingSec }}s
                        </div>
                        <div
                          v-if="node.key === 'loop' && node.loopTotal"
                          class="status-loop"
                        >
                          <div class="loop-bar">
                            <div
                              class="loop-bar-inner"
                              :style="{ width: node.loopProgress + '%' }"
                            ></div>
                          </div>
                          <div class="loop-text">
                            {{ node.loopDone }}/{{ node.loopTotal }}
                          </div>
                        </div>

                        <!-- 无明确时间的步骤：当前步骤显示一个循环进度条效果 -->
                        <div
                          v-if="node.isActive && (node.key === 'mount' || node.key === 'filter' || node.key === 'autofocus')"
                          class="status-step-indeterminate"
                        >
                          <div class="status-step-indeterminate-inner"></div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div v-else class="status-empty">
                  {{ $t('No active task') }}
                </div>
              </div>
            </div>

            <div class="editor-wrapper" v-if="selectedField" v-show="!isSidePanelCollapsed">
              <div class="editor-header">
                <div class="editor-title">
                  {{ selectedField.label }}
                </div>
                <div class="editor-type">
                  {{ $t(selectedField.typeLabel) }}
                </div>
              </div>

              <div class="editor-body">
                <div class="editor-main">
                  <!-- clock：24 小时制时间选择 + 上下拨动 -->
                  <div v-if="selectedField.type === 'clock'" class="editor-section">
                    <label class="editor-label">{{ $t('Clock') }}</label>
                    <div class="editor-row">
                      <label class="checkbox-label">
                        <input type="checkbox" v-model="editorClockIsNow" @change="applyClockEditor" />
                        <span>{{ $t('Now') }}</span>
                      </label>
                    </div>
                    <div class="editor-row time-wheel" :class="{ disabled: editorClockIsNow }">
                      <div class="time-unit">
                        <button class="wheel-btn" @click="stepClockHour(1)" :disabled="editorClockIsNow">
                          ▲
                        </button>
                        <div class="time-value">
                          <input
                            type="number"
                            min="0"
                            max="23"
                            v-model.number="editorClockHour"
                            :disabled="editorClockIsNow"
                            readonly
                            inputmode="none"
                            @focus.prevent="$event.target.blur()"
                            @click.prevent.stop="activateClockKeypad('hour')"
                          />
                          <span class="time-unit-label">{{ $t('Hour') }}</span>
                        </div>
                        <button class="wheel-btn" @click="stepClockHour(-1)" :disabled="editorClockIsNow">
                          ▼
                        </button>
                      </div>
                      <span class="time-separator">:</span>
                      <div class="time-unit">
                        <button class="wheel-btn" @click="stepClockMinute(1)" :disabled="editorClockIsNow">
                          ▲
                        </button>
                        <div class="time-value">
                          <input
                            type="number"
                            min="0"
                            max="59"
                            v-model.number="editorClockMinute"
                            :disabled="editorClockIsNow"
                            readonly
                            inputmode="none"
                            @focus.prevent="$event.target.blur()"
                            @click.prevent.stop="activateClockKeypad('minute')"
                          />
                          <span class="time-unit-label">{{ $t('Minute') }}</span>
                        </div>
                        <button class="wheel-btn" @click="stepClockMinute(-1)" :disabled="editorClockIsNow">
                          ▼
                        </button>
                      </div>
                    </div>
                  </div>

                  <!-- time：秒为单位且不小于 0 -->
                  <div v-else-if="selectedField.type === 'time'" class="editor-section">
                    <label class="editor-label">{{ $t('Time') }}</label>
                    <div class="editor-row readonly">
                      {{ editorTimeSeconds }} s
                    </div>
                  </div>

                  <!-- exposure：曝光，预设 + 自定义，支持 s / ms -->
                  <div v-else-if="selectedField.type === 'exposure'" class="editor-section">
                    <label class="editor-label">{{ $t('Exposure') }}</label>
                    <div class="editor-row">
                      <select v-model="editorExposurePreset" @change="onExposurePresetChange">
                        <option
                          v-for="p in exposurePresets"
                          :key="p"
                          :value="p"
                        >
                          {{ p }}
                        </option>
                      </select>
                    </div>
                    <div class="editor-row" v-if="isExposureCustom">
                      <div class="editor-inline">
                        <span class="unit">{{ $t('Custom') }}</span>
                        <span class="unit">{{ editorExposureValue }} {{ editorExposureUnit }}</span>
                      </div>
                    </div>
                    <div class="editor-row" v-else>
                      <span class="unit">{{ editorExposurePreset }}</span>
                    </div>
                  </div>

                  <!-- 下拉框：滤镜 / 类型 / Refocus -->
                  <div
                    v-else-if="selectedField.type === 'select-filter'"
                    class="editor-section"
                  >
                    <label class="editor-label">{{ $t('Filter No.') }}</label>
                    <div class="editor-row editor-options" v-if="filterOptions && filterOptions.length">
                      <button
                        v-for="opt in filterOptions"
                        :key="'filter-pill-' + opt"
                        type="button"
                        class="option-pill"
                        :class="{ active: editorSelectValue === opt }"
                        @click="setSelectValue(opt)"
                      >
                        {{ opt }}
                      </button>
                    </div>
                  </div>

                  <div
                    v-else-if="selectedField.type === 'select-type'"
                    class="editor-section"
                  >
                    <label class="editor-label">{{ $t('Type') }}</label>
                    <div class="editor-row editor-options">
                      <button
                        v-for="opt in frameTypeOptions"
                        :key="'type-pill-' + opt"
                        type="button"
                        class="option-pill"
                        :class="{ active: editorSelectValue === opt }"
                        @click="setSelectValue(opt)"
                      >
                        {{ opt }}
                      </button>
                    </div>
                  </div>

                  <div
                    v-else-if="selectedField.type === 'select-refocus'"
                    class="editor-section"
                  >
                    <label class="editor-label">{{ $t('Refocus') }}</label>
                    <div class="editor-row editor-options">
                      <button
                        v-for="opt in refocusOptions"
                        :key="'refocus-pill-' + opt"
                        type="button"
                        class="option-pill"
                        :class="{ active: editorSelectValue === opt }"
                        @click="setSelectValue(opt)"
                      >
                        {{ opt }}
                      </button>
                    </div>
                  </div>

                  <!-- 整数输入：Reps -->
                  <div v-else-if="selectedField.type === 'integer'" class="editor-section">
                    <label class="editor-label">{{ $t('Reps') }}</label>
                    <div class="editor-row readonly">
                      {{ editorIntegerValue }}
                    </div>
                  </div>

                  <!-- target：目标点，数字输入 + 类型切换 + 星图按钮 -->
                  <div v-else-if="selectedField.type === 'target'" class="editor-section">
                    <div class="editor-row">
                      <input
                        type="text"
                        v-model="editorTargetName"
                        @change="applyTargetEditor"
                        :placeholder="$t('e.g. M42, NGC7000...')"
                      />
                    </div>
                    <div class="editor-row target-actions">
                      <button class="btn small" @click="cycleTargetPrefix">
                        {{ targetPrefixLabel }}
                      </button>
                      <button class="btn small" @click="searchTargetInSky">
                        <v-icon x-small>mdi-magnify</v-icon>
                        <span class="btn-text">{{ $t('Search & Center') }}</span>
                      </button>
                      <button class="btn small" @click="useCurrentSkySelection">
                        <v-icon x-small>mdi-crosshairs-gps</v-icon>
                        <span class="btn-text">{{ $t('Use Selected Object') }}</span>
                      </button>
                    </div>
                  </div>

                  <!-- 文本（只读）：Ra/Dec 等 -->
                  <div v-else-if="selectedField.type === 'text'" class="editor-section">
                    <label class="editor-label">{{ selectedField.label }}</label>
                    <div class="editor-row readonly">
                      {{ currentCellValue }}
                    </div>
                  </div>

                  <!-- 状态栏：只读 -->
                  <div v-else-if="selectedField.type === 'status'" class="editor-section">
                    <label class="editor-label">{{ $t('Status') }}</label>
                    <div class="editor-row readonly">
                      {{ statusLabel(selectedRow) }} ({{ rowProgressPercent(selectedRow) }}%)
                    </div>
                  </div>

                  <!-- 兜底：显示原始内容 -->
                  <div v-else class="editor-section">
                    <label class="editor-label">{{ selectedField.label }}</label>
                    <div class="editor-row">
                      <input
                        type="text"
                        v-model="genericEditorValue"
                        @change="applyGenericEditor"
                      />
                    </div>
                  </div>
                </div>

                <div
                  v-if="keypadMode"
                  class="editor-keypad"
                >
                  <div class="editor-keypad-label">
                    {{ keypadLabel }}
                  </div>
                  <div class="keypad-grid">
                    <button
                      v-for="k in keypadKeys"
                      :key="'unified-' + k"
                      class="keypad-key"
                      @click="onKeypadPress(keypadMode, k)"
                    >
                      {{ k === 'Del' ? '⌫' : k }}
                    </button>
                    <!-- 曝光自定义模式下，追加一个切换 s/ms 的键 -->
                    <button
                      v-if="keypadMode === 'exposureCustom'"
                      key="unified-unit"
                      class="keypad-key"
                      @click="toggleExposureUnit"
                    >
                      {{ editorExposureUnit === 's' ? 'ms' : 's' }}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 任务计划表预设保存 / 加载对话框（简单内嵌面板实现） -->
    <div
      v-if="showSchedulePresetDialog"
      class="schedule-preset-dialog"
    >
      <div class="schedule-preset-card">
        <div class="schedule-preset-header">
          <span>
            {{ schedulePresetMode === 'save' ? $t('Save Schedule') : $t('Load Schedule') }}
          </span>
          <button class="btn small" @click="cancelSchedulePresetDialog">
            <v-icon x-small>mdi-close</v-icon>
          </button>
        </div>

        <div class="schedule-preset-body">
          <div class="preset-list">
            <div
              v-for="name in schedulePresets"
              :key="name"
              class="preset-item"
              :class="{ active: name === scheduleSelectedPreset }"
              @click="selectSchedulePreset(name)"
            >
              {{ name }}
            </div>
            <div v-if="!schedulePresets.length" class="preset-empty">
              {{ $t('No saved schedules') }}
            </div>
          </div>

          <div class="preset-input">
            <input
              type="text"
              v-model="schedulePresetName"
              :placeholder="$t('Schedule name')"
            />
          </div>
        </div>

        <div class="schedule-preset-footer">
          <template v-if="schedulePresetMode === 'save'">
            <button
              class="btn primary small"
              @click="confirmSaveSchedulePreset"
            >
              {{ $t('Save') }}
            </button>
          </template>
          <template v-else>
            <button
              class="btn small"
              :disabled="!scheduleSelectedPreset"
              @click="deleteSchedulePreset"
            >
              {{ $t('Delete') }}
            </button>
            <button
              class="btn primary small"
              :disabled="!scheduleSelectedPreset"
              @click="cancelSchedulePresetDialog"
            >
              {{ $t('OK') }}
            </button>
          </template>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  name: 'SchedulePanel',
  data() {
    return {
      // 面板布局
      panelLeft: 0,
      containerMaxHeight: 260,

      // 折叠状态
      isLeftToolbarCollapsed: false,
      isSidePanelCollapsed: false,

      // 计划运行状态
      isScheduleRunning: false,

      // 表格数据（沿用原 ScheduleTable 的数据结构）
      numberOfRows: 8,
      numberOfColumns: 9, // 数据列：Target ~ Exp Delay（状态列单独计算，不计入此处）
      cellValues: {},

      // 进度 / 状态
      rowProgress: {}, // { rowIndex: 0-100 }

      // 选中单元格
      selectedRow: null,
      selectedColumn: null,

      // 字段定义（第一行：命名 + 类型）
      fieldDefinitions: [
        { index: 1, key: 'target', label: this.$t('Target'), type: 'target', typeLabel: 'target' },
        { index: 2, key: 'raDec', label: this.$t('Ra/Dec'), type: 'text', typeLabel: 'text' },
        { index: 3, key: 'shootTime', label: this.$t('Shoot Time'), type: 'clock', typeLabel: 'clock' },
        { index: 4, key: 'expTime', label: this.$t('Exp Time'), type: 'exposure', typeLabel: 'exposure' },
        { index: 5, key: 'filter', label: this.$t('Filter No.'), type: 'select-filter', typeLabel: 'dropdown' },
        { index: 6, key: 'reps', label: this.$t('Reps'), type: 'integer', typeLabel: 'integer' },
        { index: 7, key: 'frameType', label: this.$t('Type'), type: 'select-type', typeLabel: 'dropdown' },
        { index: 8, key: 'refocus', label: this.$t('Refocus'), type: 'select-refocus', typeLabel: 'dropdown' },
        { index: 9, key: 'expDelay', label: this.$t('Exp Delay'), type: 'time', typeLabel: 'time (s)' },
        { index: 10, key: 'status', label: this.$t('Status'), type: 'status', typeLabel: 'status' }
      ],

      // 初始列默认值（与旧实现兼容）
      initialColumnValues: {
        1: 'null ',
        2: '',
        3: 'Now',
        4: '1 s',
        5: 'L',
        6: '1',
        7: 'Light',
        8: 'OFF',
        9: '0 s'
      },

      // 编辑器状态
      editorClockIsNow: true,
      editorClockHour: 0,
      editorClockMinute: 0,

      editorTimeSeconds: 0,

      editorExposureValue: 1,
      editorExposureUnit: 's',

      editorSelectValue: '',

      editorIntegerValue: 1,
      // 重复次数编辑：用于判断本轮是否为“重新输入”，以便第一次按键从空串开始
      integerEditingStarted: false,

      editorTargetName: '',

      genericEditorValue: '',

      // 选项
      filterOptions: [],
      frameTypeOptions: ['Light', 'Dark', 'Bias', 'Flat'],
      refocusOptions: ['ON', 'OFF'],

      // 曝光预设与自定义
      exposurePresets: [
        '1 ms',
        '10 ms',
        '100 ms',
        '1 s',
        '5 s',
        '10 s',
        '30 s',
        '60 s',
        '120 s',
        '300 s',
        '600 s',
        'Custom'
      ],
      editorExposurePreset: '1 s',
      isExposureCustom: false,

      // 步骤定义（思维导图节点顺序）
      stepDefinitions: [
        { key: 'wait', labelKey: 'Wait' },
        { key: 'mount', labelKey: 'Mount' },
        { key: 'filter', labelKey: 'Filter Wheel' },
        { key: 'autofocus', labelKey: 'Auto Focus' },
        { key: 'loop', labelKey: 'Reps' },
        { key: 'exposure', labelKey: 'Exp Time' },
        { key: 'delay', labelKey: 'Exp Delay' },
        { key: 'type', labelKey: 'Type' }
      ],

      // 预留的真实状态（由后端事件填充）
      // 结构示例：{ [row]: { currentStep: 'exposure', loopDone: 3, loopTotal: 10, stepProgress: 50 } }
      stepState: {},

      // 小键盘
      keypadKeys: ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0', 'Del'],

      // 当前小键盘模式：'timeSeconds' | 'integer' | 'exposureCustom' | 'target' | 'clockHour' | 'clockMinute' | null
      keypadMode: null,

      // 简单日志
      logs: [],

      // 是否处于“从星图选择目标”模式（由 Use Selected Object 按钮触发）
      isWaitingSkySelection: false,

      // 任务计划表预设管理
      showSchedulePresetDialog: false,
      schedulePresetMode: 'save', // 'save' | 'load'
      schedulePresets: [],
      schedulePresetName: '',
      scheduleSelectedPreset: null
    };
  },
  computed: {
    selectedField() {
      if (!this.selectedColumn) return null;
      return this.fieldDefinitions[this.selectedColumn - 1] || null;
    },
    currentCellKey() {
      if (!this.selectedRow || !this.selectedColumn || this.selectedColumn > this.numberOfColumns) {
        return null;
      }
      return `${this.selectedRow}-${this.selectedColumn}`;
    },
    currentCellValue() {
      if (!this.currentCellKey) return '';
      return this.cellValues[this.currentCellKey] || '';
    },
    targetPrefixLabel() {
      // 简单根据当前名称中的前缀猜测类型，并在按钮上显示
      const v = this.editorTargetName || '';
      if (/^\s*M/i.test(v)) return 'M';
      if (/^\s*IC/i.test(v)) return 'IC';
      if (/^\s*NGC/i.test(v)) return 'NGC';
      return this.$t('Prefix');
    },
    keypadLabel() {
      if (!this.keypadMode) return '';
      if (this.keypadMode === 'timeSeconds') return this.$t('Time (s)');
      if (this.keypadMode === 'integer') return this.$t('Reps');
      if (this.keypadMode === 'exposureCustom') return this.$t('Custom Exposure');
      if (this.keypadMode === 'target') return this.$t('Target number');
       if (this.keypadMode === 'clockHour') return this.$t('Hour');
       if (this.keypadMode === 'clockMinute') return this.$t('Minute');
      return '';
    },
    statusLines() {
      const lines = [];
      for (let row = 1; row <= this.numberOfRows; row++) {
        const keyTarget = `${row}-1`;
        const target = (this.cellValues[keyTarget] || '').trim();
        if (!target || target === 'null') continue;

        const raDec = (this.cellValues[`${row}-2`] || '').trim();
        const shootTime = this.cellValues[`${row}-3`] || '';
        const expTime = this.cellValues[`${row}-4`] || '';
        const filterRaw = this.cellValues[`${row}-5`] || '';
        const filter = this.getFilterDisplayValue(filterRaw);
        const reps = this.cellValues[`${row}-6`] || '';
        const frameType = this.cellValues[`${row}-7`] || '';
        const refocus = this.cellValues[`${row}-8`] || '';
        const delay = this.cellValues[`${row}-9`] || '';

        const progress = this.rowProgressPercent(row);
        const status = this.statusLabel(row);

        const title = `${row}. ${target || this.$t('Target')}`;

        // 真实步骤状态（预留接口）
        const realState = this.stepState[row] || null;

        // 为当前行动态构建需要显示的步骤列表
        const nodeDefs = [];

        // 如果开始时间不是 Now，先添加“等待开始”步骤
        if (shootTime && shootTime !== 'Now') {
          nodeDefs.push({ key: 'wait' });
        }

        // 赤道仪始终显示
        nodeDefs.push({ key: 'mount' });

        // 仅在存在滤镜轮并且本行确实设置了滤镜位置时，才在精细状态中显示“滤镜轮”
        const hasFilterWheel = this.filterOptions && this.filterOptions.length > 0;
        const hasFilterStep =
          hasFilterWheel &&
          filter &&
          filter !== 'NULL' &&
          filter.trim() !== '' &&
          filter.trim() !== '-';
        if (hasFilterStep) {
          nodeDefs.push({ key: 'filter' });
        }

        // 仅在需要自动对焦时显示
        if (refocus === 'ON') {
          nodeDefs.push({ key: 'autofocus' });
        }

        const repsIntRaw = parseInt(reps, 10);
        const repsInt = Number.isNaN(repsIntRaw) ? 1 : repsIntRaw;
        if (repsInt > 1) {
          nodeDefs.push({ key: 'loop' });
        }

        nodeDefs.push({ key: 'exposure' });

        // 延时非 0 才显示
        if (delay && delay !== '0 s' && delay !== '0s' && delay !== '0') {
          nodeDefs.push({ key: 'delay' });
        }

        if (!nodeDefs.length) continue;

        // 回退：根据整体进度粗略推算当前步骤
        const totalSteps = nodeDefs.length;
        let activeIndex = 0;
        if (!realState) {
          const approx = Math.floor((progress / 100) * totalSteps);
          activeIndex = Math.min(Math.max(approx, 0), totalSteps - 1);
      } else {
          const idx = nodeDefs.findIndex(s => s.key === realState.currentStep);
          activeIndex = idx >= 0 ? idx : 0;
        }

        const nodes = nodeDefs.map((step, index) => {
          const def = this.stepDefinitions.find(d => d.key === step.key) || step;
          let value = '';
          if (step.key === 'wait') value = shootTime || 'Now';
          else if (step.key === 'mount') value = raDec || this.$t('Not set');
          else if (step.key === 'filter') value = filter || '-';
          else if (step.key === 'autofocus') value = refocus === 'ON' ? this.$t('Enabled') : this.$t('Disabled');
          else if (step.key === 'loop') value = reps || '1';
          else if (step.key === 'exposure') value = expTime || '-';
          else if (step.key === 'delay') value = delay || '0 s';
          else if (step.key === 'type') value = frameType || '-';

          let loopTotal = null;
          let loopDone = null;
          let loopProgress = 0;
          let timeTotalSec = null;
          let timeRemainingSec = null;
          if (step.key === 'loop') {
            const total = parseInt(reps, 10) || 1;
            loopTotal = total;

            // 若后端有回传合法的循环总数（>0），优先生效；
            // 否则保留前端根据 Reps 列得到的 loopTotal，避免在运行开始时变为 0 而导致 "0/10" 文本整体消失。
            if (
              realState &&
              typeof realState.loopTotal === 'number' &&
              realState.loopTotal > 0
            ) {
              loopTotal = realState.loopTotal;
            }

            const hasRealLoop =
              realState &&
              typeof realState.loopDone === 'number' &&
              typeof realState.loopTotal === 'number' &&
              realState.loopTotal > 0 &&
              realState.loopDone >= 0;

            if (hasRealLoop) {
              // 后端已经按每张拍摄回传了精准的 loopDone，这里直接使用，
              // 并限制在 [0, loopTotal] 范围内，避免出现每次 +2 之类的重复累加。
              loopDone = Math.min(loopTotal, Math.max(0, realState.loopDone));
            } else {
              // 兼容旧后端：根据整体进度在中段 [30, 70]% 估算本轮已完成次数
              const loopStart = 30;
              const loopEnd = 70;
              const clamped = Math.min(Math.max(progress, loopStart), loopEnd);
              const approxRatio =
                loopEnd - loopStart === 0 ? 0 : (clamped - loopStart) / (loopEnd - loopStart);
              loopDone = loopTotal ? Math.max(0, Math.round(approxRatio * loopTotal)) : 0;
            }

            loopProgress = loopTotal ? Math.min(100, Math.max(0, (loopDone / loopTotal) * 100)) : 0;
          }

          // 带明确时间的步骤：根据 stepProgress 估算剩余时间（秒）
          const computeTimeRemaining = (rawText) => {
            const m = String(rawText || '').trim().match(/^(\d+(?:\.\d+)?)\s*(ms|s)?$/);
            if (!m) return null;
            const v = parseFloat(m[1]);
            const unit = m[2] || 's';
            if (Number.isNaN(v) || v <= 0) return null;
            const totalMs = unit === 'ms' ? v : v * 1000;
            let percent = 0;
            if (realState && step.key === realState.currentStep && typeof realState.stepProgress === 'number') {
              percent = Math.min(Math.max(realState.stepProgress, 0), 100);
            }
            const remainMs = totalMs * (1 - percent / 100);
            return {
              totalSec: Math.max(1, Math.round(totalMs / 1000)),
              remainSec: Math.max(0, Math.round(remainMs / 1000))
            };
          };

          if (step.key === 'exposure') {
            const t = computeTimeRemaining(expTime);
            if (t) {
              timeTotalSec = t.totalSec;
              timeRemainingSec = t.remainSec;
            }
          } else if (step.key === 'delay') {
            const t = computeTimeRemaining(delay);
            if (t) {
              timeTotalSec = t.totalSec;
              timeRemainingSec = t.remainSec;
            }
          }

          return {
            key: step.key,
            label: this.$t(def.labelKey || def.key),
            value,
            isDone: index < activeIndex || progress >= 100,
            isActive: index === activeIndex && progress < 100,
            loopTotal,
            loopDone,
            loopProgress,
            timeTotalSec,
            timeRemainingSec
          };
        });

        // 将节点拆分为蛇形多行
        const perRow = 4;
        const stepRows = [];
        for (let i = 0; i < nodes.length; i += perRow) {
          let slice = nodes.slice(i, i + perRow);
          // 第二行、第四行... 反向显示，形成蛇形视觉
          if (stepRows.length % 2 === 1) {
            slice = slice.slice().reverse();
          }
          stepRows.push(slice);
        }

        lines.push({
          row,
          title,
          status,
          progress,
          nodes,
          stepRows
        });
      }
      return lines;
    },
    currentTaskRow() {
      // 当前正在执行的任务行：优先选择进度在 (0,100) 之间的行；否则选择第一个未完成的行
      let active = null;
      let firstPending = null;
      for (let row = 1; row <= this.numberOfRows; row++) {
        const p = this.rowProgressPercent(row);
        if (p > 0 && p < 100) {
          active = row;
          break;
        }
        if (firstPending === null && p === 0) {
          firstPending = row;
        }
      }
      return active || firstPending;
    },
    currentStatusLine() {
      const lines = this.statusLines;
      if (!lines.length) return null;
      const row = this.currentTaskRow;
      return lines.find(l => l.row === row) || lines[0];
    }
  },
  created() {
    // 布局 / 面板显隐
    this.$bus.$on('toggleSchedulePanel', this.recomputeLayout);

    // 计划完成
    this.$bus.$on('ScheduleComplete', this.onScheduleComplete);

    // 后端更新每一行进度
    this.$bus.$on('UpdateScheduleProcess', this.onUpdateScheduleProcess);

    // CFW 滤镜列表
    this.$bus.$on('initCFWList', this.onInitCFWList);
    // CFW 槽位数量（优先用该信号确定滤镜轮是否存在以及有多少个位置）
    this.$bus.$on('SetCFWPositionMax', this.onSetCFWPositionMax);

    // 目标 RA/Dec 更新（来自搜索或星图）
    this.$bus.$on('TargetRaDec', this.insertObjRaDec);

    // 目标名称更新（来自星图选中对象）
    this.$bus.$on('insertObjName', this.insertObjName);

    // 恢复暂存的日程数据
    this.$bus.$on('StagingScheduleData', this.recoveryScheduleData);

    // 来自其它模块的天文通知，自动添加一行
    this.$bus.$on('TianWen', this.addTianWenRow);

    // 任务计划表预设列表
    this.$bus.$on('SchedulePresetList', this.onSchedulePresetList);
    this.$bus.$on('SchedulePresetDeleted', this.onSchedulePresetDeleted);

    // 任务计划表细粒度步骤状态
    this.$bus.$on('ScheduleStepState', this.onScheduleStepState);
    // 任务计划表循环次数专用状态（与步骤状态解耦，避免被其它步骤覆盖）
    this.$bus.$on('ScheduleLoopState', this.onScheduleLoopState);
    // 任务计划表运行状态（用于刷新或外部控制后的状态同步）
    this.$bus.$on('ScheduleRunning', this.onScheduleRunning);
  },
  mounted() {
    // 初始化表格
    this.initializeTable();
    this.recomputeLayout();

    // 向后端请求暂存的计划数据
    this.$bus.$emit('AppSendMessage', 'Vue_Command', 'getStagingScheduleData');
  },
  beforeDestroy() {
    this.$bus.$off('toggleSchedulePanel', this.recomputeLayout);
    this.$bus.$off('ScheduleComplete', this.onScheduleComplete);
    this.$bus.$off('UpdateScheduleProcess', this.onUpdateScheduleProcess);
    this.$bus.$off('initCFWList', this.onInitCFWList);
    this.$bus.$off('SetCFWPositionMax', this.onSetCFWPositionMax);
    this.$bus.$off('TargetRaDec', this.insertObjRaDec);
    this.$bus.$off('insertObjName', this.insertObjName);
    this.$bus.$off('StagingScheduleData', this.recoveryScheduleData);
    this.$bus.$off('TianWen', this.addTianWenRow);
    this.$bus.$off('SchedulePresetList', this.onSchedulePresetList);
    this.$bus.$off('SchedulePresetDeleted', this.onSchedulePresetDeleted);
    this.$bus.$off('ScheduleRunning', this.onScheduleRunning);
    this.$bus.$off('ScheduleStepState', this.onScheduleStepState);
    this.$bus.$off('ScheduleLoopState', this.onScheduleLoopState);
  },
  methods: {
    // ---------- 布局 ----------
    recomputeLayout() {
      const height = window.innerHeight || 800;
      // 预留顶部标题和右侧日志区域的高度
      this.containerMaxHeight = height - 220;
    },

    toggleLeftToolbar() {
      this.isLeftToolbarCollapsed = !this.isLeftToolbarCollapsed;
    },

    toggleSidePanel() {
      this.isSidePanelCollapsed = !this.isSidePanelCollapsed;
    },

    // ---------- 运行控制 ----------
    toggleSchedule() {
      // 统一管理本次任务计划需要占用的设备
      const scheduleDevices = ['MainCamera', 'Mount', 'Focuser', 'CFW', 'GuiderCamera'];

      if (this.isScheduleRunning) {
        // 停止
        this.isScheduleRunning = false;
        this.$stopFeature(scheduleDevices, 'ScheduleCapture');
        this.$bus.$emit('AppSendMessage', 'Vue_Command', 'StopSchedule');
        this.addLog(this.$t('Schedule stopped'));
      } else {
        // 开始
        // 依次检查所有相关设备是否空闲，并统一走设备管理互斥逻辑
        for (const dev of scheduleDevices) {
          const check = this.$canUseDevice(dev, 'ScheduleCapture');
          if (!check.allowed) {
            // 第一个失败的检查会给出具体阻塞原因，这里直接返回
            return;
          }
        }

        // 先构建并发送当前表格数据
        this.sendTableData(true);

        this.isScheduleRunning = true;
        // 将任务计划表占用登记到所有相关设备，方便全局互斥管理
        this.$startFeature(scheduleDevices, 'ScheduleCapture');
        this.addLog(this.$t('Schedule started'));
      }
    },
    onScheduleComplete() {
      this.isScheduleRunning = false;
      const scheduleDevices = ['MainCamera', 'Mount', 'Focuser', 'CFW', 'GuiderCamera'];
      this.$stopFeature(scheduleDevices, 'ScheduleCapture');
      this.addLog(this.$t('Schedule completed'));
    },

    closePanel() {
      // 通过事件总线让父级 gui.vue 切换 ShowSchedulePanel，从而关闭全屏面板
      this.$bus.$emit('toggleSchedulePanel');
      this.addLog(this.$t('Schedule panel closed'));
    },

    // ---------- 行 / 单元格操作 ----------
    displayCellValue(row, column) {
      if (column === 10) {
        // 状态列
        return this.statusLabel(row);
      }
      // 滤镜列：若无滤镜轮显示 NULL；若有，则显示当前值对应的滤镜名称
      if (column === 5) {
        if (!this.filterOptions || this.filterOptions.length === 0) {
          return 'NULL';
        }
        const key = `${row}-5`;
        const raw = this.cellValues[key] || '';
        return this.getFilterDisplayValue(raw) || '';
      }
      const key = `${row}-${column}`;
      return this.cellValues[key] || '';
    },
    isSelected(row, column) {
      return this.selectedRow === row && this.selectedColumn === column;
    },
    selectCell(row, column, field) {
      // 运行中不允许编辑任务计划表
      if (this.isScheduleRunning) {
        return;
      }
      if (field.type === 'status') {
        // 状态列只读，进度不可点击
        return;
      }

      this.selectedRow = row;
      this.selectedColumn = column;

      this.initEditorFromCell(field);

      // 每次选择单元格时，同步一次暂存数据
      this.sendTableData(false);

      const fieldLabel = field && field.label ? field.label : `C${column}`;
      this.addLog(this.$t('Selected row') + ` ${row}, ${fieldLabel}`);

      // 根据字段类型设置默认小键盘模式
      this.keypadMode = null;
      if (field.type === 'time') {
        this.keypadMode = 'timeSeconds';
      } else if (field.type === 'integer') {
        this.keypadMode = 'integer';
      } else if (field.type === 'exposure' && this.isExposureCustom) {
        this.keypadMode = 'exposureCustom';
      } else if (field.type === 'target') {
        this.keypadMode = 'target';
      }

      // 移动端：选择需要数字输入的单元格时，自动滚动右侧到底部，确保键盘完全可见
      if (this.keypadMode) {
        this.$nextTick(() => {
          if (this.$refs.sidePanel) {
            this.$refs.sidePanel.scrollTop = this.$refs.sidePanel.scrollHeight;
          }
        });
      }
    },
    addRow() {
      if (this.isScheduleRunning) return;
      this.numberOfRows += 1;
      const newRowIndex = this.numberOfRows;
      for (let column = 1; column <= this.numberOfColumns; column++) {
        const key = `${newRowIndex}-${column}`;
        const initialValue = this.initialColumnValues[column] || '';
        this.$set(this.cellValues, key, initialValue);
      }
      this.addLog(this.$t('Added row') + ` #${newRowIndex}`);
    },
    deleteSelectedRow() {
      if (this.isScheduleRunning) return;
      if (!this.selectedRow || this.selectedRow < 1 || this.selectedRow > this.numberOfRows) {
        return;
      }

      const index = this.selectedRow;

      // 删除选中行：向上移动其后的所有行
      for (let row = index; row < this.numberOfRows; row++) {
        for (let column = 1; column <= this.numberOfColumns; column++) {
          const currentKey = `${row}-${column}`;
          const nextKey = `${row + 1}-${column}`;
          this.$set(this.cellValues, currentKey, this.cellValues[nextKey] || '');
        }
      }

      // 删除最后一行
      for (let column = 1; column <= this.numberOfColumns; column++) {
        const lastKey = `${this.numberOfRows}-${column}`;
        this.$delete(this.cellValues, lastKey);
      }

      this.numberOfRows -= 1;

      // 清理进度
      const progress = {};
      for (let row = 1; row <= this.numberOfRows; row++) {
        progress[row] = this.rowProgress[row] || 0;
      }
      this.rowProgress = progress;

      this.selectedRow = null;
      this.selectedColumn = null;

      this.sendTableData(false);
      this.addLog(this.$t('Deleted row') + ` #${index}`);
    },

    // ---------- 初始/恢复 ----------
    initializeTable() {
      for (let row = 1; row <= this.numberOfRows; row++) {
        for (let column = 1; column <= this.numberOfColumns; column++) {
          const key = `${row}-${column}`;
          if (!this.cellValues[key]) {
            const initialValue = this.initialColumnValues[column] || '';
            this.$set(this.cellValues, key, initialValue);
          }
        }
      }
    },
    recoveryScheduleData(text) {
      if (!text) return;

      // 清空当前表
      this.cellValues = {};
      this.numberOfRows = 0;

      const rowData = text.split('[');
      for (let i = 1; i < rowData.length; i++) {
        const colData = rowData[i].split(',');
        if (colData.length <= 1) continue;

        this.numberOfRows += 1;
        const rowIndex = this.numberOfRows;

        for (let j = 1; j < colData.length; j++) {
          const value = colData[j];
          let key;
          if (j === 1) {
            key = `${rowIndex}-1`;
          } else if (j === 2) {
            key = `${rowIndex}-2`;
          } else if (j === 3) {
            key = `${rowIndex}-2`;
            const currentValue = this.cellValues[key] || '';
            this.$set(this.cellValues, key, currentValue + ',' + value);
            continue;
          } else if (j === 4) {
            key = `${rowIndex}-3`;
          } else if (j === 5) {
            key = `${rowIndex}-4`;
          } else if (j === 6) {
            key = `${rowIndex}-5`;
          } else if (j === 7) {
            key = `${rowIndex}-6`;
          } else if (j === 8) {
            key = `${rowIndex}-7`;
          } else if (j === 9) {
            key = `${rowIndex}-8`;
          } else if (j === 10) {
            key = `${rowIndex}-9`;
          } else {
            continue;
          }
          this.$set(this.cellValues, key, value);
        }
      }
    },

    // ---------- 与后端的数据交互 ----------
    buildTableData() {
      const tableData = [];

      for (let row = 1; row <= this.numberOfRows; row++) {
        // 仅当目标列（第 1 列）为有效名称时才保存该行：
        // - 去掉首尾空格后非空
        // - 且不等于 'null'（与旧逻辑兼容）
        const firstKey = `${row}-1`;
        const rawFirstValue = this.cellValues[firstKey];
        const trimmed = (rawFirstValue || '').trim();

        if (trimmed !== '' && trimmed.toLowerCase() !== 'null') {
          const rowData = ['['];
          for (let column = 1; column <= this.numberOfColumns; column++) {
            const key = `${row}-${column}`;
            let v = this.cellValues[key] || '';
            // 滤镜列：向后端发送数字槽位，便于服务端直接使用 toInt() 作为滤镜轮位置
            if (column === 5) {
              v = this.normalizeFilterValueForBackend(v);
            }
            rowData.push(v);
          }
          tableData.push(rowData);
        }
      }

      return tableData;
    },
    sendTableData(isStart) {
      const tableData = this.buildTableData();
      const prefix = isStart ? 'ScheduleTabelData:' : 'StagingScheduleData:';

      // 调试输出：方便对比新面板与旧 ScheduleTable 生成的数据是否一致
      // 形如：Table Data: [[,M42,...],[,M31,...]]
      // （注意：正式发布如需减少日志，可按需去掉）
      console.log('SchedulePanel Table Data:', tableData);

      this.$bus.$emit('AppSendMessage', 'Vue_Command', prefix + tableData);
    },
    // ---------- 任务计划表预设保存 / 读取 ----------
    openSavePresetDialog() {
      this.schedulePresetMode = 'save';
      this.schedulePresetName = '';
      this.scheduleSelectedPreset = null;
      this.requestSchedulePresetList();
      this.showSchedulePresetDialog = true;
    },
    openLoadPresetDialog() {
      this.schedulePresetMode = 'load';
      this.schedulePresetName = '';
      this.scheduleSelectedPreset = null;
      this.requestSchedulePresetList();
      this.showSchedulePresetDialog = true;
    },
    requestSchedulePresetList() {
      // 向后端请求当前已有的任务计划表预设名称
      this.$bus.$emit('AppSendMessage', 'Vue_Command', 'listSchedulePresets');
    },
    onSchedulePresetList(names) {
      this.schedulePresets = Array.isArray(names) ? names : [];
    },
    onSchedulePresetDeleted(name) {
      // 后端删除成功后，前端同步更新列表
      this.schedulePresets = this.schedulePresets.filter(n => n !== name);
      if (this.scheduleSelectedPreset === name) {
        this.scheduleSelectedPreset = null;
        this.schedulePresetName = '';
      }
    },
    selectSchedulePreset(name) {
      this.scheduleSelectedPreset = name;
      this.schedulePresetName = name;

      // 仅在“加载模式”下点击预设时才触发读取；
      // “保存模式”下点击只是选择名称，用于覆盖保存，不会立刻加载。
      if (this.schedulePresetMode === 'load') {
        this.$bus.$emit('AppSendMessage', 'Vue_Command', 'loadSchedulePreset:' + name);
        this.addLog(this.$t('Schedule loaded') + `: ${name}`);
      }
    },
    confirmSaveSchedulePreset() {
      const name = (this.schedulePresetName || '').trim();
      if (!name) {
        this.addLog(this.$t('Please enter a schedule name'));
        return;
      }

      // 使用当前表格数据构建原始调度数据字符串
      const tableData = this.buildTableData();
      const rawData = String(tableData);

      this.$bus.$emit(
        'AppSendMessage',
        'Vue_Command',
        'saveSchedulePreset:' + name + ':' + rawData
      );
      this.addLog(this.$t('Schedule saved') + `: ${name}`);

      this.showSchedulePresetDialog = false;
    },
    cancelSchedulePresetDialog() {
      this.showSchedulePresetDialog = false;
    },

    deleteSchedulePreset() {
      const name = this.scheduleSelectedPreset;
      if (!name) return;

      // 使用全局确认对话框，避免误删
      const title = name;
      const text = this.$t('Are you sure you want to delete this schedule?');
      // 通过全局确认对话框，在用户确认后真正发送删除命令
      this.$bus.$emit('ShowConfirmDialog', title, text, 'DeleteSchedulePreset');
      this.addLog(this.$t('Request delete schedule') + `: ${name}`);
    },

    // ---------- 状态栏 / 进度 ----------
    onUpdateScheduleProcess(rowNum, process) {
      const rowIndex = parseInt(rowNum, 10) + 1; // Qt 使用 0 开始索引，这里转换为 1 开始行号
      const value = Math.min(Math.max(Number(process), 0), 100);
      if (!rowIndex || rowIndex < 1) return;
      this.$set(this.rowProgress, rowIndex, value);
      this.addLog(this.$t('Row') + ` ${rowIndex} ` + this.$t('progress') + `: ${value}%`);
    },
    onScheduleRunning(running) {
      this.isScheduleRunning = !!running;
      this.addLog((running ? this.$t('Schedule started') : this.$t('Schedule stopped')));
    },
    rowProgressPercent(row) {
      const v = this.rowProgress[row] || 0;
      if (isNaN(v)) return 0;
      return Math.min(Math.max(v, 0), 100);
    },
    statusLabel(row) {
      const p = this.rowProgressPercent(row);
      if (p >= 100) return this.$t('Done');
      // 当任务未在运行且该行进度处于(0,100)之间时，显示“任务计划已停止”，避免误解为仍在运行
      if (!this.isScheduleRunning && p > 0 && p < 100) {
        return this.$t('Schedule stopped');
      }
      if (p > 0) return this.$t('Running');
      return this.$t('Pending');
    },

    // ---------- CFW / 选项 ----------
    onInitCFWList(list) {
      if (!list) {
        this.filterOptions = [];
        return;
      }
      const parts = list.split(',');
      const names = parts.filter(x => x && x.trim()).map(x => x.trim());
      // 若已通过 SetCFWPositionMax 知道具体槽位数量，则仅在该范围内更新名称；
      // 否则直接使用 names 作为滤镜轮列表。
      if (this.filterOptions && this.filterOptions.length > 0) {
        for (let i = 0; i < this.filterOptions.length && i < names.length; i++) {
          this.$set(this.filterOptions, i, names[i]);
        }
      } else {
        this.filterOptions = names;
      }
      this.addLog(this.$t('Filter list initialized'));
    },

    // 根据滤镜轮最大槽位数初始化占位列表（数量从该信号获取）
    onSetCFWPositionMax(max) {
      const n = parseInt(max, 10);
      if (!n || n <= 0) {
        this.filterOptions = [];
        this.addLog(this.$t('Filter list cleared (no CFW)'));
        return;
      }
      const arr = [];
      for (let i = 1; i <= n; i++) {
        arr.push(String(i));
      }
      this.filterOptions = arr;
      this.addLog(this.$t('Filter slots initialized') + `: ${n}`);
    },

    /**
     * 将单元格中存储的滤镜值（可能是数字槽位，也可能是名称）转换为用于展示的名称。
     * - 若为纯数字且在 1..N 范围内，则按顺序映射到 filterOptions[index-1]
     * - 否则直接返回原字符串
     */
    getFilterDisplayValue(rawValue) {
      const v = (rawValue || '').toString().trim();
      if (!v) return '';
      if (/^\d+$/.test(v)) {
        const idx = parseInt(v, 10);
        if (idx >= 1 && idx <= this.filterOptions.length) {
          return this.filterOptions[idx - 1] || v;
        }
      }
      return v;
    },

    /**
     * 将展示用滤镜名称转换为发送给后端的数字槽位字符串。
     * - 若本身为纯数字则直接返回
     * - 否则在 filterOptions 中查找名称并返回其 1-based 索引
     */
    normalizeFilterValueForBackend(value) {
      const v = (value || '').toString().trim();
      if (!v) return '';
      if (/^\d+$/.test(v)) return v;
      const idx = this.filterOptions.findIndex(opt => opt === v);
      if (idx !== -1) {
        return String(idx + 1);
      }
      return v;
    },

    // ---------- 编辑器初始化 ----------
    initEditorFromCell(field) {
      const value = this.currentCellValue || '';

      if (field.type === 'clock') {
        if (value === 'Now' || value === '' || value === null) {
          // 默认使用当前时间作为初始值，便于微调
          const now = new Date();
          this.editorClockIsNow = true;
          this.editorClockHour = now.getHours();
          this.editorClockMinute = now.getMinutes();
        } else {
          const parts = value.split(':');
          const h = parseInt(parts[0], 10) || 0;
          const m = parseInt(parts[1], 10) || 0;
          this.editorClockIsNow = false;
          this.editorClockHour = Math.min(Math.max(h, 0), 23);
          this.editorClockMinute = Math.min(Math.max(m, 0), 59);
        }
      } else if (field.type === 'time') {
        const num = parseInt(String(value).replace(/[^\d.-]/g, ''), 10);
        this.editorTimeSeconds = isNaN(num) ? 0 : Math.max(num, 0);
      } else if (field.type === 'exposure') {
        const match = String(value).trim().match(/^(\d+(?:\.\d+)?)\s*(ms|s)?$/);
        if (match) {
          this.editorExposureValue = Number(match[1]);
          this.editorExposureUnit = match[2] || 's';
        } else {
          this.editorExposureValue = 1;
          this.editorExposureUnit = 's';
        }

        const preset = `${this.editorExposureValue} ${this.editorExposureUnit}`;
        if (this.exposurePresets.includes(preset)) {
          this.editorExposurePreset = preset;
          this.isExposureCustom = false;
        } else {
          this.editorExposurePreset = 'Custom';
          this.isExposureCustom = true;
        }
      } else if (field.type === 'select-filter' || field.type === 'select-type' || field.type === 'select-refocus') {
        // 滤镜列：若单元格中存的是数字槽位，则转换为对应名称后放入编辑器
        if (field.type === 'select-filter') {
          this.editorSelectValue = this.getFilterDisplayValue(value) || '';
        } else {
          this.editorSelectValue = value || '';
        }
      } else if (field.type === 'integer') {
        const num = parseInt(value, 10);
        this.editorIntegerValue = isNaN(num) ? 0 : Math.max(num, 0);
        this.integerEditingStarted = false;
      } else if (field.type === 'target') {
        this.editorTargetName = value || '';
      } else if (field.type === 'text' || field.type === 'status') {
        // 只读，无需编辑
      } else {
        this.genericEditorValue = value || '';
      }

      // 初始化时同步小键盘模式（避免状态不同步）
      if (field.type === 'time') {
        this.keypadMode = 'timeSeconds';
      } else if (field.type === 'integer') {
        this.keypadMode = 'integer';
      } else if (field.type === 'exposure') {
        this.keypadMode = this.isExposureCustom ? 'exposureCustom' : null;
      } else if (field.type === 'target') {
        this.keypadMode = 'target';
      } else {
        this.keypadMode = null;
      }
    },

    // ---------- 各类型编辑应用 ----------
    applyClockEditor() {
      if (this.isScheduleRunning) return;
      if (!this.currentCellKey) return;
      if (this.editorClockIsNow) {
        this.$set(this.cellValues, this.currentCellKey, 'Now');
      } else {
        const h = Math.min(Math.max(parseInt(this.editorClockHour, 10) || 0, 0), 23);
        const m = Math.min(Math.max(parseInt(this.editorClockMinute, 10) || 0, 0), 59);
        const hh = h < 10 ? `0${h}` : String(h);
        const mm = m < 10 ? `0${m}` : String(m);
        this.$set(this.cellValues, this.currentCellKey, `${hh}:${mm}`);
      }
      this.sendTableData(false);
    },
    applyTimeEditor() {
      if (this.isScheduleRunning) return;
      if (!this.currentCellKey) return;
      const v = Math.max(this.editorTimeSeconds || 0, 0);
      this.$set(this.cellValues, this.currentCellKey, `${v} s`);
      this.sendTableData(false);
    },
    applyExposureEditor() {
      if (this.isScheduleRunning) return;
      if (!this.currentCellKey) return;
      const v = Math.max(this.editorExposureValue || 0, 0);
      const unit = this.editorExposureUnit === 'ms' ? 'ms' : 's';
      this.$set(this.cellValues, this.currentCellKey, `${v} ${unit}`);
      this.sendTableData(false);
    },
    applySelectEditor() {
      if (this.isScheduleRunning) return;
      if (!this.currentCellKey) return;
      const field = this.selectedField;
      let v = this.editorSelectValue || '';
      // 对滤镜列，实际写入数值槽位，界面展示再通过映射还原为名称
      if (field && field.type === 'select-filter') {
        v = this.normalizeFilterValueForBackend(v);
      }
      this.$set(this.cellValues, this.currentCellKey, v);
      this.sendTableData(false);
    },
    applyIntegerEditor() {
      if (this.isScheduleRunning) return;
      if (!this.currentCellKey) return;
      const v = Math.max(parseInt(this.editorIntegerValue, 10) || 0, 0);
      this.$set(this.cellValues, this.currentCellKey, String(v));
      this.sendTableData(false);
    },
    applyTargetEditor() {
      if (this.isScheduleRunning) return;
      if (!this.currentCellKey) return;
      this.$set(this.cellValues, this.currentCellKey, this.editorTargetName || '');
      this.sendTableData(false);
      this.addLog(this.$t('Target updated') + `: ${this.editorTargetName}`);
    },
    applyGenericEditor() {
      if (this.isScheduleRunning) return;
      if (!this.currentCellKey) return;
      this.$set(this.cellValues, this.currentCellKey, this.genericEditorValue || '');
      this.sendTableData(false);
    },

    // ---------- Target 辅助 ----------
    cycleTargetPrefix() {
      let name = this.editorTargetName || '';
      const trimmed = name.trim();
      let number = '';
      const matchNumber = trimmed.match(/(\d+.*)$/);
      if (matchNumber) {
        number = ' ' + matchNumber[1];
      }

      if (/^\s*M/i.test(trimmed)) {
        this.editorTargetName = 'IC' + number;
      } else if (/^\s*IC/i.test(trimmed)) {
        this.editorTargetName = 'NGC' + number;
      } else if (/^\s*NGC/i.test(trimmed)) {
        this.editorTargetName = 'M' + number;
      } else {
        this.editorTargetName = 'M' + (number || ' ');
      }

      this.applyTargetEditor();
    },
    stepClockHour(delta) {
      if (this.editorClockIsNow) return;
      let h = (parseInt(this.editorClockHour, 10) || 0) + delta;
      if (h < 0) h = 23;
      if (h > 23) h = 0;
      this.editorClockHour = h;
      this.applyClockEditor();
    },
    stepClockMinute(delta) {
      if (this.editorClockIsNow) return;
      let m = (parseInt(this.editorClockMinute, 10) || 0) + delta;
      if (m < 0) m = 59;
      if (m > 59) m = 0;
      this.editorClockMinute = m;
      this.applyClockEditor();
    },
    onExposurePresetChange() {
      if (this.isScheduleRunning) return;
      if (this.editorExposurePreset === 'Custom') {
        this.isExposureCustom = true;
        this.keypadMode = 'exposureCustom';
        this.$nextTick(() => {
          if (this.$refs.sidePanel) {
            this.$refs.sidePanel.scrollTop = this.$refs.sidePanel.scrollHeight;
          }
        });
        return;
      }
      this.isExposureCustom = false;
      if (this.keypadMode === 'exposureCustom') {
        this.keypadMode = null;
      }
      const match = this.editorExposurePreset.match(/^(\d+(?:\.\d+)?)\s*(ms|s)$/);
      if (match) {
        this.editorExposureValue = Number(match[1]);
        this.editorExposureUnit = match[2];
        this.applyExposureEditor();
      }
    },
    onKeypadPress(mode, key) {
      if (this.isScheduleRunning) return;
      const isDel = key === 'Del';

      if (mode === 'timeSeconds') {
        let s = String(this.editorTimeSeconds || '');
        if (isDel) {
          s = s.slice(0, -1);
        } else {
          s += key;
        }
        const n = s === '' ? 0 : parseInt(s, 10);
        this.editorTimeSeconds = isNaN(n) ? 0 : n;
        this.applyTimeEditor();
      } else if (mode === 'integer') {
        let s = String(this.editorIntegerValue || '');
        // 第一次编辑时从空串开始，避免默认值 1 被当成首位导致只能输入两位数
        if (!this.integerEditingStarted) {
          s = '';
          this.integerEditingStarted = true;
        }
        if (isDel) {
          s = s.slice(0, -1);
        } else {
          s += key;
        }
        const n = s === '' ? 0 : parseInt(s, 10);
        // 重复张数最小为 0；当为 1 时再点删除应变为 0，而不是保持为 1
        this.editorIntegerValue = isNaN(n) ? 0 : Math.max(n, 0);
        this.applyIntegerEditor();
      } else if (mode === 'exposureCustom') {
        let s = String(this.editorExposureValue || '');
        if (isDel) {
          s = s.slice(0, -1);
        } else {
          s += key;
        }
        const n = s === '' ? 0 : parseInt(s, 10);
        this.editorExposureValue = isNaN(n) ? 0 : n;
        this.applyExposureEditor();
      } else if (mode === 'target') {
        let t = this.editorTargetName || '';
        if (isDel) {
          // 删除最后一位数字
          t = t.replace(/(\d+)\D*$/, (match) => match.slice(0, -1));
        } else {
          t += key;
        }
        this.editorTargetName = t;
        this.applyTargetEditor();
      } else if (mode === 'clockHour' || mode === 'clockMinute') {
        let raw = mode === 'clockHour' ? this.editorClockHour : this.editorClockMinute;
        let s = String(raw || '');
        if (isDel) {
          s = s.slice(0, -1);
        } else {
          s += key;
        }
        let n = s === '' ? 0 : parseInt(s, 10);
        if (isNaN(n)) {
          n = 0;
        }
        if (mode === 'clockHour') {
          n = Math.min(Math.max(n, 0), 23);
          this.editorClockHour = n;
        } else {
          n = Math.min(Math.max(n, 0), 59);
          this.editorClockMinute = n;
        }
        this.editorClockIsNow = false;
        this.applyClockEditor();
      }
    },
    toggleExposureUnit() {
      if (this.isScheduleRunning) return;
      this.editorExposureUnit = this.editorExposureUnit === 's' ? 'ms' : 's';
      this.applyExposureEditor();
    },
    activateClockKeypad(part) {
      if (this.isScheduleRunning) return;
      if (this.editorClockIsNow) {
        this.editorClockIsNow = false;
      }
      if (part === 'hour') {
        this.keypadMode = 'clockHour';
      } else if (part === 'minute') {
        this.keypadMode = 'clockMinute';
      }
      this.$nextTick(() => {
        if (this.$refs.sidePanel) {
          this.$refs.sidePanel.scrollTop = this.$refs.sidePanel.scrollHeight;
        }
      });
    },
    searchTargetInSky() {
      const name = this.editorTargetName || this.currentCellValue || '';
      if (!name.trim()) return;
      // 复用原有 SearchName 事件，让 skysource-search / 其他组件处理
      this.$bus.$emit('SearchName', name);
      this.addLog(this.$t('Search target') + `: ${name}`);
    },
    useCurrentSkySelection() {
      // 使用当前天空中选中的目标来填充本行 Target 和 Ra/Dec。
      // 1. 必须先选中一行（我们默认使用第 1 列 Target 作为目标名称列）。
      if (!this.selectedRow) {
        this.addLog(this.$t('Please select a row first'));
        return;
      }

      // 确保当前编辑列指向 Target 列，方便后续名称 / 坐标写入
      if (!this.selectedColumn || this.selectedColumn !== 1) {
        this.selectedColumn = 1;
        const targetField = this.fieldDefinitions[0];
        this.initEditorFromCell(targetField);
      }

      // 标记等待来自星图的 TargetRaDec 事件
      this.isWaitingSkySelection = true;

      // 通过事件总线让上层 gui 切换到星图并隐藏其他 UI / 任务表
      this.$bus.$emit('ScheduleTargetPickStart');

      this.addLog(this.$t('Use Selected Object') + ': ' + this.$t('Switch to sky map to pick target'));
    },
    insertObjName(name) {
      // 只有在通过“Use Selected Object”进入选星模式时，才接收星图回传的目标名称
      if (!this.isWaitingSkySelection) return;
      if (!this.selectedRow) return;
      const key = `${this.selectedRow}-1`;
      const value = ' ' + name;
      this.$set(this.cellValues, key, value);

      // 若当前正在编辑 Target 列，同步更新右侧编辑器中的文案
      if (this.selectedColumn === 1) {
        this.editorTargetName = value.trimStart();
      }

      this.sendTableData(false);
      this.addLog(this.$t('Target updated') + `: ${name}`);
    },
    insertObjRaDec(raDec) {
      // 只有在通过“Use Selected Object”进入选星模式时，才接收星图回传的坐标
      if (!this.isWaitingSkySelection) return;
      if (!this.selectedRow) return;
      const key = `${this.selectedRow}-2`;
      this.$set(this.cellValues, key, ' ' + raDec);
      this.sendTableData(false);
      this.addLog(this.$t('Updated Ra/Dec') + `: ${raDec}`);
      // 如果是通过“Use Selected Object”进入的选星模式，在第一次拿到坐标后结束该模式，
      // 并让上层 gui 恢复原始画布与任务计划表。
      if (this.isWaitingSkySelection) {
        this.isWaitingSkySelection = false;
        this.$bus.$emit('ScheduleTargetPickFinished');
      }
    },

    // ---------- TianWen 插入行 ----------
    addTianWenRow(notice_type, ra, dec) {
      this.numberOfRows += 1;
      const rowIndex = this.numberOfRows;
      const newValues = {
        1: notice_type,
        2: 'ra:' + ra + ',dec:' + dec,
        3: 'Now',
        4: '1 s',
        5: 'L',
        6: '1',
        7: 'Light',
        8: 'OFF',
        9: '0 s'
      };
      for (let column = 1; column <= this.numberOfColumns; column++) {
        const key = `${rowIndex}-${column}`;
        this.$set(this.cellValues, key, newValues[column] || '');
      }
      this.sendTableData(false);
      this.addLog(this.$t('Added TianWen row'));
    },

    // 预留接口：由后端调用以更新真实步骤状态
    // row0: Qt 侧当前计划索引（从 0 开始），这里统一转换为从 1 开始的行号
    // payload: { currentStep, loopDone, loopTotal, stepProgress }
    onScheduleStepState(row0, payload) {
      const rowIndex = parseInt(row0, 10) + 1;
      if (!payload || Number.isNaN(rowIndex) || rowIndex < 1) return;
      const prev = this.stepState[rowIndex] || {};
      this.$set(this.stepState, rowIndex, {
        currentStep: payload.currentStep || prev.currentStep || 'mount',
        // 循环次数改由专用信号 ScheduleLoopState 维护，这里不再修改，避免被其它步骤覆盖
        loopDone: typeof prev.loopDone === 'number' ? prev.loopDone : 0,
        loopTotal: typeof prev.loopTotal === 'number' ? prev.loopTotal : 0,
        stepProgress: typeof payload.stepProgress === 'number'
          ? payload.stepProgress
          : (typeof prev.stepProgress === 'number' ? prev.stepProgress : 0)
      });
    },

    // 专用循环状态：由 ScheduleLoopState 更新，避免与其它步骤状态混用
    // row0: Qt 侧当前计划索引（从 0 开始）
    // payload: { loopDone, loopTotal, progress }
    onScheduleLoopState(row0, payload) {
      const rowIndex = parseInt(row0, 10) + 1;
      if (!payload || Number.isNaN(rowIndex) || rowIndex < 1) return;
      const prev = this.stepState[rowIndex] || {};
      const loopTotal = typeof payload.loopTotal === 'number' ? payload.loopTotal : prev.loopTotal || 0;
      const loopDone = typeof payload.loopDone === 'number' ? payload.loopDone : prev.loopDone || 0;
      this.$set(this.stepState, rowIndex, {
        currentStep: prev.currentStep || 'mount',
        loopDone,
        loopTotal,
        stepProgress: typeof prev.stepProgress === 'number' ? prev.stepProgress : 0
      });
    },

    addLog(message) {
      if (!message) return;
      const now = new Date();
      const time =
        now.getHours().toString().padStart(2, '0') +
        ':' +
        now.getMinutes().toString().padStart(2, '0') +
        ':' +
        now.getSeconds().toString().padStart(2, '0');
      this.logs.unshift(`[${time}] ${message}`);
      if (this.logs.length > 100) {
        this.logs.pop();
      }
    },

    setSelectValue(value) {
      this.editorSelectValue = value;
      this.applySelectEditor();
    }
  }
};
</script>

<style scoped>
.schedule-panel {
  position: absolute;
  background-color: rgba(15, 15, 20, 0.9);
  backdrop-filter: blur(10px);
  border-radius: 8px;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.6);
  padding: 8px 10px;
  display: flex;
  flex-direction: column;
  box-sizing: border-box;
  border: 1px solid rgba(255, 255, 255, 0.06);
}

.schedule-main {
  display: flex;
  height: 100%;
}

.schedule-title {
  font-size: 14px;
  font-weight: 600;
  color: #ffffff;
}

.schedule-subtitle {
  font-size: 11px;
  color: rgba(255, 255, 255, 0.65);
  margin-top: 2px;
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
}

.field-pill {
  padding: 1px 6px;
  border-radius: 999px;
  background-color: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  white-space: nowrap;
}

.schedule-header-right {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 8px;
  padding-bottom: 4px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
}

.btn {
  border: none;
  outline: none;
  cursor: pointer;
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 11px;
  color: #f0f0f0;
  background-color: rgba(255, 255, 255, 0.06);
  display: inline-flex;
  align-items: center;
  gap: 4px;
  transition: background-color 0.15s ease, transform 0.05s ease;
  user-select: none;
}

.btn.primary {
  background-color: rgba(80, 160, 255, 0.9);
}

.btn.small {
  padding: 3px 6px;
  font-size: 10px;
}

.btn.large {
  padding: 6px 12px;
  font-size: 12px;
  min-height: 36px;
}

.btn.icon-only {
  padding: 4px;
  min-width: 28px;
  height: 28px;
  justify-content: center;
}

.btn:disabled {
  opacity: 0.4;
  cursor: default;
}

.btn:not(:disabled):active {
  transform: scale(0.97);
  background-color: rgba(255, 255, 255, 0.16);
}

.btn.primary:not(:disabled):active {
  background-color: rgba(80, 160, 255, 0.7);
}

.btn-text {
  white-space: nowrap;
}

.left-toolbar {
  width: 90px;
  display: flex;
  flex-direction: column;
  padding: 8px 8px 8px 0;
  border-right: 1px solid rgba(255, 255, 255, 0.08);
  /* 占满竖直方向，按钮在整列内均匀分布，利用所有高度 */
  justify-content: flex-start;
  box-sizing: border-box;
  position: relative;
  transition: width 0.18s ease;
}

.left-toolbar .close-btn {
  /* 始终靠底部居中，折叠/展开时位置不变，只改变大小 */
  align-self: center;
  margin-top: auto;
}

.left-toolbar .collapse-btn {
  position: absolute;
  top: 60%;
  transform: translateY(-50%);
  z-index: 3;
}

.left-toolbar.collapsed .collapse-btn {
  /* 折叠时：靠近窄栏中间，贴内容一侧 */
  right: 4px;
}

.left-toolbar:not(.collapsed) .collapse-btn {
  /* 展开时：靠近表格一侧，看起来在两栏交界处 */
  right: 4px;
}

.left-toolbar-buttons {
  display: flex;
  flex-direction: column;
  gap: 6px;
  position: relative;
  z-index: 1;
}

.left-toolbar.collapsed {
  width: 32px;
  padding-right: 4px;
}

.content-area {
  flex: 1;
  display: flex;
  flex-direction: column;
  padding-left: 8px;
}

.schedule-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.schedule-body {
  display: flex;
  flex: 1;
  min-height: 0;
  gap: 10px;
}

.table-wrapper {
  flex: 3;
  min-width: 0;
}

.table-scroll {
  height: 100%;
  overflow-y: auto;
  overflow-x: hidden;
  scrollbar-width: thin;
  scrollbar-color: rgba(255, 255, 255, 0.15) transparent;
}

.table-scroll::-webkit-scrollbar {
  width: 4px;
}

.table-scroll::-webkit-scrollbar-thumb {
  background-color: rgba(255, 255, 255, 0.15);
  border-radius: 999px;
}

.schedule-table {
  width: 100%;
  border-collapse: collapse;
  table-layout: fixed;
  font-size: 11px;
  color: #f5f5f5;
}

.schedule-table thead {
  position: sticky;
  top: 0;
  z-index: 1;
}

.schedule-table th {
  border-bottom: 1px solid rgba(255, 255, 255, 0.18);
  text-align: center;
  height: 30px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  background-color: rgba(0, 0, 0, 0.6);
  padding: 0 4px;
}

.schedule-table td {
  border-bottom: 1px solid rgba(255, 255, 255, 0.04);
  text-align: center;
  height: 34px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  padding: 0 4px;
}

.schedule-table td:not(.status-col) {
  cursor: pointer;
}

.row-selected {
  background-color: rgba(75, 155, 250, 0.35);
}

.cell-selected {
  background-color: rgba(51, 218, 121, 0.7);
}

.status-col {
  width: 120px;
}

.status-cell {
  display: flex;
  flex-direction: column;
  align-items: stretch;
  gap: 2px;
}

.status-label {
  font-size: 10px;
  text-align: left;
}

.status-bar {
  position: relative;
  height: 6px;
  background-color: rgba(255, 255, 255, 0.08);
  border-radius: 999px;
  overflow: hidden;
}

.status-bar-inner {
  position: absolute;
  top: 0;
  left: 0;
  bottom: 0;
  background: linear-gradient(90deg, #52ffb8, #50a0ff);
  border-radius: 999px;
}

/* 右侧：日志 + 编辑器 */
.side-panel {
  flex: 1.1;
  min-width: 200px;
  display: flex;
  flex-direction: column;
  gap: 8px;
  overflow-y: auto;
  scroll-behavior: smooth;
  position: relative;
  transition: flex 0.18s ease, min-width 0.18s ease, max-width 0.18s ease;
}

.side-toggle {
  position: absolute;
  left: -10px;
  top: 60%;
  transform: translateY(-50%);
  z-index: 2;
}

.side-collapse-btn {
  padding: 2px;
  min-width: 22px;
  height: 22px;
}

.editor-row.target-actions {
  justify-content: center;
}

.side-panel.collapsed {
  flex: 0 0 32px;
  min-width: 32px;
  max-width: 32px;
}

.log-panel {
  flex: none;
  min-height: 0;
  background-color: rgba(0, 0, 0, 0.45);
  border-radius: 6px;
  padding: 6px 8px;
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
}

.log-header {
  font-size: 11px;
  font-weight: 600;
  margin-bottom: 4px;
}

.log-list {
  max-height: none;
  overflow-y: visible;
  font-size: 10px;
  line-height: 1.3;
  scrollbar-width: none;
}

.log-line {
  white-space: nowrap;
  text-overflow: ellipsis;
  overflow: hidden;
}

/* 保留，避免某些浏览器出现多余滚动条 */
.log-list::-webkit-scrollbar {
  width: 0;
  height: 0;
}

.status-line {
  font-size: 9px;
  opacity: 0.85;
}

.status-card {
  padding: 6px 8px;
  border-radius: 6px;
  background-color: rgba(0, 0, 0, 0.5);
  box-shadow: 0 0 0 1px rgba(255, 255, 255, 0.08);
}

.status-card-header {
  display: flex;
  justify-content: space-between;
  margin-bottom: 4px;
}

.status-title {
  font-size: 11px;
  font-weight: 600;
}

.status-summary {
  font-size: 10px;
  opacity: 0.85;
}

.status-progress-bar {
  position: relative;
  height: 6px;
  border-radius: 999px;
  background-color: rgba(255, 255, 255, 0.1);
  overflow: hidden;
  margin-bottom: 6px;
}

.status-progress-inner {
  position: absolute;
  left: 0;
  top: 0;
  bottom: 0;
  border-radius: 999px;
  background: linear-gradient(90deg, #52ffb8, #50a0ff);
}

.status-steps {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.status-steps-row {
  display: flex;
  justify-content: space-between;
  gap: 4px;
  padding: 2px 4px;
  border-radius: 4px;
  background-color: rgba(255, 255, 255, 0.04);
  margin-bottom: 2px;
}

.status-steps-row.reverse {
  flex-direction: row-reverse;
  background-color: rgba(255, 255, 255, 0.02);
}

.status-step {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
}

.status-time {
  font-size: 9px;
  margin-top: 2px;
  opacity: 0.8;
}

.status-step-indeterminate {
  position: relative;
  width: 100%;
  height: 4px;
  margin-top: 2px;
  border-radius: 999px;
  background-color: rgba(255, 255, 255, 0.12);
  overflow: hidden;
}

.status-step-indeterminate-inner {
  position: absolute;
  left: -40%;
  top: 0;
  bottom: 0;
  width: 40%;
  background: linear-gradient(90deg, rgba(80, 160, 255, 0.1), rgba(80, 160, 255, 0.9));
  animation: status-indeterminate 1s linear infinite;
}

@keyframes status-indeterminate {
  0% {
    left: -40%;
  }
  100% {
    left: 100%;
  }
}

.mindmap-horizontal {
  display: flex;
  flex-wrap: wrap;
  align-items: flex-start;
  gap: 6px;
  margin-top: 4px;
}

.mind-node {
  display: flex;
  align-items: flex-start;
  max-width: 160px;
  position: relative;
}

.mind-node-circle {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  margin-top: 4px;
  background-color: rgba(255, 255, 255, 0.5);
}

.mind-node.done .mind-node-circle {
  background-color: #52ffb8;
}

.mind-node.active .mind-node-circle {
  background-color: #50a0ff;
}

.mind-node-content {
  margin-left: 4px;
  padding: 4px 6px;
  border-radius: 4px;
  background-color: rgba(0, 0, 0, 0.65);
  box-shadow: 0 0 0 1px rgba(255, 255, 255, 0.06);
}

.mind-node-label {
  font-size: 9px;
  opacity: 0.8;
}

.mind-node-value {
  font-size: 10px;
}

.status-step-label.active {
  color: #50a0ff;
  font-weight: 600;
}

.status-step-label.done {
  color: #52ffb8;
}

.mind-connector {
  width: 22px;
  height: 1px;
  background: linear-gradient(90deg, rgba(255, 255, 255, 0.4), transparent);
  margin: 9px 2px 0 2px;
}

.editor-wrapper {
  flex: 1.3;
  min-height: 0;
  min-width: 0;
  display: flex;
  flex-direction: column;
  background-color: rgba(0, 0, 0, 0.4);
  border-radius: 6px;
  padding: 8px;
  box-sizing: border-box;
  position: relative;
}

.editor-header {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  margin-bottom: 6px;
}

.editor-title {
  font-size: 12px;
  font-weight: 600;
  color: #ffffff;
}

.editor-type {
  font-size: 10px;
  color: rgba(255, 255, 255, 0.7);
}

.editor-body {
  font-size: 11px;
  color: #f0f0f0;
  display: flex;
  flex-direction: column;
  gap: 4px;
  flex: 1;
}

.editor-main {
  flex: 1;
  overflow-y: auto;
  padding-bottom: 4px;
  display: flex;
  flex-direction: column;
  align-items: center;
}

.editor-section {
  display: flex;
  flex-direction: column;
  gap: 4px;
  align-items: center;
  width: 100%;
}

.editor-label {
  font-size: 11px;
  color: rgba(255, 255, 255, 0.8);
}

.editor-row {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-wrap: wrap;
  justify-content: center;
}

.editor-row.readonly {
  padding: 4px 6px;
  background-color: rgba(255, 255, 255, 0.06);
  border-radius: 4px;
}

.editor-inline {
  display: flex;
  align-items: center;
  gap: 4px;
}

.editor-row input[type="number"],
.editor-row input[type="text"],
.editor-row select {
  background-color: rgba(0, 0, 0, 0.4);
  border: 1px solid rgba(255, 255, 255, 0.18);
  border-radius: 4px;
  padding: 3px 5px;
  color: #ffffff;
  font-size: 11px;
  outline: none;
  min-width: 0;
}

.editor-row input[type="number"]:disabled,
.editor-row input[type="text"]:disabled {
  opacity: 0.5;
}

.unit {
  font-size: 10px;
  color: rgba(255, 255, 255, 0.7);
}

.checkbox-label {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 11px;
}

.editor-row.disabled {
  opacity: 0.5;
}

.editor-help {
  font-size: 10px;
  color: rgba(255, 255, 255, 0.6);
}

/* 时间拨轮 */
.time-wheel {
  display: flex;
  align-items: center;
  gap: 6px;
}

.time-unit {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
}

.time-value {
  min-width: 40px;
  text-align: center;
  padding: 2px 4px;
  border-radius: 4px;
  background-color: rgba(0, 0, 0, 0.6);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 2px;
}

.time-value input {
  width: 28px;
  border: none;
  outline: none;
  background: transparent;
  color: #ffffff;
  font-size: 11px;
  text-align: center;
  appearance: textfield;
  -moz-appearance: textfield;
}

.time-unit-label {
  font-size: 9px;
  opacity: 0.8;
}

.time-value input::-webkit-outer-spin-button,
.time-value input::-webkit-inner-spin-button {
  -webkit-appearance: none;
  margin: 0;
}

.time-separator {
  font-size: 14px;
  font-weight: 600;
}

.wheel-btn {
  border: none;
  background: rgba(255, 255, 255, 0.08);
  color: #ffffff;
  font-size: 10px;
  padding: 2px 4px;
  border-radius: 4px;
  cursor: pointer;
}

.wheel-btn:disabled {
  opacity: 0.4;
  cursor: default;
}

/* 小键盘 */
.keypad-row {
  justify-content: flex-start;
}

.keypad-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  grid-auto-rows: 40px;
  gap: 4px;
}

.keypad-key {
  border: none;
  border-radius: 4px;
  background-color: rgba(255, 255, 255, 0.08);
  color: #ffffff;
  font-size: 11px;
  cursor: pointer;
  touch-action: manipulation;
}

.keypad-key:active {
  background-color: rgba(255, 255, 255, 0.18);
}

/* 选项 pill 展示 */
.editor-options {
  flex-wrap: wrap;
}

.editor-keypad {
  padding-top: 4px;
  margin-top: 4px;
  border-top: 1px solid rgba(255, 255, 255, 0.12);
}

.editor-keypad-label {
  font-size: 10px;
  margin-bottom: 2px;
  opacity: 0.85;
}

@media (max-width: 900px) {
  .side-panel {
    max-height: 100%;
  }

  .editor-wrapper {
    padding: 6px;
    flex: none;          /* 让高度由内容决定，避免只框住初始区域 */
    min-height: auto;
  }

  .keypad-grid {
    grid-auto-rows: 44px;
  }

  /* 移动端：压缩小按钮文本，避免竖向占用过高 */
  .btn.small .btn-text {
    display: none;
  }
}

.option-pill {
  font-size: 10px;
  padding: 2px 6px;
  border-radius: 999px;
  background-color: rgba(255, 255, 255, 0.08);
  margin-right: 4px;
}

.option-pill.active {
  background-color: rgba(80, 160, 255, 0.9);
}

/* 任务计划表预设对话框 */
.schedule-preset-dialog {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.4);
  z-index: 300;
}

.schedule-preset-card {
  width: 260px;
  max-width: 90%;
  background: rgba(15, 15, 20, 0.95);
  border-radius: 8px;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.7);
  padding: 8px;
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.schedule-preset-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 12px;
  font-weight: 600;
}

.schedule-preset-body {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.preset-list {
  max-height: 140px;
  overflow-y: auto;
  border-radius: 4px;
  border: 1px solid rgba(255, 255, 255, 0.12);
}

.preset-item {
  padding: 4px 6px;
  font-size: 11px;
  cursor: pointer;
}

.preset-item.active {
  background-color: rgba(80, 160, 255, 0.5);
}

.preset-empty {
  padding: 4px 6px;
  font-size: 11px;
  opacity: 0.7;
}

.preset-input input {
  width: 100%;
  background-color: rgba(0, 0, 0, 0.4);
  border: 1px solid rgba(255, 255, 255, 0.18);
  border-radius: 4px;
  padding: 3px 5px;
  color: #ffffff;
  font-size: 11px;
  outline: none;
  box-sizing: border-box;
}

.schedule-preset-footer {
  display: flex;
  justify-content: flex-end;
}
</style>
