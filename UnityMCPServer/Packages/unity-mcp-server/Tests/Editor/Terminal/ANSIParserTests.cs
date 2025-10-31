using NUnit.Framework;
using UnityEngine;

namespace UnityMCPServer.Editor.Terminal.Tests
{
    [TestFixture]
    public class ANSIParserTests
    {
        [Test]
        public void ANSIParser_ShouldParseBasicColors()
        {
            // Black (30)
            var (text, color) = ANSIParser.Parse("\x1B[30mblack text\x1B[0m");
            Assert.AreEqual("black text", text);
            Assert.AreEqual(Color.black, color);

            // Red (31)
            (text, color) = ANSIParser.Parse("\x1B[31mred text\x1B[0m");
            Assert.AreEqual("red text", text);
            Assert.AreEqual(Color.red, color);

            // Green (32)
            (text, color) = ANSIParser.Parse("\x1B[32mgreen text\x1B[0m");
            Assert.AreEqual("green text", text);
            Assert.AreEqual(Color.green, color);

            // Yellow (33)
            (text, color) = ANSIParser.Parse("\x1B[33myellow text\x1B[0m");
            Assert.AreEqual("yellow text", text);
            Assert.AreEqual(Color.yellow, color);

            // Blue (34)
            (text, color) = ANSIParser.Parse("\x1B[34mblue text\x1B[0m");
            Assert.AreEqual("blue text", text);
            Assert.AreEqual(Color.blue, color);

            // Magenta (35)
            (text, color) = ANSIParser.Parse("\x1B[35mmagenta text\x1B[0m");
            Assert.AreEqual("magenta text", text);
            Assert.AreEqual(Color.magenta, color);

            // Cyan (36)
            (text, color) = ANSIParser.Parse("\x1B[36mcyan text\x1B[0m");
            Assert.AreEqual("cyan text", text);
            Assert.AreEqual(Color.cyan, color);

            // White (37)
            (text, color) = ANSIParser.Parse("\x1B[37mwhite text\x1B[0m");
            Assert.AreEqual("white text", text);
            Assert.AreEqual(Color.white, color);
        }

        [Test]
        public void ANSIParser_ShouldReturnWhiteForNoColorCode()
        {
            // Arrange & Act
            var (text, color) = ANSIParser.Parse("plain text");

            // Assert
            Assert.AreEqual("plain text", text);
            Assert.AreEqual(Color.white, color);
        }

        [Test]
        public void ANSIParser_ShouldStripANSICodes()
        {
            // Arrange
            var input = "\x1B[31mRed\x1B[0m Normal \x1B[32mGreen\x1B[0m";

            // Act
            var (text, color) = ANSIParser.Parse(input);

            // Assert
            Assert.AreEqual("Red Normal Green", text);
        }

        [Test]
        public void ANSIParser_ShouldHandleMultipleColorCodes()
        {
            // Arrange
            var input = "\x1B[31m\x1B[1mBold Red\x1B[0m";

            // Act
            var (text, color) = ANSIParser.Parse(input);

            // Assert
            // Should extract first color code (31)
            Assert.AreEqual("Bold Red", text);
            Assert.AreEqual(Color.red, color);
        }

        [Test]
        public void ANSIParser_ShouldHandleUnsupportedCodes()
        {
            // Arrange (256 color code - not supported)
            var input = "\x1B[38;5;226mYellow 256\x1B[0m";

            // Act
            var (text, color) = ANSIParser.Parse(input);

            // Assert
            Assert.AreEqual("Yellow 256", text);
            Assert.AreEqual(Color.white, color); // Default to white for unsupported
        }

        [Test]
        public void ANSIParser_ShouldHandleEmptyString()
        {
            // Arrange & Act
            var (text, color) = ANSIParser.Parse("");

            // Assert
            Assert.AreEqual("", text);
            Assert.AreEqual(Color.white, color);
        }

        [Test]
        public void ANSIParser_ShouldHandleNullString()
        {
            // Arrange & Act
            var (text, color) = ANSIParser.Parse(null);

            // Assert
            Assert.IsNull(text);
            Assert.AreEqual(Color.white, color);
        }

        [Test]
        public void ANSIParser_ShouldPreserveTextWithoutCodes()
        {
            // Arrange
            var input = "No color codes here!";

            // Act
            var (text, color) = ANSIParser.Parse(input);

            // Assert
            Assert.AreEqual("No color codes here!", text);
            Assert.AreEqual(Color.white, color);
        }

        [Test]
        public void ANSIParser_ShouldHandleResetCode()
        {
            // Arrange
            var input = "\x1B[31mRed\x1B[0m\x1B[32mGreen\x1B[0m";

            // Act
            var (text, color) = ANSIParser.Parse(input);

            // Assert
            // Should extract first color
            Assert.AreEqual("RedGreen", text);
            Assert.AreEqual(Color.red, color);
        }

        [Test]
        public void ANSIParser_ShouldHandleJapaneseText()
        {
            // Arrange
            var input = "\x1B[31m日本語テキスト\x1B[0m";

            // Act
            var (text, color) = ANSIParser.Parse(input);

            // Assert
            Assert.AreEqual("日本語テキスト", text);
            Assert.AreEqual(Color.red, color);
        }
    }
}
