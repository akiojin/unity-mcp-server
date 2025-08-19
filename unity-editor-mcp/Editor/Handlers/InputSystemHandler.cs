#if UNITY_EDITOR && ENABLE_INPUT_SYSTEM
using System;
using System.Collections.Generic;
using System.Linq;
using UnityEngine;
using UnityEditor;
using Newtonsoft.Json.Linq;

// Conditionally include Input System namespaces only if available
// This prevents compilation errors when the package is not installed
#pragma warning disable CS0234 // Type or namespace does not exist
using UnityEngine.InputSystem;
using UnityEngine.InputSystem.LowLevel;
using UnityEngine.InputSystem.Controls;
#pragma warning restore CS0234

namespace UnityEditorMCP.Handlers
{
    /// <summary>
    /// Handles Input System simulation operations for LLM control
    /// </summary>
    public static class InputSystemHandler
    {
        private static Dictionary<string, InputDevice> activeDevices = new Dictionary<string, InputDevice>();
        private static List<InputEventPtr> queuedEvents = new List<InputEventPtr>();
        private static bool isSimulationActive = false;

        /// <summary>
        /// Simulates keyboard input
        /// </summary>
        public static object SimulateKeyboardInput(JObject parameters)
        {
            try
            {
                string action = parameters["action"]?.ToString(); // "press", "release", "type", "combo"
                
                if (string.IsNullOrEmpty(action))
                {
                    return new { error = "action is required (press, release, type, combo)" };
                }

                // Ensure keyboard device exists
                var keyboard = GetOrCreateDevice<Keyboard>("keyboard");
                
                switch (action.ToLower())
                {
                    case "press":
                        return SimulateKeyPress(keyboard, parameters);
                    
                    case "release":
                        return SimulateKeyRelease(keyboard, parameters);
                    
                    case "type":
                        return SimulateTextInput(keyboard, parameters);
                    
                    case "combo":
                        return SimulateKeyCombo(keyboard, parameters);
                    
                    default:
                        return new { error = $"Unknown action: {action}" };
                }
            }
            catch (Exception e)
            {
                Debug.LogError($"[InputSystemHandler] Error in SimulateKeyboardInput: {e.Message}");
                return new { error = $"Failed to simulate keyboard input: {e.Message}" };
            }
        }

        /// <summary>
        /// Simulates mouse input
        /// </summary>
        public static object SimulateMouseInput(JObject parameters)
        {
            try
            {
                string action = parameters["action"]?.ToString(); // "move", "click", "drag", "scroll"
                
                if (string.IsNullOrEmpty(action))
                {
                    return new { error = "action is required (move, click, drag, scroll)" };
                }

                // Ensure mouse device exists
                var mouse = GetOrCreateDevice<Mouse>("mouse");
                
                switch (action.ToLower())
                {
                    case "move":
                        return SimulateMouseMove(mouse, parameters);
                    
                    case "click":
                        return SimulateMouseClick(mouse, parameters);
                    
                    case "drag":
                        return SimulateMouseDrag(mouse, parameters);
                    
                    case "scroll":
                        return SimulateMouseScroll(mouse, parameters);
                    
                    default:
                        return new { error = $"Unknown action: {action}" };
                }
            }
            catch (Exception e)
            {
                Debug.LogError($"[InputSystemHandler] Error in SimulateMouseInput: {e.Message}");
                return new { error = $"Failed to simulate mouse input: {e.Message}" };
            }
        }

        /// <summary>
        /// Simulates gamepad input
        /// </summary>
        public static object SimulateGamepadInput(JObject parameters)
        {
            try
            {
                string action = parameters["action"]?.ToString(); // "button", "stick", "trigger", "dpad"
                
                if (string.IsNullOrEmpty(action))
                {
                    return new { error = "action is required (button, stick, trigger, dpad)" };
                }

                // Ensure gamepad device exists
                var gamepad = GetOrCreateDevice<Gamepad>("gamepad");
                
                switch (action.ToLower())
                {
                    case "button":
                        return SimulateGamepadButton(gamepad, parameters);
                    
                    case "stick":
                        return SimulateGamepadStick(gamepad, parameters);
                    
                    case "trigger":
                        return SimulateGamepadTrigger(gamepad, parameters);
                    
                    case "dpad":
                        return SimulateGamepadDPad(gamepad, parameters);
                    
                    default:
                        return new { error = $"Unknown action: {action}" };
                }
            }
            catch (Exception e)
            {
                Debug.LogError($"[InputSystemHandler] Error in SimulateGamepadInput: {e.Message}");
                return new { error = $"Failed to simulate gamepad input: {e.Message}" };
            }
        }

        /// <summary>
        /// Simulates touch input
        /// </summary>
        public static object SimulateTouchInput(JObject parameters)
        {
            try
            {
                string action = parameters["action"]?.ToString(); // "tap", "swipe", "pinch", "multi"
                
                if (string.IsNullOrEmpty(action))
                {
                    return new { error = "action is required (tap, swipe, pinch, multi)" };
                }

                // Ensure touchscreen device exists
                var touchscreen = GetOrCreateDevice<Touchscreen>("touchscreen");
                
                switch (action.ToLower())
                {
                    case "tap":
                        return SimulateTap(touchscreen, parameters);
                    
                    case "swipe":
                        return SimulateSwipe(touchscreen, parameters);
                    
                    case "pinch":
                        return SimulatePinch(touchscreen, parameters);
                    
                    case "multi":
                        return SimulateMultiTouch(touchscreen, parameters);
                    
                    default:
                        return new { error = $"Unknown action: {action}" };
                }
            }
            catch (Exception e)
            {
                Debug.LogError($"[InputSystemHandler] Error in SimulateTouchInput: {e.Message}");
                return new { error = $"Failed to simulate touch input: {e.Message}" };
            }
        }

        /// <summary>
        /// Creates a complex input sequence
        /// </summary>
        public static object CreateInputSequence(JObject parameters)
        {
            try
            {
                var sequence = parameters["sequence"]?.ToObject<JArray>();
                int delayBetween = parameters["delayBetween"]?.ToObject<int>() ?? 100;
                
                if (sequence == null || sequence.Count == 0)
                {
                    return new { error = "sequence is required and must not be empty" };
                }

                List<object> results = new List<object>();
                
                foreach (JObject step in sequence)
                {
                    string inputType = step["type"]?.ToString();
                    var inputParams = step["params"] as JObject;
                    
                    if (string.IsNullOrEmpty(inputType) || inputParams == null)
                    {
                        results.Add(new { error = "Invalid sequence step format" });
                        continue;
                    }
                    
                    object result = null;
                    switch (inputType.ToLower())
                    {
                        case "keyboard":
                            result = SimulateKeyboardInput(inputParams);
                            break;
                        case "mouse":
                            result = SimulateMouseInput(inputParams);
                            break;
                        case "gamepad":
                            result = SimulateGamepadInput(inputParams);
                            break;
                        case "touch":
                            result = SimulateTouchInput(inputParams);
                            break;
                        default:
                            result = new { error = $"Unknown input type: {inputType}" };
                            break;
                    }
                    
                    results.Add(result);
                    
                    // Add delay between actions
                    if (delayBetween > 0 && sequence.IndexOf(step) < sequence.Count - 1)
                    {
                        EditorApplication.delayCall += () => { /* Delay simulation */ };
                    }
                }
                
                return new
                {
                    success = true,
                    results = results,
                    totalSteps = sequence.Count
                };
            }
            catch (Exception e)
            {
                Debug.LogError($"[InputSystemHandler] Error in CreateInputSequence: {e.Message}");
                return new { error = $"Failed to create input sequence: {e.Message}" };
            }
        }

        /// <summary>
        /// Gets the current state of all input devices
        /// </summary>
        public static object GetCurrentInputState(JObject parameters)
        {
            try
            {
                var state = new
                {
                    simulationActive = isSimulationActive,
                    activeDevices = activeDevices.Keys.ToList(),
                    keyboard = GetKeyboardState(),
                    mouse = GetMouseState(),
                    gamepad = GetGamepadState(),
                    touchscreen = GetTouchscreenState()
                };
                
                return state;
            }
            catch (Exception e)
            {
                Debug.LogError($"[InputSystemHandler] Error in GetCurrentInputState: {e.Message}");
                return new { error = $"Failed to get input state: {e.Message}" };
            }
        }

        #region Helper Methods

        private static T GetOrCreateDevice<T>(string deviceName) where T : InputDevice
        {
            if (activeDevices.ContainsKey(deviceName))
            {
                return activeDevices[deviceName] as T;
            }
            
            var device = InputSystem.GetDevice<T>();
            if (device == null)
            {
                device = InputSystem.AddDevice<T>();
            }
            
            activeDevices[deviceName] = device;
            return device;
        }

        private static object SimulateKeyPress(Keyboard keyboard, JObject parameters)
        {
            string keyName = parameters["key"]?.ToString();
            if (string.IsNullOrEmpty(keyName))
            {
                return new { error = "key is required" };
            }
            
            // Handle single character keys (w, a, s, d) by converting to uppercase
            if (keyName.Length == 1)
            {
                keyName = keyName.ToUpper();
            }
            
            if (!Enum.TryParse<Key>(keyName, true, out Key key))
            {
                return new { error = $"Invalid key: {keyName}" };
            }
            
            Debug.Log($"[InputSystemHandler] Simulating key press: {keyName} (Play mode: {EditorApplication.isPlaying})");
            
            using (StateEvent.From(keyboard, out var eventPtr))
            {
                keyboard[key].WriteValueIntoEvent(1.0f, eventPtr);
                InputSystem.QueueEvent(eventPtr);
            }
            
            // Only force update in Edit mode; in Play mode, let Unity handle the update cycle
            if (!EditorApplication.isPlaying)
            {
                InputSystem.Update();
            }
            
            return new
            {
                success = true,
                action = "press",
                key = keyName,
                message = $"Key {keyName} pressed"
            };
        }

        private static object SimulateKeyRelease(Keyboard keyboard, JObject parameters)
        {
            string keyName = parameters["key"]?.ToString();
            if (string.IsNullOrEmpty(keyName))
            {
                return new { error = "key is required" };
            }
            
            // Handle single character keys (w, a, s, d) by converting to uppercase
            if (keyName.Length == 1)
            {
                keyName = keyName.ToUpper();
            }
            
            if (!Enum.TryParse<Key>(keyName, true, out Key key))
            {
                return new { error = $"Invalid key: {keyName}" };
            }
            
            Debug.Log($"[InputSystemHandler] Simulating key release: {keyName} (Play mode: {EditorApplication.isPlaying})");
            
            using (StateEvent.From(keyboard, out var eventPtr))
            {
                keyboard[key].WriteValueIntoEvent(0.0f, eventPtr);
                InputSystem.QueueEvent(eventPtr);
            }
            
            // Only force update in Edit mode; in Play mode, let Unity handle the update cycle
            if (!EditorApplication.isPlaying)
            {
                InputSystem.Update();
            }
            
            return new
            {
                success = true,
                action = "release",
                key = keyName,
                message = $"Key {keyName} released"
            };
        }

        private static object SimulateTextInput(Keyboard keyboard, JObject parameters)
        {
            string text = parameters["text"]?.ToString();
            if (string.IsNullOrEmpty(text))
            {
                return new { error = "text is required" };
            }
            
            int typingSpeed = parameters["typingSpeed"]?.ToObject<int>() ?? 50; // ms per character
            
            foreach (char c in text)
            {
                // Convert character to corresponding key
                Key key = CharToKey(c);
                if (key != Key.None)
                {
                    // Press key
                    using (StateEvent.From(keyboard, out var pressEvent))
                    {
                        keyboard[key].WriteValueIntoEvent(1.0f, pressEvent);
                        InputSystem.QueueEvent(pressEvent);
                    }
                    
                    // Release key
                    using (StateEvent.From(keyboard, out var releaseEvent))
                    {
                        keyboard[key].WriteValueIntoEvent(0.0f, releaseEvent);
                        InputSystem.QueueEvent(releaseEvent);
                    }
                }
            }
            
            InputSystem.Update();
            
            return new
            {
                success = true,
                action = "type",
                text = text,
                message = $"Typed: {text}"
            };
        }

        private static object SimulateKeyCombo(Keyboard keyboard, JObject parameters)
        {
            var keys = parameters["keys"]?.ToObject<string[]>();
            if (keys == null || keys.Length == 0)
            {
                return new { error = "keys array is required" };
            }
            
            // Press all keys
            foreach (string keyName in keys)
            {
                if (Enum.TryParse<Key>(keyName, true, out Key key))
                {
                    using (StateEvent.From(keyboard, out var eventPtr))
                    {
                        keyboard[key].WriteValueIntoEvent(1.0f, eventPtr);
                        InputSystem.QueueEvent(eventPtr);
                    }
                }
            }
            
            InputSystem.Update();
            
            // Release all keys in reverse order
            for (int i = keys.Length - 1; i >= 0; i--)
            {
                if (Enum.TryParse<Key>(keys[i], true, out Key key))
                {
                    using (StateEvent.From(keyboard, out var eventPtr))
                    {
                        keyboard[key].WriteValueIntoEvent(0.0f, eventPtr);
                        InputSystem.QueueEvent(eventPtr);
                    }
                }
            }
            
            InputSystem.Update();
            
            return new
            {
                success = true,
                action = "combo",
                keys = keys,
                message = $"Key combo: {string.Join("+", keys)}"
            };
        }

        private static object SimulateMouseMove(Mouse mouse, JObject parameters)
        {
            float x = parameters["x"]?.ToObject<float>() ?? 0;
            float y = parameters["y"]?.ToObject<float>() ?? 0;
            bool absolute = parameters["absolute"]?.ToObject<bool>() ?? true;
            
            Vector2 position = new Vector2(x, y);
            
            using (StateEvent.From(mouse, out var eventPtr))
            {
                if (absolute)
                {
                    mouse.position.WriteValueIntoEvent(position, eventPtr);
                }
                else
                {
                    mouse.delta.WriteValueIntoEvent(position, eventPtr);
                }
                InputSystem.QueueEvent(eventPtr);
            }
            
            InputSystem.Update();
            
            return new
            {
                success = true,
                action = "move",
                position = new { x, y },
                absolute = absolute,
                message = $"Mouse moved to ({x}, {y})"
            };
        }

        private static object SimulateMouseClick(Mouse mouse, JObject parameters)
        {
            string button = parameters["button"]?.ToString() ?? "left";
            int clickCount = parameters["clickCount"]?.ToObject<int>() ?? 1;
            
            MouseButton mouseButton;
            switch (button.ToLower())
            {
                case "left":
                    mouseButton = MouseButton.Left;
                    break;
                case "right":
                    mouseButton = MouseButton.Right;
                    break;
                case "middle":
                    mouseButton = MouseButton.Middle;
                    break;
                default:
                    return new { error = $"Invalid mouse button: {button}" };
            }
            
            for (int i = 0; i < clickCount; i++)
            {
                // Press
                using (StateEvent.From(mouse, out var pressEvent))
                {
                    mouse.leftButton.WriteValueIntoEvent(1.0f, pressEvent);
                    InputSystem.QueueEvent(pressEvent);
                }
                
                // Release
                using (StateEvent.From(mouse, out var releaseEvent))
                {
                    mouse.leftButton.WriteValueIntoEvent(0.0f, releaseEvent);
                    InputSystem.QueueEvent(releaseEvent);
                }
            }
            
            InputSystem.Update();
            
            return new
            {
                success = true,
                action = "click",
                button = button,
                clickCount = clickCount,
                message = $"Mouse {button} clicked {clickCount} time(s)"
            };
        }

        private static object SimulateMouseDrag(Mouse mouse, JObject parameters)
        {
            float startX = parameters["startX"]?.ToObject<float>() ?? 0;
            float startY = parameters["startY"]?.ToObject<float>() ?? 0;
            float endX = parameters["endX"]?.ToObject<float>() ?? 0;
            float endY = parameters["endY"]?.ToObject<float>() ?? 0;
            string button = parameters["button"]?.ToString() ?? "left";
            
            // Move to start position
            using (StateEvent.From(mouse, out var moveEvent))
            {
                mouse.position.WriteValueIntoEvent(new Vector2(startX, startY), moveEvent);
                InputSystem.QueueEvent(moveEvent);
            }
            
            // Press button
            using (StateEvent.From(mouse, out var pressEvent))
            {
                mouse.leftButton.WriteValueIntoEvent(1.0f, pressEvent);
                InputSystem.QueueEvent(pressEvent);
            }
            
            // Move to end position
            using (StateEvent.From(mouse, out var dragEvent))
            {
                mouse.position.WriteValueIntoEvent(new Vector2(endX, endY), dragEvent);
                InputSystem.QueueEvent(dragEvent);
            }
            
            // Release button
            using (StateEvent.From(mouse, out var releaseEvent))
            {
                mouse.leftButton.WriteValueIntoEvent(0.0f, releaseEvent);
                InputSystem.QueueEvent(releaseEvent);
            }
            
            InputSystem.Update();
            
            return new
            {
                success = true,
                action = "drag",
                start = new { x = startX, y = startY },
                end = new { x = endX, y = endY },
                button = button,
                message = $"Mouse dragged from ({startX}, {startY}) to ({endX}, {endY})"
            };
        }

        private static object SimulateMouseScroll(Mouse mouse, JObject parameters)
        {
            float deltaX = parameters["deltaX"]?.ToObject<float>() ?? 0;
            float deltaY = parameters["deltaY"]?.ToObject<float>() ?? 0;
            
            using (StateEvent.From(mouse, out var eventPtr))
            {
                mouse.scroll.WriteValueIntoEvent(new Vector2(deltaX, deltaY), eventPtr);
                InputSystem.QueueEvent(eventPtr);
            }
            
            InputSystem.Update();
            
            return new
            {
                success = true,
                action = "scroll",
                delta = new { x = deltaX, y = deltaY },
                message = $"Mouse scrolled by ({deltaX}, {deltaY})"
            };
        }

        private static object SimulateGamepadButton(Gamepad gamepad, JObject parameters)
        {
            string buttonName = parameters["button"]?.ToString();
            string action = parameters["buttonAction"]?.ToString() ?? "press";
            
            if (string.IsNullOrEmpty(buttonName))
            {
                return new { error = "button is required" };
            }
            
            ButtonControl button = GetGamepadButton(gamepad, buttonName);
            if (button == null)
            {
                return new { error = $"Invalid gamepad button: {buttonName}" };
            }
            
            float value = action == "release" ? 0.0f : 1.0f;
            
            using (StateEvent.From(gamepad, out var eventPtr))
            {
                button.WriteValueIntoEvent(value, eventPtr);
                InputSystem.QueueEvent(eventPtr);
            }
            
            InputSystem.Update();
            
            return new
            {
                success = true,
                action = action,
                button = buttonName,
                message = $"Gamepad button {buttonName} {action}d"
            };
        }

        private static object SimulateGamepadStick(Gamepad gamepad, JObject parameters)
        {
            string stick = parameters["stick"]?.ToString() ?? "left";
            float x = parameters["x"]?.ToObject<float>() ?? 0;
            float y = parameters["y"]?.ToObject<float>() ?? 0;
            
            Vector2 value = new Vector2(Mathf.Clamp(x, -1f, 1f), Mathf.Clamp(y, -1f, 1f));
            
            using (StateEvent.From(gamepad, out var eventPtr))
            {
                if (stick == "left")
                {
                    gamepad.leftStick.WriteValueIntoEvent(value, eventPtr);
                }
                else
                {
                    gamepad.rightStick.WriteValueIntoEvent(value, eventPtr);
                }
                InputSystem.QueueEvent(eventPtr);
            }
            
            InputSystem.Update();
            
            return new
            {
                success = true,
                action = "stick",
                stick = stick,
                value = new { x, y },
                message = $"Gamepad {stick} stick set to ({x}, {y})"
            };
        }

        private static object SimulateGamepadTrigger(Gamepad gamepad, JObject parameters)
        {
            string trigger = parameters["trigger"]?.ToString() ?? "left";
            float value = parameters["value"]?.ToObject<float>() ?? 0;
            
            value = Mathf.Clamp01(value);
            
            using (StateEvent.From(gamepad, out var eventPtr))
            {
                if (trigger == "left")
                {
                    gamepad.leftTrigger.WriteValueIntoEvent(value, eventPtr);
                }
                else
                {
                    gamepad.rightTrigger.WriteValueIntoEvent(value, eventPtr);
                }
                InputSystem.QueueEvent(eventPtr);
            }
            
            InputSystem.Update();
            
            return new
            {
                success = true,
                action = "trigger",
                trigger = trigger,
                value = value,
                message = $"Gamepad {trigger} trigger set to {value}"
            };
        }

        private static object SimulateGamepadDPad(Gamepad gamepad, JObject parameters)
        {
            string direction = parameters["direction"]?.ToString();
            
            if (string.IsNullOrEmpty(direction))
            {
                return new { error = "direction is required" };
            }
            
            Vector2 value = Vector2.zero;
            switch (direction.ToLower())
            {
                case "up":
                    value = Vector2.up;
                    break;
                case "down":
                    value = Vector2.down;
                    break;
                case "left":
                    value = Vector2.left;
                    break;
                case "right":
                    value = Vector2.right;
                    break;
                case "none":
                    value = Vector2.zero;
                    break;
                default:
                    return new { error = $"Invalid direction: {direction}" };
            }
            
            using (StateEvent.From(gamepad, out var eventPtr))
            {
                gamepad.dpad.WriteValueIntoEvent(value, eventPtr);
                InputSystem.QueueEvent(eventPtr);
            }
            
            InputSystem.Update();
            
            return new
            {
                success = true,
                action = "dpad",
                direction = direction,
                message = $"Gamepad D-Pad {direction}"
            };
        }

        private static object SimulateTap(Touchscreen touchscreen, JObject parameters)
        {
            float x = parameters["x"]?.ToObject<float>() ?? 0;
            float y = parameters["y"]?.ToObject<float>() ?? 0;
            int touchId = parameters["touchId"]?.ToObject<int>() ?? 0;
            
            var touch = touchscreen.touches[touchId];
            
            // Begin touch
            using (StateEvent.From(touchscreen, out var beginEvent))
            {
                touch.position.WriteValueIntoEvent(new Vector2(x, y), beginEvent);
                touch.phase.WriteValueIntoEvent(UnityEngine.InputSystem.TouchPhase.Began, beginEvent);
                // Note: isInProgress is automatically handled by the Input System based on phase
                InputSystem.QueueEvent(beginEvent);
            }
            
            // End touch
            using (StateEvent.From(touchscreen, out var endEvent))
            {
                touch.phase.WriteValueIntoEvent(UnityEngine.InputSystem.TouchPhase.Ended, endEvent);
                // Note: isInProgress is automatically handled by the Input System based on phase
                InputSystem.QueueEvent(endEvent);
            }
            
            InputSystem.Update();
            
            return new
            {
                success = true,
                action = "tap",
                position = new { x, y },
                touchId = touchId,
                message = $"Tap at ({x}, {y})"
            };
        }

        private static object SimulateSwipe(Touchscreen touchscreen, JObject parameters)
        {
            float startX = parameters["startX"]?.ToObject<float>() ?? 0;
            float startY = parameters["startY"]?.ToObject<float>() ?? 0;
            float endX = parameters["endX"]?.ToObject<float>() ?? 0;
            float endY = parameters["endY"]?.ToObject<float>() ?? 0;
            int duration = parameters["duration"]?.ToObject<int>() ?? 500;
            int touchId = parameters["touchId"]?.ToObject<int>() ?? 0;
            
            var touch = touchscreen.touches[touchId];
            
            // Begin touch
            using (StateEvent.From(touchscreen, out var beginEvent))
            {
                touch.position.WriteValueIntoEvent(new Vector2(startX, startY), beginEvent);
                touch.phase.WriteValueIntoEvent(UnityEngine.InputSystem.TouchPhase.Began, beginEvent);
                // Note: isInProgress is automatically handled by the Input System based on phase
                InputSystem.QueueEvent(beginEvent);
            }
            
            // Move touch
            using (StateEvent.From(touchscreen, out var moveEvent))
            {
                touch.position.WriteValueIntoEvent(new Vector2(endX, endY), moveEvent);
                touch.phase.WriteValueIntoEvent(UnityEngine.InputSystem.TouchPhase.Moved, moveEvent);
                InputSystem.QueueEvent(moveEvent);
            }
            
            // End touch
            using (StateEvent.From(touchscreen, out var endEvent))
            {
                touch.phase.WriteValueIntoEvent(UnityEngine.InputSystem.TouchPhase.Ended, endEvent);
                // Note: isInProgress is automatically handled by the Input System based on phase
                InputSystem.QueueEvent(endEvent);
            }
            
            InputSystem.Update();
            
            return new
            {
                success = true,
                action = "swipe",
                start = new { x = startX, y = startY },
                end = new { x = endX, y = endY },
                duration = duration,
                touchId = touchId,
                message = $"Swipe from ({startX}, {startY}) to ({endX}, {endY})"
            };
        }

        private static object SimulatePinch(Touchscreen touchscreen, JObject parameters)
        {
            float centerX = parameters["centerX"]?.ToObject<float>() ?? Screen.width / 2;
            float centerY = parameters["centerY"]?.ToObject<float>() ?? Screen.height / 2;
            float startDistance = parameters["startDistance"]?.ToObject<float>() ?? 100;
            float endDistance = parameters["endDistance"]?.ToObject<float>() ?? 200;
            
            // Simulate two-finger pinch
            var touch1 = touchscreen.touches[0];
            var touch2 = touchscreen.touches[1];
            
            // Calculate positions
            Vector2 center = new Vector2(centerX, centerY);
            Vector2 offset1Start = new Vector2(startDistance / 2, 0);
            Vector2 offset2Start = new Vector2(-startDistance / 2, 0);
            Vector2 offset1End = new Vector2(endDistance / 2, 0);
            Vector2 offset2End = new Vector2(-endDistance / 2, 0);
            
            // Begin touches
            using (StateEvent.From(touchscreen, out var beginEvent))
            {
                touch1.position.WriteValueIntoEvent(center + offset1Start, beginEvent);
                touch1.phase.WriteValueIntoEvent(UnityEngine.InputSystem.TouchPhase.Began, beginEvent);
                // Note: isInProgress is automatically handled by the Input System based on phase
                
                touch2.position.WriteValueIntoEvent(center + offset2Start, beginEvent);
                touch2.phase.WriteValueIntoEvent(UnityEngine.InputSystem.TouchPhase.Began, beginEvent);
                // Note: isInProgress is automatically handled by the Input System based on phase
                
                InputSystem.QueueEvent(beginEvent);
            }
            
            // Move touches
            using (StateEvent.From(touchscreen, out var moveEvent))
            {
                touch1.position.WriteValueIntoEvent(center + offset1End, moveEvent);
                touch1.phase.WriteValueIntoEvent(UnityEngine.InputSystem.TouchPhase.Moved, moveEvent);
                
                touch2.position.WriteValueIntoEvent(center + offset2End, moveEvent);
                touch2.phase.WriteValueIntoEvent(UnityEngine.InputSystem.TouchPhase.Moved, moveEvent);
                
                InputSystem.QueueEvent(moveEvent);
            }
            
            // End touches
            using (StateEvent.From(touchscreen, out var endEvent))
            {
                touch1.phase.WriteValueIntoEvent(UnityEngine.InputSystem.TouchPhase.Ended, endEvent);
                // Note: isInProgress is automatically handled by the Input System based on phase
                
                touch2.phase.WriteValueIntoEvent(UnityEngine.InputSystem.TouchPhase.Ended, endEvent);
                // Note: isInProgress is automatically handled by the Input System based on phase
                
                InputSystem.QueueEvent(endEvent);
            }
            
            InputSystem.Update();
            
            return new
            {
                success = true,
                action = "pinch",
                center = new { x = centerX, y = centerY },
                startDistance = startDistance,
                endDistance = endDistance,
                message = $"Pinch gesture from {startDistance} to {endDistance}"
            };
        }

        private static object SimulateMultiTouch(Touchscreen touchscreen, JObject parameters)
        {
            var touches = parameters["touches"]?.ToObject<JArray>();
            
            if (touches == null || touches.Count == 0)
            {
                return new { error = "touches array is required" };
            }
            
            List<object> results = new List<object>();
            
            for (int i = 0; i < touches.Count && i < touchscreen.touches.Count; i++)
            {
                var touchData = touches[i] as JObject;
                if (touchData != null)
                {
                    float x = touchData["x"]?.ToObject<float>() ?? 0;
                    float y = touchData["y"]?.ToObject<float>() ?? 0;
                    string phase = touchData["phase"]?.ToString() ?? "tap";
                    
                    var touch = touchscreen.touches[i];
                    
                    using (StateEvent.From(touchscreen, out var eventPtr))
                    {
                        touch.position.WriteValueIntoEvent(new Vector2(x, y), eventPtr);
                        
                        UnityEngine.InputSystem.TouchPhase touchPhase;
                        switch (phase.ToLower())
                        {
                            case "began":
                                touchPhase = UnityEngine.InputSystem.TouchPhase.Began;
                                // Note: isInProgress is automatically handled by the Input System based on phase
                                break;
                            case "moved":
                                touchPhase = UnityEngine.InputSystem.TouchPhase.Moved;
                                break;
                            case "ended":
                                touchPhase = UnityEngine.InputSystem.TouchPhase.Ended;
                                // Note: isInProgress is automatically handled by the Input System based on phase
                                break;
                            default:
                                touchPhase = UnityEngine.InputSystem.TouchPhase.Stationary;
                                break;
                        }
                        
                        touch.phase.WriteValueIntoEvent(touchPhase, eventPtr);
                        InputSystem.QueueEvent(eventPtr);
                    }
                    
                    results.Add(new
                    {
                        touchId = i,
                        position = new { x, y },
                        phase = phase
                    });
                }
            }
            
            InputSystem.Update();
            
            return new
            {
                success = true,
                action = "multi",
                touches = results,
                message = $"Multi-touch with {results.Count} touches"
            };
        }

        private static Key CharToKey(char c)
        {
            // Simple character to key mapping
            if (char.IsLetter(c))
            {
                string keyName = char.ToUpper(c).ToString();
                if (Enum.TryParse<Key>(keyName, out Key key))
                {
                    return key;
                }
            }
            else if (char.IsDigit(c))
            {
                string keyName = "Digit" + c;
                if (Enum.TryParse<Key>(keyName, out Key key))
                {
                    return key;
                }
            }
            else
            {
                switch (c)
                {
                    case ' ':
                        return Key.Space;
                    case '.':
                        return Key.Period;
                    case ',':
                        return Key.Comma;
                    case ';':
                        return Key.Semicolon;
                    case '/':
                        return Key.Slash;
                    case '\\':
                        return Key.Backslash;
                    case '-':
                        return Key.Minus;
                    case '=':
                        return Key.Equals;
                    case '\n':
                        return Key.Enter;
                    case '\t':
                        return Key.Tab;
                }
            }
            
            return Key.None;
        }

        private static ButtonControl GetGamepadButton(Gamepad gamepad, string buttonName)
        {
            switch (buttonName.ToLower())
            {
                case "a":
                case "cross":
                    return gamepad.buttonSouth;
                case "b":
                case "circle":
                    return gamepad.buttonEast;
                case "x":
                case "square":
                    return gamepad.buttonWest;
                case "y":
                case "triangle":
                    return gamepad.buttonNorth;
                case "start":
                    return gamepad.startButton;
                case "select":
                    return gamepad.selectButton;
                case "leftshoulder":
                case "l1":
                    return gamepad.leftShoulder;
                case "rightshoulder":
                case "r1":
                    return gamepad.rightShoulder;
                case "leftstick":
                case "l3":
                    return gamepad.leftStickButton;
                case "rightstick":
                case "r3":
                    return gamepad.rightStickButton;
                default:
                    return null;
            }
        }

        private static object GetKeyboardState()
        {
            var keyboard = InputSystem.GetDevice<Keyboard>();
            if (keyboard == null)
            {
                return null;
            }
            
            var pressedKeys = new List<string>();
            foreach (Key key in Enum.GetValues(typeof(Key)))
            {
                if (key != Key.None && keyboard[key].isPressed)
                {
                    pressedKeys.Add(key.ToString());
                }
            }
            
            return new
            {
                connected = true,
                pressedKeys = pressedKeys
            };
        }

        private static object GetMouseState()
        {
            var mouse = InputSystem.GetDevice<Mouse>();
            if (mouse == null)
            {
                return null;
            }
            
            return new
            {
                connected = true,
                position = new { x = mouse.position.x.ReadValue(), y = mouse.position.y.ReadValue() },
                leftButton = mouse.leftButton.isPressed,
                rightButton = mouse.rightButton.isPressed,
                middleButton = mouse.middleButton.isPressed,
                scroll = new { x = mouse.scroll.x.ReadValue(), y = mouse.scroll.y.ReadValue() }
            };
        }

        private static object GetGamepadState()
        {
            var gamepad = InputSystem.GetDevice<Gamepad>();
            if (gamepad == null)
            {
                return null;
            }
            
            return new
            {
                connected = true,
                buttons = new
                {
                    a = gamepad.buttonSouth.isPressed,
                    b = gamepad.buttonEast.isPressed,
                    x = gamepad.buttonWest.isPressed,
                    y = gamepad.buttonNorth.isPressed,
                    start = gamepad.startButton.isPressed,
                    select = gamepad.selectButton.isPressed,
                    leftShoulder = gamepad.leftShoulder.isPressed,
                    rightShoulder = gamepad.rightShoulder.isPressed,
                    leftStick = gamepad.leftStickButton.isPressed,
                    rightStick = gamepad.rightStickButton.isPressed
                },
                sticks = new
                {
                    left = new { x = gamepad.leftStick.x.ReadValue(), y = gamepad.leftStick.y.ReadValue() },
                    right = new { x = gamepad.rightStick.x.ReadValue(), y = gamepad.rightStick.y.ReadValue() }
                },
                triggers = new
                {
                    left = gamepad.leftTrigger.ReadValue(),
                    right = gamepad.rightTrigger.ReadValue()
                },
                dpad = new { x = gamepad.dpad.x.ReadValue(), y = gamepad.dpad.y.ReadValue() }
            };
        }

        private static object GetTouchscreenState()
        {
            var touchscreen = InputSystem.GetDevice<Touchscreen>();
            if (touchscreen == null)
            {
                return null;
            }
            
            var activeTouches = new List<object>();
            for (int i = 0; i < touchscreen.touches.Count; i++)
            {
                var touch = touchscreen.touches[i];
                // Check if touch is active based on phase (Began, Moved, or Stationary)
                var currentPhase = touch.phase.ReadValue();
                if (currentPhase != UnityEngine.InputSystem.TouchPhase.None && 
                    currentPhase != UnityEngine.InputSystem.TouchPhase.Ended &&
                    currentPhase != UnityEngine.InputSystem.TouchPhase.Canceled)
                {
                    activeTouches.Add(new
                    {
                        id = i,
                        position = new { x = touch.position.x.ReadValue(), y = touch.position.y.ReadValue() },
                        phase = touch.phase.ReadValue().ToString()
                    });
                }
            }
            
            return new
            {
                connected = true,
                activeTouches = activeTouches
            };
        }

        #endregion
    }
}
#endif