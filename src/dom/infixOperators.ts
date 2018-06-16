
import { MNode, EvalFlags, SimplificationStrategy } from "./mdom";
import { ENode, Vector } from "./edom";
import * as tutil from "../traverse/util";
import * as l from "./literals";


function opar(inner: string, addPar: boolean) {
    if(addPar) return "\\left(" + inner + "\\right)";
    return inner;
}


abstract class binaryInfixOperator implements MNode {
    public e: Element
    public size: Vector
    public pos: Vector
    public children: MNode[]
    public parent: MNode
    public precendence: number;

    // TODO: Instead of "a*b" just write "a b"
    private spaceSyno: boolean;

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

    public rKatex(e: Element, br: Vector) {

        while(e != null && e.children !== null && e.children.length >= 1 && e.children.length !== 5) {
            e = tutil.getFirstChildNotClass(e, tutil.katexDontFollow);
        }
        if(e === null || e.children === null || e.children.length !== 5) {
            console.error("Expected 5 children");
            console.log(e);
        }
        const ec = e.children;
        if(ec[2].textContent !== this.htmlSym) {
            console.error("Expected " + this.htmlSym + " but found " + ec[2].textContent);
        }
        
        this.e = ec[2];     
        console.log(this.e)
        tutil.measure(ec[2], br, this);

        this.children[0].rKatex(ec[0], br);
        this.children[1].rKatex(ec[4], br);
    }

    public toKatex() {
    
        return "{"
            + opar(this.children[0].toKatex(), this.children[0].precendence < this.precendence) 
            + " " + this.katexCmd + " " 
            + opar(this.children[1].toKatex(), this.children[1].precendence < this.precendence) 
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

    protected abstract evalP(a: l.Literal, b :l.Literal, flags: EvalFlags): MNode;
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
}

