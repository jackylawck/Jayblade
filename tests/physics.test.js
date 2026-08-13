/**
 * @file physics.test.js
 * @description Automated Unit Test Suite for Jayblade 3D Physics Core.
 */

import { PARTS_PHYSICS } from '../js/engine3d.js';

describe('Jayblade 3D Physics & Combo Unit Tests', () => {
    test('Verify all 8 Crown Blades have valid physical metrics', () => {
        const crowns = Object.keys(PARTS_PHYSICS.CROWN);
        expect(crowns.length).toBe(8);
        crowns.forEach(key => {
            const part = PARTS_PHYSICS.CROWN[key];
            expect(part.mass).toBeGreaterThan(0.03);
            expect(part.radius).toBeGreaterThan(0.8);
            expect(part.burstResist).toBeGreaterThanOrEqual(100);
        });
    });

    test('Verify all 8 Bit Tips have friction and angular damping metrics', () => {
        const tips = Object.keys(PARTS_PHYSICS.TIP);
        expect(tips.length).toBe(8);
        tips.forEach(key => {
            const tip = PARTS_PHYSICS.TIP[key];
            expect(tip.friction).toBeGreaterThan(0);
            expect(tip.angularDamping).toBeGreaterThan(0);
        });
    });
});
