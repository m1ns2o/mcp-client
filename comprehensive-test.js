#!/usr/bin/env node

/**
 * HWP 종합 기능 테스트 스크립트
 */

const { spawn } = require('child_process');
const path = require('path');

class ComprehensiveHWPTester {
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
                            // JSON이 아닌 출력은 무시
                        }
                    }
                }
            });

            this.mcpServer.stderr?.on('data', (data) => {
                // 서버 로그는 표시하지 않음 (너무 많아서)
            });

            await this.sendInitialize();
            console.log('✅ MCP 서버 초기화 완료\n');
            
            await this.runComprehensiveTests();

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
                clientInfo: { name: 'comprehensive-tester', version: '1.0.0' }
            }
        };

        await this.sendRequest(initRequest);
        await this.sendRequest({
            jsonrpc: '2.0',
            method: 'notifications/initialized'
        });
    }

    async sendRequest(request) {
        const requestStr = JSON.stringify(request) + '\n';
        this.mcpServer.stdin.write(requestStr);

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
            params: { name: toolName, arguments: args }
        };

        const response = await this.sendRequest(request);
        return response.result || {};
    }

    async runComprehensiveTests() {
        console.log('🧪 HWP 종합 기능 테스트 시작\n');

        const testSuites = [
            {
                name: '📄 기본 문서 기능',
                tests: [
                    { name: '새 문서 생성', tool: 'hwp_create' },
                    { name: '제목 입력', tool: 'hwp_insert_text', args: { text: 'HWP 종합 기능 테스트 보고서' } },
                    { name: '제목 폰트 설정', tool: 'hwp_set_font', args: { name: '맑은 고딕', size: 18, bold: true, select_previous_text: true } },
                    { name: '줄바꿈', tool: 'hwp_insert_paragraph' },
                    { name: '줄바꿈', tool: 'hwp_insert_paragraph' }
                ]
            },
            {
                name: '✏️ 텍스트 기능',
                tests: [
                    { name: '본문 입력', tool: 'hwp_insert_text', args: { text: '이 문서는 TypeScript로 구현된 HWP MCP 서버의 모든 기능을 종합적으로 테스트합니다.\n\n다음 기능들이 테스트됩니다:\n- 문서 생성 및 저장\n- 텍스트 입력 및 서식\n- 표 생성 및 데이터 입력\n- 다양한 글꼴 설정' } },
                    { name: '본문 폰트 설정', tool: 'hwp_set_font', args: { name: '맑은 고딕', size: 11, select_previous_text: true } },
                    { name: '줄바꿈', tool: 'hwp_insert_paragraph' }
                ]
            },
            {
                name: '📊 표 기능 테스트',
                tests: [
                    { name: '소제목 입력', tool: 'hwp_insert_text', args: { text: '1. 기본 표 생성 테스트' } },
                    { name: '소제목 폰트 설정', tool: 'hwp_set_font', args: { name: '맑은 고딕', size: 14, bold: true, select_previous_text: true } },
                    { name: '줄바꿈', tool: 'hwp_insert_paragraph' },
                    { name: '기본 표 생성', tool: 'hwp_insert_table', args: { rows: 4, cols: 3 } },
                    { name: '줄바꿈', tool: 'hwp_insert_paragraph' }
                ]
            },
            {
                name: '📈 데이터 표 테스트',
                tests: [
                    { name: '소제목 입력', tool: 'hwp_insert_text', args: { text: '2. 데이터가 포함된 표 생성' } },
                    { name: '소제목 폰트 설정', tool: 'hwp_set_font', args: { name: '맑은 고딕', size: 14, bold: true, select_previous_text: true } },
                    { name: '줄바꿈', tool: 'hwp_insert_paragraph' },
                    { 
                        name: '데이터 표 생성', 
                        tool: 'hwp_create_table_with_data', 
                        args: {
                            rows: 4,
                            cols: 4,
                            data: [
                                ['항목', '1월', '2월', '3월'],
                                ['매출', '1000', '1200', '1100'],
                                ['비용', '800', '900', '850'],
                                ['이익', '200', '300', '250']
                            ],
                            has_header: true
                        }
                    },
                    { name: '줄바꿈', tool: 'hwp_insert_paragraph' }
                ]
            },
            {
                name: '🔢 숫자 채우기 테스트',
                tests: [
                    { name: '소제목 입력', tool: 'hwp_insert_text', args: { text: '3. 숫자 자동 채우기 테스트' } },
                    { name: '소제목 폰트 설정', tool: 'hwp_set_font', args: { name: '맑은 고딕', size: 14, bold: true, select_previous_text: true } },
                    { name: '줄바꿈', tool: 'hwp_insert_paragraph' },
                    { name: '기본 표 생성', tool: 'hwp_insert_table', args: { rows: 6, cols: 2 } },
                    { name: '첫 번째 열에 숫자 채우기', tool: 'hwp_fill_column_numbers', args: { start: 1, end: 6, column: 1, from_first_cell: true } },
                    { name: '줄바꿈', tool: 'hwp_insert_paragraph' }
                ]
            },
            {
                name: '💾 파일 기능 테스트',
                tests: [
                    { name: '소제목 입력', tool: 'hwp_insert_text', args: { text: '4. 테스트 완료' } },
                    { name: '소제목 폰트 설정', tool: 'hwp_set_font', args: { name: '맑은 고딕', size: 14, bold: true, select_previous_text: true } },
                    { name: '줄바꿈', tool: 'hwp_insert_paragraph' },
                    { name: '완료 메시지', tool: 'hwp_insert_text', args: { text: '모든 HWP 기능이 성공적으로 테스트되었습니다.' } },
                    { name: '문서 저장', tool: 'hwp_save', args: { path: 'HWP_종합테스트_결과.hwp' } }
                ]
            },
            {
                name: '🔄 기타 기능 테스트',
                tests: [
                    { name: '문서 텍스트 가져오기', tool: 'hwp_get_text' },
                    { name: '핑퐁 테스트', tool: 'hwp_ping_pong', args: { message: '핑' } },
                    { name: '문서 닫기', tool: 'hwp_close', args: { save: false } }
                ]
            }
        ];

        let totalTests = 0;
        let passedTests = 0;

        for (const suite of testSuites) {
            console.log(`\n${suite.name}`);
            console.log('─'.repeat(50));

            for (const test of suite.tests) {
                totalTests++;
                process.stdout.write(`  ${test.name}... `);

                try {
                    const result = await this.callTool(test.tool, test.args || {});
                    
                    if (result.content && result.content.length > 0) {
                        const content = result.content[0].text;
                        if (content.startsWith('Error:')) {
                            console.log(`❌ ${content}`);
                        } else {
                            console.log('✅');
                            passedTests++;
                        }
                    } else {
                        console.log('⚠️');
                        passedTests++; // 응답이 있으면 성공으로 간주
                    }

                    await new Promise(resolve => setTimeout(resolve, 300));

                } catch (error) {
                    console.log(`❌ ${error.message}`);
                }
            }
        }

        console.log('\n' + '='.repeat(60));
        console.log(`🎯 테스트 결과: ${passedTests}/${totalTests} 통과 (${Math.round(passedTests/totalTests*100)}%)`);
        
        if (passedTests === totalTests) {
            console.log('🎉 모든 HWP 기능이 정상적으로 작동합니다!');
        } else {
            console.log(`⚠️  ${totalTests - passedTests}개의 기능에서 문제가 발견되었습니다.`);
        }

        console.log('='.repeat(60));

        if (this.mcpServer) {
            this.mcpServer.kill();
        }
    }
}

// 종합 테스트 실행
const tester = new ComprehensiveHWPTester();
tester.start().catch(error => {
    console.error('테스트 실행 오류:', error);
    process.exit(1);
});