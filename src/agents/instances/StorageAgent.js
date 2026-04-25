import { BaseAgent } from '../BaseAgent';
import axios from 'axios';

/**
 * MongoDB와 통신하여 데이터를 영구 저장하고 조회하는 에이전트입니다.
 */
export class StorageAgent extends BaseAgent {
  constructor() {
    super('agent-storage', 'Storage');
    // .env 설정에 맞춰 서버 포트를 3001로 수정
    this.apiBase = 'http://localhost:3001/api';
  }

  /**
   * 데이터를 저장하거나 조회합니다.
   * @param {string} action - 'save' 또는 'fetch'
   * @param {any} payload - 저장할 데이터 또는 쿼리 조건
   */
  async execute(action, payload) {
    try {
      if (action === 'save') {
        console.log(`[StorageAgent] 데이터 저장 시도 (${payload.length}건)`);
        const response = await axios.post(`${this.apiBase}/questions/batch`, {
          questions: payload
        });
        return { success: true, count: response.data.count };
      } 
      
      if (action === 'fetch') {
        console.log(`[StorageAgent] 데이터 조회 시도`);
        const response = await axios.get(`${this.apiBase}/questions`);
        return { success: true, data: response.data };
      }

      return { success: false, error: "알 수 없는 액션입니다." };
    } catch (error) {
      console.error("[StorageAgent] 오류 발생:", error);
      return { success: false, error: error.message };
    }
  }
}
