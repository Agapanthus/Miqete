

import { MNode, Vector, Creator, Selectable, maxPrec } from "./mdom";
import * as tutil from "./util";
import * as l from "./literals";
import { Config } from "../util/config";
import { binaryInfixOperator } from "./infixOperators";

export interface Joinable {
    // try joining with the right neighbour
    // return null (not possible) or the resulting joined MNode
    tryJoin(rightPartner: MNode) : MNode;
}

export class Sequence extends binaryInfixOperator {

    constructor(a: MNode, b: MNode, config: Config) {
        super(a,b,"", config);
    }

    public tryJoin() {
        const c = this.child(0) as any;
        if("tryJoin" in c) {
            const r = c.tryJoin(this.child(1));
            if(r) {
                const p = this.getParent();
                if(!p) console.error("tryJoin must be called within a tree and not on the root!");
                const ind = p.getIndex(this);
                if(ind < 0) console.error("I must be a child of my parent");
                p.setChild(r, ind);
            }
        }

    } 
}
