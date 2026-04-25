import sys
import json
import os
import io

# 표준 출력을 UTF-8로 강제 설정 (윈도우 한글 깨짐 방지)
sys.stdout = io.TextIOWrapper(sys.stdout.detach(), encoding='utf-8')
sys.stderr = io.TextIOWrapper(sys.stderr.detach(), encoding='utf-8')

def process_hwp(file_path):
    """
    HWP 파일을 분석하여 실제 문제 데이터를 추출합니다.
    """
    try:
        from pyhwpx import Hwp
        import re
        
        # 한글 프로그램 제어 (비가시 모드 권장하나 테스트를 위해 기본 설정)
        hwp = Hwp(visible=False) 
        hwp.open(file_path)
        
        # 전체 텍스트 추출
        full_text = hwp.get_text()
        hwp.quit()
        
        # 문제 분리 로직: 숫자+마침표(1., 2.) 또는 숫자+괄호(1), 2)) 패턴 기준
        # ※ 복잡한 수식이나 이미지는 별도 처리가 필요하지만 우선 텍스트 추출에 집중합니다.
        split_pattern = r'\n(?=\d+[\.|\)])'
        raw_items = re.split(split_pattern, full_text)
        
        questions = []
        for i, item in enumerate(raw_items):
            content = item.strip()
            if content:
                # 문제 번호와 내용을 간단히 분리하여 저장
                questions.append({
                    "id": i + 1,
                    "text": content,
                    "difficulty": "중"
                })
        
        return {
            "success": True,
            "fileName": os.path.basename(file_path),
            "questions": questions
        }
    except Exception as e:
        return {"success": False, "error": f"HWP 파싱 실패: {str(e)}"}


if __name__ == "__main__":
    if len(sys.argv) < 2:
        print(json.dumps({"success": False, "error": "No file path provided"}))
    else:
        file_path = sys.argv[1]
        result = process_hwp(file_path)
        print(json.dumps(result, ensure_ascii=False))
