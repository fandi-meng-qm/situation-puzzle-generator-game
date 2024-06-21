let t = 0;
var x;
var y;

function setup() {
  createCanvas(windowWidth, windowHeight);
  x = 0;
  y = 0;
}

function draw() {
//   background(220, 170, 250); // Set the background color
//   ellipse(mouseX, mouseY, 50, 50); // Draw a circle that follows the mouse cursor
  let n1 = noise(t);
  let n2 = noise(t + 1);
  let xInc = map(n1, 0, 1, 0, windowWidth);//  Use map() to customize the range of Perlin noise.
  let yInc = map(n2, 0, 1, 0, windowWidth);//  Use map() to customize the range of Perlin noise.

  x = xInc;
  y = yInc;

  ellipse(x, y, 50, 50);
  fill(255); // Set the fill color for the circle
  t += 0.01;// Move forward in time.
}