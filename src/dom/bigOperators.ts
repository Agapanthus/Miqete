import { opar, MNode, Vector, EvalFlags, SimplificationStrategy, maxPrec, Creator, Selectable } from "./mdom";

import * as tutil from "../traverse/util";
import * as l from "./literals";
import { Parentheses } from "./parentheses";


abstract class bigPrefixOperator extends MNode implements Selectable {
    public e: Element
    public s: HTMLElement
    public size: Vector
    public pos: Vector

    public precendence(): number {
        return maxPrec;
    }
    
    private katexCmd;
    private htmlSym;

    // "precedence" is the value visible to the parent. "myVirtualPrec" is the value used to compare with the body-child
    private myVirtualPrec: number; 

    constructor(bottom: MNode, top: MNode, body: MNode, katexCmd: string, htmlSym: string, precedence: number) {
        super();

        this.setChild(bottom, 0);
        this.setChild(top, 1);
        this.setChild(body, 2);
        
        this.myVirtualPrec = precedence;
        this.katexCmd = katexCmd;
        this.htmlSym = htmlSym;
    }

    public createSelectionAreas(c: Creator): void {
        this.s = c.add(this.pos, this.size);
        c.push(true);
        this.child(0).createSelectionAreas(c);
        c.pop();
        c.push(true);
        this.child(1).createSelectionAreas(c);
        c.pop();
        this.child(2).createSelectionAreas(c);
    }

    public strip(): MNode {
        this.setChild(this.child(0).strip(), 0);
        this.setChild(this.child(1).strip(), 1);
        this.setChild(this.child(2).strip(), 2);
        return this;
    }

    public bake(): MNode {
        this.setChild(this.child(0).bake(), 0);
        this.setChild(this.child(1).bake(), 1);
        this.setChild(this.child(2).bake(), 2);

        if(this.child(2).precendence() < this.myVirtualPrec) {
            this.setChild(new Parentheses(this.child(2), "(", ")"), 2);
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

        this.child(0).rKatex(ec[0]);
        this.child(1).rKatex(ec[2]);
        this.child(2).rKatex(lastBef.children[2]);
    }

    public sync(br: Vector) {
        tutil.measure(this.e, br, this);
        this.child(0).sync(br);
        this.child(1).sync(br);
        this.child(2).sync(br);
    }

    public toKatex() {
    
        return "{" + this.katexCmd
            + "_" + this.child(0).toKatex() +  " "
            + "^" + this.child(1).toKatex() +  " "
            + opar(this.child(2).toKatex(), this.child(2).precendence() < this.myVirtualPrec) 
            + "}";
    }

    public eval(flags: EvalFlags): MNode {
        try {
            const b = this.child(0).eval(flags);
            const t = this.child(1).eval(flags);
            
            switch(flags.strategy) {
                case SimplificationStrategy.none:
                    if(b instanceof l.Literal && t instanceof l.Literal) {
                        return this.evalP(b, t, this.child(2), flags);
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