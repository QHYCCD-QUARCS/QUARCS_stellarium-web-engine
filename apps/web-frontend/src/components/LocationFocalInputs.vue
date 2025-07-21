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
                <v-text-field v-model="longitude" :label="$t('longitude')" outlined dense hide-details
                    class="custom-input" type="number" suffix="°" @input="handleInput" @touchstart.stop @touchmove.stop
                    @touchend.stop></v-text-field>
                <v-text-field v-model="latitude" :label="$t('latitude')" outlined dense hide-details
                    class="custom-input" type="number" suffix="°" @input="handleInput" @touchstart.stop @touchmove.stop
                    @touchend.stop></v-text-field>
                <v-text-field v-model="focalLength" :label="$t('focalLength')" outlined dense hide-details
                    class="custom-input" type="number" suffix="mm" @input="handleInput" @touchstart.stop @touchmove.stop
                    @touchend.stop></v-text-field>
                <v-btn class="close-btn" icon @click="collapseInputs">
                    <v-icon>mdi-close</v-icon>
                </v-btn>
            </div>
        </div>
    </div>
</template>

<script>
export default {
    name: 'LocationFocalInputs',
    data() {
        return {
            longitude: '0',
            latitude: '0',
            focalLength: '0',
            isExpanded: false
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
        }
    }
}
</script>


<style scoped>
.location-inputs {
    pointer-events: auto;
    z-index: 1000;
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
    z-index: 2000;
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