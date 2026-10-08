import { _decorator, Camera, Color, Component, MeshRenderer, Vec3, randomRange } from 'cc';
import { BillboardBatch } from '../render/BillboardBatch';
import { ParticlePool } from '../render/ParticlePool';
const { ccclass, property, requireComponent } = _decorator;

const reflected = new Vec3();
const scatter = new Vec3();
const velocity = new Vec3();

@ccclass('LiquidSpray')
@requireComponent(MeshRenderer)
export class LiquidSpray extends Component {
    @property(Camera)
    camera: Camera = null;

    @property
    capacity = 640;

    @property
    gravity = 9.8;

    @property
    drag = 1.4;

    @property
    floorHeight = 0;

    @property
    splashSpeed = 2.8;

    @property
    minSize = 0.025;

    @property
    maxSize = 0.065;

    @property(Color)
    tint = new Color(255, 255, 255, 255);

    private particles: ParticlePool;
    private batch: BillboardBatch;
    private meshRenderer: MeshRenderer;
    private readonly color = new Color();

    onLoad(): void {
        this.particles = new ParticlePool(this.capacity);
        this.batch = new BillboardBatch(this.capacity);
        this.meshRenderer = this.getComponent(MeshRenderer);
    }

    splash(point: Readonly<Vec3>, normal: Readonly<Vec3>, incoming: Readonly<Vec3>, count: number): void {
        const strength = Math.min(1, incoming.length() / 10);
        Vec3.scaleAndAdd(reflected, incoming, normal, -2 * Vec3.dot(incoming, normal));
        reflected.normalize();
        for (let i = 0; i < count; i++) {
            Vec3.random(scatter, randomRange(0.2, 0.7));
            Vec3.multiplyScalar(velocity, reflected, 0.5);
            Vec3.scaleAndAdd(velocity, velocity, normal, randomRange(0.3, 1));
            velocity.add(scatter).normalize().multiplyScalar(this.splashSpeed * strength * randomRange(0.35, 1));
            this.spawn(point.x + normal.x * 0.02, point.y + normal.y * 0.02, point.z + normal.z * 0.02, velocity, randomRange(0.25, 0.6));
        }
    }

    shed(position: Readonly<Vec3>, carrier: Readonly<Vec3>): void {
        Vec3.random(scatter, randomRange(0.3, 0.9));
        Vec3.scaleAndAdd(velocity, scatter, carrier, randomRange(0.8, 0.95));
        this.spawn(position.x, position.y, position.z, velocity, randomRange(0.4, 0.9));
    }

    update(dt: number): void {
        this.particles.step(dt, this.gravity, this.drag, this.floorHeight);
    }

    lateUpdate(): void {
        const particles = this.particles;
        this.batch.begin(this.camera.node);
        for (let i = 0; i < particles.count; i++) {
            const t = particles.progress(i);
            this.color.set(this.tint);
            this.color.a = this.tint.a * (1 - t * t);
            this.batch.add(particles.px[i], particles.py[i], particles.pz[i], particles.size[i] * (1 - t * 0.5), 0, this.color);
        }
        this.batch.end(this.meshRenderer);
    }

    private spawn(x: number, y: number, z: number, v: Readonly<Vec3>, life: number): void {
        this.particles.spawn(x, y, z, v.x, v.y, v.z, life, randomRange(this.minSize, this.maxSize));
    }
}
