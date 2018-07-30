
import { MNode, Vector, maxPrec, Creator, Selectable } from "./mdom";
import * as tutil from "./util";
import * as util from "../util/util";


// This places a placeholder at the end of block - useful to get the cursor work with almost no work
export class Layer extends MNode  {
    
    public e: Element
    public s: HTMLElement

    public size: Vector // Dead
    public pos: Vector  // Dead
    

    public precendence(): number {
        return maxPrec;
    }

    constructor(a: MNode) {
        super();
        this.setChild(a, 0);
    }

    public createSelectionAreas(c: Creator): void {
        c.push(true);
        this.child(0).createSelectionAreas(c);
        this.s = c.pop();
    }

    public strip(): MNode {
        this.child(0).setParent__INTERNAL(this.getParent());
        return this.child(1);
    }

    public bake(): MNode {
        this.setChild(this.child(0).bake(), 1);
        return this;
    }
    
    public rKatex(e: Element) {
        this.child(0).rKatex(e);
    }

    
    public sync(br: Vector) { 
        this.child(0).sync(br);
    }

    public toKatex(): string {
        return this.child(0).toKatex();
    }

    public input(e: string, child: MNode, operate: boolean) {

        return false;
        // TODO
    }

}