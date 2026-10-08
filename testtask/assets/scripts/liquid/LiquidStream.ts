import { _decorator, Color, Component, MeshRenderer, Node, PhysicsRayResult, Vec3, geometry, randomRange } from 'cc';
import { DynamicMeshBuffer } from '../render/DynamicMeshBuffer';
import { TubeMesher } from '../render/TubeMesher';
import { raycastIgnoring } from '../utils/Raycast';
import { LiquidImpact } from './LiquidImpact';
import { LiquidReceiver } from './LiquidReceiver';
import { LiquidSpray } from './LiquidSpray';
import { PuddleField } from './PuddleField';
const { ccclass, property, requireComponent, executionOrder } = _decorator;

const DEAD = 0;
const FLYING = 1;
const LANDED = 2;
const TIP_SCALE = 0.35;

const ray = new geometry.Ray();
const position = new Vec3();
const previous = new Vec3();
const velocity = new Vec3();
const direction = new Vec3();
const jitter = new Vec3();
const leverArm = new Vec3();
const impulse = new Vec3();

@ccclass('LiquidStream')
@requireComponent(MeshRenderer)
@executionOrder(100)
export class LiquidStream extends Component {
    static readonly IMPACT = 'liquid-impact';

    @property(LiquidSpray)
    spray: LiquidSpray = null;

    @property(PuddleField)
    puddles: PuddleField = null;

    @property(Node)
    owner: Node = null;

    @property
    capacity = 320;

    @property
    gravity = 9.8;

    @property
    lifetime = 2.5;

    @property
    nozzleRadius = 0.055;

    @property
    spreadRate = 0.07;

    @property
    spread = 0.012;

    @property
    wobble = 0.004;

    @property
    radialSegments = 8;

    @property
    maxLinkDistance = 1.2;

    @property
    impactForce = 0.12;

    @property
    splashDroplets = 3;

    @property
    breakupRate = 1.2;

    @property
    flowScale = 4;

    @property(Color)
    tint = new Color(255, 255, 255, 255);

    private px: Float32Array;
    private py: Float32Array;
    private pz: Float32Array;
    private vx: Float32Array;
    private vy: Float32Array;
    private vz: Float32Array;
    private age: Float32Array;
    private life: Float32Array;
    private born: Float32Array;
    private seed: Float32Array;
    private state: Uint8Array;
    private chainOf: Uint32Array;
    private head = 0;
    private count = 0;

    private nozzleOpen = false;
    private chain = 0;
    private emitBudget = 0;
    private nozzleSpeed = 0;
    private nozzleRate = 0;
    private time = 0;
    private readonly nozzlePosition = new Vec3();
    private readonly nozzleDirection = new Vec3();
    private readonly lastNozzlePosition = new Vec3();
    private readonly lastNozzleDirection = new Vec3();

    private buffer: DynamicMeshBuffer;
    private tube: TubeMesher;
    private meshRenderer: MeshRenderer;
    private readonly impact: LiquidImpact = { point: new Vec3(), normal: new Vec3(), velocity: new Vec3(), collider: null };

    onLoad(): void {
        const n = this.capacity;
        this.px = new Float32Array(n);
        this.py = new Float32Array(n);
        this.pz = new Float32Array(n);
        this.vx = new Float32Array(n);
        this.vy = new Float32Array(n);
        this.vz = new Float32Array(n);
        this.age = new Float32Array(n);
        this.life = new Float32Array(n);
        this.born = new Float32Array(n);
        this.seed = new Float32Array(n);
        this.state = new Uint8Array(n);
        this.chainOf = new Uint32Array(n);

        const ring = this.radialSegments + 1;
        this.tube = new TubeMesher(this.radialSegments, n + 1);
        this.buffer = new DynamicMeshBuffer((n + 8) * ring, n * this.radialSegments * 6);
        this.meshRenderer = this.getComponent(MeshRenderer);
    }

    openNozzle(origin: Readonly<Vec3>, aim: Readonly<Vec3>, speed: number, rate: number): void {
        if (!this.nozzleOpen) {
            this.nozzleOpen = true;
            this.chain++;
            this.emitBudget = 1;
            this.lastNozzlePosition.set(origin);
            this.lastNozzleDirection.set(aim);
        }
        this.nozzlePosition.set(origin);
        this.nozzleDirection.set(aim);
        this.nozzleSpeed = speed;
        this.nozzleRate = rate;
    }

    closeNozzle(): void {
        this.nozzleOpen = false;
    }

    lateUpdate(dt: number): void {
        this.time += dt;
        this.simulate(dt);
        if (this.nozzleOpen) {
            this.emit(dt);
        }
        this.trimTail();
        this.rebuildMesh();
    }

    private indexAt(order: number): number {
        return (this.head - this.count + order + this.capacity) % this.capacity;
    }

    private simulate(dt: number): void {
        for (let order = 0; order < this.count; order++) {
            const i = this.indexAt(order);
            if (this.state[i] === LANDED) {
                this.state[i] = DEAD;
            }
            if (this.state[i] !== FLYING) {
                continue;
            }
            this.age[i] += dt;
            if (this.age[i] >= this.life[i]) {
                this.state[i] = DEAD;
                continue;
            }
            this.vy[i] -= this.gravity * dt;
            this.advance(i, dt);
            this.breakUp(i, dt);
        }
    }

    private advance(i: number, dt: number): void {
        previous.set(this.px[i], this.py[i], this.pz[i]);
        velocity.set(this.vx[i], this.vy[i], this.vz[i]);
        const distance = velocity.length() * dt;
        if (distance < 1e-5) {
            return;
        }
        ray.o.set(previous);
        Vec3.normalize(ray.d, velocity);
        const hit = raycastIgnoring(ray, distance, this.owner);
        if (hit) {
            this.land(i, hit);
            return;
        }
        this.px[i] += velocity.x * dt;
        this.py[i] += velocity.y * dt;
        this.pz[i] += velocity.z * dt;
    }

    private land(i: number, hit: PhysicsRayResult): void {
        const impact = this.impact;
        impact.point.set(hit.hitPoint);
        impact.normal.set(hit.hitNormal);
        impact.velocity.set(this.vx[i], this.vy[i], this.vz[i]);
        impact.collider = hit.collider;

        this.px[i] = impact.point.x;
        this.py[i] = impact.point.y;
        this.pz[i] = impact.point.z;
        this.state[i] = LANDED;

        this.pushBody(impact);
        impact.collider.getComponent(LiquidReceiver)?.receiveLiquid(impact);
        this.spray?.splash(impact.point, impact.normal, impact.velocity, this.splashDroplets);
        this.puddles?.addSplash(impact.point, impact.normal);
        this.node.emit(LiquidStream.IMPACT, impact);
    }

    private pushBody(impact: LiquidImpact): void {
        const body = impact.collider.attachedRigidBody;
        if (!body || !body.isDynamic) {
            return;
        }
        Vec3.multiplyScalar(impulse, impact.velocity, this.impactForce);
        Vec3.subtract(leverArm, impact.point, body.node.worldPosition);
        body.applyImpulse(impulse, leverArm);
        body.wakeUp();
    }

    private breakUp(i: number, dt: number): void {
        if (!this.spray || this.age[i] < 0.3 || Math.random() > this.breakupRate * dt) {
            return;
        }
        position.set(this.px[i], this.py[i], this.pz[i]);
        velocity.set(this.vx[i], this.vy[i], this.vz[i]);
        this.spray.shed(position, velocity);
    }

    private emit(dt: number): void {
        this.emitBudget += this.nozzleRate * dt;
        while (this.emitBudget >= 1) {
            this.emitBudget -= 1;
            const elapsed = Math.min(this.emitBudget / Math.max(this.nozzleRate, 1e-3), dt);
            const t = dt > 0 ? 1 - elapsed / dt : 1;
            Vec3.lerp(position, this.lastNozzlePosition, this.nozzlePosition, t);
            Vec3.lerp(direction, this.lastNozzleDirection, this.nozzleDirection, t);
            direction.normalize();
            this.spawn(position, direction, elapsed);
        }
        this.lastNozzlePosition.set(this.nozzlePosition);
        this.lastNozzleDirection.set(this.nozzleDirection);
    }

    private spawn(origin: Readonly<Vec3>, aim: Readonly<Vec3>, elapsed: number): void {
        const birth = this.time - elapsed;
        Vec3.random(jitter, randomRange(0, this.spread));
        jitter.x += Math.sin(birth * 13.1) * this.wobble;
        jitter.y += Math.sin(birth * 9.7 + 1.3) * this.wobble;
        Vec3.add(direction, aim, jitter).normalize();
        const speed = this.nozzleSpeed * randomRange(0.97, 1.03);

        const i = this.head;
        this.head = (this.head + 1) % this.capacity;
        this.count = Math.min(this.count + 1, this.capacity);

        this.vx[i] = direction.x * speed;
        this.vy[i] = direction.y * speed - this.gravity * elapsed;
        this.vz[i] = direction.z * speed;
        this.px[i] = origin.x + direction.x * speed * elapsed;
        this.py[i] = origin.y + direction.y * speed * elapsed - 0.5 * this.gravity * elapsed * elapsed;
        this.pz[i] = origin.z + direction.z * speed * elapsed;
        this.age[i] = elapsed;
        this.life[i] = this.lifetime * randomRange(0.85, 1.1);
        this.born[i] = birth;
        this.seed[i] = Math.random();
        this.state[i] = FLYING;
        this.chainOf[i] = this.chain;
    }

    private trimTail(): void {
        while (this.count > 0 && this.state[this.indexAt(0)] === DEAD) {
            this.count--;
        }
    }

    private rebuildMesh(): void {
        this.buffer.clear();
        let chain = -1;
        let fromNozzle = false;
        if (this.nozzleOpen) {
            this.tube.addPoint(this.nozzlePosition, this.nozzleRadius, this.time * this.flowScale);
            previous.set(this.nozzlePosition);
            chain = this.chain;
            fromNozzle = true;
        }

        for (let order = this.count - 1; order >= 0; order--) {
            const i = this.indexAt(order);
            if (this.state[i] === DEAD) {
                this.flushTube(fromNozzle);
                fromNozzle = false;
                chain = -1;
                continue;
            }
            position.set(this.px[i], this.py[i], this.pz[i]);
            const linked = this.chainOf[i] === chain && Vec3.distance(previous, position) <= this.maxLinkDistance;
            if (!linked && this.tube.pointCount > 0) {
                this.flushTube(fromNozzle);
                fromNozzle = false;
            }
            const age = this.age[i];
            const radius = (this.nozzleRadius + age * this.spreadRate) * (0.85 + 0.3 * this.seed[i]);
            const fade = 1 - Math.max(0, (age / this.life[i] - 0.7) / 0.3);
            this.tube.addPoint(position, radius, this.born[i] * this.flowScale, fade);
            previous.set(position);
            chain = this.chainOf[i];
        }
        this.flushTube(fromNozzle);
        this.buffer.upload(this.meshRenderer);
    }

    private flushTube(fromNozzle: boolean): void {
        this.tube.build(this.buffer, this.tint, fromNozzle ? 1 : TIP_SCALE, TIP_SCALE);
    }
}
