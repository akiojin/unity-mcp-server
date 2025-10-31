using NUnit.Framework;
using System.IO;

namespace UnityMCPServer.Editor.Terminal.Tests
{
    [TestFixture]
    public class PathResolverTests
    {
        [Test]
        public void PathResolver_ShouldResolveWorkspaceRoot()
        {
            // Arrange & Act
            var workspaceRoot = PathResolver.GetWorkspaceRoot();

            // Assert
            Assert.IsNotNull(workspaceRoot);
            Assert.IsNotEmpty(workspaceRoot);
            Assert.IsTrue(Directory.Exists(workspaceRoot), $"Workspace root should exist: {workspaceRoot}");
        }

        [Test]
        public void PathResolver_ShouldResolveProjectRoot()
        {
            // Arrange & Act
            var projectRoot = PathResolver.GetProjectRoot();

            // Assert
            Assert.IsNotNull(projectRoot);
            Assert.IsNotEmpty(projectRoot);
            Assert.IsTrue(Directory.Exists(projectRoot), $"Project root should exist: {projectRoot}");
        }

        [Test]
        public void PathResolver_ShouldResolveWorkingDirectoryForWorkspace()
        {
            // Arrange & Act
            var workingDir = PathResolver.ResolveWorkingDirectory("workspace");

            // Assert
            Assert.IsNotNull(workingDir);
            Assert.IsTrue(Directory.Exists(workingDir), $"Workspace directory should exist: {workingDir}");
        }

        [Test]
        public void PathResolver_ShouldResolveWorkingDirectoryForProject()
        {
            // Arrange & Act
            var workingDir = PathResolver.ResolveWorkingDirectory("project");

            // Assert
            Assert.IsNotNull(workingDir);
            Assert.IsTrue(Directory.Exists(workingDir), $"Project directory should exist: {workingDir}");
        }

        [Test]
        public void PathResolver_ShouldThrowForInvalidWorkingDirectoryType()
        {
            // Arrange & Act & Assert
            Assert.Throws<System.ArgumentException>(() =>
            {
                PathResolver.ResolveWorkingDirectory("invalid");
            });
        }

        [Test]
        public void PathResolver_WorkspaceRootShouldBeAbsolutePath()
        {
            // Arrange & Act
            var workspaceRoot = PathResolver.GetWorkspaceRoot();

            // Assert
            Assert.IsTrue(Path.IsPathRooted(workspaceRoot), "Workspace root should be absolute path");
        }

        [Test]
        public void PathResolver_ProjectRootShouldBeAbsolutePath()
        {
            // Arrange & Act
            var projectRoot = PathResolver.GetProjectRoot();

            // Assert
            Assert.IsTrue(Path.IsPathRooted(projectRoot), "Project root should be absolute path");
        }

        [Test]
        public void PathResolver_ProjectRootShouldContainAssets()
        {
            // Arrange
            var projectRoot = PathResolver.GetProjectRoot();

            // Act
            var assetsPath = Path.Combine(projectRoot, "Assets");

            // Assert
            Assert.IsTrue(Directory.Exists(assetsPath), $"Project root should contain Assets folder: {assetsPath}");
        }
    }
}
