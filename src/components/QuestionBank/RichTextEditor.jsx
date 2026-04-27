import React, { useEffect } from 'react';
import ReactQuill from 'react-quill-new';
import 'react-quill-new/dist/quill.snow.css';
import 'katex/dist/katex.min.css';
import katex from 'katex';

/**
 * 텍스트, 수식, 이미지를 지원하는 리치 텍스트 에디터 컴포넌트
 */
const RichTextEditor = ({ value, onChange, placeholder }) => {
  useEffect(() => {
    // Quill의 formula 모듈은 전역 katex 객체를 참조함
    if (typeof window !== 'undefined') {
      window.katex = katex;
    }
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

  const quillRef = React.useRef(null);

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
