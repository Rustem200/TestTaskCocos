import { Node, PhysicsRayResult, PhysicsSystem, geometry } from 'cc';

export function raycastIgnoring(ray: geometry.Ray, distance: number, ignored: Node | null): PhysicsRayResult | null {
    const physics = PhysicsSystem.instance;
    if (!physics.raycast(ray, 0xffffffff, distance, false)) {
        return null;
    }
    let closest: PhysicsRayResult | null = null;
    for (const result of physics.raycastResults) {
        if (ignored && result.collider.node.isChildOf(ignored)) {
            continue;
        }
        if (!closest || result.distance < closest.distance) {
            closest = result;
        }
    }
    return closest;
}
