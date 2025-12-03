import React, { createContext, useContext, useState, useEffect, ReactNode, useRef } from 'react';
import { Ticket, TicketStatus, ServiceType, SERVICES } from '../types';

interface QueueContextType {
  tickets: Ticket[];
  createTicket: (serviceType: ServiceType, customerName: string) => Ticket;
  callNextTicket: (counterId: number, serviceFilter?: ServiceType | ServiceType[] | 'ALL') => Ticket | null;
  recallTicket: (ticketId: string) => void;
  completeTicket: (ticketId: string) => void;
  skipTicket: (ticketId: string) => void;
  resetQueue: () => void;
  getWaitingCount: (serviceType?: ServiceType) => number;
  isOnline: boolean;
}

const QueueContext = createContext<QueueContextType | undefined>(undefined);

export const useQueue = () => {
  const context = useContext(QueueContext);
  if (!context) {
    throw new Error('useQueue must be used within a QueueProvider');
  }
  return context;
};

// Initial dummy data for demonstration (Offline Fallback)
const INITIAL_TICKETS: Ticket[] = [
  { id: '1', number: 'A001', serviceType: ServiceType.PRIORITY, status: TicketStatus.COMPLETED, createdAt: Date.now() - 1000000, completedAt: Date.now() - 500000, counter: 1, customerName: 'Maria Santos' },
  { id: '2', number: 'F001', serviceType: ServiceType.SALARY_LOAN, status: TicketStatus.SERVING, createdAt: Date.now() - 200000, servedAt: Date.now(), counter: 2, customerName: 'Juan Dela Cruz' },
  { id: '3', number: 'G001', serviceType: ServiceType.PAYMENT, status: TicketStatus.WAITING, createdAt: Date.now() - 100000, customerName: 'Pedro Penduko' },
];

export const QueueProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [isOnline, setIsOnline] = useState(false);
  const isFirstLoad = useRef(true);

  // --- API HELPERS ---
  const API_URL = '/api/tickets'; // Relative path works because we serve frontend from same express server

  const fetchTickets = async () => {
    try {
      const response = await fetch(API_URL);
      if (response.ok) {
        const data = await response.json();
        setTickets(data);
        if (!isOnline) setIsOnline(true);
      } else {
        throw new Error("Server not ready");
      }
    } catch (e) {
      // console.warn("Polling failed, switching to offline mode");
      setIsOnline(false);
    }
  };

  const syncTicketUpdate = async (ticket: Ticket) => {
    if (!isOnline) return; // Skip if offline
    try {
      await fetch(`${API_URL}/${ticket.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(ticket)
      });
      // Re-fetch immediately to ensure sync
      fetchTickets();
    } catch (e) {
      console.error("Sync failed", e);
    }
  };

  const syncNewTicket = async (ticket: Ticket) => {
    if (!isOnline) return;
    try {
      await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(ticket)
      });
      fetchTickets();
    } catch (e) {
      console.error("Create sync failed", e);
    }
  };

  // --- INITIALIZATION & POLLING ---
  useEffect(() => {
    // 1. Load Initial Data (Try LocalStorage first for instant render in offline mode)
    const saved = localStorage.getItem('afpmbai_queue_tickets');
    if (saved) {
      setTickets(JSON.parse(saved));
    } else {
      setTickets(INITIAL_TICKETS);
    }

    // 2. Start Polling for Server Data
    const pollInterval = setInterval(() => {
      fetchTickets();
    }, 1000); // Poll every 1 second for live updates

    return () => clearInterval(pollInterval);
  }, []);

  // Persist to LocalStorage as backup whenever tickets change
  useEffect(() => {
    localStorage.setItem('afpmbai_queue_tickets', JSON.stringify(tickets));
  }, [tickets]);


  // --- LOGIC ---

  const generateTicketNumber = (serviceType: ServiceType): string => {
    const serviceDef = SERVICES.find(s => s.type === serviceType);
    const prefix = serviceDef ? serviceDef.prefix : 'X';
    
    // Count how many tickets of this service type exist today
    // (In a real DB, you'd query the DB count. Here we use current state count)
    const count = tickets.filter(t => t.serviceType === serviceType).length + 1;
    const paddedCount = count.toString().padStart(3, '0');
    return `${prefix}${paddedCount}`;
  };

  const createTicket = (serviceType: ServiceType, customerName: string): Ticket => {
    const newTicket: Ticket = {
      id: Math.random().toString(36).substr(2, 9),
      number: generateTicketNumber(serviceType),
      serviceType,
      status: TicketStatus.WAITING,
      createdAt: Date.now(),
      customerName
    };
    
    // Optimistic Update
    setTickets(prev => [...prev, newTicket]);
    
    // Server Sync
    if (isOnline) {
      syncNewTicket(newTicket);
    }
    
    return newTicket;
  };

  const callNextTicket = (counterId: number, serviceFilter: ServiceType | ServiceType[] | 'ALL' = 'ALL'): Ticket | null => {
    const waitingTickets = tickets
      .map((t, index) => ({ ...t, originalIndex: index })) // Track index for optimistic update
      .filter(t => t.status === TicketStatus.WAITING);

    const filteredTickets = waitingTickets.filter(t => {
      if (serviceFilter === 'ALL') return true;
      if (Array.isArray(serviceFilter)) {
        return serviceFilter.includes(t.serviceType);
      }
      return t.serviceType === serviceFilter;
    });

    if (filteredTickets.length === 0) return null;

    // FIFO: Get the oldest ticket
    const nextTicket = filteredTickets.sort((a, b) => a.createdAt - b.createdAt)[0];
    
    if (nextTicket) {
      const updatedTicket = { 
        ...nextTicket, 
        status: TicketStatus.SERVING, 
        servedAt: Date.now(), 
        counter: counterId 
      };

      // Optimistic Update locally
      setTickets(prev => prev.map(t => t.id === nextTicket.id ? updatedTicket : t));
      
      // Server Sync
      if (isOnline) {
        syncTicketUpdate(updatedTicket);
      }
      
      return updatedTicket;
    }
    return null;
  };

  const recallTicket = (ticketId: string) => {
    const updatedTicket = tickets.find(t => t.id === ticketId);
    if (updatedTicket) {
       const newVersion = { ...updatedTicket, recalledAt: Date.now() };
       setTickets(prev => prev.map(t => t.id === ticketId ? newVersion : t));
       if (isOnline) syncTicketUpdate(newVersion);
    }
  };

  const completeTicket = (ticketId: string) => {
    const updatedTicket = tickets.find(t => t.id === ticketId);
    if (updatedTicket) {
       const newVersion = { ...updatedTicket, status: TicketStatus.COMPLETED, completedAt: Date.now() };
       setTickets(prev => prev.map(t => t.id === ticketId ? newVersion : t));
       if (isOnline) syncTicketUpdate(newVersion);
    }
  };

  const skipTicket = (ticketId: string) => {
    const updatedTicket = tickets.find(t => t.id === ticketId);
    if (updatedTicket) {
       const newVersion = { ...updatedTicket, status: TicketStatus.SKIPPED };
       setTickets(prev => prev.map(t => t.id === ticketId ? newVersion : t));
       if (isOnline) syncTicketUpdate(newVersion);
    }
  };

  const resetQueue = async () => {
    setTickets([]);
    localStorage.removeItem('afpmbai_queue_tickets');
    if (isOnline) {
      try {
        await fetch('/api/reset', { method: 'POST' });
      } catch(e) { console.error(e); }
    }
  };

  const getWaitingCount = (serviceType?: ServiceType) => {
    if (serviceType) {
      return tickets.filter(t => t.status === TicketStatus.WAITING && t.serviceType === serviceType).length;
    }
    return tickets.filter(t => t.status === TicketStatus.WAITING).length;
  };

  return (
    <QueueContext.Provider value={{ 
      tickets, 
      createTicket, 
      callNextTicket, 
      recallTicket,
      completeTicket, 
      skipTicket, 
      resetQueue,
      getWaitingCount,
      isOnline
    }}>
      {children}
    </QueueContext.Provider>
  );
};