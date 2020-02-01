var express = require('express');
var app = express();
var serv = require('http').Server(app);
 
app.get('/',function(req, res) {
    res.sendFile(__dirname + '/client/index.html');
});
app.use('/client',express.static(__dirname + '/client'));
 
serv.listen(2000);
console.log("Server started.");
 
var SOCKET_LIST = {};
 
var Entity = function(){
    var self = {
        inventory:[" ","del"],
        id:"",
        name:""
    }
    return self;
}

let gameCounter=  0;
let state = 0;
let internalTimer = 0;
let heldStrings = [];
let gameData = {
"encounters":[
  {"encounter":"Phone", "strings":"screen,circuit board,code,electric tape, battery, charger, cloth, motherboard"}
]
}
const numHeld = 40; 

var Player = function(id){
    var self = Entity();
    self.id = id;
    self.name = " ";
    self.updateInventory = function(type,item){
        if (type == "clear") {
            self.inventory = [];
            SOCKET_LIST[id].emit('clear',item);
        }
        if (type == "remove") {
            let indexToRemove = self.inventory.indexOf(item);
            if (indexToRemove != -1) {
                 self.inventory.splice(indexToRemove, 1);   
                 SOCKET_LIST[id].emit('removal',item);
            }
        }
        else if (type == "add") {
            self.inventory.push(item); 
            SOCKET_LIST[id].emit('removal',item);
        }
    }
    self.getName = function(){
        return self.name;
    }
    Player.list[id] = self;
    return self;
}
Player.list = {};

//Player connection
Player.onConnect = function(socket){
    var player = Player(socket.id);
    for (var i in Player.list) {
        SOCKET_LIST[socket.id].emit('addPlayer',Player.list[i].name);
    }
    socket.on('nameSelect',function(data){
        if(data.inputId === 'name') {
            player.name = data.state;
            console.log(data.state);
            for(var i in SOCKET_LIST){
                SOCKET_LIST[i].emit('addPlayer',player.name);
            }
            for(var i in heldStrings){
                 SOCKET_LIST[socket.id].emit('addToChat',heldStrings[i]);
            }
            if (encounter != "" ) {
                    SOCKET_LIST[socket.id].emit('addItem',encounter);
             }
        }
    });  
}

Player.onDisconnect = function(socket){
    delete Player.list[socket.id];
}
 
var io = require('socket.io')(serv,{});

io.sockets.on('connection', function(socket){
    socket.id = Math.random();
    SOCKET_LIST[socket.id] = socket;
   
    Player.onConnect(socket);
   
    socket.on('disconnect',function(){
        delete SOCKET_LIST[socket.id];
        Player.onDisconnect(socket);
    });

    socket.on('sendMsgToServer',function(data){
        let playerName = Player.list[socket.id].getName();
        let msgSent = playerName + ': ' + data;
        if (heldStrings.length > numHeld) {
            heldStrings.splice(0,1);
            heldStrings.push(msgSent);
        }
        else {
             heldStrings.push(msgSent);
        }
        for(var i in SOCKET_LIST){
            SOCKET_LIST[i].emit('addToChat',msgSent);
        }
    });   
});
let encounter = "";
let accepted = [];

var genNewRound = function(gc){
  encounter = gameData.encounters[gc].encounter;
  console.log("encounter:"+encounter)
  var stringPassed = gameData.encounters[gc].strings;
  accepted = stringPassed.split(',');
  if (gc == 0) {
    gameCounter = 0;
  }
  else {
    gameCounter++;
  }
}

var passSecond = function(){
        internalTimer++;
        if (state == 0 && internalTimer == 8) {
            state = 1;
            genNewRound(gameCounter);
            
            //passTimer("game", 28-internalTimer);
            for(var i in SOCKET_LIST){
                    SOCKET_LIST[i].emit('addItem',encounter);
             }
        }
        else if (state == 1 && internalTimer == 28) {
            state = 0;
            internalTimer = 0;
            encounter = "";
            //passTimer("rest", 9);
        }
        else if (state == 0 ){
             //passTimer("rest", 8-internalTimer);
        }
        else if (state == 1 ){
             //passTimer("game", 28-internalTimer);
        }
  }      

setInterval(function(){
    passSecond();
    console.log("Timer: " + internalTimer +" gameCounter: " +gameCounter);
},1000);
 