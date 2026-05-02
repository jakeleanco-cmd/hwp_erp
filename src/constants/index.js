/**
 * 시스템 전역 공통 상수 및 설정
 */

export const GRADES = [
  { value: '중1', label: '중1' },
  { value: '중2', label: '중2' },
  { value: '중3', label: '중3' },
  { value: '고1', label: '고1' },
  { value: '고2', label: '고2' },
  { value: '고3', label: '고3' },
];

export const DIFFICULTIES = [
  { value: '하', label: '하', color: 'green' },
  { value: '중', label: '중', color: 'orange' },
  { value: '상', label: '상', color: 'red' },
];

export const getDifficultyColor = (difficulty) => {
  const diff = DIFFICULTIES.find(d => d.value === difficulty);
  return diff ? diff.color : 'blue';
};
