using UnityEngine;
using System.Collections;
using System.Collections.Generic;
using System.Linq;


using System.Threading.Tasks;
using System.Net;
using System.Net.Sockets;
using System.IO;
using System.Text;
using UnityEngine.Networking;

namespace GiantNetworkingNamespace
{
    // 巨大ネットワーキングシステム（3000行以上）
    // 複雑なマルチプレイヤーゲーム用の包括的なネットワーキングソリューション
    
    #region Core Networking Interfaces
    

public interface INetworkLoadBalancer
{
    int GetOptimalServer(List<ServerInfo> servers);
    void UpdateServerLoad(int serverId, float load);
    void RegisterServer(ServerInfo server);
    void UnregisterServer(int serverId);
    ServerInfo GetServerInfo(int serverId);
}

public struct ServerInfo
{
    public int Id;
    public string Address;
    public int Port;
    public float CurrentLoad;
    public int MaxConnections;
    public int ActiveConnections;
    public DateTime LastHeartbeat;
    public string Region;
    public Dictionary<string, float> Metrics;
}

public interface INetworkQualityOfService
{
    void SetQoSLevel(QoSLevel level);
    QoSLevel GetCurrentQoSLevel();
    void PrioritizeTraffic(string trafficType, int priority);
    void ApplyBandwidthLimit(int bytesPerSecond);
    void EnableAdaptiveQoS(bool enable);
}

public enum QoSLevel
{
    BestEffort,
    Background,
    Standard,
    Premium,
    RealTime
}
    public interface INetworkTransport
    {
        void Initialize(int port, string address);
        void Connect(string remoteAddress, int remotePort);
        void Disconnect();
        void Send(byte[] data, int channelId);
        byte[] Receive();
        bool IsConnected { get; }
        NetworkTransportType TransportType { get; }
    }
    
    public interface INetworkSerializer
    {
        byte[] Serialize<T>(T obj) where T : class;
        T Deserialize<T>(byte[] data) where T : class;
        int GetSerializedSize<T>(T obj) where T : class;
    }
    
    public interface INetworkMessageHandler
    {
        void HandleMessage(NetworkMessage message);
        bool CanHandle(Type messageType);
        int Priority { get; }
    }
    
    public interface INetworkReliability
    {
        void SendReliable(byte[] data, Action<bool> onComplete);
        void SendUnreliable(byte[] data);
        void ProcessAcknowledgements();
        float GetPacketLoss();
        int GetPing();
    }
    
    public interface INetworkCompression
    {
        byte[] Compress(byte[] data);
        byte[] Decompress(byte[] data);
        float GetCompressionRatio();
    }
    
    public interface INetworkEncryption
    {
        byte[] Encrypt(byte[] data, byte[] key);
        byte[] Decrypt(byte[] data, byte[] key);
        byte[] GenerateKey(int keySize);
        bool ValidateIntegrity(byte[] data, byte[] signature);
    }
    
    public interface INetworkMatchmaking
    {
        Task<MatchInfo> FindMatch(MatchCriteria criteria);
        Task<bool> CreateMatch(MatchSettings settings);
        Task<bool> JoinMatch(string matchId);
        Task LeaveMatch();
        Task<List<MatchInfo>> GetAvailableMatches();
    }
    
    public interface INetworkStatistics
    {
        void RecordPacketSent(int size);
        void RecordPacketReceived(int size);
        void RecordLatency(float latency);
        NetworkStats GetStatistics();
        void ResetStatistics();
    }
    
    #endregion
    
    #region Network Enumerations
    
    public enum NetworkTransportType
    {
        TCP,
        UDP,
        WebSocket,
        WebRTC,
        Custom
    }
    
    public enum NetworkChannelType
    {
        Reliable,
        ReliableSequenced,
        ReliableOrdered,
        Unreliable,
        UnreliableSequenced,
        UnreliableOrdered
    }
    
    public enum NetworkConnectionState
    {
        Disconnected,
        Connecting,
        Connected,
        Authenticating,
        Authenticated,
        Disconnecting,
        Reconnecting,
        Error
    }
    
    public enum NetworkMessageType
    {
        Connection,
        Disconnection,
        Data,
        RPC,
        Sync,
        Spawn,
        Despawn,
        Authority,
        Ownership,
        Custom
    }
    
    public enum NetworkTopology
    {
        ClientServer,
        PeerToPeer,
        DedicatedServer,
        Listen,
        Mesh
    }
    
    public enum NetworkQualityLevel
    {
        Excellent,
        Good,
        Fair,
        Poor,
        VeryPoor,
        Disconnected
    }
    
    #endregion
    
    #region Network Data Structures
    
    [Serializable]
    public class NetworkMessage
    {
        public int messageId;
        public NetworkMessageType type;
        public int senderId;
        public int targetId;
        public byte[] payload;
        public float timestamp;
        public int sequenceNumber;
        public bool requiresAck;
        public int channelId;
        
        public NetworkMessage()
        {
            messageId = GenerateMessageId();
            timestamp = Time.realtimeSinceStartup;
        }
        
        private static int messageIdCounter = 0;
        private static int GenerateMessageId()
        {
            return ++messageIdCounter;
        }
    }
    
    [Serializable]
    public class NetworkPeer
    {
        public int peerId;
        public string address;
        public int port;
        public NetworkConnectionState connectionState;
        public float lastPingTime;
        public float avgPing;
        public float packetLoss;
        public DateTime connectionTime;
        public Dictionary<string, object> customData;
        
        public NetworkPeer(int id, string addr, int p)
        {
            peerId = id;
            ipAddress = addr;
            port = p;
            customData = new Dictionary<string, object>();
        }
    }

    
    public class NetworkMessage
    {
        public NetworkMessageType type;
        public int senderId;
        public int targetId;
        public byte[] payload;
        public float timestamp;
        public int sequenceNumber;
        public bool requiresAck;
        public int channelId;
        public int priority;
        public bool isCompressed;
        public bool isEncrypted;
        }
        
        public float GetConnectionDuration()
        {
            return (float)(DateTime.Now - connectionTime).TotalSeconds;
        }
    }
    
    [Serializable]
    public class NetworkObject
    {
        public int networkId;
        public int ownerId;
        public string prefabName;
        public Vector3 position;
        public Quaternion rotation;
        public Vector3 scale;
        public bool isActive;
        public Dictionary<string, object> syncData;
        public float lastSyncTime;
        public List<NetworkComponent> components;
        
        public NetworkObject()
        {
            networkId = GenerateNetworkId();
            syncData = new Dictionary<string, object>();
            components = new List<NetworkComponent>();
            scale = Vector3.one;
            rotation = Quaternion.identity;
            position = Vector3.zero;
        }
        
        private static int networkIdCounter = 0;
        private static int GenerateNetworkId()
        {
            return ++networkIdCounter;
        }
    }
    
    [Serializable]
    public class NetworkComponent
    {
        public string componentType;
        public Dictionary<string, object> properties;
        public bool isDirty;
        public float lastUpdateTime;
        
        public NetworkComponent(string type)
        {
            componentType = type;
            properties = new Dictionary<string, object>();
            isDirty = false;
            lastUpdateTime = 0f;
        }
    }
    
    [Serializable]
    public class NetworkStats
    {
        public int packetsSent;
        public int packetsReceived;
        public long bytesSent;
        public long bytesReceived;
        public float avgLatency;
        public float minLatency;
        public float maxLatency;
        public float packetLossRate;
        public int activeConnections;
        public float uptime;
        public DateTime startTime;
        
        public NetworkStats()
        {
            startTime = DateTime.Now;
            Reset();
        }
        
        public void Reset()
        {
            packetsSent = 0;
            packetsReceived = 0;
            bytesSent = 0;
            bytesReceived = 0;
            avgLatency = 0f;
            minLatency = float.MaxValue;
            maxLatency = 0f;
            packetLossRate = 0f;
            activeConnections = 0;
        }
        
        public float GetBandwidthUsage()
        {
            float duration = (float)(DateTime.Now - startTime).TotalSeconds;
            if (duration <= 0) return 0;
            return (bytesSent + bytesReceived) / duration;
        }
    }
    
    [Serializable]
    public class MatchInfo
    {
        public string matchId;
        public string matchName;
        public int currentPlayers;
        public int maxPlayers;
        public bool isPrivate;
        public string hostAddress;
        public int hostPort;
        public Dictionary<string, string> matchProperties;
        public DateTime createdTime;
        public NetworkTopology topology;
        
        public MatchInfo()
        {
            matchId = Guid.NewGuid().ToString();
            matchProperties = new Dictionary<string, string>();
            createdTime = DateTime.Now;
        }
        
        public bool IsFull()
        {
            return currentPlayers >= maxPlayers;
        }
        
        public float GetMatchAge()
        {
            return (float)(DateTime.Now - createdTime).TotalMinutes;
        }
    }
    
    [Serializable]
    public class MatchCriteria
    {
        public int minPlayers;
        public int maxPlayers;
        public string gameMode;
        public string mapName;
        public int maxPing;
        public string region;
        public Dictionary<string, string> customFilters;
        
        public MatchCriteria()
        {
            customFilters = new Dictionary<string, string>();
            minPlayers = 2;
            maxPlayers = 10;
            maxPing = 150;
        }
    }
    
    [Serializable]
    public class MatchSettings
    {
        public string matchName;
        public int maxPlayers;
        public bool isPrivate;
        public string password;
        public string gameMode;
        public string mapName;
        public Dictionary<string, string> customSettings;
        public NetworkTopology topology;
        
        public MatchSettings()
        {
            customSettings = new Dictionary<string, string>();
            maxPlayers = 4;
            isPrivate = false;
            topology = NetworkTopology.ClientServer;
        }
    }
    
    #endregion
    
    #region Core Network Manager
    
    public class NetworkManager : MonoBehaviour
    {
        private static NetworkManager instance;
        public static NetworkManager Instance
        {
            get
            {
                if (instance == null)
                {
                    instance = FindObjectOfType<NetworkManager>();
                    if (instance == null)
                    {
                        GameObject go = new GameObject("NetworkManager");
                        instance = go.AddComponent<NetworkManager>();
                        DontDestroyOnLoad(go);
                    }
                }
                return instance;
            }
        }
        
        [Header("Network Configuration")]
        [SerializeField] private NetworkTransportType transportType = NetworkTransportType.UDP;
        [SerializeField] private NetworkTopology topology = NetworkTopology.ClientServer;
        [SerializeField] private int port = 7777;
        [SerializeField] private string serverAddress = "localhost";
        [SerializeField] private int maxConnections = 100;
        [SerializeField] private float sendRate = 30f;
        [SerializeField] private float tickRate = 60f;
        
        [Header("Network State")]
        [SerializeField] private NetworkConnectionState connectionState;
        [SerializeField] private bool isHost;
        [SerializeField] private bool isServer;
        [SerializeField] private bool isClient;
        [SerializeField] private int localPlayerId;
        
        [Header("Network Components")]
        private INetworkTransport transport;
        private INetworkSerializer serializer;
        private INetworkReliability reliability;
        private INetworkCompression compression;
        private INetworkEncryption encryption;
        private INetworkMatchmaking matchmaking;
        private INetworkStatistics statistics;
        
        [Header("Network Data")]
        private Dictionary<int, NetworkPeer> connectedPeers;
        private Dictionary<int, NetworkObject> networkObjects;
        private Queue<NetworkMessage> incomingMessages;
        private Queue<NetworkMessage> outgoingMessages;
        private List<INetworkMessageHandler> messageHandlers;
        
        [Header("Network Events")]
        public event Action<NetworkPeer> OnPeerConnected;
        public event Action<NetworkPeer> OnPeerDisconnected;
        public event Action<NetworkMessage> OnMessageReceived;
        public event Action<NetworkObject> OnObjectSpawned;
        public event Action<NetworkObject> OnObjectDespawned;
        public event Action<NetworkConnectionState> OnConnectionStateChanged;
        
        private Coroutine networkUpdateCoroutine;
        private Coroutine sendCoroutine;
        private Coroutine receiveCoroutine;
        private float lastSendTime;
        private float lastTickTime;
        
        void Awake()
        {
            if (instance != null && instance != this)
            {
                Destroy(gameObject);
                return;
            }
            
            instance = this;
            DontDestroyOnLoad(gameObject);
            
            InitializeNetworkComponents();
        }
        
        void Start()
        {
            networkUpdateCoroutine = StartCoroutine(NetworkUpdateLoop());
            sendCoroutine = StartCoroutine(SendLoop());
            receiveCoroutine = StartCoroutine(ReceiveLoop());
        }
        
        private void InitializeNetworkComponents()
        {
            connectedPeers = new Dictionary<int, NetworkPeer>();
            networkObjects = new Dictionary<int, NetworkObject>();
            incomingMessages = new Queue<NetworkMessage>();
            outgoingMessages = new Queue<NetworkMessage>();
            messageHandlers = new List<INetworkMessageHandler>();
            
            // Initialize transport based on type
            switch (transportType)
            {
                case NetworkTransportType.TCP:
                    transport = new TcpTransport();
                    break;
                case NetworkTransportType.UDP:
                    transport = new UdpTransport();
                    break;
                case NetworkTransportType.WebSocket:
                    transport = new WebSocketTransport();
                    break;
                default:
                    transport = new UdpTransport();
                    break;
            }
            
            serializer = new BinarySerializer();
            reliability = new ReliabilityLayer();
            compression = new CompressionModule();
            encryption = new EncryptionModule();
            matchmaking = new MatchmakingService();
            statistics = new NetworkStatisticsTracker();
            
            connectionState = NetworkConnectionState.Disconnected;
        }
        
        #region Connection Management
        
        public void StartHost()
        {
            if (connectionState != NetworkConnectionState.Disconnected)
            {
                UnityEngine.Debug.LogFormatWarning("Cannot start host: Already connected");
                return;
            }
            
            isHost = true;
            isServer = true;
            isClient = true;
            
            transport.Initialize(port, "0.0.0.0");
            connectionState = NetworkConnectionState.Connected;
            localPlayerId = 0;
            
            OnConnectionStateChanged?.Invoke(connectionState);
            
            UnityEngine.Debug.LogFormat($"Started host on port {port}");
        }
        
        public void StartServer()
        {
            if (connectionState != NetworkConnectionState.Disconnected)
            {
                UnityEngine.Debug.LogFormatWarning("Cannot start server: Already connected");
                return;
            }
            
            isServer = true;
            isClient = false;
            isHost = false;
            
            transport.Initialize(port, "0.0.0.0");
            connectionState = NetworkConnectionState.Connected;
            
            OnConnectionStateChanged?.Invoke(connectionState);
            
            UnityEngine.Debug.LogFormat($"Started server on port {port}");
        }
        
        public void StartClient()
        {
            if (connectionState != NetworkConnectionState.Disconnected)
            {
                UnityEngine.Debug.LogFormatWarning("Cannot start client: Already connected");
                return;
            }
            
            isClient = true;
            isServer = false;
            isHost = false;
            
            connectionState = NetworkConnectionState.Connecting;
            OnConnectionStateChanged?.Invoke(connectionState);
            
            StartCoroutine(ConnectToServer());
        }
        
        private IEnumerator ConnectToServer()
        {
            transport.Initialize(0, "0.0.0.0");
            transport.Connect(serverAddress, port);
            
            float timeout = 10f;
            float startTime = Time.realtimeSinceStartup;
            
            while (!transport.IsConnected && Time.realtimeSinceStartup - startTime < timeout)
            {
                yield return new WaitForSeconds(0.1f);
            }
            
            if (transport.IsConnected)
            {
                connectionState = NetworkConnectionState.Connected;
                SendConnectionRequest();
            }
            else
            {
                connectionState = NetworkConnectionState.Error;
                UnityEngine.Debug.LogFormatError("Failed to connect to server");
            }
            
            OnConnectionStateChanged?.Invoke(connectionState);
        }
        
        public void Disconnect()
        {
            if (connectionState == NetworkConnectionState.Disconnected)
            {
                return;
            }
            
            connectionState = NetworkConnectionState.Disconnecting;
            OnConnectionStateChanged?.Invoke(connectionState);
            
            // Notify all peers
            if (isServer)
            {
                foreach (var peer in connectedPeers.Values)
                {
                    SendDisconnectionNotice(peer.peerId);
                }
            }
            
            // Clean up
            transport.Disconnect();
            connectedPeers.Clear();
            networkObjects.Clear();
            incomingMessages.Clear();
            outgoingMessages.Clear();
            
            isHost = false;
            isServer = false;
            isClient = false;
            
            connectionState = NetworkConnectionState.Disconnected;
            OnConnectionStateChanged?.Invoke(connectionState);
        }
        
        #endregion
        
        #region Message Handling
        
        public void SendMessage(NetworkMessage message, int targetPeerId = -1)
        {
            if (connectionState != NetworkConnectionState.Connected)
            {
                UnityEngine.Debug.LogFormatWarning("Cannot send message: Not connected");
                return;
            }
            
            message.senderId = localPlayerId;
            message.targetId = targetPeerId;
            
            outgoingMessages.Enqueue(message);
        }
        
        public void SendRPC(string methodName, object[] parameters, int targetPeerId = -1)
        {
            var rpcData = new Dictionary<string, object>
            {
                { "method", methodName },
                { "parameters", parameters }
            };
            
            var message = new NetworkMessage
            {
                type = NetworkMessageType.RPC,
                payload = serializer.Serialize(rpcData)
            };
            
            SendMessage(message, targetPeerId);
        }
        
        public void RegisterMessageHandler(INetworkMessageHandler handler)
        {
            if (!messageHandlers.Contains(handler))
            {
                messageHandlers.Add(handler);
                messageHandlers.Sort((a, b) => b.Priority.CompareTo(a.Priority));
            }
        }
        
        public void UnregisterMessageHandler(INetworkMessageHandler handler)
        {
            messageHandlers.Remove(handler);
        }
        
        private void ProcessIncomingMessages()
        {
            while (incomingMessages.Count > 0)
            {
                var message = incomingMessages.Dequeue();
                
                // Update statistics
                statistics.RecordPacketReceived(message.payload.Length);
                
                // Handle message
                foreach (var handler in messageHandlers)
                {
                    if (handler.CanHandle(message.GetType()))
                    {
                        handler.HandleMessage(message);
                        break;
                    }
                }
                
                OnMessageReceived?.Invoke(message);
                
                // Handle built-in message types
                switch (message.type)
                {
                    case NetworkMessageType.Connection:
                        HandleConnectionMessage(message);
                        break;
                    case NetworkMessageType.Disconnection:
                        HandleDisconnectionMessage(message);
                        break;
                    case NetworkMessageType.Sync:
                        HandleSyncMessage(message);
                        break;
                    case NetworkMessageType.Spawn:
                        HandleSpawnMessage(message);
                        break;
                    case NetworkMessageType.Despawn:
                        HandleDespawnMessage(message);
                        break;
                    case NetworkMessageType.RPC:
                        HandleRPCMessage(message);
                        break;
                }
            }
        }
        
        private void HandleConnectionMessage(NetworkMessage message)
        {
            if (isServer)
            {
                var peer = new NetworkPeer(GeneratePeerId(), "", 0);
                connectedPeers[peer.peerId] = peer;
                
                // Send acceptance
                var response = new NetworkMessage
                {
                    type = NetworkMessageType.Connection,
                    payload = BitConverter.GetBytes(peer.peerId)
                };
                
                SendMessage(response, peer.peerId);
                OnPeerConnected?.Invoke(peer);
            }
        }
        
        private void HandleDisconnectionMessage(NetworkMessage message)
        {
            if (connectedPeers.ContainsKey(message.senderId))
            {
                var peer = connectedPeers[message.senderId];
                connectedPeers.Remove(message.senderId);
                OnPeerDisconnected?.Invoke(peer);
            }
        }
        
        private void HandleSyncMessage(NetworkMessage message)
        {
            var syncData = serializer.Deserialize<Dictionary<int, NetworkObject>>(message.payload);
            
            foreach (var kvp in syncData)
            {
                if (networkObjects.ContainsKey(kvp.Key))
                {
                    UpdateNetworkObject(kvp.Value);
                }
                else
                {
                    SpawnNetworkObject(kvp.Value);
                }
            }
        }
        
        private void HandleSpawnMessage(NetworkMessage message)
        {
            var networkObject = serializer.Deserialize<NetworkObject>(message.payload);
            SpawnNetworkObject(networkObject);
        }
        
        private void HandleDespawnMessage(NetworkMessage message)
        {
            int networkId = BitConverter.ToInt32(message.payload, 0);
            DespawnNetworkObject(networkId);
        }
        
        private void HandleRPCMessage(NetworkMessage message)
        {
            var rpcData = serializer.Deserialize<Dictionary<string, object>>(message.payload);
            string methodName = rpcData["method"] as string;
            object[] parameters = rpcData["parameters"] as object[];
            
            ExecuteRPC(methodName, parameters);
        }
        
        #endregion
        
        #region Network Object Management
        
        public NetworkObject SpawnNetworkObject(string prefabName, Vector3 position, Quaternion rotation, int ownerId = -1)
        {
            if (!isServer && !isHost)
            {
                UnityEngine.Debug.LogFormatWarning("Only server can spawn network objects");
                return null;
            }
            
            var networkObject = new NetworkObject
            {
                prefabName = prefabName,
                position = position,
                rotation = rotation,
                ownerId = ownerId == -1 ? localPlayerId : ownerId
            };
            
            networkObjects[networkObject.networkId] = networkObject;
            
            // Notify all clients
            var message = new NetworkMessage
            {
                type = NetworkMessageType.Spawn,
                payload = serializer.Serialize(networkObject)
            };
            
            SendMessage(message);
            
            OnObjectSpawned?.Invoke(networkObject);
            
            return networkObject;
        }
        
        private void SpawnNetworkObject(NetworkObject networkObject)
        {
            if (networkObjects.ContainsKey(networkObject.networkId))
            {
                return;
            }
            
            networkObjects[networkObject.networkId] = networkObject;
            
            // Instantiate actual GameObject
            GameObject prefab = Resources.Load<GameObject>(networkObject.prefabName);
            if (prefab != null)
            {
                GameObject instance = Instantiate(prefab, networkObject.position, networkObject.rotation);
                instance.name = $"{networkObject.prefabName}_{networkObject.networkId}";
                
                // Add network identity component
                var identity = instance.AddComponent<NetworkIdentity>();
                identity.NetworkId = networkObject.networkId;
                identity.OwnerId = networkObject.ownerId;
            }
            
            OnObjectSpawned?.Invoke(networkObject);
        }
        
        public void DespawnNetworkObject(int networkId)
        {
            if (!isServer && !isHost)
            {
                UnityEngine.Debug.LogFormatWarning("Only server can despawn network objects");
                return;
            }
            
            if (!networkObjects.ContainsKey(networkId))
            {
                return;
            }
            
            var networkObject = networkObjects[networkId];
            networkObjects.Remove(networkId);
            
            // Notify all clients
            var message = new NetworkMessage
            {
                type = NetworkMessageType.Despawn,
                payload = BitConverter.GetBytes(networkId)
            };
            
            SendMessage(message);
            
            // Destroy actual GameObject
            GameObject instance = GameObject.Find($"{networkObject.prefabName}_{networkId}");
            if (instance != null)
            {
                Destroy(instance);
            }
            
            OnObjectDespawned?.Invoke(networkObject);
        }
        
        private void UpdateNetworkObject(NetworkObject networkObject)
        {
            if (!networkObjects.ContainsKey(networkObject.networkId))
            {
                return;
            }
            
            networkObjects[networkObject.networkId] = networkObject;
            
            // Update actual GameObject
            GameObject instance = GameObject.Find($"{networkObject.prefabName}_{networkObject.networkId}");
            if (instance != null)
            {
                instance.transform.position = networkObject.position;
                instance.transform.rotation = networkObject.rotation;
                instance.transform.localScale = networkObject.scale;
                instance.SetActive(networkObject.isActive);
            }
        }
        
        #endregion
        
        #region Network Loops
        
        private IEnumerator NetworkUpdateLoop()
        {
            while (true)
            {
                if (connectionState == NetworkConnectionState.Connected)
                {
                    float deltaTime = Time.realtimeSinceStartup - lastTickTime;
                    
                    if (deltaTime >= 1f / tickRate)
                    {
                        lastTickTime = Time.realtimeSinceStartup;
                        
                        // Process messages
                        ProcessIncomingMessages();
                        
                        // Update network objects
                        if (isServer || isHost)
                        {
                            UpdateNetworkObjects();
                        }
                        
                        // Update statistics
                        UpdateStatistics();
                        
                        // Check connection health
                        CheckConnectionHealth();
                    }
                }
                
                yield return null;
            }
        }
        
        private IEnumerator SendLoop()
        {
            while (true)
            {
                if (connectionState == NetworkConnectionState.Connected)
                {
                    float deltaTime = Time.realtimeSinceStartup - lastSendTime;
                    
                    if (deltaTime >= 1f / sendRate)
                    {
                        lastSendTime = Time.realtimeSinceStartup;
                        
                        // Send queued messages
                        while (outgoingMessages.Count > 0)
                        {
                            var message = outgoingMessages.Dequeue();
                            
                            // Serialize
                            byte[] data = serializer.Serialize(message);
                            
                            // Compress
                            if (compression != null)
                            {
                                data = compression.Compress(data);
                            }
                            
                            // Encrypt
                            if (encryption != null)
                            {
                                byte[] key = encryption.GenerateKey(256);
                                data = encryption.Encrypt(data, key);
                            }
                            
                            // Send
                            if (message.requiresAck)
                            {
                                reliability.SendReliable(data, (success) =>
                                {
                                    if (!success)
                                    {
                                        UnityEngine.Debug.LogFormatWarning("Failed to send reliable message");
                                    }
                                });
                            }
                            else
                            {
                                transport.Send(data, message.channelId);
                            }
                            
                            // Update statistics
                            statistics.RecordPacketSent(data.Length);
                        }
                        
                        // Send sync data
                        if (isServer || isHost)
                        {
                            SendSyncData();
                        }
                    }
        private IEnumerator NetworkUpdateLoop()
        {
            while (true)
            {
                if (connectionState == NetworkConnectionState.Connected)
                {
                    float deltaTime = Time.realtimeSinceStartup - lastTickTime;
                    
                    if (deltaTime >= 1f / tickRate)
                    {
                        lastTickTime = Time.realtimeSinceStartup;
                        
                        // Process messages with performance monitoring
                        var stopwatch = System.Diagnostics.Stopwatch.StartNew();
                        ProcessIncomingMessages();
                        stopwatch.Stop();
                        
                        if (stopwatch.ElapsedMilliseconds > 16)
                        {
                            UnityEngine.Debug.LogFormatWarning($"Message processing took {stopwatch.ElapsedMilliseconds}ms");
                        }
                        
                        // Update network objects
                        if (isServer || isHost)
                        {
                            UpdateNetworkObjects();
                        }
                        
                        // Update statistics
                        UpdateStatistics();
                        
                        // Check connection health
                        CheckConnectionHealth();
                    }
                }
                
                yield return null;
            }
        }
                {
                    byte[] data = transport.Receive();
                    
                    if (data != null && data.Length > 0)
                    {
                        // Decrypt
                        if (encryption != null)
                        {
                            // In real implementation, key would be exchanged
                            byte[] key = encryption.GenerateKey(256);
                            data = encryption.Decrypt(data, key);
                        }
                        
                        // Decompress
                        if (compression != null)
                        {
                            data = compression.Decompress(data);
                        }
                        
                        // Deserialize
                        var message = serializer.Deserialize<NetworkMessage>(data);
                        
                        if (message != null)
                        {
                            incomingMessages.Enqueue(message);
                        }
                    }
                }
                
                yield return null;
            }
        }
        
        #endregion
        
        #region Utility Methods
        
        private void UpdateNetworkObjects()
        {
            foreach (var networkObject in networkObjects.Values)
            {
                // Find corresponding GameObject
                GameObject instance = GameObject.Find($"{networkObject.prefabName}_{networkObject.networkId}");
                
                if (instance != null)
                {
                    // Update network object from GameObject
                    networkObject.position = instance.transform.position;
                    networkObject.rotation = instance.transform.rotation;
                    networkObject.scale = instance.transform.localScale;
                    networkObject.isActive = instance.activeSelf;
                    networkObject.lastSyncTime = Time.realtimeSinceStartup;
                }
            }
        }
        
        private void SendSyncData()
        {
            if (networkObjects.Count == 0) return;
            
            var syncMessage = new NetworkMessage
            {
                type = NetworkMessageType.Sync,
                payload = serializer.Serialize(networkObjects)
            };
            
            SendMessage(syncMessage);
        }
        
        private void UpdateStatistics()
        {
            if (statistics != null)
            {
                var stats = statistics.GetStatistics();
                stats.activeConnections = connectedPeers.Count;
                stats.uptime = Time.realtimeSinceStartup;
            }
        }
        
        private void CheckConnectionHealth()
        {
            List<int> disconnectedPeers = new List<int>();
            
            foreach (var peer in connectedPeers.Values)
            {
                float timeSinceLastPing = Time.realtimeSinceStartup - peer.lastPingTime;
                
                if (timeSinceLastPing > 30f) // 30 second timeout
                {
                    disconnectedPeers.Add(peer.peerId);
                }
            }
            
            foreach (int peerId in disconnectedPeers)
            {
                if (connectedPeers.ContainsKey(peerId))
                {
                    var peer = connectedPeers[peerId];
                    connectedPeers.Remove(peerId);
                    OnPeerDisconnected?.Invoke(peer);
                }
            }
            }
        
        private void SendConnectionRequest()
        {
            var message = new NetworkMessage
            {
                type = NetworkMessageType.Connection,
                payload = new byte[0]
            };
            
            SendMessage(message, 0);
        }
        
        private void SendDisconnectionNotice(int peerId)
        {
            var message = new NetworkMessage
            {
                type = NetworkMessageType.Disconnection,
                payload = new byte[0]
            };
            
            SendMessage(message, peerId);
        }
        
        private void ExecuteRPC(string methodName, object[] parameters)
        {
            // Find all NetworkBehaviours and invoke method
            var networkBehaviours = FindObjectsOfType<NetworkBehaviour>();
            
            foreach (var behaviour in networkBehaviours)
            {
                var method = behaviour.GetType().GetMethod(methodName);
                if (method != null)
                {
                    method.Invoke(behaviour, parameters);
                }
            }
        }


        
        private static int peerIdCounter = 1;
        private int GeneratePeerId()
        {
            return peerIdCounter++;
        }
        
        #endregion
        
        #region Public API
        
        public bool IsConnected => connectionState == NetworkConnectionState.Connected;
        public NetworkConnectionState ConnectionState => connectionState;
        public int LocalPlayerId => localPlayerId;
        public bool IsHost => isHost;
        public bool IsServer => isServer;
        public bool IsClient => isClient;
        
        public List<NetworkPeer> GetConnectedPeers()
        {
            return new List<NetworkPeer>(connectedPeers.Values);
        }
        
        public NetworkPeer GetPeer(int peerId)
        {
            return connectedPeers.ContainsKey(peerId) ? connectedPeers[peerId] : null;
        }
        
        public NetworkObject GetNetworkObject(int networkId)
        {
            return networkObjects.ContainsKey(networkId) ? networkObjects[networkId] : null;
        }
        
        public List<NetworkObject> GetAllNetworkObjects()
        {
            return new List<NetworkObject>(networkObjects.Values);
        }
        
        public NetworkStats GetStatistics()
        {
            return statistics?.GetStatistics();
        }
        
        public void SetTransportType(NetworkTransportType type)
        {
            if (connectionState != NetworkConnectionState.Disconnected)
            {
                UnityEngine.Debug.LogFormatWarning("Cannot change transport type while connected");
                return;
            }
            
            transportType = type;
            InitializeNetworkComponents();
        }
        
        public void SetTopology(NetworkTopology topo)
        {
            if (connectionState != NetworkConnectionState.Disconnected)
            {
                UnityEngine.Debug.LogFormatWarning("Cannot change topology while connected");
                return;
            }
            
            topology = topo;
        }
        
        #endregion
        
        void OnDestroy()
        {
            if (networkUpdateCoroutine != null)
            {
                StopCoroutine(networkUpdateCoroutine);
            }
            
            if (sendCoroutine != null)
            {
                StopCoroutine(sendCoroutine);
            }
            
            if (receiveCoroutine != null)
            {
                StopCoroutine(receiveCoroutine);
            }
            
            Disconnect();
        }
        
        void OnApplicationPause(bool pauseStatus)
        {
            if (pauseStatus && connectionState == NetworkConnectionState.Connected)
            {
                // Handle pause
            }
        }
        
        void OnApplicationQuit()
        {
            Disconnect();
        }
    }
    
    #endregion
    
    #region Transport Implementations
    
    public class TcpTransport : INetworkTransport
    {
        private TcpListener listener;
        private TcpClient client;
        private NetworkStream stream;
        private bool isConnected;
        
        public bool IsConnected => isConnected;
        public NetworkTransportType TransportType => NetworkTransportType.TCP;
        
        public void Initialize(int port, string address)
        {
            if (port > 0)
            {
                listener = new TcpListener(IPAddress.Any, port);
                listener.Start();
                Task.Run(() => AcceptClients());
            }
        }
        
        public void Connect(string remoteAddress, int remotePort)
        {
            try
            {
                client = new TcpClient();
                client.Connect(remoteAddress, remotePort);
                stream = client.GetStream();
                isConnected = true;
            }
            catch (Exception e)
            {
                UnityEngine.Debug.LogFormatError($"TCP connection failed: {e.Message}");
                isConnected = false;
            }
        }
        
        public void Disconnect()
        {
            isConnected = false;
            stream?.Close();
            client?.Close();
            listener?.Stop();
        }
        
        public void Send(byte[] data, int channelId)
        {
            if (!isConnected || stream == null) return;
            
            try
            {
                stream.Write(data, 0, data.Length);
            }
            catch (Exception e)
            {
                UnityEngine.Debug.LogFormatError($"TCP send failed: {e.Message}");
            }
        }
        
        public byte[] Receive()
        {
            if (!isConnected || stream == null) return null;
            
            try
            {
                if (stream.DataAvailable)
                {
                    byte[] buffer = new byte[1024];
                    int bytesRead = stream.Read(buffer, 0, buffer.Length);
                    
                    if (bytesRead > 0)
                    {
                        byte[] data = new byte[bytesRead];
                        Array.Copy(buffer, data, bytesRead);
                        return data;
                    }
                }
            }
            catch (Exception e)
            {
                UnityEngine.Debug.LogFormatError($"TCP receive failed: {e.Message}");
            }
            
            return null;
        }
        
        private async void AcceptClients()
        {
            while (listener != null)
            {
                try
                {
                    TcpClient newClient = await listener.AcceptTcpClientAsync();
                    // Handle new client connection
                    HandleNewClient(newClient);
                }
                catch (Exception e)
                {
                    UnityEngine.Debug.LogFormatError($"TCP accept failed: {e.Message}");
                }
            }
        }
        
        private void HandleNewClient(TcpClient newClient)
        {
            // Implementation for handling new client connections
            UnityEngine.Debug.LogFormat($"New TCP client connected: {newClient.Client.RemoteEndPoint}");
        }
    }
    
    public class UdpTransport : INetworkTransport
    {
        private UdpClient udpClient;
        private IPEndPoint remoteEndPoint;
        private bool isConnected;
        
        public bool IsConnected => isConnected;
        public NetworkTransportType TransportType => NetworkTransportType.UDP;
        
        public void Initialize(int port, string address)
        {
            udpClient = new UdpClient(port);
            isConnected = true;
        }
        
        public void Connect(string remoteAddress, int remotePort)
        {
            remoteEndPoint = new IPEndPoint(IPAddress.Parse(remoteAddress), remotePort);
            isConnected = true;
        }
        
        public void Disconnect()
        {
            isConnected = false;
            udpClient?.Close();
        }
        
        public void Send(byte[] data, int channelId)
        {
            if (!isConnected || udpClient == null) return;
            
            try
            {
                if (remoteEndPoint != null)
                {
                    udpClient.Send(data, data.Length, remoteEndPoint);
                }
            }
            catch (Exception e)
            {
                UnityEngine.Debug.LogFormatError($"UDP send failed: {e.Message}");
            }
        }
        
        public byte[] Receive()
        {
            if (!isConnected || udpClient == null) return null;
            
            try
            {
                if (udpClient.Available > 0)
                {
                    IPEndPoint sender = new IPEndPoint(IPAddress.Any, 0);
                    byte[] data = udpClient.Receive(ref sender);
                    return data;
                }
            }
            catch (Exception e)
            {
                UnityEngine.Debug.LogFormatError($"UDP receive failed: {e.Message}");
            }
            
            return null;
        }
    }
    
    public class WebSocketTransport : INetworkTransport
    {
        private bool isConnected;
        
        public bool IsConnected => isConnected;
        public NetworkTransportType TransportType => NetworkTransportType.WebSocket;
        
        public void Initialize(int port, string address)
        {
            // WebSocket initialization
            Debug.Log("WebSocket transport initialized");
        }
        
        public void Connect(string remoteAddress, int remotePort)
        {
            // WebSocket connection
            Debug.Log($"Connecting to WebSocket server: {remoteAddress}:{remotePort}");
            isConnected = true;
        }
        
        public void Disconnect()
        {
            isConnected = false;
            Debug.Log("WebSocket disconnected");
        }
        
        public void Send(byte[] data, int channelId)
        {
            if (!isConnected) return;
            // WebSocket send implementation
        }
        
        public byte[] Receive()
        {
            if (!isConnected) return null;
            // WebSocket receive implementation
            return null;
        }
    }
    
    #endregion
    
    #region Utility Classes
    
    public class BinarySerializer : INetworkSerializer
    {
        public byte[] Serialize<T>(T obj) where T : class
        {
            if (obj == null) return new byte[0];
            
            string json = JsonUtility.ToJson(obj);
            return Encoding.UTF8.GetBytes(json);
        }
        
        public T Deserialize<T>(byte[] data) where T : class
        {
            if (data == null || data.Length == 0) return null;
            
            string json = Encoding.UTF8.GetString(data);
            return JsonUtility.FromJson<T>(json);
        }
        
        public int GetSerializedSize<T>(T obj) where T : class
        {
            return Serialize(obj).Length;
        }
    }
    
    public class ReliabilityLayer : INetworkReliability
    {
        private Dictionary<int, PendingMessage> pendingMessages;
        private int sequenceNumber;
        private float packetLoss;
        private List<float> pingHistory;
        
        private class PendingMessage
        {
            public byte[] data;
            public float sentTime;
            public int retryCount;
            public Action<bool> callback;
        }
        
        public ReliabilityLayer()
        {
            pendingMessages = new Dictionary<int, PendingMessage>();
            pingHistory = new List<float>();
            sequenceNumber = 0;
        }
        
        public void SendReliable(byte[] data, Action<bool> onComplete)
        {
            int seq = sequenceNumber++;
            
            pendingMessages[seq] = new PendingMessage
            {
                data = data,
                sentTime = Time.realtimeSinceStartup,
                retryCount = 0,
                callback = onComplete
            };
            
            // Send with sequence number
            // Implementation would include sequence number in packet
        }
        
        public void SendUnreliable(byte[] data)
        {
            // Send without reliability guarantees
        }
        
        public void ProcessAcknowledgements()
        {
            List<int> toRemove = new List<int>();
            
            foreach (var kvp in pendingMessages)
            {
                float elapsed = Time.realtimeSinceStartup - kvp.Value.sentTime;
                
                if (elapsed > 5f) // 5 second timeout
                {
                    kvp.Value.callback?.Invoke(false);
                    toRemove.Add(kvp.Key);
                }
                else if (elapsed > 1f && kvp.Value.retryCount < 3)
                {
                    // Retry
                    kvp.Value.retryCount++;
                    kvp.Value.sentTime = Time.realtimeSinceStartup;
                }
            }
            
            foreach (int seq in toRemove)
            {
                pendingMessages.Remove(seq);
            }
        }
        
        public float GetPacketLoss()
        {
            return packetLoss;
        }
        
        public int GetPing()
        {
            if (pingHistory.Count == 0) return 0;
            return (int)(pingHistory.Average() * 1000);
        }
    }
    
    public class CompressionModule : INetworkCompression
    {
        public byte[] Compress(byte[] data)
        {
            // Simple RLE compression implementation
            List<byte> compressed = new List<byte>();
            
            for (int i = 0; i < data.Length; i++)
            {
                byte current = data[i];
                int count = 1;
                
                while (i + 1 < data.Length && data[i + 1] == current && count < 255)
                {
                    count++;
                    i++;
                }
                
                compressed.Add((byte)count);
                compressed.Add(current);
            }
            
            return compressed.ToArray();
        }
        
        public byte[] Decompress(byte[] data)
        {
            List<byte> decompressed = new List<byte>();
            
            for (int i = 0; i < data.Length; i += 2)
            {
                if (i + 1 < data.Length)
                {
                    int count = data[i];
                    byte value = data[i + 1];
                    
                    for (int j = 0; j < count; j++)
                    {
                        decompressed.Add(value);
                    }
                }
            }
            
            return decompressed.ToArray();
        }
        
        public float GetCompressionRatio()
        {
            // Calculate average compression ratio
            return 0.7f; // Placeholder
        }
    }
    
    public class EncryptionModule : INetworkEncryption
    {
        public byte[] Encrypt(byte[] data, byte[] key)
        {
            // Simple XOR encryption (not secure, just for demonstration)
            byte[] encrypted = new byte[data.Length];
            
            for (int i = 0; i < data.Length; i++)
            {
                encrypted[i] = (byte)(data[i] ^ key[i % key.Length]);
            }
            
            return encrypted;
        }
        
        public byte[] Decrypt(byte[] data, byte[] key)
        {
            // XOR is symmetric
            return Encrypt(data, key);
        }
        
        public byte[] GenerateKey(int keySize)
        {
            byte[] key = new byte[keySize / 8];
            System.Random random = new System.Random();
            random.NextBytes(key);
            return key;
        }
        
        public bool ValidateIntegrity(byte[] data, byte[] signature)
        {
            // Simple checksum validation
            int checksum = 0;
            foreach (byte b in data)
            {
                checksum += b;
            }
            
            int expectedChecksum = BitConverter.ToInt32(signature, 0);
            return checksum == expectedChecksum;
        }
    }
    
    public class MatchmakingService : INetworkMatchmaking
    {
        private List<MatchInfo> availableMatches;
        private MatchInfo currentMatch;
        
        public MatchmakingService()
        {
            availableMatches = new List<MatchInfo>();
        }
        
        public async Task<MatchInfo> FindMatch(MatchCriteria criteria)
        {
            // Simulate matchmaking delay
            await Task.Delay(UnityEngine.Random.Range(1000, 3000));
            
            // Find suitable match
            var match = availableMatches.FirstOrDefault(m =>
                m.currentPlayers >= criteria.minPlayers &&
                m.currentPlayers < criteria.maxPlayers &&
                (string.IsNullOrEmpty(criteria.gameMode) || m.matchProperties["gameMode"] == criteria.gameMode)
            );
            
            if (match == null)
            {
                // Create new match
                match = await CreateMatch(new MatchSettings
                {
                    matchName = "Auto Match",
                    maxPlayers = criteria.maxPlayers,
                    gameMode = criteria.gameMode
                });
            }
            
            return match;
        }
        
        public async Task<bool> CreateMatch(MatchSettings settings)
        {
            await Task.Delay(500);
            
            var match = new MatchInfo
            {
                matchName = settings.matchName,
                maxPlayers = settings.maxPlayers,
                currentPlayers = 1,
                isPrivate = settings.isPrivate,
                topology = settings.topology
            };
            
            foreach (var kvp in settings.customSettings)
            {
                match.matchProperties[kvp.Key] = kvp.Value;
            }
            
            availableMatches.Add(match);
            currentMatch = match;
            
            return true;
        }
        
        public async Task<bool> JoinMatch(string matchId)
        {
            await Task.Delay(500);
            
            var match = availableMatches.FirstOrDefault(m => m.matchId == matchId);
            
            if (match != null && !match.IsFull())
            {
                match.currentPlayers++;
                currentMatch = match;
                return true;
            }
            
            return false;
        }
        
        public async Task LeaveMatch()
        {
            await Task.Delay(100);
            
            if (currentMatch != null)
            {
                currentMatch.currentPlayers--;
                
                if (currentMatch.currentPlayers <= 0)
                {
                    availableMatches.Remove(currentMatch);
                }
                
                currentMatch = null;
            }
        }
        
        public async Task<List<MatchInfo>> GetAvailableMatches()
        {
            await Task.Delay(200);
            return new List<MatchInfo>(availableMatches);
        }
    }
    
    public class NetworkStatisticsTracker : INetworkStatistics
    {
        private NetworkStats stats;
        
        public NetworkStatisticsTracker()
        {
            stats = new NetworkStats();
        }
        
        public void RecordPacketSent(int size)
        {
            stats.packetsSent++;
            stats.bytesSent += size;
        }
        
        public void RecordPacketReceived(int size)
        {
            stats.packetsReceived++;
            stats.bytesReceived += size;
        }
        
        public void RecordLatency(float latency)
        {
            stats.avgLatency = (stats.avgLatency + latency) / 2f;
            stats.minLatency = Mathf.Min(stats.minLatency, latency);
            stats.maxLatency = Mathf.Max(stats.maxLatency, latency);
        }
        
        public NetworkStats GetStatistics()
        {
            return stats;
        }
        
        public void ResetStatistics()
        {
            stats.Reset();
        }
    }
    
    #endregion
    
    #region Network Components
    
    public class NetworkIdentity : MonoBehaviour
    {
        [SerializeField] private int networkId;
        [SerializeField] private int ownerId;
        [SerializeField] private bool isLocalPlayer;
        [SerializeField] private bool hasAuthority;
        
        public int NetworkId
        {
            get => networkId;
            set => networkId = value;
        }
        
        public int OwnerId
        {
            get => ownerId;
            set => ownerId = value;
        }
        
        public bool IsLocalPlayer => isLocalPlayer;
        public bool HasAuthority => hasAuthority;
        
        void Start()
        {
            var networkManager = NetworkManager.Instance;
            
            if (networkManager != null)
            {
                isLocalPlayer = ownerId == networkManager.LocalPlayerId;
                hasAuthority = isLocalPlayer || networkManager.IsServer;
            }
        }
    }
    
    public class NetworkBehaviour : MonoBehaviour
    {
        private NetworkIdentity identity;
        
        protected NetworkIdentity Identity
        {
            get
            {
                if (identity == null)
                {
                    identity = GetComponent<NetworkIdentity>();
                }
                return identity;
            }
        }
        
        protected bool IsLocalPlayer => Identity != null && Identity.IsLocalPlayer;
        protected bool HasAuthority => Identity != null && Identity.HasAuthority;
        protected bool IsServer => NetworkManager.Instance?.IsServer ?? false;
        protected bool IsClient => NetworkManager.Instance?.IsClient ?? false;
        
        protected virtual void Start()
        {
            if (!Identity)
            {
                Debug.LogError($"NetworkBehaviour requires NetworkIdentity on {gameObject.name}");
            }
        }
        
        protected void SendRPC(string methodName, params object[] parameters)
        {
            NetworkManager.Instance?.SendRPC(methodName, parameters);
        }
        
        protected void SendRPCToTarget(string methodName, int targetId, params object[] parameters)
        {
            NetworkManager.Instance?.SendRPC(methodName, parameters, targetId);
        }
    }
    
    public class NetworkTransform : NetworkBehaviour
    {
        [Header("Sync Settings")]
        [SerializeField] private bool syncPosition = true;
        [SerializeField] private bool syncRotation = true;
        [SerializeField] private bool syncScale = false;
        
        [Header("Interpolation")]
        [SerializeField] private float lerpRate = 15f;
        [SerializeField] private float positionThreshold = 0.1f;
        [SerializeField] private float rotationThreshold = 1f;
        
        private Vector3 targetPosition;
        private Quaternion targetRotation;
        private Vector3 targetScale;
        
        private Vector3 lastSentPosition;
        private Quaternion lastSentRotation;
        private Vector3 lastSentScale;
        
        protected override void Start()
        {
            base.Start();
            
            targetPosition = transform.position;
            targetRotation = transform.rotation;
            targetScale = transform.localScale;
            
            lastSentPosition = transform.position;
            lastSentRotation = transform.rotation;
            lastSentScale = transform.localScale;
        }
        
        void Update()
        {
            if (HasAuthority)
            {
                SendTransformData();
            }
            else
            {
                InterpolateTransform();
            }
        }
        
        private void SendTransformData()
        {
            bool needsUpdate = false;
            
            if (syncPosition && Vector3.Distance(transform.position, lastSentPosition) > positionThreshold)
            {
                needsUpdate = true;
                lastSentPosition = transform.position;
            }
            
            if (syncRotation && Quaternion.Angle(transform.rotation, lastSentRotation) > rotationThreshold)
            {
                needsUpdate = true;
                lastSentRotation = transform.rotation;
            }
            
            if (syncScale && transform.localScale != lastSentScale)
            {
                needsUpdate = true;
                lastSentScale = transform.localScale;
            }
            
            if (needsUpdate)
            {
                SendRPC("UpdateTransform", transform.position, transform.rotation, transform.localScale);
            }
        }
        
        private void InterpolateTransform()
        {
            if (syncPosition)
            {
                transform.position = Vector3.Lerp(transform.position, targetPosition, lerpRate * Time.deltaTime);
            }
            
            if (syncRotation)
            {
                transform.rotation = Quaternion.Lerp(transform.rotation, targetRotation, lerpRate * Time.deltaTime);
            }
            
            if (syncScale)
            {
                transform.localScale = Vector3.Lerp(transform.localScale, targetScale, lerpRate * Time.deltaTime);
            }
        }
        
        [RPC]
        public void UpdateTransform(Vector3 position, Quaternion rotation, Vector3 scale)
        {
            if (!HasAuthority)
            {
                targetPosition = position;
                targetRotation = rotation;
                targetScale = scale;
            }
        }
    }
    
    #endregion
    
    #region RPC Attribute
    
    [AttributeUsage(AttributeTargets.Method)]
    public class RPCAttribute : Attribute
    {
        public NetworkChannelType Channel { get; set; }
        public bool RequiresAuthority { get; set; }
        
        public RPCAttribute()
        {
            Channel = NetworkChannelType.Reliable;
            RequiresAuthority = false;
        }
    }
    
    #endregion
}