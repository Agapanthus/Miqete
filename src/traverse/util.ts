
import { Selectable, Vector } from "../dom/mdom";
import * as util from "../util/util";

export function directTextContent(e: Element) {
    if(e && e.firstChild  && e.firstChild .nodeType === Node.TEXT_NODE) {
        return e.firstChild.nodeValue;
    }
    return null;
}

// Returns the first childs which's content is not null or null (by deep search)
function fcwc(e: Element): Element {
    const ec = e.children;
    for(let i=0; i < ec.length; i++) {
        const v = directTextContent(ec[i]);
        if(v && v.length > 0) {
            return ec[i];
        }
        const e = fcwc(ec[i]);
        if(e) return e;
    }
}

// like fcwc, but includes the toplevel-Element
export function tfcwc(e: Element): Element {
    const v = directTextContent(e);
    if(v && v.length > 0) {
        return e;
    }

    return fcwc(e);
}

export function measure(e: Element, br: Vector, obj: Selectable) {
    const r = e.getBoundingClientRect();
    obj.size = new Vector(r.right - r.left, r.bottom - r.top);
    obj.pos = new Vector(r.left - br.x, r.top - br.y);
}


export const katexSpaceClasses = ["strut", "mspace", "pstrut", "vlist-s"];
export const katexDontFollow = katexSpaceClasses.concat(["mopen", "mclose"]);


export function getFirstChildNotClass(e: Element, notClass: string[]): Element {
    const ec = e.children;
    for(let i=0; i < ec.length; i++) {
        if(util.testIntersect(ec[i].className.split(" "), notClass)) continue;
        return ec[i];
    }
    return null;
}