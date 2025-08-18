# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

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