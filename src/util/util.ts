import * as base64js from "base64-js";
import * as $ from "jquery";
import * as lescape from "escape-latex";


export function defined(variable: any) {
    return !(typeof variable === 'undefined');
}

/*
// complement(a,b) are just those events from b which are not in a. Assumes a < b.
export function complement(a$, b$) {
    b$.map(_ => )
}
*/

export function updateState<T>(state: T, changes: Object) {
    if(!defined(state)) console.error("ERROR: updateState. State was undefined");
    let changed = false;
    for (let change in changes) {
        if(state[change] === changes[change]) continue;
        state[change] = changes[change];
        changed = true;
    }
    if(changed) return $.extend({}, state); // Damit die Änderung erkannt wird, muss man das Objekt kopieren... Keine Ahnung, wieso. Liegt an Onionify.
    return state;    
}


export function isNumeric(num: string){
    if(!num || num.length <= 0) return false;

    return num.match(/^-{0,1}\d+$/);
    //!isNaN(num as any)
}


// https://stackoverflow.com/a/1677660/6144727
export function isAsciiPrintableString(str: string): boolean {
    return !(/[\x00-\x1F\x80-\xFF]/.test(str));
}

// https://stackoverflow.com/a/12467610/6144727
export function isPrintableKey(keycode: number): boolean {
    return (keycode > 47 && keycode < 58)   || // number keys
        keycode == 32 || keycode == 13   || // spacebar & return key(s) (if you want to allow carriage returns)
        (keycode > 64 && keycode < 91)   || // letter keys
        (keycode > 95 && keycode < 112)  || // numpad keys
        (keycode > 185 && keycode < 193) || // ;=,-./` (in order)
        (keycode > 218 && keycode < 223);   // [\]' (in order)
}


export function latexEscape(str: string) : string {
    return lescape(str,
        {
            preseveFormatting: true,
            escapeMapFn: function(defaultEscapes, formattingEscapes) {
              formattingEscapes["\\"] = "\\backslash";
              return (Object as any).assign({}, defaultEscapes, formattingEscapes);
            }
        });    
}


// https://stackoverflow.com/a/25352300/6144727
export function isAlphaNumeric(str) {
    var code, i, len;
  
    for (i = 0, len = str.length; i < len; i++) {
      code = str.charCodeAt(i);
      if (!(code > 47 && code < 58) && // numeric (0-9)
          !(code > 64 && code < 91) && // upper alpha (A-Z)
          !(code > 96 && code < 123)) { // lower alpha (a-z)
        return false;
      }
    }
    return true;
};

// https://stackoverflow.com/a/8630641/6144727
export function createCSSSelector(selector: string, style: string) {
    if (!document.styleSheets) return;
    if (document.getElementsByTagName('head').length == 0) return;

    let styleSheet;
    let mediaType;

    if (document.styleSheets.length > 0) {
        for (let i = 0, l = document.styleSheets.length; i < l; i++) {
            if (document.styleSheets[i].disabled)
                continue;
            const media = document.styleSheets[i].media;
            mediaType = typeof media;

            if (mediaType === 'string') {
                if ((media as any) === '' || ((media as any).indexOf('screen') !== -1)) {
                    styleSheet = document.styleSheets[i];
                }
            } else if (mediaType == 'object') {
                if (media.mediaText === '' || (media.mediaText.indexOf('screen') !== -1)) {
                    styleSheet = document.styleSheets[i];
                }
            }

            if (typeof styleSheet !== 'undefined')
                break;
        }
    }

    if (typeof styleSheet === 'undefined') {
        var styleSheetElement = document.createElement('style');
        styleSheetElement.type = 'text/css';
        document.getElementsByTagName('head')[0].appendChild(styleSheetElement);

        for (i = 0; i < document.styleSheets.length; i++) {
            if (document.styleSheets[i].disabled) {
                continue;
            }
            styleSheet = document.styleSheets[i];
        }

        mediaType = typeof styleSheet.media;
    }

    if (mediaType === 'string') {
        for (var i = 0, l = styleSheet.rules.length; i < l; i++) {
            if (styleSheet.rules[i].selectorText && styleSheet.rules[i].selectorText.toLowerCase() == selector.toLowerCase()) {
                styleSheet.rules[i].style.cssText = style;
                return;
            }
        }
        styleSheet.addRule(selector, style);
    } else if (mediaType === 'object') {
        var styleSheetLength = (styleSheet.cssRules) ? styleSheet.cssRules.length : 0;
        for (var i = 0; i < styleSheetLength; i++) {
            if (styleSheet.cssRules[i].selectorText && styleSheet.cssRules[i].selectorText.toLowerCase() == selector.toLowerCase()) {
                styleSheet.cssRules[i].style.cssText = style;
                return;
            }
        }
        styleSheet.insertRule(selector + '{' + style + '}', styleSheetLength);
    }
}

export function hasElement(needle: any, haystack: any[]): boolean {
    return (haystack.indexOf(needle) > -1);
}

export function filter(a2: Array<any>, callback: Function, context?: any) {
    let arr = [];
    for (var i = 0; i < a2.length; i++) {
        if (callback.call(context, a2[i], i, a2))
            arr.push(a2[i]);
    }
    return arr;
};

export function startsWith(str: string, prefix: string): boolean {
    return str.indexOf(prefix) === 0;
}
export function endsWith(str: string, suffix: string): boolean {
    const matches = str.match(suffix+"$");
    if(!matches) return false;
    return matches[0] === suffix;
}

export function deepCopy<T>(a: T): T {
    return jQuery.extend(true, (a instanceof Array) ? [] : {}, a);
}


// https://stackoverflow.com/a/6969486/6144727
export function escapeRegExp(str) {
    return str.replace(/[\-\[\]\/\{\}\(\)\*\+\?\.\\\^\$\|]/g, "\\$&");
}

// like https://gist.github.com/alexhawkins/28aaf610a3e76d8b8264
export function reduce<T, B>(array: Array<T>, callback: (acc: B, val: T, i?: number, arr?: Array<T>) => B, initialVal?: B): B {
    let accumulator = (initialVal === undefined) ? undefined : initialVal;
    const context = undefined;
    for (var i = 0; i < array.length; i++) {
        if (accumulator !== undefined)
            accumulator = callback.call(context, accumulator, array[i], i, array);
        else {
            //if(typeof accumulator !== typeof array[i]) console.error("incompatible types: " + typeof accumulator + " " + typeof array[i]);
            accumulator = array[i] as any;
        }
    }
    return accumulator;
};

// https://stackoverflow.com/a/3809435/6144727
export const regexUrl = "https?:\\/\\/(www\\.)?[-a-zA-Z0-9@:%._\\+~#=]{2,256}\\.[a-z]{2,6}\\b([-a-zA-Z0-9@:%_\\+.~#?&//=]*)";

// https://stackoverflow.com/a/267405/6144727
export const regexRoman = "M{0,4}(CM|CD|D?C{0,3})(XC|XL|L?X{0,3})(IX|IV|V?I{0,3})";

// https://stackoverflow.com/a/21015393/6144727
const getTextWidthContext = document.createElement("canvas").getContext("2d");
export function getTextWidth(text, font) {
    getTextWidthContext.font = font;
    return Math.ceil(getTextWidthContext.measureText(text).width);
}

// Returns true iff the arrays intersect
export function testIntersect<T>(a: Array<T>, b: Array<T>) {
    for(let c of a) {
        if(b.indexOf(c) >= 0) return true;
    }
    return false;
}


// Returns true iff the arrays intersect
export function intersect<T>(a: Array<T>, b: Array<T>) {
    let intersection = [];
    for(let c of a) {
        if(b.indexOf(c) >= 0) {
            if(intersection.indexOf(c) < 0) {
                intersection.push(c);
            }
        }
    }
    return intersection;
}

// http://blog.stevenlevithan.com/archives/javascript-roman-numeral-converter
export function romanize(num: number): string|boolean {
	if (!+num)
		return false;
	var	digits = String(+num).split(""),
		key = ["","C","CC","CCC","CD","D","DC","DCC","DCCC","CM",
		       "","X","XX","XXX","XL","L","LX","LXX","LXXX","XC",
		       "","I","II","III","IV","V","VI","VII","VIII","IX"],
		roman = "",
		i = 3;
	while (i--)
		roman = (key[+digits.pop() + (i * 10)] || "") + roman;
	return Array(+digits.join("") + 1).join("M") + roman;
}

// http://blog.stevenlevithan.com/archives/javascript-roman-numeral-converter
export function deromanize(str: string): number|boolean {
	var	str = str.toUpperCase(),
		validator = /^M*(?:D?C{0,3}|C[MD])(?:L?X{0,3}|X[CL])(?:V?I{0,3}|I[XV])$/,
		token = /[MDLV]|C[MD]?|X[CL]?|I[XV]?/g,
		key = {M:1000,CM:900,D:500,CD:400,C:100,XC:90,L:50,XL:40,X:10,IX:9,V:5,IV:4,I:1},
		num = 0, m;
	if (!(str && validator.test(str)))
		return false;
	while (m = token.exec(str))
		num += key[m[0]];
	return num;
}

