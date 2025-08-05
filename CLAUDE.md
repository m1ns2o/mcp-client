# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Overview

This is an HWP (Korean Hangul Word Processor) MCP (Model Context Protocol) client and server system built entirely with TypeScript. The system enables natural language control of HWP documents through LLM integration using winax for COM automation.

## Architecture

### Two-Component System
1. **TypeScript Client** (`src/index.ts`): Handles user interaction, LLM communication, and MCP protocol
2. **TypeScript MCP Server** (`src/hwp-mcp-server.ts`): Controls HWP COM automation using winax and exposes document manipulation tools

### Key Components
- **HWPPromptClient**: Main orchestrator that connects LLM responses to HWP actions
- **MCPClient**: Handles JSON-RPC communication with TypeScript MCP server
- **LLMClient**: Communicates with external LLM server (expects `/chat` endpoint)
- **HwpController**: TypeScript class for HWP COM automation using `winax`
- **HwpTableTools**: Specialized table manipulation functionality

### Data Flow
1. User provides natural language prompt
2. LLM processes prompt and returns structured response with `<ACTION>` blocks
3. Client parses actions and calls appropriate MCP tools
4. Python server executes HWP COM operations
5. Results are returned to user

## Development Commands

### TypeScript Development
```bash
# Development (with watch)
npm run dev:watch

# Build
npm run build

# Interactive mode
npm run dev

# Batch test mode
npm run batch

# Type checking
npm run typecheck

# Linting
npm run lint
npm run lint:fix

# Run MCP server standalone
npm run mcp-server

# Test built MCP server
npm run test-mcp
```

## Important Implementation Details

### HWP COM Automation Considerations
- HWP controller requires Windows environment with HWP installed
- COM operations must use correct parameter counts (e.g., `hwp.Open(path, "HWP", "")` not `hwp.Open(path)`)
- HWP automatically creates blank document when COM connection is established
- File operations need absolute paths
- Security module DLL may be required for file access without prompts
- Uses `winax` library for COM automation instead of `pywin32`

### MCP Protocol Integration
- Server runs in stdio mode with JSON-RPC 2.0
- Client maintains request ID tracking and response handlers
- TypeScript server uses @modelcontextprotocol/sdk for tool definition
- All tool results return in standardized format with `content` array

### LLM Response Parsing
The system expects LLM responses in this format:
```
<ACTION>
TOOL: tool_name
ARGS: {"param": "value"}
DESC: Description of action
</ACTION>

Regular response text here
```

### Error Handling Patterns
- COM errors often indicate parameter count mismatches or invalid file paths
- MCP connection issues usually stem from Node.js environment or stdio buffering
- LLM parsing failures typically result from malformed JSON in ARGS
- winax errors typically indicate COM object initialization or method call issues

## Testing

### Running Tests
```bash
# Build and test TypeScript code
npm run build
npm run typecheck

# Manual testing of MCP server
npm run mcp-server

# Test client with MCP server
npm run dev
```

### Test Data Locations
- Test HWP documents are typically saved in project root directory
- Batch test prompts are defined in `src/index.ts` `runBatchPrompts()`

## File Structure Notes

- `src/index.ts`: TypeScript client implementation
- `src/hwp-mcp-server.ts`: MCP server implementation
- `src/hwp/HwpController.ts`: Core HWP COM automation
- `src/hwp/HwpTableTools.ts`: Table manipulation functionality
- `src/types/winax.d.ts`: Type definitions for winax library
- `hwp-mcp/security_module/`: DLL for bypassing HWP security prompts (legacy)

## Common Issues

### "매개 변수의 개수가 잘못되었습니다" Error
This COM error (-2147352562) indicates incorrect parameter count in HWP method calls. Most HWP COM methods require specific parameter counts even if some are empty strings.

### MCP Server Connection Failures
Ensure Node.js is properly installed and all TypeScript dependencies are available. Check that stdio communication is working correctly between client and server.

### LLM Response Parsing Issues
Verify JSON format in ARGS blocks and ensure proper escaping of Korean text and special characters.