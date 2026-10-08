import { _decorator, Color, Material, MeshRenderer } from 'cc';
import { LiquidReceiver } from '../liquid/LiquidReceiver';
const { ccclass, property } = _decorator;

interface WetSurface {
    material: Material;
    dryColor: Color;
    dryRoughness: number;
}

@ccclass('Wettable')
export class Wettable extends LiquidReceiver {
    @property
    soakPerHit = 0.05;

    @property
    dryRate = 0.06;

    @property({ range: [0, 1, 0.05], slide: true })
    darkening = 0.45;

    @property({ range: [0, 1, 0.05], slide: true })
    gloss = 0.6;

    private surfaces: WetSurface[] = [];
    private wetness = 0;
    private readonly color = new Color();

    start(): void {
        for (const renderer of this.getComponentsInChildren(MeshRenderer)) {
            const material = renderer.getMaterialInstance(0);
            if (!material) {
                continue;
            }
            const color = material.getProperty('mainColor') as Color | null;
            const roughness = material.getProperty('roughness') as number | null;
            this.surfaces.push({
                material,
                dryColor: color ? color.clone() : Color.WHITE.clone(),
                dryRoughness: roughness ?? 0.8,
            });
        }
    }

    receiveLiquid(): void {
        this.wetness = Math.min(1, this.wetness + this.soakPerHit);
        this.apply();
    }

    update(dt: number): void {
        if (this.wetness <= 0) {
            return;
        }
        this.wetness = Math.max(0, this.wetness - this.dryRate * dt);
        this.apply();
    }

    private apply(): void {
        const shade = 1 - this.darkening * this.wetness;
        for (const surface of this.surfaces) {
            const dry = surface.dryColor;
            this.color.set(dry.r * shade, dry.g * shade, dry.b * shade, dry.a);
            surface.material.setProperty('mainColor', this.color);
            surface.material.setProperty('roughness', surface.dryRoughness * (1 - this.gloss * this.wetness));
        }
    }
}
