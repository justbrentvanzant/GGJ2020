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
        console.log("getting message"+data);
        for(var i in SOCKET_LIST){
            SOCKET_LIST[i].emit('addToChat',playerName + ': ' + data);
        }
    });   
});
 
setInterval(function(){
},1000/25);
 