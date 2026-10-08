import { Color, MeshRenderer, Node, Vec3 } from 'cc';
import { DynamicMeshBuffer } from './DynamicMeshBuffer';

const center = new Vec3();
const axisX = new Vec3();
const axisY = new Vec3();

export class BillboardBatch {
    private readonly buffer: DynamicMeshBuffer;
    private readonly right = new Vec3();
    private readonly up = new Vec3();
    private readonly facing = new Vec3();

    constructor(capacity: number) {
        this.buffer = new DynamicMeshBuffer(capacity * 4, capacity * 6);
    }

    begin(view: Node): void {
        this.buffer.clear();
        const rotation = view.worldRotation;
        Vec3.transformQuat(this.right, Vec3.RIGHT, rotation);
        Vec3.transformQuat(this.up, Vec3.UP, rotation);
        Vec3.transformQuat(this.facing, Vec3.UNIT_Z, rotation);
    }

    add(x: number, y: number, z: number, size: number, angle: number, color: Readonly<Color>): void {
        const cos = Math.cos(angle) * size;
        const sin = Math.sin(angle) * size;
        Vec3.multiplyScalar(axisX, this.right, cos);
        Vec3.scaleAndAdd(axisX, axisX, this.up, sin);
        Vec3.multiplyScalar(axisY, this.up, cos);
        Vec3.scaleAndAdd(axisY, axisY, this.right, -sin);
        center.set(x, y, z);
        this.buffer.addQuad(center, axisX, axisY, this.facing, color);
    }

    end(renderer: MeshRenderer): void {
        this.buffer.upload(renderer);
    }
}
