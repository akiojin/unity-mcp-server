using System;
using System.IO;
using UnityEngine;
using UnityEditor;
using Newtonsoft.Json.Linq;

namespace UnityEditorMCP.Handlers
{
    /// <summary>
    /// Handles screenshot capture operations in Unity Editor
    /// </summary>
    public static class ScreenshotHandler
    {
        /// <summary>
        /// Captures a screenshot from the Unity Editor
        /// </summary>
        public static object CaptureScreenshot(JObject parameters)
        {
            try
            {
                // Parse parameters
                string outputPath = parameters["outputPath"]?.ToString();
                string captureMode = parameters["captureMode"]?.ToString() ?? "game"; // game, scene, or window
                int width = parameters["width"]?.ToObject<int>() ?? 0;
                int height = parameters["height"]?.ToObject<int>() ?? 0;
                bool includeUI = parameters["includeUI"]?.ToObject<bool>() ?? true;
                string windowName = parameters["windowName"]?.ToString();
                bool encodeAsBase64 = parameters["encodeAsBase64"]?.ToObject<bool>() ?? false;
                
                // Validate capture mode
                if (!IsValidCaptureMode(captureMode))
                {
                    return new { error = "Invalid capture mode. Must be 'game', 'scene', or 'window'" };
                }
                
                // Generate output path if not provided
                if (string.IsNullOrEmpty(outputPath))
                {
                    string timestamp = DateTime.Now.ToString("yyyy-MM-dd_HH-mm-ss");
                    outputPath = $"Assets/Screenshots/screenshot_{captureMode}_{timestamp}.png";
                }
                
                // Ensure directory exists
                string directory = Path.GetDirectoryName(outputPath);
                if (!AssetDatabase.IsValidFolder(directory))
                {
                    Directory.CreateDirectory(directory);
                    AssetDatabase.Refresh();
                }
                
                // Capture based on mode
                object result = null;
                switch (captureMode)
                {
                    case "game":
                        result = CaptureGameView(outputPath, width, height, includeUI, encodeAsBase64);
                        break;
                    case "scene":
                        result = CaptureSceneView(outputPath, width, height, encodeAsBase64);
                        break;
                    case "window":
                        result = CaptureEditorWindow(outputPath, windowName, encodeAsBase64);
                        break;
                }
                
                return result;
            }
            catch (Exception ex)
            {
                Debug.LogError($"[ScreenshotHandler] Error capturing screenshot: {ex.Message}");
                return new { error = $"Failed to capture screenshot: {ex.Message}" };
            }
        }
        
        /// <summary>
        /// Captures the Game View
        /// </summary>
        private static object CaptureGameView(string outputPath, int width, int height, bool includeUI, bool encodeAsBase64)
        {
            try
            {
                // Get the Game View
                var gameViewType = typeof(Editor).Assembly.GetType("UnityEditor.GameView");
                var gameView = EditorWindow.GetWindow(gameViewType, false);
                
                if (gameView == null)
                {
                    return new { error = "Game View not found. Please open the Game View window." };
                }
                
                // Focus the Game View
                gameView.Focus();
                
                // Get current resolution
                var currentResolution = GetGameViewResolution();
                
                // Determine capture resolution
                int captureWidth = width > 0 ? width : currentResolution.x;
                int captureHeight = height > 0 ? height : currentResolution.y;
                
                // Take screenshot using ScreenCapture
                string tempPath = Path.GetTempFileName() + ".png";
                ScreenCapture.CaptureScreenshot(tempPath);
                
                // Wait for file to be written
                System.Threading.Thread.Sleep(100);
                
                // Read and process the screenshot
                if (File.Exists(tempPath))
                {
                    byte[] imageBytes = File.ReadAllBytes(tempPath);
                    
                    // Save to final location
                    File.WriteAllBytes(outputPath, imageBytes);
                    File.Delete(tempPath);
                    
                    // Refresh asset database
                    AssetDatabase.Refresh();
                    
                    var result = new
                    {
                        success = true,
                        path = outputPath,
                        width = captureWidth,
                        height = captureHeight,
                        captureMode = "game",
                        includeUI = includeUI,
                        fileSize = imageBytes.Length,
                        message = "Game View screenshot captured successfully"
                    };
                    
                    // Add base64 if requested
                    if (encodeAsBase64)
                    {
                        return new
                        {
                            result.success,
                            result.path,
                            result.width,
                            result.height,
                            result.captureMode,
                            result.includeUI,
                            result.fileSize,
                            result.message,
                            base64Data = Convert.ToBase64String(imageBytes)
                        };
                    }
                    
                    return result;
                }
                else
                {
                    return new { error = "Failed to capture screenshot - file not created" };
                }
            }
            catch (Exception ex)
            {
                return new { error = $"Failed to capture Game View: {ex.Message}" };
            }
        }
        
        /// <summary>
        /// Captures the Scene View
        /// </summary>
        private static object CaptureSceneView(string outputPath, int width, int height, bool encodeAsBase64)
        {
            try
            {
                // Get the Scene View
                SceneView sceneView = SceneView.lastActiveSceneView;
                if (sceneView == null)
                {
                    return new { error = "Scene View not found. Please open a Scene View window." };
                }
                
                // Focus the Scene View
                sceneView.Focus();
                
                // Get Scene View camera
                Camera sceneCamera = sceneView.camera;
                if (sceneCamera == null)
                {
                    return new { error = "Scene View camera not available" };
                }
                
                // Determine capture resolution
                int captureWidth = width > 0 ? width : (int)sceneView.position.width;
                int captureHeight = height > 0 ? height : (int)sceneView.position.height;
                
                // Create render texture
                RenderTexture renderTexture = new RenderTexture(captureWidth, captureHeight, 24);
                sceneCamera.targetTexture = renderTexture;
                
                // Render the scene
                sceneCamera.Render();
                
                // Read pixels
                RenderTexture.active = renderTexture;
                Texture2D screenshot = new Texture2D(captureWidth, captureHeight, TextureFormat.RGB24, false);
                screenshot.ReadPixels(new Rect(0, 0, captureWidth, captureHeight), 0, 0);
                screenshot.Apply();
                
                // Reset camera and render texture
                sceneCamera.targetTexture = null;
                RenderTexture.active = null;
                UnityEngine.Object.DestroyImmediate(renderTexture);
                
                // Encode to PNG
                byte[] imageBytes = screenshot.EncodeToPNG();
                UnityEngine.Object.DestroyImmediate(screenshot);
                
                // Save to file
                File.WriteAllBytes(outputPath, imageBytes);
                AssetDatabase.Refresh();
                
                var result = new
                {
                    success = true,
                    path = outputPath,
                    width = captureWidth,
                    height = captureHeight,
                    captureMode = "scene",
                    fileSize = imageBytes.Length,
                    cameraPosition = new { x = sceneCamera.transform.position.x, y = sceneCamera.transform.position.y, z = sceneCamera.transform.position.z },
                    cameraRotation = new { x = sceneCamera.transform.eulerAngles.x, y = sceneCamera.transform.eulerAngles.y, z = sceneCamera.transform.eulerAngles.z },
                    message = "Scene View screenshot captured successfully"
                };
                
                // Add base64 if requested
                if (encodeAsBase64)
                {
                    return new
                    {
                        result.success,
                        result.path,
                        result.width,
                        result.height,
                        result.captureMode,
                        result.fileSize,
                        result.cameraPosition,
                        result.cameraRotation,
                        result.message,
                        base64Data = Convert.ToBase64String(imageBytes)
                    };
                }
                
                return result;
            }
            catch (Exception ex)
            {
                return new { error = $"Failed to capture Scene View: {ex.Message}" };
            }
        }
        
        /// <summary>
        /// Captures a specific Editor Window
        /// </summary>
        private static object CaptureEditorWindow(string outputPath, string windowName, bool encodeAsBase64)
        {
            try
            {
                if (string.IsNullOrEmpty(windowName))
                {
                    return new { error = "windowName is required for window capture mode" };
                }
                
                // Find the window
                EditorWindow targetWindow = null;
                var windows = Resources.FindObjectsOfTypeAll<EditorWindow>();
                
                foreach (var window in windows)
                {
                    if (window.titleContent.text.Contains(windowName, StringComparison.OrdinalIgnoreCase))
                    {
                        targetWindow = window;
                        break;
                    }
                }
                
                if (targetWindow == null)
                {
                    return new { error = $"Window '{windowName}' not found" };
                }
                
                // Focus the window
                targetWindow.Focus();
                
                // Get window dimensions
                int width = (int)targetWindow.position.width;
                int height = (int)targetWindow.position.height;
                
                // Note: Direct window capture is limited in Unity Editor
                // This is a placeholder for the approach
                return new
                {
                    success = false,
                    error = "Direct window capture is not fully supported. Use 'game' or 'scene' mode instead.",
                    note = "Window capture requires platform-specific implementation"
                };
            }
            catch (Exception ex)
            {
                return new { error = $"Failed to capture window: {ex.Message}" };
            }
        }
        
        /// <summary>
        /// Analyzes a screenshot for content
        /// </summary>
        public static object AnalyzeScreenshot(JObject parameters)
        {
            try
            {
                string imagePath = parameters["imagePath"]?.ToString();
                string analysisType = parameters["analysisType"]?.ToString() ?? "basic"; // basic, ui, content
                
                if (string.IsNullOrEmpty(imagePath))
                {
                    return new { error = "imagePath is required" };
                }
                
                if (!File.Exists(imagePath))
                {
                    return new { error = $"Image file not found: {imagePath}" };
                }
                
                // Load the image
                byte[] imageBytes = File.ReadAllBytes(imagePath);
                Texture2D texture = new Texture2D(2, 2);
                texture.LoadImage(imageBytes);
                
                var analysis = new
                {
                    success = true,
                    imagePath = imagePath,
                    width = texture.width,
                    height = texture.height,
                    format = texture.format.ToString(),
                    fileSize = imageBytes.Length,
                    analysisType = analysisType
                };
                
                // Basic analysis
                if (analysisType == "basic" || analysisType == "ui")
                {
                    // Analyze dominant colors
                    var dominantColors = AnalyzeDominantColors(texture);
                    
                    // Check for UI elements (simplified)
                    var uiAnalysis = AnalyzeUIElements(texture);
                    
                    UnityEngine.Object.DestroyImmediate(texture);
                    
                    return new
                    {
                        analysis.success,
                        analysis.imagePath,
                        analysis.width,
                        analysis.height,
                        analysis.format,
                        analysis.fileSize,
                        analysis.analysisType,
                        dominantColors = dominantColors,
                        uiElements = uiAnalysis,
                        message = "Screenshot analyzed successfully"
                    };
                }
                
                UnityEngine.Object.DestroyImmediate(texture);
                return analysis;
            }
            catch (Exception ex)
            {
                return new { error = $"Failed to analyze screenshot: {ex.Message}" };
            }
        }
        
        /// <summary>
        /// Gets the current Game View resolution
        /// </summary>
        private static Vector2Int GetGameViewResolution()
        {
            var gameViewType = typeof(Editor).Assembly.GetType("UnityEditor.GameView");
            var gameView = EditorWindow.GetWindow(gameViewType, false);
            
            if (gameView != null)
            {
                var prop = gameViewType.GetProperty("currentGameViewSize", 
                    System.Reflection.BindingFlags.NonPublic | System.Reflection.BindingFlags.Instance);
                if (prop != null)
                {
                    var size = prop.GetValue(gameView);
                    var widthProp = size.GetType().GetProperty("width");
                    var heightProp = size.GetType().GetProperty("height");
                    
                    if (widthProp != null && heightProp != null)
                    {
                        int width = (int)widthProp.GetValue(size);
                        int height = (int)heightProp.GetValue(size);
                        return new Vector2Int(width, height);
                    }
                }
            }
            
            // Default resolution
            return new Vector2Int(1920, 1080);
        }
        
        /// <summary>
        /// Analyzes dominant colors in the image
        /// </summary>
        private static object AnalyzeDominantColors(Texture2D texture)
        {
            // Sample pixels at intervals
            int sampleInterval = Mathf.Max(1, texture.width * texture.height / 1000);
            var colorCounts = new System.Collections.Generic.Dictionary<Color32, int>();
            
            for (int y = 0; y < texture.height; y += sampleInterval)
            {
                for (int x = 0; x < texture.width; x += sampleInterval)
                {
                    Color32 pixel = texture.GetPixel(x, y);
                    // Quantize colors
                    pixel.r = (byte)(pixel.r / 32 * 32);
                    pixel.g = (byte)(pixel.g / 32 * 32);
                    pixel.b = (byte)(pixel.b / 32 * 32);
                    
                    if (colorCounts.ContainsKey(pixel))
                        colorCounts[pixel]++;
                    else
                        colorCounts[pixel] = 1;
                }
            }
            
            // Get top colors
            var topColors = new System.Collections.Generic.List<object>();
            var sortedColors = new System.Collections.Generic.List<System.Collections.Generic.KeyValuePair<Color32, int>>(colorCounts);
            sortedColors.Sort((a, b) => b.Value.CompareTo(a.Value));
            
            for (int i = 0; i < Mathf.Min(5, sortedColors.Count); i++)
            {
                var color = sortedColors[i].Key;
                topColors.Add(new
                {
                    r = color.r,
                    g = color.g,
                    b = color.b,
                    hex = ColorUtility.ToHtmlStringRGB(color),
                    percentage = (sortedColors[i].Value * 100.0f) / (texture.width * texture.height / sampleInterval)
                });
            }
            
            return topColors;
        }
        
        /// <summary>
        /// Basic UI element detection
        /// </summary>
        private static object AnalyzeUIElements(Texture2D texture)
        {
            // This is a simplified UI detection
            // In a real implementation, you might use computer vision techniques
            
            var analysis = new
            {
                hasHighContrast = false,
                possibleButtons = 0,
                possibleText = 0,
                edgePixelRatio = 0.0f
            };
            
            // Simple edge detection to identify UI elements
            int edgePixels = 0;
            for (int y = 1; y < texture.height - 1; y++)
            {
                for (int x = 1; x < texture.width - 1; x++)
                {
                    Color current = texture.GetPixel(x, y);
                    Color right = texture.GetPixel(x + 1, y);
                    Color bottom = texture.GetPixel(x, y + 1);
                    
                    float diffRight = Mathf.Abs(current.grayscale - right.grayscale);
                    float diffBottom = Mathf.Abs(current.grayscale - bottom.grayscale);
                    
                    if (diffRight > 0.3f || diffBottom > 0.3f)
                    {
                        edgePixels++;
                    }
                }
            }
            
            return new
            {
                edgePixelRatio = (float)edgePixels / (texture.width * texture.height),
                analysis = "Basic UI analysis complete"
            };
        }
        
        /// <summary>
        /// Validates capture mode
        /// </summary>
        private static bool IsValidCaptureMode(string mode)
        {
            return mode == "game" || mode == "scene" || mode == "window";
        }
    }
}