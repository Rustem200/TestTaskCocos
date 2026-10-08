import { Component } from 'cc';
import { LiquidImpact } from './LiquidImpact';

export abstract class LiquidReceiver extends Component {
    abstract receiveLiquid(impact: LiquidImpact): void;
}
