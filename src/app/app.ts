import { enableJS } from "../util/scriptblocker";
import { loader } from "../GUI/loader";
import * as styles from "../util/styles";
import { body } from "../GUI/body";
import * as Modernizr from 'modernizr';
import * as WebFont from "webfontloader";

import { Editor } from "../editor/editor";

import 'katex/dist/katex.min.css';

import * as io from "../dom/infixOperators";
import * as bo from "../dom/bigOperators";
import * as l from "../dom/literals";

import * as $ from "jquery";


const _body: (a: string) => string = (a) => `<div class='${body.body}'>${a}</div>`;

const buildGUI: () => void = () => {

  $("#GUIBase").html( _body(`<div id="tester" style=""><div id="testeri"></div></div>`) + _body(`<div id="mq2"></div>`) 
      + _body(`<span> Fork me on <a href="https://github.com/Agapanthus/Miqete">Github</a> </span>`));

  $("#mainloader").css("opacity","0");
  setTimeout(()=> $("#mainloader").remove() );


  const element = document.getElementById("testeri");

  const mdom = (new bo.Sum( new l.Integer(2), new l.Integer(3), 
        new io.Mul( new io.Add(new io.Sub(new l.Integer(2), new l.Integer(3) ), new l.Integer(7)), new l.Integer(5))
      )).bake();
  
  new Editor(element, mdom);

};

window.onload = ()=> {
  enableJS();

  // https://github.com/Modernizr/Modernizr/issues/1687
  if(!Modernizr.csstransitions) alert("TODO: Error: Transition");
  if(!Modernizr.svg) alert("TODO: Error: SVG");
  if(!Modernizr.eventlistener) alert("TODO: Error: eventlistener");

  //if(!Modernizr.mutationobserver) alert("TODO: Error: MutationObserver");
  //if(!Modernizr.requestanimationframe) alert("TODO: Error: Request Animation Frame");


  buildGUI();

/*
  WebFont.load({
    google: {
      families: styles.fonts
    },
    active: function() {
      console.log("Loading finished!");
      buildGUI();
    }
  });
*/
};

