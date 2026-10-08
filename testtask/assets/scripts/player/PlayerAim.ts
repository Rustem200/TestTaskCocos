import { _decorator, Camera, Component, Vec3, geometry } from 'cc';
import { raycastIgnoring } from '../utils/Raycast';
import { PlayerInput } from './PlayerInput';
const { ccclass, property, executionOrder } = _decorator;

@ccclass('PlayerAim')
@executionOrder(-20)
export class PlayerAim extends Component {
    @property(Camera)
    camera: Camera = null;

    @property(PlayerInput)
    input: PlayerInput = null;

    @property
    groundHeight = 0;

    @property
    maxDistance = 100;

    @property
    idleDistance = 6;

    readonly point = new Vec3();
    private readonly ray = new geometry.Ray();

    start(): void {
        Vec3.scaleAndAdd(this.point, this.node.worldPosition, this.node.forward, this.idleDistance);
    }

    update(): void {
        if (!this.input.hasPointer) {
            return;
        }
        this.camera.screenPointToRay(this.input.pointer.x, this.input.pointer.y, this.ray);
        const hit = raycastIgnoring(this.ray, this.maxDistance, this.node);
        if (hit) {
            this.point.set(hit.hitPoint);
            return;
        }
        if (this.ray.d.y < -1e-4) {
            const distance = (this.groundHeight - this.ray.o.y) / this.ray.d.y;
            Vec3.scaleAndAdd(this.point, this.ray.o, this.ray.d, distance);
        }
    }
}
