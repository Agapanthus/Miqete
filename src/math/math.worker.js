'use strict';


var Main        = require("./Main.elm").Main;
var brain       = Main.worker();



//receive data from main.js and pass it on to Main elm program
self.addEventListener('message', function (event) {
   // for(var i=0; i<100; i++)
    brain.ports.receiveData.send(event.data);
});

//send data from Main elm program to the main.js
brain.ports.sendData.subscribe(function (result) {
    self.postMessage(result);
});