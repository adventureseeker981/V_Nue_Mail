// src/components/RichTextEditor.jsx — Gmail-Grade Rich Text Editor for Encrypto
import React, { useRef, useEffect, useState, useCallback } from 'react';
import {
  RotateCcw,
  RotateCw,
  Bold,
  Italic,
  Underline,
  Strikethrough,
  Baseline,
  Highlighter,
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignJustify,
  List,
  ListOrdered,
  Indent,
  Outdent,
  Quote,
  RemoveFormatting,
  ChevronDown,
} from 'lucide-react';

const FONT_FAMILIES = [
  { label: 'Sans Serif', value: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' },
  { label: 'Serif', value: 'Georgia, "Times New Roman", Times, serif' },
  { label: 'Fixed Width', value: 'SFMono-Regular, Consolas, "Liberation Mono", Menlo, monospace' },
  { label: 'Wide', value: '"Arial Black", Gadget, sans-serif' },
  { label: 'Narrow', value: '"Arial Narrow", sans-serif' },
  { label: 'Comic Sans MS', value: '"Comic Sans MS", cursive, sans-serif' },
  { label: 'Garamond', value: 'Garamond, "Hoefler Text", "Times New Roman", serif' },
  { label: 'Georgia', value: 'Georgia, serif' },
  { label: 'Tahoma', value: 'Tahoma, Verdana, Segoe, sans-serif' },
  { label: 'Verdana', value: 'Verdana, Geneva, sans-serif' },
];

const FONT_SIZES = [
  { label: 'Small', value: '1', cssSize: '11px' },
  { label: 'Normal', value: '3', cssSize: '14px' },
  { label: 'Large', value: '5', cssSize: '18px' },
  { label: 'Huge', value: '7', cssSize: '24px' },
];

const COLOR_PALETTE = [
  '#000000', '#434343', '#666666', '#999999', '#b7b7b7', '#cccccc', '#d9d9d9', '#efefef', '#f3f3f3', '#ffffff',
  '#980000', '#ff0000', '#ff9900', '#ffff00', '#00ff00', '#00ffff', '#4a86e8', '#0000ff', '#9900ff', '#ff00ff',
  '#299EFF', '#6554F0', '#00E676', '#FFB300', '#FF5252', '#00E5FF', '#E040FB', '#FF9100', '#80D8FF', '#B388FF',
];

export default function RichTextEditor({
  initialContent = '',
  onChange,
  placeholder = 'Write your encrypted message here...',
  visibleToolbar = true,
  editorRef: externalRef,
}) {
  const localRef = useRef(null);
  const editorRef = externalRef || localRef;

  const [selectedFont, setSelectedFont] = useState('Sans Serif');
  const [selectedSize, setSelectedSize] = useState('Normal');
  const [showFontMenu, setShowFontMenu] = useState(false);
  const [showSizeMenu, setShowSizeMenu] = useState(false);
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [colorMode, setColorMode] = useState('textColor'); // 'textColor' or 'bgColor'
  const [showAlignMenu, setShowAlignMenu] = useState(false);

  const savedRangeRef = useRef(null);

  // Set initial content
  useEffect(() => {
    if (editorRef.current && initialContent !== undefined) {
      if (editorRef.current.innerHTML !== initialContent) {
        editorRef.current.innerHTML = initialContent;
      }
    }
  }, [initialContent, editorRef]);

  // Save selection before opening dropdowns so formatting commands apply properly
  const saveSelection = () => {
    const sel = window.getSelection();
    if (sel && sel.rangeCount > 0) {
      savedRangeRef.current = sel.getRangeAt(0).cloneRange();
    }
  };

  const restoreSelection = () => {
    if (savedRangeRef.current) {
      const sel = window.getSelection();
      sel.removeAllRanges();
      sel.addRange(savedRangeRef.current);
    }
  };

  // Trigger input change
  const handleInput = useCallback(() => {
    if (!editorRef.current) return;
    const html = editorRef.current.innerHTML;
    const text = editorRef.current.innerText;
    if (onChange) {
      onChange({ html, text });
    }
  }, [editorRef, onChange]);

  // Execute formatting command
  const exec = (command, value = null) => {
    restoreSelection();
    if (editorRef.current) editorRef.current.focus();
    document.execCommand(command, false, value);
    handleInput();
  };

  // Keyboard shortcut listener for formatting
  const handleKeyDown = (e) => {
    const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
    const isCmd = isMac ? e.metaKey : e.ctrlKey;

    if (isCmd) {
      if (e.key === 'b' || e.key === 'B') {
        e.preventDefault();
        exec('bold');
      } else if (e.key === 'i' || e.key === 'I') {
        e.preventDefault();
        exec('italic');
      } else if (e.key === 'u' || e.key === 'U') {
        e.preventDefault();
        exec('underline');
      }
    }
  };

  return (
    <div className="rich-editor-wrapper">
      {/* ----------------------------------------------------
          1. Formatting Toolbar (Gmail-style)
          ---------------------------------------------------- */}
      {visibleToolbar && (
        <div className="rich-editor-toolbar" onMouseDown={(e) => e.preventDefault()}>
          {/* Undo / Redo */}
          <div className="toolbar-btn-group">
            <button
              type="button"
              className="editor-tool-btn"
              onClick={() => exec('undo')}
              title="Undo (Ctrl+Z)"
            >
              <RotateCcw size={14} strokeWidth={2} />
            </button>
            <button
              type="button"
              className="editor-tool-btn"
              onClick={() => exec('redo')}
              title="Redo (Ctrl+Y)"
            >
              <RotateCw size={14} strokeWidth={2} />
            </button>
          </div>

          <div className="editor-toolbar-separator" />

          {/* Font Family Dropdown */}
          <div className="editor-dropdown-wrap">
            <button
              type="button"
              className="editor-dropdown-btn font-family-btn"
              onMouseDown={saveSelection}
              onClick={() => setShowFontMenu((prev) => !prev)}
              title="Font"
            >
              <span className="dropdown-label">{selectedFont}</span>
              <ChevronDown size={11} strokeWidth={2.5} />
            </button>

            {showFontMenu && (
              <div className="editor-menu-dropdown font-menu">
                {FONT_FAMILIES.map((f) => (
                  <button
                    key={f.label}
                    type="button"
                    style={{ fontFamily: f.value }}
                    onClick={() => {
                      setSelectedFont(f.label);
                      setShowFontMenu(false);
                      exec('fontName', f.value);
                    }}
                  >
                    {f.label}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Font Size Dropdown */}
          <div className="editor-dropdown-wrap">
            <button
              type="button"
              className="editor-dropdown-btn font-size-btn"
              onMouseDown={saveSelection}
              onClick={() => setShowSizeMenu((prev) => !prev)}
              title="Font size"
            >
              <span className="dropdown-label">{selectedSize}</span>
              <ChevronDown size={11} strokeWidth={2.5} />
            </button>

            {showSizeMenu && (
              <div className="editor-menu-dropdown size-menu">
                {FONT_SIZES.map((s) => (
                  <button
                    key={s.label}
                    type="button"
                    style={{ fontSize: s.cssSize }}
                    onClick={() => {
                      setSelectedSize(s.label);
                      setShowSizeMenu(false);
                      exec('fontSize', s.value);
                    }}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="editor-toolbar-separator" />

          {/* Basic Text Formatting: Bold, Italic, Underline, Strikethrough */}
          <div className="toolbar-btn-group">
            <button
              type="button"
              className="editor-tool-btn"
              onClick={() => exec('bold')}
              title="Bold (Ctrl+B)"
            >
              <Bold size={14} strokeWidth={2.2} />
            </button>
            <button
              type="button"
              className="editor-tool-btn"
              onClick={() => exec('italic')}
              title="Italic (Ctrl+I)"
            >
              <Italic size={14} strokeWidth={2.2} />
            </button>
            <button
              type="button"
              className="editor-tool-btn"
              onClick={() => exec('underline')}
              title="Underline (Ctrl+U)"
            >
              <Underline size={14} strokeWidth={2.2} />
            </button>
            <button
              type="button"
              className="editor-tool-btn"
              onClick={() => exec('strikeThrough')}
              title="Strikethrough"
            >
              <Strikethrough size={14} strokeWidth={2.2} />
            </button>
          </div>

          <div className="editor-toolbar-separator" />

          {/* Text Color & Highlight Picker */}
          <div className="editor-dropdown-wrap">
            <button
              type="button"
              className="editor-tool-btn color-tool-btn"
              onMouseDown={saveSelection}
              onClick={() => setShowColorPicker((prev) => !prev)}
              title="Text color & highlight"
            >
              <Baseline size={14} strokeWidth={2.2} />
              <ChevronDown size={10} strokeWidth={2.5} />
            </button>

            {showColorPicker && (
              <div className="editor-menu-dropdown color-picker-popup">
                <div className="color-picker-tabs">
                  <button
                    type="button"
                    className={`color-tab ${colorMode === 'textColor' ? 'active' : ''}`}
                    onClick={() => setColorMode('textColor')}
                  >
                    <Baseline size={13} />
                    <span>Text color</span>
                  </button>
                  <button
                    type="button"
                    className={`color-tab ${colorMode === 'bgColor' ? 'active' : ''}`}
                    onClick={() => setColorMode('bgColor')}
                  >
                    <Highlighter size={13} />
                    <span>Background</span>
                  </button>
                </div>

                <div className="color-swatch-grid">
                  {COLOR_PALETTE.map((c, i) => (
                    <button
                      key={i}
                      type="button"
                      className="color-swatch"
                      style={{ backgroundColor: c }}
                      onClick={() => {
                        setShowColorPicker(false);
                        if (colorMode === 'textColor') {
                          exec('foreColor', c);
                        } else {
                          exec('hiliteColor', c);
                        }
                      }}
                      title={c}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="editor-toolbar-separator" />

          {/* Alignment */}
          <div className="editor-dropdown-wrap">
            <button
              type="button"
              className="editor-tool-btn"
              onMouseDown={saveSelection}
              onClick={() => setShowAlignMenu((prev) => !prev)}
              title="Alignment"
            >
              <AlignLeft size={14} strokeWidth={2} />
              <ChevronDown size={10} strokeWidth={2.5} />
            </button>

            {showAlignMenu && (
              <div className="editor-menu-dropdown align-menu">
                <button
                  type="button"
                  onClick={() => {
                    setShowAlignMenu(false);
                    exec('justifyLeft');
                  }}
                  title="Align Left"
                >
                  <AlignLeft size={14} />
                  <span>Left</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowAlignMenu(false);
                    exec('justifyCenter');
                  }}
                  title="Align Center"
                >
                  <AlignCenter size={14} />
                  <span>Center</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowAlignMenu(false);
                    exec('justifyRight');
                  }}
                  title="Align Right"
                >
                  <AlignRight size={14} />
                  <span>Right</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowAlignMenu(false);
                    exec('justifyFull');
                  }}
                  title="Justify"
                >
                  <AlignJustify size={14} />
                  <span>Justify</span>
                </button>
              </div>
            )}
          </div>

          {/* Lists & Indentation */}
          <div className="toolbar-btn-group">
            <button
              type="button"
              className="editor-tool-btn"
              onClick={() => exec('insertOrderedList')}
              title="Numbered list"
            >
              <ListOrdered size={14} strokeWidth={2} />
            </button>
            <button
              type="button"
              className="editor-tool-btn"
              onClick={() => exec('insertUnorderedList')}
              title="Bulleted list"
            >
              <List size={14} strokeWidth={2} />
            </button>
            <button
              type="button"
              className="editor-tool-btn"
              onClick={() => exec('outdent')}
              title="Less indent"
            >
              <Outdent size={14} strokeWidth={2} />
            </button>
            <button
              type="button"
              className="editor-tool-btn"
              onClick={() => exec('indent')}
              title="More indent"
            >
              <Indent size={14} strokeWidth={2} />
            </button>
            <button
              type="button"
              className="editor-tool-btn"
              onClick={() => exec('formatBlock', '<blockquote>')}
              title="Quote"
            >
              <Quote size={14} strokeWidth={2} />
            </button>
          </div>

          <div className="editor-toolbar-separator" />

          {/* Clear Formatting */}
          <button
            type="button"
            className="editor-tool-btn"
            onClick={() => exec('removeFormat')}
            title="Remove formatting"
          >
            <RemoveFormatting size={14} strokeWidth={2} />
          </button>
        </div>
      )}

      {/* ----------------------------------------------------
          2. Editable Rich Content Body
          ---------------------------------------------------- */}
      <div
        ref={editorRef}
        className="rich-editor-content"
        contentEditable
        onInput={handleInput}
        onKeyDown={handleKeyDown}
        data-placeholder={placeholder}
        spellCheck="true"
      />
    </div>
  );
}
