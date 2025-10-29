using System;
using UnityEngine;

namespace UnityMCPServer.Editor.Terminal
{
    /// <summary>
    /// Represents a single line of terminal output
    /// </summary>
    public class TerminalLine
    {
        /// <summary>
        /// Output text (can be null for empty lines)
        /// </summary>
        public string Text { get; set; }

        /// <summary>
        /// True if this line came from stderr
        /// </summary>
        public bool IsError { get; set; }

        /// <summary>
        /// UTC timestamp when the line was output
        /// </summary>
        public DateTime Timestamp { get; set; }

        /// <summary>
        /// ANSI color code (basic 8 colors only)
        /// </summary>
        public Color AnsiColor { get; set; }

        /// <summary>
        /// Creates a new terminal line
        /// </summary>
        /// <param name="text">Output text</param>
        /// <param name="isError">True if from stderr</param>
        /// <param name="ansiColor">ANSI color (default: white)</param>
        public TerminalLine(string text, bool isError, Color? ansiColor = null)
        {
            Text = text;
            IsError = isError;
            Timestamp = DateTime.UtcNow;
            AnsiColor = ansiColor ?? Color.white;
        }
    }
}
