﻿using System;
using System.Collections.Generic;
using System.Net;
using System.Net.Sockets;
using System.Text;
using System.Threading;
using System.Threading.Tasks;
using UnityEditor;
using UnityEditor.SceneManagement;
using UnityEngine;
using UnityMCPServer.Models;
using UnityMCPServer.Helpers;
using UnityMCPServer.Logging;
using UnityMCPServer.Handlers;
using Newtonsoft.Json;
using Newtonsoft.Json.Linq;
using System.IO;
using System.Linq;

namespace UnityMCPServer.Core
{
    /// <summary>
    /// Main Unity Editor MCP class that handles TCP communication and command processing
    /// </summary>
    [InitializeOnLoad]
    public static class UnityMCPServer
    {
        private static TcpListener tcpListener;
        private static readonly Queue<(Command command, TcpClient client)> commandQueue = new Queue<(Command, TcpClient)>();
        private static readonly object queueLock = new object();
        private static readonly object statsLock = new object();
        private static readonly Dictionary<string, int> commandCounts = new Dictionary<string, int>(StringComparer.OrdinalIgnoreCase);
        private static readonly Queue<(DateTime t, string type)> recentCommands = new Queue<(DateTime, string)>();
        private static CancellationTokenSource cancellationTokenSource;
        private static Task listenerTask;
        private static bool isProcessingCommand;
        private static bool verboseReceiveLogs = false; // 受信ログの詳細表示を制御
        private static bool logIncomingCommands = false; // 受信コマンドの種別をログ出力（デバッグ用）
        private static int minEditorStateIntervalMs = 250; // get_editor_stateの最小間隔（抑制）
        private static DateTime lastEditorStateQueryTime = DateTime.MinValue;
        private static object lastEditorStateData = null;
        private static DateTime lastReceiveLogTime = DateTime.MinValue;
        
        
        private static McpStatus _status = McpStatus.NotConfigured;
        public static McpStatus Status
        {
            get => _status;
            private set
            {
                if (_status != value)
                {
                    _status = value;
                    Debug.Log($"[Unity Editor MCP] Status changed to: {value}");
                }
            }
        }
        
        public const int DEFAULT_PORT = 6400;
        private static int currentPort = DEFAULT_PORT;
        // Client connects via unity.mcpHost (legacy keys still supported). Server bind is independent (unity.unityHost/bindHost).
        private static string currentHost = "localhost"; // for logging only
        private static IPAddress bindAddress = IPAddress.Any; // default: 0.0.0.0
        
        /// <summary>
        /// Static constructor - called when Unity loads
        /// </summary>
        static UnityMCPServer()
        {
            Debug.Log("[Unity Editor MCP] Initializing...");
            EditorApplication.update += ProcessCommandQueue;
            EditorApplication.quitting += Shutdown;
            
            // Load config and start the TCP listener
            TryLoadConfigAndApply();
            StartTcpListener();
        }

        

        /// <summary>
        /// Load external configuration and apply port if present.
        /// Priority:
        /// 1) UNITY_MCP_CONFIG (explicit file path)
        /// 2) ./.unity/config.json (project-local)
        /// 3) ~/.unity/config.json (user-global)
        /// </summary>
        private static void TryLoadConfigAndApply()
        {
            try
            {
                string explicitPath = Environment.GetEnvironmentVariable("UNITY_MCP_CONFIG");
                // Current Unity project root
                string projectRoot = Path.GetFullPath(Path.Combine(Application.dataPath, ".."));
                string projectPath = Path.GetFullPath(Path.Combine(projectRoot, ".unity", "config.json"));
                string homeDir = Environment.GetFolderPath(Environment.SpecialFolder.UserProfile);
                string userPath = string.IsNullOrEmpty(homeDir) ? null : Path.Combine(homeDir, ".unity", "config.json");

                // Also search ancestors (最大3階層) で .unity/config.json を探索（最初に見つかったものを採用）
                string ancestorPath = FindAncestorConfigSimple(projectRoot, maxLevels: 3);

                // Build candidates in priority order:
                // 1) UNITY_MCP_CONFIG (explicit)
                // 2) <UnityProject>/.unity/config.json
                // 3) Ancestor workspace <workspace>/.unity/config.json that points to this project via project.root
                // 4) ~/.unity/config.json
                var candidates = new[] { explicitPath, projectPath, ancestorPath, userPath }
                    .Where(p => !string.IsNullOrEmpty(p))
                    .ToArray();

                foreach (var path in candidates)
                {
                    try
                    {
                        if (File.Exists(path))
                        {
                            var jsonText = File.ReadAllText(path);
                            var json = JObject.Parse(jsonText);

                            // Expect structure: { "unity": { "port": 6400, "unityHost": "localhost", "mcpHost": "host.docker.internal" } }
                            var portToken = json.SelectToken("unity.port");
                            if (portToken != null && int.TryParse(portToken.ToString(), out int port) && port > 0 && port < 65536)
                            {
                                currentPort = port;
                            }
                            // mcpHost は Node 側が接続に使用するホスト。旧 clientHost/host をフォールバックで利用。
                            var clientTargetToken = json.SelectToken("unity.mcpHost")
                                ?? json.SelectToken("unity.clientHost")
                                ?? json.SelectToken("unity.host");
                            if (clientTargetToken != null)
                            {
                                var host = clientTargetToken.ToString();
                                if (!string.IsNullOrWhiteSpace(host)) currentHost = host.Trim();
                            }

                            // unityHost（旧 bindHost/host）は Unity が待ち受けるインターフェース。
                            var bindToken = json.SelectToken("unity.unityHost")
                                ?? json.SelectToken("unity.bindHost")
                                ?? json.SelectToken("unity.host");
                            if (bindToken != null)
                            {
                                var bh = bindToken.ToString();
                                if (!string.IsNullOrWhiteSpace(bh)) bindAddress = ResolveBindAddress(bh.Trim());
                            }
                            // 受信ログの多量出力を抑制するためのフラグ（デフォルトfalse）
                            var verboseToken = json.SelectToken("unity.verboseReceiveLogs") ?? json.SelectToken("logging.verboseReceiveLogs");
                            if (verboseToken != null && bool.TryParse(verboseToken.ToString(), out var verbose))
                            {
                                verboseReceiveLogs = verbose;
                            }
                            var logCmdToken = json.SelectToken("unity.logIncomingCommands") ?? json.SelectToken("logging.logIncomingCommands");
                            if (logCmdToken != null && bool.TryParse(logCmdToken.ToString(), out var logcmd))
                            {
                                logIncomingCommands = logcmd;
                            }
                            var minIntToken = json.SelectToken("unity.minEditorStateIntervalMs");
                            if (minIntToken != null && int.TryParse(minIntToken.ToString(), out var minMs) && minMs >= 0 && minMs <= 10000)
                            {
                                minEditorStateIntervalMs = minMs;
                            }
                            Debug.Log($"[Unity Editor MCP] Config loaded from {path}: bind={bindAddress}, mcpHost={currentHost}, port={currentPort}");
                            return;
                        }
                    }
                    catch (Exception ex)
                    {
                        Debug.LogWarning($"[Unity Editor MCP] Failed to load config '{path}': {ex.Message}");
                    }
                }

                // No config found; keep default
                Debug.Log($"[Unity Editor MCP] No external config found. Using default bind={bindAddress}, mcpHost={currentHost}, port={currentPort}");
            }
            catch (Exception ex)
            {
                Debug.LogWarning($"[Unity Editor MCP] Config load error: {ex.Message}. Using default bind={bindAddress}, mcpHost={currentHost}, port={currentPort}");
            }
        }

        /// <summary>
        /// Walk up parent directories from the Unity project root (最大 maxLevels=3)
        /// and return the first found <dir>/.unity/config.json. Returns null if none.
        /// </summary>
        private static string FindAncestorConfigSimple(string projectRoot, int maxLevels = 3)
        {
            try
            {
                string dir = projectRoot;
                for (int i = 0; i < maxLevels; i++)
                {
                    var parent = (i == 0) ? new DirectoryInfo(dir) : Directory.GetParent(dir);
                    if (parent == null) break;
                    dir = parent.FullName;
                    var configPath = Path.Combine(dir, ".unity", "config.json");
                    if (File.Exists(configPath)) return configPath;
                }
            }
            catch { }
            return null;
        }

        private static IPAddress ResolveBindAddress(string host)
        {
            try
            {
                if (string.IsNullOrWhiteSpace(host) || host.Equals("localhost", StringComparison.OrdinalIgnoreCase))
                {
                    return IPAddress.Loopback;
                }
                if (host == "*" || host == "0.0.0.0")
                {
                    return IPAddress.Any;
                }
                if (host == "::")
                {
                    return IPAddress.IPv6Any;
                }
                if (host == "::1")
                {
                    return IPAddress.IPv6Loopback;
                }
                if (IPAddress.TryParse(host, out var ip))
                {
                    return ip;
                }
                var addrs = Dns.GetHostAddresses(host);
                var ipv4 = addrs.FirstOrDefault(a => a.AddressFamily == AddressFamily.InterNetwork);
                return ipv4 ?? addrs.FirstOrDefault() ?? IPAddress.Loopback;
            }
            catch
            {
                return IPAddress.Loopback;
            }
        }
        
        /// <summary>
        /// Starts the TCP listener on the configured port
        /// </summary>
        private static void StartTcpListener()
        {
            try
            {
                if (tcpListener != null)
                {
                    StopTcpListener();
                }
                
                cancellationTokenSource = new CancellationTokenSource();
                tcpListener = new TcpListener(bindAddress, currentPort);
                tcpListener.Start();
                
                Status = McpStatus.Disconnected;
                Debug.Log($"[Unity Editor MCP] TCP listener binding on {bindAddress}:{currentPort} (mcpHost={currentHost})");
                
                // Start accepting connections asynchronously
                listenerTask = Task.Run(() => AcceptConnectionsAsync(cancellationTokenSource.Token));
            }
            catch (SocketException ex)
            {
                Status = McpStatus.Error;
                Debug.LogError($"[Unity Editor MCP] Failed to start TCP listener on port {currentPort}: {ex.Message}");
                
                if (ex.SocketErrorCode == SocketError.AddressAlreadyInUse)
                {
                    Debug.LogError($"[Unity Editor MCP] Port {currentPort} is already in use. Please ensure no other instance is running.");
                }
            }
            catch (Exception ex)
            {
                Status = McpStatus.Error;
                Debug.LogError($"[Unity Editor MCP] Unexpected error starting TCP listener: {ex}");
            }
        }
        
        /// <summary>
        /// Stops the TCP listener
        /// </summary>
        private static void StopTcpListener()
        {
            try
            {
                cancellationTokenSource?.Cancel();
                tcpListener?.Stop();
                listenerTask?.Wait(TimeSpan.FromSeconds(1));
                
                tcpListener = null;
                cancellationTokenSource = null;
                listenerTask = null;
                
                Status = McpStatus.Disconnected;
                Debug.Log("[Unity Editor MCP] TCP listener stopped");
            }
            catch (Exception ex)
            {
                Debug.LogError($"[Unity Editor MCP] Error stopping TCP listener: {ex}");
            }
        }
        
        /// <summary>
        /// Accepts incoming TCP connections asynchronously
        /// </summary>
        private static async Task AcceptConnectionsAsync(CancellationToken cancellationToken)
        {
            while (!cancellationToken.IsCancellationRequested)
            {
                try
                {
                    var tcpClient = await AcceptClientAsync(tcpListener, cancellationToken);
                    if (tcpClient != null)
                    {
                        Status = McpStatus.Connected;
                        Debug.Log($"[Unity Editor MCP] Client connected from {tcpClient.Client.RemoteEndPoint}");
                        
                        // Handle client in a separate task
                        _ = Task.Run(() => HandleClientAsync(tcpClient, cancellationToken));
                    }
                }
                catch (ObjectDisposedException)
                {
                    // Listener was stopped
                    break;
                }
                catch (Exception ex)
                {
                    if (!cancellationToken.IsCancellationRequested)
                    {
                        Debug.LogError($"[Unity Editor MCP] Error accepting connection: {ex}");
                    }
                }
            }
        }
        
        /// <summary>
        /// Accepts a client with cancellation support
        /// </summary>
        private static async Task<TcpClient> AcceptClientAsync(TcpListener listener, CancellationToken cancellationToken)
        {
            using (cancellationToken.Register(() => listener.Stop()))
            {
                try
                {
                    return await listener.AcceptTcpClientAsync();
                }
                catch (ObjectDisposedException) when (cancellationToken.IsCancellationRequested)
                {
                    return null;
                }
            }
        }
        
        /// <summary>
        /// Handles communication with a connected client
        /// </summary>
        private static async Task HandleClientAsync(TcpClient client, CancellationToken cancellationToken)
        {
            try
            {
                client.ReceiveTimeout = 30000; // 30 second timeout
                client.SendTimeout = 30000;
                
                var buffer = new byte[4096];
                var stream = client.GetStream();
                var messageBuffer = new List<byte>();
                
                while (!cancellationToken.IsCancellationRequested && client.Connected)
                {
                    var bytesRead = await stream.ReadAsync(buffer, 0, buffer.Length, cancellationToken);
                    if (bytesRead == 0)
                    {
                        // Client disconnected
                        break;
                    }
                    
                    // Add received bytes to message buffer
                    for (int i = 0; i < bytesRead; i++)
                    {
                        messageBuffer.Add(buffer[i]);
                    }
                    
                    // Process complete messages
                    while (messageBuffer.Count >= 4)
                    {
                        // Read message length (first 4 bytes, big-endian)
                        var lengthBytes = messageBuffer.GetRange(0, 4).ToArray();
                        if (BitConverter.IsLittleEndian)
                        {
                            Array.Reverse(lengthBytes);
                        }
                        var messageLength = BitConverter.ToInt32(lengthBytes, 0);
                        
                        // Check if we have the complete message
                        if (messageBuffer.Count >= 4 + messageLength)
                        {
                            // Extract message
                            var messageBytes = messageBuffer.GetRange(4, messageLength).ToArray();
                            messageBuffer.RemoveRange(0, 4 + messageLength);
                            
                            var json = Encoding.UTF8.GetString(messageBytes);
                            // 受信ログは既定で抑制。必要時のみ設定で有効化し、かつ10秒に1回まで。
                            if (verboseReceiveLogs)
                            {
                                var now = DateTime.UtcNow;
                                if ((now - lastReceiveLogTime).TotalSeconds >= 10)
                                {
                                    lastReceiveLogTime = now;
                                    Debug.Log($"[Unity Editor MCP] Received command (length={messageLength})");
                                }
                            }
                            
                            try
                            {
                                // Handle special ping command
                                if (json.Trim().ToLower() == "ping")
                                {
                                    var pongResponse = Response.Pong();
                                    await SendFramedMessage(stream, pongResponse, cancellationToken);
                                    continue;
                                }
                                
                                // Parse command
                                var command = JsonConvert.DeserializeObject<Command>(json);
                                if (command != null)
                                {
                                    // Queue command for processing on main thread
                                    lock (queueLock)
                                    {
                                        commandQueue.Enqueue((command, client));
                                    }
                                }
                                else
                                {
                                    var errorResponse = Response.ErrorResult("Invalid command format", "PARSE_ERROR", null);
                                    await SendFramedMessage(stream, errorResponse, cancellationToken);
                                }
                            }
                            catch (JsonException ex)
                            {
                                var errorResponse = Response.ErrorResult($"JSON parsing error: {ex.Message}", "JSON_ERROR", null);
                                await SendFramedMessage(stream, errorResponse, cancellationToken);
                            }
                        }
                        else
                        {
                            // Not enough data yet, wait for more
                            break;
                        }
                    }
                }
            }
            catch (Exception ex)
            {
                if (!cancellationToken.IsCancellationRequested)
                {
                    Debug.LogError($"[Unity Editor MCP] Client handler error: {ex}");
                }
            }
            finally
            {
                client?.Close();
                if (Status == McpStatus.Connected)
                {
                    Status = McpStatus.Disconnected;
                }
                Debug.Log("[Unity Editor MCP] Client disconnected");
            }
        }
        
        /// <summary>
        /// Sends a framed message over the stream
        /// </summary>
        private static async Task SendFramedMessage(NetworkStream stream, string message, CancellationToken cancellationToken)
        {
            try
            {
                var messageBytes = Encoding.UTF8.GetBytes(message);
                var lengthBytes = BitConverter.GetBytes(messageBytes.Length);
                if (BitConverter.IsLittleEndian) Array.Reverse(lengthBytes);
                await stream.WriteAsync(lengthBytes, 0, 4, cancellationToken);
                await stream.WriteAsync(messageBytes, 0, messageBytes.Length, cancellationToken);
                await stream.FlushAsync(cancellationToken);
            }
            catch (Exception ex)
            {
                try { Debug.LogError($"[Unity Editor MCP] Send error: {ex}"); } catch { }
                throw;
            }
        }
        
        /// <summary>
        /// Processes queued commands on the Unity main thread
        /// </summary>
        private static void ProcessCommandQueue()
        {
            if (isProcessingCommand) return;
            (Command command, TcpClient client) item;
            lock (queueLock)
            {
                if (commandQueue.Count == 0) return;
                item = commandQueue.Dequeue();
                isProcessingCommand = true;
            }
            ProcessCommand(item.command, item.client);
        }
        
        /// <summary>
        /// Processes a single command
        /// </summary>
        private static async void ProcessCommand(Command command, TcpClient client)
        {
            try
            {
                string response;

                // Audit: カウントと最近のコマンドを記録（軽量・スレッドセーフ）
                try
                {
                    var type = command.Type ?? "(null)";
                    lock (statsLock)
                    {
                        if (!commandCounts.ContainsKey(type)) commandCounts[type] = 0;
                        commandCounts[type]++;
                        recentCommands.Enqueue((DateTime.UtcNow, type));
                        while (recentCommands.Count > 50) recentCommands.Dequeue();
                    }
                }
                catch { }
                
                // During Play Mode, restrict heavy commands per policy to keep MCP responsive
                if (Application.isPlaying && !PlayModeCommandPolicy.IsAllowed(command.Type))
                {
                    var state = new {
                        isPlaying = Application.isPlaying,
                        isCompiling = EditorApplication.isCompiling,
                        isUpdating = EditorApplication.isUpdating
                    };
                    response = Response.ErrorResult(command.Id, $"Command '{command.Type}' is blocked during Play Mode", "PLAY_MODE_BLOCKED", state);
                    if (client.Connected)
                    {
                        await SendFramedMessage(client.GetStream(), response, CancellationToken.None);
                    }
                    return;
                }

                // 任意のデバッグログ（コマンド種別を明示）
                if (logIncomingCommands)
                {
                    try
                    {
                        var type = command.Type ?? "(null)";
                        var id = command.Id ?? "(n/a)";
                        var keys = string.Join(",", (command.Parameters?.Properties()?.Select(p => p.Name) ?? Enumerable.Empty<string>()));
                        Debug.Log($"[MCP Command] id={id} type={type} keys=[{keys}]");
                    }
                    catch { }
                }

                // Handle command based on type
                switch (command.Type?.ToLower())
                {
                    case "ping":
                        var pongData = new
                        {
                            message = "pong",
                            echo = command.Parameters?["message"]?.ToString(),
                            timestamp = DateTime.UtcNow.ToString("o")
                        };
                        // Use new format with command ID
                        response = Response.SuccessResult(command.Id, pongData);
                        break;
                    case "clear_logs":
                        LogCapture.ClearLogs();
                        response = Response.SuccessResult(command.Id, new
                        {
                            message = "Logs cleared successfully",
                            timestamp = DateTime.UtcNow.ToString("o")
                        });
                        break;
                    case "refresh_assets":
                        // Trigger Unity to recompile and refresh assets
                        AssetDatabase.Refresh();
                        
                        // Check if Unity is compiling
                        bool isCompiling = EditorApplication.isCompiling;
                        
                        response = Response.SuccessResult(command.Id, new
                        {
                            message = "Asset refresh triggered",
                            isCompiling = isCompiling,
                            timestamp = DateTime.UtcNow.ToString("o")
                        });
                        break;
                    case "create_gameobject":
                        var createResult = GameObjectHandler.CreateGameObject(command.Parameters);
                        response = Response.SuccessResult(command.Id, createResult);
                        break;
                    case "find_gameobject":
                        var findResult = GameObjectHandler.FindGameObjects(command.Parameters);
                        response = Response.SuccessResult(command.Id, findResult);
                        break;
                    case "modify_gameobject":
                        var modifyResult = GameObjectHandler.ModifyGameObject(command.Parameters);
                        response = Response.SuccessResult(command.Id, modifyResult);
                        break;
                    case "delete_gameobject":
                        var deleteResult = GameObjectHandler.DeleteGameObject(command.Parameters);
                        response = Response.SuccessResult(command.Id, deleteResult);
                        break;
                    case "get_hierarchy":
                        var hierarchyResult = GameObjectHandler.GetHierarchy(command.Parameters);
                        response = Response.SuccessResult(command.Id, hierarchyResult);
                        break;
                    case "create_scene":
                        var createSceneResult = SceneHandler.CreateScene(command.Parameters);
                        response = Response.SuccessResult(command.Id, createSceneResult);
                        break;
                    case "load_scene":
                        var loadSceneResult = SceneHandler.LoadScene(command.Parameters);
                        response = Response.SuccessResult(command.Id, loadSceneResult);
                        break;
                    case "save_scene":
                        var saveSceneResult = SceneHandler.SaveScene(command.Parameters);
                        response = Response.SuccessResult(command.Id, saveSceneResult);
                        break;
                    case "list_scenes":
                        var listScenesResult = SceneHandler.ListScenes(command.Parameters);
                        response = Response.SuccessResult(command.Id, listScenesResult);
                        break;
                    case "get_scene_info":
                        var getSceneInfoResult = SceneHandler.GetSceneInfo(command.Parameters);
                        response = Response.SuccessResult(command.Id, getSceneInfoResult);
                        break;
                    case "get_gameobject_details":
                        var getGameObjectDetailsResult = SceneAnalysisHandler.GetGameObjectDetails(command.Parameters);
                        response = Response.SuccessResult(command.Id, getGameObjectDetailsResult);
                        break;
                    case "analyze_scene_contents":
                        var analyzeSceneResult = SceneAnalysisHandler.AnalyzeSceneContents(command.Parameters);
                        response = Response.SuccessResult(command.Id, analyzeSceneResult);
                        break;
                    case "get_component_values":
                        var getComponentValuesResult = SceneAnalysisHandler.GetComponentValues(command.Parameters);
                        response = Response.SuccessResult(command.Id, getComponentValuesResult);
                        break;
                    case "find_by_component":
                        var findByComponentResult = SceneAnalysisHandler.FindByComponent(command.Parameters);
                        response = Response.SuccessResult(command.Id, findByComponentResult);
                        break;
                    case "get_object_references":
                        var getObjectReferencesResult = SceneAnalysisHandler.GetObjectReferences(command.Parameters);
                        response = Response.SuccessResult(command.Id, getObjectReferencesResult);
                        break;
                    // Animator State commands
                    case "get_animator_state":
                        var getAnimatorStateResult = AnimatorStateHandler.GetAnimatorState(command.Parameters);
                        response = Response.SuccessResult(command.Id, getAnimatorStateResult);
                        break;
                    case "get_animator_runtime_info":
                        var getAnimatorRuntimeInfoResult = AnimatorStateHandler.GetAnimatorRuntimeInfo(command.Parameters);
                        response = Response.SuccessResult(command.Id, getAnimatorRuntimeInfoResult);
                        break;
                    // Input Actions commands
                    case "get_input_actions_state":
                        var getInputActionsStateResult = InputActionsHandler.GetInputActionsState(command.Parameters);
                        response = Response.SuccessResult(command.Id, getInputActionsStateResult);
                        break;
                    case "analyze_input_actions_asset":
                        var analyzeInputActionsResult = InputActionsHandler.AnalyzeInputActionsAsset(command.Parameters);
                        response = Response.SuccessResult(command.Id, analyzeInputActionsResult);
                        break;
                    case "create_action_map":
                        var createActionMapResult = InputActionsHandler.CreateActionMap(command.Parameters);
                        response = Response.SuccessResult(command.Id, createActionMapResult);
                        break;
                    case "remove_action_map":
                        var removeActionMapResult = InputActionsHandler.RemoveActionMap(command.Parameters);
                        response = Response.SuccessResult(command.Id, removeActionMapResult);
                        break;
                    case "add_input_action":
                        var addInputActionResult = InputActionsHandler.AddInputAction(command.Parameters);
                        response = Response.SuccessResult(command.Id, addInputActionResult);
                        break;
                    case "remove_input_action":
                        var removeInputActionResult = InputActionsHandler.RemoveInputAction(command.Parameters);
                        response = Response.SuccessResult(command.Id, removeInputActionResult);
                        break;
                    case "add_input_binding":
                        var addInputBindingResult = InputActionsHandler.AddInputBinding(command.Parameters);
                        response = Response.SuccessResult(command.Id, addInputBindingResult);
                        break;
                    case "remove_input_binding":
                        var removeInputBindingResult = InputActionsHandler.RemoveInputBinding(command.Parameters);
                        response = Response.SuccessResult(command.Id, removeInputBindingResult);
                        break;
                    case "remove_all_bindings":
                        var removeAllBindingsResult = InputActionsHandler.RemoveAllBindings(command.Parameters);
                        response = Response.SuccessResult(command.Id, removeAllBindingsResult);
                        break;
                    case "create_composite_binding":
                        var createCompositeBindingResult = InputActionsHandler.CreateCompositeBinding(command.Parameters);
                        response = Response.SuccessResult(command.Id, createCompositeBindingResult);
                        break;
                    case "manage_control_schemes":
                        var manageControlSchemesResult = InputActionsHandler.ManageControlSchemes(command.Parameters);
                        response = Response.SuccessResult(command.Id, manageControlSchemesResult);
                        break;
                    // Play Mode Control commands
                    case "play_game":
                        var playResult = PlayModeHandler.HandleCommand("play_game", command.Parameters);
                        response = Response.SuccessResult(command.Id, playResult);
                        break;
                    case "pause_game":
                        var pauseResult = PlayModeHandler.HandleCommand("pause_game", command.Parameters);
                        response = Response.SuccessResult(command.Id, pauseResult);
                        break;
                    case "stop_game":
                        var stopResult = PlayModeHandler.HandleCommand("stop_game", command.Parameters);
                        response = Response.SuccessResult(command.Id, stopResult);
                        break;
                    case "get_editor_state":
                        {
                            var now = DateTime.UtcNow;
                            if ((now - lastEditorStateQueryTime).TotalMilliseconds < minEditorStateIntervalMs && lastEditorStateData != null)
                            {
                                response = Response.SuccessResult(command.Id, lastEditorStateData);
                                break;
                            }
                            var stateResult = PlayModeHandler.HandleCommand("get_editor_state", command.Parameters);
                            lastEditorStateQueryTime = now;
                            lastEditorStateData = stateResult;
                            response = Response.SuccessResult(command.Id, stateResult);
                            break;
                        }
                    // UI Interaction commands
                    case "find_ui_elements":
                        var findUIResult = UIInteractionHandler.FindUIElements(command.Parameters);
                        response = Response.SuccessResult(command.Id, findUIResult);
                        break;
                    case "click_ui_element":
                        var clickUIResult = UIInteractionHandler.ClickUIElement(command.Parameters);
                        response = Response.SuccessResult(command.Id, clickUIResult);
                        break;
                    case "get_ui_element_state":
                        var getUIStateResult = UIInteractionHandler.GetUIElementState(command.Parameters);
                        response = Response.SuccessResult(command.Id, getUIStateResult);
                        break;
                    case "set_ui_element_value":
                        var setUIValueResult = UIInteractionHandler.SetUIElementValue(command.Parameters);
                        response = Response.SuccessResult(command.Id, setUIValueResult);
                        break;
                    case "simulate_ui_input":
                        var simulateUIResult = UIInteractionHandler.SimulateUIInput(command.Parameters);
                        response = Response.SuccessResult(command.Id, simulateUIResult);
                        break;
                    // Input System commands
                    #if ENABLE_INPUT_SYSTEM
                    case "simulate_keyboard_input":
                        var keyboardResult = InputSystemHandler.SimulateKeyboardInput(command.Parameters);
                        response = Response.SuccessResult(command.Id, keyboardResult);
                        break;
                    case "simulate_mouse_input":
                        var mouseResult = InputSystemHandler.SimulateMouseInput(command.Parameters);
                        response = Response.SuccessResult(command.Id, mouseResult);
                        break;
                    case "simulate_gamepad_input":
                        var gamepadResult = InputSystemHandler.SimulateGamepadInput(command.Parameters);
                        response = Response.SuccessResult(command.Id, gamepadResult);
                        break;
                    case "simulate_touch_input":
                        var touchResult = InputSystemHandler.SimulateTouchInput(command.Parameters);
                        response = Response.SuccessResult(command.Id, touchResult);
                        break;
                    case "create_input_sequence":
                        var sequenceResult = InputSystemHandler.CreateInputSequence(command.Parameters);
                        response = Response.SuccessResult(command.Id, sequenceResult);
                        break;
                    case "get_current_input_state":
                        var inputStateResult = InputSystemHandler.GetCurrentInputState(command.Parameters);
                        response = Response.SuccessResult(command.Id, inputStateResult);
                        break;
                    #endif
                    // Asset Management commands
                    case "create_prefab":
                        var createPrefabResult = AssetManagementHandler.CreatePrefab(command.Parameters);
                        response = Response.SuccessResult(command.Id, createPrefabResult);
                        break;
                    case "modify_prefab":
                        var modifyPrefabResult = AssetManagementHandler.ModifyPrefab(command.Parameters);
                        response = Response.SuccessResult(command.Id, modifyPrefabResult);
                        break;
                    case "instantiate_prefab":
                        var instantiatePrefabResult = AssetManagementHandler.InstantiatePrefab(command.Parameters);
                        response = Response.SuccessResult(command.Id, instantiatePrefabResult);
                        break;
                    case "create_material":
                        var createMaterialResult = AssetManagementHandler.CreateMaterial(command.Parameters);
                        response = Response.SuccessResult(command.Id, createMaterialResult);
                        break;
                    case "modify_material":
                        var modifyMaterialResult = AssetManagementHandler.ModifyMaterial(command.Parameters);
                        response = Response.SuccessResult(command.Id, modifyMaterialResult);
                        break;
                    case "open_prefab":
                        var openPrefabResult = AssetManagementHandler.OpenPrefab(command.Parameters);
                        response = Response.SuccessResult(command.Id, openPrefabResult);
                        break;
                    case "exit_prefab_mode":
                        var exitPrefabModeResult = AssetManagementHandler.ExitPrefabMode(command.Parameters);
                        response = Response.SuccessResult(command.Id, exitPrefabModeResult);
                        break;
                    case "save_prefab":
                        var savePrefabResult = AssetManagementHandler.SavePrefab(command.Parameters);
                        response = Response.SuccessResult(command.Id, savePrefabResult);
                        break;
                    case "execute_menu_item":
                        var executeMenuResult = MenuHandler.ExecuteMenuItem(command.Parameters);
                        response = Response.SuccessResult(command.Id, executeMenuResult);
                        break;
                    // Package Manager commands
                    case "package_manager":
                        var packageAction = command.Parameters?["action"]?.ToString() ?? "list";
                        var packageResult = PackageManagerHandler.HandleCommand(packageAction, command.Parameters);
                        response = Response.SuccessResult(command.Id, packageResult);
                        break;
                    // Registry configuration commands
                    case "registry_config":
                        var registryAction = command.Parameters?["action"]?.ToString() ?? "list";
                        var registryResult = RegistryConfigHandler.HandleCommand(registryAction, command.Parameters);
                        response = Response.SuccessResult(command.Id, registryResult);
                        break;
                    case "clear_console":
                        var clearConsoleResult = ConsoleHandler.ClearConsole(command.Parameters);
                        response = Response.SuccessResult(command.Id, clearConsoleResult);
                        break;
                    case "read_console":
                        var readConsoleResult = ConsoleHandler.ReadConsole(command.Parameters);
                        response = Response.SuccessResult(command.Id, readConsoleResult);
                        break;
                    // Screenshot commands
                    case "capture_screenshot":
                        var captureScreenshotResult = ScreenshotHandler.CaptureScreenshot(command.Parameters);
                        response = Response.SuccessResult(command.Id, captureScreenshotResult);
                        break;
                    case "analyze_screenshot":
                        var analyzeScreenshotResult = ScreenshotHandler.AnalyzeScreenshot(command.Parameters);
                        response = Response.SuccessResult(command.Id, analyzeScreenshotResult);
                        break;
                    // Video capture commands (skeleton)
                    case "capture_video_start":
                        var vStart = VideoCaptureHandler.Start(command.Parameters);
                        response = Response.SuccessResult(command.Id, vStart);
                        break;
                    case "capture_video_stop":
                        var vStop = VideoCaptureHandler.Stop(command.Parameters);
                        response = Response.SuccessResult(command.Id, vStop);
                        break;
                    case "capture_video_status":
                        var vStatus = VideoCaptureHandler.Status(command.Parameters);
                        response = Response.SuccessResult(command.Id, vStatus);
                        break;
                    // Component commands
                    case "add_component":
                        var addComponentResult = ComponentHandler.AddComponent(command.Parameters);
                        response = Response.SuccessResult(command.Id, addComponentResult);
                        break;
                    case "remove_component":
                        var removeComponentResult = ComponentHandler.RemoveComponent(command.Parameters);
                        response = Response.SuccessResult(command.Id, removeComponentResult);
                        break;
                    case "modify_component":
                        var modifyComponentResult = ComponentHandler.ModifyComponent(command.Parameters);
                        response = Response.SuccessResult(command.Id, modifyComponentResult);
                        break;
                    case "list_components":
                        var listComponentsResult = ComponentHandler.ListComponents(command.Parameters);
                        response = Response.SuccessResult(command.Id, listComponentsResult);
                        break;
                    case "get_compilation_state":
                        var compilationStateResult = CompilationHandler.GetCompilationState(command.Parameters);
                        response = Response.SuccessResult(command.Id, compilationStateResult);
                        break;
                    // Test Execution commands
                    case "run_tests":
                        var runTestsResult = TestExecutionHandler.RunTests(command.Parameters);
                        response = Response.SuccessResult(command.Id, runTestsResult);
                        break;
                    case "get_test_status":
                        var testStatusResult = TestExecutionHandler.GetTestStatus(command.Parameters);
                        response = Response.SuccessResult(command.Id, testStatusResult);
                        break;
                    // Tag management commands
                    case "manage_tags":
                        var tagManagementResult = TagManagementHandler.HandleCommand(command.Parameters["action"]?.ToString(), command.Parameters);
                        response = Response.SuccessResult(command.Id, tagManagementResult);
                        break;
                    // Layer management commands
                    case "manage_layers":
                        var layerManagementResult = LayerManagementHandler.HandleCommand(command.Parameters["action"]?.ToString(), command.Parameters);
                        response = Response.SuccessResult(command.Id, layerManagementResult);
                        break;
                    // Selection management commands
                    case "manage_selection":
                        var selectionManagementResult = SelectionHandler.HandleCommand(command.Parameters["action"]?.ToString(), command.Parameters);
                        response = Response.SuccessResult(command.Id, selectionManagementResult);
                        break;
                    // Window management commands
                    case "manage_windows":
                        var windowManagementResult = WindowManagementHandler.HandleCommand(command.Parameters["action"]?.ToString(), command.Parameters);
                        response = Response.SuccessResult(command.Id, windowManagementResult);
                        break;
                    // Tool management commands
                    case "manage_tools":
                        var toolManagementResult = ToolManagementHandler.HandleCommand(command.Parameters["action"]?.ToString(), command.Parameters);
                        response = Response.SuccessResult(command.Id, toolManagementResult);
                        break;
                    // Asset import settings commands
                    case "manage_asset_import_settings":
                        var assetImportSettingsResult = AssetImportSettingsHandler.HandleCommand(command.Parameters["action"]?.ToString(), command.Parameters);
                        response = Response.SuccessResult(command.Id, assetImportSettingsResult);
                        break;
                    // Script/Code (Unity側実装は廃止: Node側で完結)
                    // Asset database commands
                    case "manage_asset_database":
                        var assetDatabaseResult = AssetDatabaseHandler.HandleCommand(command.Parameters["action"]?.ToString(), command.Parameters);
                        response = Response.SuccessResult(command.Id, assetDatabaseResult);
                        break;
                    // Asset dependency analysis commands
                    case "analyze_asset_dependencies":
                        var assetDependencyResult = AssetDependencyHandler.HandleCommand(command.Parameters["action"]?.ToString(), command.Parameters);
                        response = Response.SuccessResult(command.Id, assetDependencyResult);
                        break;
                    // Project Settings commands
                    case "get_project_settings":
                        var getSettingsResult = ProjectSettingsHandler.GetProjectSettings(command.Parameters);
                        response = Response.SuccessResult(command.Id, getSettingsResult);
                        break;
                    // Editor/Project info for Node-side tools
                    case "get_editor_info":
                        try
                        {
                            var projectRoot = Application.dataPath.Substring(0, Application.dataPath.Length - "/Assets".Length).Replace('\\', '/');
                            var assetsPath = Path.Combine(projectRoot, "Assets").Replace('\\', '/');
                            var packagesPath = Path.Combine(projectRoot, "Packages").Replace('\\', '/');
                            var workspaceRoot = ResolveWorkspaceRoot(projectRoot);
                            var codeIndexRoot = Path.Combine(workspaceRoot, ".unity", "cache", "code-index").Replace('\\', '/');
                            var info = new {
                                projectRoot,
                                assetsPath,
                                packagesPath,
                                codeIndexRoot,
                                unity = new {
                                    productName = Application.productName,
                                    unityVersion = Application.unityVersion,
                                    platform = Application.platform.ToString()
                                }
                            };
                            response = Response.SuccessResult(command.Id, info);
                        }
                        catch (Exception ex)
                        {
                            response = Response.ErrorResult(command.Id, $"Failed to get editor info: {ex.Message}", "GET_EDITOR_INFO_ERROR", null);
                        }
                        break;
                    case "update_project_settings":
                        var updateSettingsResult = ProjectSettingsHandler.UpdateProjectSettings(command.Parameters);
                        response = Response.SuccessResult(command.Id, updateSettingsResult);
                        break;
                    case "get_command_stats":
                        {
                            object stats;
                            lock (statsLock)
                            {
                                stats = new
                                {
                                    counts = commandCounts.ToDictionary(kv => kv.Key, kv => kv.Value),
                                    recent = recentCommands.ToArray()
                                        .Select(x => new { timestamp = x.t.ToString("o"), type = x.type })
                                        .ToArray()
                                };
                            }
                            response = Response.SuccessResult(command.Id, stats);
                            break;
                        }
                    default:
                        // Use new format with error details
                        response = Response.ErrorResult(
                            command.Id,
                            $"Unknown command type: {command.Type}", 
                            "UNKNOWN_COMMAND",
                            new { commandType = command.Type }
                        );
                        break;
                }
                
                // Send response
                if (client.Connected)
                {
                    await SendFramedMessage(client.GetStream(), response, CancellationToken.None);
                }
            }
            catch (Exception ex)
            {
                Debug.LogError($"[Unity Editor MCP] Error processing command {command}: {ex}");
                
                try
                {
                    if (client.Connected)
                    {
                        var errorResponse = Response.ErrorResult(
                            command.Id,
                            $"Internal error: {ex.Message}", 
                            "INTERNAL_ERROR",
                            new { 
                                commandType = command.Type,
                                stackTrace = ex.StackTrace
                            }
                        );
                        await SendFramedMessage(client.GetStream(), errorResponse, CancellationToken.None);
                    }
                }
                catch
                {
                    // Best effort - ignore errors when sending error response
                }
            }
            finally
            {
                isProcessingCommand = false;
            }
        }
        
        /// <summary>
        /// Shuts down the MCP system
        /// </summary>
        private static void Shutdown()
        {
            Debug.Log("[Unity Editor MCP] Shutting down...");
            StopTcpListener();
            EditorApplication.update -= ProcessCommandQueue;
            EditorApplication.quitting -= Shutdown;
        }

        private static string ResolveWorkspaceRoot(string projectRoot)
        {
            try
            {
                string dir = projectRoot;
                for (int i = 0; i < 3 && !string.IsNullOrEmpty(dir); i++)
                {
                    var cfgPath = Path.Combine(dir, ".unity", "config.json");
                    if (File.Exists(cfgPath))
                    {
                        return dir.Replace('\\', '/');
                    }
                    var parent = Directory.GetParent(dir);
                    if (parent == null)
                    {
                        break;
                    }
                    dir = parent.FullName;
                }
            }
            catch { }
            return projectRoot.Replace('\\', '/');
        }
        
        /// <summary>
        /// Restarts the TCP listener
        /// </summary>
        public static void Restart()
        {
            Debug.Log("[Unity Editor MCP] Restarting...");
            StopTcpListener();
            StartTcpListener();
        }
        
        /// <summary>
        /// Changes the listening port and restarts
        /// </summary>
        public static void ChangePort(int newPort)
        {
            if (newPort < 1024 || newPort > 65535)
            {
                Debug.LogError($"[Unity Editor MCP] Invalid port number: {newPort}. Must be between 1024 and 65535.");
                return;
            }
            
            currentPort = newPort;
            Restart();
        }
    }
}
