
import { MNode } from "./mdom";
import { Config } from "../util/config";




export interface MNodePair {
    left: MNode;
    right: MNode;
}

export interface Splitable {
    split(child: MNode, operate: boolean) : MNodePair;
}

// Solves circular dependencies
export function defaultInput(e: string, that: MNode, child: MNode, operate: boolean, split: Splitable, config: Config) {

    (window as any).defaultInput(e, that, child, operate, split, config);
}