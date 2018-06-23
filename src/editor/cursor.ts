
import {style, keyframes, types, media } from 'typestyle';


import { Creator, MNode, Vector } from "../dom/mdom";
import {  findCommonAncestor, mMap, findChild, mPrint } from "../dom/util";

import * as util from "../util/util";
import { assoRotateLeft, binaryInfixOperator, assoRotateRight } from '../dom/infixOperators';


export namespace css {

    
    export const dummyNode = style({
        color: "rgba(0,0,0,0)",

        pointerEvents: "initial",
        userSelect: "auto",
        "-moz-user-select": "auto",
        "-ms-user-select": "auto",
        "-webkit-user-select": "auto",
        overflow: "hidden",
        background:  "rgba(100,100,255,0.2)", // Use this for debugging

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

            }
        }
    });

    
  

}

interface Creator_level {
    topleft: Vector;
    bottomright: Vector;
    fill: boolean;

    lastPos: Vector;
    lastEle: HTMLElement;
}

class Creator_impl extends Creator {

    private stack: Creator_level[];
    private ele: Element;

    constructor() {
        super();
        this.start(null);
    }

    private insertElement(pos: Vector): HTMLElement {
        const me = document.createElement("div");
        
        me.className = css.dummyNode;

        me.innerText = "."; // TODO: Make the glyph fill exactly the whole area!

        me.style.left = pos.x + "px";
        me.style.top = pos.y + "px";
    

        this.ele.appendChild(me);

        return me;
    }

    private scaleElement(me: HTMLElement, size: Vector): void {
        

        me.style.width = size.x + "px";
        me.style.height = size.y + "px";
        
        me.style.lineHeight = size.y + "px";
        me.style.fontSize = size.y + "px";
    }

    // size might be null if you don't want to insert a new element but only scale the previous one
    public add(pos: Vector, size: Vector): HTMLElement {
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
        
        // Insert next element
        if(size) {        
            last.lastPos = new Vector(end, pos.y);
            last.lastEle = this.insertElement(last.lastPos);
            last.bottomright = new Vector(pos.x + size.x, pos.y + size.y);
            return last.lastEle;
        }

        return null;
    }
 
    public push(fill: boolean): void {
        this.stack.push({
            topleft: null,
            bottomright: null,
            fill: fill,
            lastPos: null,
            lastEle: null
        });
    }

    public pop(): void {
        const last = this.stack[this.stack.length - 1];
        
        // TODO: fill is ignored.
        /*
        if(last.fill) {
            const plast = this.stack[this.stack.length - 2];
            if(plast.bottomright.x < last.bottomright.x) console.error("Must be not less!");
            this.add(new Vector(plast.bottomright.x, last.lastPos.y), null);
        } else*/ {            
            this.add(new Vector(last.bottomright.x, last.lastPos.y), null);
        }

        this.stack.pop();

    }

    // Create new dummy
    public start(ele: Element) {
        this.stack = [];
        this.ele = ele;
        if(this.ele)
            while (this.ele.firstChild) this.ele.removeChild(this.ele.firstChild);

        this.push(false);
    }

    // Complete dummy, empty stack
    public finish() {
        this.pop();
        if(this.stack.length !== 0) {
            console.error("Invalid Creator-usage!");
            console.log(this);
        }
    }
}


export class Cursor {

    private crea: Creator_impl;
    
    private hasSelectionChange: boolean;
    private mouseDown: boolean;
    private mdom: MNode;

    private dummyEle: HTMLElement;

    constructor(dummyEle: HTMLElement) {
        this.crea = new Creator_impl();

        this.dummyEle = dummyEle;
        
        const me = this;
        if(util.defined(document.onselectionchange)) {
            document.onselectionchange = e => {
                me.sCall();
            };
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

    private sCall: ()=>void = () => {
        const me = this;
        
        // TODO: Set selection on release, to place the touch-handles on the right place

        if(!me.mdom) {
            console.warn("no dom!");
            return;
        } 

        // Reset selection
        mMap(me.mdom, (a) => ((a as any).s ? ((a as any).s.className = css.dummyNode) : null, a) );

        if(!util.defined(window.getSelection)) alert("TODO: getSelection not found!");

        const selObj = window.getSelection(); 
        if(selObj.rangeCount === 0) {
            // Remove selection
        }
        else {
            if(selObj.rangeCount !== 1) console.error("TODO: Only one range supported");
            const selRange = selObj.getRangeAt(0);

            if(selRange.toString().length === 0) { //selRange.endContainer === selRange.startContainer) {
                // Remove selection
                // TODO: Set cursor!
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

        
        mMap(common, (a) => ((a as any).s ? ((a as any).s.className = css.dummyNode + " selected") : null, a) );
        
    }

    public buildDummy(mdom: MNode) {

        this.mdom = mdom;

        this.crea.start(this.dummyEle);
        mdom.createSelectionAreas(this.crea);
        this.crea.finish();

    }
}