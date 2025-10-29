using NUnit.Framework;
using UnityEngine;
using System.Collections.Generic;
using System.Linq;

namespace UnityMCPServer.Editor.Terminal.Tests
{
    [TestFixture]
    public class TerminalOutputBufferTests
    {
        [Test]
        public void TerminalOutputBuffer_ShouldCreateWithDefaultMaxLines()
        {
            // Arrange & Act
            var buffer = new TerminalOutputBuffer();

            // Assert
            Assert.AreEqual(1000, buffer.MaxLines);
            Assert.AreEqual(0, buffer.GetLines(100).Count);
        }

        [Test]
        public void TerminalOutputBuffer_ShouldCreateWithCustomMaxLines()
        {
            // Arrange & Act
            var buffer = new TerminalOutputBuffer(maxLines: 500);

            // Assert
            Assert.AreEqual(500, buffer.MaxLines);
        }

        [Test]
        public void TerminalOutputBuffer_ShouldAddLine()
        {
            // Arrange
            var buffer = new TerminalOutputBuffer();

            // Act
            buffer.Add("test line", isError: false);

            // Assert
            var lines = buffer.GetLines(100);
            Assert.AreEqual(1, lines.Count);
            Assert.AreEqual("test line", lines[0].Text);
            Assert.IsFalse(lines[0].IsError);
        }

        [Test]
        public void TerminalOutputBuffer_ShouldAddMultipleLines()
        {
            // Arrange
            var buffer = new TerminalOutputBuffer();

            // Act
            buffer.Add("line 1", isError: false);
            buffer.Add("line 2", isError: true);
            buffer.Add("line 3", isError: false);

            // Assert
            var lines = buffer.GetLines(100);
            Assert.AreEqual(3, lines.Count);
            Assert.AreEqual("line 1", lines[0].Text);
            Assert.AreEqual("line 2", lines[1].Text);
            Assert.AreEqual("line 3", lines[2].Text);
            Assert.IsTrue(lines[1].IsError);
        }

        [Test]
        public void TerminalOutputBuffer_ShouldRemoveOldestLineWhenMaxLinesExceeded()
        {
            // Arrange
            var buffer = new TerminalOutputBuffer(maxLines: 3);

            // Act
            buffer.Add("line 1", isError: false);
            buffer.Add("line 2", isError: false);
            buffer.Add("line 3", isError: false);
            buffer.Add("line 4", isError: false); // Should remove "line 1"

            // Assert
            var lines = buffer.GetLines(100);
            Assert.AreEqual(3, lines.Count);
            Assert.AreEqual("line 2", lines[0].Text);
            Assert.AreEqual("line 3", lines[1].Text);
            Assert.AreEqual("line 4", lines[2].Text);
        }

        [Test]
        public void TerminalOutputBuffer_GetLinesShouldRespectMaxLinesParameter()
        {
            // Arrange
            var buffer = new TerminalOutputBuffer();
            buffer.Add("line 1", isError: false);
            buffer.Add("line 2", isError: false);
            buffer.Add("line 3", isError: false);
            buffer.Add("line 4", isError: false);
            buffer.Add("line 5", isError: false);

            // Act
            var lines = buffer.GetLines(maxLines: 3);

            // Assert
            Assert.AreEqual(3, lines.Count);
            Assert.AreEqual("line 3", lines[0].Text); // Latest 3 lines
            Assert.AreEqual("line 4", lines[1].Text);
            Assert.AreEqual("line 5", lines[2].Text);
        }

        [Test]
        public void TerminalOutputBuffer_GetLinesShouldReturnAllWhenMaxLinesExceedsBufferSize()
        {
            // Arrange
            var buffer = new TerminalOutputBuffer();
            buffer.Add("line 1", isError: false);
            buffer.Add("line 2", isError: false);

            // Act
            var lines = buffer.GetLines(maxLines: 100);

            // Assert
            Assert.AreEqual(2, lines.Count);
        }

        [Test]
        public void TerminalOutputBuffer_ClearShouldRemoveAllLines()
        {
            // Arrange
            var buffer = new TerminalOutputBuffer();
            buffer.Add("line 1", isError: false);
            buffer.Add("line 2", isError: false);
            buffer.Add("line 3", isError: false);

            // Act
            buffer.Clear();

            // Assert
            var lines = buffer.GetLines(100);
            Assert.AreEqual(0, lines.Count);
        }

        [Test]
        public void TerminalOutputBuffer_ShouldHandleNullText()
        {
            // Arrange
            var buffer = new TerminalOutputBuffer();

            // Act
            buffer.Add(null, isError: false);

            // Assert
            var lines = buffer.GetLines(100);
            Assert.AreEqual(1, lines.Count);
            Assert.IsNull(lines[0].Text);
        }

        [Test]
        public void TerminalOutputBuffer_ShouldHandleEmptyText()
        {
            // Arrange
            var buffer = new TerminalOutputBuffer();

            // Act
            buffer.Add("", isError: false);

            // Assert
            var lines = buffer.GetLines(100);
            Assert.AreEqual(1, lines.Count);
            Assert.AreEqual("", lines[0].Text);
        }

        [Test]
        public void TerminalOutputBuffer_ShouldEnforceMinMaxLines()
        {
            // Arrange & Act & Assert
            Assert.Throws<System.ArgumentOutOfRangeException>(() => {
                new TerminalOutputBuffer(maxLines: 50); // Below minimum 100
            });
        }

        [Test]
        public void TerminalOutputBuffer_ShouldEnforceMaxMaxLines()
        {
            // Arrange & Act & Assert
            Assert.Throws<System.ArgumentOutOfRangeException>(() => {
                new TerminalOutputBuffer(maxLines: 15000); // Above maximum 10000
            });
        }

        [Test]
        public void TerminalOutputBuffer_ShouldPreserveLineOrder()
        {
            // Arrange
            var buffer = new TerminalOutputBuffer();

            // Act
            for (int i = 0; i < 10; i++)
            {
                buffer.Add($"line {i}", isError: false);
            }

            // Assert
            var lines = buffer.GetLines(100);
            for (int i = 0; i < 10; i++)
            {
                Assert.AreEqual($"line {i}", lines[i].Text);
            }
        }
    }
}
