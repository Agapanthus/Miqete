
import { MNode } from "./mdom";
import { Literal } from "./literals";
import * as util from "../util/util";


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
        a.setChild(mMap(a.child(parseInt(i)), fun), parseInt(i));
    }
    return t;
}


export function mPrint(a: MNode, indent?: number): void {
    let indenta = "";
    if(!indent) indent = 0;
    for(let i=0; i<indent; i++) indenta += "  ";
    let info = "  ";
    if(a instanceof Literal) {
        info += a.getSValue();
    }

    console.log(indenta + (a.constructor as any).name + info);
   
    for(const c of a.getChildren()) {
        mPrint(c, indent+1);
    }
}