export function handleSpecialWebSocketMessage(context, message) {
  let acceptMessage = false
          // ===== Network mode / ZeroTier integration (no ':' split) =====
          // NOTE: `message` contains ':' for JSON, so we must handle it BEFORE the big switch.
          if (message.startsWith('NetStatus|')) {
            acceptMessage = true;
            const payload = message.substring('NetStatus|'.length);
            try {
              const obj = JSON.parse(payload);
              context.$bus.$emit('NetStatus', obj);
            } catch (e) {
              console.error('NetStatus JSON parse failed:', e, payload);
              context.$bus.$emit('SendConsoleLogMsg', 'NetStatus JSON parse failed', 'warning');
            }
          }
          if (message.startsWith('WiFiScan|')) {
            acceptMessage = true;
            const payload = message.substring('WiFiScan|'.length);
            try {
              const arr = JSON.parse(payload);
              context.$bus.$emit('WiFiScan', arr);
            } catch (e) {
              console.error('WiFiScan JSON parse failed:', e, payload);
              context.$bus.$emit('SendConsoleLogMsg', 'WiFiScan JSON parse failed', 'warning');
            }
          }
          if (message.startsWith('WiFiSaveResult|')) {
            acceptMessage = true;
            const parts = message.split('|');
            // WiFiSaveResult|<save|scan>|<ok|fail>|<detail?>
            const action = parts[1] || '';
            const result = parts[2] || '';
            const detail = parts.slice(3).join('|');
            context.$bus.$emit('WiFiSaveResult', { action, result, detail });
          }
          if (message.startsWith('NetModeResult|')) {
            acceptMessage = true;
            const parts = message.split('|');
            // NetModeResult|<ap|wan>|<ok|fail>|<detail?>
            if (parts.length >= 3) {
              const mode = parts[1];
              const result = parts[2];
              const detail = parts.slice(3).join('|');
              context.$bus.$emit('NetModeResult', { mode, result, detail });
            }
          }
          if (message.startsWith('StagingScheduleData:')) {
            console.log('------------------------------');
            acceptMessage = true;
            const parts = message.split('[');

            if (parts.length > 0) {
              console.log('parts.length: ', parts.length);
              context.$bus.$emit('StagingScheduleData', message);
            }
            console.log('------------------------------');
          }

          if (message.startsWith('SendDebugMessage|')) {
            acceptMessage = true;
            const parts = message.split('|');
            if (parts.length >= 3) {
              const type = parts[1];
              const message = parts.slice(2).join('|');
              context.$bus.$emit('SendDebugMessage', type, message);
            }
          }

          // 下载清单（JSON 可能包含 ':'，必须用“首个冒号”截取）
          if (message.startsWith('DownloadManifest:')) {
            acceptMessage = true;
            try {
              const colonIndex = message.indexOf(':');
              if (colonIndex === -1 || colonIndex >= message.length - 1) {
                context.$bus.$emit('DownloadManifest', { error: 'Invalid message format', totalBytes: 0, files: [] });
              } else {
                const jsonString = message.substring(colonIndex + 1);
                const jsonData = JSON.parse(jsonString);
                context.$bus.$emit('DownloadManifest', jsonData);
              }
            } catch (e) {
              context.$bus.$emit('DownloadManifest', { error: 'Failed to parse manifest: ' + e.message, totalBytes: 0, files: [] });
            }
          }

          if (message.startsWith('TileBatchReady:')) {
            acceptMessage = true;
            try {
              const colonIndex = message.indexOf(':');
              const jsonString = (colonIndex >= 0) ? message.substring(colonIndex + 1) : '';
              const payload = JSON.parse(jsonString);
              context.handleTileBatchReady(payload);
            } catch (e) {
              console.error('[Tile] failed to parse TileBatchReady', e);
            }
          }

          if (message.startsWith('TileGenerationComplete:')) {
            acceptMessage = true;
            try {
              const colonIndex = message.indexOf(':');
              const jsonString = (colonIndex >= 0) ? message.substring(colonIndex + 1) : '';
              const payload = JSON.parse(jsonString);
              context.handleTileGenerationComplete(payload);
            } catch (e) {
              console.error('[Tile] failed to parse TileGenerationComplete', e);
            }
          }

  return acceptMessage
}
