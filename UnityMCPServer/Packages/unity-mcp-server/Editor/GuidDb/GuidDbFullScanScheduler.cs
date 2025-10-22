// SPDX-License-Identifier: UNLICENSED
using System;
using System.Collections.Generic;
using System.Linq;
using UnityEditor;
using UnityEngine;

namespace UnityMCPServer.GuidDb
{
    internal interface IGuidDbUpdatePump
    {
        void Register(Action tick);
        void Unregister(Action tick);
    }

    internal sealed class GuidDbFullScanOptions
    {
        public Func<IEnumerable<string>> AssetPathProvider { get; set; }
        public Func<string, string> AssetPathToGuid { get; set; }
        public Func<string, bool> IsValidFolder { get; set; }
        public Func<Dictionary<string, LedgerRecord>> LoadLedger { get; set; }
        public Action<Dictionary<string, LedgerRecord>> SaveLedger { get; set; }
        public Func<string> NowIsoProvider { get; set; } = JsonLines.IsoNowUtc;
        public int BatchSize { get; set; } = 64;
        public Action<float> OnProgress { get; set; }
        public Action OnCompleted { get; set; }
        public IGuidDbUpdatePump UpdatePump { get; set; }
        public Func<string, MonoScript> ScriptLoader { get; set; }
        public Action<string> Logger { get; set; }
    }

    internal static class GuidDbFullScanScheduler
    {
        private const int DefaultBatchSize = 64;

        private sealed class EditorApplicationUpdatePump : IGuidDbUpdatePump
        {
            public static readonly EditorApplicationUpdatePump Instance = new EditorApplicationUpdatePump();

            private readonly Dictionary<Action, EditorApplication.CallbackFunction> _wrappers = new Dictionary<Action, EditorApplication.CallbackFunction>();
            private readonly object _lock = new object();

            private EditorApplicationUpdatePump() { }

            public void Register(Action tick)
            {
                if (tick == null) return;
                lock (_lock)
                {
                    if (_wrappers.ContainsKey(tick)) return;
                    EditorApplication.CallbackFunction wrapper = () => tick();
                    _wrappers[tick] = wrapper;
                    EditorApplication.update += wrapper;
                }
            }

            public void Unregister(Action tick)
            {
                if (tick == null) return;
                lock (_lock)
                {
                    if (_wrappers.TryGetValue(tick, out var wrapper))
                    {
                        EditorApplication.update -= wrapper;
                        _wrappers.Remove(tick);
                    }
                }
            }
        }

        private sealed class State
        {
            private readonly GuidDbFullScanOptions _options;
            private readonly Dictionary<string, LedgerRecord> _ledger;
            private readonly string[] _assetPaths;
            private readonly string _timestampUtc;
            private readonly Action _tickDelegate;
            private readonly List<Action> _completionHandlers = new List<Action>();
            private readonly List<Action<float>> _progressHandlers = new List<Action<float>>();

            private int _index;
            private bool _completed;

            internal State(GuidDbFullScanOptions options)
            {
                _options = options ?? throw new ArgumentNullException(nameof(options));
                _ledger = _options.LoadLedger?.Invoke() ?? new Dictionary<string, LedgerRecord>();
                _timestampUtc = _options.NowIsoProvider?.Invoke() ?? JsonLines.IsoNowUtc();

                var assets = _options.AssetPathProvider?.Invoke() ?? Enumerable.Empty<string>();
                Func<string, bool> folderChecker = _options.IsValidFolder ?? AssetDatabase.IsValidFolder;

                _assetPaths = assets
                    .Where(p => !string.IsNullOrEmpty(p) && p.StartsWith("Assets/", StringComparison.Ordinal))
                    .Where(p => !folderChecker(p))
                    .Distinct(StringComparer.Ordinal)
                    .ToArray();

                if (_options.OnCompleted != null) _completionHandlers.Add(_options.OnCompleted);
                if (_options.OnProgress != null) _progressHandlers.Add(_options.OnProgress);

                _tickDelegate = Tick;
            }

            internal void AttachCallbacks(Action onCompleted, Action<float> onProgress)
            {
                if (onCompleted != null) _completionHandlers.Add(onCompleted);
                if (onProgress != null) _progressHandlers.Add(onProgress);
            }

            internal void Start()
            {
                if (_assetPaths.Length == 0)
                {
                    EmitProgress(1f);
                    Complete();
                    return;
                }

                _options.Logger?.Invoke($"[GuidDB] Async full scan started ({_assetPaths.Length} assets).");
                _options.UpdatePump.Register(_tickDelegate);
            }

            internal void Cancel()
            {
                _options.UpdatePump.Unregister(_tickDelegate);
                _completed = true;
            }

            private void Tick()
            {
                if (_completed) return;

                var batchSize = Math.Max(1, _options.BatchSize > 0 ? _options.BatchSize : DefaultBatchSize);
                var max = Math.Min(_index + batchSize, _assetPaths.Length);
                for (var i = _index; i < max; i++)
                {
                    var path = _assetPaths[i];
                    try
                    {
                        GuidDbManager.UpsertImported(
                            _ledger,
                            path,
                            _timestampUtc,
                            _options.AssetPathToGuid,
                            _options.IsValidFolder,
                            _options.ScriptLoader);
                    }
                    catch (Exception ex)
                    {
                        _options.Logger?.Invoke($"[GuidDB] Full scan processing error for '{path}': {ex}");
                    }
                }

                _index = max;
                EmitProgress(_assetPaths.Length == 0 ? 1f : (float)_index / _assetPaths.Length);

                if (_index >= _assetPaths.Length)
                {
                    Complete();
                }
            }

            private void Complete()
            {
                if (_completed) return;
                _completed = true;

                _options.UpdatePump.Unregister(_tickDelegate);

                try
                {
                    _options.SaveLedger?.Invoke(_ledger);
                }
                catch (Exception ex)
                {
                    _options.Logger?.Invoke($"[GuidDB] Full scan save error: {ex}");
                }

                GuidDbFullScanScheduler.OnStateCompleted(this);

                foreach (var handler in _completionHandlers)
                {
                    try { handler?.Invoke(); }
                    catch (Exception ex) { _options.Logger?.Invoke($"[GuidDB] Full scan completion handler error: {ex}"); }
                }

                _options.Logger?.Invoke("[GuidDB] Async full scan finished.");
            }

            private void EmitProgress(float value)
            {
                foreach (var handler in _progressHandlers)
                {
                    try { handler?.Invoke(Mathf.Clamp01(value)); }
                    catch (Exception ex) { _options.Logger?.Invoke($"[GuidDB] Full scan progress handler error: {ex}"); }
                }
            }
        }

        private static readonly object _gate = new object();
        private static State _state;

        internal static bool IsRunning
        {
            get
            {
                lock (_gate) return _state != null;
            }
        }

        internal static bool ScheduleFullScan(GuidDbFullScanOptions options)
        {
            options ??= new GuidDbFullScanOptions();

            lock (_gate)
            {
                if (_state != null)
                {
                    _state.AttachCallbacks(options.OnCompleted, options.OnProgress);
                    return false;
                }
            }

            PopulateDefaults(options);

            var state = new State(options);

            lock (_gate)
            {
                if (_state != null)
                {
                    // Another state may have been created between locks; attach callbacks and exit.
                    _state.AttachCallbacks(options.OnCompleted, options.OnProgress);
                    return false;
                }

                _state = state;
            }

            state.Start();
            return true;
        }

        internal static void ResetForTests()
        {
            lock (_gate)
            {
                if (_state != null)
                {
                    _state.Cancel();
                    _state = null;
                }
            }
        }

        private static void PopulateDefaults(GuidDbFullScanOptions options)
        {
            options.AssetPathProvider ??= AssetDatabase.GetAllAssetPaths;
            options.AssetPathToGuid ??= AssetDatabase.AssetPathToGUID;
            options.IsValidFolder ??= AssetDatabase.IsValidFolder;
            options.LoadLedger ??= GuidDbManager.LoadLedger;
            options.SaveLedger ??= GuidDbManager.SaveLedger;
            options.NowIsoProvider ??= JsonLines.IsoNowUtc;
            options.ScriptLoader ??= path => AssetDatabase.LoadAssetAtPath<MonoScript>(path);
            options.UpdatePump ??= EditorApplicationUpdatePump.Instance;
            options.Logger ??= message => Debug.Log(message);
            if (options.BatchSize <= 0) options.BatchSize = DefaultBatchSize;
        }

        private static void OnStateCompleted(State state)
        {
            lock (_gate)
            {
                if (ReferenceEquals(_state, state))
                {
                    _state = null;
                }
            }
        }
    }
}
