
import { MNode, Vector, Creator, maxPrec } from "./mdom";
import { Literal } from "./literals";
import * as util from "../util/util";
import * as tutil from "./util";
import { Config } from "../util/config";
import { MNodePair, Splitable } from "./inputImporter";
import { Sequence, joinToSequence } from "./infixOperators";

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
            console.log("redirect");
            p.input(e, that, operate);
            return;
        }
    }

    // Redirect unhandled backspace
    if(backsp) {
        const p = that.getParent();
        if(p) {
            console.log("redirect");
            p.input(e, that, operate);
            return;
        }
    }

    if(! (e.length == 1) && util.isAsciiPrintableString(e)) {
        // Silently drop control keys
        return;
    }

    const par = that.getParent();
    if(!par) {
        console.error("TODO: Toplevel!");
        return;
    }
    const ind = par.getIndex(that);
    if(ind < 0) {
        console.error("Child not found!");
        return;
    }
    const res = split.split(child, operate);    
    const inp = new InputObject(res, e, config);      
    par.setChild(inp, ind);


    // TODO: Allow "silent" Operator, e.g. ab for a*b or 5sum(x) for 3*sum(x). Silent operator tries to apply to its children, for example it will join numbers.

}


class InputObject extends MNode  {
       

    //private hosted: MNodePair;
    //private field: InputString;

    private left: boolean;
    private right: boolean;

    
    public precendence(): number {
        return maxPrec;
    }

    constructor(children: MNodePair, initialInput: string, private config: Config) {
        super();

        const hosted = children;
        this.left = hosted.left ? true : false;
        this.right = hosted.right ? true : false;

        if(initialInput.length !== 1) console.error("Input needs an 1-char-input!", initialInput);
        if(!util.isAsciiPrintableString(initialInput)) console.error("Input needs an printable input!", initialInput);

        const field = new Text(initialInput, config);
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

    public input(e: string, child: MNode, operate: boolean) {
        const hosted = this.getHosted();
    
        if(!operate) {
            if(child === hosted.right) {
                this.child(0).input(e, null, operate);
            }
       
        }
        // TODO
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
    
    constructor(str: string, config: Config) {
        super(str, config, true);
    }

    public set(str: string) {
        this.setSValue(str);
    }
    // \\text
    // TODO: toKatex: Latex-escape! 

    public input(e: string, child: MNode, operate: boolean) {

        console.log("input");

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
                  
        }   

    }
}