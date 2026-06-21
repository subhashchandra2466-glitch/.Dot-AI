import React, { useState } from 'react';
import { Copy, Check } from 'lucide-react';

interface Props {
  text: string;
}

export default function MessageContentRenderer({ text }: Props) {
  if (!text) return null;

  // Split content by triple backticks to isolate code blocks
  const parts = text.split(/```/g);

  return (
    <div className="space-y-3 font-sans text-xs sm:text-sm text-slate-900 dark:text-slate-100 leading-relaxed break-words">
      {parts.map((part, index) => {
        const isCodeBlock = index % 2 === 1;

        if (isCodeBlock) {
          // Parse language and content
          const lines = part.split('\n');
          let language = 'code';
          let codeContent = part;

          if (
            lines.length > 1 &&
            lines[0].trim().length > 0 &&
            lines[0].trim().length < 15 &&
            !lines[0].includes(' ') &&
            /^[a-zA-Z0-9+#_-]+$/.test(lines[0].trim())
          ) {
            language = lines[0].trim().toLowerCase();
            codeContent = lines.slice(1).join('\n');
          }

          // Render a custom block with copy functionality
          return <ActionableContentBlock key={index} title={language} language={language} content={codeContent} />;
        } else {
          // Parse bold, italic, lists, and headings in normal text
          return <TextBlock key={index} text={part} />;
        }
      })}
    </div>
  );
}

// -------------------------------------------------------------------------
// CONTENT BLOCK COMPONENT WITH TAP-TO-COPY
// -------------------------------------------------------------------------
function ActionableContentBlock({ title, language, content }: { title: string; language: string; content: string; key?: React.Key }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(content.trim());
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.warn('Failed to copy', err);
    }
  };

  return (
    <div className="my-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 overflow-hidden shadow-sm select-text">
      {/* Header bar */}
      <div className="flex items-center justify-between px-4 py-2 bg-slate-100 dark:bg-slate-900 text-[10px] sm:text-xs font-bold text-slate-600 dark:text-slate-400 select-none border-b border-slate-200 dark:border-slate-800">
        <span className="uppercase text-[9px] tracking-wider text-purple-600 dark:text-purple-400">{title || language}</span>
        <button
          type="button"
          onClick={handleCopy}
          className="flex items-center gap-1 hover:text-slate-900 dark:hover:text-white transition duration-200 active:scale-95 py-1 px-2 rounded-md hover:bg-slate-200 dark:hover:bg-slate-800 cursor-pointer"
        >
          {copied ? (
            <>
              <Check className="w-3.5 h-3.5 text-green-600 dark:text-green-400" />
              <span className="text-green-600 dark:text-green-400 font-extrabold font-sans">Copied!</span>
            </>
          ) : (
            <>
              <Copy className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
              <span className="font-sans">Copy</span>
            </>
          )}
        </button>
      </div>

      {/* Content Area */}
      <pre className="p-4 overflow-x-auto text-xs sm:text-sm font-mono text-slate-800 dark:text-slate-50 bg-transparent leading-relaxed scrollbar-none">
        <code>{content.trim()}</code>
      </pre>
    </div>
  );
}

// -------------------------------------------------------------------------
// TEXT BLOCK PARSING ENGINE
// -------------------------------------------------------------------------
function TextBlock({ text }: { text: string; key?: React.Key }) {
  const lines = text.split('\n');

  return (
    <div className="space-y-2 select-text">
      {lines.map((line, lineIdx) => {
        const trimmedLine = line.trim();

        // 1. Render empty line as block spacer
        if (!trimmedLine) {
          return <div key={lineIdx} className="h-2" />;
        }

        // 2. Headings (# Heading, ## Heading, ### Heading)
        if (trimmedLine.startsWith('#')) {
          const match = line.match(/^(#{1,6})\s+(.*)$/);
          if (match) {
            const level = match[1].length;
            const content = match[2];
            const parsedElements = parseInlineFormatting(content);

            if (level === 1) {
              return <h1 key={lineIdx} className="text-base sm:text-lg font-black text-slate-950 dark:text-white mt-3 mb-1.5 tracking-tight border-b border-slate-100 dark:border-slate-900 pb-1">{parsedElements}</h1>;
            } else if (level === 2) {
              return <h2 key={lineIdx} className="text-sm sm:text-base font-extrabold text-slate-900 dark:text-white mt-2.5 mb-1 tracking-tight">{parsedElements}</h2>;
            } else {
              return <h3 key={lineIdx} className="text-xs sm:text-sm font-bold text-slate-800 dark:text-slate-200 mt-2 mb-1 uppercase tracking-wider">{parsedElements}</h3>;
            }
          }
        }

        // 3. Bullet points line starts with "- " or "* "
        if (trimmedLine.startsWith('- ') || trimmedLine.startsWith('* ')) {
          const content = trimmedLine.slice(2);
          const parsedElements = parseInlineFormatting(content);
          return (
            <div key={lineIdx} className="flex gap-2 items-start pl-2">
              <span className="text-purple-500 font-extrabold select-none shrink-0 mt-1">•</span>
              <span className="flex-1">{parsedElements}</span>
            </div>
          );
        }

        // 4. Numbered list line starts with e.g. "1. "
        if (/^\d+\.\s+/.test(trimmedLine)) {
          const match = trimmedLine.match(/^(\d+)\.\s+(.*)$/);
          if (match) {
            const num = match[1];
            const content = match[2];
            const parsedElements = parseInlineFormatting(content);
            return (
              <div key={lineIdx} className="flex gap-2 items-start pl-2">
                <span className="text-purple-500 font-mono font-bold select-none shrink-0 mt-0.5">{num}.</span>
                <span className="flex-1">{parsedElements}</span>
              </div>
            );
          }
        }

        // 5. Default Paragraph Line
        return (
          <p key={lineIdx} className="leading-relaxed">
            {parseInlineFormatting(line)}
          </p>
        );
      })}
    </div>
  );
}

// -------------------------------------------------------------------------
// INLINE PARSING ENGINE FOR BOLD AND ITALIC (**bold**, __bold__, *italic*, _italic_)
// -------------------------------------------------------------------------
function parseInlineFormatting(source: string) {
  if (!source) return '';

  // Use a regex to scan for **bold**, __bold__, *italic*, _italic_
  const parts: (string | React.ReactNode)[] = [];
  let currentText = source;
  let key = 0;

  // Pattern matches **bold** or *italic*
  // Group 1: Bold with **
  // Group 2: Bold with __
  // Group 3: Italic with *
  // Group 4: Italic with _
  const regex = /(\*\*([^*]+)\*\*)|(__([^_]+)__)|(\*([^*]+)\*)|(_([^_]+)_)/;

  while (currentText) {
    const match = currentText.match(regex);
    if (!match) {
      parts.push(currentText);
      break;
    }

    const matchIndex = match.index || 0;
    // Add prefix
    if (matchIndex > 0) {
      parts.push(currentText.slice(0, matchIndex));
    }

    const fullMatch = match[0];
    
    if (fullMatch.startsWith('**') && fullMatch.endsWith('**')) {
      const boldText = match[2];
      parts.push(<strong key={key++} className="font-extrabold text-slate-900 dark:text-white px-0.5">{boldText}</strong>);
    } else if (fullMatch.startsWith('__') && fullMatch.endsWith('__')) {
      const boldText = match[4];
      parts.push(<strong key={key++} className="font-extrabold text-slate-900 dark:text-white px-0.5">{boldText}</strong>);
    } else if (fullMatch.startsWith('*') && fullMatch.endsWith('*')) {
      const italicText = match[6];
      parts.push(<em key={key++} className="italic text-slate-800 dark:text-slate-105 font-medium">{italicText}</em>);
    } else if (fullMatch.startsWith('_') && fullMatch.endsWith('_')) {
      const italicText = match[8];
      parts.push(<em key={key++} className="italic text-slate-800 dark:text-slate-105 font-medium">{italicText}</em>);
    } else {
      parts.push(fullMatch);
    }

    currentText = currentText.slice(matchIndex + fullMatch.length);
  }

  return <>{parts}</>;
}
