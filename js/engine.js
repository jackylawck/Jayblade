let CURRENT_PHYSICS_MODE = 'ARCADE';

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

  getPanner(x = 250) {
    if (!this.ctx || !this.ctx.createStereoPanner) return null;
    const panner = this.ctx.createStereoPanner();
    panner.pan.value = Math.max(-1.0, Math.min(1.0, (x - 250) / 250));
    return panner;
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

  playMetalImpact(impulse = 100, x = 250) {
    if (!this.ctx) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    const panner = this.getPanner(x);
    const freq = Math.min(200 + impulse * 3, 1100);
    const volume = Math.min(impulse / 180, 0.7);

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(freq, this.ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(60, this.ctx.currentTime + 0.08);
    gain.gain.setValueAtTime(volume, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.08);

    if (panner) {
      osc.connect(gain); gain.connect(panner); panner.connect(this.ctx.destination);
    } else {
      osc.connect(gain); gain.connect(this.ctx.destination);
    }
    osc.start();
    osc.stop(this.ctx.currentTime + 0.08);
  }

  playExtremeImpactSound(x = 250) {
    if (!this.ctx) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    const panner = this.getPanner(x);

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(350, this.ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(40, this.ctx.currentTime + 0.25);
    gain.gain.setValueAtTime(0.7, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.25);

    if (panner) {
      osc.connect(gain); gain.connect(panner); panner.connect(this.ctx.destination);
    } else {
      osc.connect(gain); gain.connect(this.ctx.destination);
    }
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
    osc.connect(gain); gain.connect(this.ctx.destination);
    osc.start(); osc.stop(this.ctx.currentTime + 0.15);
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
    osc.connect(gain); gain.connect(this.ctx.destination);
    osc.start(); osc.stop(this.ctx.currentTime + 0.35);
  }
}

const sfx = new SoundFX();

class Particle {
  constructor() { this.life = 0; }
  spawn(x, y, vx, vy, color, isDebris, isFlash) {
    this.x = x; this.y = y; this.vx = vx; this.vy = vy;
    this.color = color; this.isDebris = isDebris; this.isFlash = isFlash;
    this.radius = isFlash ? 22 : (isDebris ? (4 + Math.random() * 5) : (2 + Math.random() * 3));
    this.life = 1.0;
  }
  update(dt) {
    if (this.life <= 0) return;
    this.x += this.vx * dt; this.y += this.vy * dt;
    this.life -= dt * (this.isFlash ? 8.0 : (this.isDebris ? 1.5 : 3.0));
  }
  draw(ctx) {
    if (this.life <= 0) return;
    ctx.save();
    ctx.globalAlpha = Math.max(0, this.life);
    ctx.beginPath(); ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
    ctx.fillStyle = this.color; ctx.fill(); ctx.restore();
  }
}

class ParticlePool {
  constructor(size) { this.pool = Array.from({length: size}, () => new Particle()); }
  spawn(x, y, vx, vy, color, isDebris = false, isFlash = false) {
    const p = this.pool.find(p => p.life <= 0);
    if (p) p.spawn(x, y, vx, vy, color, isDebris, isFlash);
  }
  updateAndDraw(dt, ctx) {
    this.pool.forEach(p => { p.update(dt); p.draw(ctx); });
  }
}
const pPool = new ParticlePool(250);

class PhysicalTop {
  constructor(x, y, crownKey, tipKey, powerLevel, launchAngle, spinDir, name, customColor = null, isCpu = false, aiRate = 0.4) {
    const crown = PARTS_DATABASE.crowns[crownKey] || PARTS_DATABASE.crowns['wizard_arc'];
    const tip = PARTS_DATABASE.tips[tipKey] || PARTS_DATABASE.tips['dash_flat'];

    this.name = name || '火鷹飛龍';
    this.isCpu = isCpu;
    this.aiRate = aiRate;
    this.x = x; this.y = y;
    this.targetX = x; this.targetY = y;

    this.mass = crown.mass;
    this.radius = crown.radius;
    this.restitution = crown.restitution;
    this.liftAngle = crown.liftAngle || 0;
    this.burstResist = crown.burstResist || 0.8;
    this.attackPower = crown.attackPower || 1.0;

    this.color = customColor || crown.color;
    this.tip = tip;
    this.weightDist = crown.weightDist;

    this.spinDir = spinDir === 'LEFT' ? -1 : 1;

    const angleRad = (parseFloat(launchAngle) || 0) * (Math.PI / 180);
    const initialPower = powerLevel === 'HEAVY' ? 2500 : (powerLevel === 'LIGHT' ? 1200 : 1800);
    
    const angleBoostVelocity = Math.sin(angleRad) * 450;
    const randomAngleDir = Math.random() * Math.PI * 2;
    
    this.vx = Math.cos(randomAngleDir) * angleBoostVelocity;
    this.vy = Math.sin(randomAngleDir) * angleBoostVelocity;

    this.rpm = initialPower * Math.cos(angleRad * 0.5);
    this.angularVelocity = (this.rpm * Math.PI / 30) * this.spinDir;
    this.inertia = 0.5 * this.mass * Math.pow(this.radius, 2) * (0.5 + 0.5 * this.weightDist);

    this.angle = 0;
    this.tilt = angleRad;
    this.precessionAngle = Math.random() * Math.PI * 2;
    this.shatterHp = 100;

    this.trail = [];
    this.hasShatteredEffect = false;
    this.xdashCooldown = 0;
    this.isXDashing = false;
    this.lastHitWasExtreme = false;
    this.aiStateTimer = 0;
    this.aiState = 'ATTACK';
  }

  update(dt, arenaCenter, targetOpponent = null) {
    if (this.rpm <= 0 || this.shatterHp <= 0) return;
    if (this.xdashCooldown > 0) this.xdashCooldown -= dt;

    this.trail.push({ x: this.x, y: this.y, angle: this.angle });
    if (this.trail.length > 6) this.trail.shift();

    // 🌟 強化版碗狀坡度向心力 (Force Gravity towards Center Bowl Zone)
    const distToCenter = Math.hypot(this.x - arenaCenter.x, this.y - arenaCenter.y);
    if (distToCenter > 2) {
      const dirX = (arenaCenter.x - this.x) / distToCenter;
      const dirY = (arenaCenter.y - this.y) / distToCenter;
      // 指數型陡峭坡度，離外圍越近，下滑向心加速度越強大！
      const slopeRatio = Math.pow(distToCenter / arenaCenter.radius, 1.8);
      const bowlGravityPower = CURRENT_PHYSICS_MODE === 'ARCADE' ? 520 : 380;
      this.vx += dirX * slopeRatio * bowlGravityPower * dt;
      this.vy += dirY * slopeRatio * bowlGravityPower * dt;
    }

    if (CURRENT_PHYSICS_MODE === 'ARCADE') {
      const decay = this.tip.friction * 3.5;
      this.rpm -= decay * dt * 60;
      if (this.rpm < 0) this.rpm = 0;
      this.angularVelocity = (this.rpm * Math.PI / 30) * this.spinDir;

      const g = 9.8, distCM = 4, stabilityThreshold = 500;
      if (this.rpm > stabilityThreshold) {
        this.tilt *= 0.97;
      } else {
        this.tilt += (stabilityThreshold - this.rpm) * 0.000005 * dt;
      }
      if (this.rpm > 50 && this.tilt > 0.01) {
        const precessionRate = (this.mass * g * distCM) / (this.inertia * Math.max(1, Math.abs(this.angularVelocity)));
        this.precessionAngle += precessionRate * dt * 100 * this.spinDir;
        const wobbleOffset = Math.sin(this.tilt) * 12;
        this.vx += Math.cos(this.precessionAngle) * wobbleOffset * dt;
        this.vy += Math.sin(this.precessionAngle) * wobbleOffset * dt;
      }
    } else {
      const currentOmega = Math.abs(this.angularVelocity);
      const airResistance = 0.00003, bearingFriction = 0.05;
      const alpha = -(bearingFriction * currentOmega) - (airResistance * Math.pow(currentOmega, 2));
      
      const newOmega = currentOmega + alpha * dt;
      this.rpm = Math.max(0, (newOmega * 30) / Math.PI);
      this.angularVelocity = (this.rpm * Math.PI / 30) * this.spinDir;

      const g = 9.8, distCM = 4;
      const gravityTorque = this.mass * g * distCM;
      const criticalOmega = Math.sqrt((4 * gravityTorque * this.inertia) / Math.pow(this.inertia, 2));

      if (currentOmega > criticalOmega * 1.5) {
        this.tilt *= (1 - 0.05 * dt);
      } else {
        const nutationFreq = currentOmega * 0.4;
        const nutationAmp = (criticalOmega * 1.5 - currentOmega) * 0.002;
        this.tilt += 0.00015 * dt * (criticalOmega * 1.5 - currentOmega);
        
        const instantTilt = this.tilt + Math.abs(Math.cos(Date.now() * nutationFreq * 0.001)) * nutationAmp;
        const precessionRate = gravityTorque / (this.inertia * Math.max(1, currentOmega));
        this.precessionAngle += precessionRate * dt * 80 * this.spinDir;

        const wobbleX = Math.cos(this.precessionAngle) * Math.sin(instantTilt) * 20;
        const wobbleY = Math.sin(this.precessionAngle) * Math.sin(instantTilt) * 20;
        this.vx += wobbleX * dt;
        this.vy += wobbleY * dt;
      }
    }

    if (this.isCpu && targetOpponent && targetOpponent.shatterHp > 0) {
      this.aiStateTimer += dt;
      if (this.aiStateTimer > 1.2) {
        this.aiStateTimer = 0;
        const rand = Math.random();
        if (rand < 0.5) this.aiState = 'ATTACK';
        else if (rand < 0.8) this.aiState = 'FLANK'; 
        else this.aiState = 'FEINT';                 
      }

      const dx = targetOpponent.x - this.x;
      const dy = targetOpponent.y - this.y;

      if (this.aiState === 'ATTACK') {
        this.vx += dx * (this.aiRate * 1.2) * dt;
        this.vy += dy * (this.aiRate * 1.2) * dt;
      } else if (this.aiState === 'FLANK') {
        const toOuterX = (arenaCenter.x - this.x) * -0.8;
        const toOuterY = (arenaCenter.y - this.y) * -0.8;
        this.vx += toOuterX * dt;
        this.vy += toOuterY * dt;
      } else if (this.aiState === 'FEINT') {
        this.vx -= dx * 0.5 * dt;
        this.vy -= dy * 0.5 * dt;
      }
    }

    if (this.tip.shape === 'FLAT' && this.rpm > 150) {
      const moveAngle = this.angle + (Math.PI / 2) * this.spinDir;
      this.vx += Math.cos(moveAngle) * (this.tip.moveForce * 1.2) * dt;
      this.vy += Math.sin(moveAngle) * (this.tip.moveForce * 1.2) * dt;
    } else if (this.tip.shape === 'PINPOINT') {
      this.vx *= 0.96; this.vy *= 0.96;
    } else if (this.tip.shape === 'BALL') {
      this.vx *= 0.975; this.vy *= 0.975;
    } else if (this.tip.shape === 'SEMIFLAT' || this.tip.shape === 'TAPER' || this.tip.shape === 'ORB') {
      if (this.rpm > 1200) {
        const moveAngle = this.angle + (Math.PI / 2) * this.spinDir;
        this.vx += Math.cos(moveAngle) * (this.tip.moveForce * 0.9) * dt;
        this.vy += Math.sin(moveAngle) * (this.tip.moveForce * 0.9) * dt;
      } else {
        this.vx *= 0.97; this.vy *= 0.97;
      }
    }

    const railInner = 180, railOuter = 228;
    if (distToCenter > railInner && distToCenter < railOuter && this.rpm > 200) {
      this.isXDashing = true;
      const rx = (arenaCenter.x - this.x) / distToCenter;
      const ry = (arenaCenter.y - this.y) / distToCenter;
      const tx = -ry * this.spinDir;
      const ty = rx * this.spinDir;

      const boostPower = CURRENT_PHYSICS_MODE === 'ARCADE' ? (280 + (this.rpm / 2200) * 400) : (200 + (this.rpm / 2200) * 250);
      this.vx += tx * boostPower * dt;
      this.vy += ty * boostPower * dt;
      this.rpm -= 1.5 * dt * 60;

      if (this.xdashCooldown <= 0) {
        sfx.playXDash();
        this.xdashCooldown = 0.18;
      }
      for (let i = 0; i < 4; i++) {
        pPool.spawn(
          this.x + (Math.random() - 0.5) * 15, this.y + (Math.random() - 0.5) * 15,
          (Math.random() - 0.5) * 200, (Math.random() - 0.5) * 200, '#00d2d3'
        );
      }
    } else {
      this.isXDashing = false;
    }

    this.x += this.vx * dt;
    this.y += this.vy * dt;
    this.angle += this.angularVelocity * dt;

    if (this.tilt > 1.8) {
      this.shatterHp = 0;
      this.rpm = 0;
    }

    const maxRadius = arenaCenter.radius - this.radius;
    if (distToCenter > maxRadius) {
      const nx = (this.x - arenaCenter.x) / distToCenter;
      const ny = (this.y - arenaCenter.y) / distToCenter;
      
      this.x = arenaCenter.x + nx * maxRadius;
      this.y = arenaCenter.y + ny * maxRadius;

      const vn = this.vx * nx + this.vy * ny;
      if (vn > 0) {
        this.vx -= (1 + 0.85) * vn * nx;
        this.vy -= (1 + 0.85) * vn * ny;
        sfx.playMetalImpact(70, this.x);
        for (let i = 0; i < 3; i++) {
          pPool.spawn(this.x + nx * this.radius, this.y + ny * this.radius, (Math.random() - 0.5) * 150, (Math.random() - 0.5) * 150, '#ff9f43');
        }
      }
    }
  }

  triggerShatterEffect() {
    if (this.hasShatteredEffect) return;
    this.hasShatteredEffect = true;
    sfx.playShatter();
    triggerScreenShake(10, 0.35);

    for (let i = 0; i < 22; i++) {
      pPool.spawn(this.x, this.y, (Math.random() - 0.5) * 500, (Math.random() - 0.5) * 500, this.color, true);
    }
  }

  getDebugData() {
    return `<b>${this.name}</b><br>
    旋轉: ${this.spinDir === 1 ? '右旋' : '左旋'}<br>
    RPM: ${Math.round(this.rpm)}<br>
    速度: ${Math.round(Math.hypot(this.vx, this.vy))}<br>
    爆抗性: ${Math.round(this.burstResist * 100)}%<br>
    耐久: ${Math.round(this.shatterHp)} HP`;
  }

  draw(ctx) {
    if (this.shatterHp <= 0) return;
    this.trail.forEach((t, index) => {
      const alpha = (index + 1) / (this.trail.length * 3);
      ctx.save(); ctx.translate(t.x, t.y); ctx.rotate(t.angle);
      ctx.beginPath(); ctx.arc(0, 0, this.radius, 0, Math.PI * 2);
      ctx.fillStyle = this.color; ctx.globalAlpha = alpha; ctx.fill(); ctx.restore();
    });

    ctx.save(); ctx.translate(this.x, this.y); ctx.rotate(this.angle);
    ctx.beginPath(); ctx.arc(0, 0, this.radius, 0, Math.PI * 2);
    ctx.fillStyle = this.color; ctx.fill();
    ctx.strokeStyle = '#fff'; ctx.lineWidth = 3; ctx.stroke();
    
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(this.radius, 0);
    ctx.strokeStyle = '#000'; ctx.lineWidth = 2.5; ctx.stroke();

    ctx.beginPath();
    ctx.arc(0, 0, 10, 0, Math.PI * 2);
    ctx.fillStyle = '#ffcc00'; ctx.fill(); ctx.strokeStyle = '#000'; ctx.lineWidth = 1.5; ctx.stroke();
    ctx.fillStyle = '#000'; ctx.font = 'bold 10px Arial';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(this.spinDir === 1 ? 'R' : 'L', 0, 1);
    ctx.restore();
  }
}

function resolveAdvancedCollision(p1, p2) {
  const dx = p2.x - p1.x;
  const dy = p2.y - p1.y;
  const dist = Math.hypot(dx, dy);
  const overlap = (p1.radius + p2.radius) - dist;

  if (overlap > 0) {
    const nx = dx / dist;
    const ny = dy / dist;

    const slop = 0.05;
    const percent = 0.8;
    const correction = Math.max(overlap - slop, 0) / ((1 / p1.mass) + (1 / p2.mass)) * percent;
    const cx = nx * correction;
    const cy = ny * correction;
    p1.x -= cx / p1.mass; p1.y -= cy / p1.mass;
    p2.x += cx / p2.mass; p2.y += cy / p2.mass;

    const tx = -ny, ty = nx;
    const kx = p1.vx - p2.vx;
    const ky = p1.vy - p2.vy;
    const normalVel = kx * nx + ky * ny;

    if (normalVel > 0) {
      const isOppositeSpin = (p1.spinDir !== p2.spinDir);

      let e = CURRENT_PHYSICS_MODE === 'ARCADE' ? 1.0 : 0.85;
      if (CURRENT_PHYSICS_MODE === 'REALISTIC') {
        const relSpeed = Math.abs(normalVel);
        e = Math.max(0.4, 0.85 - (relSpeed / 1200) * 0.45);
      }

      const impulse = ((1 + e) * normalVel) / ((1 / p1.mass) + (1 / p2.mass));

      const liftForceP1 = impulse * p1.liftAngle;
      const liftForceP2 = impulse * p2.liftAngle;

      p1.vx -= (impulse / p1.mass) * nx;
      p1.vy -= (impulse / p1.mass) * ny;
      p2.vx += (impulse / p2.mass) * nx;
      p2.vy += (impulse / p2.mass) * ny;

      if (liftForceP1 > 0) { p2.vx += nx * liftForceP1 * 1.5; p2.vy += ny * liftForceP1 * 1.5; }
      if (liftForceP2 > 0) { p1.vx -= nx * liftForceP2 * 1.5; p1.vy -= ny * liftForceP2 * 1.5; }

      const tangVel = kx * tx + ky * ty;
      const tangImpulse = tangVel * 0.2;
      p1.vx -= (tangImpulse / p1.mass) * tx;
      p1.vy -= (tangImpulse / p1.mass) * ty;
      p2.vx += (tangImpulse / p2.mass) * tx;
      p2.vy += (tangImpulse / p2.mass) * ty;

      if (isOppositeSpin) {
        const rpmDiff = p1.rpm - p2.rpm;
        const stealAmount = rpmDiff * 0.12;
        p1.rpm -= stealAmount;
        p2.rpm += stealAmount;
      } else {
        const rpmDamage = CURRENT_PHYSICS_MODE === 'ARCADE' ? 0.08 : 0.4;
        p1.rpm -= impulse * rpmDamage;
        p2.rpm -= impulse * rpmDamage;
      }

      const baseHpDamage = CURRENT_PHYSICS_MODE === 'ARCADE' ? 0.003 : 0.02;
      const p1ShatterDamage = impulse * baseHpDamage * (p2.attackPower / p1.burstResist);
      const p2ShatterDamage = impulse * baseHpDamage * (p1.attackPower / p2.burstResist);

      p1.shatterHp -= p1ShatterDamage;
      p2.shatterHp -= p2ShatterDamage;

      const hitX = p1.x + nx * p1.radius;
      const hitY = p1.y + ny * p1.radius;

      const isExtremeHit = p1.isXDashing || p2.isXDashing;
      if (p1.isXDashing) p1.lastHitWasExtreme = true;
      if (p2.isXDashing) p2.lastHitWasExtreme = true;

      if (isExtremeHit) {
        sfx.playExtremeImpactSound(hitX);
        triggerScreenShake(12, 0.22);
        triggerScreenFlash();
        if (navigator.vibrate) navigator.vibrate(50);
      } else {
        sfx.playMetalImpact(impulse, hitX);
        if (impulse > 80) {
          triggerScreenShake(Math.min(impulse * 0.04, 5), 0.12);
          if (navigator.vibrate) navigator.vibrate(25);
        }
      }

      pPool.spawn(hitX, hitY, 0, 0, '#ffffff', false, true);
      const particleColor = isExtremeHit ? '#00d2d3' : (isOppositeSpin ? '#9b59b6' : '#fff200');
      for (let i = 0; i < (isExtremeHit ? 16 : 8); i++) {
        pPool.spawn(hitX, hitY, (Math.random() - 0.5) * 400, (Math.random() - 0.5) * 400, particleColor);
      }
    }
  }
}
