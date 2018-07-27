
import { MNode, Vector, Creator, Selectable } from "./mdom";
import * as tutil from "./util";
import * as l from "./literals";
import { Config } from "../util/config";
import { Parentheses } from "./parentheses";


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

    private katexCmd;
    private htmlSym;
    private config: Config;

    private mySymbol : {
        html: string,
        prec: number,
        assoc: string[]
    };

    constructor(a: MNode, b: MNode, katexCmd: string, config: Config) {
        super();
        this.config = config;

        this.setChild(a, 0);
        this.setChild(b, 1);
        this.setChild(new l.Symbol(katexCmd, this.config), 2);

        this.mySymbol = infixOperators[katexCmd];
        if(!this.mySymbol) console.error("Unknown symbol " + katexCmd);
        this.prec = this.mySymbol.prec;
        this.katexCmd = katexCmd;
        this.htmlSym = this.mySymbol.html;
    }
    
    public createSelectionAreas(c: Creator): void {
        this.child(0).createSelectionAreas(c);
        this.child(2).createSelectionAreas(c);
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
           /* if(tutil.directTextContent(ec[2]) !== this.htmlSym) {
                console.error("Expected " + this.htmlSym + " but found " + tutil.directTextContent(ec[2]));
            }*/
            
            this.child(2).rKatex(ec[2]);
            this.child(0).rKatex(ec[0]);
            this.child(1).rKatex(ec[4]);

        } else {
           /* if(tutil.directTextContent(ec[1]) !== this.htmlSym) {
                console.error("Expected " + this.htmlSym + " but found " + tutil.directTextContent(ec[1]));
            }*/
            
            this.child(2).rKatex(ec[1]);
            this.child(0).rKatex(ec[0]);
            this.child(1).rKatex(ec[2]);
        }
    }
    
    public sync(br: Vector) { 
        this.child(0).sync(br);
        this.child(2).sync(br);
        this.child(1).sync(br);
    }

    private bNeedsParens() {
        if(!this.config.semantics) return false;
        return (this.child(1).precendence() < this.precendence()) 
                    // Beware: when the operator is not associative, you  
                    || ((this.child(1).precendence() === this.precendence()) && !this.isAssociative())
    }
    private aNeedsParens() {
        if(!this.config.semantics) return false;
        return this.child(0).precendence() < this.precendence();
    }

    public toKatex() {    
        return "{"
            + tutil.opar(this.child(0).toKatex(), this.aNeedsParens()) 
            + this.child(2).toKatex() 
            + tutil.opar(this.child(1).toKatex(), this.bNeedsParens()) 
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

        if(this.child(1) instanceof binaryInfixOperator) {
            return this.isRightAssociative(this.child(1));
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

    public input(e: string, child: MNode, operate: boolean) {

        // TODO
    }
}

