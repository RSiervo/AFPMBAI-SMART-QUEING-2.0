import React, { useState, useEffect } from 'react';
import { useQueue } from '../context/QueueContext';
import { SERVICES, ServiceType, Ticket } from '../types';
import { 
  Accessibility, 
  Undo2, 
  UserX, 
  CalendarCheck, 
  FileText, 
  Wallet, 
  CreditCard, 
  Home, 
  Monitor, 
  Receipt, 
  ClipboardCheck, 
  HeartPulse, 
  Printer, 
  CheckCircle, 
  Sparkles, 
  Bot,
  Search,
  User,
  Delete,
  Space
} from 'lucide-react';
import { GoogleGenAI } from "@google/genai";

// Simple On-Screen Keyboard Component
const VirtualKeyboard = ({ onKeyPress, onDelete, onSpace, onEnter }: { onKeyPress: (key: string) => void, onDelete: () => void, onSpace: () => void, onEnter: () => void }) => {
  const rows = [
    ['Q', 'W', 'E', 'R', 'T', 'Y', 'U', 'I', 'O', 'P'],
    ['A', 'S', 'D', 'F', 'G', 'H', 'J', 'K', 'L'],
    ['Z', 'X', 'C', 'V', 'B', 'N', 'M']
  ];

  return (
    <div className="flex flex-col gap-2 mt-4 w-full select-none">
      {rows.map((row, i) => (
        <div key={i} className="flex justify-center gap-2">
          {row.map((key) => (
            <button
              key={key}
              onClick={() => onKeyPress(key)}
              className="w-10 h-12 md:w-14 md:h-14 bg-white text-gray-800 font-bold rounded-lg shadow-md hover:bg-afpmbai-100 active:scale-95 transition-all text-lg md:text-xl border-b-4 border-gray-200 active:border-b-0 active:translate-y-1"
            >
              {key}
            </button>
          ))}
        </div>
      ))}
      <div className="flex justify-center gap-2 mt-1">
         <button
            onClick={onSpace}
            className="flex-1 max-w-xs h-12 md:h-14 bg-white text-gray-800 font-bold rounded-lg shadow-md hover:bg-afpmbai-100 active:scale-95 transition-all flex items-center justify-center border-b-4 border-gray-200 active:border-b-0 active:translate-y-1"
          >
            SPACE
         </button>
         <button
            onClick={onDelete}
            className="w-20 h-12 md:h-14 bg-red-100 text-red-600 font-bold rounded-lg shadow-md hover:bg-red-200 active:scale-95 transition-all flex items-center justify-center border-b-4 border-red-200 active:border-b-0 active:translate-y-1"
          >
            <Delete size={24} />
         </button>
         <button
            onClick={onEnter}
            className="w-24 h-12 md:h-14 bg-afpmbai-600 text-white font-bold rounded-lg shadow-md hover:bg-afpmbai-700 active:scale-95 transition-all flex items-center justify-center border-b-4 border-afpmbai-800 active:border-b-0 active:translate-y-1"
          >
            OK
         </button>
      </div>
    </div>
  );
};

const AfpmbaiLogo = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 200 200" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
    {/* Left Top */}
    <path d="M98 10 L60 50 V110 L98 140 V10 Z" fill="#16a34a" />
    {/* Right Top */}
    <path d="M102 10 L140 50 V110 L102 140 V10 Z" fill="#15803d" />
    
    {/* Left Bottom */}
    <path d="M56 110 H10 L10 150 L50 190 H94 V144 L56 110 Z" fill="#16a34a" />
    {/* Right Bottom */}
    <path d="M144 110 H190 L190 150 L150 190 H106 V144 L144 110 Z" fill="#15803d" />
  </svg>
);

const Kiosk: React.FC = () => {
  const { createTicket, getWaitingCount } = useQueue();
  const [generatedTicket, setGeneratedTicket] = useState<Ticket | null>(null);
  const [isPrinting, setIsPrinting] = useState(false);
  
  // Name Entry State
  const [showNameModal, setShowNameModal] = useState(false);
  const [selectedService, setSelectedService] = useState<ServiceType | null>(null);
  const [userName, setUserName] = useState('');

  // Clock State
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);
  
  // AI State
  const [showAiModal, setShowAiModal] = useState(false);
  const [aiQuery, setAiQuery] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [aiSuggestion, setAiSuggestion] = useState<ServiceType | null>(null);
  const [aiReasoning, setAiReasoning] = useState('');

  const handleServiceClick = (type: ServiceType) => {
    setSelectedService(type);
    setUserName('');
    setShowNameModal(true);
    // Close AI if open
    setShowAiModal(false);
    setAiQuery('');
    setAiSuggestion(null);
  };

  const handleKeyboardInput = (key: string) => {
    setUserName(prev => prev + key);
  };
  
  const handleKeyboardDelete = () => {
    setUserName(prev => prev.slice(0, -1));
  };
  
  const handleKeyboardSpace = () => {
    setUserName(prev => prev + ' ');
  };

  const handleNameConfirm = () => {
    if (!selectedService) return;
    
    // Default name if empty
    const finalName = userName.trim() || 'Guest';
    
    const ticket = createTicket(selectedService, finalName);
    setGeneratedTicket(ticket);
    setShowNameModal(false);
    setIsPrinting(true);

    // Simulate printing delay and auto-reset
    setTimeout(() => {
      setIsPrinting(false);
    }, 2000); // 2 seconds "printing" animation

    // Auto close modal after a few more seconds
    setTimeout(() => {
      setGeneratedTicket(null);
      setUserName('');
      setSelectedService(null);
    }, 6000);
  };

  // AI Keyboard Handlers
  const handleAiKeyboardInput = (key: string) => {
    setAiQuery(prev => prev + key);
  };

  const handleAiKeyboardDelete = () => {
    setAiQuery(prev => prev.slice(0, -1));
  };

  const handleAiKeyboardSpace = () => {
    setAiQuery(prev => prev + ' ');
  };

  const handleAskAI = async () => {
    if (!aiQuery.trim()) return;
    
    setIsAnalyzing(true);
    setAiSuggestion(null);
    setAiReasoning('');

    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const prompt = `
        You are a helpful receptionist at AFPMBAI (Armed Forces and Police Mutual Benefit Association, Inc.).
        A member is asking for help with their transaction.
        
        Available Services:
        ${SERVICES.map(s => `${s.prefix} (${s.type}): ${s.label} - ${s.description}`).join('\n')}

        User Query: "${aiQuery}"

        Task:
        1. Identify the most appropriate Service Type for the user's query.
        2. Provide a very short reason why.
        3. Return the result in JSON format with keys: "servicePrefix" (e.g., "A", "B", etc.) and "reason".
      `;

      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
        config: {
          responseMimeType: 'application/json'
        }
      });

      const text = response.text;
      if (text) {
        const result = JSON.parse(text);
        const matchedService = SERVICES.find(s => s.prefix === result.servicePrefix);
        if (matchedService) {
          setAiSuggestion(matchedService.type);
          setAiReasoning(result.reason);
        } else {
           setAiReasoning("I couldn't find an exact match. Please try describing your request differently.");
        }
      }
    } catch (error) {
      console.error("AI Error:", error);
      setAiReasoning("Sorry, I'm having trouble connecting right now. Please select from the menu.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const getIcon = (iconName: string) => {
    const props = { size: 32, className: "mb-2 text-afpmbai-600" };
    switch (iconName) {
      case 'Accessibility': return <Accessibility {...props} />;
      case 'Undo2': return <Undo2 {...props} />;
      case 'UserX': return <UserX {...props} />;
      case 'CalendarCheck': return <CalendarCheck {...props} />;
      case 'FileText': return <FileText {...props} />;
      case 'Wallet': return <Wallet {...props} />;
      case 'CreditCard': return <CreditCard {...props} />;
      case 'Home': return <Home {...props} />;
      case 'Monitor': return <Monitor {...props} />;
      case 'Receipt': return <Receipt {...props} />;
      case 'ClipboardCheck': return <ClipboardCheck {...props} />;
      case 'HeartPulse': return <HeartPulse {...props} />;
      default: return <FileText {...props} />;
    }
  };

  return (
    <div className="h-screen bg-afpmbai-50 flex flex-col relative overflow-hidden font-sans">
      {/* Background Decor */}
      <div className="absolute top-0 left-0 w-full h-32 bg-afpmbai-800 shadow-xl z-0"></div>
      
      {/* Header Area */}
      <div className="relative z-10 w-full px-6 py-6 flex flex-row justify-between items-center shrink-0 min-h-[110px]">
        <div className="text-left z-20 flex items-center gap-4">
          <div className="w-16 h-16 bg-white rounded-lg p-1 shadow-lg shrink-0">
             <AfpmbaiLogo className="w-full h-full" />
          </div>
          <div>
            <h1 className="text-2xl md:text-3xl font-extrabold text-white tracking-tight drop-shadow-sm">AFPMBAI Queue Kiosk</h1>
            <p className="text-afpmbai-200 mt-1 text-sm md:text-base">Select your transaction below</p>
          </div>
        </div>

        {/* Date/Time Display - Absolute Center */}
        <div className="absolute left-1/2 top-1/2 transform -translate-x-1/2 -translate-y-1/2 flex-col items-center justify-center text-white hidden md:flex z-10 w-auto whitespace-nowrap pointer-events-none">
          <div className="text-3xl lg:text-4xl font-bold tracking-widest leading-none drop-shadow-md">
            {currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true })}
          </div>
          <div className="text-sm font-medium text-afpmbai-100 uppercase tracking-wide mt-1 text-center">
            {currentTime.toLocaleDateString(undefined, { weekday: 'short', month: 'long', day: 'numeric', year: 'numeric' })}
          </div>
        </div>
        
        {/* AI Assistant Button */}
        <button 
          onClick={() => setShowAiModal(true)}
          className="bg-white text-afpmbai-700 hover:bg-afpmbai-50 px-4 py-2 md:px-6 md:py-3 rounded-full font-bold shadow-lg flex items-center gap-2 transform transition-transform hover:scale-105 active:scale-95 border-2 border-afpmbai-300 z-20"
        >
          <div className="bg-gradient-to-tr from-blue-500 to-purple-500 p-1.5 rounded-full text-white">
            <Sparkles size={18} />
          </div>
          <span className="hidden md:inline">Not sure? Ask AI</span>
          <span className="md:hidden">Ask AI</span>
        </button>
      </div>

      {/* Main Grid Content - Stretched to fit screen */}
      <div className="relative z-10 flex-1 w-full px-4 pb-4 pt-4 overflow-hidden">
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 grid-rows-6 md:grid-rows-4 lg:grid-rows-3 gap-3 h-full">
          {SERVICES.map((service) => (
            <button
              key={service.type}
              onClick={() => handleServiceClick(service.type)}
              className="bg-white border border-afpmbai-100 hover:border-afpmbai-500 rounded-xl p-2 md:p-4 shadow-sm hover:shadow-xl transition-all duration-200 transform hover:-translate-y-1 flex flex-col items-center justify-center text-center h-full w-full relative group"
            >
              <div className="absolute top-3 left-3 bg-afpmbai-100 text-afpmbai-800 text-xs font-bold px-2 py-1 rounded opacity-80 group-hover:opacity-100">
                  {service.prefix}
              </div>
              
              {getWaitingCount(service.type) > 0 && (
                <div className="absolute top-3 right-3 text-xs text-orange-600 font-bold bg-orange-50 px-2 py-1 rounded-full border border-orange-100">
                  {getWaitingCount(service.type)} waiting
                </div>
              )}
              
              <div className="bg-afpmbai-50 rounded-full p-3 mb-2 group-hover:bg-afpmbai-100 transition-colors">
                {getIcon(service.icon)}
              </div>
              
              <h2 className="text-base md:text-lg font-bold text-gray-800 mb-1 leading-tight">{service.label}</h2>
              <p className="text-xs text-gray-500 line-clamp-2 px-2 hidden sm:block">{service.description}</p>
            </button>
          ))}
        </div>
      </div>

      {/* Name Entry Modal */}
      {showNameModal && selectedService && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl overflow-hidden animate-fade-in flex flex-col">
             <div className="bg-afpmbai-700 p-6 text-white flex justify-between items-center">
                <div>
                   <h3 className="text-xl font-bold flex items-center gap-2">
                     <User size={24} /> Enter Your Name
                   </h3>
                   <p className="text-afpmbai-200 text-sm">Please type your name for the queue ticket</p>
                </div>
                <button onClick={() => setShowNameModal(false)} className="text-white/80 hover:text-white font-bold text-2xl">&times;</button>
             </div>
             
             <div className="p-8 flex flex-col items-center bg-gray-50">
                <div className="w-full max-w-xl mb-4">
                  <input 
                    type="text" 
                    value={userName}
                    readOnly
                    placeholder="Touch keyboard to type..."
                    className="w-full text-center text-3xl font-bold p-4 rounded-xl border-2 border-afpmbai-300 focus:border-afpmbai-600 focus:ring-4 focus:ring-afpmbai-100 outline-none bg-white text-gray-800 placeholder-gray-300 shadow-inner"
                  />
                </div>
                
                <VirtualKeyboard 
                  onKeyPress={handleKeyboardInput} 
                  onDelete={handleKeyboardDelete}
                  onSpace={handleKeyboardSpace}
                  onEnter={handleNameConfirm}
                />
             </div>
          </div>
        </div>
      )}

      {/* AI Assistant Modal */}
      {showAiModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl overflow-hidden animate-fade-in flex flex-col max-h-[95vh]">
            <div className="bg-gradient-to-r from-blue-600 to-purple-600 p-6 text-white flex justify-between items-start shrink-0">
              <div>
                <h3 className="text-2xl font-bold flex items-center gap-2">
                  <Bot size={28} /> Virtual Assistant
                </h3>
                <p className="text-blue-100 text-sm mt-1">Describe what you need, and I'll find the right queue for you.</p>
              </div>
              <button onClick={() => setShowAiModal(false)} className="text-white/80 hover:text-white text-2xl font-bold">&times;</button>
            </div>
            
            <div className="p-6 flex-1 overflow-y-auto bg-gray-50">
              {!aiSuggestion ? (
                <div className="flex flex-col h-full">
                  <div className="relative mb-2">
                    <textarea 
                      value={aiQuery}
                      readOnly
                      placeholder="Tap keyboard below to type..."
                      className="w-full bg-gray-800 border-2 border-gray-600 rounded-xl p-4 pr-12 h-24 resize-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500 transition-all outline-none text-white text-lg placeholder-gray-400"
                    />
                    <div className="absolute bottom-2 right-4 text-gray-400 text-xs">
                       {aiQuery.length} chars
                    </div>
                  </div>
                  
                  {/* Integrated Keyboard */}
                  <div className="bg-gray-200 rounded-xl p-4 shadow-inner mb-4">
                      <VirtualKeyboard 
                        onKeyPress={handleAiKeyboardInput} 
                        onDelete={handleAiKeyboardDelete}
                        onSpace={handleAiKeyboardSpace}
                        onEnter={handleAskAI}
                      />
                  </div>

                  <button 
                    onClick={handleAskAI}
                    disabled={!aiQuery.trim() || isAnalyzing}
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-4 rounded-xl shadow-lg transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed shrink-0"
                  >
                    {isAnalyzing ? (
                      <>
                        <div className="animate-spin h-5 w-5 border-2 border-white border-t-transparent rounded-full"></div>
                        Analyzing...
                      </>
                    ) : (
                      <>
                        <Search size={20} /> Find Service
                      </>
                    )}
                  </button>
                </div>
              ) : (
                <div className="animate-fade-in h-full flex flex-col items-center justify-center">
                  <div className="bg-blue-50 border border-blue-100 rounded-xl p-6 mb-8 max-w-2xl w-full shadow-sm">
                    <p className="text-blue-800 italic text-lg text-center">"{aiReasoning}"</p>
                  </div>
                  
                  <div className="text-center w-full max-w-lg">
                     <p className="text-gray-500 text-sm uppercase font-bold mb-4">Recommended Service</p>
                     
                     {(() => {
                        const s = SERVICES.find(srv => srv.type === aiSuggestion);
                        if (!s) return null;
                        return (
                          <button
                            onClick={() => handleServiceClick(s.type)}
                            className="w-full bg-white border-2 border-afpmbai-500 rounded-2xl p-8 shadow-xl hover:bg-afpmbai-50 transition-all group relative overflow-hidden transform hover:-translate-y-1"
                          >
                            <div className="absolute top-0 left-0 bg-afpmbai-500 text-white font-bold px-4 py-1 rounded-br-lg">
                              {s.prefix}
                            </div>
                            <div className="flex flex-col items-center">
                              <div className="text-afpmbai-600 mb-4 scale-150">{getIcon(s.icon)}</div>
                              <h2 className="text-3xl font-bold text-gray-800 mb-2">{s.label}</h2>
                              <p className="text-gray-500 text-lg mb-6">{s.description}</p>
                              <div className="bg-afpmbai-600 text-white px-8 py-3 rounded-full font-bold text-lg shadow-md hover:shadow-lg">
                                Select This Service
                              </div>
                            </div>
                          </button>
                        );
                     })()}

                     <button 
                       onClick={() => { setAiSuggestion(null); setAiQuery(''); }}
                       className="mt-8 text-gray-400 hover:text-gray-600 font-medium underline"
                     >
                       Try another search
                     </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Ticket Modal */}
      {generatedTicket && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden animate-fade-in border-4 border-afpmbai-100">
            {isPrinting ? (
              <div className="p-12 flex flex-col items-center justify-center text-center">
                <Printer className="animate-bounce text-afpmbai-600 mb-6" size={64} />
                <h3 className="text-2xl font-bold text-gray-800">Printing ticket...</h3>
                <p className="text-xl text-afpmbai-700 font-bold mt-4">{generatedTicket.customerName}</p>
                <p className="text-gray-500 mt-2">Please wait a moment.</p>
              </div>
            ) : (
              <div className="flex flex-col">
                <div className="bg-afpmbai-600 p-6 text-center text-white">
                  <CheckCircle className="mx-auto mb-2" size={48} />
                  <h3 className="text-2xl font-bold">Registration Successful</h3>
                </div>
                <div className="p-8 text-center bg-white border-b-2 border-dashed border-gray-200">
                  <p className="text-sm uppercase tracking-wider text-gray-500 font-semibold">Your Queue Number</p>
                  <div className="text-7xl font-extrabold text-afpmbai-800 my-2 tracking-tighter">
                    {generatedTicket.number}
                  </div>
                  <div className="text-xl font-bold text-gray-800 mb-4 px-4 py-2 bg-gray-50 rounded-lg border border-gray-100 inline-block">
                     {generatedTicket.customerName}
                  </div>
                  <div className="inline-block bg-afpmbai-100 text-afpmbai-800 px-4 py-1 rounded-full text-sm font-bold mb-6 block w-full">
                    {SERVICES.find(s => s.type === generatedTicket.serviceType)?.label}
                  </div>
                  <div className="flex justify-between text-xs text-gray-400 mt-4 border-t pt-4">
                    <span>{new Date(generatedTicket.createdAt).toLocaleDateString()}</span>
                    <span>{new Date(generatedTicket.createdAt).toLocaleTimeString()}</span>
                  </div>
                </div>
                <div className="p-6 bg-gray-50 text-center">
                  <p className="text-gray-600 mb-4">Please watch the monitor for your number.</p>
                  <button 
                    onClick={() => setGeneratedTicket(null)}
                    className="w-full bg-afpmbai-600 text-white font-bold py-3 rounded-lg hover:bg-afpmbai-700 transition-colors shadow-lg"
                  >
                    Close
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default Kiosk;