
import { MNode, Vector, maxPrec, Creator, Selectable } from "./mdom";
import * as tutil from "./util";
import * as util from "../util/util";
import { Config } from "../util/config";
import { defaultInput, Splitable, MNodePair } from "./inputImporter";


class Brace extends MNode implements Selectable {
    public e: Element
    public s: HTMLElement
    public size: Vector
    public pos: Vector
    
    public precendence(): number {
        return maxPrec;
    }

    private isRight: boolean;
    private brace: string;

    constructor(isRight: boolean, brace: string) {
        super();

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


        // TODO: Large braces might be replaced by ⎠ ⎝ 
        // In that cases, although, size is wrong.
    }

    public sync(br: Vector) { 
        tutil.measure(this.e, br, this);
    }

    public toKatex() {
        if(this.isRight) return "\\right" + this.brace+ " ";
        else return "\\left " + this.brace + " ";
    }

    public input(e: string, child: MNode, operate: boolean): boolean {
        return this.forceGetParent().input(e, this, operate);
    }
}

export class Parentheses extends MNode implements Splitable {

    public precendence(): number {
        return maxPrec;
    }

    private open: Brace;
    private close: Brace;

    constructor(a: MNode, open: string, close: string, private config: Config, private proto: boolean = false) {
        super();

        this.open = new Brace(false, open);
        this.close = new Brace(true, close);

        if(open !== "(" || close !== ")") {
            console.warn("TODO: might be an interval, abs, the skalar product or something like that...");
        }

        this.setChild(this.open, 0);
        this.setChild(a, 1);
        this.setChild(this.close, 2);
    }

    public createSelectionAreas(c: Creator): void {
        this.child(0).createSelectionAreas(c);
        this.child(1).createSelectionAreas(c);
        this.child(2).createSelectionAreas(c);
    }

    public strip(): MNode {
        this.replace(this.child(1));
        return this.child(1);
    }

    public bake(): MNode {
        this.setChild(this.child(1).bake(), 1);
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
        
        this.child(0).rKatex(ec[0]);
        this.child(1).rKatex(ec[1]);
        this.child(2).rKatex(ec[2]);
    }

    
    public sync(br: Vector) { 
        this.child(0).sync(br);
        this.child(1).sync(br);
        this.child(2).sync(br);
    }

    public toKatex(): string {
        let a = "";
        let b = "";
        if(this.proto) {
            a = "\\color{lightgrey}";
            b = "\\color{black}";
        }
        return "{" + a + this.child(0).toKatex() + b
            + this.child(1).toKatex()
            + a + this.child(2).toKatex() + b + "}";
        
    }


    public input(e: string, child: MNode, operate: boolean): boolean {
        if(child === null) {
            if(!operate) {
                if(e === "Backspace") {
                    // Parent should understand, that i want do be deleted
                    console.log("self delete!");
                    return this.forceGetParent().input("Delete", this, true);
                }
            } 
            return defaultInput(e, this, child, operate, this, this.config);

        } else if(child === this.child(0)) {
            if(!operate) {
                if(e === "Delete") {
                    // Parent should understand, that i want do be deleted
                    return this.forceGetParent().input("Delete", this, true);
                }
            } 
            // redirect
            return this.forceGetParent().input(e, this, false);

        } else if(child === this.child(1)) {
            if(!operate) {
                if(e === "Backspace") {
                    this.replace(this.child(1));
                    return true;
                }
            } 
            return false;
        
        } else if(child === this.child(2)) {
            // redirect
            if(!operate) {
                if(e === "Delete") {
                    console.log("remove");
                    this.replace(this.child(1));
                    return true;
                }
            } 
            return this.child(1).input(e, null, false);
        }


        return false;
    }

    public split(child: MNode, operate: boolean) : MNodePair {
        if(this.child(0)) {
            return {
                left: null,
                right: this
            }
        } else throw "This shouldn't happen!"
    }

}