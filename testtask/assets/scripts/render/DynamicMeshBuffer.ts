import { Color, Mesh, MeshRenderer, Vec3, primitives, utils } from 'cc';

const QUAD_X = [-1, 1, 1, -1];
const QUAD_Y = [-1, -1, 1, 1];
const corner = new Vec3();

export class DynamicMeshBuffer {
    private readonly positions: Float32Array;
    private readonly normals: Float32Array;
    private readonly uvs: Float32Array;
    private readonly colors: Float32Array;
    private readonly indices: Uint16Array;
    private readonly minPos = new Vec3();
    private readonly maxPos = new Vec3();
    private vertices = 0;
    private indexCount = 0;
    private mesh: Mesh | null = null;

    constructor(readonly maxVertices: number, readonly maxIndices: number) {
        this.positions = new Float32Array(maxVertices * 3);
        this.normals = new Float32Array(maxVertices * 3);
        this.uvs = new Float32Array(maxVertices * 2);
        this.colors = new Float32Array(maxVertices * 4);
        this.indices = new Uint16Array(maxIndices);
        this.clear();
    }

    get vertexCount(): number {
        return this.vertices;
    }

    clear(): void {
        this.vertices = 0;
        this.indexCount = 0;
        this.minPos.set(Infinity, Infinity, Infinity);
        this.maxPos.set(-Infinity, -Infinity, -Infinity);
    }

    hasRoom(vertices: number, indices: number): boolean {
        return this.vertices + vertices <= this.maxVertices && this.indexCount + indices <= this.maxIndices;
    }

    addVertex(position: Readonly<Vec3>, normal: Readonly<Vec3>, u: number, v: number, color: Readonly<Color>, alpha = 1): number {
        const index = this.vertices++;
        const p = index * 3;
        this.positions[p] = position.x;
        this.positions[p + 1] = position.y;
        this.positions[p + 2] = position.z;
        this.normals[p] = normal.x;
        this.normals[p + 1] = normal.y;
        this.normals[p + 2] = normal.z;
        this.uvs[index * 2] = u;
        this.uvs[index * 2 + 1] = v;
        const c = index * 4;
        this.colors[c] = color.r / 255;
        this.colors[c + 1] = color.g / 255;
        this.colors[c + 2] = color.b / 255;
        this.colors[c + 3] = (color.a / 255) * alpha;
        Vec3.min(this.minPos, this.minPos, position);
        Vec3.max(this.maxPos, this.maxPos, position);
        return index;
    }

    addTriangle(a: number, b: number, c: number): void {
        this.indices[this.indexCount++] = a;
        this.indices[this.indexCount++] = b;
        this.indices[this.indexCount++] = c;
    }

    addQuad(center: Readonly<Vec3>, axisX: Readonly<Vec3>, axisY: Readonly<Vec3>, normal: Readonly<Vec3>, color: Readonly<Color>): void {
        if (!this.hasRoom(4, 6)) {
            return;
        }
        const first = this.vertices;
        for (let i = 0; i < 4; i++) {
            Vec3.scaleAndAdd(corner, center, axisX, QUAD_X[i]);
            Vec3.scaleAndAdd(corner, corner, axisY, QUAD_Y[i]);
            this.addVertex(corner, normal, (QUAD_X[i] + 1) * 0.5, (QUAD_Y[i] + 1) * 0.5, color);
        }
        this.addTriangle(first, first + 1, first + 2);
        this.addTriangle(first, first + 2, first + 3);
    }

    upload(renderer: MeshRenderer): void {
        if (!this.mesh) {
            const initial = this.geometry(this.maxVertices, this.maxIndices);
            initial.minPos = Vec3.ZERO;
            initial.maxPos = Vec3.ZERO;
            this.mesh = utils.MeshUtils.createDynamicMesh(0, initial, undefined, {
                maxSubMeshes: 1,
                maxSubMeshVertices: this.maxVertices,
                maxSubMeshIndices: this.maxIndices,
            });
            renderer.mesh = this.mesh;
        }
        const geometry = this.geometry(this.vertices, this.indexCount);
        if (this.vertices > 0) {
            geometry.minPos = this.minPos;
            geometry.maxPos = this.maxPos;
        }
        this.mesh.updateSubMesh(0, geometry);
        renderer.onGeometryChanged();
    }

    private geometry(vertices: number, indices: number): primitives.IDynamicGeometry {
        return {
            positions: this.positions.subarray(0, vertices * 3),
            normals: this.normals.subarray(0, vertices * 3),
            uvs: this.uvs.subarray(0, vertices * 2),
            colors: this.colors.subarray(0, vertices * 4),
            indices16: this.indices.subarray(0, indices),
        };
    }
}
