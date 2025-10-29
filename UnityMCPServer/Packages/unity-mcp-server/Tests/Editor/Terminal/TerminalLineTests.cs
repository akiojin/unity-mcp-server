using NUnit.Framework;
using UnityEngine;
using System;

namespace UnityMCPServer.Editor.Terminal.Tests
{
    [TestFixture]
    public class TerminalLineTests
    {
        [Test]
        public void TerminalLine_ShouldCreateWithBasicProperties()
        {
            // Arrange & Act
            var line = new TerminalLine("test output", isError: false);

            // Assert
            Assert.AreEqual("test output", line.Text);
            Assert.IsFalse(line.IsError);
            Assert.IsNotNull(line.Timestamp);
            Assert.AreEqual(Color.white, line.AnsiColor);
        }

        [Test]
        public void TerminalLine_ShouldCreateWithErrorFlag()
        {
            // Arrange & Act
            var line = new TerminalLine("error message", isError: true);

            // Assert
            Assert.AreEqual("error message", line.Text);
            Assert.IsTrue(line.IsError);
        }

        [Test]
        public void TerminalLine_ShouldCreateWithEmptyText()
        {
            // Arrange & Act
            var line = new TerminalLine("", isError: false);

            // Assert
            Assert.AreEqual("", line.Text);
            Assert.IsFalse(line.IsError);
        }

        [Test]
        public void TerminalLine_ShouldCreateWithNullText()
        {
            // Arrange & Act
            var line = new TerminalLine(null, isError: false);

            // Assert
            Assert.IsNull(line.Text);
            Assert.IsFalse(line.IsError);
        }

        [Test]
        public void TerminalLine_ShouldAcceptAnsiColor()
        {
            // Arrange & Act
            var line = new TerminalLine("colored text", isError: false, ansiColor: Color.red);

            // Assert
            Assert.AreEqual("colored text", line.Text);
            Assert.AreEqual(Color.red, line.AnsiColor);
        }

        [Test]
        public void TerminalLine_ShouldSetTimestampToCurrentTime()
        {
            // Arrange
            var beforeCreation = DateTime.UtcNow;

            // Act
            var line = new TerminalLine("test", isError: false);

            // Assert
            var afterCreation = DateTime.UtcNow;
            Assert.GreaterOrEqual(line.Timestamp, beforeCreation);
            Assert.LessOrEqual(line.Timestamp, afterCreation);
        }

        [Test]
        public void TerminalLine_ShouldDefaultToWhiteColor()
        {
            // Arrange & Act
            var line = new TerminalLine("test", isError: false);

            // Assert
            Assert.AreEqual(Color.white, line.AnsiColor);
        }

        [Test]
        public void TerminalLine_ShouldHandleSpecialCharacters()
        {
            // Arrange
            var textWithSpecialChars = "Hello\tWorld\n日本語\r\nテスト";

            // Act
            var line = new TerminalLine(textWithSpecialChars, isError: false);

            // Assert
            Assert.AreEqual(textWithSpecialChars, line.Text);
        }
    }
}
