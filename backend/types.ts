import { IncomingMessage, ServerResponse } from "http";

export interface User {
  id: string;
  username: string;
  password: string;
  role: "admin" | "user";
  balance: number;
}

export interface Car {
  id: string;
  model: string;
  price: number;
  ownerId: string | null;
}

export interface Base<T> {
  data: T[];
  get(): T[];
  get(id: string): T | null;
  set<K extends keyof T>(id: string, updates: Partial<Pick<T, K>>): void;
  delete(id: string): void;
  add(item: T): void;
}
export class BaseImpl<T extends { id: string }> implements Base<T> {
  data: T[];
  constructor(data: T[]) {
    this.data = data;
  }
  get(): T[];
  get(id: string): T | null;
  get(id?: string | undefined) {
    if (!id) {
      return this.data;
    } else {
      const item = this.data.find((item) => item.id === id);
      if (!item) {
        return null;
      }
      return item;
    }
  }
  set<K extends keyof T>(id: string, updates: Partial<Pick<T, K>>): void {
    const index = this.data.findIndex((item) => item.id === id);
    if (index === -1) {
      throw new Error(`Item with id ${id} not found`);
    }

    Object.entries(updates).forEach(([key, value]) => {
      if (value !== undefined) {
        (this.data[index] as any)[key] = value;
      }
    });
  }
  delete(id: string): void {
    this.data = this.data.filter((item) => item.id !== id);
  }
  add(item: T): void {
    if (this.data.some((i) => i.id === item.id)) {
      throw new Error(`Item with id ${item.id} already exists`);
    }
    this.data.push(item);
  }
}

export type RequestHandler = (
  req: IncomingMessage,
  res: ServerResponse
) => Promise<void>;

export interface TokenPayload {
  userId: string;
  exp?: number;
}
