const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
// Tight heartbeat so a dropped connection (closed tab, killed app, lost wifi,
// device sleep, etc.) is detected and the player removed from the lobby
// within seconds — not the old 60s+25s worst case. A clean tab close still
// fires 'disconnect' immediately on its own; this bounds the unclean cases.
const io = new Server(server, { cors:{origin:'*'}, pingTimeout:8000, pingInterval:8000 });

const INDEX_HTML = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1.0,maximum-scale=1.0">
<title>Rainy Day Living Room 🌧️</title>
<meta name="google-adsense-account" content="ca-pub-2352009046427964">
<meta name="description" content="Rainy Day Living Room — a free multiplayer hangout game. Socialize, relax, and have fun in a cozy rainy living room.">
<script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-2352009046427964" crossorigin="anonymous"></script>
<style>
  :root {
    --bg: #ffffff;
    --text: #000000;
    --panel-bg: #f5f5f5;
    --border: #cccccc;
    --btn-bg: #e0e0e0;
    --btn-text: #000;
  }
  body.dark-mode {
    --bg: #121212;
    --text: #ffffff;
    --panel-bg: #1e1e1e;
    --border: #333333;
    --btn-bg: #333333;
    --btn-text: #fff;
  }
  body {
    background-color: var(--bg);
    color: var(--text);
    font-family: sans-serif;
    margin: 0;
    padding: 0;
    overflow: hidden; /* prevent scroll bars */
  }
  #homeScreen, #gameScreen {
    width: 100vw;
    height: 100vh;
    position: absolute;
    top: 0;
    left: 0;
  }
  #gameScreen {
    display: none;
    background-color: #000; /* Rain environment */
  }
  .panel {
    background-color: var(--panel-bg);
    border: 1px solid var(--border);
    padding: 20px;
    border-radius: 8px;
    margin: 20px auto;
    width: 90%;
    max-width: 400px;
    text-align: center;
  }
  input, button {
    padding: 10px;
    margin: 5px;
    border-radius: 4px;
    border: 1px solid var(--border);
    background-color: var(--btn-bg);
    color: var(--btn-text);
  }
  button { cursor: pointer; }
  
  /* --- ZEBRA PATTERN FOR PLAYER LIST --- */
  #playerListContainer {
    list-style: none;
    padding: 0;
    margin: 0;
    text-align: left;
  }
  /* Light mode pattern */
  #playerListContainer li:nth-child(odd) {
    background-color: #ffffff;
    color: #000;
    padding: 8px;
  }
  #playerListContainer li:nth-child(even) {
    background-color: #e0e0e0;
    color: #000;
    padding: 8px;
  }
  /* Dark mode pattern */
  body.dark-mode #playerListContainer li:nth-child(odd) {
    background-color: #000000;
    color: #fff;
  }
  body.dark-mode #playerListContainer li:nth-child(even) {
    background-color: #333333;
    color: #fff;
  }
  /* ------------------------------------- */

  #chatBox {
    position: absolute;
    bottom: 20px;
    left: 20px;
    width: 300px;
    height: 200px;
    background: rgba(0,0,0,0.5);
    color: white;
    border-radius: 8px;
    display: flex;
    flex-direction: column;
  }
  #chatMessages {
    flex-grow: 1;
    overflow-y: auto;
    padding: 10px;
  }
  #chatInput {
    width: calc(100% - 20px);
    margin: 10px;
    background: transparent;
    border: 1px solid white;
    color: white;
  }
  #controls {
    position: absolute;
    top: 20px;
    right: 20px;
  }
</style>
</head>
<body>

<div id="homeScreen">
  <div class="panel">
    <h1>Rainy Day Living Room 🌧️</h1>
    <input type="text" id="playerName" placeholder="Enter your name" maxlength="15"><br>
    <input type="text" id="lobbyCode" placeholder="Lobby Code (optional)"><br>
    <button onclick="joinGame()">Join / Create Lobby</button>
    <button onclick="toggleDarkMode()">Toggle Dark Mode</button>
    <p id="errorMsg" style="color:red;"></p>
  </div>
</div>

<div id="gameScreen">
  <div id="controls">
    <button onclick="leaveGame()">Leave</button>
    <button onclick="toggleDarkMode()">UI Mode</button>
    <div class="panel" style="margin-top: 10px; max-height: 200px; overflow-y: auto; background: var(--panel-bg);">
      <h3>Players</h3>
      <ul id="playerListContainer"></ul>
    </div>
  </div>
  
  <div id="chatBox">
    <div id="chatMessages"></div>
    <input type="text" id="chatInput" placeholder="Press Enter to chat..." onkeypress="handleChat(event)">
  </div>
  
  <audio id="rainAudio" loop>
    <source src="https://assets.mixkit.co/sfx/preview/mixkit-light-rain-loop-2393.mp3" type="audio/mpeg">
  </audio>
</div>

<script src="/socket.io/socket.io.js"></script>
<script>
  const socket = io();
  let inGame = false;
  let currentLobby = '';
  
  function toggleDarkMode() {
    document.body.classList.toggle('dark-mode');
  }

  function joinGame() {
    const name = document.getElementById('playerName').value.trim();
    const code = document.getElementById('lobbyCode').value.trim();
    if(!name) return alert('Enter a name');
    socket.emit('joinLobby', { name, code });
  }

  function leaveGame() {
    socket.emit('leaveLobby');
    forceCleanExit();
  }

  // --- STRICT DISCONNECT & KICK CLEANUP ---
  socket.on('disconnect', () => {
    if(inGame) {
      alert("Disconnected from server.");
      forceCleanExit();
    }
  });

  socket.on('kicked', () => {
    alert("You have been kicked from this lobby.");
    forceCleanExit();
  });

  socket.on('joinError', (msg) => {
    document.getElementById('errorMsg').innerText = msg;
  });

  function forceCleanExit() {
    inGame = false;
    currentLobby = '';
    document.getElementById('gameScreen').style.display = 'none';
    document.getElementById('homeScreen').style.display = 'block';
    
    // Stop rain audio instantly
    const rainAudio = document.getElementById('rainAudio');
    if (rainAudio) {
      rainAudio.pause();
      rainAudio.currentTime = 0;
    }
    
    // Clear chat and players
    document.getElementById('chatMessages').innerHTML = '';
    document.getElementById('playerListContainer').innerHTML = '';
    document.getElementById('errorMsg').innerText = '';
  }
  // ----------------------------------------

  socket.on('lobbyJoined', (data) => {
    inGame = true;
    currentLobby = data.code;
    document.getElementById('homeScreen').style.display = 'none';
    document.getElementById('gameScreen').style.display = 'block';
    document.getElementById('lobbyCode').value = data.code;
    
    const rainAudio = document.getElementById('rainAudio');
    if (rainAudio) {
      rainAudio.volume = 0.5;
      rainAudio.play().catch(e => console.log('Audio autoplay blocked'));
    }
    updatePlayerList(data.lobbyState.players);
  });

  socket.on('playerJoined', (data) => {
    updatePlayerList(data.lobbyState.players);
    addSystemMsg(data.playerName + " joined.");
  });

  socket.on('playerLeft', (data) => {
    updatePlayerList(data.lobbyState.players);
    addSystemMsg(data.playerName + " left.");
  });

  socket.on('chatMessage', (data) => {
    const chatMsg = document.createElement('div');
    chatMsg.innerHTML = "<b>" + data.name + ":</b> " + data.msg;
    document.getElementById('chatMessages').appendChild(chatMsg);
    const box = document.getElementById('chatMessages');
    box.scrollTop = box.scrollHeight;
  });

  function updatePlayerList(playersObj) {
    const container = document.getElementById('playerListContainer');
    container.innerHTML = '';
    for(let id in playersObj) {
      const p = playersObj[id];
      const li = document.createElement('li');
      li.innerHTML = p.name;
      
      // Kick button logic
      const kickBtn = document.createElement('button');
      kickBtn.innerText = 'Kick';
      kickBtn.style.padding = '2px 5px';
      kickBtn.style.float = 'right';
      kickBtn.onclick = () => socket.emit('kickPlayer', id);
      
      li.appendChild(kickBtn);
      container.appendChild(li);
    }
  }

  function handleChat(e) {
    if(e.key === 'Enter') {
      const input = document.getElementById('chatInput');
      const msg = input.value.trim();
      if(msg) {
        socket.emit('chatMessage', msg);
        input.value = '';
      }
    }
  }

  function addSystemMsg(msg) {
    const chatMsg = document.createElement('div');
    chatMsg.style.color = '#aaa';
    chatMsg.style.fontStyle = 'italic';
    chatMsg.innerText = msg;
    document.getElementById('chatMessages').appendChild(chatMsg);
  }
</script>
</body>
</html>`;

const lobbies = {};

app.get('/', (req, res) => {
  res.send(INDEX_HTML);
});

function getLobbyState(lobby) {
  return {
    code: lobby.code,
    players: lobby.players,
    seats: lobby.seats
  };
}

function generateCode() {
  return Math.random().toString(36).substring(2, 6).toUpperCase();
}

io.on('connection', (socket) => {
  let curLobby = null;
  let curPlayer = null;

  socket.on('joinLobby', (data) => {
    const name = data.name.substring(0,15);
    let code = data.code ? data.code.toUpperCase() : null;
    
    if(!code || !lobbies[code]) {
      code = code || generateCode();
      if(!lobbies[code]) {
        lobbies[code] = {
          code: code,
          players: {},
          seats: {},
          bannedNames: new Set(),
          votes: {},
          voteTimers: {}
        };
      }
    }

    const lobby = lobbies[code];

    // --- KICK BAN CHECK ---
    if(lobby.bannedNames.has(name.toLowerCase())) {
      socket.emit('joinError', 'You have been kicked from this lobby and cannot rejoin.');
      return;
    }
    // ----------------------

    curLobby = lobby;
    curPlayer = { id: socket.id, name: name };
    lobby.players[socket.id] = curPlayer;
    
    socket.join(code);
    socket.emit('lobbyJoined', { code: code, lobbyState: getLobbyState(lobby) });
    socket.to(code).emit('playerJoined', { playerId: socket.id, playerName: name, lobbyState: getLobbyState(lobby) });
  });

  // --- KICK LOGIC ---
  socket.on('kickPlayer', (targetId) => {
    if(!curLobby || !curLobby.players[targetId]) return;
    
    const targetName = curLobby.players[targetId].name.toLowerCase();
    curLobby.bannedNames.add(targetName); // Block from rejoining this lobby
    
    const targetSock = io.sockets.sockets.get(targetId);
    if(targetSock) {
      targetSock.emit('kicked'); // Tells client to forcefully exit
      targetSock.leave(curLobby.code);
    }
    
    doRemove(targetId, curLobby, 'kicked', false);
  });
  // ------------------

  socket.on('chatMessage', (msg) => {
    if(curLobby && curPlayer) {
      io.to(curLobby.code).emit('chatMessage', { name: curPlayer.name, msg: msg.substring(0, 100) });
    }
  });

  socket.on('leaveLobby', () => {
    if(curLobby && curPlayer) {
      doRemove(socket.id, curLobby, 'left', false);
      curLobby = null;
      curPlayer = null;
    }
  });

  socket.on('disconnect', (reason) => {
    // A clean tab close still fires 'disconnect' immediately on its own; this bounds the unclean cases.
    const wasIntentional = reason === 'client namespace disconnect';
    if(curLobby && curPlayer) doRemove(socket.id, curLobby, wasIntentional ? 'left' : 'disconnected', false);
  });

  function doRemove(playerId, lobby, reason, silent) {
    const player = lobby.players[playerId];
    if(!player) return;
    const name = player.name;
    if(player.seat !== undefined) lobby.seats[player.seat] = null;
    delete lobby.players[playerId];
    
    // Cancel the 2-min reset timer for votes against this player (they're gone)
    if(lobby.voteTimers && lobby.voteTimers[playerId]){
      clearTimeout(lobby.voteTimers[playerId]);
      delete lobby.voteTimers[playerId];
    }
    
    // Remove votes cast AGAINST them and their own vote FROM others' counts
    delete lobby.votes[playerId];
    for(const vs of Object.values(lobby.votes)) {
      if(vs && vs.delete) vs.delete(playerId);
    }
    
    const tSock = io.sockets.sockets.get(playerId);
    if(tSock) tSock.leave(lobby.code);
    
    if(!silent){
      io.to(lobby.code).emit('playerLeft', { playerId, playerName: name, reason, lobbyState: getLobbyState(lobby) });
    }
    
    // Delete lobby immediately if empty so it never shows in list
    if(Object.keys(lobby.players).length === 0){
      delete lobbies[lobby.code];
    }
  }
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(\`Server running on port \${PORT}\`));
