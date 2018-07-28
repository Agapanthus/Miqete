

import { MNode, Vector, Creator, Selectable, maxPrec } from "./mdom";
import * as tutil from "./util";
import * as l from "./literals";
import { Config } from "../util/config";
import { binaryInfixOperator } from "./infixOperators";

export interface Joinable {
    // try joining with the right neighbour
    // return null (not possible) or the resulting joined MNode
    tryJoin(rightPartner: MNode) : MNode;
}

export class Sequence extends binaryInfixOperator {

    constructor(a: MNode, b: MNode, config: Config) {
        super(a,b,"", config);
    }

    public tryJoin() {
        const c = this.child(0) as any;
        if("tryJoin" in c) {
            const r = c.tryJoin(this.child(1));
            if(r) {
                const p = this.getParent();
                if(!p) console.error("tryJoin must be called within a tree and not on the root!");
                const ind = p.getIndex(this);
                if(ind < 0) console.error("I must be a child of my parent");
                p.setChild(r, ind);
            }
        }

    } 
}

/*

export class Sequence extends MNode {

    public precendence(): number {
        return maxPrec;
    }

    constructor(a: MNode, b: MNode, private config: Config) {
        super();
        this.config = config;

        this.setChild(a, 0);
        this.setChild(b, 1);
    }
    
    public createSelectionAreas(c: Creator): void {
        this.child(0).createSelectionAreas(c);
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

        while(e != null && e.children !== null && e.children.length >= 1) {
            if(e.children.length === 3) break;
            if(e.children.length === 2) break;

            e = tutil.getFirstChildNotClass(e, tutil.katexDontFollow);
        }
        if(e === null || e.children === null || (e.children.length !== 3 && e.children.length !== 2)) {
            console.error("Expected 2 or 3 children");
            console.log(e);
        }
        const ec = e.children;
        if(e.children.length === 3) {       
            this.child(0).rKatex(ec[0]);
            this.child(1).rKatex(ec[2]);

        } else {
            this.child(0).rKatex(ec[0]);
            this.child(1).rKatex(ec[1]);
        }
    }
    
    public sync(br: Vector) { 
        this.child(0).sync(br);
        this.child(1).sync(br);
    }

    private bNeedsParens() {
        if(!this.config.semantics) return false;
        return (this.child(1).precendence() < this.precendence()) 
                    // Beware: when the operator is not associative, you  
                    // || ((this.child(1).precendence() === this.precendence()) && !this.isAssociative())
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

    public input(e: string, child: MNode, operate: boolean) {
    

    }

}

*/