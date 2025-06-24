import { useState, useRef, useEffect } from 'react';
import * as ContextMenu from '@radix-ui/react-context-menu';
import DOMPurify from 'dompurify';
import { gemini } from '../lib/llm';

interface NoteEditorProps {
  initialContent?: string;
}

export const NoteEditor = ({ initialContent = '' }: NoteEditorProps) => {
  const [selectedText, setSelectedText] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const editorRef = useRef<HTMLDivElement>(null);
  const selectionRef = useRef<{
    range: Range;
    text: string;
  } | null>(null);

  const streamText = async (text: string, element: HTMLElement, speed = 20) => {
    let index = 0;
    element.innerHTML = '';
    
    return new Promise<void>((resolve) => {
      const interval = setInterval(() => {
        if (index < text.length) {
          element.innerHTML += text[index];
          index++;
        } else {
          clearInterval(interval);
          resolve();
        }
      }, speed);
    });
  };

  useEffect(() => {
    if (editorRef.current && initialContent) {
      editorRef.current.innerHTML = initialContent;
    }
  }, [initialContent]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      const div = document.createElement('div');
      div.innerHTML = '<br>';
      editorRef.current?.appendChild(div);
      // Move cursor to the end
      const range = document.createRange();
      const sel = window.getSelection();
      range.selectNodeContents(div);
      range.collapse(false);
      sel?.removeAllRanges();
      sel?.addRange(range);
    } else if (e.key === 'Tab') {
      e.preventDefault();
      
      const selection = window.getSelection();
      if (!selection || !selection.rangeCount) return;

      const range = selection.getRangeAt(0);
      const currentNode = range.startContainer;
      
      // Get the text content from the start of the line to the cursor
      let currentLineText = '';
      if (currentNode.nodeType === Node.TEXT_NODE) {
        const textContent = currentNode.textContent || '';
        const cursorPosition = range.startOffset;
        
        // Find the last newline before cursor or start of text
        let lineStart = textContent.lastIndexOf('\n', cursorPosition - 1) + 1;
        if (lineStart === 0) lineStart = 0;
        
        currentLineText = textContent.substring(lineStart, cursorPosition).trim();
      } else if (currentNode.nodeType === Node.ELEMENT_NODE) {
        // If we're at the start of a div or other element
        currentLineText = (currentNode as Element).textContent?.trim() || '';
      }

      if (currentLineText) {
        // Create a range for the current line text
        const lineRange = document.createRange();
        lineRange.setStart(currentNode, range.startOffset - currentLineText.length);
        lineRange.setEnd(currentNode, range.startOffset);
        
        // Set the selection and trigger generate
        selectionRef.current = {
          range: lineRange,
          text: currentLineText
        };
        setSelectedText(currentLineText);
        handleGenerate();
      }
    }
  };

  const handleMouseUp = () => {
    const selection = window.getSelection();
    if (selection && selection.rangeCount > 0) {
      const range = selection.getRangeAt(0);
      const text = range.toString().trim();
      if (text) {
        selectionRef.current = {
          range: range.cloneRange(),
          text
        };
        setSelectedText(text);
      }
    }
  };

  const handleContextMenu = () => {
    const selection = window.getSelection();
    if (selection && selection.rangeCount > 0) {
      const range = selection.getRangeAt(0);
      const text = range.toString().trim();
      if (text) {
        selectionRef.current = {
          range: range.cloneRange(),
          text
        };
        setSelectedText(text);
      }
    }
  };

  const handleGenerate = async () => {
    if (!selectionRef.current) {
      setError('Please select some text first');
      return;
    }
    
    setLoading(true);
    setError(null);

    try {
      const selectedText = selectionRef.current.text;
      const prompt = `Based on this request: "${selectedText}", determine if this is a UI generation request or a text generation request.
If it's a UI request (like creating buttons, components, or interactive elements), respond with HTML/JSX code that matches these criteria:
- Use Tailwind CSS classes for styling
- Match terminal theme (dark background, green text)
- Use data-action attributes for interactivity (deleteSelectedText or wrapWithBold)
- Return ONLY the raw HTML/JSX without any markdown blocks or backticks

If it's a text request (like questions, stories, or general content), respond with plain text that:
- Is concise and engaging
- Has no markdown or code formatting
- Fits the terminal theme context

Begin your response with either [UI] or [TEXT] to indicate the type, followed by a newline and your generated content.`;

      const result = await gemini.generateContent(prompt);
      const response = await result.response;
      let generatedContent = response.text().trim();
      
      const isUIRequest = generatedContent.startsWith('[UI]');
      generatedContent = generatedContent.replace(/^\[(UI|TEXT)\]\n?/, '').trim()
        .replace(/```(html|jsx)?\n?/g, '')
        .replace(/```/g, '')
        .replace(/`/g, '');

      if (isUIRequest) {
        const sanitizedCode = DOMPurify.sanitize(generatedContent, {
          ADD_ATTR: ['data-action']
        });

        const componentDiv = document.createElement('div');
        componentDiv.className = 'my-2 inline-block p-2 bg-[#2d333b] rounded border border-[#444c56] hover:border-[#768390] transition-colors';
        componentDiv.contentEditable = 'false';
        componentDiv.innerHTML = sanitizedCode;

        componentDiv.addEventListener('click', (e) => {
          const target = e.target as HTMLElement;
          const action = target.getAttribute('data-action');
          
          if (!action) return;
          
          e.preventDefault();
          e.stopPropagation();

          const originalRange = selectionRef.current?.range;
          if (!originalRange) return;

          switch (action) {
            case 'deleteSelectedText':
              originalRange.deleteContents();
              break;
            case 'wrapWithBold':
              const strong = document.createElement('strong');
              strong.textContent = originalRange.toString();
              originalRange.deleteContents();
              originalRange.insertNode(strong);
              break;
          }

          selectionRef.current = null;
          setSelectedText('');
        });

        const breakEl = document.createElement('br');
        const range = selectionRef.current.range;
        range.deleteContents();
        range.insertNode(componentDiv);
        range.setStartAfter(componentDiv);
        range.collapse(true);
        range.insertNode(breakEl);

        // Move cursor after the component
        const selection = window.getSelection();
        if (selection) {
          const newRange = document.createRange();
          newRange.setStartAfter(breakEl);
          newRange.collapse(true);
          selection.removeAllRanges();
          selection.addRange(newRange);
        }
      } else {
        // For text content, just insert it with terminal-like styling
        const textDiv = document.createElement('div');
        textDiv.className = 'my-2 text-[#adbac7]';
        
        const breakEl = document.createElement('br');
        const range = selectionRef.current.range;
        range.deleteContents();
        range.insertNode(textDiv);
        range.setStartAfter(textDiv);
        range.collapse(true);
        range.insertNode(breakEl);

        // Stream the text
        await streamText(generatedContent, textDiv);

        // Move cursor after the text
        const selection = window.getSelection();
        if (selection) {
          const newRange = document.createRange();
          newRange.setStartAfter(breakEl);
          newRange.collapse(true);
          selection.removeAllRanges();
          selection.addRange(newRange);
        }
      }

      selectionRef.current = null;
      setSelectedText('');
    } catch (error) {
      console.error('Error generating content:', error);
      setError(error instanceof Error ? error.message : 'Failed to generate content');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full">
      {error && (
        <div className="mb-4 p-2 bg-[#f47067]/10 text-[#f47067] rounded border border-[#f47067]/20">
          {error}
        </div>
      )}

      <ContextMenu.Root>
        <ContextMenu.Trigger>
          <div
            ref={editorRef}
            className="font-mono text-[#adbac7] focus:outline-none min-h-[400px]"
            contentEditable
            onMouseUp={handleMouseUp}
            onContextMenu={handleContextMenu}
            onKeyDown={handleKeyDown}
            suppressContentEditableWarning
          />
        </ContextMenu.Trigger>
        
        <ContextMenu.Portal>
          <ContextMenu.Content className="min-w-[220px] bg-[#2d333b] rounded-md p-1 shadow-xl border border-[#444c56]">
            <ContextMenu.Item
              className="px-2 py-2 text-sm cursor-pointer text-[#adbac7] hover:bg-[#444c56] rounded"
              onClick={handleGenerate}
              disabled={loading || !selectedText}
            >
              {loading ? '$ generating...' : '💡 generate'}
            </ContextMenu.Item>
          </ContextMenu.Content>
        </ContextMenu.Portal>
      </ContextMenu.Root>

    </div>
  );
}; 