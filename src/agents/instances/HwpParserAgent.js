import { BaseAgent } from '../BaseAgent';

/**
 * HWP 문서를 파싱하여 문제 데이터를 추출하는 에이전트입니다.
 */
export class HwpParserAgent extends BaseAgent {
  constructor() {
    super('agent-parser', 'Parser');
  }

  /**
   * HWP 파일을 선택하고 파싱 프로세스를 실행합니다.
   */
  async execute() {
    try {
      // 1. Electron 다이얼로그를 통해 파일 경로 획득
      const filePath = await window.electronAPI.openFile();
      if (!filePath) return { success: false, error: "파일 선택이 취소되었습니다." };

      console.log(`[ParserAgent] 파일 선택됨: ${filePath}`);

      // 2. 메인 프로세스에 파싱 요청 (Python 스크립트 실행)
      const result = await this.callMain('extract', { filePath });

      return result;
    } catch (error) {
      console.error("[ParserAgent] 오류 발생:", error);
      return { success: false, error: error.message };
    }
  }
}
