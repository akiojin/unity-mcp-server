using System;
using System.Collections.Generic;
using System.Linq;
using UnityEngine;

namespace UnityMCPServer.Editor.Terminal
{
    /// <summary>
    /// Thread-safe buffer for terminal output lines
    /// Implements FIFO with maximum line limit
    /// </summary>
    public class TerminalOutputBuffer
    {
        private readonly List<TerminalLine> _lines;
        private readonly object _lock = new object();

        /// <summary>
        /// Maximum number of lines to retain (100-10000)
        /// </summary>
        public int MaxLines { get; private set; }

        /// <summary>
        /// Creates a new output buffer
        /// </summary>
        /// <param name="maxLines">Maximum lines to retain (default: 1000)</param>
        public TerminalOutputBuffer(int maxLines = 1000)
        {
            if (maxLines < 100 || maxLines > 10000)
            {
                throw new ArgumentOutOfRangeException(nameof(maxLines), "MaxLines must be between 100 and 10000");
            }

            MaxLines = maxLines;
            _lines = new List<TerminalLine>();
        }

        /// <summary>
        /// Adds a new line to the buffer
        /// Removes oldest line if MaxLines is exceeded (FIFO)
        /// Thread-safe
        /// </summary>
        /// <param name="text">Output text (can be null for empty lines)</param>
        /// <param name="isError">True if from stderr</param>
        /// <param name="ansiColor">ANSI color (optional)</param>
        public void Add(string text, bool isError, Color? ansiColor = null)
        {
            lock (_lock)
            {
                var line = new TerminalLine(text, isError, ansiColor);
                _lines.Add(line);

                // FIFO: remove oldest line if exceeded
                if (_lines.Count > MaxLines)
                {
                    _lines.RemoveAt(0);
                }
            }
        }

        /// <summary>
        /// Gets the latest N lines from the buffer
        /// Thread-safe
        /// </summary>
        /// <param name="maxLines">Maximum number of lines to return</param>
        /// <returns>List of latest lines (oldest first)</returns>
        public List<TerminalLine> GetLines(int maxLines)
        {
            lock (_lock)
            {
                if (_lines.Count == 0)
                {
                    return new List<TerminalLine>();
                }

                // Return latest N lines
                int startIndex = Math.Max(0, _lines.Count - maxLines);
                int count = Math.Min(maxLines, _lines.Count);

                return _lines.GetRange(startIndex, count);
            }
        }

        /// <summary>
        /// Clears all lines from the buffer
        /// Thread-safe
        /// </summary>
        public void Clear()
        {
            lock (_lock)
            {
                _lines.Clear();
            }
        }

        /// <summary>
        /// Gets the total number of lines currently in the buffer
        /// Thread-safe
        /// </summary>
        public int Count
        {
            get
            {
                lock (_lock)
                {
                    return _lines.Count;
                }
            }
        }

        /// <summary>
        /// Checks if there are more lines beyond the requested maxLines
        /// </summary>
        /// <param name="requestedMaxLines">Number of lines requested</param>
        /// <returns>True if buffer has more lines than requested</returns>
        public bool HasMore(int requestedMaxLines)
        {
            lock (_lock)
            {
                return _lines.Count > requestedMaxLines;
            }
        }
    }
}
