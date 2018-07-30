
import { MNode } from "./mdom";
import * as tutil from "./util";



export abstract class Associative extends MNode {

    // Returns the left (or right) child's index
    public abstract getLeft(): number;
    public abstract getRight(): number;

    public abstract isAssociative(): boolean;

    

    // Checks if this is the leftmost child in this associative area
    public isLeftmostChild(a: MNode): boolean {
        if(this === a) return true;
        const c = this.child(this.getLeft());
        if(c === a) return true;
        if(c instanceof Associative) {
            return c.isLeftmostChild(a);
        } else return false;
    }

    // Checks if this is the rightmost child in this associative area
    public isRightmostChild(a: MNode): boolean {
        if(this === a) return true;
        const c = this.child(this.getRight());
        if(c === a) return true;
        if(c instanceof Associative) {
            return c.isRightmostChild(a);
        } else return false;
    }

    public getLeftMost(): MNode {
        const L = this.child(this.getLeft());
        if(L instanceof Associative) {
            return L.getLeftMost();
        } 
        return L;
    }

    public getRightMost(): MNode {
        const L = this.child(this.getRight());
        if(L instanceof Associative) {
            return L.getRightMost();
        } 
        return L;
    }
}

// https://stackoverflow.com/a/41429145/6144727
class AssoException extends Error {
    constructor(a: string) {
        super(a);
        (Object as any).setPrototypeOf(this, AssoException.prototype);
    }
}

// If b is associative, left rotation doesn't change semantics. Don't forget to link c to b's parent!
export function assoRotateLeft(b: Associative, dontcheck?: boolean): void {
    if(!dontcheck) {
        if(!b.isAssociative()) throw new AssoException("Operator is not associative");
    }
    //      b           c
    //     / \         / \
    //    a   c  ->   b   e
    //       / \     / \ 
    //      d   e   a   d

    const bR = b.getRight();
    const c = b.child(bR) as Associative;
    const cL = c.getLeft();
    const d = c.child(cL);

    b.replace(c);
    c.setChild(b, cL);
    b.setChild(d, bR);   
    
    tutil.sanityCheck(b);
    tutil.sanityCheck(c); 
}

// If a.child(0) is associative, right rotation doesn't change semantics. Don't forget to link b to a's parent!
export function assoRotateRight(a: Associative, dontcheck?: boolean): void {
    const aL = a.getLeft();
    if(!dontcheck) {
        if(! (a.child(aL) instanceof Associative)) throw new AssoException("b must be an Operator");
    }

    //      a           b
    //     / \         / \
    //    b   c  ->   e   a
    //   / \             / \
    //  e   f           f   c

    const b = a.child(aL) as Associative;
    const bR = b.getRight();
    const f = b.child(bR);

    a.replace(b);
    a.setChild(f, aL);
    b.setChild(a, bR);
    
    if(!dontcheck) {
        if(!b.isAssociative()) {
            assoRotateLeft(b, true); // Revert changes
            throw new AssoException("Operator is not associative");
        }
    }
    
    tutil.sanityCheck(b);
    tutil.sanityCheck(a);
}



// Coming from node "common" it follows the path to "child" until there is a node which doesn't implement associativity. 
// Example:
// 
// BIO? yes        yes   no    yes   no    no
//      common --- a --- b --- c --- d --- child
//                       A
//         returns this -|
export function getChildBelowTopmostContinuedSeriesOfOperators(common: MNode, child: MNode) {
    let head = child;
    let temp = child;
    let lastWasBIO = false;
    while(temp != common) {
        if(temp.getParent() instanceof Associative) {
            if(!lastWasBIO) head = temp;
            lastWasBIO = true;
        } else {
            lastWasBIO = false;
        }
        temp = temp.getParent();
    }
    return head;
};


// Use associative law to rotate the tree so that L and R are in a minimal subtree.
// That tree's root is returned.
export function bringClose(L: MNode, R: MNode) : MNode {
    let common = tutil.findCommonAncestor(L, R);
    if(!common) {
        console.error("no ancestor found!");
        return;
    }

    if(common instanceof Associative) {
        let pindex = null;
        //let cp = common.getParent();
        //if(cp) pindex = cp.getIndex(common);

        let lHead = getChildBelowTopmostContinuedSeriesOfOperators(common, L);
        let rHead = getChildBelowTopmostContinuedSeriesOfOperators(common, R);

        while(true) {
            // If child is leftmost of the common ancestor - done!
            if(common.isLeftmostChild(lHead)) {
                // Continue rotating, if we are in the root and the left uninteresting branch has still operators
                if(lHead === common && (common.child(common.getLeft()) instanceof Associative)) {
                    // dont break
                } else break;
            }

            try {                
                
                // Rotate base rightwards and place it in the dom
                //const newBase = 
                assoRotateRight(common);
                
                //if(cp) cp.setChild(newBase, pindex);
                //else throw "Never do this!"; //this.mdom = newBase;
    
                // Find the common ancestor
                common = tutil.findCommonAncestor(L, R) as Associative;
                if(!(common instanceof Associative)) {
                    console.error("Ancestor is no associative operator. This shouldn't happen.");
                    return;
                }
                //cp = common.getParent();
                //if(cp) pindex = cp.getIndex(common);

            } catch(e) {
                tutil.sanityCheck(common);

                if(!(e instanceof AssoException)) throw e; // rethrow
                break; // Non-asso operator
            }

        }
        
        
        while(true) {
            // If child is leftmost of the common ancestor - done!
            if(common.isRightmostChild(rHead)) {
                // Continue rotating, if we are in the root and the right uninteresting branch has still operators
                if(rHead === common && (common.child(common.getRight()) instanceof Associative)) {
                    // dont break
                } else break;
            }
            
            try {
                // Rotate base rightwards and place it in the dom
                //const newBase = 
                assoRotateLeft(common);
                //if(cp) cp.setChild(newBase, pindex);
                //else throw "Never do this!"; //this.mdom = newBase;
    
                // Find the common ancestor
                common = tutil.findCommonAncestor(L, R) as Associative;
                if(!(common instanceof Associative)) {
                    console.error("Ancestor is no associative operator. This shouldn't happen.");
                    return;
                }
                //cp = common.getParent();
                //if(cp) pindex = cp.getIndex(common);
                
            } catch(e) {
                if(!(e instanceof AssoException)) throw e; // rethrow
                break; // Non-asso operator
            }
        }
        
    }

    return common;
}