<template>
    <div class="location-inputs">
        <!-- 小尺寸显示 -->
        <div v-if="!isExpanded" class="compact-view" @click="expandInputs">
            <div class="compact-info">
                <span>{{ $t('longitude') }}: {{ longitude || '--' }}°</span>
                <span>{{ $t('latitude') }}: {{ latitude || '--' }}°</span>
                <span>{{ $t('focalLength') }}: {{ focalLength || '--' }}mm</span>
            </div>
        </div>

        <!-- 展开后的输入框 -->
        <div v-if="isExpanded" class="expanded-view">
            <div class="input-container">
                <v-text-field 
                    :value="isMobile && currentKeyboardItem === 'longitude' ? keyboardInputValue : longitude"
                    :label="$t('longitude')" 
                    outlined dense hide-details
                    class="custom-input" 
                    :type="isDesktop ? 'number' : 'text'"
                    :inputmode="isMobile ? 'none' : ''"
                    :readonly="isMobile"
                    suffix="°" 
                    @input="!isMobile ? (longitude = $event) : null"
                    @focus="isMobile ? openNumberKeyboard('longitude', $event) : null"
                    @click="isMobile ? openNumberKeyboard('longitude', $event) : null"
                    @blur="isMobile ? handleNumberBlur('longitude') : handleInput()"
                    @touchstart.stop @touchmove.stop
                    @touchend.stop></v-text-field>
                <v-text-field 
                    :value="isMobile && currentKeyboardItem === 'latitude' ? keyboardInputValue : latitude"
                    :label="$t('latitude')" 
                    outlined dense hide-details
                    class="custom-input" 
                    :type="isDesktop ? 'number' : 'text'"
                    :inputmode="isMobile ? 'none' : ''"
                    :readonly="isMobile"
                    suffix="°" 
                    @input="!isMobile ? (latitude = $event) : null"
                    @focus="isMobile ? openNumberKeyboard('latitude', $event) : null"
                    @click="isMobile ? openNumberKeyboard('latitude', $event) : null"
                    @blur="isMobile ? handleNumberBlur('latitude') : handleInput()"
                    @touchstart.stop @touchmove.stop
                    @touchend.stop></v-text-field>
                <v-text-field 
                    :value="isMobile && currentKeyboardItem === 'focalLength' ? keyboardInputValue : focalLength"
                    :label="$t('focalLength')" 
                    outlined dense hide-details
                    class="custom-input" 
                    :type="isDesktop ? 'number' : 'text'"
                    :inputmode="isMobile ? 'none' : ''"
                    :readonly="isMobile"
                    suffix="mm" 
                    @input="!isMobile ? (focalLength = $event) : null"
                    @focus="isMobile ? openNumberKeyboard('focalLength', $event) : null"
                    @click="isMobile ? openNumberKeyboard('focalLength', $event) : null"
                    @blur="isMobile ? handleNumberBlur('focalLength') : handleInput()"
                    @touchstart.stop @touchmove.stop
                    @touchend.stop></v-text-field>
                <v-btn class="close-btn" icon @click="collapseInputs">
                    <v-icon>mdi-close</v-icon>
                </v-btn>
            </div>
        </div>
        
        <!-- 数字键盘组件 -->
        <NumberKeyboard
            :visible="showNumberKeyboard"
            :allow-decimal="true"
            :allow-negative="currentKeyboardItem === 'longitude' || currentKeyboardItem === 'latitude'"
            :title="getKeyboardTitle()"
            :current-value="keyboardInputValue"
            @input="handleKeyboardInput"
            @backspace="handleKeyboardBackspace"
            @confirm="handleKeyboardConfirm"
            @close="closeNumberKeyboard"
        />
    </div>
</template>

<script>
import NumberKeyboard from '@/components/NumberKeyboard.vue';

export default {
    name: 'LocationFocalInputs',
    components: {
        NumberKeyboard
    },
    data() {
        return {
            longitude: '0',
            latitude: '0',
            focalLength: '0',
            isExpanded: false,
            // 数字键盘相关
            showNumberKeyboard: false,
            currentKeyboardItem: null,
            keyboardInputValue: ''
        }
    },
    computed: {
        isMobile() {
            var ua = navigator.userAgent || '';
            var touch = ('ontouchstart' in window) || (navigator.maxTouchPoints > 0);
            var uaDataMobile = null;
            if (navigator.userAgentData && typeof navigator.userAgentData.mobile !== 'undefined') {
                uaDataMobile = navigator.userAgentData.mobile;
            }
            var mobileLike = /Android|iPhone|iPad|iPod|Mobile|Tablet/i.test(ua);
            return (uaDataMobile !== null ? uaDataMobile : mobileLike) && !!touch;
        },
        isDesktop() {
            return !this.isMobile;
        }
    },
    created() {
        // 监听经纬度更新信号
        this.$bus.$on('update-location', this.handleLocationUpdate);
        // 监听焦距更新信号
        this.$bus.$on('update-focal-length', this.handleFocalLengthUpdate);
    },
    beforeDestroy() {
        // 组件销毁前移除事件监听
        this.$bus.$off('update-location', this.handleLocationUpdate);
        this.$bus.$off('update-focal-length', this.handleFocalLengthUpdate);
    },
    methods: {
        expandInputs() {
            this.isExpanded = true;
        },
        collapseInputs() {
            this.isExpanded = false;
        },
        handleInput() {
            // 确保值是数字
            const longitude = parseFloat(this.longitude) || 0;
            const latitude = parseFloat(this.latitude) || 0;
            const focalLength = parseFloat(this.focalLength) || 0;

            // 验证范围
            if (longitude < -180 || longitude > 180) {
                this.longitude = '';
                return;
            }
            if (latitude < -90 || latitude > 90) {
                this.latitude = '';
                return;
            }
            if (focalLength < 0) {
                this.focalLength = '';
                return;
            }

            // 发送更新事件
            this.$emit('location-update', {
                longitude,
                latitude,
                focalLength
            });
        },
        // 处理经纬度更新
        handleLocationUpdate(longitude, latitude) {
            if (longitude !== undefined) {
                this.longitude = longitude.toString();
            }
            if (latitude !== undefined) {
                this.latitude = latitude.toString();
            }
            // 触发输入处理
            this.handleInput();
        },
        // 处理焦距更新
        handleFocalLengthUpdate(focalLength) {
            if (focalLength !== undefined) {
                this.focalLength = focalLength.toString();
                // 触发输入处理
                this.handleInput();
            }
        },
        // 数字键盘相关方法
        getKeyboardTitle() {
            if (this.currentKeyboardItem === 'longitude') {
                return this.$t('longitude');
            } else if (this.currentKeyboardItem === 'latitude') {
                return this.$t('latitude');
            } else if (this.currentKeyboardItem === 'focalLength') {
                return this.$t('focalLength');
            }
            return '';
        },
        openNumberKeyboard(item, event) {
            if (event) {
                event.preventDefault();
                event.stopPropagation();
            }
            
            // 如果点击的是同一个输入框，且键盘已打开，不处理
            if (this.currentKeyboardItem === item && this.showNumberKeyboard) {
                return;
            }
            
            // 如果点击的是不同的输入框，直接切换
            if (this.currentKeyboardItem !== item && this.showNumberKeyboard) {
                this.closeNumberKeyboard();
                this.$nextTick(() => {
                    this.currentKeyboardItem = item;
                    this.keyboardInputValue = String(this[item] || '');
                    this.showNumberKeyboard = true;
                });
                return;
            }
            
            if (event && event.target) {
                event.target.blur();
                setTimeout(() => {
                    this.currentKeyboardItem = item;
                    this.keyboardInputValue = String(this[item] || '');
                    this.showNumberKeyboard = true;
                }, 30);
            } else {
                this.currentKeyboardItem = item;
                this.keyboardInputValue = String(this[item] || '');
                this.showNumberKeyboard = true;
            }
        },
        closeNumberKeyboard() {
            if (this.currentKeyboardItem) {
                const item = this.currentKeyboardItem;
                if (this.keyboardInputValue !== String(this[item] || '')) {
                    const value = parseFloat(this.keyboardInputValue);
                    if (!isNaN(value)) {
                        this[item] = value;
                        this.handleInput();
                    }
                }
            }
            this.showNumberKeyboard = false;
            setTimeout(() => {
                this.currentKeyboardItem = null;
                this.keyboardInputValue = '';
            }, 150);
        },
        handleKeyboardInput(key) {
            if (!this.currentKeyboardItem) return;
            let current = this.keyboardInputValue || '';
            
            if (key === '-') {
                if (current.startsWith('-')) {
                    current = current.substring(1);
                } else {
                    current = '-' + current;
                }
                this.keyboardInputValue = current;
                return;
            }
            
            if (key === '.') {
                if (current.includes('.')) return;
                if (current === '' || current === '-') {
                    current = current + '0.';
                } else {
                    current = current + '.';
                }
                this.keyboardInputValue = current;
                return;
            }
            
            if (/[0-9]/.test(key)) {
                if (current === '0') {
                    current = key;
                } else {
                    current = current + key;
                }
                this.keyboardInputValue = current;
            }
        },
        handleKeyboardBackspace() {
            if (!this.currentKeyboardItem) return;
            let current = this.keyboardInputValue || '';
            if (current.length > 0) {
                this.keyboardInputValue = current.substring(0, current.length - 1);
            }
        },
        handleKeyboardConfirm() {
            if (!this.currentKeyboardItem) return;
            const item = this.currentKeyboardItem;
            let value = this.keyboardInputValue;
            
            if (value === '' || value === '-') {
                value = this[item] || 0;
            } else {
                value = parseFloat(value);
                if (isNaN(value)) {
                    value = this[item] || 0;
                }
            }
            
            this[item] = value;
            this.handleInput();
            this.closeNumberKeyboard();
        },
        handleNumberBlur(item) {
            setTimeout(() => {
                if (this.currentKeyboardItem === item && !this.showNumberKeyboard) {
                    this.handleInput();
                }
            }, 200);
        }
    }
}
</script>


<style scoped>
.location-inputs {
    pointer-events: auto;
    z-index: 300;
    max-width: 100px;
}

/* 紧凑视图样式 */
.compact-view {
    position: relative;
    background-color: rgba(0, 0, 0, 0.1);
    padding: 8px 12px;
    border-radius: 6px;
    cursor: pointer;
    transition: all 0.3s ease;
    pointer-events: auto !important;
    min-width: 20px;
    max-width: 100%;
}

.compact-view:hover {
    background-color: rgba(0, 0, 0, 0.5);
}

.compact-info {
    display: flex;
    flex-direction: column;
    gap: 2px;
    font-size: 12px;
    color: rgba(255, 255, 255, 0.8);
    text-shadow: 0 0 2px rgba(0, 0, 0, 0.5);
}

/* 展开视图样式 */
.expanded-view {
    position: fixed;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    z-index: 1500;
    background-color: rgba(0, 0, 0, 0.8);
    padding: 25px;
    border-radius: 12px;
    box-shadow: 0 0 20px rgba(0, 0, 0, 0.5);
    pointer-events: auto !important;
    max-width: 90vw;
    max-height: 90vh;
    overflow-y: auto;
}

.input-container {
    display: flex;
    flex-direction: column;
    gap: 15px;
    position: relative;
    pointer-events: auto !important;
    background-color: rgba(0, 0, 0, 0.8);
    max-width: 100%;
}

.custom-input {
    width: 100%;
    max-width: 400px;
}

.close-btn {
    position: absolute;
    top: -10px;
    right: -10px;
    background-color: rgba(255, 255, 255, 0.1) !important;
}

:deep(.v-text-field) {
    background-color: rgba(255, 255, 255, 0.1);
}

:deep(.v-text-field .v-input__control) {
    color: white;
}

:deep(.v-text-field .v-label) {
    color: rgba(255, 255, 255, 0.7);
}

:deep(.v-text-field .v-input__slot) {
    border: 1px solid rgba(255, 255, 255, 0.3);
}

:deep(.v-text-field input) {
    color: white;
    -webkit-tap-highlight-color: transparent;
}

/* 添加动画效果 */
.expanded-view {
    animation: expand 0.3s ease;
}

@keyframes expand {
    from {
        opacity: 0;
        transform: translate(-50%, -50%) scale(0.8);
    }

    to {
        opacity: 1;
        transform: translate(-50%, -50%) scale(1);
    }
}
</style>