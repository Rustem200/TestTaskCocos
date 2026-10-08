export class ParticlePool {
    readonly px: Float32Array;
    readonly py: Float32Array;
    readonly pz: Float32Array;
    readonly vx: Float32Array;
    readonly vy: Float32Array;
    readonly vz: Float32Array;
    readonly age: Float32Array;
    readonly life: Float32Array;
    readonly size: Float32Array;
    readonly spin: Float32Array;
    readonly kind: Uint8Array;
    private _count = 0;

    constructor(readonly capacity: number) {
        this.px = new Float32Array(capacity);
        this.py = new Float32Array(capacity);
        this.pz = new Float32Array(capacity);
        this.vx = new Float32Array(capacity);
        this.vy = new Float32Array(capacity);
        this.vz = new Float32Array(capacity);
        this.age = new Float32Array(capacity);
        this.life = new Float32Array(capacity);
        this.size = new Float32Array(capacity);
        this.spin = new Float32Array(capacity);
        this.kind = new Uint8Array(capacity);
    }

    get count(): number {
        return this._count;
    }

    spawn(x: number, y: number, z: number, vx: number, vy: number, vz: number, life: number, size: number, kind = 0): void {
        if (this._count >= this.capacity) {
            return;
        }
        const i = this._count++;
        this.px[i] = x;
        this.py[i] = y;
        this.pz[i] = z;
        this.vx[i] = vx;
        this.vy[i] = vy;
        this.vz[i] = vz;
        this.age[i] = 0;
        this.life[i] = life;
        this.size[i] = size;
        this.spin[i] = Math.random() * Math.PI * 2;
        this.kind[i] = kind;
    }

    progress(i: number): number {
        return this.age[i] / this.life[i];
    }

    step(dt: number, gravity: number, drag: number, floor = -Infinity): void {
        const damping = Math.exp(-drag * dt);
        let i = 0;
        while (i < this._count) {
            this.age[i] += dt;
            this.vy[i] -= gravity * dt;
            this.vx[i] *= damping;
            this.vy[i] *= damping;
            this.vz[i] *= damping;
            this.px[i] += this.vx[i] * dt;
            this.py[i] += this.vy[i] * dt;
            this.pz[i] += this.vz[i] * dt;
            if (this.age[i] >= this.life[i] || this.py[i] < floor) {
                this.remove(i);
            } else {
                i++;
            }
        }
    }

    clear(): void {
        this._count = 0;
    }

    private remove(i: number): void {
        const last = --this._count;
        if (i === last) {
            return;
        }
        this.px[i] = this.px[last];
        this.py[i] = this.py[last];
        this.pz[i] = this.pz[last];
        this.vx[i] = this.vx[last];
        this.vy[i] = this.vy[last];
        this.vz[i] = this.vz[last];
        this.age[i] = this.age[last];
        this.life[i] = this.life[last];
        this.size[i] = this.size[last];
        this.spin[i] = this.spin[last];
        this.kind[i] = this.kind[last];
    }
}
