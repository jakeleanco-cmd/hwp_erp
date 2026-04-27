import React, { useEffect } from 'react';
import ReactQuill from 'react-quill-new';
import 'react-quill-new/dist/quill.snow.css';
import 'katex/dist/katex.min.css';
import katex from 'katex';

/**
 * 텍스트, 수식, 이미지를 지원하는 리치 텍스트 에디터 컴포넌트
 */
const RichTextEditor = ({ value, onChange, placeholder }) => {
  const quillRef = React.useRef(null);

  useEffect(() => {
    // Quill의 formula 모듈은 전역 katex 객체를 참조함
    if (typeof window !== 'undefined') {
      window.katex = katex;
    }

    let quill;
    
    // 이미지 업로드 공통 로직
    const uploadImage = async (base64, fileName) => {
      console.log('[Upload] 서버로 이미지 전송 시작...', fileName);
      try {
        const response = await fetch('/api/google-drive/upload', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ image: base64, fileName: fileName })
        });
        const data = await response.json();
        if (data.success) {
          console.log('[Upload] 서버 업로드 성공:', data.link);
          return data.link;
        }
        console.error('[Upload] 서버 응답 오류:', data.error);
      } catch (err) {
        console.error('[Upload] 네트워크 오류:', err);
      }
      return null;
    };

    // 붙여넣기 처리
    const handlePaste = async (e) => {
      const clipboardData = e.clipboardData || window.clipboardData;
      if (!clipboardData) return;

      const items = clipboardData.items;
      for (let i = 0; i < items.length; i++) {
        if (items[i].type.indexOf('image') !== -1) {
          e.preventDefault();
          e.stopPropagation();
          
          console.log('[Paste Check] 이미지 붙여넣기 감지됨!');
          const file = items[i].getAsFile();
          const reader = new FileReader();
          reader.onload = async () => {
            const link = await uploadImage(reader.result, `pasted_${Date.now()}.png`);
            if (link) {
              const range = quill.getSelection(true);
              quill.insertEmbed(range.index, 'image', link);
              quill.setSelection(range.index + 1);
            }
          };
          reader.readAsDataURL(file);
        }
      }
    };

    // 본문 내용 변화 감시 (Base64 이미지 추출용)
    const monitorContent = async () => {
      const contents = quill.getContents();
      let changed = false;
      let html = quill.root.innerHTML;

      for (const op of contents.ops) {
        if (op.insert && op.insert.image && op.insert.image.startsWith('data:image')) {
          const base64 = op.insert.image;
          console.log('[Monitor] Base64 이미지 발견, 교체 시도 중...');
          const link = await uploadImage(base64, `auto_${Date.now()}.png`);
          if (link) {
            html = html.replace(base64, link);
            changed = true;
          }
        }
      }

      if (changed) {
        quill.root.innerHTML = html;
        console.log('[Monitor] 모든 이미지가 드라이브 링크로 교체되었습니다.');
      }
    };

    // 에디터가 준비될 때까지 대기 후 리스너 등록
    const initEditor = () => {
      const editorInstance = quillRef.current?.getEditor();
      if (editorInstance) {
        quill = editorInstance;
        console.log('[RichTextEditor] Quill ready, listeners attached.');
        
        // 1. 에디터 루트 엘리먼트 리스너 (기본)
        quill.root.addEventListener('paste', handlePaste, true);
        
        // 2. 전역 윈도우 리스너 (백업)
        const globalPasteHandler = (e) => {
          // 에디터가 포커스된 상태에서만 작동
          if (document.activeElement === quill.root) {
            handlePaste(e);
          }
        };
        window.addEventListener('paste', globalPasteHandler, true);
        quill.globalPasteHandler = globalPasteHandler;

        // 3. 내용 변화 감시 (최후의 수단)
        quill.on('text-change', () => {
          clearTimeout(quill.monitorTimer);
          quill.monitorTimer = setTimeout(monitorContent, 500);
        });
      } else {
        setTimeout(initEditor, 100);
      }
    };

    initEditor();

    return () => {
      if (quill) {
        quill.root.removeEventListener('paste', handlePaste, true);
        if (quill.globalPasteHandler) {
          window.removeEventListener('paste', quill.globalPasteHandler, true);
        }
        clearTimeout(quill.monitorTimer);
      }
    };
  }, []);

  const imageHandler = () => {
    const input = document.createElement('input');
    input.setAttribute('type', 'file');
    input.setAttribute('accept', 'image/*');
    input.click();

    input.onchange = async () => {
      const file = input.files[0];
      const reader = new FileReader();

      reader.onload = async () => {
        const base64Data = reader.result;
        
        try {
          const response = await fetch('/api/google-drive/upload', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ image: base64Data, fileName: file.name })
          });
          const data = await response.json();

          if (data.success) {
            const quill = quillRef.current.getEditor();
            const range = quill.getSelection();
            const index = range ? range.index : quill.getLength();
            quill.insertEmbed(index, 'image', data.link);
            // 삽입 후 포커스 유지
            quill.setSelection(index + 1);
          }
        } catch (error) {
          console.error('이미지 업로드 오류:', error);
        }
      };
      reader.readAsDataURL(file);
    };
  };

  const modules = {
    toolbar: {
      container: [
        [{ 'header': [1, 2, 3, false] }],
        ['bold', 'italic', 'underline', 'strike'],
        [{ 'color': [] }, { 'background': [] }],
        [{ 'list': 'ordered' }, { 'list': 'bullet' }],
        [{ 'align': [] }],
        ['link', 'image', 'formula'],
        ['clean']
      ],
      handlers: {
        image: imageHandler
      }
    },
  };

  const formats = [
    'header',
    'bold', 'italic', 'underline', 'strike',
    'color', 'background',
    'list', 'align',
    'link', 'image', 'formula'
  ];

  return (
    <div className="rich-text-editor-container" style={{ borderRadius: '8px', overflow: 'hidden', border: '1px solid #d9d9d9' }}>
      <ReactQuill
        ref={quillRef}
        theme="snow"
        value={value}
        onChange={onChange}
        modules={modules}
        formats={formats}
        placeholder={placeholder}
        style={{ height: '250px', background: '#fff' }}
      />
      <div style={{ height: '42px' }}></div> {/* Quill 툴바 공간 확보 */}
    </div>
  );
};

export default RichTextEditor;
