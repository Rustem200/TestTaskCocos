import { _decorator, Component, Node, Vec3 } from 'cc';
import { PlayerAim } from '../player/PlayerAim';
const { ccclass, property } = _decorator;

const lookAhead = new Vec3();

@ccclass('FollowCamera')
export class FollowCamera extends Component {
    @property(Node)
    target: Node = null;

    @property(PlayerAim)
    aim: PlayerAim = null;

    @property
    distance = 13;

    @property
    focusHeight = 1;

    @property
    lookAheadFactor = 0.2;

    @property
    maxLookAhead = 3;

    @property
    sharpness = 6;

    private readonly desired = new Vec3();
    private readonly current = new Vec3();

    start(): void {
        this.computeDesired();
        this.node.setWorldPosition(this.desired);
    }

    lateUpdate(dt: number): void {
        this.computeDesired();
        Vec3.lerp(this.current, this.node.worldPosition, this.desired, 1 - Math.exp(-this.sharpness * dt));
        this.node.setWorldPosition(this.current);
    }

    private computeDesired(): void {
        const position = this.target.worldPosition;
        lookAhead.set(0, 0, 0);
        if (this.aim) {
            Vec3.subtract(lookAhead, this.aim.point, position);
            lookAhead.y = 0;
            lookAhead.multiplyScalar(this.lookAheadFactor);
            const length = lookAhead.length();
            if (length > this.maxLookAhead) {
                lookAhead.multiplyScalar(this.maxLookAhead / length);
            }
        }
        this.desired.set(position.x + lookAhead.x, position.y + this.focusHeight, position.z + lookAhead.z);
        Vec3.scaleAndAdd(this.desired, this.desired, this.node.forward, -this.distance);
    }
}
