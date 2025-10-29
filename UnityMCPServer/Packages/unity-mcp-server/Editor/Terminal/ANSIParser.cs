using System;
using System.Collections.Generic;
using System.Text.RegularExpressions;
using UnityEngine;

namespace UnityMCPServer.Editor.Terminal
{
    /// <summary>
    /// Parses ANSI escape codes (basic 8 colors only)
    /// Implements ANSI parsing strategy from research.md
    /// </summary>
    public static class ANSIParser
    {
        // Basic 8 colors (foreground codes 30-37)
        private static readonly Dictionary<int, Color> ColorMap = new Dictionary<int, Color>
        {
            {30, Color.black},
            {31, Color.red},
            {32, Color.green},
            {33, Color.yellow},
            {34, Color.blue},
            {35, Color.magenta},
            {36, Color.cyan},
            {37, Color.white}
        };

        /// <summary>
        /// Parses ANSI escape codes and extracts text and color
        /// </summary>
        /// <param name="input">Text with ANSI escape codes</param>
        /// <returns>Tuple of (clean text, color)</returns>
        public static (string text, Color color) Parse(string input)
        {
            if (input == null)
                return (null, Color.white);

            if (input == "")
                return ("", Color.white);

            // Regex to match ANSI escape codes: \x1B[{code}m or \e[{code}m
            var regex = new Regex(@"\x1B\[(\d+)(?:;\d+)*m");

            // Find first color code
            Color detectedColor = Color.white;
            var match = regex.Match(input);

            if (match.Success)
            {
                int code = int.Parse(match.Groups[1].Value);

                if (ColorMap.ContainsKey(code))
                {
                    detectedColor = ColorMap[code];
                }
            }

            // Remove all ANSI escape codes
            var cleanText = regex.Replace(input, "");

            return (cleanText, detectedColor);
        }

        /// <summary>
        /// Strips all ANSI escape codes from text
        /// </summary>
        /// <param name="input">Text with ANSI escape codes</param>
        /// <returns>Clean text without ANSI codes</returns>
        public static string Strip(string input)
        {
            if (string.IsNullOrEmpty(input))
                return input;

            var regex = new Regex(@"\x1B\[(\d+)(?:;\d+)*m");
            return regex.Replace(input, "");
        }
    }
}
