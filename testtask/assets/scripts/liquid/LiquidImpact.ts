import { Collider, Vec3 } from 'cc';

export interface LiquidImpact {
    readonly point: Vec3;
    readonly normal: Vec3;
    readonly velocity: Vec3;
    collider: Collider | null;
}
