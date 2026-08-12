export class BinaryNetworkManager {
    constructor() {
        this.peer = null;
        this.peerConn = null;
        this.lastBroadcastTime = 0;
    }

    init(onOpenCallback, onErrorCallback) {
        const shortCode = Math.floor(100000 + Math.random() * 900000).toString();
        this.peer = new Peer('jayblade-' + shortCode);

        this.peer.on('open', () => {
            const input = document.getElementById('room-id-input');
            if (input) input.value = shortCode;
        });

        this.peer.on('connection', (conn) => {
            this.peerConn = conn;
            this.setupEvents(onOpenCallback, onErrorCallback);
        });

        // 錯誤監聽：房號不存在或網路斷開
        this.peer.on('error', (err) => {
            console.error('PeerJS Error:', err);
            if (onErrorCallback) onErrorCallback('連線失敗：' + (err.type || '網路異常'));
        });
    }

    connect(targetCode, onOpenCallback, onErrorCallback) {
        if (!targetCode) {
            if (onErrorCallback) onErrorCallback('請輸入 6 位有效房號');
            return;
        }

        // 連線超時保護 (5 秒無回應則報錯)
        const timeout = setTimeout(() => {
            if (!this.peerConn || !this.peerConn.open) {
                if (onErrorCallback) onErrorCallback('連線超時，請確認對方房號是否開啟');
            }
        }, 5000);

        this.peerConn = this.peer.connect('jayblade-' + targetCode);
        this.setupEvents(() => {
            clearTimeout(timeout);
            if (onOpenCallback) onOpenCallback();
        }, onErrorCallback);
    }

    setupEvents(onOpenCallback, onErrorCallback) {
        this.peerConn.on('open', () => {
            if (onOpenCallback) onOpenCallback();
        });

        this.peerConn.on('error', (err) => {
            if (onErrorCallback) onErrorCallback('對戰通道異常：' + err);
        });

        this.peerConn.on('close', () => {
            if (onErrorCallback) onErrorCallback('對方已斷開連線');
        });

        this.peerConn.on('data', (arrayBuffer) => {
            if (window.onWebRTCDataReceived) {
                window.onWebRTCDataReceived(arrayBuffer);
            }
        });
    }

    broadcastState(now, isSimulating, activeTops) {
        if (this.peerConn && this.peerConn.open && isSimulating && (now - this.lastBroadcastTime > 100)) {
            this.lastBroadcastTime = now;
            const validTops = activeTops.filter(t => !t.isShattered);
            const buffer = new Float32Array(1 + validTops.length * 7);
            buffer[0] = validTops.length;

            validTops.forEach((t, i) => {
                const offset = 1 + i * 7;
                buffer[offset]     = t.body.position.x;
                buffer[offset + 1] = t.body.position.y;
                buffer[offset + 2] = t.body.position.z;
                buffer[offset + 3] = t.body.quaternion.x;
                buffer[offset + 4] = t.body.quaternion.y;
                buffer[offset + 5] = t.body.quaternion.z;
                buffer[offset + 6] = t.body.quaternion.w;
            });

            this.peerConn.send(buffer.buffer);
        }
    }

    static unpackState(arrayBuffer, activeTops) {
        // 🛡️ 資安防護 1: 嚴格驗證數據類型與 ArrayBuffer 邊界
        if (!(arrayBuffer instanceof ArrayBuffer)) {
            console.warn('Security Alert: Invalid WebRTC payload type received.');
            return;
        }

        // 🛡️ 資安防護 2: 檢查 Buffer 位元組長度是否符合 Float32 (4 bytes per element)
        if (arrayBuffer.byteLength % 4 !== 0 || arrayBuffer.byteLength < 32 || arrayBuffer.byteLength > 1024) {
            console.warn('Security Alert: Malformed ArrayBuffer byte length.');
            return;
        }

        const data = new Float32Array(arrayBuffer);
        const count = Math.floor(data[0]);

        // 🛡️ 資安防護 3: 驗證聲明的數量欄位與實際數據長度是否相符
        if (count <= 0 || data.length < (1 + count * 7)) {
            console.warn('Security Alert: Payload top count mismatch.');
            return;
        }

        for (let i = 0; i < count; i++) {
            if (activeTops[i] && !activeTops[i].isShattered) {
                const offset = 1 + i * 7;
                
                // 🛡️ 資安防護 4: 數值範圍白名單驗證 (防止 NaN, Infinity 或超大異常座標攻擊)
                const x = data[offset], y = data[offset + 1], z = data[offset + 2];
                if (Number.isFinite(x) && Number.isFinite(y) && Number.isFinite(z) && Math.abs(x) < 100 && Math.abs(z) < 100) {
                    // 0.3 線性插值平滑接軌
                    activeTops[i].body.position.x += (x - activeTops[i].body.position.x) * 0.3;
                    activeTops[i].body.position.y += (y - activeTops[i].body.position.y) * 0.3;
                    activeTops[i].body.position.z += (z - activeTops[i].body.position.z) * 0.3;
                }
            }
        }
    }
}
