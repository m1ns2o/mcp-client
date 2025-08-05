#!/usr/bin/env node
/**
 * HWP MCP Server - TypeScript Implementation
 * winax를 이용한 한글 문서 자동화 MCP 서버
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
    CallToolRequestSchema,
    ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { HwpController } from './hwp/HwpController.js';
import { HwpTableTools } from './hwp/HwpTableTools.js';

// 전역 HWP 컨트롤러 인스턴스
let hwpController: HwpController | null = null;
let hwpTableTools: HwpTableTools | null = null;

/**
 * HwpController 인스턴스를 가져오거나 생성합니다.
 */
async function getHwpController(forceNew: boolean = false): Promise<HwpController | null> {
    if (forceNew && hwpController) {
        console.error("Forcing new HwpController instance by closing the existing one.");
        try {
            hwpController.disconnect();
        } catch (e) {
            console.warn(`An error occurred while disconnecting the existing HwpController: ${e}`);
        }
        hwpController = null;
        hwpTableTools = null;
    }

    if (!hwpController) {
        console.error("Creating HwpController instance...");
        try {
            hwpController = new HwpController();
            if (!(await hwpController.connect(true))) {
                console.error("Failed to connect to HWP program");
                hwpController = null;
                hwpTableTools = null;
                return null;
            }

            // 테이블 도구 인스턴스도 초기화
            hwpTableTools = new HwpTableTools(hwpController);

            console.error("Successfully connected to HWP program");
        } catch (e) {
            console.error(`Error creating HwpController: ${e}`);
            hwpController = null;
            hwpTableTools = null;
            return null;
        }
    }

    return hwpController;
}

/**
 * HwpTableTools 인스턴스를 가져오거나 생성합니다.
 */
async function getHwpTableTools(): Promise<HwpTableTools | null> {
    if (!hwpTableTools) {
        const controller = await getHwpController();
        if (controller) {
            hwpTableTools = new HwpTableTools(controller);
        }
    }
    return hwpTableTools;
}

// MCP 서버 생성
const server = new Server(
    {
        name: 'hwp-mcp-typescript',
        version: '1.0.0',
    },
    {
        capabilities: {
            tools: {},
        },
    }
);

// 도구 목록 핸들러
server.setRequestHandler(ListToolsRequestSchema, async () => {
    return {
        tools: [
            {
                name: 'hwp_create',
                description: 'Create a new HWP document.',
                inputSchema: {
                    type: 'object',
                    properties: {},
                    required: [],
                },
            },
            {
                name: 'hwp_open',
                description: 'Open an existing HWP document.',
                inputSchema: {
                    type: 'object',
                    properties: {
                        path: {
                            type: 'string',
                            description: 'File path to open',
                        },
                    },
                    required: ['path'],
                },
            },
            {
                name: 'hwp_save',
                description: 'Save the current HWP document.',
                inputSchema: {
                    type: 'object',
                    properties: {
                        path: {
                            type: 'string',
                            description: 'File path to save (optional)',
                        },
                    },
                    required: [],
                },
            },
            {
                name: 'hwp_insert_text',
                description: 'Insert text at the current cursor position.',
                inputSchema: {
                    type: 'object',
                    properties: {
                        text: {
                            type: 'string',
                            description: 'Text to insert',
                        },
                        preserve_linebreaks: {
                            type: 'boolean',
                            description: 'Preserve line breaks in text',
                            default: true,
                        },
                    },
                    required: ['text'],
                },
            },
            {
                name: 'hwp_set_font',
                description: 'Set font properties for selected text.',
                inputSchema: {
                    type: 'object',
                    properties: {
                        name: {
                            type: 'string',
                            description: 'Font name',
                        },
                        size: {
                            type: 'number',
                            description: 'Font size',
                        },
                        bold: {
                            type: 'boolean',
                            description: 'Bold text',
                            default: false,
                        },
                        italic: {
                            type: 'boolean',
                            description: 'Italic text',
                            default: false,
                        },
                        underline: {
                            type: 'boolean',
                            description: 'Underline text',
                            default: false,
                        },
                        select_previous_text: {
                            type: 'boolean',
                            description: 'Select previously entered text',
                            default: false,
                        },
                    },
                    required: [],
                },
            },
            {
                name: 'hwp_insert_table',
                description: 'Insert a table at the current cursor position.',
                inputSchema: {
                    type: 'object',
                    properties: {
                        rows: {
                            type: 'number',
                            description: 'Number of rows',
                        },
                        cols: {
                            type: 'number',
                            description: 'Number of columns',
                        },
                    },
                    required: ['rows', 'cols'],
                },
            },
            {
                name: 'hwp_insert_paragraph',
                description: 'Insert a new paragraph.',
                inputSchema: {
                    type: 'object',
                    properties: {},
                    required: [],
                },
            },
            {
                name: 'hwp_get_text',
                description: 'Get the text content of the current document.',
                inputSchema: {
                    type: 'object',
                    properties: {},
                    required: [],
                },
            },
            {
                name: 'hwp_close',
                description: 'Close the HWP document and connection.',
                inputSchema: {
                    type: 'object',
                    properties: {
                        save: {
                            type: 'boolean',
                            description: 'Save before closing',
                            default: true,
                        },
                    },
                    required: [],
                },
            },
            {
                name: 'hwp_create_table_with_data',
                description: 'Create a table with data at the current cursor position.',
                inputSchema: {
                    type: 'object',
                    properties: {
                        rows: {
                            type: 'number',
                            description: 'Number of rows',
                        },
                        cols: {
                            type: 'number',
                            description: 'Number of columns',
                        },
                        data: {
                            type: 'array',
                            description: 'Table data as 2D array',
                            items: {
                                type: 'array',
                                items: { type: 'string' },
                            },
                        },
                        has_header: {
                            type: 'boolean',
                            description: 'First row as header',
                            default: false,
                        },
                    },
                    required: ['rows', 'cols'],
                },
            },
            {
                name: 'hwp_fill_table_with_data',
                description: 'Fill an existing table with data.',
                inputSchema: {
                    type: 'object',
                    properties: {
                        data: {
                            type: 'array',
                            description: 'Table data as 2D array',
                            items: {
                                type: 'array',
                                items: { type: 'string' },
                            },
                        },
                        start_row: {
                            type: 'number',
                            description: 'Starting row number (1-based)',
                            default: 1,
                        },
                        start_col: {
                            type: 'number',
                            description: 'Starting column number (1-based)',
                            default: 1,
                        },
                        has_header: {
                            type: 'boolean',
                            description: 'First row as header',
                            default: false,
                        },
                    },
                    required: ['data'],
                },
            },
            {
                name: 'hwp_fill_column_numbers',
                description: 'Fill a table column with sequential numbers.',
                inputSchema: {
                    type: 'object',
                    properties: {
                        start: {
                            type: 'number',
                            description: 'Starting number',
                            default: 1,
                        },
                        end: {
                            type: 'number',
                            description: 'Ending number',
                            default: 10,
                        },
                        column: {
                            type: 'number',
                            description: 'Column number (1-based)',
                            default: 1,
                        },
                        from_first_cell: {
                            type: 'boolean',
                            description: 'Start from first cell of table',
                            default: true,
                        },
                    },
                    required: [],
                },
            },
            {
                name: 'hwp_ping_pong',
                description: 'Ping-pong test function.',
                inputSchema: {
                    type: 'object',
                    properties: {
                        message: {
                            type: 'string',
                            description: 'Test message',
                            default: '핑',
                        },
                    },
                    required: [],
                },
            },
        ],
    };
});

// 도구 호출 핸들러
server.setRequestHandler(CallToolRequestSchema, async (request) => {
    try {
        const { name, arguments: args } = request.params;

        switch (name) {
            case 'hwp_create': {
                const hwp = await getHwpController();
                if (!hwp) {
                    return {
                        content: [{ type: 'text', text: 'Error: Failed to connect to HWP program' }],
                    };
                }

                const success = await hwp.createNewDocument();
                return {
                    content: [
                        {
                            type: 'text',
                            text: success ? 'New document created successfully' : 'Error: Failed to create new document',
                        },
                    ],
                };
            }

            case 'hwp_open': {
                const { path } = args as { path: string };
                if (!path) {
                    return {
                        content: [{ type: 'text', text: 'Error: File path is required' }],
                    };
                }

                const hwp = await getHwpController(true);
                if (!hwp) {
                    return {
                        content: [{ type: 'text', text: 'Error: Failed to connect to HWP program' }],
                    };
                }

                const success = await hwp.openDocument(path);
                return {
                    content: [
                        {
                            type: 'text',
                            text: success ? `Document opened: ${path}` : 'Error: Failed to open document',
                        },
                    ],
                };
            }

            case 'hwp_save': {
                const { path } = args as { path?: string };
                const hwp = await getHwpController();
                if (!hwp) {
                    return {
                        content: [{ type: 'text', text: 'Error: Failed to connect to HWP program' }],
                    };
                }

                const success = await hwp.saveDocument(path);
                return {
                    content: [
                        {
                            type: 'text',
                            text: success ? (path ? `Document saved to: ${path}` : 'Document saved') : 'Error: Failed to save document',
                        },
                    ],
                };
            }

            case 'hwp_insert_text': {
                const { text, preserve_linebreaks = true } = args as { text: string; preserve_linebreaks?: boolean };
                if (!text) {
                    return {
                        content: [{ type: 'text', text: 'Error: Text is required' }],
                    };
                }

                const hwp = await getHwpController();
                if (!hwp) {
                    return {
                        content: [{ type: 'text', text: 'Error: Failed to connect to HWP program' }],
                    };
                }

                const success = await hwp.insertText(text, preserve_linebreaks);
                return {
                    content: [
                        {
                            type: 'text',
                            text: success ? 'Text inserted successfully' : 'Error: Failed to insert text',
                        },
                    ],
                };
            }

            case 'hwp_set_font': {
                const { name: fontName, size, bold = false, italic = false, underline = false, select_previous_text = false } = args as {
                    name?: string;
                    size?: number;
                    bold?: boolean;
                    italic?: boolean;
                    underline?: boolean;
                    select_previous_text?: boolean;
                };

                const hwp = await getHwpController();
                if (!hwp) {
                    return {
                        content: [{ type: 'text', text: 'Error: Failed to connect to HWP program' }],
                    };
                }

                const success = await hwp.setFontStyle(fontName, size, bold, italic, underline, select_previous_text);
                return {
                    content: [
                        {
                            type: 'text',
                            text: success ? 'Font set successfully' : 'Error: Failed to set font',
                        },
                    ],
                };
            }

            case 'hwp_insert_table': {
                const { rows, cols } = args as { rows: number; cols: number };
                const tableTools = await getHwpTableTools();
                if (!tableTools) {
                    return {
                        content: [{ type: 'text', text: 'Error: Failed to get table tools instance' }],
                    };
                }

                const result = await tableTools.insertTable(rows, cols);
                return {
                    content: [{ type: 'text', text: result }],
                };
            }

            case 'hwp_insert_paragraph': {
                const hwp = await getHwpController();
                if (!hwp) {
                    return {
                        content: [{ type: 'text', text: 'Error: Failed to connect to HWP program' }],
                    };
                }

                const success = hwp.insertParagraph();
                return {
                    content: [
                        {
                            type: 'text',
                            text: success ? 'Paragraph inserted successfully' : 'Error: Failed to insert paragraph',
                        },
                    ],
                };
            }

            case 'hwp_get_text': {
                const hwp = await getHwpController();
                if (!hwp) {
                    return {
                        content: [{ type: 'text', text: 'Error: Failed to connect to HWP program' }],
                    };
                }

                const text = hwp.getText();
                return {
                    content: [{ type: 'text', text: text || 'Error: Failed to get document text' }],
                };
            }

            case 'hwp_close': {
                if (hwpController && hwpController.isRunning) {
                    const success = hwpController.disconnect();
                    hwpController = null;
                    hwpTableTools = null;
                    return {
                        content: [
                            {
                                type: 'text',
                                text: success ? 'HWP connection closed successfully' : 'Error: Failed to close HWP connection',
                            },
                        ],
                    };
                } else {
                    return {
                        content: [{ type: 'text', text: 'HWP is already closed' }],
                    };
                }
            }

            case 'hwp_create_table_with_data': {
                const { rows, cols, data, has_header = false } = args as {
                    rows: number;
                    cols: number;
                    data?: string[][];
                    has_header?: boolean;
                };

                const tableTools = await getHwpTableTools();
                if (!tableTools) {
                    return {
                        content: [{ type: 'text', text: 'Error: Failed to get table tools instance' }],
                    };
                }

                const result = await tableTools.createTableWithData(rows, cols, data, has_header);
                return {
                    content: [{ type: 'text', text: result }],
                };
            }

            case 'hwp_fill_table_with_data': {
                const { data, start_row = 1, start_col = 1, has_header = false } = args as {
                    data: string[][];
                    start_row?: number;
                    start_col?: number;
                    has_header?: boolean;
                };

                const tableTools = await getHwpTableTools();
                if (!tableTools) {
                    return {
                        content: [{ type: 'text', text: 'Error: Failed to get table tools instance' }],
                    };
                }

                const success = await tableTools.fillTableWithData(data, start_row, start_col, has_header);
                return {
                    content: [
                        {
                            type: 'text',
                            text: success ? 'Table filled with data successfully' : 'Error: Failed to fill table with data',
                        },
                    ],
                };
            }

            case 'hwp_fill_column_numbers': {
                const { start = 1, end = 10, column = 1, from_first_cell = true } = args as {
                    start?: number;
                    end?: number;
                    column?: number;
                    from_first_cell?: boolean;
                };

                const tableTools = await getHwpTableTools();
                if (!tableTools) {
                    return {
                        content: [{ type: 'text', text: 'Error: Failed to get table tools instance' }],
                    };
                }

                const result = await tableTools.fillColumnNumbers(start, end, column, from_first_cell);
                return {
                    content: [{ type: 'text', text: result }],
                };
            }

            case 'hwp_ping_pong': {
                const { message = '핑' } = args as { message?: string };
                
                let response: string;
                if (message === '핑') {
                    response = '퐁';
                } else if (message === '퐁') {
                    response = '핑';
                } else {
                    response = `모르는 메시지입니다: ${message} (핑 또는 퐁을 보내주세요)`;
                }

                const currentTime = new Date().toISOString();
                const result = {
                    response,
                    original_message: message,
                    timestamp: currentTime,
                };

                return {
                    content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
                };
            }

            default:
                return {
                    content: [{ type: 'text', text: `Unknown tool: ${name}` }],
                };
        }
    } catch (error) {
        return {
            content: [{ type: 'text', text: `Error: ${error}` }],
        };
    }
});

// 서버 시작
async function main() {
    const transport = new StdioServerTransport();
    await server.connect(transport);
    console.error('HWP MCP Server (TypeScript) started');
}

if (require.main === module) {
    main().catch((error) => {
        console.error('Server error:', error);
        process.exit(1);
    });
}