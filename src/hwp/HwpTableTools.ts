/**
 * HWP 표 관련 작업을 처리하는 도구 클래스
 */

import { HwpController } from './HwpController';

export class HwpTableTools {
    private hwpController: HwpController;

    constructor(hwpController: HwpController) {
        this.hwpController = hwpController;
    }

    /**
     * 현재 커서 위치에 표를 삽입합니다.
     * @param rows 행 수
     * @param cols 열 수
     * @returns 결과 메시지
     */
    async insertTable(rows: number, cols: number): Promise<string> {
        try {
            if (!this.hwpController.isRunning) {
                return "Error: HWP가 실행되지 않았습니다.";
            }

            if (rows <= 0 || cols <= 0) {
                return "Error: 행과 열 수는 1 이상이어야 합니다.";
            }

            const success = await this.hwpController.insertTable(rows, cols);
            if (success) {
                return `표 생성 완료 (${rows}x${cols})`;
            } else {
                return "Error: 표 생성에 실패했습니다.";
            }
        } catch (e) {
            return `Error: ${e}`;
        }
    }

    /**
     * 표의 특정 셀에 텍스트를 설정합니다.
     * @param row 행 번호 (1부터 시작)
     * @param col 열 번호 (1부터 시작)
     * @param text 설정할 텍스트
     * @returns 결과 메시지
     */
    async setCellText(row: number, col: number, text: string): Promise<string> {
        try {
            if (!this.hwpController.isRunning) {
                return "Error: HWP가 실행되지 않았습니다.";
            }

            if (row <= 0 || col <= 0) {
                return "Error: 행과 열 번호는 1 이상이어야 합니다.";
            }

            // 표의 첫 번째 셀로 이동
            const hwp = (this.hwpController as any).hwp;
            hwp.Run("TableUpperLeftCell");

            // 지정된 행과 열로 이동
            for (let i = 1; i < row; i++) {
                hwp.Run("TableLowerCell");
            }
            for (let i = 1; i < col; i++) {
                hwp.Run("TableRightCell");
            }

            // 셀 선택 및 내용 지우기
            hwp.Run("TableSelCell");
            hwp.Run("Delete");

            // 텍스트 입력
            hwp.HAction.GetDefault("InsertText", hwp.HParameterSet.HInsertText.HSet);
            hwp.HParameterSet.HInsertText.Text = text;
            hwp.HAction.Execute("InsertText", hwp.HParameterSet.HInsertText.HSet);

            return `셀 (${row}, ${col})에 텍스트가 설정되었습니다.`;
        } catch (e) {
            return `Error: ${e}`;
        }
    }

    /**
     * 표에 데이터를 채웁니다.
     * @param data 2차원 배열 형태의 데이터
     * @param startRow 시작 행 번호 (1부터 시작)
     * @param startCol 시작 열 번호 (1부터 시작)
     * @param hasHeader 첫 번째 행을 헤더로 처리할지 여부
     * @returns 작업 성공 여부
     */
    async fillTableWithData(
        data: string[][],
        startRow: number = 1,
        startCol: number = 1,
        hasHeader: boolean = false
    ): Promise<boolean> {
        try {
            if (!this.hwpController.isRunning) {
                return false;
            }

            const hwp = (this.hwpController as any).hwp;

            // 표의 첫 번째 셀로 이동
            hwp.Run("TableUpperLeftCell");

            // 시작 위치로 이동
            for (let i = 0; i < startRow - 1; i++) {
                hwp.Run("TableLowerCell");
            }
            for (let i = 0; i < startCol - 1; i++) {
                hwp.Run("TableRightCell");
            }

            // 데이터 채우기
            for (let rowIdx = 0; rowIdx < data.length; rowIdx++) {
                const rowData = data[rowIdx];
                for (let colIdx = 0; colIdx < rowData.length; colIdx++) {
                    const cellValue = rowData[colIdx];

                    // 셀 선택 및 내용 삭제
                    hwp.Run("TableSelCell");
                    hwp.Run("Delete");

                    // 셀에 값 입력
                    if (hasHeader && rowIdx === 0) {
                        await this.hwpController.setFontStyle(undefined, undefined, true);
                        hwp.HAction.GetDefault("InsertText", hwp.HParameterSet.HInsertText.HSet);
                        hwp.HParameterSet.HInsertText.Text = cellValue;
                        hwp.HAction.Execute("InsertText", hwp.HParameterSet.HInsertText.HSet);
                        await this.hwpController.setFontStyle(undefined, undefined, false);
                    } else {
                        hwp.HAction.GetDefault("InsertText", hwp.HParameterSet.HInsertText.HSet);
                        hwp.HParameterSet.HInsertText.Text = cellValue;
                        hwp.HAction.Execute("InsertText", hwp.HParameterSet.HInsertText.HSet);
                    }

                    // 다음 셀로 이동 (마지막 셀이 아닌 경우)
                    if (colIdx < rowData.length - 1) {
                        hwp.Run("TableRightCell");
                    }
                }

                // 다음 행으로 이동 (마지막 행이 아닌 경우)
                if (rowIdx < data.length - 1) {
                    for (let i = 0; i < rowData.length - 1; i++) {
                        hwp.Run("TableLeftCell");
                    }
                    hwp.Run("TableLowerCell");
                }
            }

            // 표 밖으로 커서 이동
            hwp.Run("TableSelCell");  // 현재 셀 선택
            hwp.Run("Cancel");        // 선택 취소
            hwp.Run("MoveDown");      // 아래로 이동

            return true;
        } catch (e) {
            console.error(`표 데이터 채우기 실패: ${e}`);
            return false;
        }
    }

    /**
     * 표 셀을 병합합니다.
     * @param startRow 시작 행
     * @param startCol 시작 열
     * @param endRow 끝 행
     * @param endCol 끝 열
     * @returns 결과 메시지
     */
    async mergeCells(startRow: number, startCol: number, endRow: number, endCol: number): Promise<string> {
        try {
            if (!this.hwpController.isRunning) {
                return "Error: HWP가 실행되지 않았습니다.";
            }

            if (startRow <= 0 || startCol <= 0 || endRow <= 0 || endCol <= 0) {
                return "Error: 행과 열 번호는 1 이상이어야 합니다.";
            }

            if (startRow > endRow || startCol > endCol) {
                return "Error: 시작 위치가 끝 위치보다 클 수 없습니다.";
            }

            const hwp = (this.hwpController as any).hwp;

            // 시작 셀로 이동
            hwp.Run("TableUpperLeftCell");
            for (let i = 1; i < startRow; i++) {
                hwp.Run("TableLowerCell");
            }
            for (let i = 1; i < startCol; i++) {
                hwp.Run("TableRightCell");
            }

            // 셀 범위 선택
            hwp.Run("TableSelCell");
            
            // 끝 셀까지 확장 선택
            for (let i = startRow; i < endRow; i++) {
                hwp.Run("TableSelLowerCell");
            }
            for (let i = startCol; i < endCol; i++) {
                hwp.Run("TableSelRightCell");
            }

            // 셀 병합 실행
            hwp.Run("TableMergeCell");

            return `셀 병합 완료 (${startRow},${startCol}) ~ (${endRow},${endCol})`;
        } catch (e) {
            return `Error: ${e}`;
        }
    }

    /**
     * 표의 특정 열에 시작 숫자부터 끝 숫자까지 세로로 채웁니다.
     * @param start 시작 숫자
     * @param end 끝 숫자
     * @param column 숫자를 채울 열 번호 (1부터 시작)
     * @param fromFirstCell 정확히 표의 첫 번째 셀부터 시작할지 여부
     * @returns 결과 메시지
     */
    async fillColumnNumbers(start: number = 1, end: number = 10, column: number = 1, fromFirstCell: boolean = true): Promise<string> {
        try {
            if (!this.hwpController.isRunning) {
                return "Error: HWP가 실행되지 않았습니다.";
            }

            const hwp = (this.hwpController as any).hwp;

            console.error(`테이블 열에 숫자 채우기: 열 ${column}, ${start}부터 ${end}까지`);

            // 표의 첫 번째 셀로 이동 (문서의 표 맨 앞)
            hwp.Run("TableUpperLeftCell");

            // fromFirstCell이 false인 경우에만 아래로 이동
            if (!fromFirstCell) {
                hwp.Run("TableLowerCell");
            }

            // 지정된 열로 이동
            for (let i = 0; i < column - 1; i++) {
                hwp.Run("TableRightCell");
            }

            // 각 행에 숫자 채우기
            for (let num = start; num <= end; num++) {
                // 셀 선택 및 내용 지우기
                hwp.Run("TableSelCell");
                hwp.Run("Delete");

                // 셀에 숫자 입력
                hwp.HAction.GetDefault("InsertText", hwp.HParameterSet.HInsertText.HSet);
                hwp.HParameterSet.HInsertText.Text = num.toString();
                hwp.HAction.Execute("InsertText", hwp.HParameterSet.HInsertText.HSet);

                // 다음 행으로 이동 (마지막 행이 아닌 경우)
                if (num < end) {
                    hwp.Run("TableLowerCell");
                }
            }

            console.error(`테이블 열(${column})에 숫자 ${start}~${end} 입력 완료`);
            return `테이블 열(${column})에 숫자 ${start}~${end} 입력 완료`;
        } catch (e) {
            console.error(`테이블 숫자 채우기 오류: ${e}`);
            return `Error: ${e}`;
        }
    }

    /**
     * 표와 데이터를 함께 생성합니다.
     * @param rows 표의 행 수
     * @param cols 표의 열 수
     * @param data 표에 채울 데이터
     * @param hasHeader 첫 번째 행을 헤더로 처리할지 여부
     * @returns 결과 메시지
     */
    async createTableWithData(rows: number, cols: number, data?: string[][], hasHeader: boolean = false): Promise<string> {
        try {
            if (!this.hwpController.isRunning) {
                return "Error: HWP가 실행되지 않았습니다.";
            }

            // 현재 커서가 표 안에 있는지 확인
            const hwp = (this.hwpController as any).hwp;
            let isInTable = false;
            try {
                hwp.Run("TableCellBlock");
                hwp.Run("Cancel");
                isInTable = true;
            } catch {
                isInTable = false;
            }

            // 표 안에 있지 않은 경우에만 새 표 생성
            if (!isInTable) {
                const tableResult = await this.insertTable(rows, cols);
                if (tableResult.startsWith("Error")) {
                    return tableResult;
                }
            }

            // 데이터가 있는 경우 표 채우기
            if (data && data.length > 0) {
                console.error(`Create table with data type: array, data: ${JSON.stringify(data).substring(0, 100)}...`);

                // 모든 데이터를 문자열로 변환
                const stringData: string[][] = [];
                for (const row of data) {
                    const stringRow = row.map(cell => cell != null ? cell.toString() : "");
                    stringData.push(stringRow);
                }

                // 표에 데이터 채우기
                if (await this.fillTableWithData(stringData, 1, 1, hasHeader)) {
                    return `표 생성 및 데이터 입력 완료 (${rows}x${cols})`;
                } else {
                    return "표는 생성되었으나 데이터 입력에 실패했습니다.";
                }
            }

            return `표 생성 완료 (${rows}x${cols})`;
        } catch (e) {
            console.error(`표 생성 중 오류: ${e}`);
            return `Error: ${e}`;
        }
    }
}