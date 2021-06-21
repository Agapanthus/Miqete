
import { MNode, Vector, Creator, maxPrec, Finishable } from "./mdom";
import { Literal, Symbol } from "./literals";
import * as util from "../util/util";
import * as tutil from "./util";
import { Config } from "../util/config";
import { MNodePair, Splitable } from "./inputImporter";
import { Sequence, joinToSequence, binaryInfixOperator } from "./infixOperators";
import { createInflateRaw } from "zlib";
import { Associative } from "./associative";

export function init() {
    (window as any).defaultInput = defaultInput;
}

function defaultInput(e: string, that: MNode, child: MNode, operate: boolean, split: Splitable, config: Config) {

    const backsp = e == "Backspace"
    const del = e == "Delete"
    const num = e.length == 1 && util.isNumeric(e);
    const ind0 = that.getIndex(child);

    // This might be interesting for the left parent TODO: And what happens, if not?
    if((ind0 === 0) && (!operate)) {
        const p = that.getParent();
        if(p) {
            if(p.input(e, that, operate)) return true;
        }
    }

    // Redirect unhandled backspace
    if(backsp) {
        const p = that.getParent();
        if(p) {
            if(p.input(e, that, operate)) return true;
        }
    }

    ////////////////////

    if(! (e.length == 1) && util.isAsciiPrintableString(e)) {
        // Silently drop control keys
        return false;
    }

    const par = that.getParent();
    if(!par) {
        console.error("TODO: Toplevel!");
        return false;
    }
    const ind = par.getIndex(that);
    if(ind < 0) {
        console.error("Child not found!");
        return false;
    }
    const res = split.split(child, operate);    
    const inp = new InputObject(res, e, config);      // TODO: {1+1+1|} *2 should become {1+1+1*2} not {1+1+1}*2
    par.setChild(inp, ind);


    return true;
}


class InputObject extends MNode implements Finishable {
       

    //private hosted: MNodePair;
    //private field: InputString;

    private left: boolean;
    private right: boolean;

    
    public precendence(): number {
        return maxPrec;
    }

    constructor(children: MNodePair, initialInput: string, private config: Config) {
        super();

        console.log(config.currentInput);

        if(config.currentInput) {
            console.error("FATAL: Multiple inputs! You must finish the previous input first!")
            //config.currentInput.finish();
        }
        config.currentInput = this;

        const hosted = children;
        this.left = hosted.left ? true : false;
        this.right = hosted.right ? true : false;

        if(initialInput.length !== 1) console.error("Input needs an 1-char-input!", initialInput);
        if(!util.isAsciiPrintableString(initialInput)) console.error("Input needs an printable input!", initialInput);

        const field = new Text(initialInput, config, this);
        this.setChild(field, 0);

        let i = 1;
        if(hosted.left) this.setChild(hosted.left, i++);
        if(hosted.right) this.setChild(hosted.right, i++);
        
       // this.input(initialInput, null, false);
    }

    private getHosted(): MNodePair {
        let i = 1;
        return {
            left: this.left ? this.child(i++) : null,
            right: this.right ? this.child(i++) : null
        }
    }

    public createSelectionAreas(c: Creator): void {
        const hosted = this.getHosted();
        if(hosted.left) hosted.left.createSelectionAreas(c);
        this.child(0).createSelectionAreas(c);
        if(hosted.right) hosted.right.createSelectionAreas(c);
    }

    public strip(): MNode {
        const hosted = this.getHosted();
        let i = 1;
        if(hosted.left) this.setChild(hosted.left.strip(), i++);
        if(hosted.right) this.setChild(hosted.right.strip(), i++);
        return this.bake();
    }

    public bakeSelf(): MNode {

        // TODO

        return this;
    }

    public bake(): MNode {
        const hosted = this.getHosted();
        let i = 1;
        if(hosted.left) this.setChild(hosted.left.bake(), i++);
        if(hosted.right) this.setChild(hosted.right.bake(), i++);
        return this.bakeSelf();
    }
    
    public rKatex(e: Element) {
        const hosted = this.getHosted();
        let chil = 0;
        if(hosted.left) chil++;
        if(hosted.right) chil++;

        while(e != null && e.children !== null && e.children.length >= 1) {
            if(!util.testIntersect(e.children[0].className.split(" "), tutil.katexSpaceClasses)) {
                if(e.children.length == 1 + 1*chil) break;
                if(e.children.length == 1 + 2*chil) break;
            }
            e = tutil.getFirstChildNotClass(e, tutil.katexDontFollow);
        }
        if(e === null || e.children === null || (e.children.length !== 1+1*chil && e.children.length !== 1+2*chil)) {
            console.error("Expected "+(1+2*chil) + " or " + (1+1*chil) +" children");
            console.log(e);
        }
        const ec = e.children;
        if(e.children.length === 1+1*chil) {
            if(hosted.left) {
                hosted.left.rKatex(ec[0]);
                this.child(0).rKatex(ec[1]);   
            } else {
                this.child(0).rKatex(ec[0]);       
            }  
            if(hosted.right) hosted.right.rKatex(ec[1*chil]);
        } else {
            if(hosted.left) {
                hosted.left.rKatex(ec[0]);
                this.child(0).rKatex(ec[2]);   
            } else {
                this.child(0).rKatex(ec[0]);       
            }  
            if(hosted.right) hosted.right.rKatex(ec[2*chil]);
        }
    }

    
    public sync(br: Vector) { 
        const hosted = this.getHosted();
        if(hosted.left) hosted.left.sync(br);
        this.child(0).sync(br);
        if(hosted.right) hosted.right.sync(br);
    }


    public toKatex() {   
        const hosted = this.getHosted(); 

        let k = "";
        if(hosted.left)  k += hosted.left.toKatex();
         
        k += "\\mathinner{\\color{#aac}{"  + this.child(0).toKatex() + "}}"
        
        if(hosted.right) k += hosted.right.toKatex();

        return "{" + k + "}";
    }

    
    public finish() {
        this.config.currentInput = null;

        const hosted = this.getHosted(); 
        const v = (this.child(0) as Literal).getSValue();
        let g: string = undefined;
        console.log("Inserting ", v);
        
        if(g = this.config.commandsBO[v]) {
            console.log("as big operator ", g);


            // TODO
        }
        else if(g = this.config.commandsFon[v]) {
            console.log("as format ", g);


            // TODO
        }
        else if(g = this.config.commandsIO[v]) {
            console.log("as infix operator ", g);
            const io = new binaryInfixOperator(hosted.left, hosted.right, g, this.config);

            if(this.left && this.right) {
                this.replace(io);
                return;
            } else if(this.left || this.right) {
                let current = this.left ? hosted.left : hosted.right;
                this.replace(current);
                const iop = io.precendence();
                let p: MNode = undefined;

                // Walk upwards, so we have  3*3| -> 3*3+?  instead of  3*3| -> 3*(3+?)
                while(iop < current.precendence() 
                        && (p = current.getParent())
                        && (p instanceof Associative)
                        && (p.child(this.left ? p.getRight() : p.getLeft()) == current) ) {
                    current = current.getParent();
                }
               
                current.replace(io);
                io.setChild(current, this.left ? io.getLeft() : io.getRight());
                console.log("done!", current, io);

            } else {
                // TODO
            }
        }
        else if(g = this.config.commandsPar[v]) {
            console.log("as parens ", g);
            

            // TODO
        }
        else if(g = this.config.commandsSym[v]) {
            console.log("as symbol ", g);
            const hosted = this.getHosted();
            const s = new Symbol(g, this.config, false);
            if(this.left && this.right) {
                this.replace(
                    new Sequence(
                                new Sequence(hosted.left, 
                                            s, 
                                            this.config), 
                                hosted.right, 
                                this.config)
                );
            } else if(this.left) {
                this.replace(new Sequence(hosted.left, s, this.config));                
            } else if(this.right) {
                this.replace(new Sequence(s, hosted.right, this.config));    
            } else {
                this.replace(s);
            }
        }
        else {
            g = v;
            console.log("as text ", g);

            // TODO
        }
    }


    public input(e: string, child: MNode, operate: boolean): boolean {
        const hosted = this.getHosted();
    
        if(!operate) {
            if(child === hosted.right) {
                return this.child(0).input(e, null, operate);
               
            }
            return false;
       
        }
        // TODO
        return false;
    }

    public join() {
        if( (!this.left) || (!this.right)) {
            this.replace(this.child(1));
        } else if((!this.left) && (!this.right)) {
            // TODO: What?!
        } else {
            joinToSequence(this.child(1), this.child(2), this, this.config);
            
            /*const seq = new Sequence(this.child(1), this.child(2), this.config);
            this.replace(seq);
            seq.tryJoinThem();*/
        }

    }
}



export class Text extends Literal {
    
    constructor(str: string, protected config: Config, private finish: Finishable) {
        super(str, config, true);
    }


    public set(str: string) {
        this.setSValue(str);
    }
    
    private prefinish(e: string, child: MNode, operate: boolean) {
        // TODO: When typing "a|bc" -> "a1|bc" you need to split it and finish "a" and "bc" separately!

        if(child === null) {
            // TODO: How can I redirect e?
            this.finish.finish();
        } else {
            console.warn("TODO: Impl!");
        }

    }

    public input(e: string, child: MNode, operate: boolean): boolean {


        ////////////////////////////
        // There are three modes: number, symbol, text.
        // Switching between them will cause "finish"

        if(e.length === 1) {

            switch(e) {
                case " ":
                case "Enter":
                this.prefinish(e, child, operate);
                return true;
            }

            // Is a number
            const isNumber = util.isNumeric(this.getSValue());
            const isENumber = e.length === 1 && util.isNumeric(e);

            if(isNumber != isENumber) {
                this.prefinish(e, child, operate);
                return true;
            }
            
            if(!isNumber) {

                // If it has symbols, it is completely made of symbols
                const hasSymbols = util.intersect(this.config.symbols.split(''), this.getSValue().split('')).length > 0;
                const isESymbol = util.hasElement(e, this.config.symbols.split(''));

                if(hasSymbols != isESymbol) {
                    this.prefinish(e, child, operate);
                    return true;
                }
            }
            
        }

        ////////////////////////////////

        const backsp = e == "Backspace";
        const del = e == "Delete";
        const prin = e.length == 1 && util.isAsciiPrintableString(e);        

        const ind = child ? this.getIndex(child) : this.getChildren().length; // if no child is given, think of an input at the very end
        if(ind < 0) console.error("Invalid index!");

        if(prin || (backsp && ind > 0) || del) {
            const s = this.getSValue();

            let start;
            if(backsp) start = s.slice(0, ind-1);
            else start = s.slice(0, ind);

            let end;
            if(operate || del) end = s.slice(ind+1, s.length); // Slice out that digit
            else end = s.slice(ind, s.length);
            
            let a = e;
            if(backsp || del) a = "";
            const n = start + a + end; // Insert new string

            if(n.length <= 0) {
                // Destroy self and recover parent
                const p = this.getParent();
                if(p instanceof InputObject) {
                    p.join();
                } else console.error("Parent must be inputobject!", p);

            } else this.set(n);
            return true;
                  
        }   

        return false;
    }
}