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
  --grad-a:#2E9B57;
  --grad-b:#014421;
  --grad-c:#014421;
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

body{font-family:'Nunito',sans-serif;background-color:var(--grad-b);background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='44' height='38' viewBox='0 0 44 38'%3E%3Cpolygon points='0,38 22,0 44,38' fill='rgba(255,255,255,0.05)'/%3E%3Cpolygon points='0,0 44,0 22,38' fill='rgba(1,68,33,0.14)'/%3E%3C/svg%3E"),linear-gradient(135deg,var(--grad-a),var(--grad-b));background-repeat:repeat,no-repeat;background-size:44px 38px,cover;min-height:100vh;display:flex;flex-direction:column;align-items:center;overflow-x:hidden;overflow-y:auto;}
body.game-active{overflow:hidden;}

/* ══ HOME ══ */
/* height (not just min-height) + overflow:hidden so the page itself never
   scrolls — every panel below scrolls internally instead. The 100dvh line
   is a progressive enhancement: browsers that understand dvh use the safe
   mobile-chrome-aware viewport height; browsers that don't simply ignore
   that single invalid declaration and keep the 100vh fallback above it. */
#homePage{display:flex;flex-direction:column;align-items:center;width:100%;height:100vh;height:100dvh;padding:6px 8px 24px;overflow:hidden;}
.home-logo-img{display:block;width:40%;max-width:340px;min-width:150px;height:auto;margin:4px auto 0;cursor:pointer;}
.home-topbar{display:flex;align-items:center;justify-content:center;gap:14px;margin-bottom:10px;flex-shrink:0;width:100%;max-width:920px;}
.home-dm-wrap{display:flex;align-items:center;gap:4px;background:rgba(0,0,0,.25);border-radius:7px;padding:3px 6px;flex-shrink:0;}

/* 3-column home layout */
.home-3col{display:flex;gap:7px;width:100%;max-width:920px;flex:1;min-height:0;align-items:stretch;}
.home-col{display:flex;flex-direction:column;gap:6px;min-width:0;min-height:0;}
.col-left{width:200px;flex-shrink:0;}
.col-mid{flex:1;}
.col-right{width:200px;flex-shrink:0;}

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
.feat-label{display:none;}

.divider{height:1px;background:linear-gradient(90deg,transparent,var(--border-soft),transparent);margin:4px 0;}

/* Center column — avatar */
.av-center{display:flex;flex-direction:column;align-items:center;gap:4px;}
#avCanvas{border-radius:12px;}

/* Play section */
.big-btn{width:100%;padding:7px;border-radius:8px;border:none;font-family:'Fredoka One',cursive;font-size:.82rem;cursor:pointer;transition:all .13s;margin-bottom:5px;}
.big-btn:hover{transform:translateY(-1px);}
.btn-play{background:linear-gradient(135deg,#1E9E4A,#2DBE5E);color:#fff;text-shadow:1px 1px 0 rgba(0,0,0,.2);box-shadow:0 3px 12px rgba(0,0,0,.28);padding:14px 7px;font-size:.92rem;}
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
.lobby-item{display:flex;align-items:flex-start;justify-content:space-between;padding:7px 8px;border-radius:8px;background:var(--lobby-bg);border:1.5px solid var(--lobby-border);margin-bottom:5px;cursor:pointer;transition:all .12s;}
.lobby-item:hover{background:var(--lobby-hover);}
.lobby-item.lobby-full{cursor:default;opacity:.72;}
.lobby-item.lobby-full:hover{background:var(--lobby-bg);}
.lobby-avatars{display:flex;flex-wrap:wrap;gap:2px;margin-bottom:2px;}
.lobby-names{font-size:.66rem;font-weight:700;color:var(--text-sub);line-height:1.4;word-break:break-word;margin-top:2px;}
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

#gameLeftCol{display:flex;flex-direction:column;align-self:flex-start;flex-shrink:0;}
.ingame-logo-img{display:block;width:90px;max-width:100%;height:auto;margin:4px 0 5px 2px;cursor:pointer;}
#playerPanel{width:152px;flex-shrink:0;background:var(--bg-panel);border-radius:10px;display:flex;flex-direction:column;overflow:hidden;}
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
.p-name{font-size:.72rem;font-weight:800;color:var(--text-main);white-space:normal;overflow-wrap:break-word;word-break:break-word;line-height:1.2;}
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
  #playerPanel{width:100px!important;}#chatPanel{width:110px!important;}
  .p-name{font-size:.56rem;}.panel-title,.chat-title{font-size:.58rem;}
  #roomHdr{padding:3px 5px;}.rc-display{font-size:.62rem;}
}
@media(max-width:900px){
  .col-left,.col-right{width:150px;}
  #playerPanel{width:128px;}#chatPanel{width:145px;}
  .home-3col{gap:5px;}
  .home-logo-img{max-width:260px;}
  .p-name{font-size:.66rem;}
  .panel-title,.chat-title{font-size:.68rem;}
}
@media(max-width:700px){
  /* Stack columns vertically — each one still keeps its OWN internal
     scroll (see .home-col flex/min-height below) so the outer page still
     never has to be scrolled, even stacked on a small screen. */
  .home-3col{flex-direction:column;align-items:center;}
  .home-col,.col-left,.col-right{width:100%;max-width:520px;}
  .col-mid{width:100%;max-width:520px;}
  .home-col{flex:1 1 0;min-height:0;}
  .home-logo-img{max-width:220px;min-width:120px;}
}
@media(max-width:560px){
  #playerPanel{width:105px;}#chatPanel{width:115px;}
  .p-name{font-size:.58rem;}
  .panel-title,.chat-title{font-size:.6rem;}
  .home-logo-img{max-width:180px;}
}
/* Landscape phone specific */
@media(max-height:500px) and (orientation:landscape){
  #playerPanel{width:100px;}#chatPanel{width:110px;}
  .p-name{font-size:.66rem;}
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
    <img src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAu8AAAEECAMAAACvNiq/AAADAFBMVEWWox+aolylYSqp12RunSPdWabi5mRfFiJhWy3MlymaJGXg4N5wIGKPMR2kTo0vVhOiIpPRJ2XTVcTMJpvUVyygn56r3YVpjlGZcFUlDiheYVzPz86y2jDc6obbomO+vsDOpaF9eoJowDPuMzLNOsLKwRe/wcDCvsA/PEA+QUB+g4F+10ft8O3+/v4DAgL2OE761wT7yASKyCr6SDX6twP6VyzMKZK0KKX6pwNvuTX7lwYrAQb6hwz1RUq3JpcQFQrtNWr6Zxn55Qn6dxPZJ3h6wjD3Zij55zHmLHLy8vE3Nzanp6bIyMfNSLEoKCfuVk34PDtXV1f31zBISEf6Wxu3t7ctJgIrGAKHh4d3d3f46EtnZ2bRNY/xLVYxASmXl5fFKaVKBg3pV25rtkPk5OTrR2vJOKz79DLuZk/z10vydi3r6+pPFgrud1CV0irPVbLPSJH2xzGv5m1wZwZJOAHRV21RRgLqZ2v79EmRyBrYNXS4NKgRJgL0hi6z5lXuh0ysR0/zyErY2NhNBTBPJgXPV1fS09L2ty+uN5UzNwGp2W5yJy71pzGT1VDSdkzyt0vxmEpQBkaLdw6zV03RZ1KwHJSvRpPVZWxrWAXhLIWPhg6uly7M9W32mC9VVgWMNzO2SKfQSW3SVpAsRwWY12vSyDBsGSyLx06n1TCypi6s2k7c3NzI6W1tRwlqJxGLKHGUOEvMuDDyqEqPRy0VNQGOuE5tNw3Ux0rpVotsGFSQNXNpqjB3xUWUyWlUFS7lRo3mNopWFkt4dQia0Rvu7u6WOIqrWDVaqTHTVsTQt0g1Vw1rhy6MKFCySG3udmloB1HThUzLqDJnFxeoOlCtZjGthy1xJVKKZw+KqE6rlxejyym1VGfOSVT79BN0Jmt3NizY1DVMZg5Rdi10pkqvpxOViSy4VaqIJzSPeCm1ZU7TmUzG6lTSeGbSqEhOdROUZy64syz052lKaipYhi5umEqrOXDQdziXRUmTQnqLVxPU1k3sZIrh4OCLRhXBwb31hWac5FOrAAABAHRSTlP//////////////5H////////////////////d/////////////////////0IA////////////////////////////////////LP//9v//////////////////////////////b////////0//////////////////////////////rv///8r///////////////////////////////////////////////+X////////////////////////////////O/////////////////////////////////////////////////////////////////////////+E////isC4agAAXs9JREFUeNrtvQdAVMf69w/YY0li6k3uvb/+vv/G0hE47h5EZbMLy8oibSE0KUuTXgSRogiCFbHE3nvv3eg1Xo0lRtNjem835abc9P/MqTNzztldTKLoO48JynL27HL2M8/5Ps8884yHNzVq/+eYB70E1Cjv1KhR3qlRo7xTo0Z5p0aN8k6NGuWdGjXKOzVqlHdq1Cjv1KhR3qm5byZvE7BCyju1O93ObI2KY3WsDhhrTo7PprxTu2OtJT5WR1jsv2VT3qndiRadxOpULC6b8k7tjrP45D/p1M0cT3mndofJdnXfzhsbTXmndkdJGbPOmZnPUN6p3RZmckvLsDrnNp3yTq1XW3YKy7IxA6Lc4f3fFLgnJgCbLD+cRHmn1qsFSoyYT3TtmqMItV5ZvWS9Edi2C5R3arcX7kB7R/cId3aFR/9aY8Rrr72W9+Zaqmeo3RaGThvFOpc06RjuFe8a84wRvhEREXlvzpBT8CbKO7Xea1j8yTpNn6ejh87wAJ49AtprKO46mo+k1pstGfPZSe6OjOof8iIEey2vQn482ZvyTq33WqEgZ8x8Vj1F+8jsOBR3u4R7RN4XSPZ9K+WdWm+OVgWn/fBAntdst8T7Ynuer+TeD8qPx0R7U96p9WITKGY9ed51UVoHTse8O4hTeeB9I/Jk8c4+4E15p9aLbfD/LUSf295jnevvFAR3jnaB97wv2DtevFPe7xQTE+or+nvy2LLp6gduRXDPf82X8+zcl9oVcjbTm/JOrVerd3GuaUmtvVrQJCkm5+6dXQ+T7qJ8z7Mn3OmlkZT3O8a7i7gnvJln9AAOnvPxsT8pjzTJ7r2Lz8z4+nIK3rhZkjMp3pR3ar3YkiVUK/Jei6iVsugxylmneETNGDkdI/CeVyGeJIauX6XWm02WKAlvwhqYH+TAUyHi5aKDCmMExrsk383elHdqvdbOyAhX7uYUivGLRM08urTGg/2f10Q1wwFvqxZ/Ek95p9Z7LUkiuDo/jy+EyVtaqeHgC0XXz87I4zIzEu//I4WrWynv1HqtTWflui+hNOC1iLw3PVbwKzeSteR7RZ7IOs/7IIn3M5R3ar03VuUhHfjeerkQJuI1Y+22lxJUeJeKytiDBO/rqX+n1vvNJKh3zy9rZdwj8oyeAxO4tGQK3iBPKhVL+BLFHQC/XpJAJso7td7u3xNWrDcaJdw9ZmjUBcu82wnebRLv2ZR3ar3W5GrH6vO1vKQxLpESkgMHu8u7sfrOXrdKeb8z9AyyalXnwfFu3CxqdGWVpFmT97zFNP9OrVdadnxySkpKvIl08BD41yLy5MiTVbhqs5Z+981bIp1lMOWdWu+xR4X51BS+POYMUuDLvpuHLMozK2vgZd77E7wbf0ig9TPUep+1SMzG8ZOnpii5MV51bd4PYqya0uLtPu8RvnI9MBut3qHs0enZlHdqN9cK45SLslvktPq7tX2FYDVJbd5I4j2R9O9AB8mLV1UUTUusOYaNiUunvFO7mYYutja3SFGrKGoq+gtyJlnVRcvlMweNvgTwRrk7QRw557RVPD+bQnmndvMM75T0i/wDAcgVf5nhrMOYPFrey/MlgZdXfIDhghBfOB1t5ZRMead200xw0NX87JCn7MSFpjIJ1U6plJvUVCt49zWuRxrTsEnxLYWmwsLo+GSib3YU5Z3aTTJxmarnv5NdN1Bdr13UGy3XDtdGKBy8cQl2jpi4lJS4GEWf7FjKO7WbZIKwSPxrf0XTO0zpxGnsK2li5cjW6OvrRMLfqTt/UN5vQ/de+UN/lkyVY23D/gNlHD2DrFgW12Ks+wEDwHe5AXwU5Z3aH28m7/8l0nraLq7ZQ3Ls02WdHSMnFKNi4+LMccmP4mEtHDP5RgJ3Pxizbtbc9mOG5wzKO7Wbhvv0FAnFl2t/SFQu2BucnEB2B5Y6AbNCilEW8LolRl8/lHY/8FeEr/FgtTruF/5ygeoZajcN93Q5W1j5Zl6tGFrGIDlJ7+lJZnNsVLTogB/FMivppKCxRfhyTl3AXXDxRuP6SuVeN13r+3sIj6aYKO/U/mDLRlPgS/IijHJVWEq2C7UvJVYKvbFdEZbkQdQx3Dn8jbX5FZUJiQLebELCiqVf2qUBxtJ8JLU/2rainrryTVj16yEXuf9iMrmBO5yEMiErWOGaPj81gz6+1ubhUQHt9JJ37fa8WvuSO6SajPJ+Oxi2mcG7RthawF4hVbmrFEKa5L4FaEY9Ce+Xajeq4g5cPhxRRrvdbsyDNfVG++k7pdke5f02MHRRRwKPewSaLFc2EstOUY86Y6dHo+3f8301PDySuQHu/kv5pR7xprxT+4NNlibVm9+U+hDY35M0vJkQNNM1986OiUVnTBfXqgOPkW/cXSlroMGUd2p/tAlzpwmn1xtrjXIbAuObX7wlqPgHMC2D7tDEZH7ulYnNj2J787kAHiibWjQlH+VNeaf2B1shL04SPb+sRZrMwC05arfx7d7ZJHQaFVX7zMorjXNnF2lOlla/aXTq3Y3r0RqDOG/KO7U/3AQxnnDhILK9WIRvns1zIKtIEk5HcS+6f27k+MiCxh2awCcsVbp48QHfvHyPRDTBk015p3YT0zOTK3aLbX0jjDaPSmXWBGtYoDtwpSBy/PjxowoahzKaxFest9vUVI3Nbnt5BlaFRtfzUbsZhuYWl9j5PWiM65GJfzEpbipMR3BnvIqLIe7jR0VGNp7V1jQJXT8Yjfi8ExhO9vyl1ZjWj2vxprxTuwmG+ewKLh+Zh+EuOl6sCp55rjgyclRkUNCoUQD44tnTtEseZ1S8bK+1G202m68NmtFofLdiBn5Myh3Rp4PyfjvYv6H5xQp7BF6qnsxXuxd6R8UgDvnAtwUAd+DdAfCRQZFAxP/srKo9YcaKrs0H8/Pz+x/07Fo8I4H8eXqhN+Wd2k0yNKGe+EVehHG3/P0DQo17C1pjo9vbyME+ngMeGAT+I8bVWg7O1H4w/Q65kJT328SQLjOnjXn2SqTukU9FPoBymnmWV+5QvAMxEwl5ByL+/kTdDdnDd8xlpLzfLjbYM0HKmdfmJ0o6Q1DuWInNgdlAuo+P5HIzAu/jIfDFn067AdrNd9AWN5T328ekadN37Z7Ewux4LFAd2lgACee9u2RQ1RRf6THwbNKd1CGb8n4bmVgE5tH/PayZ7y+Ycy+StYwEvKjigyIb9zI94/3O2lye8n4b8l7xl4HoBH9SDK5lgHOHeMvAj5dxB5rGSSZeQ82YKO/UboGJ807VfxFz4+ZCMArQQJXxmg2Vu0A3T3ik8C2w8UDHF3cf6BHwMVHelHdqtyJHIzhydqAkrh+IjkNrHotmN0p0cxFrcfdQr24HfChAZD6yuNiLKJN04eGzKe/UboGdiVPW9GLO/QAIVGVnDsXLR5kMw3j9Ch6VeAf/+lUlE8/gdue00KO837aW7NQPM2cbIznVPkqcYSr24rndMbtYHgbQHN07cOIT5y+qQexy68qrzJ0YslLebydriXGCe9HsYqjQI6UJ1eJvD8hDobgYwT0gwHH5O2zuqWhRjV4fEBCgF8xac3mlBHxMNuWdWu9y8MzeYsd4RMqMj2x8DknEMG/MjpRpB2at+QhNxTOt1gAEd2iXV0o/jaa8U7sVZtJamFo0HyiW8RLSkUEFxT/jeceisyLxAQLwi5BUPMe7HrOs+YmUd2q31qI1nPtsB1DuPM9Qz6iV/wIXD1V8gGBAszhaZRXfZAWI+/igvL/KUN6p3WrgVTx80UcQ5PHcfzBg1VreAVS8IygAEi9oGsflveLPvsvieJcM8H6N6hlqt9y2kq1lmAOyNA+6n8vLzNZar7qju/j+AMnFA3O0Cs0LMhdhuAPgs5oo79R6W9DKwHIZJNkInftz2hUDzMpiRwBq1n9/g5MtTBPBu0/WLso7tVtv8aiiYXZ0O1DYg+6P7HZeEZbZXYw6eL2+pmoDfMLKHAL4rA+k57RQ3qndogxNMrrUbtpZIMgD5LnT8ZHF9+9wUQCZube7WEjGcF98cmouJoKRU4ULeJ+aDdIcLuWd2q2xJKzQ/Y1uh6hOuAKZyAK3yn2LPnJYrRzvAXxOJqvpKsN8UIXhrq+SeI89Q3mndiukDLYL37SPiqV0ulAJNnuHW9XtzMrLHO8+gkvX66u+y8wcmpOD8J5TlUlu5E15p3Yz7WGMWS+HQ5o8EtZynHV7LUdRKw+8nI2pGjrgXtS/h8u8p1Peqd10i8JKIXd8iuZZuLV63Tt6sHSJWQklDefbBX+ec/1exL+Hh19iqH+ndqssOhZPsly2BmG8R84+28OFehtaayRBIyCO/DM8XJxeZal/p3aTrTAdde5FK7utuHN3FJ9VnWJCn8WSzTiYpposHyxGDUd5p3qGWm+IU5nOVocVmzMKcnQr+6EmJlRWV8D+wQkVFRUrKk6f9uhSdJ/pnF9DTDKFc6hDq6s6QfUMtVsiZdD9C3bMh7SPQ3AvdngVEVsDv/f85vMHD/7wJWwPv6L/D3ZotQcrVVR8TQ5Ht+TVJatbs4Gu96B20+1/x6FuObMJhJmYlnF0zy8inPuKL+1GaL72g5PhbtxcI1RfZA9L9Gbx6o9199772GMI6Y89Br+tOyTVE5gHU969W6JS4swxwOJSkqNvoJmmiaLsjnDHwlTmu0UY7QEB1svdVxVSptrObTUW4Ws8P1nHLqnlN9JW5R2cc9ePVXUi6RzrvNXlfEPrZ4QPITsqjljhzqa4xfyZ7Efj05OSk1OSk9Kjs7Mp884tG1/PdLW1hpsURWl/Q629da0xgiPeeDABdozndhW22ZorNQoMXl2TA7267N2BjamrK5UEfOwf9UEVZmdvzd66tdDUi3lviVJfZMNGuSizKIyOj8UHSWxUD/rOnsluiY6Oj49Pj4qKAn/FR0f/dGePl+n4HqqJK1ut4/Q+emm5htXavVI1B5lQa+T3kjTuBlpoibCXgS2/UisX/8Ka1XVjMNwB72PWHGH+yA4F06PTk81cB2/WHJscFT/9d1glazKZTL8v79HJrJNWg1ud5BiS1IYJmxzvBrSA8/SkOMVi5ZiU9PibupQ4e/rW7DNagxkMwygwFuO3/i6jcHoU7tuZHa3cBJHo3/XW1qZOjYx7ZX9ezgj+3ejLeXujJu863dRdaw6FPzYmvA7yPkaw1DVT5ZYcv6trMU2PSopVvIm49N/WdfvRKCAdYoG8dkJFD3mPSnHRmidKC/ZYzeekuHAeUckpMdpjLC45SoPAaPDbJwGL+n2q+wrTwbU0x8XFJSs/lqik5DjpLZrBBdemw5QO31NyUtR0Z/pvejIxuKfNr+EKAMZxrh3QXqPh2/n+Y7XQ7Pba/oD398DfXIKmf6WT6daplw6drANOHbG60m/kl0j5HTV8eopGnwVzshao2dkuYr6opBTEn5qTNAZoj3iPjnXdTTZFNX3stJsVm1zo5HYS67ITVpxyPsQUFSvfDkBE7fp+DG6uKSmxKSlJ0zXehxndl/0nTGQrblxsnOoUTXZ6SqzUMikmLjZF40MpJGhnMptaHfziUoD7uHF6R838TiezqYkDF69YvHhFdfUKuOlNwsAV4J/V1YsrnV5JpvPSIQx36OA3ML97W71CrMTTDYc5PTk2Jc5shpdLM08UpSTTnGT6bbwXJrvVgy1W8X5TXD4nTsN5RMXFuDU1Hou5cFN2Ckkga3Y6RxgdZ04QJyRjYpTvJhp7H+AymFtkH6D+Fs3kSaKTzIrbFBsTm612oYnGX7uqavTjxvn4+IyDzv16jcOrqIe1A25Z5sV+pampwWPGBHM2JhVTNOBT+h3Skj+luPpEkwkCzJPRy6Xaij7KzKpNLJujb5B3bqDEx7h52Qjgo9wZJaxKE1rg5dxucshGu3pFNk4rtjgTFaM4FrvhnIlT7vFi5s8Wb2bdekv4oiT8tRQ3FOyOBn17Ft8wAAI/zpq1aFcm4wL3hITK6uqK0xWnoX9PnFFdAWzx4gSXl/HEwjWpY54Y86RAfHBwaukLyEvF/FZN45bLTEaSsTHKy6UYdC2a9ws29ob9e3aM+37CjD5vsptPIu9jW1N65pyi5PulWwDKo0O1J260PP7UByzcjLTQub6TfZFzX0GI1hYWce2ZTTVZUpE6bPt1fQPj0rfP+MuXnGA39v8rYPzDL+F3+fnNf3UNPDNvYWkqT7rw15rD6CV8wPQb4laTmx+pALxJfXCwhIuPd4ri9BvjPVp9T7dKqAtnVJK7uckaviWm58BywySqx3fjeNcxhhJ4U0uy5g1HbcIH/VSmR7n45UR36FLQ4R9hEuLbh4IoVW6QkdU6f5o7Qqayf76tDKYg888n6nQVX+4ua2sLDJnzsVu7N70wzJILWU8VXPyai+hLxt14QsxtgcDX60Rr3RF1v7h0V4r7cM94x6vz+JCocvF7m98U4n77wdMrElTY/UnFNSZUrxAsgfhhtAnRyzcgP7kP4t+d3TBZk/P5HOwXFBiM1d248Te6qJieDXbpc06Es6njuBr1LGDXmz7IdO91Z9j5XYMDbc8CxFfY/QIDA0NC2tzjXZe2s70kNVVSNKlrjqRhN7b4G3LxZ9QHPTt5RgIwJfDpGh8ki904vaNdCaTYnvOuVF3VXR7GvLy8CN6MRmNe7RcVio7hWxWsVJ9estteW1ubB229x2lsS1upK2e2pspjE2ZUVlYmqP84zvWvTxT6ZZudwcrlYOJ0v8WivM94J/X07ia95IB/78flILOyaqpe3dXJuB2jVtptcLbJ5pe/Gfp3QH9ZYEiYu7wD4l9YWFoaLBG/ZuE8/EIn9XwDs3iVCzl5Rd++Hn048+i7Fvvk4p1eNaR/q1nnqgw6qqe8F5JvtXrpmxLrkuXZNyOHpKs9r+ILex7yxNfyjOuXJCqHoqpzT1jxocfmL744eHB9Wf763Zs3L136XkU1ccwD3tlx7kcW3vL+MOr2ANJw3Q2r/vzDhx/+/PPt07Ah6HYYEqXyEZ7YsLK1talpZefVTKYnCZnqL5vLysryy3bD+kjW48uyZqDe5/T/q/u7UaYdXlhSkmoIXnAfBN5S8q+pRCCYHN0jL5+iyEyxX73kuW3ZJ1M2/Zmz/lv2v4VgGuOMYCSkJe7PCQ95er7k+dAKbUXjBu/EZ56w2VZrBLj6+nJffIXSpAhj3svICPyJHHrskvWQdV/ZuFvDwWq0IIGTr8rb/4wl69+E9xMjVxYSwdX+5dXabevfxZCPNSXLlxNukt615OUXKxM1hXK8810uYlqIAZE4TevWokt8/rM5c+bsmTl37p45g+RpnRhlal7HFF0FVkQCLEfTeIUYufeAew4eagTwpRq+lYEDt4ObYvXAhx/uwZ4eOubUsFUluaKLt5QemYq/jT/F9SBZo7jRr/XYsq3/lE2b/P39X4E26ZVNnyzbv1bzvo5FiCyXLFC4YvYtz23btmyZMmXZFI+3tBy8a95x/NgKu+ihfXGLiKhdiopxfJhU/5D3GhgUOO/gSx46yQ0dvEK3zfDMt3N3BfEpyAnATWUGmqtC971Ymg+LYu35ze8lqkXSQG4Rr1Rd8WEFJiSjsdC/8rPPmvsDG6iCl+eeOcvDRgo28+PtmoROe/jTTz+9fLmmZtGnn370BkZyrJgDTXdG4Ykh3+3ateuFzD8i/06+FnDy/SypBkNwBkDeUrIzDXe3bmcnCwnPx0723NZ/06ZJf35l4qZNf/vbpEmT/DeBb1/5ZNsKtffxlmefbR3bOjxnkJ4RD1YH9v9hyyvgXB6TJk2csuwC4uALe8C7Ccc94Qu7URIkCuCNsobHugLpEnYb88jDBbMhW0WDK0jc+BK67EYbX86KGPyej8h8jbUr1B3ubqOfYLb8BLXoBf/Nqs/n59tsdjtaM/sAcgTrYW+bGRYGor78D8mX8pozcyRio5fvUe1nx+yYP7vYAcwKDfz9a/FZlNt0jRuqlKy5WLXmx0OHYOiadejHqmsDbgLzU/8FdE1uBiQ+1bJmJ6Fqtro1c0PkZdjJ+5dB2ie9Mulvgk3y523LsqcV72Btn2X9t/hP3DJl2V/WKgQNImc8tm3xB6wLZ5pY/rZ6Ws4F72fMhHM38k5aBXf44LsaevKg0ddXg3dfXxTHODw67bLztdsY8H6IgZ/Yq9VecqlRPs7owarwHoW9QbstEBoYHNtVf4Xn80HEFwaBD5mDccZs/ytGOwR+7nMquBZ1Xy52BOHmuNwkn0yas1UJoxnmxKuLsnJy5EUZOYd+fPXETSA+bd7OhRZoqQZA/BDsJVPcKrnC1tDqJvdd1n/Sn//MgQlIh7QLkAJxs6VjHyFkVmzbAo6ZOHGiv0f/l5zwvm/ZJn/EJk3pM1l1xtY57/iVT/DIMyoZRziOMKpVJCUs4UaJFu6+xt3qso3tAoqEK912Zr5Gu8qLLrYjzzL+oObfkRetyDf6hYTApF0gn8JTnq8ZgM7zHtb8IipQnm+eOTJMRn00/Lr8Y6WQmf9rcZA1gOA9yHr50yJl9kgxGctsqKrJQmAPB//Oycn5sSlTdxMsLe3w60cWtpdYLCX9+g0bgkQ47uBO8Lul/6ZJAuETOdiB/BAg3TTRf1lffCr79LJNPO4A+CkdJO/I3MjAbfCcE2XiEW2EbsfjnPcUXMsAKUNI6DzjoJfhWjHBalXErW5zLXdH0OQ9wnhaNYn8RS3v2f1cmHGz8sn54InSAbb+Kv4dUckJQDH5BYZwFhiYv1jtdlEGfxgWMjIM8P68/PiBz9rCENxHFhSo8w6UTGRAUICVxB3omkUMPoOghITZ0JSVo8dWmArNM7IuTdXdJEtLOzVk51OH79r5QlpPeCemgzyWfTIJanUO94kT/zZp05T+y6aIIsTfY9MybD7+bYD7Jv5Qf/8p21iC9+myUnppyiR/zFAFH+8m79ibTViPSnA+8W5fUp2oq1xiFH9Q+57SS3OjBBsjdnstCF7l3I7xoIqDP/2mTSFf1NH3LVPMk3sI4j3QD0gUP6Onyh0YcaEvGiXcAfC2CpVbVFlgmGRtcli+fQ7q3EX/DgQ8/vSibgepZBDiZUmTrjoTmQloR/tkyOurfXKyqm7YwzOHd7Ybnnqq/ZvDNzxmzK7T7rgLe+mTPwN3PpF3w4D6SX/r33Hhwv5PRC0yadKyvujxQJMLIwPy3kFOpCCzLQrep1xQiYyc844VEbAH82TtAuVJRF7ty3x6LlFUORF5SxTXZHctjruxdvfi6uouGzIKIuxKxCqMeUq17qeubmzkXSXhIHcU1OPcLGO1MjcVL1+qxPNlgRLu7vD+MoJ7GAY6Z4D3QdizB35ajDEegMqaAGtNp+QvTSpBU2dVVs7jJO9Sk0d5UXUPaR8yrMTS777c3Pty+5X869SNncRlXxp84K7os23S3zZNFHmHUC77xz6Wndz3E0l3f9IHecJ+4XH+KZ94kpPfyGhS8t63p7xns5h3NyK4R3DLZSSM3n1Nk/fNtYRv38zPxyR21Up3BV/jy0r9bcSiU+4f8Eg7nDokeSczJku4YJWnHVhzolLJIUqtMj/QFe+VZVC9jyR4P9B/puzXUVuOxqvMR43FQQFqvp3fV0Zv/ZRoXIdmq5mLVViTOxx4oOLlLr49oX1nCV8kI2TXF/7pxmaPe5SIfGvbD6/4T+JlOyDbf9KWZX32cYzN2L9FjjNZRJO/wj3GyfdJ/sv+gU2lu+L9guobdcI77jHz5JCT0zK1u2UV4aHJ++Y8XKvXdkk/6qoVz+cXYSNCzmopB8mzDkk32uzrX65ISKgos5ECnuCd3e0rqBnO7F1KwYkWIz1rC0FMlffqMj5a5XkX9HvlnOUC7Q3QZOgL5v6MoDX/V3FXa16+wEwkn5UMEhaiyhs/xpGQMLuqwnHYc6ChketqtSSN2i7ZiBYfZrlPLggLDs6wHPkjvDueWB24bNMrHsC7Q94FPX5BYJu9IPLusUUWLez+H17hNM7fBN4nk7LUXd5b3OEd9TKJhHb3fQ1T6m++JnBrJJLhL9vxCSI7+qwvJBfuiyDJe1ybnHzkHHte7UFPSbU0GwMxiWMjMpIVYrlUIMc8kr95RC1atQeiuPuVKdM97NI2kfeQsJFCfgbiDtVMGAhPPb2+/bZAcu8FH6O4X0Y2m7EGWB3d879b2blyb/dl8I2w8PpXkUs2m/DuqHSHwB9afWlX566mqpx7hUZgj4Uf2qBS8VVaWrKmpLS9/XCaunNHaYcevkRbw2uMGdb1itYUtBSgL8AdZmC4uJRPt8j59Avlkp7pQO4Hr4jwQt63/EXiPVE53eS5DON9ov8yZIq10A3eo3A3jYhwmKOpRVMqrOipIwbhkeNpO56/NC7Bq5ok4I1deGRsxHLtwLW/W4Ho7WbcwfvuJj6K98Sfcyl141JJzrC/qAzmDzH3HuL3rDJ4TmyeKcv3sDnTeNwh7EC1L5/5PHiAGdog8T53OyJmivHotGZ+JvS+4L/5l8VGA/rLO+S8Azq/jOIOtUv4oUvcrD6TeSlL6hhzcpeCyIX97nsSYnxfv5L3TykHQ0nufcGEWQ6rTrCeOnX49SHD/nVkyOuniIHDui4ZQ+eJ2QsQdyFfOBEC3Gf/PnnC9aUtUlpFTrJ7fIIBPOUllrxNy4yyfXD/3td/izwdy7qRf4+OwfQwmmaPIHDXVYpKPO9lQpXgaiavGU9tb5Z538yiBTq1EuvQudubn9+uVOeInCFEVHU+xrtdzi8mqkSrbH4ZxrvNQyVcbZbVTNjyz4RQlUu1j1y+h39zP+8RcW+4wsjeHdvF3Wr9dK+ctFkk7WjtmC99kuj8MrMrKwfvYCqizTBNhyTg+5EpmhP9ZOdtKSFITmvvJy3mQHjfqZa/sQwvsVgsuRZLSUnJqp1pqhVb2m1bYpBZpn8se2XTK5smTprkD7U78OPLXkI+ghkdIu+btkk1NDO2oTNIEycuW0HKd2S6ie3YgvM+5SX1aTEPN9TMCkKVRNR2qYv0fExYJB4kZqfyuogMu5HPrwPe85HiiKV2OesOZXsXLjAWY7l1YAeJCaKuWhl3oGeQbGWKSlldBe7eQ/JfVJttkmgfGTYTpgkO7BG0+8w9B/hj5or+vWDPDiRUlTMysD1SK7rbzEqgaPiFetbLqhoc9+5AzFyTD8usyuHnnR6rW9NJPO9ivydEjp944r5+DI67JTiD4z0X5b3fTmW5GAhpM+6DlpGRkZuRe27hKaYHvGOlpSu2bQKoc6qdn2vq74Hm2d9a5i/Q+sl+RO/747yvJV98sPwS7LaJk/D51QtoLZdL3lE1M8Oeh5d55eHzQ4n5woQ/Wi8GM5FErOqbR878vxnB6XPwR66CYXfbfKW0o7HWXpFA5hqJcNVInBWooUDBtUPebYj3n66ySKAskJtIkvT7HJVFb8+38axDC5sJouNpc5eP5GdSxVKZaXu4cLUABKt7FWImQGoZg7KXOd/B8x6gr8l0gbsPF5kiRzEf/BjO9wSrO3QRHy3MmiefQKS5Bf1p2kJLsJpZduJFEvPah5fUj8jgjItoIfMlr6epTVS7dphrt2155ZVN/mIe0gPVJlxtkjTjJEM9uc8WjPcpHZNJLTUdfYWJkzDgO5DxlO3Sv6OL2BLfzCOqwr5giVS5IEoOEg8T80zKaoMVRjHZKPO+masE4P832l8m6WM3G4lkJKneK43cNJMIfDMyHMQiJsy9c9Gq4L1DQto+U/G0c0KkSaWwkUC+Txu0nE+4L58rVrt/Plfw7o0k7gEy7zUrsdOurBE2DQtwrHSNe/ihu7DRUrVaUDSHvsF5f6YfSnKGBVP26rgTeibt9eG59QaDAT8mI3e4vO4jzuT+RBPb55NXhDlSQYrvxwhay9e+gB/3ucDKD76Cy/ej0o9YoQ8j8hr/WOaP8T5rP6t+K1LnHV1d0rcWF+95BwkGv+DHg/E8i5aTJ9gV9ZPGGaQutit4B9pdoN3X175Z6WuX2H3lmSRuiWaCIvkeiPBehtxz4lQ+i8/aENyBlX2oUms5MwzhfS6TyOEOhPpMacXQNEHONOyRskjMyl+tHOtSAzw9MRnaWaMXeZ+vwH0XijvH+xqsIJLZJSr4nCrcN5cGa/D+J867p7rkPa39XO4IQwZ5TK7B0i5PrTovBsbmbl76RBQzgtbYiHdVlDz5lKOTWUTj4PmWfyDhqolUpS994o8B3+cf6uWR6ryj7zYBmRfieCdz5TPWwwOMxnxcRq9XlpbVknom4UtxNinvLdG7y1nG9RWqdWCBolohk+vCOfP9ZNoDA9Hq3X9XVopxdWAI7mFqPUUXtyE1A8vvZ7YLvnzPIKnWy2s5790bvpfjUV7M6MUOp3qfrCbcERe16gXgHfMJAc98lxWO7DHD9WNfjRe9d/4YLrR8/BEbB0cswU+ilFoQjksMhtwF3KOlpZh+L0F4n/f+uQUZBhXeMzLOuZt9R9XMBRCror53SjleBPm0kIz0KN+I/EDSOGLi5mmyjCEbnYndhB+NvAS+eayHK/e+nlAzirl/z/55ebW165cmqokcPB25lHSc5wVx4ssnfIBY8eVmiXz9bPYuFSFdnY+yDMy2maxmnGFHD/FDU0LZSve+FMp3BPeQZ1XkzGdIwe/oPZmZgi9ffkVeuvdxAy9m5ERS5myHIN1F3vUk77omq14IWBcREvxaTk44sQNBHTGxlLnmSa6l7xNPIBHpn3SHS1NR3FMtT0m17HAZdiqfbi/Z+cxOydEbwKCQlcq8EgvQMvW5I4B8zwVfg4GwMYwA2saQe9+5E8piTtXsHitlZoC0fsUfoxHNjMMPrI9Q/L7tJQT3ydv+jD4ndGMHGa6aWuSj95WjB4+dVO6JDEyTK94LcRWOx5xLFQwu6buk72lCqrAHVXiPILVH4lKJ9wquAFOs4vW1v6xW1b4434bR7ueraAHKetix8YDwKzZ1NqOeOzAMwR0Eo8+ryJk5SL3vyOVFXtC9N4xu+FjGPZHjvWGu7N2ZvcVCoCr5d72V9OK7akTeCUnyKpxCJTbcqFuNr6hjLp2E+xI8AXhHJovmlWK5xtTgfs+I3v0bIGZgEYEhteTIPCbtSLsgeCDvqyTeD5eMGAEBB5Z7blV9roH7Dqp5EL+eS3PPvyPunYs7kTpdj20X8Ivw1V+mACsv77iApmxm4PNHHltemkyWOyJe+W2E97GwGHiGVtWDh/Mq4IQf8CRLhF21Z49iiqarVl6j4Sf9y0iuB3kP5b0aLkniVIpv/ouJbuAe6GfrUhz0pi96BJohjVLevJaWoc4dyhmV1R4vtiFFMg2jhzYA1iHcyMLsxM/3NDQ0XjkgP7LjV4eCd/0iInP4gci7HvPvnYuyclR2mFmN52GYb06OEXiXve68YURAmloipuyPlAhdlCyWUzoGcN1uEBIvgPenBJDTDpfkQt4B7Rnn3j+cNq+knkO/HjyWOyKjhHGLd3SJR198IYb/lv1EBy726QvvvNR34NO4yLmwrC8uUJBRwvstk5yv0X2N8z5lP1LDOd0l7yw204RLkmq3SitYVL3zvEOOI8hS9S4x2WJczCy1GYWql9rdqq+yvRniHoLIFdvLyqkhTM4ENuvIuAXtAFXdjIv3sLA5Konwz5YjJWHQj48CyqVg7gEMvu1XZv+MrOJL7HZYxbyMzHvNB/iZN6jxzuyqytKrlYjl1OFv7iLgPRznPW1NCY77fbkLhSe9UAL9/gIgcHhfvtMCJDpvkPc/ido9dwHPe+45OMGU9n57Pc87eMSQ+z5STuBkEV8smigkcEd0iTy/yi3ywJxmnykemH9fJtfAsnyPM6R6lz0ui/2xgPdla1mtiQIPp+q9+k0C983ulRJBFUT6dz8uZMU9/IsS7+8OstlgHhHEqfalqn0jqpsJ7x5Ydl551HvoQSFodkZYLocE9cyzbWFIYh3YTJXJpml7yPJHTql/7vQC7L1slfZHhbyLsgVP0GQuUvDOwGp3/eNqvIcfegHn/RDP+5jSIeKMaEkpGWT2Oyyq8lQuk55aspBz5WmrOIHOJ9gXlAzjeT+1ygLANmQsyPjv4UPgcYB3MCp43kcYzj3lVj0BMnnDdmxBkywe/tvedqtJAluOx58Ty78ii6BilREvh/tYcAthNYs4PZy69764e4+oTXDPvW82ojIGKXSMqMVglvy7MMEEJIpddX0RrFcpw2kP8VPLpRyUeIfr89Bz8QHWQ9gNQ4JdAH6Oykj7fDmG+6hR0L03zna6dDSz2CHvBqwPEHnXZ72KSxIF78x3i8SlTArcH6vDejkC3uu4cPXJkyd4KTKsRJFszLDwQiXt/dxgjvd+7dwDfzp1DhIs8J5h4UdM2ipLBsR9RIalZJ4wTAwG0b9njDg31Z18JLoI9CUiy7Jlv3s9QdhtBO9b1pIEI/UIF6YguI/1L0duIbEu+0fK7p1d+wnOe9677nXsAc9DKnnlwi9+l4kuuYnLe8jkEZdg9M3/TH1IVe6WceeWmgKY1VZWy9FqCPjThrxfziFNN6PZISSvzvEeMkj5+yVeaYDTpjLvkZGjAO9OlxUxHxUHqPKu/xEDnpkv8c6dj7lK0I7p98fqkC0ied7rwh8DvB+aqkubenhhSWqqAepzlPl+Bu71mFUWmE7MyLAsFPlPDc4QeA825AqjYqEF5mIyRhjEw3RPDTdw6RnOv+euksPVuEJ33PuMbRPRWBUEkm+5JxCe3haK875xMjFLjlSjTd64CcF9LHosm+6Sd4SI0/jaJGNtpXvv9nStL8m7r9hOwNe3Nr9L7B35ssh7IB+o2pq71M847bwtMETCnZv4L6tQe+X8QOSoMqT2i+uWMhjNCy+egy3FGxk2sk1Fzmyfy/M+SrBIYAUFe52695WXg1De9VI7a597F2FLrCXeqwYwcGvIrOs+xPa/sGCgTtg+78knT65B2lND3usA70+cnDp1Z0kJn2kkKsEsz3DHv27JCM5tR4idN9wQnCEAP8IgiPwXzo3g6ZZwP3WuHqZmBD1zbkiaag2WdsMiT7yKy3/LS27W1h+dgvO+aT+ZVjajgwN172On3K0jU/VOeEdKBxPeJJbifeGenEnwiBCqG3ndbty82BiBrMizGfNs7y5ZsqTLowwv7LVt1tiCIuHZskCM9pDA5i61e82zthCkmh0VPClwUg5tv5ZA4D5yZMOcaUpX/dzy0TLsPO+jGp5zep9jfnWgW0aOk3H30etXVyHTpK8KzlyfNWDA0Os5WXB/Jty7A96r7hJmUuseCz956JsB4pPvOlSXWgdwH/PkXaUWC+fYU0sMmHtP5WXJM6UwEQO4toiC5H3LgowRotXzOfq0fjAXU29YIOGetqp+hGwZ5065DldNaBy5Yhs+R+pfPsNN3rdMJFZvyC1V+EWP/xtV3VP6SrCPHTsLTQAlueQdSUauqCVy7xXuvVlYHyzpF1jjWKGrsNt80UWovnx7POkxEKf6Gtcv1sCI9bQFiu5dxF01Y6lr80NwD2xOQH9zE17T/zzZNmbkcpWGogcaG0YXROK8F1yZ5vT3f7gYoZ2LU60S8ID4qkvSLjES7zmrrwv1Azk85/LG7oc2CLWQ3N55Y/qtOfJCGlcEf9dJnvfgJ8cIvdr7lT7zDObf+Txj2kIo3g2G3BIxy37KkmuQOM41nHuG1zzthgUAcIuYnNQNsSC4j6hH5IzZrUVNWAW7/0SPKX3cxH1y+UTN1UqxJKb7ymdJvIOv5UhErGgIreAdaYNHzhlF/I+bo7MrD+8qsH4GbOFp8yXWXfsG+iHrlOzAYWs1Z9xs49S4THtgmbrumZaPrEQNaftM9qTsA96maPT29L3CvY/c46Xi3hsKCqBLR3h3lZsp+jQIkzI+1utDrXBjPY5swHZW1qUNmXDJR+ZqkXfRo+uzrt+LaXa4Xo/p7Fcn8P4k0DQnS9eUlq4uLU1NHVOXylkdp2JS11ycmiYVixnkZRyvl/C4Ww6L12OYxSDyzhU+pnFHGdrbDYZ7hg8TseZyOLJZXte5UR55Bgnj+r+CU6uSi1S3r/qMJXh/C0/8o8sz3loWOpanPRT8YyJaaZzicn8PxAUm9Pd1sjrJiZzJxxdkGDkVPeOgTdFaAMX9RW2JsDQ/EFUpULurpyx1n5dhvD/PoPkzkxnLMirc+8g5yvCkaG4Bp9gjUd6/LXL6+zc5gv4LU+41V5mrcE8aEerHc3JqqqrmX2panYUFp2Ao1FwfQPDOLdfrrIIintsWdcyT4D/e4I5iggHhXrpwKqfUOdi54sb7gi0wczOvXzucRG0vkWp+096XcIe8cw593vD6EQbAOxKUvn7OgPK+CumKvdWNVU3sBTzJQtaJObG+5WNx4JGUSzzZF7jPFMG7hwLzn4JUirHZLnlPRueafG9IziTYcU9eyz+PrfiSWJgklznaDjqZx+oqCwwh1mQs1ejs+3yZUMrOrTRt+xzNvuMNXL324C3wRo8euVyZnWGuNPIRqsh80PjIyMafsWMGPvAIts8U0+rAAlWfLFhGUPRqTRbixoHBddcI7nqum8wbmUPRxdjh4TmXOEhPXKqqG/NYOPDvj42Rdnx/QuAd6JnS0n9xScmpC3k9w/FuyG1nuCQjV+xYMkwa/UcsMsgZGfdAXZ7WPtwAI1OLjHva+7J7r69fUP+UstJUxWSnMqNjC55jWeaue9ftnyXyPlZxZ4A7DUUnIknEclm7j/WfhY6peNf7lSEJDBtRvr7evWgV7ifhixWoi89jl+y22ZCfBfLAw0UZXdqn+1Dh3fOXamVtn+V4F0ti0OKAR7wfwbIue5RtNJZ/rzjhwMaCUYDwyCCOd1j/Bf75EXYIuLObotHOqm9YrRLuHNiLioTMeo1e76NtgPZdDKwUg35c4v1HIcJkLlbB3SKhU5dwf2IMcOtPBAPa1xyZKk0rBXOoc/9zVb7PWDJyDRkGS7sEMrMQ1SkZGRDx14ePMIzIQHEHo2KBfJTBUDLEKUhi02WsJp3Iobvp3iHCY+XZUo53qdogZivuldnjs1Dey79Cmshnu+QdqR1MsKF9Sv1UKsU0bLMRYxqrijy9dL20SttoFAt7nfDOdtkJ7x6Y/7xmoHw+ECkPCGlGwspYT6ybzmdhyq4xeIUAp2auRI4CiEdyPp5fqhQZ9O0BAnfcqzHzHaiWAYr8VfFsTVVWLeLDsxa9yi1OPZEVjtAefvKSvBb2SOmhVH6DVJF3bsVeauk3cpJyZz95kQbg/Zk0MAJyYU7dUiKDfKoE0+W57WCcWOq5koH3Zc0ytQQ9aMEIZCToTG50YGT7TvGYiHdAcpP3yZ6fyLxzxG+Uu9KkmPBGYE/34QaFwDu2kiTe9f6riHz/MA9vQV3rpnzX2X0x3okC4hmnl3i8O2jQ7t27l3RJpS62xRrnSnyPC1XDUO3epZn7rkDbxISFoOlFfIXBh3CxNVki8K3ivM8B7w4hHz9eXHIN3PtsDHfhk5fvrzsuWyXv7sPxLlW3MFevtVr1asjrV18TcjadORjv6JomZurF0jUgVK0TjOP9iSdS1wyQD1mYKq9KMuTCvGJ7riEXpmbkmjIQraIkg1EB1ExuPQC+Hm1TAEQPmo3M7bGcKSfmmsrdlTNvL/PHeB/rv/E4i2QYUWXKbpwSOjZUdO+haGn9wK2ueUduFAfxkq8I2wr33u12jHc/NRnEJiYmJiSwujIBeN8yjWA1EYaqiIXBOSRtL7HEhvOuJcBe3KNw7qNHNSiaWK8sFkhHeW/coVMW38m3RcarRi+6d16moOulmaKVDy/KytLLKh6Grz4+WeJSDrhKD+H95Bq8L0zaiReOvDqstLT00jd3lQr+/eSlTMQn83kZ7ivXRen14RmwmrcfAvJULO2Sm1syNW2IpZ5TM0/JPnzeuRHYqED7HES7LnzX6b7CKxz/c9ZxN7cm3dcxS9AxgkYZGzrLE60mQBt9vA3dO897aGhfNBep3v7MQ3OXVa7nkZ+4tQCQ726OzvNoVBroF/Fn7Ty9MInkp1WGluhZxkn3MNm/NzvBnX3ZD1u70abB+zSYiiRoV5EzB2ZD1MmO7VjhTLwi6klcpNdL7h1aFtHgkSn64NrqrBpgSHJGKn8fcKgOjVZPfqO45zDMVGCZmQNSgwXej8iS57DFIGoZyPspyPZ9wL1b0C327pKTkSPqRyywHGGmltRD9S7NM8ECm3v+G+O9fiGys7x2LUEyUveOVjgCfLd87Z6cmXx0iqBiRN5DUd7jsdX27PGNfSXnHjoLqSTQqHjw0OqQWm0X23vx+EZ4uFkaiWdn/PLe1Tz0M96/h/jZ1aVS4rNtqG8HBAe2eTm7szQHorW9ITPV7xrM3AZFveOo0Q2DCLQSZ0cqWz5GFqPuPVl5Fy+6rNej7l1fM0D5BnjL/IDPz4T75IhjgrmI8A7cfOkLmnO4d50UZAtyDLMQ530es9MCQlUDKt51unswz30POKrEAgNSsYpGzb3fY3nBnWgVGfiT/4ItOQJy5mn3AFpbPnEsYQjvMS3YvmD/7OMvixn/PuhLqBfoe2iFq1w2Es2iv+teMpLIsvuqN3fnrFlctpGvmo1M+KwMFe5c94AuZ6/9Ypm8UglYyLPqvH+8HC93hDZ6VAEpZ/YWq/DuOIuMCnO2cmucN2r0Qv2voFm0G1Yzu/i+v+FAzogPrRF6bEDex9SFl27Q5l2cSC2VlXlaP5T33NzDUy0wWG1HUyu6NEuGAcmr59anDYGRaYYBWdOnS3tqOMb7iFXIGVo0cUfK8fYpeHdPvk/umBXqhHdzPNa2bL+M+1j/8n/qXM6IeWiVvu8mu3i55993G4kZpXzNSdmKfKGPgO28qtp5tgzx7LyY8XK2o17lnJlhaIGvWrUjFNgNStxHjSqYPc0N3IMw9/6Ayo7Yi6xItQyUM/M1eZ9aJfS5lhsMTD3EZV5gjVh43Zgx4au1B8uaMcJ2wIjkmTdcjFbhX7nt87hFHcGWI+it6xTuuYffM6+kHeiVe4a/jhw1bxWO+7nXVe5qsFrGpNVCD89Gzgqdtd8t+T55/5ZQf/AHCUKhUHlH8u+xKAAXpkiwg4PQAIGNdoN3NPAdlIfVBPhqplDwiNGOT5v6leVrzps+K5aq295TrYhsk2gXeG/73mmV1qA2fLo0TI135jlezTR4YVVgBQVEQbs67kHdyNTqAJNStTKL9AEo7vqsTs03PEBsQZAldYB84dBj4eEC8GPqxoTXaaaiXuB5H5OKdtK4x2LA+mc8szA3OHgBuhgbzpoOvwcT5s/cw6VrLO3oa91lwdX78DSVOLAwPTlJSnEXZuPpjv1T/LEpUqR/jDPc35nSl4M9NJSvDxjLfSPzjtndx2cJwSoYIRsxwaTV/wzjvRCptFkfgZe75Lsz27Riva84jySuMM13Fa2CcFXl1Nuhd5fXUgPaZ352wOlrfziTKIgJW16khjtHe6NXZgNaFTOqEZczB2AT60jHUKFLu9TvFK0DjlJRrZk1+nEo7z5ZJzTf8MUsoQhSljOXcnjeeS8/5uQ3moP7UinH+xPBpUgGx4L22DBYAMkZGYZUopfSqnqU99x7nsnla9vRTBBTj6Zw6kdYhinjwOikWLgFaHpUErCUlNjY9BbkQrC8ChfnjAixoWn/LPcI5W4H/qFS1kWTd/ad8lBuTMDDxvb5JxrHervFO5ImJ3V4vjvi/aDRj2yY0V+zKsYoHKroEKaDtel4HyS4Ld52p6/9orL+a7myjPHs3NH88qTMoY0479ixb8DUTIBj6IAguYwdUt/9hk6tRFC+LX5QAyt6Ed5VwlWRqdXhsBgyPDxHagvJ9CN4v0tTC61J5fVMKSJnTpRkBMvZd0P7XbmGERkLct9Hg1UyEK0fYoArVheUYJHxKUsGxvu5IWSJbfQjQsyC7C9mjsUqescKwHNfQt3i/a1yf+jey+8+Oovz8Lyj1+L97T6hoccE3sdOwfRSvLfJDd6Rjh4Vxgi8bV2z63ebuN7oR/Dup67NoXtv9hNW3eUri94rmtvEEJVvuh7Wdr6yp7greWe85jaM4tz7Aeb+An7aNHI8tIJGNEs+FIqZAIdjwPwgtJA9CGuoIQvEFjlKG5qFV7D7ZGnWlnXmhPs8Dot+5R06GK4OUuL9MU3emW8OjeF5Rzl9vWSBHK1yKzcMubkjcDWju4sIRIU5p6fQQcHsROVMvWEEkt/hdxlOcrUhCFyQh4ac/uX/cAd3EKuCofE1e7RPKA+7wLunWp7+wVlj+Z9PAOEBtpOl9moULd5PE+GqO7yfN3IVvu7x3mUX11QfVEayzdzUUpjAO4e7czm1eE4ItjYPdnccvfxnEvflvHZv+JkBvEPc+dmk8UEFXtg8E3zcWjxgQLcV5T2gda/qHVOelGauW93lneE27gDI58hdmDL7ybRD0+Q9s1TAPbgUOaPUi4NDXSAe6YHHyRlMqQi0j6hfhQ2Kqdg6jxH1qCKKA2Geyey6BuYGeH96Gcy2gLhzBtuXnzUNFUyNdxYmcrifTgAHYNkflbpIV7x39ZR3lt1t5CNVXM9o8F5tE49Trs/uym/jKZeyizM/dr5wdvEeuLkSXu8IuMZj0MSHl0MxAx7/ntEdmA3kjFAUMz4o6NcibFoVwl3cyQxwYP7dikar6WpZCaaGLBbQ5P1aDp+L9FndiagUDHdN3pkjpfcGjyH3KWBKpOyMZLn1Jbh7TyvJIHGvN2RYnsIOGmJBC4HrsXPE/n/Zj7gTeJZD0d4j3p8u3+gxdmzfsR1P69h/TAmVYIe8H1cGu1+XIwcg7Quczv9q8v5hj3n3xHYZkHjfrTX1Lx6gSOA8D3DHu8LMHOR0uSjzvdiNneD9ryhszMNzCyDuoxoB7jD/giZg5C3D+MZg9wcVA4/vVYy5d0zOZKtlcZkaH59xbvGeeUgoFEO7XJ/AedfU7wPWpD7B63dk1lN3uCQ1gy98F2AH/xhheQq/dENKFmCuHfYNA7xjgyKtPRc7CJ131ZnTzTp3eR8b2gPe13Zwmj20/CHgO98qd8U7OAKKd878O7C5W2et/jw0plffI2vVXcWrQutHm1cb1jfDr1nVMy+W1lXL24Pxbznh+WYMduC3m5936t0TvcSNw5aP5Luyi8UCc5+TMR56pbGAa6Yxl6uKP4vtM+P4SDxw2nzOuwc5vMAj83E540DkTCwyW+2J+Xe3eM+syhL6Q1YhXcM2rKlDcAfx6kX18b2wNDV4zJgnsLlVrsAL8eyQ9wygvImNmYaVLEBnm/jekMTuHn8i7gHowiZ3bQbUM6FiMBk6dqMr3oF3Pzr22Nixs2AhK/t0xzEE99CNHeTk7Not/vKPO95BxXtcyw3wfhrf0tHZvBFf2GXku8csSXwW7xOTrxZnJpZJGxIQ3bUTuFkmzLujy5TUqggGtY0czWmZmV73NyB1j4BtsbiLOfBcYwOXjimY+xyfl0Q2AAZ0C3kX5o1uB5eS4Rr2Mt2EnMlUv2VivI8j9IxqPjKzSWx2nYN20juB8a7l35mLAHcgZ+4NLkXdO9OeS/IebMi9h3jysHqDAQGeb7axCsvg6E6duwfnXXV71jSlT0ec7ORt/iiwoa78+1cgVIWDY9Y6Dt27Oyagzx7bQTx7Xx+Ed3wqK8Zpp24t3iuguw6U+0775Z92hvtmLrnIre1oxgRNiE2tNmazTYpnK4g50jIhUpW8e5lT3Kc9L2kZoHqKGkZic6cN3/48jWGKfr6/oaFgFOS9YTnv8qfNRrZEBbzzSzJ2nHU4uMeLubKBaVibAb21FVFvg93lfYBqJUGWVPfeiWUZRd65EvcxT6rm36eW8l3E7k3F+i+l5WYYFGZ5hnjl9w0Y7yBWHbHgHMHzEQvG+3+3p6m8i3lDcDn79kv79+9/Gsm/47w7z0eyb5dv5G4GAu66yccx3kM7+ipmYRGxczfrsm7GFe+LZd6FSaGXneB+HuAeAgthgDM/7+tSwMMevvwC7DK8xqW6uY1w7s5xZ7yEZaijRy6fCadTv21AcAfRacHc2d9+e6Whge+jMWp0w8/82Q4UK3kvmt8N28aAP8U7uKP24rw7hmIS0aShZwjeN6jhvprvQwC+Yi2yMzne4YIOblnHmDq1vVWBmhErZy5hW9WkKnmvf4pANa3EsAAHnl/vgR3zPpadGZGrdpdJe38VmpLct798ypZNyGbBCt6nOOF9smfHRi7vKM6RsuyEWUf5zAtvWF8ydvLX5WMRrYPh/oi3u7xjrUMW24jA06hdD8wetPFL8zhfft6GdYrxsykEzVK78EOgdjD3vj2/jaBd2txXdZi9uEdy7mF7POHIEbciQPojFQjtNMYXjGqQNpvZy2dehN2VHPczusz5rXAhHqDd2i2oIFy+62tU51bxePVHciVHlnK3SF2ntIfwvVXYHgZMvzoOd5H38NITajOrYk+lUswvHy4JJnEfYSG3VX1m+ALcwRtGLCAyOIrKd/IewR1Tcg7x+pP7ls/yh/Oifb6SeR+LCRJn9TNgsPC4jy1/mkXmkhDeAdQIb0fLjwmJyAlAKGG4m7293ffvyAZQ20n/7vumVgZ8RT6He4jQrvdDG94YyUYSuzlfxh0TSdX5gQrcNTMzTALw7cvFHOTMPUJtDdecnSt4HEU0SQLaXV6KN7Q4SJo0Bcr8/gGZrQ4r19lUrpFhEN7hpmLzsW4HiD3AynOmOeSq1FfJX4DZUCXuMhlOeH9mWJ1AOm+PlV4k9/1gvilNFXcywHeIfMGi4J303LAuZoGBUDRY9oVL4QzH3H/7qnmKaz/PknFOjgz2He/D4452rd44C+ddux746Y4p/Ng4hqC7jxsvsqjpeEi+dbzTRxhLE0KPhpa/jYXaLT3h/SckbrT5EjOlRo32BEvFDtRlvHKZlo/zTlT7JiDdNWybXeAeNnOo6k6NCdMWD5ozE6j70ZyWCZspNWNnuJ0HcN6FBdffekm5ksSzDqFSgN8sMuB+h5XfikPvkAoai7pR3vVWRGnHZWvsVftBFsn7IsJFMx9khYcLdcA55IYfl+oeq0N5Ty0lHPTU9lI+ETkmuHTYVCJpfp9CvQ8hr1y7yLuAtCEjw0LW2N+Ti/FeP4yU72n3WDJy35defUZHudD8LrSjj5TV+GcfnHesDxKuTfg8ZOixPsha68nrsPtD6Kx1ooPfh42kjq+wnf6mm3rCO7ojzqAIshJmt9r7rXyW22IGrisVpXh+YCC2Q7vcoAC8ocXnuQ3xuCPKsNxMdVtgiJL3QQcqyXUYlQc+/3jPTFgdJkwxzZzpJR9TObdgtMK5Q96LveRQAYSrWOqF6/bI7ZBas1I61Q6c91YkO/Mf+Kow+V47oAbH/fHwKrzne+Y1gLvP43wbGkW57666Opz3Q9g+kcyJ0pNwyWrwmDFEsMpFmcFEcqZ91VQl7wacd3APSFPyjk03PUXiPmw4Okpm/KUcSG1/4Gr9Q/c/KE1z3v0g54EFDw0rGNXW87F3H4faBMqTjeV3oz/45zrRh/OjoVxY7f308fK+0ig61oH1X2XjXe5x76G1nO9dYyDh4O3KxRYJXWViH1Pbs6JOb/Yj2sXYdgtTqAkVHshu1n75K9BTKUNVnvg9g7xefPH7xdsPVB7Y/v2LL3oMmjlzplwKCZ37x1gl2UCoaAoKeNbHjwe4jwdSpvijIoScHfjEqZRxdCzqlI9aabWOQ3hHt5x5QGtVT+YiUtD4rN6ALLnesPpH0buHh69WxLKZP2K8A0MVzdSdopYBwJceIfzAv1LvC8Z4z8jdqbg5rsoleVfeA57KxVL0BO/MYUuuYYE8jcV6dqBZGHn/1OPHIO4TZFUy5QLpMNmnj5bPGht6DOI+68GnMU+9tgPhHQyIY+v+ybK6fW9zs1Lco0dDN667GztfustNv4n6d6R+ebGd2F0g0NdGKpqK86KWCSmTcNdV2IkGGoG2sqXPf/jh80t328sCw2S/jxUSKLaW4Z03ty6vbeYcYHvA/wD1ELxuYPkeL6Is7Pu5DQWSc4fFYJEFjc/twPIgRF2MiLt1KBI+Mk1W/Ti55am1CQmKTFpNKJgmfg3H48iOBVXiGGIGXALSnf/J4z45qz9QCrU1BO5jxqw5cljHtYtMewHZPHUMnpsReQ9GeV9Qf1jnmvf6ea54P4I599dLckGIK9dcfvWgR6iciimX/e3b5aHHON4nCE7evxyp2IV7l779zjpIO4fvrHVPs0TOBmZoJkh6KPT4uv1fv7O/wx/mbUI5F7+OwD3Fu4e8o+v52Hw/qUepqGhsHqgAqdhtkzYXsA1CNu9qJvuBAbjbyoC1hch7WRN1M5Vtas5dbFQ9mgN/pDh9ivbAU+ld6rWnQcYdCJnGs9PwbQZa1dy71dF9FRMPrRjvrYh8J9eKpcsf1YYsgna45uNaJlyuumv1j1nh4o8eD89RydzoLq7GaYeTTodKdz5z113tpdykarDg9tconqzgPWNVmkveRxBBr8i7tG4V8I4KnnkLLfWGBcj2ZrqXUPceuk6a2GfXruNQn8B9mcAnWZBNxya/vRH69r4c8GP7HN+nUu17FDkzOMfGdRs38t/0feg/wWvtx58TZ+ox72gjm6U2knc/P1v+Ut6NJ1YvbYYb0MAjQEiKp9GXloWFqFgYtm87USY2sCxM3RBfrij4bWjYs10tnj1wpbGAt+Li4tl7i4jNHuc7lLTrrd0rlbujjhMNl+/k4hlEByozNFDSrH711UU/5gDfHi6omcfDV19Te+eZpIO/F/z/5MmT/fo9+STsJ/YEfCw4WBHHQt5LF8jzq9z6pnbl+RfmGhDgDSMMq5Rzp09ZFmD63TJE6jv5+irg3A31w+VXZ/fPCkW43CiLdE6BY7wDif7gQ3BrJZb9yrNj3cZQsQLyWJ939imT8vtnobyH/l3IQcJTHfv7f84q74vHA2bvnvNeiAh4YucvcT6Ut/x8W5nQGwyYHS/XrMwPVJBO/BXYTGijz1H/zm+mpAB+JFHwC6SMVray6Ozsv34KbO8bDENO5bdag5RKZtF8stClE/IuEhuA8h4zWLupMnDwOT5ODfAOuFfLy3MCv3TMY48RkkYSMXA907333puaulBlxvNfpVipWOpduUOUBw2xIAfBjOVTykJ2uOgVBT7X0j4kDdi8eyzD+b7YyBhh35klJlI2hnqEji2fjKTVN4YKekYMW8F4WNexrqPjwT7rjk1Acy+sap5y41EpBBBPwZ+s7//bh3xOrLdb5qG90/BmWwixyUAI4u/5FAucJbXlE0u52aVlSs8eJq9DDQsp200uVvq82U3eRS+/fObcF51XTUIjHytauchhVdLe2nRVca5Oqw/KO5I6VHoS5LIxTUJK8vHHcVkjyRzwV04WWgmGrkFmvslR8o6DL3QCJn81jHdY/l6iclRaCXZQvTK3zu/ZZMBa6Y2wPHXkyFOr4I44CwyW97Hn7EcLu44eQ5dd3F0uEyoeAJ0zsL//XXDa0Om/s091aSv7zw7w8wmSSeHr0WPr1r0zGX/O3d43xDu693RivjruQjqR/0eIn+28ooC9ck4g0lUgBKuI4fr7PjtN+ZQQF3IGKfQFtM+98rl7e0mhSHSurKmxKpVM68pMlZEDeZc1uBVRO7FO93ApevW6DDxuPtwQANK9Cq2aYaORpzMnSutI3nFPn6rIzAi8pxqw0vf2YWrX4IiUkDQsWMB1IFPasHZM0PCixsJtxLoA0+7Q3tmI4I5XybBvrzsWehTjXWHH1h3/SqPpBMt+3TFB8uwy7iBOfWct8YwU7xvjHdv4fnG+BLfMO555CSmzvazC3eIyrCsYznub2lY0ieLekK6ZXw7Ma3tPaQeuff4ih15FuV8foHqfwPy73rpD/hyinG7RrMusyrkXqpbHVQ3Oql7D8u5J+FXfUFrnjPfU0sPqSojgfYF6r6a0p/q1i87dUn+PWiWY7tRCsi4BSP0F3N9A2+B3DfaCFK9OOPr3dXiOnf16Xejf33EG/Lp1/9znpIzsoY4Jf8dF/ATo258mx0dS4Y3yHo+eqivfj3DwGO0gUG3WWEX9YnMb0lsgDOva+9l2teHcVQarIfl0DPcnrK0ZJiFnzkRSk8tn7tnzsef27dN67NmbursdVrWku17fpC6L3rCOQ/x7qyzv2UKnbaB1uhNVOY+HP65h4TmrOzHcYcvVeGwOtV+pGuv3gtD1iSctR6Zq/I5HgJ7h1q8u4BRLKlIrPCBdvoGkDVm40AJt1cLXUdqTkVvUkVWKyjOuknKEpeT1NMUyjQlHIc5HgUQp37iWBPbBjUcnECazO6v8a9JR62LwMuHj4PTg1LyBu8GDxx9aS85bsUne3jfKO+ZqdF32MnQfGZT1kJBBgWX5XVpudnszsSaP/y6kbY7GRh6Jc5rlIuCZM9vmzPHYXjlt2navQXvgd3v27Jk5aJDX9wemTeuxjil6uPuygysGw4GHiZcALNFI8I6UfV1DLq/adUzCYuLVOT6Pq/v3nJxLU7HxNaCQ2G2Obz5wr0LUQBVfWvqMZsxyqqR9ATBh6Wr7wmfQOwh6/rSpz0A7lYaiG1eYhN4E6pXALzDUl7TPU94QHup45+jRo33/PmFdR999yvnTBzsmvPP3v8uoT5DSLSqyRKeL+gXv5Lzv6wcfPH6ce/LGPuXlX9+t1PrOtvp2zXs8LkyayzS8O4xTlzpBD/ZLIoVJyMxmL82nJH7WLHRYAqx7bk9MlAPPRNGYHkt2IGO6ix1EAnLcOIn3cViiUYt3fSsyFaraDbqQxZNANfcKeh0XM1lVG/DfQejJ/wteJbPwpIpzfzJ1jWLCNA4LWMVKslxLCVr0EjMd92IqZm7xNiFu89SqEQsw2jMW3FNvWXgqTVV0AB6PzVr34NeTVe7b7L6HHly3MRR6Z7EMAMaqxzaWH39b5Xii+y+Xl/zqoQcf7Oh48EFP4NlVXkHs0XyDvGNSFOpqm2I7Ga44rCz/ZeeONnFpWVtbiLy/TNjM5jbn61Crn929e3fbnM+6eipXtGBPnDZ/9mVHEOrW9dDP87xzuPvoqzSe/UYVgjuqeZJc7bLLF0Fm3YsFrT4+OTmrV39AXIAYlU503KR9aWlpKqLj61JLT5beRV49czQ6YcK8vnMheFppycJ2XPSANzzdRXOvKG8Tdg+Y2l6C8d6+alX7M2la9bxfHz++7p+TtV6Cvdtz3Trooo/yUvzYRvDtQ3ezyuNjs5UAcoErZ+pnjzvj/dt49ybW43adzy/DFE1goF9Z/vn3FOXBMTEK4s+La/uAFv/s4+8VA8ScEqf7Yww49qHdjQ6hwF2sCAuyOpoG6BE5M25cVpPWGZpahb5JWYu+Q0lTb/ZQGKsIGVavXp0jbCMZHp5TVdW0gUyQxhRKqc1k4umn/nWpFDAOt+E7ebL00rAjUxW+IqXQm3TcME9Ovkicyul1KumNQuxEQ95fZRkB5dGI3Nxcy8J/nfotn8baR772BGNi3boOgLqn51eqCcgYofylMMX9E7Px3t6/lfdo8pwVm59tLuMNlgXklz27VGVxX1z2GcVdM3Fxl8fLwDy6XjygcjeILVTcvX4v2Pd++mtxZND9WAmk1eFo/YAZcF1QNLycqdFsSVr0XVUWtOsri1xPbJiwrer5dzH14rVrkPkc6NmvXVQmPQds1byvwl9iwMW7ONt58eIJ5Y2Rl63xrq9GNLktqjru5JhIe31ne/2qhQvb29vvUkYNCufmgksgbNY+/dY/3r57rdZ9IKVFbdcN52dN2er923nHYy+B24rPP/RcunTp8893vTiwWk3IwJLw7J55a7gVz+Df3cEzmTu8un8tdgRFIpu6jwuwWh2tKzsZHTNfzweqPO9WLDuTgl/pok5ojBo+St6xPvwytJmZG4CpJfjh7VueuDL9pK2xGW3P5toZil4zzhXu3ibyHaSl/elPaWlqMia2xYmjikmP7fGnZk43OSVQVcpEeXv/Hrw7eTlNjZbEzbH3CPhk7jeczv6usBe9MR/Ep0KzDUS1OxxDr3LQXW3VA9Xuw/Me4FNzFb3oP3m7ftfa1zK6Zz4vnRBG2T24j+viosVR5iJdJc3EmGK1Pjr5HbjLaTIYqZrvlv0378L0Hn6qyfi1MD3gzvVr8f6deHdzfCGgPKqhYp08JV4t4/8bPfve7tnFciMlfv0S7K7RPV+aQm2y6gN8ON6B08er2mF2wNWAZZ1d5Ed7ALxKg/JC98Vduiz803XOmuKje89EqXVKip2umY3WtHi1OE96xWhl+O7CHmnJNjlNE6qNkGhv79+N9x4Cn2SS3q67wUZstma8cKO075g/uzEykmzb7nAUdyNl7UWt1gCE9yw0YQLcu8s34/wW6n6olaJazOfm2E/4RWOPORejqjDe7EoAu/ELiCMkWxX4mJ+Etf9mdy/F3YNNKhejJcXZOI7d6u39e/LuHe+2q2KJBjdRbnxmCSg2hY+wvwPsZxsbG2GzX4L27m68HPgNB4c7AJ6bbFqERqsPu/7AH3B1Pd3za+bo3zBgYqK090R3mb5oSTLHsFxJbkwMFyGaeujpzPKrqwEvj+Ot7t0rJmt6kJY4dS5Y1tP7hk2LdyD33KMwJkmM16S7uquRHUNW90TFuDOsYmLMMeY4lZMz07yuNMIlTeMB77J/j3QAHbODrH23Yryj0So/breyrmM/Zxbt+ro5jbPiza4uXiF5wb3TNTS8+d/UB1V0fHx0tnQOk+YeTC7fegr+u7L4OI536eJj4pzmEx+MjVEsAYwxR3l7/wG8AwrjXBNvTh6sfOIZVaHISjl3FQk8TKmbY2KBpQBLBpaSHt+SXcgNekXa8MBzVxr5hhtw9V5QJNwRG3r22V7ECg7wDq46rCBaHcfzrvexnlAmGrU1hZv5gCinxLOxrgZNUmyMZm4gLrlQTQi1pKhc8dikG0PClKTlWOP+gzw2O1l2QOYUBbzpsc6Qj33IZZmXKR68AIsgkV7o7f0H8Q4/OReOKkkjestOitX8tNWfYopKjosRR3BcbHJS1HTV85LXr8hrdiO3ODtyFL9zAS9jirvPDi1iVOaQrAEI7/rrDJnPhsCrx6yx6W4Dk55k1vQP7oyZrUmqQyYuKcrkrbGKJzo5JQa7zkm/wQ2aolJilJ9csrovzk5PT0r+D/CBDVa9l6Qnq/4u5pT/x93rWRiflA73zFFH4vfkHQyvJFZbyERle2uvoYpPilHeitOd3L5MP8VHRaWnR0VFT882aQw/M+72mAPPNcyV+odB1iP5TVKL93YyaknrokV88p1XNHqs3ZHcmeon5f3JnNSzibxHo1SEuDkpyt0wyxSfjvMLWI/PdqGk4OVLh1cQXMPf6AbByZAxy5qT0+Nv+IzZ0eB9JQ9kxd/kkWTwFlu8b415uDpgenyKWhlQUvxWV8sFW6LBh2bmY6PY5KhfoltMv+WdxpN3WWbH7MaG0VIXAsG3R0b+er+aa+eescgaoJd4JyqBo5Cxm/1LkjlRTmLwareHPrIF8Jc8IAb++gkxcUnx0T08SeHg6dHR8VHpSUBsRz/qmjbT741GNnx9aMAB3eB9gjgbsOlbs03et9A83LnyLdhoj0n5ZbC7g/0MsOzCwsLf/DvikzGQ/B1XGhsLxC3HONEOO28Uz96bqVmUdhVuBizi7uODVQLHkJ9V9nT4eUe3ZJ/5LW8bWqHpln7E1HrIuzBWTYLdirepmKuvnI12mRkVxLUQK4icvYPRLsFkWuFOkSLuxFxTEmWB8t5LbOsjZAJyENw1eJTQOA82zBsFXPuVs0VOw+uiGg53kfcaVL2z1AVT3nuH/UTGzEXP8bSjDSIjv529t8hF8vQjuIJDFO8+aL9ftzLr1Cjvf7yZyGTJtO8bliMdUcePh63dGz/6ucjF4iems1UfoBf3Exunr8IKgQdTFCjvvcDOkNmh7VfmjuSduoR8QePsoUUup8a43Lu4AnscsREBde+U995gpHMv+nZugyjaOdQ52t9wZ13ryhr9OGRFKube2emUBMr7rTdy0ubzuehWNdxuNY2zd7i1irtoEdIez0ef1UndO+W9l0l3oihh2hUU9/HgD6D9AOOkxAxVM+hWYnps62BlQ0hqlPebbtPxOhbm+7kNxD41BbP3atLODvQcjGwk1lnjg/LeehUre6TJSMr7rTaimhQmIVHaIyOLndAelxKNDZjMKrRbmI8eq5yMo7hT3m+14Ssgmb1XGkahyj2yoPhnrZzMZL6UEV1MuzILd+/oU1mq3invt9rwZTbM2UakeAAmZWaf1WrKZE76X5y/RhcUb2jVYxtuYDvJxFEKKO+9Cvdp3zYWoMLdSZgaFz9YUCfIyjqmSq+9JyobTSmgvPcm3A80NhSMLhgvlcoUXOES7qq9BKVytmjkgCZsV1RiZjWFQkB57024b5/bEAnTjwLvBQWzGY21U4/Kp0AbmHTWYO79OjazSgvFKO+32PDi3+2NaOFvZMFsL/XlVrGDkQUGaFuNq1VZuJpR6aVCjfJ+qwxv8/CzWEAAbfSoxtnT1FfSYqf4BY11r+t9pI2U9D5Ew8hYigDl/dbijs2qes1FItXRBY3PqfauJCaM0BYDzDVMzPjU4Lv8PkoRoLz3HvH+3NwCuTossuBbtRmmAQ8QqwvRjk8MHqv6ELv8JlMCKO+3VrxjYkaU7vwKpr/uUOu2NZiIODHvPrQGS83k4LmZuK2UAMr7LTW0C8WBuQXIEqaCvxapta4kT4B1tFtpxb171QYsoxNFAaC831JDK4ArJdy5POQVBe4qjQQLsWaKnbiY0Vd1UjVDee9FtjUGL/+VeS8oViRm4n5RPL8FC3ZPLCJwx8U7LSSgvPci9352bkGB3G9DsawjTsU7402Yi/AyAp/VOO4xLd50ronyfkuD1RhUvI9Gi39J3GNV1mjEJzjDPesa09Nmv9Qo73+kIblI5koDMqtaTCQiWZU+saYkbOPlotU+aA2wTw6xjzYV75T3W22I+n6uEfb8Fd37wzirZpV2my0DWdy7E7HqavwUCXQNH+X9FhuyaU9iY4HQ0x3mZn7FUzNmlX6UxLYiV6+j6zt8crIuEftO/kI/e8r7LTZkv669jaME3sFfxXiJWAxOO/xuaxzZWwl37grcaead8t6L5DtzpUDoMBMUND6yMVNryzmB+HSytVINEaqSuNNYlfJ+yw3ZErfoyv0FHO/jAe9EwbtiPRK5IUfmNUK6ZzXhuLM0VqW833p7lEXkjLBpB7ddx1BnjavTyaZMV69l6XHcd5Gpe/q5U95vvSGlYmeLI8cL3j0oqBiNVlPwvSYUW0wxu6r0WKhKzqoC3LPp505571W8z46EvI/neI8sztRS3lEDWUVXVDjLhAJf00lW3VDcKe+9weJR3scH8TsygS+Yfxd5N5mSBih252Q6F60GjP8X2ihyA1lATHujUt57hSGVvN2RPOvc/xjvcUnpUekpsWa1fQMzm67rCeletYEQMzEt9EOnvPc6/14MI1WR9wPu7Sn/QZUVp13feolcDxVDu81Q3nsf72eLua1U+XjV0epGx2um8zqeloHOHd9gG9wSzBR3ynsvjFd3NHI7BwvmuOqS9h3zQZxKaJlrGxT9mCDutAiY8t4rbCuiyf9ajABv7V7pwrc3XceljI9PFrGWiashpstVKe+9x9CGvg8Xy7gHBFkXaQPPMCsXteKeHWYhrym3HU4+Qz9vynsvMmTtKSP594CggIAAa8136ho+s7Opykr6dh99lcpufbREjFrv4h1tLbCXc/ABglkDHJ/uYPC9sxmm6I1XF4EgVU/OMFV9oDI4ONypdqe89yJBY0ZbvhcjvAcE6K2Oy60rrxZlCnZ1aOuimhqrXk/4dn2Oon6Ai1Rpn0hq3r14PZ+Ome8IwM1qtdbULOKtpqZGrw8IGDcO2WPyv4Cnt17fpbbtRyydVKXW+3ifjvYXyMSA13Nf9Pr77wfY66HBB8ZhwOdkNXWqynxa/0utN/JuSsJrvxx6mXfgu/UBPOUQc71+nGD8VKoeCJlrG9SDWrq6g1qv5B1vp6djVl62BmE+nuMb4Zz/HuCeVdPamalOO5Xu1Hot7/F4bj1z/mXH/TLw4yTzGSel2vXXs7Kqrg1gNIoOUgrpp0ytt/JObiHPZH7U3e1wWHn3rpeQl0rC9FWLXl1ZpAW7LoZqGWq9mXfvWGVtjFcTQN5hFQNVwazWrKzrVdc6GSfVZLF0bQe13s27EniYqyl647vvmubPbxWtqWnXdys7TzBOKyfN1LlT6/W8F8Zql8qI000M47pEOOZhOptKrffz7m1KYnW/2WLS6UImarcF796m+N9Me1QLde7UbhPesdZLN2BsFIWd2u3EO7nHdk9gj6Nr9qjddrx7Z8fegIpnzbQyjNptybu3d3SKuaewU9dO7bblHRCf5L6Tj0uOp+v1qN3WvEPk0+NcI29OioqiM6nUbnfeuTRLYXR8epIm9HHpUdHRtCSM2h3i3wXwTYXZ8VFJceYYVgA/5v9KToqPzs6mmUdqdx7vOPsmCjm1/2N4p0aN8k6NGuWdGjXKOzXKOzVqlHdq1Cjv1KhR3qlRo7xTo9aL7P8H42RgRXGRT5EAAAAASUVORK5CYII=" alt="CozyRoom.cv" class="home-logo-img" onclick="location.reload()" title="Reload">
    <div class="home-dm-wrap">
      <span class="dm-ing-lbl" style="color:rgba(255,255,255,.85);font-size:.55rem;font-weight:700;">☀</span>
      <label class="dm-switch"><input type="checkbox" id="dmToggleHome" onchange="toggleDark(this.checked)"><span class="dm-slider"></span></label>
      <span class="dm-ing-lbl" style="color:rgba(255,255,255,.85);font-size:.55rem;font-weight:700;">🌙</span>
    </div>
  </div>
  <div class="home-3col">

    <!-- LEFT: Rules -->
    <div class="home-col col-left">
      <div class="card" style="flex:1;display:flex;flex-direction:column;overflow:hidden;min-height:0;">
        <h3>📋 Rules & Legal</h3>
        <div class="rules-txt" style="flex:1;overflow-y:auto;min-height:0;">
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

    <!-- MIDDLE: Character + Play (combined into one frame) -->
    <div class="home-col col-mid">
      <div class="card" style="flex:1;display:flex;flex-direction:column;overflow:hidden;min-height:0;">
        <div style="flex:1;overflow-y:auto;min-height:0;display:flex;flex-direction:column;">
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
              <canvas id="avCanvas" width="330" height="390" style="width:110px;height:130px;"></canvas>
              <!-- Right arrows, with the randomize button right next to the first one -->
              <div style="display:flex;flex-direction:column;gap:4px;align-items:center;">
                <div style="display:flex;align-items:center;gap:4px;">
                  <button class="feat-arrow" onclick="nextSkin()" title="Skin">▶</button>
                  <button onclick="resetAvatar()" title="Randomize skin, eyes, mouth &amp; accessories" style="background:none;border:1.5px solid var(--border-soft);border-radius:6px;width:21px;height:21px;font-size:.75rem;line-height:1;cursor:pointer;color:var(--text-main);display:flex;align-items:center;justify-content:center;padding:0;flex-shrink:0;">🔄</button>
                </div>
                <button class="feat-arrow" onclick="next('eyes')" title="Eyes">▶</button>
                <button class="feat-arrow" onclick="next('mouth')" title="Mouth">▶</button>
                <button class="feat-arrow" onclick="next('hat')" title="Hat">▶</button>
              </div>
            </div>
            <!-- Labels below avatar -->
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:3px;width:100%;max-width:200px;">
              <div style="text-align:center;"><div class="feat-label" id="skinLbl" style="font-size:.65rem;padding:1px 4px;"></div></div>
              <div style="text-align:center;"><div class="feat-label" id="eyesLbl" style="font-size:.65rem;padding:1px 4px;"></div></div>
              <div style="text-align:center;"><div class="feat-label" id="mouthLbl" style="font-size:.65rem;padding:1px 4px;"></div></div>
              <div style="text-align:center;"><div class="feat-label" id="hatLbl" style="font-size:.65rem;padding:1px 4px;"></div></div>
            </div>
          </div>
          <div id="homeErr" class="err-msg"></div>
          <button class="big-btn btn-play" onclick="playRandom()">▶ Play (Random Lobby)</button>
          <div class="code-row">
            <input id="codeInp" class="code-inp" type="text" placeholder="ROOM CODE" maxlength="5">
            <button class="code-btn" onclick="playCode()">Join</button>
          </div>
          <p class="tagline-txt" style="margin-top:5px;">👆 Tap any player's name on the player list to mute or vote kick them.</p>
          <p class="tagline-txt" style="margin-top:3px;font-weight:800;">👥 <span id="totalPlayersCount">0</span> players online right now</p>
        </div>
      </div>
    </div>

    <!-- RIGHT: Lobbies -->
    <div class="home-col col-right">
      <div class="card" style="flex:1;display:flex;flex-direction:column;overflow:hidden;min-height:0;">
        <h3>🏠 All Lobbies</h3>
        <p style="font-size:.58rem;color:var(--text-muted);text-align:center;margin:0 0 6px;padding:0 6px;">The Play button joins a random lobby, or tap a lobby here to join it.</p>
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
  <div id="gameLeftCol">
    <img src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAu8AAAEECAMAAACvNiq/AAADAFBMVEWWox+aolylYSqp12RunSPdWabi5mRfFiJhWy3MlymaJGXg4N5wIGKPMR2kTo0vVhOiIpPRJ2XTVcTMJpvUVyygn56r3YVpjlGZcFUlDiheYVzPz86y2jDc6obbomO+vsDOpaF9eoJowDPuMzLNOsLKwRe/wcDCvsA/PEA+QUB+g4F+10ft8O3+/v4DAgL2OE761wT7yASKyCr6SDX6twP6VyzMKZK0KKX6pwNvuTX7lwYrAQb6hwz1RUq3JpcQFQrtNWr6Zxn55Qn6dxPZJ3h6wjD3Zij55zHmLHLy8vE3Nzanp6bIyMfNSLEoKCfuVk34PDtXV1f31zBISEf6Wxu3t7ctJgIrGAKHh4d3d3f46EtnZ2bRNY/xLVYxASmXl5fFKaVKBg3pV25rtkPk5OTrR2vJOKz79DLuZk/z10vydi3r6+pPFgrud1CV0irPVbLPSJH2xzGv5m1wZwZJOAHRV21RRgLqZ2v79EmRyBrYNXS4NKgRJgL0hi6z5lXuh0ysR0/zyErY2NhNBTBPJgXPV1fS09L2ty+uN5UzNwGp2W5yJy71pzGT1VDSdkzyt0vxmEpQBkaLdw6zV03RZ1KwHJSvRpPVZWxrWAXhLIWPhg6uly7M9W32mC9VVgWMNzO2SKfQSW3SVpAsRwWY12vSyDBsGSyLx06n1TCypi6s2k7c3NzI6W1tRwlqJxGLKHGUOEvMuDDyqEqPRy0VNQGOuE5tNw3Ux0rpVotsGFSQNXNpqjB3xUWUyWlUFS7lRo3mNopWFkt4dQia0Rvu7u6WOIqrWDVaqTHTVsTQt0g1Vw1rhy6MKFCySG3udmloB1HThUzLqDJnFxeoOlCtZjGthy1xJVKKZw+KqE6rlxejyym1VGfOSVT79BN0Jmt3NizY1DVMZg5Rdi10pkqvpxOViSy4VaqIJzSPeCm1ZU7TmUzG6lTSeGbSqEhOdROUZy64syz052lKaipYhi5umEqrOXDQdziXRUmTQnqLVxPU1k3sZIrh4OCLRhXBwb31hWac5FOrAAABAHRSTlP//////////////5H////////////////////d/////////////////////0IA////////////////////////////////////LP//9v//////////////////////////////b////////0//////////////////////////////rv///8r///////////////////////////////////////////////+X////////////////////////////////O/////////////////////////////////////////////////////////////////////////+E////isC4agAAXs9JREFUeNrtvQdAVMf69w/YY0li6k3uvb/+vv/G0hE47h5EZbMLy8oibSE0KUuTXgSRogiCFbHE3nvv3eg1Xo0lRtNjem835abc9P/MqTNzztldTKLoO48JynL27HL2M8/5Ps8884yHNzVq/+eYB70E1Cjv1KhR3qlRo7xTo0Z5p0aN8k6NGuWdGjXKOzVqlHdq1Cjv1KhR3qm5byZvE7BCyju1O93ObI2KY3WsDhhrTo7PprxTu2OtJT5WR1jsv2VT3qndiRadxOpULC6b8k7tjrP45D/p1M0cT3mndofJdnXfzhsbTXmndkdJGbPOmZnPUN6p3RZmckvLsDrnNp3yTq1XW3YKy7IxA6Lc4f3fFLgnJgCbLD+cRHmn1qsFSoyYT3TtmqMItV5ZvWS9Edi2C5R3arcX7kB7R/cId3aFR/9aY8Rrr72W9+Zaqmeo3RaGThvFOpc06RjuFe8a84wRvhEREXlvzpBT8CbKO7Xea1j8yTpNn6ejh87wAJ49AtprKO46mo+k1pstGfPZSe6OjOof8iIEey2vQn482ZvyTq33WqEgZ8x8Vj1F+8jsOBR3u4R7RN4XSPZ9K+WdWm+OVgWn/fBAntdst8T7Ynuer+TeD8qPx0R7U96p9WITKGY9ed51UVoHTse8O4hTeeB9I/Jk8c4+4E15p9aLbfD/LUSf295jnevvFAR3jnaB97wv2DtevFPe7xQTE+or+nvy2LLp6gduRXDPf82X8+zcl9oVcjbTm/JOrVerd3GuaUmtvVrQJCkm5+6dXQ+T7qJ8z7Mn3OmlkZT3O8a7i7gnvJln9AAOnvPxsT8pjzTJ7r2Lz8z4+nIK3rhZkjMp3pR3ar3YkiVUK/Jei6iVsugxylmneETNGDkdI/CeVyGeJIauX6XWm02WKAlvwhqYH+TAUyHi5aKDCmMExrsk383elHdqvdbOyAhX7uYU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" alt="CozyRoom.cv" class="ingame-logo-img" onclick="location.reload()" title="Reload">
    <div id="playerPanel">
      <div class="panel-title">Players</div>
      <div id="playerList"></div>
    </div>
  </div>
  <div id="roomWrap">
    <div id="roomHdr">
      <div style="display:flex;align-items:center;gap:8px;">
        <div><div style="font-size:.52rem;color:var(--text-muted);font-weight:700;">ROOM</div><div style="display:flex;align-items:center;gap:3px;"><div class="rc-display" id="rcDisp">-----</div><button onclick="copyRoomCode()" id="copyRcBtn" style="font-size:.5rem;padding:2px 5px;border-radius:5px;border:1px solid var(--border-soft);background:none;cursor:pointer;color:var(--text-main);">Copy</button></div></div>
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
// Kept IDENTICAL to the server's isBlocked() term set (see server-side filter
// further down this file) so the live/typing check can never disagree with
// what happens when the player actually presses Play.
const USERNAME_BAD_TERMS = [
  // Racial & ethnic slurs
  'nigger','nigga','nigg','n1gg','niga','nigar',
  'chink','chinc','gook','zipperhead','slant','slanteye',
  'spic','spick','beaner','wetback',
  'kike','hymie','heeb',
  'cracker','honky','whitey',
  'towelhead','raghead','sandnigger','cameljockey',
  'paki','pakis','jap','japs','redskin','redskins','injun',
  'coonass','coony','sambo','darkie','darky',
  'gringo','gringos','wop','dago','guido','kraut','krauts',
  'polack','polacks','mick','micks','cholo','cholos',
  // Homophobic / transphobic
  'faggot','fagot','fag','fags','fagg','dyke','dykes',
  'tranny','trannies','homo','homos','queer',
  'shemale','heshe','ladyboy','sissy','sissies',
  // Misogynistic
  'cunt','cunts','whore','whores','whor','slut','sluts',
  'skank','skanks','bitch','bitches','hoe','hoes','thot','twat','twats',
  // Sexual
  'porn','porno','pornography','xxx','hentai','nsfw','onlyfans',
  'nude','nudes','nudity','naked',
  'penis','vagina','vulva','anus','rectum','butthole','asshole','arsehole',
  'cock','cocks','dick','dicks','pussy','pussies',
  'boob','boobs','tits','tit','titties','titty',
  'cum','cumshot','cumming','sex','sexy','sexting',
  'masturbat','masterbat','orgasm','orgasms','erection',
  'blowjob','handjob','footjob','dildo','vibrator',
  'rape','raped','raping','rapist','molestation','molest','incest',
  'pedophile','paedophile','pedo','paedo','pedophilia','lolita','loli',
  // Violence / hate / extremism
  'kys','killurself','killyourself','terrorist','terrorism',
  'isis','alqaeda','jihad','genocide',
  'neonazi','nsdap','hitlersass','hitlerass','seigheil','siegheil',
  'whitepower','kkk','kkkmember','lynch','lynching',
  // Self-harm
  'kms','selfharm',
  // Drugs
  'heroin','meth','methamphetamine','cocaine','fentanyl','oxycontin',
  'opioid','mdma','ecstasy',
  // Contact-sharing / spam platforms
  'discordapp','snapchat','instagram','tiktok','telegram',
  // Reserved / impersonation
  'system','admin','administrator','moderator','staffmember',
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
    .replace(/[9]/g,'g').replace(/[6]/g,'g')
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
//  CEILING FAN + LIGHT SWITCH + WALL CLOCK
//  All synced across every player in the lobby via socket state —
//  identical fan speed/light and clock color for everyone at once.
// ═══════════════════════════════════════
let fanOn=false, clockColor='red', clockOffset=0;
let fanAngle=0, fanSpeed=0, fanAnimId=null, fanWindNode=null;
let clockIntervalId=null;

function fanAnimLoop(){
  const targetSpeed=fanOn?7:0;
  // Ease current speed toward target — real "spins up" / "winds down" feel,
  // not an instant on/off snap.
  fanSpeed+=(targetSpeed-fanSpeed)*0.02;
  if(Math.abs(fanSpeed)<0.01&&targetSpeed===0)fanSpeed=0;
  fanAngle=(fanAngle+fanSpeed)%360;
  const bladesEl=document.getElementById('fanBladesG');
  if(bladesEl)bladesEl.setAttribute('transform','rotate('+fanAngle.toFixed(1)+',320,30)');
  if(fanSpeed!==0||fanOn){ fanAnimId=requestAnimationFrame(fanAnimLoop); }
  else{ fanAnimId=null; } // fully stopped — no wasted CPU on a static frame
}
function applyFanState(){
  const bulb=document.getElementById('fanBulb');
  if(bulb)bulb.setAttribute('fill',fanOn?'#FFD966':'#999');
  // Switch lever intentionally left untouched here — it stays fully static
  // (no tilt/rotate) on every tap. Only the click sound + bulb color change.
  if(!fanAnimId)fanAnimId=requestAnimationFrame(fanAnimLoop);
  // Fan intentionally makes no ambient sound while running — only the
  // on/off click (playSwitchClick) plays. fanWindNode is left in place
  // as a variable (used below for cleanup) but is never assigned a
  // noise node, so no wind/hum audio is ever created.
}
function playSwitchClick(){
  if(sndMuted)return;
  try{
    const ac=getAC(),o=ac.createOscillator(),g=ac.createGain();
    o.type='square';o.connect(g);g.connect(masterGain);
    o.frequency.setValueAtTime(fanOn?1200:700,ac.currentTime);
    g.gain.setValueAtTime(.12,ac.currentTime);g.gain.exponentialRampToValueAtTime(.0001,ac.currentTime+.06);
    o.start();o.stop(ac.currentTime+.07);
  }catch(e){}
}
function playClockBeep(){ playTone(900,1100,.08,.1); }
function copyRoomCode(){
  const code=document.getElementById('rcDisp').textContent;
  const btn=document.getElementById('copyRcBtn');
  const showCopied=()=>{ if(btn){const old=btn.textContent;btn.textContent='Copied!';setTimeout(()=>{btn.textContent=old;},1200);} };
  if(navigator.clipboard&&navigator.clipboard.writeText){
    navigator.clipboard.writeText(code).then(showCopied).catch(()=>{fallbackCopy(code,showCopied);});
  }else{
    fallbackCopy(code,showCopied);
  }
}
function fallbackCopy(text,cb){
  try{
    const ta=document.createElement('textarea');
    ta.value=text;ta.style.position='fixed';ta.style.opacity='0';
    document.body.appendChild(ta);ta.focus();ta.select();
    document.execCommand('copy');
    document.body.removeChild(ta);
    if(cb)cb();
  }catch(e){}
}
function toggleFanClick(){ try{getAC();}catch(e){} socket.emit('toggleFan'); }
function clockButtonClick(color){ try{getAC();}catch(e){} socket.emit('toggleClockColor',{color}); }

// ── Wall clock: pure Date.now()-based math, synced per-lobby via a random
//    offset assigned once when the lobby is created — same technique as
//    the cat's deterministic movement, so every player always computes
//    the exact same clock time without needing constant server ticks.
function getClockDisplay(){
  const cycleSeconds=660*20; // 11 hours × 60 min × 20s-per-displayed-minute
  const t=Math.floor(Date.now()/1000);
  const cyclePos=((t+clockOffset*20)%cycleSeconds+cycleSeconds)%cycleSeconds;
  const minutesElapsed=Math.floor(cyclePos/20);
  const totalMin=(19*60+minutesElapsed)%1440; // baseline 19:00 = 7:00 PM
  const hour24=Math.floor(totalMin/60),min=totalMin%60;
  const period=hour24<12?'AM':'PM';
  let hour12=hour24%12; if(hour12===0)hour12=12;
  return hour12+':'+String(min).padStart(2,'0')+' '+period;
}
function updateClockDisplay(){
  const el=document.getElementById('clockText');
  if(el)el.textContent=getClockDisplay();
}
function startClockLoop(){
  updateClockDisplay();
  if(clockIntervalId)clearInterval(clockIntervalId);
  clockIntervalId=setInterval(updateClockDisplay,1000);
}
function stopClockLoop(){ if(clockIntervalId){clearInterval(clockIntervalId);clockIntervalId=null;} }
function applyClockColor(){
  const el=document.getElementById('clockText');
  if(el)el.setAttribute('fill',clockColor==='green'?'#3FAE5C':'#CC2222');
}
function stopFanAndClock(){
  fanOn=false;fanSpeed=0;fanAngle=0;
  if(fanAnimId){cancelAnimationFrame(fanAnimId);fanAnimId=null;}
  if(fanWindNode){stopNode(fanWindNode);fanWindNode=null;}
  stopClockLoop();
}

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

const EYES_LIST=['Round','Wide','Dot','Star','Shut','Wink','Anime','Tired','Angry','Happy','Heart','Spiral','Sunglasses','Squint','Cyclops','Dizzy','Sparkle','Cute','Pixel','Hollow','Cross','Sleepy','Curious','Laser'];
const MOUTH_LIST=['Smile','Grin','Flat','Sad','Wow','Tongue','Smirk','Teeth','Kiss','Wavy','Oof','Beam','Fangs','Whistle','Drool','BigSmile','Grimace','Pout','Zipper','Cat','Beak','Derp','Bubblegum','Yawn'];
const HAT_LIST=['None','Cap','TopHat','Beanie','Crown','Bow','Halo','Party','Cowboy','Helmet','Witch','Flower','Glasses','Headband','Chef','Antlers','Viking','Propeller','Tiara','Beret','Pirate','Santa','Fedora','Bucket','Fez','Hardhat','Mohawk','Bunny','Space Helm','Burger','Pizza','Cupcake','Frog','BearEars'];

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
function resetAvatar(){
  // Randomize skin tone, eyes, mouth, AND accessories (hat) all at once
  skinIdx=Math.floor(Math.random()*SKINS.length);
  eyesIdx=Math.floor(Math.random()*EYES_LIST.length);
  mouthIdx=Math.floor(Math.random()*MOUTH_LIST.length);
  hatIdx=Math.floor(Math.random()*HAT_LIST.length);
  AV={skin:SKINS[skinIdx].v,eyes:EYES_LIST[eyesIdx],mouth:MOUTH_LIST[mouthIdx],hat:HAT_LIST[hatIdx]};
  updSkinLbl();
  const el=document.getElementById('eyesLbl');if(el)el.textContent=AV.eyes;
  const ml=document.getElementById('mouthLbl');if(ml)ml.textContent=AV.mouth;
  const hl=document.getElementById('hatLbl');if(hl)hl.textContent=AV.hat;
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
      case'Star':starPoly(ctx,x,ey,R*.22,'#FFD700');break;
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
        [[x,ey],[x-R*.09,ey-R*.07],[x+R*.08,ey+R*.07]].forEach(([px,py],i)=>starPoly(ctx,px,py,R*.13*(1-i*.2),'#FFD700'));break;
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
      case'Curious':
        ctx.fillStyle='#1a1a1a';ctx.beginPath();ctx.ellipse(x,ey+R*.02,R*.1,R*.13,0,0,Math.PI*2);ctx.fill();
        ctx.strokeStyle='#1a1a1a';ctx.lineWidth=LW*.9;ctx.lineCap='round';
        ctx.beginPath();ctx.moveTo(x-R*.13,ey-R*.22);ctx.quadraticCurveTo(x,ey-R*.3,x+R*.13,ey-R*.24);ctx.stroke();break;
      case'Laser':
        ctx.fillStyle='#FF3333';ctx.beginPath();ctx.arc(x,ey,R*.09,0,Math.PI*2);ctx.fill();
        ctx.strokeStyle='rgba(255,50,50,.5)';ctx.lineWidth=R*.05;
        ctx.beginPath();ctx.moveTo(x,ey);ctx.lineTo(x+(x>cx?R*.7:-R*.7),ey+R*.02);ctx.stroke();break;
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
    case'Bubblegum':
      ctx.beginPath();ctx.moveTo(cx-R*.25,my);ctx.quadraticCurveTo(cx,my+R*.2,cx+R*.25,my);ctx.stroke();
      ctx.fillStyle='#FF6FD8';ctx.strokeStyle='#CC3DA0';ctx.lineWidth=LW*.7;
      ctx.beginPath();ctx.arc(cx,my-R*.14,R*.13,0,Math.PI*2);ctx.fill();ctx.stroke();
      ctx.fillStyle='rgba(255,255,255,.5)';ctx.beginPath();ctx.arc(cx-R*.04,my-R*.18,R*.04,0,Math.PI*2);ctx.fill();break;
    case'Yawn':
      ctx.fillStyle='#fff';ctx.beginPath();ctx.ellipse(cx,my+R*.1,R*.16,R*.2,0,0,Math.PI*2);ctx.fill();ctx.stroke();
      ctx.fillStyle='#FF99AA';ctx.beginPath();ctx.ellipse(cx,my+R*.16,R*.08,R*.08,0,0,Math.PI*2);ctx.fill();break;
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
      ctx.fillStyle='#FFD700';ctx.strokeStyle='#1a1a1a';ctx.lineWidth=LW;
      ctx.beginPath();ctx.moveTo(cx-R*.55,hy+R*.16);ctx.lineTo(cx-R*.55,hy-R*.3);ctx.lineTo(cx-R*.26,hy+R*.02);ctx.lineTo(cx,hy-R*.52);ctx.lineTo(cx+R*.26,hy+R*.02);ctx.lineTo(cx+R*.55,hy-R*.3);ctx.lineTo(cx+R*.55,hy+R*.16);ctx.closePath();ctx.fill();ctx.stroke();
      ['#F00','#0F0','#00F'].forEach((c,i)=>{ctx.fillStyle=c;ctx.beginPath();ctx.arc(cx-R*.24+i*R*.24,hy-R*.04,R*.08,0,Math.PI*2);ctx.fill();});break;
    case'Bow':
      ctx.fillStyle='#FF69B4';ctx.strokeStyle='#1a1a1a';ctx.lineWidth=LW;
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
      ctx.fillStyle='#8B5E3C';ctx.strokeStyle='#1a1a1a';ctx.lineWidth=LW;
      ctx.beginPath();ctx.arc(cx,hy-R*.04,R*.52,Math.PI,0,false);ctx.lineTo(cx+R*.52,hy+R*.2);ctx.lineTo(cx-R*.52,hy+R*.2);ctx.closePath();ctx.fill();ctx.stroke();
      ctx.beginPath();ctx.ellipse(cx,hy+R*.2,R*.78,R*.19,0,0,Math.PI*2);ctx.fill();ctx.stroke();
      ctx.fillStyle='#CCAA33';ctx.beginPath();ctx.ellipse(cx,hy+R*.06,R*.36,R*.08,0,0,Math.PI*2);ctx.fill();break;
    case'Helmet':
      ctx.fillStyle='#3388CC';ctx.strokeStyle='#1a1a1a';ctx.lineWidth=LW;
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
      ctx.fillStyle='#FF3366';ctx.strokeStyle='#1a1a1a';ctx.lineWidth=LW;
      ctx.beginPath();ctx.ellipse(cx,hy+R*.35,R*.8,R*.22,0,Math.PI,0,true);ctx.fill();ctx.stroke();
      ctx.fillStyle='#FF99AA';ctx.beginPath();ctx.arc(cx,hy+R*.14,R*.14,0,Math.PI*2);ctx.fill();
      starPoly(ctx,cx,hy+R*.14,R*.1,'#FF3366');break;
    case'Chef':
      ctx.fillStyle='#fff';ctx.strokeStyle='#1a1a1a';ctx.lineWidth=LW;
      // Puffy cloud-like top: several overlapping circles for a classic
      // chef's toque silhouette — taller and poofier than a flat dome.
      ctx.beginPath();
      ctx.arc(cx-R*.26,hy-R*.36,R*.24,0,Math.PI*2);
      ctx.arc(cx+R*.26,hy-R*.36,R*.24,0,Math.PI*2);
      ctx.arc(cx-R*.12,hy-R*.58,R*.22,0,Math.PI*2);
      ctx.arc(cx+R*.12,hy-R*.58,R*.22,0,Math.PI*2);
      ctx.arc(cx,hy-R*.7,R*.2,0,Math.PI*2);
      ctx.arc(cx,hy-R*.32,R*.32,0,Math.PI*2);
      ctx.fill();ctx.stroke();
      // Narrow band at the base — clearly distinct from the poof above it
      ctx.fillStyle='#fff';ctx.strokeStyle='#1a1a1a';
      ctx.beginPath();ctx.rect(cx-R*.42,hy-R*.14,R*.84,R*.26);ctx.fill();ctx.stroke();
      break;
    case'Antlers':
      ctx.strokeStyle='#8B5E3C';ctx.lineWidth=R*.09;ctx.lineCap='round';
      [-1,1].forEach(s=>{
        const ax=cx+s*R*.3,ay=hy+R*.03;
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
    case'Propeller':
      ctx.fillStyle='#CC3311';ctx.strokeStyle='#111';ctx.lineWidth=LW*.8;
      ctx.beginPath();ctx.arc(cx,hy-R*.3,R*.12,0,Math.PI*2);ctx.fill();ctx.stroke();
      [0,1,2].forEach(i=>{
        const a=i*Math.PI*2/3;ctx.save();ctx.translate(cx,hy-R*.3);ctx.rotate(a);
        ctx.fillStyle=['#FF4444','#4444FF','#44AA44'][i];
        ctx.beginPath();ctx.ellipse(R*.18,0,R*.18,R*.08,0,0,Math.PI*2);ctx.fill();ctx.stroke();ctx.restore();
      });break;
    case'Tiara':
      ctx.fillStyle='#FFD700';ctx.strokeStyle='#1a1a1a';ctx.lineWidth=LW;
      ctx.beginPath();ctx.moveTo(cx-R*.5,hy+R*.2);ctx.lineTo(cx-R*.5,hy-R*.1);ctx.lineTo(cx-R*.25,hy+R*.05);ctx.lineTo(cx,hy-R*.32);ctx.lineTo(cx+R*.25,hy+R*.05);ctx.lineTo(cx+R*.5,hy-R*.1);ctx.lineTo(cx+R*.5,hy+R*.2);ctx.stroke();
      ctx.fillStyle='#FF88BB';ctx.beginPath();ctx.arc(cx,hy-R*.32,R*.07,0,Math.PI*2);ctx.fill();break;
    case'Beret':
      ctx.fillStyle='#AA3322';ctx.strokeStyle='#1a1a1a';ctx.lineWidth=LW;
      ctx.beginPath();ctx.ellipse(cx+R*.15,hy+R*.08,R*.62,R*.32,-.2,Math.PI,0,true);ctx.fill();ctx.stroke();
      ctx.fillStyle='#CC4433';ctx.beginPath();ctx.arc(cx+R*.42,hy-R*.05,R*.08,0,Math.PI*2);ctx.fill();break;
    case'Pirate':
      ctx.fillStyle='#111';ctx.strokeStyle='#333';ctx.lineWidth=LW;
      rrect(ctx,cx-R*.42,hy-R*.7,R*.84,R*.74,R*.06);ctx.fill();ctx.stroke();
      ctx.fillRect(cx-R*.58,hy+R*.02,R*1.16,R*.18);ctx.strokeRect(cx-R*.58,hy+R*.02,R*1.16,R*.18);
      ctx.fillStyle='#fff';ctx.beginPath();ctx.moveTo(cx-R*.2,hy-R*.5);ctx.lineTo(cx,hy-R*.1);ctx.lineTo(cx+R*.2,hy-R*.5);ctx.fill();ctx.stroke();
      ctx.fillStyle='#111';ctx.beginPath();ctx.arc(cx,hy-R*.3,R*.08,0,Math.PI*2);ctx.fill();break;
    case'Santa':
      ctx.fillStyle='#CC1111';ctx.strokeStyle='#1a1a1a';ctx.lineWidth=LW;
      ctx.beginPath();ctx.arc(cx,hy-R*.08,R*.7,Math.PI,0,false);ctx.lineTo(cx+R*.7,hy+R*.28);ctx.lineTo(cx-R*.7,hy+R*.28);ctx.closePath();ctx.fill();ctx.stroke();
      ctx.fillStyle='#fff';ctx.fillRect(cx-R*.72,hy+R*.14,R*1.44,R*.16);
      ctx.beginPath();ctx.arc(cx-R*.1,hy-R*.72,R*.13,0,Math.PI*2);ctx.fill();break;
    case'Fedora':
      ctx.fillStyle='#4A3020';ctx.strokeStyle='#2A1A0A';ctx.lineWidth=LW;
      rrect(ctx,cx-R*.4,hy-R*.5,R*.8,R*.55,R*.08);ctx.fill();ctx.stroke();
      ctx.beginPath();ctx.ellipse(cx,hy+R*.06,R*.7,R*.16,0,0,Math.PI*2);ctx.fill();ctx.stroke();
      ctx.fillStyle='#8B6B3D';ctx.fillRect(cx-R*.4,hy-R*.04,R*.8,R*.1);break;
    case'Bucket':
      ctx.fillStyle='#5577AA';ctx.strokeStyle='#1a1a1a';ctx.lineWidth=LW;
      rrect(ctx,cx-R*.44,hy-R*.55,R*.88,R*.62,R*.08);ctx.fill();ctx.stroke();
      ctx.fillRect(cx-R*.5,hy+R*.04,R*1.0,R*.12);ctx.strokeRect(cx-R*.5,hy+R*.04,R*1.0,R*.12);break;
    case'Fez':
      ctx.fillStyle='#AA2211';ctx.strokeStyle='#1a1a1a';ctx.lineWidth=LW;
      ctx.beginPath();ctx.moveTo(cx-R*.35,hy+R*.1);ctx.lineTo(cx-R*.28,hy-R*.52);ctx.lineTo(cx+R*.28,hy-R*.52);ctx.lineTo(cx+R*.35,hy+R*.1);ctx.closePath();ctx.fill();ctx.stroke();
      ctx.beginPath();ctx.ellipse(cx,hy+R*.1,R*.35,R*.1,0,0,Math.PI*2);ctx.fill();ctx.stroke();
      ctx.fillStyle='#FFD700';ctx.fillRect(cx-R*.02,hy-R*.52,R*.04,R*.14);
      ctx.fillStyle='#111';ctx.beginPath();ctx.arc(cx,hy-R*.52,R*.04,0,Math.PI*2);ctx.fill();break;
    case'Hardhat':
      ctx.fillStyle='#FFCC00';ctx.strokeStyle='#1a1a1a';ctx.lineWidth=LW;
      ctx.beginPath();ctx.arc(cx,hy-R*.05,R*.62,Math.PI,0,false);ctx.lineTo(cx+R*.62,hy+R*.18);ctx.lineTo(cx-R*.62,hy+R*.18);ctx.closePath();ctx.fill();ctx.stroke();
      ctx.beginPath();ctx.ellipse(cx,hy+R*.18,R*.72,R*.15,0,0,Math.PI*2);ctx.fill();ctx.stroke();
      ctx.fillStyle='rgba(255,255,255,.35)';ctx.beginPath();ctx.ellipse(cx-R*.15,hy-R*.2,R*.18,R*.3,-.3,0,Math.PI*2);ctx.fill();break;
    case'Mohawk':
      ['#FF3333','#FF8800','#FFDD00','#33DD33','#3388FF'].forEach((c,i)=>{
        ctx.fillStyle=c;ctx.strokeStyle='#111';ctx.lineWidth=LW*.6;
        ctx.beginPath();ctx.moveTo(cx-R*.06+i*R*.03,hy+R*.05);ctx.lineTo(cx-R*.12+i*R*.06,hy-R*.5-i*R*.08);ctx.lineTo(cx+R*.12-i*R*.06+R*.06,hy-R*.5-i*R*.08);ctx.lineTo(cx+R*.06+i*R*.03,hy+R*.05);ctx.closePath();ctx.fill();ctx.stroke();
      });break;
    case'Bunny':
      // Headband arc across the head, like a real bunny-ear headband
      ctx.fillStyle='#E8E8E8';ctx.strokeStyle='#1a1a1a';ctx.lineWidth=LW;
      ctx.beginPath();ctx.arc(cx,cy,R*1.06,Math.PI,Math.PI*2,false);ctx.stroke();
      // Two perky upright ears near the top-center, angled slightly OUTWARD
      // (not inward/drooping) so they read as cute and alert, not sad.
      [-1,1].forEach(s=>{
        ctx.save();
        ctx.translate(cx+s*R*.22,hy+R*.05);
        ctx.rotate(s*.16);
        ctx.fillStyle='#E8E8E8';ctx.strokeStyle='#1a1a1a';ctx.lineWidth=LW;
        ctx.beginPath();ctx.ellipse(0,-R*.46,R*.16,R*.48,0,0,Math.PI*2);ctx.fill();ctx.stroke();
        ctx.fillStyle='#FFB6C1';
        ctx.beginPath();ctx.ellipse(0,-R*.44,R*.08,R*.34,0,0,Math.PI*2);ctx.fill();
        ctx.restore();
      });
      // Small pink accent dots at the headband ends (matching the reference)
      ctx.fillStyle='#FF9EAE';
      ctx.beginPath();ctx.arc(cx-R*1.02,cy+R*.18,R*.055,0,Math.PI*2);ctx.fill();
      ctx.beginPath();ctx.arc(cx+R*1.02,cy+R*.18,R*.055,0,Math.PI*2);ctx.fill();
      break;
    case'Space Helm':
      ctx.fillStyle='rgba(51,68,85,.6)';ctx.strokeStyle='#1a2233';ctx.lineWidth=LW;
      ctx.beginPath();ctx.arc(cx,cy,R*1.18,0,Math.PI*2);ctx.fill();ctx.stroke();
      ctx.fillStyle='rgba(100,200,255,.3)';ctx.beginPath();ctx.arc(cx,cy,R*1.18,0,Math.PI*2);ctx.fill();
      ctx.strokeStyle='#445566';ctx.lineWidth=LW*1.2;
      ctx.beginPath();ctx.arc(cx,cy,R*1.18,0,Math.PI*2);ctx.stroke();break;
    case'Burger':
      ctx.fillStyle='#E8A85C';ctx.strokeStyle='#1a1a1a';ctx.lineWidth=LW;
      ctx.beginPath();ctx.arc(cx,hy-R*.14,R*.5,Math.PI,0,false);ctx.fill();ctx.stroke();
      ctx.fillStyle='#6BA83A';ctx.fillRect(cx-R*.5,hy-R*.16,R*1.0,R*.1);
      ctx.strokeRect(cx-R*.5,hy-R*.16,R*1.0,R*.1);
      ctx.fillStyle='#7A4A20';ctx.fillRect(cx-R*.5,hy-R*.04,R*1.0,R*.12);
      ctx.strokeRect(cx-R*.5,hy-R*.04,R*1.0,R*.12);
      ctx.fillStyle='#E8A85C';ctx.fillRect(cx-R*.5,hy+R*.1,R*1.0,R*.1);
      ctx.strokeRect(cx-R*.5,hy+R*.1,R*1.0,R*.1);
      ctx.fillStyle='#FFD700';[[cx-R*.25,hy-R*.32],[cx,hy-R*.38],[cx+R*.25,hy-R*.32]].forEach(([sx,sy])=>{ctx.beginPath();ctx.arc(sx,sy,R*.04,0,Math.PI*2);ctx.fill();});
      break;
    case'Pizza':
      ctx.save();ctx.translate(cx,hy-R*.1);ctx.rotate(-.15);
      ctx.fillStyle='#F0C060';ctx.strokeStyle='#1a1a1a';ctx.lineWidth=LW;
      ctx.beginPath();ctx.moveTo(0,0);ctx.lineTo(-R*.42,-R*.5);ctx.arc(0,0,R*.65,Math.PI*1.13,Math.PI*1.37);ctx.closePath();ctx.fill();ctx.stroke();
      ctx.fillStyle='#CC3322';[[-R*.1,-R*.2],[R*.05,-R*.35],[-R*.22,-R*.38]].forEach(([px,py])=>{ctx.beginPath();ctx.arc(px,py,R*.055,0,Math.PI*2);ctx.fill();});
      ctx.restore();break;
    case'Cupcake':
      ctx.fillStyle='#FFB6D9';ctx.strokeStyle='#1a1a1a';ctx.lineWidth=LW;
      ctx.beginPath();ctx.moveTo(cx-R*.32,hy+R*.1);ctx.quadraticCurveTo(cx-R*.4,hy-R*.35,cx,hy-R*.42);ctx.quadraticCurveTo(cx+R*.4,hy-R*.35,cx+R*.32,hy+R*.1);ctx.closePath();ctx.fill();ctx.stroke();
      ctx.fillStyle='#E85DA0';ctx.beginPath();ctx.arc(cx,hy-R*.42,R*.14,0,Math.PI*2);ctx.fill();ctx.stroke();
      ctx.fillStyle='#FF3366';ctx.beginPath();ctx.arc(cx,hy-R*.56,R*.05,0,Math.PI*2);ctx.fill();
      ctx.fillStyle='#7A4A20';ctx.fillRect(cx-R*.34,hy+R*.08,R*.68,R*.12);ctx.strokeRect(cx-R*.34,hy+R*.08,R*.68,R*.12);
      break;
    case'Frog':
      ctx.fillStyle='#5CB85C';ctx.strokeStyle='#1a1a1a';ctx.lineWidth=LW;
      [-1,1].forEach(s=>{
        ctx.beginPath();ctx.arc(cx+s*R*.32,hy-R*.02,R*.16,0,Math.PI*2);ctx.fill();ctx.stroke();
        ctx.fillStyle='#fff';ctx.beginPath();ctx.arc(cx+s*R*.32,hy-R*.02,R*.09,0,Math.PI*2);ctx.fill();
        ctx.fillStyle='#1a1a1a';ctx.beginPath();ctx.arc(cx+s*R*.32,hy-R*.02,R*.045,0,Math.PI*2);ctx.fill();
        ctx.fillStyle='#5CB85C';
      });
      ctx.beginPath();ctx.ellipse(cx,hy+R*.1,R*.42,R*.16,0,0,Math.PI*2);ctx.fill();ctx.stroke();
      break;
    case'BearEars':
      ctx.fillStyle='#8B5E3C';ctx.strokeStyle='#1a1a1a';ctx.lineWidth=LW;
      [-1,1].forEach(s=>{
        ctx.beginPath();ctx.arc(cx+s*R*.4,hy-R*.02,R*.22,0,Math.PI*2);ctx.fill();ctx.stroke();
        ctx.fillStyle='#C89468';ctx.beginPath();ctx.arc(cx+s*R*.4,hy-R*.02,R*.12,0,Math.PI*2);ctx.fill();
        ctx.fillStyle='#8B5E3C';
      });break;
  }
  ctx.restore();
}

function drawOnCanvas(canvas,av,R){
  const ctx=canvas.getContext('2d');
  ctx.clearRect(0,0,canvas.width,canvas.height);
  drawAV(ctx,av,canvas.width/2,canvas.height*.46,R||canvas.width*.3);
}
function drawHome(){drawOnCanvas(document.getElementById('avCanvas'),AV,96);}

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
<rect x="0" y="0" width="640" height="320" fill="#E0D488"/>
<rect x="0" y="310" width="640" height="10" fill="#C7BB68"/>
<!-- Window -->
<rect x="32" y="34" width="126" height="168" rx="5" fill="#0D1A2E" stroke="#6B4C1E" stroke-width="5"/>
<line x1="95" y1="36" x2="95" y2="200" stroke="#6B4C1E" stroke-width="4"/>
<line x1="34" y1="117" x2="156" y2="117" stroke="#6B4C1E" stroke-width="4"/>
<rect x="35" y="37" width="58" height="78" fill="#0E1E38" rx="2"/>
<rect x="97" y="37" width="57" height="78" fill="#0E1E38" rx="2"/>
<rect x="35" y="119" width="58" height="81" fill="#0E1E38" rx="2"/>
<rect x="97" y="119" width="57" height="81" fill="#0E1E38" rx="2"/>
<rect id="lFlash" x="35" y="37" width="117" height="161" fill="white" opacity="0" rx="2"/>
<!-- Curtains, open style, drawn back on each side of the window -->
<path d="M14,26 Q2,90 20,170 Q28,182 16,206 L38,206 Q30,182 36,170 Q16,90 38,26 Z" fill="#0F4D92" stroke="#082A52" stroke-width="1.5"/>
<path d="M174,26 Q186,90 168,170 Q160,182 172,206 L150,206 Q158,182 152,170 Q172,90 150,26 Z" fill="#0F4D92" stroke="#082A52" stroke-width="1.5"/>
<rect x="12" y="22" width="164" height="8" rx="3" fill="#082A52"/>
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
<!-- Mirror above the middle couch: landscape rectangle, fancy frame + glass -->
<rect x="248" y="142" width="120" height="76" rx="6" fill="#B8860B" stroke="#7A5A08" stroke-width="2.5"/>
<rect x="256" y="149" width="104" height="62" rx="3" fill="#DCE8F0" stroke="#8FA8B8" stroke-width="1.5"/>
<polygon points="264,154 288,154 268,205 258,205" fill="rgba(255,255,255,.35)"/>
<polygon points="300,154 316,154 296,205 284,205" fill="rgba(255,255,255,.22)"/>
<circle cx="308" cy="140" r="3" fill="#B8860B" stroke="#7A5A08" stroke-width="1"/>
<!-- Light switch, wall-mounted, next to the mirror on its right side -->
<g id="fanSwitchG" style="cursor:pointer;" onclick="toggleFanClick()">
  <rect x="380" y="155" width="28" height="40" rx="3" fill="#F0F0EC" stroke="#333" stroke-width="1.3"/>
  <rect x="385" y="160" width="18" height="30" rx="2" fill="#FAFAF8" stroke="#999" stroke-width=".7"/>
  <text x="394" y="167" text-anchor="middle" font-family="sans-serif" font-size="4.2" font-weight="700" fill="#555">ON</text>
  <text x="394" y="187" text-anchor="middle" font-family="sans-serif" font-size="4.2" font-weight="700" fill="#555">OFF</text>
  <circle cx="383" cy="158" r="1" fill="#777"/>
  <circle cx="405" cy="158" r="1" fill="#777"/>
  <circle cx="383" cy="192" r="1" fill="#777"/>
  <circle cx="405" cy="192" r="1" fill="#777"/>
  <!-- Lever pivots from its base (bottom point) like a real toggle, not its center -->
  <rect id="fanToggle" x="391" y="167" width="6" height="12" rx="2.5" fill="#888" stroke="#333" stroke-width=".7" transform="rotate(0,394,179)"/>
</g>
<!-- Fireplace: on the left wall, turned fully sideways (even horizontal
     compression, no skew, so it doesn't look lopsided) and pushed off the
     left edge of the room frame so only about half is visible -->
<g transform="translate(-118,0) scale(0.42,1)">
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
</g>
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
<!-- Mouse and keyboard on the desk -->
<rect x="486" y="246" width="46" height="9" rx="2" fill="#3A3A3A" stroke="#222" stroke-width=".8"/>
<rect x="488" y="248" width="9" height="5" rx="1" fill="#555"/>
<rect x="499" y="248" width="9" height="5" rx="1" fill="#555"/>
<ellipse cx="605" cy="249" rx="8" ry="11" fill="#3A3A3A" stroke="#222" stroke-width=".8"/>
<line x1="605" y1="242" x2="605" y2="249" stroke="#222" stroke-width=".8"/>
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
<ellipse cx="307" cy="326" rx="210" ry="22" fill="#B56727"/>
<ellipse cx="307" cy="326" rx="196" ry="17" fill="#FFAA1D"/>
<ellipse cx="307" cy="326" rx="175" ry="12" fill="#FFC252" opacity=".85"/>
<!-- Left chair -->
<rect x="38" y="250" width="100" height="50" rx="9" fill="#0F4D92" stroke="#082A52" stroke-width="2.5"/>
<rect x="34" y="278" width="108" height="40" rx="7" fill="#3D74B8" stroke="#082A52" stroke-width="2"/>
<rect x="30" y="260" width="13" height="53" rx="6" fill="#0A3A70" stroke="#082A52" stroke-width="1.5"/>
<rect x="133" y="260" width="13" height="53" rx="6" fill="#0A3A70" stroke="#082A52" stroke-width="1.5"/>
<line x1="87" y1="280" x2="87" y2="316" stroke="#082A52" stroke-width="1.5" opacity=".45"/>
<!-- Main couch -->
<rect x="154" y="242" width="308" height="56" rx="11" fill="#0F4D92" stroke="#082A52" stroke-width="2.5"/>
<rect x="150" y="272" width="316" height="46" rx="9" fill="#3D74B8" stroke="#082A52" stroke-width="2"/>
<rect x="143" y="252" width="15" height="62" rx="7" fill="#0A3A70" stroke="#082A52" stroke-width="1.5"/>
<rect x="458" y="252" width="15" height="62" rx="7" fill="#0A3A70" stroke="#082A52" stroke-width="1.5"/>
<line x1="229" y1="274" x2="229" y2="316" stroke="#082A52" stroke-width="1.5" opacity=".45"/>
<line x1="308" y1="274" x2="308" y2="316" stroke="#082A52" stroke-width="1.5" opacity=".45"/>
<line x1="387" y1="274" x2="387" y2="316" stroke="#082A52" stroke-width="1.5" opacity=".45"/>
<line x1="229" y1="244" x2="229" y2="270" stroke="#082A52" stroke-width="1" opacity=".3"/>
<line x1="308" y1="244" x2="308" y2="270" stroke="#082A52" stroke-width="1" opacity=".3"/>
<line x1="387" y1="244" x2="387" y2="270" stroke="#082A52" stroke-width="1" opacity=".3"/>
<!-- Right chair -->
<rect x="504" y="250" width="100" height="50" rx="9" fill="#0F4D92" stroke="#082A52" stroke-width="2.5"/>
<rect x="500" y="278" width="108" height="40" rx="7" fill="#3D74B8" stroke="#082A52" stroke-width="2"/>
<rect x="496" y="260" width="13" height="53" rx="6" fill="#0A3A70" stroke="#082A52" stroke-width="1.5"/>
<rect x="599" y="260" width="13" height="53" rx="6" fill="#0A3A70" stroke="#082A52" stroke-width="1.5"/>
<line x1="551" y1="280" x2="551" y2="316" stroke="#082A52" stroke-width="1.5" opacity=".45"/>
<!-- Coffee table -->
<rect x="174" y="328" width="268" height="30" rx="8" fill="#5A3008" stroke="#3A1E04" stroke-width="2"/>
<rect x="180" y="331" width="256" height="22" rx="6" fill="#7A5028"/>
<rect x="186" y="357" width="9" height="12" rx="3" fill="#4A2006"/>
<rect x="429" y="357" width="9" height="12" rx="3" fill="#4A2006"/>
<!-- Red mug on the coffee table -->
<rect x="240" y="322" width="15" height="14" rx="2" fill="#CC2222" stroke="#8B1111" stroke-width="1"/>
<path d="M255,325 Q262,325 262,330 Q262,335 255,335" fill="none" stroke="#8B1111" stroke-width="1.8"/>
<ellipse cx="247.5" cy="322" rx="7.5" ry="2" fill="#8B1111"/>
<!-- TV remote on the coffee table, angled naturally -->
<g transform="rotate(28,347,340)">
<rect x="340" y="323" width="14" height="34" rx="4" fill="#2A2A2A" stroke="#111" stroke-width="1"/>
<circle cx="347" cy="330" r="2.3" fill="#555"/>
<rect x="343" y="336" width="8" height="3" rx="1" fill="#444"/>
<rect x="343" y="341" width="8" height="3" rx="1" fill="#444"/>
<rect x="343" y="346" width="8" height="3" rx="1" fill="#444"/>
<circle cx="347" cy="353" r="1.6" fill="#CC3333"/>
</g>

<!-- Ceiling fan, mounted at the top-center of the room -->
<g id="fanG">
  <rect x="317" y="0" width="6" height="16" fill="#555" stroke="#333" stroke-width=".8"/>
  <g id="fanBladesG">
    <polygon points="317.5,21.0 322.5,21.0 326.0,3.0 314.0,3.0" fill="#C99552" stroke="#7A5220" stroke-width="1"/>
    <polygon points="327.8,24.8 329.3,29.6 347.5,27.4 343.8,16.0" fill="#C99552" stroke="#7A5220" stroke-width="1"/>
    <polygon points="327.3,35.8 323.3,38.8 331.0,55.4 340.7,48.3" fill="#C99552" stroke="#7A5220" stroke-width="1"/>
    <polygon points="316.7,38.8 312.7,35.8 299.3,48.3 309.0,55.4" fill="#C99552" stroke="#7A5220" stroke-width="1"/>
    <polygon points="310.7,29.6 312.2,24.8 296.2,16.0 292.5,27.4" fill="#C99552" stroke="#7A5220" stroke-width="1"/>
  </g>
  <circle cx="320" cy="30" r="10" fill="#B23A3A" stroke="#7A2222" stroke-width="1.5"/>
  <circle id="fanBulb" cx="320" cy="35" r="7" fill="#999" stroke="#666" stroke-width="1"/>
</g>
<!-- Wall clock above the TV -->
<g id="clockG">
  <rect x="518" y="66" width="70" height="46" rx="6" fill="#1a1a1a" stroke="#000" stroke-width="1.5"/>
  <rect x="524" y="72" width="58" height="28" rx="3" fill="#DDE5E0"/>
  <text id="clockText" x="553" y="91" text-anchor="middle" font-family="monospace" font-weight="700" font-size="13" fill="#CC2222">7:00 PM</text>
  <circle id="clockRedBtn" cx="533" cy="106" r="4.5" fill="#E14444" stroke="#8B1111" stroke-width="1" style="cursor:pointer;" onclick="clockButtonClick('red')"/>
  <circle id="clockGreenBtn" cx="573" cy="106" r="4.5" fill="#3FAE5C" stroke="#1E7A38" stroke-width="1" style="cursor:pointer;" onclick="clockButtonClick('green')"/>
</g>
<g id="catG"></g>\`;
}

let fT=0;
function animFire(){
  fT+=.026;
  const sc=1+Math.sin(fT)*.015+Math.cos(fT*2.3)*.006;
  const sway=Math.sin(fT*1.4)*1.1+Math.sin(fT*3.7)*.4;
  document.getElementById('fireG')?.setAttribute('transform',\`translate(\${280+sway},290) scale(1,\${sc})\`);
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
    g.gain.setValueAtTime(.0001,ac.currentTime);g.gain.linearRampToValueAtTime(.78,ac.currentTime+.06);
    g.gain.exponentialRampToValueAtTime(.0001,ac.currentTime+dur);src.start();}catch(e){}
}
function startAmbience(){
  stopAmbience();rainNode=makeNoise(4,2600,.022);
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
  // Deterministic position from UTC time: identical on ALL clients simultaneously.
  // The cat now visits 4 different spots around the room in a loop (with a
  // pause at each) instead of simply pacing back and forth between 2 points.
  const WAYPOINTS=[70,240,410,560]; // 4 distinct floor positions
  const WALK_MS=3500, PAUSE_MS=2200;
  const SEGMENT_MS=WALK_MS+PAUSE_MS;
  const PERIOD=SEGMENT_MS*WAYPOINTS.length;
  const t=Date.now()%PERIOD;
  const segIdx=Math.floor(t/SEGMENT_MS);
  const segT=t%SEGMENT_MS;
  const fromX=WAYPOINTS[segIdx];
  const toX=WAYPOINTS[(segIdx+1)%WAYPOINTS.length];
  cat.surf=0;cat.y=SURFS[0][2];cat.vis=true;
  cat.ft++;if(cat.ft>6){cat.ft=0;cat.frame=(cat.frame+1)%4;}
  if(segT<WALK_MS){
    const prog=segT/WALK_MS;
    cat.x=fromX+(toX-fromX)*prog;
    cat.dir=toX>fromX?1:-1;
    cat.state='walk';
  }else{
    cat.x=toX;
    cat.dir=toX>fromX?1:-1;
    cat.state='idle';cat.frame=0;cat.ft=0;
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
    const now=ac.currentTime;
    const g=ac.createGain();g.connect(masterGain);
    g.gain.setValueAtTime(0,now);
    g.gain.linearRampToValueAtTime(.13,now+.05);
    g.gain.setValueAtTime(.13,now+.32);
    g.gain.linearRampToValueAtTime(0,now+.5);

    // Two slightly detuned triangle oscillators for a richer "vocal cord"
    // buzz instead of a single thin sine tone.
    const fil=ac.createBiquadFilter();
    fil.type='bandpass';fil.Q.value=3.5;
    fil.frequency.setValueAtTime(700,now);
    fil.frequency.linearRampToValueAtTime(1400,now+.16);
    fil.frequency.linearRampToValueAtTime(600,now+.42);
    fil.connect(g);

    [0,-9].forEach(detune=>{
      const osc=ac.createOscillator();
      osc.type='triangle';
      osc.detune.value=detune;
      osc.frequency.setValueAtTime(480,now);
      osc.frequency.linearRampToValueAtTime(980,now+.15);
      osc.frequency.linearRampToValueAtTime(620,now+.42);
      osc.connect(fil);
      osc.start(now);osc.stop(now+.5);
    });

    // Tiny vibrato for a less robotic, more animal-like wobble
    const lfo=ac.createOscillator(),lfoGain=ac.createGain();
    lfo.frequency.value=7;lfoGain.gain.value=18;
    lfo.connect(lfoGain);lfoGain.connect(fil.frequency);
    lfo.start(now);lfo.stop(now+.5);

    // Brief breathy noise at the very start (onset of a real meow)
    const nbuf=ac.createBuffer(1,ac.sampleRate*.08,ac.sampleRate);
    const nd=nbuf.getChannelData(0);
    for(let i=0;i<nd.length;i++)nd[i]=(Math.random()*2-1)*(1-i/nd.length);
    const nsrc=ac.createBufferSource(),nfil=ac.createBiquadFilter(),ng=ac.createGain();
    nfil.type='highpass';nfil.frequency.value=2000;
    ng.gain.value=.05;
    nsrc.buffer=nbuf;nsrc.connect(nfil);nfil.connect(ng);ng.connect(masterGain);
    nsrc.start(now);
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
    const cvs=document.createElement('canvas');cvs.width=132;cvs.height=156;cvs.style.cssText='width:44px;height:52px;display:block;flex-shrink:0;';
    drawAV(cvs.getContext('2d'),p.avatar||{},66,72,43);
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
  fanOn=!!lobbyState.fanOn;
  clockColor=lobbyState.clockColor||'red';
  clockOffset=lobbyState.clockOffset||0;
  showGame();renderPlayers();renderList();
  applyFanState();applyClockColor();startClockLoop();
  addMsg('<span style="color:#1a7a1a;font-weight:800">✓ You joined!</span>');
});

socket.on('fanState',({fanOn:on})=>{ fanOn=on; applyFanState(); playSwitchClick(); });
socket.on('clockColorState',({clockColor:c})=>{ clockColor=c; applyClockColor(); playClockBeep(); });

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
  try{stopFanAndClock();}catch(e){}
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
  try{stopFanAndClock();}catch(e){}
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
      const c=document.createElement('canvas');c.width=99;c.height=117;c.style.cssText='width:33px;height:39px;display:block;';
      drawAV(c.getContext('2d'),p.avatar||{},49.5,53.8,32);avRow.appendChild(c);
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
app.get('/ads.txt', (req,res) => res.type('text/plain').send('google.com, pub-2352009046427964, DIRECT, f08c47fec0942fa0'));

const LOBBY_MAX = 8;
const KICK_BAN_MS = 10*60*1000;
const VOTE_KICK_COOLDOWN_MS = 3*60*1000; // 3 minutes

const WORD_LIST = [
  'AppleSauce','BagelBoy','CinnamonRoll','DonutDude','EggRoll','FrenchFry','GummiBear','HotDog',
  'IceCream','JellyBean','KiwiSlice','LemonDrop','MapleSyrup','NoodleSoup','OrangePeel','PizzaSlice',
  'QuailEgg','RamenBowl','SushiRoll','TacoTruck','UdonNoodle','VanillaPuff','WaffleStack','XtraCheese',
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
,
  'PetiteOtter','BlissfulLantern','SpicyFox','GiantJasmine','FruityMuffin',
  'SparklyTulip','ZippyBrook','JumboPatch','MoonlitTruffle','CloudyMitten',
  'WavyPraline','SereneFudge','VintageQuilt','PeppyCider','JazzyMocha',
  'StellarRabbit','FluffyBeanie','RainyMeerkat','NiftyFinch','CrunchyMirror',
  'CloudyPeacock','SnugglyDaisy','SunnyViolet','CrispyRaindrop','BoldWren',
  'BeamingMeringue','PerkyMirror','TinySundae','CheekyKitten','WhimsyWoodpecker',
  'HappyWoodpecker','CheekyRaindrop','GlowingFawn','RadiantFabric','WavyAcorn',
  'SleekButton','MistyRabbit','RosyKettle','TangyOwl','GiantLamp',
  'WobblyFabric','SwiftFinch','SnugglyPoppy','QuirkyRaccoon','PeppySnowflake',
  'BerryDumpling','FrostyPenguin','MintyCustard','SpunkyKitten','SleekPetal',
  'ToastyCobbler','MoonlitPiglet','BerryLeaf','TwinklyMirror','ToastyOtter',
  'QuirkyGrove','StellarShelf','SpicyLamb','FrostyWren','ShinyButton',
  'PastelSeal','BouncyCurtain','JumboGerbil','RainyBlanket','MerryBrownie',
  'ButteryFinch','CheeryLatte','ShinyVase','CosmicTart','FrostyToucan',
  'GentleBaklava','ModernThimble','ToastyBrownie','GentleCurtain','PlacidMushroom',
  'CuddlyWombat','CurlyNeedle','WavyMeringue','ZestyFlamingo','MistyLilac',
  'CrispyBreeze','TenderBreeze','PerkyHummingbird','WavyTart','WhimsyGrove',
  'TwinklyScarf','TwinklyCroissant','TwinklyOrchard','QuirkyClover','RosyDuckling',
  'BreezyVase','CloudyScone','RetroCrumpet','GiantFudge','GigglyRainbow',
  'SereneCushion','CloudyLamp','GlossySnowglobe','StellarCub','PlacidCider',
  'SnappyMocha','TranquilLeaf','MistyBuckle','WobblyTurtle','VintageChickadee',
  'SereneQuilt','GigglyWoodpecker','GigglyValley','BouncyCookie','ToastyEnvelope',
  'MiniHammock','FancyEnvelope','JollyMeadow','DewyFerret','MerryLantern',
  'BeamingFlamingo','BreezyPetal','CrispyBrook','HumbleVase','StellarGerbil',
  'GoldenHilltop','BlissfulWombat','FreckledStitch','PlumpJasmine','SpicyCroissant',
  'SwiftLamp','FreckledQuokka','DapperMitten','SwiftZipper','StellarHilltop',
  'RetroNoodle','CitrusSnowflake','ChillGelato','FeistyFritter','CitrusClock',
  'CheeryMeringue','SaltyJasmine','ButteryCookie','FuzzyBlossom','MiniDaisy',
  'SpicyDumpling','NimbleChinchilla','WobblyKoala','BlissfulEnvelope','RadiantPanda',
  'PluckyTart','FluffyMeadow','PetiteBrownie','CloudyPraline','FluffyPetal',
  'MoonlitBadger','SpeckledGarden','VividLatte','PeppyPoppy','ModernPatch',
  'SereneKoala','GoldenCider','BreezyBasket','SpunkyNougat','ModernScone',
  'VelvetChai','SwiftSnowglobe','GoldenOwl','FeistyLavender','GlossyBaklava',
  'MiniBluebird','RainyPudding','CheeryQuilt','FluffyHamster','JumboToucan',
  'ZestySmoothie','StellarPretzel','VividTeapot','CrispyCurtain','GoldenGarden',
  'SerenePopsicle','ButteryRibbon','QuirkyDanish','CheeryMocha','CloudyRobin',
  'GentleDumpling','TenderSpool','CosmicNeedle','RusticOtter','SilkyToffee',
  'SwiftCroissant','CrunchyDaisy','FeistyPetal','PastelFudge','MerryLilac',
  'BreezyPeony','GlowingBlossom','ShinyTulip','BoldPenguin','TinyPopsicle',
  'ToastyMoss','RosyBreeze','NimbleCocoa','CozyCrumble','TangyBreeze',
  'HappyFabric','SereneCupcake','MintyBlossom','JazzyShelf','CreamyTulip',
  'CozyKitten','FancySmoothie','CuddlyClock','RainyBiscuit','ChipperGerbil',
  'ChewySlipper','FreckledDolphin','FeistySweater','TenderCardinal','RetroMarshmallow',
  'NuttySmoothie','RainySparrow','FreckledEclair','SnappyPillow','ModernWoodpecker',
  'RainyThimble','BreezyRibbon','SilkyDolphin','PetiteAlpaca','MerryVase',
  'DapperBreeze','SwiftSpool','ZippyTelescope','SpunkyNoodle','TangyTeapot',
  'MistyPancake','CuddlyThimble','CurlySweater','TranquilCompass','PeppyMarshmallow',
  'PetiteKitten','NuttyMarigold','FruityCandle','SpunkyPoppy','ZippyPond',
  'SereneRainbow','CurlyHedgehog','BouncyHamster','FruityTurtle','GooeySquirrel',
  'BreezyDuckling','SweetMacaron','VelvetPeony','WhimsyHammock','DreamyRaindrop',
  'ChillRainbow','DreamyEnvelope','CuddlySunflower','PetiteChick','ChillWindchime',
  'CheerySunbeam','SnappySunbeam','PluckyDumpling','GlossyGosling','ShinySorbet',
  'FreckledRainbow','TranquilTulip','SwiftBunny','DewyPeony','SpeckledBunny',
  'QuirkyPudding','CrunchyBeaver','BreezyMeerkat','SaltyChick','StellarFawn',
  'CozyToffee','CitrusFrame','PeppyCandle','ModernBaklava','SilverMacaron',
  'MiniFritter','SilkyHummingbird','FruityCocoa','GroovyNougat','JollyPiglet',
  'WobblyQuokka','CloudyCustard','FrostyMirror','VintageSnowglobe','WobblyViolet',
  'SunnyCrumble','TranquilBuckle','FluffyCloud','PlumpMitten','GooeyBadger',
  'CosmicCupcake','TenderAcorn','SilkyHammock','CheekyRainbow','SpunkyCroissant',
  'SwiftHilltop','MistyBluebird','GlossySeal','MellowBiscuit','GlossyBiscuit',
  'NuttyClock','JazzyPatch','MiniBrownie','SnappyClock','ChillMitten',
  'GooeyMocha','SaltySloth','RainyCaramel','SilverSlipper','RosyChai',
  'CosmicFinch','SereneLilac','JazzyMarshmallow','BlissfulFern','TinyCrumble',
  'ChewyPraline','WobblyTulip','PerkyBunny','PlacidViolet','SnappyCookie',
  'CozyCookie','GoldenKoala','FeistySnowglobe','TranquilSpool','ToastyToffee',
  'BoldTeapot','QuirkyKoala','QuirkyCobbler','MellowSloth','SnugglyPraline',
  'SnazzyLeaf','BouncyToucan','HappyLlama','ZestyTart','SnugglyMushroom',
  'SleekRobin','VelvetSock','SpunkyCaramel','BouncyLlama','FeistySunbeam',
  'CuddlyFlamingo','SwiftStitch','SweetPlatypus','SpicyHammock','HappySnowglobe',
  'PerkyRaccoon','FruityMeerkat','SnugglyOrchard','MintyCupcake','WobblyPancake',
  'NiftyPlatypus','BeamingCider','FeistyHedgehog','ZippyJasmine','CurlyMuffin',
  'SpeckledOwl','WobblyThimble','ButteryLeaf','JazzyMeerkat','FrostyBlanket',
  'SaltyTart','SparklyLeaf','BerrySmoothie','WhimsySweater','CloudyRabbit',
  'CozyIris','VividFrame','SleekBiscuit','ChipperToffee','TinyBlanket',
  'SpunkyGelato','MistyDaisy','HappyMeerkat','MintyWaffle','StellarPlatypus',
  'PlumpMug','ToastyPatch','HappyHilltop','SnazzyCushion','SunnyPlatypus',
  'PluckyBadger','TwinklyLlama','FreckledHilltop','TwinklyMocha','TinyTart',
  'MellowSunbeam','CloudyLemur','SnugglyFox','StellarWombat','SwiftLemur',
  'PlacidWren','WhimsyCloud','CheeryDanish','GiantClover','SilverSquirrel',
  'CurlySparrow','ToastyBeaver','SaltySmoothie','BouncySlipper','JollyRaccoon',
  'TranquilMitten','PlacidDonut','WavyFerret','SwiftChick','ModernNeedle',
  'PlacidSorbet','NuttyPinecone','MiniValley','StarrySnowflake','SleekSorbet',
  'TenderAlpaca','CreamyFlamingo','PastelWaffle','RosyMirror','ModernValley',
  'CuddlyCandle','PetiteFinch','SereneLamp','SilkyPuppy','SnappyRainbow',
  'CrunchyCupcake','PeppyClock','SparklyBiscuit','HumbleLamb','GiantRug',
  'CurlyRabbit','RosyBrook','SnazzySnowglobe','ToastyPopsicle','VelvetLlama',
  'FuzzySnowglobe','SilverCroissant','StarryCookie','FuzzyMug','PerkyClover',
  'FreckledFrame','CitrusMug','CheekyParfait','SweetBuckle','FancyPopsicle',
  'WhimsyIris','JumboLatte','GooeyGarden','RetroDonut','VintageCocoa',
  'StellarTruffle','SnugglyDolphin','SpunkyPopsicle','SweetGosling','CrispyToffee',
  'CurlyCaramel','DapperNougat','ToastyCaramel','BouncySundae','FluffyCandle',
  'FluffyCrumpet','MoonlitStrudel','DapperCookie','GigglyTrifle','MerryPillow',
  'JazzyCobbler','CrunchyLatte','TenderLlama','CrispyBasket','DewyChinchilla',
  'TranquilVase','WhimsyMeringue','CrispyAlpaca','CosmicBrownie','CitrusAcorn',
  'GooeyStrudel','CheeryDrawer','RainyDonut','NuttyPeacock','ChillPlatypus',
  'MintyCider','SnappyBasket','VintageDumpling','ChewySorbet','BoldBrownie',
  'DewyFlamingo','ZestyPond','JumboFritter','CuddlyMuffin','ChillCrumpet',
  'DreamyCobbler','MoonlitSnowflake','SilkyBuckle','SpunkyCustard','VividMilkshake',
  'PlumpFern','WavyWalrus','CozyCupcake','PeppyCurtain','RadiantChick',
  'SaltyLilac','BouncyVase','ModernSunbeam','DapperPretzel','SunnyTruffle',
  'SpunkyOrchard','ZippyBluebird','BreezyLamb','SunnyPopsicle','PastelFinch',
  'NuttyPanda','VintageKoala','JazzyPudding','ButteryPeacock','SnappySpool',
  'ShinyWindchime','NuttySloth','TenderLemonade','RainyFlamingo','BoldSweater',
  'VividLeaf','GooeySunflower','MerryKoala','SleekMug','SleekChick',
  'SnappyValley','TenderVase','ToastyGelato','MiniLatte','CheekyDumpling',
  'HumbleOtter','SnazzyTelescope','NiftyRaccoon','WobblyClover','CheekyLantern',
  'GlowingNoodle','ChipperBlanket','VintagePretzel','DapperFern','BoldGarden',
  'DewyMilkshake','TwinklyTurtle','SpeckledMoss','WhimsyKoala','RusticBrownie',
  'HumbleCrumpet','RetroMushroom','VividScone','CheeryFlamingo','ShinyDumpling',
  'DewySnowglobe','QuirkyChinchilla','FuzzyAlpaca','NuttyPatch','VelvetPetal',
  'SpunkySock','PerkyCookie','FeistyPuppy','PetiteAcorn','VintageSundae',
  'CheeryLilac','ChillMug','SnugglyRaindrop','DewyBagel','BlissfulClock',
  'CheekySnowglobe','PerkyPuppy','StellarToffee','DreamyJasmine','SunnySunbeam',
  'GooeyWoodpecker','FuzzyCroissant','GlowingKoala','WobblyPillow','BouncyTrifle',
  'PluckyValley','DewyGosling','SpicyBrook','SilverPinecone','MoonlitLlama',
  'ChipperCobbler','SweetLamb','VelvetOrchard','ChillPiglet','ChillBreeze',
  'SilkyBlossom','GroovyMeadow','BreezyGerbil','CozyBiscuit','JumboBlanket',
  'ChillPeacock','BreezyParfait','ChipperTulip','ZestyMitten','CuddlyGosling',
  'GiantStitch','SleekParfait','SleekKoala','FeistyCompass','CrispyStrudel',
  'GigglyMoss','PetiteRug','ChillDanish','CitrusPond','GigglySnowglobe',
  'RosyQuilt','SnazzySpool','NiftyYarn','WhimsyYarn','GoldenOtter',
  'ChipperBreeze','BerryChinchilla','GentleKettle','HappyClover','SunnyBlanket',
  'CheekyBadger','BoldTrifle','PlumpScarf','PerkyChai','BouncyPretzel',
  'SpeckledMeerkat','SpeckledBrook','SnappyPuppy','CheekyRaccoon','SilkySock',
  'DreamyDaisy','MellowGerbil','CosmicGrove','JazzyLemonade','TenderSnowflake',
  'CheekyPraline','ToastyWindchime','PlacidHamster','MerryWaffle','PerkyDuckling',
  'SunnyFern','BlissfulPond','ModernYarn','SleepySnowflake','GigglyAcorn',
  'BlissfulTrunk','NuttyPuppy','BlissfulSpool','SnappyLemur','GentleChest',
  'SpeckledLemur','CozyWombat','FruityCaramel','CloudyBadger','StellarNougat',
  'SnugglyCocoa','MellowJasmine','FrostyRaccoon','CitrusNougat','WobblyScone',
  'CozyPanda','MistySnowglobe','CloudyZipper','FeistyRainbow','CitrusJasmine',
  'GlowingPopsicle','VividBrook','HumbleLavender','CitrusHamster','SweetBlanket',
  'FrostyFritter','SnazzyVase','FreckledPiglet','WobblyChinchilla','NimbleJasmine',
  'RusticPeony','SnugglySunflower','MiniFox','SnazzyLamb','SpicyFinch',
  'FuzzyMacaron','ShinyHedgehog','FreckledCushion','HumbleBasket','FancyDolphin',
  'NiftyHamster','ButteryPraline','CitrusLeaf','CrunchyForest','NuttyLeaf',
  'SleekBluebird','MerryScarf','ToastyValley','JazzyBreeze','VelvetGosling',
  'ChipperOrchard','PlacidPeacock','SwiftStrudel','CurlyShelf','GentleHedgehog',
  'DewyNoodle','FreckledValley','JazzyGarden','MintySeal','GooeyRainbow',
  'CheeryRabbit','FancyCandle','ZippySorbet','PluckyAlpaca','VividRug',
  'FancyWren','DreamyClover','HumbleCupcake','CheekyPostcard','FuzzyCrumble',
  'SnazzyCompass','CurlyJasmine','BlissfulLemur','VividDolphin','MintyWombat',
  'PastelGerbil','GooeyPoppy','SnazzyToucan','TwinklyMuffin','TangyCrumpet',
  'CosmicChinchilla','GiantMuffin','WavyFox','SereneClock','QuirkyCushion',
  'RosySquirrel','ZestyFern','ZippyBreeze','CosmicPudding','ChewyTart',
  'HumblePoppy','NiftyMeerkat','BeamingSnowflake','JumboTulip','BouncyLatte',
  'GlowingPeony','CitrusCub','PluckyOtter','FancyFudge','CrunchyCloud',
  'RetroViolet','JollyBuckle','SunnyDaisy','GoldenLlama','GroovyCompass',
  'FrostyCandle','MintyRainbow','FluffyWaffle','CheeryMirror','SparklySlipper',
  'DapperCushion','BouncyOwl','CrispyCobbler','MistyLamp','SleepyHamster',
  'CheeryParfait','ZestyTeapot','NimbleTelescope','MellowRainbow','FancyMitten',
  'CozyChickadee','StarryButton','TwinklyCrumble','ZestySundae','CuddlyOwl',
  'FluffySquirrel','CozyPudding','TwinklyEnvelope','SunnyNoodle','WhimsyTulip',
  'SpunkyParfait','WavyGelato','TinyValley','ChillPinecone','MistyParfait',
  'MerryMarshmallow','SpunkyOwl','PlumpFerret','ButteryIris','ZestyEclair',
  'FuzzyLavender','SerenePond','VintageRabbit','RusticKoala','GlossyIris',
  'PeppyPretzel','SparklyMilkshake','ShinyLilac','ToastyBadger','JazzyTart',
  'FancyWaffle','JazzyPeacock','ButteryOtter','NiftyHedgehog','SunnyHummingbird',
  'MerryBlossom'
];

const lobbies = {};
const kickBans = {}; // socketId -> { lobbyCode -> expiry }

function generateCode(){
  const c='ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  return Array.from({length:5},()=>c[Math.floor(Math.random()*c.length)]).join('');
}

function createLobby(){
  const code=generateCode();
  lobbies[code]={code,players:{},seats:new Array(8).fill(null),votes:{},voteTimers:{},createdAt:Date.now(),
    fanOn:false, clockColor:'red', clockOffset:Math.floor(Math.random()*660)};
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

function randomName(lobby,usedAutoNames){
  // Avoid: (1) any name currently used by another active player in this
  // lobby, and (2) any name THIS SAME CONNECTION already received before,
  // even in a completely different lobby earlier in the session.
  const usedInLobby=lobby?new Set(Object.values(lobby.players).map(p=>p.name)):new Set();
  const usedHistory=usedAutoNames||new Set();
  let attempts=0,name;
  do{
    name=WORD_LIST[Math.floor(Math.random()*WORD_LIST.length)];
    attempts++;
  }while((usedInLobby.has(name)||usedHistory.has(name))&&attempts<150);
  return name;
}

// Reused by BOTH the chat filter and the username filter, so nobody can
// use a word in their name that they could not say in chat.
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
    'coonass','coony','sambo',
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

function sanitizeName(name,lobby,usedAutoNames){
  let n,wasAuto=false;
  if(!name||!name.trim()){ n=randomName(lobby,usedAutoNames); wasAuto=true; }
  else{
    n=name.trim().replace(/[<>&"']/g,'').substring(0,16);
    if(!n){ n=randomName(lobby,usedAutoNames); wasAuto=true; }
  }

  // A typed name containing a banned word is REJECTED, never silently
  // swapped — the player must see this and pick a different name.
  if(!wasAuto&&isBlocked(n)){ return {rejected:true}; }

  // Hard guarantee: no two active players in the SAME lobby ever end up
  // with an identical displayed name — covers auto-generated names AND
  // names someone typed by hand that happen to match another player.
  if(lobby){
    const used=new Set(Object.values(lobby.players).map(p=>p.name));
    if(used.has(n)){
      const base=n.substring(0,14);
      let suffix=2,candidate=n;
      while(used.has(candidate)&&suffix<100){
        candidate=base+suffix;
        suffix++;
      }
      n=candidate;
    }
  }

  // Remember this name for THIS connection only if it was auto-generated —
  // typed names are the player's own choice and shouldn't restrict them.
  if(wasAuto&&usedAutoNames) usedAutoNames.add(n);

  return {rejected:false,name:n};
}

function getLobbyState(lobby){
  return {
    code:lobby.code,
    players:Object.values(lobby.players).map(p=>({id:p.id,name:p.name,avatar:p.avatar,seat:p.seat})),
    count:Object.keys(lobby.players).length,
    fanOn:lobby.fanOn, clockColor:lobby.clockColor, clockOffset:lobby.clockOffset
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
  // Tracks every auto-generated name this specific connection has already
  // received, across however many lobbies they join/leave in this session —
  // so leaving the name blank repeatedly never hands back a name they had
  // before, even in a completely different lobby.
  const usedAutoNames=new Set();

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
    const nameResult=sanitizeName(name,lobby,usedAutoNames);
    if(nameResult.rejected){
      socket.emit('joinError',{message:'❌ Username contains inappropriate content — please choose a different username.'});
      return;
    }
    const cleanName=nameResult.name;
    // Already in a lobby? leave first silently
    if(curLobby&&curPlayer) doRemove(socket.id,curLobby,'left',true);

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

    if(isBlocked(msg)){
      // Private notice to sender only — nobody else in the lobby sees anything
      socket.emit('chatBlocked');
      return;
    }

    io.to(curLobby.code).emit('chat',{senderId:socket.id,senderName:curPlayer.name,message:msg});
  });

  socket.on('toggleFan',()=>{
    if(!curLobby)return;
    curLobby.fanOn=!curLobby.fanOn;
    io.to(curLobby.code).emit('fanState',{fanOn:curLobby.fanOn});
  });

  socket.on('toggleClockColor',({color})=>{
    if(!curLobby)return;
    if(color!=='red'&&color!=='green')return;
    if(curLobby.clockColor===color)return; // already that color, no-op
    curLobby.clockColor=color;
    io.to(curLobby.code).emit('clockColorState',{clockColor:color});
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
