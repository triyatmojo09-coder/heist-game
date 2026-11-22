// Midnight Heist: keyboard and mouse state for one frame.
// One job: turn raw DOM events into the questions the game asks each tick.

export function createInput(canvas) {
  const down = new Set();
  const tapped = new Set();
  const clicks = [];
  let mouse = { x: 0, y: 0 };

  function keyName(event) {
    return event.key.length === 1 ? event.key.toLowerCase() : event.key.toLowerCase();
  }

  window.addEventListener('keydown', (event) => {
    const key = keyName(event);
    if (['arrowup', 'arrowdown', 'arrowleft', 'arrowright', ' '].includes(key)) {
      event.preventDefault();
    }
    if (!event.repeat) tapped.add(key);
    down.add(key);
  });
  window.addEventListener('keyup', (event) => {
    down.delete(keyName(event));
  });
  window.addEventListener('blur', () => {
    down.clear();
  });

  function pointer(event) {
    const rect = canvas.getBoundingClientRect();
    return {
      x: ((event.clientX - rect.left) / rect.width) * canvas.width,
      y: ((event.clientY - rect.top) / rect.height) * canvas.height,
    };
  }
  canvas.addEventListener('mousemove', (event) => {
    mouse = pointer(event);
  });
  canvas.addEventListener('mousedown', (event) => {
    mouse = pointer(event);
    clicks.push(mouse);
  });

  return {
    /** True while the key is held. Accepts 'w', 'shift', ' ' and friends. */
    isDown(key) {
      return down.has(key);
    },
    /** True once, on the frame the key was pressed. */
    wasTapped(key) {
      return tapped.has(key);
    },
    /** -1/0/1 movement axes from WASD or the arrow keys. */
    axes() {
      const x = (down.has('d') || down.has('arrowright') ? 1 : 0) - (down.has('a') || down.has('arrowleft') ? 1 : 0);
      const y = (down.has('s') || down.has('arrowdown') ? 1 : 0) - (down.has('w') || down.has('arrowup') ? 1 : 0);
      return { x, y };
    },
    sprint() {
      return down.has('shift');
    },
    interactHeld() {
      return down.has('e');
    },
    interactTapped() {
      return tapped.has('e') || tapped.has(' ');
    },
    jammerTapped() {
      return tapped.has('q');
    },
    cancelTapped() {
      return tapped.has('escape');
    },
    mouse() {
      return mouse;
    },
    takeClicks() {
      const taken = clicks.slice();
      clicks.length = 0;
      return taken;
    },
    /** Call at the end of every frame: taps live for exactly one frame. */
    endFrame() {
      tapped.clear();
    },
  };
}
