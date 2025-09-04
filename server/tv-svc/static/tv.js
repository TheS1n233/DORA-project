// English comments only
(() => {
  const $ = (s) => document.querySelector(s);
  const cards = $("#cards");
  const wsState = $("#wsState");
  const wsCount = $("#wsCount");
  const btnConnect = $("#btnConnect");
  const btnVoice = $("#btnVoice");
  const btnSendIntent = $("#btnSendIntent");
  const inputToken = $("#token");
  const inputIntent = $("#intentText");

  // Co-watch elements
  const inputRoom = $("#room");
  const btnJoin = $("#btnJoin");
  const inputMediaUrl = $("#mediaUrl");
  const btnLoad = $("#btnLoad");
  const btnPlay = $("#btnPlay");
  const btnPause = $("#btnPause");
  const btnSync = $("#btnSync");
  const video = $("#player");
  // call overlay elements
  const callOverlay = $("#callOverlay");
  const btnAnswer = $("#btnAnswer");
  const btnHang = $("#btnHang");
  const callIframeWrap = $("#callIframeWrap");

  // Force hidden on first paint even if CSS cache misses
  try {
    if (callOverlay) callOverlay.style.display = "none";
    if (callIframeWrap) callIframeWrap.classList.add("hidden");
  } catch (_) {}

  // TTS elements
  const btnSpeak = $("#btnSpeak");
  const btnAutoTts = $("#btnAutoTts");

  // Local storage keys
  const LS = {
    room: "tv_room",
    url: "tv_url",
    token: "tv_token",
    auto: "tv_auto_tts"
  };

  let ws = null;
  let wsRoom = null;
  let connected = false;
  let lastSay = "";
  let autoTts = false;

  // version flag for hard refresh checks
  window.tvVersion = "tts-1.3";

  function addCard(title, body, badgeText, badgeClass) {
    const el = document.createElement("div");
    el.className = "card";
    el.innerHTML = `
      <div class="title">${title}<span class="badge ${badgeClass || ""}">${badgeText || ""}</span></div>
      <div class="body"><pre style="white-space:pre-wrap;margin:0">${body}</pre></div>
    `;
    cards.prepend(el);
  }

  function setWsState(ok) {
    connected = ok;
    wsState.textContent = ok ? "WS: connected" : "WS: disconnected";
  }

  // --- TTS helpers ---
  function setAutoBtn() {
    if (btnAutoTts) btnAutoTts.textContent = `Auto TTS: ${autoTts ? "ON" : "OFF"}`;
  }
  function speak(text) {
    if (!("speechSynthesis" in window)) {
      addCard("TTS", "speechSynthesis not supported", "ERR", "err");
      return;
    }
    if (!text) {
      addCard("TTS", "no text", "INFO", "warn");
      return;
    }
    try {
      window.speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(text);
      u.lang = "en-US";
      u.rate = 1.0;
      u.pitch = 1.0;
      window.speechSynthesis.speak(u);
      addCard("TTS", text, "SAY", "ok");
    } catch (e) {
      addCard("TTS", "failed: " + e.message, "ERR", "err");
    }
  }
  function remember(k, v) { try { localStorage.setItem(k, v); } catch {} }
  function recall(k, d="") { try { return localStorage.getItem(k) ?? d; } catch { return d; } }

  // Prefill from storage and init auto TTS
  (function initFromStorage(){
    inputToken.value = recall(LS.token, "");
    inputRoom.value = recall(LS.room, "");
    inputMediaUrl.value = recall(LS.url, "");
    autoTts = recall(LS.auto, "0") === "1";
    setAutoBtn();
    if (inputRoom.value) {
      setTimeout(() => joinRoom(), 0);
      setTimeout(() => { try { sendCowatch({action:"state?"}); } catch {} }, 400);
    }
  })();

  function connect() {
    if (ws) try { ws.close(); } catch {}
    const tk = encodeURIComponent(inputToken.value || "");
    const url = `${location.protocol === "https:" ? "wss" : "ws"}://${location.host}/ws${tk ? `?token=${tk}` : ""}`;
    ws = new WebSocket(url);
    ws.onopen = () => {
      setWsState(true);
      remember(LS.token, inputToken.value || "");
    };
    ws.onclose = () => setWsState(false);
    ws.onerror = () => setWsState(false);

    ws.onmessage = (ev) => {
      try {
        const msg = JSON.parse(ev.data);
        if (msg.type === "hello") return;

        if (msg.type === "mqtt") {
          let badge = "ok", title = msg.topic;
          if (msg.topic.startsWith("hazard/")) badge = "warn";
          if (msg.topic === "fall/detected") badge = "err";
          addCard(title, JSON.stringify(msg.payload, null, 2), badge.toUpperCase(), badge);

          let say = "";
          try {
            if (msg.topic.startsWith("hazard/")) {
              const kind = msg.topic.split("/")[1] || "hazard";
              const { level, source } = msg.payload || {};
              say = `Warning, ${kind}. Level ${level || ""} ${source ? "from " + source : ""}`;
            } else if (msg.topic === "vitals/ingest" && msg.payload) {
              const { metric, value, unit } = msg.payload;
              say = `${metric || "metric"} ${value ?? ""} ${unit || ""}`;
            } else if (msg.topic === "fall/detected" && msg.payload) {
              say = msg.payload.fall ? "Fall detected" : "No fall detected";
            }
          } catch {}
          if (!say) say = `${msg.topic} ${JSON.stringify(msg.payload || {})}`;
          lastSay = say;
          if (autoTts) speak(lastSay);

        } else if (msg.type === "intent" || msg.type === "stt") {
          // Show INTENT card with more context
          const body = {
            text: msg.text || (msg.payload && msg.payload.text) || "",
            action: msg.action || (msg.payload && msg.payload.action) || "",
            room: msg.room || (msg.payload && msg.payload.room) || ""
          };
          addCard("INTENT", JSON.stringify(body, null, 2), "INTENT", "ok");
          lastSay = body.text ? `Intent ${body.text}` : (body.action ? `Intent ${body.action}` : "Intent");
          if (autoTts) speak(lastSay);

        } else if (msg.type === "cowatch") {
          // Passive display if backend also broadcasts cowatch to global channel
          const body = {
            action: (msg.payload && msg.payload.action) || msg.action || "",
            text: (msg.payload && msg.payload.text) || msg.text || "",
            room: msg.room || (msg.payload && msg.payload.room) || ""
          };
          addCard("COWATCH", JSON.stringify(body, null, 2), "INFO", "ok");

        } else if (msg.type === "client") {
          addCard("CLIENT", JSON.stringify(msg.payload, null, 2), "ECHO", "ok");
        }
      } catch (e) {
        console.error(e);
      }
    };
  }
  btnConnect && btnConnect.addEventListener("click", connect);

  btnSendIntent && btnSendIntent.addEventListener("click", async () => {
    const text = (inputIntent.value || "").trim();
    if (!text) return;
    try {
      const r = await fetch("/api/intent", {
        method: "POST", headers: {"Content-Type":"application/json"},
        body: JSON.stringify({text})
      });
      if (!r.ok) throw new Error(r.statusText);
      addCard("INTENT", text, "INTENT", "ok");
      lastSay = `Intent ${text}`;
      if (autoTts) speak(lastSay);
      inputIntent.value = "";
    } catch (e) {
      addCard("INTENT", "failed: " + e.message, "ERR", "err");
    }
  });

  // Very basic VUI using Web Speech API
  btnVoice && btnVoice.addEventListener("click", async () => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) {
      addCard("VOICE", "Web Speech API not available. Type text and click 'Send Intent'.", "INFO", "warn");
      return;
    }
    const recog = new SR();
    recog.lang = "en-US";
    recog.interimResults = false;
    recog.maxAlternatives = 1;
    recog.onresult = async (ev) => {
      const text = ev.results[0][0].transcript || "";
      addCard("VOICE", `heard: ${text}`, "VOICE", "ok");
      try {
        await fetch("/api/intent", {
          method: "POST", headers: {"Content-Type":"application/json"},
          body: JSON.stringify({text})
        });
      } catch (e) {
        addCard("VOICE", "intent failed: " + e.message, "ERR", "err");
      }
    };
    recog.onerror = (e) => addCard("VOICE", "error: " + e.error, "ERR", "err");
    recog.start();
  });

    // --- Call helpers ---
  let inCall = false;
  let lastCallUrl = null;       // keep url from 'call' payload (if any)
  let ringTimer = null;         // auto-cancel timer when ringing
  const RING_TIMEOUT_MS = 2000000; // 20s timeout for unanswered calls

  // allow override via querystring (?ring=5000&meet=https://meet.jit.si/dora-${room}) or localStorage
  (function bootstrapRingAndMeet() {
    try {
      const qs = new URLSearchParams(location.search);
      const r = qs.get("ring");
      const m = qs.get("meet");
      const savedR = localStorage.getItem("ring_timeout");
      const savedM = localStorage.getItem("meet_tpl");

      if (r && !Number.isNaN(parseInt(r, 10))) {
        RING_TIMEOUT_MS = parseInt(r, 10);
        localStorage.setItem("ring_timeout", String(RING_TIMEOUT_MS));
      } else if (savedR && !Number.isNaN(parseInt(savedR, 10))) {
        RING_TIMEOUT_MS = parseInt(savedR, 10);
      }

      if (m && m.length > 0) {
        localStorage.setItem("meet_tpl", m);
      } else if (!savedM) {
        localStorage.setItem("meet_tpl", "https://meet.jit.si/dora-${room}");
      }
    } catch (_) {}
  })();

  function _defaultMeetUrl() {
    const room = (inputRoom && inputRoom.value || "demo").trim() || "demo";
    try {
      const tpl = localStorage.getItem("meet_tpl");
      if (tpl && tpl.length > 0) {
        // replace ${room} token if present
        return tpl.replace("${room}", encodeURIComponent(room));
      }
    } catch (_) {}
    return `https://meet.jit.si/dora-${encodeURIComponent(room)}`;
  }


  function showRing() {
    try { callIframeWrap && callIframeWrap.classList.add("hidden"); } catch {}
    try {
      if (callOverlay) {
        callOverlay.classList.remove("hidden");
        callOverlay.style.display = "flex"; // hard override for first paint
      }
    } catch {}
    // start ring timeout
    try {
      if (ringTimer) clearTimeout(ringTimer);
      ringTimer = setTimeout(() => {
        endCall(); // auto-cancel ringing if no answer within timeout
      }, RING_TIMEOUT_MS);
    } catch {}
  }

  function startCall(url) {
    const src = url || _defaultMeetUrl();
    try {
      if (callIframeWrap) {
        callIframeWrap.innerHTML = `<iframe src="${src}" allow="camera; microphone; display-capture; autoplay" style="width:100%;height:100%;border:0"></iframe>`;
        callIframeWrap.classList.remove("hidden");
      }
      if (callOverlay) {
        callOverlay.classList.remove("hidden");
        callOverlay.style.display = "flex"; // hard override
      }
    } catch {}
    inCall = true;
  }
  
  function endCall() {
    try { if (callIframeWrap) callIframeWrap.innerHTML = ""; } catch {}
    try {
      if (callOverlay) {
        callOverlay.classList.add("hidden");
        callOverlay.style.display = "none"; // hard override
      }
    } catch {}
    try { if (ringTimer) { clearTimeout(ringTimer); ringTimer = null; } } catch {}
    inCall = false;
    lastCallUrl = null;
  }

    // --- Co-watch helpers ---
  function inRoom() {
    return wsRoom && wsRoom.readyState === WebSocket.OPEN;
  }

  function sendCowatch(payload) {
    if (!inRoom()) {
      addCard("COWATCH", "not in room", "ERR", "err");
      return;
    }
    try { wsRoom.send(JSON.stringify(payload)); } catch {}
  }

  function safePosition() {
    if (Number.isFinite(video.currentTime) && video.currentTime > 0.1) {
      return Number(video.currentTime.toFixed(3));
    }
    return undefined;
  }

  async function tryPlay() {
    try { await video.play(); } catch (_) {}
  }

  // --- Co-watch room logic ---
  function joinRoom() {
    if (wsRoom) try { wsRoom.close(); } catch {}
    const room = (inputRoom.value || "").trim();
    if (!room) { addCard("ROOM", "room required", "ERR", "err"); return; }
    const tk = encodeURIComponent(inputToken.value || "");
    const url = `${location.protocol === "https:" ? "wss" : "ws"}://${location.host}/ws/room?room=${encodeURIComponent(room)}${tk ? `&token=${tk}` : ""}`;
    wsRoom = new WebSocket(url);
    wsRoom.onopen = () => {
      addCard("ROOM", `joined: ${room}`, "OK", "ok");
      remember(LS.room, room);
      // ask for state
      sendCowatch({action:"state?"});
    };
    wsRoom.onclose = () => addCard("ROOM", `left: ${room}`, "INFO", "warn");
    wsRoom.onerror = () => addCard("ROOM", `error on: ${room}`, "ERR", "err");

    wsRoom.onmessage = async (ev) => {
      try {
        const msg = JSON.parse(ev.data);
        if (msg.type === "hello-room") return;

        if (msg.type === "cowatch") {
          const p = (msg && msg.payload && typeof msg.payload === "object") ? msg.payload : msg;

          addCard("COWATCH", JSON.stringify(p, null, 2), "SYNC", "ok");

          // --- call signaling (with optional URL) ---
          if (p.action === "call") { 
            lastCallUrl = p.url || null; 
            showRing(); 
            return; 
          }
          if (p.action === "answer") { 
            startCall(p.url || lastCallUrl); 
            return; 
          }
          if (p.action === "hang") { 
            endCall(); 
            return; 
          }

          // --- state sync (unchanged) ---
          if (p.action === "state?") {
            if (video.src && video.src.length > 0) {
              sendCowatch({
                action: "state",
                url: video.currentSrc || video.src,
                play: !video.paused,
                position: safePosition()
              });
            }
            return;
          }

          if (typeof p.url === "string" && p.url) {
            const abs = new URL(p.url, location.origin).href;
            if (video.src !== abs) {
              video.src = p.url;
              video.load();
              remember(LS.url, p.url);
            }
          }

          if (typeof p.position === "number" && Number.isFinite(p.position)) {
            const dt = Math.abs((video.currentTime || 0) - p.position);
            if (!isNaN(p.position) && dt > 0.5) {
              try { video.currentTime = p.position; } catch {}
            }
          }

          if (typeof p.play === "boolean") {
            if (p.play && video.paused) await tryPlay();
            if (!p.play && !video.paused) video.pause();
          }
        }
      } catch (e) {
        console.error(e);
      }
    };
  }
  btnJoin && btnJoin.addEventListener("click", joinRoom);

  btnLoad && btnLoad.addEventListener("click", () => {
    const url = (inputMediaUrl.value || "").trim();
    if (!url) { addCard("MEDIA", "empty url", "ERR", "err"); return; }
    video.src = url;
    video.load();
    remember(LS.url, url);
    sendCowatch({action:"load", url});
    addCard("MEDIA", `loaded: ${url}`, "OK", "ok");
  });

  btnPlay && btnPlay.addEventListener("click", async () => {
    await tryPlay();
    const pos = safePosition();
    const payload = {action:"play", play:true};
    if (pos !== undefined) payload.position = pos;
    sendCowatch(payload);
  });

  btnPause && btnPause.addEventListener("click", () => {
    video.pause();
    const pos = safePosition();
    const payload = {action:"pause", play:false};
    if (pos !== undefined) payload.position = pos;
    sendCowatch(payload);
  });

  btnSync && btnSync.addEventListener("click", () => {
    const pos = safePosition();
    const payload = {action:"state", play: !video.paused};
    if (pos !== undefined) payload.position = pos;
    if (video.src && video.src.length > 0) payload.url = video.currentSrc || video.src;
    sendCowatch(payload);
  });
  // bind call overlay buttons
  btnAnswer && btnAnswer.addEventListener("click", () => {
    startCall(lastCallUrl);                 // use url from 'call' if provided
    sendCowatch({action: "answer", url: lastCallUrl}); // sync to peers
  });

  btnHang && btnHang.addEventListener("click", () => {
    endCall();
    sendCowatch({action: "hang"});
  });
  
  // TTS buttons
  window.toggleAutoTts = () => {
    autoTts = !autoTts;
    remember(LS.auto, autoTts ? "1" : "0");
    setAutoBtn();
    try { addCard("TTS", `auto ${autoTts ? "ON" : "OFF"}`, "AUTO", autoTts ? "ok" : "warn"); } catch (_) {}
    try { console.log("[tv] autoTts =", autoTts); } catch (_) {}
  };
  btnSpeak && btnSpeak.addEventListener("click", () => speak(lastSay));
  btnAutoTts && btnAutoTts.addEventListener("click", window.toggleAutoTts);

  document.addEventListener("click", (ev) => {
    const t = ev.target;
    if (t && t.id === "btnAutoTts") {
      try { window.toggleAutoTts(); } catch (_) {}
    }
  }, true);

  document.addEventListener("keydown", (e) => {
    if (e.key === "Enter") btnSendIntent && btnSendIntent.click();
    if (e.key === " ") { e.preventDefault(); btnVoice && btnVoice.click(); }
  });
})();
