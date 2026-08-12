export class PerformanceConfig {
    static getSettings() {
        const dpr = window.devicePixelRatio || 1;
        const cores = navigator.hardwareConcurrency || 4;
        const isLowEnd = dpr < 1.5 || cores <= 4;

        return {
            shadowMapSize: isLowEnd ? 512 : 2048,
            particleCount: isLowEnd ? 250 : 600,
            subSteps: isLowEnd ? 2 : 3,
            enableAntiAlias: !isLowEnd
        };
    }
}
