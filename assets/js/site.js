(function () {
  // ---- Clock (only runs on pages that have #clock) ----
  var clock = document.getElementById("clock");
  function updateTime() {
    clock.textContent = new Date().toLocaleTimeString("en-US", {
      timeZone: "America/Chicago",
      hour: "numeric",
      minute: "2-digit",
      second: "2-digit",
      timeZoneName: "short"
    });
  }
  if (clock) {
    updateTime();
    setInterval(updateTime, 1000);
  }

  // ---- Intro animation ----
  // [data-animate]: split text into words that reveal in chunks (links wrap too).
  // [data-reveal]:  reveal the whole element at once (e.g. a card).
  // [data-unit]:    inside a [data-animate] block, animate as one piece (e.g. the clock).
  var WORDS_PER_CHUNK = 4;   // words that appear together
  var chunk = 0;             // current chunk number (drives the delay)
  var count = 0;             // words already placed in the current chunk

  // Start a fresh chunk (used at the start of each block and for whole-block reveals)
  function newChunk() {
    if (count > 0) { chunk++; count = 0; }
  }
  // Chunk number for the next word/unit
  function nextIndex() {
    if (count >= WORDS_PER_CHUNK) { chunk++; count = 0; }
    count++;
    return chunk;
  }

  function wrap(node) {
    Array.from(node.childNodes).forEach(function (child) {
      if (child.nodeType === Node.TEXT_NODE) {
        var parts = child.textContent.split(/(\s+)/);
        var frag = document.createDocumentFragment();
        parts.forEach(function (part) {
          if (!part) return;
          if (/^\s+$/.test(part)) {
            frag.appendChild(document.createTextNode(" "));
          } else {
            var span = document.createElement("span");
            span.className = "w";
            span.style.setProperty("--i", nextIndex());
            span.textContent = part;
            frag.appendChild(span);
          }
        });
        child.replaceWith(frag);
      } else if (child.nodeType === Node.ELEMENT_NODE && child.tagName !== "BR") {
        if (child.hasAttribute("data-unit")) {
          child.classList.add("w");
          child.style.setProperty("--i", nextIndex());
        } else {
          wrap(child);
        }
      }
    });
  }

  document.querySelectorAll("[data-animate], [data-reveal]").forEach(function (el) {
    newChunk();
    if (el.hasAttribute("data-animate")) {
      wrap(el);
    } else {
      el.classList.add("r");
      el.style.setProperty("--i", chunk);
      chunk++;
    }
  });
})();
