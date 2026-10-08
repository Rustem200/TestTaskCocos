export function damp(current: number, target: number, sharpness: number, dt: number): number {
    return target + (current - target) * Math.exp(-sharpness * dt);
}

export function dampAngle(current: number, target: number, sharpness: number, dt: number): number {
    const delta = ((target - current + 540) % 360) - 180;
    return damp(current, current + delta, sharpness, dt);
}

export function moveTowards(current: number, target: number, maxDelta: number): number {
    if (Math.abs(target - current) <= maxDelta) {
        return target;
    }
    return current + Math.sign(target - current) * maxDelta;
}
