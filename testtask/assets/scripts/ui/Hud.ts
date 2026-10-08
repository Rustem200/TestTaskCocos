import { _decorator, Color, Component, Graphics, Label } from 'cc';
import { HoseGun } from '../player/HoseGun';
import { FireDirector } from '../world/FireDirector';
const { ccclass, property } = _decorator;

@ccclass('Hud')
export class Hud extends Component {
    @property(HoseGun)
    hose: HoseGun = null;

    @property(FireDirector)
    fires: FireDirector = null;

    @property(Label)
    pressureLabel: Label = null;

    @property(Graphics)
    pressureBar: Graphics = null;

    @property(Label)
    firesLabel: Label = null;

    @property
    barWidth = 240;

    @property
    barHeight = 12;

    @property(Color)
    barColor = new Color(90, 200, 255, 255);

    @property(Color)
    barBackground = new Color(0, 0, 0, 120);

    private shownPressure = -1;
    private shownBurning = -1;

    update(): void {
        const pressure = Math.round(this.hose.pressure * 100);
        if (pressure !== this.shownPressure) {
            this.shownPressure = pressure;
            this.pressureLabel.string = `PRESSURE ${pressure}%`;
            this.drawBar(this.hose.pressure);
        }

        const burning = this.fires.burningCount;
        if (burning !== this.shownBurning) {
            this.shownBurning = burning;
            this.firesLabel.string = burning > 0 ? `FIRES ${burning} / ${this.fires.total}` : 'ALL FIRES OUT';
        }
    }

    private drawBar(value: number): void {
        const bar = this.pressureBar;
        const h = this.barHeight;
        bar.clear();
        bar.fillColor = this.barBackground;
        bar.roundRect(0, 0, this.barWidth, h, h / 2);
        bar.fill();
        bar.fillColor = this.barColor;
        bar.roundRect(0, 0, Math.max(h, this.barWidth * value), h, h / 2);
        bar.fill();
    }
}
