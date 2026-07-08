const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors:{origin:'*'}, pingTimeout:8000, pingInterval:8000 });

const INDEX_HTML = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1.0,maximum-scale=1.0">
<title>Rainy Day Living Room 🌧️</title>
<meta name="google-adsense-account" content="ca-pub-2352009046427964">
<meta name="description" content="Rainy Day Living Room — a free multiplayer hangout game. Socialize, relax, and have fun in a cozy rainy living room.">
<script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-2352009046427964" crossorigin="anonymous" onerror="this.setAttribute('data-blocked','1')"></script>
<script src="/socket.io/socket.io.js"></script>
<style>
@import url('https://fonts.googleapis.com/css2?family=Fredoka+One&family=Nunito:wght@400;600;700;800&display=swap');
*{box-sizing:border-box;margin:0;padding:0;}

:root{
  --bg-card:rgba(255,255,255,.95); --bg-panel:rgba(255,255,255,.95); --bg-hdr:#FFF8E8;
  --bg-chat-even:#ffffff; --bg-chat-odd:#eeeeee;
  --text-main:#111; --text-sub:#555; --text-muted:#888;
  --border-soft:#D4A020; --lobby-bg:#FFF8E8; --lobby-border:#E8C870; --lobby-hover:#FFE8B0;
  --inp-bg:#fff;
  --grad-a:#0B2A4A; --grad-b:#1B4D7A; --grad-c:#081C33;
  --accent:#C86000; --accent-mid:#D4A000; --accent-dark:#A04400;
  --accent-light:#E8B830; --accent-subtle:#FFF4E0; --accent-text:#B07000; --accent-you:#C88000;
}
body.dark{
  --bg-card:rgba(40,40,50,.97); --bg-panel:rgba(40,40,50,.97); --bg-hdr:#1a1a2a;
  --bg-chat-even:#2a2a38; --bg-chat-odd:#1e1e2c;
  --text-main:#eee; --text-sub:#aaa; --text-muted:#777;
  --border-soft:#555; --lobby-bg:#2a2a38; --lobby-border:#444; --lobby-hover:#3a3a50;
  --inp-bg:#2a2a38;
}

body{font-family:'Nunito',sans-serif;background:linear-gradient(135deg,var(--grad-a),var(--grad-b) 50%,var(--grad-c));min-height:100vh;display:flex;flex-direction:column;align-items:center;overflow-x:hidden;overflow-y:auto;}
body.game-active{overflow:hidden;}

/* ══ HOME ══ */
#homePage{display:flex;flex-direction:column;align-items:center;width:100%;min-height:100vh;padding:6px 8px 24px;overflow:visible;}
.logo{font-family:'Fredoka One',cursive;font-size:1.32rem;color:#fff;text-shadow:2px 2px 0 var(--accent-dark),4px 4px 6px rgba(0,0,0,.25);white-space:nowrap;}
.home-topbar{display:flex;align-items:center;justify-content:center;gap:14px;margin-bottom:6px;flex-shrink:0;}
.home-dm-wrap{display:flex;align-items:center;gap:4px;background:rgba(0,0,0,.25);border-radius:7px;padding:3px 6px;flex-shrink:0;}

.home-3col{display:flex;gap:7px;width:100%;max-width:980px;flex:1;min-height:0;align-items:stretch;}
.home-col{display:flex;flex-direction:column;gap:6px;min-width:0;}
.col-left{width:220px;flex-shrink:0;} .col-mid{flex:1;} .col-right{width:220px;flex-shrink:0;}

.card{background:var(--bg-card);border-radius:12px;box-shadow:0 3px 14px rgba(0,0,0,.16);padding:9px 11px;flex-shrink:0;}
.card h3{font-family:'Fredoka One',cursive;color:var(--accent-dark);font-size:.78rem;margin-bottom:6px;text-align:center;}

.inp{width:100%;padding:5px 9px;border-radius:7px;border:2px solid var(--accent);font-family:'Nunito',sans-serif;font-size:.78rem;font-weight:700;outline:none;color:var(--text-main);background:var(--inp-bg);}
.inp:focus{border-color:var(--accent-dark);}

.skin-picker{display:flex;align-items:center;gap:4px;}
.skin-arrow, .feat-arrow{background:#1E9E4A;color:#fff;border:none;border-radius:5px;font-size:.95rem;width:22px;height:22px;cursor:pointer;display:flex;align-items:center;justify-content:center;font-weight:900;flex-shrink:0;}
.skin-arrow:hover, .feat-arrow:hover{background:#157A38;}
.feat-label{display:none;}

.av-center{display:flex;flex-direction:column;align-items:center;gap:4px;}
#avCanvas{border-radius:12px;}

.big-btn{width:100%;padding:14px 7px;border-radius:8px;border:none;font-family:'Fredoka One',cursive;font-size:.92rem;cursor:pointer;transition:all .13s;margin-bottom:5px;}
.big-btn:hover{transform:translateY(-1px);}
.btn-play{background:linear-gradient(135deg,#1E9E4A,#2DBE5E);color:#fff;text-shadow:1px 1px 0 rgba(0,0,0,.2);box-shadow:0 3px 12px rgba(0,0,0,.28);}
.code-row{display:flex;gap:4px;}
.code-inp{flex:1;padding:5px 7px;border-radius:7px;border:2px solid var(--accent);font-family:'Nunito',sans-serif;font-size:.75rem;font-weight:700;text-transform:uppercase;letter-spacing:2px;outline:none;text-align:center;color:var(--text-main);background:var(--inp-bg);}
.code-btn{background:linear-gradient(135deg,#157A38,#1E9E4A);color:#fff;border:none;border-radius:7px;font-family:'Fredoka One',cursive;font-size:.7rem;padding:5px 9px;cursor:pointer;white-space:nowrap;}
.code-btn:hover{background:#0F5C29;}

.name-valid-msg{font-size:.62rem;font-weight:800;margin-top:4px;padding:4px 8px;border-radius:6px;text-align:center;display:none;}
.name-valid-msg.valid{color:#1a7a1a;background:#e8f8e8;border:1px solid #5dc45d;}
.name-valid-msg.invalid{color:#c00;background:#ffe8e8;border:1px solid #e88888;}
#nameInp.name-ok{border-color:#1a7a1a!important;}
#nameInp.name-bad{border-color:#c00!important;animation:shake .25s ease;}
@keyframes shake{0%,100%{transform:translateX(0);}25%{transform:translateX(-4px);}75%{transform:translateX(4px);}}

.tagline-txt{font-size:.62rem;color:var(--text-sub);line-height:1.55;margin-top:7px;text-align:center;font-style:italic;font-weight:600;}
.err-msg{background:#ffe0e0;color:#c00;border-radius:6px;padding:6px 8px;font-size:.68rem;font-weight:800;margin-bottom:5px;display:none;text-align:center;}

.lobby-scroll{flex:1;overflow-y:auto;min-height:0;}
.lobby-scroll::-webkit-scrollbar{width:4px;} .lobby-scroll::-webkit-scrollbar-thumb{background:var(--accent-light);border-radius:2px;}
.lobby-item{display:flex;align-items:flex-start;justify-content:space-between;padding:7px 8px;border-radius:8px;background:var(--lobby-bg);border:1.5px solid var(--lobby-border);margin-bottom:5px;cursor:pointer;}
.lobby-item:hover{background:var(--lobby-hover);}
.lobby-item.lobby-full{cursor:default;opacity:.72;}
.lobby-names{font-size:.66rem;font-weight:700;color:var(--text-sub);line-height:1.4;word-break:break-word;margin-top:2px;}
.lobby-code-txt{font-family:'Fredoka One',cursive;font-size:.74rem;color:var(--accent-dark);letter-spacing:2px;}
.lobby-cnt{font-size:.64rem;font-weight:700;color:var(--text-muted);text-align:right;}
.rules-txt{font-size:.59rem;color:var(--text-sub);line-height:1.5;} .rules-txt p{margin-bottom:2px;}

.dm-switch{position:relative;width:32px;height:18px;flex-shrink:0;}
.dm-switch input{opacity:0;width:0;height:0;}
.dm-slider{position:absolute;inset:0;background:#E14444;border-radius:18px;cursor:pointer;transition:background .2s;}
.dm-slider::before{content:'';position:absolute;width:14px;height:14px;left:2px;top:2px;background:#fff;border-radius:50%;transition:transform .2s;}
input:checked+.dm-slider{background:#1E9E4A;} input:checked+.dm-slider::before{transform:translateX(14px);}

/* ══ GAME ══ */
#gamePage{display:none;position:fixed;inset:0;z-index:200;flex-direction:row;gap:3px;padding:8px;background:rgba(0,0,0,.18);align-items:center;justify-content:center;overflow:hidden;}
#playerPanel, #chatPanel{width:152px;flex-shrink:0;background:var(--bg-panel);border-radius:10px;display:flex;flex-direction:column;overflow:hidden;}
.panel-title, .chat-title{font-family:'Fredoka One',cursive;font-size:.75rem;color:var(--accent-dark);padding:5px 7px 4px;border-bottom:2px solid var(--border-soft);text-align:center;background:var(--bg-hdr);flex-shrink:0;}
#playerList{flex:1;overflow-y:auto;padding:4px;}
#playerList::-webkit-scrollbar, #chatMsgs::-webkit-scrollbar{width:3px;} #playerList::-webkit-scrollbar-thumb, #chatMsgs::-webkit-scrollbar-thumb{background:var(--accent-light);border-radius:2px;}
.p-entry{display:flex;align-items:center;gap:4px;padding:3px 4px;border-radius:7px;cursor:pointer;margin-bottom:0;}
.p-entry:nth-child(odd){background:rgba(0,0,0,.03);} .p-entry:nth-child(even){background:rgba(0,0,0,.08);}
body.dark .p-entry:nth-child(odd){background:rgba(0,0,0,.35);} body.dark .p-entry:nth-child(even){background:rgba(255,255,255,.06);}
.p-entry:hover{background:var(--accent-subtle);} .p-entry.muted{opacity:.5;}
.p-name-wrap{flex:1;min-width:0;}
.p-name{font-size:.72rem;font-weight:800;color:var(--text-main);word-break:break-word;line-height:1.2;}
.p-you{font-size:.57rem;color:var(--accent-mid);font-weight:800;display:block;}

#roomWrap{flex:0 0 auto;display:flex;flex-direction:column;min-width:0;gap:3px;}
#roomHdr{display:flex;align-items:center;justify-content:space-between;background:var(--bg-panel);border-radius:10px;padding:3px 7px;flex-shrink:0;}
.rc-display{font-family:'Fredoka One',cursive;font-size:.72rem;color:var(--accent-dark);letter-spacing:2px;}
.lobby-count-badge{font-size:.6rem;font-weight:700;color:var(--text-sub);background:var(--bg-hdr);border-radius:6px;padding:2px 6px;border:1px solid var(--border-soft);}
#leaveBtn{background:#ff4444;color:#fff;border:none;border-radius:7px;font-family:'Fredoka One',cursive;font-size:.66rem;cursor:pointer;padding:3px 8px;margin-left:4px;}
#leaveBtn:hover{background:#cc0000;}

#livingRoom{flex:1;min-height:0;min-width:0;display:flex;align-items:center;justify-content:center;position:relative;}
#roomBox{position:relative;border-radius:10px;background:#2a3a6a;container-type:inline-size;container-name:room;flex-shrink:0;}
#roomClip{position:absolute;inset:0;overflow:hidden;border-radius:10px;}
#roomSvg{width:100%;height:100%;display:block;}
#rainCanvas{position:absolute;top:0;left:0;width:100%;height:100%;pointer-events:none;z-index:5;}
#avatarLayer{position:absolute;inset:0;pointer-events:none;z-index:6;}
.avatar-wrap{position:absolute;display:flex;flex-direction:column;align-items:center;transform:translate(-50%,-100%);}
.avatar-wrap canvas{width:9.4cqw;height:11.25cqw;display:block;}
.avatar-nametag{margin-top:.3cqw;font-family:'Nunito',sans-serif;font-weight:800;font-size:1.5cqw;line-height:1.3;white-space:nowrap;background:rgba(255,255,255,.95);border-radius:.8cqw;padding:.35cqw 1cqw;border:.18cqw solid #bbb;color:#222;}
.avatar-nametag.is-me{border-color:var(--accent);color:var(--accent-you,#0E5C42);}

#leaveConfirm{display:none;position:absolute;inset:0;z-index:40;background:rgba(0,0,0,.55);align-items:center;justify-content:center;border-radius:10px;}
.lc-box{background:#fff;border-radius:14px;padding:20px 28px;text-align:center;}
.lc-btns{display:flex;gap:10px;justify-content:center;margin-top:14px;}
.lc-yes{background:#ff4444;color:#fff;border:none;border-radius:8px;padding:7px 20px;cursor:pointer;font-weight:bold;}
.lc-no{background:#1E9E4A;color:#fff;border:none;border-radius:8px;padding:7px 20px;cursor:pointer;font-weight:bold;}

#chatMsgs{flex:1;overflow-y:auto;display:flex;flex-direction:column;}
.cmsg{font-size:.74rem;line-height:1.38;word-break:break-word;color:var(--text-main);padding:4px 8px;}
.cmsg-even{background:var(--bg-chat-even);} .cmsg-odd{background:var(--bg-chat-odd);}
.cmsg .sname{font-weight:800;color:var(--text-main);} .cmsg .mbody{font-weight:700;color:var(--text-main);}
.sys-join{color:#1a7a1a;font-weight:700;font-size:.67rem;}
.sys-leave, .sys-kick{color:#c00;font-weight:800;font-size:.67rem;}
.sys-vote{color:var(--accent-text);font-weight:700;font-size:.65rem;font-style:italic;}
.msg-blocked{color:#cc0000!important;font-weight:800!important;font-size:.65rem!important;font-style:italic;background:#ffe8e8;border-radius:4px;margin:2px 4px;padding:3px 7px;border-left:3px solid #cc0000;}
body.dark .sys-join{color:#5ddd5d;} body.dark .sys-leave, body.dark .sys-kick{color:#ff6666;} body.dark .sys-vote{color:#F0C040;}

#chatInpRow{display:flex;gap:3px;padding:5px;border-top:2px solid var(--border-soft);flex-shrink:0;background:var(--bg-hdr);}
#chatInp{flex:1;border:1.5px solid var(--accent-light);border-radius:7px;padding:4px 6px;font-family:'Nunito',sans-serif;font-size:.72rem;font-weight:600;outline:none;color:var(--text-main);background:var(--inp-bg);}
#chatSend{background:#1E9E4A;color:#fff;border:none;border-radius:7px;font-size:.76rem;padding:4px 8px;cursor:pointer;font-weight:700;}

#ctxMenu{position:fixed;background:var(--bg-panel);border:2px solid var(--accent);border-radius:9px;box-shadow:0 4px 20px rgba(0,0,0,.2);z-index:1000;padding:4px;display:none;min-width:115px;}
.ctx-name{font-family:'Fredoka One',cursive;font-size:.75rem;color:var(--accent-dark);padding:4px 8px 3px;border-bottom:1px solid var(--border-soft);margin-bottom:3px;}
.ctx-item{padding:5px 9px;border-radius:6px;cursor:pointer;font-size:.72rem;font-weight:700;color:var(--text-main);}
.ctx-item:hover{background:var(--accent-subtle);} .ctx-danger{color:#c00;} .ctx-danger:hover{background:#ffe0e0;}

.bubble{position:absolute;background:rgba(255,255,255,.97);border:.4cqw solid var(--accent);border-radius:1.6cqw;padding:.7cqw 1.4cqw;font-size:1.55cqw;font-weight:800;color:#111;max-width:22cqw;word-break:break-word;text-align:center;pointer-events:none;box-shadow:0 2px 10px rgba(0,0,0,.18);z-index:20;transform:translate(-50%,-100%);}

#kickNotice, #disconnectOverlay, #ageGate{display:none;position:fixed;inset:0;background:rgba(0,0,0,.75);z-index:9000;align-items:center;justify-content:center;}
.popup-box{background:#fff;border-radius:16px;padding:24px 28px;text-align:center;box-shadow:0 8px 32px rgba(0,0,0,.3);max-width:320px;}
.popup-box h2{font-family:'Fredoka One',cursive;color:#c00;font-size:1.3rem;margin-bottom:7px;}
.popup-box p{font-size:.85rem;color:#444;margin-bottom:14px;line-height:1.5;}
.popup-box button{background:var(--accent);color:#fff;border:none;border-radius:9px;font-family:'Fredoka One',cursive;font-size:.95rem;padding:8px 22px;cursor:pointer;}
body.dark .popup-box{background:#2a2a3a;} body.dark .popup-box p{color:#ccc;}

#rotateMsg{display:none;position:fixed;inset:0;z-index:9999;background:linear-gradient(135deg,var(--grad-a),var(--grad-b));flex-direction:column;align-items:center;justify-content:center;text-align:center;padding:30px;}
#rotateMsg .r-icon{font-size:3.5rem;margin-bottom:16px;animation:spin 2s linear infinite;}
#rotateMsg h2{font-family:'Fredoka One',cursive;font-size:1.5rem;color:#fff;text-shadow:2px 2px 0 var(--accent-dark);margin-bottom:8px;}
@keyframes spin{0%{transform:rotate(0deg);}50%{transform:rotate(90deg);}100%{transform:rotate(90deg);}}

@media(max-width:900px){ .col-left,.col-right{width:160px;} #playerPanel, #chatPanel{width:130px;} }
@media(max-width:700px){ .home-3col{flex-direction:column;align-items:center;} .home-col,.col-left,.col-right,.col-mid{width:100%;max-width:560px;} }
@media(max-width:560px){ #playerPanel, #chatPanel{width:115px;} }
@media(max-height:500px) and (orientation:landscape){ #playerPanel, #chatPanel{width:105px;} }
</style>
</head>
<body>

<div id="rotateMsg">
  <div class="r-icon">📱</div>
  <h2>Rotate Your Device!</h2>
  <p style="font-weight:bold;color:#fff;">Rainy Day Living Room is best in landscape.<br>Please rotate your phone sideways to play.</p>
</div>

<div id="homePage">
  <div class="home-topbar">
    <div class="logo">🌧️ Rainy Day Living Room</div>
    <div class="home-dm-wrap">
      <span style="color:#fff;font-size:.6rem;">☀</span>
      <label class="dm-switch"><input type="checkbox" id="dmToggleHome" onchange="toggleDark(this.checked)"><span class="dm-slider"></span></label>
      <span style="color:#fff;font-size:.6rem;">🌙</span>
    </div>
  </div>
  <div class="home-3col">
    <!-- Rules -->
    <div class="home-col col-left">
      <div class="card" style="flex:1;overflow:hidden;">
        <h3>📋 Rules & Legal</h3>
        <div class="rules-txt" style="overflow-y:auto;max-height:350px;">
          <p>✅ Be respectful — no harassment, hate speech, or racism.</p>
          <p>✅ Keep chat family-friendly.</p>
          <p>✅ No sharing personal info.</p>
          <p>✅ No spam or repetitive messages.</p>
          <p>✅ This is a free project. No real money or tracking used besides standard Google AdSense.</p>
        </div>
      </div>
    </div>
    <!-- Profile & Play -->
    <div class="home-col col-mid">
      <div class="card">
        <h3>🎮 Your Profile</h3>
        <input id="nameInp" class="inp" type="text" placeholder="Username..." maxlength="16" style="margin-bottom:3px;" oninput="liveCheckName(this.value)">
        <div id="nameValidMsg" class="name-valid-msg"></div>
        <div class="av-center">
          <div style="display:flex;align-items:center;gap:6px;">
            <div style="display:flex;flex-direction:column;gap:4px;">
              <button class="feat-arrow" onclick="prevSkin()">◀</button>
              <button class="feat-arrow" onclick="prev('eyes')">◀</button>
              <button class="feat-arrow" onclick="prev('mouth')">◀</button>
              <button class="feat-arrow" onclick="prev('hat')">◀</button>
            </div>
            <canvas id="avCanvas" width="330" height="390" style="width:110px;height:130px;"></canvas>
            <div style="display:flex;flex-direction:column;gap:4px;">
              <button class="feat-arrow" onclick="nextSkin()">▶</button>
              <button class="feat-arrow" onclick="next('eyes')">▶</button>
              <button class="feat-arrow" onclick="next('mouth')">▶</button>
              <button class="feat-arrow" onclick="next('hat')">▶</button>
            </div>
          </div>
          <button onclick="resetAvatar()" style="margin-top:4px;background:none;border:1.5px solid var(--border-soft);border-radius:8px;padding:3px 10px;font-size:.85rem;cursor:pointer;color:var(--text-main);">🔄 Random</button>
        </div>
      </div>
      <div class="card">
        <h3>🚀 Play</h3>
        <div id="homeErr" class="err-msg"></div>
        <button class="big-btn btn-play" onclick="playRandom()">▶ Play (Random Lobby)</button>
        <div class="code-row">
          <input id="codeInp" class="code-inp" type="text" placeholder="ROOM CODE" maxlength="5">
          <button class="code-btn" onclick="playCode()">Join</button>
        </div>
        <p class="tagline-txt">Bored? Join this game to socialize and relax! It's a rainy day in the living room, so use your imagination and find something creative to do.</p>
        <p class="tagline-txt" style="margin-top:3px;font-weight:800;">👥 <span id="totalPlayersCount">0</span> players online right now</p>
      </div>
    </div>
    <!-- Lobbies -->
    <div class="home-col col-right">
      <div class="card" style="flex:1;display:flex;flex-direction:column;overflow:hidden;min-height:0;">
        <h3>🏠 All Lobbies</h3>
        <p style="font-size:.58rem;color:var(--text-muted);text-align:center;">Tap a lobby here to join it.</p>
        <div class="lobby-scroll"><div id="lobbyList"><div style="text-align:center;color:var(--text-muted);font-size:.7rem;padding:8px;">No open lobbies.</div></div></div>
      </div>
    </div>
  </div>

  <div id="adsense-home-bottom" style="width:100%;max-width:728px;min-height:50px;margin-top:10px;">
    <ins class="adsbygoogle" style="display:block;width:100%;" data-ad-client="ca-pub-2352009046427964" data-ad-slot="YOUR_BOTTOM_SLOT_ID" data-ad-format="auto" data-full-width-responsive="true"></ins>
    <script>try{(adsbygoogle=window.adsbygoogle||[]).push({});}catch(e){}</script>
  </div>
</div>

<div id="gamePage">
  <div id="playerPanel">
    <div class="panel-title">Players</div>
    <div id="playerList"></div>
  </div>
  <div id="roomWrap">
    <div id="roomHdr">
      <div style="display:flex;align-items:center;gap:8px;">
        <div><div style="font-size:.52rem;color:var(--text-muted);font-weight:700;">ROOM</div>
        <div style="display:flex;align-items:center;gap:3px;"><div class="rc-display" id="rcDisp">-----</div><button onclick="copyRoomCode()" id="copyRcBtn" style="font-size:.5rem;padding:2px 5px;border-radius:5px;border:1px solid var(--border-soft);background:none;cursor:pointer;color:var(--text-main);">Copy</button></div></div>
        <div class="lobby-count-badge" id="lobbyCnt">1/8</div>
      </div>
      <div style="display:flex;gap:5px;align-items:center;margin-left:auto;">
        <label class="dm-switch"><input type="checkbox" id="dmToggleGame" onchange="toggleDark(this.checked)"><span class="dm-slider"></span></label>
        <span onclick="toggleVolMute()" style="cursor:pointer;font-size:.9rem;">🔈</span>
        <input id="volSlider" type="range" min="0" max="100" value="70" oninput="setVolume(this.value)" style="width:50px;height:12px;accent-color:var(--accent-light);cursor:pointer;">
        <button id="leaveBtn" onclick="askLeave()">✕ Leave</button>
      </div>
    </div>
    <div id="livingRoom">
     <div id="roomBox">
      <div id="roomClip">
        <canvas id="rainCanvas"></canvas>
        <svg id="roomSvg" viewBox="0 0 640 400" xmlns="http://www.w3.org/2000/svg">
          <!-- Room background -->
          <rect width="640" height="400" fill="#ECE3A1"/>
          <!-- Floor -->
          <rect y="240" width="640" height="160" fill="#5C3A21"/>
          <!-- Trim -->
          <rect y="235" width="640" height="5" fill="#C7BB68"/>
          <!-- Rug -->
          <ellipse cx="320" cy="320" rx="260" ry="70" fill="#B56727"/>
          <ellipse cx="320" cy="320" rx="240" ry="60" fill="#FFAA1D"/>

          <!-- Window & Curtains -->
          <rect x="250" y="30" width="140" height="130" fill="#112233" stroke="#C7BB68" stroke-width="4"/>
          <path d="M 240,25 Q 260,100 240,165 L 260,165 Q 275,100 250,25 Z" fill="#0F4D92"/>
          <path d="M 400,25 Q 380,100 400,165 L 380,165 Q 365,100 390,25 Z" fill="#0F4D92"/>

          <!-- 2 Cats Framed Picture (Kelly Green border) -->
          <rect x="130" y="50" width="70" height="50" fill="#ddd" stroke="#4CB817" stroke-width="4"/>
          <circle cx="150" cy="75" r="10" fill="#333"/><circle cx="180" cy="75" r="10" fill="#e89c38"/>
          <path d="M 145,65 L 140,55 L 155,65 M 155,65 L 160,55 L 145,65" stroke="#333" stroke-width="2"/>
          <path d="M 175,65 L 170,55 L 185,65 M 185,65 L 190,55 L 175,65" stroke="#e89c38" stroke-width="2"/>

          <!-- Mirror (Rectangular, centered above middle couch) -->
          <rect x="270" y="40" width="100" height="60" fill="#aaddff" stroke="#D4AF37" stroke-width="6" rx="4"/>
          <path d="M 280,90 L 320,50" stroke="rgba(255,255,255,0.4)" stroke-width="8"/>

          <!-- Light Switch (STATIC - No animation on click) -->
          <g id="lightSwitchG" onclick="toggleFanClick()" cursor="pointer">
            <rect x="390" y="80" width="16" height="24" fill="#eee" stroke="#333" stroke-width="1.5" rx="2"/>
            <rect id="fanToggle" x="394" y="88" width="8" height="8" fill="#ccc" stroke="#666" stroke-width="1" rx="1"/>
          </g>

          <!-- Wall Clock -->
          <g id="clockG">
            <rect x="490" y="30" width="90" height="35" fill="#222" stroke="#555" stroke-width="2" rx="4"/>
            <text id="clockText" x="535" y="55" font-family="monospace" font-size="20" font-weight="bold" fill="#CC2222" text-anchor="middle">12:00 PM</text>
            <circle cx="525" cy="75" r="5" fill="#1E9E4A" cursor="pointer" onclick="clockButtonClick('green')"/>
            <circle cx="545" cy="75" r="5" fill="#CC2222" cursor="pointer" onclick="clockButtonClick('red')"/>
          </g>

          <!-- Desk & TV -->
          <rect x="480" y="160" width="120" height="90" fill="#3D2314"/>
          <rect x="490" y="120" width="100" height="60" fill="#111" stroke="#333" stroke-width="3"/>
          <rect x="492" y="122" width="96" height="56" fill="#667788"/> <!-- TV Tint -->
          <!-- Mouse & Keyboard -->
          <rect x="520" y="185" width="40" height="12" fill="#ddd" rx="2"/>
          <rect x="570" y="185" width="10" height="15" fill="#bbb" rx="3"/>
          <rect x="450" y="180" width="20" height="60" fill="#A0522D"/> <!-- Chair facing TV -->

          <!-- Fireplace (Sideways, perfectly on the left, cropped so half is visible) -->
          <g id="fireplaceG">
            <!-- Sideways mantle profile -->
            <rect x="-35" y="130" width="70" height="130" fill="#8B4513" stroke="#111" stroke-width="2"/>
            <rect x="-40" y="120" width="80" height="10" fill="#5C2E0B" stroke="#111" stroke-width="2"/>
            <!-- Firebox facing the room (right side of the mantle) -->
            <rect x="15" y="180" width="20" height="80" fill="#222" stroke="#111" stroke-width="2"/>
            <path id="flame" d="M 20,250 Q 15,230 25,210 Q 30,230 25,250" fill="#FF8C00"/>
            <!-- Pot with 2 yellow flowers -->
            <rect x="10" y="105" width="16" height="15" fill="#A0522D" stroke="#111" stroke-width="1.5"/>
            <path d="M 14,105 L 10,95 M 22,105 L 26,95" stroke="#228B22" stroke-width="2"/>
            <circle cx="10" cy="92" r="5" fill="#FFD700" stroke="#111" stroke-width="1"/>
            <circle cx="26" cy="92" r="5" fill="#FFD700" stroke="#111" stroke-width="1"/>
          </g>

          <!-- Couches -->
          <rect x="100" y="210" width="120" height="60" fill="#0F4D92" rx="10"/> <!-- Left -->
          <rect x="230" y="190" width="180" height="70" fill="#0F4D92" rx="10"/> <!-- Mid -->
          <rect x="420" y="210" width="120" height="60" fill="#0F4D92" rx="10"/> <!-- Right -->

          <!-- Coffee Table -->
          <ellipse cx="320" cy="290" rx="90" ry="30" fill="#6B4226"/>
          <!-- Props -->
          <rect x="280" y="280" width="10" height="15" fill="#c00" rx="2"/> <!-- Red mug -->
          <rect x="340" y="285" width="25" height="10" fill="#222" transform="rotate(-15, 340, 285)" rx="2"/> <!-- Remote -->

          <!-- Ceiling Fan (Top Center, Absolute hub rotation) -->
          <circle cx="320" cy="15" r="14" fill="#443322"/>
          <circle id="fanBulb" cx="320" cy="18" r="8" fill="#999"/>
          <g id="fanBladesG">
            <!-- Paddle shapes -->
            <path d="M 310,15 L 220,0 L 210,15 L 220,30 Z" fill="#5C3A21"/>
            <path d="M 330,15 L 420,0 L 430,15 L 420,30 Z" fill="#5C3A21"/>
            <path d="M 320,5 L 305,-60 L 320,-70 L 335,-60 Z" fill="#5C3A21"/>
            <path d="M 320,25 L 305,90 L 320,100 L 335,90 Z" fill="#5C3A21"/>
          </g>
        </svg>
      </div>
      <div id="avatarLayer"></div>
      <div id="leaveConfirm">
        <div class="lc-box">
          <h3>Leave Lobby?</h3>
          <div class="lc-btns">
            <button class="lc-yes" onclick="confirmLeave()">Yes, Leave</button>
            <button class="lc-no" onclick="cancelLeave()">No, Stay</button>
          </div>
        </div>
      </div>
     </div>
    </div>
  </div>
  <div id="chatPanel">
    <div class="chat-title">Chat</div>
    <div id="chatMsgs"></div>
    <div id="chatInpRow">
      <input id="chatInp" type="text" placeholder="Type..." maxlength="100">
      <button id="chatSend">➤</button>
    </div>
  </div>
</div>

<div id="ctxMenu">
  <div class="ctx-name" id="ctxName"></div>
  <div class="ctx-item" id="ctxMute" onclick="ctxDoMute()">🔇 Mute</div>
  <div class="ctx-item ctx-danger" onclick="ctxDoKick()">🚫 Vote Kick</div>
</div>

<div id="ageGate" class="popup-box" style="display:none;">
  <div style="background:#fff;border-radius:16px;padding:28px 30px;max-width:360px;text-align:center;">
    <h2 style="font-family:'Fredoka One';color:#333;">Welcome!</h2>
    <p>This site displays ads via Google AdSense. Chat is filtered. Please be respectful!</p>
    <button onclick="acceptAgeGate()">Enter Game</button>
  </div>
</div>

<div id="disconnectOverlay" class="popup-box" style="display:none;">
  <div style="background:#fff;border-radius:16px;padding:24px;">
    <h2>Connection Lost</h2>
    <p>You have been returned to the home screen.</p>
    <button onclick="dismissDisconnect()">Back to Home</button>
  </div>
</div>

<div id="kickNotice" class="popup-box" style="display:none;">
  <div style="background:#fff;border-radius:16px;padding:24px;">
    <h2>🚫 Kicked</h2>
    <p id="kickMsg">You were kicked. Wait 10 minutes.</p>
    <button onclick="dismissKick()">✕ Close</button>
  </div>
</div>

<script>
// ══ USERNAME VALIDATION ══
const USERNAME_BAD_TERMS = [
  'nigger','nigga','nigg','n1gg','niga','nigar', 'chink','chinc','gook','zipperhead','slant','slanteye',
  'spic','spick','beaner','wetback', 'kike','hymie','heeb', 'cracker','honky','whitey',
  'towelhead','raghead','sandnigger','cameljockey', 'paki','pakis','jap','japs','redskin','injun',
  'coonass','sambo','darkie','darky', 'gringo','wop','dago','polack','cholo',
  'faggot','fagot','fag','dyke','tranny','trannies', 'shemale','heshe','ladyboy','sissy',
  'cunt','whore','slut','skank','thot','twat',
  'porn','porno','xxx','hentai','nsfw', 'penis','vagina','cock','dick','pussy',
  'boob','tits','titties','titty', 'cum','rape','molest','pedophile','pedo','loli',
  'kys','killurself','killyourself', 'neonazi','nsdap','hitlersass','hitlerass','seigheil','siegheil',
  'whitepower','kkk','kkkmember', 'heroin','cocaine','methamphetamine','fentanyl',
  'system','admin','administrator','moderator','staffmember', 'official','owner','operator'
];

function normUsername(s){
  return s.toLowerCase().normalize('NFD').replace(/[\\u0300-\\u036f]/g,'')
    .replace(/[@]/g,'a').replace(/[4]/g,'a').replace(/[3]/g,'e').replace(/[€]/g,'e')
    .replace(/[1!|]/g,'i').replace(/[0]/g,'o').replace(/[$5]/g,'s').replace(/[7]/g,'t')
    .replace(/[+]/g,'t').replace(/[8]/g,'b').replace(/\\s+/g,'').replace(/[^a-z0-9]/g,'');
}

function validateUsername(name){
  const trimmed=(name||'').trim();
  if(!trimmed) return {valid:null, msg:null};
  if(trimmed.length<2) return {valid:false, msg:'❌ Username is too short — minimum 2 characters.'};
  if(trimmed.length>16) return {valid:false, msg:'❌ Username is too long — maximum 16 characters.'};
  const s=normUsername(trimmed);
  for(const term of USERNAME_BAD_TERMS){
    const n=term.replace(/\\s+/g,'').replace(/[^a-z0-9]/g,'');
    if(n&&s.includes(n)) return {valid:false, msg:'❌ Username contains inappropriate content — please choose a different username.'};
  }
  return {valid:true, msg:'✅ Username looks good — you\\'re all set to join!'};
}

function liveCheckName(val){
  const inp=document.getElementById('nameInp');
  const msg=document.getElementById('nameValidMsg');
  const {valid,msg:txt}=validateUsername(val);
  if(valid===null){
    inp.classList.remove('name-ok','name-bad'); msg.style.display='none';
  } else if(valid){
    inp.classList.remove('name-bad');inp.classList.add('name-ok');
    msg.className='name-valid-msg valid';msg.textContent=txt;msg.style.display='block';
  } else {
    inp.classList.remove('name-ok');inp.classList.add('name-bad');
    msg.className='name-valid-msg invalid';msg.textContent=txt;msg.style.display='block';
  }
  saveP();
}

function showHomeErr(msg){
  const err=document.getElementById('homeErr');
  err.textContent=msg; err.style.display='block';
  setTimeout(()=>{err.style.display='none';}, 4500);
}

// ══ INIT & AGE GATE ══
(function(){
  if(!localStorage.getItem('cg_age_ok')){
    document.getElementById('ageGate').style.display='flex';
  }
  try{
    const raw = localStorage.getItem('cg_kicked_notice');
    if(raw) {
      localStorage.removeItem('cg_kicked_notice');
      const data = JSON.parse(raw);
      if(data && Date.now() - data.shownAt < 30000) {
        window._kickedFromCode = data.lobbyCode;
        document.getElementById('kickNotice').style.display='flex';
      }
    }
  }catch(e){}
})();
function acceptAgeGate(){ localStorage.setItem('cg_age_ok','1'); document.getElementById('ageGate').style.display='none'; }
function dismissKick(){ document.getElementById('kickNotice').style.display='none'; }
function dismissDisconnect(){ document.getElementById('disconnectOverlay').style.display='none'; }

// ══ RESIZING ══
const ROOM_RATIO=640/400; const ROOM_MAX_W=780, ROOM_MAX_H=488;
function sizeRoom(){
  const gp=document.getElementById('gamePage'); if(!gp||gp.style.display==='none')return;
  const pp=document.getElementById('playerPanel'), cp=document.getElementById('chatPanel');
  const rh=document.getElementById('roomHdr'), box=document.getElementById('roomBox');
  if(!box)return;
  const ppW=pp?pp.offsetWidth||138:138, cpW=cp?cp.offsetWidth||175:175;
  const HDR=rh?rh.offsetHeight||32:32, VGAP=3, HGAPS=6, PAD=16;
  const availW=window.innerWidth, availH=window.innerHeight;
  let rW=Math.min(ROOM_MAX_W,availW-ppW-cpW-HGAPS-PAD);
  let rH=rW/ROOM_RATIO;
  const maxH=Math.min(ROOM_MAX_H,availH-HDR-VGAP-PAD);
  if(rH>maxH){rH=maxH;rW=rH*ROOM_RATIO;}
  rW=Math.round(rW);rH=Math.round(rH);
  box.style.width=rW+'px'; box.style.height=rH+'px';
  document.getElementById('roomWrap').style.width=rW+'px';
  if(pp) pp.style.height=(HDR+VGAP+rH)+'px'; if(cp) cp.style.height=(HDR+VGAP+rH)+'px';
}
window.addEventListener('resize',sizeRoom);

// ══ AUDIO & SOUND ══
let ac=null, masterGain=null, sndMuted=false, currentVol=0.7;
function getAC(){
  if(!ac){ ac=new(window.AudioContext||window.webkitAudioContext)(); masterGain=ac.createGain(); masterGain.connect(ac.destination); masterGain.gain.value=currentVol; }
  if(ac.state==='suspended') ac.resume();
  return ac;
}
function setVolume(v){ currentVol=v/100; if(masterGain) masterGain.gain.value=currentVol; }
function toggleVolMute(){ sndMuted=!sndMuted; document.getElementById('volSlider').value=sndMuted?0:(currentVol*100); if(masterGain) masterGain.gain.value=sndMuted?0:currentVol; }
function playTone(freq1,freq2,dur,vol){
  if(sndMuted)return; try{ const a=getAC(), o=a.createOscillator(), g=a.createGain(); o.type='sine'; o.connect(g); g.connect(masterGain); o.frequency.setValueAtTime(freq1,a.currentTime); if(freq2) o.frequency.exponentialRampToValueAtTime(freq2,a.currentTime+dur); g.gain.setValueAtTime(vol,a.currentTime); g.gain.exponentialRampToValueAtTime(0.001,a.currentTime+dur); o.start(); o.stop(a.currentTime+dur); }catch(e){}
}
function makeNoise(dur,freq,vol){
  if(sndMuted)return null; try{ const a=getAC(), bs=a.createBufferSource(), b=a.createBuffer(1,a.sampleRate*dur,a.sampleRate), cd=b.getChannelData(0); for(let i=0;i<cd.length;i++)cd[i]=Math.random()*2-1; bs.buffer=b; const f=a.createBiquadFilter(); f.type='lowpass'; f.frequency.value=freq; const g=a.createGain(); g.gain.value=vol; bs.connect(f); f.connect(g); g.connect(masterGain); bs.loop=true; bs.start(); return bs; }catch(e){return null;}
}
function stopNode(n){ if(n)try{n.stop();}catch(e){} }

// ══ FAN, SWITCH, CLOCK ══
let fanOn=false, clockColor='red', clockOffset=0;
let fanAngle=0, fanSpeed=0, fanAnimId=null, fanWindNode=null, clockIntervalId=null;

function fanAnimLoop(){
  const targetSpeed=fanOn?6:0;
  fanSpeed+=(targetSpeed-fanSpeed)*0.05;
  if(Math.abs(fanSpeed)<0.01&&targetSpeed===0)fanSpeed=0;
  fanAngle=(fanAngle+fanSpeed)%360;
  const bladesEl=document.getElementById('fanBladesG');
  if(bladesEl)bladesEl.setAttribute('transform','rotate('+fanAngle.toFixed(1)+',320,15)');
  if(fanSpeed!==0||fanOn) { fanAnimId=requestAnimationFrame(fanAnimLoop); } else { fanAnimId=null; }
}
function applyFanState(){
  document.getElementById('fanBulb').setAttribute('fill',fanOn?'#FFD966':'#999');
  if(!fanAnimId)fanAnimId=requestAnimationFrame(fanAnimLoop);
  if(fanOn&&!fanWindNode) fanWindNode=makeNoise(4,1800,.04); else if(!fanOn&&fanWindNode) { stopNode(fanWindNode); fanWindNode=null; }
}
function playSwitchClick(){ if(!sndMuted)playTone(800,1000,.05,.1); }
function toggleFanClick(){ playSwitchClick(); socket.emit('toggleFan'); }
function clockButtonClick(col){ if(!sndMuted)playTone(1000,1200,.1,.1); socket.emit('toggleClockColor',{color:col}); }

function getClockDisplay(){
  const cycle=660*20; const pos=(Math.floor(Date.now()/1000)+clockOffset*20)%cycle;
  const tMin=(19*60+Math.floor(pos/20))%1440; const h24=Math.floor(tMin/60), m=tMin%60;
  let h12=h24%12; if(h12===0)h12=12; return h12+':'+String(m).padStart(2,'0')+(h24<12?' AM':' PM');
}
function updateClockDisplay(){ const el=document.getElementById('clockText'); if(el)el.textContent=getClockDisplay(); }
function startClockLoop(){ updateClockDisplay(); if(clockIntervalId)clearInterval(clockIntervalId); clockIntervalId=setInterval(updateClockDisplay,1000); }
function applyClockColor(){ const el=document.getElementById('clockText'); if(el)el.setAttribute('fill',clockColor==='green'?'#3FAE5C':'#CC2222'); }

// ══ DARK MODE ══
let darkMode=false;
function toggleDark(on){
  darkMode=on; document.body.classList.toggle('dark',on);
  document.getElementById('dmToggleGame').checked=on; document.getElementById('dmToggleHome').checked=on;
  localStorage.setItem('cg_dark',on?'1':'0');
}
(function(){ if(localStorage.getItem('cg_dark')==='1') toggleDark(true); })();

// ══ AVATAR DATA & RENDERING ══
const SKINS=[
  {v:'#FF4444',n:'Red'}, {v:'#FF8C42',n:'Orange'}, {v:'#FFD93D',n:'Yellow'}, {v:'#6BCB77',n:'Green'}, {v:'#4D96FF',n:'Blue'}, {v:'#9B5DE5',n:'Purple'}, {v:'#FF6FD8',n:'Pink'},
  {v:'#FDDBB4',n:'Cream'}, {v:'#F5C28A',n:'Peach'}, {v:'#E8A46A',n:'Tan'}, {v:'#C87941',n:'Caramel'}, {v:'#A0522D',n:'Sienna'}, {v:'#4A2510',n:'Espresso'}
];
const EYES_LIST=['Round','Wide','Dot','Star','Shut','Wink','Happy','Heart','Cyclops','Sparkle','Sleepy'];
const MOUTH_LIST=['Smile','Grin','Flat','Sad','Wow','Tongue','Teeth','Kiss','Oof','Fangs'];
const HAT_LIST=['None','Cap','TopHat','Beanie','Crown','Bow','Halo','Cowboy','Flower','Chef','Antlers','Bunny','Space Helm','Burger','Pizza','Cupcake','Frog','BearEars'];

let AV={skin:'#F5C28A',eyes:'Round',mouth:'Smile',hat:'None'};
let skinIdx=8,eyesIdx=0,mouthIdx=0,hatIdx=0;

function prevSkin(){skinIdx=(skinIdx-1+SKINS.length)%SKINS.length; AV.skin=SKINS[skinIdx].v; drawHome(); saveP();}
function nextSkin(){skinIdx=(skinIdx+1)%SKINS.length; AV.skin=SKINS[skinIdx].v; drawHome(); saveP();}
function prev(feat){
  if(feat==='eyes'){eyesIdx=(eyesIdx-1+EYES_LIST.length)%EYES_LIST.length; AV.eyes=EYES_LIST[eyesIdx];}
  if(feat==='mouth'){mouthIdx=(mouthIdx-1+MOUTH_LIST.length)%MOUTH_LIST.length; AV.mouth=MOUTH_LIST[mouthIdx];}
  if(feat==='hat'){hatIdx=(hatIdx-1+HAT_LIST.length)%HAT_LIST.length; AV.hat=HAT_LIST[hatIdx];}
  drawHome(); saveP();
}
function next(feat){
  if(feat==='eyes'){eyesIdx=(eyesIdx+1)%EYES_LIST.length; AV.eyes=EYES_LIST[eyesIdx];}
  if(feat==='mouth'){mouthIdx=(mouthIdx+1)%MOUTH_LIST.length; AV.mouth=MOUTH_LIST[mouthIdx];}
  if(feat==='hat'){hatIdx=(hatIdx+1)%HAT_LIST.length; AV.hat=HAT_LIST[hatIdx];}
  drawHome(); saveP();
}
function resetAvatar(){
  skinIdx=Math.floor(Math.random()*SKINS.length); eyesIdx=0; mouthIdx=0; hatIdx=0;
  AV={skin:SKINS[skinIdx].v, eyes:EYES_LIST[0], mouth:MOUTH_LIST[0], hat:HAT_LIST[0]};
  drawHome(); saveP();
}
function saveP(){ localStorage.setItem('cg_av',JSON.stringify({n:document.getElementById('nameInp').value, a:AV})); }

function rrect(ctx,x,y,w,h,r){
  ctx.beginPath();ctx.moveTo(x+r,y);ctx.lineTo(x+w-r,y);ctx.arcTo(x+w,y,x+w,y+r,r);
  ctx.lineTo(x+w,y+h-r);ctx.arcTo(x+w,y+h,x+w-r,y+h,r);ctx.lineTo(x+r,y+h);ctx.arcTo(x,y+h,x,y+h-r,r);
  ctx.lineTo(x,y+r);ctx.arcTo(x,y,x+r,y,r);ctx.closePath();
}

function drawAV(ctx,av,cx,cy,R){
  // Pixel toggle flicker logic for idle animation
  const flicker = (Math.floor(Date.now()/500) % 2 === 0) ? 0 : 0.4;
  const LW=Math.max(1.2, R*0.07) + flicker;
  
  const bW=R*1.08, bH=R*.95, bX=cx-bW/2, bY=cy+R*.4;
  ctx.fillStyle=av.skin||'#F5C28A'; ctx.strokeStyle='#1a1a1a'; ctx.lineWidth=LW;
  rrect(ctx,bX,bY,bW,bH,R*.22); ctx.fill(); ctx.stroke();
  ctx.beginPath(); ctx.arc(cx,cy,R,0,Math.PI*2); ctx.fill(); ctx.stroke();
  
  // Eyes
  const ey=cy-R*.1, exL=cx-R*.3, exR=cx+R*.3;
  const eye = (x) => {
    ctx.fillStyle='#1a1a1a';
    if(av.eyes==='Round'){ ctx.beginPath(); ctx.ellipse(x,ey,R*.12,R*.16,0,0,Math.PI*2); ctx.fill(); ctx.fillStyle='#fff'; ctx.beginPath(); ctx.arc(x+R*.04,ey-R*.05,R*.045,0,Math.PI*2); ctx.fill(); }
    else if(av.eyes==='Star'){ ctx.fillStyle='#FFD700'; ctx.beginPath(); ctx.arc(x,ey,R*.2,0,Math.PI*2); ctx.fill(); ctx.stroke(); }
    else if(av.eyes==='Sparkle'){ ctx.fillStyle='#FFD700'; ctx.beginPath(); ctx.arc(x,ey,R*.2,0,Math.PI*2); ctx.fill(); }
    else { ctx.beginPath(); ctx.ellipse(x,ey,R*.12,R*.16,0,0,Math.PI*2); ctx.fill(); }
  };
  if(av.eyes==='Cyclops') eye(cx); else { eye(exL); eye(exR); }

  // Mouth
  const my=cy+R*.32; ctx.strokeStyle='#1a1a1a'; ctx.lineWidth=LW;
  if(av.mouth==='Smile'){ ctx.beginPath(); ctx.moveTo(cx-R*.28,my-R*.04); ctx.quadraticCurveTo(cx,my+R*.24,cx+R*.28,my-R*.04); ctx.stroke(); }
  else if(av.mouth==='Sad'){ ctx.beginPath(); ctx.moveTo(cx-R*.27,my+R*.12); ctx.quadraticCurveTo(cx,my-R*.14,cx+R*.27,my+R*.12); ctx.stroke(); }
  else if(av.mouth==='Fangs'){ ctx.fillStyle='#fff'; ctx.beginPath(); ctx.moveTo(cx-R*.2,my); ctx.lineTo(cx+R*.2,my); ctx.lineTo(cx,my+R*.2); ctx.fill(); ctx.stroke(); }
  else { ctx.beginPath(); ctx.moveTo(cx-R*.22,my); ctx.lineTo(cx+R*.22,my); ctx.stroke(); }

  // Hats
  if(av.hat!=='None'){
    if(av.hat==='Chef'){ ctx.fillStyle='#fff'; rrect(ctx,cx-R*.4,cy-R*1.3,R*.8,R*.7,R*.1); ctx.fill(); ctx.stroke(); }
    else if(av.hat==='Antlers'){ ctx.strokeStyle='#6B4226'; ctx.lineWidth=LW*1.5; ctx.beginPath(); ctx.moveTo(cx-R*.4,cy-R*.8); ctx.lineTo(cx-R*.7,cy-R*1.4); ctx.moveTo(cx+R*.4,cy-R*.8); ctx.lineTo(cx+R*.7,cy-R*1.4); ctx.stroke(); }
    else if(av.hat==='Bunny'){ ctx.fillStyle='#fff'; ctx.beginPath(); ctx.ellipse(cx-R*.3,cy-R*1.2,R*.15,R*.6,0,0,Math.PI*2); ctx.fill(); ctx.stroke(); ctx.beginPath(); ctx.ellipse(cx+R*.3,cy-R*1.2,R*.15,R*.6,0,0,Math.PI*2); ctx.fill(); ctx.stroke(); }
    else if(av.hat==='Space Helm'){ ctx.fillStyle='rgba(150,200,255,0.4)'; ctx.beginPath(); ctx.arc(cx,cy,R*1.3,0,Math.PI*2); ctx.fill(); ctx.stroke(); }
    else if(av.hat==='Cap'){ ctx.fillStyle='#c00'; ctx.beginPath(); ctx.arc(cx,cy-R*.4,R*.8,Math.PI,0); ctx.fill(); ctx.stroke(); ctx.beginPath(); ctx.moveTo(cx+R*.8,cy-R*.4); ctx.lineTo(cx+R*1.2,cy-R*.4); ctx.stroke(); }
  }
}

function drawHome(){
  const cv=document.getElementById('avCanvas'); if(!cv)return;
  const c=cv.getContext('2d'); c.clearRect(0,0,cv.width,cv.height);
  drawAV(c,AV,cv.width/2,cv.height/2-20,70);
}
setInterval(drawHome, 250); // Keep idle animation running on home screen

// ══ SOCKET & GAME LOGIC ══
const socket=io();
let myId=null, lobbyCode=null, players={}, localMuted={};

function playRandom(){
  const n=document.getElementById('nameInp').value;
  const v=validateUsername(n);
  if(n.trim().length>0 && !v.valid){
    showHomeErr(v.msg);
    document.getElementById('nameInp').classList.add('name-bad');
    return; // BLOCK JOIN
  }
  socket.emit('joinRandom', {name:n, av:AV});
}
function playCode(){
  const n=document.getElementById('nameInp').value;
  const v=validateUsername(n);
  if(n.trim().length>0 && !v.valid){
    showHomeErr(v.msg);
    document.getElementById('nameInp').classList.add('name-bad');
    return; // BLOCK JOIN
  }
  const c=document.getElementById('codeInp').value.trim().toUpperCase();
  if(!c)return;
  socket.emit('joinCode', {code:c, name:n, av:AV});
}
function copyRoomCode(){
  const c=document.getElementById('rcDisp').textContent;
  navigator.clipboard.writeText(c).then(()=>{
    const b=document.getElementById('copyRcBtn'); b.textContent='Copied!'; setTimeout(()=>b.textContent='Copy',1200);
  });
}

socket.on('lobbiesUpdate', lobs => {
  const ll=document.getElementById('lobbyList'); if(!ll)return;
  let t=0, html='';
  for(const lb of lobs){
    t+=lb.count;
    const full=lb.count>=8;
    html+=\`<div class="lobby-item \${full?'lobby-full':''}" \${full?'':'onclick="document.getElementById(\\'codeInp\\').value=\\''+lb.code+'\\'; playCode();"'}>
      <div><div class="lobby-code-txt">\${lb.code}</div><div class="lobby-names">\${lb.names.join(', ')}</div></div>
      <div class="lobby-cnt">\${full?'<span class="lobby-full-tag">FULL</span>':lb.count+'/8'}<div class="lobby-bar"><div class="lobby-fill" style="width:\${(lb.count/8)*100}%"></div></div></div>
    </div>\`;
  }
  document.getElementById('totalPlayersCount').textContent=t;
  ll.innerHTML=html||'<div class="no-lob">No open lobbies — be the first!</div>';
});

socket.on('joinError', msg => { showHomeErr(msg); });
socket.on('kickedBan', () => { document.getElementById('kickNotice').style.display='flex'; document.getElementById('kickMsg').textContent="You cannot rejoin this lobby for 10 minutes."; });

socket.on('initRoom', data => {
  myId=data.id; lobbyCode=data.code; players=data.players;
  clockOffset=data.clockOffset; clockColor=data.clockColor;
  fanOn=data.fanOn;
  document.getElementById('homePage').style.display='none';
  document.getElementById('gamePage').style.display='flex';
  document.body.classList.add('game-active');
  document.getElementById('rcDisp').textContent=lobbyCode;
  applyClockColor(); startClockLoop(); applyFanState();
  sizeRoom(); renderPList(); renderAvatars();
});

socket.on('stateUpdate', data => { players=data; renderPList(); renderAvatars(); });
socket.on('chatMsg', msg => {
  if(localMuted[msg.id])return;
  const m=document.getElementById('chatMsgs');
  const d=document.createElement('div'); d.className='cmsg '+(m.children.length%2?'cmsg-even':'cmsg-odd');
  d.innerHTML=\`<span class="sname">\${esc(msg.name)}:</span> <span class="mbody">\${esc(msg.text)}</span>\`;
  m.appendChild(d); m.scrollTop=m.scrollHeight;
  showBubble(msg.id, msg.text);
});
socket.on('sysMsg', msg => {
  const m=document.getElementById('chatMsgs');
  const d=document.createElement('div'); d.className='cmsg '+(m.children.length%2?'cmsg-even':'cmsg-odd');
  d.innerHTML=\`<span class="\${msg.type}">\${esc(msg.text)}</span>\`;
  m.appendChild(d); m.scrollTop=m.scrollHeight;
  if(!sndMuted) playTone(400,600,.1,.1);
});
socket.on('chatError', msg => {
  const m=document.getElementById('chatMsgs');
  const d=document.createElement('div'); d.className='msg-blocked'; d.textContent=msg;
  m.appendChild(d); m.scrollTop=m.scrollHeight;
});
socket.on('syncFan', on => { fanOn=on; applyFanState(); playSwitchClick(); });
socket.on('syncClockColor', col => { clockColor=col; applyClockColor(); if(!sndMuted)playTone(1000,1200,.1,.1); });
socket.on('disconnect', () => { document.getElementById('disconnectOverlay').style.display='flex'; });

function renderPList(){
  const l=document.getElementById('playerList'); l.innerHTML='';
  let c=0;
  for(const k in players){
    c++; const p=players[k];
    const d=document.createElement('div'); d.className='p-entry'+(localMuted[k]?' muted':'');
    d.onclick=e=>{if(k!==myId)showCtx(e,k,p.name);};
    d.innerHTML=\`<canvas width="80" height="80" style="width:28px;height:28px;"></canvas><div class="p-name-wrap"><div class="p-name">\${esc(p.name)}</div>\${k===myId?'<span class="p-you">(You)</span>':''}</div>\`;
    drawAV(d.querySelector('canvas').getContext('2d'),p.av,40,40,24);
    l.appendChild(d);
  }
  document.getElementById('lobbyCnt').textContent=c+'/8';
}

function renderAvatars(){
  const L=document.getElementById('avatarLayer'); L.innerHTML='';
  const spots=[{x:160,y:250}, {x:250,y:230}, {x:320,y:230}, {x:390,y:230}, {x:480,y:250}];
  let idx=0;
  for(const k in players){
    const s=spots[idx%spots.length]; idx++;
    const w=document.createElement('div'); w.className='avatar-wrap';
    w.style.left=(s.x/640*100)+'%'; w.style.top=(s.y/400*100)+'%';
    w.innerHTML=\`<canvas width="180" height="220"></canvas><div class="avatar-nametag \${k===myId?'is-me':''}">\${esc(players[k].name)}</div>\`;
    drawAV(w.querySelector('canvas').getContext('2d'), players[k].av, 90, 100, 50);
    w.id='av_'+k; L.appendChild(w);
  }
}
setInterval(renderAvatars, 250); // Redraws periodically for the idle flickering animation

function showBubble(id,txt){
  const aw=document.getElementById('av_'+id); if(!aw)return;
  const b=document.createElement('div'); b.className='bubble'; b.textContent=txt;
  aw.appendChild(b); setTimeout(()=>{try{aw.removeChild(b);}catch(e){}}, 4000);
}

document.getElementById('chatSend').onclick=()=>{ const i=document.getElementById('chatInp'); if(i.value.trim()){socket.emit('chat',i.value.trim()); i.value='';} };
document.getElementById('chatInp').addEventListener('keypress',e=>{ if(e.key==='Enter')document.getElementById('chatSend').click(); });

let ctxId=null;
function showCtx(e,id,name){ e.preventDefault(); ctxId=id; document.getElementById('ctxName').textContent=name; const m=document.getElementById('ctxMenu'); m.style.display='block'; m.style.left=e.clientX+'px'; m.style.top=e.clientY+'px'; document.getElementById('ctxMute').textContent=localMuted[id]?'🔊 Unmute':'🔇 Mute'; }
document.addEventListener('click',e=>{if(!e.target.closest('#ctxMenu')&&!e.target.closest('.p-entry'))document.getElementById('ctxMenu').style.display='none';});
function ctxDoMute(){ localMuted[ctxId]=!localMuted[ctxId]; renderPList(); document.getElementById('ctxMenu').style.display='none'; }
function ctxDoKick(){ socket.emit('voteKick',ctxId); document.getElementById('ctxMenu').style.display='none'; }

function askLeave(){ document.getElementById('leaveConfirm').style.display='flex'; }
function cancelLeave(){ document.getElementById('leaveConfirm').style.display='none'; }
function confirmLeave(){ location.reload(); }

function esc(s){ const d=document.createElement('div'); d.textContent=s; return d.innerHTML; }
(function(){const d=localStorage.getItem('cg_av'); if(d)try{const p=JSON.parse(d); if(p.n)document.getElementById('nameInp').value=p.n; if(p.a)AV=p.a; drawHome();}catch(e){}})();
</script>
</body>
</html>`;

// ══ SERVER BACKEND ══
const MAX_PLAYERS = 8;
const Lobbies = new Map();

function generateId(){ return Math.random().toString(36).substring(2,9); }
function createLobby(){
  const code = Math.random().toString(36).substring(2,7).toUpperCase();
  Lobbies.set(code, { code, players:{}, fanOn:false, clockColor:'red', clockOffset:Math.floor(Math.random()*2000), kickVotes:{} });
  return code;
}

const USERNAME_BAD_TERMS = [
  'nigger','nigga','nigg','n1gg','niga','nigar', 'chink','chinc','gook','zipperhead','slant','slanteye',
  'spic','spick','beaner','wetback', 'kike','hymie','heeb', 'cracker','honky','whitey',
  'towelhead','raghead','sandnigger','cameljockey', 'paki','pakis','jap','japs','redskin','injun',
  'coonass','sambo','darkie','darky', 'gringo','wop','dago','polack','cholo',
  'faggot','fagot','fag','dyke','tranny','trannies', 'shemale','heshe','ladyboy','sissy',
  'cunt','whore','slut','skank','thot','twat',
  'porn','porno','xxx','hentai','nsfw', 'penis','vagina','cock','dick','pussy',
  'boob','tits','titties','titty', 'cum','rape','molest','pedophile','pedo','loli',
  'kys','killurself','killyourself', 'neonazi','nsdap','hitlersass','hitlerass','seigheil','siegheil',
  'whitepower','kkk','kkkmember', 'heroin','cocaine','methamphetamine','fentanyl',
  'system','admin','administrator','moderator','staffmember', 'official','owner','operator'
];

function normUsername(s){
  return s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'')
    .replace(/[@]/g,'a').replace(/[4]/g,'a').replace(/[3]/g,'e').replace(/[€]/g,'e')
    .replace(/[1!|]/g,'i').replace(/[0]/g,'o').replace(/[$5]/g,'s').replace(/[7]/g,'t')
    .replace(/[+]/g,'t').replace(/[8]/g,'b').replace(/\s+/g,'').replace(/[^a-z0-9]/g,'');
}

function validateUsername(name){
  const trimmed = (name||'').trim();
  if(!trimmed) return {valid:false};
  if(trimmed.length<2 || trimmed.length>16) return {valid:false, msg:'❌ Invalid length.'};
  const s = normUsername(trimmed);
  for(const term of USERNAME_BAD_TERMS){
    const n=term.replace(/\s+/g,'').replace(/[^a-z0-9]/g,'');
    if(n&&s.includes(n)) return {valid:false, msg:'❌ Username contains inappropriate content — please choose a different username.'};
  }
  return {valid:true};
}

const PREFIXES = ["Happy","Cozy","Rainy","Sleepy","Lazy","Toasted","Crispy","Fluffy","Sweet","Salty"];
const SUFFIXES = ["Apple","Burger","Pancake","Waffle","Muffin","Toast","Coffee","Pizza","Cookie","Bean"];
function getRandomName(lobby){
  for(let i=0;i<50;i++){
    const n = PREFIXES[Math.floor(Math.random()*PREFIXES.length)] + SUFFIXES[Math.floor(Math.random()*SUFFIXES.length)] + Math.floor(Math.random()*99);
    let ok = true;
    for(const k in lobby.players) if(lobby.players[k].name===n) ok=false;
    if(ok) return n;
  }
  return "Guest"+Math.floor(Math.random()*9999);
}

function bcastLobbies(){
  const list = [];
  for(const [c,l] of Lobbies){
    if(Object.keys(l.players).length>0){
      list.push({code:c, count:Object.keys(l.players).length, names:Object.values(l.players).map(p=>p.name)});
    } else { Lobbies.delete(c); }
  }
  io.emit('lobbiesUpdate', list);
}

app.get('/', (req, res) => res.send(INDEX_HTML));

io.on('connection', socket => {
  socket.emit('lobbiesUpdate', Array.from(Lobbies.values()).filter(l=>Object.keys(l.players).length>0).map(l=>({code:l.code, count:Object.keys(l.players).length, names:Object.values(l.players).map(p=>p.name)})));

  socket.on('joinRandom', data => handleJoin(socket, null, data));
  socket.on('joinCode', data => handleJoin(socket, data.code, data));

  function handleJoin(socket, code, data){
    if(socket.lobby) return;
    const v = validateUsername(data.name);
    if(data.name && data.name.trim() && !v.valid) { socket.emit('joinError', v.msg); return; }
    
    let lobby = null;
    if(code) lobby = Lobbies.get(code);
    else {
      const open = Array.from(Lobbies.values()).filter(l=>Object.keys(l.players).length<MAX_PLAYERS);
      if(open.length>0) lobby = open[Math.floor(Math.random()*open.length)];
    }
    if(!lobby) { const nc = createLobby(); lobby = Lobbies.get(nc); }
    if(Object.keys(lobby.players).length >= MAX_PLAYERS) { socket.emit('joinError', 'Lobby is full.'); return; }
    
    if(socket.bannedFrom === lobby.code && Date.now() < socket.banUntil) { socket.emit('kickedBan'); return; }

    const name = (data.name && data.name.trim() && v.valid) ? data.name.trim() : getRandomName(lobby);
    socket.lobby = lobby; socket.pid = generateId();
    lobby.players[socket.pid] = { name, av:data.av };
    
    socket.join(lobby.code);
    socket.emit('initRoom', { id:socket.pid, code:lobby.code, players:lobby.players, clockOffset:lobby.clockOffset, clockColor:lobby.clockColor, fanOn:lobby.fanOn });
    io.to(lobby.code).emit('stateUpdate', lobby.players);
    io.to(lobby.code).emit('sysMsg', { type:'sys-join', text:name+' joined.' });
    bcastLobbies();
  }

  socket.on('chat', text => {
    if(!socket.lobby) return;
    let t = text.trim(); if(!t) return;
    if(t.length>100) t=t.substring(0,100);
    const now=Date.now(); if(socket.lastMsg && now-socket.lastMsg<1000){ socket.emit('chatError', "You're sending messages too quickly."); return; }
    socket.lastMsg = now;
    const v = validateUsername(t); // Reusing exact same filter logic
    if(!v.valid && v.msg){ socket.emit('chatError', "message was not sent"); return; }
    io.to(socket.lobby.code).emit('chatMsg', { id:socket.pid, name:socket.lobby.players[socket.pid].name, text:t });
  });

  socket.on('voteKick', targetId => {
    if(!socket.lobby || !socket.lobby.players[targetId] || targetId===socket.pid) return;
    const now=Date.now();
    if(socket.lastVote && now-socket.lastVote<180000) return; // 3 min cd
    socket.lastVote = now;
    
    const l = socket.lobby;
    if(!l.kickVotes[targetId]) l.kickVotes[targetId] = { voters:new Set(), started:now };
    if(now - l.kickVotes[targetId].started > 120000) { l.kickVotes[targetId].voters.clear(); l.kickVotes[targetId].started = now; } // 2 min decay
    
    l.kickVotes[targetId].voters.add(socket.pid);
    const count = l.kickVotes[targetId].voters.size;
    const total = Object.keys(l.players).length;
    const req = Math.max(1, Math.floor(total/2) + 1);
    const targetName = l.players[targetId].name;
    
    io.to(l.code).emit('sysMsg', { type:'sys-vote', text:\`\${socket.lobby.players[socket.pid].name} voted to kick \${targetName} (\${count}/\${req})\` });
    
    if(count >= req){
      io.to(l.code).emit('sysMsg', { type:'sys-kick', text:targetName+' was kicked.' });
      io.to(targetId).emit('kickedBan');
      const targetSocket = Array.from(io.sockets.sockets.values()).find(s => s.pid === targetId);
      if(targetSocket) { targetSocket.bannedFrom = l.code; targetSocket.banUntil = now + 600000; targetSocket.disconnect(true); }
      delete l.kickVotes[targetId];
    }
  });

  socket.on('toggleFan', () => { if(socket.lobby){ socket.lobby.fanOn = !socket.lobby.fanOn; io.to(socket.lobby.code).emit('syncFan', socket.lobby.fanOn); } });
  socket.on('toggleClockColor', data => { if(socket.lobby){ socket.lobby.clockColor = data.color; io.to(socket.lobby.code).emit('syncClockColor', socket.lobby.clockColor); } });

  socket.on('disconnect', () => {
    if(!socket.lobby) return;
    const name = socket.lobby.players[socket.pid].name;
    delete socket.lobby.players[socket.pid];
    delete socket.lobby.kickVotes[socket.pid]; // clear partial votes against them
    io.to(socket.lobby.code).emit('stateUpdate', socket.lobby.players);
    io.to(socket.lobby.code).emit('sysMsg', { type:'sys-leave', text:name+' left.' });
    bcastLobbies();
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log('Server running on port '+PORT));
