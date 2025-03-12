import { useState, useRef, useEffect } from 'react';
import { Button, Card, Form, InputGroup } from 'react-bootstrap';
import axios from 'axios';

const Chatbot = () => {
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef(null);
  const API_URL = import.meta.env.VITE_API_URL;

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!newMessage.trim()) return;

    const userMessage = newMessage.trim();
    setMessages(prev => [...prev, { text: userMessage, type: 'user' }]);
    setNewMessage('');
    setIsLoading(true);

    try {
      const response = await axios.post(`${API_URL}chatbot`, {
        message: userMessage
      }, {
        withCredentials: true
      });

      setMessages(prev => [...prev, { text: response.data.reply, type: 'bot' }]);
    } catch (error) {
      console.error('Chatbot error:', error);
      setMessages(prev => [...prev, { 
        text: 'Sorry, I encountered an error. Please try again.',
        type: 'bot',
        error: true
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div style={{
      position: 'fixed',
      bottom: '20px',
      right: '20px',
      zIndex: 1000
    }}>
      {isOpen ? (
        <Card style={{ width: '300px', maxHeight: '500px', boxShadow: '0 0 10px rgba(0,0,0,0.1)' }}>
          <Card.Header className="d-flex justify-content-between align-items-center bg-primary text-white">
            <span>NaviSpace Assistant</span>
            <Button 
              variant="link" 
              className="text-white p-0" 
              onClick={() => setIsOpen(false)}
            >
              <i className="bi bi-x-lg"></i>
            </Button>
          </Card.Header>
          <Card.Body className="p-2" style={{ height: '400px' }}>
            <div 
              className="messages-container" 
              style={{ 
                height: '100%', 
                overflowY: 'auto',
                padding: '10px'
              }}
            >
              {messages.map((msg, index) => (
                <div
                  key={index}
                  className={`message ${msg.type} mb-2`}
                  style={{
                    maxWidth: '80%',
                    marginLeft: msg.type === 'bot' ? '0' : 'auto',
                    marginRight: msg.type === 'bot' ? 'auto' : '0',
                  }}
                >
                  <div
                    className={`p-2 rounded ${
                      msg.type === 'bot' 
                        ? 'bg-light text-dark' 
                        : 'bg-primary text-white'
                    }`}
                    style={{ 
                      wordBreak: 'break-word',
                      borderRadius: msg.type === 'bot' ? '0 15px 15px 15px' : '15px 0 15px 15px'
                    }}
                  >
                    {msg.text}
                  </div>
                </div>
              ))}
              {isLoading && (
                <div className="message bot mb-2">
                  <div className="p-2 bg-light text-dark rounded" style={{ borderRadius: '0 15px 15px 15px' }}>
                    <div className="typing-indicator">
                      <span></span>
                      <span></span>
                      <span></span>
                    </div>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
          </Card.Body>
          <Card.Footer className="p-2 bg-white">
            <Form onSubmit={handleSubmit}>
              <InputGroup>
                <Form.Control
                  type="text"
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  placeholder="Type your message..."
                  disabled={isLoading}
                />
                <Button 
                  type="submit" 
                  variant="primary"
                  disabled={isLoading || !newMessage.trim()}
                >
                  <i className="bi bi-send"></i>
                </Button>
              </InputGroup>
            </Form>
          </Card.Footer>
        </Card>
      ) : (
        <Button
          variant="primary"
          className="rounded-circle p-3"
          onClick={() => setIsOpen(true)}
          style={{
            width: '60px',
            height: '60px',
            boxShadow: '0 2px 12px rgba(0,0,0,0.2)'
          }}
        >
          <i className="bi bi-chat-dots-fill fs-5"></i>
        </Button>
      )}

      <style>{`
        .typing-indicator {
          display: flex;
          gap: 4px;
        }
        
        .typing-indicator span {
          width: 8px;
          height: 8px;
          background-color: #90949c;
          border-radius: 50%;
          animation: bounce 1.4s infinite ease-in-out;
        }
        
        .typing-indicator span:nth-child(1) { animation-delay: -0.32s; }
        .typing-indicator span:nth-child(2) { animation-delay: -0.16s; }
        
        @keyframes bounce {
          0%, 80%, 100% { transform: scale(0); }
          40% { transform: scale(1); }
        }

        .messages-container::-webkit-scrollbar {
          width: 6px;
        }
        
        .messages-container::-webkit-scrollbar-track {
          background: #f1f1f1;
        }
        
        .messages-container::-webkit-scrollbar-thumb {
          background: #888;
          border-radius: 3px;
        }
        
        .messages-container::-webkit-scrollbar-thumb:hover {
          background: #555;
        }
      `}</style>
    </div>
  );
};

export default Chatbot;