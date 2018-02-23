var _ = require('lodash'); 

var net = require('net');
var server = net.createServer();  
  
//聚合所有客户端  
var rooms = [];
var socketRoomPair = {};
var roomSize = 3;

class TcpPack {
	constructor(type, data) {
    this.type = type;
    this.data = data;
  }
}

class Room {
	constructor() {
		this.sockets = [];
		this.randomSeeds = [];
		this.readyCount = 0;
		this.gameStarted = false;
	}
}
  
//接受新的客户端连接  
server.on('connection', function(socket) {  
  console.log('got a new connection');  
  socket.uniqueId = _.uniqueId('socket_');

  setupSocket(socket);
});  
  
server.on('error', function(err) {  
  console.log('Server error:', err.message);  
});  
  
server.on('close', function() {  
  console.log('Server closed');  
});  
  
server.listen(3000, function() {
	var date = new Date();
	randomSeed = date.getTime();
}); 

function addSocketToRoom(socket) {
	for(var i = 0; i < rooms.length; i ++) {
		if (rooms[i].sockets.length < roomSize && !rooms[i].gameStarted) {
			rooms[i].sockets.push(socket);
			socketRoomPair[socket.uniqueId] = i;
			return;
		}
	}

	createNewRoom(socket);
}

function createNewRoom(socket) {
	var room = new Room();
	room.sockets.push(socket);
	rooms.push(room);
	socketRoomPair[socket.uniqueId] = rooms.indexOf(room);
}

function setupSocket(socket) {
  var encodedData = encode("connectSuccessful", "");

	socket.write(encodedData); 

  //从连接中读取数据  
  socket.on('data', function(data) {  
		decodedDatas = decode(data); 
    _.each(decodedDatas, function(decodedData) {
    	handleReceivedData(socket, decodedData.type, decodedData.data);
    }); 
  });  

  //删除被关闭的连接  
  socket.on('close', function() {  
    console.log('connection closed');  
    removeFromRoom(socket);
  }); 

  socket.on('error', function(err) {
    console.log('connection error:', err.message);  
    removeFromRoom(socket);
  });
}

function removeFromRoom(socket) {
	var roomIndex = socketRoomPair[socket.uniqueId];
  var index = rooms[roomIndex].sockets.indexOf(socket);  
  _.remove(rooms[roomIndex].sockets, socket);
  broadCastDisconnect(socket, index);
}

function decode(data) {
	var str = data.toString();
	var separatedDatas = _.split(str, '/');
	var ret = [];
	_.each(separatedDatas, function(separatedData) {
		if (separatedData.length > 0) {
			var d = _.split(separatedData, '|');
			var tcpResponse = new TcpPack(d[0], d[2]);
			ret.push(tcpResponse);
		}
	});

	return ret;
};

function encode(type, data) {
	var ret = type + "|" + data.length + "|" + data + "/";
	return Buffer.from(ret);
}

function broadCast(socket, encodedData) {
	var roomIndex = socketRoomPair[socket.uniqueId];
	rooms[roomIndex].sockets.forEach(function(socket) {   
    socket.write(encodedData);  
  });  
}

function handleReceivedData(socket, dataType, data) {
	switch(dataType) {
		case "addToRoom":
			addToRoom(socket);
			break;
		case "createNewRoom":
			createRoom(socket);
			break;
		case "requestRandom":
			sendRandom(data, socket);
			break;
		case "requestNewRandom":
			sendRandom(data, socket);
			break;
		case "generateFloor":
			generateFloor(data, socket);
			break;
		case "restartGame":
			restartGame(data, socket);
			break;
		case "generatePlayer":
			generateEnemy(data, socket);
			break;
		case "getEnemy":
			getEnemy(data, socket);
			break;
		case "playerMove":
			moveEnemy(data, socket);
			break;
		case "useGold":
			sendGoldIndex(data, socket);
			break;
		case "playerAnim" :
			sendEnemyAnim(data, socket);
			break;
		case "gameStart":
			broadCastGameStart(data, socket);
			break;
		case "addScore":
			sendAddScore(data, socket);
			break;
		case "gameWin":
			broadCastGameWin(data, socket);
			break;
		case "playerReady":
			playerReady(data, socket);
			break;
		case "playerDead":
			playerDead(data, socket);
			break;
	}
}

function broadCastDisconnect(socket, index) {
	var roomIndex = socketRoomPair[socket.uniqueId];
	if (roomIndex === undefined)
		return;
	var encodedData = encode("playerDisconnect", index.toString());
	broadCast(socket, encodedData); 
}

function addToRoom(socket) {
	addSocketToRoom(socket);
	var encodedData = encode("addToRoom", "");
	socket.write(encodedData);
}

function createRoom(socket) {
	createNewRoom(socket);
	var encodedData = encode("createNewRoom", "");
	socket.write(encodedData);
}

function playerReady(data, socket) {
	var roomIndex = socketRoomPair[socket.uniqueId];
	if (roomIndex === undefined)
		return;
	rooms[roomIndex].readyCount ++;
	if (rooms[roomIndex].readyCount >= rooms[roomIndex].sockets.length) {
		rooms[roomIndex].gameStarted = true;
		restartGame(data, socket);
	}
}

function playerDead(data, socket) {
	var roomIndex = socketRoomPair[socket.uniqueId];
	if (roomIndex === undefined)
		return;
	var encodedData = encode("playerDead", data);
	broadCast(socket, encodedData); 
}

function broadCastGameStart(data, socket) {
	var roomIndex = socketRoomPair[socket.uniqueId];
	if (roomIndex === undefined)
		return;
	var encodedData = encode("gameStart", data);
	broadCast(socket, encodedData); 
}

function broadCastGameWin(data, socket) {
	var roomIndex = socketRoomPair[socket.uniqueId];
	if (roomIndex === undefined)
		return;
	var encodedData = encode("gameWin", data);
	rooms[roomIndex].gameStarted = false;
	broadCast(socket, encodedData); 
}

function sendGoldIndex(data, socket) {
	var roomIndex = socketRoomPair[socket.uniqueId];
	if (roomIndex === undefined)
		return;
	var encodedData = encode("useGold", data);
	broadCast(socket, encodedData); 
}

function enableCheat(socket) {
	var encodedData = encode("enableCheat", "");

	socket.write(encodedData); 
}

function sendAddScore(data, socket) {
	var roomIndex = socketRoomPair[socket.uniqueId];
	if (roomIndex === undefined)
		return;
	var encodedData = encode("addScore", data);
	rooms[roomIndex].sockets.forEach(function(otherSocket) {  
    if (otherSocket !== socket) {  
      otherSocket.write(encodedData);  
    }  
  }); 
}

function sendEnemyAnim(data, socket) {
	var roomIndex = socketRoomPair[socket.uniqueId];
	if (roomIndex === undefined)
		return;
	var encodedData = encode("enemyAnim", data);
	broadCast(socket, encodedData); 
}

function sendRandom(data, socket) {
	var roomIndex = socketRoomPair[socket.uniqueId];
	if (roomIndex === undefined)
		return;
	var index = parseInt(data);
	var encodedData = encode("receiveRandom", getRandomSeed(socket, index));
	broadCast(socket, encodedData); 
}

function generateFloor(data, socket) {
	var index = parseInt(data);
	var encodedData = encode("generateFloor", getRandomSeed(socket, index));

	socket.write(encodedData); 
}

function restartGame(data, socket) {
	var roomIndex = socketRoomPair[socket.uniqueId];
	if (roomIndex === undefined)
		return;
	clearSeed(roomIndex);
	rooms[roomIndex].readyCount = 0;
	var encodedData = encode("receiveRandom", getRandomSeed(socket, 0));
	broadCast(socket, encodedData);
	rooms[roomIndex].sockets.forEach(function(socket, index) {   
		var encodedData = encode("restartGame", index.toString());
		if (index != 0) {
			enableCheat(socket);
		}
    socket.write(encodedData);  
  }); 
}

function generateEnemy(data, socket) {
	var socketIndex;
	var roomIndex = socketRoomPair[socket.uniqueId];
	if (roomIndex === undefined)
		return;
	rooms[roomIndex].sockets.forEach(function(otherSocket, index) {   
    if (otherSocket === socket) {  
      socketIndex = index; 
    }
  }); 
  socket.playerName = data;
	rooms[roomIndex].sockets.forEach(function(otherSocket) {   
    if (otherSocket !== socket) {  
      otherSocket.write(encode("generateEnemy", socketIndex.toString() + "," + data));  
    }  else {
    	otherSocket.write(encode("generatePlayer", socketIndex.toString()+ "," + data));  
    }
  });  
}

function getEnemy(data, socket) {
	var roomIndex = socketRoomPair[socket.uniqueId];
	if (roomIndex === undefined)
		return;
	var enemyIndex = parseInt(data);
	var enemyName = rooms[roomIndex].sockets[enemyIndex].playerName;
	socket.write(encode("generateEnemy", data + "," + enemyName));  
}

function moveEnemy(data, socket) {
	var roomIndex = socketRoomPair[socket.uniqueId];
	if (roomIndex === undefined)
		return;
	rooms[roomIndex].sockets.forEach(function(otherSocket, index) {   
    if (otherSocket !== socket) {  
      otherSocket.write(encode("enemyMove", data));  
    }
  }); 
}

function clearSeed(roomIndex) {
	rooms[roomIndex].randomSeeds = [];
}

function getRandomSeed(socket, index) {
	var roomIndex = socketRoomPair[socket.uniqueId];
	if (roomIndex === undefined)
		return;
	while(index >= rooms[roomIndex].randomSeeds.length) {
		var date = new Date();
		rooms[roomIndex].randomSeeds.push(date.getTime());
	}

	var randomStr = rooms[roomIndex].randomSeeds[index].toString();
	return randomStr.slice(randomStr.length - 6, randomStr.length - 1);
}
