using System;
using System.Collections.Generic;
using System.Net;
using System.Net.Sockets;
using System.Text;
using System.Threading;
using System.Threading.Tasks;
using UnityEditor;
using UnityEngine;
using UnityEditorMCP.Models;
using UnityEditorMCP.Helpers;
using UnityEditorMCP.Logging;
using UnityEditorMCP.Handlers;
using Newtonsoft.Json;
using Newtonsoft.Json.Linq;

namespace UnityEditorMCP.Core
{
    /// <summary>
    /// Main Unity Editor MCP class that handles TCP communication and command processing
    /// </summary>
    [InitializeOnLoad]
    public static class UnityEditorMCP
    {
        private static TcpListener tcpListener;
        private static readonly Queue<(Command command, TcpClient client)> commandQueue = new Queue<(Command, TcpClient)>();
        private static readonly object queueLock = new object();
        private static CancellationTokenSource cancellationTokenSource;
        private static Task listenerTask;
        
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
        
        /// <summary>
        /// Static constructor - called when Unity loads
        /// </summary>
        static UnityEditorMCP()
        {
            Debug.Log("[Unity Editor MCP] Initializing...");
            EditorApplication.update += ProcessCommandQueue;
            EditorApplication.quitting += Shutdown;
            
            // Start the TCP listener
            StartTcpListener();
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
                tcpListener = new TcpListener(IPAddress.Loopback, currentPort);
                tcpListener.Start();
                
                Status = McpStatus.Disconnected;
                Debug.Log($"[Unity Editor MCP] TCP listener started on port {currentPort}");
                
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
                
                while (!cancellationToken.IsCancellationRequested && client.Connected)
                {
                    var bytesRead = await stream.ReadAsync(buffer, 0, buffer.Length, cancellationToken);
                    if (bytesRead == 0)
                    {
                        // Client disconnected
                        break;
                    }
                    
                    var json = Encoding.UTF8.GetString(buffer, 0, bytesRead);
                    Debug.Log($"[Unity Editor MCP] Received: {json}");
                    
                    try
                    {
                        // Handle special ping command
                        if (json.Trim().ToLower() == "ping")
                        {
                            var pongResponse = Response.Pong();
                            var responseBytes = Encoding.UTF8.GetBytes(pongResponse);
                            await stream.WriteAsync(responseBytes, 0, responseBytes.Length, cancellationToken);
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
                            var responseBytes = Encoding.UTF8.GetBytes(errorResponse);
                            await stream.WriteAsync(responseBytes, 0, responseBytes.Length, cancellationToken);
                        }
                    }
                    catch (JsonException ex)
                    {
                        var errorResponse = Response.ErrorResult($"JSON parsing error: {ex.Message}", "JSON_ERROR", null);
                        var responseBytes = Encoding.UTF8.GetBytes(errorResponse);
                        await stream.WriteAsync(responseBytes, 0, responseBytes.Length, cancellationToken);
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
        /// Processes queued commands on the Unity main thread
        /// </summary>
        private static void ProcessCommandQueue()
        {
            lock (queueLock)
            {
                while (commandQueue.Count > 0)
                {
                    var (command, client) = commandQueue.Dequeue();
                    ProcessCommand(command, client);
                }
            }
        }
        
        /// <summary>
        /// Processes a single command
        /// </summary>
        private static async void ProcessCommand(Command command, TcpClient client)
        {
            try
            {
                Debug.Log($"[Unity Editor MCP] Processing command: {command}");
                
                string response;
                
                // Handle command based on type
                switch (command.Type?.ToLower())
                {
                    case "ping":
                        var pongData = new
                        {
                            message = "pong",
                            echo = command.Parameters?["message"]?.ToString(),
                            timestamp = System.DateTime.UtcNow.ToString("o")
                        };
                        // Use new format with command ID
                        response = Response.SuccessResult(command.Id, pongData);
                        break;
                        
                    case "read_logs":
                        // Parse parameters
                        int count = 100;
                        string logTypeFilter = null;
                        
                        if (command.Parameters != null)
                        {
                            if (command.Parameters.ContainsKey("count"))
                            {
                                if (int.TryParse(command.Parameters["count"].ToString(), out int parsedCount))
                                {
                                    count = Math.Min(Math.Max(parsedCount, 1), 1000); // Clamp between 1 and 1000
                                }
                            }
                            
                            if (command.Parameters.ContainsKey("logType"))
                            {
                                logTypeFilter = command.Parameters["logType"].ToString();
                            }
                        }
                        
                        // Get logs
                        LogType? filterType = null;
                        if (!string.IsNullOrEmpty(logTypeFilter))
                        {
                            if (Enum.TryParse<LogType>(logTypeFilter, true, out LogType parsed))
                            {
                                filterType = parsed;
                            }
                        }
                        
                        var logs = LogCapture.GetLogs(count, filterType);
                        var logData = new List<object>();
                        
                        foreach (var log in logs)
                        {
                            logData.Add(new
                            {
                                message = log.message,
                                stackTrace = log.stackTrace,
                                logType = log.logType.ToString(),
                                timestamp = log.timestamp.ToString("o")
                            });
                        }
                        
                        response = Response.SuccessResult(command.Id, new
                        {
                            logs = logData,
                            count = logData.Count,
                            totalCaptured = logs.Count
                        });
                        break;
                        
                    case "clear_logs":
                        LogCapture.ClearLogs();
                        response = Response.SuccessResult(command.Id, new
                        {
                            message = "Logs cleared successfully",
                            timestamp = System.DateTime.UtcNow.ToString("o")
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
                            timestamp = System.DateTime.UtcNow.ToString("o")
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
                    var responseBytes = Encoding.UTF8.GetBytes(response);
                    await client.GetStream().WriteAsync(responseBytes, 0, responseBytes.Length);
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
                        var responseBytes = Encoding.UTF8.GetBytes(errorResponse);
                        await client.GetStream().WriteAsync(responseBytes, 0, responseBytes.Length);
                    }
                }
                catch
                {
                    // Best effort - ignore errors when sending error response
                }
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