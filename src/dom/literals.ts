
import { Vector, MNode, maxPrec, Creator, Selectable} from "./mdom";

import * as tutil from "./util";
import * as util from "../util/util";
import { Config } from "../util/config";
import { defaultInput, MNodePair, Splitable } from "./inputImporter";
import { Joinable } from "./sequence";



// One single Glyph - like "1" or "\\alpha"
export abstract class Glyph extends MNode implements Selectable {
    public e: Element;
    public s: HTMLElement;
    public size: Vector;
    public pos: Vector;

    public precendence(): number {
        return maxPrec;
    }

    constructor(private value: string, private isText: boolean) {
        super();
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
        if(this.isText) {
            if(this.value.length != 1) console.error("only characters!");      
            const esc = util.latexEscape(this.value);
            if(esc == "\\backslash") return esc+" ";     
            return "\\text{" + esc + "}";  
        }
        return " " + this.value + " "; 
    }
}


// Multiple characters like "abc"
// TODO: You can only select one or all chars. Maybe we could use an invisible infixOperator to make an associative character-tree?
export abstract class Literal extends MNode {
  
    public e: Element

    private glyphs: Glyph[]
    

    public precendence(): number {
        return maxPrec;
    }
    
    constructor(
            private value: string, 
            protected config: Config, 
            private isText: boolean) {
        super()
        this.setSValue(value);
    }

    protected setSValue(value: string): void {
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
            if(ch.length > 0 && i > lastChange_n) {
                this.setChild(ch[i - lastChange_n + lastChange_o], i)
                i++
            } else {
                const sym = new Symbol(char, this.config, this.isText)
                this.setChild(sym, i++)
            }

        } 

    }

    public rKatex(e: Element) {
        const t = tutil.tfcwc(e);
        if(!t) console.error("Must exist!");
        this.e = t.parentElement;
        if(!this.e) console.error("Must exist!");
        if(util.hasElement("text", this.e.className.split(" "))) {
            // If it is a textnode, go one level more up
            this.e = this.e.parentElement;
            if(!this.e) console.error("Must exist!");
        }
        const ch = this.getChildren();
        if(this.e.children.length !== ch.length) console.error("Parent must contain all glyphs!",this.e.children, ch);
        let i = 0;
        for(const c of ch) {
            c.rKatex(this.e.children[i++]);
        } 
    }

    public getSValue(): string {
        return this.value;
    }

    public sync(br: Vector) { 
        const ch = this.getChildren();
        for(const c of ch) {
            c.sync(br);
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
        //return "{" + this.value + "}";
        let k = "";
        const ch = this.getChildren();
        for(const c of ch) {
            k += c.toKatex();
        } 
        return "{" + k + "}";
        // How to handel something like "orf b c" (orf times b times c)? It is displayed as "or f bc"
        // ---> Use \mathinner to get some tiny, optional space around the string
        // ---> use textit to remove spaces (mathit won't work with katex)
    }
}



// TODO: Internally use always string representation! number is baaaaaaad! 
export class Integer extends Literal implements Splitable, Joinable {
   
    constructor(i: string|number, config: Config) {
        super(i.toString(), config, false);
        if(i <= 0) throw "Only non-negative integers!";
    }

    

    public input(e: string, child: MNode, operate: boolean) {
        
        const backsp = e == "Backspace"
        const del = e == "Delete"
        const ind = child ? this.getIndex(child) : this.getChildren().length; // if no child is given, think of an input at the very end
        if(ind < 0) console.error("Invalid index!");
        const num = e.length == 1 && util.isNumeric(e);

        // Insert number
        if(num || (backsp && ind > 0) || del) {
            const s = this.getSValue();

            let start;
            if(backsp) start = s.slice(0, ind-1);
            else start = s.slice(0, ind);

            let end;
            if(operate || del) end = s.slice(ind+1, s.length); // Slice out that digit
            else end = s.slice(ind, s.length);
            
            let ins = "";
            if(num) ins = e; 
            const n = start + ins + end; // Insert new digits

            if(n.length <= 0) {
                // TODO: Destroy self. But replace by what?
            } else this.setSValue(n);

        } else {
            defaultInput(e, this, child, operate, this, this.config)
        }       
    }

    public split(child: MNode, operate: boolean) : MNodePair {

        const ind = child ? this.getIndex(child) : this.getChildren().length;
        if(ind < 0) console.error("Invalid index!");

        const s = this.getSValue();
        let start = s.slice(0, ind);
        let end;
        if(operate) end = s.slice(ind+1, s.length); // Slice out that digit
        else end = s.slice(ind, s.length);
        
        this.setSValue(end);

        return {
            left: start.length==0 ? null : new Integer(start, this.config),
            right: end.length==0 ? null : this
        }
    }

    public tryJoin(partner: MNode) : MNode {
        if(partner instanceof Integer) {
            this.setSValue(this.getSValue() + partner.getSValue());
            return this;
        }
        return null;
    }
}



// Single Glyph redirecting all inputs to its parent
export class Symbol extends Glyph {
    private v: string;

    constructor(i: string, config: Config, isText: boolean) {
        super(i, isText);
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