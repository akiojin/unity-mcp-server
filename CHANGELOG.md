# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [Unity Package 2.0.1] - 2025-08-18

### Changed
- Version bump for release

## [Unity Package 2.0.0] - 2025-08-18

### Added
- Full Unity 6 (Unity 6000.0) support
- Conditional compilation directives for Unity 6 compatibility
- Backward compatibility with Unity 2020.3 and later versions

### Changed
- **BREAKING**: Minimum Unity version requirement is now Unity 6000.0
- Major version bump to 2.0.0 for Unity 6 support

### Fixed
- QualitySettings.pixelLightCount usage with conditional compilation (deprecated in Unity 6)
- UnityEditorInternal.InternalEditorUtility usage with Unity 6 alternatives
- Tag management implementation for Unity 6 compatibility

## [Unity Package 1.4.2] - 2025-08-18

### Fixed
- Removed obsolete PlayerSettings.GetSerializedObject() call
- Removed unsupported GraphicsSettings.realtimeGICPUUsage property
- Replaced obsolete Physics2D.autoSimulation with Physics2D.simulationMode

## [2.4.3] - 2025-08-18

### Fixed
- Added missing meta file for ProjectSettingsHandler.cs in Unity Package

## [2.4.2] - 2025-08-18

### Fixed
- Fixed BaseToolHandler import path in Project Settings handlers

## [2.4.0] - 2025-08-18

### Added
- **Project Settings Management**: New functionality to read and update Unity Project Settings
  - `get_project_settings`: Read various project settings categories (Player, Graphics, Quality, Physics, Audio, etc.)
  - `update_project_settings`: Safely update project settings with confirmation requirement
  - Include-style boolean parameters for consistent API design
  - Support for all major Unity settings categories
  - Safety confirmation required for all updates to prevent accidental changes

## [2.3.1] - 2025-08-18

### Fixed
- Added cleanup for IntegrationTestCube in integration tests to prevent test objects from remaining in Unity scene
- Integration test now properly deletes created GameObjects after test completion

## [2.3.0] - 2025-08-18

### Added
- **LLM Explorer Mode**: New screenshot capture mode that allows AI to explore scenes independently
  - Creates temporary camera without affecting user's view
  - Auto-framing for GameObjects, tags, and areas
  - Manual camera positioning and orientation control
  - Layer filtering and custom background colors
  - Supports both automatic and manual camera positioning

### Changed
- Enhanced screenshot system with dual-mode support (User Perspective and LLM Explorer)
- Updated documentation to explain the two capture modes

### Technical Details
- Unity Package: v1.3.0
- MCP Server: v2.3.0
- New methods in ScreenshotHandler.cs: CaptureExplorerView, AutoFrameTarget, AutoFrameTargets
- Extended CaptureScreenshotToolHandler.js with explorerSettings parameter

## [2.2.1] - 2025-08-17

### Fixed
- Fixed rootObjects variable duplication error
- Default settings optimized for data reduction

## [2.2.0] - 2025-08-16

### Added
- Initial screenshot system implementation
- Game View and Scene View capture modes
- Base64 encoding support
- Basic image analysis capabilities

## [2.1.0] - 2025-08-15

### Added
- Enhanced Unity Editor integration
- Improved error handling and logging
- Performance optimizations

## [2.0.0] - 2025-08-14

### Changed
- Major architecture refactoring
- Improved MCP protocol compliance
- Enhanced TypeScript/JavaScript support

## [1.0.0] - 2025-08-01

### Added
- Initial release
- Basic Unity Editor control via MCP
- GameObject manipulation
- Scene management
- Component handling