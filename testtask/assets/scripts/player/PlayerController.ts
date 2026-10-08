import { _decorator, Component, Node, RigidBody, Vec3, geometry, toDegree } from 'cc';
import { dampAngle } from '../utils/MathUtils';
import { raycastIgnoring } from '../utils/Raycast';
import { HoseGun } from './HoseGun';
import { PlayerAim } from './PlayerAim';
import { PlayerInput } from './PlayerInput';
const { ccclass, property, requireComponent } = _decorator;

const forward = new Vec3();
const right = new Vec3();

@ccclass('PlayerController')
@requireComponent(RigidBody)
export class PlayerController extends Component {
    @property(PlayerInput)
    input: PlayerInput = null;

    @property(PlayerAim)
    aim: PlayerAim = null;

    @property(HoseGun)
    hose: HoseGun = null;

    @property(Node)
    view: Node = null;

    @property
    walkSpeed = 4.2;

    @property
    sprintMultiplier = 1.55;

    @property
    sprayMultiplier = 0.6;

    @property
    acceleration = 28;

    @property
    airControl = 0.35;

    @property
    turnSharpness = 12;

    @property
    jumpSpeed = 5.5;

    @property
    groundCheckDistance = 0.2;

    private body: RigidBody;
    private yaw = 0;
    private _grounded = false;
    private _planarSpeed = 0;
    private readonly velocity = new Vec3();
    private readonly desired = new Vec3();
    private readonly groundRay = new geometry.Ray();

    get grounded(): boolean {
        return this._grounded;
    }

    get planarSpeed(): number {
        return this._planarSpeed;
    }

    onLoad(): void {
        this.body = this.getComponent(RigidBody);
        this.yaw = this.node.eulerAngles.y;
    }

    update(dt: number): void {
        this._grounded = this.checkGround();
        this.updateDesiredVelocity();

        this.body.getLinearVelocity(this.velocity);
        const maxDelta = this.acceleration * (this._grounded ? 1 : this.airControl) * dt;
        const dx = this.desired.x - this.velocity.x;
        const dz = this.desired.z - this.velocity.z;
        const delta = Math.sqrt(dx * dx + dz * dz);
        const step = delta > maxDelta ? maxDelta / delta : 1;
        this.velocity.x += dx * step;
        this.velocity.z += dz * step;
        if (this.input.consumeJump() && this._grounded) {
            this.velocity.y = this.jumpSpeed;
        }
        this.body.setLinearVelocity(this.velocity);
        this._planarSpeed = Math.sqrt(this.velocity.x * this.velocity.x + this.velocity.z * this.velocity.z);

        this.updateFacing(dt);
    }

    private updateDesiredVelocity(): void {
        forward.set(this.view.forward.x, 0, this.view.forward.z).normalize();
        right.set(this.view.right.x, 0, this.view.right.z).normalize();
        const move = this.input.move;
        Vec3.multiplyScalar(this.desired, forward, move.y);
        Vec3.scaleAndAdd(this.desired, this.desired, right, move.x);

        let speed = this.walkSpeed;
        if (this.hose.spraying) {
            speed *= this.sprayMultiplier;
        } else if (this.input.sprinting) {
            speed *= this.sprintMultiplier;
        }
        this.desired.multiplyScalar(speed);
    }

    private updateFacing(dt: number): void {
        let dx = this.desired.x;
        let dz = this.desired.z;
        if (this.hose.spraying) {
            const position = this.node.worldPosition;
            dx = this.aim.point.x - position.x;
            dz = this.aim.point.z - position.z;
        }
        if (dx * dx + dz * dz < 1e-3) {
            return;
        }
        this.yaw = dampAngle(this.yaw, toDegree(Math.atan2(-dx, -dz)), this.turnSharpness, dt);
        this.node.setRotationFromEuler(0, this.yaw, 0);
    }

    private checkGround(): boolean {
        const origin = this.node.worldPosition;
        this.groundRay.o.set(origin.x, origin.y + 0.1, origin.z);
        this.groundRay.d.set(0, -1, 0);
        return raycastIgnoring(this.groundRay, 0.1 + this.groundCheckDistance, this.node) !== null;
    }
}
