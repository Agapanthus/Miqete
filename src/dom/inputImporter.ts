
import { MNode } from "./mdom";
import { Config } from "../util/config";




export interface MNodePair {
    left: MNode;
    right: MNode;
}

export interface Splitable {
    
    // Split item at given child - this might give one or two results.
    // if operate is true, that child should be removed
    // if child==null, you should think of it as past the last child
    split(child: MNode, operate: boolean) : MNodePair;
}

// Solves circular dependencies
export function defaultInput(e: string, that: MNode, child: MNode, operate: boolean, split: Splitable, config: Config): boolean {

    return (window as any).defaultInput(e, that, child, operate, split, config);
}