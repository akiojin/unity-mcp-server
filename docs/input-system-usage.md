# Unity Input System Simulation Guide

Unity Editor MCP provides comprehensive Input System simulation capabilities, allowing AI assistants to programmatically control keyboard, mouse, gamepad, and touch inputs in Unity.

## Prerequisites

⚠️ **Important Requirements:**

1. **Unity Input System Package Installation**
   - Unity Input System package must be installed in your project
   - Install via Package Manager: Window → Package Manager → Unity Registry → Input System
   - Or add via manifest.json: `"com.unity.inputsystem": "1.7.0"` (or latest version)

2. **Player Settings Configuration**
   - Go to Edit → Project Settings → Player
   - Under "Configuration" → "Active Input Handling", select one of:
     - **"Input System Package (New)"** - For projects using only new Input System
     - **"Both"** - For projects using both legacy and new Input System
   - Unity will prompt to restart after changing this setting

3. **Editor Mode Only**
   - Input simulation features are only available in Unity Editor
   - Not available in built applications for security reasons
   - Features are conditionally compiled with `UNITY_EDITOR && ENABLE_INPUT_SYSTEM`

4. **Unity Version**
   - Unity 2020.3 LTS or newer recommended
   - Earlier versions may have limited Input System support

## Available Tools

### 1. Keyboard Simulation

#### `simulate_keyboard`

Simulates keyboard input with various actions.

**Actions:**
- `press` - Press a key down
- `release` - Release a key
- `type` - Type text automatically
- `combo` - Press multiple keys simultaneously

**Examples:**

```javascript
// Press and release a single key
{
  "action": "press",
  "key": "A"
}

// Type text
{
  "action": "type",
  "text": "Hello World",
  "typingSpeed": 50  // milliseconds per character
}

// Key combination (e.g., Ctrl+C)
{
  "action": "combo",
  "keys": ["LeftCtrl", "C"]
}
```

**Supported Keys:**
- Letters: `A`-`Z`
- Numbers: `Digit0`-`Digit9`
- Function keys: `F1`-`F12`
- Modifiers: `LeftShift`, `RightShift`, `LeftCtrl`, `RightCtrl`, `LeftAlt`, `RightAlt`
- Special: `Space`, `Enter`, `Tab`, `Escape`, `Backspace`, `Delete`
- Arrows: `UpArrow`, `DownArrow`, `LeftArrow`, `RightArrow`

### 2. Mouse Simulation

#### `simulate_mouse`

Simulates mouse movement and actions.

**Actions:**
- `move` - Move mouse to position
- `click` - Click mouse button
- `drag` - Drag from one position to another
- `scroll` - Scroll wheel

**Examples:**

```javascript
// Move mouse
{
  "action": "move",
  "x": 100,
  "y": 200,
  "absolute": true  // true for absolute position, false for relative
}

// Click
{
  "action": "click",
  "button": "left",  // "left", "right", or "middle"
  "clickCount": 2    // for double-click
}

// Drag
{
  "action": "drag",
  "startX": 100,
  "startY": 100,
  "endX": 300,
  "endY": 300,
  "button": "left"
}

// Scroll
{
  "action": "scroll",
  "deltaX": 0,
  "deltaY": 10  // positive for up, negative for down
}
```

### 3. Gamepad Simulation

#### `simulate_gamepad`

Simulates gamepad/controller input.

**Actions:**
- `button` - Press gamepad buttons
- `stick` - Control analog sticks
- `trigger` - Control triggers
- `dpad` - Control directional pad

**Examples:**

```javascript
// Button press
{
  "action": "button",
  "button": "a",  // or "cross" for PlayStation
  "buttonAction": "press"  // or "release"
}

// Analog stick
{
  "action": "stick",
  "stick": "left",  // or "right"
  "x": 0.5,  // -1 to 1
  "y": 0.75  // -1 to 1
}

// Trigger
{
  "action": "trigger",
  "trigger": "left",  // or "right"
  "value": 0.8  // 0 to 1
}

// D-Pad
{
  "action": "dpad",
  "direction": "up"  // "up", "down", "left", "right", "none"
}
```

**Supported Buttons:**
- Face buttons: `a`/`cross`, `b`/`circle`, `x`/`square`, `y`/`triangle`
- Shoulder: `leftshoulder`/`l1`, `rightshoulder`/`r1`
- Sticks: `leftstick`/`l3`, `rightstick`/`r3`
- Menu: `start`, `select`

### 4. Touch Simulation

#### `simulate_touch`

Simulates touch screen input.

**Actions:**
- `tap` - Single tap
- `swipe` - Swipe gesture
- `pinch` - Pinch gesture
- `multi` - Multiple simultaneous touches

**Examples:**

```javascript
// Tap
{
  "action": "tap",
  "x": 100,
  "y": 200,
  "touchId": 0
}

// Swipe
{
  "action": "swipe",
  "startX": 100,
  "startY": 100,
  "endX": 300,
  "endY": 100,
  "duration": 500,  // milliseconds
  "touchId": 0
}

// Pinch
{
  "action": "pinch",
  "centerX": 200,
  "centerY": 200,
  "startDistance": 50,
  "endDistance": 150
}

// Multi-touch
{
  "action": "multi",
  "touches": [
    {"x": 100, "y": 100, "phase": "began"},
    {"x": 200, "y": 200, "phase": "began"}
  ]
}
```

### 5. Complex Input Sequences

#### `input_system`

Create complex sequences of inputs.

**Example:**

```javascript
{
  "operation": "sequence",
  "parameters": {
    "sequence": [
      {
        "type": "keyboard",
        "params": {
          "action": "press",
          "key": "W"
        }
      },
      {
        "type": "mouse",
        "params": {
          "action": "move",
          "x": 100,
          "y": 100,
          "absolute": true
        }
      },
      {
        "type": "keyboard",
        "params": {
          "action": "release",
          "key": "W"
        }
      }
    ],
    "delayBetween": 100  // milliseconds between actions
  }
}
```

### 6. Get Input State

#### `get_current_input_state`

Get the current state of all input devices.

**Example Response:**

```javascript
{
  "simulationActive": true,
  "activeDevices": ["keyboard", "mouse", "gamepad", "touchscreen"],
  "keyboard": {
    "connected": true,
    "pressedKeys": ["W", "LeftShift"]
  },
  "mouse": {
    "connected": true,
    "position": {"x": 100, "y": 200},
    "leftButton": false,
    "rightButton": false,
    "middleButton": false,
    "scroll": {"x": 0, "y": 0}
  },
  "gamepad": {
    "connected": true,
    "buttons": {
      "a": false,
      "b": false,
      "x": false,
      "y": false
    },
    "sticks": {
      "left": {"x": 0, "y": 0},
      "right": {"x": 0, "y": 0}
    },
    "triggers": {
      "left": 0,
      "right": 0
    },
    "dpad": {"x": 0, "y": 0}
  },
  "touchscreen": {
    "connected": true,
    "activeTouches": []
  }
}
```

## Use Cases

### 1. Automated Testing

Test player controls and input handling:

```javascript
// Test movement controls
await simulate_keyboard({ action: "press", key: "W" });
await wait(1000);
await simulate_keyboard({ action: "release", key: "W" });

// Test camera control
await simulate_mouse({ 
  action: "drag", 
  startX: 100, 
  startY: 100,
  endX: 300,
  endY: 200,
  button: "right"
});
```

### 2. UI Testing

Test UI interactions programmatically:

```javascript
// Move to button and click
await simulate_mouse({ action: "move", x: 500, y: 300, absolute: true });
await simulate_mouse({ action: "click", button: "left" });

// Type in input field
await simulate_keyboard({ action: "type", text: "Player Name" });
```

### 3. Gameplay Demonstration

Create automated gameplay demonstrations:

```javascript
// Character movement pattern
const movementSequence = {
  operation: "sequence",
  parameters: {
    sequence: [
      { type: "keyboard", params: { action: "press", key: "W" }},
      { type: "keyboard", params: { action: "press", key: "LeftShift" }},  // Sprint
      { type: "mouse", params: { action: "move", x: 50, y: 0, absolute: false }},
      { type: "keyboard", params: { action: "release", key: "LeftShift" }},
      { type: "keyboard", params: { action: "release", key: "W" }}
    ],
    delayBetween: 500
  }
};
```

### 4. Controller Testing

Test gamepad support:

```javascript
// Test analog movement
await simulate_gamepad({
  action: "stick",
  stick: "left",
  x: 1.0,  // Full right
  y: 0.5   // Half up
});

// Test combat buttons
await simulate_gamepad({
  action: "button",
  button: "x",
  buttonAction: "press"
});
```

## Best Practices

1. **Release Keys**: Always release pressed keys to avoid stuck states
2. **Use Delays**: Add delays between actions for realistic input simulation
3. **Check State**: Use `get_current_input_state` to verify input state
4. **Absolute vs Relative**: Use absolute positioning for UI, relative for gameplay
5. **Clean Up**: Reset input state after tests

## Limitations

- Only works in Unity Editor (not in builds)
- Requires Unity Input System package
- Maximum 10 simultaneous touch points
- Some system keys may be restricted for safety

## Troubleshooting

### Input not working?

1. **Check Package Installation**
   - Open Package Manager (Window → Package Manager)
   - Switch to "Unity Registry" or "In Project"
   - Verify "Input System" package is installed
   - If not installed, click "Install"

2. **Verify Player Settings**
   - Go to Edit → Project Settings → Player
   - Under Configuration → Active Input Handling
   - Must be set to "Input System Package (New)" or "Both"
   - If set to "Input Manager (Old)", the features won't work
   - Restart Unity after changing this setting

3. **Check Compilation**
   - Look for compilation errors in Unity Console
   - If you see "CS0234: The type or namespace name 'InputSystem' does not exist"
     - This indicates the Input System package is not installed
   - Clear any existing compilation errors before testing

4. **Play Mode Requirements**
   - For gameplay testing, ensure Unity is in Play Mode
   - Some features may work in Edit Mode for UI testing

### Keys stuck?
- Use `get_current_input_state` to check which keys are pressed
- Manually release stuck keys with the `release` action

### Touch not registering?
- Ensure the platform supports touch simulation
- Check that touch IDs are within range (0-9)

## Security Notes

- Input simulation is restricted to Editor mode only
- System-critical key combinations are blocked
- All simulated inputs are logged for debugging