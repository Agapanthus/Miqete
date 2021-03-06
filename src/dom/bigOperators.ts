import { MNode, Vector, maxPrec, Creator, Selectable } from "./mdom";

import * as tutil from "./util";
import { Config } from "../util/config";
import { Parentheses } from "./parentheses";
import { Layer } from "./layer";




const bigOperators = {
    "\\sum": {
        html: "\u2211",
        prec: 21,
        assoc: ["+"] // TODO: Implement this. Also, associative with infixOperators!
    },
    "\\prod" : {
        html: "\u220f", 
        prec: 31,
        assoc: []
    }

}

export class bigPrefixOperator extends MNode implements Selectable {
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
    private config: Config;

    constructor(bottom: MNode, top: MNode, body: MNode, katexCmd: string, config: Config) {
        super();

        this.config = config;

        this.setChild(new Layer(bottom), 0);
        this.setChild(new Layer(top), 1);
        this.setChild(body, 2);
        
        this.myVirtualPrec = bigOperators[katexCmd].prec;
        this.katexCmd = katexCmd;
        this.htmlSym = bigOperators[katexCmd].html;
    }

    public createSelectionAreas(c: Creator): void {
        this.s = c.add(this.pos, this.size);
        this.child(0).createSelectionAreas(c);
        this.child(1).createSelectionAreas(c);
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

        if(this.config.semantics && this.child(2).precendence() < this.myVirtualPrec) {
            this.setChild(new Parentheses(this.child(2), "(", ")", this.config), 2);
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
        //console.log(this.e)

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
        if(this.config.semantics && this.child(2).precendence() < this.myVirtualPrec) {
            this.setChild(new Parentheses(this.child(2), "(", ")", this.config, true), 2);
        }
    
        return "{" + this.katexCmd
            + "_" + this.child(0).toKatex() 
            + "^" + this.child(1).toKatex() 
            + this.child(2).toKatex() 
            + "}";
    }

    public input(e: string, child: MNode, operate: boolean): boolean {

        return false;
        // TODO
    }

}