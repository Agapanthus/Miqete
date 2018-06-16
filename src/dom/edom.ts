


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


export interface ENode extends Selectable {

     // Returns the katex-string of this element and all its children
     toKatex(): string,

     // recursively refreshes e, size and pos for itself and all children
     // br is the getBoundingClientRect of the parent node
     rKatex(parent: Element, br: Vector): void,

     
}