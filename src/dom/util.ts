
import { MNode } from "./mdom";
import { Glyph } from "./literals";
import * as util from "../util/util";
import { Selectable, Vector } from "../dom/mdom";


// Find the node with property testL (if there is none, returns null)
export function findChild(a: MNode, testL: (a: MNode) => boolean): MNode {
    if(!a) return null;
    if(testL(a)) return a;
    else for(const c of a.getChildren()) {
        const t = findChild(c, testL);
        if(t) return t;
    }
    return null;
}

export function findCommonAncestor(L: MNode, R: MNode): MNode {
    

    let temp = L;
    let lparents = [];
    while(temp) {
        lparents.push(temp);
        temp = temp.getParent();
    }

    temp = R;
    while(temp) {
        if(util.hasElement(temp, lparents)) {
            return temp;
        }
        temp = temp.getParent();
    }

    return null;
}


export function mMap(a: MNode, fun: (a: MNode) => MNode): MNode {
    if(!a) console.error("must be non-null")
    const t = fun(a);
    for(let i in a.getChildren()) {
        a.setChild(mMap(a.child(i as any), fun), parseInt(i));
    }
    return t;
}

 // SLOW! For debugging: Searches for wrong parent-child relations and checks that every node appears only once!
export function sanityCheck(a: MNode, maybeRoot?: boolean) : void {
    if(!maybeRoot && !a.getParent()) console.warn("Are you sure that this should be the root?", a, mPrint(a));

    // Does every child has it's parent set as it's parent?
    checkParent(a, a.getParent());

    // Does every node appear only once?
    mMap(a, b => {
        for(const c of b.getChildren()) {
            mMap(c, d => {
                if(d === b) {
                    console.error(c,b);
                    console.error(mPrint(c), mPrint(b));
                    throw "This node is referenced multiple times!";
                }
                return d;
            });
        }
        return b;
    });

    // Continue to check parents
    if(a.getParent()) sanityCheck(a.getParent(), true);
}

function checkParent(a: MNode, parent: MNode) {
    if(a.getParent() === a) {
        console.error("Is it's own parent:", a);
        throw "Wrong parent!";
    }
    if(parent) {
        if(a.getParent() !== parent) {
            console.error("Has a wrong parent:", a, "parent: ", parent);
            throw "Wrong parent!";
        }
        if(parent.getIndex(a) < 0) {
            console.error("Is not it's parent's child:", a, "parent: ", parent);
            throw "Wrong parent!";
        }
    }
    
    for(const b of a.getChildren()) {
        checkParent(b, a);
    }
}


export function mPrint(a: MNode, indent?: number): string {
    let indenta = "";
    if(!indent) indent = 0;
    for(let i=0; i<indent; i++) indenta += "  ";
    let info = "  ";
    if(a instanceof Glyph) {
        info += a.getSValue();
    }

    let str = indenta + (a.constructor as any).name + info + "\n";
   
    for(const c of a.getChildren()) {
        str += mPrint(c, indent+1);
    }

    return str;
}

export function getVisualIndex(a: MNode, parent: Element): number {
    const s = (a as any) as Selectable;
    if(!util.defined(s.s)) {
        console.error("Not selectable")
        return -1;
    }
    
    let i;
    for(i=0; i<parent.children.length; i++) {
        if(parent.children[i] === s.s) break;
    }
    if(i < 0) {
        console.error("No child");
        return -1;
    }
    
    return i;
}

export function getByVisualIndex(i: number, dom: MNode, parent: Element): MNode  {
    if(i < 0 || i >= parent.children.length) {
        console.error("invalid index");
        return null;
    }
    const c2 = parent.children[i];
    return findChild(dom, a => (a as any).s === c2);
}

export function getNextInSameLayer(index: number, dom: MNode, parent: Element): MNode  {
    let c2 = parent.children[index];
    for(let i=index+1; i < parent.children.length; i++) {
        if(parent.children[i].getAttribute("layer") === parent.children[index].getAttribute("layer")) {
            c2 = parent.children[i];
            break;
        }
    }
    return findChild(dom, a => (a as any).s === c2);
}


/////////////////////////////////////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////////////////////////



export function directTextContent(e: Element) {
    if(e && e.firstChild  && e.firstChild .nodeType === Node.TEXT_NODE) {
        return e.firstChild.nodeValue;
    }
    return null;
}

// Returns the first childs which's content is not null or null (by deep search)
function fcwc(e: Element): Element {
    const ec = e.children;
    for(let i=0; i < ec.length; i++) {
        const v = directTextContent(ec[i]);
        if(v && v.length > 0) {
            return ec[i];
        }
        const e = fcwc(ec[i]);
        if(e) return e;
    }
}

// like fcwc, but includes the toplevel-Element
export function tfcwc(e: Element): Element {
    const v = directTextContent(e);
    if(v && v.length > 0) {
        return e;
    }

    return fcwc(e);
}

export function measure(e: Element, br: Vector, obj: Selectable) {
    const r = e.getBoundingClientRect();
    obj.size = new Vector(r.right - r.left, r.bottom - r.top);
    obj.pos = new Vector(r.left - br.x, r.top - br.y);
}


export const katexSpaceClasses = ["strut", "mspace", "pstrut", "vlist-s"];
export const katexDontFollow = katexSpaceClasses.concat(["mopen", "mclose"]);


export function getFirstChildNotClass(e: Element, notClass: string[]): Element {
    const ec = e.children;
    for(let i=0; i < ec.length; i++) {
        if(util.testIntersect(ec[i].className.split(" "), notClass)) continue;
        return ec[i];
    }
    return null;
}

export function hasClass(e: Element, a: string[]): boolean {
    return util.testIntersect(e.className.split(" "), a)
}