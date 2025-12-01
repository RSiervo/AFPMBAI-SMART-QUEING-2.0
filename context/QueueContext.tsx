
import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Ticket, TicketStatus, ServiceType, SERVICES } from '../types';

interface QueueContextType {
  tickets: Ticket[];
  createTicket: (serviceType: ServiceType, customerName: string) => Ticket;
  callNextTicket: (counterId: number, serviceFilter?: ServiceType | ServiceType[] | 'ALL') => Ticket | null;
  completeTicket: (ticketId: string) => void;
  skipTicket: (ticketId: string) => void;
  resetQueue: () => void;
  getWaitingCount: (serviceType?: ServiceType) => number;
}

const QueueContext = createContext<QueueContextType | undefined>(undefined);

export const useQueue = () => {
  const context = useContext(QueueContext);
  if (!context) {
    throw new Error('useQueue must be used within a QueueProvider');
  }
  return context;
};

// Initial dummy data for demonstration
const INITIAL_TICKETS: Ticket[] = [
  { id: '1', number: 'A001', serviceType: ServiceType.PRIORITY, status: TicketStatus.COMPLETED, createdAt: Date.now() - 1000000, completedAt: Date.now() - 500000, counter: 1, customerName: 'Maria Santos' },
  { id: '2', number: 'F001', serviceType: ServiceType.SALARY_LOAN, status: TicketStatus.SERVING, createdAt: Date.now() - 200000, servedAt: Date.now(), counter: 2, customerName: 'Juan Dela Cruz' },
  { id: '3', number: 'G001', serviceType: ServiceType.PAYMENT, status: TicketStatus.WAITING, createdAt: Date.now() - 100000, customerName: 'Pedro Penduko' },
  { id: '4', number: 'B001', serviceType: ServiceType.REFUND_DIVIDEND, status: TicketStatus.WAITING, createdAt: Date.now() - 50000, customerName: 'Jose Rizal' },
];

export const QueueProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  // Try to load from local storage first to persist state across refreshes
  const [tickets, setTickets] = useState<Ticket[]>(() => {
    const saved = localStorage.getItem('afpmbai_queue_tickets');
    return saved ? JSON.parse(saved) : INITIAL_TICKETS;
  });

  useEffect(() => {
    localStorage.setItem('afpmbai_queue_tickets', JSON.stringify(tickets));
  }, [tickets]);

  const generateTicketNumber = (serviceType: ServiceType): string => {
    const serviceDef = SERVICES.find(s => s.type === serviceType);
    const prefix = serviceDef ? serviceDef.prefix : 'X';
    
    // Count how many tickets of this service type exist today (simplified logic: just total count in state)
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
    setTickets(prev => [...prev, newTicket]);
    return newTicket;
  };

  const callNextTicket = (counterId: number, serviceFilter: ServiceType | ServiceType[] | 'ALL' = 'ALL'): Ticket | null => {
    let nextTicketIndex = -1;

    // First check if this counter is already serving someone, if so, complete/hold logic should be handled elsewhere
    // This function assumes the counter is "free" to take a new ticket.

    const waitingTickets = tickets
      .map((t, index) => ({ ...t, originalIndex: index }))
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
      setTickets(prev => {
        const newTickets = [...prev];
        newTickets[nextTicket.originalIndex] = {
          ...newTickets[nextTicket.originalIndex],
          status: TicketStatus.SERVING,
          servedAt: Date.now(),
          counter: counterId
        };
        return newTickets;
      });
      return { ...nextTicket, status: TicketStatus.SERVING, servedAt: Date.now(), counter: counterId };
    }
    return null;
  };

  const completeTicket = (ticketId: string) => {
    setTickets(prev => prev.map(t => 
      t.id === ticketId 
        ? { ...t, status: TicketStatus.COMPLETED, completedAt: Date.now() } 
        : t
    ));
  };

  const skipTicket = (ticketId: string) => {
    setTickets(prev => prev.map(t => 
      t.id === ticketId 
        ? { ...t, status: TicketStatus.SKIPPED } 
        : t
    ));
  };

  const resetQueue = () => {
    setTickets([]);
    localStorage.removeItem('afpmbai_queue_tickets');
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
      completeTicket, 
      skipTicket, 
      resetQueue,
      getWaitingCount
    }}>
      {children}
    </QueueContext.Provider>
  );
};
