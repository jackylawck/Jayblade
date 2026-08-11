// 全域畫面震動與閃光變數
let screenShakeTime = 0;
let screenShakeIntensity = 0;
let screenFlashAlpha = 0;

function triggerScreenShake(intensity, duration) {
  screenShakeIntensity = intensity;
  screenShakeTime = duration;
}

function triggerScreenFlash() {
  screenFlashAlpha = 0.4;
}

// 1. Web Audio API 音效引擎
class SoundFX {
  constructor() {
    this.ctx = null;
    this.bgmTimer = null;
    this.isBgmActive = false;
  }

  init() {
    if (!this.ctx) {
      this.ctx = new (window.AudioContext || window.webkitAudioContext)();
    }
  }

  playCountBeep(isFinal = false) {
    if (!this.ctx) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(isFinal ? 880 : 440, this.ctx.currentTime);
    gain.gain.setValueAtTime(0.3, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + (isFinal ? 0.35 : 0.12));

    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start();
    osc.stop(this.ctx.currentTime + (isFinal ? 0.35 : 0.12));
  }

  toggleBGM() {
    this.init();
    this.isBgmActive = !this.isBgmActive;

    if (this.isBgmActive) {
      this.bgmTimer = setInterval(() => {
        if (!this.isBgmActive || !this.ctx) return;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(65, this.ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(30, this.ctx.currentTime + 0.15);

        gain.gain.setValueAtTime(0.08, this.ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.15);

        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start();
        osc.stop(this.ctx.currentTime + 0.15);
      }, 250);
    } else {
      if (this.bgmTimer) clearInterval(this.bgmTimer);
    }
    return this.isBgmActive;
  }

  stopBGM() {
    if (this.bgmTimer) clearInterval(this.bgmTimer);
    this.isBgmActive = false;
  }

  playMetalImpact(impulse = 100) {
    if (!this.ctx) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    const freq = Math.min(200 + impulse * 3, 1100);
    const volume = Math.min(impulse / 180, 0.7);

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(freq, this.ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(60, this.ctx.currentTime + 0.08);

    gain.gain.setValueAtTime(volume, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.08);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start();
    osc.stop(this.ctx.currentTime + 0.08);
  }

  playExtremeImpactSound() {
    if (!this.ctx) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(350, this.ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(40, this.ctx.currentTime + 0.25);

    gain.gain.setValueAtTime(0.7, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.25);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start();
    osc.stop(this.ctx.currentTime + 0.25);
  }

  playXDash() {
    if (!this.ctx) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(150, this.ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(550, this.ctx.currentTime + 0.15);

    gain.gain.setValueAtTime(0.2, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.15);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start();
    osc.stop(this.ctx.currentTime + 0.15);
  }

  playShatter() {
    if (!this.ctx) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'square';
    osc.frequency.setValueAtTime(180, this.ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(30, this.ctx.currentTime + 0.35);

    gain.gain.setValueAtTime(0.6, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.35);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start();
    osc.stop(this.ctx.currentTime + 0.35);
  }
}

const sfx = new SoundFX();

// 2. 粒子類別
class Particle {
  constructor(x, y, vx, vy, color, isDebris = false, isFlash = false) {
    this.x = x;
    this.y = y;
    this.vx = vx;
    this.vy = vy;
    this.life = 1.0;
    this.color = color;
    this.isDebris = isDebris;
    this.isFlash = isFlash;
    this.radius = isFlash ? 22 : (isDebris ? (4 + Math.random() * 5) : (2 + Math.random() * 3));
  }

  update(dt) {
    this.x += this.vx * dt;
    this.y += this.vy * dt;
    this.life -= dt * (this.isFlash ? 8.0 : (this.isDebris ? 1.5 : 3.0));
  }

  draw(ctx) {
    ctx.save();
    ctx.globalAlpha = Math.max(0, this.life);
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
    ctx.fillStyle = this.color;
    ctx.fill();
    ctx.restore();
  }
}

// 3. 實體陀螺類別
class PhysicalTop {
  constructor(x, y, crownKey, tipKey, powerLevel, name, customColor = null, isCpu = false, aiRate = 0.4) {
    const crown = PARTS_DATABASE.crowns[crownKey];
    const tip = PARTS_DATABASE.tips[tipKey];

    this.name = name || '陀螺';
    this.isCpu = isCpu;
    this.aiRate = aiRate;
    this.x = x;
    this.y = y;
    this.vx = (Math.random() - 0.5) * 60;
    this.vy = (Math.random() - 0.5) * 60;

    this.mass = crown.mass;
    this.radius = crown.radius;
    this.restitution = crown.restitution;
    this.color = customColor || crown.color;
    this.tip = tip;
    this.weightDist = crown.weightDist;

    this.rpm = powerLevel === 'HEAVY' ? 2400 : (powerLevel === 'LIGHT' ? 1200 : 1800);
    this.angularVelocity = (this.rpm * Math.PI) / 30;
    this.inertia = 0.5 * this.mass * Math.pow(this.radius, 2) * (0.5 + 0.5 * this.weightDist);

    this.angle = 0;
    this.tilt = 0;
    this.precessionAngle = 0;
    this.shatterHp = 100;

    this.trail = [];
    this.hasShatteredEffect = false;
    this.xdashCooldown = 0;
    this.isXDashing = false;
    this.lastHitWasExtreme = false;
  }

  update(dt, arenaCenter, particlesArr, targetOpponent = null) {
    if (this.rpm <= 0 || this.shatterHp <= 0) return;

    if (this.xdashCooldown > 0) this.xdashCooldown -= dt;

    this.trail.push({ x: this.x, y: this.y, angle: this.angle });
    if (this.trail.length > 6) this.trail.shift();

    // 自然耗損大幅放放緩，確保對戰長度
    const decay = this.tip.friction * 3.5;
    this.rpm -= decay * dt * 60;
    if (this.rpm < 0) this.rpm = 0;
    this.angularVelocity = (this.rpm * Math.PI) / 30;

    // 陀螺進動（大幅降低傾角攀升率）
    const g = 9.8;
    const distCM = 4;
    const stabilityThreshold = 500;

    if (this.rpm > stabilityThreshold) {
      this.tilt *= 0.97;
    } else {
      this.tilt += (stabilityThreshold - this.rpm) * 0.000005 * dt; // 調低 10 倍，避免即時傾倒
    }

    if (this.rpm > 50 && this.tilt > 0.01) {
      const precessionRate = (this.mass * g * distCM) / (this.inertia * this.angularVelocity);
      this.precessionAngle += precessionRate * dt * 100;
      const wobbleOffset = Math.sin(this.tilt) * 12;
      this.vx += Math.cos(this.precessionAngle) * wobbleOffset * dt;
      this.vy += Math.sin(this.precessionAngle) * wobbleOffset * dt;
    }

    // CPU AI
    if (this.isCpu && targetOpponent && targetOpponent.shatterHp > 0) {
      if (this.tip.shape === 'FLAT' && this.rpm > 300) {
        const dx = targetOpponent.x - this.x;
        const dy = targetOpponent.y - this.y;
        this.vx += dx * (this.aiRate * 1.1) * dt;
        this.vy += dy * (this.aiRate * 1.1) * dt;
      }
    }

    // 底軸走位
    if (this.tip.shape === 'FLAT' && this.rpm > 150) {
      const moveAngle = this.angle + Math.PI / 2;
      this.vx += Math.cos(moveAngle) * (this.tip.moveForce * 1.2) * dt;
      this.vy += Math.sin(moveAngle) * (this.tip.moveForce * 1.2) * dt;
    } else if (this.tip.shape === 'PINPOINT') {
      this.vx *= 0.97;
      this.vy *= 0.97;
    }

    // X-Dash 齒輪咬合極速衝刺
    const distToCenter = Math.hypot(this.x - arenaCenter.x, this.y - arenaCenter.y);
    const railInner = 180;
    const railOuter = 228;

    if (distToCenter > railInner && distToCenter < railOuter && this.rpm > 200) {
      this.isXDashing = true;
      const rx = (arenaCenter.x - this.x) / distToCenter;
      const ry = (arenaCenter.y - this.y) / distToCenter;
      const tx = -ry;
      const ty = rx;

      const boostPower = 280 + (this.rpm / 2200) * 400;
      this.vx += tx * boostPower * dt;
      this.vy += ty * boostPower * dt;

      this.rpm -= 1.5 * dt * 60; // 降低發動損耗

      if (this.xdashCooldown <= 0) {
        sfx.playXDash();
        this.xdashCooldown = 0.18;
      }

      for (let i = 0; i < 4; i++) {
        particlesArr.push(new Particle(
          this.x + (Math.random() - 0.5) * 15,
          this.y + (Math.random() - 0.5) * 15,
          (Math.random() - 0.5) * 200,
          (Math.random() - 0.5) * 200,
          '#00d2d3'
        ));
      }
    } else {
      this.isXDashing = false;
    }

    this.x += this.vx * dt;
    this.y += this.vy * dt;
    this.angle += this.angularVelocity * dt;

    // 傾倒失衡極限門檻放寬至 1.8 (約 103°)
    if (this.tilt > 1.8) {
      this.shatterHp = 0;
      this.rpm = 0;
    }

    // 牆壁碰撞
    const maxRadius = arenaCenter.radius - this.radius;
    if (distToCenter > maxRadius) {
      const nx = (this.x - arenaCenter.x) / distToCenter;
      const ny = (this.y - arenaCenter.y) / distToCenter;
      const vn = this.vx * nx + this.vy * ny;

      if (vn > 0) {
        this.vx -= (1 + 0.85) * vn * nx; // 超高邊界反彈
        this.vy -= (1 + 0.85) * vn * ny;
        sfx.playMetalImpact(70);

        for (let i = 0; i < 3; i++) {
          particlesArr.push(new Particle(
            this.x + nx * this.radius,
            this.y + ny * this.radius,
            (Math.random() - 0.5) * 150,
            (Math.random() - 0.5) * 150,
            '#ff9f43'
          ));
        }
      }
      this.x = arenaCenter.x + nx * maxRadius;
      this.y = arenaCenter.y + ny * maxRadius;
    }
  }

  triggerShatterEffect(particlesArr) {
    if (this.hasShatteredEffect) return;
    this.hasShatteredEffect = true;
    sfx.playShatter();
    triggerScreenShake(10, 0.35);

    for (let i = 0; i < 22; i++) {
      const pVx = (Math.random() - 0.5) * 500;
      const pVy = (Math.random() - 0.5) * 500;
      particlesArr.push(new Particle(this.x, this.y, pVx, pVy, this.color, true));
    }
  }

  getDebugData() {
    return `
    <b>${this.name}</b><br>
    RPM: ${Math.round(this.rpm)}<br>
    速度: ${Math.round(Math.hypot(this.vx, this.vy))}<br>
    X-Dash: ${this.isXDashing ? '🔥 ACTIVE' : 'OFF'}<br>
    耐久: ${Math.round(this.shatterHp)} HP
    `;
  }

  draw(ctx) {
    if (this.shatterHp <= 0) return;

    this.trail.forEach((t, index) => {
      const alpha = (index + 1) / (this.trail.length * 3);
      ctx.save();
      ctx.translate(t.x, t.y);
      ctx.rotate(t.angle);
      ctx.beginPath();
      ctx.arc(0, 0, this.radius, 0, Math.PI * 2);
      ctx.fillStyle = this.color;
      ctx.globalAlpha = alpha;
      ctx.fill();
      ctx.restore();
    });

    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(this.angle);

    ctx.beginPath();
    ctx.arc(0, 0, this.radius, 0, Math.PI * 2);
    ctx.fillStyle = this.color;
    ctx.fill();
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 3;
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(this.radius, 0);
    ctx.strokeStyle = '#000';
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(0, 0, 10, 0, Math.PI * 2);
    ctx.fillStyle = '#ffcc00';
    ctx.fill();
    ctx.strokeStyle = '#000';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    ctx.fillStyle = '#000';
    ctx.font = 'bold 11px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('★', 0, 1);

    ctx.restore();
  }
}

// 4. 超高彈性對撞演算法 (大幅調低單次扣減，提升多次連續反彈)
function resolveAdvancedCollision(p1, p2, particlesArr) {
  const dx = p2.x - p1.x;
  const dy = p2.y - p1.y;
  const dist = Math.hypot(dx, dy);

  if (dist < p1.radius + p2.radius) {
    const nx = dx / dist;
    const ny = dy / dist;
    const tx = -ny;
    const ty = nx;

    const kx = p1.vx - p2.vx;
    const ky = p1.vy - p2.vy;
    const normalVel = kx * nx + ky * ny;

    if (normalVel > 0) {
      // e = 1.45: 超強彈飛力，像乒乓球般連續互撞
      const e = 1.45;
      const impulse = ((1 + e) * normalVel) / ((1 / p1.mass) + (1 / p2.mass));

      p1.vx -= (impulse / p1.mass) * nx;
      p1.vy -= (impulse / p1.mass) * ny;
      p2.vx += (impulse / p2.mass) * nx;
      p2.vy += (impulse / p2.mass) * ny;

      const tangVel = kx * tx + ky * ty;
      const tangImpulse = tangVel * 0.2;
      p1.vx -= (tangImpulse / p1.mass) * tx;
      p1.vy -= (tangImpulse / p1.mass) * ty;
      p2.vx += (tangImpulse / p2.mass) * tx;
      p2.vy += (tangImpulse / p2.mass) * ty;

      // 核心修改：每次對撞只扣除極微量 RPM 與 HP，可對撞 20+ 次
      p1.rpm -= impulse * 0.08;
      p2.rpm -= impulse * 0.08;
      p1.shatterHp -= impulse * 0.003;
      p2.shatterHp -= impulse * 0.003;

      const isExtremeHit = p1.isXDashing || p2.isXDashing;
      if (p1.isXDashing) p1.lastHitWasExtreme = true;
      if (p2.isXDashing) p2.lastHitWasExtreme = true;

      if (isExtremeHit) {
        sfx.playExtremeImpactSound();
        triggerScreenShake(12, 0.22);
        triggerScreenFlash();
        if (navigator.vibrate) navigator.vibrate(50);
      } else {
        sfx.playMetalImpact(impulse);
        if (impulse > 80) {
          triggerScreenShake(Math.min(impulse * 0.04, 5), 0.12);
          if (navigator.vibrate) navigator.vibrate(25);
        }
      }

      const hitX = p1.x + nx * p1.radius;
      const hitY = p1.y + ny * p1.radius;

      particlesArr.push(new Particle(hitX, hitY, 0, 0, '#ffffff', false, true));

      const particleColor = isExtremeHit ? '#00d2d3' : '#fff200';
      for (let i = 0; i < (isExtremeHit ? 16 : 8); i++) {
        particlesArr.push(new Particle(
          hitX, hitY,
          (Math.random() - 0.5) * 400,
          (Math.random() - 0.5) * 400,
          particleColor
        ));
      }
    }
  }
}
