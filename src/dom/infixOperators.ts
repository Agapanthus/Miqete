
import { opar, MNode, Vector, EvalFlags, SimplificationStrategy } from "./mdom";
import * as tutil from "../traverse/util";
import * as l from "./literals";
import { Parentheses } from "./parentheses";



abstract class binaryInfixOperator implements MNode {
    public e: Element
    public size: Vector
    public pos: Vector
    public children: MNode[]
    public parent: MNode
    public precendence: number;

    private katexCmd;
    private htmlSym;

    constructor(a: MNode, b: MNode, katexCmd: string, htmlSym: string, precedence: number) {
        this.children = [a,b];
        a.parent = this;
        b.parent = this;

        this.precendence = precedence;
        this.e = undefined;
        this.parent = undefined;
        this.size = undefined;
        this.pos = undefined;
        this.katexCmd = katexCmd;
        this.htmlSym = htmlSym;
    }

    public strip(): MNode {
        this.children[0] = this.children[0].strip();
        this.children[1] = this.children[1].strip();
        return this;
    }

    public bake(): MNode {
        this.children[0] = this.children[0].bake();
        this.children[1] = this.children[1].bake();
        if(this.aNeedsParens()) this.children[0] = new Parentheses(this.children[0], "(", ")");
        if(this.bNeedsParens()) this.children[1] = new Parentheses(this.children[1], "(", ")");
        return this;
    }

    public rKatex(e: Element, br: Vector): void {

        while(e != null && e.children !== null && e.children.length >= 1 && e.children.length !== 5) {
            e = tutil.getFirstChildNotClass(e, tutil.katexDontFollow);
        }
        if(e === null || e.children === null || e.children.length !== 5) {
            console.error("Expected 5 children");
            console.log(e);
        }
        const ec = e.children;
        if(tutil.directTextContent(ec[2]) !== this.htmlSym) {
            console.error("Expected " + this.htmlSym + " but found " + tutil.directTextContent(ec[2]));
        }
        
        this.e = ec[2];     
        console.log(this.e)
        tutil.measure(ec[2], br, this);

        this.children[0].rKatex(ec[0], br);
        this.children[1].rKatex(ec[4], br);
    }

    private bNeedsParens() {
        return (this.children[1].precendence < this.precendence) 
                    // Beware: when the operator is not associative, you  
                    || ((this.children[1].precendence === this.precendence) && !this.isAssociative(this.children[0], this.children[1]))
    }
    private aNeedsParens() {
        return this.children[0].precendence < this.precendence;
    }

    public toKatex() {    
        return "{"
            + opar(this.children[0].toKatex(), this.aNeedsParens()) 
            + " " + this.katexCmd + " " 
            + opar(this.children[1].toKatex(), this.bNeedsParens()) 
            + "}";
    }

    public eval(flags: EvalFlags): MNode {
        try {
            const a = this.children[0].eval(flags);
            const b = this.children[1].eval(flags);

            switch(flags.strategy) {
                case SimplificationStrategy.none:
                    if(a instanceof l.Literal && b instanceof l.Literal) {
                        return this.evalP(a, b, flags);
                    }
                break;
                default: console.error("not impl");
            }
        } catch(e) {
            console.error("Exception: " + e);
        }

        return null;
    }

    // Evaluates this term
    protected abstract evalP(a: l.Literal, b: l.Literal, flags: EvalFlags): MNode;

    // Determines if the operator is associative given these nodes. If relevant, it has to determine the node's domain for itself.
    // For example, given a = 1 and b = 2 - 3 * 5 is (1+2) - 3*5  = 1 + (2 - 3*5) ?
    protected abstract isAssociative(a: MNode, b: MNode): boolean;
}

export class Add extends binaryInfixOperator {
    constructor(a: MNode, b: MNode) {
        super(a, b, "+", "+", 20);
    }
    protected evalP(a: l.Literal, b :l.Literal, flags: EvalFlags) {
        if(a instanceof l.Integer && b instanceof l.Integer && flags.prec === 32) {
            return new l.Integer( a.getValue() + b.getValue() );
        } else throw "Addition only supported for integers";
    }
    protected isAssociative(a: MNode, b: MNode) {
        return true; // TODO: Not always true!
    }
}
export class Sub extends binaryInfixOperator {
    constructor(a: MNode, b: MNode) {
        super(a, b, "-", "\u2212", 20); // http://www.mauvecloud.net/charsets/CharCodeFinder.html
    }
    protected evalP(a: l.Literal, b :l.Literal, flags: EvalFlags) {
        if(a instanceof l.Integer && b instanceof l.Integer && flags.prec === 32) {
            return new l.Integer( a.getValue() - b.getValue() );
        } else throw "Subtraction only supported for integers";
    }
    protected isAssociative(a: MNode, b: MNode) {
        return false; // TODO: Not always true!
    }
}


// TODO: not that easy! What's about multiplying without "*" ?
export class Mul extends binaryInfixOperator {
    constructor(a: MNode, b: MNode) {
        super(a, b, "\\cdot", "\u22c5", 30);
    }
    protected evalP(a: l.Literal, b :l.Literal, flags: EvalFlags) {
        if(a instanceof l.Integer && b instanceof l.Integer && flags.prec === 32) {
            return new l.Integer( a.getValue() * b.getValue() );
        } else throw "Multiplication only supported for integers";
    }
    protected isAssociative(a: MNode, b: MNode) {
        return true; // TODO: Not always true!
    }
}

// TODO: not that easy! What's about ÷,/ and frac?
export class Div extends binaryInfixOperator {
    constructor(a: MNode, b: MNode) {
        super(a, b, "/", "/", 30);
    }
    
    protected evalP(a: l.Literal, b :l.Literal, flags: EvalFlags) {
        if(a instanceof l.Integer && b instanceof l.Integer && flags.prec === 32) {
            return new l.Integer( a.getValue() / b.getValue() );
        } else throw "Division only supported for integers";
    }
    protected isAssociative(a: MNode, b: MNode) {
        return false; // TODO: Not always true!
    }
}

