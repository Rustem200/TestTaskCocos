import { _decorator, Component, Node, Vec3, clamp01, lerp } from 'cc';
import { damp } from '../utils/MathUtils';
import { HoseGun } from './HoseGun';
import { PlayerController } from './PlayerController';
const { ccclass, property, executionOrder } = _decorator;

@ccclass('CharacterRig')
@executionOrder(10)
export class CharacterRig extends Component {
    @property(PlayerController)
    controller: PlayerController = null;

    @property(HoseGun)
    hose: HoseGun = null;

    @property(Node)
    torso: Node = null;

    @property(Node)
    head: Node = null;

    @property(Node)
    aimPivot: Node = null;

    @property(Node)
    leftLeg: Node = null;

    @property(Node)
    rightLeg: Node = null;

    @property
    strideLength = 1.3;

    @property
    strideAngle = 32;

    @property
    bobHeight = 0.045;

    @property
    runLean = 6;

    @property
    sprayLean = 5;

    @property
    aimSharpness = 14;

    @property
    recoil = 1.2;

    private time = 0;
    private phase = 0;
    private stride = 0;
    private airborne = 0;
    private pitch = 0;
    private readonly torsoRest = new Vec3();

    onLoad(): void {
        this.torsoRest.set(this.torso.position);
    }

    update(dt: number): void {
        this.time += dt;
        const speed = this.controller.planarSpeed;
        this.phase = (this.phase + (speed / this.strideLength) * Math.PI * 2 * dt) % (Math.PI * 2);
        this.stride = damp(this.stride, clamp01(speed / 2.5), 10, dt);
        this.airborne = damp(this.airborne, this.controller.grounded ? 0 : 1, 10, dt);
        this.pitch = damp(this.pitch, this.hose.pitch, this.aimSharpness, dt);

        this.animateLegs();
        const lean = this.animateTorso();
        this.animateAim(lean);
    }

    private animateLegs(): void {
        const swing = Math.sin(this.phase) * this.strideAngle * this.stride;
        this.leftLeg.setRotationFromEuler(lerp(swing, -28, this.airborne), 0, 0);
        this.rightLeg.setRotationFromEuler(lerp(-swing, 18, this.airborne), 0, 0);
    }

    private animateTorso(): number {
        const step = Math.abs(Math.sin(this.phase)) * this.bobHeight * this.stride * (1 - this.airborne);
        const breath = Math.sin(this.time * 2.2) * 0.008;
        this.torso.setPosition(this.torsoRest.x, this.torsoRest.y + step + breath, this.torsoRest.z);
        const lean = -this.runLean * this.stride + this.sprayLean * this.hose.flow;
        this.torso.setRotationFromEuler(lean, 0, 0);
        return lean;
    }

    private animateAim(lean: number): void {
        const shake = this.hose.flow * this.recoil * (Math.sin(this.time * 47) * 0.6 + Math.sin(this.time * 31) * 0.4);
        this.aimPivot.setRotationFromEuler(this.pitch - lean + shake, 0, 0);
        this.head.setRotationFromEuler(this.pitch * 0.35 - lean, 0, 0);
    }
}
