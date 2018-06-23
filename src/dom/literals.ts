
import { Vector, MNode, maxPrec, Creator, Selectable} from "./mdom";

import * as tutil from "../traverse/util";
import * as util from "../util/util";

export abstract class Literal extends MNode implements Selectable {
    public e: Element
    public s: HTMLElement
    public size: Vector
    public pos: Vector

    public precendence(): number {
        return maxPrec;
    }

    private value: string;

    constructor(value: string) {
        super();
        this.value = value;     
    }

    // TODO: Multiple digits! 
    public rKatex(e: Element) {
        this.e = tutil.tfcwc(e);
        if(this.e === null) console.error("Must exist!");
        console.log(this.e);
    }

    public getSValue(): string {
        return this.value;
    }

    public sync(br: Vector) { 
        tutil.measure(this.e, br, this);
    }

    // TODO: We need a selector for every single digit!
    public createSelectionAreas(c: Creator): void {
        this.s = c.add(this.pos, this.size);
    }

    public strip() {
        return this;
    }
    public bake() {
        return this;
    }

    public toKatex() {
        return " " + this.value + " "; // TODO: How to handel something like "orf b c" (orf times b times c)? It is displayed as "or f bc"
    }

}

export class Integer extends Literal {
    private v: number;

    constructor(i: number) {
        super(i.toString());
        this.v = i;
    }


    public getValue(): number {
        return this.v;
    } 
}