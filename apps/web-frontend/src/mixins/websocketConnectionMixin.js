import { setUnifiedWebSocketState } from '@/runtime/unifiedRuntime'

export default {
  methods: {
    connect() {
      this.getLocationHostName();
      if (this.websocket && (this.websocket.readyState === WebSocket.OPEN || this.websocket.readyState === WebSocket.CONNECTING)) {
        return;
      }
      // 替换为你的 WebSocket 服务器地址
      // this.websocket = new WebSocket('ws://192.168.2.31:8600');  // process.env.VUE_APP_WEBSOCKET
      // this.websocket = new WebSocket(process.env.VUE_APP_WEBSOCKET);
      const wsOptions = {
        rejectUnauthorized: false  // 禁用证书验证
      };
      this.websocket = new WebSocket(this.WebSocketUrl, [], wsOptions);

      this.websocket.onopen = () => {
        this.websocketState = 'connected';
        setUnifiedWebSocketState('connected', 'WebSocket connected');
        this.networkDisconnected = false; // WebSocket连接成功时重置网络连接状态
        if (this.disconnectTimeoutTriggered) {
          this.callShowMessageBox('WebSocket connected', 'success');
        }
        this.$bus.$emit('ShowNetStatus', 'true');
        this.StatusRecovery();
        console.log('process.env.NODE_ENV:', process.env.NODE_ENV);
      };

      this.websocket.onmessage = message => this.handleWebSocketMessage(message);

      this.websocket.onerror = (error) => {
        const errorDetails = {
          type: error.type,
          timestamp: new Date().toISOString(),
          url: this.WebSocketUrl,
          readyState: this.websocket.readyState,
          protocol: this.websocket.protocol,
          extensions: this.websocket.extensions
        };
        console.error('WebSocket Error Details:', errorDetails);
        this.SendConsoleLogMsg('WebSocket Error: ' + JSON.stringify(errorDetails), 'error');
        this.websocketState = 'error';
        setUnifiedWebSocketState('error', 'WebSocket error');
        this.networkDisconnected = true;
      };

      this.websocket.onclose = () => {
        console.log('QHYCCD | WebSocket disconnected');
        this.websocketState = 'disconnected';
        setUnifiedWebSocketState('disconnected', 'WebSocket disconnected');
        this.networkDisconnected = true; // WebSocket连接关闭时设置网络连接状态
        console.log('QHYCCD | WebSocket disconnected');
        this.$bus.$emit('ShowNetStatus', 'false');

        // 设置一个定时器，1秒后检查网络状态
        this.disconnectTimeout = setTimeout(() => {
          if (this.networkDisconnected) { // 如果1秒后仍然断开
            this.callShowMessageBox('WebSocket disconnected', 'error');
            this.disconnectTimeoutTriggered = true;
          }
        }, 1000); // 1秒后执行

        // 启动自动重连
        this.reconnectWebSocket();
      };
    },
  },
}
