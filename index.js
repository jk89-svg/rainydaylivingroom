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
  --grad-c:#081C33;
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

body{font-family:'Nunito',sans-serif;background-color:var(--grad-b);background-image:linear-gradient(135deg,var(--grad-a) 25%,transparent 25%),linear-gradient(225deg,var(--grad-a) 25%,transparent 25%),linear-gradient(45deg,var(--grad-a) 25%,transparent 25%),linear-gradient(315deg,var(--grad-a) 25%,transparent 25%);background-position:44px 0,44px 0,0 0,0 0;background-size:88px 88px;background-repeat:repeat;min-height:100vh;display:flex;flex-direction:column;align-items:center;overflow-x:hidden;overflow-y:auto;}
body.game-active{overflow:hidden;}

/* ══ HOME ══ */
#homePage{display:flex;flex-direction:column;align-items:center;width:100%;min-height:100vh;padding:6px 8px 24px;overflow:visible;}
.logo{font-family:'Fredoka One',cursive;font-size:1.32rem;color:#fff;text-shadow:2px 2px 0 var(--accent-dark),4px 4px 6px rgba(0,0,0,.25);white-space:nowrap;}
.home-logo-img{display:block;height:auto;width:auto;max-height:48px;max-width:260px;margin-top:8px;cursor:pointer;}
/* In-game logo: sits above the player list, left-edge aligned to it via
   positionGameLogo() (JS) so it always lines up exactly regardless of
   viewport size/device — smaller than the home logo, tiny gaps on all
   sides, never touching the top of the screen. */
#gameLogo{position:fixed;left:0;top:0;height:26px;width:auto;z-index:210;cursor:pointer;display:none;}
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
/* Merged profile+play card: a bit narrower on both sides than the full
   column width, staying centered — width capped rather than 100%. */
.card-narrow{width:100%;max-width:270px;margin:0 auto;}

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
#rotateMsg{display:none;position:fixed;inset:0;z-index:9999;background-color:var(--grad-b);background-image:linear-gradient(135deg,var(--grad-a) 25%,transparent 25%),linear-gradient(225deg,var(--grad-a) 25%,transparent 25%),linear-gradient(45deg,var(--grad-a) 25%,transparent 25%),linear-gradient(315deg,var(--grad-a) 25%,transparent 25%);background-position:44px 0,44px 0,0 0,0 0;background-size:88px 88px;background-repeat:repeat;flex-direction:column;align-items:center;justify-content:center;text-align:center;padding:30px;}
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
  .col-left,.col-right{width:160px;}
  #playerPanel{width:128px;}#chatPanel{width:145px;}
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
  #playerPanel{width:105px;}#chatPanel{width:115px;}
  .p-name{font-size:.58rem;}
  .panel-title,.chat-title{font-size:.6rem;}
  .logo{font-size:.9rem;}
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
    <div class="logo"><img id="homeLogo" class="home-logo-img" onclick="location.reload()" title="Reload" alt="cozyroom.cv"></div>
    <div class="home-dm-wrap">
      <span class="dm-ing-lbl" style="color:rgba(255,255,255,.85);font-size:.55rem;font-weight:700;">☀</span>
      <label class="dm-switch"><input type="checkbox" id="dmToggleHome" onchange="toggleDark(this.checked)"><span class="dm-slider"></span></label>
      <span class="dm-ing-lbl" style="color:rgba(255,255,255,.85);font-size:.55rem;font-weight:700;">🌙</span>
    </div>
  </div>
  <div class="home-3col">

    <!-- LEFT: Rules -->
    <div class="home-col col-left">
      <div class="card" id="rulesCard" style="flex:1;overflow:hidden;">
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

    <!-- MIDDLE: Character + Play (merged into one card) -->
    <div class="home-col col-mid">
      <div class="card card-narrow" id="midCard">
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
            <!-- Right arrows: refresh sits right next to the top (skin) arrow -->
            <div style="display:flex;flex-direction:column;gap:4px;align-items:center;">
              <div style="display:flex;align-items:center;gap:5px;">
                <button class="feat-arrow" onclick="nextSkin()" title="Skin">▶</button>
                <button onclick="resetAvatar()" title="Randomize look" style="background:none;border:1.5px solid var(--border-soft);border-radius:5px;width:22px;height:22px;padding:0;font-size:.8rem;cursor:pointer;color:var(--text-main);display:flex;align-items:center;justify-content:center;flex-shrink:0;">🔄</button>
              </div>
              <button class="feat-arrow" onclick="next('eyes')" title="Eyes">▶</button>
              <button class="feat-arrow" onclick="next('mouth')" title="Mouth">▶</button>
              <button class="feat-arrow" onclick="next('hat')" title="Hat">▶</button>
            </div>
          </div>
          <!-- Labels below avatar (hidden via .feat-label, kept for future use) -->
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

    <!-- RIGHT: Lobbies -->
    <div class="home-col col-right">
      <div class="card" id="lobbiesCard" style="flex:1;display:flex;flex-direction:column;overflow:hidden;min-height:0;">
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
  <img id="gameLogo" onclick="location.reload()" title="Reload" alt="cozyroom.cv">
  <div id="playerPanel">
    <div class="panel-title">Players</div>
    <div id="playerList"></div>
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
//  LOGO — single shared image (transparent PNG), used both on the
//  home screen (bigger) and in-game above the player list (smaller).
//  Stored once here and applied to both <img> tags via JS so the
//  ~140KB image data isn't duplicated in the HTML markup.
// ═══════════════════════════════════════
const LOGO_SRC='data:image/png;base64,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';
(function(){
  const h=document.getElementById('homeLogo'); if(h)h.src=LOGO_SRC;
  const g=document.getElementById('gameLogo'); if(g)g.src=LOGO_SRC;
})();

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
  sizeHomeCards();
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
  positionGameLogo();
}
// Keeps the in-game logo's LEFT edge exactly aligned with the player list's
// left edge (never past it), with a tiny gap above the player list and a
// tiny gap below the top of the screen — recalculated every time sizeRoom()
// runs (resize/orientation change/entering the game), so it's always
// correct regardless of device or browser.
function positionGameLogo(){
  const logo=document.getElementById('gameLogo'),pp=document.getElementById('playerPanel');
  if(!logo||!pp||logo.style.display==='none')return;
  const r=pp.getBoundingClientRect();
  const GAP=6,logoH=logo.offsetHeight||26;
  logo.style.left=Math.round(r.left)+'px';
  logo.style.top=Math.max(GAP,Math.round(r.top-GAP-logoH))+'px';
}
// Home screen: forces the Rules and Lobbies cards to the SAME pixel height
// as the merged profile+play card (the natural/compact one), so their own
// content scrolls inside that fixed frame instead of the whole page
// growing/scrolling. Explicit pixel heights (not CSS percent/stretch) are
// used so this comes out identical on every browser, same technique as
// sizeRoom() above uses for the in-game panels.
function sizeHomeCards(){
  const hp=document.getElementById('homePage');
  if(!hp||hp.style.display==='none')return;
  const mid=document.getElementById('midCard'),rules=document.getElementById('rulesCard'),lob=document.getElementById('lobbiesCard');
  if(!mid||!rules||!lob)return;
  // Stacked-column layout (narrow screens): let each card size naturally.
  if(window.getComputedStyle(document.querySelector('.home-3col')).flexDirection==='column'){
    rules.style.height='';lob.style.height='';return;
  }
  const h=mid.offsetHeight;
  if(h>0){ rules.style.height=h+'px'; lob.style.height=h+'px'; }
}
window.addEventListener('resize',sizeHomeCards);
window.addEventListener('orientationchange',()=>setTimeout(sizeHomeCards,60));
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
  // Fully random look: skin, eyes, mouth, and accessory are each re-rolled
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
  const gl=document.getElementById('gameLogo');if(gl)gl.style.display='block';
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
  const gl=document.getElementById('gameLogo');if(gl)gl.style.display='none';
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
sizeHomeCards();
setTimeout(sizeHomeCards,120);
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
