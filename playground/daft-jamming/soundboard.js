(function () {
  var COUNT = 16;                 // 2 columns x 8 rows
  var BLOCKED_TOP = 8;            // version 3 blocks the top 8 buttons
  var ROW_COLORS = ["red", "violet", "blue", "cyan", "green", "yellow", "orange", "red"];

  // ===== EDIT ME =====================================================
  // One entry per button, in order: left to right, top to bottom (row 1 = the
  // first two). "name" is the label on the button, "file" is the mp3 it plays.
  // Put your mp3s in the audio folder and change the file paths below.
  // ===================================================================
  var SOUNDS = {
    1: [
      { name: "Work It", file: "audio/v1/workit.mp3" },
      { name: "Make It", file: "audio/v1/makeit.mp3" },
      { name: "Do It", file: "audio/v1/doit.mp3" },
      { name: "Makes Us", file: "audio/v1/makesus.mp3" },
      { name: "Harder", file: "audio/v1/harder.mp3" },
      { name: "Better", file: "audio/v1/better.mp3" },
      { name: "Faster", file: "audio/v1/faster.mp3" },
      { name: "Stronger", file: "audio/v1/stronger.mp3" },
      { name: "More Than", file: "audio/v1/morethan.mp3" },
      { name: "Hour", file: "audio/v1/hour.mp3" },
      { name: "Our", file: "audio/v1/our.mp3" },
      { name: "Never", file: "audio/v1/never.mp3" },
      { name: "Ever", file: "audio/v1/ever.mp3" },
      { name: "After", file: "audio/v1/after.mp3" },
      { name: "Work Is", file: "audio/v1/workis.mp3" },
      { name: "Over", file: "audio/v1/over.mp3" }
    ],
    2: [
      { name: "Sound 1", file: "audio/v2/01.mp3" },
      { name: "Sound 2", file: "audio/v2/02.mp3" },
      { name: "Sound 3", file: "audio/v2/03.mp3" },
      { name: "Sound 4", file: "audio/v2/04.mp3" },
      { name: "Sound 5", file: "audio/v2/05.mp3" },
      { name: "Sound 6", file: "audio/v2/06.mp3" },
      { name: "Sound 7", file: "audio/v2/07.mp3" },
      { name: "Sound 8", file: "audio/v2/08.mp3" },
      { name: "Sound 9", file: "audio/v2/09.mp3" },
      { name: "Sound 10", file: "audio/v2/10.mp3" },
      { name: "Sound 11", file: "audio/v2/11.mp3" },
      { name: "Sound 12", file: "audio/v2/12.mp3" },
      { name: "Sound 13", file: "audio/v2/13.mp3" },
      { name: "Sound 14", file: "audio/v2/14.mp3" },
      { name: "Sound 15", file: "audio/v2/15.mp3" },
      { name: "Sound 16", file: "audio/v2/16.mp3" }
    ],
    3: [
      { name: "Sound 1", file: "audio/v3/01.mp3" },
      { name: "Sound 2", file: "audio/v3/02.mp3" },
      { name: "Sound 3", file: "audio/v3/03.mp3" },
      { name: "Sound 4", file: "audio/v3/04.mp3" },
      { name: "Sound 5", file: "audio/v3/05.mp3" },
      { name: "Sound 6", file: "audio/v3/06.mp3" },
      { name: "Sound 7", file: "audio/v3/07.mp3" },
      { name: "Sound 8", file: "audio/v3/08.mp3" },
      { name: "Sound 9", file: "audio/v3/09.mp3" },
      { name: "Sound 10", file: "audio/v3/10.mp3" },
      { name: "Sound 11", file: "audio/v3/11.mp3" },
      { name: "Sound 12", file: "audio/v3/12.mp3" },
      { name: "Sound 13", file: "audio/v3/13.mp3" },
      { name: "Sound 14", file: "audio/v3/14.mp3" },
      { name: "Sound 15", file: "audio/v3/15.mp3" },
      { name: "Sound 16", file: "audio/v3/16.mp3" }
    ]
  };
  var BACKGROUND = "audio/background.mp3";

  var PLAY_ICON =
    '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" ' +
    'stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
    '<polygon points="6 4 20 12 6 20 6 4"/></svg>';

  var boardEl = document.getElementById("board");
  var versionBtns = Array.from(document.querySelectorAll("#versions .ver"));
  var bgBtn = document.getElementById("bgplay");
  var bgLabel = document.getElementById("bgplay-label");

  /* ---------- Build the 16 buttons (row-major: 2 per row) ---------- */
  var buttons = [];
  for (var i = 0; i < COUNT; i++) {
    var b = document.createElement("button");
    b.type = "button";
    b.className = "sb " + ROW_COLORS[Math.floor(i / 2)];
    b.innerHTML = PLAY_ICON + "<span></span>";
    b.addEventListener("click", press.bind(null, i));
    boardEl.appendChild(b);
    buttons.push(b);
  }

  /* ---------- Sounds ---------- */
  var version = 1;
  var cache = {};   // version -> array of Audio elements, created on first use

  function sounds(v) {
    if (!cache[v]) {
      cache[v] = SOUNDS[v].map(function (item, idx) {
        var a = new Audio(item.file);
        a.preload = "auto";
        a.addEventListener("ended", function () { buttons[idx].classList.remove("playing"); });
        return a;
      });
    }
    return cache[v];
  }

  function stopAll() {
    Object.keys(cache).forEach(function (v) {
      cache[v].forEach(function (a) { a.pause(); try { a.currentTime = 0; } catch (e) {} });
    });
    buttons.forEach(function (b) { b.classList.remove("playing"); });
  }

  function press(i) {
    var a = sounds(version)[i];
    try { a.currentTime = 0; } catch (e) {}
    buttons[i].classList.add("playing");
    var p = a.play();
    if (p && p.catch) {
      p.catch(function () { buttons[i].classList.remove("playing"); });
    }
  }

  /* ---------- Version selector ---------- */
  function setVersion(v) {
    stopAll();
    version = v;
    sounds(v);   // start loading this version's files
    versionBtns.forEach(function (btn) {
      btn.setAttribute("aria-pressed", String(Number(btn.dataset.version) === v));
    });
    buttons.forEach(function (b, idx) {
      b.disabled = v === 3 && idx < BLOCKED_TOP;
      b.querySelector("span").textContent = SOUNDS[v][idx].name;
    });
  }

  versionBtns.forEach(function (btn) {
    btn.addEventListener("click", function () { setVersion(Number(btn.dataset.version)); });
  });

  /* ---------- Background track ---------- */
  var bg = new Audio(BACKGROUND);
  bg.loop = true;
  bg.volume = 0.5;
  bg.preload = "none";

  function showBg(on) {
    bgBtn.setAttribute("aria-pressed", String(on));
    bgLabel.textContent = on ? "Pause background track" : "Play background track";
  }

  bgBtn.addEventListener("click", function () {
    if (bg.paused) {
      var p = bg.play();
      showBg(true);
      if (p && p.catch) p.catch(function () { showBg(false); });
    } else {
      bg.pause();
      showBg(false);
    }
  });

  setVersion(1);
})();
