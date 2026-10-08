import { _decorator, Component, Node, clamp, clamp01, lerp, toDegree } from 'cc';
import { LiquidStream } from '../liquid/LiquidStream';
import { moveTowards } from '../utils/MathUtils';
import { PlayerAim } from './PlayerAim';
import { PlayerInput } from './PlayerInput';
const { ccclass, property, executionOrder } = _decorator;

@ccclass('HoseGun')
@executionOrder(-10)
export class HoseGun extends Component {
    @property(PlayerInput)
    input: PlayerInput = null;

    @property(PlayerAim)
    aim: PlayerAim = null;

    @property(LiquidStream)
    stream: LiquidStream = null;

    @property(Node)
    muzzle: Node = null;

    @property(Node)
    marker: Node = null;

    @property
    minSpeed = 7;

    @property
    maxSpeed = 17;

    @property({ range: [0, 1, 0.05], slide: true })
    startPressure = 0.6;

    @property
    pressureStep = 0.1;

    @property
    flowRate = 100;

    @property
    openSpeed = 7;

    @property
    closeSpeed = 10;

    @property
    minPitch = -35;

    @property
    maxPitch = 50;

    private _pressure = 0;
    private _flow = 0;
    private _pitch = 0;
    private markerTime = 0;

    get pressure(): number {
        return this._pressure;
    }

    get flow(): number {
        return this._flow;
    }

    get pitch(): number {
        return this._pitch;
    }

    get spraying(): boolean {
        return this._flow > 0.01;
    }

    get muzzleSpeed(): number {
        return lerp(this.minSpeed, this.maxSpeed, this._pressure);
    }

    onLoad(): void {
        this._pressure = this.startPressure;
    }

    update(dt: number): void {
        const scroll = this.input.consumeScroll();
        if (scroll !== 0) {
            this._pressure = clamp01(Math.round((this._pressure + scroll * this.pressureStep) * 100) / 100);
        }
        const target = this.input.firing ? 1 : 0;
        const rate = target > this._flow ? this.openSpeed : this.closeSpeed;
        this._flow = moveTowards(this._flow, target, rate * dt);
        this._pitch = this.solvePitch();
        this.updateMarker(dt);
    }

    lateUpdate(): void {
        if (this._flow <= 0) {
            this.stream.closeNozzle();
            return;
        }
        const speed = this.muzzleSpeed * lerp(0.35, 1, this._flow);
        this.stream.openNozzle(this.muzzle.worldPosition, this.muzzle.forward, speed, this.flowRate * this._flow);
    }

    private solvePitch(): number {
        const from = this.muzzle.worldPosition;
        const to = this.aim.point;
        const dx = to.x - from.x;
        const dz = to.z - from.z;
        const distance = Math.sqrt(dx * dx + dz * dz);
        const height = to.y - from.y;
        if (distance < 0.5) {
            return this.minPitch;
        }
        const g = this.stream.gravity;
        const v2 = this.muzzleSpeed * this.muzzleSpeed;
        const discriminant = v2 * v2 - g * (g * distance * distance + 2 * height * v2);
        const angle = discriminant >= 0 ? Math.atan((v2 - Math.sqrt(discriminant)) / (g * distance)) : Math.PI / 4;
        return clamp(toDegree(angle), this.minPitch, this.maxPitch);
    }

    private updateMarker(dt: number): void {
        if (!this.marker) {
            return;
        }
        this.markerTime += dt * (1 + this._flow * 3);
        const point = this.aim.point;
        const pulse = 1 + Math.sin(this.markerTime * 6) * 0.08 * this._flow;
        this.marker.setWorldPosition(point.x, point.y + 0.03, point.z);
        this.marker.setRotationFromEuler(0, this.markerTime * 40, 0);
        this.marker.setScale(pulse, 1, pulse);
    }
}
