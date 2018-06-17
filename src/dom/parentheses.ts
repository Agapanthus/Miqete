
import { MNode, Vector, EvalFlags, SimplificationStrategy, maxPrec, Creator, Selectable } from "./mdom";
import * as tutil from "../traverse/util";
import * as util from "../util/util";


class Brace implements MNode, Selectable {
    public e: Element
    public s: HTMLElement
    public size: Vector
    public pos: Vector
    public children: MNode[]
    public parent: MNode
    public precendence: number;

    private isRight: boolean;
    private brace: string;

    constructor(isRight: boolean, brace: string) {
        this.children = [];
        this.precendence = maxPrec;
        this.e = undefined;
        this.parent = undefined;
        this.size = undefined;
        this.pos = undefined;
        this.isRight = isRight;
        this.brace = brace;
    }

    public createSelectionAreas(c: Creator): void {
        this.s = c.add(this.pos, this.size);
    }

    public strip(): MNode {
        console.error("Never call!");
        return null;
    }
    public bake(): MNode {
        console.error("Never call!");
        return null;
    }

    public rKatex(e: Element) {
        this.e = tutil.tfcwc(e);
        if(this.e === null) console.error("Must exist!");
        if(tutil.directTextContent(this.e) !== this.brace) console.error("Expected "+ this.brace + " but found " + tutil.directTextContent(this.e));
    }

    public sync(br: Vector) { 
        tutil.measure(this.e, br, this);
    }

    public toKatex() {
        if(this.isRight) return " \\right" + this.brace+ " ";
        else return " \\left " + this.brace + " ";
    }

    public eval(flags: EvalFlags): MNode {
        console.error("Semantic nonsense!");
        return null;
    }
}

export class Parentheses implements MNode {
    private e: Element
    public s: HTMLElement
    public children: MNode[]
    public parent: MNode
    public precendence: number;

    private open: Brace;
    private close: Brace;

    constructor(a: MNode, open: string, close: string) {
        this.open = new Brace(false, open);
        this.close = new Brace(true, close);

        if(open !== "(" || close !== ")") {
            console.warn("TODO: might be an interval, abs, the skalar product or something like that...");
        }

        this.children = [this.open, a, this.close];
        a.parent = this;
        this.open.parent = this;
        this.close.parent = this;

        this.precendence = maxPrec;
        this.e = undefined;
        this.parent = undefined;
    }

    public createSelectionAreas(c: Creator): void {
        this.children[0].createSelectionAreas(c);
        this.children[1].createSelectionAreas(c);
        this.children[2].createSelectionAreas(c);
    }

    public strip(): MNode {
        this.children[1].parent = this.parent;
        return this.children[1];
    }

    public bake(): MNode {
        this.children[1] = this.children[1].bake();
        return this;
    }
    
    public rKatex(e: Element) {
        while(e != null && e.children !== null && e.children.length >= 1 && e.children.length !== 3) {
            e = tutil.getFirstChildNotClass(e, tutil.katexDontFollow);
        }
        if(e === null || e.children === null || e.children.length !== 3) {
            console.error("Expected 3 children");
            console.log(e);
        }
        const ec = e.children;
        if(!ec[0].className || !util.hasElement("mopen", ec[0].className.split(" "))  ) {
            console.error("Expected mopen but found " + ec[0].className);
        }
        if(!ec[2].className || !util.hasElement("mclose", ec[2].className.split(" "))  ) {
            console.error("Expected mclose but found " + ec[2].className);
        }  

        this.e = e;     
        
        this.children[0].rKatex(ec[0]);
        this.children[1].rKatex(ec[1]);
        this.children[2].rKatex(ec[2]);
    }

    
    public sync(br: Vector) { 
        this.children[0].sync(br);
        this.children[1].sync(br);
        this.children[2].sync(br);
    }

    public toKatex(): string {
        return "{" + this.children[0].toKatex()
            + this.children[1].toKatex()
            + this.children[2].toKatex() + "}";
    }

    public eval(flags: EvalFlags): MNode {
        return this.children[0].eval(flags);
    }

}