import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import axios from 'axios';
import { Card, Typography, Tag, Spin, Button, Result, Space } from 'antd';
import { getDifficultyColor } from '../../constants';
import 'katex/dist/katex.min.css';

const { Title, Text } = Typography;

const SharedQuestionView = () => {
  const { id } = useParams();
  const [question, setQuestion] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showAnswer, setShowAnswer] = useState(false);

  useEffect(() => {
    const fetchQuestion = async () => {
      try {
        // 비인증으로 접근하므로 명시적으로 baseURL이나 상대경로 사용
        const res = await axios.get(`/api/questions/public/${id}`);
        setQuestion(res.data);
      } catch (err) {
        setError('문항을 불러오지 못했습니다. 삭제되었거나 권한이 없는 링크일 수 있습니다.');
      } finally {
        setLoading(false);
      }
    };

    fetchQuestion();
  }, [id]);

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', background: '#f0f2f5' }}>
        <Spin size="large" tip="문제를 불러오는 중입니다..." />
      </div>
    );
  }

  if (error || !question) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', background: '#f0f2f5' }}>
        <Result
          status="warning"
          title="문제를 찾을 수 없습니다."
          subTitle={error}
        />
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', background: '#f0f2f5', padding: '20px 10px' }}>
      <div style={{ maxWidth: '800px', margin: '0 auto' }}>
        <Card 
          title="문제 보기" 
          bordered={false} 
          style={{ boxShadow: '0 4px 12px rgba(0,0,0,0.05)', borderRadius: '8px' }}
        >
          <div style={{ marginBottom: '20px' }}>
            <Space wrap>
              {question.grade && <Tag color="cyan">{question.grade}</Tag>}
              {question.difficulty && <Tag color={getDifficultyColor(question.difficulty)}>{question.difficulty}</Tag>}
              {question.tags?.map(tag => <Tag key={tag} color="blue">{tag}</Tag>)}
            </Space>
          </div>

          <div style={{ marginBottom: '30px', fontSize: '16px', lineHeight: '1.8' }}>
            <div 
              className="question-content"
              dangerouslySetInnerHTML={{ __html: question.content }} 
              style={{
                '& img': { maxWidth: '100%', height: 'auto', borderRadius: '4px' }
              }}
            />
          </div>

          <div style={{ textAlign: 'center', margin: '30px 0' }}>
            <Button 
              type={showAnswer ? "default" : "primary"}
              size="large" 
              onClick={() => setShowAnswer(!showAnswer)}
              style={{ padding: '0 40px' }}
            >
              {showAnswer ? '정답 숨기기' : '정답 보기'}
            </Button>
          </div>

          {showAnswer && (
            <div style={{ background: '#fafafa', padding: '20px', borderRadius: '8px', border: '1px solid #e8e8e8' }}>
              <div style={{ marginBottom: '20px' }}>
                <Text strong style={{ fontSize: '18px', color: '#1890ff', display: 'block', marginBottom: '10px' }}>
                  [정답]
                </Text>
                <div 
                  dangerouslySetInnerHTML={{ __html: question.answer }} 
                  style={{ fontSize: '18px', fontWeight: 'bold' }}
                />
              </div>
              
              {question.explanation && (
                <div>
                  <Text strong style={{ fontSize: '16px', color: '#595959', display: 'block', marginBottom: '10px' }}>
                    [해설]
                  </Text>
                  <div 
                    dangerouslySetInnerHTML={{ __html: question.explanation }} 
                    style={{ fontSize: '15px', lineHeight: '1.8' }}
                  />
                </div>
              )}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
};

export default SharedQuestionView;
