import { enableJS } from "../util/scriptblocker";
import { loader } from "../GUI/loader";
import * as styles from "../util/styles";
import { body } from "../GUI/body";
import * as Modernizr from 'modernizr';
//import * as WebFont from "webfontloader";

import { Editor } from "../editor/editor";

import 'katex/dist/katex.min.css';

import * as io from "../dom/infixOperators";
import * as bo from "../dom/bigOperators";
import * as l from "../dom/literals";
import { init } from "../dom/input";

import * as $ from "jquery";
import { mPrint } from "../dom/util";
import { Config, ObjectCreator, verifyConfig } from "../util/config";


const _body: (a: string) => string = (a) => `<div class='${body.body}'>${a}</div>`;

const buildGUI: () => void = () => {

  $("#GUIBase").html( _body(`<div id="tester" style=""><div id="testeri"></div></div>`) + _body(`<div id="mq2"></div>`) 
      + _body(`<span> Fork me on <a href="https://github.com/Agapanthus/Miqete">Github</a> </span>`));

  $("#mainloader").css("opacity","0");
  setTimeout(()=> $("#mainloader").remove() );


  const element = document.getElementById("testeri");

  const config: Config = {
    semantics: true,
    restrictMismatchedBrackets: false,
    breakOutSupSub: ["+", "-", "=", "<", ">", "\\frac"],
    multiCharacterVariables: false,

    symbols: "\\\"/!§$%&/()[]{}=,.-;:_+*#'^°<>|", // TODO: direct unicode inputs (Ctrl+v)
    commandsIO: {

      // Symbol Infix stuff, TODO: http://asciimath.org/
      "+": "+",
      "*": "*",
      "-": "-",
      "/": "\\frac",
      "+-":"\\pm",
      "-+": "\\mp",
      "=>": "\\geq", 
      "==>": "\\implies",
      "<=>": "\\iff",
      "<=": "\\leq", 
      "<==": "\\impliedby",
      // "<-" is used as in 4 < -x
      "<--": "\\leftarrow",
      "-->": "\\rightarrow",
      "<---": "\\longleftarrow",
      "--->": "\\longrightarrow",
      // TODO: uparrow, downarrow?
      ":=": "\\coloneqq",
      "|=": "\\models",
      "==": "\\equiv",
      "/=": "\\ne",
      "!=": "\\ne",
      "\\": "\\backslash",
      //"|": "\\vert",

      // TODO: direct inputs

    },
    commandsBO: {

      // big Ops
      "sum": "\\sum",
      "prod": "\\prod",

      
    },
    commandsSym: {
      "...": "\\dots",

      // TODO: greek
      "alpha": "\\alpha",
      "beta": "\\beta", 

      // TODO: other letters

      "infty": "\\infty",
      "oo": "\\infty",
      "infinity": "\\infinity",

      // TODO: Combined
      "|N": "\\mathbb{N}",
      "|R": "\\mathbb{R}",
    
    },
    commandsPar: {
      "|_": ["\\lfloor", "\\rfloor"],
      "_|": ["\\rfloor"],

      "(":  ["(", ")"],
      ")":  [")"],
      "[":  ["[", "]"],
      "]":  ["]"],
      "{":  ["{", "}"],
      "}":  ["}"],
      "|":  ["|", "|"],
      
      // TODO: { : } and { | } ????
      // TODO: langle, rangle
      // TODO: Generic! uparrow-pair etc...
    },
    commandsFon: { // TODO: text... can be stacked, but math... can't!
     
      "mathsf": "\\mathsf", // sans serif      
      "mathrm": "\\mathrm", // Roman
      "mathbf": "\\mathbf", // Roman bold
      "mathit": "\\mathit", // Roman italic
      "boldsymbol": "\\bm", // Roman bold italic

      "mathtt": "\\mathtt", // Monospace
      
      "mathbb": "\\mathbb", // double-struck
      "mathfrak": "\\mathit", // fracture
      "mathscr": "\\mathscr", // script
      "mathcal": "\\mathcal", // Caligraphy

      "frak": "\\mathfrak",
      "bold": "\\mathbf",
      "bb": "\\mathbb",
      "doublestruck": "\\mathbb",
      "sansserif": "\\mathsf",
      "code": "\\mathtt",
      "tt": "\\mathtt",
      "cali": "\\mathcal",
      "script": "\\mathscr",
      "bm": "\\bm",
     
      
    }
  
  };
  
  verifyConfig(config);
  const c = new ObjectCreator(config);
  
  const sum = c.Mul(c.Int(3), c.Prod( c.Int(6), c.Add(c.Int(6), c.Int(6)), c.Int(2)));

  const mdom = (c.Sum( c.Int(112), c.Int(19), 
        c.Mul( c.Add( c.Add( c.Add(c.Add(c.Int(1941), sum ), c.Mul(c.Int(3), c.Int(3))), c.Int(4)), c.Int(5)), c.Int(2))
      )).bake() //.strip();

  new Editor(element, mdom, config);

};

window.onload = ()=> {
  enableJS();

  // https://github.com/Modernizr/Modernizr/issues/1687
  if(!Modernizr.csstransitions) alert("TODO: Error: Transition");
  if(!Modernizr.svg) alert("TODO: Error: SVG");
  if(!Modernizr.eventlistener) alert("TODO: Error: eventlistener");

  //if(!Modernizr.mutationobserver) alert("TODO: Error: MutationObserver");
  //if(!Modernizr.requestanimationframe) alert("TODO: Error: Request Animation Frame");

  init(); // Init solveCirc

  buildGUI();

};

