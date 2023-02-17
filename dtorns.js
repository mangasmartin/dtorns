const WebSocket = require('ws');
const wss = new WebSocket.Server({ port: process.env.PORT || 3010 });
let rooms = [];

wss.on("connection", function (ws,req) {
  if (req.headers.origin == "https://dinami.cat"){
    //set random num id room
    let room, connec = false;
    if (req.url == "/create"){

      console.log("Create");
      room = randomNum(1000,9999);
      //room = 1000; //luego quitar
      while (rooms[room]){
        room ++;
        if (room > 9999) room = 1000;
      }
      rooms[room] = {
        ids: [], participants: [], list: []
      };
      let data = { type: "created", room: room };
      ws.send(JSON.stringify(data));
      connec = true;
    } else {
      room = req.url.substring(1);
      if (!isNaN(room) && rooms[room]){
        let data = { type: "created", room: room };
        ws.send(JSON.stringify(data));
        connec = true;
      } else {
        let data = { type: "refused" };
        ws.send(JSON.stringify(data));
        ws.close();
      }
    }

    if (connec){
      ws.room = room;
      ws.id = req.headers['sec-websocket-key'];
      rooms[ws.room].ids.push(ws);
    }

    ws.on("message", function(d,isBinary){
      let data = isBinary ? d : JSON.parse(d.toString()); //Corrección por versión
      //let data = JSON.parse(d); //d.msg?

      /*
      wss.broadcast(ws.room, d);

      if (!data.id){
        //wss.broadcast(ws.room, ws.id, d);
      } else {
        if (data.id == "") data.id = rooms[ws.room][0].id;
        wss.sendTo(ws.room, ws.id, data.id, data.resp);
      }
      */

      switch (data.type){
        case "name":
          checkName(ws,data);
          break;
        case "turn":
          addTurn(ws);
          break;
        case "cancel":
          removeTurn(ws);
          break;
      }
    });
    
    ws.on("close", function(code,data){
      //const reason = data.toString();
      if (rooms[room]){
        let i = rooms[ws.room].ids.indexOf(ws.id);
        rooms[ws.room].ids.splice(i,1);
        if (rooms[room].list.includes(ws.name)) removeTurn(ws);
        if (rooms[ws.room].ids.length === 0){
          rooms[ws.room] = null;
          //console.log("Naide");
        } else {
          //console.log(rooms[ws.room].ids.length);
        }

        /*
        if (rooms[ws.room][0].id == ws.id){
          wss.broadcast(ws.room, ws.id, JSON.stringify({ type: "end" }));
          rooms[ws.room] = null;
        } else {
          let i = rooms[ws.room].indexOf(ws.id);
          rooms[ws.room].splice(i,1);
        }
        */
      }
    });

  } else {
    ws.close();
  }
});

function checkName(ws,data){
  console.log(1);
  const check = !rooms[ws.room].participants.includes(data.name);
  if (check){
    ws.name = data.name;
    rooms[ws.room].participants.push(data.name);
  }
  console.log(2);
  data = { type: "name", res: check };
  ws.send(JSON.stringify(data));
}

function addTurn(ws){
  rooms[ws.room].list.push(ws.name);
  const data = { type: "list", list: rooms[ws.room].list };
  wss.broadcastAll(ws.room, JSON.stringify(data));
}

function removeTurn(ws){
  rooms[ws.room].list = rooms[ws.room].list.filter(n => n != ws.name);
  const data = { type: "list", list: rooms[ws.room].list };
  wss.broadcastAll(ws.room, JSON.stringify(data));
}

function randomNum(min, max, last){
  //min: min number (Optional)
  //max: max number (Mandatory)
  //last: last number used: if it's set it avoids repetition only for next number (Optional)
  if (!min) min = 0;
  if (min >= max) return min;
  var n = Math.round(Math.random() * (max - min)) + min;
  if (last){
    if (n == last){
      n ++;
      if (n > max) n = min;
    }
  }
  return n;
}

/*
wss.sendTo = function(r,sid,rid,d){
  for (var c = 0; c < rooms[r].length; c++){
    var client = rooms[r][c];
    if (client.id == rid && client.readyState === WebSocket.OPEN) {
      client.send(JSON.stringify({ type: "direct", sender: sid, msg: d }));
      break;
    }
  }
}

wss.broadcast = function(r,id,data){
  for (var c = 0; c < rooms[r].length; c++){
    var client = rooms[r][c];
    if (client.id !== id && client.readyState === WebSocket.OPEN) {
      client.send(data);
    }
  }
}
*/

wss.broadcastAll = function(r,data){
  for (var c = 0; c < rooms[r].ids.length; c++){
    var client = rooms[r].ids[c];
    if (client.readyState === WebSocket.OPEN) {
      client.send(data);
    }
  }
}