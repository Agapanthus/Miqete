
import { opar, MNode, Vector, EvalFlags, SimplificationStrategy, Creator, Selectable } from "./mdom";
import * as tutil from "../traverse/util";
import * as l from "./literals";
import { Parentheses } from "./parentheses";


// If b is associative, left rotation doesn't change semantics. Don't forget to link c to b's parent!
export function assoRotateLeft(b: binaryInfixOperator, dontcheck?: boolean): binaryInfixOperator {
    if(!dontcheck) {
        if(!b.isAssociative()) throw "Operator is not associative";
    }
    //      b           c
    //     / \         / \
    //    a   c  ->   b   e
    //       / \     / \ 
    //      d   e   a   d

    const c = b.child(1) as binaryInfixOperator;
    const d = c.child(0);

    c.setChild(b, 0);
    b.setChild(d, 1);

    return c;
}

// If a.child(0) is associative, right rotation doesn't change semantics. Don't forget to link b to a's parent!
export function assoRotateRight(a: binaryInfixOperator, dontcheck?: boolean): binaryInfixOperator {
    if(!dontcheck) {
        if(! (a.child(0) instanceof binaryInfixOperator)) throw "b must be an Operator";
    }

    //      a           b
    //     / \         / \
    //    b   c  ->   e   a
    //   / \             / \
    //  e   f           f   c

    const b = a.child(0) as binaryInfixOperator;
    const f = b.child(1);
    
    b.setChild(a, 1);
    a.setChild(f, 0);

    if(!dontcheck) {
        if(!b.isAssociative()) {
            assoRotateLeft(b, true); // Revert changes
            throw "Operator is not associative";
        }
    }

    return b;
}


export abstract class binaryInfixOperator extends MNode implements Selectable {
    public e: Element
    public s: HTMLElement
    public size: Vector
    public pos: Vector
    
    private prec: number;
    public precendence(): number {
        return this.prec;
    }

    private katexCmd;
    private htmlSym;

    constructor(a: MNode, b: MNode, katexCmd: string, htmlSym: string, precedence: number) {
        super();

        this.setChild(a, 0);
        this.setChild(b, 1);

        this.prec = precedence;
        this.katexCmd = katexCmd;
        this.htmlSym = htmlSym;
    }
    
    public createSelectionAreas(c: Creator): void {
        this.child(0).createSelectionAreas(c);
        this.s = c.add(this.pos, this.size);
        this.child(1).createSelectionAreas(c);
    }

    public strip(): MNode {
        this.setChild(this.child(0).strip(), 0);
        this.setChild(this.child(1).strip(), 1);
        return this;
    }

    public bake(): MNode {
        this.setChild(this.child(0).bake(), 0);
        this.setChild(this.child(1).bake(), 1);
        if(this.aNeedsParens()) {
            this.setChild(new Parentheses(this.child(0), "(", ")"), 0);
        }
        if(this.bNeedsParens()) {
            this.setChild(new Parentheses(this.child(1), "(", ")"), 1);
        }
        return this;
    }

    public rKatex(e: Element): void {

        while(e != null && e.children !== null && e.children.length >= 1 && e.children.length !== 5) {
            if(e.children.length === 5) break;
            if(e.children.length === 3) break;

            e = tutil.getFirstChildNotClass(e, tutil.katexDontFollow);
        }
        if(e === null || e.children === null || (e.children.length !== 5 && e.children.length !== 3)) {
            console.error("Expected 5 children");
            console.log(e);
        }
        const ec = e.children;
        if(e.children.length === 5) {
            if(tutil.directTextContent(ec[2]) !== this.htmlSym) {
                console.error("Expected " + this.htmlSym + " but found " + tutil.directTextContent(ec[2]));
            }
            
            this.e = ec[2];     
            console.log(this.e)

            this.child(0).rKatex(ec[0]);
            this.child(1).rKatex(ec[4]);

        } else {
            if(tutil.directTextContent(ec[1]) !== this.htmlSym) {
                console.error("Expected " + this.htmlSym + " but found " + tutil.directTextContent(ec[1]));
            }
            
            this.e = ec[1];     
            console.log(this.e)

            this.child(0).rKatex(ec[0]);
            this.child(1).rKatex(ec[2]);
        }
    }
    
    public sync(br: Vector) { 
        tutil.measure(this.e, br, this);
        this.child(0).sync(br);
        this.child(1).sync(br);
    }

    private bNeedsParens() {
        return (this.child(1).precendence() < this.precendence()) 
                    // Beware: when the operator is not associative, you  
                    || ((this.child(1).precendence() === this.precendence()) && !this.isAssociative())
    }
    private aNeedsParens() {
        return this.child(0).precendence() < this.precendence();
    }

    public toKatex() {    
        return "{"
            + opar(this.child(0).toKatex(), this.aNeedsParens()) 
            + " " + this.katexCmd + " " 
            + opar(this.child(1).toKatex(), this.bNeedsParens()) 
            + "}";
    }

    public eval(flags: EvalFlags): MNode {
        try {
            const a = this.child(0).eval(flags);
            const b = this.child(1).eval(flags);

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

    // Determines if the operator is associative given these nodes. Implementation has to determine the node's AlgebraicStructure!
    // For example, given a = 1 and b = 2 - 3 * 5 is (1+2) - 3*5  = 1 + (2 - 3*5) ?
    protected abstract isABAssociative(a: MNode, b: MNode): boolean;

    public isAssociative(): boolean {
        if(this.child(1) instanceof binaryInfixOperator) {
            return this.isABAssociative(this.child(0), this.child(1));
        } 
        return false;
    }

    


    // Checks if this is the leftmost child in this BIO-area
    public isLeftmostChild(a: MNode): boolean {
        if(this === a) return true;
        const c = this.child(0);
        if(c === a) return true;
        if(c instanceof binaryInfixOperator) {
            return c.isLeftmostChild(a);
        } else return false;
    }

    // Checks if this is the rightmost child in this BIO-area
    public isRightmostChild(a: MNode): boolean {
        if(this === a) return true;
        const c = this.child(1);
        if(c === a) return true;
        if(c instanceof binaryInfixOperator) {
            return c.isRightmostChild(a);
        } else return false;
    }
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
    protected isABAssociative(a: MNode, b: MNode) {
        return b instanceof Add; // TODO: Not always true!
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
    protected isABAssociative(a: MNode, b: MNode) {
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
    protected isABAssociative(a: MNode, b: MNode) {
        return b instanceof Mul; // TODO: Not always true!
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
    protected isABAssociative(a: MNode, b: MNode) {
        return false; // TODO: Not always true!
    }
}

