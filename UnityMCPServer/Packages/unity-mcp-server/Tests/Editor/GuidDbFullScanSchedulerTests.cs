// SPDX-License-Identifier: UNLICENSED
using System;
using System.Collections.Generic;
using System.Linq;
using NUnit.Framework;
using UnityMCPServer.GuidDb;

namespace UnityMCPServer.Tests.GuidDb
{
    public class GuidDbFullScanSchedulerTests
    {
        private sealed class TestUpdatePump : IGuidDbUpdatePump
        {
            private Action _tick;

            public void Register(Action tick)
            {
                _tick += tick;
            }

            public void Unregister(Action tick)
            {
                _tick -= tick;
            }

            public void Tick()
            {
                _tick?.Invoke();
            }

            public bool HasSubscribers => _tick != null;
        }

        [SetUp]
        public void SetUp()
        {
            GuidDbFullScanScheduler.ResetForTests();
        }

        [TearDown]
        public void TearDown()
        {
            GuidDbFullScanScheduler.ResetForTests();
        }

        [Test]
        public void ScheduleFullScan_ProcessesAssetsInBatchesAndSavesOnce()
        {
            var pump = new TestUpdatePump();
            var ledger = new Dictionary<string, LedgerRecord>();
            Dictionary<string, LedgerRecord> savedLedger = null;
            var progressLog = new List<float>();
            var completedLog = new List<bool>();

            var options = new GuidDbFullScanOptions
            {
                AssetPathProvider = () => new[]
                {
                    "Assets/A.prefab",
                    "Assets/B.cs",
                    "Packages/ignore.asset",
                    "Assets/Sub/C.mat"
                },
                AssetPathToGuid = path => path switch
                {
                    "Assets/A.prefab" => "guid-a",
                    "Assets/B.cs" => "guid-b",
                    "Assets/Sub/C.mat" => "guid-c",
                    _ => null
                },
                IsValidFolder = path => string.Equals(path, "Assets/Sub", StringComparison.Ordinal),
                LoadLedger = () => ledger,
                SaveLedger = dict => savedLedger = new Dictionary<string, LedgerRecord>(dict),
                NowIsoProvider = () => "2024-01-01T00:00:00Z",
                UpdatePump = pump,
                BatchSize = 1,
                ScriptLoader = _ => null,
                OnProgress = p => progressLog.Add(p),
                OnCompleted = () => completedLog.Add(true)
            };

            var scheduled = GuidDbFullScanScheduler.ScheduleFullScan(options);

            Assert.IsTrue(scheduled);
            Assert.AreEqual(0, progressLog.Count);
            Assert.IsNull(savedLedger);
            Assert.AreEqual(0, ledger.Count);
            Assert.AreEqual(0, completedLog.Count);

            pump.Tick(); // first asset
            Assert.AreEqual(1, ledger.Count);
            Assert.False(ledger["guid-a"].alive == false);
            Assert.IsNull(savedLedger);
            Assert.AreEqual(1, progressLog.Count);
            Assert.AreEqual(0, completedLog.Count);

            pump.Tick(); // second asset, third is skipped
            Assert.AreEqual(2, ledger.Count);
            Assert.AreEqual(0, completedLog.Count);

            pump.Tick(); // third asset processed (Assets/Sub/C.mat)
            Assert.AreEqual(3, ledger.Count);
            Assert.AreEqual(1, completedLog.Count);
            Assert.NotNull(savedLedger);
            Assert.That(savedLedger.Keys, Is.EquivalentTo(new[] { "guid-a", "guid-b", "guid-c" }));
            Assert.AreEqual(3, progressLog.Count);
            Assert.AreEqual(1f, progressLog.Last());
        }

        [Test]
        public void ScheduleFullScan_DeduplicatesConcurrentRequests()
        {
            var pump = new TestUpdatePump();
            var ledger = new Dictionary<string, LedgerRecord>();
            var completionFlags = new List<string>();
            var saveCount = 0;

            var firstOptions = new GuidDbFullScanOptions
            {
                AssetPathProvider = () => new[] { "Assets/A.prefab" },
                AssetPathToGuid = _ => "guid-a",
                LoadLedger = () => ledger,
                SaveLedger = _ => saveCount++,
                BatchSize = 1,
                UpdatePump = pump,
                ScriptLoader = _ => null,
                OnCompleted = () => completionFlags.Add("first")
            };

            Assert.IsTrue(GuidDbFullScanScheduler.ScheduleFullScan(firstOptions));

            var secondOptions = new GuidDbFullScanOptions
            {
                UpdatePump = pump,
                OnCompleted = () => completionFlags.Add("second")
            };

            Assert.IsFalse(GuidDbFullScanScheduler.ScheduleFullScan(secondOptions));

            pump.Tick();

            CollectionAssert.AreEquivalent(new[] { "first", "second" }, completionFlags);
            Assert.AreEqual(1, saveCount);
        }
    }
}
