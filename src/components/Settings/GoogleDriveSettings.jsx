import React, { useState, useEffect } from 'react';
import { Card, Button, Typography, Space, Tag, message, Modal, Input } from 'antd';
import { GoogleOutlined, CheckCircleOutlined, ExclamationCircleOutlined, LinkOutlined } from '@ant-design/icons';
import axios from 'axios';

const { Title, Text, Paragraph } = Typography;

const GoogleDriveSettings = () => {
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState({ authenticated: false });
  const [authUrl, setAuthUrl] = useState('');
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [authCode, setAuthCode] = useState('');

  // API 기본 경로 설정 (Vercel 배포 고려하여 상대 경로 사용)
  const API_BASE_URL = '/api/google-drive';

  useEffect(() => {
    checkStatus();
  }, []);

  const checkStatus = async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/status`);
      setStatus(response.data);
    } catch (error) {
      console.error('인증 상태 확인 실패:', error);
    }
  };

  const handleStartAuth = async () => {
    setLoading(true);
    try {
      const response = await axios.get(`${API_BASE_URL}/auth-url`);
      setAuthUrl(response.data.url);
      window.open(response.data.url, '_blank'); // 새 창에서 인증 페이지 열기
      setIsModalVisible(true);
    } catch (error) {
      message.error('인증 URL을 가져오는데 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const handleCompleteAuth = async () => {
    if (!authCode) {
      message.warning('인증 코드를 입력해주세요.');
      return;
    }

    setLoading(true);
    try {
      await axios.post(`${API_BASE_URL}/callback`, { code: authCode });
      message.success('구글 드라이브 인증이 완료되었습니다!');
      setIsModalVisible(false);
      setAuthCode('');
      checkStatus();
    } catch (error) {
      message.error('인증 처리 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card 
      title={
        <Space>
          <GoogleOutlined style={{ color: '#4285F4' }} />
          <span>구글 드라이브 설정</span>
        </Space>
      }
      className="shadow-md"
    >
      <Space direction="vertical" className="w-full" size="middle">
        <div>
          <Text strong>현재 상태: </Text>
          {status.authenticated ? (
            <Tag color="success" icon={<CheckCircleOutlined />}>인증됨</Tag>
          ) : (
            <Tag color="error" icon={<ExclamationCircleOutlined />}>미인증</Tag>
          )}
        </div>

        <Paragraph type="secondary">
          구글 드라이브와 연동하여 HWP 파일 및 이미지를 클라우드에 백업하고 관리할 수 있습니다.
          .keys 폴더의 클라이언트 정보를 사용하여 인증을 진행합니다.
        </Paragraph>

        {!status.authenticated ? (
          <Button 
            type="primary" 
            icon={<GoogleOutlined />} 
            onClick={handleStartAuth}
            loading={loading}
          >
            구글 계정 연결하기
          </Button>
        ) : (
          <Button 
            icon={<GoogleOutlined />} 
            onClick={handleStartAuth}
            loading={loading}
          >
            계정 다시 연결하기
          </Button>
        )}
      </Space>

      <Modal
        title="구글 인증 완료하기"
        visible={isModalVisible}
        onOk={handleCompleteAuth}
        onCancel={() => setIsModalVisible(false)}
        confirmLoading={loading}
        okText="인증 완료"
        cancelText="취소"
      >
        <Space direction="vertical" className="w-full">
          <Text>1. 열린 브라우저 창에서 구글 로그인을 진행하세요.</Text>
          <Text>2. 승인 후 나타나는 <b>인증 코드</b>를 복사하여 아래에 입력하세요.</Text>
          <Paragraph type="secondary" style={{ fontSize: '12px' }}>
            (참고: localhost 리다이렉션 오류가 뜨더라도 주소창의 code=... 부분을 복사하시면 됩니다.)
          </Paragraph>
          <Input 
            placeholder="인증 코드를 입력하세요" 
            value={authCode} 
            onChange={(e) => setAuthCode(e.target.value)}
          />
        </Space>
      </Modal>
    </Card>
  );
};

export default GoogleDriveSettings;
