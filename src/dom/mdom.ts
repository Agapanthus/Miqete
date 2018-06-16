import { ENode, Vector } from "./edom";


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

export interface MNode  {

    // Will create an Edit-Dom from the Math-Dom
    //buildEdom(): ENode,

    
     // Returns the katex-string of this element and all its children
     toKatex(): string,

     // recursively refreshes e, size and pos for itself and all children
     // br is the getBoundingClientRect of the parent node
     rKatex(parent: Element, br: Vector): void,

     
    // The native Element associated with this node
    e: Element,

    // Size and position of the native Element
    size: Vector,
    pos: Vector,
     

  
    // Returns the symbolically fully simplified eval
    eval(flags: EvalFlags): MNode,


    // Children and Parent of this node
    children: MNode[],
    parent: MNode,


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


export const maxPrec = 1000000;
