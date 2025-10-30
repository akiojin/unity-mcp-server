using System;
using System.Collections.Generic;
using System.Diagnostics;
using System.IO;
using System.Linq;
using System.Text;
using UnityEditor;
using UnityEditor.UIElements;
using UnityEngine;
using UnityEngine.UIElements;
using Debug = UnityEngine.Debug;

#if UNITY_6000_0_OR_NEWER
using HistoryBufferUIElement = UnityEngine.UIElements.TextElement;

#else
using HistoryBufferUIElement = UnityEngine.UIElements.TextField;
#endif

namespace BitpurrDigital
{
    
    [Serializable]
    public class TerminalEditorWindowData
    {
        public string historyBuffer = "";
        public string commandBuffer = "";
    }
    
    public class TerminalEditorWindow : EditorWindow
    {
        private TerminalEditorWindowData _terminalData = new TerminalEditorWindowData();
        private TextField _commandBufferText;
        private HistoryBufferUIElement _historyBufferText;
        private Label _chevronLabel;
        private ScrollView _scrollView;
        private Process _process;
        private readonly StringBuilder _outputBuilder = new StringBuilder();
        private readonly Queue<Action> _uiUpdateQueue = new Queue<Action>();
        private readonly List<string> _previousCommands = new List<string>();
        private int _previousCommandIndex = 0;
        private int _currentTabCompletionIndex = 0;
        private string _beforeTabCompletionValue = "";
        private bool _isTabCompleting = false;

        private string _path = Path.GetFullPath(Path.Combine(Application.dataPath, $"..{Path.DirectorySeparatorChar}"));
#pragma warning disable CS0414
        private static readonly string Unity6UxmlPath = Path.Combine(GetBasePath(), "TerminalUI_Unity6.uxml");
        private static readonly string Unity5UxmlPath = Path.Combine(GetBasePath(), "TerminalUI_Unity5.uxml");
#pragma warning restore CS0414
        private static readonly string IconPath = Path.Combine(Path.GetDirectoryName(GetBasePath()), "Icon.png");


        private const string InternalCommandPrefix = "editorterminal";
        private const string InternalCommandShortPrefix = "et";
        # if UNITY_6000_0_OR_NEWER
        private const string FailCommandEmoji = "❌";
        private const string SuccessCommandEmoji = "✅";
        private const string ConfigCommandEmoji = "📝";
#else 
        private const string FailCommandEmoji = "";
        private const string SuccessCommandEmoji = "";
        private const string ConfigCommandEmoji = "";
        #endif
        private const string TerminalName = "Editor Terminal";
        private const int MinFontSize = 5;
        private const int MaxFontSize = 100;
        private const int DefaultFontSize = 14;
        private const string HistoryBufferTextUIName = "historyBufferText";
        private const string CommandBufferTextUIName = "commandBufferText";
        private const string ChevronLabelUIName = "chevron";
        private const string ScrollViewUIName = "scroll";
        private const string Version = "1.4.2";

        private string GitLocation
        {
            get => EditorPrefs.GetString($"{TerminalName}_GitLocation", "");
            set => EditorPrefs.SetString($"{TerminalName}_GitLocation", value);
        }

        private string ExternalShell
        {
            get => EditorPrefs.GetString($"{TerminalName}_ExternalShell", "");
            set => EditorPrefs.SetString($"{TerminalName}_ExternalShell", value);
        }

        private bool GitSetManually
        {
            get => EditorPrefs.GetBool($"{TerminalName}_GitSetManually", false);
            set => EditorPrefs.SetBool($"{TerminalName}_GitSetManually", value);
        }

        private int FontSize
        {
            get => EditorPrefs.GetInt($"{TerminalName}_FontSize", DefaultFontSize);
            set => EditorPrefs.SetInt($"{TerminalName}_FontSize", value);
        }

        private Color BackgroundColor
        {
            get => ColorUtilities.FromHex(EditorPrefs.GetString($"{TerminalName}_BackgroundColor",
                ColorUtilities.ToHex(Color.black)));
            set => EditorPrefs.SetString($"{TerminalName}_BackgroundColor", ColorUtilities.ToHex(value));
        }

        private Color FontColor
        {
            get => ColorUtilities.FromHex(EditorPrefs.GetString($"{TerminalName}_FontColor",
                ColorUtilities.ToHex(Color.white)));
            set => EditorPrefs.SetString($"{TerminalName}_FontColor", ColorUtilities.ToHex(value));
        }

        // Only Unity 2022.3 LTS and above is officially supported currently.
#if UNITY_2022_3_OR_NEWER
        [MenuItem("Window/Editor Terminal")]
        public static void ShowWindow()
        {
            var window = GetWindow<TerminalEditorWindow>(TerminalName);
            window.titleContent = new GUIContent(TerminalName, GetWindowIcon());
        }
#endif

        private static Texture2D GetWindowIcon()
        {
            return AssetDatabase.LoadAssetAtPath<Texture2D>(IconPath);
        }

        private bool LocateGitExecutable()
        {
#if UNITY_EDITOR_WIN
            string[] paths =
            {
                "git",
                "git.exe",
                @"C:\Program Files\Git\bin\git.exe",
                @"C:\Program Files (x86)\Git\bin\git.exe",
                @"D:\Program Files\Git\bin\git.exe",
                @"D:\Program Files (x86)\Git\bin\git.exe",
            };
            foreach (string path in paths)
            {
                if (File.Exists(path))
                {
                    GitLocation = path;
                    return true;
                }
            }
#else
            string[] paths =
            {
                "git",
                "/usr/bin/git",
                "/usr/local/bin/git",
                "/opt/local/bin/git"
            };

            foreach (var path in paths)
            {
                if (!File.Exists(path)) continue;
                GitLocation = path;
                return true;
            }
#endif

            return false;
        }
        
        private static string GetBasePath()
        {
            // Find all Bitpurr Digital folders in the project
            var bitpurrFolders = AssetDatabase.FindAssets("Bitpurr Digital")
                .Select(AssetDatabase.GUIDToAssetPath)
                .Where(path => Path.GetFileName(path) == "Bitpurr Digital" && Directory.Exists(path))
                .ToArray();

            if (bitpurrFolders.Length == 0)
            {
                Debug.LogError("Could not find 'Bitpurr Digital' folder!");
                return "Assets/Bitpurr Digital/Editor Terminal/Editor";  // Fallback to original path
            }

            // Search for the script in all Bitpurr Digital folders
            var scripts = AssetDatabase.FindAssets("t:Script TerminalEditorWindow", bitpurrFolders);
            if (scripts.Length == 0)
            {
                Debug.LogError("Could not find TerminalEditorWindow script in any Bitpurr Digital folder!");
                return "Assets/Bitpurr Digital/Editor Terminal/Editor";  // Fallback to original path
            }
    
            var scriptPath = AssetDatabase.GUIDToAssetPath(scripts[0]);
            return Path.GetDirectoryName(scriptPath);
        }


        private string GetPlatformSpecificDefaultShell()
        {
#if UNITY_EDITOR_WIN
            return "powershell";
#else
            return "bash";
#endif
        }


        public void CreateGUI()
        {
            LoadTerminalData();
            var visualTree = AssetDatabase.LoadAssetAtPath<VisualTreeAsset>(GetUxmlAssetPath());
            if (visualTree != null)
            {
                visualTree.CloneTree(rootVisualElement);
            }

            _historyBufferText = rootVisualElement.Q<HistoryBufferUIElement>(HistoryBufferTextUIName);
            // ReSharper disable once UseSymbolAlias
            _commandBufferText = rootVisualElement.Q<TextField>(CommandBufferTextUIName);

            SetupDataBindings();
            _chevronLabel = rootVisualElement.Q<Label>(ChevronLabelUIName);
            _scrollView = rootVisualElement.Q<ScrollView>(ScrollViewUIName);

            UpdateUIFontSize();
            UpdateUIColors();

            rootVisualElement.RegisterCallback<ClickEvent>(evt =>
            {
                var isCommandBufferAlreadyFocus =
                    _commandBufferText.focusController.focusedElement?.Equals(_commandBufferText) ?? false;
                bool isClickOnHistoryBuffer = evt.target == _historyBufferText ||
                                              (_historyBufferText.Contains(evt.target as VisualElement));
                if (!isCommandBufferAlreadyFocus && !isClickOnHistoryBuffer)
                {
                    _commandBufferText.Focus();
                }
            });

            _commandBufferText.RegisterValueChangedCallback(evt =>
            {
                var previousValueHadTab = evt.previousValue.Contains("\t");
                var newValueHasTab = evt.newValue.Contains("\t");
                if (previousValueHadTab && !newValueHasTab)
                {
                    return;
                }

                if (newValueHasTab)
                {
                    _commandBufferText.value = evt.newValue.Replace("\t", string.Empty);
                    TabCompletion();
                    return;
                }

                if (evt.newValue.Contains("\n") || evt.newValue.Contains("\r"))
                {
                    var command = evt.newValue.Replace("\n", "");
                    RunCommand($"{command}\n");
                    CompleteTabbing();
                }

                if (_isTabCompleting && !evt.previousValue.EndsWith(" ") && evt.newValue.EndsWith(" "))
                {
                    CompleteTabbing();
                }

                if (evt.previousValue.Trim() == string.Empty || evt.newValue.Trim() == string.Empty)
                {
                    CompleteTabbing();
                }

                _previousCommandIndex = 0;
            });

            rootVisualElement.RegisterCallback<KeyDownEvent>(evt =>
            {
                if (!hasFocus) return;
                var isCommandBufferAlreadyFocus =
                    _commandBufferText.focusController.focusedElement?.Equals(_commandBufferText) ?? false;

                var isCmdOrCtrl = GetPlatformCtrlOrCmdKeyPressed(evt);

                if (!isCommandBufferAlreadyFocus && !isCmdOrCtrl)
                {
                    _commandBufferText.Focus();
                }

                switch (isCmdOrCtrl)
                {
                    case false:
                        return;
                    default:
                        switch (evt.keyCode)
                        {
                            case KeyCode.L:
                                evt.StopPropagation();
                                ClearHistoryBuffer();
                                break;
                            case KeyCode.U:
                                evt.StopPropagation();
                                ClearCommandBuffer();
                                break;
                            case KeyCode.K:
                                evt.StopPropagation();
                                var cursorPosition = _commandBufferText.cursorIndex;
                                var currentText = _commandBufferText.value;
                                _commandBufferText.value = currentText.Substring(0, cursorPosition);
                                break;
#if UNITY_2022_3_OR_NEWER
                            case KeyCode.E:
                                evt.StopPropagation();
                                _commandBufferText.cursorIndex = _commandBufferText.value.Length;
                                break;
#endif
                            case KeyCode.R:
                                evt.StopPropagation();
                                SelectPreviousCommand();
                                break;
                            case KeyCode.Z:
                                evt.StopPropagation();
                                KillRunningProcess();
                                break;
                            case KeyCode.Minus:
                                evt.StopPropagation();
                                AdjustFontSize(false);
                                break;
                            case KeyCode.Equals:
                                evt.StopPropagation();
                                AdjustFontSize(true);
                                break;
                            default:
                                break;
                        }

                        break;
                }
            }, TrickleDown.TrickleDown);

            if (GitLocation == "")
            {
                LocateGitExecutable();
            }

            SetChevronText(_path);
            if (String.IsNullOrEmpty(_terminalData.historyBuffer))
            {
                ClearHistoryBuffer();
            }
            else
            {
#if !UNITY_6000_0_OR_NEWER
            _historyBufferText.value = _terminalData.historyBuffer;
#endif
                ScrollToBottom();
            }
        }
        
        private void ClearStoredData()
        {
            EditorPrefs.DeleteKey($"{TerminalName}_WindowData");
            _terminalData = new TerminalEditorWindowData();
            SetupDataBindings();
        }

        private void TabCompletion()
        {
            var currentInput = _isTabCompleting ? _beforeTabCompletionValue : _commandBufferText.value;
            var tokens = currentInput.Split(' ');
            var lastToken = tokens.LastOrDefault();

            var currentDirectory = Path.GetFullPath(_path);

            var possibleMatches = Directory.GetFileSystemEntries(currentDirectory)
                .ToList();

            if (!string.IsNullOrEmpty(lastToken))
            {
                possibleMatches = possibleMatches
                    .Where(entry => Path.GetFileName(entry).StartsWith(lastToken, StringComparison.OrdinalIgnoreCase))
                    .ToList();
            }

            if (possibleMatches.Count == 0)
            {
                return;
            }

            if (_currentTabCompletionIndex >= possibleMatches.Count)
            {
                _currentTabCompletionIndex = 0;
            }

            var selectedMatch = Path.GetFileName(possibleMatches[_currentTabCompletionIndex]);
            tokens[^1] = selectedMatch;

            if (!_isTabCompleting)
            {
                _beforeTabCompletionValue = _commandBufferText.value;
                _isTabCompleting = true;
            }

            _commandBufferText.value = string.Join(" ", tokens).Replace("\n", "");
            if (possibleMatches.Count == 1)
            {
                CompleteTabbing();
            }

            _currentTabCompletionIndex++;
        }

        private void CompleteTabbing()
        {
            _beforeTabCompletionValue = _commandBufferText.value;
            _isTabCompleting = false;
        }

        private static bool GetPlatformCtrlOrCmdKeyPressed(KeyDownEvent evt)
        {
#if UNITY_EDITOR_OSX
            return evt.commandKey;
#else
            return evt.ctrlKey;
#endif
        }

        private void SetupDataBindings()
        {
#if UNITY_6000_0_OR_NEWER
            _historyBufferText.dataSource = _terminalData;
            _commandBufferText.dataSource = _terminalData;
#else
            var serializedObject = new SerializedObject(this);

            _historyBufferText.bindingPath = "historyBuffer";
            _historyBufferText.Bind(serializedObject);
            _commandBufferText.bindingPath = "commandBuffer";
            _commandBufferText.Bind(serializedObject);
#endif
        }

        private void AdjustFontSize(bool upOrDown)
        {
            if (upOrDown)
            {
                FontSize += 2;
            }
            else
            {
                FontSize -= 2;
            }

            KeepFontSizeWithinBounds();
            UpdateUIFontSize();
        }

        private void UpdateUIFontSize()
        {
            _historyBufferText.style.fontSize = FontSize;
            _commandBufferText.style.fontSize = FontSize;
            _chevronLabel.style.fontSize = FontSize;

#if !UNITY_6000_0_OR_NEWER
            var textInput = _historyBufferText.Q("unity-text-input");
            textInput.style.fontSize = FontSize;
#endif
        }

        private void UpdateUIColors()
        {
            _historyBufferText.style.color = FontColor;
            _commandBufferText.style.color = FontColor;
            _chevronLabel.style.color = FontColor;
            _scrollView.style.backgroundColor = BackgroundColor;

#if !UNITY_6000_0_OR_NEWER
            var textInput = _historyBufferText.Q("unity-text-input");
            textInput.style.backgroundColor = BackgroundColor;
            textInput.style.borderBottomWidth = 0;
            textInput.style.borderTopWidth = 0;
            textInput.style.borderLeftWidth = 0;
            textInput.style.borderRightWidth = 0;
            textInput.style.color = FontColor;
#endif
        }

        private void KeepFontSizeWithinBounds()
        {
            if (FontSize <= MinFontSize)
            {
                FontSize = MinFontSize;
            }

            if (FontSize >= MaxFontSize)
            {
                FontSize = MaxFontSize;
            }
        }

        private void SelectPreviousCommand()
        {
            if (_previousCommands.Count <= 0) return;
            if (_previousCommandIndex >= _previousCommands.Count)
            {
                _previousCommandIndex = _previousCommands.Count - 1;
            }

            _commandBufferText.value = _previousCommands[_previousCommandIndex];
            _terminalData.commandBuffer = _previousCommands[_previousCommandIndex];
            _previousCommandIndex--;
            if (_previousCommandIndex <= 0)
            {
                _previousCommandIndex = _previousCommands.Count - 1;
            }
        }

        private void KillRunningProcess()
        {
            if (_process is { HasExited: false })
            {
                _process.Kill();
            }
        }

        private void ClearHistoryBuffer()
        {
            SetHistoryBufferUI("");
            _terminalData.historyBuffer = "";
        }

        private void ClearCommandBuffer()
        {
            _commandBufferText.value = "";
            _terminalData.commandBuffer = "";
        }

        private void RunCommand(string command)
        {
            command = command.Trim();
            _previousCommands.Add(command);
            _previousCommandIndex = _previousCommands.Count - 1;
            if (command.Equals("clear") || command.Equals("cls"))
            {
                ClearHistoryBuffer();
                ClearCommandBuffer();
                return;
            }

            if (command.StartsWith("cd"))
            {
                var updated = false;
                if (command.Trim() == "cd")
                {
#if UNITY_EDITOR_WIN
                    _path = Environment.GetFolderPath(Environment.SpecialFolder.UserProfile);
#else
                    _path = Environment.GetEnvironmentVariable("HOME") ?? "~";
#endif
                    updated = true;
                }

                if (command.StartsWith("cd "))
                {
                    var newPath = command.Substring(3).Trim().Replace("\"", "").Replace("\n", "");
                    var targetPath = "";
                    if (newPath == "..")
                    {
                        targetPath = Path.GetFullPath(Path.Combine(_path, ".."));
                    }
                    else if (Path.IsPathRooted(newPath))
                    {
                        targetPath = Path.GetFullPath(newPath);
                    }
                    else
                    {
                        targetPath = Path.GetFullPath(Path.Combine(_path, newPath));
                    }

                    if (!Directory.Exists(targetPath) && !File.Exists(targetPath))
                    {
                        _terminalData.historyBuffer += $"cd: {newPath}: No such file or directory\n";
                        SetHistoryBufferUI(_terminalData.historyBuffer);
                        ClearCommandBuffer();
                        return;
                    }

                    _path = targetPath;
                    if (File.Exists(_path))
                    {
                        _path = Path.GetDirectoryName(_path) ?? _path;
                    }


                    updated = true;
                }

                if (!updated) return;
                SetChevronText(_path);
                ClearCommandBuffer();

                return;
            }

            if (IsInternalCommand(command))
            {
                RunInternalCommand(command);
                ScrollToBottom();
                return;
            }


            _process = new Process();
            if (command.StartsWith("git") && GitLocation != "")
            {
                _process.StartInfo.FileName = GitLocation;
                _process.StartInfo.Arguments = command.Substring(4);
                _process.StartInfo.WorkingDirectory = _path;
            }
            else
            {
#if UNITY_EDITOR_WIN
                _process.StartInfo.FileName = ExternalShell == "cmd" ? "cmd.exe" : "powershell.exe";
                _process.StartInfo.Arguments = ExternalShell == "cmd" ? $"/c {command}" : $"-Command \"{command}\"";
#else
                _process.StartInfo.FileName = ExternalShell == "" ? "/bin/bash" : $"/bin/{ExternalShell}";
                _process.StartInfo.Arguments = $"{(ExternalShell.Contains("fish") ? "-C" : "-c")} \"{command}\"";
#endif

                _process.StartInfo.WorkingDirectory = _path;
            }


            _process.StartInfo.UseShellExecute = false;
            _process.StartInfo.RedirectStandardOutput = true;
            _process.StartInfo.RedirectStandardError = true;
            _process.StartInfo.CreateNoWindow = true;

            _process.OutputDataReceived += HandleProcessOutput;
            _process.ErrorDataReceived += HandleProcessError;

            _terminalData.historyBuffer += $"> {command}\n";
            SetHistoryBufferUI(_terminalData.historyBuffer);

            _process.Start();
            _process.BeginOutputReadLine();
            _process.BeginErrorReadLine();

            _terminalData.commandBuffer = "";
            _commandBufferText.value = "";
        }

        private void SetHistoryBufferUI(string command)
        {
#if UNITY_6000_0_OR_NEWER
            _historyBufferText.text = command;
#else
            _historyBufferText.value = command;
            _historyBufferText.style.display = command.Trim() == "" ? DisplayStyle.None : DisplayStyle.Flex;
#endif
        }

        private void HandleProcessOutput(object sender, DataReceivedEventArgs e)
        {
            if (e.Data == null) return;

            lock (_outputBuilder)
            {
                _outputBuilder.AppendLine(e.Data);
            }

            Enqueue(() =>
            {
                lock (_outputBuilder)
                {
                    _terminalData.historyBuffer += _outputBuilder.ToString();
                    SetHistoryBufferUI(_terminalData.historyBuffer);
                    _outputBuilder.Clear();
                }
            });
        }

        private void HandleProcessError(object sender, DataReceivedEventArgs e)
        {
            if (e.Data == null) return;

            lock (_outputBuilder)
            {
                _outputBuilder.AppendLine($"{e.Data}");
            }

            Enqueue(() =>
            {
                lock (_outputBuilder)
                {
                    _terminalData.historyBuffer += _outputBuilder.ToString();
                    SetHistoryBufferUI(_terminalData.historyBuffer);
                    _outputBuilder.Clear();
                }
            });
        }


        private static bool IsInternalCommand(string command)
        {
            return command.StartsWith($"{InternalCommandPrefix} ") ||
                   command.StartsWith($"{InternalCommandShortPrefix} ");
        }

        private void SetHistoryBuffer(string text)
        {
            SetHistoryBufferUI(text);
            _terminalData.historyBuffer = text;
        }

        private void RunInternalCommand(string command)
        {
            var internalCommand = command;
            if (internalCommand.StartsWith($"{InternalCommandPrefix} "))
            {
                internalCommand = internalCommand.Substring(InternalCommandPrefix.Length);
            }
            else if (internalCommand.StartsWith($"{InternalCommandShortPrefix} "))
            {
                internalCommand = internalCommand.Substring(InternalCommandShortPrefix.Length);
            }

            var commandArgs = internalCommand.Split(" ", StringSplitOptions.RemoveEmptyEntries);

            if (commandArgs.Length == 0)
            {
                return;
            }

            var hasSecondArgument = commandArgs.Length > 1;

            switch (commandArgs[0])
            {
                case "sgl":
                case "set_git_location":
                    if (!hasSecondArgument)
                    {
                        SetHistoryBuffer(
                            $"{FailCommandEmoji} {commandArgs[0]} requires the location of your git executable as an argument.".TrimStart());
                        break;
                    }

                    SetHistoryBuffer(
                        $"{SuccessCommandEmoji} {TerminalName} git has been updated to {commandArgs[1]}\n This is stored in User Editor Preferences.".TrimStart());
                    break;
                case "ss":
                case "set_shell":
                    if (!hasSecondArgument)
                    {
                        SetHistoryBuffer(
                            $"{FailCommandEmoji} {commandArgs[0]} requires the shell executable as an argument.".TrimStart());
                        break;
                    }

                    var newShell = commandArgs[1];

#if UNITY_EDITOR_WIN
                    var supportedShell = true;

                    var lowercaseShell = newShell.ToLower();
                    var supportedShellsWindows = new[] { "cmd", "powershell", "cmd.exe", "powershell.exe" };
                    if (!supportedShellsWindows.Contains(lowercaseShell))
                    {
                        supportedShell = false;
                    }

                    if (!supportedShell)
                    {
                        SetHistoryBuffer(
                            $"{FailCommandEmoji} {TerminalName} failed to set the shell to {newShell} as it is not supported on Windows. Choose either cmd or powershell.".TrimStart());
                        break;
                    }
#endif

                    SetHistoryBuffer(
                        SetShell(newShell)
                            ? $"{SuccessCommandEmoji} {TerminalName} shell has been switched to {newShell}\n This is stored in User Editor Preferences.".TrimStart()
                            : $"{FailCommandEmoji} {TerminalName} failed to switch the shell to {newShell}. Does the shell exist?".TrimStart());

                    break;
                case "sfs":
                case "set_font_size":
                    if (!hasSecondArgument)
                    {
                        SetHistoryBuffer(
                            $"{FailCommandEmoji} {commandArgs[0]} requires the font size as an argument.".TrimStart());
                        break;
                    }

                    var newFontSize = commandArgs[1];
                    if (!int.TryParse(newFontSize, out int fontSizeInt) || fontSizeInt <= 0)
                    {
                        SetHistoryBuffer(
                            $"{FailCommandEmoji} {TerminalName} failed to set font size - must be a positive integer".TrimStart());
                        break;
                    }

                    FontSize = fontSizeInt;
                    KeepFontSizeWithinBounds();
                    UpdateUIFontSize();
                    SetHistoryBuffer(
                        $"{SuccessCommandEmoji} {TerminalName} set font size to {fontSizeInt}\n This is stored in User Editor Preferences.".TrimStart());
                    break;

                case "sbc":
                case "set_background_color":
                    if (!hasSecondArgument)
                    {
                        SetHistoryBuffer(
                            $"{FailCommandEmoji} {commandArgs[0]} requires the background color as an argument. (hex code).".TrimStart());
                        break;
                    }

                    var newBackgroundColorString = commandArgs[1];
                    try
                    {
                        var newColor = ColorUtilities.FromHex(newBackgroundColorString);
                        BackgroundColor = newColor;
                        UpdateUIColors();
                    }
                    catch
                    {
                        SetHistoryBuffer(
                            $"{FailCommandEmoji} {TerminalName} failed to set the background color to {newBackgroundColorString}. Must be a valid hex code.".TrimStart());
                    }

                    break;
                case "sfc":
                case "set_font_color":
                    if (!hasSecondArgument)
                    {
                        SetHistoryBuffer(
                            $"{FailCommandEmoji} {commandArgs[0]} requires the font color as an argument. (hex code).".TrimStart());
                        break;
                    }

                    var newFontColorString = commandArgs[1];
                    try
                    {
                        var newColor = ColorUtilities.FromHex(newFontColorString);
                        FontColor = newColor;
                        UpdateUIColors();
                    }
                    catch
                    {
                        SetHistoryBuffer(
                            $"{FailCommandEmoji} {TerminalName} failed to set the font color to {newFontColorString}. Must be a valid hex code.".TrimStart());
                    }

                    break;
                case "sdc":
                case "set_default_colors":
                    FontColor = Color.white;
                    BackgroundColor = Color.black;
                    UpdateUIColors();
                    break;
                case "c":
                case "config":
                    SetHistoryBuffer($"{ConfigCommandEmoji} {TerminalName} Configuration: \n{RenderConfig()}".TrimStart());
                    break;
                default:
                    SetHistoryBuffer(RenderHelp());
                    break;
            }

            ClearCommandBuffer();
        }

        private static string GetCtrlOrCMD()
        {
#if UNITY_EDITOR_OSX
            return "cmd";
#else
            return "ctrl";
#endif
        }

        private bool SetShell(string shell)
        {
            ExternalShell = shell;
            return true;
        }

        private string RenderConfig()
        {
            var config = "";
            config += "git_location=" + GitLocation +
                      (GitSetManually ? " (Manually configured)" : " (Automatically found)") + "\n";
            config += "shell=" + (ExternalShell == ""
                ? $" (Using default: {GetPlatformSpecificDefaultShell()})"
                : $"{ExternalShell} (Manually configured)") + "\n";
            config += "font_size=" + FontSize + "\n";
            config += "font_color=" + ColorUtilities.ToHex(FontColor, FontColor.a < 1.0f).ToLower() + "\n";
            config += "background_color=" + ColorUtilities.ToHex(BackgroundColor, FontColor.a < 1.0f).ToLower() + "\n";
            return config;
        }

        private string RenderHelp()
        {
            var help = "";
            help += $"🔍 {TerminalName} help - Version {Version}\n\n";
            help += "command -- short_command : Command Description" + "\n\n";

            help +=
                "set_git_location -- sgl : Manually set location of your git executable. This speeds up git commands by executing them directly." +
                "\n";
            help +=
                "set_shell -- ss : Either cmd or powershell on windows. A path on Mac / Linux. (Do not change this unless you know what you're doing!)." +
                "\n";
            help += $"set_font_size -- sfs : Set the font size. Defaults to {DefaultFontSize}. The font size can also be adjusted by pressing ({GetCtrlOrCMD().ToUpper()} + -) or ({GetCtrlOrCMD().ToUpper()} + =)" + "\n";
            help += "set_font_color -- sfc : Set the font color as a hex code eg. #000000" + "\n";
            help += "set_background_color -- sbc : Set the background color as a hex code eg. #ff0000" + "\n";
            help += "set_default_colors -- sdc : Reset the default editor terminal colours" + "\n";
            help += "help -- h : display this help text." + "\n";
            return help;
        }

        private void OnEnable()
        {
            EditorApplication.update += OnUpdate;
        }

        private void OnDisable()
        {
            EditorApplication.update -= OnUpdate;
            SaveTerminalData();
        }
        
        private void SaveTerminalData()
        {
            if (_terminalData != null)
            {
                string json = JsonUtility.ToJson(_terminalData);
                EditorPrefs.SetString($"{TerminalName}_WindowData", json);
            }
        }

        private void LoadTerminalData()
        {
            string json = EditorPrefs.GetString($"{TerminalName}_WindowData", "");
            if (!string.IsNullOrEmpty(json))
            {
                _terminalData = JsonUtility.FromJson<TerminalEditorWindowData>(json);
            }
            else
            {
                _terminalData = new TerminalEditorWindowData();
            }
        }


        private void Enqueue(Action action)
        {
            lock (_uiUpdateQueue)
            {
                _uiUpdateQueue.Enqueue(action);
            }
        }

        private void ScrollToBottom()
        {
            EditorApplication.delayCall += () =>
            {
                if (_scrollView != null)
                {
                    _scrollView.scrollOffset = new Vector2(0, _scrollView.contentContainer.worldBound.height);
                }
            };
        }

        private void SetChevronText(string text)
        {
            _chevronLabel.text = text + " >";
        }

        private void OnUpdate()
        {
            lock (_uiUpdateQueue)
            {
                while (_uiUpdateQueue.Count > 0)
                {
                    _uiUpdateQueue.Dequeue().Invoke();
                    ScrollToBottom();
                }
            }
        }

        private static string GetUxmlAssetPath()
        {
#if UNITY_6000_0_OR_NEWER
            return Unity6UxmlPath;
#else
            return Unity5UxmlPath;
#endif
        }
    }
}