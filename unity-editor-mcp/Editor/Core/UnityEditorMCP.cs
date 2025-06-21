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
using Newtonsoft.Json;

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
                            var errorResponse = Response.Error("Invalid command format", "PARSE_ERROR", null);
                            var responseBytes = Encoding.UTF8.GetBytes(errorResponse);
                            await stream.WriteAsync(responseBytes, 0, responseBytes.Length, cancellationToken);
                        }
                    }
                    catch (JsonException ex)
                    {
                        var errorResponse = Response.Error($"JSON parsing error: {ex.Message}", "JSON_ERROR", null);
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
                        // Use new format
                        response = Response.SuccessResult(pongData);
                        break;
                        
                    default:
                        // Use new format with error details
                        response = Response.ErrorResult(
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