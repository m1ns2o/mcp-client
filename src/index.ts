#!/usr/bin/env node
/**
 * 프롬프트 기반 HWP MCP 클라이언트
 * LLM이 구조화된 응답을 반환하면 클라이언트가 MCP 도구를 호출하는 방식
 */

import { spawn, ChildProcess } from "child_process";
import * as readline from "readline";
import axios, { AxiosInstance } from "axios";
import * as path from "path";

// 로깅 유틸리티
class Logger {
	static log(level: string, message: string): void {
		const timestamp = new Date().toISOString();
		console.log(`${timestamp} - ${level} - ${message}`);
	}

	static info(message: string): void {
		this.log("INFO", message);
	}

	static error(message: string): void {
		this.log("ERROR", message);
	}

	static warning(message: string): void {
		this.log("WARNING", message);
	}
}

// 데이터 구조 정의
interface Message {
	role: string;
	content: string;
}

interface ChatRequest {
	messages: Message[];
	max_tokens?: number;
	temperature?: number;
	model_name?: string;
}

interface MCPToolCall {
	tool_name: string;
	arguments: Record<string, any>;
	description?: string;
}

interface ToolResult {
	tool: string;
	description: string;
	result: string;
	success: boolean;
}

interface ProcessResult {
	success: boolean;
	message: string;
	tool_results: ToolResult[];
	prompt: string;
}

interface MCPRequest {
	jsonrpc: string;
	id?: number;
	method: string;
	params?: any;
}

interface MCPResponse {
	jsonrpc: string;
	id?: number;
	result?: any;
	error?: any;
}

interface Tool {
	name: string;
	description: string;
	inputSchema?: {
		properties?: Record<string, any>;
		required?: string[];
	};
}

/**
 * MCP 서버와 통신하는 클라이언트
 */
class MCPClient {
	private mcpServerPath: string;
	private process: ChildProcess | null = null;
	private requestId: number = 0;
	private availableTools: Tool[] = [];
	private responseHandlers: Map<number, (response: MCPResponse) => void> =
		new Map();
	private buffer: string = "";

	constructor(mcpServerPath: string) {
		this.mcpServerPath = mcpServerPath;
	}

	async start(): Promise<void> {
		try {
			const pythonExecutable = path.join(this.mcpServerPath, "myenv", "Scripts", "python.exe");
			this.process = spawn(pythonExecutable, ["hwp_mcp_stdio_server.py"], {
				stdio: ["pipe", "pipe", "pipe"],
				cwd: this.mcpServerPath,
				// shell: true,
			});

			Logger.info("MCP 서버가 시작되었습니다.");

			// stdout 핸들러 설정
			this.process.stdout?.on("data", (data: Buffer) => {
				this.buffer += data.toString();
				const lines = this.buffer.split("\n");
				this.buffer = lines.pop() || "";

				for (const line of lines) {
					if (line.trim()) {
						try {
							const response = JSON.parse(line) as MCPResponse;
							if (response.id && this.responseHandlers.has(response.id)) {
								const handler = this.responseHandlers.get(response.id)!;
								this.responseHandlers.delete(response.id);
								handler(response);
							}
						} catch (e) {
							Logger.error(`JSON 파싱 오류: ${e}`);
						}
					}
				}
			});

			this.process.stderr?.on("data", (data: Buffer) => {
				Logger.error(`MCP 서버 에러: ${data.toString()}`);
			});

			// 초기화
			await this._sendInitialize();

			// 사용 가능한 도구 목록 로드
			this.availableTools = await this.listTools();
			Logger.info(`사용 가능한 도구 ${this.availableTools.length}개 로드됨`);
		} catch (error) {
			Logger.error(`MCP 서버 시작 실패: ${error}`);
			throw error;
		}
	}

	async stop(): Promise<void> {
		if (this.process) {
			try {
				this.process.kill();
				Logger.info("MCP 서버가 중지되었습니다.");
			} catch (error) {
				Logger.error(`MCP 서버 중지 중 오류: ${error}`);
			}
		}
	}

	private async _sendInitialize(): Promise<void> {
		const initRequest: MCPRequest = {
			jsonrpc: "2.0",
			id: this._getRequestId(),
			method: "initialize",
			params: {
				protocolVersion: "2024-11-05",
				capabilities: {},
				clientInfo: {
					name: "hwp-prompt-client",
					version: "1.0.0",
				},
			},
		};

		await this._sendRequest(initRequest);

		// initialized 알림 전송
		const initializedNotification: MCPRequest = {
			jsonrpc: "2.0",
			method: "notifications/initialized",
		};

		await this._sendRequest(initializedNotification);
	}

	private async _sendRequest(request: MCPRequest): Promise<MCPResponse> {
		if (!this.process || !this.process.stdin) {
			throw new Error("MCP 서버가 시작되지 않았습니다.");
		}

		const requestStr = JSON.stringify(request) + "\n";
		this.process.stdin.write(requestStr);

		// 응답이 있는 경우에만 대기
		if (request.id !== undefined) {
			return new Promise((resolve) => {
				this.responseHandlers.set(request.id!, resolve);
			});
		}

		return {} as MCPResponse;
	}

	private _getRequestId(): number {
		return ++this.requestId;
	}

	async listTools(): Promise<Tool[]> {
		const request: MCPRequest = {
			jsonrpc: "2.0",
			id: this._getRequestId(),
			method: "tools/list",
		};

		const response = await this._sendRequest(request);
		return response.result?.tools || [];
	}

	async callTool(toolName: string, args: Record<string, any>): Promise<any> {
		const request: MCPRequest = {
			jsonrpc: "2.0",
			id: this._getRequestId(),
			method: "tools/call",
			params: {
				name: toolName,
				arguments: args,
			},
		};

		const response = await this._sendRequest(request);
		return response.result || {};
	}

	getToolsSummary(): string {
		if (!this.availableTools.length) {
			return "사용 가능한 도구가 없습니다.";
		}

		const toolsText: string[] = [];

		for (const tool of this.availableTools) {
			const name = tool.name || "Unknown";
			const desc = tool.description || "No description";

			// 인자 정보 추가
			const argsInfo: string[] = [];
			if (tool.inputSchema?.properties) {
				const required = tool.inputSchema.required || [];

				for (const [argName, argInfo] of Object.entries(
					tool.inputSchema.properties
				)) {
					const argDesc = argInfo.description || "";
					const argType = argInfo.type || "string";
					const isRequired = required.includes(argName);
					const requiredMark = isRequired ? " (필수)" : " (선택)";
					argsInfo.push(
						`  - ${argName} (${argType})${requiredMark}: ${argDesc}`
					);
				}
			}

			let toolText = `• ${name}: ${desc}`;
			if (argsInfo.length) {
				toolText += "\n" + argsInfo.join("\n");
			}

			toolsText.push(toolText);
		}

		return toolsText.join("\n\n");
	}
}

/**
 * LLM 서버와 통신하는 클라이언트
 */
class LLMClient {
	private llmServerUrl: string;
	private client: AxiosInstance;

	constructor(llmServerUrl: string = "http://localhost:8000") {
		this.llmServerUrl = llmServerUrl;
		this.client = axios.create({
			baseURL: llmServerUrl,
			timeout: 30000,
		});
	}

	async chat(
		messages: Message[],
		options: Partial<ChatRequest> = {}
	): Promise<string> {
		const chatRequest: ChatRequest = {
			messages,
			max_tokens: options.max_tokens || 2000,
			temperature: options.temperature || 0.5,
			model_name: options.model_name || "gemini-2.5-flash",
		};

		try {
			const response = await this.client.post("/chat", chatRequest);
			return response.data.response || "";
		} catch (error) {
			Logger.error(`LLM 서버 통신 오류: ${error}`);
			throw error;
		}
	}
}

/**
 * 프롬프트 기반 HWP 작업 처리기
 */
class HWPPromptProcessor {
	private mcpClient: MCPClient;
	private llmClient: LLMClient;

	constructor(mcpClient: MCPClient, llmClient: LLMClient) {
		this.mcpClient = mcpClient;
		this.llmClient = llmClient;
	}

	createSystemPrompt(): string {
		const toolsSummary = this.mcpClient.getToolsSummary();

		return `당신은 HWP 문서 작업을 도와주는 전문 어시스턴트입니다.
사용자의 요청을 분석하여 적절한 HWP 도구를 호출하거나 정보를 제공합니다.

## 사용 가능한 HWP 도구들:
${toolsSummary}

## 응답 규칙:
1. 일반적인 질문이나 대화: 자연스럽게 응답하세요.

2. HWP 작업이 필요한 경우: 다음 형식으로 응답하세요:
\`\`\`
<ACTION>
TOOL: tool_name
ARGS: {"arg1": "value1", "arg2": "value2"}
DESC: 이 작업에 대한 설명
</ACTION>

사용자에게 보여줄 친근한 설명
\`\`\`

3. 여러 도구를 순차적으로 호출해야 하는 경우:
\`\`\`
<ACTION>
TOOL: first_tool
ARGS: {"arg1": "value1"}
DESC: 첫 번째 작업 설명
</ACTION>

<ACTION>
TOOL: second_tool
ARGS: {"arg1": "value1"}
DESC: 두 번째 작업 설명
</ACTION>

전체 작업에 대한 설명
\`\`\`

## 중요 사항:
- 문서 작업 전에는 반드시 hwp_create로 새 문서를 만들어야 합니다
- JSON 형식의 ARGS는 정확한 구문을 사용하세요
- 한국어 텍스트 처리에 주의하세요
- 테이블 크기는 내용에 맞게 적절히 설정하세요

## 작업 순서 예시:
1. 새 문서 → hwp_create
2. 텍스트 입력 → hwp_insert_text  
3. 서식 변경 → hwp_set_font
4. 테이블 생성 → hwp_insert_table
5. 문서 저장 → hwp_save`;
	}

	parseLLMResponse(response: string): [MCPToolCall[], string] {
		const toolCalls: MCPToolCall[] = [];

		// <ACTION>...</ACTION> 패턴 찾기
		const actionPattern = /<ACTION>(.*?)<\/ACTION>/gs;
		const actions = response.match(actionPattern) || [];

		for (const action of actions) {
			try {
				const actionText = action.replace(/<\/?ACTION>/g, "");

				// TOOL, ARGS, DESC 추출
				const toolMatch = actionText.match(/TOOL:\s*([^\n]+)/);
				const argsMatch = actionText.match(/ARGS:\s*(\{.*?\})/s);
				const descMatch = actionText.match(/DESC:\s*([^\n]+)/);

				if (toolMatch) {
					const toolName = toolMatch[1].trim();

					// 인자 파싱
					let args: Record<string, any> = {};
					if (argsMatch) {
						try {
							args = JSON.parse(argsMatch[1]);
						} catch (e) {
							Logger.warning(`JSON 파싱 오류: ${e}, 원본: ${argsMatch[1]}`);
						}
					}

					const description = descMatch ? descMatch[1].trim() : "";

					toolCalls.push({
						tool_name: toolName,
						arguments: args,
						description,
					});
				}
			} catch (error) {
				Logger.error(`액션 파싱 오류: ${error}, 원본: ${action}`);
			}
		}

		// 도구 호출 부분을 제거한 메시지
		let cleanResponse = response.replace(actionPattern, "");
		cleanResponse = cleanResponse.trim();

		return [toolCalls, cleanResponse];
	}

	async processRequest(
		userInput: string,
		conversationHistory: Message[] = []
	): Promise<[string, ToolResult[]]> {
		// 시스템 프롬프트 추가 (맨 처음에만)
		if (
			!conversationHistory.length ||
			conversationHistory[0].role !== "system"
		) {
			const systemMessage: Message = {
				role: "system",
				content: this.createSystemPrompt(),
			};
			conversationHistory.unshift(systemMessage);
		}

		// 사용자 메시지 추가
		const userMessage: Message = {
			role: "user",
			content: userInput,
		};
		conversationHistory.push(userMessage);

		// LLM에 요청
		const llmResponse = await this.llmClient.chat(conversationHistory);

		// 응답 파싱
		const [toolCalls, cleanMessage] = this.parseLLMResponse(llmResponse);

		// 도구 호출 실행
		const toolResults: ToolResult[] = [];

		if (toolCalls.length) {
			for (const toolCall of toolCalls) {
				try {
					Logger.info(
						`도구 호출: ${toolCall.tool_name} with ${JSON.stringify(
							toolCall.arguments
						)}`
					);
					const result = await this.mcpClient.callTool(
						toolCall.tool_name,
						toolCall.arguments
					);

					// 결과 텍스트 추출
					let resultText = "성공";
					if (result.content) {
						for (const content of result.content) {
							if (content.type === "text") {
								resultText = content.text || "성공";
								break;
							}
						}
					}

					toolResults.push({
						tool: toolCall.tool_name,
						description: toolCall.description || "",
						result: resultText,
						success: true,
					});
				} catch (error) {
					Logger.error(`도구 호출 오류 (${toolCall.tool_name}): ${error}`);
					toolResults.push({
						tool: toolCall.tool_name,
						description: toolCall.description || "",
						result: `오류: ${error}`,
						success: false,
					});
				}
			}
		}

		// 대화 히스토리에 어시스턴트 응답 추가
		conversationHistory.push({
			role: "assistant",
			content: llmResponse,
		});

		return [cleanMessage, toolResults];
	}
}

/**
 * 메인 클라이언트 애플리케이션
 */
class HWPPromptClient {
	private mcpClient: MCPClient;
	private llmClient: LLMClient;
	private processor: HWPPromptProcessor | null = null;
	private conversationHistory: Message[] = [];

	constructor(
		mcpServerPath: string,
		llmServerUrl: string = "http://localhost:8000"
	) {
		this.mcpClient = new MCPClient(mcpServerPath);
		this.llmClient = new LLMClient(llmServerUrl);
	}

	async initialize(): Promise<void> {
		await this.mcpClient.start();
		this.processor = new HWPPromptProcessor(this.mcpClient, this.llmClient);
		Logger.info("클라이언트 초기화 완료");
	}

	async cleanup(): Promise<void> {
		await this.mcpClient.stop();
	}

	async processPrompt(prompt: string): Promise<ProcessResult> {
		if (!this.processor) {
			throw new Error("클라이언트가 초기화되지 않았습니다.");
		}

		try {
			const [message, toolResults] = await this.processor.processRequest(
				prompt,
				this.conversationHistory
			);

			return {
				success: true,
				message,
				tool_results: toolResults,
				prompt,
			};
		} catch (error) {
			Logger.error(`프롬프트 처리 오류: ${error}`);
			return {
				success: false,
				message: `처리 중 오류가 발생했습니다: ${error}`,
				tool_results: [],
				prompt,
			};
		}
	}

	async runInteractive(): Promise<void> {
		console.log("🤖 HWP 프롬프트 클라이언트에 오신 것을 환영합니다!");
		console.log(
			"자연어로 HWP 작업을 요청해보세요. 'quit' 입력 시 종료됩니다.\n"
		);

		const rl = readline.createInterface({
			input: process.stdin,
			output: process.stdout,
		});

		const question = (prompt: string): Promise<string> => {
			return new Promise((resolve) => {
				rl.question(prompt, resolve);
			});
		};

		try {
			while (true) {
				const prompt = await question("📝 요청: ");
				const trimmedPrompt = prompt.trim();

				if (["quit", "exit", "종료"].includes(trimmedPrompt.toLowerCase())) {
					console.log("👋 프로그램을 종료합니다.");
					break;
				}

				if (!trimmedPrompt) {
					continue;
				}

				console.log("⏳ 처리 중...");
				const result = await this.processPrompt(trimmedPrompt);

				if (result.success) {
					console.log(`✅ ${result.message}`);

					if (result.tool_results.length) {
						console.log("\n🔧 실행된 작업:");
						for (const toolResult of result.tool_results) {
							const status = toolResult.success ? "✅" : "❌";
							console.log(
								`  ${status} ${toolResult.description}: ${toolResult.result}`
							);
						}
					}
				} else {
					console.log(`❌ ${result.message}`);
				}

				console.log();
			}
		} catch (error) {
			console.log(`❌ 오류: ${error}`);
			Logger.error(`대화형 모드 오류: ${error}`);
		} finally {
			rl.close();
		}
	}
}

/**
 * 배치 프롬프트 테스트
 */
async function runBatchPrompts(): Promise<void> {
	console.log("📋 배치 프롬프트 테스트 모드");

	const testPrompts = [
		"새 HWP 문서를 만들어줘",
		"제목으로 '프로젝트 계획서'를 크고 굵게 입력해줘",
		"한 줄 띄우고 '작성자: AI 어시스턴트'를 입력해줘",
		"다시 한 줄 띄우고 4행 3열 테이블을 만들어줘",
		"테이블 첫 번째 행에 '항목, 일정, 담당자'를 헤더로 입력해줘",
		"문서를 'project_plan.hwp'로 저장해줘",
	];

	const mcpServerPath = path.join(__dirname, "..", "hwp-mcp");
	const client = new HWPPromptClient(mcpServerPath);

	try {
		await client.initialize();

		for (let i = 0; i < testPrompts.length; i++) {
			const prompt = testPrompts[i];
			console.log(`\n📝 [${i + 1}/${testPrompts.length}] ${prompt}`);

			const result = await client.processPrompt(prompt);

			if (result.success) {
				console.log(`✅ ${result.message}`);
				for (const toolResult of result.tool_results) {
					const status = toolResult.success ? "✅" : "❌";
					console.log(`  ${status} ${toolResult.description}`);
				}
			} else {
				console.log(`❌ ${result.message}`);
			}

			// 작업 간 잠시 대기
			await new Promise((resolve) => setTimeout(resolve, 1000));
		}

		console.log("\n🎉 배치 테스트 완료!");
	} catch (error) {
		console.log(`❌ 배치 테스트 오류: ${error}`);
		Logger.error(`배치 테스트 오류: ${error}`);
	} finally {
		await client.cleanup();
	}
}

/**
 * 메인 함수
 */
async function main(): Promise<void> {
	const args = process.argv.slice(2);

	if (args.length > 0 && args[0] === "batch") {
		await runBatchPrompts();
	} else {
		const mcpServerPath = path.join(__dirname, "hwp-mcp");
		const client = new HWPPromptClient(mcpServerPath);

		try {
			await client.initialize();
			await client.runInteractive();
		} catch (error) {
			console.log(`❌ 클라이언트 실행 오류: ${error}`);
			Logger.error(`메인 실행 오류: ${error}`);
		} finally {
			await client.cleanup();
		}
	}
}

// 프로그램 실행
if (require.main === module) {
	main().catch((error) => {
		console.error(`❌ 실행 오류: ${error}`);
		Logger.error(`메인 실행 오류: ${error}`);
		process.exit(1);
	});

	// Ctrl+C 처리
	process.on("SIGINT", () => {
		console.log("\n👋 프로그램이 중단되었습니다.");
		process.exit(0);
	});
}
