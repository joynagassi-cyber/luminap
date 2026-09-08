/**
 * Event Service
 *
 * Handles all event and budget business logic.
 */

import { generateId } from './utils';
import { addEventPS, updateEventPS, deleteEventPS } from './dataLayer';
import type { Event, BudgetItem, ShoppingItem } from '@/types';

export interface EventState {
  events: Event[];
}

// --- addEvent ---

export function buildAddEvent(
  event: Omit<Event, 'id' | 'createdAt' | 'updatedAt'>
): Event {
  const id = generateId();
  const now = new Date().toISOString();
  return {
    ...event,
    id,
    createdAt: now,
    updatedAt: now,
    budgetItems: event.budgetItems ?? [],
    shoppingItems: event.shoppingItems ?? [],
  };
}

export async function persistAddEvent(
  newEvent: Event
): Promise<void> {
  try {
    await addEventPS({
      org_id: newEvent.orgId,
      name: newEvent.name,
      description: newEvent.description,
      start_date: newEvent.startDate,
      end_date: newEvent.endDate,
      status: newEvent.status,
      budget: newEvent.budget,
      budget_items: JSON.stringify(newEvent.budgetItems),
    });
  } catch (error) {
    console.error('[EventService] Failed to add event:', error);
  }
}

// --- updateEvent ---

export function applyUpdateEvent(
  events: Event[],
  id: string,
  data: Partial<Event>
): Event[] {
  return events.map(e =>
    e.id === id ? { ...e, ...data, updatedAt: new Date().toISOString() } : e
  );
}

export async function persistUpdateEvent(
  id: string,
  data: Partial<Event>
): Promise<void> {
  try {
    await updateEventPS(id, data);
  } catch (error) {
    console.error('[EventService] Failed to update event:', error);
  }
}

// --- deleteEvent ---

export function applyDeleteEvent(
  events: Event[],
  id: string
): Event[] {
  return events.filter(e => e.id !== id);
}

export async function persistDeleteEvent(
  id: string
): Promise<void> {
  try {
    await deleteEventPS(id);
  } catch (error) {
    console.error('[EventService] Failed to delete event:', error);
  }
}

// --- updateEventStatus ---

export function applyUpdateEventStatus(
  events: Event[],
  id: string,
  status: Event['status']
): Event[] {
  return events.map(e =>
    e.id === id ? { ...e, status, updatedAt: new Date().toISOString() } : e
  );
}

// --- Budget operations (computed, no PS write needed directly) ---

export interface BudgetResult {
  newItems: BudgetItem[];
  total: number;
}

export function addBudgetItem(
  items: BudgetItem[],
  eventId: string,
  item: Omit<BudgetItem, 'id'>
): BudgetResult {
  const newItem = { id: generateId(), ...item };
  const newItems = [...items, newItem];
  const total = newItems.reduce((s, i) => s + i.allocated, 0);
  return { newItems, total };
}

export function removeBudgetItem(
  items: BudgetItem[],
  itemId: string
): BudgetResult {
  const newItems = items.filter(i => i.id !== itemId);
  const total = newItems.reduce((s, i) => s + i.allocated, 0);
  return { newItems, total };
}

export function updateShoppingItemStatus(
  items: ShoppingItem[],
  itemId: string,
  status: ShoppingItem['status']
): ShoppingItem[] {
  return items.map(i => i.id === itemId ? { ...i, status } : i);
}
