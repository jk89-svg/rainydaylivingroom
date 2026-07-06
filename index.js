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
<!-- GOOGLE ADSENSE — replace ca-pub-2352009046427964 with your publisher ID from adsense.google.com -->
<script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-2352009046427964" crossorigin="anonymous" onerror="this.setAttribute('data-blocked','1')"></script>
<script src="/socket.io/socket.io.js"></script>
<style>
@import url('https://fonts.googleapis.com/css2?family=Fredoka+One&family=Nunito:wght@400;600;700;800&display=swap');
*{box-sizing:border-box;margin:0;padding:0;}

/* ── CSS VARS for dark mode ── */
:root{
  /* ── Panel / card colours ── */
  --bg-card:rgba(255,255,255,.95);
  --bg-panel:rgba(255,255,255,.95);
  --bg-hdr:#FFF8E8;
  --bg-chat-even:#ffffff;
  --bg-chat-odd:#eeeeee;
  --text-main:#111;
  --text-sub:#555;
  --text-muted:#888;
  --border-soft:#D4A020;
  --lobby-bg:#FFF8E8;
  --lobby-border:#E8C870;
  --lobby-hover:#FFE8B0;
  --inp-bg:#fff;
  /* ── Orange / golden-yellow accent palette ── */
  --grad-a:#C86000;
  --grad-b:#D4A000;
  --grad-c:#A04400;
  --accent:#C86000;
  --accent-mid:#D4A000;
  --accent-dark:#A04400;
  --accent-darker:#7A3000;
  --accent-light:#E8B830;
  --accent-subtle:#FFF4E0;
  --accent-text:#B07000;
  --accent-you:#C88000;
}
body.dark{
  --bg-card:rgba(40,40,50,.97);
  --bg-panel:rgba(40,40,50,.97);
  --bg-hdr:#1a1a2a;
  --bg-chat-even:#2a2a38;
  --bg-chat-odd:#1e1e2c;
  --text-main:#eee;
  --text-sub:#aaa;
  --text-muted:#777;
  --border-soft:#555;
  --lobby-bg:#2a2a38;
  --lobby-border:#444;
  --lobby-hover:#3a3a50;
  --inp-bg:#2a2a38;
}

body{font-family:'Nunito',sans-serif;background:linear-gradient(135deg,var(--grad-a),var(--grad-b) 50%,var(--grad-c));min-height:100vh;display:flex;flex-direction:column;align-items:center;overflow-x:hidden;overflow-y:auto;}
body.game-active{overflow:hidden;}

/* ══ HOME ══ */
#homePage{display:flex;flex-direction:column;align-items:center;width:100%;min-height:100vh;padding:6px 8px 24px;overflow:visible;}
.logo{font-family:'Fredoka One',cursive;font-size:1.32rem;color:#fff;text-shadow:2px 2px 0 var(--accent-dark),4px 4px 6px rgba(0,0,0,.25);white-space:nowrap;}
.home-topbar{display:flex;align-items:center;justify-content:center;gap:14px;margin-bottom:6px;flex-shrink:0;}
.home-dm-wrap{display:flex;align-items:center;gap:4px;background:rgba(0,0,0,.25);border-radius:7px;padding:3px 6px;flex-shrink:0;}

/* 3-column home layout */
.home-3col{display:flex;gap:7px;width:100%;max-width:980px;flex:1;min-height:0;align-items:stretch;}
.home-col{display:flex;flex-direction:column;gap:6px;min-width:0;}
.col-left{width:220px;flex-shrink:0;}
.col-mid{flex:1;}
.col-right{width:220px;flex-shrink:0;}

.card{background:var(--bg-card);border-radius:12px;box-shadow:0 3px 14px rgba(0,0,0,.16);padding:9px 11px;flex-shrink:0;}
.card h3{font-family:'Fredoka One',cursive;color:var(--accent-dark);font-size:.78rem;margin-bottom:6px;text-align:center;}

.inp{width:100%;padding:5px 9px;border-radius:7px;border:2px solid var(--accent);font-family:'Nunito',sans-serif;font-size:.78rem;font-weight:700;outline:none;color:var(--text-main);background:var(--inp-bg);}
.inp:focus{border-color:var(--accent-dark);}

.opt-lbl{font-size:.6rem;font-weight:700;color:var(--text-sub);margin-bottom:2px;display:block;}

/* Skin arrow picker */
.skin-picker{display:flex;align-items:center;gap:4px;}
.skin-arrow{background:#1E9E4A;color:#fff;border:none;border-radius:5px;font-size:.95rem;width:22px;height:22px;cursor:pointer;display:flex;align-items:center;justify-content:center;font-weight:900;flex-shrink:0;}
.skin-arrow:hover{background:#157A38;}
.skin-swatch{width:32px;height:32px;border-radius:8px;border:2.5px solid #111;flex-shrink:0;}
.skin-name{font-family:'Fredoka One',cursive;font-size:.72rem;color:var(--text-main);flex:1;text-align:center;background:var(--bg-hdr);border-radius:6px;padding:2px 4px;border:1.5px solid var(--border-soft);}

/* Face arrow pickers */
.feat-picker{display:flex;align-items:center;gap:4px;justify-content:center;padding:2px 0;}
.feat-arrow{background:#1E9E4A;color:#fff;border:none;border-radius:5px;font-size:.9rem;width:22px;height:22px;cursor:pointer;display:flex;align-items:center;justify-content:center;font-weight:900;flex-shrink:0;}
.feat-arrow:hover{background:#157A38;}
.feat-label{font-family:'Fredoka One',cursive;font-size:.72rem;color:var(--text-main);flex:1;text-align:center;background:var(--bg-hdr);border-radius:6px;padding:2px 4px;border:1.5px solid var(--border-soft);min-width:60px;}

.divider{height:1px;background:linear-gradient(90deg,transparent,var(--border-soft),transparent);margin:4px 0;}

/* Center column — avatar */
.av-center{display:flex;flex-direction:column;align-items:center;gap:4px;}
#avCanvas{border-radius:12px;}

/* Play section */
.big-btn{width:100%;padding:7px;border-radius:8px;border:none;font-family:'Fredoka One',cursive;font-size:.82rem;cursor:pointer;transition:all .13s;margin-bottom:5px;}
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
.err-msg{background:#ffe0e0;color:#c00;border-radius:6px;padding:4px 8px;font-size:.68rem;font-weight:700;margin-bottom:5px;display:none;}

/* Lobby list */
.lobby-scroll{flex:1;overflow-y:auto;min-height:0;}
.lobby-scroll::-webkit-scrollbar{width:4px;}.lobby-scroll::-webkit-scrollbar-thumb{background:var(--accent-light);border-radius:2px;}
.lobby-item{display:flex;align-items:flex-start;justify-content:space-between;padding:5px 6px;border-radius:7px;background:var(--lobby-bg);border:1.5px solid var(--lobby-border);margin-bottom:4px;cursor:pointer;transition:all .12s;}
.lobby-item:hover{background:var(--lobby-hover);}
.lobby-item.lobby-full{cursor:default;opacity:.72;}
.lobby-item.lobby-full:hover{background:var(--lobby-bg);}
.lobby-avatars{display:flex;flex-wrap:wrap;gap:2px;margin-bottom:2px;}
.lobby-names{font-size:.56rem;font-weight:700;color:var(--text-sub);line-height:1.3;word-break:break-word;}
.lobby-code-txt{font-family:'Fredoka One',cursive;font-size:.74rem;color:var(--accent-dark);letter-spacing:2px;margin-top:1px;}
.lobby-cnt{font-size:.64rem;font-weight:700;color:var(--text-muted);text-align:right;flex-shrink:0;}
.lobby-full-tag{font-size:.52rem;font-weight:800;color:var(--accent-mid);}
.lobby-bar{height:3px;background:#eee;border-radius:2px;margin-top:2px;width:38px;overflow:hidden;}
.lobby-fill{height:100%;border-radius:2px;background:linear-gradient(90deg,var(--accent),var(--accent-mid));}
.no-lob{text-align:center;color:var(--text-muted);font-size:.68rem;padding:8px 0;}
.rules-txt{font-size:.59rem;color:var(--text-sub);line-height:1.5;}.rules-txt p{margin-bottom:2px;}

/* Dark mode toggle */
.dm-toggle-wrap{display:flex;align-items:center;gap:5px;margin-top:auto;padding-top:4px;}
.dm-lbl{font-size:.6rem;font-weight:700;color:var(--text-sub);}
.dm-switch{position:relative;width:32px;height:18px;flex-shrink:0;}
.dm-switch input{opacity:0;width:0;height:0;}
.dm-slider{position:absolute;inset:0;background:#E14444;border-radius:18px;cursor:pointer;transition:background .2s;}
.dm-slider::before{content:'';position:absolute;width:14px;height:14px;left:2px;top:2px;background:#fff;border-radius:50%;transition:transform .2s;}
input:checked+.dm-slider{background:#1E9E4A;}
input:checked+.dm-slider::before{transform:translateX(14px);}

/* ══ GAME ══ */
#gamePage{display:none;position:fixed;inset:0;z-index:200;flex-direction:row;gap:3px;padding:8px;box-sizing:border-box;background:rgba(0,0,0,.18);align-items:center;justify-content:center;overflow:hidden;}

#playerPanel{width:138px;flex-shrink:0;background:var(--bg-panel);border-radius:10px;display:flex;flex-direction:column;overflow:hidden;}
.panel-title{font-family:'Fredoka One',cursive;font-size:.75rem;color:var(--accent-dark);padding:5px 7px 4px;border-bottom:2px solid var(--border-soft);text-align:center;background:var(--bg-hdr);flex-shrink:0;}
#playerList{flex:1;overflow-y:auto;padding:4px;}
#playerList::-webkit-scrollbar{width:3px;}#playerList::-webkit-scrollbar-thumb{background:var(--accent-light);border-radius:2px;}
.p-entry{display:flex;align-items:center;gap:4px;padding:3px 4px;border-radius:7px;cursor:pointer;transition:background .12s;margin-bottom:0;}
.p-entry:nth-child(odd){background:rgba(0,0,0,.03);}
.p-entry:nth-child(even){background:rgba(0,0,0,.08);}
body.dark .p-entry:nth-child(odd){background:rgba(0,0,0,.35);}
body.dark .p-entry:nth-child(even){background:rgba(255,255,255,.06);}
.p-entry:hover{background:var(--accent-subtle);}.p-entry.muted{opacity:.5;}
body.dark .p-entry:hover{background:#3a3a50;}
.p-name-wrap{flex:1;min-width:0;}
.p-name{font-size:.72rem;font-weight:800;color:var(--text-main);white-space:normal;overflow-wrap:break-word;word-break:break-word;line-height:1.15;}
.p-you{font-size:.57rem;color:var(--accent-mid);font-weight:800;display:block;}

#roomWrap{flex:0 0 auto;display:flex;flex-direction:column;min-width:0;gap:3px;}
#roomHdr{display:flex;align-items:center;justify-content:space-between;background:var(--bg-panel);border-radius:10px;padding:3px 7px;flex-shrink:0;}
.rc-display{font-family:'Fredoka One',cursive;font-size:.72rem;color:var(--accent-dark);letter-spacing:2px;}
.lobby-count-badge{font-size:.6rem;font-weight:700;color:var(--text-sub);background:var(--bg-hdr);border-radius:6px;padding:2px 6px;border:1px solid var(--border-soft);}
#muteBtn{background:none;border:1.5px solid var(--accent);border-radius:7px;font-size:.8rem;cursor:pointer;padding:2px 5px;line-height:1;}
#muteBtn:hover{background:var(--accent);}
#leaveBtn{background:#ff4444;color:#fff;border:none;border-radius:7px;font-family:'Fredoka One',cursive;font-size:.66rem;cursor:pointer;padding:3px 8px;margin-left:4px;}
#leaveBtn:hover{background:#cc0000;}

#livingRoom{flex:1;min-height:0;min-width:0;display:flex;align-items:center;justify-content:center;position:relative;}
/* #roomBox is sized natively by the browser's aspect-ratio engine — this
   single CSS rule is what GUARANTEES identical proportions on every
   device/browser, since it's the browser's own spec-compliant layout
   math doing the "fit largest box that keeps 640:400 ratio" computation,
   not custom JS arithmetic that can drift or bug out per-browser. */
#roomBox{position:relative;border-radius:10px;background:#2a3a6a;container-type:inline-size;container-name:room;flex-shrink:0;}
#roomClip{position:absolute;inset:0;overflow:hidden;border-radius:10px;}
#roomSvg{width:100%;height:100%;display:block;}
#rainCanvas{position:absolute;top:0;left:0;width:100%;height:100%;pointer-events:none;z-index:5;}
/* Avatar overlay sits OUTSIDE the clipped layer so nametags for edge
   seats are never chopped off by the room's rounded-corner clipping. */
#avatarLayer{position:absolute;inset:0;pointer-events:none;z-index:6;}
.avatar-wrap{position:absolute;display:flex;flex-direction:column;align-items:center;transform:translate(-50%,-100%);}
.avatar-wrap canvas{width:9.4cqw;height:11.25cqw;display:block;}
.avatar-nametag{margin-top:.3cqw;font-family:'Nunito',sans-serif;font-weight:800;font-size:1.5cqw;line-height:1.3;white-space:nowrap;background:rgba(255,255,255,.95);border-radius:.8cqw;padding:.35cqw 1cqw;border:.18cqw solid #bbb;color:#222;box-shadow:0 1px 4px rgba(0,0,0,.15);}
.avatar-nametag.is-me{border-color:var(--accent);color:var(--accent-you,#0E5C42);}
/* Fallback sizing for the rare browser without container-query support:
   degrades gracefully to viewport-relative units (still proportional). */
@supports not (container-type:inline-size){
  .avatar-wrap canvas{width:8.6vw;height:10.3vw;}
  .avatar-nametag{font-size:1.05vw;padding:.3vw .8vw;border-width:.15vw;border-radius:.6vw;}
}

/* Dark mode switch + volume slider in bottom-left of living room */
#dmInGame{position:absolute;bottom:6px;left:8px;z-index:30;display:flex;align-items:center;gap:4px;background:rgba(0,0,0,.35);border-radius:8px;padding:3px 6px;flex-wrap:nowrap;}
.dm-ing-lbl{font-size:.55rem;color:#ddd;font-weight:700;flex-shrink:0;}
#volSlider{width:54px;height:13px;flex-shrink:0;accent-color:var(--accent-light);cursor:pointer;vertical-align:middle;}
.vol-sep{width:1px;height:14px;background:rgba(255,255,255,.25);margin:0 2px;flex-shrink:0;}

/* Leave confirm overlay (inside living room) */
#leaveConfirm{display:none;position:absolute;inset:0;z-index:40;background:rgba(0,0,0,.55);align-items:center;justify-content:center;border-radius:10px;}
.lc-box{background:#fff;border-radius:14px;padding:20px 28px;text-align:center;box-shadow:0 6px 28px rgba(0,0,0,.3);}
.lc-box h3{font-family:'Fredoka One',cursive;font-size:1.1rem;color:#333;margin-bottom:6px;}
.lc-box p{font-size:.8rem;color:#666;margin-bottom:14px;}
.lc-btns{display:flex;gap:10px;justify-content:center;}
.lc-yes{background:#ff4444;color:#fff;border:none;border-radius:8px;font-family:'Fredoka One',cursive;font-size:.88rem;padding:7px 20px;cursor:pointer;}
.lc-no{background:#1E9E4A;color:#fff;border:none;border-radius:8px;font-family:'Fredoka One',cursive;font-size:.88rem;padding:7px 20px;cursor:pointer;}

#chatPanel{width:175px;flex-shrink:0;background:var(--bg-panel);border-radius:10px;display:flex;flex-direction:column;overflow:hidden;}
.chat-title{font-family:'Fredoka One',cursive;font-size:.75rem;color:var(--accent-dark);padding:5px 7px 4px;border-bottom:2px solid var(--border-soft);text-align:center;background:var(--bg-hdr);flex-shrink:0;}
#chatMsgs{flex:1;overflow-y:auto;display:flex;flex-direction:column;}
#chatMsgs::-webkit-scrollbar{width:3px;}#chatMsgs::-webkit-scrollbar-thumb{background:var(--accent-light);border-radius:2px;}

/* Alternating chat rows */
.cmsg{font-size:.74rem;line-height:1.38;word-break:break-word;color:var(--text-main);padding:4px 8px;}
.cmsg-even{background:var(--bg-chat-even);}
.cmsg-odd{background:var(--bg-chat-odd);}
.cmsg .sname{font-weight:800;color:var(--text-main);}
.cmsg .mbody{font-weight:700;color:var(--text-main);}
.sys-join{color:#1a7a1a;font-weight:700;font-size:.67rem;}
.sys-leave{color:#c00;font-weight:700;font-size:.67rem;}
.sys-kick{color:#c00;font-weight:800;font-size:.67rem;}
.sys-vote{color:var(--accent-text);font-weight:700;font-size:.65rem;font-style:italic;}
.msg-blocked{color:#cc0000!important;font-weight:800!important;font-size:.65rem!important;font-style:italic;background:#ffe8e8;border-radius:4px;margin:2px 4px;padding:3px 7px;border-left:3px solid #cc0000;}
body.dark .sys-join{color:#5ddd5d;}
body.dark .sys-leave{color:#ff6666;}
body.dark .sys-kick{color:#ff6666;}
body.dark .sys-vote{color:#F0C040;}

#chatInpRow{display:flex;gap:3px;padding:5px;border-top:2px solid var(--border-soft);flex-shrink:0;background:var(--bg-hdr);}
#chatInp{flex:1;border:1.5px solid var(--accent-light);border-radius:7px;padding:4px 6px;font-family:'Nunito',sans-serif;font-size:.72rem;font-weight:600;outline:none;min-width:0;color:var(--text-main);background:var(--inp-bg);}
#chatInp:focus{border-color:var(--accent-dark);}
#chatSend{background:#1E9E4A;color:#fff;border:none;border-radius:7px;font-size:.76rem;padding:4px 8px;cursor:pointer;font-weight:700;flex-shrink:0;}
#chatSend:hover{background:#157A38;}

#ctxMenu{position:fixed;background:var(--bg-panel);border:2px solid var(--accent);border-radius:9px;box-shadow:0 4px 20px rgba(0,0,0,.2);z-index:1000;padding:4px;display:none;min-width:115px;}
.ctx-name{font-family:'Fredoka One',cursive;font-size:.75rem;color:var(--accent-dark);padding:4px 8px 3px;border-bottom:1px solid var(--border-soft);margin-bottom:3px;}
.ctx-item{padding:5px 9px;border-radius:6px;cursor:pointer;font-size:.72rem;font-weight:700;color:var(--text-main);}
.ctx-item:hover{background:var(--accent-subtle);}.ctx-danger{color:#c00;}.ctx-danger:hover{background:#ffe0e0;}
body.dark .ctx-item:hover{background:#3a3a50;}

.bubble{position:absolute;background:rgba(255,255,255,.97);border:.4cqw solid var(--accent);border-radius:1.6cqw;padding:.7cqw 1.4cqw;font-size:1.55cqw;font-weight:800;color:#111;max-width:22cqw;word-break:break-word;text-align:center;pointer-events:none;box-shadow:0 2px 10px rgba(0,0,0,.18);z-index:20;transform:translate(-50%,-100%);}

to{transform:translateX(-50%) scale(1);opacity:1;}}

#kickNotice{display:none;position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,.7);z-index:99999;align-items:center;justify-content:center;}
.kick-box{background:#fff;border-radius:16px;padding:24px 28px;text-align:center;box-shadow:0 8px 32px rgba(0,0,0,.3);max-width:300px;}
.kick-box h2{font-family:'Fredoka One',cursive;color:#c00;font-size:1.3rem;margin-bottom:7px;}
.kick-box p{font-size:.85rem;color:#444;margin-bottom:14px;line-height:1.5;}
.kick-box button{background:var(--accent);color:#fff;border:none;border-radius:9px;font-family:'Fredoka One',cursive;font-size:.95rem;padding:8px 22px;cursor:pointer;}

/* Disconnect overlay */
.dc-box{background:#fff;border-radius:16px;padding:24px 28px;text-align:center;box-shadow:0 8px 32px rgba(0,0,0,.35);max-width:300px;}
.dc-icon{font-size:2.8rem;margin-bottom:10px;}
.dc-box h2{font-family:'Fredoka One',cursive;color:#c00;font-size:1.2rem;margin-bottom:7px;}
.dc-box p{font-size:.82rem;color:#444;margin-bottom:14px;line-height:1.5;}
.dc-box button{background:var(--accent);color:#fff;border:none;border-radius:9px;font-family:'Fredoka One',cursive;font-size:.92rem;padding:8px 22px;cursor:pointer;}
body.dark .dc-box{background:#2a2a3a;}.body.dark .dc-box h2{color:#ff6666;}body.dark .dc-box p{color:#ccc;}

/* Adsense banner slot */
#adsense-home-bottom{width:100%;max-width:728px;min-height:50px;margin:6px auto 0;flex-shrink:0;text-align:center;}
#rotateMsg{display:none;position:fixed;inset:0;z-index:9999;background:linear-gradient(135deg,var(--grad-a),var(--grad-b));flex-direction:column;align-items:center;justify-content:center;text-align:center;padding:30px;}
#rotateMsg .r-icon{font-size:3.5rem;margin-bottom:16px;animation:spin 2s linear infinite;}
#rotateMsg h2{font-family:'Fredoka One',cursive;font-size:1.5rem;color:#fff;text-shadow:2px 2px 0 var(--accent-dark);margin-bottom:8px;}
#rotateMsg p{font-size:.9rem;color:rgba(255,255,255,.9);font-weight:700;}
@keyframes spin{0%{transform:rotate(0deg);}50%{transform:rotate(90deg);}100%{transform:rotate(90deg);}}
/* ── Responsive breakpoints: ALL devices, ALL browsers ── */
@media(max-width:600px){
  #playerPanel{width:90px!important;}#chatPanel{width:110px!important;}
  .p-name{font-size:.55rem;}.panel-title,.chat-title{font-size:.58rem;}
  #roomHdr{padding:3px 5px;}.rc-display{font-size:.62rem;}
}
@media(max-width:900px){
  .col-left,.col-right{width:160px;}
  #playerPanel{width:115px;}#chatPanel{width:145px;}
  .home-3col{gap:5px;}
  .logo{font-size:1.2rem;}
  .p-name{font-size:.66rem;}
  .panel-title,.chat-title{font-size:.68rem;}
}
@media(max-width:700px){
  /* Stack columns vertically so users can scroll on small screens */
  .home-3col{flex-direction:column;align-items:center;}
  .home-col,.col-left,.col-right{width:100%;max-width:560px;}
  .col-mid{width:100%;max-width:560px;}
  .logo{font-size:1.05rem;}
}
@media(max-width:560px){
  #playerPanel{width:94px;}#chatPanel{width:115px;}
  .p-name{font-size:.58rem;}
  .panel-title,.chat-title{font-size:.6rem;}
  .logo{font-size:.9rem;}
}
/* Landscape phone specific */
@media(max-height:500px) and (orientation:landscape){
  #playerPanel{width:90px;}#chatPanel{width:110px;}
  .p-name{font-size:.55rem;}
}

/* ── Holiday theme toggle button ── */



/* ── Theme info block in Play card ── */


/* ── In-game ad slot (below chat input, non-blocking) ── */
#adsense-ingame{width:100%;min-height:50px;flex-shrink:0;text-align:center;overflow:hidden;background:transparent;}
/* ── Home top ad slot ── */
#adsense-home-top{width:100%;max-width:728px;max-height:90px;min-height:0;overflow:hidden;flex-shrink:0;text-align:center;margin-bottom:4px;}
</style>
</head>
<body>

<!-- Rotate to landscape overlay -->
<div id="rotateMsg">
  <div class="r-icon">📱</div>
  <h2>Rotate Your Device!</h2>
  <p>Rainy Day Living Room is designed for landscape mode.<br>Please rotate your phone or tablet sideways to play.</p>
</div>

<!-- HOME -->
<div id="homePage">
  <div class="home-topbar">
    <div class="logo">🌧️ Rainy Day Living Room</div>
    <div class="home-dm-wrap">
      <span class="dm-ing-lbl" style="color:rgba(255,255,255,.85);font-size:.55rem;font-weight:700;">☀</span>
      <label class="dm-switch"><input type="checkbox" id="dmToggleHome" onchange="toggleDark(this.checked)"><span class="dm-slider"></span></label>
      <span class="dm-ing-lbl" style="color:rgba(255,255,255,.85);font-size:.55rem;font-weight:700;">🌙</span>
    </div>
  </div>
  <div class="home-3col">

    <!-- LEFT: Rules -->
    <div class="home-col col-left">
      <div class="card" style="flex:1;overflow:hidden;">
        <h3>📋 Rules & Legal</h3>
        <div class="rules-txt" style="overflow-y:auto;max-height:calc(100% - 30px);">
          <p style="font-weight:800;color:var(--text-main);margin-bottom:3px;">Community Rules</p>
          <p>✅ Be respectful to all players — no harassment, bullying, hate speech, racism, or discrimination of any kind.</p>
          <p>✅ Keep chat family-friendly at all times. This game is open to all ages including minors.</p>
          <p>✅ No sharing of personal information (real names, addresses, phone numbers, social media) in chat.</p>
          <p>✅ No spam, flooding, or repetitive messages.</p>
          <p>✅ No impersonation of other players or staff.</p>
          <p>✅ No threats, violence, self-harm references, or dangerous content.</p>
          <p>✅ Use vote kick fairly — abusing it may result in your own removal.</p>
          <p>✅ No advertising other websites, games, or services in chat.</p>
          <p style="font-weight:800;color:var(--text-main);margin-top:5px;margin-bottom:3px;">Legal & Privacy</p>
          <p>✅ Rainy Day Living Room is a free, independent hobby project with no commercial affiliation.</p>
          <p>✅ No real money, purchases, gambling, loot boxes, or microtransactions of any kind exist in this game.</p>
          <p>✅ No personal data is collected, stored, or sold. Your username and avatar only exist for the duration of your session and are deleted when you leave.</p>
          <p>✅ No cookies, tracking pixels, analytics, or advertising of any kind are used.</p>
          <p>✅ All game assets (graphics, code, sounds) are original works created for this project. No third-party copyrighted material is used.</p>
          <p>✅ Chat messages are not logged or retained after your session ends.</p>
          <p>✅ <strong>Age Requirement:</strong> This game is for users 13 and older and is not directed at children under 13. Users under 13 require verifiable parental consent (COPPA, April 2026 amended rule).</p>
          <p>✅ <strong>Cookies &amp; Ads:</strong> Google AdSense serves ads on this site using cookies for ad personalization. By using this site you consent. Opt out: <em>g.co/adsettings</em>. No other tracking is used.</p>
          <p>✅ <strong>User Content:</strong> Chat is filtered automatically. This platform is protected under 47 U.S.C. § 230. The operator is not liable for user-generated content.</p>
          <p>✅ <strong>GDPR / EU:</strong> No personal data is collected or stored. Session usernames are deleted when you leave. Ad cookies are managed solely by Google (policies.google.com).</p>
          <p>✅ <strong>CCPA / California:</strong> This site does not sell personal information. Advertising data is managed by Google under Google’s privacy framework.</p>
          <p>✅ Players are solely responsible for the content of their own chat messages. The operator is not liable for user-generated content.</p>
          <p>✅ By playing you agree to these rules. Violations may result in removal from the game session.</p>
          <p>✅ This service is provided as-is with no guarantee of availability, uptime, or data retention.</p>
          <p>✅ The operator reserves the right to shut down, modify, or restrict access to this service at any time without notice.</p>
          <p style="margin-top:5px;color:var(--text-muted);font-size:.55rem;">© 2026 Rainy Day Living Room. All rights reserved. Independent project — not affiliated with any company or brand. For concerns contact the operator directly.</p>
        </div>
      </div>
    </div>

    <!-- MIDDLE: Character + Play -->
    <div class="home-col col-mid">
      <div class="card">
        <h3>🎮 Your Profile</h3>
        <input id="nameInp" class="inp" type="text" placeholder="Username..." maxlength="16" style="margin-bottom:3px;" oninput="liveCheckName(this.value)">
        <div id="nameValidMsg" class="name-valid-msg"></div>
        <div class="av-center">
          <!-- Avatar with arrows on sides -->
          <div style="display:flex;align-items:center;gap:6px;">
            <!-- Left arrows: skin prev, eyes prev, mouth prev, hat prev -->
            <div style="display:flex;flex-direction:column;gap:4px;align-items:center;">
              <button class="feat-arrow" onclick="prevSkin()" title="Skin">◀</button>
              <button class="feat-arrow" onclick="prev('eyes')" title="Eyes">◀</button>
              <button class="feat-arrow" onclick="prev('mouth')" title="Mouth">◀</button>
              <button class="feat-arrow" onclick="prev('hat')" title="Hat">◀</button>
            </div>
            <canvas id="avCanvas" width="110" height="130"></canvas>
            <!-- Right arrows -->
            <div style="display:flex;flex-direction:column;gap:4px;align-items:center;">
              <button class="feat-arrow" onclick="nextSkin()" title="Skin">▶</button>
              <button class="feat-arrow" onclick="next('eyes')" title="Eyes">▶</button>
              <button class="feat-arrow" onclick="next('mouth')" title="Mouth">▶</button>
              <button class="feat-arrow" onclick="next('hat')" title="Hat">▶</button>
            </div>
          </div>
          <!-- Labels below avatar -->
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:3px;width:100%;max-width:200px;">
            <div style="text-align:center;"><div class="opt-lbl" style="text-align:center">Skin</div><div class="feat-label" id="skinLbl" style="font-size:.65rem;padding:1px 4px;"></div></div>
            <div style="text-align:center;"><div class="opt-lbl" style="text-align:center">Eyes</div><div class="feat-label" id="eyesLbl" style="font-size:.65rem;padding:1px 4px;"></div></div>
            <div style="text-align:center;"><div class="opt-lbl" style="text-align:center">Mouth</div><div class="feat-label" id="mouthLbl" style="font-size:.65rem;padding:1px 4px;"></div></div>
            <div style="text-align:center;"><div class="opt-lbl" style="text-align:center">Hat</div><div class="feat-label" id="hatLbl" style="font-size:.65rem;padding:1px 4px;"></div></div>
          </div>
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
        <p class="tagline-txt">Bored? Join this game to socialize and relax! It's a rainy day in the living room, so use your imagination and find something creative to do. Keep things fun, engaging, and entertaining for everyone.</p>
        <p class="tagline-txt" style="margin-top:5px;">👆 Tap any player's name on the player list to mute or vote kick them.</p>
        
      </div>
    </div>

    <!-- RIGHT: Lobbies -->
    <div class="home-col col-right">
      <div class="card" style="flex:1;display:flex;flex-direction:column;overflow:hidden;min-height:0;">
        <h3>🏠 All Lobbies <span style="font-size:.54rem;color:var(--text-muted);font-weight:400">(live)</span></h3>
        <div class="lobby-scroll"><div id="lobbyList"><div class="no-lob">No open lobbies — be the first!</div></div></div>
      </div>
    </div>

  </div>

  <!-- ═══════════════════════════════════════════════════════════
       GOOGLE ADSENSE BANNER
       STEP 1: Replace ca-pub-2352009046427964 with YOUR publisher ID
               (found at adsense.google.com → Account → Publisher ID)
       STEP 2: Replace YOUR_TOP_SLOT_ID (top ad) and YOUR_BOTTOM_SLOT_ID (bottom ad)
               with your two different slot IDs from adsense.google.com → Ads → By ad unit
       ═══════════════════════════════════════════════════════════ -->
  <div id="adsense-home-bottom">
    <ins class="adsbygoogle"
         style="display:block;width:100%;max-width:728px;"
         data-ad-client="ca-pub-2352009046427964"
         data-ad-slot="YOUR_BOTTOM_SLOT_ID"
         data-ad-format="auto"
         data-full-width-responsive="true"></ins>
    <script>try{(adsbygoogle = window.adsbygoogle || []).push({});}catch(e){}</script>
  </div>

</div>

<!-- GAME -->
<div id="gamePage">
  <div id="playerPanel">
    <div class="panel-title">Players</div>
    <div id="playerList"></div>
  </div>
  <div id="roomWrap">
    <div id="roomHdr">
      <div style="display:flex;align-items:center;gap:8px;">
        <div><div style="font-size:.52rem;color:var(--text-muted);font-weight:700;">ROOM</div><div class="rc-display" id="rcDisp">-----</div></div>
        <div class="lobby-count-badge" id="lobbyCnt">1/8</div>
      </div>
      <div style="display:flex;gap:5px;align-items:center;margin-left:auto;">
        <span class="dm-ing-lbl" style="color:var(--text-muted);">☀</span>
        <label class="dm-switch"><input type="checkbox" id="dmToggleGame" onchange="toggleDark(this.checked)"><span class="dm-slider"></span></label>
        <span class="dm-ing-lbl" style="color:var(--text-muted);">🌙</span>
        <span id="volMuteBtn" onclick="toggleVolMute()" title="Mute/Unmute" style="cursor:pointer;font-size:.9rem;line-height:1;user-select:none;padding:1px 2px;">🔈</span>
        <input id="volSlider" type="range" min="0" max="100" value="70" oninput="setVolume(this.value)" title="Volume" style="width:50px;height:12px;accent-color:var(--accent-light);cursor:pointer;vertical-align:middle;">
        <button id="leaveBtn" onclick="askLeave()">✕ Leave</button>
      </div>
    </div>
    <div id="livingRoom">
     <div id="roomBox">
      <div id="roomClip">
        <canvas id="rainCanvas"></canvas>
        <svg id="roomSvg" viewBox="0 0 640 400" xmlns="http://www.w3.org/2000/svg"></svg>
      </div>
      <!-- Avatars + nametags: plain HTML overlay, percentage-positioned.
           This is the fix for players appearing to "float off the couch"
           on Safari/iOS — the old approach drew avatars via SVG
           <foreignObject> wrapping an HTML <canvas>, which Safari/WebKit
           has long-standing bugs scaling correctly. Percentage-based CSS
           positioning of plain HTML elements has zero such bugs on any
           browser, so avatars are now guaranteed to land on the couch
           the same way everywhere. -->
      <div id="avatarLayer"></div>
      <!-- Leave confirm overlay -->
      <div id="leaveConfirm">
        <div class="lc-box">
          <h3>Leave Lobby?</h3>
          <p>Are you sure you want to leave?</p>
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
    <div id="adsense-chat" style="width:100%;flex-shrink:0;overflow:hidden;min-height:0;max-height:0;text-align:center;">
      <ins class="adsbygoogle" style="display:block;width:100%;"
           data-ad-client="ca-pub-2352009046427964"
           data-ad-slot="YOUR_CHAT_SLOT_ID"
           data-ad-format="auto" data-full-width-responsive="true"></ins>
      <script>try{(adsbygoogle=window.adsbygoogle||[]).push({});}catch(e){}</script>
    </div>
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

<!-- Age gate + cookie consent — shown once on first visit -->
<div id="ageGate" style="display:none;position:fixed;inset:0;background:rgba(0,0,0,.75);z-index:9000;align-items:center;justify-content:center;">
  <div style="background:#fff;border-radius:16px;padding:28px 30px;max-width:360px;text-align:center;box-shadow:0 8px 32px rgba(0,0,0,.35);">
    <div style="font-size:2rem;margin-bottom:10px;">🛋️</div>
    <h2 style="font-family:'Fredoka One',cursive;color:var(--accent-dark);font-size:1.2rem;margin-bottom:8px;">Welcome to Rainy Day Living Room</h2>
    <p style="font-size:.78rem;color:#444;line-height:1.55;margin-bottom:12px;">This site displays ads via <strong>Google AdSense</strong> (cookies used for ad personalization). Chat is automatically filtered. No personal data is collected or stored. Children should have parental awareness when using chat features.</p>
    <p style="font-size:.68rem;color:#888;margin-bottom:16px;">See our <strong>Rules &amp; Legal</strong> section on the home page for our full privacy policy and terms.</p>
    <button onclick="acceptAgeGate()" style="background:var(--accent);color:#fff;border:none;border-radius:9px;font-family:'Fredoka One',cursive;font-size:1rem;padding:10px 28px;cursor:pointer;width:100%;">Enter the Living Room →</button>
  </div>
</div>

<!-- Disconnect overlay -->
<div id="disconnectOverlay" style="display:none;position:fixed;inset:0;background:rgba(0,0,0,.78);z-index:600;align-items:center;justify-content:center;">
  <div class="dc-box">
    <div class="dc-icon">📡</div>
    <h2>Connection Lost</h2>
    <p>You lost connection to the server.<br>You've been returned to the home screen.</p>
    <button onclick="dismissDisconnect()">← Back to Home</button>
  </div>
</div>

<div id="kickNotice" style="display:none">
  <div class="kick-box">
    <h2>🚫 Kicked</h2>
    <p id="kickMsg">You cannot rejoin for 10 minutes.</p>
    <button onclick="dismissKick()" style="background:var(--accent);color:#fff;border:none;border-radius:9px;font-family:'Fredoka One',cursive;font-size:.95rem;padding:8px 22px;cursor:pointer;">✕ Close</button>
  </div>
</div>

<script>
// ═══════════════════════════════════════
//  USERNAME VALIDATION
//  Real-time feedback — green = good, red = blocked
// ═══════════════════════════════════════
const USERNAME_BAD_TERMS = [
  // Racial & ethnic slurs
  'nigger','nigga','nigg','n1gg','niga','nigar',
  'chink','chinc','gook','zipperhead','slant','slanteye',
  'spic','spick','beaner','wetback',
  'kike','hymie','heeb',
  'cracker','honky','whitey',
  'towelhead','raghead','sandnigger','cameljockey',
  'paki','pakis','jap','japs','redskin','injun',
  'coon','sambo','darkie','darky',
  'gringo','wop','dago','polack','mick','cholo',
  // Homophobic / transphobic
  'faggot','fagot','fag','dyke','tranny','trannies',
  'shemale','heshe','ladyboy','sissy',
  // Misogynistic
  'cunt','whore','slut','skank','thot','twat',
  // Sexual
  'porn','porno','xxx','hentai','nsfw',
  'penis','vagina','cock','dick','pussy',
  'boob','tits','titties','titty',
  'cum','rape','molest','pedophile','pedo','loli',
  // Violence / hate
  'kys','killurself','killyourself',
  'neonazi','nsdap','hitlersass','hitlerass','seigheil','siegheil',
  'whitepower','kkk','kkkmember',
  // Drugs
  'heroin','cocaine','methamphetamine','fentanyl',
  // Reserved / impersonation
  'system','admin','administrator','moderator','mod','staff','bot',
  'official','owner','operator',
];

function normUsername(s){
  return s.toLowerCase()
    .normalize('NFD').replace(/[\\u0300-\\u036f]/g,'')
    .replace(/[@]/g,'a').replace(/[4]/g,'a')
    .replace(/[3]/g,'e').replace(/[€]/g,'e')
    .replace(/[1!|]/g,'i').replace(/[0]/g,'o')
    .replace(/[$5]/g,'s').replace(/[7]/g,'t')
    .replace(/[+]/g,'t').replace(/[8]/g,'b')
    .replace(/\\s+/g,'').replace(/[^a-z0-9]/g,'');
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
    inp.classList.remove('name-ok','name-bad');
    msg.style.display='none';
  } else if(valid){
    inp.classList.remove('name-bad');inp.classList.add('name-ok');
    msg.className='name-valid-msg valid';msg.textContent=txt;msg.style.display='block';
  } else {
    inp.classList.remove('name-ok');inp.classList.add('name-bad');
    msg.className='name-valid-msg invalid';msg.textContent=txt;msg.style.display='block';
  }
  saveP();
}

// ═══════════════════════════════════════
//  EXTENSION / AD-BLOCKER HARDENING
//  Some browser extensions (ad blockers, "annoyance" filter
//  lists, privacy tools) automatically hide fixed-position,
//  semi-transparent, high-z-index elements because that's the
//  visual signature of a popup ad — even though our overlays
//  (kick notice, disconnect notice) are core gameplay UI, not
//  ads. forceShow() sets display with !important (which beats
//  any external stylesheet rule an extension injects) and
//  re-asserts it for 1.5s in case the extension's hiding rule
//  is applied on a delay.
// ═══════════════════════════════════════
function forceShow(el,val){
  if(!el)return;
  el.style.setProperty('display',val,'important');
  let n=0;
  const iv=setInterval(()=>{
    el.style.setProperty('display',val,'important');
    if(++n>15)clearInterval(iv);
  },100);
}
function forceHide(el){
  if(!el)return;
  el.style.setProperty('display','none','important');
}

// ═══════════════════════════════════════
//  AGE GATE
// ═══════════════════════════════════════
(function(){
  if(!localStorage.getItem('cg_age_ok')){
    document.getElementById('ageGate').style.display='flex';
  }
})();
function acceptAgeGate(){
  localStorage.setItem('cg_age_ok','1');
  document.getElementById('ageGate').style.display='none';
}

// ═══════════════════════════════════════
//  KICK NOTICE — shown on fresh page load after a hard-reload kick.
//  Checked at the very top of execution, same reliable pattern as
//  the age gate above. This is what GUARANTEES the notice appears:
//  it runs before the socket connects, before any game state exists,
//  on a completely fresh page — nothing can interfere with it.
// ═══════════════════════════════════════
(function(){
  try{
    const raw = localStorage.getItem('cg_kicked_notice');
    if(!raw) return;
    localStorage.removeItem('cg_kicked_notice'); // one-time show
    const data = JSON.parse(raw);
    // Ignore stale flags older than 30s (e.g. from a previous session
    // that never got a chance to display it, to avoid ever re-showing
    // an old kick message on an unrelated later visit)
    if(!data || Date.now() - data.shownAt > 30000) return;
    window._kickedFromCode = data.lobbyCode;
    window._kickedUntil = data.until;
    // The kickNotice element already exists in the DOM at this point —
    // this script runs near the end of <body>, after all HTML above it
    // (including #kickNotice) has already been parsed. No need to wait
    // for any event; setting it directly here is the most reliable option.
    const kn = document.getElementById('kickNotice');
    const km = document.getElementById('kickMsg');
    if(km) km.textContent = 'You were kicked from this lobby. You cannot rejoin it for 10 minutes — but you can join any other lobby.';
    if(kn) kn.style.display = 'flex';
  }catch(e){}
})();

// ═══════════════════════════════════════
//  ROOM SIZING
// ═══════════════════════════════════════
const ROOM_RATIO=640/400;
const ROOM_MAX_W=780, ROOM_MAX_H=488;
function sizeRoom(){
  const gp=document.getElementById('gamePage');
  if(!gp||gp.style.display==='none')return;
  const pp=document.getElementById('playerPanel'),cp=document.getElementById('chatPanel');
  const rw=document.getElementById('roomWrap'),rh=document.getElementById('roomHdr');
  const box=document.getElementById('roomBox');
  if(!box)return;
  const ppW=pp?pp.offsetWidth||138:138,cpW=cp?cp.offsetWidth||175:175;
  const HDR=rh?rh.offsetHeight||32:32,VGAP=3,HGAPS=6,PAD=16;
  const availW=window.innerWidth,availH=window.innerHeight;
  let rW=Math.min(ROOM_MAX_W,availW-ppW-cpW-HGAPS-PAD);
  let rH=rW/ROOM_RATIO;
  const maxH=Math.min(ROOM_MAX_H,availH-HDR-VGAP-PAD);
  if(rH>maxH){rH=maxH;rW=rH*ROOM_RATIO;}
  rW=Math.round(rW);rH=Math.round(rH);
  box.style.width=rW+'px';box.style.height=rH+'px';
  if(rw)rw.style.width=rW+'px';
  const totalH=HDR+VGAP+rH;
  if(pp){pp.style.height=totalH+'px';pp.style.maxHeight=totalH+'px';}
  if(cp){cp.style.height=totalH+'px';cp.style.maxHeight=totalH+'px';}
  const canvas=document.getElementById('rainCanvas');
  if(canvas&&(canvas.width!==rW||canvas.height!==rH)){canvas.width=rW;canvas.height=rH;}
}
window.addEventListener('resize',sizeRoom);
window.addEventListener('orientationchange',()=>setTimeout(sizeRoom,60));
(function(){
  if(typeof ResizeObserver==='undefined')return;
  const box=document.getElementById('roomBox');
  if(!box)return;
  new ResizeObserver(entries=>{
    const e=entries[0]; if(!e) return;
    const w=Math.round(e.contentRect.width), h=Math.round(e.contentRect.height);
    const canvas=document.getElementById('rainCanvas');
    if(canvas&&w>0&&h>0&&(canvas.width!==w||canvas.height!==h)){canvas.width=w;canvas.height=h;}
  }).observe(box);
})();

// ═══════════════════════════════════════
//  DARK MODE
// ═══════════════════════════════════════
let darkMode=false;
function toggleDark(on){
  darkMode=on;
  document.body.classList.toggle('dark',on);
  const g=document.getElementById('dmToggleGame');if(g) g.checked=on;
  const h=document.getElementById('dmToggleHome');if(h) h.checked=on;
  localStorage.setItem('cg_dark',on?'1':'0');
}
(function(){const d=localStorage.getItem('cg_dark');if(d==='1')toggleDark(true);})();

// ═══════════════════════════════════════
//  FEATURE LISTS
// ═══════════════════════════════════════
const SKINS=[
  {v:'#FF4444',n:'Red'},      {v:'#FF8C42',n:'Orange'},  {v:'#FFD93D',n:'Yellow'},
  {v:'#6BCB77',n:'Green'},    {v:'#4D96FF',n:'Blue'},    {v:'#9B5DE5',n:'Purple'},
  {v:'#FF6FD8',n:'Pink'},     {v:'#FDDBB4',n:'Cream'},   {v:'#F5C28A',n:'Peach'},
  {v:'#E8A46A',n:'Tan'},      {v:'#D4956A',n:'Sand'},    {v:'#C87941',n:'Caramel'},
  {v:'#A0522D',n:'Sienna'},   {v:'#7B3F1E',n:'Walnut'},  {v:'#4A2510',n:'Espresso'},
  {v:'#FF9999',n:'Rose'},     {v:'#FF6B6B',n:'Coral'},   {v:'#CCEE55',n:'Lime'},
  {v:'#22BB55',n:'Forest'},   {v:'#2255CC',n:'Navy'},    {v:'#6600CC',n:'Violet'},
  {v:'#FF1493',n:'HotPink'},  {v:'#00CED1',n:'Teal'},    {v:'#808080',n:'Gray'},
  {v:'#C0C0C0',n:'Silver'},   {v:'sRB',n:'Red/Blue'},    {v:'sGR',n:'Grn/Yel'},
  {v:'sYB',n:'Yel/Blue'},     {v:'sBP',n:'Pnk/Prp'},     {v:'sRP',n:'Red/Pnk'}
];
let skinIdx=1;

const EYES_LIST=['Round','Wide','Dot','Star','Shut','Wink','Anime','Tired','Angry','Happy','Heart','Spiral','Sunglasses','Squint','Cyclops','Dizzy','Sparkle','Cute','Pixel','Hollow','Cross','Sleepy'];
const MOUTH_LIST=['Smile','Grin','Flat','Sad','Wow','Tongue','Smirk','Teeth','Kiss','Wavy','Oof','Beam','Fangs','Whistle','Drool','BigSmile','Grimace','Pout','Zipper','Cat','Beak','Derp'];
const HAT_LIST=['None','Cap','TopHat','Beanie','Crown','Bow','Halo','Party','Cowboy','Helmet','Witch','Flower','Glasses','Headband','Chef','Antlers','Viking','Ninja','Propeller','Tiara','Beret','Pirate','Santa','Fedora','Bucket','Fez','Hardhat','Mohawk','Bunny','Dragon','Space Helm'];

let AV={skin:'#F5C28A',eyes:'Round',mouth:'Smile',hat:'None'};
let eyesIdx=0,mouthIdx=0,hatIdx=0;

function prevSkin(){skinIdx=(skinIdx-1+SKINS.length)%SKINS.length;AV.skin=SKINS[skinIdx].v;updSkinLbl();drawHome();saveP();}
function nextSkin(){skinIdx=(skinIdx+1)%SKINS.length;AV.skin=SKINS[skinIdx].v;updSkinLbl();drawHome();saveP();}
function updSkinLbl(){
  const lbl=document.getElementById('skinLbl');
  if(!lbl)return;
  lbl.textContent=SKINS[skinIdx].n;
}
function prev(feat){
  if(feat==='eyes'){eyesIdx=(eyesIdx-1+EYES_LIST.length)%EYES_LIST.length;AV.eyes=EYES_LIST[eyesIdx];document.getElementById('eyesLbl').textContent=AV.eyes;}
  else if(feat==='mouth'){mouthIdx=(mouthIdx-1+MOUTH_LIST.length)%MOUTH_LIST.length;AV.mouth=MOUTH_LIST[mouthIdx];document.getElementById('mouthLbl').textContent=AV.mouth;}
  else if(feat==='hat'){hatIdx=(hatIdx-1+HAT_LIST.length)%HAT_LIST.length;AV.hat=HAT_LIST[hatIdx];document.getElementById('hatLbl').textContent=AV.hat;}
  drawHome();saveP();
}
function next(feat){
  if(feat==='eyes'){eyesIdx=(eyesIdx+1)%EYES_LIST.length;AV.eyes=EYES_LIST[eyesIdx];document.getElementById('eyesLbl').textContent=AV.eyes;}
  else if(feat==='mouth'){mouthIdx=(mouthIdx+1)%MOUTH_LIST.length;AV.mouth=MOUTH_LIST[mouthIdx];document.getElementById('mouthLbl').textContent=AV.mouth;}
  else if(feat==='hat'){hatIdx=(hatIdx+1)%HAT_LIST.length;AV.hat=HAT_LIST[hatIdx];document.getElementById('hatLbl').textContent=AV.hat;}
  drawHome();saveP();
}

// ═══════════════════════════════════════
//  AVATAR DRAWING
// ═══════════════════════════════════════
function sCol(s){
  if(s==='sRB')return['#FF3333','#3333FF'];if(s==='sGR')return['#33AA33','#FFDD00'];
  if(s==='sYB')return['#FFD700','#3333FF'];if(s==='sBP')return['#FF69B4','#9B5DE5'];
  if(s==='sRP')return['#FF3333','#FF69B4'];return[s,s];
}
function rrect(ctx,x,y,w,h,r){
  ctx.beginPath();ctx.moveTo(x+r,y);ctx.lineTo(x+w-r,y);ctx.arcTo(x+w,y,x+w,y+r,r);
  ctx.lineTo(x+w,y+h-r);ctx.arcTo(x+w,y+h,x+w-r,y+h,r);
  ctx.lineTo(x+r,y+h);ctx.arcTo(x,y+h,x,y+h-r,r);
  ctx.lineTo(x,y+r);ctx.arcTo(x,y,x+r,y,r);ctx.closePath();
}
function applyFill(ctx,av,clip,x,y,w,h){
  const stripe=av.skin&&av.skin[0]==='s';
  ctx.save();ctx.beginPath();clip();
  if(stripe){ctx.clip();const sc=sCol(av.skin);for(let i=0;i<8;i++){ctx.fillStyle=i%2?sc[1]:sc[0];ctx.fillRect(x+i*w/7,y,w/7+1,h);}}
  else{ctx.fillStyle=av.skin||'#F5C28A';ctx.fill();}
  ctx.restore();
}
function drawAV(ctx,av,cx,cy,R){
  ctx.imageSmoothingEnabled=true;ctx.imageSmoothingQuality='high';
  const LW=Math.max(1.2,R*.07);
  // Body
  const bW=R*1.08,bH=R*.95,bX=cx-bW/2,bY=cy+R*.4;
  applyFill(ctx,av,()=>rrect(ctx,bX,bY,bW,bH,R*.22),bX,bY,bW,bH);
  ctx.strokeStyle='#1a1a1a';ctx.lineWidth=LW;rrect(ctx,bX,bY,bW,bH,R*.22);ctx.stroke();
  // Head
  applyFill(ctx,av,()=>{ctx.beginPath();ctx.arc(cx,cy,R,0,Math.PI*2);},cx-R,cy-R,R*2,R*2);
  ctx.strokeStyle='#1a1a1a';ctx.lineWidth=LW;ctx.beginPath();ctx.arc(cx,cy,R,0,Math.PI*2);ctx.stroke();
  // No ears — clean round head
  drawEyes(ctx,av.eyes||'Round',cx,cy,R,LW);
  drawMouth(ctx,av.mouth||'Smile',cx,cy,R,LW);
  drawHat(ctx,av.hat||'None',cx,cy,R,LW);
}

function drawEyes(ctx,style,cx,cy,R,LW){
  const ey=cy-R*.1,exL=cx-R*.3,exR=cx+R*.3;
  ctx.save();
  const eye1=(x,wink)=>{
    if(wink){ctx.strokeStyle='#1a1a1a';ctx.lineWidth=LW*1.1;ctx.lineCap='round';ctx.beginPath();ctx.moveTo(x-R*.14,ey);ctx.quadraticCurveTo(x,ey+R*.12,x+R*.14,ey);ctx.stroke();return;}
    switch(style){
      case'Round':default:
        ctx.fillStyle='#1a1a1a';ctx.beginPath();ctx.ellipse(x,ey,R*.12,R*.16,0,0,Math.PI*2);ctx.fill();
        ctx.fillStyle='#fff';ctx.beginPath();ctx.arc(x+R*.04,ey-R*.05,R*.045,0,Math.PI*2);ctx.fill();break;
      case'Wide':
        ctx.fillStyle='#fff';ctx.beginPath();ctx.ellipse(x,ey,R*.17,R*.22,0,0,Math.PI*2);ctx.fill();
        ctx.strokeStyle='#1a1a1a';ctx.lineWidth=LW*.9;ctx.beginPath();ctx.ellipse(x,ey,R*.17,R*.22,0,0,Math.PI*2);ctx.stroke();
        ctx.fillStyle='#4488FF';ctx.beginPath();ctx.ellipse(x,ey+R*.03,R*.1,R*.14,0,0,Math.PI*2);ctx.fill();
        ctx.fillStyle='#111';ctx.beginPath();ctx.ellipse(x,ey+R*.03,R*.06,R*.09,0,0,Math.PI*2);ctx.fill();
        ctx.fillStyle='#fff';ctx.beginPath();ctx.arc(x+R*.04,ey-R*.03,R*.04,0,Math.PI*2);ctx.fill();break;
      case'Dot':ctx.fillStyle='#1a1a1a';ctx.beginPath();ctx.arc(x,ey,R*.09,0,Math.PI*2);ctx.fill();break;
      case'Star':starPoly(ctx,x,ey,R*.14,'#FFD700');break;
      case'Shut':
        ctx.strokeStyle='#1a1a1a';ctx.lineWidth=LW*1.2;ctx.lineCap='round';
        ctx.beginPath();ctx.moveTo(x-R*.14,ey);ctx.quadraticCurveTo(x,ey+R*.12,x+R*.14,ey);ctx.stroke();break;
      case'Anime':
        ctx.fillStyle='#1a1a1a';ctx.beginPath();ctx.ellipse(x,ey,R*.14,R*.21,0,0,Math.PI*2);ctx.fill();
        ctx.fillStyle='#5577FF';ctx.beginPath();ctx.ellipse(x,ey+R*.02,R*.1,R*.15,0,0,Math.PI*2);ctx.fill();
        ctx.fillStyle='#111';ctx.beginPath();ctx.ellipse(x,ey+R*.03,R*.065,R*.1,0,0,Math.PI*2);ctx.fill();
        ctx.fillStyle='#fff';ctx.beginPath();ctx.arc(x+R*.05,ey-R*.05,R*.04,0,Math.PI*2);ctx.fill();
        ctx.beginPath();ctx.arc(x-R*.04,ey+R*.06,R*.025,0,Math.PI*2);ctx.fill();break;
      case'Tired':
        ctx.fillStyle='#1a1a1a';ctx.beginPath();ctx.ellipse(x,ey+R*.04,R*.11,R*.1,0,0,Math.PI*2);ctx.fill();
        ctx.fillStyle='rgba(40,40,40,.5)';ctx.beginPath();ctx.ellipse(x,ey,R*.13,R*.1,0,Math.PI,0,true);ctx.fill();break;
      case'Angry':
        ctx.fillStyle='#1a1a1a';ctx.beginPath();ctx.ellipse(x,ey+R*.02,R*.12,R*.14,0,0,Math.PI*2);ctx.fill();
        ctx.fillStyle='#fff';ctx.beginPath();ctx.arc(x+R*.04,ey-R*.02,R*.04,0,Math.PI*2);ctx.fill();break;
      case'Happy':
        ctx.strokeStyle='#1a1a1a';ctx.lineWidth=LW*1.1;ctx.lineCap='round';
        ctx.beginPath();ctx.moveTo(x-R*.13,ey+R*.04);ctx.quadraticCurveTo(x,ey-R*.13,x+R*.13,ey+R*.04);ctx.stroke();break;
      case'Heart':
        ctx.save();ctx.translate(x,ey-.5);ctx.scale(R*.09,R*.09);ctx.fillStyle='#FF3366';
        ctx.beginPath();ctx.moveTo(0,1);ctx.bezierCurveTo(-1,-.5,-2.5,.5,-1.5,2);ctx.bezierCurveTo(-1,3,0,3.8,0,4);
        ctx.bezierCurveTo(0,3.8,1,3,1.5,2);ctx.bezierCurveTo(2.5,.5,1,-.5,0,1);ctx.fill();ctx.restore();break;
      case'Spiral':
        ctx.strokeStyle='#1a1a1a';ctx.lineWidth=LW*.8;ctx.beginPath();
        for(let t=0;t<6.5;t+=.12){const r2=R*.022*t;ctx.lineTo(x+r2*Math.cos(t*1.4),ey+r2*Math.sin(t*1.4));}
        ctx.stroke();break;
      case'Squint':
        ctx.strokeStyle='#1a1a1a';ctx.lineWidth=LW;
        ctx.beginPath();ctx.moveTo(x-R*.14,ey-R*.04);ctx.lineTo(x+R*.14,ey-R*.04);ctx.stroke();
        ctx.beginPath();ctx.moveTo(x-R*.12,ey+R*.04);ctx.lineTo(x+R*.12,ey+R*.04);ctx.stroke();break;
      case'Cyclops':
        ctx.fillStyle='#1a1a1a';ctx.beginPath();ctx.ellipse(x,ey,R*.18,R*.18,0,0,Math.PI*2);ctx.fill();
        ctx.fillStyle='#fff';ctx.beginPath();ctx.arc(x+R*.06,ey-R*.06,R*.06,0,Math.PI*2);ctx.fill();break;
      case'Dizzy':
        ctx.strokeStyle='#1a1a1a';ctx.lineWidth=LW*.9;
        [0,1].forEach(i=>{const ang=i*Math.PI*.5+.3;ctx.beginPath();ctx.moveTo(x-R*.12*Math.cos(ang),ey-R*.12*Math.sin(ang));ctx.lineTo(x+R*.12*Math.cos(ang),ey+R*.12*Math.sin(ang));ctx.stroke();});break;
      case'Sparkle':
        [[x,ey],[x-R*.05,ey-R*.04],[x+R*.04,ey+R*.04]].forEach(([px,py],i)=>starPoly(ctx,px,py,R*.07*(1-i*.2),'#FFD700'));break;
      case'Cute':
        ctx.fillStyle='#1a1a1a';ctx.beginPath();ctx.arc(x,ey,R*.09,0,Math.PI*2);ctx.fill();
        ctx.strokeStyle='#FF88BB';ctx.lineWidth=LW*.8;
        ctx.beginPath();ctx.arc(x-R*.1,ey+R*.1,R*.08,0,Math.PI*2);ctx.stroke();
        ctx.beginPath();ctx.arc(x+R*.1,ey+R*.1,R*.08,0,Math.PI*2);ctx.stroke();break;
      case'Pixel':
        ctx.fillStyle='#1a1a1a';
        [[x-R*.06,ey-R*.04],[x,ey-R*.04],[x-R*.06,ey+R*.04],[x,ey+R*.04]].forEach(([px,py])=>{ctx.fillRect(px,py,R*.08,R*.08);});break;
      case'Hollow':
        ctx.strokeStyle='#1a1a1a';ctx.lineWidth=LW;
        ctx.beginPath();ctx.ellipse(x,ey,R*.13,R*.16,0,0,Math.PI*2);ctx.stroke();break;
      case'Cross':
        ctx.strokeStyle='#1a1a1a';ctx.lineWidth=LW*1.1;ctx.lineCap='round';
        ctx.beginPath();ctx.moveTo(x-R*.1,ey-R*.1);ctx.lineTo(x+R*.1,ey+R*.1);ctx.stroke();
        ctx.beginPath();ctx.moveTo(x+R*.1,ey-R*.1);ctx.lineTo(x-R*.1,ey+R*.1);ctx.stroke();break;
      case'Sleepy':
        ctx.strokeStyle='#1a1a1a';ctx.lineWidth=LW*1.1;ctx.lineCap='round';
        ctx.beginPath();ctx.moveTo(x-R*.13,ey-R*.04);ctx.lineTo(x+R*.13,ey-R*.04);ctx.stroke();
        ctx.fillStyle='#aaddff';ctx.beginPath();ctx.ellipse(x,ey+R*.04,R*.1,R*.06,0,0,Math.PI*2);ctx.fill();break;
    }
  };
  if(style==='Wink'){eye1(exL,false);eye1(exR,true);}
  else if(style==='Sunglasses'){
    ctx.fillStyle='#111';ctx.strokeStyle='#333';ctx.lineWidth=LW*.8;
    rrect(ctx,exL-R*.16,ey-R*.12,R*.32,R*.22,R*.07);ctx.fill();ctx.stroke();
    rrect(ctx,exR-R*.16,ey-R*.12,R*.32,R*.22,R*.07);ctx.fill();ctx.stroke();
    ctx.beginPath();ctx.moveTo(exL+R*.16,ey);ctx.lineTo(exR-R*.16,ey);ctx.strokeStyle='#555';ctx.lineWidth=LW*.7;ctx.stroke();
    ctx.fillStyle='rgba(0,0,0,.25)';
    rrect(ctx,exL-R*.16,ey-R*.12,R*.32,R*.22,R*.07);ctx.fill();
    rrect(ctx,exR-R*.16,ey-R*.12,R*.32,R*.22,R*.07);ctx.fill();
  }else if(style==='Cyclops'){
    // Cyclops = 1 big eye in center
    eye1((exL+exR)/2);
  }else{eye1(exL);eye1(exR);}
  ctx.restore();
}

function starPoly(ctx,cx,cy,R,col){
  ctx.save();ctx.fillStyle=col||'#FFD700';ctx.strokeStyle='rgba(0,0,0,.3)';ctx.lineWidth=.6;
  ctx.beginPath();
  for(let i=0;i<5;i++){
    const a=i*4*Math.PI/5-Math.PI/2,a2=(i*4+2)*Math.PI/5-Math.PI/2;
    i===0?ctx.moveTo(cx+R*Math.cos(a),cy+R*Math.sin(a)):ctx.lineTo(cx+R*Math.cos(a),cy+R*Math.sin(a));
    ctx.lineTo(cx+R*.42*Math.cos(a2),cy+R*.42*Math.sin(a2));
  }
  ctx.closePath();ctx.fill();ctx.stroke();ctx.restore();
}

function drawMouth(ctx,style,cx,cy,R,LW){
  const my=cy+R*.32;
  ctx.save();ctx.strokeStyle='#1a1a1a';ctx.lineWidth=LW*1.05;ctx.lineCap='round';
  switch(style){
    case'Smile':ctx.beginPath();ctx.moveTo(cx-R*.28,my-R*.04);ctx.quadraticCurveTo(cx,my+R*.24,cx+R*.28,my-R*.04);ctx.stroke();break;
    case'Grin':
      ctx.fillStyle='#fff';ctx.beginPath();ctx.moveTo(cx-R*.28,my);ctx.quadraticCurveTo(cx,my+R*.28,cx+R*.28,my);ctx.quadraticCurveTo(cx,my+R*.1,cx-R*.28,my);ctx.closePath();ctx.fill();
      ctx.beginPath();ctx.moveTo(cx-R*.28,my);ctx.quadraticCurveTo(cx,my+R*.28,cx+R*.28,my);ctx.stroke();break;
    case'Flat':ctx.beginPath();ctx.moveTo(cx-R*.22,my);ctx.lineTo(cx+R*.22,my);ctx.stroke();break;
    case'Sad':ctx.beginPath();ctx.moveTo(cx-R*.27,my+R*.12);ctx.quadraticCurveTo(cx,my-R*.14,cx+R*.27,my+R*.12);ctx.stroke();break;
    case'Wow':ctx.fillStyle='#333';ctx.strokeStyle='#111';ctx.lineWidth=LW*.8;ctx.beginPath();ctx.ellipse(cx,my+R*.07,R*.12,R*.16,0,0,Math.PI*2);ctx.fill();ctx.stroke();break;
    case'Tongue':
      ctx.fillStyle='#fff';ctx.beginPath();ctx.moveTo(cx-R*.27,my);ctx.quadraticCurveTo(cx,my+R*.22,cx+R*.27,my);ctx.quadraticCurveTo(cx,my+R*.08,cx-R*.27,my);ctx.closePath();ctx.fill();
      ctx.beginPath();ctx.moveTo(cx-R*.27,my);ctx.quadraticCurveTo(cx,my+R*.22,cx+R*.27,my);ctx.stroke();
      ctx.fillStyle='#FF7799';ctx.beginPath();ctx.ellipse(cx,my+R*.2,R*.1,R*.1,0,0,Math.PI);ctx.fill();break;
    case'Smirk':ctx.beginPath();ctx.moveTo(cx-R*.12,my+R*.06);ctx.quadraticCurveTo(cx+R*.1,my+R*.2,cx+R*.27,my-R*.02);ctx.stroke();break;
    case'Teeth':
      ctx.fillStyle='#fff';rrect(ctx,cx-R*.22,my-R*.02,R*.44,R*.19,R*.04);ctx.fill();ctx.stroke();
      ctx.strokeStyle='#ccc';ctx.lineWidth=LW*.5;
      for(let i=1;i<4;i++){ctx.beginPath();ctx.moveTo(cx-R*.22+i*R*.44/4,my-R*.02);ctx.lineTo(cx-R*.22+i*R*.44/4,my+R*.17);ctx.stroke();}break;
    case'Kiss':ctx.fillStyle='#FF6699';ctx.strokeStyle='#CC3366';ctx.lineWidth=LW*.7;ctx.beginPath();ctx.arc(cx,my+R*.05,R*.1,0,Math.PI*2);ctx.fill();ctx.stroke();break;
    case'Wavy':
      ctx.beginPath();ctx.moveTo(cx-R*.27,my);
      for(let i=0;i<=4;i++)ctx.quadraticCurveTo(cx-R*.27+i*R*.135+R*.067,my+(i%2?R*.15:-R*.05),cx-R*.27+(i+1)*R*.135,my);
      ctx.stroke();break;
    case'Oof':
      ctx.fillStyle='#fff';ctx.beginPath();ctx.ellipse(cx,my+R*.1,R*.21,R*.15,0,0,Math.PI*2);ctx.fill();ctx.stroke();
      ctx.fillStyle='#888';ctx.beginPath();ctx.arc(cx,my+R*.12,R*.07,0,Math.PI*2);ctx.fill();break;
    case'Beam':
      ctx.fillStyle='#fff';ctx.beginPath();ctx.moveTo(cx-R*.28,my-R*.02);ctx.quadraticCurveTo(cx,my+R*.3,cx+R*.28,my-R*.02);ctx.fill();
      ctx.beginPath();ctx.moveTo(cx-R*.28,my-R*.02);ctx.quadraticCurveTo(cx,my+R*.3,cx+R*.28,my-R*.02);ctx.stroke();
      ctx.fillStyle='#FFD700';[[cx-R*.1,my+R*.06],[cx+R*.1,my+R*.06]].forEach(([px,py])=>{ctx.beginPath();ctx.arc(px,py,R*.05,0,Math.PI*2);ctx.fill();});break;
    case'Fangs':
      ctx.fillStyle='#fff';ctx.beginPath();ctx.moveTo(cx-R*.27,my);ctx.quadraticCurveTo(cx,my+R*.22,cx+R*.27,my);ctx.quadraticCurveTo(cx,my+R*.08,cx-R*.27,my);ctx.closePath();ctx.fill();
      ctx.beginPath();ctx.moveTo(cx-R*.27,my);ctx.quadraticCurveTo(cx,my+R*.22,cx+R*.27,my);ctx.stroke();
      ctx.fillStyle='#fff';ctx.strokeStyle='#ccc';ctx.lineWidth=LW*.5;
      [[cx-R*.14,my],[cx+R*.05,my]].forEach(([fx,fy])=>{ctx.beginPath();ctx.moveTo(fx,fy);ctx.lineTo(fx+R*.05,fy+R*.12);ctx.lineTo(fx+R*.1,fy);ctx.closePath();ctx.fill();ctx.stroke();});break;
    case'Whistle':
      ctx.beginPath();ctx.arc(cx,my+R*.06,R*.09,0,Math.PI*2);ctx.stroke();
      ctx.fillStyle='#aaa';ctx.beginPath();ctx.arc(cx,my+R*.06,R*.05,0,Math.PI*2);ctx.fill();break;
    case'Drool':
      ctx.beginPath();ctx.moveTo(cx-R*.22,my-R*.04);ctx.quadraticCurveTo(cx,my+R*.2,cx+R*.22,my-R*.04);ctx.stroke();
      ctx.strokeStyle='#AADDFF';ctx.lineWidth=LW*.9;
      ctx.beginPath();ctx.moveTo(cx+R*.1,my+R*.1);ctx.quadraticCurveTo(cx+R*.14,my+R*.28,cx+R*.1,my+R*.38);ctx.stroke();
      ctx.fillStyle='#AADDFF';ctx.beginPath();ctx.ellipse(cx+R*.1,my+R*.42,R*.05,R*.07,0,0,Math.PI*2);ctx.fill();break;
    case'BigSmile':
      ctx.fillStyle='#fff';ctx.beginPath();ctx.moveTo(cx-R*.35,my-R*.04);ctx.quadraticCurveTo(cx,my+R*.38,cx+R*.35,my-R*.04);ctx.quadraticCurveTo(cx,my+R*.1,cx-R*.35,my-R*.04);ctx.closePath();ctx.fill();
      ctx.beginPath();ctx.moveTo(cx-R*.35,my-R*.04);ctx.quadraticCurveTo(cx,my+R*.38,cx+R*.35,my-R*.04);ctx.stroke();break;
    case'Grimace':
      ctx.fillStyle='#fff';rrect(ctx,cx-R*.25,my-R*.02,R*.5,R*.2,R*.04);ctx.fill();ctx.stroke();
      ctx.strokeStyle='#999';ctx.lineWidth=LW*.5;
      for(let i=1;i<5;i++){ctx.beginPath();ctx.moveTo(cx-R*.25+i*R*.5/5,my);ctx.lineTo(cx-R*.25+i*R*.5/5,my+R*.18);ctx.stroke();}break;
    case'Pout':
      ctx.beginPath();ctx.moveTo(cx-R*.2,my+R*.1);ctx.quadraticCurveTo(cx,my+R*.02,cx+R*.2,my+R*.1);ctx.stroke();
      ctx.fillStyle='#FF99AA';ctx.beginPath();ctx.ellipse(cx,my+R*.06,R*.12,R*.07,0,0,Math.PI*2);ctx.fill();break;
    case'Zipper':
      ctx.beginPath();ctx.moveTo(cx-R*.22,my);ctx.lineTo(cx+R*.22,my);ctx.stroke();
      ctx.lineWidth=LW*.6;ctx.strokeStyle='#888';
      for(let i=0;i<5;i++){const xi=cx-R*.2+i*R*.1;ctx.beginPath();ctx.moveTo(xi,my);ctx.lineTo(xi,my+R*.1);ctx.stroke();}break;
    case'Cat':
      ctx.beginPath();ctx.moveTo(cx-R*.22,my);ctx.quadraticCurveTo(cx-R*.1,my+R*.15,cx,my);ctx.quadraticCurveTo(cx+R*.1,my+R*.15,cx+R*.22,my);ctx.stroke();
      ctx.fillStyle='#FF9999';ctx.beginPath();ctx.ellipse(cx,my+R*.06,R*.06,R*.05,0,0,Math.PI*2);ctx.fill();break;
    case'Beak':
      ctx.fillStyle='#FFA500';ctx.strokeStyle='#CC7700';ctx.lineWidth=LW*.8;
      ctx.beginPath();ctx.moveTo(cx-R*.12,my);ctx.lineTo(cx,my+R*.16);ctx.lineTo(cx+R*.12,my);ctx.closePath();ctx.fill();ctx.stroke();break;
    case'Derp':
      ctx.beginPath();ctx.moveTo(cx-R*.2,my+R*.04);ctx.quadraticCurveTo(cx-R*.05,my+R*.18,cx+R*.1,my+R*.06);ctx.quadraticCurveTo(cx+R*.2,my,cx+R*.25,my+R*.1);ctx.stroke();break;
  }
  ctx.restore();
}

function drawHat(ctx,style,cx,cy,R,LW){
  if(style==='None')return;
  ctx.save();const hy=cy-R;
  switch(style){
    case'Cap':
      ctx.fillStyle='#2255CC';ctx.strokeStyle='#111';ctx.lineWidth=LW;
      ctx.beginPath();ctx.arc(cx,hy-R*.08,R*.55,Math.PI,0,false);ctx.lineTo(cx+R*.55,hy+R*.22);ctx.lineTo(cx-R*.55,hy+R*.22);ctx.closePath();ctx.fill();ctx.stroke();
      ctx.beginPath();ctx.ellipse(cx+R*.32,hy+R*.22,R*.4,R*.11,-.15,0,Math.PI*2);ctx.fill();ctx.stroke();
      ctx.fillStyle='rgba(255,255,255,.22)';ctx.fillRect(cx-R*.52,hy+R*.05,R*1.04,R*.1);
      ctx.fillStyle='#fff';ctx.beginPath();ctx.arc(cx,hy-R*.6,R*.06,0,Math.PI*2);ctx.fill();break;
    case'TopHat':
      ctx.fillStyle='#111';ctx.strokeStyle='#444';ctx.lineWidth=LW;
      rrect(ctx,cx-R*.42,hy-R*.7,R*.84,R*.76,R*.06);ctx.fill();ctx.stroke();
      ctx.fillRect(cx-R*.58,hy+R*.04,R*1.16,R*.18);ctx.strokeRect(cx-R*.58,hy+R*.04,R*1.16,R*.18);
      ctx.fillStyle='#FF4444';ctx.fillRect(cx-R*.42,hy-R*.08,R*.84,R*.1);break;
    case'Beanie':
      ctx.fillStyle='#CC1133';ctx.strokeStyle='#111';ctx.lineWidth=LW;
      ctx.beginPath();ctx.arc(cx,hy-R*.08,R*.74,Math.PI,0,false);ctx.lineTo(cx+R*.74,hy+R*.3);ctx.lineTo(cx-R*.74,hy+R*.3);ctx.closePath();ctx.fill();ctx.stroke();
      ctx.fillStyle='#fff';ctx.beginPath();ctx.arc(cx,hy-R*.78,R*.17,0,Math.PI*2);ctx.fill();ctx.stroke();
      ctx.fillStyle='rgba(255,255,255,.3)';ctx.fillRect(cx-R*.74,hy+R*.12,R*1.48,R*.13);break;
    case'Crown':
      ctx.fillStyle='#FFD700';ctx.strokeStyle='#AA8800';ctx.lineWidth=LW;
      ctx.beginPath();ctx.moveTo(cx-R*.55,hy+R*.16);ctx.lineTo(cx-R*.55,hy-R*.3);ctx.lineTo(cx-R*.26,hy+R*.02);ctx.lineTo(cx,hy-R*.52);ctx.lineTo(cx+R*.26,hy+R*.02);ctx.lineTo(cx+R*.55,hy-R*.3);ctx.lineTo(cx+R*.55,hy+R*.16);ctx.closePath();ctx.fill();ctx.stroke();
      ['#F00','#0F0','#00F'].forEach((c,i)=>{ctx.fillStyle=c;ctx.beginPath();ctx.arc(cx-R*.24+i*R*.24,hy-R*.04,R*.08,0,Math.PI*2);ctx.fill();});break;
    case'Bow':
      ctx.fillStyle='#FF69B4';ctx.strokeStyle='#AA2266';ctx.lineWidth=LW;
      [[cx-R*.3,hy-R*.2,-.5],[cx+R*.3,hy-R*.2,.5]].forEach(([bx,by,a])=>{ctx.beginPath();ctx.ellipse(bx,by,R*.26,R*.16,a,0,Math.PI*2);ctx.fill();ctx.stroke();});
      ctx.fillStyle='#FF1493';ctx.beginPath();ctx.arc(cx,hy-R*.2,R*.1,0,Math.PI*2);ctx.fill();break;
    case'Halo':
      ctx.strokeStyle='#FFD700';ctx.lineWidth=R*.13;ctx.shadowColor='#FFD700';ctx.shadowBlur=8;
      ctx.beginPath();ctx.ellipse(cx,hy-R*.24,R*.54,R*.16,0,0,Math.PI*2);ctx.stroke();ctx.shadowBlur=0;break;
    case'Party':
      ctx.fillStyle='#FF5500';ctx.strokeStyle='#111';ctx.lineWidth=LW;
      ctx.beginPath();ctx.moveTo(cx-R*.35,hy+R*.1);ctx.lineTo(cx,hy-R*.72);ctx.lineTo(cx+R*.35,hy+R*.1);ctx.closePath();ctx.fill();ctx.stroke();
      ctx.fillStyle='#FFD700';[[cx-R*.12,hy-R*.18],[cx+R*.1,hy-R*.35],[cx,hy-R*.06]].forEach(([px,py])=>{ctx.beginPath();ctx.arc(px,py,R*.055,0,Math.PI*2);ctx.fill();});
      ctx.fillStyle='#FF00FF';ctx.beginPath();ctx.arc(cx,hy-R*.76,R*.09,0,Math.PI*2);ctx.fill();break;
    case'Cowboy':
      ctx.fillStyle='#8B5E3C';ctx.strokeStyle='#5A3A1A';ctx.lineWidth=LW;
      ctx.beginPath();ctx.arc(cx,hy-R*.04,R*.52,Math.PI,0,false);ctx.lineTo(cx+R*.52,hy+R*.2);ctx.lineTo(cx-R*.52,hy+R*.2);ctx.closePath();ctx.fill();ctx.stroke();
      ctx.beginPath();ctx.ellipse(cx,hy+R*.2,R*.78,R*.19,0,0,Math.PI*2);ctx.fill();ctx.stroke();
      ctx.fillStyle='#CCAA33';ctx.beginPath();ctx.ellipse(cx,hy+R*.06,R*.36,R*.08,0,0,Math.PI*2);ctx.fill();break;
    case'Helmet':
      ctx.fillStyle='#3388CC';ctx.strokeStyle='#1155AA';ctx.lineWidth=LW;
      ctx.beginPath();ctx.arc(cx,hy-R*.04,R*.7,Math.PI,0,false);ctx.lineTo(cx+R*.7,hy+R*.26);ctx.lineTo(cx-R*.7,hy+R*.26);ctx.closePath();ctx.fill();ctx.stroke();
      ctx.fillStyle='rgba(180,220,255,.45)';ctx.beginPath();ctx.ellipse(cx-R*.16,hy-R*.22,R*.21,R*.36,-.4,0,Math.PI*2);ctx.fill();
      ctx.fillStyle='#CC2222';ctx.fillRect(cx-R*.7,hy+R*.14,R*1.4,R*.12);break;
    case'Witch':
      ctx.fillStyle='#1a1a1a';ctx.strokeStyle='#333';ctx.lineWidth=LW;
      ctx.beginPath();ctx.moveTo(cx,hy-R*1.05);ctx.lineTo(cx-R*.4,hy+R*.14);ctx.lineTo(cx+R*.4,hy+R*.14);ctx.closePath();ctx.fill();ctx.stroke();
      ctx.beginPath();ctx.ellipse(cx,hy+R*.14,R*.66,R*.17,0,0,Math.PI*2);ctx.fill();ctx.stroke();
      ctx.fillStyle='#9933CC';ctx.beginPath();ctx.ellipse(cx,hy+R*.14,R*.56,R*.1,0,0,Math.PI*2);ctx.fill();break;
    case'Flower':
      ['#FF6699','#FF9933','#FFDD00','#99FF66','#66AAFF'].forEach((c,i)=>{
        const a=i*Math.PI*2/5;ctx.fillStyle=c;ctx.beginPath();ctx.ellipse(cx+R*.34*Math.cos(a),hy-R*.22+R*.34*Math.sin(a),R*.19,R*.13,a,0,Math.PI*2);ctx.fill();
      });
      ctx.fillStyle='#FFD700';ctx.beginPath();ctx.arc(cx,hy-R*.22,R*.14,0,Math.PI*2);ctx.fill();break;
    case'Glasses':
      ctx.strokeStyle='#8B4513';ctx.lineWidth=LW*.9;ctx.fillStyle='rgba(150,220,255,.3)';
      [[cx-R*.3],[cx+R*.3]].forEach(([gx])=>{ctx.beginPath();ctx.arc(gx,cy-R*.1,R*.19,0,Math.PI*2);ctx.fill();ctx.stroke();});
      ctx.beginPath();ctx.moveTo(cx-R*.11,cy-R*.1);ctx.lineTo(cx+R*.11,cy-R*.1);ctx.stroke();
      ctx.beginPath();ctx.moveTo(cx-R*.49,cy-R*.1);ctx.lineTo(cx-R*.62,cy-R*.04);ctx.stroke();
      ctx.beginPath();ctx.moveTo(cx+R*.49,cy-R*.1);ctx.lineTo(cx+R*.62,cy-R*.04);ctx.stroke();break;
    case'Headband':
      ctx.fillStyle='#FF3366';ctx.strokeStyle='#CC1144';ctx.lineWidth=LW;
      ctx.beginPath();ctx.ellipse(cx,hy+R*.35,R*.8,R*.22,0,Math.PI,0,true);ctx.fill();ctx.stroke();
      ctx.fillStyle='#FF99AA';ctx.beginPath();ctx.arc(cx,hy+R*.14,R*.14,0,Math.PI*2);ctx.fill();
      starPoly(ctx,cx,hy+R*.14,R*.1,'#FF3366');break;
    case'Chef':
      ctx.fillStyle='#fff';ctx.strokeStyle='#ccc';ctx.lineWidth=LW;
      ctx.beginPath();ctx.arc(cx,hy-R*.26,R*.55,Math.PI,0,false);ctx.fill();ctx.stroke();
      ctx.beginPath();ctx.ellipse(cx,hy-R*.02,R*.48,R*.15,0,0,Math.PI*2);ctx.fill();ctx.stroke();
      ctx.fillStyle='#eee';ctx.beginPath();ctx.arc(cx,hy-R*.24,R*.46,Math.PI,0,false);ctx.fill();break;
    case'Antlers':
      ctx.strokeStyle='#8B5E3C';ctx.lineWidth=R*.09;ctx.lineCap='round';
      [-1,1].forEach(s=>{
        const ax=cx+s*R*.3,ay=hy-R*.1;
        ctx.beginPath();ctx.moveTo(ax,ay);ctx.lineTo(ax+s*R*.1,ay-R*.6);ctx.stroke();
        ctx.beginPath();ctx.moveTo(ax+s*R*.05,ay-R*.3);ctx.lineTo(ax+s*R*.3,ay-R*.5);ctx.stroke();
        ctx.beginPath();ctx.moveTo(ax+s*R*.08,ay-R*.45);ctx.lineTo(ax+s*R*.28,ay-R*.62);ctx.stroke();
      });break;
    case'Viking':
      ctx.fillStyle='#777';ctx.strokeStyle='#444';ctx.lineWidth=LW;
      rrect(ctx,cx-R*.6,hy-R*.6,R*1.2,R*.72,R*.1);ctx.fill();ctx.stroke();
      ctx.fillStyle='#FFD700';
      ctx.beginPath();ctx.ellipse(cx-R*.6,hy,R*.1,R*.24,0,0,Math.PI*2);ctx.fill();ctx.stroke();
      ctx.beginPath();ctx.ellipse(cx+R*.6,hy,R*.1,R*.24,0,0,Math.PI*2);ctx.fill();ctx.stroke();break;
    case'Ninja':
      ctx.fillStyle='#1a1a1a';ctx.strokeStyle='#333';ctx.lineWidth=LW*.8;
      ctx.beginPath();ctx.ellipse(cx,hy-R*.1,R*.7,R*.55,0,0,Math.PI*2);ctx.fill();ctx.stroke();
      ctx.beginPath();ctx.arc(cx,cy,R*1.02,-.5,Math.PI+.5);ctx.fill();ctx.stroke();
      ctx.fillStyle='#2a2a2a';ctx.beginPath();ctx.arc(cx,cy,R*1.02,.2,Math.PI-.2);ctx.fill();break;
    case'Propeller':
      ctx.fillStyle='#CC3311';ctx.strokeStyle='#111';ctx.lineWidth=LW*.8;
      ctx.beginPath();ctx.arc(cx,hy-R*.3,R*.12,0,Math.PI*2);ctx.fill();ctx.stroke();
      [0,1,2].forEach(i=>{
        const a=i*Math.PI*2/3;ctx.save();ctx.translate(cx,hy-R*.3);ctx.rotate(a);
        ctx.fillStyle=['#FF4444','#4444FF','#44AA44'][i];
        ctx.beginPath();ctx.ellipse(R*.18,0,R*.18,R*.08,0,0,Math.PI*2);ctx.fill();ctx.stroke();ctx.restore();
      });break;
    case'Tiara':
      ctx.fillStyle='#FFD700';ctx.strokeStyle='#AA8800';ctx.lineWidth=LW;
      ctx.beginPath();ctx.moveTo(cx-R*.5,hy+R*.2);ctx.lineTo(cx-R*.5,hy-R*.1);ctx.lineTo(cx-R*.25,hy+R*.05);ctx.lineTo(cx,hy-R*.32);ctx.lineTo(cx+R*.25,hy+R*.05);ctx.lineTo(cx+R*.5,hy-R*.1);ctx.lineTo(cx+R*.5,hy+R*.2);ctx.stroke();
      ctx.fillStyle='#FF88BB';ctx.beginPath();ctx.arc(cx,hy-R*.32,R*.07,0,Math.PI*2);ctx.fill();break;
    case'Beret':
      ctx.fillStyle='#AA3322';ctx.strokeStyle='#771111';ctx.lineWidth=LW;
      ctx.beginPath();ctx.ellipse(cx+R*.15,hy+R*.08,R*.62,R*.32,-.2,Math.PI,0,true);ctx.fill();ctx.stroke();
      ctx.fillStyle='#CC4433';ctx.beginPath();ctx.arc(cx+R*.42,hy-R*.05,R*.08,0,Math.PI*2);ctx.fill();break;
    case'Pirate':
      ctx.fillStyle='#111';ctx.strokeStyle='#333';ctx.lineWidth=LW;
      rrect(ctx,cx-R*.42,hy-R*.7,R*.84,R*.74,R*.06);ctx.fill();ctx.stroke();
      ctx.fillRect(cx-R*.58,hy+R*.02,R*1.16,R*.18);ctx.strokeRect(cx-R*.58,hy+R*.02,R*1.16,R*.18);
      ctx.fillStyle='#fff';ctx.beginPath();ctx.moveTo(cx-R*.2,hy-R*.5);ctx.lineTo(cx,hy-R*.1);ctx.lineTo(cx+R*.2,hy-R*.5);ctx.fill();ctx.stroke();
      ctx.fillStyle='#111';ctx.beginPath();ctx.arc(cx,hy-R*.3,R*.08,0,Math.PI*2);ctx.fill();break;
    case'Santa':
      ctx.fillStyle='#CC1111';ctx.strokeStyle='#990000';ctx.lineWidth=LW;
      ctx.beginPath();ctx.arc(cx,hy-R*.08,R*.7,Math.PI,0,false);ctx.lineTo(cx+R*.7,hy+R*.28);ctx.lineTo(cx-R*.7,hy+R*.28);ctx.closePath();ctx.fill();ctx.stroke();
      ctx.fillStyle='#fff';ctx.fillRect(cx-R*.72,hy+R*.14,R*1.44,R*.16);
      ctx.beginPath();ctx.arc(cx-R*.1,hy-R*.72,R*.13,0,Math.PI*2);ctx.fill();break;
    case'Fedora':
      ctx.fillStyle='#4A3020';ctx.strokeStyle='#2A1A0A';ctx.lineWidth=LW;
      rrect(ctx,cx-R*.4,hy-R*.5,R*.8,R*.55,R*.08);ctx.fill();ctx.stroke();
      ctx.beginPath();ctx.ellipse(cx,hy+R*.06,R*.7,R*.16,0,0,Math.PI*2);ctx.fill();ctx.stroke();
      ctx.fillStyle='#8B6B3D';ctx.fillRect(cx-R*.4,hy-R*.04,R*.8,R*.1);break;
    case'Bucket':
      ctx.fillStyle='#5577AA';ctx.strokeStyle='#334466';ctx.lineWidth=LW;
      rrect(ctx,cx-R*.44,hy-R*.55,R*.88,R*.62,R*.08);ctx.fill();ctx.stroke();
      ctx.fillRect(cx-R*.5,hy+R*.04,R*1.0,R*.12);ctx.strokeRect(cx-R*.5,hy+R*.04,R*1.0,R*.12);break;
    case'Fez':
      ctx.fillStyle='#AA2211';ctx.strokeStyle='#770000';ctx.lineWidth=LW;
      ctx.beginPath();ctx.moveTo(cx-R*.35,hy+R*.1);ctx.lineTo(cx-R*.28,hy-R*.52);ctx.lineTo(cx+R*.28,hy-R*.52);ctx.lineTo(cx+R*.35,hy+R*.1);ctx.closePath();ctx.fill();ctx.stroke();
      ctx.beginPath();ctx.ellipse(cx,hy+R*.1,R*.35,R*.1,0,0,Math.PI*2);ctx.fill();ctx.stroke();
      ctx.fillStyle='#FFD700';ctx.fillRect(cx-R*.02,hy-R*.52,R*.04,R*.14);
      ctx.fillStyle='#111';ctx.beginPath();ctx.arc(cx,hy-R*.52,R*.04,0,Math.PI*2);ctx.fill();break;
    case'Hardhat':
      ctx.fillStyle='#FFCC00';ctx.strokeStyle='#AA8800';ctx.lineWidth=LW;
      ctx.beginPath();ctx.arc(cx,hy-R*.05,R*.62,Math.PI,0,false);ctx.lineTo(cx+R*.62,hy+R*.18);ctx.lineTo(cx-R*.62,hy+R*.18);ctx.closePath();ctx.fill();ctx.stroke();
      ctx.beginPath();ctx.ellipse(cx,hy+R*.18,R*.72,R*.15,0,0,Math.PI*2);ctx.fill();ctx.stroke();
      ctx.fillStyle='rgba(255,255,255,.35)';ctx.beginPath();ctx.ellipse(cx-R*.15,hy-R*.2,R*.18,R*.3,-.3,0,Math.PI*2);ctx.fill();break;
    case'Mohawk':
      ['#FF3333','#FF8800','#FFDD00','#33DD33','#3388FF'].forEach((c,i)=>{
        ctx.fillStyle=c;ctx.strokeStyle='#111';ctx.lineWidth=LW*.6;
        ctx.beginPath();ctx.moveTo(cx-R*.06+i*R*.03,hy+R*.05);ctx.lineTo(cx-R*.12+i*R*.06,hy-R*.5-i*R*.08);ctx.lineTo(cx+R*.12-i*R*.06+R*.06,hy-R*.5-i*R*.08);ctx.lineTo(cx+R*.06+i*R*.03,hy+R*.05);ctx.closePath();ctx.fill();ctx.stroke();
      });break;
    case'Bunny':
      ctx.fillStyle='#EEE';ctx.strokeStyle='#AAA';ctx.lineWidth=LW;
      [[cx-R*.28,hy-R*.08],[cx+R*.08,hy-R*.08]].forEach(([ex,ey2])=>{
        ctx.beginPath();ctx.ellipse(ex+R*.1,ey2-R*.35,R*.1,R*.35,-.1,0,Math.PI*2);ctx.fill();ctx.stroke();
        ctx.fillStyle='#FFB0B0';ctx.beginPath();ctx.ellipse(ex+R*.1,ey2-R*.35,R*.05,R*.25,-.1,0,Math.PI*2);ctx.fill();
        ctx.fillStyle='#EEE';
      });break;
    case'Dragon':
      ctx.fillStyle='#33AA44';ctx.strokeStyle='#226633';ctx.lineWidth=LW;
      [[cx-R*.35,hy-.5],[cx-R*.15,hy-R*.25],[cx+R*.05,hy],[cx+R*.25,hy-R*.25],[cx+R*.45,hy-.5]].forEach(([sx,sy2])=>{
        ctx.beginPath();ctx.moveTo(sx,sy2);ctx.lineTo(sx+R*.1,sy2-R*.22);ctx.lineTo(sx+R*.2,sy2);ctx.closePath();ctx.fill();ctx.stroke();
      });break;
    case'Space Helm':
      ctx.fillStyle='#334455';ctx.strokeStyle='#1a2233';ctx.lineWidth=LW;
      ctx.beginPath();ctx.arc(cx,cy,R*1.18,0,Math.PI*2);ctx.fill();ctx.stroke();
      ctx.fillStyle='rgba(100,200,255,.35)';ctx.beginPath();ctx.arc(cx,cy,R*1.18,0,Math.PI*2);ctx.fill();
      ctx.strokeStyle='#445566';ctx.lineWidth=LW*1.2;
      ctx.beginPath();ctx.arc(cx,cy,R*1.18,0,Math.PI*2);ctx.stroke();break;
  }
  ctx.restore();
}

function drawOnCanvas(canvas,av,R){
  const ctx=canvas.getContext('2d');
  ctx.clearRect(0,0,canvas.width,canvas.height);
  drawAV(ctx,av,canvas.width/2,canvas.height*.46,R||canvas.width*.3);
}
function drawHome(){drawOnCanvas(document.getElementById('avCanvas'),AV,32);}

// ── Persist
function saveP(){
  localStorage.setItem('cg_n',document.getElementById('nameInp').value);
  localStorage.setItem('cg_av',JSON.stringify({...AV,skinIdx,eyesIdx,mouthIdx,hatIdx}));
}
function loadP(){
  const n=localStorage.getItem('cg_n'),a=localStorage.getItem('cg_av');
  if(n)document.getElementById('nameInp').value=n;
  if(a){
    try{
      const p=JSON.parse(a);
      AV={skin:p.skin||'#F5C28A',eyes:p.eyes||'Round',mouth:p.mouth||'Smile',hat:p.hat||'None'};
      skinIdx=Math.max(0,SKINS.findIndex(s=>s.v===AV.skin));
      eyesIdx=Math.max(0,EYES_LIST.indexOf(AV.eyes));
      mouthIdx=Math.max(0,MOUTH_LIST.indexOf(AV.mouth));
      hatIdx=Math.max(0,HAT_LIST.indexOf(AV.hat));
    }catch(e){}
  }
  updSkinLbl();
  liveCheckName(document.getElementById('nameInp').value);
  document.getElementById('eyesLbl').textContent=AV.eyes;
  document.getElementById('mouthLbl').textContent=AV.mouth;
  document.getElementById('hatLbl').textContent=AV.hat;
  drawHome();
}
loadP();
document.getElementById('nameInp').addEventListener('input',saveP);

// ═══════════════════════════════════════
//  LIVING ROOM — viewBox 640×400
// ═══════════════════════════════════════
const SEATS=[
  {cx:64,sy:292},{cx:108,sy:292},
  {cx:196,sy:285},{cx:260,sy:285},{cx:324,sy:285},{cx:388,sy:285},
  {cx:528,sy:292},{cx:572,sy:292},
];

function buildRoom(){
  const svg=document.getElementById('roomSvg');
  svg.innerHTML=\`
<defs></defs>
<rect x="0" y="316" width="640" height="84" fill="#5C3A14"/>
<line x1="0" y1="330" x2="640" y2="330" stroke="#3E2408" stroke-width="1" opacity=".35"/>
<line x1="0" y1="348" x2="640" y2="348" stroke="#3E2408" stroke-width="1" opacity=".25"/>
<rect x="0" y="0" width="640" height="320" fill="#32612D"/>
<rect x="0" y="310" width="640" height="10" fill="#234620"/>
<!-- Window -->
<rect x="32" y="34" width="126" height="168" rx="5" fill="#0D1A2E" stroke="#6B4C1E" stroke-width="5"/>
<line x1="95" y1="36" x2="95" y2="200" stroke="#6B4C1E" stroke-width="4"/>
<line x1="34" y1="117" x2="156" y2="117" stroke="#6B4C1E" stroke-width="4"/>
<rect x="35" y="37" width="58" height="78" fill="#0E1E38" rx="2"/>
<rect x="97" y="37" width="57" height="78" fill="#0E1E38" rx="2"/>
<rect x="35" y="119" width="58" height="81" fill="#0E1E38" rx="2"/>
<rect x="97" y="119" width="57" height="81" fill="#0E1E38" rx="2"/>
<rect id="lFlash" x="35" y="37" width="117" height="161" fill="white" opacity="0" rx="2"/>
<!-- Wall decor: Kelly Green frame, 2 cats -->
<rect x="193" y="41" width="56" height="64" rx="3" fill="#4CB817" stroke="#3A9010" stroke-width="2.5"/>
<rect x="199" y="47" width="44" height="52" rx="2" fill="#EDE0C8"/>
<!-- Cat 1 orange -->
<polygon points="207,62 210,56 213,62" fill="#E8813A" stroke="#C86020" stroke-width=".8"/>
<polygon points="211,62 214,56 217,62" fill="#E8813A" stroke="#C86020" stroke-width=".8"/>
<circle cx="212" cy="67" r="7" fill="#E8813A" stroke="#C86020" stroke-width=".8"/>
<circle cx="210" cy="66.5" r="1.3" fill="#1a1a1a"/>
<circle cx="214" cy="66.5" r="1.3" fill="#1a1a1a"/>
<path d="M210,70 Q212,72 214,70" stroke="#555" stroke-width=".7" fill="none"/>
<line x1="205" y1="69" x2="202" y2="68.5" stroke="#666" stroke-width=".6"/>
<line x1="205" y1="70.5" x2="202" y2="70.5" stroke="#666" stroke-width=".6"/>
<line x1="219" y1="69" x2="222" y2="68.5" stroke="#666" stroke-width=".6"/>
<line x1="219" y1="70.5" x2="222" y2="70.5" stroke="#666" stroke-width=".6"/>
<!-- Cat 2 purple -->
<polygon points="225,62 228,56 231,62" fill="#9B5DE5" stroke="#7B3DC5" stroke-width=".8"/>
<polygon points="229,62 232,56 235,62" fill="#9B5DE5" stroke="#7B3DC5" stroke-width=".8"/>
<circle cx="230" cy="67" r="7" fill="#9B5DE5" stroke="#7B3DC5" stroke-width=".8"/>
<circle cx="228" cy="66.5" r="1.3" fill="#1a1a1a"/>
<circle cx="232" cy="66.5" r="1.3" fill="#1a1a1a"/>
<path d="M228,70 Q230,72 232,70" stroke="#555" stroke-width=".7" fill="none"/>
<line x1="223" y1="69" x2="220" y2="68.5" stroke="#666" stroke-width=".6"/>
<line x1="223" y1="70.5" x2="220" y2="70.5" stroke="#666" stroke-width=".6"/>
<line x1="237" y1="69" x2="240" y2="68.5" stroke="#666" stroke-width=".6"/>
<line x1="237" y1="70.5" x2="240" y2="70.5" stroke="#666" stroke-width=".6"/>
<line x1="201" y1="79" x2="241" y2="79" stroke="#B09060" stroke-width=".8" opacity=".5"/>
<!-- Fireplace -->
<rect x="216" y="200" width="128" height="14" rx="3" fill="#7A3E10"/>
<rect x="206" y="214" width="148" height="88" rx="5" fill="#5A2E0A"/>
<rect x="224" y="220" width="112" height="78" rx="4" fill="#160800"/>
<circle cx="280" cy="195" r="16" fill="#F0D8A0" stroke="#7A3E10" stroke-width="2"/>
<circle cx="280" cy="195" r="11" fill="#FFF8E0"/>
<line x1="280" y1="195" x2="280" y2="187" stroke="#333" stroke-width="1.5"/>
<line x1="280" y1="195" x2="286" y2="198" stroke="#333" stroke-width="1.5"/>
<circle cx="280" cy="195" r="1.5" fill="#333"/>
<rect x="248" y="186" width="7" height="24" rx="2" fill="#FFFFE0" stroke="#DDD" stroke-width="1"/>
<ellipse cx="251.5" cy="185" rx="2" ry="3" fill="#FFD700"/>
<!-- Flower pot with 2 yellow flowers -->
<rect x="325" y="197" width="16" height="13" rx="3" fill="#B56A2A" stroke="#7A4010" stroke-width=".8"/>
<rect x="323" y="195" width="20" height="4" rx="2" fill="#C87830"/>
<ellipse cx="333" cy="211" rx="10" ry="2.5" fill="#7A4010" opacity=".5"/>
<line x1="330" y1="195" x2="327" y2="185" stroke="#2E7D22" stroke-width="1.8" stroke-linecap="round"/>
<line x1="336" y1="195" x2="339" y2="185" stroke="#2E7D22" stroke-width="1.8" stroke-linecap="round"/>
<circle cx="325" cy="183" r="4" fill="#FFD700"/>
<circle cx="329" cy="183" r="4" fill="#FFD700"/>
<circle cx="327" cy="180" r="4" fill="#FFD700"/>
<circle cx="327" cy="186" r="4" fill="#FFD700"/>
<circle cx="327" cy="183" r="2.8" fill="#FF9900"/>
<circle cx="337" cy="183" r="4" fill="#FFD700"/>
<circle cx="341" cy="183" r="4" fill="#FFD700"/>
<circle cx="339" cy="180" r="4" fill="#FFD700"/>
<circle cx="339" cy="186" r="4" fill="#FFD700"/>
<circle cx="339" cy="183" r="2.8" fill="#FF9900"/>
<!-- Fire -->
<g id="fireG" transform="translate(280,290) scale(1,1)">
  <ellipse cx="0" cy="6" rx="26" ry="10" fill="#FF3300" opacity=".9"/>
  <ellipse cx="0" cy="-3" rx="18" ry="18" fill="#FF5500"/>
  <ellipse cx="0" cy="-12" rx="12" ry="15" fill="#FF8800"/>
  <ellipse cx="0" cy="-18" rx="7" ry="10" fill="#FFCC00"/>
  <ellipse cx="0" cy="-22" rx="4" ry="7" fill="#FFF8CC"/>
  <ellipse cx="-12" cy="0" rx="7" ry="11" fill="#FF4400" opacity=".6"/>
  <ellipse cx="12" cy="0" rx="7" ry="11" fill="#FF4400" opacity=".6"/>
</g>
<ellipse cx="280" cy="297" rx="28" ry="4" fill="#FF1100" opacity=".2"/>
<!-- TV desk/stand -->
<rect x="466" y="244" width="162" height="14" rx="4" fill="#7A5E30"/>
<rect x="476" y="258" width="9" height="58" rx="2" fill="#5A4020"/>
<rect x="610" y="258" width="9" height="58" rx="2" fill="#5A4020"/>
<!-- Realistic flat-screen TV: black frame, blue screen with light streaks -->
<rect x="478" y="138" width="150" height="96" rx="8" fill="#111111"/>
<rect x="485" y="144" width="136" height="82" rx="4" fill="#87CEEB"/>
<!-- Screen light streaks (identical to before) -->
<polygon points="485,144 512,144 490,226 485,226" fill="rgba(255,255,255,.22)"/>
<polygon points="524,144 562,144 540,226 502,226" fill="rgba(255,255,255,.15)"/>
<polygon points="578,144 621,144 621,196 603,226 582,226" fill="rgba(255,255,255,.20)"/>
<!-- Grey tint overlay on top, screen content underneath stays identical -->
<rect x="485" y="144" width="136" height="82" rx="4" fill="#808080" opacity=".35"/>
<!-- TV stand center foot -->
<rect x="541" y="234" width="24" height="10" rx="2" fill="#222"/>
<rect x="528" y="242" width="50" height="4" rx="2" fill="#333"/>
<!-- Lamp (keep) -->
<rect x="473" y="228" width="5" height="18" rx="2" fill="#999"/>
<line x1="475" y1="228" x2="468" y2="210" stroke="#888" stroke-width="2.5"/>
<ellipse cx="466" cy="208" rx="16" ry="6" fill="#FFD870" opacity=".85"/>
<ellipse cx="466" cy="206" rx="11" ry="4" fill="#FFEEAA"/>
<!-- Plant (keep) -->
<rect x="614" y="232" width="14" height="14" rx="3" fill="#8B5E3C" stroke="#6B3E1C" stroke-width="1"/>
<ellipse cx="621" cy="226" rx="12" ry="9" fill="#228B22"/>
<ellipse cx="615" cy="222" rx="8" ry="7" fill="#2EAA2E"/>
<ellipse cx="626" cy="223" rx="7" ry="6" fill="#1A8A1A"/>
<!-- Rug -->
<ellipse cx="307" cy="326" rx="210" ry="22" fill="#4A4A4A"/>
<ellipse cx="307" cy="326" rx="196" ry="17" fill="#5E5E5E"/>
<ellipse cx="307" cy="326" rx="175" ry="12" fill="#727272" opacity=".8"/>
<!-- Left chair -->
<rect x="38" y="250" width="100" height="50" rx="9" fill="#C3B1E1" stroke="#6E5896" stroke-width="2.5"/>
<rect x="34" y="278" width="108" height="40" rx="7" fill="#D8CCEE" stroke="#6E5896" stroke-width="2"/>
<rect x="30" y="260" width="13" height="53" rx="6" fill="#9E86C4" stroke="#6E5896" stroke-width="1.5"/>
<rect x="133" y="260" width="13" height="53" rx="6" fill="#9E86C4" stroke="#6E5896" stroke-width="1.5"/>
<line x1="87" y1="280" x2="87" y2="316" stroke="#6E5896" stroke-width="1.5" opacity=".45"/>
<!-- Main couch -->
<rect x="154" y="242" width="308" height="56" rx="11" fill="#C3B1E1" stroke="#6E5896" stroke-width="2.5"/>
<rect x="150" y="272" width="316" height="46" rx="9" fill="#D8CCEE" stroke="#6E5896" stroke-width="2"/>
<rect x="143" y="252" width="15" height="62" rx="7" fill="#9E86C4" stroke="#6E5896" stroke-width="1.5"/>
<rect x="458" y="252" width="15" height="62" rx="7" fill="#9E86C4" stroke="#6E5896" stroke-width="1.5"/>
<line x1="229" y1="274" x2="229" y2="316" stroke="#6E5896" stroke-width="1.5" opacity=".45"/>
<line x1="308" y1="274" x2="308" y2="316" stroke="#6E5896" stroke-width="1.5" opacity=".45"/>
<line x1="387" y1="274" x2="387" y2="316" stroke="#6E5896" stroke-width="1.5" opacity=".45"/>
<line x1="229" y1="244" x2="229" y2="270" stroke="#6E5896" stroke-width="1" opacity=".3"/>
<line x1="308" y1="244" x2="308" y2="270" stroke="#6E5896" stroke-width="1" opacity=".3"/>
<line x1="387" y1="244" x2="387" y2="270" stroke="#6E5896" stroke-width="1" opacity=".3"/>
<!-- Right chair -->
<rect x="504" y="250" width="100" height="50" rx="9" fill="#C3B1E1" stroke="#6E5896" stroke-width="2.5"/>
<rect x="500" y="278" width="108" height="40" rx="7" fill="#D8CCEE" stroke="#6E5896" stroke-width="2"/>
<rect x="496" y="260" width="13" height="53" rx="6" fill="#9E86C4" stroke="#6E5896" stroke-width="1.5"/>
<rect x="599" y="260" width="13" height="53" rx="6" fill="#9E86C4" stroke="#6E5896" stroke-width="1.5"/>
<line x1="551" y1="280" x2="551" y2="316" stroke="#6E5896" stroke-width="1.5" opacity=".45"/>
<!-- Coffee table -->
<rect x="174" y="328" width="268" height="30" rx="8" fill="#5A3008" stroke="#3A1E04" stroke-width="2"/>
<rect x="180" y="331" width="256" height="22" rx="6" fill="#7A5028"/>
<rect x="186" y="357" width="9" height="12" rx="3" fill="#4A2006"/>
<rect x="429" y="357" width="9" height="12" rx="3" fill="#4A2006"/>
<g id="catG"></g>\`;
}

let fT=0;
function animFire(){
  fT+=.032;const sc=1+Math.sin(fT)*.03+Math.cos(fT*2.1)*.012;
  document.getElementById('fireG')?.setAttribute('transform',\`translate(280,290) scale(1,\${sc})\`);
  requestAnimationFrame(animFire);
}
function flash(){
  const el=document.getElementById('lFlash');if(!el)return;
  el.setAttribute('opacity','.8');setTimeout(()=>el.setAttribute('opacity','0'),70);
  setTimeout(()=>{el.setAttribute('opacity','.45');setTimeout(()=>el.setAttribute('opacity','0'),55);},140);
}

// ═══════════════════════════════════════
//  RAIN — strictly inside window
// ═══════════════════════════════════════
// SVG glass panes: top panes y37-115, bottom panes y119-199, x35-153
const WIN={x1:36,y1:38,x2:153,y2:199};
let rDrops=[],rCtx=null,rAF=null;
function initRain(){
  const c=document.getElementById('rainCanvas'),room=document.getElementById('livingRoom');
  c.width=room.clientWidth;c.height=room.clientHeight;
  rCtx=c.getContext('2d');rDrops=[];
  for(let i=0;i<65;i++) rDrops.push({xf:Math.random(),yf:Math.random()-.1,sp:.006+Math.random()*.009,len:.055+Math.random()*.07,op:.35+Math.random()*.5});
  if(rAF)cancelAnimationFrame(rAF);rainLoop();
}
function svgToPx(sx,sy){
  // preserveAspectRatio="none" means SVG fills the container exactly.
  // Simple linear mapping — no letterboxing offset needed.
  const c=document.getElementById('rainCanvas');
  return{x:sx/640*c.width, y:sy/400*c.height};
}
function rainLoop(){
  if(!rCtx)return;
  const c=document.getElementById('rainCanvas');if(!c)return;
  const tl=svgToPx(WIN.x1,WIN.y1),br=svgToPx(WIN.x2,WIN.y2);
  const wW=br.x-tl.x,wH=br.y-tl.y;
  rCtx.clearRect(0,0,c.width,c.height);
  rCtx.save();
  // Hard clip to the exact glass pane area only
  rCtx.beginPath();rCtx.rect(tl.x,tl.y,wW,wH);rCtx.clip();
  rDrops.forEach(d=>{
    const x=tl.x+d.xf*wW,y=tl.y+d.yf*wH;
    rCtx.save();rCtx.globalAlpha=d.op;rCtx.strokeStyle='#88BBFF';rCtx.lineWidth=1.1;
    rCtx.beginPath();rCtx.moveTo(x,y);rCtx.lineTo(x-wW*.022,y+d.len*wH);rCtx.stroke();
    rCtx.restore();
    d.yf+=d.sp;if(d.yf>1+d.len){d.yf=-(d.len+Math.random()*.08);d.xf=Math.random();}
  });
  rCtx.restore();rAF=requestAnimationFrame(rainLoop);
}
window.addEventListener('resize',()=>{
  checkOrientation();
  if(document.getElementById('gamePage').style.display!=='none'){
    const c=document.getElementById('rainCanvas'),r=document.getElementById('livingRoom');
    c.width=r.clientWidth;c.height=r.clientHeight;
  }
});

// ═══════════════════════════════════════
//  SOUND
// ═══════════════════════════════════════
let AC=null,sndMuted=false,rainNode=null,thunderInt=null,masterGain=null;
// Master volume (0–1) — drives the slider next to the dark/light switch and
// controls ALL audio on this tab: notification dings, rain, and thunder.
let volumeLevel=.7;
(function(){
  const v=localStorage.getItem('cg_vol');
  if(v!==null){const n=parseInt(v,10);if(!isNaN(n))volumeLevel=Math.max(0,Math.min(100,n))/100;}
})();
function setVolume(v){
  volumeLevel=Math.max(0,Math.min(100,Number(v)))/100;
  sndMuted=(volumeLevel===0);
  if(masterGain&&AC)masterGain.gain.setValueAtTime(volumeLevel,AC.currentTime);
  localStorage.setItem('cg_vol',String(Math.round(volumeLevel*100)));
  const sl=document.getElementById('volSlider');if(sl&&Number(sl.value)!==Math.round(volumeLevel*100))sl.value=Math.round(volumeLevel*100);
  const mb=document.getElementById('volMuteBtn');if(mb)mb.textContent=volumeLevel>0?'🔈':'🔇';
  // also pause/resume ambience when muting in-game
  if(document.getElementById('gamePage')&&document.getElementById('gamePage').style.display!=='none'){
    if(sndMuted)stopAmbience(); else if(!sndMuted&&!thunderInt)startAmbience();
  }
}
let _preMuteVol=0.7;
function toggleVolMute(){
  try{getAC();}catch(e){}
  if(volumeLevel>0){_preMuteVol=volumeLevel;setVolume(0);}
  else{setVolume(Math.round((_preMuteVol>0?_preMuteVol:0.5)*100));}
}
function getAC(){
  if(!AC){
    AC=new(window.AudioContext||window.webkitAudioContext)();
    masterGain=AC.createGain();
    masterGain.gain.value=volumeLevel;
    masterGain.connect(AC.destination);
  }
  if(AC.state==='suspended')AC.resume();
  return AC;
}
function playTone(f1,f2,dur,vol){
  if(sndMuted)return;
  try{const ac=getAC(),o=ac.createOscillator(),g=ac.createGain();
    o.connect(g);g.connect(masterGain);
    o.frequency.setValueAtTime(f1,ac.currentTime);if(f2)o.frequency.setValueAtTime(f2,ac.currentTime+dur*.4);
    g.gain.setValueAtTime(vol||.14,ac.currentTime);g.gain.exponentialRampToValueAtTime(.0001,ac.currentTime+dur);
    o.start();o.stop(ac.currentTime+dur);}catch(e){}
}
function makeNoise(dur,lpHz,vol){
  if(sndMuted)return null;
  try{const ac=getAC(),buf=ac.createBuffer(1,ac.sampleRate*dur,ac.sampleRate),d=buf.getChannelData(0);
    for(let i=0;i<d.length;i++)d[i]=Math.random()*2-1;
    const src=ac.createBufferSource(),f=ac.createBiquadFilter(),g=ac.createGain();
    f.type='bandpass';f.frequency.value=lpHz;f.Q.value=.5;
    src.buffer=buf;src.loop=true;src.connect(f);f.connect(g);g.connect(masterGain);
    g.gain.setValueAtTime(.0001,ac.currentTime);g.gain.linearRampToValueAtTime(vol,ac.currentTime+.6);
    src.start();return{src,gain:g,ac};}catch(e){return null;}
}
function stopNode(n){if(!n)return;try{n.gain.gain.linearRampToValueAtTime(.0001,n.ac.currentTime+.4);setTimeout(()=>{try{n.src.stop();}catch(e){}},500);}catch(e){}}
function playThunder(){
  if(sndMuted)return;
  try{const ac=getAC(),dur=2.2,buf=ac.createBuffer(1,ac.sampleRate*dur,ac.sampleRate),d=buf.getChannelData(0);
    for(let i=0;i<d.length;i++)d[i]=(Math.random()*2-1)*Math.pow(Math.max(0,1-i/(d.length*.65)),1.5);
    const src=ac.createBufferSource(),lp=ac.createBiquadFilter(),g=ac.createGain();
    lp.type='lowpass';lp.frequency.value=190;src.buffer=buf;src.connect(lp);lp.connect(g);g.connect(masterGain);
    g.gain.setValueAtTime(.0001,ac.currentTime);g.gain.linearRampToValueAtTime(.5,ac.currentTime+.06);
    g.gain.exponentialRampToValueAtTime(.0001,ac.currentTime+dur);src.start();}catch(e){}
}
function startAmbience(){
  stopAmbience();rainNode=makeNoise(4,2600,.055);
  thunderInt=setInterval(()=>{if(Math.random()<.55){const dl=Math.random()*1800;setTimeout(()=>{flash();setTimeout(playThunder,90+Math.random()*180);},dl);}},3000);
}
function stopAmbience(){clearInterval(thunderInt);thunderInt=null;stopNode(rainNode);rainNode=null;}
// muting now via toggleVolMute()+volMuteBtn in header
(function(){const vs=document.getElementById('volSlider');if(vs)vs.value=Math.round(volumeLevel*100);})();

// ═══════════════════════════════════════
//  CAT
// ═══════════════════════════════════════
const SURFS=[[0,640,314],[174,442,326],[150,466,270],[30,143,276],[496,612,276],[216,350,198],[466,628,242]];
const JUMPS=[[1,2,3,4],[0,2],[0,1,3,4],[0,2],[0,2],[0],[0]];
let cat={x:150,y:SURFS[0][2],surf:0,vx:0,state:'idle',timer:60,dir:1,frame:0,ft:0,jp:0,jfx:0,jfy:0,jtx:0,jty:0,vis:true,offTimer:0};

function catNameBlock(x,y){
  for(const s of SEATS){if(Math.abs(x-s.cx)<30&&y>s.sy&&y<s.sy+22)return true;}return false;
}
function catTick(){
  // Deterministic position from UTC time: identical on ALL clients simultaneously
  const PERIOD=24000,t=Date.now()%PERIOD;
  const X1=168,X2=456;
  cat.surf=0;cat.y=SURFS[0][2];cat.vis=true;
  cat.ft++;if(cat.ft>6){cat.ft=0;cat.frame=(cat.frame+1)%4;}
  if(t<10000){
    cat.x=X1+(t/10000)*(X2-X1);cat.dir=1;cat.state='walk';
  }else if(t<13000){
    cat.x=X2;cat.dir=-1;cat.state='idle';cat.frame=0;cat.ft=0;
  }else if(t<23000){
    cat.x=X2-((t-13000)/10000)*(X2-X1);cat.dir=-1;cat.state='walk';
  }else{
    cat.x=X1;cat.dir=1;cat.state='idle';cat.frame=0;cat.ft=0;
  }
}
function catDecide(){
  const surf=SURFS[cat.surf],r=Math.random();
  if(r<.1&&JUMPS[cat.surf].length){
    const ti=JUMPS[cat.surf][Math.floor(Math.random()*JUMPS[cat.surf].length)];
    const ts=SURFS[ti];
    let tx=ts[0]+(ts[1]-ts[0])*(.2+Math.random()*.6);
    if(catNameBlock(tx,ts[2]))tx+=(tx>320?30:-30);
    tx=Math.max(ts[0]+26,Math.min(ts[1]-26,tx));
    cat.jfx=cat.x;cat.jfy=cat.y;cat.jtx=tx;cat.jty=ts[2];cat.jp=0;
    cat.surf=ti;cat.dir=tx>cat.x?1:-1;cat.state='jump';cat.timer=30;
  } else if(r<.3){cat.state='idle';cat.timer=40+Math.floor(Math.random()*100);cat.vx=0;}
  else{cat.dir=Math.random()<.5?1:-1;cat.vx=cat.dir*(0.7+Math.random()*.9);cat.state='walk';cat.timer=30+Math.floor(Math.random()*70);}
}
function drawCat(){
  const g=document.getElementById('catG');if(!g)return;g.innerHTML='';if(!cat.vis)return;
  const x=Math.round(cat.x),y=Math.round(cat.y),sc=cat.dir;
  const walk=cat.state==='walk'||cat.state==='jump';
  const lsw=walk?Math.sin(cat.frame*Math.PI/2)*4:0;
  const mk=(tag,attrs)=>{const el=document.createElementNS('http://www.w3.org/2000/svg',tag);for(const[k,v]of Object.entries(attrs))el.setAttribute(k,v);g.appendChild(el);return el;};
  // Tail
  const curl=Math.sin(cat.ft*.5)*5;
  mk('path',{d:\`M\${x-sc*13},\${y-8} Q\${x-sc*20},\${y-18+curl} \${x-sc*14},\${y-26}\`,fill:'none',stroke:'#D4722A','stroke-width':'3.5','stroke-linecap':'round'});
  // Legs
  [[x-8+lsw,y],[x-3-lsw,y],[x+3+lsw,y],[x+8-lsw,y]].forEach(([lx,ly])=>{
    mk('line',{x1:lx,y1:ly-2,x2:lx,y2:ly+7,stroke:'#9B5520','stroke-width':'3','stroke-linecap':'round'});
    mk('ellipse',{cx:lx,cy:ly+7,rx:'3',ry:'2',fill:'#C06020'});
  });
  // Body
  mk('ellipse',{cx:x,cy:y-9,rx:'13',ry:'9',fill:'#E8813A',stroke:'#9B5520','stroke-width':'1.5'});
  // Body stripes
  [{x1:x-4,y1:y-16,x2:x-4,y2:y-12},{x1:x,y1:y-17,x2:x,y2:y-13},{x1:x+4,y1:y-16,x2:x+4,y2:y-12}].forEach(a=>mk('line',{...a,stroke:'#C06830','stroke-width':'1.5','stroke-linecap':'round'}));
  // Head
  const hx=x+sc*9,hy=y-16;
  mk('ellipse',{cx:hx,cy:hy,rx:'9',ry:'8.5',fill:'#E8813A',stroke:'#9B5520','stroke-width':'1.5'});
  // Ears — two triangles on top of head, close together, centered on head
  // Head center is hx,hy. Ear bases sit on top of head at hy-8.
  // Left ear (from viewer): slightly left of head center
  // Right ear: slightly right of head center
  // Independent of sc (direction) so they always look correct
  const earCy=hy-8;
  const ear1x=hx-4, ear2x=hx+4; // base centers, 8px apart
  [[ear1x],[ear2x]].forEach(([ecx])=>{
    mk('polygon',{
      points:\`\${ecx-4},\${earCy} \${ecx},\${earCy-10} \${ecx+4},\${earCy}\`,
      fill:'#E8813A',stroke:'#9B5520','stroke-width':'1.2'
    });
    mk('polygon',{
      points:\`\${ecx-2.5},\${earCy-.5} \${ecx},\${earCy-7.5} \${ecx+2.5},\${earCy-.5}\`,
      fill:'#FFB0A0'
    });
  });
  // Eyes with irises
  const ex1=hx+sc*3.5,ex2=hx-sc*2,ey3=hy-2;
  [ex1,ex2].forEach(ex=>{
    mk('ellipse',{cx:ex,cy:ey3,rx:'2.5',ry:'3',fill:'#fff'});
    mk('ellipse',{cx:ex,cy:ey3+.5,rx:'1.6',ry:'2',fill:'#55AA22'});
    mk('ellipse',{cx:ex,cy:ey3+.5,rx:'.9',ry:'1.4',fill:'#111'});
    mk('circle',{cx:ex+.8,cy:ey3-.8,r:'0.8',fill:'#fff'});
    mk('ellipse',{cx:ex,cy:ey3,rx:'2.5',ry:'3',fill:'none',stroke:'#1a1a1a','stroke-width':'1'});
  });
  // Nose
  mk('polygon',{points:\`\${hx+sc*6},\${hy+1.5} \${hx+sc*7.5},\${hy+4} \${hx+sc*4.5},\${hy+4}\`,fill:'#FF9999',stroke:'#DD6666','stroke-width':'.6'});
  // Mouth
  mk('path',{d:\`M\${hx+sc*6},\${hy+4} Q\${hx+sc*5},\${hy+6.5} \${hx+sc*3.5},\${hy+5.5}\`,fill:'none',stroke:'#9B5520','stroke-width':'1','stroke-linecap':'round'});
  mk('path',{d:\`M\${hx+sc*6},\${hy+4} Q\${hx+sc*7},\${hy+6.5} \${hx+sc*8.5},\${hy+5.5}\`,fill:'none',stroke:'#9B5520','stroke-width':'1','stroke-linecap':'round'});
  // Whiskers
  [[hx+sc*5,hy+3,sc*9,-1],[hx+sc*5,hy+5,sc*9,1]].forEach(([wx,wy,dx,dy])=>{
    mk('line',{x1:wx,y1:wy,x2:wx+dx,y2:wy+dy,stroke:'#fff','stroke-width':'.9',opacity:'.85'});
    mk('line',{x1:wx,y1:wy,x2:wx-dx*.55,y2:wy+dy,stroke:'#fff','stroke-width':'.9',opacity:'.85'});
  });
}
let catInt=null;
// ── Light cat meow sounds while the cat is active ──
let _catMeowTimer=null;
function playCatMeow(){
  if(sndMuted) return;
  try{
    const ac=getAC();
    const osc=ac.createOscillator(),fil=ac.createBiquadFilter(),g=ac.createGain();
    fil.type='bandpass';fil.frequency.value=900;fil.Q.value=2.5;
    osc.connect(fil);fil.connect(g);g.connect(masterGain);
    osc.frequency.setValueAtTime(550,ac.currentTime);
    osc.frequency.linearRampToValueAtTime(1100,ac.currentTime+.18);
    osc.frequency.linearRampToValueAtTime(750,ac.currentTime+.45);
    g.gain.setValueAtTime(0,ac.currentTime);
    g.gain.linearRampToValueAtTime(.11,ac.currentTime+.06);
    g.gain.setValueAtTime(.11,ac.currentTime+.38);
    g.gain.linearRampToValueAtTime(0,ac.currentTime+.55);
    osc.start(ac.currentTime);osc.stop(ac.currentTime+.6);
  }catch(e){}
}
function startCatMeows(){
  stopCatMeows();
  const next=()=>{ _catMeowTimer=setTimeout(()=>{ playCatMeow(); next(); },15000+Math.random()*35000); };
  next();
}
function stopCatMeows(){ if(_catMeowTimer){clearTimeout(_catMeowTimer);_catMeowTimer=null;} }

function startCat(){
  try{startCatMeows();}catch(e){}
  if(catInt)clearInterval(catInt);
  cat={x:150,y:SURFS[0][2],surf:0,vx:0,state:'idle',timer:60,dir:1,frame:0,ft:0,jp:0,jfx:0,jfy:0,jtx:0,jty:0,vis:true,offTimer:0};
  catInt=setInterval(()=>{ try{catTick();drawCat();}catch(e){} },50);
}
function stopCat(){ try{stopCatMeows();}catch(e){} clearInterval(catInt);catInt=null; }

// ═══════════════════════════════════════
//  GAME STATE
// ═══════════════════════════════════════
// ── Orientation guard (portrait mobile = show rotate message)
function checkOrientation(){
  const msg=document.getElementById('rotateMsg');
  const isMobile=window.innerWidth<1024||('ontouchstart' in window);
  const isPortrait=window.innerHeight>window.innerWidth;
  if(isMobile&&isPortrait){
    msg.style.display='flex';
  } else {
    msg.style.display='none';
  }
}
window.addEventListener('resize',checkOrientation);
window.addEventListener('orientationchange',checkOrientation);
checkOrientation();

const socket=io({transports:['websocket']});
let myId=null,mySeat=-1,lobbyCode='';
let players={};
let muted=new Set();
let bubbles={};
let allLobbies=[];
let chatCount=0; // for alternating rows

// Instantly drop the connection the moment the tab/app is actually going away
// (closing the tab, swiping it away, closing the browser, navigating off).
// This forces a clean WebSocket close right away instead of waiting for the
// server's heartbeat timeout to notice — so other players see the leave
// immediately no matter how the page was closed.
window.addEventListener('pagehide',()=>{
  _intentionalLeave=true;
  try{socket.disconnect();}catch(e){}
});

function updateLobbyCount(){
  const cnt=Object.keys(players).length;
  document.getElementById('lobbyCnt').textContent=\`\${cnt}/8\`;
}

function renderPlayers(){
  const layer=document.getElementById('avatarLayer');
  if(!layer)return;
  layer.innerHTML='';
  Object.values(players).forEach(p=>{
    if(p.seat===undefined||p.seat<0||p.seat>=8)return;
    placeChar(layer,p,SEATS[p.seat].cx,SEATS[p.seat].sy);
  });
  updateLobbyCount();
}

// Avatars are plain HTML (canvas + div), percentage-positioned over the
// room — NOT SVG foreignObject. Percentage positioning is resolved by the
// browser's own box layout relative to #roomBox's actual rendered size,
// identically on every browser, so this can never drift out of sync with
// the couch artwork the way foreignObject-in-SVG could on Safari/WebKit.
function placeChar(layer,player,cx,sy){
  const R=22,dim=R*2+16; // same nominal "room units" as the original design
  const wrap=document.createElement('div');
  wrap.className='avatar-wrap';
  wrap.style.left=(cx/640*100)+'%';
  wrap.style.top=(sy/400*100)+'%';

  const PX=3; // internal render resolution multiplier, for crisp avatars at any room size
  const cvs=document.createElement('canvas');
  cvs.width=dim*PX;cvs.height=(dim+12)*PX;
  drawAV(cvs.getContext('2d'),player.avatar||{},cvs.width/2,cvs.height*.55,R*PX*.85);
  wrap.appendChild(cvs);

  const isMe=player.id===myId;
  const tag=document.createElement('div');
  tag.className='avatar-nametag'+(isMe?' is-me':'');
  tag.textContent=isMe?\`\${player.name} (you)\`:player.name;
  wrap.appendChild(tag);

  layer.appendChild(wrap);
}

function renderList(){
  const list=document.getElementById('playerList');list.innerHTML='';
  Object.values(players).forEach(p=>{
    const isMe=p.id===myId,isMuted=muted.has(p.id);
    const div=document.createElement('div');div.className='p-entry'+(isMuted?' muted':'');div.dataset.pid=p.id;
    const cvs=document.createElement('canvas');cvs.width=40;cvs.height=48;cvs.style.cssText='width:40px;height:48px;display:block;flex-shrink:0;';
    drawAV(cvs.getContext('2d'),p.avatar||{},20,48*.46,13);
    const nw=document.createElement('div');nw.className='p-name-wrap';
    const nm=document.createElement('div');nm.className='p-name';nm.textContent=p.name;
    nw.appendChild(nm);
    if(isMe){const y=document.createElement('span');y.className='p-you';y.textContent='(you)';nw.appendChild(y);}
    div.appendChild(cvs);div.appendChild(nw);
    if(isMuted){const m=document.createElement('span');m.style.cssText='font-size:.55rem;flex-shrink:0;';m.textContent='🔇';div.appendChild(m);}
    if(!isMe)div.addEventListener('click',e=>showCtx(e,p));
    list.appendChild(div);
  });
  updateLobbyCount();
}

let ctxP=null;
function showCtx(e,p){ctxP=p;const m=document.getElementById('ctxMenu');document.getElementById('ctxName').textContent=p.name;document.getElementById('ctxMute').textContent=muted.has(p.id)?'🔊 Unmute':'🔇 Mute';m.style.display='block';m.style.left=Math.min(e.clientX,window.innerWidth-130)+'px';m.style.top=Math.min(e.clientY,window.innerHeight-90)+'px';e.stopPropagation();}
document.addEventListener('click',()=>document.getElementById('ctxMenu').style.display='none');
function ctxDoMute(){if(!ctxP)return;muted.has(ctxP.id)?muted.delete(ctxP.id):muted.add(ctxP.id);renderList();document.getElementById('ctxMenu').style.display='none';}
// Vote-kick cooldown — stops any single player from spamming vote-kicks
const VOTE_KICK_COOLDOWN_MS=180000; // 3 minutes
let lastVoteKickAt=0;
function ctxDoKick(){
  if(!ctxP)return;
  document.getElementById('ctxMenu').style.display='none';
  const now=Date.now(),remain=VOTE_KICK_COOLDOWN_MS-(now-lastVoteKickAt);
  if(remain>0){
    const _mins=Math.floor(remain/60000),_secs=Math.ceil((remain%60000)/1000);
    const _tstr=_mins>0?\`\${_mins}m \${_secs}s\`:\`\${_secs}s\`;
    addMsg(\`<span class="sys-vote">⏳ Vote kick cooldown — please wait \${_tstr}.</span>\`,'sys-vote');
    return;
  }
  lastVoteKickAt=now;
  socket.emit('voteKick',{targetId:ctxP.id});
}

// Chat — alternating rows
function addMsg(html,cls){
  const c=document.getElementById('chatMsgs');
  const d=document.createElement('div');
  const rowClass=chatCount%2===0?'cmsg-even':'cmsg-odd';
  d.className='cmsg '+rowClass+(cls?' '+cls:'');
  d.innerHTML=html;c.appendChild(d);c.scrollTop=c.scrollHeight;chatCount++;
  while(c.children.length>120){c.removeChild(c.firstChild);}
}

// Chat input: hard max 200 chars (prevent over-limit on keydown)
document.getElementById('chatInp').addEventListener('keydown',e=>{
  const inp=e.target;
  if(inp.value.length>=100&&e.key.length===1&&!e.ctrlKey&&!e.metaKey){e.preventDefault();return;}
  if(e.key==='Enter')sendChat();
});
document.getElementById('chatSend').addEventListener('click',sendChat);
// Enter key: when in-game and chat isn't focused, focus it
document.addEventListener('keydown',e=>{
  if(e.key==='Enter'&&document.getElementById('gamePage')&&document.getElementById('gamePage').style.display!=='none'){
    const ci=document.getElementById('chatInp');
    if(ci&&document.activeElement!==ci&&document.activeElement!==document.getElementById('chatSend')){
      e.preventDefault();ci.focus();
    }
  }
});
function sendChat(){const i=document.getElementById('chatInp');const m=i.value.trim().substring(0,100);if(!m)return;socket.emit('chat',{message:m});i.value='';}

function showBubble(seat,text){
  const room=document.getElementById('roomBox');if(!room||seat<0||seat>=8)return;
  if(bubbles[seat]){clearTimeout(bubbles[seat].t);bubbles[seat].el.remove();}
  const s=SEATS[seat];
  const b=document.createElement('div');b.className='bubble';
  b.textContent=text.length>34?text.substring(0,34)+'…':text;
  // Percentage-positioned, same system as avatars — stays locked above
  // the right player's head on every browser/device.
  b.style.left=(s.cx/640*100)+'%';
  b.style.top=((s.sy-78)/400*100)+'%';
  room.appendChild(b);
  const t=setTimeout(()=>{b.remove();delete bubbles[seat];},6000);
  bubbles[seat]={el:b,t};
}

// ── Socket events
socket.on('lobbyList',list=>{allLobbies=list||[];renderLobbies();});

socket.on('joined',({playerId,seat,lobbyState,code})=>{
  _intentionalLeave=false; // CRITICAL: reset so disconnect overlay works again after rejoining
  myId=playerId;mySeat=seat;lobbyCode=code;chatCount=0;
  players={};lobbyState.players.forEach(p=>players[p.id]=p);
  document.getElementById('rcDisp').textContent=code;
  showGame();renderPlayers();renderList();
  addMsg('<span style="color:#1a7a1a;font-weight:800">✓ You joined!</span>');
});

socket.on('playerJoined',({player,message})=>{
  players[player.id]=player;renderPlayers();renderList();
  addMsg(X(message),'sys-join');playTone(440,660,.35,.13);
});

socket.on('playerLeft',({playerId,playerName,reason,lobbyState})=>{
  // Immediately remove from local state
  delete players[playerId];
  // Reconcile with authoritative server state
  if(lobbyState){
    const ids=new Set(lobbyState.players.map(p=>p.id));
    // Remove anyone server doesn't know about
    Object.keys(players).forEach(id=>{if(!ids.has(id))delete players[id];});
    // Add anyone missing locally
    lobbyState.players.forEach(p=>{if(!players[p.id])players[p.id]=p;});
  }
  renderPlayers();renderList();
  // Only 'left' goes to chat here; 'kicked' is already handled by systemMessage from server
  if(reason!=='kicked'){
    addMsg(X(\`\${playerName} left\`),'sys-leave');
  }
  playTone(440,330,.35,.13);
});

socket.on('chat',({senderId,senderName,message})=>{
  if(muted.has(senderId))return;
  addMsg(\`<span class="sname">\${X(senderName)}:</span> <span class="mbody">\${X(message)}</span>\`);
  playTone(880,0,.1,.055);
  const p=players[senderId];
  if(p&&p.seat!==undefined)showBubble(p.seat,message);
});

socket.on('systemMessage',({text,type})=>{
  const m={join:'sys-join',leave:'sys-leave',kick:'sys-kick',vote:'sys-vote'};
  addMsg(X(text),m[type]||'');
});

socket.on('kicked',({lobbyCode:kCode})=>{
  // BULLETPROOF KICK NOTICE: write to localStorage FIRST, then force
  // a hard page reload. This guarantees the notice shows no matter
  // what — it can't be blocked by any extension, race condition, or
  // in-page JS state issue, because it doesn't rely on the CURRENT
  // page's JS continuing to run correctly. The fresh page load checks
  // localStorage at the very top of execution (same reliable pattern
  // as the age gate) and shows the notice before anything else runs.
  try{
    localStorage.setItem('cg_kicked_notice', JSON.stringify({
      lobbyCode: kCode,
      until: Date.now() + (10*60*1000),
      shownAt: Date.now()
    }));
  }catch(e){}
  // Hard reload — always lands back on the home page, guaranteed,
  // with zero leftover state from the game session.
  window.location.href = window.location.origin + window.location.pathname;
});

socket.on('joinError',({message})=>showErr(message));
socket.on('leftLobby',()=>showHome());
socket.on('voteReset',({targetName})=>{
  addMsg(\`<span class="sys-vote">🔄 Vote kick against \${X(targetName)} has reset after 2 minutes.</span>\`,'sys-vote');
});
socket.on('voteKickCooldown',({secondsRemaining})=>{
  const _m=Math.floor(secondsRemaining/60),_s=secondsRemaining%60;
  const _ts=_m>0?\`\${_m}m \${_s}s\`:\`\${_s}s\`;
  addMsg(\`<span class="sys-vote">⏳ Vote kick cooldown — please wait \${_ts}.</span>\`,'sys-vote');
});

// Private notices shown only to sender
socket.on('chatBlocked',({type}={})=>{
  const c=document.getElementById('chatMsgs');
  const d=document.createElement('div');
  d.className='msg-blocked';
  d.textContent=type==='spam'
    ? '⏱️ You’re sending messages too quickly.'
    : '⛔ Message was not sent — your message contained content that is not allowed.';
  c.appendChild(d);c.scrollTop=c.scrollHeight;
  setTimeout(()=>{ try{d.remove();}catch(e){} },4000);
});



// ── Disconnect detection ──────────────────────────────────────────────
// Track whether WE initiated the leave (button, pagehide) so we can
// distinguish intentional exits from actual dropped connections.
let _intentionalLeave=false;

socket.on('disconnect',(reason)=>{
  // 'io client disconnect' = we called socket.disconnect() ourselves
  // (Leave button, tab close via pagehide). Don't show the error overlay.
  if(reason==='io client disconnect'||_intentionalLeave) return;
  // Anything else: ping timeout, transport close, transport error, server
  // disconnect — these are real connection losses the player didn't choose.
  showDisconnectOverlay();
});

socket.on('connect',()=>{
  // Auto-recover when WiFi returns: hide disconnect overlay, refresh lobby list
  // NOTE: do NOT hide kickNotice here — if you were just kicked and the socket
  // briefly reconnects, hiding it here would make the kick message disappear instantly.
  document.getElementById('disconnectOverlay').style.display='none';
  clearTimeout(window._kickTimer);
  _intentionalLeave=false;
  if(document.getElementById('homePage').style.display!=='none'){
    socket.emit('getLobbyList');
  }
});

function showDisconnectOverlay(){
  players={};muted=new Set();chatCount=0;
  Object.values(bubbles||{}).forEach(b=>{try{clearTimeout(b.t);b.el.remove();}catch(e){}});bubbles={};
  try{stopAmbience();}catch(e){}
  try{stopCat();}catch(e){}
  if(typeof rAF!=='undefined'&&rAF){cancelAnimationFrame(rAF);rAF=null;}
  _intentionalLeave=false; // reset so future reconnects work correctly
  document.getElementById('gamePage').style.display='none';
  document.body.classList.remove('game-active');
  document.getElementById('homePage').style.display='flex';
  forceShow(document.getElementById('disconnectOverlay'),'flex');
}

function dismissDisconnect(){
  forceHide(document.getElementById('disconnectOverlay'));
  // Only emit if connected — connect handler will handle it on WiFi restore
  if(socket.connected) socket.emit('getLobbyList');
}

function dismissKick(){
  forceHide(document.getElementById('kickNotice'));
  socket.emit('getLobbyList');
}

// Leave confirm
function askLeave(){document.getElementById('leaveConfirm').style.display='flex';}
function cancelLeave(){document.getElementById('leaveConfirm').style.display='none';}
function confirmLeave(){document.getElementById('leaveConfirm').style.display='none';leaveGame(false);}

function playRandom(){
  const nameVal=document.getElementById('nameInp').value;
  const chk=validateUsername(nameVal);
  if(chk.valid===false){liveCheckName(nameVal);showErr('Please fix your username before joining.');return;}
  try{getAC();}catch(e){}saveP();
  socket.emit('joinRandom',{name:document.getElementById('nameInp').value,avatar:{...AV}});
}
function playCode(){
  const nameVal=document.getElementById('nameInp').value;
  const chk=validateUsername(nameVal);
  if(chk.valid===false){liveCheckName(nameVal);showErr('Please fix your username before joining.');return;}
  try{getAC();}catch(e){}saveP();
  const code=document.getElementById('codeInp').value.trim().toUpperCase();
  if(!code||code.length!==5){showErr('Enter a valid 5-letter room code.');return;}
  socket.emit('joinByCode',{code,name:document.getElementById('nameInp').value,avatar:{...AV}});
}
function showErr(m){const e=document.getElementById('homeErr');e.textContent=m;e.style.display='block';setTimeout(()=>e.style.display='none',5000);}

function leaveGame(skipSocket){
  _intentionalLeave=true; // prevent disconnect overlay during deliberate leave
  if(!skipSocket)socket.emit('leave');
  players={};muted=new Set();chatCount=0;
  Object.values(bubbles||{}).forEach(b=>{try{clearTimeout(b.t);b.el.remove();}catch(e){}});bubbles={};
  try{stopAmbience();}catch(e){}
  try{stopCat();}catch(e){}
  if(typeof rAF!=='undefined'&&rAF){cancelAnimationFrame(rAF);rAF=null;}
  // Reset after 3s so future disconnect detection works again in the same session
  setTimeout(()=>{ _intentionalLeave=false; },3000);
}
function showGame(){
  forceHide(document.getElementById('kickNotice'));
  clearTimeout(window._kickTimer);
  document.getElementById('homePage').style.display='none';
  const gp=document.getElementById('gamePage');
  gp.style.display='flex';
  document.body.classList.add('game-active');
  document.getElementById('chatMsgs').innerHTML='';
  document.getElementById('leaveConfirm').style.display='none';
  sizeRoom();
  setTimeout(()=>{sizeRoom();initRain();animFire();startAmbience();startCat();},80);
}
function showHome(){
  forceHide(document.getElementById('kickNotice'));
  forceHide(document.getElementById('disconnectOverlay'));
  try{stopAmbience();}catch(e){}
  try{stopCat();}catch(e){}
  if(typeof rAF!=='undefined'&&rAF){cancelAnimationFrame(rAF);rAF=null;}
  _intentionalLeave=false; // reset so future disconnect overlay works
  document.getElementById('homePage').style.display='flex';
  document.getElementById('gamePage').style.display='none';
  document.body.classList.remove('game-active');
  socket.emit('getLobbyList');
}

function renderLobbies(){
  const el=document.getElementById('lobbyList');
  const list=(allLobbies||[]).slice().sort((a,b)=>(a.count>=a.max?1:0)-(b.count>=b.max?1:0));
  const tc=document.getElementById('totalPlayersCount');
  if(tc)tc.textContent=(allLobbies||[]).reduce((s,l)=>s+l.count,0);
  if(!list.length){el.innerHTML='<div class="no-lob">No open lobbies — be the first!</div>';return;}
  el.innerHTML='';
  list.forEach(l=>{
    const isFull=l.count>=l.max;
    const div=document.createElement('div');div.className='lobby-item'+(isFull?' lobby-full':'');
    const avRow=document.createElement('div');avRow.className='lobby-avatars';
    (l.players||[]).forEach(p=>{
      const c=document.createElement('canvas');c.width=22;c.height=26;c.style.cssText='width:22px;height:26px;display:block;';
      drawAV(c.getContext('2d'),p.avatar||{},11,26*.46,7);avRow.appendChild(c);
    });
    const names=document.createElement('div');names.className='lobby-names';names.textContent=(l.players||[]).map(p=>p.name).join(', ');
    const codeEl=document.createElement('div');codeEl.className='lobby-code-txt';codeEl.textContent=l.code;
    const left=document.createElement('div');left.style.cssText='display:flex;flex-direction:column;gap:1px;';
    left.appendChild(avRow);left.appendChild(names);left.appendChild(codeEl);
    const right=document.createElement('div');right.className='lobby-cnt';
    right.innerHTML=\`\${l.count}/\${l.max}\${isFull?'<div class="lobby-full-tag">FULL</div>':''}<div class="lobby-bar"><div class="lobby-fill" style="width:\${(l.count/l.max)*100}%"></div></div>\`;
    div.appendChild(left);div.appendChild(right);
    // Clicking a joinable lobby directly joins it; full lobbies are shown but not clickable
    if(!isFull){
      div.onclick=()=>{
        // Check client-side kick ban on this specific lobby
        if(window._kickedFromCode===l.code && window._kickedUntil && Date.now()<window._kickedUntil){
          const minsLeft=Math.ceil((window._kickedUntil-Date.now())/60000);
          showErr(\`You were kicked from this lobby. Wait \${minsLeft} minute\${minsLeft!==1?'s':''} to rejoin.\`);
          return;
        }
        try{getAC();}catch(e){}saveP();
        socket.emit('joinByCode',{code:l.code,name:document.getElementById('nameInp').value,avatar:{...AV}});
      };
    }
    el.appendChild(div);
  });
}

function X(s){return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');}

buildRoom();
socket.emit('getLobbyList');
</script>
</body>
</html>
`;
app.get('/', (req,res) => res.type('html').send(INDEX_HTML));

const LOBBY_MAX = 8;
const KICK_BAN_MS = 10*60*1000;
const VOTE_KICK_COOLDOWN_MS = 3*60*1000; // 3 minutes

const WORD_LIST = [
  'AppleSauce','BagelBoy','CinnamonRoll','DonutDude','EggRoll','FrenchFry','GummiBear','HotDog',
  'IceCream','JellyBean','KiwiSlice','LemonDrop','MapleSyrup','NoodleSoup','OrangePeel','PizzaSlice',
  'QuailEgg','RamenBowl','SushiRoll','TacoBell','UdonNoodle','VanillaPuff','WaffleStack','XtraCheese',
  'YogurtCup','ZestyLime','AlmondMilk','BubbleTea','CaramelPop','DumplingKing','EspressoShot','FudgeCake',
  'GarlicBread','HoneyBee','IrishStew','JamToast','KetchupBot','LollipopKid','MuffinTop','NachoCheese',
  'OnionRing','PretzelTwist','QuickOats','RootBeerFloat','SnickDoodle','ToasterWaffle','UmeboshiPit',
  'VelvetCake','WhippedCream','XtraSpicy','YumYumSauce','ZestyChip','AcaiBowl','BananaChip','CerealKiller',
  'DairyFree','EdamameBean','FigJam','GranolaPal','HazelnutMilk','IndigoMochi','JalapenoPop','KumquatSlice',
  'LimeSorbet','MangoLassi','NutmegRoll','OatmealRaise','PeachPie','QuinceJelly','RaspberryChill',
  'SesameSnap','TangerineZest','UltraFudge','VioletMacaroon','WatermelonBit','YuzuPudding','ZucchiniLoaf',
  'ArcticFox','BumbleBee','ChubbyPanda','DrowsySloth','EagerEagle','FlufffyCat','GrumpyGoose',
  'HappyHedgehog','IcyPenguin','JollyDolphin','KookyKoala','LazeLizard','MelloMoose','NappingNarwhal',
  'OddOtter','PeacefulPanda','QuietQuail','RoundRaccoon','SleepySeal','TinyTurtle','UglyDuckling',
  'VelvetVole','WobbleWalrus','XtraFluffy','YawnYak','ZippyZebra','AbsentBear','BouncyCub','CloudyOwl',
  'DazedDeer','EarlyBird','FuzzyFerret','GloomyGull','HeftyHippo','ImpishIbis','JovialJay','KindKangaroo',
  'LurkingLynx','MajorMagpie','NiftyNewt','OrneryOx','PlumpPigeon','QuirkyQuokka','RusticRaven',
  'SoftSquirrel','TinyToad','UniqueUnicorn','VelvetVixen','WackyWeasel','YippeeYak','ZanyZorilla',
  'AquaChair','BluePillow','CoralCushion','DimpleSofa','EmeraldRug','FluffyCouch','GoldenLamp',
  'HeavyTable','IndigoVase','JadePlant','KhakiCarpet','LimeDoor','MarbleSink','NeonSign','OliveDesk',
  'PinkClock','QuartzShelf','RusticWall','SilverFrame','TealDrape','UltraDesk','VelvetChair',
  'WickerBasket','XtraSoft','YellowBlind','ZenGarden','AtomicToaster','BulkyBlanket','CrispyBlinds',
  'DustyBookcase','ElegantFan','FancyMirror','GlossyFloor','HollowVase','IvoryCandle','JumboCouch',
  'KlutzyLamp','LoftyShelf','MattePot','NavyRug','OpenDoor','PlaidCushion','QuietCorner','RetroTv',
  'SpotlessGlass','TidyRoom','UrbanLoft','VibrantPaint','WornSofa','XLPillow','YawnDesk','ZeroGravity',
  'StargazerX','NebulaPilot','CosmicDrifter','OrbitRider','GalaxyBounce','PlasmaPuff','NovaSurfer',
  'QuasarKid','PulsarPal','VoidWalker','DarkMatterM','LightspeedL','AstroSnack','MoonRocker','SunDrifter',
  'CometChaser','MeteorMunch','StellarSurge','NeutronNap','WarpZoneW','BlackHoleB','CrystalComet',
  'RocketRamen','SpaceNoodle','ZeroGRamen','OrbitalOats','TwilightTaco','EventHorizon','SingularSnack'
];

const lobbies = {};
const kickBans = {}; // socketId -> { lobbyCode -> expiry }

function generateCode(){
  const c='ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  return Array.from({length:5},()=>c[Math.floor(Math.random()*c.length)]).join('');
}

function createLobby(){
  const code=generateCode();
  lobbies[code]={code,players:{},seats:new Array(8).fill(null),votes:{},voteTimers:{},createdAt:Date.now()};
  return lobbies[code];
}

function getLobbyList(){
  return Object.values(lobbies)
    .filter(l=>Object.keys(l.players).length>0) // only lobbies with at least 1 player
    .map(l=>({
      code:l.code, count:Object.keys(l.players).length, max:LOBBY_MAX,
      players:Object.values(l.players).map(p=>({name:p.name,avatar:p.avatar}))
    }));
}

function findAvailableLobby(skipSocket){
  // Skip lobbies this socket was kicked from
  for(const l of Object.values(lobbies)){
    if(Object.keys(l.players).length>=LOBBY_MAX) continue;
    if(skipSocket && isBanned(skipSocket.id,l.code,skipSocket)) continue;
    return l;
  }
  return createLobby(); // creates a fresh lobby they haven't been banned from
}

function assignSeat(lobby){
  for(let i=0;i<8;i++) if(!lobby.seats[i]) return i;
  return -1;
}

function randomName(){ return WORD_LIST[Math.floor(Math.random()*WORD_LIST.length)]; }

function sanitizeName(name){
  if(!name||!name.trim()) return randomName();
  let n=name.trim().replace(/[<>&"']/g,'').substring(0,16);
  return n||randomName();
}

function getLobbyState(lobby){
  return {
    code:lobby.code,
    players:Object.values(lobby.players).map(p=>({id:p.id,name:p.name,avatar:p.avatar,seat:p.seat})),
    count:Object.keys(lobby.players).length
  };
}

function getClientIp(socket){
  return ((socket.handshake.headers['x-forwarded-for']||'').split(',')[0].trim())||socket.handshake.address||'unknown';
}
function isBanned(sid,code,socket){
  const ipKey=socket?(getClientIp(socket)+':'+code):null;
  const idKey=sid+':'+code;
  if(ipKey&&kickBans[ipKey]){if(Date.now()<kickBans[ipKey])return true;delete kickBans[ipKey];}
  if(kickBans[idKey]){if(Date.now()<kickBans[idKey])return true;delete kickBans[idKey];}
  return false;
}
function banLeft(sid,code,socket){
  const ipKey=socket?(getClientIp(socket)+':'+code):null;
  const idKey=sid+':'+code;
  const t1=ipKey?(kickBans[ipKey]||0):0;
  const t2=kickBans[idKey]||0;
  return Math.max(0,Math.max(t1,t2)-Date.now());
}

// Clean empty lobbies every minute
setInterval(()=>{
  for(const code of Object.keys(lobbies)){
    const l=lobbies[code];
    if(Object.keys(l.players).length===0&&Date.now()-l.createdAt>30000) delete lobbies[code];
  }
},60000);

io.on('connection',(socket)=>{
  let curLobby=null, curPlayer=null, lastVoteKickAt=0;

  socket.emit('lobbyList',getLobbyList());
  socket.on('getLobbyList',()=>socket.emit('lobbyList',getLobbyList()));

  socket.on('joinRandom',({name,avatar})=>doJoin(findAvailableLobby(socket),name,avatar));

  socket.on('joinByCode',({code,name,avatar})=>{
    const uCode=(code||'').toUpperCase().trim();
    const lobby=lobbies[uCode];
    if(!lobby){socket.emit('joinError',{message:'Room not found.'});return;}
    if(Object.keys(lobby.players).length>=LOBBY_MAX){socket.emit('joinError',{message:'Room is full! Try again.'});return;}
    if(isBanned(socket.id,uCode,socket)){
      const mins=Math.ceil(banLeft(socket.id,uCode,socket)/60000);
      socket.emit('joinError',{message:`You were kicked. Wait ${mins} min${mins!==1?'s':''} to rejoin.`});return;
    }
    doJoin(lobby,name,avatar);
  });

  function doJoin(lobby,name,avatar){
    if(isBanned(socket.id,lobby.code,socket)){
      const mins=Math.ceil(banLeft(socket.id,lobby.code,socket)/60000);
      socket.emit('joinError',{message:`You were kicked. Wait ${mins} min${mins!==1?'s':''} to rejoin.`});return;
    }
    // Already in a lobby? leave first silently
    if(curLobby&&curPlayer) doRemove(socket.id,curLobby,'left',true);

    const cleanName=sanitizeName(name);
    const seat=assignSeat(lobby);
    if(seat===-1){socket.emit('joinError',{message:'No seats available.'});return;}

    curLobby=lobby; curPlayer={id:socket.id,name:cleanName,avatar:avatar||{},seat};
    lobby.players[socket.id]=curPlayer;
    lobby.seats[seat]=socket.id;
    socket.join(lobby.code);

    socket.emit('joined',{playerId:socket.id,seat,lobbyState:getLobbyState(lobby),code:lobby.code});
    socket.to(lobby.code).emit('playerJoined',{
      player:{id:socket.id,name:cleanName,avatar:curPlayer.avatar,seat},
      message:`${cleanName} joined the lobby`
    });
    io.emit('lobbyList',getLobbyList());
  }

  // Chat spam tracking per connection
  const _msgTimes=[];
  const SPAM_MAX=5, SPAM_WIN=4000; // 5 msgs per 4s

  socket.on('chat',({message})=>{
    if(!curLobby||!curPlayer)return;
    const msg=(message||'').trim().substring(0,100);
    if(!msg)return;
    // Spam check
    const now=Date.now();
    while(_msgTimes.length&&now-_msgTimes[0]>SPAM_WIN)_msgTimes.shift();
    if(_msgTimes.length>=SPAM_MAX){socket.emit('chatBlocked',{type:'spam'});return;}
    _msgTimes.push(now);

    // ════════════════════════════════════════════════════════════════════
    //  SERVER-SIDE CONTENT FILTER
    //  All filtering happens here — cannot be bypassed by the client.
    //  Returns true if the message should be BLOCKED (not sent).
    // ════════════════════════════════════════════════════════════════════
    function isBlocked(raw){
      // 1. Normalize: lowercase, strip accents, collapse spaces, l33tspeak
      let s = raw.toLowerCase()
        .normalize('NFD').replace(/[\u0300-\u036f]/g,'') // strip accents
        .replace(/[@]/g,'a').replace(/[4]/g,'a')
        .replace(/[3]/g,'e').replace(/[€]/g,'e')
        .replace(/[1!|]/g,'i').replace(/[0]/g,'o')
        .replace(/[$5]/g,'s').replace(/[7]/g,'t')
        .replace(/[+]/g,'t').replace(/[8]/g,'b')
        .replace(/[9]/g,'g').replace(/[6]/g,'g')
        .replace(/[xX]/g,'x')
        .replace(/\s+/g,'')          // remove all spaces (catches s p a c e d)
        .replace(/[^a-z0-9]/g,'');   // strip all remaining non-alphanumeric

      // 2. URL / contact-sharing patterns (raw, before normalization)
      const rawLower = raw.toLowerCase();
      if(/https?:\/\/|www\.|\.com|\.net|\.org|\.io|\.gg|\.ly|\.me|\.co|\.tv/.test(rawLower)) return true;
      if(/discord\.gg|discordapp|snap(chat)?|instagram|tiktok|onlyfans|telegram/.test(rawLower)) return true;
      if(/[\w.+-]+@[\w-]+\.[a-z]{2,}/i.test(raw)) return true;  // email
      if(/(\+?1[-.\s]?)?\(?\d{3}\)?[-.\s]\d{3}[-.\s]\d{4}/.test(raw)) return true; // phone

      // 3. Racial & ethnic slurs — blocked regardless of context
      const racialSlurs = [
        'nigger','nigga','nigg','n1gg','niga','nigar',
        'chink','chinc','gook','zipperhead','slant','slanteye',
        'spic','spick','beaner','wetback',
        'kike','hymie','heeb',
        'cracker','honky','whitey',
        'towelhead','raghead','sandnigger','camel jockey','cameljockey',
        'paki','pakis',
        'jap','japs',
        'redskin','redskins','injun',
        'coon','coony','sambo',
        'darkie','darky',
        'gringo','gringos',
        'wop','dago','guido',
        'kraut','krauts',
        'polack','polacks',
        'mick','micks',
        'cholo','cholos',
      ];

      // 4. Homophobic / transphobic slurs
      const lgbtSlurs = [
        'faggot','fagot','fag','fags','fagg',
        'dyke','dykes',
        'tranny','trannies',
        'homo','homos',
        'queer',  // only block as a slur if combined with hate context — keep simple: block alone
        'shemale','heshe',
        'ladyboy',
        'sissy','sissies',
      ];

      // 5. Misogynistic / gendered slurs
      const genderSlurs = [
        'cunt','cunts',
        'whore','whores','whor',
        'slut','sluts',
        'skank','skanks',
        'bitch','bitches',  // common insult but also used casually — we include it
        'hoe','hoes',
        'thot',
        'twat','twats',
      ];

      // 6. Severe sexual content
      const sexualTerms = [
        'porn','porno','pornography',
        'xxx',
        'hentai',
        'nsfw',
        'onlyfans',
        'nude','nudes','nudity',
        'naked',
        'penis','vagina','vulva','anus','rectum','butthole','asshole','arsehole',
        'cock','cocks',
        'dick','dicks',
        'pussy','pussies',
        'boob','boobs','tits','tit','titties','titty',
        'cum','cumshot','cumming',
        'sex','sexy','sexting',
        'masturbat','masterbat',
        'orgasm','orgasms',
        'erection',
        'blowjob','handjob','footjob',
        'dildo','vibrator',
        'rape','raped','raping','rapist',
        'molestation','molest',
        'incest',
        'pedophile','paedophile','pedo','paedo','pedophilia',
        'lolita','loli',
        'child porn','cp ',
      ];

      // 7. Violence / threats / extremism
      const violenceTerms = [
        'kill yourself','kys',
        'kill urself',
        'i will kill','im gonna kill','gonna kill you',
        'die bitch','die you','you should die','hope you die',
        'shoot up','mass shooting','school shooting',
        'bomb threat','i have a bomb','gonna bomb',
        'terrorist','terrorism','isis','alqaeda','al-qaeda','jihad',
        'genocide','ethnic cleansing',
        'neo nazi','neonazi','nsdap','heil hitler','sieg heil','14 words','88',
        'white power','white supremacy','kkk',
        'lynch','lynching',
        'assault','stab you','gonna stab',
      ];

      // 8. Self-harm / suicide promotion
      const selfHarmTerms = [
        'kill myself','kms',
        'commit suicide','end my life','end it all',
        'slit my','cut myself',
        'how to kill','ways to die',
        'neck yourself',
        'rope yourself',
        'drink bleach',
        'selfharm','self harm',
      ];

      // 9. Drug-related (for AdSense compliance)
      const drugTerms = [
        'heroin','meth','methamphetamine','cocaine','crack cocaine',
        'fentanyl','oxycontin','opioid',
        'buy drugs','sell drugs','drug deal',
        'weed for sale','weed dealer',
        'mdma','ecstasy','molly pill',
      ];

      // 10. Spam / advertising patterns
      const spamPatterns = [
        'free robux','free vbucks','free gift card','free money',
        'click here','click this link','check out my',
        'subscribe to my','follow me on',
        'use code ','promo code',
        'cashapp me','venmo me','paypal me','send me money',
        'join my server','join our discord',
        'dm me','dms open',
      ];

      // Combine all lists and check
      const allTerms = [
        ...racialSlurs,
        ...lgbtSlurs,
        ...genderSlurs,
        ...sexualTerms,
        ...violenceTerms,
        ...selfHarmTerms,
        ...drugTerms,
        ...spamPatterns,
      ];

      // Check normalized (catches l33tspeak and spaced out versions)
      for(const term of allTerms){
        const normTerm = term.toLowerCase().replace(/\s+/g,'').replace(/[^a-z0-9]/g,'');
        if(normTerm && s.includes(normTerm)) return true;
      }

      // Also check raw lowercase for multi-word phrases (spam patterns, threats)
      for(const term of [...spamPatterns,...violenceTerms,...selfHarmTerms,...sexualTerms]){
        if(rawLower.includes(term.toLowerCase())) return true;
      }

      return false;
    }

    if(isBlocked(msg)){
      // Private notice to sender only — nobody else in the lobby sees anything
      socket.emit('chatBlocked');
      return;
    }

    io.to(curLobby.code).emit('chat',{senderId:socket.id,senderName:curPlayer.name,message:msg});
  });

  socket.on('voteKick',({targetId})=>{
    if(!curLobby||!curPlayer)return;
    if(targetId===socket.id)return;
    const lobby=curLobby;
    if(!lobby.players[targetId])return;

    const playerCount=Object.keys(lobby.players).length;
    // With only 2 players, "voting" would mean exactly one person can
    // unilaterally kick the other — that's not a real vote. Require at
    // least 3 total players so a kick always reflects agreement from
    // more than one person. This is a hard requirement, not a special
    // case of the threshold math below — it's checked first and blocks
    // the vote entirely if the lobby is too small.
    if(playerCount<3){
      socket.emit('systemMessage',{
        text:'Vote kick needs at least 3 players in the lobby to be fair — it is not available yet.',
        type:'vote'
      });
      return;
    }

    // Cooldown: a player can only attempt to initiate a vote-kick once per
    // VOTE_KICK_COOLDOWN_MS, regardless of target, so it can't be spammed/abused.
    const now=Date.now();
    const sinceLast=now-lastVoteKickAt;
    if(sinceLast<VOTE_KICK_COOLDOWN_MS){
      socket.emit('voteKickCooldown',{secondsRemaining:Math.ceil((VOTE_KICK_COOLDOWN_MS-sinceLast)/1000),ms:VOTE_KICK_COOLDOWN_MS-sinceLast});
      return;
    }
    lastVoteKickAt=now;

    if(!lobby.votes[targetId]) lobby.votes[targetId]=new Set();
    // Prevent double-voting
    if(lobby.votes[targetId].has(socket.id)) return;
    lobby.votes[targetId].add(socket.id);

    // 2-minute reset: clears the vote count so players can start fresh
    if(!lobby.voteTimers) lobby.voteTimers={};
    clearTimeout(lobby.voteTimers[targetId]);
    lobby.voteTimers[targetId]=setTimeout(()=>{
      if(lobby.votes[targetId]){
        lobby.votes[targetId].clear();
        delete lobby.voteTimers[targetId];
        const tgt=lobby.players[targetId];
        if(tgt) io.to(lobby.code).emit('voteReset',{targetId,targetName:tgt.name});
      }
    },2*60*1000);

    const targetName=lobby.players[targetId]?.name||'Unknown';
    const voterName=curPlayer.name;
    const voteCount=lobby.votes[targetId].size;

    // Vote threshold — always exactly "at least half the lobby, rounded up"
    // must vote to kick. playerCount is guaranteed >= 3 at this point (the
    // <3 case was already rejected above), so this never produces a
    // 1-vote-kicks scenario — the smallest possible threshold is 2:
    //   3 players → needed 2   (both other players)
    //   4 players → needed 2   (majority of the other 3)
    //   5 players → needed 3
    //   6 players → needed 3
    //   7 players → needed 4
    //   8 players → needed 4
    // The target can never vote for themselves, so "needed" is always
    // achievable (it never exceeds playerCount-1) — verified for every N.
    const needed=Math.ceil(playerCount/2);

    io.to(lobby.code).emit('systemMessage',{
      text:`${voterName} voted to kick ${targetName} (${voteCount}/${needed})`,type:'vote'
    });

    if(voteCount>=needed){
      // Get kicked player's socket first
      const tSock=io.sockets.sockets.get(targetId);
      // Ban by IP (persists across page reloads) + by socket.id (immediate)
      const bannedIp=tSock?getClientIp(tSock):targetId;
      kickBans[bannedIp+':'+lobby.code]=Date.now()+KICK_BAN_MS;
      kickBans[targetId+':'+lobby.code]=Date.now()+KICK_BAN_MS;
      // Notify the kicked player BEFORE removing them from lobby socket room
      if(tSock) tSock.emit('kicked',{lobbyCode:lobby.code});

      // Broadcast kick message to all including the kicked player (they're still in the room socket)
      io.to(lobby.code).emit('systemMessage',{text:`${targetName} was kicked`,type:'kick'});

      // Now remove from lobby state and socket room
      doRemove(targetId,lobby,'kicked',false);
      delete lobby.votes[targetId];
    }
  });

  socket.on('leave',()=>{
    if(curLobby&&curPlayer){
      doRemove(socket.id,curLobby,'left',false);
      curLobby=null;curPlayer=null;
      socket.emit('leftLobby');
      socket.emit('lobbyList',getLobbyList());
    }
  });

  socket.on('disconnect',(reason)=>{
    // 'client namespace disconnect' = the client called socket.disconnect() itself,
    // meaning it was a deliberate tab-close (pagehide) or Leave button press.
    // Everything else (ping timeout, transport close/error) is an involuntary drop.
    const wasIntentional = reason === 'client namespace disconnect';
    if(curLobby&&curPlayer) doRemove(socket.id, curLobby, wasIntentional ? 'left' : 'disconnected', false);
  });

  function doRemove(playerId,lobby,reason,silent){
    const player=lobby.players[playerId];
    if(!player)return;
    const name=player.name;
    if(player.seat!==undefined) lobby.seats[player.seat]=null;
    delete lobby.players[playerId];
    // Cancel the 2-min reset timer for votes against this player (they're gone)
    if(lobby.voteTimers&&lobby.voteTimers[playerId]){
      clearTimeout(lobby.voteTimers[playerId]);
      delete lobby.voteTimers[playerId];
    }
    // Remove votes cast AGAINST them and their own vote FROM others' counts
    delete lobby.votes[playerId];
    for(const vs of Object.values(lobby.votes)) vs.delete(playerId);
    const tSock=io.sockets.sockets.get(playerId);
    if(tSock) tSock.leave(lobby.code);
    if(!silent){
      io.to(lobby.code).emit('playerLeft',{playerId,playerName:name,reason,lobbyState:getLobbyState(lobby)});
    }
    // Delete lobby immediately if empty so it never shows in list
    if(Object.keys(lobby.players).length===0){
      delete lobbies[lobby.code];
    }
    io.emit('lobbyList',getLobbyList());
  }
});

const PORT=process.env.PORT||3000;
server.listen(PORT,()=>console.log(`Rainy Day Living Room running on http://localhost:${PORT}`));
