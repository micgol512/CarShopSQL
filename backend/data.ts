import { promises as fs } from "fs";
import { BaseImpl, Car, User } from "./types.js";

const USERS_PATH = "./db/users.json";
const CARS_PATH = "./db/cars.json";

async function loadFile(filePath: string) {
  const rawData = await fs.readFile(filePath, "utf-8");
  const data = JSON.parse(rawData);
  return data;
}
async function saveFile(filePath: string, data: any) {
  await fs.writeFile(filePath, JSON.stringify(data));
}

export async function loadUsers(): Promise<BaseImpl<User>> {
  return new BaseImpl(await loadFile(USERS_PATH));
}
export async function loadCars(): Promise<BaseImpl<Car>> {
  return new BaseImpl(await loadFile(CARS_PATH));
}
export async function saveUsers(data: User[]): Promise<void> {
  await saveFile(USERS_PATH, data);
}
export async function saveCars(data: Car[]): Promise<void> {
  await saveFile(CARS_PATH, data);
}
