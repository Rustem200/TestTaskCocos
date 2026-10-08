import { _decorator, Component, EventKeyboard, EventMouse, Game, Input, KeyCode, Vec2, game, input } from 'cc';
const { ccclass } = _decorator;

const FORWARD_KEYS = [KeyCode.KEY_W, KeyCode.ARROW_UP];
const BACKWARD_KEYS = [KeyCode.KEY_S, KeyCode.ARROW_DOWN];
const LEFT_KEYS = [KeyCode.KEY_A, KeyCode.ARROW_LEFT];
const RIGHT_KEYS = [KeyCode.KEY_D, KeyCode.ARROW_RIGHT];
const SPRINT_KEYS = [KeyCode.SHIFT_LEFT, KeyCode.SHIFT_RIGHT];

@ccclass('PlayerInput')
export class PlayerInput extends Component {
    readonly move = new Vec2();
    readonly pointer = new Vec2();

    private readonly pressed = new Set<KeyCode>();
    private _firing = false;
    private _hasPointer = false;
    private jumpRequested = false;
    private scrollSteps = 0;

    get firing(): boolean {
        return this._firing;
    }

    get sprinting(): boolean {
        return this.anyPressed(SPRINT_KEYS);
    }

    get hasPointer(): boolean {
        return this._hasPointer;
    }

    onEnable(): void {
        input.on(Input.EventType.KEY_DOWN, this.onKeyDown, this);
        input.on(Input.EventType.KEY_UP, this.onKeyUp, this);
        input.on(Input.EventType.MOUSE_DOWN, this.onMouseDown, this);
        input.on(Input.EventType.MOUSE_UP, this.onMouseUp, this);
        input.on(Input.EventType.MOUSE_MOVE, this.onMouseMove, this);
        input.on(Input.EventType.MOUSE_WHEEL, this.onMouseWheel, this);
        game.on(Game.EVENT_HIDE, this.releaseAll, this);
    }

    onDisable(): void {
        input.off(Input.EventType.KEY_DOWN, this.onKeyDown, this);
        input.off(Input.EventType.KEY_UP, this.onKeyUp, this);
        input.off(Input.EventType.MOUSE_DOWN, this.onMouseDown, this);
        input.off(Input.EventType.MOUSE_UP, this.onMouseUp, this);
        input.off(Input.EventType.MOUSE_MOVE, this.onMouseMove, this);
        input.off(Input.EventType.MOUSE_WHEEL, this.onMouseWheel, this);
        game.off(Game.EVENT_HIDE, this.releaseAll, this);
        this.releaseAll();
    }

    consumeJump(): boolean {
        const requested = this.jumpRequested;
        this.jumpRequested = false;
        return requested;
    }

    consumeScroll(): number {
        const steps = this.scrollSteps;
        this.scrollSteps = 0;
        return steps;
    }

    private onKeyDown(event: EventKeyboard): void {
        if (event.keyCode === KeyCode.SPACE && !this.pressed.has(KeyCode.SPACE)) {
            this.jumpRequested = true;
        }
        this.pressed.add(event.keyCode);
        this.updateMove();
    }

    private onKeyUp(event: EventKeyboard): void {
        this.pressed.delete(event.keyCode);
        this.updateMove();
    }

    private onMouseDown(event: EventMouse): void {
        this.trackPointer(event);
        if (event.getButton() === EventMouse.BUTTON_LEFT) {
            this._firing = true;
        }
    }

    private onMouseUp(event: EventMouse): void {
        if (event.getButton() === EventMouse.BUTTON_LEFT) {
            this._firing = false;
        }
    }

    private onMouseMove(event: EventMouse): void {
        this.trackPointer(event);
    }

    private onMouseWheel(event: EventMouse): void {
        this.scrollSteps += Math.sign(event.getScrollY());
    }

    private trackPointer(event: EventMouse): void {
        event.getLocation(this.pointer);
        this._hasPointer = true;
    }

    private releaseAll(): void {
        this.pressed.clear();
        this._firing = false;
        this.updateMove();
    }

    private updateMove(): void {
        this.move.set(this.axis(RIGHT_KEYS, LEFT_KEYS), this.axis(FORWARD_KEYS, BACKWARD_KEYS));
        if (this.move.lengthSqr() > 1) {
            this.move.normalize();
        }
    }

    private axis(positive: KeyCode[], negative: KeyCode[]): number {
        return (this.anyPressed(positive) ? 1 : 0) - (this.anyPressed(negative) ? 1 : 0);
    }

    private anyPressed(keys: KeyCode[]): boolean {
        return keys.some((key) => this.pressed.has(key));
    }
}
