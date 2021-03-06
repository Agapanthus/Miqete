
import * as katex from "katex";

import { MNode, Vector } from "../dom/mdom";
import { Cursor } from "./cursor"

declare const ResizeObserver: any;


import * as util from "../util/util";
import { style } from "typestyle/lib";
import { Layer } from "../dom/layer";
import { Config } from "../util/config";


export namespace css {

    
    export const noSelect = style({
        
        // IE, smart as it is, for some interactions simply ignores this
        // TODO: Still doesn't really work in IE11. Why?

        pointerEvents: "none",
        userSelect: "none",
        "-moz-user-select": "none",
        "-ms-user-select": "none",
        "-webkit-user-select": "none",

        $nest: {
            "& div, & span, & svg": {
                pointerEvents: "none",
                userSelect: "none",
                "-moz-user-select": "none",
                "-ms-user-select": "none",
                "-webkit-user-select": "none",
            },
           
        }

    });
};



export class Editor {

    private katexEle: HTMLElement;
    private dummyEle: HTMLElement;

    private mdom: MNode;

    private c: Cursor;

    private config: Config;

    constructor(element: Element, mdom: MNode, config) {
      
        this.config = config;
        
        this.mdom = new Layer(mdom);
        this.katexEle = document.createElement("div");
        this.katexEle.className = css.noSelect;

        this.dummyEle = document.createElement("div");
        this.dummyEle.style.position = "absolute";
        this.dummyEle.style.lineHeight = "100%";

        const me = this;
        this.c = new Cursor(this.dummyEle, (mdom: MNode) => (me.mdom=mdom, me.rebuildKatex()), this.config );

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
        this.mdom.sync(br);

        this.c.buildDummy(this.mdom);

    }


    private oberserving: boolean

    private rebuildKatex() {
        const kt = "\\displaystyle" + this.mdom.toKatex();
        console.log(kt);

        
        const me = this;


        // Currently only supported in chrome
        if(util.defined(window["ResizeObserver"])) { 
            if(!this.oberserving) {
                this.oberserving = true;

                const observer = new ResizeObserver( function(mutations) {
                   // console.log("resize");
                    
                   /* const khtml = $(".katex-html .base", me.katexEle)[0];
                    me.mdom.rKatex(khtml);  */   
                    
                    me.rebuildDummy()
                
                });  
                observer.observe(this.katexEle);
            }
        } 
                

        katex.render(kt, this.katexEle); 

        // TODO: You can have changes which don't result in size changes! (replace 3 with 4 etc...)
        if(this.oberserving) { 
            const khtml = $(".katex-html .base", me.katexEle)[0];
            me.mdom.rKatex(khtml);   
            me.rebuildDummy()  
        }


        if(!util.defined(window["ResizeObserver"])) { 
            console.warn("Using Fallback for ResizeOberserver")
            
            const khtml = $(".katex-html .base", this.katexEle)[0];
            this.mdom.rKatex(khtml);     

            // TODO: Is there something better in non-chrome Browsers? requestAnimationFrame and MutationObserver don't listen to such changes!
            setTimeout(() => me.rebuildDummy(),10);   
            setTimeout(() => me.rebuildDummy(),100);  
            setTimeout(() => me.rebuildDummy(),1000);         
        }

    }
}