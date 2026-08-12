export class EnergyTrackerUI {
    constructor(canvasId) {
        this.canvas = document.getElementById(canvasId);
        this.ctx = this.canvas.getContext('2d');
        this.history = [];
        this.maxPoints = 60;
    }

    recordAndDraw(currentKE, initialKE) {
        if (initialKE <= 0) return;
        const retention = Math.max(0, (currentKE / initialKE) * 100);
        this.history.push(retention);
        if (this.history.length > this.maxPoints) this.history.shift();

        const ctx = this.ctx;
        const w = this.canvas.width;
        const h = this.canvas.height;

        ctx.clearRect(0, 0, w, h);
        ctx.strokeStyle = '#2ecc71';
        ctx.lineWidth = 1.5;
        ctx.beginPath();

        this.history.forEach((val, i) => {
            const x = (i / (this.maxPoints - 1)) * w;
            const y = h - (val / 100) * (h - 6) - 3;
            if (i === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
        });
        ctx.stroke();
    }
}
