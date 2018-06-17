
import { Vector, MNode, EvalFlags, maxPrec, Creator, Selectable} from "./mdom";

import * as tutil from "../traverse/util";
import * as util from "../util/util";

export abstract class Literal implements MNode, Selectable {
    public e: Element
    public s: HTMLElement
    public size: Vector
    public pos: Vector
    public children: MNode[]
    public parent: MNode
    public precendence: number;

    private value: string;

    constructor(value: string) {
        this.children = [];
        this.e = undefined;
        this.parent = undefined;
        this.size = undefined;
        this.pos = undefined;   
        this.value = value;     
        this.precendence = maxPrec;
    }

    public rKatex(e: Element) {
        this.e = tutil.tfcwc(e);
        if(this.e === null) console.error("Must exist!");
        console.log(this.e);
    }

    public sync(br: Vector) { 
        tutil.measure(this.e, br, this);
    }

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


    abstract eval(flags: EvalFlags): MNode;
}

export class Integer extends Literal {
    private v: number;

    constructor(i: number) {
        super(i.toString());
        this.v = i;
    }

    public eval(flags: EvalFlags) {
        return new Integer(this.v);
    }

    public getValue(): number {
        return this.v;
    } 
}