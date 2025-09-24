// Lightweight input abstraction used by creature systems
var Input = {
  keys: new Array(230).fill(false),
  mouse: { left: false, right: false, middle: false, x: 0, y: 0 }
};

// Event handlers (mouse + touch)
document.addEventListener('keydown', function (e) { Input.keys[e.keyCode] = true; });
document.addEventListener('keyup', function (e) { Input.keys[e.keyCode] = false; });

function onMouseDown(e) {
  if (e.button === 0) Input.mouse.left = true;
  if (e.button === 1) Input.mouse.middle = true;
  if (e.button === 2) Input.mouse.right = true;
}
function onMouseUp(e) {
  if (e.button === 0) Input.mouse.left = false;
  if (e.button === 1) Input.mouse.middle = false;
  if (e.button === 2) Input.mouse.right = false;
}
function onMouseMove(e) {
  Input.mouse.x = e.clientX;
  Input.mouse.y = e.clientY;
}
document.addEventListener('mousedown', onMouseDown);
document.addEventListener('mouseup', onMouseUp);
document.addEventListener('mousemove', onMouseMove);

// Touch support: map first touch to Input.mouse
function onTouch(e) {
  if (!e.touches || e.touches.length === 0) return;
  var t = e.touches[0];
  Input.mouse.x = t.clientX;
  Input.mouse.y = t.clientY;
}
document.addEventListener('touchstart', function (e) { onTouch(e); Input.mouse.left = true; e.preventDefault(); }, { passive: false });
document.addEventListener('touchmove', function (e) { onTouch(e); e.preventDefault(); }, { passive: false });
document.addEventListener('touchend', function (e) { Input.mouse.left = false; }, { passive: false });

// Setup canvas (use existing <canvas id="reptile-canvas"> if present)
var canvas = document.getElementById('reptile-canvas') || document.createElement('canvas');
if (!canvas.id) canvas.id = 'reptile-canvas';
if (!canvas.parentElement) document.body.appendChild(canvas);
canvas.style.position = 'absolute';
canvas.style.left = '0px';
canvas.style.top = '0px';
canvas.width = window.innerWidth;
canvas.height = window.innerHeight;
var ctx = canvas.getContext('2d');

// Responsive behavior
function resizeCanvas() {
  // keep critter approximately at same relative position if present
  var oldW = canvas.width, oldH = canvas.height;
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
  if (critter) {
    critter.x = canvas.width / 2;
    critter.y = canvas.height / 2;
  }
}
window.addEventListener('resize', resizeCanvas);
  //Necessary classes
  var segmentCount = 0;
  class Segment {
    constructor(parent, size, angle, range, stiffness) {
      segmentCount++;
      this.isSegment = true;
      this.parent = parent; //Segment which this one is connected to
      if (typeof parent.children == 'object') parent.children.push(this);
      this.children = [];
      this.size = size;
      this.relAngle = angle;
      this.defAngle = angle;
      this.absAngle = parent.absAngle + angle;
      this.range = range;
      this.stiffness = stiffness;
      this.updateRelative(false, true);
    }
    updateRelative(iter, flex) {
      this.relAngle = this.relAngle - 2 * Math.PI * Math.floor((this.relAngle - this.defAngle) / 2 / Math.PI + 1 / 2);
      if (flex) {
        this.relAngle = Math.min(this.defAngle + this.range / 2, Math.max(this.defAngle - this.range / 2, (this.relAngle - this.defAngle) / this.stiffness + this.defAngle));
      }
      this.absAngle = this.parent.absAngle + this.relAngle;
      this.x = this.parent.x + Math.cos(this.absAngle) * this.size;
      this.y = this.parent.y + Math.sin(this.absAngle) * this.size;
      if (iter) for (var i = 0; i < this.children.length; i++) this.children[i].updateRelative(iter, flex);
    }
    draw(iter) {
      ctx.beginPath();
      ctx.moveTo(this.parent.x, this.parent.y);
      ctx.lineTo(this.x, this.y);
      ctx.stroke();
      if (iter) for (var i = 0; i < this.children.length; i++) this.children[i].draw(true);
    }
    follow(iter) {
      var x = this.parent.x, y = this.parent.y;
      var dist = Math.sqrt((this.x - x) ** 2 + (this.y - y) ** 2) || 1;
      this.x = x + this.size * (this.x - x) / dist;
      this.y = y + this.size * (this.y - y) / dist;
      this.absAngle = Math.atan2(this.y - y, this.x - x);
      this.relAngle = this.absAngle - this.parent.absAngle;
      this.updateRelative(false, true);
      if (iter) for (var i = 0; i < this.children.length; i++) this.children[i].follow(true);
    }
  }

  class LimbSystem {
    constructor(end, length, speed, creature) {
      this.end = end; this.length = Math.max(1, length); this.creature = creature; this.speed = speed; creature.systems.push(this);
      this.nodes = [];
      var node = end;
      for (var i = 0; i < length; i++) {
        this.nodes.unshift(node);
        node = node.parent;
        if (!node.isSegment) { this.length = i + 1; break; }
      }
      this.hip = this.nodes[0].parent;
    }
    moveTo(x, y) {
      this.nodes[0].updateRelative(true, true);
      var dist = Math.sqrt((x - this.end.x) ** 2 + (y - this.end.y) ** 2);
      var len = Math.max(0, dist - this.speed);
      for (var i = this.nodes.length - 1; i >= 0; i--) {
        var node = this.nodes[i];
        var ang = Math.atan2(node.y - y, node.x - x);
        node.x = x + len * Math.cos(ang);
        node.y = y + len * Math.sin(ang);
        x = node.x; y = node.y; len = node.size;
      }
      for (var i = 0; i < this.nodes.length; i++) {
        var node = this.nodes[i];
        node.absAngle = Math.atan2(node.y - node.parent.y, node.x - node.parent.x);
        node.relAngle = node.absAngle - node.parent.absAngle;
        for (var ii = 0; ii < node.children.length; ii++) {
          var childNode = node.children[ii]; if (!this.nodes.includes(childNode)) childNode.updateRelative(true, false);
        }
      }
    }
    update() { this.moveTo(Input.mouse.x, Input.mouse.y); }
  }

  class LegSystem extends LimbSystem {
    constructor(end, length, speed, creature) {
      super(end, length, speed, creature);
      this.goalX = end.x; this.goalY = end.y; this.step = 0; this.forwardness = 0;
      this.reach = 0.9 * Math.sqrt((this.end.x - this.hip.x) ** 2 + (this.end.y - this.hip.y) ** 2);
      var relAngle = this.creature.absAngle - Math.atan2(this.end.y - this.hip.y, this.end.x - this.hip.x);
      relAngle -= 2 * Math.PI * Math.floor(relAngle / 2 / Math.PI + 1 / 2);
      this.swing = -relAngle + (2 * (relAngle < 0) - 1) * Math.PI / 2;
      this.swingOffset = this.creature.absAngle - this.hip.absAngle;
    }
    update(x, y) {
      this.moveTo(this.goalX, this.goalY);
      if (this.step == 0) {
        var dist = Math.sqrt((this.end.x - this.goalX) ** 2 + (this.end.y - this.goalY) ** 2);
        if (dist > 1) {
          this.step = 1;
          this.goalX = this.hip.x + this.reach * Math.cos(this.swing + this.hip.absAngle + this.swingOffset) + (2 * Math.random() - 1) * this.reach / 2;
          this.goalY = this.hip.y + this.reach * Math.sin(this.swing + this.hip.absAngle + this.swingOffset) + (2 * Math.random() - 1) * this.reach / 2;
        }
      } else if (this.step == 1) {
        var theta = Math.atan2(this.end.y - this.hip.y, this.end.x - this.hip.x) - this.hip.absAngle;
        var dist = Math.sqrt((this.end.x - this.hip.x) ** 2 + (this.end.y - this.hip.y) ** 2);
        var forwardness2 = dist * Math.cos(theta);
        var dF = this.forwardness - forwardness2; this.forwardness = forwardness2;
        if (dF * dF < 1) { this.step = 0; this.goalX = this.hip.x + (this.end.x - this.hip.x); this.goalY = this.hip.y + (this.end.y - this.hip.y); }
      }
    }
  }

  class Creature {
    constructor(x, y, angle, fAccel, fFric, fRes, fThresh, rAccel, rFric, rRes, rThresh) {
      this.x = x; this.y = y; this.absAngle = angle; this.fSpeed = 0; this.fAccel = fAccel; this.fFric = fFric; this.fRes = fRes; this.fThresh = fThresh; this.rSpeed = 0; this.rAccel = rAccel; this.rFric = rFric; this.rRes = rRes; this.rThresh = rThresh; this.children = []; this.systems = [];
    }
    follow(x, y) {
      var dist = Math.sqrt((this.x - x) ** 2 + (this.y - y) ** 2);
      var angle = Math.atan2(y - this.y, x - this.x);
      var accel = this.fAccel;
      if (this.systems.length > 0) { var sum = 0; for (var i = 0; i < this.systems.length; i++) sum += this.systems[i].step == 0; accel *= sum / this.systems.length; }
      this.fSpeed += accel * (dist > this.fThresh);
      this.fSpeed *= 1 - this.fRes; this.speed = Math.max(0, this.fSpeed - this.fFric);
      var dif = this.absAngle - angle; dif -= 2 * Math.PI * Math.floor(dif / (2 * Math.PI) + 1 / 2);
      if (Math.abs(dif) > this.rThresh && dist > this.fThresh) this.rSpeed -= this.rAccel * (2 * (dif > 0) - 1);
      this.rSpeed *= 1 - this.rRes;
      if (Math.abs(this.rSpeed) > this.rFric) this.rSpeed -= this.rFric * (2 * (this.rSpeed > 0) - 1); else this.rSpeed = 0;
      this.absAngle += this.rSpeed; this.absAngle -= 2 * Math.PI * Math.floor(this.absAngle / (2 * Math.PI) + 1 / 2);
      this.x += this.speed * Math.cos(this.absAngle); this.y += this.speed * Math.sin(this.absAngle);
      this.absAngle += Math.PI;
      for (var i = 0; i < this.children.length; i++) this.children[i].follow(true, true);
      for (var i = 0; i < this.systems.length; i++) this.systems[i].update(x, y);
      this.absAngle -= Math.PI; this.draw(true);
    }
    draw(iter) {
      var r = 4; ctx.beginPath(); ctx.arc(this.x, this.y, r, Math.PI / 4 + this.absAngle, 7 * Math.PI / 4 + this.absAngle);
      ctx.moveTo(this.x + r * Math.cos(7 * Math.PI / 4 + this.absAngle), this.y + r * Math.sin(7 * Math.PI / 4 + this.absAngle));
      ctx.lineTo(this.x + r * Math.cos(this.absAngle) * 2 ** 0.5, this.y + r * Math.sin(this.absAngle) * 2 ** 0.5);
      ctx.lineTo(this.x + r * Math.cos(Math.PI / 4 + this.absAngle), this.y + r * Math.sin(Math.PI / 4 + this.absAngle)); ctx.stroke();
      if (iter) for (var i = 0; i < this.children.length; i++) this.children[i].draw(true);
    }
  }

  // Rendering loop (single RAF-based loop instead of multiple setIntervals)
  var critter = null;
  function setupSimple() {
    var c = new Creature(canvas.width / 2, canvas.height / 2, 0, 12, 1, 0.5, 16, 0.5, 0.085, 0.5, 0.3);
    var node = c;
    for (var i = 0; i < 128; i++) node = new Segment(node, 8, 0, Math.PI / 2, 1);
    critter = c;
  }
  function setupTentacle() {
    critter = new Creature(canvas.width / 2, canvas.height / 2, 0, 12, 1, 0.5, 16, 0.5, 0.085, 0.5, 0.3);
    var node = critter; for (var i = 0; i < 32; i++) node = new Segment(node, 8, 0, 2, 1);
    var tentacle = new LimbSystem(node, 32, 8, critter);
  }
  function setupArm() {
    var c = new Creature(canvas.width / 2, canvas.height / 2, 0, 12, 1, 0.5, 16, 0.5, 0.085, 0.5, 0.3);
    var node = c; for (var i = 0; i < 3; i++) node = new Segment(node, 80, 0, Math.PI, 1);
    new LimbSystem(node, 3, c);
    critter = c;
  }
  function setupTestSquid(size, legs) {
    critter = new Creature(canvas.width / 2, canvas.height / 2, 0, size * 10, size * 3, 0.5, 16, 0.5, 0.085, 0.5, 0.3);
    var legNum = legs; var jointNum = 32;
    for (var i = 0; i < legNum; i++) {
      var node = critter; var ang = Math.PI / 2 * (i / (legNum - 1) - 0.5);
      for (var ii = 0; ii < jointNum; ii++) node = new Segment(node, size * 64 / jointNum, ang * (ii == 0), Math.PI, 1.2);
      new LegSystem(node, jointNum, size * 30, critter);
    }
  }
  function setupLizard(size, legs, tail) {
    var s = size; critter = new Creature(canvas.width / 2, canvas.height / 2, 0, s * 10, s * 2, 0.5, 16, 0.5, 0.085, 0.5, 0.3);
    var spinal = critter;
    for (var i = 0; i < 6; i++) {
      spinal = new Segment(spinal, s * 4, 0, 3.1415 * 2 / 3, 1.1);
      for (var ii = -1; ii <= 1; ii += 2) {
        var node = new Segment(spinal, s * 3, ii, 0.1, 2);
        for (var iii = 0; iii < 3; iii++) node = new Segment(node, s * 0.1, -ii * 0.1, 0.1, 2);
      }
    }
    for (var i = 0; i < legs; i++) {
      if (i > 0) {
        for (var ii = 0; ii < 6; ii++) {
          spinal = new Segment(spinal, s * 4, 0, 1.571, 1.5);
          for (var iii = -1; iii <= 1; iii += 2) {
            var node = new Segment(spinal, s * 3, iii * 1.571, 0.1, 1.5);
            for (var iv = 0; iv < 3; iv++) node = new Segment(node, s * 3, -iii * 0.3, 0.1, 2);
          }
        }
      }
      for (var ii = -1; ii <= 1; ii += 2) {
        var node = new Segment(spinal, s * 12, ii * 0.785, 0, 8);
        node = new Segment(node, s * 16, -ii * 0.785, 6.28, 1);
        node = new Segment(node, s * 16, ii * 1.571, 3.1415, 2);
        for (var iii = 0; iii < 4; iii++) new Segment(node, s * 4, (iii / 3 - 0.5) * 1.571, 0.1, 4);
        new LegSystem(node, 3, s * 12, critter, 4);
      }
    }
    for (var i = 0; i < tail; i++) {
      spinal = new Segment(spinal, s * 4, 0, 3.1415 * 2 / 3, 1.1);
      for (var ii = -1; ii <= 1; ii += 2) {
        var node = new Segment(spinal, s * 3, ii, 0.1, 2);
        for (var iii = 0; iii < 3; iii++) node = new Segment(node, s * 3 * (tail - i) / tail, -ii * 0.1, 0.1, 2);
      }
    }
  }

  canvas.style.backgroundColor = 'black'; ctx.strokeStyle = 'white';
  // Choose a starting creature (preserve original random lizard selection)
  var legNum = Math.floor(1 + Math.random() * 12);
  setupLizard(8 / Math.sqrt(legNum), legNum, Math.floor(4 + Math.random() * legNum * 8));

  // Wake lock reference
  var wakeLock = null;
  async function requestWakeLock() {
    try {
      if ('wakeLock' in navigator && !wakeLock) {
        wakeLock = await navigator.wakeLock.request('screen');
        wakeLock.addEventListener('release', () => { wakeLock = null; });
      }
    } catch (err) {
      // ignore
    }
  }
  document.addEventListener('visibilitychange', function () {
    if (document.hidden) { /* allow system to sleep */ }
    else requestWakeLock();
  });

  // Single RAF loop (start when user presses the overlay)
  var running = false;
  function loop() {
    if (!running) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    if (critter) critter.follow(Input.mouse.x, Input.mouse.y);
    requestAnimationFrame(loop);
  }

  // Start UI: show overlay prompting user to tap/click to start (needed for fullscreen/wakeLock)
  function createStartOverlay() {
    var overlay = document.createElement('div');
    overlay.id = 'start-overlay';
    overlay.style.position = 'fixed';
    overlay.style.left = '0';
    overlay.style.top = '0';
    overlay.style.width = '100%';
    overlay.style.height = '100%';
    overlay.style.display = 'flex';
    overlay.style.alignItems = 'center';
    overlay.style.justifyContent = 'center';
    overlay.style.zIndex = '9999';
    overlay.style.background = 'rgba(0,0,0,0.5)';
    overlay.style.color = 'white';
    overlay.style.fontFamily = 'sans-serif';
    overlay.style.fontSize = '20px';
    overlay.style.textAlign = 'center';
    overlay.innerHTML = '<div style="padding:20px">Tap or click to start the screensaver<br><small style="opacity:.8">Tap again or press Esc to exit fullscreen</small></div>';
    document.body.appendChild(overlay);
    function onStartGesture(e) {
      e.preventDefault();
      startScreensaver();
    }
    overlay.addEventListener('click', onStartGesture);
    overlay.addEventListener('touchstart', onStartGesture, { passive: false });
    // Auto-start on desktop (no touch) so opening in full-screen shows the animation
    // immediately. On touch devices we keep the user-gesture requirement for
    // fullscreen/wakeLock.
    if (!('ontouchstart' in window)) {
      setTimeout(function () {
        // remove overlay and start loop without requesting fullscreen/wakeLock
        var ov2 = document.getElementById('start-overlay');
        if (ov2) ov2.remove();
        running = true;
        requestAnimationFrame(loop);
      }, 250);
    }
  }

  async function startScreensaver() {
    // Attempt to go fullscreen using the canvas (must be user gesture)
    try {
      if (canvas.requestFullscreen) await canvas.requestFullscreen();
      else if (document.documentElement.requestFullscreen) await document.documentElement.requestFullscreen();
    } catch (err) {
      // ignore if fullscreen fails
    }
    // Request wake lock (works only after gesture)
    await requestWakeLock();
    // Remove overlay if present
    var ov = document.getElementById('start-overlay'); if (ov) ov.remove();
    running = true;
    requestAnimationFrame(loop);
  }

  // create overlay to wait for user action
  createStartOverlay();