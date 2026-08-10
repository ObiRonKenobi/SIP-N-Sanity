import ticketDb from "@/data/ticket-db.json";
import ticketExtra from "@/data/ticket-db-extra.json";

export type MeterEffect = {
  sanity: number;
  csat: number;
  queue: number;
};

export type TicketAnswer = {
  text: string;
  effect: MeterEffect;
};

export type Ticket = {
  ticketID: string;
  callerName: string;
  problem: string;
  answers: TicketAnswer[];
};

const tickets = [...(ticketDb as Ticket[]), ...(ticketExtra as Ticket[])];

export function pickRandomTicket(excludeId?: string): Ticket {
  const pool = excludeId
    ? tickets.filter((t) => t.ticketID !== excludeId)
    : tickets;
  const list = pool.length > 0 ? pool : tickets;
  return list[Math.floor(Math.random() * list.length)];
}

export function getAllTickets(): Ticket[] {
  return tickets;
}
