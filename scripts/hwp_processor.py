import sys
import json
import os
import io

# 표준 출력을 UTF-8로 강제 설정 (윈도우 한글 깨짐 방지)
sys.stdout = io.TextIOWrapper(sys.stdout.detach(), encoding='utf-8')
sys.stderr = io.TextIOWrapper(sys.stderr.detach(), encoding='utf-8')

import time

def process_hwp(file_path):
    hwp = None
    try:
        from pyhwpx import Hwp
        import re
        
        # 1. 한글 객체 생성 (사용자가 보안 승인 창을 볼 수 있도록 visible=True 설정)
        try:
            hwp = Hwp(visible=True) 
        except Exception as e:
            return {"success": False, "error": f"한글 프로그램 실행 실패: {str(e)}"}

        # 2. 파일 열기 전 절대 경로 확인
        abs_path = os.path.abspath(file_path)
        if not os.path.exists(abs_path):
            return {"success": False, "error": f"파일이 존재하지 않습니다: {abs_path}"}

        # 3. 파일 열기
        success = hwp.open(abs_path)
        if not success:
            return {"success": False, "error": "파일을 열지 못했습니다."}
        
        # [수정] 전체 선택 후 자동 번호를 일반 텍스트로 변환
        try:
            hwp.SelectAll()
            hwp.Run("ConvertNumberToText")
            hwp.Run("Cancel") # 블록 선택 해제 (선택된 상태로 텍스트를 삽입하면 문서 전체가 지워짐!)
            hwp.MovePos(2) # 문서 맨 앞으로 이동
        except:
            pass
            
        # 4. 보안 승인 및 로딩을 위해 잠시 대기
        time.sleep(2)

        
        # [핵심 추가] 문서 내의 모든 수식을 찾아 텍스트로 풀어놓기 (Inline Injection)
        # 텍스트 추출 시 누락되는 수식(25, 8 등 숫자 포함)을 본문에 강제로 끼워 넣습니다.
        try:
            ctrl = hwp.HeadCtrl
            img_index = 0
            while ctrl:
                try:
                    if ctrl.CtrlID == "eqed": # 수식 개체인 경우
                        script = ctrl.Properties.Item("String")
                        if script:
                            if "족보닷컴" in script or "zocbo.com" in script or "저작권" in script:
                                pass # skip
                            else:
                                clean_script = script.strip()
                                if clean_script and clean_script != "from":
                                    pos = ctrl.GetAnchorPos(0)
                                    if pos:
                                        hwp.SetPosBySet(pos)
                                        hwp.Run("MoveRight")
                                        hwp.insert_text(f" $${clean_script}$$ ")
                    
                    elif ctrl.CtrlID == "gso": # [추가] 그림(이미지) 개체인 경우
                        pos = ctrl.GetAnchorPos(0)
                        if pos:
                            hwp.SetPosBySet(pos)
                            hwp.Run("MoveRight")
                            hwp.insert_text(f"\n[IMAGE_{img_index}]\n")
                            img_index += 1
                except Exception as inner_e:
                    pass
                ctrl = ctrl.Next
        except Exception as e:
            pass

        
        # 5. 전체 텍스트 추출 (3단계 필살기 로직)
        full_text = ""
        
        # 단계 1: AllText 속성 시도 (가장 권장됨)
        try:
            full_text = str(hwp.AllText).strip()
        except:
            pass
            
        # 단계 2: AllText가 실패하면 전체 선택 후 get_text 시도
        if not full_text or len(full_text) < 10:
            try:
                hwp.SelectAll()
                raw_text = hwp.get_text()
                if isinstance(raw_text, (tuple, list)):
                    full_text = "\n".join([str(item) for item in raw_text if item is not None])
                else:
                    full_text = str(raw_text) if raw_text else ""
            except:
                pass

        # 단계 3: 최후의 수단 - 클립보드 복사 방식 (표 내부 글자까지 긁어옴)
        if not full_text or len(full_text.strip()) < 10:
            try:
                import pyperclip
                hwp.SelectAll()
                hwp.Run("Copy")
                time.sleep(0.5)
                full_text = pyperclip.paste()
            except:
                pass
            
        # [워터마크 제거] 본문에 있는 저작권 문구도 동일하게 필터링
        if full_text:
            full_text = re.sub(r'={10,}.*?족보닷컴.*?\={10,}', '', full_text, flags=re.DOTALL)
            full_text = re.sub(r'본 해설은.*?법적 조치를 받을 수 있습니다\.', '', full_text, flags=re.DOTALL)
            full_text = full_text.replace('족보닷컴(zocbo.com)', '')
            full_text = re.sub(r'={10,}', '', full_text)

            
        # 5. 수식 데이터 따로 추출
        equations = []
        try:
            equations = hwp.get_equations()
        except:
            pass
            
        # 6. 이미지 추출: public/extracted_images 폴더에 저장
        try:
            img_dir = os.path.join(os.getcwd(), 'public', 'extracted_images')
            if not os.path.exists(img_dir):
                os.makedirs(img_dir)
            
            # 그림 파일 추출 (pyhwpx 전용 메서드 사용)
            hwp.save_all_pictures(img_dir)
            
            # 추출된 파일들을 image0.png, image1.png 등으로 순서대로 덮어쓰기 이름 변경
            files = sorted([f for f in os.listdir(img_dir) if f.endswith(('.png', '.jpg', '.jpeg', '.gif', '.bmp'))])
            for idx, filename in enumerate(files):
                old_path = os.path.join(img_dir, filename)
                new_path = os.path.join(img_dir, f"image{idx}.png")
                if old_path != new_path:
                    if os.path.exists(new_path):
                        os.remove(new_path)
                    os.rename(old_path, new_path)
        except:
            pass
            
        try:
            hwp.quit()
        except:
            pass
        
        # 7. 텍스트 가공: 객관식 보기 및 기호 정렬 (①-⑮, ㉠-㉷, ⓐ-ⓩ)
        if full_text:
            full_text = re.sub(r'([①-⑮㉠-㉷ⓐ-ⓩ])', r'\n\1', full_text)

        # 8. 추출 결과 확인 및 문제 분리
        if not full_text or len(full_text.strip()) < 5:
            return {
                "success": False, 
                "error": "내용을 읽지 못했습니다."
            }

        # [핵심 수정] 문제 번호 패턴 정의: 줄 시작, 탭, 또는 앞쪽 공백 뒤의 '숫자.' 형태 인식
        pattern = r'(?:\n|\r|\t|^)\s*([0-9]{1,3}\.)\s'
        parts = re.split(pattern, full_text)
        
        questions = []
        # 분리된 파트가 있다면 (구분자 포함되어 parts 길이가 늘어남)
        if len(parts) > 1:
            # parts[0]은 첫 문제 이전의 찌꺼기 텍스트
            for i in range(1, len(parts), 2):
                q_num = parts[i].strip()
                q_body = parts[i+1].strip() if i+1 < len(parts) else ""
                
                if q_body.strip():
                    questions.append({
                        "id": (i // 2) + 1,
                        "text": f"{q_num} {q_body.strip()}",
                        "difficulty": "중"
                    })
        
        if not questions:
            questions.append({"id": 1, "text": full_text.strip()[:1000], "difficulty": "중"})
        
        return {
            "success": True,
            "fileName": os.path.basename(file_path),
            "questions": questions,
            "equations": equations
        }
    except Exception as e:
        if hwp:
            try: hwp.quit()
            except: pass
        return {"success": False, "error": f"파싱 에러: {str(e)}"}





if __name__ == "__main__":
    if len(sys.argv) < 2:
        print(json.dumps({"success": False, "error": "No file path provided"}))
    else:
        file_path = sys.argv[1]
        result = process_hwp(file_path)
        print(json.dumps(result, ensure_ascii=False))
