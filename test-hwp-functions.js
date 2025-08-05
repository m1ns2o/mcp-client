#!/usr/bin/env node

/**
 * HWP 기능 테스트 스크립트
 */

const { spawn } = require('child_process');
const path = require('path');

class HWPTester {
    constructor() {
        this.mcpServer = null;
        this.requestId = 0;
        this.buffer = '';
        this.responseHandlers = new Map();
    }

    async start() {
        try {
            console.log('🚀 HWP MCP 서버 시작 중...');
            
            const serverScript = path.join(__dirname, 'dist', 'hwp-mcp-server.js');
            this.mcpServer = spawn('node', [serverScript], {
                stdio: ['pipe', 'pipe', 'pipe'],
                shell: true
            });

            // stdout 핸들러 설정
            this.mcpServer.stdout?.on('data', (data) => {
                this.buffer += data.toString();
                const lines = this.buffer.split('\n');
                this.buffer = lines.pop() || '';

                for (const line of lines) {
                    if (line.trim()) {
                        try {
                            const response = JSON.parse(line);
                            if (response.id && this.responseHandlers.has(response.id)) {
                                const handler = this.responseHandlers.get(response.id);
                                this.responseHandlers.delete(response.id);
                                handler(response);
                            }
                        } catch (e) {
                            console.error(`JSON 파싱 오류: ${e}`);
                            console.error(`문제 라인: ${line}`);
                        }
                    }
                }
            });

            this.mcpServer.stderr?.on('data', (data) => {
                console.error(`MCP 서버 로그: ${data.toString()}`);
            });

            // 초기화
            await this.sendInitialize();
            
            console.log('✅ MCP 서버 초기화 완료');
            
            // 기능 테스트 실행
            await this.runTests();

        } catch (error) {
            console.error(`❌ 서버 시작 실패: ${error}`);
        }
    }

    async sendInitialize() {
        const initRequest = {
            jsonrpc: '2.0',
            id: this.getRequestId(),
            method: 'initialize',
            params: {
                protocolVersion: '2024-11-05',
                capabilities: {},
                clientInfo: {
                    name: 'hwp-tester',
                    version: '1.0.0'
                }
            }
        };

        await this.sendRequest(initRequest);

        // initialized 알림 전송
        const initializedNotification = {
            jsonrpc: '2.0',
            method: 'notifications/initialized'
        };

        await this.sendRequest(initializedNotification);
    }

    async sendRequest(request) {
        if (!this.mcpServer || !this.mcpServer.stdin) {
            throw new Error('MCP 서버가 시작되지 않았습니다.');
        }

        const requestStr = JSON.stringify(request) + '\n';
        this.mcpServer.stdin.write(requestStr);

        // 응답이 있는 경우에만 대기
        if (request.id !== undefined) {
            return new Promise((resolve) => {
                this.responseHandlers.set(request.id, resolve);
            });
        }

        return {};
    }

    getRequestId() {
        return ++this.requestId;
    }

    async callTool(toolName, args = {}) {
        const request = {
            jsonrpc: '2.0',
            id: this.getRequestId(),
            method: 'tools/call',
            params: {
                name: toolName,
                arguments: args
            }
        };

        const response = await this.sendRequest(request);
        return response.result || {};
    }

    async runTests() {
        console.log('\n🧪 HWP 기능 테스트 시작\n');

        const tests = [
            {
                name: '새 문서 생성',
                tool: 'hwp_create',
                args: {}
            },
            {
                name: '텍스트 입력',
                tool: 'hwp_insert_text',
                args: { text: 'HWP 기능 테스트 문서' }
            },
            {
                name: '글꼴 설정 (선택 없이)',
                tool: 'hwp_set_font',
                args: { name: '맑은 고딕', size: 16, bold: true }
            },
            {
                name: '단락 삽입',
                tool: 'hwp_insert_paragraph',
                args: {}
            },
            {
                name: '설명 텍스트 입력',
                tool: 'hwp_insert_text',
                args: { text: '이 문서는 TypeScript로 구현된 HWP MCP 서버의 기능을 테스트합니다.' }
            },
            {
                name: '표 생성',
                tool: 'hwp_insert_table',
                args: { rows: 3, cols: 3 }
            },
            {
                name: '표에 데이터 채우기',
                tool: 'hwp_create_table_with_data',
                args: {
                    rows: 2,
                    cols: 3,
                    data: [
                        ['제목1', '제목2', '제목3'],
                        ['내용1', '내용2', '내용3']
                    ],
                    has_header: true
                }
            },
            {
                name: '문서 텍스트 가져오기',
                tool: 'hwp_get_text',
                args: {}
            },
            {
                name: '문서 저장',
                tool: 'hwp_save',
                args: { path: 'hwp_test_result.hwp' }
            },
            {
                name: '핑퐁 테스트',
                tool: 'hwp_ping_pong',
                args: { message: '테스트 완료!' }
            }
        ];

        for (let i = 0; i < tests.length; i++) {
            const test = tests[i];
            console.log(`📝 [${i + 1}/${tests.length}] ${test.name}...`);

            try {
                const result = await this.callTool(test.tool, test.args);
                
                if (result.content && result.content.length > 0) {
                    const content = result.content[0].text;
                    if (content.startsWith('Error:')) {
                        console.log(`   ❌ 실패: ${content}`);
                    } else {
                        console.log(`   ✅ 성공: ${content}`);
                    }
                } else {
                    console.log(`   ⚠️  알 수 없는 응답: ${JSON.stringify(result)}`);
                }

                // 테스트 간 잠시 대기
                await new Promise(resolve => setTimeout(resolve, 500));

            } catch (error) {
                console.log(`   ❌ 오류: ${error}`);
            }
        }

        console.log('\n🎉 모든 테스트 완료!');
        
        // 서버 종료
        if (this.mcpServer) {
            this.mcpServer.kill();
        }
    }
}

// 테스트 실행
const tester = new HWPTester();
tester.start().catch(error => {
    console.error('테스트 실행 오류:', error);
    process.exit(1);
});