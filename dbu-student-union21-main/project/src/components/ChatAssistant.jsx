import React, { useState, useRef, useEffect } from 'react';
import { apiService } from '../services/api';

const toPlainText = (text = '') =>
  String(text)
    .replace(/\*\*(.*?)\*\*/g, '$1')
    .replace(/\*(.*?)\*/g, '$1')
    .replace(/__(.*?)__/g, '$1')
    .replace(/`(.*?)`/g, '$1')
    .trim();

const ChatAssistant = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([
    { role: 'assistant', text: "I am your assistance what can I help you?" }
  ]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
    }
  }, [messages, isOpen, isLoading]);

  const sendMessage = async (text) => {
    if (!text.trim()) return;

    setMessages(prev => [...prev, { role: 'user', text: text.trim() }]);
    setInputValue('');
    setIsLoading(true);

    try {
      const response = await apiService.sendChatMessage(text.trim());
      if (response && response.answer) {
        setMessages(prev => [...prev, { role: 'assistant', text: toPlainText(response.answer) }]);
      } else {
        setMessages(prev => [...prev, { role: 'assistant', text: "Sorry, I received an invalid response from the server." }]);
      }
    } catch (error) {
      setMessages(prev => [...prev, { role: 'assistant', text: "I'm having trouble connecting to the network. Please try again later." }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    sendMessage(inputValue);
  };

  const toggleChat = () => setIsOpen(!isOpen);

  const suggestions = [
    "What clubs are available?",
    "How do I report a complaint?",
    "Election help."
  ];

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end">
      {/* Chat Window */}
      {isOpen && (
        <div className="bg-white rounded-xl shadow-2xl flex flex-col w-80 sm:w-96 h-[500px] mb-4 border border-gray-200 overflow-hidden transform transition-all duration-300">
          {/* Header */}
          <div className="bg-blue-600 text-white p-4 flex justify-between items-center shadow-md shrink-0">
            <div>
              <h3 className="font-bold text-lg">DBU Pilot Assistant</h3>
              <p className="text-blue-100 text-xs">Always here to help</p>
            </div>
            <div className="flex items-center space-x-2">
              <button 
                onClick={() => window.open('mailto:support@dbu.edu.et?subject=Bug Report - AI Assistant', '_blank')}
                className="text-xs bg-red-500 hover:bg-red-600 px-2 py-1 rounded shadow-sm transition-colors"
                title="Report Bug"
              >
                Report Bug
              </button>
              <button onClick={toggleChat} className="text-blue-100 hover:text-white transition-colors p-1">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path>
                </svg>
              </button>
            </div>
          </div>

          {/* Messages Area */}
          <div className="flex-1 p-4 overflow-y-auto bg-gray-50 flex flex-col space-y-3">
            {messages.map((msg, idx) => (
              <div key={idx} className={`max-w-[85%] rounded-lg p-3 ${msg.role === 'user' ? 'bg-blue-600 text-white self-end rounded-br-none shadow-md' : 'bg-white text-gray-800 border border-gray-200 self-start rounded-bl-none shadow-sm'}`}>
                <p className="text-sm whitespace-pre-wrap">{toPlainText(msg.text)}</p>
              </div>
            ))}
            {isLoading && (
              <div className="bg-white text-gray-500 border border-gray-200 self-start rounded-lg rounded-bl-none shadow-sm p-3 max-w-[85%] flex items-center space-x-2 text-sm italic">
                <span>Pilot is thinking</span>
                <div className="flex space-x-1 items-center h-4">
                  <div className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce"></div>
                  <div className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                  <div className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.4s' }}></div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Quick Suggestions & Input Area */}
          <div className="bg-white border-t border-gray-200 shrink-0">
            {/* Quick Suggestions */}
            {messages.length < 3 && !isLoading && (
              <div className="px-3 pt-3 flex flex-wrap gap-2">
                {suggestions.map((suggestion, index) => (
                  <button
                    key={index}
                    onClick={() => sendMessage(suggestion)}
                    className="text-xs bg-blue-50 text-blue-600 hover:bg-blue-100 hover:text-blue-700 border border-blue-200 rounded-full px-3 py-1.5 transition-colors shadow-sm"
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            )}
            
            <form onSubmit={handleSendMessage} className="flex space-x-2 p-3">
              <input
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                placeholder="Ask me anything..."
                className="flex-1 bg-gray-100 text-gray-800 rounded-full px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition-shadow"
                disabled={isLoading}
              />
              <button
                type="submit"
                disabled={isLoading || !inputValue.trim()}
                className={`bg-blue-600 text-white rounded-full p-2 flex items-center justify-center transition-colors shadow-sm ${isLoading || !inputValue.trim() ? 'opacity-50 cursor-not-allowed' : 'hover:bg-blue-700'}`}
              >
                <svg className="w-5 h-5 pr-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"></path>
                </svg>
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Floating Button */}
      {!isOpen && (
        <button
          onClick={toggleChat}
          className="bg-blue-600 hover:bg-blue-700 text-white rounded-full w-14 h-14 flex items-center justify-center shadow-lg transform transition-all hover:scale-105 active:scale-95 group"
        >
          <svg className="w-6 h-6 group-hover:hidden block" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"></path>
          </svg>
          <svg className="w-6 h-6 group-hover:block hidden" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path>
          </svg>
        </button>
      )}
    </div>
  );
};

export default ChatAssistant;
