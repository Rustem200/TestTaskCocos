import { _decorator, Component } from 'cc';
import { LiquidImpact } from '../liquid/LiquidImpact';
import { LiquidStream } from '../liquid/LiquidStream';
import { FireSpot } from './FireSpot';
const { ccclass, property } = _decorator;

@ccclass('FireDirector')
export class FireDirector extends Component {
    @property(LiquidStream)
    stream: LiquidStream = null;

    @property
    dousePerHit = 0.012;

    @property
    relightDelay = 6;

    private fires: FireSpot[] = [];
    private relightTimer = 0;

    get total(): number {
        return this.fires.length;
    }

    get burningCount(): number {
        return this.fires.reduce((count, fire) => count + (fire.burning ? 1 : 0), 0);
    }

    onLoad(): void {
        this.fires = this.getComponentsInChildren(FireSpot);
    }

    onEnable(): void {
        this.stream.node.on(LiquidStream.IMPACT, this.onImpact, this);
    }

    onDisable(): void {
        this.stream.node.off(LiquidStream.IMPACT, this.onImpact, this);
    }

    update(dt: number): void {
        if (this.burningCount > 0) {
            this.relightTimer = 0;
            return;
        }
        this.relightTimer += dt;
        if (this.relightTimer >= this.relightDelay) {
            this.relightTimer = 0;
            this.fires.forEach((fire) => fire.ignite());
        }
    }

    private onImpact(impact: LiquidImpact): void {
        for (const fire of this.fires) {
            if (!fire.burning) {
                continue;
            }
            const center = fire.node.worldPosition;
            const dx = impact.point.x - center.x;
            const dz = impact.point.z - center.z;
            if (dx * dx + dz * dz < fire.radius * fire.radius && Math.abs(impact.point.y - center.y) < 2) {
                fire.douse(this.dousePerHit);
            }
        }
    }
}
