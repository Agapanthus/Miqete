import * as util from "../util/util";

export class Vector {
    constructor(x: number, y: number) {
        this.x = x;
        this.y = y;
    }
    public x: number
    public y: number
}


export interface Selectable {
    
    // The native Element associated with this node
    e: Element,

    // Size and position of the native Element
    size: Vector,
    pos: Vector,
}


export enum SimplificationStrategy {
    // Don't do anything!
    none,

    // If possible, use commutative law to alphanumerically sort terms connected by operators of same precedence
    sort,

    // For +-*/
    expand,
    factor,

    // Logical normal forms
    pränex,
    skolem,
    positive,
    cdnf, // canonical disjunctive
    ccnf, // canonical conjunctive

}

export interface EvalFlags {
    strategy: SimplificationStrategy, // expand, factor...
    prec: number, // number of bits precision or -1 for precise evaluation
    given: any[], // Given variables, e.g. "x=1/2" or "sin(x^2)=u_1" for substitution
}

// Add automatically-generated silent parentheses
export function opar(inner: string, addPar: boolean) {
    if(addPar) return "\\color{lightgrey}\\left(\\color{black}" + inner + "\\color{lightgrey}\\right)\\color{black}";
    return inner;
}


export abstract class Creator {
    // Add a selection area
    abstract add(pos: Vector, size: Vector): HTMLElement;

    // One level deeper (following ones won't be interpolated with elements from other levels). 
    // Example:
    //
    // a   b
    //  _1
    //
    // [a ][ b]
    //   [_1]
    //
    // (_1 has been pushed down and the gap between a and b has been closed)
    //
    // 1   +   2
    // ---------   b
    //     a
    //
    // [1 ][ + ][ 2  ]
    // -------------  [ b ]
    // [     a       ]
    //
    // (a has been pushed down with "fill=true" and not only the gap between 2 and b has beend closed,
    // but also a has been padded to the same length as 1+2)
    abstract push(fill: boolean): void;

    // One level higher
    abstract pop(): void;
}


export interface MNode  {

    // Returns the katex-string of this element and all its children
    toKatex(): string,

    // recursively refreshes e for itself and all children
    rKatex(parent: Element): void,
    
    // recursively refreshes size and pos
    // br is the getBoundingClientRect of the parent node
    sync(br: Vector): void,

    // Removes everything semantically irrelevant
    // Every irrelevant node removes itself AND SETS THE PARENT OF ITS CHILDREN!
    strip(): MNode,

    // Adds stuff necessary for visualization (especially parenthesis) and SETS THOSE PARENT!
    bake(): MNode,

    // Will recursively create dummys for selection and cursor
    createSelectionAreas(creator: Creator): void,
 
    // Returns the symbolically fully simplified eval
    eval(flags: EvalFlags): MNode,


    // Children and Parent of this node
    children: MNode[],
    parent: MNode,

    // The selector-element
    s: HTMLElement,

    // This useful to automatically adding parenthesis, e.g. "(a+b)*c" when having "Mul Add a b c"
    // Common Precendences:
    // max Atomic types
    // 100 =
    // 31  prod
    // 30  * /
    // 21  sum
    // 20  + -
    precendence: number;

};


// Find the node with property testL (if there is none, returns null)
export function findChild(a: MNode, testL: (a: MNode) => boolean): MNode {
    if(!a) return null;
    if(testL(a)) return a;
    else for(const c of a.children) {
        const t = findChild(c, testL);
        if(t) return t;
    }
    return null;
}

export function findCommonAncestor(a: MNode, testL: (a: MNode) => boolean, testR: (a: MNode) => boolean): MNode {
    const L = findChild(a, testL);
    if(L === null) return null;
    const R = findChild(a, testR);
    if(R === null) return null;

    let temp = L;
    let lparents = [];
    while(temp) {
        lparents.push(temp);
        temp = temp.parent;
    }

    temp = R;
    while(temp) {
        if(util.hasElement(temp, lparents)) {
            return temp;
        }
        temp = temp.parent;
    }

    return null;
}

export function mMap(a: MNode, fun: (a: MNode) => MNode): MNode {
    if(!a) console.error("must be non-null")
    const t = fun(a);
    for(let i in a.children) {
        a.children[i] = mMap(a.children[i], fun);
    }
    return t;
}

export const maxPrec = 1000000;
