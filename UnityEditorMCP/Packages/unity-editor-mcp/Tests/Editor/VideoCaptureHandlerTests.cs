using System.Collections;
using System.IO;
using Newtonsoft.Json.Linq;
using NUnit.Framework;
using UnityEditorMCP.Handlers;
using UnityEngine.TestTools;

namespace UnityEditorMCP.Tests.Editor
{
    public class VideoCaptureHandlerTests
    {
        [UnityTest]
        public IEnumerator PngSequence_StartStatusStop_GeneratesFiles()
        {
            string dir = "Assets/Screenshots/test_recording";
            if (Directory.Exists(dir)) Directory.Delete(dir, true);

            var startParams = new JObject
            {
                ["format"] = "png_sequence",
                ["outputPath"] = dir,
                ["fps"] = 2,
                ["captureMode"] = "game"
            };

            var start = VideoCaptureHandler.Start(startParams) as dynamic;
            Assert.IsNotNull(start);

            // wait a few frames to allow captures
            for (int i = 0; i < 5; i++)
                yield return null;

            var status = VideoCaptureHandler.Status(null) as dynamic;
            Assert.IsNotNull(status);

            var stop = VideoCaptureHandler.Stop(null) as dynamic;
            Assert.IsNotNull(stop);

            Assert.IsTrue(Directory.Exists(dir), "Output directory must exist");
            var files = Directory.Exists(dir) ? Directory.GetFiles(dir, "*.png", SearchOption.TopDirectoryOnly) : new string[0];
            Assert.GreaterOrEqual(files.Length, 1, "At least one PNG should be captured");
        }
    }
}

