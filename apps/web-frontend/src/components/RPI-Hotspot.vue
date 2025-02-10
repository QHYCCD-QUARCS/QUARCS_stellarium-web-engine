<template>
  <transition name="dialog">
    <div class="HotspotDialog" :style="{ top: top + 'px', height: DialogHeight + 'px' }">
      <v-text-field class="NameEdit" label="Hotspot Name" v-model="InputText" variant="outlined"></v-text-field>

      <span v-show="isEdited && (defaultShow || SaveBtnSelect)" class="custom-button no-select" :class="{ 'DeleteTips-show': SaveBtnSelect, 'DeleteTips-hide': !SaveBtnSelect }"> Confirm edited? </span>

      <button v-show="isEdited && (defaultShow || SaveBtnSelect)" class="custom-button btn-SureDelete no-select" :class="{ 'btn-SureDelete-show': SaveBtnSelect, 'btn-SureDelete-hide': !SaveBtnSelect }" @click="UpdateHotspotName"> 
        <v-icon color="rgba(75, 155, 250)"> mdi-check-circle-outline </v-icon>
      </button>
      
      <button v-show="isEdited" class="custom-button btn-Delete no-select" @click="SaveBtnClick"> 
        <span v-if="SaveBtnSelect === false">
          <div style="display: flex; justify-content: center; align-items: center;">
            <img src="@/assets/images/svg/ui/SaveEdit.svg" height="20px" style="min-height: 20px; pointer-events: none;"></img>
          </div> 
        </span>
        <span v-if="SaveBtnSelect === true">
          <v-icon color="rgba(255, 0, 0)"> mdi-close-circle-outline </v-icon>
        </span>
      </button>

      <button v-show="isEdited" class="custom-button btn-Redo no-select" @click="RedoHotspotName"> 
        <v-icon color="rgba(255, 0, 0)"> mdi-redo </v-icon>
      </button>

      <span v-show="isUpdated" class="TipsText"> 
        {{ $t('Please connect to the new hotspot in the mobile phone system settings, it will take about a minute to wait.') }}
      </span>

    </div>
  </transition>
</template>

<script>
export default {
  name: 'HotspotDialog',
  data() {
    return {
      top: 45,

      CurrentName: 'RaspBerryPi-WiFi',

      InputText: 'RaspBerryPi-WiFi',

      SaveBtnSelect: false,
      defaultShow: false,

      isUpdated: false,
      
    };
  },
  created() {
    this.$bus.$on('HotspotName', this.CurrentHotspotName);
    this.$bus.$on('EditHotspotNameSuccess', this.UpdateSuccess);
  },
  methods: {
    CurrentHotspotName(name) {
      this.CurrentName = name;
      this.InputText = name;
      this.isUpdated = false;
      this.defaultShow = false;
    },

    SaveBtnClick() {
      if (this.SaveBtnSelect) {
        this.SaveBtnSelect = false;
      } else {
        this.SaveBtnSelect = true;
        this.defaultShow = true;
      }
    },

    RedoHotspotName() {
      this.InputText = this.CurrentName;
      this.isUpdated = false;
    },

    UpdateHotspotName() {
      this.SaveBtnSelect = false;
      this.$bus.$emit('AppSendMessage', 'Vue_Command', 'editHotspotName:' + this.InputText);
      this.$bus.$emit('SendConsoleLogMsg', 'Edit Hotspot Name:' + this.InputText, 'info');
    },

    UpdateSuccess() {
      this.isUpdated = true;
      this.CurrentName = this.InputText;
      this.$bus.$emit('SendConsoleLogMsg', 'Update Hotspot Name Success.', 'info');
    },

  },
  computed: {
    isEdited() {
      return this.InputText !== this.CurrentName;
    },
    DialogHeight() {
      if (this.isUpdated) {
        return 140;
      }
      return this.isEdited ? 100 : 60;
    }
  }
};
</script>

<style scoped>
.HotspotDialog {
  pointer-events: auto;
  position: fixed;
  background-color: rgba(64, 64, 64, 0.5);
  backdrop-filter: blur(5px);
  box-sizing: border-box;
  overflow: hidden;
  left: 50%;
  width: 30%;
  transform: translateX(-50%);
  border-radius: 10px;
  border: 1px solid rgba(255, 255, 255, 0.8);
  transition: height 0.3s ease;
}

.dialog-enter-active {
  animation: showPanelAnimation 0.3s forwards;
}
.dialog-leave-active {
  animation: hidePanelAnimation 0.3s forwards;
}

@keyframes showPanelAnimation {
  from {
    top: -60px;
    backdrop-filter: blur(0px);
    background-color: rgba(64, 64, 64, 0.0);
  }

  to {
    top: 45px;
    backdrop-filter: blur(5px);
    background-color: rgba(64, 64, 64, 0.3);
  }
}

@keyframes hidePanelAnimation {
  from {
    top: 45px;
    backdrop-filter: blur(5px);
    background-color: rgba(64, 64, 64, 0.3);
  }

  to {
    top: -60px;
    backdrop-filter: blur(0px);
    background-color: rgba(64, 64, 64, 0.0);
  }
}

.NameEdit {
  position: absolute;
  width: 90%;
  height: 40px;
  top: 5px;
  left: 50%;
  transform: translateX(-50%);

}

.btn-Redo {
  position:absolute;
  top: 65px;
  left: 10px;

  width: 30px;
  height: 30px;

  user-select: none;
  background-color: rgba(0, 0, 0, 0.3);
  backdrop-filter: blur(5px);
  border-radius: 50%;
  box-sizing: border-box;
  border: none;
}

.btn-Delete {
  position:absolute;
  top: 65px;
  right: 10px;

  width: 30px;
  height: 30px;

  user-select: none;
  background-color: rgba(0, 0, 0, 0.3);
  backdrop-filter: blur(5px);
  border-radius: 50%;
  box-sizing: border-box;
  border: none;
}

.btn-Delete:active,
.btn-SureDelete:active {
  transform: scale(0.95); /* 点击时缩小按钮 */
  background-color: rgba(255, 255, 255, 0.7);
}

.btn-SureDelete-show {
  position:absolute;
  top: 65px;
  right: 10px;

  width: 30px;
  height: 30px;

  user-select: none;
  background-color: rgba(0, 0, 0, 0.3);
  backdrop-filter: blur(5px);
  border-radius: 50%;
  box-sizing: border-box;
  border: none;

  animation: showAnimation 0.3s forwards;
}

@keyframes showAnimation {
  from {
    right: 10px;
  }
  to {
    right: 135px;
  }
}

.btn-SureDelete-hide {
  position:absolute;
  top: 65px;
  right: 10px;

  width: 30px;
  height: 30px;

  user-select: none;
  background-color: rgba(0, 0, 0, 0.3);
  backdrop-filter: blur(5px);
  border-radius: 50%;
  box-sizing: border-box;
  border: none;

  animation: hideAnimation 0.3s forwards;
}

@keyframes hideAnimation {
  from {
    right: 135px;
    opacity: 1;
  }
  to {
    right: 10px;
    opacity: 0;
  }
}

.DeleteTips-show {
  position:absolute;
  top: 65px;
  right: 10px;

  width: 30px;
  height: 30px;

  user-select: none;
  background-color: rgba(0, 0, 0, 0.1);
  backdrop-filter: blur(5px);
  border-radius: calc(30px / 2);
  box-sizing: border-box;
  border: none;

  opacity: 0;
  overflow: hidden;

  display: flex;
  justify-content: center;
  align-items: center;
  text-align: center;

  animation: expandAnimation 0.3s forwards;
}

@keyframes expandAnimation {
  from {
    width: 30px;
    opacity: 0;
  }
  to {
    width: 155px;
    opacity: 1;
  }
}

.DeleteTips-hide {
  position:absolute;
  top: 65px;
  right: 10px;

  width: 30px;
  height: 30px;

  user-select: none;
  background-color: rgba(0, 0, 0, 0.1);
  backdrop-filter: blur(5px);
  border-radius: calc(30px / 2);
  box-sizing: border-box;
  border: none;

  opacity: 1;
  overflow: hidden;

  display: flex;
  justify-content: center;
  align-items: center;
  text-align: center;

  animation: collapseAnimation 0.3s forwards;
}

@keyframes collapseAnimation {
  from {
    width: 155px;
    opacity: 1;
  }
  to {
    width: 30px;
    opacity: 0;
  }
}

.TipsText {
  position: absolute; 
  width: 100%; 
  top: 100px; 
  left: 0; 

  text-align: center; 
  font-size: 10px; 
  color: rgba(255, 0, 0, 0.7); 
  user-select: none;
  line-height: 1;
}

</style>
