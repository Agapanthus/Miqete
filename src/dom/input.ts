
import { MNode, Vector, Creator, Selectable, maxPrec } from "./mdom";
import * as tutil from "./util";
import * as l from "./literals";
import * as util from "../util/util";
import { Config } from "../util/config";

/*
export class LeftInput extends MNode {
       
    public precendence(): number {
        return maxPrec;
    }

    private config: Config;


    constructor(a: MNode, content: string, config: Config) {
        super();

        this.config = config;

        this.setChild(new l.Symbol(content, this.config), 0);
        this.setChild(a, 1);

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
        return this;
    }

    public rKatex(e: Element): void {
        
        while(e != null && e.children !== null && (e.children.length !== 2 || tutil.hasClass(e.children[0], tutil.katexDontFollow)) ) {
            e = tutil.getFirstChildNotClass(e, tutil.katexDontFollow);
        }
        if(e === null || e.children === null || e.children.length !== 2) {
            console.error("Expected 2 children");
            console.log(e);
        }
        const ec = e.children;

        this.child(0).rKatex(ec[0]);
        this.child(1).rKatex(ec[1]);
    }
    
    public sync(br: Vector) { 
        this.child(0).sync(br);
        this.child(1).sync(br);
    }

    public toKatex() {    
        return "{" + this.child(0).toKatex()
            + " " + this.child(1).toKatex()
            + "}";
    }

}*/

/*

export class Placeholder extends l.Glyph {
    
    constructor() {
        super("\\color{lightgrey}\\blacklozenge\\color{black}");
    }

}*/