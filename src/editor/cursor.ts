
import {style, keyframes, types, media } from 'typestyle';


import { Creator, MNode, Vector, Selectable } from "../dom/mdom";
import {  findCommonAncestor, mMap, findChild, mPrint } from "../dom/util";

import * as util from "../util/util";
import { assoRotateLeft, binaryInfixOperator, assoRotateRight } from '../dom/infixOperators';

import * as pa from "../dom/parentheses";
import * as io from "../dom/infixOperators";
import * as bo from "../dom/bigOperators";
import { Layer } from "../dom/Layer";
import * as li from "../dom/input";
import * as tutil from "../dom/util";
import { Config } from "../util/config";


// TODO: It might happen that you try to select something before rebuildDummy / rekatex has been called. At this point, this would be fatal. fix it!

export namespace css {
  
    const blink = keyframes({
        "0%": { borderColor: "black" },
        "50%": { borderColor: "black" },
        "51%": { borderColor: "transparent" },
        "99%": { borderColor: "transparent"},
        "100%": { borderColor: "black" }
    });
      
    export const cursorLeft = style({
        width: "1px",
        height: "10px",
        position: "absolute",
        borderLeft: "1px solid transparent",
        animation: blink + " 1s infinite",
        marginLeft: "-1px"
    });

    
    export const dummyNode = style({
        color: "rgba(0,0,0,0)",

        pointerEvents: "initial",
        userSelect: "auto",
        "-moz-user-select": "auto",
        "-ms-user-select": "auto",
        "-webkit-user-select": "auto",
        overflow: "hidden",

        //background:  "rgba(100,100,255,0.2)", boxShadow: "inset 0 0 1px #000000", // DEBUG: Use this for debugging

        position: "absolute",
        cursor: "text",
        textAlign: "center",

        $nest: {
            "&::selection": {
                color: "inherit",
                background: "transparent", //"rgba(100,100,255,0.4)"
            },
            "&::-moz-selection": {
                color: "inherit",
                overflow: "hidden", // You need this. if both rules have the same body, they are joined and IGNORED BY ALL BROWSERS! 
                background: "transparent",
            },
            "&.selected": {
                background: "rgba(255,180,100,0.3)",
            },
            "&.selected[filler], &[filler]": {
                //background: "transparent"
             //   background: "rgba(100,100,255,0.05)", // Use this for debugging
            },
            "&:focus": {
                outline: "none"
            }
        }
    });



    
  

}

interface Creator_level {
    topleft: Vector
    bottomright: Vector
    fill: boolean

    lastPos: Vector
    lastEle: HTMLElement

    layerIndex: number
}


class Creator_impl extends Creator {

    private stack: Creator_level[];
    private ele: Element;

    private fillers: Array<{ e: HTMLElement, pos: Vector, stackheight: number, height: number }>;
    
    private onInput: (e: KeyboardEvent) => void;
    private onClick: (e: MouseEvent) => void;
    
    private layerIndex: number;

    constructor() {
        super();
        this.start(null, null, null);
    }

    private insertElement(pos: Vector, notSelectable?: boolean): HTMLElement {
        const me = document.createElement("div");
        
        me.className = css.dummyNode;
        
        me.style.left = pos.x + "px";
        me.style.top = pos.y + "px";

        me.setAttribute("layer", ""+ this.stack[this.stack.length - 1].layerIndex);

        me.onclick = this.onClick;

        // Accept input
        me.tabIndex = 0;
        me.onkeydown = this.onInput;


        if(!notSelectable) {
            me.innerText = "."; // TODO: Make the glyph fill exactly the whole area!
        } else {
            me.setAttribute("filler","");
        }    

        this.ele.appendChild(me);

        return me;
    }

    private scaleElement(me: HTMLElement, size: Vector): void {
        me.style.width = size.x + "px";
        me.style.height = size.y + "px";
        
        me.style.lineHeight = size.y + "px";
        me.style.fontSize = size.y + "px";
    }

    private setFillers(right: number) {
        // Set fillers
        for(let i=0; i<this.fillers.length; i++) {
            const f = this.fillers[i];
            if(f.stackheight > this.stack.length) {
                let width = right - f.pos.x;
                if(width < 0 || right < 0) {
                    width = 0;
                }
                this.scaleElement(f.e, new Vector(width, f.height))
            }
        }
        this.fillers = util.filter(this.fillers, e   => e.stackheight <=   this.stack.length);
    }

    // size might be null if you don't want to insert a new element but only scale the previous one
    public add(pos: Vector, size: Vector): HTMLElement {
        if(this.stack.length <= 0) {
            console.error("nothing pushed");
            return;
        }

        const last = this.stack[this.stack.length - 1];

        let end;
           
        // First of level. Begin new.
        if(!last.topleft) {
            end = pos.x;
            last.topleft = util.deepCopy(pos);

        // Interpolate
        } else {      
            end = (last.bottomright.x + pos.x) / 2;
            this.scaleElement(last.lastEle, new Vector(end - last.lastPos.x, last.bottomright.y - last.lastPos.y) );
        }


        this.setFillers(end);
        
        if(size) {     
            if(size.x < 0) {
                // Insert filler element
                const lastPos = new Vector(end, pos.y);
                const thatEle = this.insertElement(lastPos, true);
                this.fillers.push({
                    e: thatEle,
                    pos: lastPos,
                    stackheight: this.stack.length,
                    height: last.bottomright.y - last.lastPos.y
                });
                return thatEle;            
            } else {
                // Insert next element
                last.lastPos = new Vector(end, pos.y);
                last.lastEle = this.insertElement(last.lastPos);
                last.bottomright = new Vector(pos.x + size.x, pos.y + size.y);
                return last.lastEle;
            }
        }

        return null;
    }
 
    public push(fill: boolean): void {
        this.stack.push({
            topleft: null,
            bottomright: null,
            fill: fill,
            lastPos: null,
            lastEle: null,
            layerIndex: this.layerIndex
        });
        this.layerIndex++;
    }

    public pop(): HTMLElement {
        const last = this.stack[this.stack.length - 1];
        
        if(last.bottomright) {
            if(last.fill) {
                // Create a filler-element
                const filler = this.add(new Vector(last.bottomright.x, last.lastPos.y), new Vector(-1,-1));
                this.stack.pop();
                return filler;
            } else {            
                // Simply finish the element
                this.add(new Vector(last.bottomright.x, last.lastPos.y), null);
                this.stack.pop();
                return null;
            }
        } else {
            // Nothing added, nothing to do.
            this.stack.pop();
            return null;
        }

    }

    // Create new dummy
    public start(ele: Element, onInput, onClick) {
        this.onInput = onInput;
        this.onClick = onClick;
        this.stack = [];
        this.fillers = [];
        this.layerIndex = 0;
        this.ele = ele;
        if(this.ele)
            while (this.ele.firstChild) this.ele.removeChild(this.ele.firstChild);
    }

    // Complete dummy, empty stack
    public finish() {
        if(this.stack.length !== 0) {
            console.error("Invalid Creator-usage!");
            console.log(this);
        }

        this.setFillers(-1);
        if(this.fillers.length !== 0) {
            console.error("Invalid Creator-usage!");
            console.log(this);
        }
    }

}


export class Cursor {

    private crea: Creator_impl;

    private config: Config;
    
    private hasSelectionChange: boolean;
    private mouseDown: boolean;
    private mdom: MNode;

    private dummyEle: HTMLElement;

    private onRefresh: (mdom: MNode)=>void;


    private selection: MNode;
    private cursor: MNode;


    constructor(dummyEle: HTMLElement, onRefresh: (mdom: MNode)=>void, config: Config) {
        this.crea = new Creator_impl();

        this.config = config;
        this.onRefresh = onRefresh;

        this.dummyEle = dummyEle;
        
        const me = this;
        if(util.defined(document.onselectionchange)) {
            document.onselectionchange = me.sCall;
            
        // Fallback for opera mini
        } else {
            console.warn("Using Fallback for onselectionchange");

            document.addEventListener("mousedown", e => { 
                if(e.button === 0) {
                    me.mouseDown = true;
                }
            });
            document.addEventListener("mouseup", e => {
                if(e.button === 0) {
                    me.mouseDown = false;
                    me.sCall();
                }
            });

            this.dummyEle.addEventListener("touchend touchcancel touchmove", e => {
                me.sCall();
            });
           
            this.dummyEle.addEventListener("mousemove", e => {
                if(me.mouseDown) {
                    me.sCall();
                }
            });
        }

    }

    private dropNextSCall: boolean = false;

    private sCall: ()=>void = () => {
        const me = this;

        if(this.dropNextSCall) {
            this.dropNextSCall = false;
            return;
        }
        
        // TODO: Set selection on release, to place the touch-handles in the right place

        if(!me.mdom) {
            console.warn("no dom!");
            return;
        } 

        if(!util.defined(window.getSelection)) alert("TODO: getSelection not found!");

        const selObj = window.getSelection(); 
        if(selObj.rangeCount === 0) {
            this.select(null);
            // Remove selection
        }
        else {
            if(selObj.rangeCount !== 1) console.error("TODO: Only one range supported");
            const selRange = selObj.getRangeAt(0);

            if(selRange.toString().length === 0) { //selRange.endContainer === selRange.startContainer) {
                // Remove selection, set Cursor

                //this.select(null); // Don't do it. Cursor detection is already done
            } else {

                let start = selRange.startContainer as HTMLElement;
                if(start.nodeType !== Node.ELEMENT_NODE) {
                    if(start.parentElement) start = start.parentElement;
                    else start = start.parentNode as HTMLElement; // IE doesn't know parentElement
                }

                let end = selRange.endContainer as HTMLElement;
                if(end.nodeType !== Node.ELEMENT_NODE) {
                    if(end.parentElement) end = end.parentElement;
                    else end = end.parentNode as HTMLElement;
                }

                if(this.dummyEle.contains(start)) {

                    // Whole selection inside this element
                    if(this.dummyEle.contains(end)) {
                        me.selectRange(start, end);
                    } 
                    // Selection ends outside
                    else {
                        me.selectRange(start, $('div',me.dummyEle).last()[0]);
                    }
                // Selections begins outside
                } else if(this.dummyEle.contains(end)) {
                    me.selectRange($('div',me.dummyEle).first()[0], end);

                // Selections starts and ends outside -> Possibly everything, possibly nothing. Anyway, not my business.
                } else {
                    this.select(null);
                }
            }
        }
    };


    // BIO? yes        yes   no    yes   no    no
    //      common --- a --- b --- c --- d --- child
    //                       A
    //         returns this -|
    static getChildBelowTopmostContinuedSeriesOfOperators = (common: MNode, child: MNode) =>  {
        let head = child;
        let temp = child;
        let lastWasBIO = false;
        while(temp != common) {
            if(temp.getParent() instanceof binaryInfixOperator) {
                if(!lastWasBIO) head = temp;
                lastWasBIO = true;
            } else {
                lastWasBIO = false;
            }
            temp = temp.getParent();
        }
        return head;
    };
        
  

    private select(e: MNode) {
        
        // Reset selection
        mMap(this.mdom, (a) => ((a as any).s ? ((a as any).s.className = css.dummyNode) : null, a) );

        if(e) {
            
            // Set selection
            mMap(e, (a) => {
                if((a as any).s) {
                    
                    // TODO: set selection!
                    //browserAddSelection((a as any).s);
                    (a as any).s.className = css.dummyNode + " selected";
                }
                return a;
            });

        } else {
            this.dropNextSCall = true;
            browserSelectNothing();
        }

        this.selection = e;
        this.cursor = null;
    }

    private setCursor(e: MNode) {
        this.select(null);

        if(util.defined((e as any).s)) {
            (e as any).s.className +=  " " + css.cursorLeft;
            (e as any).s.focus();
        }


        this.selection = null;
        this.cursor = e;
    }

    
    private onClickSetCursor = (e: MouseEvent): any => {

        // If something is selected, ignore clicks
        if(windowGetSelection().length > 0) {
            return;
        }


        let c = findChild(this.mdom, a => ( (a as any).s === e.currentTarget) );
        if(!c) {
            console.warn("child not found!");
            return;
        }

        const cr = e.srcElement.getBoundingClientRect();
        
        if((e.pageX - $(e.srcElement).offset().left) >= cr.width/2-1) {
            const i = tutil.getVisualIndex(c, this.dummyEle);
           
            const nc = tutil.getNextInSameLayer(i, this.mdom, this.dummyEle);
            if(nc === c && (nc.constructor as any).name !== "Layer") { // For unknwon reasons "instanceof" doesn't work here
                console.error("This is not a valid layer!");
            } else c = nc;
            
        }

        this.setCursor(c);
    };


    private selectRange(start: HTMLElement, end: HTMLElement): void {
        
        const L = findChild(this.mdom, (a) => (a as any).s === start);
        if(L === null) {
            console.error("L not found!");
            return null;
        }
        const R = findChild(this.mdom, (a) => (a as any).s === end);
        if(R === null) {
            console.error("R not found!");
            return null;
        }

        let common = findCommonAncestor(L, R);
        if(!common) {
            console.error("no ancestor found!");
            return;
        }

        // Minimize selection using associativity law
        // -> We can only select a subtree. But in 1+2+3 we can theoretically select 2+3 (which is might be not a subtree).
        //    Therefore, we need to rotate until this is a subtree
        if(common instanceof binaryInfixOperator) {
            let pindex = null;
            let cp = common.getParent();
            if(cp) pindex = cp.getIndex(common);

            let lHead = Cursor.getChildBelowTopmostContinuedSeriesOfOperators(common, L);
            let rHead = Cursor.getChildBelowTopmostContinuedSeriesOfOperators(common, R);


            while(true) {
                // If child is leftmost of the common ancestor - done!
                if(common.isLeftmostChild(lHead)) {
                    // Continue rotating, if we are in the root and the left uninteresting branch has still operators
                    if(lHead === common && (common.child(0) instanceof binaryInfixOperator)) {
                        // dont break
                    } else break;
                }

                try {                
                    // Rotate base rightwards and place it in the dom
                    const newBase = assoRotateRight(common);
                    if(cp) cp.setChild(newBase, pindex);
                    else this.mdom = newBase;
        
                    // Find the common ancestor
                    common = findCommonAncestor(L, R) as binaryInfixOperator;
                    if(!(common instanceof binaryInfixOperator)) throw "Ancestor is no infix operator. This shouldn't happen.";
                    cp = common.getParent();
                    if(cp) pindex = cp.getIndex(common);

                } catch(e) {
                    break; // Non-asso operator
                }
            }
            
           
            while(true) {
                // If child is leftmost of the common ancestor - done!
                if(common.isRightmostChild(rHead)) {
                    // Continue rotating, if we are in the root and the right uninteresting branch has still operators
                    if(rHead === common && (common.child(1) instanceof binaryInfixOperator)) {
                        // dont break
                    } else break;
                }
                
                try {
                    // Rotate base rightwards and place it in the dom
                    const newBase = assoRotateLeft(common);
                    if(cp) cp.setChild(newBase, pindex);
                    else this.mdom = newBase;
        
                    // Find the common ancestor
                    common = findCommonAncestor(L, R) as binaryInfixOperator;
                    if(!(common instanceof binaryInfixOperator)) throw "Ancestor is no infix operator. This shouldn't happen.";
                    cp = common.getParent();
                    if(cp) pindex = cp.getIndex(common);
                    
                } catch(e) {
                    break; // Non-asso operator
                }
            }
            
        }

        
        this.select(common);

    }

    private moveCursorRight(start: MNode) {
        const i = tutil.getVisualIndex(start, this.dummyEle);
        if(i >= this.dummyEle.children.length - 1) {
            // TODO: Callback: Exit to the right
        } else if(i >= 0) {
            const nc = tutil.getByVisualIndex(i + 1, this.mdom, this.dummyEle);
            if(nc) {
                this.setCursor(nc);
            }
        }
    }
    
    private onInput = (e: KeyboardEvent): any => {
        console.log(e.key);
        
        let c;
        if(this.selection) { // If the selection 
            c = this.selection;
        } else { // Get the cursor-node
            c = findChild(this.mdom, a => ( (a as any).s === e.currentTarget) );
            if(!c) {
                console.warn("child not found!");
                return;
            }
            if(c !== this.cursor) {
                console.warn("Input on non-cursor node? How?!");
            }
        }

        

        
        //let changed = null;
        //const p = c.getParent();
        //const nc = p ? c : this.mdom;


        /*
        What about prefix negation and stuff?
        -> simply use the normal infixOperator for this. It will hide placeHolder if left to it is nothing or parentheses, e.g.
            x^-1, x+(-1) and R^+
        are absolutely ok


        Expected Behaviour:
            2|3 -> 2+3
            2|3 -> 233
            2|3 -> 2a3
            a*b|+c -> (a*b-?)+c)
            a*b+|1 -> a*b+(-1)

            (strongly prefers non-operators and left)
            a*b+|c -> a*b+ {^? c}
            a*b+| -> a*b+{^?}
            a*b+c| -> a*b+c^?
            a|b -> a^? b
            a|b --prescript--> a {^? b}
            
            (but you can add indices to operators by marking the operator or using prescript)
            a[+]b -> a{+^?}b
            a|+b --prescrept--> a{^? +}b
            
        */

        
        switch(e.key) {
           
            case "ArrowLeft":
                if(e.shiftKey) {
                    console.warn("TODO: Left")
                } else {
                    const i = tutil.getVisualIndex(this.cursor, this.dummyEle);
                    if(i === 0) {
                        // TODO: Callback: Exit to the left
                    } else if(i > 0) {
                        const nc = tutil.getByVisualIndex(i - 1, this.mdom, this.dummyEle);
                        if(nc) {
                            this.setCursor(nc);
                        }
                    }
                }
            break;
            case "ArrowRight":
                if(e.shiftKey) {
                    console.warn("TODO: Right")

                } else {
                    this.moveCursorRight(this.cursor);
                }
            break;
            case "ArrowUp":
                console.warn("TODO: Up")
                if(e.shiftKey) {
                    
                }
            break;
            case "ArrowDown":
                console.warn("TODO: Down")
                if(e.shiftKey) {

                }
            break;
            case "Home": {
                const nc = tutil.getByVisualIndex(0, this.mdom, this.dummyEle);
                if(nc) {
                    this.setCursor(nc);
                } else console.error("not found");
            } break;
            case "End": {
                const nc = tutil.getByVisualIndex(this.dummyEle.children.length - 1, this.mdom, this.dummyEle);
                if(nc) {
                    this.setCursor(nc);
                } else console.error("not found");
            } break;
            
            case "Enter":
                console.warn("TODO: Enter")
            break;
            
            case " ":
                console.warn("TODO: Space")
                if(e.shiftKey || e.ctrlKey) {

                }
            break;

            default:   
            

                if(e.key == "Delete") // TODO: Do delete in a smarter, more generic way
                    this.moveCursorRight(this.cursor);

                if(this.selection) {
                    const sel = this.selection;
                    this.moveCursorRight(sel);


                    const p = sel.getParent();
                    if(p) {
                       p.input(e.key, sel, true); 
                    } else {
                        alert("TODO");
                    }
                } else {
                    c.input(e.key, null, false);
                }

                

                
                this.onRefresh(this.mdom);
                
            /*
                if( util.hasElement(e.key, ["*", "+", "-"])) { // Insert binary Operator
                    const inputToCmd = {"*": "\\cdot", "+": "+", "-": "-" };
                    
                    //changed = new io.binaryInfixOperator(new li.Placeholder(), nc, inputToCmd[e.key], this.config);
                }
                else if( util.hasElement(e.key, ["("])) { // Insert Parentheses
                     
                }
                else if(e.key.length === 1 && isAlphaNumeric(e.key)) {
                    let insert = e.key;
                    changed = new li.LeftInput(nc, insert, this.config);
                }
                  */  
            
        }
/*
        if(changed)  {      
            if(p) { // if the changed element has a parent, replace the element
                const i = p.getIndex(c);
                p.setChild(changed, i);
                this.onRefresh(this.mdom);
            } else { // otherwise, just change the root
                this.mdom = changed;
                this.onRefresh(this.mdom);
            }
        }*/
    };

    public buildDummy(mdom: MNode) {

        this.mdom = mdom;

        this.crea.start(this.dummyEle, this.onInput, this.onClickSetCursor);
        mdom.createSelectionAreas(this.crea);
        this.crea.finish();

        // Recover selection
        if(this.selection) this.select(this.selection);
        if(this.cursor) this.setCursor(this.cursor);
    }
} 


// TODO: Doesn't work!
// https://stackoverflow.com/a/4183448/6144727
function browserAddSelection(el: HTMLElement) {
        if (window.getSelection && document.createRange) {
            var sel = window.getSelection();
            var range = document.createRange();
            range.selectNodeContents(el);
            //sel.removeAllRanges();
            sel.addRange(range);
        } else if ((document as any).selection && (document.body as any).createTextRange) {
            alert("TODO: Selection not supported");

            var textRange = (document.body as any).createTextRange();
            textRange.moveToElementText(el);
            textRange.select();
        }
    }

// https://stackoverflow.com/a/3169849/6144727
function browserSelectNothing() {
    if (window.getSelection) {
        if (window.getSelection().empty) {  // Chrome
            window.getSelection().empty();
        } else if (window.getSelection().removeAllRanges) {  // Firefox
            window.getSelection().removeAllRanges();
        }
    } else if ((document as any).selection) {  // IE?
        (document as any).selection.empty();
    }
}

function windowGetSelection() {
    var text = "";
    if (typeof window.getSelection != "undefined") {
        text = window.getSelection().toString();
    } else if (typeof (document as any).selection != "undefined" && (document as any).selection.type == "Text") {
        text = (document as any).selection.createRange().text;
    }
    return text;
}