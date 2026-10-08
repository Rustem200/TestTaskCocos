import { _decorator, Camera, Color, Component, MeshRenderer, SphereLight, randomRange } from 'cc';
import { BillboardBatch } from '../render/BillboardBatch';
import { ParticlePool } from '../render/ParticlePool';
const { ccclass, property } = _decorator;

const SMOKE = 0;
const STEAM = 1;
const FLAME_HOT = new Color(255, 225, 130, 255);
const FLAME_WARM = new Color(255, 120, 30, 255);
const FLAME_COOL = new Color(170, 30, 10, 255);
const SMOKE_COLOR = new Color(40, 38, 36, 255);
const STEAM_COLOR = new Color(235, 240, 245, 255);

@ccclass('FireSpot')
export class FireSpot extends Component {
    static readonly EXTINGUISHED = 'fire-extinguished';

    @property(Camera)
    camera: Camera = null;

    @property(MeshRenderer)
    flames: MeshRenderer = null;

    @property(MeshRenderer)
    smoke: MeshRenderer = null;

    @property(SphereLight)
    glow: SphereLight = null;

    @property
    radius = 1.1;

    @property
    baseRadius = 0.35;

    @property
    flameSize = 0.5;

    @property
    flameRate = 45;

    @property
    smokeRate = 5;

    @property
    recoveryDelay = 1.2;

    @property
    recoveryRate = 0.25;

    private intensity = 1;
    private idleTime = 0;
    private time = 0;
    private flameBudget = 0;
    private smokeBudget = 0;
    private steamBudget = 0;
    private glowLuminance = 0;
    private readonly flamePool = new ParticlePool(160);
    private readonly smokePool = new ParticlePool(96);
    private readonly flameBatch = new BillboardBatch(160);
    private readonly smokeBatch = new BillboardBatch(96);
    private readonly color = new Color();

    get burning(): boolean {
        return this.intensity > 0;
    }

    onLoad(): void {
        if (this.glow) {
            this.glowLuminance = this.glow.luminance;
        }
    }

    douse(amount: number): void {
        if (!this.burning) {
            return;
        }
        this.idleTime = 0;
        this.steamBudget += amount * 30;
        this.intensity = Math.max(0, this.intensity - amount);
        if (!this.burning) {
            this.steamBudget += 14;
            this.node.emit(FireSpot.EXTINGUISHED, this);
        }
    }

    ignite(): void {
        this.intensity = 1;
        this.idleTime = 0;
    }

    update(dt: number): void {
        this.time += dt;
        this.idleTime += dt;
        if (this.burning && this.idleTime > this.recoveryDelay) {
            this.intensity = Math.min(1, this.intensity + this.recoveryRate * dt);
        }
        this.emitFlames(dt);
        this.emitSmoke(dt);
        this.flamePool.step(dt, -2.4, 1.6);
        this.smokePool.step(dt, -0.8, 0.9);
        this.updateGlow();
    }

    lateUpdate(): void {
        this.drawFlames();
        this.drawSmoke();
    }

    private emitFlames(dt: number): void {
        this.flameBudget += this.flameRate * this.intensity * dt;
        while (this.flameBudget >= 1) {
            this.flameBudget -= 1;
            const angle = Math.random() * Math.PI * 2;
            const distance = Math.sqrt(Math.random()) * this.baseRadius * (0.5 + 0.5 * this.intensity);
            this.flamePool.spawn(
                Math.cos(angle) * distance, randomRange(0, 0.15), Math.sin(angle) * distance,
                randomRange(-0.15, 0.15), randomRange(0.5, 1.2), randomRange(-0.15, 0.15),
                randomRange(0.45, 0.85), this.flameSize * randomRange(0.7, 1.1) * (0.55 + 0.45 * this.intensity),
            );
        }
    }

    private emitSmoke(dt: number): void {
        this.smokeBudget += this.smokeRate * this.intensity * dt;
        while (this.smokeBudget >= 1) {
            this.smokeBudget -= 1;
            this.spawnPuff(SMOKE, 0.8, randomRange(2, 3));
        }
        while (this.steamBudget >= 1) {
            this.steamBudget -= 1;
            this.spawnPuff(STEAM, 0.3, randomRange(1.2, 2));
        }
    }

    private spawnPuff(kind: number, height: number, life: number): void {
        this.smokePool.spawn(
            randomRange(-0.2, 0.2), height + randomRange(0, 0.3), randomRange(-0.2, 0.2),
            randomRange(-0.2, 0.2), randomRange(0.4, 0.9), randomRange(-0.2, 0.2),
            life, randomRange(0.3, 0.45), kind,
        );
    }

    private updateGlow(): void {
        if (!this.glow) {
            return;
        }
        const flicker = 0.85 + 0.1 * Math.sin(this.time * 13) + 0.05 * Math.sin(this.time * 29);
        this.glow.luminance = this.glowLuminance * this.intensity * flicker;
    }

    private drawFlames(): void {
        const pool = this.flamePool;
        this.flameBatch.begin(this.camera.node);
        for (let i = 0; i < pool.count; i++) {
            const t = pool.progress(i);
            if (t < 0.35) {
                Color.lerp(this.color, FLAME_HOT, FLAME_WARM, t / 0.35);
            } else {
                Color.lerp(this.color, FLAME_WARM, FLAME_COOL, (t - 0.35) / 0.65);
            }
            this.color.a = 255 * Math.min(1, t * 8) * (1 - t);
            const size = pool.size[i] * Math.min(1, 0.4 + t * 4) * (1 - t * 0.6);
            this.flameBatch.add(pool.px[i], pool.py[i], pool.pz[i], size, pool.spin[i] + t * 2, this.color);
        }
        this.flameBatch.end(this.flames);
    }

    private drawSmoke(): void {
        const pool = this.smokePool;
        this.smokeBatch.begin(this.camera.node);
        for (let i = 0; i < pool.count; i++) {
            const t = pool.progress(i);
            const steam = pool.kind[i] === STEAM;
            this.color.set(steam ? STEAM_COLOR : SMOKE_COLOR);
            this.color.a = (steam ? 150 : 90) * Math.min(1, t * 5) * (1 - t);
            const size = pool.size[i] * (1 + t * 2.2);
            this.smokeBatch.add(pool.px[i], pool.py[i], pool.pz[i], size, pool.spin[i] + t, this.color);
        }
        this.smokeBatch.end(this.smoke);
    }
}
