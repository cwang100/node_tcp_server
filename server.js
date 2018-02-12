var _ = require('lodash'); 

var net = require('net');
var server = net.createServer();  
  
//聚合所有客户端  
var sockets = [];  
var randomSeeds = [];
var readyCount = 0;

class TcpPack {
	constructor(type, data) {
    this.type = type;
    this.data = data;
  }
}
  
//接受新的客户端连接  
server.on('connection', function(socket) {  
  console.log('got a new connection');  
  if (sockets.length > 4)
  	return;

  var encodedData = encode("connectSuccessful", "");

	socket.write(encodedData); 

  sockets.push(socket);  
  //从连接中读取数据  
  socket.on('data', function(data) {  
		decodedDatas = decode(data); 
    _.each(decodedDatas, function(decodedData) {
    	handleReceivedData(socket, decodedData.type, decodedData.data);
    }); 
  });  

  //删除被关闭的连接  
  socket.on('close', function(){  
    console.log('connection closed');  
    var index = sockets.indexOf(socket);  
    sockets.splice(index, 1);  
    broadCastDisconnect(index);
  }); 

  socket.on('error', function(err) {
    console.log('connection error:', err.message);  
    var index = sockets.indexOf(socket);  
    sockets.splice(index, 1); 
    broadCastDisconnect(index);
  });
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

function broadCast(encodedData) {
	sockets.forEach(function(socket) {   
    socket.write(encodedData);  
  });  
}

function handleReceivedData(socket, dataType, data) {
	switch(dataType) {
		case "requestRandom":
			sendRandom(data);
			break;
		case "requestNewRandom":
			sendRandom(data);
			break;
		case "generateFloor":
			generateFloor(data, socket);
			break;
		case "deactiveCreate":
			//sendDeactiveFloor(data, socket);
			break;
		case "restartGame":
			restartGame(data);
			break;
		case "generatePlayer":
			generateEnemy(data, socket);
			break;
		case "playerMove":
			moveEnemy(data, socket);
			break;
		case "useCollectable":
			sendCollectableIndex(data);
			break;
		case "playerAnim" :
			sendEnemyAnim(data);
			break;
		case "gameStart":
			broadCastGameStart(data);
			break;
		case "addScore":
			sendAddScore(data, socket);
			break;
		case "gameWin":
			broadCastGameWin(data);
			break;
		case "playerReady":
			playerReady(data);
			break;
		case "playerDead":
			playerDead(data);
			break;
	}
}

function broadCastDisconnect(index) {
	var encodedData = encode("playerDisconnect", index.toString());
	broadCast(encodedData); 
}

function playerReady(data) {
	readyCount ++;
	if (readyCount == sockets.length) {
		restartGame(data);
	}
}

function playerDead(data) {
	var encodedData = encode("playerDead", data);
	broadCast(encodedData); 
}

function broadCastGameStart(data) {
	var encodedData = encode("gameStart", data);
	broadCast(encodedData); 
}

function broadCastGameWin(data) {
	var encodedData = encode("gameWin", data);
	broadCast(encodedData); 
}

function sendCollectableIndex(data) {
	var encodedData = encode("useCollectable", data);
	broadCast(encodedData); 
}

function enableCheat(socket) {
	var encodedData = encode("enableCheat", "");

	socket.write(encodedData); 
}

function sendAddScore(data, socket) {
	var encodedData = encode("addScore", data);
	sockets.forEach(function(otherSocket) {  
    if (otherSocket !== socket) {  
      otherSocket.write(encodedData);  
    }  
  }); 
}

function sendEnemyAnim(data) {
	var encodedData = encode("enemyAnim", data);
	broadCast(encodedData); 
}

function sendRandom(data) {
	var index = parseInt(data);
	var encodedData = encode("receiveRandom", getRandomSeed(index));
	broadCast(encodedData); 
}

function generateFloor(data, socket) {
	var index = parseInt(data);
	var encodedData = encode("generateFloor", getRandomSeed(index));

	socket.write(encodedData); 
}

function sendDeactiveFloor(data, socket) {
	var newIndex = parseInt(data);
	var encodedData = encode("deactiveCreate", getRandomSeed(newIndex));
	sockets.forEach(function(otherSocket) {  
    if (otherSocket !== socket) {  
        otherSocket.write(encodedData);  
    }  
  }); 
}

function restartGame(data) {
	clearSeed();
	readyCount = 0;
	var encodedData = encode("receiveRandom", getRandomSeed(0));
	broadCast(encodedData);
	sockets.forEach(function(socket, index) {   
		var encodedData = encode("restartGame", index.toString());
		if (index != 0) {
			enableCheat(socket);
		}
    socket.write(encodedData);  
  }); 
}

function generateEnemy(data, socket) {
	var socketIndex;
	sockets.forEach(function(otherSocket, index) {   
    if (otherSocket === socket) {  
      socketIndex = index; 
    }
  }); 
	sockets.forEach(function(otherSocket) {   
    if (otherSocket !== socket) {  
      otherSocket.write(encode("generateEnemy", socketIndex.toString()));  
    }  else {
    	otherSocket.write(encode("generatePlayer", socketIndex.toString()));  
    }
  });  
}

function moveEnemy(data, socket) {
	sockets.forEach(function(otherSocket, index) {   
    if (otherSocket !== socket) {  
      otherSocket.write(encode("enemyMove", data));  
    }
  }); 
}

function clearSeed() {
	randomSeeds = [];
}

function getRandomSeed(index) {
	while(index >= randomSeeds.length) {
		var date = new Date();
		randomSeeds.push(date.getTime());
	}

	var randomStr = randomSeeds[index].toString();
	return randomStr.slice(randomStr.length - 6, randomStr.length - 1);
}
