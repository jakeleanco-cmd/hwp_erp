import { BaseAgent } from '../BaseAgent';

/**
 * HWP 수식어를 LaTeX로 변환하고 수식 관련 처리를 담당하는 에이전트입니다.
 */
export class MathAgent extends BaseAgent {
  constructor() {
    super('agent-math', 'Math');
    
    // HWP 수식어와 LaTeX 매핑 테이블
    this.tokenMap = {
      'over': '\\frac',
      'root': '\\sqrt',
      'times': '\\times',
      'divide': '\\div',
      'pm': '\\pm',
      'alpha': '\\alpha',
      'beta': '\\beta',
      'gamma': '\\gamma',
      'theta': '\\theta',
      'pi': '\\pi',
      'sum': '\\sum',
      'integral': '\\int',
      'lim': '\\lim',
      'inf': '\\infty',
      'neq': '\\neq',
      'leq': '\\leq',
      'geq': '\\geq',
      'left(': '\\left(',
      'right)': '\\right)',
      'it': '', // 이탈릭체 무시
      'rm': '', // 로만체 무시
    };
  }

  /**
   * HWP 수식 스크립트를 LaTeX로 변환합니다.
   * 예: {a} over {b} -> \frac{a}{b}
   */
  async convertToLatex(hwpScript) {
    if (!hwpScript) return '';

    let latex = hwpScript;

    // 1. 기본 키워드 치환 (단어 경계 확인)
    Object.entries(this.tokenMap).forEach(([hwp, latexToken]) => {
      const regex = new RegExp(`\\b${hwp}\\b`, 'g');
      latex = latex.replace(regex, latexToken);
    });

    // 2. HWP 특유의 분수 구조 처리 ({내용} \frac {내용} -> \frac{내용}{내용})
    // 괄호가 있는 경우와 없는 경우를 모두 대응하기 위한 정규식
    latex = latex.replace(/\{([^}]+)\}\s*\\frac\s*\{([^}]+)\}/g, '\\frac{$1}{$2}');
    
    // 중괄호 없이 쓰인 경우 (a \frac b -> \frac{a}{b})
    latex = latex.replace(/(\w+)\s*\\frac\s*(\w+)/g, '\\frac{$1}{$2}');

    // 3. 첨자 처리 (HWP: a^b, a_b 는 LaTeX와 동일하므로 기본 유지)

    // 4. 불필요한 공백 제거 및 정리
    latex = latex.replace(/\s+/g, ' ').trim();
    
    // 5. 수식 렌더링을 위한 마크업 ($ $ 또는 KaTeX/MathJax 형식)
    return latex;
  }

  /**
   * 에이전트 실행 로직
   */
  async execute(input) {
    try {
      console.log(`[MathAgent] 변환 요청 수신: ${input}`);
      
      const converted = await this.convertToLatex(input);
      
      return { 
        success: true, 
        original: input,
        latex: converted,
        display: `$${converted}$` // 디스플레이용
      };
    } catch (error) {
      console.error("[MathAgent] 변환 오류:", error);
      return { success: false, error: error.message };
    }
  }
}
