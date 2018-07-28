
import { MNode, Vector, Creator, Selectable, maxPrec, Empty } from "./mdom";
import * as tutil from "./util";
import * as l from "./literals";
import { Config } from "../util/config";
import { Parentheses } from "./parentheses";


const LCHILD = 0;
const RCHILD = 1;
const OPERATOR = 2;

const infixOperators = {
    "+": {
        html: "+", 
        prec: 20,
        assoc: ["+"] // TODO: -? It is quite often associative with +. So we might want to be it here too. But need to take care of the negation...
    },
    "-" : {
        html: "\u2212",  // http://www.mauvecloud.net/charsets/CharCodeFinder.html
        prec: 20,
        assoc: []
    },
    "\\cdot": {
        html: "\u22c5", 
        prec: 30,
        assoc: ["\\cdot"]
    },
    "" : { // The default-Operator
        html: "",
        prec: maxPrec,
        assoc: [""]
    }
    /*"/": {
        html: "/", 
        prec: 30,
        assoc: ["\\cdot", "/"]
    }*/

}

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

export class binaryInfixOperator extends MNode {
       
    private prec: number;
    public precendence(): number {
        return this.prec;
    }


    private mySymbol : {
        html: string,
        prec: number,
        assoc: string[]
    };

    constructor(a: MNode, b: MNode, private katexCmd: string, private config: Config) {
        super();

        this.setChild(a, LCHILD);
        this.setChild(b, RCHILD);
        this.setChild(katexCmd.length > 0 ?
                new l.Symbol(katexCmd, this.config, false)
                : new Empty(), OPERATOR);

        this.mySymbol = infixOperators[katexCmd];
        if(!this.mySymbol) console.error("Unknown symbol " + katexCmd);
        this.prec = this.mySymbol.prec;
    }
    
    public createSelectionAreas(c: Creator): void {
        this.child(LCHILD).createSelectionAreas(c);
        this.child(OPERATOR).createSelectionAreas(c);
        this.child(RCHILD).createSelectionAreas(c);
    }

    public strip(): MNode {
        this.setChild(this.child(LCHILD).strip(), LCHILD);
        this.setChild(this.child(RCHILD).strip(), RCHILD);
        return this;
    }

    public bake(): MNode {
        this.setChild(this.child(LCHILD).bake(), LCHILD);
        this.setChild(this.child(RCHILD).bake(), RCHILD);
        if(this.aNeedsParens()) {
            this.setChild(new Parentheses(this.child(LCHILD), "(", ")"), LCHILD);
        }
        if(this.bNeedsParens()) {
            this.setChild(new Parentheses(this.child(RCHILD), "(", ")"), RCHILD);
        }
        return this;
    }

    public rKatex(e: Element): void {
        const o = e;
        const empty = this.child(OPERATOR) instanceof Empty;

        if(empty) {
            while(e != null && e.children !== null && e.children.length >= 1) {
                if(e.children.length === 4) break;
                if(e.children.length === 3) break;
                e = tutil.getFirstChildNotClass(e, tutil.katexDontFollow);
            }
            if(e === null || e.children === null || (e.children.length !== 4 && e.children.length !== 3)) {
                console.error("Expected 3 or 4 children",e,o);
            }
            const ec = e.children;
            if(e.children.length === 4) {
                this.child(LCHILD).rKatex(ec[0]);
                this.child(RCHILD).rKatex(ec[3]);
            } else if(e.children.length === 3) {
                this.child(LCHILD).rKatex(ec[0]);
                this.child(RCHILD).rKatex(ec[2]);
            }
        } else {
            while(e != null && e.children !== null && e.children.length >= 1) {
                if(e.children.length === 5) break;
                if(e.children.length === 3) break;
                e = tutil.getFirstChildNotClass(e, tutil.katexDontFollow);
            }
            if(e === null || e.children === null || (e.children.length !== 5 && e.children.length !== 3 )) {
                console.error("Expected 3 or 5 children",e,o);
            }
            const ec = e.children;
            if(e.children.length === 5) {
                this.child(OPERATOR).rKatex(ec[2]);
                this.child(LCHILD).rKatex(ec[0]);
                this.child(RCHILD).rKatex(ec[4]);
            } else {            
                this.child(OPERATOR).rKatex(ec[1]);
                this.child(LCHILD).rKatex(ec[0]);
                this.child(RCHILD).rKatex(ec[2]);
            }
        }
    }
    
    public sync(br: Vector) { 
        this.child(LCHILD).sync(br);
        this.child(OPERATOR).sync(br);
        this.child(RCHILD).sync(br);
    }

    private bNeedsParens() {
        if(!this.config.semantics) return false;
        const res = (this.child(RCHILD).precendence() < this.precendence()) 
                    // Beware: when the operator is not associative, you  
                    || ((this.child(RCHILD).precendence() === this.precendence()) && !this.isAssociative())
        return res;
    }
    private aNeedsParens() {
        if(!this.config.semantics) return false;
        return this.child(LCHILD).precendence() < this.precendence();
    }

    public toKatex() {    
        if(this.aNeedsParens()) {
            this.setChild(new Parentheses(this.child(LCHILD), "(", ")", true), LCHILD);
        }
        if(this.bNeedsParens()) {
            this.setChild(new Parentheses(this.child(RCHILD), "(", ")", true), RCHILD);
        }
        
        return "{"
            + this.child(LCHILD).toKatex()
            + this.child(OPERATOR).toKatex() 
            + this.child(RCHILD).toKatex()
            + "}";
    }

    public getCmd() {
        return this.katexCmd;
    }

    // Determines if the operator is associative given these nodes.
    // For example, given a = 1 and b = 2 - 3 * 5 is (1+2) - 3*5  = 1 + (2 - 3*5) ?
    protected isRightAssociative(r: MNode): boolean {
        if(!this.config.semantics) return true;

        if(r instanceof binaryInfixOperator) {
            if(0 <= this.mySymbol.assoc.indexOf(r.getCmd())) {
                return true;
            }
            return false;
        } 
        return false;
    }

    public isAssociative(): boolean {
        if(!this.config.semantics) return true;
        if(this.child(RCHILD) instanceof Parentheses) return true;

        if(this.child(RCHILD) instanceof binaryInfixOperator) {
            return this.isRightAssociative(this.child(RCHILD));
        } 
        return false;
    }

    


    // Checks if this is the leftmost child in this BIO-area
    public isLeftmostChild(a: MNode): boolean {
        if(this === a) return true;
        const c = this.child(LCHILD);
        if(c === a) return true;
        if(c instanceof binaryInfixOperator) {
            return c.isLeftmostChild(a);
        } else return false;
    }

    // Checks if this is the rightmost child in this BIO-area
    public isRightmostChild(a: MNode): boolean {
        if(this === a) return true;
        const c = this.child(RCHILD);
        if(c === a) return true;
        if(c instanceof binaryInfixOperator) {
            return c.isRightmostChild(a);
        } else return false;
    }

    public input(e: string, child: MNode, operate: boolean) {
        
    

        if(!operate) {
            if(child == this.child(LCHILD)) {
                // TODO: handle delete

                // Redirect from first child to parent
                const p = this.getParent();
                if(p) p.input(e, this, operate);

            } else if(child == this.child(OPERATOR)) {
                // Redirect everything from the operator to the first child
                console.log("left");
                this.child(LCHILD).input(e, null, false);

            } else if(child == this.child(RCHILD)) {
                // TODO: handle backspace

            } else if(child == null) {
                // Redirect to the right child
                console.log("right");
                this.child(RCHILD).input(e, null, false);
                
            } else console.error("Unreachable", child);
        } else {
            // TODO
        }


    }
}

