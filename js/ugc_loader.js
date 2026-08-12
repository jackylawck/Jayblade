// js/ugc_loader.js - 強化版 STL 檔案標頭與格式檢查

export class UGCModelEngine {
    constructor(scene) {
        this.scene = scene;
    }

    /**
     * 解析 STL 檔案 (包含檔頭安全性與格式檢測)
     */
    parseSTL(arrayBuffer) {
        // 1. 檔案頭格式校驗
        const header = new TextDecoder().decode(arrayBuffer.slice(0, 80));
        const isAscii = header.startsWith('solid');
        const isBinary = arrayBuffer.byteLength > 84;

        if (!isAscii && !isBinary) {
            throw new Error('無效的 STL 檔案頭格式 (Invalid STL Header)');
        }

        const dataView = new DataView(arrayBuffer);
        const trianglesCount = dataView.getUint32(80, true);
        
        // 檢查數據長度與三角形數量是否相符 (預防畸形 Stream)
        const expectedByteLength = 84 + trianglesCount * 50;
        if (isBinary && arrayBuffer.byteLength < expectedByteLength) {
            throw new Error('STL 檔案數據長度不足或損毀 (Corrupted Data Stream)');
        }

        const geometry = new THREE.BufferGeometry();
        const positions = new Float32Array(trianglesCount * 9);
        let offset = 84;

        for (let i = 0; i < trianglesCount; i++) {
            offset += 12; // 跳過法向量 (12 bytes)

            for (let j = 0; j < 9; j++) {
                positions[i * 9 + j] = dataView.getFloat32(offset, true);
                offset += 4;
            }
            offset += 2; // 跳過屬性位元組
        }

        geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        geometry.computeVertexNormals();
        geometry.center();
        return geometry;
    }

    /**
     * 計算自訂 3D 幾何體的物理屬性
     */
    calculatePhysicalProperties(geometry, targetMass = 0.045) {
        geometry.computeBoundingBox();
        const bbox = geometry.boundingBox;
        const size = new THREE.Vector3();
        bbox.getSize(size);

        const radius = Math.max(size.x, size.z) / 2;
        const height = size.y;

        const I_z = 0.5 * targetMass * Math.pow(radius, 2);
        const I_xy = (1 / 12) * targetMass * (3 * Math.pow(radius, 2) + Math.pow(height, 2));

        return {
            mass: targetMass,
            radius: radius,
            height: height,
            inertiaTensor: { I_xy, I_z },
            burstResist: Math.min(0.98, Math.max(0.6, 0.8 + (targetMass - 0.045) * 5))
        };
    }
}
