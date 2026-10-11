class Sprite {
  constructor({
    position,
    velocity,
    image,
    frames = { max: 1, hold: 10 },
    sprites,
    animate = false,
    rotation = 0,
    scale = 1,
  }) {
    this.position = position;
    this.image = new Image();
    this.frames = { ...frames, val: 0, elapsed: 0 };
    this.scale = scale;
    this.image.onload = () => {
      this.width = (this.image.width / this.frames.max) * this.scale;
      this.height = this.image.height * this.scale;
    };
    this.image.src = image.src;

    this.animate = animate;
    this.sprites = sprites;
    this.opacity = 1;
    this.tint = null; // css color string e.g. 'rgba(255,0,0,0.5)', or null for no tint

    this.rotation = rotation;
  }

  draw() {
    c.save();
    c.translate(
      this.position.x + this.width / 2,
      this.position.y + this.height / 2
    );
    c.rotate(this.rotation);
    c.translate(
      -this.position.x - this.width / 2,
      -this.position.y - this.height / 2
    );
    c.globalAlpha = this.opacity;

    const fw = this.image.width / this.frames.max;
    const fh = this.image.height;

    if (this.tint) {
      // Draw frame to an offscreen canvas, apply tint, then stamp onto main canvas
      const off = document.createElement('canvas');
      off.width = fw;
      off.height = fh;
      const offCtx = off.getContext('2d');
      offCtx.drawImage(this.image, this.frames.val * fw, 0, fw, fh, 0, 0, fw, fh);
      offCtx.globalCompositeOperation = 'source-atop';
      offCtx.fillStyle = this.tint;
      offCtx.fillRect(0, 0, fw, fh);
      c.drawImage(off, this.position.x, this.position.y, fw * this.scale, fh * this.scale);
    } else {
      c.drawImage(
        this.image,
        this.frames.val * fw, 0, fw, fh,
        this.position.x, this.position.y, fw * this.scale, fh * this.scale
      );
    }

    c.restore();

    if (!this.animate) return;

    if (this.frames.max > 1) {
      this.frames.elapsed++;
    }

    if (this.frames.elapsed % this.frames.hold === 0) {
      if (this.frames.val < this.frames.max - 1) this.frames.val++;
      else this.frames.val = 0;
    }
  }
}

class Boundary {
  constructor({ position, width, height }) {
    this.position = position;
    this.width = width;
    this.height = height;
  }

  draw() {
    if (!DEBUG) return;

    c.fillStyle = "rgba(255, 0, 0, 0.3)";
    c.fillRect(this.position.x, this.position.y, this.width, this.height);
  }
}
