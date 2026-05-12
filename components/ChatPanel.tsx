'use client';

import React, { useState, useRef, useEffect } from 'react';
import ReactMarkdown, { Components } from 'react-markdown';
import { Message, MODE_SWITCH_MARKER } from '@/lib/types';
import MessageFeedback from './MessageFeedback';

interface ChatPanelProps {
  messages: Message[];
  onSend: (text: string) => void;
  onModeSwitch: () => void;
  onReset: () => void;
  isStreaming: boolean;
  sessionId: string;
  passageId?: string;
  model?: string;
}

const markdownComponents: Components = {
  p: ({ children }) => <p className="mb-1.5 last:mb-0">{children}</p>,
  strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
  blockquote: ({ children }) => (
    <blockquote className="border-l-2 border-gray-300 pl-2 my-1 text-gray-700 overflow-hidden break-words">{children}</blockquote>
  ),
  ul: ({ children }) => <ul className="list-disc pl-4 my-1 space-y-0.5">{children}</ul>,
  ol: ({ children }) => <ol className="list-decimal pl-4 my-1 space-y-0.5">{children}</ol>,
  li: ({ children }) => <li>{children}</li>,
  code: ({ className, children }) => {
    const isBlock = className?.includes('language-');
    if (isBlock) {
      return (
        <code className="block bg-gray-100 rounded-lg px-3 py-2 my-1 text-xs font-mono overflow-x-auto whitespace-pre">
          {children}
        </code>
      );
    }
    return <code className="bg-gray-100 rounded px-1 py-0.5 text-xs font-mono">{children}</code>;
  },
  pre: ({ children }) => <pre className="my-1 overflow-x-auto">{children}</pre>,
};

export default function ChatPanel({
  messages,
  onSend,
  onModeSwitch,
  onReset,
  isStreaming,
  sessionId,
  passageId,
  model,
}: ChatPanelProps) {
  const [input, setInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleSend = () => {
    const trimmed = input.trim();
    if (!trimmed || isStreaming) return;
    setInput('');
    onSend(trimmed);
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 flex-shrink-0">
        <span className="text-sm font-medium text-gray-700">과외 AI</span>
        <button
          onClick={onReset}
          className="text-xs text-gray-400 hover:text-gray-600 transition-colors"
        >
          대화 리셋
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
        {messages.map((msg, i) => {
          if (msg.content === MODE_SWITCH_MARKER) {
            return (
              <div key={i} className="flex items-center gap-3 py-1">
                <div className="flex-1 h-px bg-gray-200" />
                <span className="text-xs text-gray-400 bg-gray-100 px-3 py-1 rounded-full flex-shrink-0">
                  문제 풀이 모드 전환
                </span>
                <div className="flex-1 h-px bg-gray-200" />
              </div>
            );
          }

          const isUser = msg.role === 'user';
          const isAssistant = msg.role === 'assistant';
          let userPriorMessage = '';
          if (isAssistant) {
            for (let j = i - 1; j >= 0; j--) {
              if (messages[j].role === 'user' && messages[j].content !== MODE_SWITCH_MARKER) {
                userPriorMessage = messages[j].content;
                break;
              }
            }
          }
          return (
            <div
              key={i}
              className={`flex flex-col ${isUser ? 'items-end' : 'items-start'}`}
            >
              <span className={`text-xs mb-1 px-1 ${isUser ? 'text-blue-500' : 'text-gray-500'}`}>
                {isUser ? '학생' : '과외 AI'}
              </span>
              <div
                className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed break-words ${
                  isUser
                    ? 'bg-blue-600 text-white rounded-br-sm whitespace-pre-wrap'
                    : 'bg-white border border-gray-200 text-gray-800 rounded-bl-sm shadow-sm overflow-x-auto'
                }`}
              >
                {isUser ? msg.content : (
                  <ReactMarkdown components={markdownComponents}>
                    {msg.content}
                  </ReactMarkdown>
                )}
              </div>
              {isAssistant && msg.content && !isStreaming && (
                <MessageFeedback
                  messageId={`msg-${i}`}
                  aiMessageContent={msg.content}
                  userPriorMessage={userPriorMessage}
                  sessionId={sessionId}
                  passageId={passageId}
                  model={model}
                />
              )}
            </div>
          );
        })}
        <div ref={messagesEndRef} />
      </div>

      {/* Mode switch + input area */}
      <div className="flex-shrink-0 border-t border-gray-200 p-4 space-y-2">
        <button
          onClick={onModeSwitch}
          disabled={isStreaming}
          className="w-full text-xs text-gray-500 border border-gray-200 rounded-lg py-1.5 hover:bg-gray-50 hover:text-blue-600 hover:border-blue-300 transition-colors disabled:opacity-50"
        >
          문제 풀기
        </button>
        <div className="flex gap-2">
          <textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="메시지 입력 (Enter: 전송, Shift+Enter: 줄바꿈)"
            rows={2}
            disabled={isStreaming}
            className="flex-1 resize-none border border-gray-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-50"
          />
          <button
            onClick={handleSend}
            disabled={isStreaming || !input.trim()}
            className="bg-blue-600 text-white rounded-xl px-4 text-sm font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex-shrink-0"
          >
            {isStreaming ? (
              <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
              </svg>
            ) : (
              '전송'
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
