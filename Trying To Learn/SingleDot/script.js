// Canvas setup
var canvas = document.createElement("canvas");
document.body.appendChild(canvas);
canvas.width = window.innerWidth;
canvas.height = window.innerHeight;
var ctx = canvas.getContext("2d");

// Mouse tracking
var mouse = {x: 0, y: 0};
document.addEventListener("mousemove", function(e) {
    mouse.x = e.clientX;
    mouse.y = e.clientY;
});

// Simple creature
var creature = {x: 400, y: 300};

function animate() {
    // Clear screen
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Move toward mouse (very simply)
    creature.x += (mouse.x - creature.x) * 0.1;
    creature.y += (mouse.y - creature.y) * 0.1;
    
    // Draw creature
    ctx.beginPath();
    ctx.arc(creature.x, creature.y, 10, 0, Math.PI * 2);
    ctx.fill();
    
    requestAnimationFrame(animate);
}
animate();