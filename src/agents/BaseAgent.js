/**
 * 에이전트의 기본 클래스입니다.
 * 모든 특화 에이전트는 이 클래스를 상속받아 구현합니다.
 */
export class BaseAgent {
  constructor(id, name) {
    this.id = id;
    this.name = name;
  }

  /**
   * 에이전트의 핵심 동작을 수행합니다.
   * @param {any} input - 에이전트에 전달될 입력 데이터
   * @returns {Promise<any>} - 처리 결과
   */
  async execute(input) {
    throw new Error(`[${this.name}] execute() 메서드가 구현되지 않았습니다.`);
  }

  /**
   * Electron 메인 프로세스와 통신하여 작업을 수행합니다.
   * @param {string} action - 수행할 액션 이름
   * @param {any} payload - 전달할 데이터
   */
  async callMain(action, payload) {
    if (window.electronAPI) {
      return await window.electronAPI.runAgent({
        agentName: this.name,
        action,
        payload
      });
    } else {
      console.warn("Electron 환경이 아닙니다. 모의 응답을 반환합니다.");
      return { success: true, mock: true };
    }
  }
}
