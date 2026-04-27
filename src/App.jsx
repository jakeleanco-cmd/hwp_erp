import React, { useState } from 'react';
import { Layout, Menu, Button, Card, Input, Space, Typography, Tag, Divider, message } from 'antd';
import { 
  FileTextOutlined, 
  FunctionOutlined, 
  DatabaseOutlined, 
  SettingOutlined,
  CloudUploadOutlined
} from '@ant-design/icons';
import { MathAgent } from './agents/instances/MathAgent';
import { HwpParserAgent } from './agents/instances/HwpParserAgent';
import { StorageAgent } from './agents/instances/StorageAgent';
import 'katex/dist/katex.min.css';
import { BlockMath } from 'react-katex';
import QuestionBankManager from './components/QuestionBank/QuestionBankManager';
import GoogleDriveSettings from './components/Settings/GoogleDriveSettings';

const { Header, Content, Sider } = Layout;
const { Title, Text } = Typography;

function App() {
  const [selectedKey, setSelectedKey] = useState('1');
  const [inputText, setInputText] = useState('분수(x+1, y-2) + 분수(3, 4) = 10');
  const [result, setResult] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(false);

  const mathAgent = new MathAgent();
  const parserAgent = new HwpParserAgent();
  const storageAgent = new StorageAgent();

  const handleProcess = async () => {
    const output = await mathAgent.execute(inputText);
    setResult(output);
  };

  const handleImportHwp = async () => {
    setLoading(true);
    try {
      const output = await parserAgent.execute();
      if (output.success) {
        let finalQuestions = output.questions;
        
        // 구글 드라이브 인증 상태 확인
        const statusRes = await axios.get('/api/google-drive/status');
        
        if (statusRes.data.authenticated) {
          message.loading({ content: '이미지를 구글 드라이브에 업로드 중...', key: 'upload' });
          const uploadRes = await axios.post('/api/google-drive/upload-images');
          
          if (uploadRes.data.success) {
            const driveImages = uploadRes.data.images;
            // 문제 텍스트 내의 로컬 이미지 경로를 구글 드라이브 링크로 치환
            finalQuestions = finalQuestions.map(q => {
              let updatedText = q.text;
              driveImages.forEach(img => {
                // [IMAGE_0] 형태의 태그를 찾아서 구글 드라이브 링크로 교체하거나 
                // 렌더링 시 처리할 수 있도록 속성 추가
                const imgTag = `[${img.originalName.replace('.png', '').toUpperCase()}]`; // [IMAGE0]
                // 렌더링을 위해 데이터를 보강
                if (updatedText.includes(imgTag)) {
                  q.driveUrl = img.link;
                }
              });
              return q;
            });
            message.success({ content: '구글 드라이브 업로드 완료!', key: 'upload' });
          }
        }

        setQuestions(finalQuestions);
        message.success(`${finalQuestions.length}개의 문제를 가져왔습니다.`);
      } else {
        message.error(output.error);
      }
    } catch (err) {
      message.error("처리 중 오류 발생: " + err.message);
    }
    setLoading(false);
  };

  const handleSaveToDb = async () => {
    if (questions.length === 0) {
      message.warning("저장할 문제가 없습니다.");
      return;
    }
    setLoading(true);
    const output = await storageAgent.execute('save', questions);
    if (output.success) {
      message.success(`${output.count}개의 문제가 DB에 저장되었습니다.`);
      setQuestions([]); 
    } else {
      message.error("저장 실패: " + output.error);
    }
    setLoading(false);
  };

  // 메뉴 선택에 따른 컨텐츠 렌더링
  const renderContent = () => {
    switch (selectedKey) {
      case '1':
        return (
          <div className="max-w-4xl mx-auto">
            {questions.length > 0 && (
              <Card 
                title={`가져온 문제 목록 (${questions.length}개)`} 
                className="shadow-md mb-6 border-blue-200"
                extra={
                  <Button type="primary" ghost onClick={handleSaveToDb} loading={loading}>
                    DB에 모두 저장
                  </Button>
                }
              >
                <div className="space-y-4">
                  {questions.map((q) => (
                    <div key={q.id} className="p-4 bg-gray-50 rounded border flex flex-col gap-2">
                      <div className="flex justify-between items-center">
                        <Tag color="orange">문제 {q.id}</Tag>
                        <Tag color={q.difficulty === '하' ? 'green' : 'volcano'}>{q.difficulty}</Tag>
                      </div>
                      <div className="text-gray-800" style={{ whiteSpace: 'pre-wrap', lineHeight: '1.8' }}>
                        {q.text.split(/(\[IMAGE_\d+\])/).map((part, index) => {
                          const imgMatch = part.match(/\[IMAGE_(\d+)\]/);
                          if (imgMatch) {
                            const imgNum = imgMatch[1];
                            return (
                              <div key={index} className="my-4 text-center">
                                <img 
                                  src={q.driveUrl || `/extracted_images/image${imgNum}.png`} 
                                  alt={`그림 ${imgNum}`} 
                                  style={{ maxWidth: '100%', borderRadius: '4px', border: '1px solid #eee' }} 
                                />
                              </div>
                            );
                          }
                          return <span key={index}>{part}</span>;
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
            )}
            <EmptyState title="HWP 파일에서 문제를 가져오려면 상단의 버튼을 클릭하세요." />
          </div>
        );
      case '2':
        return (
          <div className="max-w-4xl mx-auto">
            <Card title="에이전트 테스트 (Math Agent)" className="shadow-md mb-6">
              <Space direction="vertical" className="w-full" size="large">
                <div>
                  <Text strong>입력 텍스트 (HWP 유사 문법):</Text>
                  <Input 
                    value={inputText} 
                    onChange={(e) => setInputText(e.target.value)} 
                    placeholder="예: 분수(a, b)"
                    className="mt-2"
                  />
                </div>
                
                <Button type="primary" block onClick={handleProcess}>
                  수식 에이전트 실행
                </Button>
                
                {result && (
                  <div className="bg-blue-50 p-6 rounded-lg border border-blue-100 mt-4">
                    <div className="mb-4">
                      <Tag color="blue">LaTeX 변환 결과</Tag>
                      <pre className="mt-2 bg-white p-2 rounded border">{result.latex}</pre>
                    </div>
                    <div>
                      <Tag color="green">KaTeX 렌더링</Tag>
                      <div className="mt-4 text-2xl text-center">
                        <BlockMath math={result.latex} />
                      </div>
                    </div>
                  </div>
                )}
              </Space>
            </Card>
          </div>
        );
      case '3':
        return <QuestionBankManager />;
      case '4':
        return (
          <div className="max-w-4xl mx-auto">
            <GoogleDriveSettings />
          </div>
        );
      default:
        return <div>준비 중인 기능입니다.</div>;
    }
  };

  const EmptyState = ({ title }) => (
    <div className="text-center py-20 bg-white rounded-lg border border-dashed border-gray-300">
      <FileTextOutlined style={{ fontSize: 48, color: '#d9d9d9' }} />
      <div className="mt-4 text-gray-500">{title}</div>
    </div>
  );

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Sider theme="light" width={240} style={{ borderRight: '1px solid #f0f0f0' }}>
        <div className="p-6 text-center">
          <Title level={4} style={{ color: '#1890ff', margin: 0 }}>HWP Math ERP</Title>
          <Text type="secondary" size="small">시니어 개발자 모드</Text>
        </div>
        <Menu 
          mode="inline" 
          selectedKeys={[selectedKey]} 
          onClick={({ key }) => setSelectedKey(key)}
        >
          <Menu.Item key="1" icon={<FileTextOutlined />}>문제 가져오기 (HWP)</Menu.Item>
          <Menu.Item key="2" icon={<FunctionOutlined />}>수식 편집기</Menu.Item>
          <Menu.Item key="3" icon={<DatabaseOutlined />}>문제 은행 관리</Menu.Item>
          <Divider />
          <Menu.Item key="4" icon={<SettingOutlined />}>시스템 설정</Menu.Item>
        </Menu>
      </Sider>
      
      <Layout>
        <Header style={{ background: '#fff', padding: '0 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Text strong>수학 문제 은행 관리 시스템 v1.0</Text>
          {selectedKey === '1' && (
            <Button 
              type="primary" 
              icon={<CloudUploadOutlined />} 
              onClick={handleImportHwp}
              loading={loading}
            >
              새 HWP 파일 가져오기
            </Button>
          )}
        </Header>
        
        <Content className="p-8" style={{ overflowY: 'auto' }}>
          {renderContent()}
          
          {selectedKey !== '3' && (
            <div className="max-w-4xl mx-auto mt-8">
              <div className="grid grid-cols-2 gap-4">
                <Card size="small" title="현재 활성 에이전트">
                  <ul className="list-disc pl-5 text-sm text-gray-600">
                    <li>HwpParserAgent (대기 중)</li>
                    <li>MathAgent (활성)</li>
                    <li>StorageAgent (연결됨)</li>
                  </ul>
                </Card>
                <Card size="small" title="시스템 상태">
                  <Text type="success">● Electron Main Process 연결됨</Text><br/>
                  <Text type="success">● MongoDB Atlas 연결됨</Text>
                </Card>
              </div>
            </div>
          )}
        </Content>
      </Layout>
    </Layout>
  );
}

export default App;
