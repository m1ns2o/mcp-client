# HWP MCP Server - TypeScript Edition

## 📋 개요

Python으로 작성된 HWP MCP 서버를 TypeScript로 완전히 마이그레이션한 버전입니다. winax 라이브러리를 사용하여 한글(HWP) 프로그램을 자동화하고, MCP 프로토콜을 통해 자연어 기반 문서 제어를 제공합니다.

## ✨ 주요 특징

### 🔧 기술적 개선사항
- **순수 TypeScript**: Python 의존성 완전 제거
- **타입 안전성**: 전체 코드베이스에 TypeScript 타입 적용
- **단일 개발 환경**: Node.js만으로 개발 환경 구성
- **직접 실행**: 빌드 없이 TypeScript 파일 직접 실행 가능

### 📊 기능 호환성
- **100% 기능 호환**: 기존 Python 버전의 모든 기능 포팅
- **32/32 테스트 통과**: 모든 HWP 기능 정상 작동 확인
- **MCP 프로토콜 완전 지원**: JSON-RPC 2.0 기반 통신

## 🚀 설치 및 실행

### 사전 요구사항
- Node.js 16.0.0 이상
- 한글(HWP) 프로그램 설치
- Windows 운영체제

### 설치
```bash
npm install
```

### 실행 방법

#### 1. TypeScript 직접 실행 (권장)
```bash
# MCP 서버 실행
npm run mcp-server

# 개발 모드 (변경사항 자동 감지)
npm run mcp-server:dev

# 클라이언트 실행
npm run dev

# 배치 테스트
npm run batch
```

#### 2. 빌드 후 실행
```bash
# 빌드
npm run build

# 빌드된 서버 실행
npm run test-mcp

# 빌드된 클라이언트 실행
npm start
```

## 🧪 테스트

### 기본 기능 테스트
```bash
npm run hwp:test-basic
```

### 종합 기능 테스트
```bash
npm run hwp:test-full
```

### 개발용 테스트
```bash
# TypeScript로 직접 실행
npm run test-hwp
npm run test-comprehensive
```

## 📁 프로젝트 구조

```
src/
├── hwp/
│   ├── HwpController.ts      # HWP COM 자동화 핵심 클래스
│   └── HwpTableTools.ts      # 표 관련 전문 도구
├── types/
│   └── winax.d.ts           # winax 라이브러리 타입 정의
├── hwp-mcp-server.ts        # MCP 서버 구현
└── index.ts                 # 클라이언트 구현
```

## 🛠 사용 가능한 MCP 도구

### 📄 문서 기본 기능
- `hwp_create`: 새 문서 생성
- `hwp_open`: 문서 열기
- `hwp_save`: 문서 저장
- `hwp_close`: 문서 닫기
- `hwp_get_text`: 문서 텍스트 가져오기

### ✏️ 텍스트 기능
- `hwp_insert_text`: 텍스트 입력
- `hwp_insert_paragraph`: 단락 삽입
- `hwp_set_font`: 글꼴 설정

### 📊 표 기능
- `hwp_insert_table`: 기본 표 생성
- `hwp_create_table_with_data`: 데이터가 포함된 표 생성
- `hwp_fill_table_with_data`: 기존 표에 데이터 채우기
- `hwp_fill_column_numbers`: 열에 숫자 자동 채우기

### 🔄 기타 기능
- `hwp_ping_pong`: 연결 테스트

## 💡 개발 명령어

### 코드 품질
```bash
npm run typecheck    # 타입 검사
npm run lint         # 린트 검사
npm run lint:fix     # 린트 자동 수정
```

### 개발 도구
```bash
npm run dev:watch    # 클라이언트 변경사항 감시
npm run watch        # TypeScript 컴파일 감시
npm run clean        # 빌드 결과물 정리
```

## 🐛 문제 해결

### ColWidth 경고 메시지
- **현상**: 표 생성 시 "ColWidth 구성원이 없습니다" 경고
- **해결**: 매크로 방식과 HAction 방식을 병행하여 안정성 확보
- **영향**: 기능적으로는 정상 작동 (표가 올바르게 생성됨)

### JSON 파싱 오류
- **원인**: console.log가 stdout으로 출력되어 JSON-RPC와 충돌
- **해결**: 모든 로그를 console.error (stderr)로 변경

### COM 객체 오류
- **원인**: HWP COM 메서드의 매개변수 개수 불일치
- **해결**: 정확한 매개변수 개수로 메서드 호출

## 🔄 Python 버전과의 차이점

### 개선된 점
- ✅ 단일 언어 스택 (TypeScript)
- ✅ 타입 안전성 보장
- ✅ 더 나은 IDE 지원
- ✅ npm 생태계 활용
- ✅ 직접 실행 가능 (tsx)

### 호환성
- ✅ 모든 기능 동일
- ✅ MCP 인터페이스 동일
- ✅ 클라이언트 호환성 유지

## 📈 성능 및 안정성

### 테스트 결과
- **기능 테스트**: 32/32 통과 (100%)
- **안정성**: ColWidth 문제 해결로 표 생성 안정화
- **성능**: Python 버전과 동등한 성능

### 에러 처리
- COM 객체 오류에 대한 robust한 에러 처리
- 매크로 실패 시 HAction으로 fallback
- 상세한 오류 로깅

## 🤝 기여 방법

1. 이슈 보고: GitHub Issues 활용
2. 기능 제안: Discussion 또는 Feature Request
3. 코드 기여: Pull Request

## 📄 라이선스

ISC License

## 🙏 감사의 말

- winax 라이브러리 개발자
- @modelcontextprotocol/sdk 팀
- HWP COM API 문서화에 기여한 모든 분들