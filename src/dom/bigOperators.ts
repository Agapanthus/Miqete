import { opar, MNode, Vector, EvalFlags, SimplificationStrategy, maxPrec, Creator, Selectable } from "./mdom";

import * as tutil from "../traverse/util";
import * as l from "./literals";
import { Parentheses } from "./parentheses";


abstract class bigPrefixOperator implements MNode, Selectable {
    public e: Element
    public s: HTMLElement
    public size: Vector
    public pos: Vector
    public children: MNode[]
    public parent: MNode
    public precendence: number;
    
    private katexCmd;
    private htmlSym;

    // "precedence" is the value visible to the parent. "myVirtualPrec" is the value used to compare with the body-child
    private myVirtualPrec: number; 

    constructor(bottom: MNode, top: MNode, body: MNode, katexCmd: string, htmlSym: string, precedence: number) {
        this.children = [bottom, top, body];
        bottom.parent = this;
        top.parent = this;
        body.parent = this;
        this.precendence = maxPrec;
        this.myVirtualPrec = precedence;
        this.katexCmd = katexCmd;
        this.htmlSym = htmlSym;
    }

    public createSelectionAreas(c: Creator): void {
        this.s = c.add(this.pos, this.size);
        c.push(true);
        this.children[0].createSelectionAreas(c);
        c.pop();
        c.push(true);
        this.children[1].createSelectionAreas(c);
        c.pop();
        this.children[2].createSelectionAreas(c);
    }

    public strip(): MNode {
        this.children[0] = this.children[0].strip();
        this.children[1] = this.children[1].strip();
        this.children[2] = this.children[2].strip();
        return this;
    }

    public bake(): MNode {
        this.children[0] = this.children[0].bake();
        this.children[1] = this.children[1].bake();
        this.children[2] = this.children[2].bake();
        if(this.children[2].precendence < this.myVirtualPrec) {
            this.children[2] = new Parentheses(this.children[2], "(", ")");
            this.children[2].parent = this;
        }
        return this;
    }

    public rKatex(e: Element) {

        let lastBef = null;
        while(e && e.children && e.children.length >= 1) {
            if(e.children.length === 3) {
                const tfcwc = tutil.tfcwc(e.children[1]);
                if(tfcwc && tutil.directTextContent(tfcwc) === this.htmlSym) break;
                lastBef = e;
            }
            
            e = tutil.getFirstChildNotClass(e, tutil.katexDontFollow);
        }

        if(e === null || e.children === null || e.children.length !== 3) {
            console.error("Expected 3 children");
            console.log(e);
        }
        if(!lastBef || lastBef.children.length !== 3) {
            console.error("There should be a 'last-before'!");
        }
        const ec = e.children;

        const tfcwc = tutil.tfcwc(ec[1]);
        if(!tfcwc || tutil.directTextContent(tfcwc) !== this.htmlSym) {
            console.error("Expected " + this.htmlSym + " but found " + tutil.directTextContent(tfcwc));
        }
        
        this.e = tfcwc;     
        console.log(this.e)

        this.children[0].rKatex(ec[0]);
        this.children[1].rKatex(ec[2]);
        this.children[2].rKatex(lastBef.children[2]);
    }

    public sync(br: Vector) {
        tutil.measure(this.e, br, this);
        this.children[0].sync(br);
        this.children[1].sync(br);
        this.children[2].sync(br);
    }

    public toKatex() {
    
        return "{" + this.katexCmd
            + "_{" + this.children[0].toKatex() +  "}"
            + "^{" + this.children[1].toKatex() +  "}"
            + opar(this.children[2].toKatex(), this.children[2].precendence < this.myVirtualPrec) 
            + "}";
    }

    public eval(flags: EvalFlags): MNode {
        try {
            const b = this.children[0].eval(flags);
            const t = this.children[1].eval(flags);
            
            switch(flags.strategy) {
                case SimplificationStrategy.none:
                    if(b instanceof l.Literal && t instanceof l.Literal) {
                        return this.evalP(b, t, this.children[2], flags);
                    }
                break;
                default: console.error("not impl");
            }
        } catch(e) {
            console.error("Exception: " + e);
        }

        return null;
    }

    protected abstract evalP(b: l.Literal, t :l.Literal, bod: MNode, flags: EvalFlags): MNode;
}

export class Sum extends bigPrefixOperator {
    constructor(bottom: MNode, top: MNode, body: MNode) {
        super(bottom, top, body, "\\sum", "\u2211", 21);
    }
    protected evalP(b: l.Literal, t: l.Literal, bod: MNode, flags: EvalFlags): MNode {
        if(b instanceof l.Integer && t instanceof l.Integer && flags.prec === 32) {
            //return new l.Integer( b.getValue() + b.getValue() );
            console.warn("Dummy eval!");
            return bod.eval(flags);  // TODO: Dummy!
        } else throw "Addition only supported for integers";
    }
}

export class Prod extends bigPrefixOperator {
    constructor(bottom: MNode, top: MNode, body: MNode) {
        super(bottom, top, body, "\\prod", "\u220f", 31);
    }
    protected evalP(b: l.Literal, t: l.Literal, bod: MNode, flags: EvalFlags): MNode {
        if(b instanceof l.Integer && t instanceof l.Integer && flags.prec === 32) {
            //return new l.Integer( b.getValue() + b.getValue() );
            console.warn("Dummy eval!");
            return bod.eval(flags);  // TODO: Dummy!
        } else throw "Addition only supported for integers";
    }
}