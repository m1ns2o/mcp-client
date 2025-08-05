/**
 * 한글(HWP) 문서를 제어하기 위한 컨트롤러 클래스
 * winax를 이용하여 한글 프로그램을 자동화합니다.
 */

import * as winax from 'winax';
import * as path from 'path';
import * as fs from 'fs';

export class HwpController {
    private hwp: any = null;
    private visible: boolean = true;
    private isHwpRunning: boolean = false;
    private currentDocumentPath: string | null = null;

    constructor() {
        // 생성자에서는 초기화만 수행
    }

    /**
     * 한글 프로그램에 연결합니다.
     * @param visible 한글 창을 화면에 표시할지 여부
     * @param registerSecurityModule 보안 모듈을 등록할지 여부
     * @returns 연결 성공 여부
     */
    async connect(visible: boolean = true, registerSecurityModule: boolean = true): Promise<boolean> {
        try {
            this.hwp = new winax.Object("HWPFrame.HwpObject");
            
            // 보안 모듈 등록 (파일 경로 체크 보안 경고창 방지)
            if (registerSecurityModule) {
                try {
                    // 보안 모듈 DLL 경로를 동적으로 계산
                    const modulePath = path.join(__dirname, "..", "..", "hwp-mcp", "security_module", "FilePathCheckerModuleExample.dll");
                    
                    if (fs.existsSync(modulePath)) {
                        this.hwp.RegisterModule("FilePathCheckerModuleExample", modulePath);
                        console.error(`보안 모듈이 등록되었습니다: ${modulePath}`);
                    } else {
                        console.error(`보안 모듈을 찾을 수 없습니다. 경로를 확인하세요: ${modulePath}`);
                    }
                } catch (e) {
                    console.error(`보안 모듈 등록 실패 (무시하고 계속 진행): ${e}`);
                }
            }
            
            this.visible = visible;
            this.hwp.XHwpWindows.Item(0).Visible = visible;
            this.isHwpRunning = true;
            return true;
        } catch (e) {
            console.error(`한글 프로그램 연결 실패: ${e}`);
            return false;
        }
    }

    /**
     * 한글 프로그램 연결을 종료합니다.
     * @returns 종료 성공 여부
     */
    disconnect(): boolean {
        try {
            if (this.isHwpRunning) {
                // HwpObject를 해제합니다
                this.hwp = null;
                this.isHwpRunning = false;
            }
            return true;
        } catch (e) {
            console.error(`한글 프로그램 종료 실패: ${e}`);
            return false;
        }
    }

    /**
     * 새 문서를 생성합니다.
     * @returns 생성 성공 여부
     */
    async createNewDocument(): Promise<boolean> {
        try {
            if (!this.isHwpRunning) {
                await this.connect();
            }
            
            this.hwp.Run("FileNew");
            this.currentDocumentPath = null; // 새 문서는 저장되지 않았으므로
            return true;
        } catch (e) {
            console.error(`새 문서 생성 실패: ${e}`);
            return false;
        }
    }

    /**
     * 문서를 엽니다.
     * @param filePath 열 문서의 경로
     * @returns 열기 성공 여부
     */
    async openDocument(filePath: string): Promise<boolean> {
        try {
            if (!this.isHwpRunning) {
                await this.connect();
            }
            
            const absPath = path.resolve(filePath);
            this.hwp.Open(absPath, "HWP", "");
            this.currentDocumentPath = absPath;
            return true;
        } catch (e) {
            console.error(`문서 열기 실패: ${e}`);
            return false;
        }
    }

    /**
     * 문서를 저장합니다.
     * @param filePath 저장할 경로. null이면 현재 경로에 저장.
     * @returns 저장 성공 여부
     */
    async saveDocument(filePath?: string): Promise<boolean> {
        try {
            if (!this.isHwpRunning) {
                return false;
            }
            
            if (filePath) {
                const absPath = path.resolve(filePath);
                // 파일 형식과 경로 모두 지정하여 저장
                this.hwp.SaveAs(absPath, "HWP", "");
                this.currentDocumentPath = absPath;
            } else {
                if (this.currentDocumentPath) {
                    this.hwp.Save();
                } else {
                    // 저장 대화 상자 표시
                    this.hwp.SaveAs();
                }
            }
            
            return true;
        } catch (e) {
            console.error(`문서 저장 실패: ${e}`);
            return false;
        }
    }

    /**
     * 현재 커서 위치에 텍스트를 삽입합니다.
     * @param text 삽입할 텍스트
     * @param preserveLinebreaks 줄바꿈 유지 여부
     * @returns 삽입 성공 여부
     */
    async insertText(text: string, preserveLinebreaks: boolean = true): Promise<boolean> {
        try {
            if (!this.isHwpRunning) {
                return false;
            }
            
            if (preserveLinebreaks && text.includes('\n')) {
                // 줄바꿈이 포함된 경우 줄 단위로 처리
                const lines = text.split('\n');
                for (let i = 0; i < lines.length; i++) {
                    if (i > 0) { // 첫 줄이 아니면 줄바꿈 추가
                        this.insertParagraph();
                    }
                    if (lines[i].trim()) { // 빈 줄이 아니면 텍스트 삽입
                        this._insertTextDirect(lines[i]);
                    }
                }
                return true;
            } else {
                // 줄바꿈이 없거나 유지하지 않는 경우 한 번에 처리
                return this._insertTextDirect(text);
            }
        } catch (e) {
            console.error(`텍스트 삽입 실패: ${e}`);
            return false;
        }
    }

    /**
     * 텍스트를 직접 삽입하는 내부 메서드입니다.
     * @param text 삽입할 텍스트
     * @returns 삽입 성공 여부
     */
    private _insertTextDirect(text: string): boolean {
        try {
            // 텍스트 삽입을 위한 액션 초기화
            this.hwp.HAction.GetDefault("InsertText", this.hwp.HParameterSet.HInsertText.HSet);
            this.hwp.HParameterSet.HInsertText.Text = text;
            this.hwp.HAction.Execute("InsertText", this.hwp.HParameterSet.HInsertText.HSet);
            return true;
        } catch (e) {
            console.error(`텍스트 직접 삽입 실패: ${e}`);
            return false;
        }
    }

    /**
     * 글꼴 속성을 설정합니다.
     * @param fontName 글꼴 이름
     * @param fontSize 글꼴 크기
     * @param bold 굵게 여부
     * @param italic 기울임꼴 여부
     * @param underline 밑줄 여부
     * @param selectPreviousText 이전에 입력한 텍스트를 선택할지 여부
     * @returns 설정 성공 여부
     */
    async setFontStyle(
        fontName?: string,
        fontSize?: number,
        bold: boolean = false,
        italic: boolean = false,
        underline: boolean = false,
        selectPreviousText: boolean = false
    ): Promise<boolean> {
        try {
            if (!this.isHwpRunning) {
                return false;
            }
            
            // 이전 텍스트 선택 옵션이 활성화된 경우 현재 단락의 이전 텍스트 선택
            if (selectPreviousText) {
                this.selectLastText();
            }
            
            // 글꼴 설정을 위한 액션 초기화
            this.hwp.HAction.GetDefault("CharShape", this.hwp.HParameterSet.HCharShape.HSet);
            
            // 글꼴 이름 설정
            if (fontName) {
                this.hwp.HParameterSet.HCharShape.FaceNameHangul = fontName;
                this.hwp.HParameterSet.HCharShape.FaceNameLatin = fontName;
                this.hwp.HParameterSet.HCharShape.FaceNameHanja = fontName;
                this.hwp.HParameterSet.HCharShape.FaceNameJapanese = fontName;
                this.hwp.HParameterSet.HCharShape.FaceNameOther = fontName;
                this.hwp.HParameterSet.HCharShape.FaceNameSymbol = fontName;
                this.hwp.HParameterSet.HCharShape.FaceNameUser = fontName;
            }
            
            // 글꼴 크기 설정 (hwpunit, 10pt = 1000)
            if (fontSize) {
                this.hwp.HParameterSet.HCharShape.Height = fontSize * 100;
            }
            
            // 스타일 설정
            this.hwp.HParameterSet.HCharShape.Bold = bold;
            this.hwp.HParameterSet.HCharShape.Italic = italic;
            this.hwp.HParameterSet.HCharShape.UnderlineType = underline ? 1 : 0;
            
            // 변경사항 적용
            this.hwp.HAction.Execute("CharShape", this.hwp.HParameterSet.HCharShape.HSet);
            
            return true;
        } catch (e) {
            console.error(`글꼴 스타일 설정 실패: ${e}`);
            return false;
        }
    }

    /**
     * 현재 커서 위치에 표를 삽입합니다.
     * @param rows 행 수
     * @param cols 열 수
     * @returns 삽입 성공 여부
     */
    async insertTable(rows: number, cols: number): Promise<boolean> {
        try {
            if (!this.isHwpRunning) {
                return false;
            }
            
            // 간단한 매크로 방식으로 표 생성 (더 안정적)
            try {
                const tableCommand = `TableCreate ${rows} ${cols}`;
                this.hwp.Run(tableCommand);
                return true;
            } catch (macroError) {
                console.error(`매크로 방식 표 생성 실패, HAction 방식 시도: ${macroError}`);
                
                // 매크로가 실패하면 HAction 방식으로 시도 (ColWidth 설정 없이)
                this.hwp.HAction.GetDefault("TableCreate", this.hwp.HParameterSet.HTableCreation.HSet);
                this.hwp.HParameterSet.HTableCreation.Rows = rows;
                this.hwp.HParameterSet.HTableCreation.Cols = cols;
                this.hwp.HParameterSet.HTableCreation.WidthType = 0;  // 0: 단에 맞춤
                this.hwp.HParameterSet.HTableCreation.HeightType = 0;  // 0: 자동
                
                // ColWidth 설정을 생략하고 기본값 사용
                
                this.hwp.HAction.Execute("TableCreate", this.hwp.HParameterSet.HTableCreation.HSet);
                return true;
            }
        } catch (e) {
            console.error(`표 삽입 실패: ${e}`);
            return false;
        }
    }

    /**
     * 새 단락을 삽입합니다.
     * @returns 삽입 성공 여부
     */
    insertParagraph(): boolean {
        try {
            if (!this.isHwpRunning) {
                return false;
            }
            
            this.hwp.HAction.Run("BreakPara");
            return true;
        } catch (e) {
            console.error(`단락 삽입 실패: ${e}`);
            return false;
        }
    }

    /**
     * 문서 전체를 선택합니다.
     * @returns 선택 성공 여부
     */
    selectAll(): boolean {
        try {
            if (!this.isHwpRunning) {
                return false;
            }
            
            this.hwp.Run("SelectAll");
            return true;
        } catch (e) {
            console.error(`전체 선택 실패: ${e}`);
            return false;
        }
    }

    /**
     * 현재 단락의 마지막으로 입력된 텍스트를 선택합니다.
     * @returns 선택 성공 여부
     */
    selectLastText(): boolean {
        try {
            if (!this.isHwpRunning) {
                return false;
            }
            
            // HWP에서 현재 단락의 모든 텍스트를 선택하는 간단한 방법 사용
            this.hwp.Run("SelectLine");
            
            return true;
        } catch (e) {
            console.error(`텍스트 선택 실패: ${e}`);
            return false;
        }
    }

    /**
     * 현재 문서의 전체 텍스트를 가져옵니다.
     * @returns 문서 텍스트
     */
    getText(): string {
        try {
            if (!this.isHwpRunning) {
                return "";
            }
            
            return this.hwp.GetTextFile("TEXT", "");
        } catch (e) {
            console.error(`텍스트 가져오기 실패: ${e}`);
            return "";
        }
    }

    /**
     * 문서에서 텍스트를 찾습니다.
     * @param text 찾을 텍스트
     * @returns 찾기 성공 여부
     */
    findText(text: string): boolean {
        try {
            if (!this.isHwpRunning) {
                return false;
            }
            
            // 간단한 매크로 명령 사용
            this.hwp.Run("MoveDocBegin");  // 문서 처음으로 이동
            
            // 찾기 명령 실행 (매크로 사용)
            const result = this.hwp.Run(`FindText "${text}" 1`);  // 1=정방향검색
            return result;  // True 또는 False 반환
        } catch (e) {
            console.error(`텍스트 찾기 실패: ${e}`);
            return false;
        }
    }

    /**
     * 문서에서 텍스트를 찾아 바꿉니다.
     * @param findText 찾을 텍스트
     * @param replaceText 바꿀 텍스트
     * @param replaceAll 모두 바꾸기 여부
     * @returns 바꾸기 성공 여부
     */
    replaceText(findText: string, replaceText: string, replaceAll: boolean = false): boolean {
        try {
            if (!this.isHwpRunning) {
                return false;
            }
            
            // 매크로 명령 사용
            this.hwp.Run("MoveDocBegin");  // 문서 처음으로 이동
            
            if (replaceAll) {
                // 모두 바꾸기 명령 실행
                const result = this.hwp.Run(`ReplaceAll "${findText}" "${replaceText}" 0 0 0 0 0 0`);
                return !!result;
            } else {
                // 하나만 바꾸기 (찾고 바꾸기)
                const found = this.hwp.Run(`FindText "${findText}" 1`);
                if (found) {
                    const result = this.hwp.Run(`Replace "${replaceText}"`);
                    return !!result;
                }
                return false;
            }
        } catch (e) {
            console.error(`텍스트 바꾸기 실패: ${e}`);
            return false;
        }
    }

    /**
     * 현재 HWP 실행 상태를 반환합니다.
     */
    get isRunning(): boolean {
        return this.isHwpRunning;
    }

    /**
     * 현재 문서 경로를 반환합니다.
     */
    get documentPath(): string | null {
        return this.currentDocumentPath;
    }
}