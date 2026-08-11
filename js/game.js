// 升級版勝負與分數判定系統
function mainGameLoop(now) {
  const dt = Math.min((now - lastTime) / 1000, 0.05);
  lastTime = now;

  frameCount++;
  if (now - lastFpsUpdate > 1000) {
    document.getElementById('fps-counter').innerText = frameCount;
    frameCount = 0;
    lastFpsUpdate = now;
  }

  p1.update(dt, arenaCenter, particles, p2);
  p2.update(dt, arenaCenter, particles, p1);

  [p1, p2].forEach(top => {
    top.vx += (arenaCenter.x - top.x) * 0.25 * dt;
    top.vy += (arenaCenter.y - top.y) * 0.25 * dt;
  });

  resolveAdvancedCollision(p1, p2, particles);

  for (let i = particles.length - 1; i >= 0; i--) {
    particles[i].update(dt);
    if (particles[i].life <= 0) particles.splice(i, 1);
  }

  // 1. 畫面渲染 + 畫面震動 & 多巴胺閃光效果
  ctx.save();
  if (screenShakeTime > 0) {
    screenShakeTime -= dt;
    const offsetX = (Math.random() - 0.5) * screenShakeIntensity;
    const offsetY = (Math.random() - 0.5) * screenShakeIntensity;
    ctx.translate(offsetX, offsetY);
  }

  ctx.drawImage(offscreenCanvas, 0, 0);
  particles.forEach(p => p.draw(ctx));
  p1.draw(ctx);
  p2.draw(ctx);

  // 畫面極限閃光 (Flash)
  if (screenFlashAlpha > 0) {
    screenFlashAlpha -= dt * 2.5;
    ctx.fillStyle = `rgba(255, 255, 255, ${Math.max(0, screenFlashAlpha)})`;
    ctx.fillRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);
  }

  ctx.restore();

  // 更新 Debug 面板
  if (isDebugVisible) {
    document.getElementById('p1-debug').innerHTML = p1.getDebugData();
    document.getElementById('p2-debug').innerHTML = p2.getDebugData();
  }

  const statusBar = document.getElementById('status-bar');
  const d1 = Math.hypot(p1.x - arenaCenter.x, p1.y - arenaCenter.y);
  const d2 = Math.hypot(p2.x - arenaCenter.x, p2.y - arenaCenter.y);

  // 2. 官方得分判定系統 (Beyblade X Official Scoring)
  if (!matchEnded) {
    // A. Extreme Finish (極限勝出 - 3 分)
    if (d1 > arenaCenter.radius && p2.lastHitWasExtreme) {
      statusBar.innerText = `💥⚡ EXTREME FINISH! (3分) ${p2.name} 以極限衝撞強行淘汰 ${p1.name}！`;
      updateWinStats(false);
      matchEnded = true;
      sfx.stopBGM();
    } else if (d2 > arenaCenter.radius && p1.lastHitWasExtreme) {
      statusBar.innerText = `💥⚡ EXTREME FINISH! (3分) ${p1.name} 發動極速 X-Dash 取得 3 分！`;
      updateWinStats(true, true);
      matchEnded = true;
      sfx.stopBGM();
    } 
    // B. Over Finish (擊出場外勝 - 2 分)
    else if (d1 > arenaCenter.radius) {
      statusBar.innerText = `🚨 OVER FINISH! (2分) ${p2.name} 將對手擊出場外！`;
      updateWinStats(false);
      matchEnded = true;
      sfx.stopBGM();
    } else if (d2 > arenaCenter.radius) {
      statusBar.innerText = `🚨 OVER FINISH! (2分) ${p1.name} 將對手擊出場外！`;
      updateWinStats(true, false);
      matchEnded = true;
      sfx.stopBGM();
    } 
    // C. Burst / Shatter Finish (崩解勝 - 2 分)
    else if (p1.shatterHp <= 0) {
      p1.triggerShatterEffect(particles);
      statusBar.innerText = `💥 BURST FINISH! (2分) ${p1.name} 承受強烈衝擊崩解！${p2.name} 勝出！`;
      updateWinStats(false);
      matchEnded = true;
      sfx.stopBGM();
    } else if (p2.shatterHp <= 0) {
      p2.triggerShatterEffect(particles);
      statusBar.innerText = `💥 BURST FINISH! (2分) ${p2.name} 承受強烈衝擊崩解！${p1.name} 勝出！`;
      updateWinStats(true, false);
      matchEnded = true;
      sfx.stopBGM();
    } 
    // D. Spin Finish (持久勝 - 1 分)
    else if (p1.rpm <= 0 && p2.rpm <= 0) {
      const isP1Win = p1.rpm > p2.rpm;
      statusBar.innerText = isP1Win 
        ? `🌀 SPIN FINISH! (1分) ${p1.name} 以自轉持久力勝出！` 
        : `🌀 SPIN FINISH! (1分) ${p2.name} 以自轉持久力勝出！`;
      updateWinStats(isP1Win, false);
      matchEnded = true;
      sfx.stopBGM();
    } else {
      statusBar.innerText = `${p1.name}: ${Math.round(p1.rpm)} RPM | ${p2.name}: ${Math.round(p2.rpm)} RPM`;
    }
  }

  if (!matchEnded) {
    animationId = requestAnimationFrame(mainGameLoop);
  } else {
    animationId = null;
  }
}
