// js/replay.js - 關鍵幀記錄、慢動作時間軸與 3D 網格同步
export const replayBuffer = [];
export const collisionEvents = [];
export const MAX_REPLAY_FRAMES = 450;

export let isReplaying = false;
export let replayPaused = false;
export let replayFrameIndex = 0;

export function resetReplayBuffer() {
    replayBuffer.length = 0;
    collisionEvents.length = 0;
    isReplaying = false;
    replayPaused = false;
    replayFrameIndex = 0;
    const oldHud = document.getElementById('replay-hud-bar');
    if (oldHud && document.body.contains(oldHud)) document.body.removeChild(oldHud);
}

export function recordKeyframe(activeTops, startTime) {
    if (isReplaying || activeTops.length === 0) return;

    const currentFrameIdx = replayBuffer.length;
    const timeNow = performance.now();
    let hasCollisionThisFrame = false;
    let maxFrameImpulse = 0;

    activeTops.forEach(t => {
        const imp = parseFloat(t.lastImpulseMag || 0);
        if (imp > 0.035) {
            hasCollisionThisFrame = true;
            maxFrameImpulse = Math.max(maxFrameImpulse, imp);
        }
    });

    if (hasCollisionThisFrame) {
        collisionEvents.push({
            frameIndex: currentFrameIdx,
            timeSec: ((timeNow - startTime) / 1000).toFixed(1),
            impulse: maxFrameImpulse
        });
    }

    replayBuffer.push({
        time: timeNow,
        tops: activeTops.map(t => ({
            x: t.body.position.x, y: t.body.position.y, z: t.body.position.z,
            qx: t.body.quaternion.x, qy: t.body.quaternion.y, qz: t.body.quaternion.z, qw: t.body.quaternion.w,
            hp: t.hp, rpm: t.getRPM(), speed: t.getLinearSpeed(), impulse: t.lastImpulseMag
        }))
    });

    if (replayBuffer.length > MAX_REPLAY_FRAMES) {
        replayBuffer.shift();
        collisionEvents.forEach(e => e.frameIndex = Math.max(0, e.frameIndex - 1));
    }
}

export function applyReplayFrame(index, activeTops) {
    const frame = replayBuffer[index];
    if (!frame) return;

    frame.tops.forEach((topState, idx) => {
        const top = activeTops[idx];
        if (top) {
            top.body.position.set(topState.x, topState.y, topState.z);
            top.body.quaternion.set(topState.qx, topState.qy, topState.qz, topState.qw);
            top.group.position.set(topState.x, topState.y, topState.z);
            top.group.quaternion.set(topState.qx, topState.qy, topState.qz, topState.qw);
            top.hp = topState.hp;
        }
    });
}

export function showReplayControlHUD(activeTops, controls, triggerHapticCallback) {
    if (replayBuffer.length === 0) return;
    isReplaying = true;
    replayPaused = false;
    replayFrameIndex = 0;
    controls.enabled = true;

    const hud = document.createElement('div');
    hud.id = 'replay-hud-bar';
    hud.style.cssText = `
        position: fixed; bottom: 24px; left: 50%; transform: translateX(-50%);
        background: rgba(15, 23, 42, 0.92); border: 1px solid #f59e0b;
        backdrop-filter: blur(16px); border-radius: 30px; padding: 8px 20px;
        display: flex; align-items: center; gap: 12px; z-index: 3000;
        box-shadow: 0 0 30px rgba(245, 158, 11, 0.4);
    `;

    hud.innerHTML = `
        <button id="btn-replay-play" style="background:#f59e0b; border:none; color:#030712; font-family:'Orbitron', sans-serif; font-weight:bold; border-radius:50%; width:32px; height:32px; cursor:pointer;">⏸️</button>
        <div style="position:relative; width:190px; display:flex; align-items:center;">
            <input type="range" id="replay-timeline" min="0" max="${replayBuffer.length - 1}" value="0" style="width:100%; accent-color:#f59e0b; cursor:pointer; z-index:2; position:relative; background:transparent;">
            <div id="timeline-markers" style="position:absolute; top:50%; left:0; width:100%; height:4px; transform:translateY(-50%); pointer-events:none; z-index:1;"></div>
        </div>
        <span id="replay-time-txt" style="font-family:'Orbitron', monospace; font-size:0.75rem; color:#f59e0b; width:45px;">0.0s</span>
        <button id="btn-jump-critical" style="background:rgba(239,68,68,0.2); border:1px solid #ef4444; color:#ef4444; font-family:'Orbitron', sans-serif; padding:4px 8px; border-radius:12px; font-size:0.7rem; cursor:pointer;" title="跳轉至致命一擊">⚡ 致命擊</button>
        <button id="btn-replay-exit" style="background:transparent; border:1px solid #94a3b8; color:#94a3b8; font-family:'Orbitron', sans-serif; padding:4px 10px; border-radius:12px; font-size:0.75rem; cursor:pointer;">退出</button>
    `;
    document.body.appendChild(hud);

    const markersContainer = document.getElementById('timeline-markers');
    const totalFrames = replayBuffer.length - 1 || 1;
    collisionEvents.forEach(ev => {
        const dot = document.createElement('div');
        const pct = (ev.frameIndex / totalFrames) * 100;
        dot.style.cssText = `
            position: absolute; left: ${pct}%; top: -3px; width: 6px; height: 6px;
            background: #ef4444; border-radius: 50%; box-shadow: 0 0 6px #ef4444;
        `;
        markersContainer.appendChild(dot);
    });

    const playBtn = document.getElementById('btn-replay-play');
    const timeline = document.getElementById('replay-timeline');
    const timeTxt = document.getElementById('replay-time-txt');
    const jumpBtn = document.getElementById('btn-jump-critical');
    const exitBtn = document.getElementById('btn-replay-exit');

    playBtn.onclick = () => {
        replayPaused = !replayPaused;
        playBtn.innerText = replayPaused ? '▶️' : '⏸️';
    };

    timeline.oninput = (e) => {
        replayPaused = true;
        playBtn.innerText = '▶️';
        replayFrameIndex = parseInt(e.target.value);
        applyReplayFrame(replayFrameIndex, activeTops);
    };

    jumpBtn.onclick = () => {
        const criticalEvent = collisionEvents.reduce((prev, curr) => (curr.impulse > prev.impulse) ? curr : prev, collisionEvents[0]);
        if (criticalEvent) {
            replayPaused = true;
            playBtn.innerText = '▶️';
            replayFrameIndex = criticalEvent.frameIndex;
            timeline.value = replayFrameIndex;
            timeTxt.innerText = `${criticalEvent.timeSec}s`;
            applyReplayFrame(replayFrameIndex, activeTops);
            if (triggerHapticCallback) triggerHapticCallback("heavy");
        }
    };

    exitBtn.onclick = () => {
        isReplaying = false;
        if (document.body.contains(hud)) document.body.removeChild(hud);
        const box = document.getElementById('ui-overlay-box');
        if (box) box.style.display = 'block';
    };

    const replayLoop = setInterval(() => {
        if (!isReplaying) { clearInterval(replayLoop); return; }

        if (!replayPaused) {
            replayFrameIndex++;
            if (replayFrameIndex >= replayBuffer.length) replayFrameIndex = 0;
            timeline.value = replayFrameIndex;
            timeTxt.innerText = `${(replayFrameIndex / 60).toFixed(1)}s`;
            applyReplayFrame(replayFrameIndex, activeTops);
        }
    }, 33);
}
