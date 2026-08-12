// js/network.js - P2P 快照傳輸與狀態重算對齊

export class ReconciliationNetworkManager {
    constructor() {
        this.sequence = 0;
        this.peer = null;
        this.conn = null;
        this.isHost = false;
        this.stateBuffer = new Map(); // 保存近 60 幀歷史快照
    }

    init(peerId, onConnected, onError) {
        this.peer = new Peer(peerId, { debug: 1 });
        this.peer.on('open', (id) => console.log('WebRTC Local Peer ID:', id));
        this.peer.on('connection', (connection) => {
            this.conn = connection;
            this.isHost = true;
            this.setupConnectionEvents(onConnected);
        });
        this.peer.on('error', (err) => onError && onError(err.message));
    }

    connect(targetPeerId, onConnected, onError) {
        this.conn = this.peer.connect(targetPeerId, { reliable: false });
        this.isHost = false;
        this.setupConnectionEvents(onConnected);
    }

    setupConnectionEvents(onConnected) {
        this.conn.on('open', () => {
            onConnected && onConnected();
        });

        this.conn.on('data', (data) => {
            if (data.type === 'SNAPSHOT') {
                this.handleIncomingSnapshot(data.payload);
            }
        });
    }

    /**
     * Host 端：打包 30Hz 物理快照廣播給 Client
     */
    broadcastSnapshot(activeTops) {
        if (!this.conn || !this.isHost) return;
        
        this.sequence++;
        const snapshots = activeTops.map(top => top.getSnapshot(this.sequence));
        
        this.conn.send({
            type: 'SNAPSHOT',
            payload: {
                seq: this.sequence,
                timestamp: performance.now(),
                tops: snapshots
            }
        });
    }

    /**
     * Client 端：接收 Host 快照並執行平滑重算校正
     */
    handleIncomingSnapshot(payload) {
        if (this.isHost) return;

        payload.tops.forEach(snapshot => {
            if (window.activeTopsMap && window.activeTopsMap.has(snapshot.id)) {
                const localTop = window.activeTopsMap.get(snapshot.id);
                localTop.applySnapshot(snapshot, 0.3); // 30% Lerp 校正比率
            }
        });
    }
}
