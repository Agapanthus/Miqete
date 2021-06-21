
import { binaryInfixOperator } from "../dom/infixOperators";
import { Integer } from "../dom/literals";
import { bigPrefixOperator } from "../dom/bigOperators";

import { Creator, MNode, Vector, Selectable, Finishable } from "../dom/mdom";

import * as util from "../util/util";


export interface Config {
    semantics: boolean, // If true, we try to prevent some semantic nonsense where we can. Semantics: false needs some more testing!
    restrictMismatchedBrackets: boolean, // If false, allows stuff like (] TODO: implement
    breakOutSupSub: string[], // These katex-commands end the sub sup. TODO: impelemt 
    //latexStyle: boolean, // If true, all commands need to start with \ TODO: implement
    multiCharacterVariables: boolean, // If true, "fo" will be rendered by default as "fo" instead of "f o"  TODO: implement
    directNumbers: boolean, // Will directly input numbers as numbers. Commands must not contain numbers.

    currentInput: Finishable, // This is the focused input Element. Use "null" if you didn't create one.

    symbols: string, // A command ends with space, enter, focus lost or when changing between alpha-numeric and symbols. A character is a symbol iff it is in this list
    commandsIO: object, // These commands are used for infixOperators (and relations)
    commandsBO: object, // These commands are used for bigOperators
    commandsSym: object, // These commands are used for symbols
    commandsPar: object, // These commands are used for Parentheses
    commandsFon: object, // These commands are used for Fonts (and similar formatting-stuff)
}



        ///////////////////////////// Check, if config is wellformed
export function verifyConfig(config: Config) {
    let r = config;
    
    // Test, if commands intersect
    const k1 = Object.keys(config.commandsIO);
    const k2 = Object.keys(config.commandsBO);
    const k3 = Object.keys(config.commandsSym);
    const k4 = Object.keys(config.commandsPar);
    const k5 = Object.keys(config.commandsFon);
    const i1 = util.intersect(k1, k2.concat(k3).concat(k4).concat(k5));
    const i2 = util.intersect(k2, k1.concat(k3).concat(k4).concat(k5));
    const i3 = util.intersect(k3, k2.concat(k1).concat(k4).concat(k5));
    const i4 = util.intersect(k4, k2.concat(k3).concat(k1).concat(k5));
    const i5 = util.intersect(k5, k2.concat(k3).concat(k4).concat(k1));
    if(i1.length > 0) {
        console.error("intersects 1:", i1);
        r = null;
    }
    if(i2.length > 0) {
        console.error("intersects 2:", i2);
        r = null;
    }
    if(i3.length > 0) {
        console.error("intersects 3:", i3);
        r = null;
    }
    if(i4.length > 0) {
        console.error("intersects 4:", i4);
        r = null;
    }
    if(i5.length > 0) {
        console.error("intersects 5:", i5);
        r = null;
    }

    return r;
}


export class ObjectCreator {
    private config: Config; 
    
    constructor(config: Config) {
        this.config = config;
        
    }

    public Add(a: MNode, b: MNode) {
        return new binaryInfixOperator(a,b,"+", this.config);
    }

    public Sub(a: MNode, b: MNode) {
        return new binaryInfixOperator(a,b,"-", this.config);
    }

    public Mul(a: MNode, b: MNode) {
        return new binaryInfixOperator(a,b,"\\cdot", this.config);
    }

    public Sum(bot: MNode,top: MNode,bod: MNode) {
        return new bigPrefixOperator(bot, top, bod, "\\sum", this.config);
    }
    public Prod(bot: MNode,top: MNode,bod: MNode) {
        return new bigPrefixOperator(bot, top, bod, "\\prod", this.config);
    }
    public Int(val: number) {
        return new Integer(val, this.config);
    }

}