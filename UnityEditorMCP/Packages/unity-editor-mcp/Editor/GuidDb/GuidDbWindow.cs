// SPDX-License-Identifier: UNLICENSED
using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Text;
using UnityEditor;
using UnityEngine;

namespace UnityEditorMCP.GuidDb
{
    public class GuidDbExplorerWindow : EditorWindow
    {
        private string _query = string.Empty;
        private Vector2 _scroll;
        private int _typeFilterIndex = 0;
        private int _aliveFilterIndex = 0;
        private List<LedgerRecord> _all = new List<LedgerRecord>();
        private List<LedgerRecord> _filtered = new List<LedgerRecord>();
        private readonly string[] _typeOptions = new[] { "All", "Script", "Prefab", "Scene", "Material", "Texture", "Animation", "AnimatorController", "Folder", "Other" };
        private readonly string[] _aliveOptions = new[] { "All", "Alive", "Deleted" };

        // For repair action per GUID
        private readonly Dictionary<string, UnityEngine.Object> _replacement = new Dictionary<string, UnityEngine.Object>();
        private readonly HashSet<string> _busy = new HashSet<string>();

        [MenuItem("Window/Unity Editor MCP/Guid DB/Explorer")]
        public static void Open()
        {
            var win = GetWindow<GuidDbExplorerWindow>("GUID DB Explorer");
            win.minSize = new Vector2(800, 360);
            win.Focus();
        }

        private void OnEnable()
        {
            Reload();
        }

        private void Reload()
        {
            try
            {
                GuidDbPaths.EnsureDirs();
                _all.Clear();
                var ledger = GuidDbPaths.LedgerPath();
                if (File.Exists(ledger))
                {
                    foreach (var line in File.ReadAllLines(ledger))
                    {
                        if (string.IsNullOrWhiteSpace(line)) continue;
                        try
                        {
                            var rec = JsonUtility.FromJson<LedgerRecord>(line);
                            if (rec != null && !string.IsNullOrEmpty(rec.guid))
                                _all.Add(rec);
                        }
                        catch { }
                    }
                }
                ApplyFilter();
            }
            catch (Exception ex)
            {
                Debug.LogError($"[GuidDB] Explorer reload error: {ex}");
            }
        }

        private void ApplyFilter()
        {
            IEnumerable<LedgerRecord> q = _all;
            // Alive/deleted
            switch (_aliveFilterIndex)
            {
                case 1: q = q.Where(r => r.alive); break; // Alive
                case 2: q = q.Where(r => !r.alive); break; // Deleted
            }
            // Type filter
            var t = _typeOptions[_typeFilterIndex];
            if (!string.Equals(t, "All", StringComparison.OrdinalIgnoreCase))
                q = q.Where(r => string.Equals(r.type, t, StringComparison.OrdinalIgnoreCase));
            // Query
            var s = (_query ?? string.Empty).Trim();
            if (s.Length > 0)
            {
                q = q.Where(r => (r.guid?.IndexOf(s, StringComparison.OrdinalIgnoreCase) ?? -1) >= 0
                               || (r.path_current?.IndexOf(s, StringComparison.OrdinalIgnoreCase) ?? -1) >= 0
                               || (r.class_name?.IndexOf(s, StringComparison.OrdinalIgnoreCase) ?? -1) >= 0
                               || (r.@namespace?.IndexOf(s, StringComparison.OrdinalIgnoreCase) ?? -1) >= 0
                               || (r.assembly_name?.IndexOf(s, StringComparison.OrdinalIgnoreCase) ?? -1) >= 0);
            }
            _filtered = q.OrderByDescending(r => r.alive)
                         .ThenBy(r => r.type)
                         .ThenBy(r => r.path_current)
                         .ToList();
        }

        private void OnGUI()
        {
            using (new EditorGUILayout.HorizontalScope(EditorStyles.toolbar))
            {
                GUILayout.Label($"Ledger: {_all.Count} items", EditorStyles.miniLabel, GUILayout.Width(160));
                GUILayout.FlexibleSpace();
                _aliveFilterIndex = EditorGUILayout.Popup(_aliveFilterIndex, _aliveOptions, GUILayout.Width(90));
                _typeFilterIndex = EditorGUILayout.Popup(_typeFilterIndex, _typeOptions, GUILayout.Width(170));
                var newQuery = GUILayout.TextField(_query, GUI.skin.FindStyle("ToolbarSeachTextField") ?? EditorStyles.toolbarTextField, GUILayout.MinWidth(240));
                if (newQuery != _query) { _query = newQuery; ApplyFilter(); }
                if (GUILayout.Button("Clear", EditorStyles.toolbarButton, GUILayout.Width(60))) { _query = string.Empty; ApplyFilter(); }
                if (GUILayout.Button("Refresh", EditorStyles.toolbarButton, GUILayout.Width(70))) { Reload(); }
                if (GUILayout.Button("Full Scan", EditorStyles.toolbarButton, GUILayout.Width(90))) { GuidDbManager.FullScan(); Reload(); }
            }

            // Header: horizontal sync only (no scrollbar)
            var headerRect = GUILayoutUtility.GetRect(0, 22, GUILayout.ExpandWidth(true));
            var totalWidth = 90f + 80f + 600f + 240f + 60f + 190f + 360f;
            var headerView = new Rect(0, 0, totalWidth, 22);
            var _ = GUI.BeginScrollView(headerRect, new Vector2(_scroll.x, 0), headerView, false, false, GUIStyle.none, GUIStyle.none);
            GUILayout.BeginArea(new Rect(0, 0, totalWidth, 22));
            DrawHeader();
            GUILayout.EndArea();
            GUI.EndScrollView();

            // Content: drives _scroll (hide horizontal bar)
            var newScroll = EditorGUILayout.BeginScrollView(_scroll, false, true, GUIStyle.none, GUI.skin.verticalScrollbar, GUIStyle.none);
            for (int i = 0; i < _filtered.Count; i++)
                DrawRow(_filtered[i], i);
            EditorGUILayout.EndScrollView();
            _scroll = newScroll;
        }

        private void DrawHeader()
        {
            using (new EditorGUILayout.HorizontalScope())
            {
                GUILayout.Label("Type", GUILayout.Width(90));
                GUILayout.Label("GUID", GUILayout.Width(80));
                GUILayout.Label("Path", GUILayout.ExpandWidth(true));
                GUILayout.Label("Class", GUILayout.Width(240));
                GUILayout.Label("State", GUILayout.Width(60));
                GUILayout.Label("New Asset", GUILayout.Width(190));
                GUILayout.Label("Actions", GUILayout.Width(360));
            }
            var rect = GUILayoutUtility.GetLastRect();
            EditorGUI.DrawRect(new Rect(rect.x, rect.yMax, rect.width, 1), GetLineColor());
        }

        private void DrawRow(LedgerRecord r, int index)
        {
            using (new EditorGUILayout.HorizontalScope())
            {
                GUILayout.Label(r.type ?? string.Empty, GUILayout.Width(90));
                GUILayout.Label(ShortGuidLong(r.guid), GUILayout.Width(80));
                GUILayout.Label(r.path_current ?? string.Empty, GUILayout.ExpandWidth(true));
                var cls = string.IsNullOrEmpty(r.class_name) ? string.Empty : (string.IsNullOrEmpty(r.@namespace) ? r.class_name : r.@namespace + "." + r.class_name);
                GUILayout.Label(cls, GUILayout.Width(240));
                GUILayout.Label(r.alive ? "Alive" : "Deleted", GUILayout.Width(60));

                _replacement.TryGetValue(r.guid ?? string.Empty, out var picked);
                var newPicked = EditorGUILayout.ObjectField(picked, typeof(UnityEngine.Object), false, GUILayout.Width(190));
                if (newPicked != picked) _replacement[r.guid ?? string.Empty] = newPicked;

                using (new EditorGUILayout.HorizontalScope(GUILayout.Width(360)))
                {
                    GUI.enabled = !_busy.Contains(r.guid ?? string.Empty);
                    if (GUILayout.Button("Who-Uses", GUILayout.Width(90))) OnWhoUses(r.guid);
                    if (GUILayout.Button("Select", GUILayout.Width(70))) PingAsset(r.guid);
                    if (GUILayout.Button("Copy GUID", GUILayout.Width(90))) EditorGUIUtility.systemCopyBuffer = r.guid ?? string.Empty;

                    GUI.enabled = newPicked != null && !_busy.Contains(r.guid ?? string.Empty);
                    if (GUILayout.Button("置換(修復)", GUILayout.Width(110))) OnRepair(r.guid, newPicked);
                    GUI.enabled = true;
                }
            }
            var rowRect = GUILayoutUtility.GetLastRect();
            EditorGUI.DrawRect(new Rect(rowRect.x, rowRect.yMax, rowRect.width, 1), GetLineColor());
        }

        private static Color GetLineColor()
        {
            return EditorGUIUtility.isProSkin ? new Color(1f, 1f, 1f, 0.08f) : new Color(0f, 0f, 0f, 0.12f);
        }

        private void OnWhoUses(string oldGuid)
        {
            try
            {
                var refs = FindReferences(oldGuid);
                var sb = new StringBuilder();
                sb.AppendLine($"GUID {oldGuid} references: {refs.Count} files");
                foreach (var p in refs.Take(20)) sb.AppendLine(" - " + p);
                if (refs.Count > 20) sb.AppendLine($"... (+{refs.Count - 20} more)");
                EditorUtility.DisplayDialog("Who Uses", sb.ToString(), "OK");
            }
            catch (Exception ex)
            {
                EditorUtility.DisplayDialog("Who Uses", "Error: " + ex.Message, "OK");
            }
        }

        private void OnRepair(string oldGuid, UnityEngine.Object newAsset)
        {
            var newPath = AssetDatabase.GetAssetPath(newAsset);
            var newGuid = AssetDatabase.AssetPathToGUID(newPath);
            if (string.IsNullOrEmpty(newGuid)) { EditorUtility.DisplayDialog("Repair", "選択した新アセットのGUIDが取得できません。", "OK"); return; }

            var refs = FindReferences(oldGuid);
            if (refs.Count == 0) { EditorUtility.DisplayDialog("Repair", "参照は見つかりませんでした。", "OK"); return; }

            if (!EditorUtility.DisplayDialog("Repair Confirmation",
                $"{refs.Count}個のアセットで\n{oldGuid}\n→\n{newGuid}\nに置換します。よろしいですか？\n(変更はGitで元に戻せます)",
                "実行", "キャンセル")) return;

            try
            {
                _busy.Add(oldGuid ?? string.Empty);
                int filesChanged = 0;
                AssetDatabase.StartAssetEditing();
                try
                {
                    foreach (var p in refs)
                    {
                        var abs = ToAbsolute(p);
                        if (!File.Exists(abs)) continue;
                        var text = File.ReadAllText(abs, Encoding.UTF8);
                        if (text.IndexOf(oldGuid, StringComparison.Ordinal) >= 0)
                        {
                            var replaced = text.Replace(oldGuid, newGuid);
                            if (!string.Equals(text, replaced, StringComparison.Ordinal))
                            {
                                File.WriteAllText(abs, replaced, new UTF8Encoding(false));
                                filesChanged++;
                            }
                        }
                    }
                }
                finally
                {
                    AssetDatabase.StopAssetEditing();
                    AssetDatabase.SaveAssets();
                    AssetDatabase.Refresh();
                }
                EditorUtility.DisplayDialog("Repair 完了", $"{filesChanged}ファイルを更新しました。", "OK");
            }
            catch (Exception ex)
            {
                EditorUtility.DisplayDialog("Repair エラー", ex.Message, "OK");
            }
            finally
            {
                _busy.Remove(oldGuid ?? string.Empty);
            }
        }

        private static List<string> FindReferences(string guid)
        {
            var list = new List<string>();
            var paths = AssetDatabase.GetAllAssetPaths();
            foreach (var p in paths)
            {
                if (!p.StartsWith("Assets/")) continue;
                var ext = Path.GetExtension(p).ToLowerInvariant();
                if (!(ext == ".prefab" || ext == ".unity" || ext == ".asset" || ext == ".mat" || ext == ".controller" || ext == ".anim"))
                    continue;
                try
                {
                    var abs = ToAbsolute(p);
                    if (!File.Exists(abs)) continue;
                    var content = File.ReadAllText(abs, Encoding.UTF8);
                    if (content.IndexOf(guid, StringComparison.Ordinal) >= 0)
                        list.Add(p);
                }
                catch { }
            }
            return list;
        }

        private static string ToAbsolute(string rel)
        {
            var project = Application.dataPath.Substring(0, Application.dataPath.Length - "/Assets".Length).Replace('\\', '/');
            return Path.Combine(project, rel).Replace('\\', '/');
        }

        private static string ShortGuidLong(string g)
        {
            if (string.IsNullOrEmpty(g)) return string.Empty;
            return g.Length <= 8 ? g : g.Substring(0, 8);
        }

        private static void PingAsset(string guid)
        {
            try
            {
                var path = AssetDatabase.GUIDToAssetPath(guid);
                var obj = string.IsNullOrEmpty(path) ? null : AssetDatabase.LoadMainAssetAtPath(path);
                if (obj != null)
                {
                    EditorGUIUtility.PingObject(obj);
                    Selection.activeObject = obj;
                }
                else
                {
                    Debug.LogWarning($"[GuidDB] Asset not found for GUID: {guid}");
                }
            }
            catch (Exception ex)
            {
                Debug.LogError($"[GuidDB] Select error: {ex}");
            }
        }

        private static void OpenAsset(string guid)
        {
            try
            {
                var path = AssetDatabase.GUIDToAssetPath(guid);
                if (!string.IsNullOrEmpty(path))
                {
                    var obj = AssetDatabase.LoadMainAssetAtPath(path);
                    if (obj != null) Selection.activeObject = obj;
                    if (!AssetDatabase.IsValidFolder(path) && obj != null) AssetDatabase.OpenAsset(obj);
                }
            }
            catch (Exception ex)
            {
                Debug.LogError($"[GuidDB] Open error: {ex}");
            }
        }
    }
}
