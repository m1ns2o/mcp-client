import sys
import os

# 프로젝트 루트 디렉토리를 sys.path에 추가
# 이렇게 하면 src 폴더에 있는 모듈을 바로 임포트할 수 있습니다.
project_root = os.path.dirname(os.path.abspath(__file__))
sys.path.append(project_root)

from hwp_mcp_stdio_server import test_hwp_controller

def main():
    """
    HwpController 기능을 테스트하기 위한 메인 함수
    """
    print("HwpController 테스트를 시작합니다.")
    
    # hwp_mcp_stdio_server.py에 있는 테스트 함수를 호출합니다.
    # 이 함수는 HwpController의 여러 메서드를 순차적으로 실행하여 기능을 검증합니다.
    test_hwp_controller()
    
    print("HwpController 테스트가 완료되었습니다.")

if __name__ == "__main__":
    # 이 스크립트가 직접 실행되었을 때만 main() 함수를 호출합니다.
    main()