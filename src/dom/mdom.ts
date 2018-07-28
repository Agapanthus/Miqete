
export class Vector {
    constructor(x: number, y: number) {
        this.x = x;
        this.y = y;
    }
    public x: number
    public y: number
}


export class Selectable {
    
    // The native Element associated with this node
    public e: Element

    // The selector-element
    public s: HTMLElement

    // Size and position of the native Element
    public size: Vector
    public pos: Vector
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

    // One level higher - returns, if fill was true, the placeholder element
    abstract pop(): HTMLElement;
}


export abstract class MNode  {

    // Something has been typed here 
    public abstract input(e: string, child: MNode, operate: boolean): void;

    // Returns the katex-string of this element and all its children
    public abstract toKatex(): string;

    // recursively refreshes e for itself and all children
    public abstract rKatex(parent: Element): void;
    
    // recursively refreshes size and pos
    // br is the getBoundingClientRect of the parent node
    public abstract sync(br: Vector): void;

    // Removes everything semantically irrelevant
    // Every irrelevant node removes itself AND SETS THE PARENT OF ITS CHILDREN! (to handle the top-case when there is no parent)
    public abstract strip(): MNode;

    // Adds stuff necessary for visualization (especially parenthesis) and SETS THOSE PARENT!
    public abstract bake(): MNode;

    // Will recursively create dummys for selection and cursor
    public abstract createSelectionAreas(creator: Creator): void;


    // Children and Parent of this node
    private children: MNode[] = [];
    private parent: MNode;

    public getChildren(): MNode[] {
        return this.children;
    } 
    public getParent(): MNode {
        return this.parent;
    }
    public setChild(child: MNode, index: number) {
        if(this.children.length < index) {
            throw "Invalid index";
        } else if(this.children.length === index) {
            this.children.push(child);
        } else {
            this.children[index] = child;
        }
        child.setParent__INTERNAL(this);
    }
    public clearChildren() {
        for(let c of this.children) {
            c.setParent__INTERNAL(null);
        }
        this.children = [];
    }
    /*public replace(by: MNode) {
        if(!this.parent) throw "Parent does not exist!";
        for(const i in this.parent.children) {
            if(this.parent.child(parseInt(i)) === this) {
                console.log("added " + i);                
                this.parent.setChild(by, parseInt(i));
                return;
            }
        }
        throw "Child not found";
    }*/
    public getIndex(child: MNode) : number {
        for(const i in this.children) {
            if(this.child(parseInt(i)) === child) {
                return parseInt(i);
            }
        }
        return -1;
    }
   
    public child(index: number) : MNode {
        if(!this.children[index]) throw "invalid index!";
        return this.children[index];
    }
    public setParent__INTERNAL(parent: MNode): void {
        this.parent = parent;
    }

    // This useful to automatically adding parenthesis, e.g. "(a+b)*c" when having "Mul Add a b c"
    // Common Precendences:
    // max Atomic types
    // 100 =
    // 31  prod
    // 30  * /
    // 21  sum
    // 20  + -
    public abstract precendence(): number;

};


export const maxPrec = 1000000;
