using NUnit.Framework;

namespace UnityMCPServer.Editor.Terminal.Tests
{
    [TestFixture]
    public class WSLPathConverterTests
    {
        [Test]
        public void WSLPathConverter_ShouldConvertSimpleWindowsPath()
        {
            // Arrange
            var windowsPath = @"C:\Users\username\project";

            // Act
            var wslPath = WSLPathConverter.ToWSLPath(windowsPath);

            // Assert
            Assert.AreEqual("/mnt/c/Users/username/project", wslPath);
        }

        [Test]
        public void WSLPathConverter_ShouldConvertPathWithSpaces()
        {
            // Arrange
            var windowsPath = @"C:\Program Files\My Project\file.txt";

            // Act
            var wslPath = WSLPathConverter.ToWSLPath(windowsPath);

            // Assert
            Assert.AreEqual("/mnt/c/Program Files/My Project/file.txt", wslPath);
        }

        [Test]
        public void WSLPathConverter_ShouldConvertPathWithJapanese()
        {
            // Arrange
            var windowsPath = @"C:\ユーザー\プロジェクト\ファイル.txt";

            // Act
            var wslPath = WSLPathConverter.ToWSLPath(windowsPath);

            // Assert
            Assert.AreEqual("/mnt/c/ユーザー/プロジェクト/ファイル.txt", wslPath);
        }

        [Test]
        public void WSLPathConverter_ShouldConvertDifferentDriveLetters()
        {
            // Arrange & Act & Assert
            Assert.AreEqual("/mnt/d/folder", WSLPathConverter.ToWSLPath(@"D:\folder"));
            Assert.AreEqual("/mnt/e/data", WSLPathConverter.ToWSLPath(@"E:\data"));
            Assert.AreEqual("/mnt/z/backup", WSLPathConverter.ToWSLPath(@"Z:\backup"));
        }

        [Test]
        public void WSLPathConverter_ShouldConvertMixedCase()
        {
            // Arrange
            var windowsPath = @"C:\MixedCase\FolderName\File.TXT";

            // Act
            var wslPath = WSLPathConverter.ToWSLPath(windowsPath);

            // Assert
            Assert.AreEqual("/mnt/c/MixedCase/FolderName/File.TXT", wslPath);
        }

        [Test]
        public void WSLPathConverter_ShouldHandleForwardSlashesInInput()
        {
            // Arrange
            var windowsPath = @"C:/Users/username/project";

            // Act
            var wslPath = WSLPathConverter.ToWSLPath(windowsPath);

            // Assert
            Assert.AreEqual("/mnt/c/Users/username/project", wslPath);
        }

        [Test]
        public void WSLPathConverter_ShouldHandleTrailingBackslash()
        {
            // Arrange
            var windowsPath = @"C:\Users\username\project\";

            // Act
            var wslPath = WSLPathConverter.ToWSLPath(windowsPath);

            // Assert
            Assert.AreEqual("/mnt/c/Users/username/project/", wslPath);
        }

        [Test]
        public void WSLPathConverter_ShouldReturnNullForNullInput()
        {
            // Arrange & Act
            var wslPath = WSLPathConverter.ToWSLPath(null);

            // Assert
            Assert.IsNull(wslPath);
        }

        [Test]
        public void WSLPathConverter_ShouldReturnEmptyForEmptyInput()
        {
            // Arrange & Act
            var wslPath = WSLPathConverter.ToWSLPath("");

            // Assert
            Assert.AreEqual("", wslPath);
        }

        [Test]
        public void WSLPathConverter_ShouldThrowForUNCPath()
        {
            // Arrange
            var uncPath = @"\\server\share\folder";

            // Act & Assert
            Assert.Throws<System.ArgumentException>(() =>
            {
                WSLPathConverter.ToWSLPath(uncPath);
            });
        }

        [Test]
        public void WSLPathConverter_ShouldThrowForInvalidPath()
        {
            // Arrange
            var invalidPath = @"InvalidPath";

            // Act & Assert
            Assert.Throws<System.ArgumentException>(() =>
            {
                WSLPathConverter.ToWSLPath(invalidPath);
            });
        }

        [Test]
        public void WSLPathConverter_ShouldConvertPathWithSpecialCharacters()
        {
            // Arrange
            var windowsPath = @"C:\Users\test-user_123\project@2024\file#1.txt";

            // Act
            var wslPath = WSLPathConverter.ToWSLPath(windowsPath);

            // Assert
            Assert.AreEqual("/mnt/c/Users/test-user_123/project@2024/file#1.txt", wslPath);
        }
    }
}
