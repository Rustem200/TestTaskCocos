import { Color, Vec3 } from 'cc';
import { DynamicMeshBuffer } from './DynamicMeshBuffer';

const STRIDE = 6;
const previous = new Vec3();
const next = new Vec3();
const center = new Vec3();
const tangent = new Vec3(0, 0, -1);
const binormal = new Vec3();
const radial = new Vec3();
const vertex = new Vec3();

export class TubeMesher {
    private readonly points: Float32Array;
    private readonly frameNormal = new Vec3();
    private count = 0;

    constructor(readonly segments: number, readonly maxPoints: number) {
        this.points = new Float32Array(maxPoints * STRIDE);
    }

    get pointCount(): number {
        return this.count;
    }

    addPoint(position: Readonly<Vec3>, radius: number, v: number, alpha = 1): void {
        if (this.count >= this.maxPoints) {
            return;
        }
        const o = this.count++ * STRIDE;
        this.points[o] = position.x;
        this.points[o + 1] = position.y;
        this.points[o + 2] = position.z;
        this.points[o + 3] = radius;
        this.points[o + 4] = v;
        this.points[o + 5] = alpha;
    }

    build(buffer: DynamicMeshBuffer, color: Readonly<Color>, startScale = 1, endScale = 1): void {
        const count = this.count;
        this.count = 0;
        const ring = this.segments + 1;
        if (count < 2 || !buffer.hasRoom(count * ring, (count - 1) * this.segments * 6)) {
            return;
        }

        const first = buffer.vertexCount;
        for (let i = 0; i < count; i++) {
            this.readPoint(Math.max(i - 1, 0), previous);
            this.readPoint(Math.min(i + 1, count - 1), next);
            this.readPoint(i, center);
            Vec3.subtract(radial, next, previous);
            if (radial.lengthSqr() > 1e-10) {
                Vec3.normalize(tangent, radial);
            }
            this.updateFrame(i === 0);
            Vec3.cross(binormal, tangent, this.frameNormal);

            const o = i * STRIDE;
            const scale = i === 0 ? startScale : i === count - 1 ? endScale : 1;
            const radius = this.points[o + 3] * scale;
            for (let j = 0; j < ring; j++) {
                const angle = (j / this.segments) * Math.PI * 2;
                Vec3.multiplyScalar(radial, this.frameNormal, Math.cos(angle));
                Vec3.scaleAndAdd(radial, radial, binormal, Math.sin(angle));
                Vec3.scaleAndAdd(vertex, center, radial, radius);
                buffer.addVertex(vertex, radial, j / this.segments, this.points[o + 4], color, this.points[o + 5]);
            }
        }

        for (let i = 0; i < count - 1; i++) {
            for (let j = 0; j < this.segments; j++) {
                const a = first + i * ring + j;
                const c = a + ring;
                buffer.addTriangle(a, a + 1, c);
                buffer.addTriangle(a + 1, c + 1, c);
            }
        }
    }

    private readPoint(index: number, out: Vec3): void {
        const o = index * STRIDE;
        out.set(this.points[o], this.points[o + 1], this.points[o + 2]);
    }

    private updateFrame(restart: boolean): void {
        const normal = this.frameNormal;
        if (!restart) {
            Vec3.scaleAndAdd(normal, normal, tangent, -Vec3.dot(normal, tangent));
        }
        if (restart || normal.lengthSqr() < 1e-6) {
            Vec3.cross(normal, tangent, Math.abs(tangent.y) < 0.99 ? Vec3.UP : Vec3.RIGHT);
        }
        normal.normalize();
    }
}
