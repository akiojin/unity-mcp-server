using System;
using UnityEngine;

namespace BitpurrDigital
{
    public static class ColorUtilities
    {
        // Convert Unity Color to hex string
        public static string ToHex(Color color, bool showAlpha = false)
        {
            var color32 = (Color32)color;

            if (showAlpha)
            {
                return $"#{color32.r:X2}{color32.g:X2}{color32.b:X2}{color32.a:X2}";
            }
            
            return $"#{color32.r:X2}{color32.g:X2}{color32.b:X2}";
        }

        // Convert hex string to Unity Color
        public static Color FromHex(string hex)
        {
            // Remove # if present
            hex = hex.Replace("#", "");

            // Parse RGBA
            if (hex.Length == 8)
            {
                var r = byte.Parse(hex.Substring(0, 2), System.Globalization.NumberStyles.HexNumber);
                var g = byte.Parse(hex.Substring(2, 2), System.Globalization.NumberStyles.HexNumber);
                var b = byte.Parse(hex.Substring(4, 2), System.Globalization.NumberStyles.HexNumber);
                var a = byte.Parse(hex.Substring(6, 2), System.Globalization.NumberStyles.HexNumber);
                return new Color32(r, g, b, a);
            }
            // Parse RGB (assume full alpha)
            else if (hex.Length == 6)
            {
                var r = byte.Parse(hex[..2], System.Globalization.NumberStyles.HexNumber);
                var g = byte.Parse(hex.Substring(2, 2), System.Globalization.NumberStyles.HexNumber);
                var b = byte.Parse(hex.Substring(4, 2), System.Globalization.NumberStyles.HexNumber);
                return new Color32(r, g, b, 255);
            }

            throw new ArgumentException("Invalid hex color format");
        }
    }
}