using System;
using System.Collections.Generic;
using System.Linq;
using UnityEngine;

namespace UnityMCPServer.Editor.Terminal
{
    /// <summary>
    /// Manages all terminal sessions
    /// Provides centralized session lifecycle management
    /// </summary>
    public static class TerminalSessionManager
    {
        private static readonly Dictionary<string, TerminalSession> _sessions = new Dictionary<string, TerminalSession>();
        private static readonly object _lock = new object();

        /// <summary>
        /// Creates a new terminal session
        /// </summary>
        /// <param name="sessionId">Unique session ID</param>
        /// <param name="workingDirectory">Initial working directory</param>
        /// <param name="shellType">Shell type</param>
        /// <param name="shellPath">Shell executable path</param>
        /// <returns>Created terminal session</returns>
        /// <exception cref="InvalidOperationException">Thrown if session ID already exists</exception>
        public static TerminalSession CreateSession(string sessionId, string workingDirectory, string shellType, string shellPath)
        {
            lock (_lock)
            {
                if (_sessions.ContainsKey(sessionId))
                {
                    throw new InvalidOperationException($"Terminal session with ID '{sessionId}' already exists");
                }

                var session = new TerminalSession(sessionId, workingDirectory, shellType, shellPath);
                _sessions[sessionId] = session;

                Debug.Log($"[TerminalSessionManager] Created session {sessionId}. Total sessions: {_sessions.Count}");

                return session;
            }
        }

        /// <summary>
        /// Gets a terminal session by ID
        /// </summary>
        /// <param name="sessionId">Session ID to retrieve</param>
        /// <returns>Terminal session or null if not found</returns>
        public static TerminalSession GetSession(string sessionId)
        {
            lock (_lock)
            {
                if (_sessions.TryGetValue(sessionId, out var session))
                {
                    return session;
                }

                return null;
            }
        }

        /// <summary>
        /// Closes and removes a terminal session
        /// </summary>
        /// <param name="sessionId">Session ID to close</param>
        public static void CloseSession(string sessionId)
        {
            lock (_lock)
            {
                if (_sessions.TryGetValue(sessionId, out var session))
                {
                    session.Close();
                    _sessions.Remove(sessionId);

                    Debug.Log($"[TerminalSessionManager] Closed session {sessionId}. Total sessions: {_sessions.Count}");
                }
                else
                {
                    Debug.LogWarning($"[TerminalSessionManager] Attempted to close non-existent session {sessionId}");
                }
            }
        }

        /// <summary>
        /// Gets all active terminal sessions
        /// </summary>
        /// <returns>List of all sessions</returns>
        public static List<TerminalSession> GetAllSessions()
        {
            lock (_lock)
            {
                return _sessions.Values.ToList();
            }
        }

        /// <summary>
        /// Closes all active terminal sessions
        /// Useful for cleanup on Unity Editor restart
        /// </summary>
        public static void CloseAllSessions()
        {
            lock (_lock)
            {
                var sessionIds = _sessions.Keys.ToList();

                foreach (var sessionId in sessionIds)
                {
                    var session = _sessions[sessionId];
                    session.Close();
                }

                _sessions.Clear();

                Debug.Log($"[TerminalSessionManager] Closed all sessions");
            }
        }

        /// <summary>
        /// Gets the number of active sessions
        /// </summary>
        public static int SessionCount
        {
            get
            {
                lock (_lock)
                {
                    return _sessions.Count;
                }
            }
        }

        /// <summary>
        /// Checks if a session exists
        /// </summary>
        /// <param name="sessionId">Session ID to check</param>
        /// <returns>True if session exists</returns>
        public static bool HasSession(string sessionId)
        {
            lock (_lock)
            {
                return _sessions.ContainsKey(sessionId);
            }
        }
    }
}
