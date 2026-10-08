import { _decorator, Color, Component, MeshRenderer, Vec3 } from 'cc';
import { DynamicMeshBuffer } from '../render/DynamicMeshBuffer';
import { damp } from '../utils/MathUtils';
const { ccclass, property, requireComponent } = _decorator;

const center = new Vec3();
const axisX = new Vec3();
const axisY = new Vec3();

class Puddle {
    readonly position = new Vec3();
    radius = 0;
    targetRadius = 0;
    wetness = 0;
    dryTimer = 0;
    angle = 0;
    active = false;
}

@ccclass('PuddleField')
@requireComponent(MeshRenderer)
export class PuddleField extends Component {
    @property
    capacity = 48;

    @property
    maxHeight = 0.1;

    @property
    surfaceOffset = 0.012;

    @property
    startRadius = 0.3;

    @property
    maxRadius = 1.6;

    @property
    areaPerSplash = 0.02;

    @property
    mergeMargin = 0.3;

    @property
    dryDelay = 3;

    @property
    dryRate = 0.1;

    @property
    growSharpness = 5;

    @property(Color)
    tint = new Color(255, 255, 255, 255);

    private puddles: Puddle[] = [];
    private buffer: DynamicMeshBuffer;
    private meshRenderer: MeshRenderer;
    private readonly color = new Color();

    onLoad(): void {
        for (let i = 0; i < this.capacity; i++) {
            this.puddles.push(new Puddle());
        }
        this.buffer = new DynamicMeshBuffer(this.capacity * 4, this.capacity * 6);
        this.meshRenderer = this.getComponent(MeshRenderer);
    }

    addSplash(point: Readonly<Vec3>, normal: Readonly<Vec3>): void {
        if (normal.y < 0.7 || point.y > this.maxHeight) {
            return;
        }
        const puddle = this.findNear(point) ?? this.allocate(point);
        const area = Math.PI * puddle.targetRadius * puddle.targetRadius;
        const pull = this.areaPerSplash / (area + this.areaPerSplash);
        puddle.position.x += (point.x - puddle.position.x) * pull;
        puddle.position.z += (point.z - puddle.position.z) * pull;
        puddle.targetRadius = Math.min(this.maxRadius, Math.sqrt((area + this.areaPerSplash) / Math.PI));
        puddle.wetness = Math.min(1, puddle.wetness + 0.06);
        puddle.dryTimer = 0;
    }

    update(dt: number): void {
        for (const puddle of this.puddles) {
            if (!puddle.active) {
                continue;
            }
            puddle.radius = damp(puddle.radius, puddle.targetRadius, this.growSharpness, dt);
            puddle.dryTimer += dt;
            if (puddle.dryTimer > this.dryDelay) {
                puddle.wetness -= this.dryRate * dt;
                puddle.active = puddle.wetness > 0;
            }
        }
    }

    lateUpdate(): void {
        this.buffer.clear();
        for (const puddle of this.puddles) {
            if (!puddle.active) {
                continue;
            }
            const radius = puddle.radius * (0.6 + 0.4 * puddle.wetness);
            const cos = Math.cos(puddle.angle) * radius;
            const sin = Math.sin(puddle.angle) * radius;
            axisX.set(cos, 0, sin);
            axisY.set(sin, 0, -cos);
            center.set(puddle.position.x, puddle.position.y + this.surfaceOffset, puddle.position.z);
            this.color.set(this.tint);
            this.color.a = this.tint.a * Math.min(1, puddle.wetness * 1.5);
            this.buffer.addQuad(center, axisX, axisY, Vec3.UP, this.color);
        }
        this.buffer.upload(this.meshRenderer);
    }

    private findNear(point: Readonly<Vec3>): Puddle | null {
        let best: Puddle | null = null;
        let bestDistance = Infinity;
        for (const puddle of this.puddles) {
            if (!puddle.active) {
                continue;
            }
            const dx = point.x - puddle.position.x;
            const dz = point.z - puddle.position.z;
            const distance = Math.sqrt(dx * dx + dz * dz);
            if (distance < puddle.targetRadius + this.mergeMargin && distance < bestDistance) {
                best = puddle;
                bestDistance = distance;
            }
        }
        return best;
    }

    private allocate(point: Readonly<Vec3>): Puddle {
        let puddle = this.puddles.find((candidate) => !candidate.active);
        if (!puddle) {
            puddle = this.puddles.reduce((driest, candidate) => (candidate.wetness < driest.wetness ? candidate : driest));
        }
        puddle.position.set(point);
        puddle.radius = 0;
        puddle.targetRadius = this.startRadius;
        puddle.wetness = 0.3;
        puddle.dryTimer = 0;
        puddle.angle = Math.random() * Math.PI * 2;
        puddle.active = true;
        return puddle;
    }
}
