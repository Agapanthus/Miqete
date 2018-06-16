

import * as katex from "katex";

import { MNode, SimplificationStrategy, Vector } from "../dom/mdom";


declare const ResizeObserver: any;


function buildDummy(node: MNode, e: Element) {
    const me = document.createElement("div");
    
    if(node.size) {
        me.style.width = node.size.x + "px";
        me.style.height = node.size.y + "px";
        me.style.left = node.pos.x + "px";
        me.style.top = node.pos.y + "px";

        me.style.position = "absolute";
        me.style.background = "rgba(100,100,255,0.2)"
        me.style.overflow = "hidden"
        me.style.userSelect = "initial";
        me.style.pointerEvents = "initial";
    }

    if(node.children.length === 2) { // TODO: infix
        buildDummy(node.children[0], e);
        e.appendChild(me);
        buildDummy(node.children[1], e);
    }
    else if(node.children.length === 3) { // TODO: big
        buildDummy(node.children[0], e);
        buildDummy(node.children[1], e);
        buildDummy(node.children[2], e);
    }
    else if(node.children.length === 0) { // TODO: literal
        e.appendChild(me);;
    } else {
        console.error("not supported");
    }

    //for(let c of node.children) buildDummy(c, e);
}

export class Editor {

    private katexEle: HTMLElement;
    private dummyEle: HTMLElement;

    private mdom: MNode;

    constructor(element: Element, mdom: MNode) {
      
        this.mdom = mdom;
        this.katexEle = document.createElement("div");
        this.katexEle.style.userSelect = "none";
        this.katexEle.style.pointerEvents = "none";

        this.dummyEle = document.createElement("div");
        this.dummyEle.style.position = "absolute";
        this.dummyEle.style.lineHeight = "100%";

        const pseudoPar = document.createElement("div");
        pseudoPar.style.position = "relative";
        pseudoPar.style.display = "inline-block";
        pseudoPar.appendChild(this.dummyEle);
        pseudoPar.appendChild(this.katexEle);

        while (element.firstChild) element.removeChild(element.firstChild);
        element.appendChild(pseudoPar);
        
        this.rebuildKatex();
    }


    private rebuildDummy() {
        const br = new Vector(this.katexEle.getBoundingClientRect().left, this.katexEle.getBoundingClientRect().top);
        const khtml = $(".katex-html .base", this.katexEle)[0];
        this.mdom.rKatex(khtml, br);

        while (this.dummyEle.firstChild) this.dummyEle.removeChild(this.dummyEle.firstChild);

        buildDummy(this.mdom, this.dummyEle);

    }

    private eval() {
        const res = this.mdom.eval({
            strategy: SimplificationStrategy.none,
            prec: 32, given: []});

        console.log(res);
    }

    private rebuildKatex() {
        const kt = "\\displaystyle" + this.mdom.toKatex();
        console.log(kt);

        
        const me = this;
        if(ResizeObserver) { 
            const observer = new ResizeObserver( function(mutations) {
                console.log("resize");
                me.rebuildDummy()
            
            });  
            observer.observe(this.katexEle);
        } 
                

        katex.render(kt, this.katexEle);      

        
        if(!ResizeObserver) { 
            // TODO: Is there something better in non-chrome Browsers? requestAnimationFrame and MutationObserver don't listen to such changes!
            setTimeout(() => me.rebuildDummy(),10);         
        }

    }
}