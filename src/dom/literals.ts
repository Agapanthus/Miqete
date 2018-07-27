
import { Vector, MNode, maxPrec, Creator, Selectable} from "./mdom";

import * as tutil from "./util";
import * as util from "../util/util";
import { Config } from "../util/config";


// One single Glyph - like "1" or "\\alpha"
export abstract class Glyph extends MNode implements Selectable {
    public e: Element
    public s: HTMLElement
    public size: Vector
    public pos: Vector

    public precendence(): number {
        return maxPrec;
    }

    private value: string;

    constructor(value: string) {
        super();
        this.value = value;  
        //if(this.value.length !== 1) throw "Glyph only accepts glyphs";  // ...or katex code. 
    }

    public rKatex(e: Element) {
        this.e = tutil.tfcwc(e);
        if(this.e === null) console.error("Must exist!");
    }

    public getSValue(): string {
        return this.value;
    }

    public sync(br: Vector) { 
        tutil.measure(this.e, br, this);
    }

    public createSelectionAreas(c: Creator): void {
        this.s = c.add(this.pos, this.size);
    }

    public strip() {
        return this;
    }
    public bake() {
        return this;
    }

    public toKatex() {
        return " " + this.value + " "; 
    }
}


// Multiple characters like "abc"
export abstract class Literal extends MNode {
    private value: string;

    public e: Element

    private glyphs: Glyph[]
    

    public precendence(): number {
        return maxPrec;
    }

    private config: Config;

    constructor(value: string, config: Config) {
        super()
        this.value = "";
        this.config = config;
        this.setSValue(value);
    }

    public setSValue(value: string): void {
        // TODO: Handle inputs like "\\alpha\\beta" and ""
        
        // Keep the last elements, so the focus won't get lost if it was there somewhere
        let lastChange_n = value.length - 1
        let lastChange_o = this.value.length - 1
        while(lastChange_n >= 0 && lastChange_o >= 0 && value[lastChange_n] === this.value[lastChange_o]) {
            lastChange_n--
            lastChange_o--
        }
        const ch = this.getChildren()
        

        this.clearChildren()
        this.value = value    
        let i = 0;
        for(const char of value) {
            if(i > lastChange_n) {
                this.setChild(ch[i - lastChange_n + lastChange_o], i)
                i++
            } else {
                const sym = new Symbol(char, this.config)
                this.setChild(sym, i++)
            }

        } 

    }

    public rKatex(e: Element) {
        const t = tutil.tfcwc(e);
        if(!t) console.error("Must exist!")
        this.e = t.parentElement
        if(!this.e) console.error("Must exist!")
        const ch = this.getChildren()
        if(this.e.children.length !== ch.length) console.error("Parent must contain all glyphs!")
        let i = 0
        for(const c of ch) {
            c.rKatex(this.e.children[i++])
        } 
    }

    public getSValue(): string {
        return this.value
    }

    public sync(br: Vector) { 
        const ch = this.getChildren();
        for(const c of ch) {
            c.sync(br)
        } 
    }

    public createSelectionAreas(crea: Creator): void {
        const ch = this.getChildren();
        for(const c of ch) {
            c.createSelectionAreas(crea);
        } 
    }

    public strip() {
        return this;
    }
    public bake() {
        return this;
    }

    public toKatex() {
        return "{" + this.value + "}";
        // How to handel something like "orf b c" (orf times b times c)? It is displayed as "or f bc"
        // ---> Use \mathinner to get some tiny, optional space around the string
        // ---> use textit to remove spaces (mathit won't work with katex)
    }
}

export class Integer extends Literal {
    private v: number;

    constructor(i: number, config: Config) {
        super(i.toString(), config);
        if(i <= 0) throw "Only non-negative integers!";
        this.v = i;
    }


    public getValue(): number {
        return this.v;
    } 

    public input(e: string, child: MNode, operate: boolean) {
        
        const backsp = e == "Backspace"
        const del = e == "Delete"
        const ind = this.getIndex(child);
        const num = e.length == 1 && util.isNumeric(e);

        // Insert number
        if(num || (backsp && ind > 0) || del) {
            const s = this.v.toString();

            let start
            if(backsp) start = s.slice(0, ind-1)
            else start = s.slice(0, ind)

            let end
            if(operate || del) end = s.slice(ind+1, s.length) // Slice out that digit
            else end = s.slice(ind, s.length)
            
            let ins = "";
            if(num) ins = parseInt(e).toString();  /// TODO: You MUST use bigints! JS will automatically use e-notation, which is really problematic!
            const n = start + ins + end; // Insert new digits

            this.v = parseInt(n);
            this.setSValue(n);

        // Redirect backspace
        
            
        } else {
            // TODO: Default action: Split this thing into two (or three) parts and put them into an input container. This container will capture focus and do all the default processing.
            // Use \mathinner{\color{#aac}{\text{for\}for}}} h
        }       
    }
}

// Single Glyph redirecting all inputs to its parent
export class Symbol extends Glyph {
    private v: string;

    constructor(i: string, config: Config) {
        super(i);
        this.v = i;
    }


    public getValue(): string {
        return this.v;
    } 

    public input(e: string, child: MNode, operate: boolean) {
        const p = this.getParent()
        if(p) {
            p.input(e, this, operate);
        }
    }
}