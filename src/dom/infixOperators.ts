
import { MNode, Vector, Creator, Selectable, maxPrec, Empty, Joinable } from "./mdom";
import * as tutil from "./util";
import * as l from "./literals";
import { Config } from "../util/config";
import { Parentheses } from "./parentheses";
import { Associative, bringClose } from "./associative";



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
    },
    "=": {
        html: "=", 
        prec: 10,
        assoc: ["="] 
    },
    /*"/": {
        html: "/", 
        prec: 30,
        assoc: ["\\cdot", "/"]
    }*/

}


export class binaryInfixOperator extends Associative {
       
    private prec: number;
    public precendence(): number {
        return this.prec;
    }


    private mySymbol : {
        html: string,
        prec: number,
        assoc: string[]
    };

    constructor(a: MNode, b: MNode, private katexCmd: string, protected config: Config) {
        super();

        if(!a) a = new l.Symbol("?", this.config); // TODO: Better placeholder? Implement "optional prefix/postfix" operator
        if(!b) b = new l.Symbol("?", this.config);


        this.setChild(a, LCHILD);
        this.setChild(b, RCHILD);
        this.setChild(katexCmd.length > 0 ?
                new l.Symbol(katexCmd, this.config, false)
                : new Empty(), OPERATOR);

        this.mySymbol = infixOperators[katexCmd];
        if(!this.mySymbol) console.error("Unknown symbol " + katexCmd);
        this.prec = this.mySymbol.prec;
    }

    public getLeft(): number  {
        return LCHILD;
    }
    public getRight(): number  {
        return RCHILD;
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
            this.setChild(new Parentheses(this.child(LCHILD), "(", ")",  this.config), LCHILD);
        }
        if(this.bNeedsParens()) {
            this.setChild(new Parentheses(this.child(RCHILD), "(", ")",  this.config), RCHILD);
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
                    || ((this.child(RCHILD).precendence() === this.precendence()) 
                        && !this.isAssociative() 
                        && !(this.child(LCHILD) instanceof Parentheses)
                        && !(this.child(RCHILD) instanceof Parentheses)
                    )
        return res;
    }
    private aNeedsParens() {
        if(!this.config.semantics) return false;
        return this.child(LCHILD).precendence() < this.precendence();
    }

    public toKatex() {    
        if(this.aNeedsParens()) {
            this.setChild(new Parentheses(this.child(LCHILD), "(", ")", this.config, true), LCHILD);
        }
        if(this.bNeedsParens()) {
            this.setChild(new Parentheses(this.child(RCHILD), "(", ")", this.config, true), RCHILD);
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
        if(this.child(RCHILD) instanceof binaryInfixOperator) {
            return this.isRightAssociative(this.child(RCHILD));
        } 
        return false;
    }

    
    private removeSelf() {
        joinToSequence(this.child(LCHILD), this.child(RCHILD), this, this.config);
    }

    private deleteChild(child: number) {
        if(this instanceof Sequence) {
            if(child === LCHILD) this.replace(this.child(RCHILD));
            else this.replace(this.child(LCHILD));
        } else {
            this.setChild( new l.Symbol("?", this.config), child); // TODO: Better placeholder? 
        }
    }

    public input(e: string, child: MNode, operate: boolean): boolean{
        if(!operate) {
            if(child == this.child(LCHILD)) {
                if(e === "Delete") {
                    // TODO: handle delete
                    return false;

                } else {
                    // Redirect from first child to parent
                    const p = this.getParent();
                    if(p) return p.input(e, this, operate);
                    return false;
                }
            } else if(child == this.child(OPERATOR)) {
                if(e == "Delete") {
                    this.removeSelf();
                    return true;
                } else if(e == "Backspace") {
                    if(this.child(LCHILD).input(e, null, false)) {
                        return true;
                    } else {
                        this.deleteChild(LCHILD);
                        return true;
                    }
                } else {
                    // Redirect everything from the operator to the first child
                    return this.child(LCHILD).input(e, null, false);
                }

            } else if(child == this.child(RCHILD)) {
                // handle backspace (convert to sequence)
                if(e == "Backspace") {
                    this.removeSelf();
                    return true;
                }
                return false;

            } else if(child == null) {
                // Redirect to the right child
                return this.child(RCHILD).input(e, null, false);
                
            } else console.error("Unreachable", child);
        } else {
            if(e === "Delete") {
                this.deleteChild(this.forceGetIndex(child));
                return true;
            }


            // TODO
            return false;
        }


    }

}


        

////////////////////////////////////////////////////////////////////


// Will do a "smart" tryjoin using associativity and replace "predecessor" with the resulting tree
export function joinToSequence(left: MNode, right: MNode, predecessor: MNode, config: Config) {
  
    if(left.forceGetParent() === right.forceGetParent()) {
        const p = left.forceGetParent();
        if(p instanceof Associative) {
            if(left instanceof Associative) left = left.getRightMost();
            if(right instanceof Associative) right = right.getLeftMost();
            const c = bringClose(left,right);
            
            if(c instanceof Associative) {
                left = c.child(c.getLeft());
                right = c.child(c.getRight());
                predecessor = c;
            } else console.error("FATAL: Their common ancestor MUST be associative!"); // This should never happen
        }
    } else console.warn("joining children of different branches. This might be quite not what you want.");

    tutil.sanityCheck(predecessor);
    const seq = new Sequence(left, right, config);
    predecessor.replace(seq);
    seq.tryJoinThem();
}


export class Sequence extends binaryInfixOperator {

    constructor(a: MNode, b: MNode, config: Config) {
        super(a,b,"", config);
    }

    public tryJoinThem() {
        const c = this.child(0) as any;
        if("tryJoin" in c) {
            const r = c.tryJoin(this.child(1));
            if(r) this.replace(r);
        }

    } 

    private tryRemove(tryReplace: number): boolean {
        if(this.child(tryReplace)) {
            this.replace(this.child(tryReplace))
            return true;
        } else {
            // Remove self
            return this.forceGetParent().input("Delete", this, true);
        }  
    }

   
    public input(e: string, child: MNode, operate: boolean): boolean{
        if(!operate) {
            if(child == this.child(LCHILD)) {
                if(e === "Delete") {
                    // TODO: handle delete
                    return false;

                } else {
                    // Redirect from first child to parent
                    return this.forceGetParent().input(e, this, operate);
                }
            } else if(child == this.child(RCHILD)) {
                // handle backspace (convert to sequence)
                if(e == "Backspace") {
                    if(!this.child(LCHILD).input(e, null, false)) {
                        return this.tryRemove(RCHILD);
                    } else return true;
                }
                return false;

            } else if(child == null) {
                // Redirect to the right child
                return this.child(RCHILD).input(e, null, false);
                
            } else console.error("Unreachable", child);
        } else {
            if(e === "Delete") {
                if(child === this.child(LCHILD)) return this.tryRemove(RCHILD);
                else return this.tryRemove(LCHILD);
            }

            // TODO
            return false;
        }


    }
   
}
