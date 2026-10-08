import { _decorator, Color, Component, MeshRenderer, Node, Vec3 } from 'cc';
import { DynamicMeshBuffer } from '../render/DynamicMeshBuffer';
import { TubeMesher } from '../render/TubeMesher';
const { ccclass, property, requireComponent } = _decorator;

const p0 = new Vec3();
const p1 = new Vec3();
const p2 = new Vec3();
const p3 = new Vec3();
const sample = new Vec3();
const local = new Vec3();
const previous = new Vec3();

@ccclass('HoseLine')
@requireComponent(MeshRenderer)
export class HoseLine extends Component {
    @property(Node)
    source: Node = null;

    @property(Node)
    target: Node = null;

    @property
    radius = 0.028;

    @property
    slack = 0.45;

    @property
    samples = 16;

    @property
    radialSegments = 8;

    private buffer: DynamicMeshBuffer;
    private tube: TubeMesher;
    private meshRenderer: MeshRenderer;

    onLoad(): void {
        this.tube = new TubeMesher(this.radialSegments, this.samples);
        this.buffer = new DynamicMeshBuffer(this.samples * (this.radialSegments + 1), (this.samples - 1) * this.radialSegments * 6);
        this.meshRenderer = this.getComponent(MeshRenderer);
    }

    lateUpdate(): void {
        p0.set(this.source.worldPosition);
        p3.set(this.target.worldPosition);
        p1.set(p0.x, p0.y - this.slack, p0.z);
        Vec3.scaleAndAdd(p2, p3, this.target.forward, -this.slack * 0.6);
        p2.y -= this.slack * 0.4;

        this.buffer.clear();
        let length = 0;
        for (let i = 0; i < this.samples; i++) {
            this.bezier(i / (this.samples - 1), sample);
            this.node.inverseTransformPoint(local, sample);
            if (i > 0) {
                length += Vec3.distance(previous, local);
            }
            this.tube.addPoint(local, this.radius, length);
            previous.set(local);
        }
        this.tube.build(this.buffer, Color.WHITE);
        this.buffer.upload(this.meshRenderer);
    }

    private bezier(t: number, out: Vec3): void {
        const u = 1 - t;
        const a = u * u * u;
        const b = 3 * u * u * t;
        const c = 3 * u * t * t;
        const d = t * t * t;
        out.set(
            a * p0.x + b * p1.x + c * p2.x + d * p3.x,
            a * p0.y + b * p1.y + c * p2.y + d * p3.y,
            a * p0.z + b * p1.z + c * p2.z + d * p3.z,
        );
    }
}
